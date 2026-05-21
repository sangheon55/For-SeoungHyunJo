// ── 날짜 유틸 ────────────────────────────────────────────────
export function dateStr(d = new Date()) {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
export function addDays(dStr, n) {
  const d = new Date(dStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return dateStr(d)
}
// 월요일 시작 주의 시작일
export function weekStart(dStr) {
  const d = new Date(dStr + 'T00:00:00')
  const day = (d.getDay() + 6) % 7 // 월=0
  d.setDate(d.getDate() - day)
  return dateStr(d)
}
export function monthKey(dStr) {
  return dStr.slice(0, 7)
}
export function dDay(targetDate) {
  const today = new Date(dateStr() + 'T00:00:00')
  const target = new Date(targetDate + 'T00:00:00')
  return Math.round((target - today) / 86400000)
}
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
export function prettyDate(dStr) {
  const d = new Date(dStr + 'T00:00:00')
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`
}

// ── 시간 포맷 ────────────────────────────────────────────────
export function hms(totalSec) {
  const s = Math.max(0, Math.floor(totalSec))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${ss}`
}
export function hm(totalSec) {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h === 0) return `${m}분`
  return `${h}시간 ${m}분`
}
// 시각을 "HH:MM"으로
export function clockHM(d = new Date()) {
  const x = new Date(d)
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
}
// "HH:MM" → 자정 기준 분(없으면 null)
export function hmToMin(hhmm) {
  if (!hhmm || !hhmm.includes(':')) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

// ── 학습 세션 집계 ───────────────────────────────────────────
export function sumSeconds(sessions, predicate) {
  return sessions.reduce((acc, s) => (predicate(s) ? acc + s.seconds : acc), 0)
}
// range: 'today' | 'week' | 'month' | 'all'
export function inRange(sessionDate, range, today = dateStr()) {
  if (range === 'all') return true
  if (range === 'today') return sessionDate === today
  if (range === 'week') return weekStart(sessionDate) === weekStart(today)
  if (range === 'month') return monthKey(sessionDate) === monthKey(today)
  return true
}

// 연속 학습일(오늘 또는 어제부터 거꾸로)
export function streak(sessions) {
  const days = new Set(sessions.filter((s) => s.seconds > 0).map((s) => s.date))
  let count = 0
  let cursor = dateStr()
  if (!days.has(cursor)) cursor = addDays(cursor, -1) // 오늘 아직 안 했으면 어제부터
  while (days.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

// ── 나무 성장 ────────────────────────────────────────────────
export const TREE_TOTAL = 1800 // 큰나무 완성까지 누적 시간
export const STAGES = [
  { name: '씨앗', emoji: '🌰', at: 0 },
  { name: '새싹', emoji: '🌱', at: 25 },
  { name: '떡잎', emoji: '🌿', at: 75 },
  { name: '묘목', emoji: '🪴', at: 175 },
  { name: '어린나무', emoji: '🌳', at: 375 },
  { name: '청년나무', emoji: '🌳', at: 720 },
  { name: '우거진나무', emoji: '🌲', at: 1200 },
]

export function treeInfo(totalHours) {
  const completed = Math.floor(totalHours / TREE_TOTAL)
  const cur = totalHours % TREE_TOTAL
  let idx = 0
  for (let i = 0; i < STAGES.length; i++) if (cur >= STAGES[i].at) idx = i
  const stage = STAGES[idx]
  const nextAt = idx + 1 < STAGES.length ? STAGES[idx + 1].at : TREE_TOTAL
  const progress = Math.min(1, (cur - stage.at) / (nextAt - stage.at))
  return { completed, cur, stage, idx, level: idx + 1, nextAt, progress, totalHours }
}
