import React, { useState } from 'react'
import { useStore } from '../store.jsx'
import { uid } from '../lib/id.js'
import { dateStr } from '../lib/util.js'

export default function Memos() {
  const { data, update } = useStore()
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id || '')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [editId, setEditId] = useState(null)

  const memos = data.memos
    .filter((m) => m.subjectId === subjectId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  const reset = () => { setTitle(''); setBody(''); setEditId(null) }

  const save = () => {
    const t = title.trim()
    if (!t) return
    if (editId) {
      update((d) => ({
        ...d,
        memos: d.memos.map((m) =>
          m.id === editId ? { ...m, title: t, body, updatedAt: dateStr() } : m
        ),
      }))
    } else {
      update((d) => ({
        ...d,
        memos: [...d.memos, { id: uid(), subjectId, title: t, body, updatedAt: dateStr() }],
      }))
    }
    reset()
  }
  const edit = (m) => { setEditId(m.id); setTitle(m.title); setBody(m.body) }
  const del = (id) => {
    update((d) => ({ ...d, memos: d.memos.filter((m) => m.id !== id) }))
    if (editId === id) reset()
  }

  return (
    <div>
      <div className="page-title">과목 메모</div>

      <div className="split">
        <div className="card subj-list">
          <div className="card-title">과목</div>
          {data.subjects.map((s) => (
            <button
              key={s.id}
              className={'pick' + (s.id === subjectId ? ' active' : '')}
              onClick={() => { setSubjectId(s.id); reset() }}
            >
              <span className="dot" style={{ background: s.color }} />
              {s.name}
              <span style={{ marginLeft: 'auto', color: '#9aa', fontSize: 11 }}>
                {data.memos.filter((m) => m.subjectId === s.id).length}
              </span>
            </button>
          ))}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">{editId ? '메모 수정' : '새 메모'}</div>
            <label className="fld" style={{ marginBottom: 8 }}>
              제목
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="메모 제목" />
            </label>
            <label className="fld" style={{ marginBottom: 10 }}>
              내용
              <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="자유롭게 정리하세요" />
            </label>
            <div className="row">
              <button className="btn" onClick={save}>{editId ? '수정 저장' : '+ 메모 추가'}</button>
              {editId && <button className="btn ghost" onClick={reset}>취소</button>}
            </div>
          </div>

          {memos.length === 0 && <div className="card empty">이 과목에 작성한 메모가 없어요.</div>}
          {memos.map((m) => (
            <div className="memo-card" key={m.id}>
              <div className="flex-between">
                <h4>{m.title}</h4>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn ghost sm" onClick={() => edit(m)}>수정</button>
                  <button className="btn danger sm" onClick={() => del(m.id)}>삭제</button>
                </div>
              </div>
              {m.body && <div className="body">{m.body}</div>}
              <div className="meta">최종 수정 {m.updatedAt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
