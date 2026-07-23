import React, { useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { dateStr, addDays, prettyDate, hm, hmToMin } from '../lib/util.js'
import { getSubject, SubjectTag } from '../components/ui.jsx'
import { useConfirm } from '../components/confirm.jsx'

export default function Planner({ lite = false }) {
  const { data, update } = useStore()
  const confirm = useConfirm()
  const [date, setDate] = useState(dateStr())
  const [text, setText] = useState('')
  const [subjectId, setSubjectId] = useState('')

  const dayTasks = data.tasks.filter((t) => t.date === date)
  const daySessions = data.sessions.filter((s) => s.date === date)
  const studied = daySessions.reduce((a, s) => a + s.seconds, 0)

  // 학습일 기준 시각 키 — 새벽 3시 이전 시각은 "다음날 새벽"(전날 학습일의 종반)으로 본다.
  // 예: 22:00 → 1320, 02:00 → 1560 (1440+120). 22:00 시작 → 02:00 종료 세션이 자연스럽게 정렬됨.
  const dayKey = (clockStr) => {
    const m = hmToMin(clockStr)
    if (m == null) return 99999
    return m < 3 * 60 ? m + 24 * 60 : m
  }

  // 시작 시각순 오름차순 정렬 (시각 없는 옛 기록은 맨 뒤로)
  const sortedSessions = [...daySessions].sort((a, b) => {
    const am = dayKey(a.start)
    const bm = dayKey(b.start)
    if (am !== bm) return am - bm
    return dayKey(a.end) - dayKey(b.end)
  })

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

  // ── 학습 기록(타임라인) 직접 추가·수정 ──────────────────────
  const [mSubject, setMSubject] = useState(data.subjects[0]?.id || '')
  const [mStart, setMStart] = useState('')
  const [mEnd, setMEnd] = useState('')
  const [editId, setEditId] = useState(null)

  const resetForm = () => {
    setMStart('')
    setMEnd('')
    setEditId(null)
  }
  const saveSession = () => {
    const sm = hmToMin(mStart)
    let em = hmToMin(mEnd)
    if (sm == null || em == null) {
      window.alert('시작·종료 시간을 입력해 주세요.')
      return
    }
    // 자정을 넘기는 세션(예: 22:00 ~ 02:00) 은 종료에 24h 더해서 계산
    if (em < sm) em += 24 * 60
    if (em - sm <= 0) {
      window.alert('종료 시간이 시작 시간보다 늦어야 해요.')
      return
    }
    const secs = (em - sm) * 60
    if (editId) {
      update((d) => ({
        ...d,
        sessions: d.sessions.map((s) =>
          s.id === editId
            ? { ...s, subjectId: mSubject, start: mStart, end: mEnd, seconds: secs, manual: true }
            : s,
        ),
      }))
    } else {
      update((d) => ({
        ...d,
        sessions: [
          ...d.sessions,
          { id: uid(), subjectId: mSubject, date, start: mStart, end: mEnd, seconds: secs, manual: true, mock: false },
        ],
      }))
    }
    resetForm()
  }
  const editSession = (s) => {
    setEditId(s.id)
    setMSubject(s.subjectId || data.subjects[0]?.id || '')
    setMStart(s.start || '')
    setMEnd(s.end || '')
  }
  const delSession = async (id) => {
    const ok = await confirm('이 학습 기록을 삭제할까요?', {
      title: '학습 기록 삭제',
      variant: 'danger',
      confirmText: '삭제',
    })
    if (!ok) return
    update((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }))
    if (editId === id) resetForm()
  }

  // ── 하루 돌아보기 메모 ──────────────────────────────────────
  const dayNote = (data.dayNotes && data.dayNotes[date]) || ''
  const setDayNote = (v) =>
    update((d) => ({ ...d, dayNotes: { ...(d.dayNotes || {}), [date]: v } }))

  return (
    <div>
      <div className="page-title">플래너</div>
      <div className="page-sub">하루하루 할 일을 계획하고, 공부 동선을 기록하세요 📅</div>

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

      <div className="card" style={{ marginBottom: 16 }}>
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

      {/* ── 학습 타임라인 ──────────────────────────────────── */}
      <div className="card">
        <div className="flex-between">
          <div className="card-title" style={{ marginBottom: 0 }}>🕒 학습 타임라인</div>
          <span className="hint">총 공부 {hm(studied)}</span>
        </div>

        <div className="timeline" style={{ marginTop: 12 }}>
          {sortedSessions.length === 0 && (
            <div className="empty">이 날의 학습 기록이 없어요. 아래에서 직접 추가할 수 있어요.</div>
          )}
          {sortedSessions.map((s, i) => {
            const subj = getSubject(data, s.subjectId)
            const prev = sortedSessions[i - 1]
            const gap =
              prev && prev.end && s.start ? dayKey(s.start) - dayKey(prev.end) : null
            return (
              <React.Fragment key={s.id}>
                {gap != null && gap > 0 && (
                  <div className="tl-break">☕ 휴식 {hm(gap * 60)}</div>
                )}
                <div className="tl-row">
                  <div className="tl-time">
                    {s.start || '--:--'}
                    <br />
                    {s.end || '--:--'}
                  </div>
                  <div className="tl-bar" style={{ background: subj?.color || '#9aa' }} />
                  <div className="tl-body">
                    <div className="tl-name">
                      {subj?.name || '미지정'}
                      {s.manual && <span className="tl-manual">✋ 직접입력</span>}
                    </div>
                    <div className="tl-dur">{hm(s.seconds)}</div>
                  </div>
                  <div className="tl-actions">
                    {!lite && <button className="btn ghost sm" onClick={() => editSession(s)}>수정</button>}
                    <button className="btn danger sm" onClick={() => delSession(s.id)}>삭제</button>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
        </div>

        {/* 직접 추가 / 수정 폼 — 모바일 lite에서는 숨김(데스크탑 전용) */}
        {!lite && (
          <div className="section-gap" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div className="card-title" style={{ fontSize: 13 }}>
              {editId ? '✏️ 학습 기록 수정' : '✋ 학습 기록 직접 추가'}
            </div>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <label className="fld">
                과목
                <select value={mSubject} onChange={(e) => setMSubject(e.target.value)}>
                  {data.subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="fld">
                시작
                <input type="time" value={mStart} onChange={(e) => setMStart(e.target.value)} />
              </label>
              <label className="fld">
                종료
                <input type="time" value={mEnd} onChange={(e) => setMEnd(e.target.value)} />
              </label>
              <button className="btn" onClick={saveSession}>{editId ? '수정 저장' : '+ 추가'}</button>
              {editId && (
                <button className="btn ghost" onClick={resetForm}>취소</button>
              )}
            </div>
            <div className="hint section-gap">
              타이머를 깜빡했거나 기록이 날아갔을 때 직접 입력하세요.
              직접 입력·수정한 기록은 타임라인에 ✋ 로 표시됩니다.
            </div>
          </div>
        )}
      </div>

      {/* ── 하루 돌아보기 메모 ───────────────────────────────── */}
      <div className="card section-gap">
        <div className="card-title">📝 오늘 하루 돌아보기</div>
        <div className="hint" style={{ marginBottom: 8 }}>
          공부를 마치고 잘된 점·아쉬운 점·내일 계획을 적어보세요. 입력하는 대로 자동 저장됩니다.
        </div>
        <textarea
          rows={5}
          style={{ width: '100%' }}
          value={dayNote}
          placeholder="예: 자료해석 시간 단축 연습함. 상황판단 정답률이 아쉬움. 내일은 기출 2회독 시작."
          onChange={(e) => setDayNote(e.target.value)}
        />
      </div>
    </div>
  )
}
