// 화면 컴포넌트가 데이터에 접근하는 유일한 통로.
// fetch도 Dexie도 여기서만 다루고, 그 위(legacyMapping/store.jsx)는 이 파사드만 본다.
import { localAdapter } from './localAdapter.js'
import { mirrorPut } from './firestoreSync.js'

export const repository = {
  list: (entity, opts) => localAdapter.list(entity, opts),
  get: (entity, id) => localAdapter.get(entity, id),

  put: async (entity, row) => {
    const saved = await localAdapter.put(entity, row)
    mirrorPut(entity, saved) // fire-and-forget — 로컬 쓰기는 이미 끝났고 그게 진실의 소스다
    return saved
  },

  remove: async (entity, id) => {
    const removed = await localAdapter.remove(entity, id)
    if (removed) mirrorPut(entity, removed) // 소프트 삭제도 그냥 deletedAt이 세팅된 put
    return removed
  },

  // 원격에서 들어온 행을 로컬에 반영할 때 전용(firestoreSync.applyIncoming) + 전체 교체
  // (legacyMapping.persistFullReplace, Dexie 직접 접근)에서 씀 — 일부러 미러링 안 함:
  // 전자는 다시 Firestore로 쏘면 의미 없는 왕복이고, 후자는 pushAllToFirestore()가
  // LWW 비교하며 따로 명시적으로 처리한다(store.jsx 참고).
  bulkPut: (entity, rows) => localAdapter.bulkPut(entity, rows),

  pendingChanges: () => localAdapter.pendingChanges(),
}
