import { readFile } from 'node:fs/promises'
import Configstore from 'configstore'
import firebaseAuth from 'firebase-tools/lib/auth.js'

const [jsonPath, uid] = process.argv.slice(2)
if (!jsonPath || !uid) {
  console.error('Usage: node scripts/seed-user-data.mjs <backup.json> <firebase-uid>')
  process.exit(1)
}

const PROJECT_ID = 'study-planner-19670'
const API_ROOT =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const ARRAY_ENTITIES = {
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

const KV_KEYS = ['subjects', 'linkCategories', 'examDates', 'settings', 'wrongSettings']
const now = new Date().toISOString()
const firebaseConfig = new Configstore('firebase-tools')
const refreshToken = firebaseConfig.get('tokens.refresh_token')
if (!refreshToken) {
  throw new Error('Firebase CLI login is required')
}
const { access_token: accessToken } = await firebaseAuth.getAccessToken(refreshToken, [])

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value }
  }
  if (typeof value === 'string') return { stringValue: value }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } }
  }
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, firestoreValue(item)]),
      ),
    },
  }
}

function fieldsOf(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, firestoreValue(value)]),
  )
}

async function writeDocument(collectionName, id, row) {
  const url = `${API_ROOT}/users/${encodeURIComponent(uid)}/${collectionName}/${encodeURIComponent(id)}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ fields: fieldsOf(row) }),
  })
  if (!response.ok) {
    throw new Error(`${collectionName}/${id}: ${response.status} ${await response.text()}`)
  }
}

const source = JSON.parse(await readFile(jsonPath, 'utf8'))
const counts = {}

for (const [flatKey, entity] of Object.entries(ARRAY_ENTITIES)) {
  const rows = Array.isArray(source[flatKey]) ? source[flatKey] : []
  for (const row of rows) {
    if (!row?.id) throw new Error(`${flatKey} contains a row without id`)
    await writeDocument(`planner_${entity}`, row.id, {
      ...row,
      updatedAt: row.updatedAt || now,
      deletedAt: null,
    })
  }
  counts[entity] = rows.length
}

const dayRows = Object.entries(source.dayNotes || {}).map(([date, memo]) => ({
  id: date,
  date,
  memo,
  updatedAt: now,
  deletedAt: null,
}))
for (const row of dayRows) {
  await writeDocument('planner_daylogs', row.id, row)
}
counts.daylogs = dayRows.length

for (const key of KV_KEYS) {
  await writeDocument('planner_kv', key, {
    id: key,
    key,
    value: source[key],
    updatedAt: now,
    deletedAt: null,
  })
}
counts.kv = KV_KEYS.length

await writeDocument('system', 'initialSeed', {
  completed: true,
  source: 'json-backup',
  seededAt: now,
  counts,
})

const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
console.log(JSON.stringify({ uid, total, counts }, null, 2))
