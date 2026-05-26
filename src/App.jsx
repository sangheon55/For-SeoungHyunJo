import React, { useState } from 'react'
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
import Settings from './screens/Settings.jsx'

const NAV = [
  { id: 'home', label: '홈', ico: '🏡', C: Dashboard },
  { id: 'planner', label: '플래너', ico: '📅', C: Planner },
  { id: 'timer', label: '학습 타이머', ico: '⏱️', C: Timer },
  { id: 'memos', label: '과목 메모', ico: '📝', C: Memos },
  { id: 'reviews', label: '회독 관리', ico: '📚', C: Reviews },
  { id: 'wrong', label: '오답노트', ico: '❌', C: WrongNotes },
  { id: 'links', label: '자주 가는 곳', ico: '🔗', C: Links },
  { id: 'rest', label: '쉼', ico: '☕', C: Rest },
  { id: 'stats', label: '통계', ico: '📊', C: Stats },
  { id: 'forest', label: '나의 숲', ico: '🌲', C: Forest },
  { id: 'settings', label: '설정', ico: '⚙️', C: Settings },
]

export default function App() {
  const [tab, setTab] = useState('home')
  const cur = NAV.find((n) => n.id === tab) || NAV[0]
  const Screen = cur.C
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1>🌲 합격 플래너</h1>
          <p>조성현 · 5급 기술고시(산림자원직)</p>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={'nav-item' + (n.id === tab ? ' active' : '')}
            onClick={() => setTab(n.id)}
          >
            <span className="ico">{n.ico}</span>
            {n.label}
          </button>
        ))}
        <div className="sidebar-foot">합격까지, 한 그루씩 🌱</div>
      </aside>
      <main className="main" key={tab}>
        <Screen go={setTab} />
      </main>
    </div>
  )
}
