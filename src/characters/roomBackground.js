import { useEffect, useState } from 'react'

const baseUrl = import.meta.env?.BASE_URL || '/'
const asset = (path) => `${baseUrl}assets/bg/${path}`

export const ROOM_BACKGROUNDS = {
  day: asset('room_day.webp'),
  night: asset('room_night.webp'),
}

export function getRoomPeriod(date = new Date()) {
  const hour = date.getHours()
  return hour >= 18 || hour < 6 ? 'night' : 'day'
}

export function useRoomBackground() {
  const [period, setPeriod] = useState(() => getRoomPeriod())

  useEffect(() => {
    const updatePeriod = () => setPeriod(getRoomPeriod())
    const intervalId = window.setInterval(updatePeriod, 60_000)
    window.addEventListener('focus', updatePeriod)
    document.addEventListener('visibilitychange', updatePeriod)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', updatePeriod)
      document.removeEventListener('visibilitychange', updatePeriod)
    }
  }, [])

  return {
    period,
    path: ROOM_BACKGROUNDS[period],
  }
}
