import React, { useEffect, useState } from 'react'

// 카테고리 일괄 편집 모달. props:
//   open: boolean
//   onClose: () => void
//   categories: [{ name, color }]
//   onSave: (nextCategories, renamedMap, deletedNames) => void
//     renamedMap = { '옛 이름': '새 이름' } — 이름만 변경된 카테고리
//     deletedNames = ['삭제된 이름'] — 사라진 카테고리(링크는 '기타'로 폴백)
export default function CategoryEditor({ open, onClose, categories, onSave }) {
  // 로컬 편집 상태 — 행마다 originalName(처음 이름) 을 같이 들고 다녀
  // 저장 시 이름 변경 diff 를 계산할 수 있게 함.
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!open) return
    setRows((categories || []).map((c) => ({
      key: rid(),
      originalName: c.name,
      name: c.name,
      color: c.color || '#9aa',
    })))
  }, [open, categories])

  if (!open) return null

  const update = (i, patch) => setRows((r) => r.map((row, idx) => idx === i ? { ...row, ...patch } : row))
  const move = (i, dir) => setRows((r) => {
    const j = i + dir
    if (j < 0 || j >= r.length) return r
    const next = [...r]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })
  const remove = (i) => setRows((r) => r.filter((_, idx) => idx !== i))
  const add = () => setRows((r) => [...r, {
    key: rid(),
    originalName: null, // 신규
    name: '',
    color: randomGreen(),
  }])

  const save = () => {
    const cleaned = rows
      .map((r) => ({ ...r, name: (r.name || '').trim() }))
      .filter((r) => r.name)

    // 이름 중복 검사
    const names = cleaned.map((r) => r.name)
    const dup = names.find((n, i) => names.indexOf(n) !== i)
    if (dup) { alert(`'${dup}' 카테고리가 중복돼요. 이름을 다르게 해 주세요.`); return }

    // 이름 변경 매핑
    const renamedMap = {}
    for (const r of cleaned) {
      if (r.originalName && r.originalName !== r.name) {
        renamedMap[r.originalName] = r.name
      }
    }

    // 삭제된 이름
    const survivingOriginal = new Set(cleaned.map((r) => r.originalName).filter(Boolean))
    const deletedNames = (categories || [])
      .map((c) => c.name)
      .filter((n) => !survivingOriginal.has(n))

    const nextCategories = cleaned.map((r) => ({ name: r.name, color: r.color }))
    onSave(nextCategories, renamedMap, deletedNames)
  }

  return (
    <div className="wa-backdrop" onClick={onClose}>
      <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wa-modal-head">
          <h3>카테고리 편집</h3>
          <button className="btn ghost sm" onClick={onClose}>닫기</button>
        </div>
        <div className="wa-modal-body">
          <div className="hint" style={{ marginBottom: 10 }}>
            이름을 바꾸면 그 카테고리의 모든 사이트도 따라서 새 이름으로 정리돼요.<br />
            카테고리를 삭제하면 그 카테고리의 사이트는 <b>기타</b> 로 이동해요.
          </div>
          {rows.length === 0 && (
            <div className="empty">카테고리가 없어요. 아래 버튼으로 추가해 주세요.</div>
          )}
          {rows.map((row, i) => (
            <div className="cat-editor-row" key={row.key}>
              <input
                type="color"
                value={row.color}
                onChange={(e) => update(i, { color: e.target.value })}
                aria-label="색상"
              />
              <input
                type="text"
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="카테고리 이름"
              />
              <button className="btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} title="위로">↑</button>
              <button className="btn ghost sm" onClick={() => move(i, +1)} disabled={i === rows.length - 1} title="아래로">↓</button>
              <button className="btn danger sm" onClick={() => remove(i)} title="삭제">×</button>
            </div>
          ))}
          <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={add}>+ 새 카테고리</button>
        </div>
        <div className="wa-modal-foot">
          <button className="btn ghost" onClick={onClose}>취소</button>
          <button className="btn" onClick={save}>저장</button>
        </div>
      </div>
    </div>
  )
}

const rid = () => Math.random().toString(36).slice(2, 9)

// 새 카테고리 색상 시드 — 초록 톤 위주
const GREENS = ['#2E7D32', '#43A047', '#1B5E20', '#00897B', '#5D4037', '#33691E', '#7B1FA2', '#1976D2', '#F57C00']
const randomGreen = () => GREENS[Math.floor(Math.random() * GREENS.length)]
