import React, { useEffect, useRef, useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { dateStr, hms, hm, inRange, treeInfo } from '../lib/util.js'
import { useToast } from '../components/ui.jsx'

// 공용 스톱워치 훅
function useStopwatch() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const startRef = useRef(0)
  useEffect(() => {
    if (!running) return
    startRef.current = Date.now() - elapsed * 1000
    const i = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 200)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])
  return {
    elapsed,
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    setElapsed,
    setRunning,
  }
}

export default function Timer() {
  const [tab, setTab] = useState('daily')
  return (
    <div>
      <div className="page-title">학습 타이머</div>
      <div className="page-sub">공부 시간을 과목별로 측정하고, 나무를 키워보세요 🌱</div>
      <div className="tabs">
        <button className={'tab' + (tab === 'daily' ? ' active' : '')} onClick={() => setTab('daily')}>
          ① 일일 공부량 타이머
        </button>
        <button className={'tab' + (tab === 'watch' ? ' active' : '')} onClick={() => setTab('watch')}>
          ② 일반 스톱워치
        </button>
      </div>
      {tab === 'daily' ? <DailyTimer /> : <PlainStopwatch />}
    </div>
  )
}

// ── ① 일일 공부량 타이머 ─────────────────────────────────────
function DailyTimer() {
  const { data, update } = useStore()
  const { show, Toast } = useToast()
  const sw = useStopwatch()
  const today = dateStr()
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id || '')
  const [range, setRange] = useState('today')
  const [celebrate, setCelebrate] = useState(null)

  const todaySaved = data.sessions
    .filter((s) => s.date === today)
    .reduce((a, s) => a + s.seconds, 0)
  const liveToday = todaySaved + (sw.running ? sw.elapsed : sw.elapsed)
  const goalSec = (data.settings.dailyGoalMin || 510) * 60
  const goalPct = Math.min(100, Math.round((liveToday / goalSec) * 100))

  const saveSession = () => {
    const secs = Math.round(sw.elapsed)
    if (secs < 1) {
      sw.setRunning(false)
      sw.setElapsed(0)
      return
    }
    const beforeHours = data.sessions.reduce((a, s) => a + s.seconds, 0) / 3600
    const afterHours = beforeHours + secs / 3600
    const before = treeInfo(beforeHours)
    const after = treeInfo(afterHours)
    update((d) => ({
      ...d,
      sessions: [...d.sessions, { id: uid(), subjectId, date: today, seconds: secs, mock: false }],
    }))
    sw.setRunning(false)
    sw.setElapsed(0)
    if (after.completed > before.completed) {
      setCelebrate({ emoji: '🌲', title: '큰나무 완성!', msg: '한 그루가 너의 숲에 심어졌어요. 정말 대단해요, 성현아!' })
    } else if (after.idx > before.idx) {
      setCelebrate({ emoji: after.stage.emoji, title: `${after.stage.name}(으)로 성장!`, msg: '꾸준함이 나무를 키웠어요 🌿' })
    } else {
      show(`${hm(secs)} 기록 완료! 🌱`)
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

  return (
    <div className="grid g2">
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

        <div className="timer-display">{hms(sw.elapsed)}</div>
        <div className="timer-btns">
          {!sw.running ? (
            <button className="btn btn-lg" onClick={sw.start} disabled={!subjectId}>▶ 시작</button>
          ) : (
            <button className="btn btn-lg ghost" onClick={sw.pause}>⏸ 일시정지</button>
          )}
          <button className="btn btn-lg ghost" onClick={saveSession} disabled={sw.elapsed < 1}>
            ■ 종료·저장
          </button>
        </div>
        <div className="hint" style={{ marginTop: 12, textAlign: 'center' }}>
          종료하면 선택한 과목에 시간이 기록되고 나무가 자랍니다.
        </div>
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
  const sw = useStopwatch()
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
