import test from 'node:test'
import assert from 'node:assert/strict'
import { computeElapsedSec } from '../src/lib/sessionTime.js'

test('실행 중인 세션은 시작 시각과 현재 시각의 차이로 계산한다', () => {
  assert.equal(computeElapsedSec({ startedAt: 1_000 }, 61_000), 60)
})

test('누적 일시정지 시간을 제외한다', () => {
  assert.equal(computeElapsedSec({ startedAt: 1_000, pausedMs: 15_000 }, 61_000), 45)
})

test('현재 일시정지 중인 시간도 제외한다', () => {
  const session = { startedAt: 1_000, pausedMs: 10_000, lastPausedAt: 41_000 }
  assert.equal(computeElapsedSec(session, 61_000), 30)
})

test('잘못된 값이나 음수 결과를 안전하게 0으로 처리한다', () => {
  assert.equal(computeElapsedSec({ startedAt: Number.NaN }, 61_000), 0)
  assert.equal(computeElapsedSec({ startedAt: 61_000 }, 1_000), 0)
})
