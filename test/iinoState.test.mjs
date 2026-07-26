import test from 'node:test'
import assert from 'node:assert/strict'
import { getIinoPresentation } from '../src/characters/iinoState.js'

test('다른 날짜는 계획 확인용 중립 대사를 사용한다', () => {
  assert.equal(getIinoPresentation({ total: 0, done: 0, isToday: false }).face, 'neutral')
})

test('오늘 계획이 비어 있으면 원칙적인 진지한 대사를 사용한다', () => {
  const result = getIinoPresentation({ total: 0, done: 0, isToday: true })
  assert.equal(result.face, 'serious')
  assert.match(result.text, /먼저/)
})

test('아직 시작하지 않은 계획에는 시작을 안내한다', () => {
  const result = getIinoPresentation({ total: 3, done: 0, isToday: true })
  assert.equal(result.face, 'serious')
  assert.match(result.text, /첫 번째/)
})

test('진행 중에는 남은 개수를 정확히 안내한다', () => {
  const result = getIinoPresentation({ total: 4, done: 2, isToday: true })
  assert.equal(result.face, 'neutral')
  assert.match(result.text, /남은 2개/)
})

test('모든 계획을 완료하면 절제된 칭찬을 한다', () => {
  const result = getIinoPresentation({ total: 3, done: 3, isToday: true })
  assert.equal(result.face, 'smile')
  assert.match(result.text, /모두 완료/)
})
