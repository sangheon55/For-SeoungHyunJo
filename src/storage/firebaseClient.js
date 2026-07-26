import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const productionConfig = {
  apiKey: 'AIzaSyCk4ySFf7pcIFGGEFYs_FITRbgp9Y2SKvM',
  authDomain: 'study-planner-19670.firebaseapp.com',
  projectId: 'study-planner-19670',
  storageBucket: 'study-planner-19670.firebasestorage.app',
  messagingSenderId: '964454314083',
  appId: '1:964454314083:web:da825a39410c5fd15d4856',
}

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const hasCompleteEnvironmentConfig = Object.values(envConfig).every(Boolean)
const cloudRequested = import.meta.env.VITE_ENABLE_CLOUD_SYNC === 'true'

export const dataEnvironment = import.meta.env.VITE_DATA_ENV || 'local'
// Preview가 실수로 운영 프로젝트 fallback을 사용하지 않도록 한다.
// 하드코딩된 기존 프로젝트 설정은 production에서만 허용한다.
export const cloudEnabled = cloudRequested
  && (dataEnvironment === 'production' || hasCompleteEnvironmentConfig)
export const isProductionData = cloudEnabled && dataEnvironment === 'production'

// 운영 Firebase는 명시적으로 cloud sync를 켠 빌드에서만 초기화한다.
// 로컬 개발과 Preview의 기본값은 local이며 운영 데이터를 절대 읽거나 쓰지 않는다.
const selectedConfig = hasCompleteEnvironmentConfig ? envConfig : productionConfig
const app = initializeApp(selectedConfig)

export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
