import { addDays } from '../lib/util.js'

export function buildIshigamiStudySummary(data, today) {
  const recentDates = new Set(Array.from({ length: 7 }, (_, index) => addDays(today, -index)))
  const recentSessions = (data.sessions || []).filter((session) => recentDates.has(session.date))
  const todaySessions = recentSessions.filter((session) => session.date === today)
  const todayTasks = (data.tasks || []).filter((task) => task.date === today)
  const wrongAnswers = data.wrongAnswers || []
  const subjectMinutes = new Map()

  for (const session of recentSessions) {
    subjectMinutes.set(
      session.subjectId,
      (subjectMinutes.get(session.subjectId) || 0) + Math.round((session.seconds || 0) / 60),
    )
  }

  return {
    todayMinutes: Math.round(todaySessions.reduce((sum, session) => sum + (session.seconds || 0), 0) / 60),
    recent7DayMinutes: Math.round(recentSessions.reduce((sum, session) => sum + (session.seconds || 0), 0) / 60),
    recentActiveDays: new Set(recentSessions.filter((session) => session.seconds > 0).map((session) => session.date)).size,
    dailyGoalMinutes: Number(data.settings?.dailyGoalMin) || 510,
    todayTasks: {
      total: todayTasks.length,
      done: todayTasks.filter((task) => task.done).length,
    },
    wrongAnswers: {
      total: wrongAnswers.length,
      dueToday: wrongAnswers.filter((item) =>
        item.status !== 'mastered' && item.schedule?.[item.currentStep] === today
      ).length,
      mastered: wrongAnswers.filter((item) => item.status === 'mastered').length,
    },
    subjects: [...subjectMinutes.entries()]
      .map(([id, minutes]) => ({
        name: data.subjects?.find((subject) => subject.id === id)?.name || '기타',
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6),
  }
}

export function getIshigamiFallback(summary) {
  if (summary.wrongAnswers.dueToday > 0) {
    return {
      face: 'serious',
      advice: `오늘 복습 ${summary.wrongAnswers.dueToday}개가 남았네. 미루면 내일의 네가 더 귀찮아질 뿐이니까, 하나씩 처리하자.`,
    }
  }
  if (summary.todayMinutes === 0) {
    return {
      face: 'tired',
      advice: '기록상 오늘은 아직 0분이야. 뭐, 완벽한 계획보다 20분이라도 시작하는 쪽이 훨씬 낫지.',
    }
  }
  return {
    face: 'smile',
    advice: `오늘 ${summary.todayMinutes}분 했네. 흐름은 괜찮으니까, 가장 약한 과목 하나만 더 정리하고 끝내자.`,
  }
}
