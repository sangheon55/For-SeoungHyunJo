import test from 'node:test'
import assert from 'node:assert/strict'
import { getRoomPeriod } from '../src/characters/roomBackground.js'

test('학생회실 배경은 오전 6시부터 오후 5시 59분까지 낮이다', () => {
  assert.equal(getRoomPeriod(new Date(2026, 6, 26, 6, 0)), 'day')
  assert.equal(getRoomPeriod(new Date(2026, 6, 26, 17, 59)), 'day')
})

test('학생회실 배경은 오후 6시부터 오전 5시 59분까지 밤이다', () => {
  assert.equal(getRoomPeriod(new Date(2026, 6, 26, 18, 0)), 'night')
  assert.equal(getRoomPeriod(new Date(2026, 6, 27, 5, 59)), 'night')
})
