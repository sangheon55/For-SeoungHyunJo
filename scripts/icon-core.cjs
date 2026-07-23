// 절차적 PNG 아이콘 렌더러 — 외부 도구 없이 Node 내장 기능만 사용.
// 원래 electron/generate-icon.cjs 에 있던 렌더링 코어를 그대로 옮긴 것.
// 녹색 라운드 배경 + 흰색 체크마크("합격 플래너" 테마).
const zlib = require('zlib')

// ── CRC32 (PNG 청크용) ──────────────────────────────────────
const CRC = (() => {
  const t = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ── 디자인 (256 좌표계 기준) ────────────────────────────────
const TOP = [0x7c, 0xc8, 0x6f] // 밝은 녹색
const BOT = [0x2e, 0x7d, 0x32] // 진한 녹색
const RADIUS = 44 // 라운드 모서리 반지름
const HALF = 128

// 체크마크: 두 선분의 캡슐(capsule) 합집합
const SEG1 = [58, 140, 106, 186]
const SEG2 = [106, 186, 196, 82]
const STROKE = 18 // 체크마크 두께(반지름)

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax,
    dy = by - ay
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx,
    cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

// 256 좌표계의 한 점 색상 — 불투명 a(0/1) 반환, 슈퍼샘플링으로 AA 처리
function sample(x, y) {
  const dx = Math.max(Math.abs(x - HALF) - (HALF - RADIUS), 0)
  const dy = Math.max(Math.abs(y - HALF) - (HALF - RADIUS), 0)
  if (Math.hypot(dx, dy) > RADIUS) return [0, 0, 0, 0] // 라운드 바깥 = 투명

  const inCheck =
    segDist(x, y, ...SEG1) <= STROKE || segDist(x, y, ...SEG2) <= STROKE
  if (inCheck) return [255, 255, 255, 1]

  const t = y / 256 // 세로 그라데이션
  return [
    Math.round(TOP[0] + (BOT[0] - TOP[0]) * t),
    Math.round(TOP[1] + (BOT[1] - TOP[1]) * t),
    Math.round(TOP[2] + (BOT[2] - TOP[2]) * t),
    1,
  ]
}

// 지정 크기로 RGBA 버퍼 렌더(4x4 슈퍼샘플링)
function render(size) {
  const SS = 4
  const buf = Buffer.alloc(size * size * 4)
  for (let oy = 0; oy < size; oy++) {
    for (let ox = 0; ox < size; ox++) {
      let sr = 0,
        sg = 0,
        sb = 0,
        sa = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const X = ((ox + (sx + 0.5) / SS) / size) * 256
          const Y = ((oy + (sy + 0.5) / SS) / size) * 256
          const [r, g, b, a] = sample(X, Y)
          sr += r * a
          sg += g * a
          sb += b * a
          sa += a
        }
      }
      const N = SS * SS
      const i = (oy * size + ox) * 4
      if (sa > 0) {
        buf[i] = Math.round(sr / sa)
        buf[i + 1] = Math.round(sg / sa)
        buf[i + 2] = Math.round(sb / sa)
      }
      buf[i + 3] = Math.round((sa / N) * 255)
    }
  }
  return buf
}

// ── PNG 인코딩 ──────────────────────────────────────────────
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = size * 4
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

module.exports = { crc32, segDist, sample, render, chunk, encodePNG }
