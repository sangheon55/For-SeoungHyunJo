import React, { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import { dateStr, addDays, prettyDate, dDay, hm, streak, treeInfo } from '../lib/util.js'
import { encouragements, pickEncouragement } from '../data/encouragements.js'
import { getSubject, SubjectTag } from '../components/ui.jsx'
import { dueToday } from '../lib/ebbinghaus.js'
import { pushProgress, pullCheers } from '../lib/friendBridge.js'
import { MEMBER_NAMES } from '../lib/friendMembers.js'
import {
  calculateInitiative,
  createDailyVerdict,
  dashboardFace,
  dashboardGreeting,
  initiativeLabel,
} from '../kaguya/dashboardState.js'

const kaguyaAsset = (face) => `${import.meta.env.BASE_URL}assets/characters/kaguya/upper_${face}.png`

export default function Dashboard({ go }) {
  const { data, update } = useStore()
  const today = dateStr()
  const [cheers, setCheers] = useState([])
  const kaguyaEnabled = data.settings.kaguyaEnabled !== false
  const [showFreshVerdict] = useState(() => data.settings.lastKaguyaVerdictShownDate !== today)

  // 앱을 열 때마다 오늘 진행상황을 동상이몽으로 밀어보내고, 받은 응원 메시지를 가져온다.
  // 실패해도 화면엔 아무 표시 없이 조용히 넘어간다(오프라인/권한 문제 등).
  useEffect(() => {
    let alive = true
    pushProgress(data)
    pullCheers().then((nextCheers) => {
      if (alive) setCheers(nextCheers)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cheer = pickEncouragement(encouragements, today)

  const sessions = data.sessions
  const totalHours = sessions.reduce((a, s) => a + s.seconds, 0) / 3600
  const tree = treeInfo(totalHours)

  const todaySec = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.seconds, 0)
  const ydaySec = sessions.filter((s) => s.date === addDays(today, -1)).reduce((a, s) => a + s.seconds, 0)
  const wilt = todaySec === 0 && ydaySec === 0

  const todayTasks = data.tasks.filter((t) => t.date === today)
  const doneCount = todayTasks.filter((t) => t.done).length

  const goalSec = (data.settings.dailyGoalMin || 510) * 60
  const goalPct = Math.min(100, Math.round((todaySec / goalSec) * 100))
  const yesterday = addDays(today, -1)
  const savedVerdict = data.settings.kaguyaVerdicts?.[yesterday]
  const yesterdayVerdict = savedVerdict || createDailyVerdict(sessions, yesterday, goalSec)
  const initiative = calculateInitiative(sessions, today, goalSec)
  const greeting = dashboardGreeting(new Date().getHours(), yesterdayVerdict)
  const facePath = kaguyaAsset(dashboardFace(greeting.face, initiative.value))
  const initiativeName = initiativeLabel(initiative.value)
  const heroTitle = showFreshVerdict ? greeting.title : '오늘의 두뇌전'
  const heroText = showFreshVerdict
    ? greeting.text
    : `현재 주도권은 ${initiativeName}. 오늘 기록으로 흐름을 바꿔보세요, 성현 씨.`
  const heroInner = showFreshVerdict
    ? greeting.inner
    : '(어제 판정은 끝났어요. 오늘은 어떤 결과를 보여주실 건가요?)'

  useEffect(() => {
    if (!kaguyaEnabled) return
    update((current) => {
      const hasVerdict = !!current.settings.kaguyaVerdicts?.[yesterday]
      const markedShown = current.settings.lastKaguyaVerdictShownDate === today
      if (hasVerdict && markedShown) return current
      return {
        ...current,
        settings: {
          ...current.settings,
          kaguyaVerdicts: {
            ...(current.settings.kaguyaVerdicts || {}),
            ...(!hasVerdict ? { [yesterday]: yesterdayVerdict } : {}),
          },
          lastKaguyaVerdictShownDate: today,
        },
      }
    })
  }, [kaguyaEnabled, today, update, yesterday, yesterdayVerdict])

  const ddays = [...data.examDates]
    .map((e) => ({ ...e, d: dDay(e.date) }))
    .sort((a, b) => a.d - b.d)

  const wrongDueCount = dueToday(data.wrongAnswers || [], today).length

  const toggleTask = (id) =>
    update((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))

  return (
    <div className={`dashboard-page${kaguyaEnabled ? ' is-kaguya' : ''}`}>
      <div className="page-title">{prettyDate(today)}</div>
      <div className="page-sub">
        {kaguyaEnabled ? '학생회실 두뇌전 · 오늘의 학습 현황' : '성현아, 오늘도 합격을 향해 한 걸음 🌿'}
      </div>

      {kaguyaEnabled ? (
        <section className={`kaguya-dashboard-hero verdict-${yesterdayVerdict.result}${showFreshVerdict ? ' is-fresh-verdict' : ' is-returning'}`}>
          <div className="kaguya-dashboard-copy">
            <div className="kaguya-dashboard-eyebrow">
              秀知院 学生会 · {showFreshVerdict ? 'DAILY VERDICT' : 'TODAY STATUS'}
            </div>
            <div className="kaguya-dashboard-verdict">{heroTitle}</div>
            <p className="kaguya-dashboard-line">{heroText}</p>
            <p className="kaguya-dashboard-inner">{heroInner}</p>

            <div className="initiative-card">
              <div className="initiative-head">
                <span>최근 7일 주도권</span>
                <b>{initiativeName} · {initiative.value}</b>
              </div>
              <div className="initiative-track" aria-label={`주도권 ${initiative.value}점`}>
                <span className="initiative-mid" />
                <span className="initiative-fill" style={{ width: `${initiative.value}%` }} />
                <span className="initiative-marker" style={{ left: `${initiative.value}%` }} />
              </div>
              <div className="initiative-labels">
                <span>카구야 우세</span>
                <span>호각</span>
                <span>성현 우세</span>
              </div>
            </div>
          </div>
          <img className="kaguya-dashboard-character" src={facePath} alt="" draggable="false" />
        </section>
      ) : (
        <div className="cheer" style={{ marginBottom: 16 }}>
          <div className="lbl">💌 오늘의 응원</div>
          <div className="msg">{cheer}</div>
        </div>
      )}

      {cheers.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">📨 받은 응원 메시지</div>
          {cheers.map((c) => (
            <div key={c.id} className="item" style={{ alignItems: 'flex-start' }}>
              <span className="grow">
                <b>{MEMBER_NAMES[c.fromMemberId] || '누군가'}</b>: {c.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid g2" style={{ marginBottom: 16 }}>
        {/* 나무 위젯 */}
        <div className="card tree-box">
          <div className="card-title" style={{ textAlign: 'left' }}>🌳 나의 나무</div>
          <div className={'tree-emoji' + (wilt ? ' wilt' : '')}>{tree.stage.emoji}</div>
          <div className="tree-soil" />
          <div className="tree-stage">
            {tree.stage.name} · Lv.{tree.level}
            {wilt && <span style={{ color: '#c0392b', fontSize: 12 }}> (물이 필요해요 💧)</span>}
          </div>
          <div className="tree-sub">
            누적 {Math.floor(totalHours)}시간 · 다음 단계까지 {Math.max(0, Math.ceil(tree.nextAt - tree.cur))}시간
          </div>
          <div className="bar" style={{ maxWidth: 260, margin: '0 auto' }}>
            <span style={{ width: Math.round(tree.progress * 100) + '%' }} />
          </div>
          {tree.completed > 0 && (
            <div className="tree-sub" style={{ marginTop: 8 }}>
              🌲 키운 숲: 큰나무 {tree.completed}그루
            </div>
          )}
        </div>

        {/* D-day */}
        <div className="card">
          <div className="card-title">📅 D-day</div>
          {ddays.length === 0 && <div className="empty">설정에서 시험일을 등록해 주세요.</div>}
          {ddays.map((e) => (
            <div className="dday-item" key={e.id}>
              <span>{e.name}</span>
              <span className={'dday-badge' + (e.d < 0 ? ' done' : e.d <= 14 ? ' warn' : '')}>
                {e.d < 0 ? '종료' : e.d === 0 ? 'D-DAY' : 'D-' + e.d}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 요약 칩 */}
      <div className="stat-mini" style={{ marginBottom: 16 }}>
        <div className="chip">🔥 연속 학습 <b>{streak(sessions)}</b>일</div>
        <div className="chip">⏱ 오늘 공부량 <b>{hm(todaySec)}</b></div>
        <div className="chip">🎯 오늘 목표 달성 <b>{goalPct}</b>%</div>
        <div className="chip">✅ 오늘 할 일 <b>{doneCount}/{todayTasks.length}</b></div>
        {wrongDueCount > 0 && (
          <button
            className="chip"
            onClick={() => go('wrong')}
            style={{ cursor: 'pointer', border: 'none', background: '#fff3cd', color: '#7a5a00' }}
          >
            📝 오늘 복습 <b>{wrongDueCount}</b>개
          </button>
        )}
      </div>

      {/* 오늘 할 일 */}
      <div className="card">
        <div className="flex-between">
          <div className="card-title" style={{ marginBottom: 0 }}>오늘 할 일</div>
          <button className="btn ghost sm" onClick={() => go('planner')}>플래너에서 편집</button>
        </div>
        <div style={{ marginTop: 10 }}>
          {todayTasks.length === 0 && <div className="empty">오늘 등록된 할 일이 없어요. 플래너에서 추가해 보세요.</div>}
          {todayTasks.map((t) => (
            <label className={'item' + (t.done ? ' done' : '')} key={t.id}>
              <input
                type="checkbox"
                className="checkbox"
                checked={t.done}
                onChange={() => toggleTask(t.id)}
              />
              <span className="grow">{t.text}</span>
              {t.subjectId && <SubjectTag subject={getSubject(data, t.subjectId)} />}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
