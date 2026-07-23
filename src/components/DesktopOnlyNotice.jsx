import React from 'react'

// "모바일에서 ✕인 경로에 직접 들어오면 → 안내 카드 + 토글. 막지 말고 우회로를 준다." (구현_스펙 §7)
export default function DesktopOnlyNotice({ screenLabel, onViewAsDesktop, onAlwaysDesktop }) {
  return (
    <div className="card desktop-only-notice">
      <div className="desktop-only-ico">🖥️</div>
      <div className="desktop-only-title">데스크탑에서 이용해 주세요</div>
      <div className="desktop-only-body">
        {screenLabel ? `'${screenLabel}'` : '이 화면'}은 넓은 화면에 최적화되어 있어요.
        아래 버튼으로 지금 바로 데스크탑 레이아웃으로 볼 수 있어요.
      </div>
      <div className="desktop-only-actions">
        <button className="btn" onClick={onViewAsDesktop}>🖥️ 데스크탑 레이아웃으로 보기</button>
        {onAlwaysDesktop && (
          <button className="btn ghost sm" onClick={onAlwaysDesktop}>
            항상 데스크탑으로 보기 (설정에 저장)
          </button>
        )}
      </div>
    </div>
  )
}
