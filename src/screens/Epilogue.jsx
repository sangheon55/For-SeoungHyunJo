import React from 'react'

// 라벨 없는 두 번째 비밀 메뉴 — 사이드바 Secret 점 아래의 또 다른 점.
// 이 페이지는 공개 (git 추적). 콘텐츠는 아래 본문을 직접 편집하면 됨.

export default function Epilogue() {
  return (
    <div className="secret-page">
      <div className="secret-card">
        <div className="secret-content">
          <div className="secret-leaf">🌳</div>

          <div className="secret-body">
            <p>
              5급을 준비하는 조성현을 응원하기 위해 만든 프로그램입니다.
            </p>

            <p>
              간단하게 만들려고 했는데, 재미 붙어서 뭐가 많이 생겼다.
              <br />
              덕분에 웹, 앱 공부 많이 된다.
            </p>

            <p>
              성현아. 공부 열심히 해라.
              <br />
              파이팅.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
