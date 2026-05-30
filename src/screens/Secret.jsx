import React from 'react'

// 라벨 없는 비밀 메뉴 — 사이드바 설정 아래의 거의 안 보이는 점을 누르면 열려요.
//
// 친구 전용 콘텐츠는 src/screens/secret-data/ (gitignore) 에 둠.
// - secret-data/letters.jsx — LETTERS 배열 default export
// - secret-data/assets/<id>.(jpg|jpeg|png|webp) — 카드 배경 사진
//
// 폴더가 없거나 비어 있으면 HAS_SECRET=false → 사이드바 진입점도 자동으로 숨김.

// import.meta.glob 은 매칭 파일이 없으면 빈 객체 반환 → 폴더 자체가 없어도 안전.
const LETTERS_MOD = import.meta.glob('./secret-data/letters.jsx', { eager: true })
const LETTERS = LETTERS_MOD['./secret-data/letters.jsx']?.default || []

const BG_MAP = import.meta.glob(
  './secret-data/assets/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true, query: '?url', import: 'default' },
)

export const HAS_SECRET = LETTERS.length > 0

function bgFor(id) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP']) {
    const url = BG_MAP[`./secret-data/assets/${id}.${ext}`]
    if (url) return url
  }
  return null
}

function SecretCard({ letter }) {
  const bg = bgFor(letter.id)
  return (
    <div
      className={'secret-card' + (bg ? ' has-bg' : '')}
      style={bg ? { '--secret-bg': `url('${bg}')` } : undefined}
    >
      {bg && <div className="secret-overlay" aria-hidden="true" />}
      <div className="secret-content">
        <div className="secret-leaf">🌱</div>
        <h2 className="secret-h">성현아</h2>
        <div className="secret-body">{letter.content}</div>
        <div className="secret-sign">{letter.sign}</div>
      </div>
    </div>
  )
}

export default function Secret() {
  if (!HAS_SECRET) {
    return (
      <div className="secret-page">
        <div className="secret-card">
          <div className="secret-content">
            <div className="secret-leaf">🌱</div>
            <p style={{ textAlign: 'center', marginTop: 12 }}>
              조용한 공간이에요.
            </p>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="secret-page">
      {LETTERS.map((l) => (
        <SecretCard key={l.id} letter={l} />
      ))}
    </div>
  )
}
