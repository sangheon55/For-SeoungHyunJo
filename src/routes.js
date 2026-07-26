// W3 모바일 셸의 라우팅 정책 테이블. 실제 URL 라우터(react-router 등)는 아직 도입하지 않았고
// (기존 tab-state(go) 모델을 그대로 씀), 여기서는 화면 id별 "모바일에서 어떻게 보여줄지"만 선언한다.
// id는 src/nav.js의 NAV 항목 id와 반드시 일치해야 한다.
//
// path            : 아직 아무 데도 참조되지 않음 — 향후 react-router-dom 도입 시를 위한 자리 표시자.
// mobile          : true   → 모바일에서 전체 화면 그대로 노출
//                    'lite' → 모바일에서는 축약이 이상적(재기획서 §2-2). liteImplemented가 true인
//                             화면(planner, reviews)만 실제로 축약 콘텐츠를 적용하고, 나머지는
//                             지금은 mobile:true와 동일하게 전체 화면을 보여준다 — TODO(W3+):
//                             화면별 실제 lite 콘텐츠 축소, 재기획서 §2-2 참고.
//                    false  → 모바일 좁은 화면에서 DesktopOnlyNotice로 게이팅(강제 데스크탑이면 무시).
// mobileTab       : 값이 있으면 하단 탭바(4개 고정: 타이머/할 일/복습/오늘)에 노출되는 라벨.
// liteImplemented : mobile:'lite'인 화면 중 실제로 lite 콘텐츠 변경이 적용된 경우만 true.
export const routes = [
  { id: 'home', path: '/', mobile: true, mobileTab: '오늘' },
  { id: 'timer', path: '/timer', mobile: true, mobileTab: '타이머' },
  { id: 'planner', path: '/tasks', mobile: 'lite', mobileTab: '할 일', liteImplemented: true },
  // '/review' 허브 진입점 겸용 — 재기획서 "복습 = 플래시카드 + 오답 복습 통합 진입점" 중 플래시카드를 대표로 매핑
  { id: 'flashcards', path: '/review/cards', mobile: true, mobileTab: '복습' },
  // '/review/wrongs'(오답 복습 퀴즈)는 WrongNotes.jsx 내부 상태라 별도 라우트로 분리하지 않음 — W3 범위 밖
  { id: 'wrong', path: '/wrongs', mobile: false },
  { id: 'memos', path: '/notes', mobile: 'lite' },
  { id: 'reviews', path: '/books', mobile: 'lite', liteImplemented: true },
  { id: 'links', path: '/links', mobile: false },
  { id: 'rest', path: '/rest', mobile: 'lite' },
  { id: 'stats', path: '/stats', mobile: 'lite' },
  { id: 'search', path: '/search', mobile: 'lite' },
  { id: 'forest', path: '/forest', mobile: 'lite' },
  { id: 'settings', path: '/settings', mobile: 'lite' },
  { id: 'version', path: '/updates', mobile: true },
  // '/import' — W2 범위(사용자 요청으로 제외), 화면 자체가 아직 없어 표에서 제외
]

export const routeById = Object.fromEntries(routes.map((r) => [r.id, r]))

// 하단 탭바에 고정 순서로 노출할 4개 — mobileTab이 있는 라우트에서 자동 유도
export const BOTTOM_TAB_IDS = routes.filter((r) => r.mobileTab).map((r) => r.id)
