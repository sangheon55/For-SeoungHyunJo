import React, { useMemo, useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { dateStr, dDay } from '../lib/util.js'
import { useToast } from '../components/ui.jsx'
import { dueToday, makeWrongAnswer, nextDueDate } from '../lib/ebbinghaus.js'
import WrongForm from '../components/WrongForm.jsx'
import QuizModal from '../components/QuizModal.jsx'

const FILTERS = [
  { id: 'today', label: '오늘 복습' },
  { id: 'active', label: '진행 중' },
  { id: 'mastered', label: '완료' },
  { id: 'all', label: '전체' },
]
const SORTS = [
  { id: 'due', label: '마감일순' },
  { id: 'new', label: '최신순' },
  { id: 'diff', label: '난이도순' },
]
const DIFF_ORDER = { 상: 0, 중: 1, 하: 2 }

export default function WrongNotes() {
  const { data, update } = useStore()
  const { show, Toast } = useToast()
  const today = dateStr()

  const [subjectId, setSubjectId] = useState('all') // 'all' | subjectId
  const [filter, setFilter] = useState('today')
  const [sort, setSort] = useState('due')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [quizQueue, setQuizQueue] = useState(null) // null | WrongAnswer[]

  const list = data.wrongAnswers || []

  // 좌측 과목별 카운트
  const subjectCounts = useMemo(() => {
    const m = { all: list.length }
    for (const s of data.subjects) m[s.id] = 0
    for (const w of list) if (m[w.subjectId] !== undefined) m[w.subjectId]++
    return m
  }, [data.subjects, list])

  const todayCount = useMemo(() => dueToday(list, today).length, [list, today])

  // 필터 + 정렬된 카드 목록
  const cards = useMemo(() => {
    let arr = list
    if (subjectId !== 'all') arr = arr.filter((w) => w.subjectId === subjectId)
    if (filter === 'today') {
      const todays = new Set(dueToday(arr, today).map((w) => w.id))
      arr = arr.filter((w) => todays.has(w.id))
    } else if (filter === 'active') arr = arr.filter((w) => w.status === 'active')
    else if (filter === 'mastered') arr = arr.filter((w) => w.status === 'mastered')

    arr = [...arr]
    if (sort === 'new') arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    else if (sort === 'diff') arr.sort((a, b) => (DIFF_ORDER[a.difficulty] ?? 9) - (DIFF_ORDER[b.difficulty] ?? 9))
    else arr.sort((a, b) => { // due
      const ad = nextDueDate(a) || '9999-12-31'
      const bd = nextDueDate(b) || '9999-12-31'
      return ad < bd ? -1 : ad > bd ? 1 : 0
    })
    return arr
  }, [list, subjectId, filter, sort, today])

  const subjectOf = (id) => data.subjects.find((s) => s.id === id)

  const openCreate = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit = (w) => { setEditTarget(w); setFormOpen(true) }
  const closeForm = () => { setFormOpen(false); setEditTarget(null) }

  const savePayload = (payload) => {
    if (editTarget) {
      update((d) => ({
        ...d,
        wrongAnswers: d.wrongAnswers.map((w) =>
          w.id === editTarget.id ? { ...w, ...payload, updatedAt: today } : w
        ),
      }))
      show('오답을 수정했어요 ✍️')
    } else {
      const wa = makeWrongAnswer({
        id: uid(),
        ...payload,
        intervals: data.wrongSettings?.intervals,
        today,
      })
      update((d) => ({ ...d, wrongAnswers: [...d.wrongAnswers, wa] }))
      show('오답을 등록했어요. 1일 뒤 첫 복습이 예약됐어요 🌱')
    }
    closeForm()
  }

  const del = (id) => {
    if (!confirm('이 오답 기록을 삭제할까요?')) return
    update((d) => ({ ...d, wrongAnswers: d.wrongAnswers.filter((w) => w.id !== id) }))
    show('삭제했어요')
  }

  const startQuizOne = (w) => setQuizQueue([w])
  const startQuizAll = () => {
    const queue = dueToday(list, today)
    if (queue.length === 0) { show('오늘 복습할 오답이 없어요'); return }
    setQuizQueue(queue)
  }
  const closeQuiz = () => setQuizQueue(null)

  return (
    <div>
      <div className="page-title">오답노트</div>
      <div className="page-sub">에빙하우스 망각곡선에 맞춰 1·3·7·14·30일 복습을 자동으로 챙겨드려요 ❌</div>

      <div className="split">
        {/* 좌측: 과목 분할 */}
        <div className="card subj-list">
          <div className="card-title">과목</div>
          <button
            className={'pick' + (subjectId === 'all' ? ' active' : '')}
            onClick={() => setSubjectId('all')}
          >
            <span className="dot" style={{ background: '#9aa' }} />
            전체
            <span className="wa-count">{subjectCounts.all}</span>
          </button>
          {data.subjects.map((s) => (
            <button
              key={s.id}
              className={'pick' + (s.id === subjectId ? ' active' : '')}
              onClick={() => setSubjectId(s.id)}
            >
              <span className="dot" style={{ background: s.color }} />
              {s.name}
              <span className="wa-count">{subjectCounts[s.id] || 0}</span>
            </button>
          ))}
        </div>

        {/* 우측 */}
        <div>
          {/* 상단 액션 바 */}
          <div className="card" style={{ marginBottom: 12, padding: '14px 16px' }}>
            <div className="flex-between" style={{ gap: 10, flexWrap: 'wrap' }}>
              <div className="row" style={{ gap: 6 }}>
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    className={'btn sm ' + (filter === f.id ? '' : 'ghost')}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}{f.id === 'today' && todayCount > 0 ? ` ${todayCount}` : ''}
                  </button>
                ))}
              </div>
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ height: 30 }}>
                  {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button className="btn ghost sm" onClick={startQuizAll} disabled={todayCount === 0}>
                  ▶ 오늘 복습 풀기
                </button>
                <button className="btn sm" onClick={openCreate}>+ 새 오답</button>
              </div>
            </div>
          </div>

          {/* 카드 목록 */}
          {cards.length === 0 && (
            <div className="card empty">
              {filter === 'today'
                ? '오늘 복습할 오답이 없어요. 멋져요 🌿'
                : '아직 등록된 오답이 없어요. [+ 새 오답]으로 추가해보세요.'}
            </div>
          )}
          {cards.map((w) => <WrongCard
            key={w.id}
            w={w}
            today={today}
            subject={subjectOf(w.subjectId)}
            onQuiz={() => startQuizOne(w)}
            onEdit={() => openEdit(w)}
            onDelete={() => del(w.id)}
          />)}
        </div>
      </div>

      {formOpen && (
        <WrongForm
          subjects={data.subjects}
          initial={editTarget}
          defaultSubjectId={subjectId !== 'all' ? subjectId : undefined}
          onSave={savePayload}
          onClose={closeForm}
        />
      )}
      {quizQueue && (
        <QuizModal
          queue={quizQueue}
          settings={data.wrongSettings}
          onResult={(id, updatedWa) => {
            update((d) => ({
              ...d,
              wrongAnswers: d.wrongAnswers.map((w) => (w.id === id ? updatedWa : w)),
            }))
          }}
          onClose={closeQuiz}
        />
      )}

      <Toast />
    </div>
  )
}

