// Firestore 실시간 동기화 엔진 (W5-lite). remoteAdapter.js(구 범용 프로토콜)와는
// 무관한 새 파일 — Firestore 전용이라 그 인터페이스를 재사용하지 않는다.
import {
  collection, doc, setDoc, getDoc, onSnapshot, writeBatch,
} from 'firebase/firestore'
import { db as firestore } from './firebaseClient.js'
import { localAdapter } from './localAdapter.js'
import { ENTITIES } from './types.js'

// photos: base64 dataURL이라 1MiB 초과가 사실상 확정적 — 이번 스프린트는 통째로 제외.
// (Firebase Storage 업로드는 별도 스프린트. 여기서는 조용히 빠뜨릴 뿐, 죽지도 오염시키지도 않는다.)
export const SYNCED_ENTITIES = ENTITIES.filter((e) => e !== 'photos')

const PREFIX = 'planner_'
const collectionName = (entity) => `${PREFIX}${entity}`
const colRef = (entity) => collection(firestore, collectionName(entity))
const docRef = (entity, id) => doc(firestore, collectionName(entity), id)

// Firestore 1MiB/문서 한도 아래 여유값. wrongs.images(첨부 이미지)가 실제로 이 한도에
// 걸릴 수 있는 유일한 비-photos 엔티티다 (WrongForm.jsx 확인).
const MAX_DOC_BYTES = 900_000
function approxSize(row) {
  return new Blob([JSON.stringify(row)]).size
}
// undefined 필드는 Firestore가 던진다(JSON 왕복으로 조용히 제거) + 순환참조 방지
function clean(row) {
  return JSON.parse(JSON.stringify(row))
}

// 로컬 쓰기 → Firestore 미러. fire-and-forget: 로컬 쓰기는 이미 끝났고 그게 진실의 소스다.
// 실패해도 호출자에 던지지 않는다(오프라인 등은 SDK의 영속 캐시가 알아서 재시도 큐잉한다).
export function mirrorPut(entity, row) {
  if (!SYNCED_ENTITIES.includes(entity)) return
  const size = approxSize(row)
  if (size > MAX_DOC_BYTES) {
    console.warn(`[sync] skip push, oversized ${entity}/${row.id} (${size}B)`)
    return
  }
  setDoc(docRef(entity, row.id), clean(row)).catch((e) => {
    console.warn(`[sync] mirror put failed ${entity}/${row.id}`, e)
  })
}

// 전체 로컬 → Firestore 1회성 업로드. persistFullReplace() 직후(JSON 가져오기, 레거시
// localStorage 이전)에만 호출한다 — 일반 편집은 repository.put/remove의 mirrorPut으로 충분.
// 무작정 덮어쓰지 않고 행마다 원격을 먼저 읽어 LWW 비교한다: "오래된 백업 재가져오기가
// 이미 동기화된 더 최신 원격 데이터를 덮어쓰는" 사고를 막기 위함.
export async function pushAllToFirestore() {
  for (const entity of SYNCED_ENTITIES) {
    const rows = await localAdapter.list(entity, { includeDeleted: true })
    const winners = (await Promise.all(rows.map(async (row) => {
      const size = approxSize(row)
      if (size > MAX_DOC_BYTES) {
        console.warn(`[sync] skip push, oversized ${entity}/${row.id} (${size}B)`)
        return null
      }
      try {
        const existing = await getDoc(docRef(entity, row.id))
        const remote = existing.exists() ? existing.data() : null
        if (!remote || remote.updatedAt < row.updatedAt) return row
      } catch (e) {
        console.warn(`[sync] push precheck failed ${entity}/${row.id}`, e)
      }
      return null
    }))).filter(Boolean)

    for (let i = 0; i < winners.length; i += 400) {
      const batch = writeBatch(firestore)
      winners.slice(i, i + 400).forEach((row) => batch.set(docRef(entity, row.id), clean(row)))
      await batch.commit().catch((e) => console.warn(`[sync] push batch failed ${entity}`, e))
    }
  }
}

// 원격 행 하나를 받아 LWW로 로컬에 반영할지 결정한다.
// local.updatedAt >= remote.updatedAt 이면 스킵 — 이게 곧 "내 쓰기의 echo 무시"도 겸한다:
// 내가 쓴 직후 로컬 Dexie는 이미 그 updatedAt을 갖고 있으므로, 그 쓰기가 Firestore를 거쳐
// 되돌아와도 여기서 동일 비교로 자연히 걸러진다.
async function applyIncoming(entity, remote) {
  const local = await localAdapter.get(entity, remote.id)
  if (local && local.updatedAt >= remote.updatedAt) return false
  await localAdapter.bulkPut(entity, [remote]) // updatedAt 보존, 재기록하지 않는다
  return true
}

let unsubs = []
// entity별 onSnapshot 리스너를 건다. 뭔가 실제로 로컬에 반영됐을 때만(그리고 짧은 창으로
// 묶어서) onChanged()를 호출한다 — 마운트 시 여러 컬렉션이 거의 동시에 초기 스냅샷을
// 쏟아내는 것 때문에 store.jsx가 loadFlatData()를 연속으로 여러 번 돌리지 않도록.
export function startRealtimeSync(onChanged) {
  stopRealtimeSync()
  let pending = false
  let timer = null
  const schedule = () => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      if (pending) { pending = false; onChanged() }
    }, 150)
  }

  for (const entity of SYNCED_ENTITIES) {
    const unsub = onSnapshot(
      colRef(entity),
      async (snapshot) => {
        const changes = snapshot.docChanges()
        if (!changes.length) return
        const applied = await Promise.all(
          changes.map((c) => applyIncoming(entity, c.doc.data()))
        )
        if (applied.some(Boolean)) { pending = true; schedule() }
      },
      (err) => console.warn(`[sync] listener error ${entity}`, err)
    )
    unsubs.push(unsub)
  }
}

export function stopRealtimeSync() {
  unsubs.forEach((u) => u())
  unsubs = []
}
