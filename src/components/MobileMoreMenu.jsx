import React from 'react'
import { NAV } from '../nav.js'
import { routeById, BOTTOM_TAB_IDS } from '../routes.js'

const BOTTOM_TAB_SET = new Set(BOTTOM_TAB_IDS)

export default function MobileMoreMenu({ currentTab, onSelect, onClose }) {
  const others = NAV.filter((n) => !BOTTOM_TAB_SET.has(n.id))
  return (
    <div className="wa-backdrop" onClick={onClose}>
      <div className="wa-modal mobile-more-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wa-modal-head">
          <h3>더보기</h3>
          <button className="btn ghost sm" onClick={onClose}>닫기</button>
        </div>
        <div className="wa-modal-body mobile-more-list">
          {others.map((n) => {
            const gated = routeById[n.id]?.mobile === false
            return (
              <button
                key={n.id}
                className={'mobile-more-item' + (n.id === currentTab ? ' active' : '')}
                onClick={() => onSelect(n.id)}
              >
                <span className="ico">{n.ico}</span>
                <span className="grow">{n.label}</span>
                {gated && <span className="tag" style={{ background: '#8aa' }}>데스크탑 전용</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
