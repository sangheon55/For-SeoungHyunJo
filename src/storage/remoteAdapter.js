// 백엔드 전용 파일. 나중에 실제 서버가 붙으면 이 파일 하나만 갈아끼운다(W5).
// 지금은 인터페이스 모양만 맞춘 스텁 — repository.js는 아직 이걸 부르지 않는다.
import { ENTITIES } from './types.js'

export const remoteAdapter = {
  async pull(cursor) {
    return { cursor: cursor ?? null, changes: Object.fromEntries(ENTITIES.map((e) => [e, []])) }
  },

  async push(changes) {
    return { cursor: null }
  },

  async uploadImage(id, blob) {
    throw new Error('uploadImage not implemented — 백엔드 연결 전(W5)')
  },

  capabilities() {
    return { images: false }
  },
}
