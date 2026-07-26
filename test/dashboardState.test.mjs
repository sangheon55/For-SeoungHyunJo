import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateInitiative,
  createDailyVerdict,
  dashboardFace,
  initiativeLabel,
  secondsForDate,
} from '../src/kaguya/dashboardState.js'

const sessions = [
  { date: '2026-07-24', seconds: 3_600 },
  { date: '2026-07-24', seconds: 1_800 },
  { date: '2026-07-23', seconds: 900 },
]

test('날짜별 세션 시간을 합산한다', () => {
  assert.equal(secondsForDate(sessions, '2026-07-24'), 5_400)
  assert.equal(secondsForDate(sessions, '2026-07-22'), 0)
})

test('하루 판정 경계값은 60%와 100%다', () => {
  const goal = 1_000
  assert.equal(createDailyVerdict([{ date: 'd', seconds: 599 }], 'd', goal).result, 'lose')
  assert.equal(createDailyVerdict([{ date: 'd', seconds: 600 }], 'd', goal).result, 'draw')
  assert.equal(createDailyVerdict([{ date: 'd', seconds: 999 }], 'd', goal).result, 'draw')
  assert.equal(createDailyVerdict([{ date: 'd', seconds: 1_000 }], 'd', goal).result, 'win')
})

test('주도권은 최근 7일 달성률 평균이며 하루 달성률은 100으로 제한한다', () => {
  const dailySessions = Array.from({ length: 7 }, (_, index) => ({
    date: `2026-07-${String(20 + index).padStart(2, '0')}`,
    seconds: index === 6 ? 2_000 : 1_000,
  }))
  const result = calculateInitiative(dailySessions, '2026-07-26', 1_000)
  assert.equal(result.value, 100)
  assert.equal(result.daily.length, 7)
})

test('주도권 라벨 경계값을 유지한다', () => {
  assert.equal(initiativeLabel(39), '카구야 우세')
  assert.equal(initiativeLabel(40), '호각')
  assert.equal(initiativeLabel(66), '호각')
  assert.equal(initiativeLabel(67), '성현 우세')
})

test('주도권이 정확히 100일 때만 당황한 카구야 표정을 사용한다', () => {
  assert.equal(dashboardFace('smile', 99), 'smile')
  assert.equal(dashboardFace('smile', 100), 'flustered')
})
