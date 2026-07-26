import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIshigamiStudySummary, getIshigamiFallback } from '../src/characters/ishigamiState.js'

test('이시가미에게 원문 없이 최근 공부 집계만 전달한다', () => {
  const summary = buildIshigamiStudySummary({
    sessions: [{ date: '2026-07-26', subjectId: 'forest', seconds: 3600 }],
    tasks: [{ date: '2026-07-26', done: true, text: '비공개 계획 원문' }],
    wrongAnswers: [{ status: 'active', currentStep: 0, schedule: ['2026-07-26'], question: '비공개 문제' }],
    subjects: [{ id: 'forest', name: '산림자원' }],
  }, '2026-07-26')

  assert.equal(summary.todayMinutes, 60)
  assert.equal(summary.recentActiveDays, 1)
  assert.equal(summary.wrongAnswers.dueToday, 1)
  assert.equal(JSON.stringify(summary).includes('비공개'), false)
})

test('복습이 남으면 이시가미의 현실적인 기본 조언을 사용한다', () => {
  const result = getIshigamiFallback({
    todayMinutes: 30,
    wrongAnswers: { dueToday: 2 },
  })
  assert.equal(result.face, 'serious')
  assert.match(result.advice, /2개/)
})
