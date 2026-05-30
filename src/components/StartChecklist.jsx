import React, { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'

// 학습 타이머 ▶ 시작 버튼 위에 노출되는 시작 전 체크리스트.
// 체크 상태는 저장하지 않음 — 매번 새로 점검하는 의식 용도.
// props: { onConfigure?: () => void } — "설정에서 항목 편집" 링크가 눌렸을 때.
export default function StartChecklist({ onConfigure }) {
  const { data } = useStore()
  const items = data.settings.startChecklist || []
  const [checked, setChecked] = useState(() => new Set())

  // 항목 목록이 바뀌면(설정에서 추가/삭제) 체크 상태 정리
  useEffect(() => {
    setChecked((prev) => {
      const next = new Set()
      const valid = new Set(items.map((i) => i.id))
      for (const id of prev) if (valid.has(id)) next.add(id)
      return next
    })
  }, [items])

  if (items.length === 0) return null

  const toggle = (id) => setChecked((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const allDone = items.length > 0 && checked.size === items.length

  return (
    <div className="start-checklist">
      <div className="start-checklist-head">
        <span className="start-checklist-title">
          {allDone ? '✅ 시작 준비 완료!' : '📋 시작 전 점검'}
        </span>
        {onConfigure && (
          <button className="start-checklist-edit" onClick={onConfigure} title="설정에서 항목 편집">
            편집
          </button>
        )}
      </div>
      <div className="start-checklist-items">
        {items.map((it) => (
          <label className={'start-checklist-item' + (checked.has(it.id) ? ' done' : '')} key={it.id}>
            <input
              type="checkbox"
              className="checkbox"
              checked={checked.has(it.id)}
              onChange={() => toggle(it.id)}
            />
            <span>{it.text}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
