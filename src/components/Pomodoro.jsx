import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { uid } from '../lib/id.js'
import { dateStr, hms, clockHM } from '../lib/util.js'
import { useToast } from './ui.jsx'
import { useConfirm } from './confirm.jsx'

// 포모도로 모드 — Timer 의 3번째 탭.
// 단계: focus → short_break → focus → short_break → ... 4번째 focus 후엔 long_break.
// 집중 단계가 끝나면 자동으로 sessions 에 저장 (현재 선택 과목 기준).
// 탭 이동·앱 재시작에도 상태 유지 — localStorage 키 sh_pomo_state.

const STATE_KEY = 'sh_pomo_state'
const SUBJECT_KEY = 'sh_pomo_subject'

// 단계 라벨 / 이모지
const PHASE_INFO = {
  focus:       { label: '집중',     emoji: '🍅', tone: '#c0392b' },
  short_break: { label: '짧은 휴식', emoji: '☕', tone: '#388e3c' },
  long_break:  { label: '긴 휴식',   emoji: '🌳', tone: '#1b5e20' },
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null')
    if (!raw) return null
    return raw
  } catch { return null }
}
function saveState(s) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)) } catch {}
}
function clearState() {
  try { localStorage.removeItem(STATE_KEY) } catch {}
}

export default function Pomodoro() {
  const { data, update } = useStore()
  const { show, Toast } = useToast()
  const confirm = useConfirm()
  const [flash, setFlash] = useState(false)

  const focusMin       = data.settings.pomodoroFocusMin || 25
  const shortBreakMin  = data.settings.pomodoroBreakMin || 5
  const longBreakMin   = data.settings.pomodoroLongBreakMin || 15
  const cyclesPerLong  = data.settings.pomodoroCyclesPerLongBreak || 4

  // 과목 선택 — 일일 타이머와 별도로 보존
  const [subjectId, setSubjectId] = useState(() => {
    const saved = localStorage.getItem(SUBJECT_KEY)
    return saved && data.subjects.some((s) => s.id === saved)
      ? saved
      : data.subjects[0]?.id || ''
  })
  useEffect(() => {
    if (subjectId) localStorage.setItem(SUBJECT_KEY, subjectId)
  }, [subjectId])

  // 영구 상태 — 단계, 사이클 카운트, 시작 시점(에폭), 일시정지 누적 등
  const [phase, setPhase] = useState('focus')        // 'focus' | 'short_break' | 'long_break'
  const [cycleCount, setCycleCount] = useState(0)    // 완료한 집중 사이클 수
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(focusMin * 60) // 남은 초

  // 라이브 카운트다운 — 1초마다 remaining 감소
  const tickRef = useRef(null)
  const startEpochRef = useRef(null)  // 현재 단계가 마지막으로 시작된 epoch
  const startedAtRef = useRef(null)   // 현재 집중 단계의 사용자 시작 시각 (clockHM 용)

  // 초기 복구
  useEffect(() => {
    const s = loadState()
    if (s) {
      setPhase(s.phase || 'focus')
      setCycleCount(s.cycleCount || 0)
      setRemaining(s.remaining ?? (focusMin * 60))
      if (s.running && s.startEpoch) {
        const elapsed = Math.floor((Date.now() - s.startEpoch) / 1000)
        const baseRemaining = s.remainingAtStart ?? (focusMin * 60)
        const nextRemaining = Math.max(0, baseRemaining - elapsed)
        setRemaining(nextRemaining)
        if (nextRemaining > 0) {
          setRunning(true)
          startEpochRef.current = s.startEpoch
          startedAtRef.current = s.startedAt
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 단계가 바뀌면 남은 시간 재설정 (단, 복구 시점에는 위에서 처리되니 skip)
  const phaseDurationSec = (p) => {
    if (p === 'focus') return focusMin * 60
    if (p === 'short_break') return shortBreakMin * 60
    return longBreakMin * 60
  }

  // running 토글마다 setInterval 관리
  useEffect(() => {
    if (!running) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      return
    }
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1
        if (next <= 0) {
          handlePhaseEnd()
          return 0
        }
        return next
      })
    }, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // 단계 전환 시 카드 깜빡임 효과 (0.9s)
  const firstPhaseRef = useRef(true)
  useEffect(() => {
    if (firstPhaseRef.current) { firstPhaseRef.current = false; return }
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 900)
    return () => clearTimeout(t)
  }, [phase])

  // 상태 변경 시 localStorage persist
  useEffect(() => {
    saveState({
      phase, cycleCount, remaining,
      running,
      startEpoch: startEpochRef.current,
      remainingAtStart: running ? remaining : null, // 시작 시점의 남은 초 (재계산용)
      startedAt: startedAtRef.current,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cycleCount, remaining, running])

  function handleStart() {
    if (!subjectId && phase === 'focus') return
    if (running) return
    startEpochRef.current = Date.now()
    if (phase === 'focus' && !startedAtRef.current) {
      startedAtRef.current = new Date().toISOString()
    }
    setRunning(true)
  }

  function handlePause() {
    setRunning(false)
  }

  function handlePhaseEnd() {
    setRunning(false)
    // 집중 단계가 끝나면 sessions 에 저장
    if (phase === 'focus') {
      const secs = focusMin * 60
      const endC = clockHM()
      const startC = startedAtRef.current ? clockHM(startedAtRef.current) : clockHM(new Date(Date.now() - secs * 1000))
      update((d) => ({
        ...d,
        sessions: [
          ...d.sessions,
          { id: uid(), subjectId, date: dateStr(), seconds: secs, start: startC, end: endC, manual: false, mock: false },
        ],
      }))
      startedAtRef.current = null

      const nextCount = cycleCount + 1
      setCycleCount(nextCount)
      const nextPhase = (nextCount % cyclesPerLong === 0) ? 'long_break' : 'short_break'
      setPhase(nextPhase)
      setRemaining(phaseDurationSec(nextPhase))
      show(`🍅 집중 ${focusMin}분 완료! ${nextPhase === 'long_break' ? `긴 휴식 ${longBreakMin}분 ☕` : `짧은 휴식 ${shortBreakMin}분 ☕`}`)
    } else {
      // 휴식 끝 → 다시 집중
      setPhase('focus')
      setRemaining(phaseDurationSec('focus'))
      show('☕ 휴식 끝 — 다시 집중하러 가요 🍅')
    }
  }

  function handleSkip() {
    handlePhaseEnd()
  }

  async function handleReset() {
    const ok = await confirm('포모도로 사이클을 초기화할까요?\n(진행 중인 집중 시간은 저장되지 않아요)', {
      title: '포모도로 초기화',
      icon: '🔄',
      confirmText: '초기화',
    })
    if (!ok) return
    setRunning(false)
    setPhase('focus')
    setCycleCount(0)
    setRemaining(phaseDurationSec('focus'))
    startedAtRef.current = null
    clearState()
  }

  const info = PHASE_INFO[phase]
  const totalSec = phaseDurationSec(phase)
  const progress = totalSec > 0 ? Math.max(0, Math.min(100, ((totalSec - remaining) / totalSec) * 100)) : 0

  const subjectLocked = phase !== 'focus' || running
  return (
    <div className="grid g2">
      <div className={'card' + (flash ? ' pomo-flash' : '')}>
        <div className="card-title">🍅 포모도로 모드</div>
        <div className="hint" style={{ marginBottom: 8 }}>
          집중 <b>{focusMin}분</b> · 짧은 휴식 <b>{shortBreakMin}분</b> · 긴 휴식 <b>{longBreakMin}분</b> (매 {cyclesPerLong}사이클)
          <br />
          <span style={{ color: 'var(--muted)' }}>완료한 집중 사이클: <b style={{ color: 'var(--green-700)' }}>{cycleCount}</b>회</span>
        </div>

        <label className="fld" style={{ marginBottom: 10 }}>
          공부할 과목
          {subjectLocked
            ? <span className="hint" style={{ fontSize: 11, marginLeft: 6 }}>· 단계 진행 중에는 바꿀 수 없어요</span>
            : null}
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={subjectLocked}
          >
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <div className="pomo-phase" style={{ color: info.tone }}>
          {info.emoji} {info.label}
        </div>
        <div className="pomo-display">{hms(remaining)}</div>
        <div className="bar" style={{ marginBottom: 14 }}>
          <span style={{ width: progress + '%', background: info.tone }} />
        </div>

        <div className="timer-btns">
          {!running ? (
            <button className="btn btn-lg" onClick={handleStart} disabled={phase === 'focus' && !subjectId}>
              ▶ {remaining === phaseDurationSec(phase) ? '시작' : '계속'}
            </button>
          ) : (
            <button className="btn btn-lg ghost" onClick={handlePause}>⏸ 일시정지</button>
          )}
          <button className="btn btn-lg ghost" onClick={handleSkip}>⏭ 다음 단계로</button>
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
          <button className="btn ghost sm" onClick={handleReset}>🔄 초기화</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">💡 포모도로란?</div>
        <div className="hint" style={{ lineHeight: 1.7 }}>
          25분 집중 + 5분 휴식을 한 사이클로, 4번째 집중 후엔 긴 휴식 15분.
          시간 압박형 시험(PSAT 등) 대비에 효과 좋아요.
          <br /><br />
          <b style={{ color: 'var(--green-800)' }}>완료한 집중 사이클</b>은 <b>일반 학습 세션</b>으로 기록되어
          통계·플래너 타임라인·나무 성장에 모두 반영됩니다.
          <br /><br />
          시간 설정은 <b>설정 → 🍅 포모도로 설정</b> 에서 바꿀 수 있어요.
        </div>
      </div>

      <Toast />
    </div>
  )
}
