import test from 'node:test'
import assert from 'node:assert/strict'
import {
  decideFujiwaraInterrupt,
  fallbackFujiwaraSequence,
  getFujiwaraEventType,
  normalizeFujiwaraSequence,
  readFujiwaraInterruptState,
  recordFujiwaraInterrupt,
} from '../src/kaguya/fujiwaraInterrupt.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('25분 미만 세션에는 후지와라가 난입하지 않는다', () => {
  const decision = decideFujiwaraInterrupt({
    seconds: 25 * 60 - 1,
    today: '2026-07-27',
    storage: memoryStorage(),
    random: () => 0,
  })
  assert.equal(decision.trigger, false)
})

test('캐릭터 레이어가 비활성화되면 난입하지 않는다', () => {
  const decision = decideFujiwaraInterrupt({
    seconds: 2 * 60 * 60,
    today: '2026-07-27',
    storage: memoryStorage(),
    random: () => 0,
    enabled: false,
  })
  assert.equal(decision.trigger, false)
})

test('25분 이상 세션은 15% 확률로 난입한다', () => {
  const common = {
    seconds: 25 * 60,
    today: '2026-07-27',
    storage: memoryStorage(),
  }
  assert.equal(decideFujiwaraInterrupt({ ...common, random: () => 0.149 }).trigger, true)
  assert.equal(decideFujiwaraInterrupt({ ...common, random: () => 0.15 }).trigger, false)
})

test('2시간 이상 첫 세션은 확정 난입하고 하루 최대 두 번이다', () => {
  const storage = memoryStorage()
  const today = '2026-07-27'
  const first = decideFujiwaraInterrupt({
    seconds: 2 * 60 * 60,
    today,
    storage,
    random: () => 0.99,
  })
  assert.equal(first.trigger, true)
  assert.equal(first.guaranteed, true)

  const once = recordFujiwaraInterrupt(storage, today, first.state, 'first', '첫 번째 대사')
  recordFujiwaraInterrupt(storage, today, once, 'second')
  const third = decideFujiwaraInterrupt({
    seconds: 2 * 60 * 60,
    today,
    storage,
    random: () => 0,
  })
  assert.equal(third.trigger, false)
  assert.equal(readFujiwaraInterruptState(storage, today).count, 2)
  assert.equal(once.lastLine, '첫 번째 대사')
})

test('역난입은 발생한 난입 중 3% 확률이다', () => {
  const values = [0.1, 0.029]
  const decision = decideFujiwaraInterrupt({
    seconds: 25 * 60,
    today: '2026-07-27',
    storage: memoryStorage(),
    random: () => values.shift(),
  })
  assert.equal(decision.trigger, true)
  assert.equal(decision.reverse, true)

  const boundary = [0.1, 0.03]
  const normal = decideFujiwaraInterrupt({
    seconds: 25 * 60,
    today: '2026-07-27',
    storage: memoryStorage(),
    random: () => boundary.shift(),
  })
  assert.equal(normal.reverse, false)
})

test('학습 상황에 따라 난입 주제를 분류한다', () => {
  assert.equal(getFujiwaraEventType({ seconds: 2 * 60 * 60, hour: 14, streakDays: 1 }), 'two_hours')
  assert.equal(getFujiwaraEventType({ seconds: 30 * 60, hour: 14, streakDays: 7 }), 'streak')
  assert.equal(getFujiwaraEventType({ seconds: 30 * 60, hour: 23, streakDays: 1 }), 'late_night')
  assert.equal(getFujiwaraEventType({ seconds: 60 * 60, hour: 14, streakDays: 1 }), 'one_hour')
  assert.equal(getFujiwaraEventType({ seconds: 25 * 60, hour: 14, streakDays: 1 }), 'short_break')
})

test('기본 대화는 후지와라가 먼저 말하고 카구야가 답한다', () => {
  const beats = fallbackFujiwaraSequence(2 * 60 * 60)
  assert.equal(beats[0].character, 'fujiwara')
  assert.equal(beats[1].character, 'kaguya')
})

test('역난입 기본 대화는 후지와라의 종료 선언으로 시작한다', () => {
  const beats = fallbackFujiwaraSequence(30 * 60, {
    eventType: 'short_break',
    reverse: true,
  })
  assert.equal(beats[0].character, 'fujiwara')
  assert.match(beats[0].text, /종료/)
  assert.equal(beats[1].character, 'kaguya')
})

test('잘못된 LLM 응답은 기본 대화로 대체한다', () => {
  const fallback = fallbackFujiwaraSequence(30 * 60)
  assert.equal(normalizeFujiwaraSequence([{ character: 'fujiwara' }], fallback), fallback)
})
