import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { uid } from '../lib/id.js'
import { dateStr, hms, hm, inRange, treeInfo, clockHM, streak } from '../lib/util.js'
import { useToast } from '../components/ui.jsx'
import StartChecklist from '../components/StartChecklist.jsx'
import Pomodoro from '../components/Pomodoro.jsx'
import { useDailySession } from '../lib/dailySession.js'
import { pushProgress } from '../lib/friendBridge.js'
import KaguyaLayer from '../kaguya/KaguyaLayer.jsx'
import { currentTimeOfDay, selectDialogue, timerEndKey, timerStartKey } from '../kaguya/dialogueSelector.js'
import { generateFujiwaraInterrupt, generateKaguyaDialogue } from '../kaguya/kaguyaApi.js'
import {
  decideFujiwaraInterrupt,
  fallbackFujiwaraSequence,
  getFujiwaraEventType,
  normalizeFujiwaraSequence,
  recordFujiwaraInterrupt,
} from '../kaguya/fujiwaraInterrupt.js'

// 공용 스톱워치 훅
// persistKey를 주면 상태를 localStorage에 저장한다.
// → 다른 탭으로 이동해 컴포넌트가 언마운트돼도 타이머가 초기화되지 않는다.
//   (실행 중에는 시작 시각을 저장하므로 떠나 있는 동안에도 시간이 정확히 흐른다)
function useStopwatch(persistKey) {
  const restore = () => {
    if (!persistKey) return { elapsed: 0, running: false }
    try {
      const s = JSON.parse(localStorage.getItem(persistKey))
      if (!s) return { elapsed: 0, running: false }
      if (s.running) {
        return { elapsed: Math.max(0, (Date.now() - s.startEpoch) / 1000), running: true }
      }
      return { elapsed: s.elapsed || 0, running: false }
    } catch {
      return { elapsed: 0, running: false }
    }
  }
  const [init] = useState(restore)
  const [elapsed, setElapsed] = useState(init.elapsed)
  const [running, setRunning] = useState(init.running)
  const startRef = useRef(0)

  useEffect(() => {
    if (!running) return
    startRef.current = Date.now() - elapsed * 1000
    const i = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 200)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // 상태가 바뀔 때마다 localStorage에 보존한다.
  useEffect(() => {
    if (!persistKey) return
    const payload = running
      ? { running: true, startEpoch: Date.now() - elapsed * 1000 }
      : { running: false, elapsed }
    localStorage.setItem(persistKey, JSON.stringify(payload))
  }, [running, elapsed, persistKey])

  return {
    elapsed,
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    setElapsed,
    setRunning,
  }
}

export default function Timer({ go }) {
  const [tab, setTab] = useState('daily')
  return (
    <div>
      <div className="page-title">학습 타이머</div>
      <div className="tabs">
        <button className={'tab' + (tab === 'daily' ? ' active' : '')} onClick={() => setTab('daily')}>
          ⏱ 일일 공부량
        </button>
        <button className={'tab' + (tab === 'pomo' ? ' active' : '')} onClick={() => setTab('pomo')}>
          🍅 포모도로
        </button>
        <button className={'tab' + (tab === 'watch' ? ' active' : '')} onClick={() => setTab('watch')}>
          🕒 스톱워치
        </button>
      </div>
      {tab === 'daily' && <DailyTimer go={go} />}
      {tab === 'pomo' && <Pomodoro go={go} />}
      {tab === 'watch' && <PlainStopwatch />}
    </div>
  )
}

// ── ① 일일 공부량 타이머 ─────────────────────────────────────
function DailyTimer({ go }) {
  const { data, update } = useStore()
  const { show, Toast } = useToast()
  const dailySession = useDailySession()
  const today = dateStr()
  // 선택 과목도 함께 보존 — 타이머가 유지되면 과목도 그대로여야 한다
  const [subjectId, setSubjectId] = useState(() => {
    const saved = localStorage.getItem('sh_timer_subject')
    return saved && data.subjects.some((s) => s.id === saved)
      ? saved
      : data.subjects[0]?.id || ''
  })
  useEffect(() => {
    if (subjectId) localStorage.setItem('sh_timer_subject', subjectId)
  }, [subjectId])
  // 복구된 세션(activeSession)이 있으면 그 세션의 과목으로 표시를 맞춘다
  useEffect(() => {
    if (dailySession.sessionSubjectId && dailySession.sessionSubjectId !== subjectId) {
      setSubjectId(dailySession.sessionSubjectId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailySession.sessionSubjectId])
  const [range, setRange] = useState('today')
  const [celebrate, setCelebrate] = useState(null)
  const [sessionActionPending, setSessionActionPending] = useState(false)
  const [kaguyaLine, setKaguyaLine] = useState(() => selectDialogue('timer.idle'))
  const [fujiwaraGuestVisible, setFujiwaraGuestVisible] = useState(false)
  const [fujiwaraGuestExiting, setFujiwaraGuestExiting] = useState(false)
  const [fujiwaraCutInVisible, setFujiwaraCutInVisible] = useState(false)
  const [fujiwaraInterruptBusy, setFujiwaraInterruptBusy] = useState(false)
  const [devInterruptType, setDevInterruptType] = useState('two_hours')
  const [devInterruptUseAi, setDevInterruptUseAi] = useState(true)
  const seenLineIdsRef = useRef([kaguyaLine.id])
  const generatedLineRequestRef = useRef(0)
  const generatedLineControllerRef = useRef(null)
  const interruptControllerRef = useRef(null)
  const interruptTimersRef = useRef([])
  const interruptRestoreLineRef = useRef(null)
  const sessionActionPendingRef = useRef(false)
  const kaguyaEnabled = data.settings.kaguyaEnabled !== false
  const todaySaved = data.sessions
    .filter((s) => s.date === today)
    .reduce((a, s) => a + s.seconds, 0)
  const liveToday = todaySaved + dailySession.elapsed
  const goalSec = (data.settings.dailyGoalMin || 510) * 60
  const goalPct = Math.min(100, Math.round((liveToday / goalSec) * 100))

  const cancelFujiwaraInterrupt = useCallback(({ updateUi = true } = {}) => {
    interruptControllerRef.current?.abort()
    interruptControllerRef.current = null
    interruptTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    interruptTimersRef.current = []
    if (updateUi) {
      setFujiwaraGuestVisible(false)
      setFujiwaraGuestExiting(false)
      setFujiwaraCutInVisible(false)
      setFujiwaraInterruptBusy(false)
      if (interruptRestoreLineRef.current) {
        setKaguyaLine(interruptRestoreLineRef.current)
      }
    }
    interruptRestoreLineRef.current = null
  }, [])

  useEffect(() => () => {
    generatedLineControllerRef.current?.abort()
    cancelFujiwaraInterrupt({ updateUi: false })
  }, [cancelFujiwaraInterrupt])

  const showKaguyaLine = useCallback((key, variables = {}) => {
    const line = selectDialogue(key, {
      seenLineIds: seenLineIdsRef.current,
      variables,
    })
    if (line.id !== 'fallback') {
      seenLineIdsRef.current = [...seenLineIdsRef.current, line.id]
    }
    setKaguyaLine(line)
    return line
  }, [])

  const playFujiwaraSequence = useCallback((beats, restoreLine) => {
    interruptTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    interruptTimersRef.current = []
    interruptRestoreLineRef.current = restoreLine
    setFujiwaraInterruptBusy(true)
    setFujiwaraGuestExiting(false)
    setFujiwaraGuestVisible(true)

    beats.forEach((beat) => {
      const timerId = window.setTimeout(() => {
        setKaguyaLine({
          id: `fujiwara-interrupt-${Date.now()}-${beat.character}`,
          key: 'timer.fujiwara-interrupt',
          char: beat.character,
          face: beat.face,
          text: beat.text,
          inner: beat.inner,
        })
      }, beat.delayMs)
      interruptTimersRef.current.push(timerId)
    })

    const lastDelay = beats.at(-1)?.delayMs || 0
    const exitTimerId = window.setTimeout(() => {
      setFujiwaraGuestExiting(true)
    }, lastDelay + 4_000)
    const restoreTimerId = window.setTimeout(() => {
      setFujiwaraGuestVisible(false)
      setFujiwaraGuestExiting(false)
      setKaguyaLine(restoreLine)
      setFujiwaraInterruptBusy(false)
      interruptRestoreLineRef.current = null
      interruptTimersRef.current = []
    }, lastDelay + 4_500)
    interruptTimersRef.current.push(exitTimerId)
    interruptTimersRef.current.push(restoreTimerId)
  }, [])

  const startFujiwaraInterrupt = useCallback(async ({
    seconds,
    subject,
    restoreLine,
    previousEventId,
    reverse = false,
    eventTypeOverride,
    forceFallback = false,
    minimumDelayMs = 3_000,
    recordState,
    eventId,
  }) => {
    cancelFujiwaraInterrupt()
    const controller = new AbortController()
    interruptControllerRef.current = controller
    interruptRestoreLineRef.current = restoreLine
    setFujiwaraInterruptBusy(true)
    const nextStreakDays = streak([...data.sessions, { date: today, seconds }])
    const eventType = eventTypeOverride || getFujiwaraEventType({
      seconds,
      hour: new Date().getHours(),
      streakDays: nextStreakDays,
    })
    const fallback = fallbackFujiwaraSequence(seconds, { eventType, reverse })
    const context = {
      eventType,
      reverse,
      subject,
      sessionMinutes: Math.round(seconds / 60),
      todayMinutes: Math.round((todaySaved + seconds) / 60),
      streakDays: nextStreakDays,
      timeOfDay: currentTimeOfDay(),
      previousLines: previousEventId ? [previousEventId] : [],
    }

    const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, minimumDelayMs))
    const [generated] = await Promise.all([
      forceFallback
        ? Promise.resolve(null)
        : generateFujiwaraInterrupt(context, { signal: controller.signal }),
      minimumDelay,
    ])
    if (controller.signal.aborted) return
    const beats = normalizeFujiwaraSequence(generated, fallback)
    if (recordState && eventId) {
      recordFujiwaraInterrupt(
        window.localStorage,
        today,
        recordState,
        eventId,
        beats[0]?.text,
      )
    }
    if (reverse) {
      setFujiwaraCutInVisible(true)
      const cutInTimerId = window.setTimeout(() => {
        setFujiwaraCutInVisible(false)
        playFujiwaraSequence(beats, restoreLine)
      }, 1_100)
      interruptTimersRef.current.push(cutInTimerId)
    } else {
      playFujiwaraSequence(beats, restoreLine)
    }
    if (interruptControllerRef.current === controller) interruptControllerRef.current = null
  }, [cancelFujiwaraInterrupt, data.sessions, playFujiwaraSequence, today, todaySaved])

  const replaceWithGeneratedLine = async (context) => {
    const requestId = ++generatedLineRequestRef.current
    generatedLineControllerRef.current?.abort()
    const controller = new AbortController()
    generatedLineControllerRef.current = controller
    const generated = await generateKaguyaDialogue(context, { signal: controller.signal })
    if (generated && requestId === generatedLineRequestRef.current) {
      setKaguyaLine((current) => ({ ...current, ...generated, id: `ai-${Date.now()}` }))
    }
    if (generatedLineControllerRef.current === controller) {
      generatedLineControllerRef.current = null
    }
  }

  const beginSessionAction = () => {
    if (sessionActionPendingRef.current) return false
    sessionActionPendingRef.current = true
    setSessionActionPending(true)
    return true
  }

  const endSessionAction = () => {
    sessionActionPendingRef.current = false
    setSessionActionPending(false)
  }

  const saveSession = async () => {
    if (!beginSessionAction()) return
    try {
      cancelFujiwaraInterrupt()
      const result = await dailySession.stop()
      if (!result) return
      const secs = Math.round(result.elapsedSec)
      if (secs < 1) return
      const beforeHours = data.sessions.reduce((a, s) => a + s.seconds, 0) / 3600
      const afterHours = beforeHours + secs / 3600
      const before = treeInfo(beforeHours)
      const after = treeInfo(afterHours)
      const endC = clockHM()
      const startC = result.startClock
        ? clockHM(result.startClock)
        : clockHM(new Date(Date.now() - secs * 1000))
      const newSession = { id: uid(), subjectId, date: today, seconds: secs, start: startC, end: endC, manual: false, mock: false }
      const nextData = update((current) => ({
        ...current,
        sessions: current.sessions.some((session) => session.id === newSession.id)
          ? current.sessions
          : [...current.sessions, newSession],
      }))
      if (!nextData) throw new Error('학습 데이터를 불러오지 못해 세션을 저장할 수 없습니다.')
      pushProgress(nextData)
      const subject = data.subjects.find((s) => s.id === subjectId)
      const endDialogueKey = timerEndKey(secs)
      const endLine = showKaguyaLine(endDialogueKey, {
        subject: subject?.name || '공부',
        duration: hm(secs),
      })
      const interrupt = decideFujiwaraInterrupt({
        seconds: secs,
        today,
        storage: window.localStorage,
        enabled: kaguyaEnabled && data.settings.fujiwaraInterruptEnabled !== false,
      })
      if (interrupt.trigger) {
        const eventId = secs >= 2 * 60 * 60
          ? 'fujiwara-interrupt-two-hours'
          : secs >= 60 * 60
            ? 'fujiwara-interrupt-one-hour'
            : 'fujiwara-interrupt-break'
        void startFujiwaraInterrupt({
          seconds: secs,
          subject: subject?.name || '공부',
          restoreLine: endLine,
          previousEventId: interrupt.state.lastLine,
          reverse: interrupt.reverse,
          recordState: interrupt.state,
          eventId,
        })
      }
      // 2시간 이상 달성 대사는 표정과 문구가 정해진 특별 이벤트이므로
      // AI 생성 대사로 덮어쓰지 않는다.
      if (!interrupt.trigger && endDialogueKey !== 'timer.end.impressive') {
        replaceWithGeneratedLine({
          event: endDialogueKey,
          subject: subject?.name || '공부',
          duration: hm(secs),
        })
      }
      if (after.completed > before.completed) {
        setCelebrate({ emoji: '🌲', title: '큰나무 완성!', msg: '한 그루가 너의 숲에 심어졌어요. 정말 대단해요, 성현아!' })
      } else if (after.idx > before.idx) {
        setCelebrate({ emoji: after.stage.emoji, title: `${after.stage.name}(으)로 성장!`, msg: '꾸준함이 나무를 키웠어요 🌿' })
      } else {
        show(`${hm(secs)} 기록 완료! 🌱`)
      }
    } finally {
      endSessionAction()
    }
  }

  // 과목별 누적
  const subjTotals = data.subjects.map((s) => {
    const sec = data.sessions
      .filter((x) => x.subjectId === s.id && inRange(x.date, range, today))
      .reduce((a, x) => a + x.seconds, 0)
    const all = data.sessions
      .filter((x) => x.subjectId === s.id)
      .reduce((a, x) => a + x.seconds, 0)
    return { ...s, sec, all }
  })
  const maxSec = Math.max(1, ...subjTotals.map((s) => s.sec))

  const startSession = async () => {
    if (!beginSessionAction()) return
    try {
      cancelFujiwaraInterrupt()
      const subject = data.subjects.find((s) => s.id === subjectId)
      showKaguyaLine(timerStartKey(), {
        subject: subject?.name || '공부',
      })
      await dailySession.start(subjectId)
      replaceWithGeneratedLine({
        event: timerStartKey(),
        subject: subject?.name || '공부',
      })
    } finally {
      endSessionAction()
    }
  }

  const previewFujiwaraInterrupt = ({ reverse = false } = {}) => {
    const subject = data.subjects.find((item) => item.id === subjectId)
    const secondsByType = {
      short_break: 25 * 60,
      one_hour: 60 * 60,
      two_hours: 2 * 60 * 60,
      late_night: 30 * 60,
      streak: 30 * 60,
    }
    const restoreLine = {
      id: 'dev-fujiwara-preview-kaguya',
      key: 'timer.end.impressive',
      char: 'kaguya',
      face: 'smug',
      text: '제법이네요.',
      inner: '(두 시간 이상 집중하다니… 솔직히 감탄했어.)',
    }
    setKaguyaLine(restoreLine)
    void startFujiwaraInterrupt({
      seconds: secondsByType[devInterruptType] || 2 * 60 * 60,
      subject: subject?.name || '공부',
      restoreLine,
      previousEventId: 'dev-preview',
      reverse,
      eventTypeOverride: devInterruptType,
      forceFallback: !devInterruptUseAi,
      minimumDelayMs: 500,
    })
  }

  return (
    <div className="grid g2">
      {kaguyaEnabled && (
        <KaguyaLayer
          face={kaguyaLine.face}
          text={kaguyaLine.text}
          inner={kaguyaLine.inner}
          speaker={kaguyaLine.char === 'fujiwara' ? 'fujiwara' : 'kaguya'}
          guestVisible={fujiwaraGuestVisible}
          guestExiting={fujiwaraGuestExiting}
          cutInVisible={fujiwaraCutInVisible}
          active={dailySession.running}
          studyContext={{
            subject: data.subjects.find((subject) => subject.id === subjectId)?.name || '공부',
            running: dailySession.running,
            sessionMinutes: Math.round(dailySession.elapsed / 60),
            todayMinutes: Math.round(liveToday / 60),
            goalMinutes: Math.round(goalSec / 60),
            goalPercent: goalPct,
          }}
        />
      )}
      <div className="card">
        <div className="card-title">⏱ 측정</div>
        <div className="flex-between" style={{ marginBottom: 6 }}>
          <span className="hint">오늘 목표 {hm(goalSec)} · 달성 {goalPct}%</span>
        </div>
        <div className="bar" style={{ marginBottom: 16 }}>
          <span style={{ width: goalPct + '%' }} />
        </div>

        <label className="fld" style={{ marginBottom: 10 }}>
          공부할 과목
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <div className="timer-display">{hms(dailySession.elapsed)}</div>

        {!dailySession.running && dailySession.elapsed < 1 && (
          <StartChecklist onConfigure={go ? () => go('settings') : undefined} />
        )}

        <div className="timer-btns">
          {dailySession.status === 'paused' ? (
            <button className="btn btn-lg" onClick={dailySession.resume}>▶ 계속</button>
          ) : !dailySession.running ? (
            <button
              className="btn btn-lg"
              onClick={startSession}
              disabled={!subjectId || sessionActionPending || fujiwaraInterruptBusy}
            >
              ▶ 시작
            </button>
          ) : (
            <button className="btn btn-lg ghost" onClick={dailySession.pause}>⏸ 일시정지</button>
          )}
          <button className="btn btn-lg ghost" onClick={saveSession} disabled={dailySession.elapsed < 1 || sessionActionPending}>
            ■ 종료·저장
          </button>
        </div>
        <div className="hint" style={{ marginTop: 12, textAlign: 'center' }}>
          종료하면 선택한 과목에 시간이 기록되고 나무가 자랍니다.
        </div>
        {import.meta.env.DEV && kaguyaEnabled && (
          <div className="fujiwara-dev-panel">
            <div className="fujiwara-dev-title">🧪 후지와라 난입 테스트</div>
            <div className="fujiwara-dev-controls">
              <select
                value={devInterruptType}
                onChange={(event) => setDevInterruptType(event.target.value)}
                disabled={fujiwaraInterruptBusy}
              >
                <option value="short_break">25분 · 간식</option>
                <option value="one_hour">1시간 · 게임</option>
                <option value="two_hours">2시간 · 놀람</option>
                <option value="late_night">야간 · 야식</option>
                <option value="streak">7일 연속 · 축하</option>
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={devInterruptUseAi}
                  onChange={(event) => setDevInterruptUseAi(event.target.checked)}
                />
                LLM 대사
              </label>
              <button
                className="btn ghost sm"
                onClick={() => previewFujiwaraInterrupt()}
                disabled={fujiwaraInterruptBusy}
              >
                일반 난입
              </button>
              <button
                className="btn ghost sm"
                onClick={() => previewFujiwaraInterrupt({ reverse: true })}
                disabled={fujiwaraInterruptBusy}
              >
                역난입 + 컷인
              </button>
            </div>
            <div className="hint">개발 전용 · 기록과 일일 횟수에 반영되지 않음</div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex-between">
          <div className="card-title" style={{ marginBottom: 0 }}>과목별 누적</div>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">오늘</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
            <option value="all">전체</option>
          </select>
        </div>
        <div style={{ marginTop: 14 }}>
          {subjTotals.map((s) => (
            <div className="subj-row" key={s.id}>
              <span className="nm" style={{ color: s.color }}>{s.name}</span>
              <span className="bar thin">
                <span style={{ width: Math.round((s.sec / maxSec) * 100) + '%', background: s.color }} />
              </span>
              <span className="tm">{hm(s.sec)} <small style={{ opacity: 0.6 }}>/ 총 {Math.floor(s.all / 3600)}h</small></span>
            </div>
          ))}
        </div>
      </div>

      {celebrate && (
        <div className="celebrate" onClick={() => setCelebrate(null)}>
          <div className="pop">
            <div className="big">{celebrate.emoji}</div>
            <h3 style={{ color: '#1b5e20', margin: '8px 0' }}>{celebrate.title}</h3>
            <p style={{ color: '#6b7d70', fontSize: 13 }}>{celebrate.msg}</p>
            <button className="btn" style={{ marginTop: 14 }} onClick={() => setCelebrate(null)}>고마워! 🌳</button>
          </div>
        </div>
      )}
      <Toast />
    </div>
  )
}

// ── ② 일반 스톱워치 ──────────────────────────────────────────
function PlainStopwatch() {
  const sw = useStopwatch('sh_timer_plain')
  const [laps, setLaps] = useState([])
  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <div className="card-title">⏱ 스톱워치</div>
      <div className="hint" style={{ marginBottom: 6 }}>
        기록을 저장하지 않는 단순 시간 측정용입니다. (통계·나무에 반영 안 됨)
      </div>
      <div className="timer-display">{hms(sw.elapsed)}</div>
      <div className="timer-btns">
        {!sw.running ? (
          <button className="btn btn-lg" onClick={sw.start}>▶ 시작</button>
        ) : (
          <button className="btn btn-lg ghost" onClick={sw.pause}>⏸ 일시정지</button>
        )}
        <button className="btn btn-lg ghost" onClick={() => setLaps((l) => [...l, sw.elapsed])} disabled={!sw.running}>
          ⚑ 랩
        </button>
        <button
          className="btn btn-lg danger"
          onClick={() => { sw.setRunning(false); sw.setElapsed(0); setLaps([]) }}
        >
          ↺ 리셋
        </button>
      </div>
      {laps.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {laps.map((l, i) => (
            <div className="lap" key={i}>
              <span>Lap {i + 1}</span>
              <span>{hms(l)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
