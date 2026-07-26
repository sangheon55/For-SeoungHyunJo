import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { timerEndKey } from '../src/kaguya/timerDialogue.js'

test('2시간 이상 세션은 제법이네요 이벤트를 선택한다', () => {
  assert.equal(timerEndKey(2 * 60 * 60 - 1), 'timer.end.normal')
  assert.equal(timerEndKey(2 * 60 * 60), 'timer.end.impressive')
  assert.equal(timerEndKey(4 * 60 * 60), 'timer.end.impressive')
})

test('제법이네요 이벤트는 smug 표정을 사용한다', async () => {
  const dialogueBank = JSON.parse(
    await readFile(new URL('../src/kaguya/dialogues.json', import.meta.url), 'utf8'),
  )
  const line = dialogueBank.lines.find(({ key }) => key === 'timer.end.impressive')
  assert.equal(line.face, 'smug')
  assert.equal(line.text, '제법이네요.')
})
