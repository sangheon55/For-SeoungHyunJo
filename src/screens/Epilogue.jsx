import React from 'react'

// 라벨 없는 두 번째 비밀 메뉴 — 사이드바 Secret 점 아래의 또 다른 점.
// 이 페이지는 공개 (git 추적). 콘텐츠는 아래 본문을 직접 편집하면 됨.

export default function Epilogue() {
  return (
    <div className="secret-page">
      <div className="secret-card">
        <div className="secret-content">
          <div className="secret-leaf">🌳</div>
          <h2 className="secret-h">에필로그</h2>

          <div className="secret-body">
            <p>
              5급 기술고시 준비하는 친구 보고
              <br />
              혼자 공부하는 거 좀 덜 심심하라고 만든 앱이에요.
            </p>

            <p>
              여기까지 들어왔으면 — 화이팅.
            </p>

            <p style={{ textAlign: 'center', marginTop: 28 }}>🌱</p>
          </div>

          <div className="secret-sign">— 조성현 친구 이상헌이 만듦</div>
        </div>
      </div>
    </div>
  )
}
