import React, { useState } from 'react'
import { NAV } from '../nav.js'
import { routeById, BOTTOM_TAB_IDS } from '../routes.js'
import DesktopOnlyNotice from '../components/DesktopOnlyNotice.jsx'
import MobileMoreMenu from '../components/MobileMoreMenu.jsx'

export default function MobileShell({ tab, go, onViewAsDesktop, onAlwaysDesktop }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const cur = NAV.find((n) => n.id === tab) || NAV[0]
  const Screen = cur.C
  const route = routeById[tab]
  const gated = route?.mobile === false
  const liteOn = route?.mobile === 'lite' && !!route.liteImplemented

  return (
    <div className="mobile-shell">
      <header className="mobile-topbar">
        <span className="mobile-topbar-brand">🌲 합격 플래너</span>
        <button className="mobile-more-btn" onClick={() => setMoreOpen(true)}>☰ 더보기</button>
      </header>

      <main className="mobile-main" key={tab}>
        {gated ? (
          <DesktopOnlyNotice
            screenLabel={cur.label}
            onViewAsDesktop={onViewAsDesktop}
            onAlwaysDesktop={onAlwaysDesktop}
          />
        ) : (
          <Screen go={go} {...(liteOn ? { lite: true } : {})} />
        )}
      </main>

      <nav className="bottom-tabbar">
        {BOTTOM_TAB_IDS.map((id) => {
          const n = NAV.find((x) => x.id === id)
          const r = routeById[id]
          if (!n || !r) return null
          return (
            <button
              key={id}
              className={'bottom-tab' + (id === tab ? ' active' : '')}
              onClick={() => go(id)}
            >
              <span className="bottom-tab-ico">{n.ico}</span>
              <span className="bottom-tab-label">{r.mobileTab || n.label}</span>
            </button>
          )
        })}
      </nav>

      {moreOpen && (
        <MobileMoreMenu
          currentTab={tab}
          onSelect={(id) => { go(id); setMoreOpen(false) }}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </div>
  )
}
