import React, { useState, useEffect } from 'react'
import { DIFFICULTIES, ERROR_TYPES } from '../lib/ebbinghaus.js'
import { filesToImages } from '../lib/image.js'

// 오답 추가/수정 모달
// props: data, subjects, initial(=수정 시 기존 wa, 없으면 새로 추가), defaultSubjectId, onSave(payload), onClose()
export default function WrongForm({ subjects, initial, defaultSubjectId, onSave, onClose }) {
  const isEdit = !!initial
  const [subjectId, setSubjectId] = useState(initial?.subjectId || defaultSubjectId || subjects[0]?.id || '')
  const [question, setQuestion] = useState(initial?.question || '')
  const [myAnswer, setMyAnswer] = useState(initial?.myAnswer || '')
  const [correctAnswer, setCorrectAnswer] = useState(initial?.correctAnswer || '')
  const [explanation, setExplanation] = useState(initial?.explanation || '')
  const [difficulty, setDifficulty] = useState(initial?.difficulty || '중')
  const [errorType, setErrorType] = useState(initial?.errorType || '개념')
  const [book, setBook] = useState(initial?.source?.book || '')
  const [round, setRound] = useState(initial?.source?.round || '')
  const [page, setPage] = useState(initial?.source?.page || '')
  const [tagInput, setTagInput] = useState((initial?.tags || []).join(', '))
  const [solveMin, setSolveMin] = useState(initial ? Math.round((initial.solveSec || 0) / 60) : 0)
  const [images, setImages] = useState(initial?.images || [])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const addFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setBusy(true)
    try {
      const added = await filesToImages(Array.from(fileList))
      setImages((prev) => [...prev, ...added])
    } finally {
      setBusy(false)
    }
  }
  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx))

  const save = () => {
    const q = question.trim()
    const a = correctAnswer.trim()
    if (!q || !a) {
      alert('문제 내용과 정답은 반드시 입력해야 해요.')
      return
    }
    const payload = {
      subjectId,
      question: q,
      myAnswer: myAnswer.trim(),
      correctAnswer: a,
      explanation: explanation.trim(),
      difficulty,
      errorType,
      source: { book: book.trim(), round: round.trim(), page: page.trim() },
      tags: tagInput.split(',').map((t) => t.trim()).filter(Boolean),
      solveSec: Math.max(0, Number(solveMin) || 0) * 60,
      images,
    }
    onSave(payload)
  }

  return (
    <div className="wa-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="wa-modal">
        <div className="wa-modal-head">
          <h3>{isEdit ? '오답 수정' : '새 오답 추가'}</h3>
          <button className="btn ghost sm" onClick={onClose}>닫기</button>
        </div>

        <div className="wa-modal-body">
          <div className="grid g2" style={{ gap: 10, marginBottom: 10 }}>
            <label className="fld">
              과목
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="fld">
              난이도
              <div className="row" style={{ gap: 6 }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={'btn sm ' + (difficulty === d ? '' : 'ghost')}
                    onClick={() => setDifficulty(d)}
                  >{d}</button>
                ))}
              </div>
            </label>
          </div>

          <label className="fld" style={{ marginBottom: 10 }}>
            문제 내용 <span style={{ color: 'var(--danger)' }}>*</span>
            <textarea rows={4} value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="문제 본문을 적어주세요" />
          </label>

          <div className="grid g2" style={{ gap: 10, marginBottom: 10 }}>
            <label className="fld">
              내 답
              <input type="text" value={myAnswer} onChange={(e) => setMyAnswer(e.target.value)}
                placeholder="내가 쓴 답" />
            </label>
            <label className="fld">
              정답 <span style={{ color: 'var(--danger)' }}>*</span>
              <input type="text" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="정답" />
            </label>
          </div>

          <label className="fld" style={{ marginBottom: 10 }}>
            해설 / 오답 원인
            <textarea rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)}
              placeholder="왜 틀렸는지, 어떤 개념을 놓쳤는지 기록하세요" />
          </label>

          <label className="fld" style={{ marginBottom: 10 }}>
            오답 유형
            <div className="row" style={{ gap: 6 }}>
              {ERROR_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={'btn sm ' + (errorType === t ? '' : 'ghost')}
                  onClick={() => setErrorType(t)}
                >{t}</button>
              ))}
            </div>
          </label>

          <div className="grid g3" style={{ gap: 10, marginBottom: 10 }}>
            <label className="fld">
              교재
              <input type="text" value={book} onChange={(e) => setBook(e.target.value)} placeholder="교재명" />
            </label>
            <label className="fld">
              회차
              <input type="text" value={round} onChange={(e) => setRound(e.target.value)} placeholder="예: 3회" />
            </label>
            <label className="fld">
              페이지
              <input type="text" value={page} onChange={(e) => setPage(e.target.value)} placeholder="예: 142" />
            </label>
          </div>

          <div className="grid g2" style={{ gap: 10, marginBottom: 10 }}>
            <label className="fld">
              태그 (쉼표로 구분)
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                placeholder="예: 비례식, 분수, 시간배분" />
            </label>
            <label className="fld">
              풀이 시간 (분)
              <input type="number" min={0} value={solveMin} onChange={(e) => setSolveMin(e.target.value)} />
            </label>
          </div>

          <label className="fld" style={{ marginBottom: 10 }}>
            이미지 첨부 (스크린샷 등)
            <input type="file" accept="image/*" multiple
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          </label>
          {images.length > 0 && (
            <div className="wa-img-row">
              {images.map((img, i) => (
                <div className="wa-img-thumb" key={i}>
                  <img src={img.src} alt={img.name || ''} />
                  <button type="button" className="wa-img-del" onClick={() => removeImage(i)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wa-modal-foot">
          <button className="btn ghost" onClick={onClose}>취소</button>
          <button className="btn" onClick={save} disabled={busy}>
            {busy ? '처리 중…' : isEdit ? '수정 저장' : '+ 오답 추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
