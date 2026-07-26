import React, { useEffect, useRef, useState } from 'react'
import './kaguya.css'
import { askKaguya } from './kaguyaApi.js'
import { useRoomBackground } from '../characters/roomBackground.js'

const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`

const FACE_PATHS = {
  neutral: asset('characters/kaguya-timer/upper_neutral.png'),
  smile: asset('characters/kaguya-timer/upper_smile.png'),
  smug: asset('characters/kaguya-timer/upper_smug.png'),
}
const BLINK_PATH = asset('characters/kaguya-timer/upper_blink.png')
const FUJIWARA_FACE_PATHS = {
  neutral: asset('characters/fujiwara/upper_neutral.png'),
  smile: asset('characters/fujiwara/upper_smile.png'),
  smug: asset('characters/fujiwara/upper_smug.png'),
  flustered: asset('characters/fujiwara/upper_flustered.png'),
}
const FUJIWARA_BLINK_PATH = asset('characters/fujiwara/upper_blink.png')
const FUJIWARA_REVERSE_CUTIN = asset('characters/fujiwara/reverse_interrupt_cutin.webp')
function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 6 || hour >= 21) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 18) return 'day'
  return 'sunset'
}

export default function KaguyaLayer({
  face = 'neutral',
  text = '오늘 계획은 확인하셨나요, 성현 씨?',
  inner = '(기다렸다는 티는 내지 말아야지.)',
  active = false,
  studyContext = {},
  speaker = 'kaguya',
  guestVisible = false,
  guestExiting = false,
  cutInVisible = false,
}) {
  const rootRef = useRef(null)
  const requestRef = useRef(null)
  const [blinking, setBlinking] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [guestImageFailed, setGuestImageFailed] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [askError, setAskError] = useState('')
  const [asking, setAsking] = useState(false)
  const room = useRoomBackground()
  const timeOfDay = getTimeOfDay()

  useEffect(() => {
    let timeout
    let blinkTimeout

    const schedule = () => {
      timeout = window.setTimeout(() => {
        setBlinking(true)
        blinkTimeout = window.setTimeout(() => {
          setBlinking(false)
          schedule()
        }, 120)
      }, 4000 + Math.random() * 3000)
    }

    schedule()
    return () => {
      window.clearTimeout(timeout)
      window.clearTimeout(blinkTimeout)
    }
  }, [])

  useEffect(() => () => requestRef.current?.abort(), [])

  useEffect(() => {
    setImageFailed(false)
    setGuestImageFailed(false)
  }, [face, speaker])

  const kaguyaFace = speaker === 'kaguya' ? face : 'neutral'
  const fujiwaraFace = speaker === 'fujiwara' ? face : 'neutral'
  const speakerName = speaker === 'fujiwara' ? '藤原 千花' : '四宮かぐや'

  const onPointerMove = (event) => {
    if (!rootRef.current || window.matchMedia('(max-width: 768px)').matches) return
    const rect = rootRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    rootRef.current.style.setProperty('--kaguya-x', `${x * 8}px`)
    rootRef.current.style.setProperty('--kaguya-y', `${y * 5}px`)
  }

  const resetPointer = () => {
    rootRef.current?.style.setProperty('--kaguya-x', '0px')
    rootRef.current?.style.setProperty('--kaguya-y', '0px')
  }

  const sendQuestion = async (rawQuestion) => {
    const value = rawQuestion.trim()
    if (!value || asking) return
    setAsking(true)
    setAskError('')
    setAnswer('')
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    try {
      setAnswer(await askKaguya(value, studyContext, { signal: controller.signal }))
    } catch (error) {
      if (!controller.signal.aborted) {
        setAskError(error instanceof Error ? error.message : '카구야 AI에 연결하지 못했어요.')
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setAsking(false)
      }
    }
  }

  const submitQuestion = (event) => {
    event.preventDefault()
    sendQuestion(question)
  }

  const quickQuestions = [
    '지금부터 30분 계획을 짜줘',
    '오늘 목표까지 어떻게 공부할까?',
    '집중이 끊겼는데 다음 행동을 정해줘',
  ]

  return (
    <section
      ref={rootRef}
      className={`kaguya-layer kaguya-${timeOfDay} room-${room.period}${active ? ' is-active' : ''}${guestVisible ? ' has-guest' : ''}${guestExiting ? ' is-guest-exiting' : ''} speaker-${speaker}`}
      style={{ '--kaguya-bg-url': `url("${room.path}")` }}
      onPointerMove={onPointerMove}
      onPointerLeave={resetPointer}
      aria-label="카구야 학습 도우미"
    >
      <div className="kaguya-bg" aria-hidden="true" />
      <div className="kaguya-shade" aria-hidden="true" />
      {cutInVisible && (
        <div className="fujiwara-cutin" aria-hidden="true">
          <img src={FUJIWARA_REVERSE_CUTIN} alt="" draggable="false" />
        </div>
      )}

      <button
        type="button"
        className="kaguya-ask-toggle"
        onClick={() => setAskOpen((open) => !open)}
        aria-expanded={askOpen}
        disabled={guestVisible || cutInVisible}
      >
        {askOpen ? '질문 닫기' : '카구야에게 묻기'}
      </button>

      <div className="kaguya-character" aria-hidden="true">
        {imageFailed ? (
          <div className="kaguya-image-fallback">秀知院</div>
        ) : (
          <img
            className="kaguya-face"
            src={blinking && speaker === 'kaguya'
              ? BLINK_PATH
              : (FACE_PATHS[kaguyaFace] || FACE_PATHS.neutral)}
            alt=""
            draggable="false"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      {guestVisible && (
        <div className="fujiwara-guest" aria-hidden="true">
          {guestImageFailed ? (
            <div className="fujiwara-image-fallback">書記</div>
          ) : (
            <img
              src={blinking && speaker === 'fujiwara'
                ? FUJIWARA_BLINK_PATH
                : (FUJIWARA_FACE_PATHS[fujiwaraFace] || FUJIWARA_FACE_PATHS.neutral)}
              alt=""
              draggable="false"
              onError={() => setGuestImageFailed(true)}
            />
          )}
        </div>
      )}

      <div className="kaguya-dialogue" aria-live="polite">
        <div className="kaguya-name">{speakerName}</div>
        <p>{text}</p>
        {inner && <p className="kaguya-inner">{inner}</p>}
      </div>

      {askOpen && (
        <form className="kaguya-ask-panel" onSubmit={submitQuestion}>
          <label htmlFor="kaguya-question">현재 학습 기록을 바탕으로 카구야에게 물어보세요</label>
          <div className="kaguya-quick-questions">
            {quickQuestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuestion(item)
                  sendQuestion(item)
                }}
                disabled={asking}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="kaguya-ask-row">
            <input
              id="kaguya-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={500}
              placeholder="예: 지금 과목에서 무엇부터 끝내야 해?"
              autoComplete="off"
            />
            <button type="submit" disabled={asking || !question.trim()}>
              {asking ? '생각 중…' : '질문'}
            </button>
          </div>
          {(answer || askError) && (
            <p className={askError ? 'kaguya-ask-error' : 'kaguya-ask-answer'} aria-live="polite">
              {askError || answer}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
