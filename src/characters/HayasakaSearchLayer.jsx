import React, { useEffect, useState } from 'react'
import './hayasaka-search.css'

const asset = (name) =>
  `${import.meta.env.BASE_URL}assets/characters/hayasaka/upper_${name}.png`
const LIBRARY_BACKGROUND =
  `${import.meta.env.BASE_URL}assets/bg/hayasaka_library.webp`

const FACE_PATHS = {
  neutral: asset('neutral'),
  smile: asset('smile'),
  smug: asset('smug'),
  flustered: asset('flustered'),
}

const BLINK_PATH = asset('blink')

export default function HayasakaSearchLayer({ face = 'neutral', text, inner }) {
  const [blinking, setBlinking] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

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
      className="hayasaka-search-layer"
      style={{ '--hayasaka-bg-url': `url("${LIBRARY_BACKGROUND}")` }}
      aria-label="하야사카 아이 통합 검색 도우미"
    >
      <div className="hayasaka-search-bg" aria-hidden="true" />
      <div className="hayasaka-search-shade" aria-hidden="true" />

      <div className="hayasaka-search-character" aria-hidden="true">
        {imageFailed ? (
          <div className="hayasaka-search-fallback">SEARCH</div>
        ) : (
          <img
            src={blinking ? BLINK_PATH : (FACE_PATHS[face] || FACE_PATHS.neutral)}
            alt=""
            draggable="false"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      <div className="hayasaka-search-dialogue" aria-live="polite">
        <div className="hayasaka-search-name">早坂 愛</div>
        <p>{text}</p>
        {inner && <p className="hayasaka-search-inner">{inner}</p>}
      </div>
    </section>
  )
}
