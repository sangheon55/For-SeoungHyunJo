import React, { useState, useRef, useCallback } from 'react'

export const CATEGORIES = ['PSAT', '전공', '영어', '한국사', '기타']
export const PALETTE = ['#2E7D32', '#43A047', '#1B5E20', '#00897B', '#5D4037', '#33691E', '#66BB6A', '#827717']

export function getSubject(data, id) {
  return data.subjects.find((s) => s.id === id) || null
}

export function SubjectTag({ subject }) {
  if (!subject) return <span className="tag" style={{ background: '#9aa' }}>미지정</span>
  return <span className="tag" style={{ background: subject.color }}>{subject.name}</span>
}

export function useToast() {
  const [msg, setMsg] = useState('')
  const ref = useRef()
  const show = useCallback((m) => {
    setMsg(m)
    clearTimeout(ref.current)
    ref.current = setTimeout(() => setMsg(''), 2400)
  }, [])
  const Toast = () => (msg ? <div className="toast">{msg}</div> : null)
  return { show, Toast }
}
