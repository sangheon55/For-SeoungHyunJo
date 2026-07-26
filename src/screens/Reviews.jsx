import React, { useState } from 'react'
import { useStore } from '../store.jsx'
import { uid } from '../lib/id.js'
import { getSubject, SubjectTag, useToast } from '../components/ui.jsx'

export default function Reviews({ lite = false }) {
  const { data, update } = useStore()
  const { show, Toast } = useToast()
  const [name, setName] = useState('')
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id || '')
  const [total, setTotal] = useState(10)

  const addBook = () => {
    const v = name.trim()
    if (!v || total < 1) return
    update((d) => ({
      ...d,
      reviews: [
        ...d.reviews,
        { id: uid(), name: v, subjectId, totalChapters: Number(total), doneChapters: 0, round: 1 },
      ],
    }))
    setName('')
  }

  const step = (id, delta) => {
    update((d) => ({
      ...d,
      reviews: d.reviews.map((b) => {
        if (b.id !== id) return b
        let done = b.doneChapters + delta
        let round = b.round
        if (done >= b.totalChapters) {
          done = 0
          round += 1
          show(`📚 "${b.name}" ${b.round}회독 완료! ${round}회독 시작 🎉`)
        }
        if (done < 0) done = 0
        return { ...b, doneChapters: done, round }
      }),
    }))
  }
  const del = (id) => update((d) => ({ ...d, reviews: d.reviews.filter((b) => b.id !== id) }))

  return (
    <div>
      <div className="page-title">회독 관리</div>

      {!lite && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">교재 추가</div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <label className="fld" style={{ flex: 1 }}>
              교재명
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: PSAT 자료해석 기출 10개년" />
            </label>
            <label className="fld">
              과목
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="fld">
              총 챕터 수
              <input type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} style={{ width: 90 }} />
            </label>
            <button className="btn" onClick={addBook}>+ 추가</button>
          </div>
        </div>
      )}

      {data.reviews.length === 0 && (
        <div className="card empty">
          {lite ? '등록된 교재가 없어요. 데스크탑에서 먼저 교재를 등록해 주세요.' : '등록된 교재가 없어요.'}
        </div>
      )}
      {data.reviews.map((b) => {
        const pct = Math.round((b.doneChapters / b.totalChapters) * 100)
        return (
          <div className="card" key={b.id} style={{ marginBottom: 12 }}>
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <div>
                <b style={{ fontSize: 14 }}>{b.name}</b>{' '}
                <SubjectTag subject={getSubject(data, b.subjectId)} />
              </div>
              <span className="dday-badge">{b.round}회독 진행 중</span>
            </div>
            <div className="bar" style={{ marginBottom: 8 }}>
              <span style={{ width: pct + '%' }} />
            </div>
            <div className="flex-between">
              <span className="hint">{b.doneChapters} / {b.totalChapters} 챕터 ({pct}%)</span>
              <div className="row" style={{ gap: 6 }}>
                {!lite && <button className="btn ghost sm" onClick={() => step(b.id, -1)}>− 챕터</button>}
                <button className="btn sm" onClick={() => step(b.id, 1)}>+ 챕터</button>
                {!lite && <button className="btn danger sm" onClick={() => del(b.id)}>삭제</button>}
              </div>
            </div>
          </div>
        )
      })}
      <Toast />
    </div>
  )
}
