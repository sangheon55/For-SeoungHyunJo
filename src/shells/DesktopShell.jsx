import React from 'react'
import { NAV, HIDDEN_NAV, HAS_SECRET } from '../nav.js'

export default function DesktopShell({ tab, go }) {
  const cur = [...NAV, ...HIDDEN_NAV].find((n) => n.id === tab) || NAV[0]
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
            onClick={() => go(n.id)}
          >
            <span className="ico">{n.ico}</span>
            {n.label}
          </button>
        ))}
        {HAS_SECRET && (
          <button
            className={'nav-item secret-nav' + (tab === 'secret' ? ' active' : '')}
            onClick={() => go('secret')}
            aria-label=""
            title=""
          >
            <span className="ico">·</span>
          </button>
        )}
        <button
          className={'nav-item secret-nav' + (tab === 'epilogue' ? ' active' : '')}
          onClick={() => go('epilogue')}
          aria-label=""
          title=""
        >
          <span className="ico">·</span>
        </button>
        <div className="sidebar-foot">합격까지, 한 그루씩 🌱</div>
      </aside>
      <main className="main" key={tab}>
        <Screen go={go} />
      </main>
    </div>
  )
}
