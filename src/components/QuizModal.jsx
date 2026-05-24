import React, { useEffect, useRef, useState } from 'react'
import { applyReviewResult } from '../lib/ebbinghaus.js'
import { dateStr, hms } from '../lib/util.js'

// 퀴즈 모드 모달 — 큐에 있는 오답을 하나씩 풀어가며 결과를 적용
// props:
//   queue: WrongAnswer[]            큐(고정 스냅샷)
//   settings: { intervals, resetOnMiss }
//   onResult(id, updatedWa)         각 결과 적용 시 상위에서 데이터 업데이트
//   onClose()                       종료
export default function QuizModal({ queue, settings, onResult, onClose }) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState('question') // 'question' | 'answer' | 'summary'
  const [myTry, setMyTry] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [summary, setSummary] = useState({ total: queue.length, pass: 0, fail: 0 })
  const tickRef = useRef()
  const startedAtRef = useRef(Date.now())

  const current = queue[idx]

  // 타이머
  useEffect(() => {
    if (phase !== 'question') return
    startedAtRef.current = Date.now()
    setElapsed(0)
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [phase, idx])

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reveal = () => { clearInterval(tickRef.current); setPhase('answer') }

  const submit = (result) => {
    const updated = applyReviewResult(current, result, dateStr(), settings)
    onResult(current.id, updated)
    setSummary((s) => ({
      ...s,
      pass: s.pass + (result === 'pass' ? 1 : 0),
      fail: s.fail + (result === 'fail' ? 1 : 0),
    }))
    if (idx + 1 < queue.length) {
      setIdx(idx + 1)
      setPhase('question')
      setMyTry('')
    } else {
      setPhase('summary')
    }
  }

  if (phase === 'summary') {
    return (
      <div className="wa-backdrop">
        <div className="wa-modal quiz-summary">
          <div className="quiz-summary-emoji">🎯</div>
          <h3>오늘 복습 끝!</h3>
          <p>총 <b>{summary.total}</b>문제 · <span className="up">맞춤 {summary.pass}</span> · <span className="down">틀림 {summary.fail}</span></p>
          {summary.pass === summary.total && summary.total > 0 && (
            <p className="hint" style={{ marginTop: 10 }}>완벽해요! 한 그루의 잎이 더 자랐어요 🌿</p>
          )}
          <div style={{ marginTop: 18 }}>
            <button className="btn" onClick={onClose}>닫기</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wa-backdrop">
      <div className="wa-modal quiz-modal">
        <div className="quiz-head">
          <div className="quiz-progress">{idx + 1} / {queue.length}</div>
          <div className="quiz-timer">⏱ {hms(elapsed)}</div>
          <button className="btn ghost sm" onClick={onClose}>종료</button>
        </div>

        <div className="quiz-meta">
          <span className="chip-mini">난이도 {current.difficulty}</span>
          <span className="chip-mini">{current.errorType}</span>
          {(current.source?.book || current.source?.round || current.source?.page) && (
            <span className="chip-mini">📚 {[current.source.book, current.source.round, current.source.page].filter(Boolean).join(' · ')}</span>
          )}
          <span className="chip-mini">{current.currentStep + 1}/{current.schedule.length} 단계</span>
        </div>

        <div className="quiz-q-title">문제</div>
        <div className="quiz-q-body">{current.question}</div>

        {current.images?.length > 0 && (
          <div className="wa-img-row">
            {current.images.map((img, i) => (
              <div className="wa-img-thumb" key={i}><img src={img.src} alt={img.name || ''} /></div>
            ))}
          </div>
        )}

        {phase === 'question' ? (
          <>
            <label className="fld" style={{ marginTop: 14 }}>
              내 답 (선택 — 메모용)
              <textarea
                rows={2}
                value={myTry}
                onChange={(e) => setMyTry(e.target.value)}
                placeholder="머릿속으로 답을 떠올리고 적어보세요"
              />
            </label>
            <div className="quiz-actions">
              <button className="btn btn-lg" onClick={reveal}>정답 보기 👀</button>
            </div>
          </>
        ) : (
          <>
            {myTry.trim() && (
              <div className="quiz-mine">
                <div className="quiz-q-title">내 답</div>
                <div className="quiz-mine-body">{myTry}</div>
              </div>
            )}
            <div className="quiz-q-title" style={{ marginTop: 14 }}>정답</div>
            <div className="quiz-answer">{current.correctAnswer}</div>
            {current.explanation && (
              <>
                <div className="quiz-q-title" style={{ marginTop: 12 }}>해설</div>
                <div className="quiz-explain">{current.explanation}</div>
              </>
            )}
            <div className="quiz-actions">
              <button className="btn ghost btn-lg" onClick={() => submit('fail')}>✗ 틀림</button>
              <button className="btn btn-lg" onClick={() => submit('pass')}>✓ 맞춤</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
