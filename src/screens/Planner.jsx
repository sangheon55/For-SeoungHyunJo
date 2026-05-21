import React, { useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { dateStr, addDays, prettyDate, hm } from '../lib/util.js'
import { getSubject, SubjectTag } from '../components/ui.jsx'

export default function Planner() {
  const { data, update } = useStore()
  const [date, setDate] = useState(dateStr())
  const [text, setText] = useState('')
  const [subjectId, setSubjectId] = useState('')

  const dayTasks = data.tasks.filter((t) => t.date === date)
  const daySessions = data.sessions.filter((s) => s.date === date)
  const studied = daySessions.reduce((a, s) => a + s.seconds, 0)

  const addTask = () => {
    const v = text.trim()
    if (!v) return
    update((d) => ({
      ...d,
      tasks: [...d.tasks, { id: uid(), date, subjectId: subjectId || null, text: v, done: false }],
    }))
    setText('')
  }
  const toggle = (id) =>
    update((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))
  const del = (id) =>
    update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))

  const done = dayTasks.filter((t) => t.done).length

  return (
    <div>
      <div className="page-title">플래너</div>
      <div className="page-sub">하루하루 할 일을 계획하고 체크하세요 📅</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex-between">
          <div className="row" style={{ alignItems: 'center', gap: 8 }}>
            <button className="btn ghost sm" onClick={() => setDate(addDays(date, -1))}>◀ 어제</button>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="btn ghost sm" onClick={() => setDate(addDays(date, 1))}>내일 ▶</button>
            <button className="btn ghost sm" onClick={() => setDate(dateStr())}>오늘</button>
          </div>
          <div className="hint">
            {prettyDate(date)} · 완료 {done}/{dayTasks.length} · 공부 {hm(studied)}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">할 일 추가</div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="fld" style={{ flex: 1 }}>
            내용
            <input
              type="text"
              value={text}
              placeholder="예: 자료해석 2017년 기출 풀기"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
            />
          </label>
          <label className="fld">
            과목
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">과목 없음</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={addTask}>+ 추가</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">{prettyDate(date)} 할 일</div>
        {dayTasks.length === 0 && <div className="empty">할 일이 없어요. 위에서 추가해 보세요.</div>}
        {dayTasks.map((t) => (
          <div className={'item' + (t.done ? ' done' : '')} key={t.id}>
            <input type="checkbox" className="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            <span className="grow">{t.text}</span>
            {t.subjectId && <SubjectTag subject={getSubject(data, t.subjectId)} />}
            <button className="btn danger sm" onClick={() => del(t.id)}>삭제</button>
          </div>
        ))}
      </div>
    </div>
  )
}
