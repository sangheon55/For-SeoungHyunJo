import React, { useMemo, useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { dateStr } from '../lib/util.js'
import { useToast } from '../components/ui.jsx'
import { useConfirm } from '../components/confirm.jsx'

// 플래시카드 — 단순 암기용 카드 (앞면/뒷면).
// 학습 모드: 미숙달 카드만 큐로 뽑아서 한 장씩 보여줌. 3연속 맞춤 시 mastered.
// 데이터: { id, subjectId, front, back, correctStreak, totalAttempts, lastReviewedAt, status, createdAt }

const MASTER_STREAK = 3 // 이 횟수만큼 연속 맞추면 마스터

export default function Flashcards() {
  const { data, update } = useStore()
  const { show, Toast } = useToast()
  const confirm = useConfirm()

  const [selectedSubject, setSelectedSubject] = useState('all') // 'all' | subjectId
  const [filter, setFilter] = useState('learning') // 'learning' | 'mastered' | 'all'
  const [studyMode, setStudyMode] = useState(false)
  const [studyIdx, setStudyIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)

  // 추가/수정 폼
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [fFront, setFFront] = useState('')
  const [fBack, setFBack] = useState('')
  const [fSubject, setFSubject] = useState(data.subjects[0]?.id || '')

  const cards = data.flashcards || []

  const subjectCounts = useMemo(() => {
    const m = { all: cards.length }
    for (const s of data.subjects) m[s.id] = 0
    for (const c of cards) if (m[c.subjectId] !== undefined) m[c.subjectId]++
    return m
  }, [data.subjects, cards])

  // 필터된 카드 목록
  const filtered = useMemo(() => {
    let arr = cards
    if (selectedSubject !== 'all') arr = arr.filter((c) => c.subjectId === selectedSubject)
    if (filter === 'learning') arr = arr.filter((c) => c.status !== 'mastered')
    else if (filter === 'mastered') arr = arr.filter((c) => c.status === 'mastered')
    return arr
  }, [cards, selectedSubject, filter])

  // 학습 큐 — 학습 모드용 (미숙달만)
  const studyQueue = useMemo(() => {
    let arr = cards.filter((c) => c.status !== 'mastered')
    if (selectedSubject !== 'all') arr = arr.filter((c) => c.subjectId === selectedSubject)
    return arr
  }, [cards, selectedSubject])

  const resetForm = () => { setFFront(''); setFBack(''); setEditId(null) }
  const openCreate = () => {
    resetForm()
    if (selectedSubject !== 'all' && data.subjects.some((s) => s.id === selectedSubject)) {
      setFSubject(selectedSubject)
    } else {
      setFSubject(data.subjects[0]?.id || '')
    }
    setFormOpen(true)
  }
  const openEdit = (c) => {
    setEditId(c.id)
    setFFront(c.front || '')
    setFBack(c.back || '')
    setFSubject(c.subjectId || data.subjects[0]?.id || '')
    setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); resetForm() }

  const saveCard = () => {
    const front = fFront.trim()
    const back = fBack.trim()
    if (!front || !back) { alert('앞면·뒷면을 모두 입력해 주세요.'); return }
    if (editId) {
      update((d) => ({
        ...d,
        flashcards: (d.flashcards || []).map((c) =>
          c.id === editId ? { ...c, front, back, subjectId: fSubject } : c,
        ),
      }))
      show('카드를 수정했어요 ✍️')
    } else {
      update((d) => ({
        ...d,
        flashcards: [
          ...(d.flashcards || []),
          {
            id: uid(),
            subjectId: fSubject,
            front,
            back,
            correctStreak: 0,
            totalAttempts: 0,
            lastReviewedAt: null,
            status: 'learning',
            createdAt: dateStr(),
          },
        ],
      }))
      show('카드를 추가했어요 🃏')
    }
    closeForm()
  }

  const delCard = async (c) => {
    const ok = await confirm(`'${(c.front || '').slice(0, 30)}' 카드를 삭제할까요?`, {
      title: '카드 삭제',
      variant: 'danger',
      confirmText: '삭제',
    })
    if (!ok) return
    update((d) => ({ ...d, flashcards: (d.flashcards || []).filter((x) => x.id !== c.id) }))
    show('지웠어요')
  }

  const resetCard = (c) => {
    update((d) => ({
      ...d,
      flashcards: (d.flashcards || []).map((x) =>
        x.id === c.id ? { ...x, correctStreak: 0, status: 'learning' } : x,
      ),
    }))
    show('학습 큐로 되돌렸어요 🔁')
  }

  // 학습 모드 시작
  const startStudy = () => {
    if (studyQueue.length === 0) {
      show('학습할 카드가 없어요')
      return
    }
    setStudyMode(true)
    setStudyIdx(0)
    setRevealed(false)
  }
  const endStudy = () => { setStudyMode(false); setRevealed(false) }

  const onAnswer = (correct) => {
    const card = studyQueue[studyIdx]
    if (!card) return
    const today = dateStr()
    update((d) => ({
      ...d,
      flashcards: (d.flashcards || []).map((x) => {
        if (x.id !== card.id) return x
        const nextStreak = correct ? (x.correctStreak || 0) + 1 : 0
        const nextStatus = correct && nextStreak >= MASTER_STREAK ? 'mastered' : 'learning'
        return {
          ...x,
          correctStreak: nextStreak,
          totalAttempts: (x.totalAttempts || 0) + 1,
          lastReviewedAt: today,
          status: nextStatus,
        }
      }),
    }))
    setRevealed(false)
    // 다음 카드 — mastered 처리된 카드는 자동으로 큐에서 빠지지만, 인덱스는 그대로 두면 큐가 짧아져서 자연스럽게 진행됨
    if (studyIdx + 1 >= studyQueue.length) {
      // 큐 끝 — mastered 처리로 큐 길이 줄어들면 살아있는 다음 카드로 이동
      if (correct) {
        // 마지막 카드 맞춤 → 큐가 비었거나 한 장 남음. 처음으로 돌아감.
        setStudyIdx(0)
      } else {
        // 마지막 카드 모름 → 다시 처음부터
        setStudyIdx(0)
      }
    } else {
      setStudyIdx(studyIdx + 1)
    }
  }

  const subjectName = (id) => data.subjects.find((s) => s.id === id)?.name || '미지정'
  const subjectColor = (id) => data.subjects.find((s) => s.id === id)?.color || '#9aa'

  // 학습 모드 화면
  if (studyMode) {
    const currentCard = studyQueue[studyIdx]
    if (!currentCard) {
      // 큐가 비어버린 경우 (모두 mastered)
      return (
        <div>
          <div className="page-title">🃏 플래시카드</div>
          <div className="page-sub">이번 큐의 카드를 모두 마스터했어요 🎉</div>
          <div className="card" style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 50 }}>🎉</div>
            <h3 style={{ color: 'var(--green-800)', margin: '10px 0' }}>전부 마스터!</h3>
            <p className="hint">잘 했어요.</p>
            <button className="btn" style={{ marginTop: 14 }} onClick={endStudy}>학습 종료</button>
          </div>
        </div>
      )
    }
    return (
      <div>
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="page-title" style={{ marginBottom: 2 }}>🃏 학습 중</div>
            <div className="page-sub">
              {studyIdx + 1} / {studyQueue.length} ·{' '}
              <span style={{ color: subjectColor(currentCard.subjectId) }}>
                {subjectName(currentCard.subjectId)}
              </span>
              {' · '}연속 정답 {currentCard.correctStreak || 0}/{MASTER_STREAK}
            </div>
          </div>
          <button className="btn ghost" onClick={endStudy}>학습 종료</button>
        </div>

        <div
          className={'flashcard' + (revealed ? ' flipped' : '')}
          onClick={() => !revealed && setRevealed(true)}
        >
          <div className="flashcard-label">{revealed ? '뒷면' : '앞면 — 답을 떠올린 뒤 클릭'}</div>
          <div className="flashcard-text">
            {revealed ? currentCard.back : currentCard.front}
          </div>
        </div>

        {revealed ? (
          <div className="flashcard-actions">
            <button className="btn btn-lg" onClick={() => onAnswer(true)}>😎 맞춤</button>
            <button className="btn btn-lg ghost" onClick={() => onAnswer(false)}>😅 모름</button>
          </div>
        ) : (
          <div className="hint" style={{ textAlign: 'center', marginTop: 12 }}>
            카드를 클릭하면 뒷면이 보여요.
          </div>
        )}

        <Toast />
      </div>
    )
  }

  // 일반 모드 화면
  return (
    <div>
      <div className="page-title">🃏 플래시카드</div>
      <div className="page-sub">한국사 연도·전공 용어 같은 단순 암기에 좋아요. 3연속 맞추면 마스터 🎯</div>

      <div className="split">
        {/* 좌측: 과목 필터 */}
        <div className="card subj-list">
          <div className="card-title">과목</div>
          <button
            className={'pick' + (selectedSubject === 'all' ? ' active' : '')}
            onClick={() => setSelectedSubject('all')}
          >
            <span className="dot" style={{ background: '#9aa' }} />
            전체
            <span className="wa-count">{subjectCounts.all}</span>
          </button>
          {data.subjects.map((s) => (
            <button
              key={s.id}
              className={'pick' + (selectedSubject === s.id ? ' active' : '')}
              onClick={() => setSelectedSubject(s.id)}
            >
              <span className="dot" style={{ background: s.color }} />
              {s.name}
              <span className="wa-count">{subjectCounts[s.id] || 0}</span>
            </button>
          ))}
        </div>

        {/* 우측: 헤더 + 폼 + 카드 리스트 */}
        <div>
          <div className="card" style={{ marginBottom: 12, padding: '14px 16px' }}>
            <div className="flex-between">
              <div className="row" style={{ gap: 6 }}>
                <button
                  className={'btn ' + (filter === 'learning' ? '' : 'ghost') + ' sm'}
                  onClick={() => setFilter('learning')}
                >학습 중 {cards.filter((c) => c.status !== 'mastered').length}</button>
                <button
                  className={'btn ' + (filter === 'mastered' ? '' : 'ghost') + ' sm'}
                  onClick={() => setFilter('mastered')}
                >마스터 {cards.filter((c) => c.status === 'mastered').length}</button>
                <button
                  className={'btn ' + (filter === 'all' ? '' : 'ghost') + ' sm'}
                  onClick={() => setFilter('all')}
                >전체</button>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn" onClick={startStudy} disabled={studyQueue.length === 0}>
                  ▶ 학습 시작
                </button>
                {!formOpen && <button className="btn ghost sm" onClick={openCreate}>+ 카드 추가</button>}
              </div>
            </div>
          </div>

          {/* 인라인 폼 */}
          {formOpen && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">{editId ? '카드 수정' : '새 카드'}</div>
              <label className="fld" style={{ marginBottom: 10 }}>
                과목
                <select value={fSubject} onChange={(e) => setFSubject(e.target.value)}>
                  {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="fld" style={{ marginBottom: 10 }}>
                앞면 (질문) <span style={{ color: 'var(--danger)' }}>*</span>
                <textarea rows={2} value={fFront} onChange={(e) => setFFront(e.target.value)}
                  placeholder="예: 임진왜란이 일어난 해는?" />
              </label>
              <label className="fld" style={{ marginBottom: 10 }}>
                뒷면 (정답) <span style={{ color: 'var(--danger)' }}>*</span>
                <textarea rows={2} value={fBack} onChange={(e) => setFBack(e.target.value)}
                  placeholder="예: 1592년" />
              </label>
              <div className="row">
                <button className="btn" onClick={saveCard}>{editId ? '수정 저장' : '+ 저장'}</button>
                <button className="btn ghost" onClick={closeForm}>취소</button>
              </div>
            </div>
          )}

          {/* 카드 리스트 */}
          {filtered.length === 0 && (
            <div className="card empty">
              {cards.length === 0
                ? '아직 등록된 카드가 없어요. [+ 카드 추가] 로 시작해 보세요.'
                : '이 조건에 해당하는 카드가 없어요.'}
            </div>
          )}
          {filtered.map((c) => (
            <div className="memo-card" key={c.id} style={{ borderLeft: `3px solid ${subjectColor(c.subjectId)}` }}>
              <div className="flex-between">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ marginBottom: 4 }}>{c.front}</h4>
                  <div className="hint" style={{ fontSize: 12, marginBottom: 4, whiteSpace: 'pre-wrap' }}>
                    {c.back}
                  </div>
                </div>
                <div className="row" style={{ gap: 6, alignItems: 'flex-start' }}>
                  {c.status === 'mastered' && (
                    <button className="btn ghost sm" onClick={() => resetCard(c)} title="다시 학습 큐로">🔁</button>
                  )}
                  <button className="btn ghost sm" onClick={() => openEdit(c)}>수정</button>
                  <button className="btn danger sm" onClick={() => delCard(c)}>삭제</button>
                </div>
              </div>
              <div className="meta" style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                <span className="tag" style={{ background: subjectColor(c.subjectId) }}>
                  {subjectName(c.subjectId)}
                </span>
                {' · '}
                {c.status === 'mastered'
                  ? <span style={{ color: 'var(--green-700)', fontWeight: 600 }}>✅ 마스터</span>
                  : <>연속 정답 {c.correctStreak || 0}/{MASTER_STREAK}</>}
                {c.totalAttempts > 0 && <> · 총 시도 {c.totalAttempts}회</>}
                {c.lastReviewedAt && <> · 마지막 학습 {c.lastReviewedAt}</>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Toast />
    </div>
  )
}
