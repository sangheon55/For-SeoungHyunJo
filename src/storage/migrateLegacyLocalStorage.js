// 기존 웹 폴백(localStorage 통짜 JSON)에서 Dexie로 최초 1회 이전.
// 이미 브라우저에서 써본 사용자의 데이터가 여기 있을 수 있다.
import { db } from './localAdapter.js'
import { mergeDefaults } from './defaultData.js'
import { persistFullReplace } from './legacyMapping.js'

const LEGACY_KEY = 'seonghyeon_planner_v1'

// 반환값: 실제로 레거시 데이터를 가져왔으면 true — 호출자(store.jsx)가 그때만
// Firestore로 밀어올리기 위해 씀(매 기동마다가 아니라).
export async function migrateLegacyLocalStorageIfNeeded() {
  const flag = await db.table('meta').get('migratedFromLocalStorage')
  if (flag) return false

  let imported = false
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        await persistFullReplace(mergeDefaults(parsed))
        imported = true
      }
    }
  } catch (e) {
    console.warn('[migrate] legacy localStorage import failed, continuing with defaults', e)
  } finally {
    await db.table('meta').put({ key: 'migratedFromLocalStorage', value: true, at: new Date().toISOString() })
  }
  // localStorage[LEGACY_KEY]는 일부러 지우지 않는다 — 3중 안전망의 여분 사본으로 남겨둔다
  return imported
}
