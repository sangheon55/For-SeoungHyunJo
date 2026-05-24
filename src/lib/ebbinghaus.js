// 오답노트 에빙하우스 망각곡선 복습 스케줄러 + 약점 통계
// 순수 함수 모음. 어디서든 import 해서 사용.
import { addDays, dateStr } from './util.js'

export const DEFAULT_INTERVALS = [1, 3, 7, 14, 30]
export const ERROR_TYPES = ['개념', '실수', '시간부족', '찍기', '기타']
export const DIFFICULTIES = ['상', '중', '하']

// 새 오답 등록 시 5단계 복습일을 생성한다.
// createdAt: 'YYYY-MM-DD' 기준일
export function buildSchedule(createdAt, intervals = DEFAULT_INTERVALS) {
  return intervals.map((days, i) => ({
    step: i,
    dueDate: addDays(createdAt, days),
    doneDate: null,
    result: null,
  }))
}

// 새 WrongAnswer 객체 기본형 (id/subjectId 등은 호출 측에서 채움)
export function makeWrongAnswer({
  id,
  subjectId,
  question,
  myAnswer = '',
  correctAnswer,
  explanation = '',
  difficulty = '중',
  source = { book: '', round: '', page: '' },
  tags = [],
  errorType = '개념',
  solveSec = 0,
  images = [],
  intervals = DEFAULT_INTERVALS,
  today = dateStr(),
}) {
  return {
    id,
    subjectId,
    createdAt: today,
    updatedAt: today,
    question,
    myAnswer,
    correctAnswer,
    explanation,
    difficulty,
    source,
    tags,
    errorType,
    solveSec,
    images,
    schedule: buildSchedule(today, intervals),
    currentStep: 0,
    status: 'active',
    reviewCount: 0,
    passCount: 0,
    failCount: 0,
  }
}

// 복습 결과 적용 (pass: 다음 step, fail: resetOnMiss 옵션에 따라)
export function applyReviewResult(wa, result, today = dateStr(), opts = {}) {
  const { resetOnMiss = true, intervals = DEFAULT_INTERVALS } = opts
  const idx = wa.currentStep
  if (idx >= wa.schedule.length) return wa // 이미 mastered

  const updatedSchedule = wa.schedule.map((s, i) =>
    i === idx ? { ...s, doneDate: today, result } : s
  )

  const next = {
    ...wa,
    schedule: updatedSchedule,
    updatedAt: today,
    reviewCount: (wa.reviewCount || 0) + 1,
  }

  if (result === 'pass') {
    next.passCount = (wa.passCount || 0) + 1
    next.currentStep = idx + 1
    if (next.currentStep >= intervals.length) next.status = 'mastered'
  } else {
    next.failCount = (wa.failCount || 0) + 1
    if (resetOnMiss) {
      // 오늘 기준으로 1·3·7·14·30일 다시 생성
      next.schedule = buildSchedule(today, intervals)
      next.currentStep = 0
      next.status = 'active'
    } else {
      // 같은 단계를 다시 풀도록 dueDate만 미루기
      next.schedule = updatedSchedule.map((s, i) =>
        i === idx
          ? { ...s, dueDate: addDays(today, intervals[idx]), doneDate: null, result: null }
          : s
      )
    }
  }
  return next
}

// 오늘까지 복습해야 할 활성 오답
export function dueToday(wrongAnswers, today = dateStr()) {
  if (!Array.isArray(wrongAnswers)) return []
  return wrongAnswers.filter((w) => {
    if (!w || w.status !== 'active') return false
    const cur = w.schedule?.[w.currentStep]
    return cur && cur.dueDate <= today
  })
}

// 다가오는 N일 이내 복습 예정 (오늘 포함)
export function dueWithinDays(wrongAnswers, n, today = dateStr()) {
  if (!Array.isArray(wrongAnswers)) return []
  const limit = addDays(today, n)
  return wrongAnswers.filter((w) => {
    if (!w || w.status !== 'active') return false
    const cur = w.schedule?.[w.currentStep]
    return cur && cur.dueDate <= limit
  })
}

// 다음 복습 디데이 (없으면 null)
export function nextDueDate(wa) {
  if (!wa || wa.status !== 'active') return null
  return wa.schedule?.[wa.currentStep]?.dueDate || null
}

// 과목별 약점 통계 — Stats 화면 카드에 사용
export function computeWeaknessBySubject(data, today = dateStr()) {
  const subs = data?.subjects || []
  const list = data?.wrongAnswers || []
  return subs
    .map((s) => {
      const items = list.filter((w) => w.subjectId === s.id)
      const active = items.filter((w) => w.status === 'active')
      const mastered = items.filter((w) => w.status === 'mastered')
      const overdue = active.filter((w) => {
        const cur = w.schedule?.[w.currentStep]
        return cur && cur.dueDate < today
      })
      const totalAttempts = items.reduce((a, w) => a + (w.reviewCount || 0), 0)
      const totalPass = items.reduce((a, w) => a + (w.passCount || 0), 0)
      const accuracy = totalAttempts > 0 ? totalPass / totalAttempts : null
      const score =
        active.length +
        overdue.length * 2 +
        (accuracy === null ? 0 : Math.round((1 - accuracy) * 20))
      return {
        subject: s,
        total: items.length,
        active: active.length,
        mastered: mastered.length,
        overdue: overdue.length,
        accuracy,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)
}

// 오답 유형별 분포 (개념/실수/시간부족/찍기/기타)
export function computeByErrorType(wrongAnswers) {
  const counts = Object.fromEntries(ERROR_TYPES.map((t) => [t, 0]))
  for (const w of wrongAnswers || []) {
    if (counts[w.errorType] !== undefined) counts[w.errorType]++
  }
  return ERROR_TYPES.map((type) => ({ type, count: counts[type] }))
}
