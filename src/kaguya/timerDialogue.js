export function currentTimeOfDay(date = new Date()) {
  const hour = date.getHours()
  if (hour < 6 || hour >= 21) return 'night'
  if (hour < 11) return 'morning'
  return 'day'
}

export function timerStartKey(date = new Date()) {
  return `timer.start.${currentTimeOfDay(date)}`
}

export function timerEndKey(seconds) {
  if (seconds < 30 * 60) return 'timer.end.short'
  if (seconds >= 2 * 60 * 60) return 'timer.end.impressive'
  return 'timer.end.normal'
}
