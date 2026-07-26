import dialogueBank from './dialogues.json'
import { currentTimeOfDay, timerEndKey, timerStartKey } from './timerDialogue.js'

export { currentTimeOfDay, timerEndKey, timerStartKey }

const FALLBACK = {
  id: 'fallback',
  key: 'fallback',
  char: 'kaguya',
  face: 'neutral',
  text: '계속해 보시죠, 성현 씨.',
  inner: '(오늘도 곁에 있을 테니까.)',
}

function matchesRange(value, range) {
  if (!Array.isArray(range) || range.length !== 2) return true
  return value >= range[0] && value <= range[1]
}

function applyVariables(value, variables) {
  if (!value) return ''
  return value.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`)
}

export function selectDialogue(key, {
  act = 1,
  initiative = 50,
  seenLineIds = [],
  variables = {},
  random = Math.random,
} = {}) {
  const byKey = dialogueBank.lines.filter((line) => line.key === key)
  const contextual = byKey.filter((line) => {
    const actMatches = !line.act || line.act.includes(act)
    return actMatches && matchesRange(initiative, line.initiative)
  })
  const candidates = contextual.length ? contextual : byKey
  const unseen = candidates.filter((line) => !seenLineIds.includes(line.id))
  const pool = unseen.length ? unseen : candidates
  const selected = pool.length
    ? pool[Math.floor(random() * pool.length)]
    : FALLBACK

  return {
    ...selected,
    text: applyVariables(selected.text, variables),
    inner: applyVariables(selected.inner, variables),
  }
}
