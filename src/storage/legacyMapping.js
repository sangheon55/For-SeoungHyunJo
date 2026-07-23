// store.jsx가 기존처럼 "하나의 평평한 data 객체"로 화면에 데이터를 내려주기 위한 변환 계층.
// 화면 컴포넌트는 이 파일의 존재를 모른다 — store.jsx만 이걸 쓴다.
import { db } from './localAdapter.js'
import { repository } from './repository.js'

const ARRAY_ENTITY_KEYS = {
  tasks: 'tasks',
  sessions: 'sessions',
  memos: 'notes',
  reviews: 'books',
  wrongAnswers: 'wrongs',
  flashcards: 'cards',
  links: 'links',
  photos: 'photos',
  hobbies: 'hobbies',
}
const KV_ARRAY_KEYS = ['subjects', 'linkCategories', 'examDates']
const KV_OBJECT_KEYS = ['settings', 'wrongSettings']

const ALL_TABLES = [...new Set(Object.values(ARRAY_ENTITY_KEYS))].concat(['kv', 'daylogs'])

function nowIso() {
  return new Date().toISOString()
}

// Dexie 테이블들을 읽어서 기존 store.jsx가 쓰던 평평한 data 모양으로 조립한다
export async function loadFlatData() {
  const entries = await Promise.all(
    Object.entries(ARRAY_ENTITY_KEYS).map(async ([flatKey, entity]) => [flatKey, await repository.list(entity)])
  )
  const flat = Object.fromEntries(entries)

  const kvRows = await repository.list('kv')
  const kv = Object.fromEntries(kvRows.map((r) => [r.key, r.value]))

  const daylogs = await repository.list('daylogs')
  const dayNotes = Object.fromEntries(daylogs.filter((r) => r.memo).map((r) => [r.date, r.memo]))

  return {
    version: 1,
    subjects: kv.subjects,
    linkCategories: kv.linkCategories,
    examDates: kv.examDates,
    settings: kv.settings,
    wrongSettings: kv.wrongSettings,
    memos: flat.memos,
    reviews: flat.reviews,
    wrongAnswers: flat.wrongAnswers,
    flashcards: flat.flashcards,
    tasks: flat.tasks,
    sessions: flat.sessions,
    links: flat.links,
    photos: flat.photos,
    hobbies: flat.hobbies,
    dayNotes,
  }
}

async function diffArray(entity, prevArr, nextArr) {
  const prevIds = new Set(prevArr.map((r) => r.id))
  const nextById = new Map(nextArr.map((r) => [r.id, r]))
  for (const id of prevIds) {
    if (!nextById.has(id)) await repository.remove(entity, id)
  }
  for (const row of nextArr) {
    const before = prevArr.find((r) => r.id === row.id)
    if (before !== row) await repository.put(entity, row)
  }
}

async function diffDayNotes(prevMap, nextMap) {
  const dates = new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])
  for (const date of dates) {
    if (prevMap[date] === nextMap[date]) continue
    if (nextMap[date] === undefined) await repository.remove('daylogs', date)
    else await repository.put('daylogs', { id: date, date, memo: nextMap[date] })
  }
}

// prev/next 평평한 data 객체를 비교해서 바뀐 슬라이스만 하나의 트랜잭션으로 쓴다
export async function persistDiff(prev, next) {
  const touched = new Set()
  const ops = []

  for (const [flatKey, entity] of Object.entries(ARRAY_ENTITY_KEYS)) {
    if (prev[flatKey] === next[flatKey]) continue
    touched.add(entity)
    ops.push(() => diffArray(entity, prev[flatKey] || [], next[flatKey] || []))
  }

  for (const flatKey of [...KV_ARRAY_KEYS, ...KV_OBJECT_KEYS]) {
    if (prev[flatKey] === next[flatKey]) continue
    touched.add('kv')
    ops.push(() => repository.put('kv', { id: flatKey, key: flatKey, value: next[flatKey] }))
  }

  if (prev.dayNotes !== next.dayNotes) {
    touched.add('daylogs')
    ops.push(() => diffDayNotes(prev.dayNotes || {}, next.dayNotes || {}))
  }

  if (!ops.length) return
  await db.transaction('rw', [...touched].map((t) => db.table(t)), async () => {
    for (const op of ops) await op()
  })
}

// 전체 덮어쓰기 — importData()가 쓴다. 모든 테이블을 비우고 통째로 다시 쓴다
export async function persistFullReplace(flatData) {
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const [flatKey, entity] of Object.entries(ARRAY_ENTITY_KEYS)) {
      await db.table(entity).clear()
      const rows = (flatData[flatKey] || []).map((r) => ({
        ...r,
        updatedAt: r.updatedAt || nowIso(),
        deletedAt: null,
      }))
      if (rows.length) await db.table(entity).bulkPut(rows)
    }

    await db.table('daylogs').clear()
    const dayRows = Object.entries(flatData.dayNotes || {}).map(([date, memo]) => ({
      id: date,
      date,
      memo,
      updatedAt: nowIso(),
      deletedAt: null,
    }))
    if (dayRows.length) await db.table('daylogs').bulkPut(dayRows)

    const kvRows = [...KV_ARRAY_KEYS, ...KV_OBJECT_KEYS].map((k) => ({
      id: k,
      key: k,
      value: flatData[k],
      updatedAt: nowIso(),
      deletedAt: null,
    }))
    await db.table('kv').bulkPut(kvRows)
  })
}
