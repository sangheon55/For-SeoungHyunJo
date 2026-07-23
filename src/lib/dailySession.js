import { useCallback, useEffect, useRef, useState } from 'react'
import { useConfirm } from '../components/confirm.jsx'
import { activeSessionStore } from '../storage/activeSessionStore.js'

const AWAY_THRESHOLD_MS = 20 * 60 * 1000

// 경과 시간은 항상 이 함수로 다시 계산한다 — 절대 누적 변수를 쓰지 않는다
export function computeElapsedSec({ startedAt, pausedMs = 0, lastPausedAt = null }, now = Date.now()) {
  const pausedNow = lastPausedAt ? now - lastPausedAt : 0
  return Math.max(0, (now - startedAt - pausedMs - pausedNow) / 1000)
}

async function acquireWakeLock(ref) {
  if (!('wakeLock' in navigator)) return
  try {
    ref.current = await navigator.wakeLock.request('screen')
  } catch {
    // 실패해도 무시 — 경과 시간 계산은 타임스탬프 기반이라 영향 없음
  }
}
async function releaseWakeLock(ref) {
  try {
    await ref.current?.release()
  } catch {
    // 무시
  }
  ref.current = null
}

// 일일 공부량 타이머 전용 훅.
// activeSession(IndexedDB)에 상태 전이마다 즉시 기록하고, 화면 갱신용 setInterval은
// 표시 용도일 뿐 값의 출처가 아니다 — 값은 항상 computeElapsedSec로 다시 계산한다.
export function useDailySession() {
  const [row, setRow] = useState(null) // null = idle(진행 중인 세션 없음)
  const [elapsed, setElapsed] = useState(0)
  const rowRef = useRef(null)
  const wakeLockRef = useRef(null)
  const awayPendingRef = useRef(false)
  const confirm = useConfirm()

  useEffect(() => {
    rowRef.current = row
  }, [row])

  // 최초 마운트 — 이미 진행 중인 세션이 있으면(예: 복구 다이얼로그에서 "이어서 하기") 그대로 이어받는다
  useEffect(() => {
    let alive = true
    activeSessionStore.get().then((r) => {
      if (!alive || !r) return
      setRow(r)
      setElapsed(computeElapsedSec(r))
      if (r.status === 'running') acquireWakeLock(wakeLockRef)
    })
    return () => {
      alive = false
    }
  }, [])

  // 화면 표시 갱신 전용
  useEffect(() => {
    if (!row || row.status !== 'running') return
    const i = setInterval(() => setElapsed(computeElapsedSec(rowRef.current)), 200)
    return () => clearInterval(i)
  }, [row])

  const persist = useCallback(async (patch) => {
    const next = await activeSessionStore.put(patch)
    setRow(next)
    return next
  }, [])

  const onReturn = useCallback(async () => {
    const cur = rowRef.current
    if (!cur) return
    const now = Date.now()
    setElapsed(computeElapsedSec(cur, now))
    if (cur.status === 'running') acquireWakeLock(wakeLockRef)

    const awayMs = now - (cur.lastSeenAt || now)
    if (cur.status === 'running' && awayMs > AWAY_THRESHOLD_MS && !awayPendingRef.current) {
      awayPendingRef.current = true
      const minutes = Math.round(awayMs / 60000)
      const include = await confirm(`${minutes}분 자리를 비우셨네요. 공부 시간에 포함할까요?`, {
        title: '자리 비움 감지',
        icon: '🚶',
        confirmText: '포함',
        cancelText: '제외',
      })
      const latest = rowRef.current
      if (latest) {
        if (!include) {
          const nextPausedMs = (latest.pausedMs || 0) + awayMs
          await persist({ pausedMs: nextPausedMs, lastSeenAt: now })
          setElapsed(computeElapsedSec({ ...latest, pausedMs: nextPausedMs }, now))
        } else {
          await persist({ lastSeenAt: now })
        }
      }
      awayPendingRef.current = false
    } else {
      await persist({ lastSeenAt: now })
    }
  }, [confirm, persist])

  // 백그라운드 복귀 시 즉시 재계산 + 20분 이상 이탈이면 자리비움 확인
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        if (rowRef.current) persist({ lastSeenAt: Date.now() })
        return
      }
      onReturn()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onReturn)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onReturn)
    }
  }, [onReturn, persist])

  // 언마운트 시 WakeLock만 정리 — 세션 자체(activeSession)는 유지한다(탭 전환일 수 있으므로)
  useEffect(() => {
    return () => {
      releaseWakeLock(wakeLockRef)
    }
  }, [])

  const start = useCallback(
    async (subjectId) => {
      const now = Date.now()
      await persist({
        subjectId,
        status: 'running',
        startedAt: now,
        pausedMs: 0,
        lastPausedAt: null,
        lastSeenAt: now,
        startClock: new Date(now).toISOString(),
      })
      setElapsed(0)
      acquireWakeLock(wakeLockRef)
    },
    [persist]
  )

  const pause = useCallback(async () => {
    const cur = rowRef.current
    if (!cur) return
    const now = Date.now()
    setElapsed(computeElapsedSec(cur, now))
    await persist({ status: 'paused', lastPausedAt: now, lastSeenAt: now })
    releaseWakeLock(wakeLockRef)
  }, [persist])

  const resume = useCallback(async () => {
    const cur = rowRef.current
    if (!cur) return
    const now = Date.now()
    const addedPause = cur.lastPausedAt ? now - cur.lastPausedAt : 0
    await persist({
      status: 'running',
      pausedMs: (cur.pausedMs || 0) + addedPause,
      lastPausedAt: null,
      lastSeenAt: now,
    })
    acquireWakeLock(wakeLockRef)
  }, [persist])

  // 세션 종료 — 최종 경과 시간·시작 시각을 스냅샷으로 반환하고 activeSession을 지운다
  const stop = useCallback(async () => {
    const cur = rowRef.current
    if (!cur) return null
    const now = Date.now()
    const snapshot = { elapsedSec: computeElapsedSec(cur, now), startClock: cur.startClock, subjectId: cur.subjectId }
    await activeSessionStore.clear()
    setRow(null)
    setElapsed(0)
    releaseWakeLock(wakeLockRef)
    return snapshot
  }, [])

  return {
    status: row?.status || 'idle',
    running: row?.status === 'running',
    paused: row?.status === 'paused',
    sessionSubjectId: row?.subjectId ?? null,
    elapsed,
    start,
    pause,
    resume,
    stop,
  }
}
