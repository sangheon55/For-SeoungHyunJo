import React, { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import { dateStr, addDays, prettyDate, dDay, hm, streak, treeInfo } from '../lib/util.js'
import { encouragements, pickEncouragement } from '../data/encouragements.js'
import { getSubject, SubjectTag } from '../components/ui.jsx'
import { dueToday } from '../lib/ebbinghaus.js'
import { pushProgress, pullCheers } from '../lib/friendBridge.js'
import { MEMBER_NAMES } from '../lib/friendMembers.js'

export default function Dashboard({ go }) {
  const { data, update } = useStore()
  const today = dateStr()
  const [cheers, setCheers] = useState([])

  // 앱을 열 때마다 오늘 진행상황을 동상이몽으로 밀어보내고, 받은 응원 메시지를 가져온다.
  // 실패해도 화면엔 아무 표시 없이 조용히 넘어간다(오프라인/권한 문제 등).
  useEffect(() => {
    pushProgress(data)
    pullCheers().then(setCheers)
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

  const ddays = [...data.examDates]
    .map((e) => ({ ...e, d: dDay(e.date) }))
    .sort((a, b) => a.d - b.d)

  const wrongDueCount = dueToday(data.wrongAnswers || [], today).length

  const toggleTask = (id) =>
    update((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))

  return (
    <div>
      <div className="page-title">{prettyDate(today)}</div>
      <div className="page-sub">성현아, 오늘도 합격을 향해 한 걸음 🌿</div>

      <div className="cheer" style={{ marginBottom: 16 }}>
        <div className="lbl">💌 오늘의 응원</div>
        <div className="msg">{cheer}</div>
      </div>

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
