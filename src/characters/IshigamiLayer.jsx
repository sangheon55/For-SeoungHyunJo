import React, { useEffect, useState } from 'react'
import './ishigami.css'
import { useRoomBackground } from './roomBackground.js'

const asset = (name) => `${import.meta.env.BASE_URL}assets/characters/ishigami/upper_${name}.png`
const FACES = {
  neutral: asset('neutral'),
  serious: asset('serious'),
  tired: asset('tired'),
  smile: asset('smile'),
}

export default function IshigamiLayer({ face = 'neutral', advice, loading, error, onRefresh }) {
  const [blinking, setBlinking] = useState(false)
  const room = useRoomBackground()

  useEffect(() => {
    let openId
    let closeId
    const schedule = () => {
      openId = window.setTimeout(() => {
        setBlinking(true)
        closeId = window.setTimeout(() => {
          setBlinking(false)
          schedule()
        }, 120)
      }, 4_000 + Math.random() * 3_000)
    }
    schedule()
    return () => {
      window.clearTimeout(openId)
      window.clearTimeout(closeId)
    }
  }, [])

  return (
    <section
      className={`ishigami-layer room-${room.period}`}
      style={{ '--ishigami-bg-url': `url("${room.path}")` }}
      aria-label="이시가미 유우 공부 기록 조언"
    >
      <div className="ishigami-bg" aria-hidden="true" />
      <div className="ishigami-shade" aria-hidden="true" />
      <img
        className="ishigami-character"
        src={blinking ? asset('blink') : (FACES[face] || FACES.neutral)}
        alt=""
        draggable="false"
      />
      <div className="ishigami-dialogue">
        <div className="ishigami-name">石上優 · 기록 분석</div>
        <p>{loading ? '공부 기록 보는 중이야. 잠깐만… 데이터는 거짓말을 안 하거든.' : advice}</p>
        {error && <small>{error}</small>}
        <button type="button" className="btn ghost sm" onClick={onRefresh} disabled={loading}>
          {loading ? '분석 중' : '기록 다시 분석'}
        </button>
      </div>
    </section>
  )
}
