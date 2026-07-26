import Dashboard from './screens/Dashboard.jsx'
import Planner from './screens/Planner.jsx'
import Timer from './screens/Timer.jsx'
import Memos from './screens/Memos.jsx'
import Reviews from './screens/Reviews.jsx'
import WrongNotes from './screens/WrongNotes.jsx'
import Links from './screens/Links.jsx'
import Stats from './screens/Stats.jsx'
import Forest from './screens/Forest.jsx'
import Rest from './screens/Rest.jsx'
import Flashcards from './screens/Flashcards.jsx'
import Search from './screens/Search.jsx'
import Settings from './screens/Settings.jsx'
import VersionHistory from './screens/VersionHistory.jsx'
import Secret, { HAS_SECRET } from './screens/Secret.jsx'
import Epilogue from './screens/Epilogue.jsx'
import { APP_VERSION } from './appVersion.js'

export const NAV = [
  { id: 'home', label: '홈', ico: '🏡', C: Dashboard },
  { id: 'search', label: '통합 검색', ico: '🔍', C: Search },
  { id: 'planner', label: '플래너', ico: '📅', C: Planner },
  { id: 'timer', label: '학습 타이머', ico: '⏱️', C: Timer },
  { id: 'memos', label: '과목 메모', ico: '📝', C: Memos },
  { id: 'reviews', label: '회독 관리', ico: '📚', C: Reviews },
  { id: 'wrong', label: '오답노트', ico: '❌', C: WrongNotes },
  { id: 'flashcards', label: '플래시카드', ico: '🃏', C: Flashcards },
  { id: 'links', label: '자주 가는 곳', ico: '🔗', C: Links },
  { id: 'rest', label: '쉼', ico: '☕', C: Rest },
  { id: 'stats', label: '통계', ico: '📊', C: Stats },
  { id: 'forest', label: '나의 숲', ico: '🌲', C: Forest },
  { id: 'settings', label: '설정', ico: '⚙️', C: Settings },
  { id: 'version', label: `v${APP_VERSION}`, ico: 'ℹ️', C: VersionHistory },
]

export const HIDDEN_NAV = [
  ...(HAS_SECRET ? [{ id: 'secret', C: Secret }] : []),
  { id: 'epilogue', C: Epilogue },
]

export { HAS_SECRET }
