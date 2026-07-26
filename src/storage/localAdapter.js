import Dexie from 'dexie'
import { ENTITIES } from './types.js'

const schemaV1 = {
  sessions: 'id, updatedAt, deletedAt, date, subjectId',
  tasks:    'id, updatedAt, deletedAt, date, subjectId',
  notes:    'id, updatedAt, deletedAt, subjectId',
  wrongs:   'id, updatedAt, deletedAt, subjectId',
  cards:    'id, updatedAt, deletedAt, subjectId',
  books:    'id, updatedAt, deletedAt, subjectId',
  links:    'id, updatedAt, deletedAt, category',
  photos:   'id, updatedAt, deletedAt',
  hobbies:  'id, updatedAt, deletedAt',
  daylogs:  'id, updatedAt, deletedAt, date',
  kv:       'id, updatedAt, deletedAt, key',
  // meta: 로컬 전용 부기 테이블(마이그레이션 완료 플래그 등). ENTITIES에 없고, repository로 노출되지 않는다.
  meta:     'key',
}

function createDatabase(name) {
  const instance = new Dexie(name)
  instance.version(1).stores(schemaV1)
  instance.version(2).stores({ activeSession: 'id' })
  return instance
}

export let db = createDatabase('PlannerDB')

export function configureLocalDatabase(userId = null) {
  const safeId = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '_') : null
  const targetName = safeId ? `PlannerDB_${safeId}` : 'PlannerDB'
  if (db.name === targetName) return
  db.close()
  db = createDatabase(targetName)
}

function table(entity) {
  if (!ENTITIES.includes(entity)) throw new Error(`Unknown entity: ${entity}`)
  return db.table(entity)
}

export const localAdapter = {
  async list(entity, { since = null, includeDeleted = false } = {}) {
    const rows = since
      ? await table(entity).where('updatedAt').above(since).toArray()
      : await table(entity).toArray()
    return includeDeleted ? rows : rows.filter((r) => !r.deletedAt)
  },

  async get(entity, id) {
    return (await table(entity).get(id)) ?? null
  },

  // upsert. updatedAt은 항상 지금 시각으로 갱신한다
  async put(entity, row) {
    const next = { ...row, updatedAt: new Date().toISOString() }
    await table(entity).put(next)
    return next
  },

  // 동기화 수신 전용. 서버가 준 updatedAt을 그대로 보존한다
  async bulkPut(entity, rows) {
    await table(entity).bulkPut(rows)
  },

  // 소프트 삭제. deletedAt을 세팅할 뿐 행을 지우지 않는다
  async remove(entity, id) {
    const existing = await table(entity).get(id)
    if (!existing) return null
    const now = new Date().toISOString()
    const next = { ...existing, deletedAt: now, updatedAt: now }
    await table(entity).put(next)
    return next
  },

  // lastPushedAt 이후 로컬 변경분 전체. Firestore의 영속 캐시가 오프라인 큐 역할을
  // 대신하고 있어 지금은 안 쓰인다(firestoreSync.js 참고) — 나중에 필요해질 수 있어 남겨둠.
  async pendingChanges() {
    const cursorRow = await db.table('meta').get('lastPushedAt')
    const cursor = cursorRow?.value ?? null
    const out = {}
    for (const entity of ENTITIES) {
      out[entity] = await localAdapter.list(entity, { since: cursor, includeDeleted: true })
    }
    return out
  },
}
