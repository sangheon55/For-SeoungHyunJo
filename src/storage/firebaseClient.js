import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// 플래너 전용 Firebase 프로젝트(study-planner-19670).
// 동상이몽과는 별도 DB — "친구 진행상황/응원" 연결은 나중에 dongsang2mong.com 쪽에서
// 이 프로젝트로 별도 연결하는 방식으로 다시 잇는다(지금은 연결 안 함).
// 클라이언트 공개 설정값 — 원래 브라우저에 그대로 노출되는 값이라 커밋해도 안전하다.
// 보안은 이 값을 숨기는 게 아니라 Firestore 보안 규칙으로 건다.
const firebaseConfig = {
  apiKey: 'AIzaSyCk4ySFf7pcIFGGEFYs_FITRbgp9Y2SKvM',
  authDomain: 'study-planner-19670.firebaseapp.com',
  projectId: 'study-planner-19670',
  storageBucket: 'study-planner-19670.firebasestorage.app',
  messagingSenderId: '964454314083',
  appId: '1:964454314083:web:da825a39410c5fd15d4856',
}

const app = initializeApp(firebaseConfig)

// IndexedDB 기반 영속 캐시 — 오프라인 중 쓴 변경이 앱 재시작/탭 종료를 넘어 살아남고
// 재연결 시 SDK가 자동으로 밀어올린다. 수동 아웃박스 테이블 없이 이걸로 충분하다
// (단일 사용자, 적당한 데이터량 — 재기획서 §3-3 "이 이상 복잡할 이유가 없다").
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
