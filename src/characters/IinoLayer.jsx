import React, { useEffect, useState } from 'react'
import './iino.css'
import { useRoomBackground } from './roomBackground.js'

const asset = (path) => `${import.meta.env.BASE_URL}assets/characters/iino/${path}`

const FACE_PATHS = {
  neutral: asset('upper_neutral.png'),
  serious: asset('upper_serious.png'),
  flustered: asset('upper_flustered.png'),
  smile: asset('upper_smile.png'),
}

const BLINK_PATH = asset('upper_blink.png')
export default function IinoLayer({ face = 'neutral', text, inner }) {
  const [blinking, setBlinking] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const room = useRoomBackground()

  useEffect(() => {
    let timeoutId
    let blinkId

    const scheduleBlink = () => {
      timeoutId = window.setTimeout(() => {
        setBlinking(true)
        blinkId = window.setTimeout(() => {
          setBlinking(false)
          scheduleBlink()
        }, 120)
      }, 4_000 + Math.random() * 3_000)
    }

    scheduleBlink()
    return () => {
      window.clearTimeout(timeoutId)
      window.clearTimeout(blinkId)
    }
  }, [])

  useEffect(() => {
    setImageFailed(false)
  }, [face])

  return (
    <section
      className={`iino-layer room-${room.period}`}
      style={{ '--iino-bg-url': `url("${room.path}")` }}
      aria-label="이이노 미코 학습 계획 도우미"
    >
      <div className="iino-bg" aria-hidden="true" />
      <div className="iino-shade" aria-hidden="true" />

      <div className="iino-character" aria-hidden="true">
        {imageFailed ? (
          <div className="iino-image-fallback">風紀委員</div>
        ) : (
          <img
            src={blinking ? BLINK_PATH : (FACE_PATHS[face] || FACE_PATHS.neutral)}
            alt=""
            draggable="false"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      <div className="iino-dialogue" aria-live="polite">
        <div className="iino-name">伊井野ミコ</div>
        <p>{text}</p>
        {inner && <p className="iino-inner">{inner}</p>}
      </div>
    </section>
  )
}
