// 동기화 대상 엔티티 이름. RemoteAdapter(W5)와 서버 스키마가 이 목록을 기준으로 삼는다.
export const ENTITIES = [
  'sessions', 'tasks', 'notes', 'wrongs', 'cards',
  'books', 'links', 'photos', 'hobbies', 'daylogs', 'kv',
]

// 모든 동기화 대상 행이 반드시 가지는 공통 필드:
//   id        — 클라이언트가 생성 (uuid v4). 서버가 발급하지 않는다
//   updatedAt — ISO 문자열. LWW(last-write-wins) 비교 기준
//   deletedAt — null 또는 ISO 문자열. 소프트 삭제 전용, 하드 삭제 금지
