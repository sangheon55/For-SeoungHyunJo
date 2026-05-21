import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

const KEY = 'seonghyeon_planner_v1'

// ── 기본 데이터 ──────────────────────────────────────────────
const defaultData = {
  version: 1,
  subjects: [
    { id: 's1', name: '언어논리', category: 'PSAT', color: '#2E7D32' },
    { id: 's2', name: '자료해석', category: 'PSAT', color: '#43A047' },
    { id: 's3', name: '상황판단', category: 'PSAT', color: '#66BB6A' },
    { id: 's4', name: '조림학', category: '전공', color: '#1B5E20' },
    { id: 's5', name: '임업경영학', category: '전공', color: '#33691E' },
    { id: 's6', name: '영어', category: '영어', color: '#00897B' },
    { id: 's7', name: '한국사', category: '한국사', color: '#5D4037' },
  ],
  tasks: [],        // { id, date, subjectId, text, done }
  sessions: [],     // { id, subjectId, date, seconds, start:'HH:MM', end:'HH:MM', manual, mock }
  memos: [],        // { id, subjectId, title, body, updatedAt }
  reviews: [],      // { id, name, subjectId, totalChapters, doneChapters, targetRounds, round }
  examDates: [
    { id: 'e1', name: '1차 시험(PSAT)', date: '2027-03-06' },
    { id: 'e2', name: '원서 접수 마감', date: '2027-01-20' },
  ],
  customEncouragements: [],
  dayNotes: {},     // { 'YYYY-MM-DD': '하루 돌아보기 메모' }
  certs: {
    english: { kind: 'TOEIC', score: '', validUntil: '' },
    history: { level: '', acquired: '' },
  },
  settings: { dailyGoalMin: 510 }, // 8.5시간
}

// 새 버전에서 추가된 키를 기존 데이터에 채워 넣는다(주간 업데이트 호환).
function mergeDefaults(loaded) {
  if (!loaded || typeof loaded !== 'object') return clone(defaultData)
  return {
    ...defaultData,
    ...loaded,
    certs: { ...defaultData.certs, ...(loaded.certs || {}) },
    settings: { ...defaultData.settings, ...(loaded.settings || {}) },
  }
}
const clone = (o) => JSON.parse(JSON.stringify(o))

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3)

const isElectron = () => typeof window !== 'undefined' && !!window.plannerStore

// ── Context ─────────────────────────────────────────────────
const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [data, setData] = useState(null)
  const ready = useRef(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      let loaded = null
      if (isElectron()) {
        loaded = await window.plannerStore.load()
      } else {
        try { loaded = JSON.parse(localStorage.getItem(KEY)) } catch { loaded = null }
      }
      if (alive) {
        setData(mergeDefaults(loaded))
        ready.current = true
      }
    })()
    return () => { alive = false }
  }, [])

  // 변경될 때마다 저장(파일 또는 localStorage)
  useEffect(() => {
    if (!data || !ready.current) return
    if (isElectron()) window.plannerStore.save(data)
    else localStorage.setItem(KEY, JSON.stringify(data))
  }, [data])

  const update = (patch) =>
    setData((d) => (typeof patch === 'function' ? patch(d) : { ...d, ...patch }))

  const exportData = async () => {
    if (isElectron()) return window.plannerStore.exportTo()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '조성현플래너-데이터.json'
    a.click()
    return true
  }

  const importData = async () => {
    if (isElectron()) {
      const result = await window.plannerStore.importFrom()
      if (result) { setData(mergeDefaults(result)); return true }
      return false
    }
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = () => {
        const file = input.files[0]
        if (!file) return resolve(false)
        const reader = new FileReader()
        reader.onload = () => {
          try { setData(mergeDefaults(JSON.parse(reader.result))); resolve(true) }
          catch { resolve(false) }
        }
        reader.readAsText(file)
      }
      input.click()
    })
  }

  if (!data) {
    return <div className="loading-screen">🌲 불러오는 중…</div>
  }

  return (
    <Ctx.Provider value={{ data, update, exportData, importData, isElectron: isElectron() }}>
      {children}
    </Ctx.Provider>
  )
}

export const useStore = () => useContext(Ctx)
