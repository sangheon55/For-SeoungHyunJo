import { addDays } from '../lib/util.js'

export function secondsForDate(sessions, date) {
  return sessions
    .filter((session) => session.date === date)
    .reduce((sum, session) => sum + Number(session.seconds || 0), 0)
}

export function createDailyVerdict(sessions, date, goalSec, decidedAt = Date.now()) {
  const studiedSec = secondsForDate(sessions, date)
  const ratio = goalSec > 0 ? studiedSec / goalSec : 0
  return {
    result: ratio >= 1 ? 'win' : ratio >= 0.6 ? 'draw' : 'lose',
    studiedSec,
    goalSec,
    achievement: Math.round(ratio * 100),
    decidedAt,
  }
}

export function calculateInitiative(sessions, today, goalSec) {
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6)
    const seconds = secondsForDate(sessions, date)
    return {
      date,
      seconds,
      achievement: Math.min(100, goalSec > 0 ? Math.round((seconds / goalSec) * 100) : 0),
    }
  })
  const value = Math.round(daily.reduce((sum, day) => sum + day.achievement, 0) / daily.length)
  return { value, daily }
}

export function initiativeLabel(value) {
  if (value >= 67) return '성현 우세'
  if (value >= 40) return '호각'
  return '카구야 우세'
}

export function dashboardFace(defaultFace, initiativeValue) {
  return initiativeValue === 100 ? 'flustered' : defaultFace
}

export function dashboardGreeting(hour, verdict) {
  const opening = hour < 11
    ? '좋은 아침이에요, 성현 씨.'
    : hour < 18
      ? '오늘 계획은 확인하셨나요, 성현 씨?'
      : '아직 오늘은 끝나지 않았어요, 성현 씨.'

  if (verdict.result === 'win') {
    return {
      face: 'smile',
      title: '성현 승',
      text: `${opening} 어제는 ${verdict.achievement}% 달성. 이번 승부는 성현 씨의 승리로 해두죠.`,
      inner: '(이 정도면… 조금은 자랑스러워해도 되겠네요.)',
    }
  }
  if (verdict.result === 'draw') {
    return {
      face: 'neutral',
      title: '무승부',
      text: `${opening} 어제는 ${verdict.achievement}% 달성. 아슬아슬하게 무승부예요.`,
      inner: '(오늘은 확실히 끝내는 모습을 보여주셨으면 좋겠는데.)',
    }
  }
  return {
    face: 'smug',
    title: '카구야 승',
    text: `${opening} 어제는 ${verdict.achievement}% 달성. 이번 승부는 제 승리네요.`,
    inner: '(놀릴 생각은 없어요. 오늘은 정말 괜찮을지 신경 쓰일 뿐이에요.)',
  }
}
