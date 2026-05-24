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
  wrongAnswers: [], // 오답노트 — 자세한 스키마는 lib/ebbinghaus.js 참고
  links: [          // 자주 가는 사이트 모음 — { id, name, alias, url, category, description, createdAt }
    { id: 'lk1', name: '사이버국가고시센터', alias: '', url: 'https://gosi.kr',                 category: '시험 정보',  description: '시험 일정·공고·합격자 발표가 여기에서 나와요',                     createdAt: '2026-05-24' },
    { id: 'lk2', name: '인사혁신처',         alias: '', url: 'https://www.mpm.go.kr',          category: '시험 정보',  description: '5급 공무원 시험 주관 부처',                                       createdAt: '2026-05-24' },
    { id: 'lk3', name: '국립산림과학원',     alias: '', url: 'https://nifos.forest.go.kr',     category: '산림자원직', description: '산림자원직 전공 자료·연구 보고서',                                createdAt: '2026-05-24' },
    { id: 'lk4', name: '산림청',             alias: '', url: 'https://www.forest.go.kr',      category: '산림자원직', description: '산림청 정책·통계',                                                 createdAt: '2026-05-24' },
    { id: 'lk5', name: '나무위키',           alias: '', url: 'https://namu.wiki',              category: '학습 자료',  description: '개념 빠르게 훑을 때',                                              createdAt: '2026-05-24' },
  ],
  examDates: [
    { id: 'e1', name: '1차 시험(PSAT)', date: '2027-03-06' },
    { id: 'e2', name: '원서 접수 마감', date: '2027-01-20' },
  ],
  dayNotes: {},     // { 'YYYY-MM-DD': '하루 돌아보기 메모' }
  settings: { dailyGoalMin: 510, weeklyGoalMin: 3060 }, // 하루 8.5시간 · 주 51시간
  wrongSettings: {
    intervals: [1, 3, 7, 14, 30], // 에빙하우스 5단계(일)
    resetOnMiss: true,            // 틀리면 1단계로 리셋
  },
}

// 새 버전에서 추가된 키를 기존 데이터에 채워 넣는다(주간 업데이트 호환).
function mergeDefaults(loaded) {
  if (!loaded || typeof loaded !== 'object') return clone(defaultData)
  return {
    ...defaultData,
    ...loaded,
    settings: { ...defaultData.settings, ...(loaded.settings || {}) },
    wrongSettings: { ...defaultData.wrongSettings, ...(loaded.wrongSettings || {}) },
    wrongAnswers: Array.isArray(loaded?.wrongAnswers) ? loaded.wrongAnswers : [],
    links: Array.isArray(loaded?.links) ? loaded.links : defaultData.links,
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
