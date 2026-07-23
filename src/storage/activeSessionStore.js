// 진행 중인 일일 타이머의 기기-로컬 상태. 동기화 대상이 아니라 repository를 거치지 않고
// meta 테이블과 같은 방식으로 db.table()에 직접 접근한다.
import { db } from './localAdapter.js'

const ID = 'daily'

export const activeSessionStore = {
  async get() {
    return (await db.table('activeSession').get(ID)) ?? null
  },

  // 부분 갱신 — 기존 행과 병합해서 저장한다
  async put(patch) {
    const existing = await db.table('activeSession').get(ID)
    const next = { ...existing, ...patch, id: ID }
    await db.table('activeSession').put(next)
    return next
  },

  async clear() {
    await db.table('activeSession').delete(ID)
  },
}
