// PWA 매니페스트용 아이콘 생성 — icon-core.cjs의 기존 렌더러 재사용.
// 카구야 에셋이 준비되기 전까지의 자리표시자 아이콘이다.
// 다시 생성하려면: node scripts/generate-pwa-icons.cjs
const fs = require('fs')
const path = require('path')
const { render, encodePNG } = require('./icon-core.cjs')

const OUT = path.join(__dirname, '..', 'public')
fs.mkdirSync(OUT, { recursive: true })

const targets = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['maskable-icon-512x512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon.png', 32],
]

for (const [name, size] of targets) {
  fs.writeFileSync(path.join(OUT, name), encodePNG(size, render(size)))
}

console.log(`생성 완료: ${targets.length}개 아이콘 → ${OUT}`)