function WrongCard({ w, today, subject, onQuiz, onEdit, onDelete }) {
  const due = nextDueDate(w)
  const dd = due ? dDay(due) : null
  const stepCount = w.schedule?.length || 5
  const isMastered = w.status === 'mastered'

  const ddBadge = isMastered
    ? <span className="wa-badge done">완료 🎉</span>
    : dd === null
      ? null
      : dd < 0
        ? <span className="wa-badge over">{Math.abs(dd)}일 지남</span>
        : dd === 0
          ? <span className="wa-badge today">오늘</span>
          : <span className="wa-badge">D-{dd}</span>

  return (
    <div className="wa-card">
      <div className="wa-card-head">
        <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {subject && <span className="tag" style={{ background: subject.color }}>{subject.name}</span>}
          <span className="chip-mini">난이도 {w.difficulty}</span>
          <span className="chip-mini">{w.errorType}</span>
          {ddBadge}
        </div>
        <div className="row" style={{ gap: 6 }}>
          {!isMastered && <button className="btn sm" onClick={onQuiz}>복습</button>}
          <button className="btn ghost sm" onClick={onEdit}>수정</button>
          <button className="btn danger sm" onClick={onDelete}>삭제</button>
        </div>
      </div>

      <div className="wa-q">{w.question}</div>

      {(w.source?.book || w.source?.round || w.source?.page) && (
        <div className="wa-source">
          📚 {[w.source.book, w.source.round, w.source.page].filter(Boolean).join(' · ')}
        </div>
      )}

      {w.images?.length > 0 && (
        <div className="wa-img-row">
          {w.images.map((img, i) => (
            <div className="wa-img-thumb mini" key={i}>
              <img src={img.src} alt={img.name || ''} />
            </div>
          ))}
        </div>
      )}

      {w.tags?.length > 0 && (
        <div className="wa-tags">
          {w.tags.map((t, i) => <span key={i} className="wa-tag">#{t}</span>)}
        </div>
      )}

      <div className="wa-foot">
        <div className="wa-dots">
          {Array.from({ length: stepCount }).map((_, i) => (
            <span
              key={i}
              className={'wa-dot ' + (i < w.currentStep ? 'done' : i === w.currentStep && !isMastered ? 'now' : '')}
            />
          ))}
          <span className="wa-step-lbl">
            {isMastered ? '5/5 완료' : `${w.currentStep}/${stepCount} 단계`}
          </span>
        </div>
        <div className="wa-meta">
          등록 {w.createdAt}
          {w.reviewCount > 0 && (
            <> · 복습 {w.reviewCount}회 · 정답률 {w.reviewCount > 0 ? Math.round((w.passCount / w.reviewCount) * 100) : 0}%</>
          )}
        </div>
      </div>
    </div>
  )
}
