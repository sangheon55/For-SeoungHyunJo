import React, { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import HayasakaSearchLayer from '../characters/HayasakaSearchLayer.jsx'
import { getHayasakaSearchPresentation } from '../characters/hayasakaSearchState.js'

// 통합 검색 — 메모·오답·링크·플래시카드·하루메모·취미·사진 캡션 가로질러 찾기.
// 검색어는 대소문자 무시·부분 일치.
// 결과는 출처별로 그룹화. "이 화면 열기" 버튼으로 해당 탭으로 점프.

export default function Search({ go }) {
  const { data } = useStore()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const has = (s) => s != null && String(s).toLowerCase().includes(q)

  const subjectName = (id) => data.subjects.find((s) => s.id === id)?.name || '미지정'
  const subjectColor = (id) => data.subjects.find((s) => s.id === id)?.color || '#9aa'

  const results = useMemo(() => {
    if (q.length < 1) return null

    const memos = (data.memos || []).filter((m) => has(m.title) || has(m.body))
    const wrongs = (data.wrongAnswers || []).filter((w) =>
      has(w.question) || has(w.answer) || has(w.explanation) || has(w.source) || has(w.myAnswer) ||
      (Array.isArray(w.tags) && w.tags.some((t) => has(t))),
    )
    const links = (data.links || []).filter((l) =>
      has(l.name) || has(l.alias) || has(l.url) || has(l.description) || has(l.category),
    )
    const flashcards = (data.flashcards || []).filter((c) => has(c.front) || has(c.back))
    const dayNotesEntries = Object.entries(data.dayNotes || {})
      .filter(([, note]) => has(note))
      .map(([date, note]) => ({ date, note }))
      .sort((a, b) => b.date.localeCompare(a.date))
    const hobbies = (data.hobbies || []).filter((h) => has(h.name) || has(h.note))
    const photos = (data.photos || []).filter((p) => has(p.caption))

    const total =
      memos.length + wrongs.length + links.length + flashcards.length +
      dayNotesEntries.length + hobbies.length + photos.length

    return { memos, wrongs, links, flashcards, dayNotesEntries, hobbies, photos, total }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, data])
  const hayasakaPresentation = getHayasakaSearchPresentation({
    query,
    total: results?.total || 0,
  })
  const characterLayersEnabled = data.settings.kaguyaEnabled !== false

  return (
    <div>
      <div className="page-title">🔍 통합 검색</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input
          type="text"
          className="search-input"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색어 입력 (예: 임진왜란, 자료해석, 산림청…)"
        />
        {results && (
          <div className="hint section-gap">
            {results.total === 0
              ? <>'<b>{query}</b>' 에 해당하는 항목이 없어요.</>
              : <>총 <b>{results.total}</b>건 찾았어요</>}
          </div>
        )}
      </div>

      {characterLayersEnabled && (
        <HayasakaSearchLayer
          face={hayasakaPresentation.face}
          text={hayasakaPresentation.text}
          inner={hayasakaPresentation.inner}
        />
      )}

      {!results && (
        <div className="card empty" style={{ padding: 36, lineHeight: 1.8 }}>
          위 입력창에 단어를 적으면 앱 안의 모든 자료를 가로질러 찾아드려요.<br />
          <span style={{ fontSize: 12 }}>
            대상: 과목 메모, 오답노트(문제·정답·해설·태그), 자주 가는 곳, 플래시카드,<br />
            하루 돌아보기 메모, 취미 메모, 사진 캡션
          </span>
        </div>
      )}

      {results && results.memos.length > 0 && (
        <ResultGroup title="📝 과목 메모" count={results.memos.length} onOpen={() => go && go('memos')}>
          {results.memos.map((m) => (
            <div className="search-row" key={m.id}>
              <span className="tag" style={{ background: subjectColor(m.subjectId) }}>
                {subjectName(m.subjectId)}
              </span>
              <div className="search-row-body">
                <div className="search-row-title"><Highlight text={m.title || '(제목 없음)'} q={q} /></div>
                <div className="search-row-snippet"><Snippet text={m.body || ''} q={q} /></div>
              </div>
            </div>
          ))}
        </ResultGroup>
      )}

      {results && results.wrongs.length > 0 && (
        <ResultGroup title="❌ 오답노트" count={results.wrongs.length} onOpen={() => go && go('wrong')}>
          {results.wrongs.map((w) => (
            <div className="search-row" key={w.id}>
              <span className="tag" style={{ background: subjectColor(w.subjectId) }}>
                {subjectName(w.subjectId)}
              </span>
              <div className="search-row-body">
                <div className="search-row-title"><Highlight text={(w.question || '').slice(0, 80)} q={q} /></div>
                {w.answer && (
                  <div className="search-row-snippet">
                    <b>정답:</b> <Highlight text={String(w.answer).slice(0, 60)} q={q} />
                  </div>
                )}
                {w.explanation && (
                  <div className="search-row-snippet">
                    <Snippet text={w.explanation} q={q} />
                  </div>
                )}
                {Array.isArray(w.tags) && w.tags.some((t) => String(t).toLowerCase().includes(q)) && (
                  <div className="search-row-snippet">
                    🏷 {w.tags.map((t, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && ', '}
                        <Highlight text={t} q={q} />
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </ResultGroup>
      )}

      {results && results.flashcards.length > 0 && (
        <ResultGroup title="🃏 플래시카드" count={results.flashcards.length} onOpen={() => go && go('flashcards')}>
          {results.flashcards.map((c) => (
            <div className="search-row" key={c.id}>
              <span className="tag" style={{ background: subjectColor(c.subjectId) }}>
                {subjectName(c.subjectId)}
              </span>
              <div className="search-row-body">
                <div className="search-row-title"><Highlight text={c.front} q={q} /></div>
                <div className="search-row-snippet"><Highlight text={c.back} q={q} /></div>
              </div>
            </div>
          ))}
        </ResultGroup>
      )}

      {results && results.links.length > 0 && (
        <ResultGroup title="🔗 자주 가는 곳" count={results.links.length} onOpen={() => go && go('links')}>
          {results.links.map((l) => (
            <div className="search-row" key={l.id}>
              <span className="tag" style={{ background: '#9aa' }}>{l.category || '기타'}</span>
              <div className="search-row-body">
                <div className="search-row-title"><Highlight text={l.alias || l.name} q={q} /></div>
                <div className="search-row-snippet">
                  🔗 <Highlight text={l.url || ''} q={q} />
                </div>
                {l.description && (
                  <div className="search-row-snippet">
                    <Snippet text={l.description} q={q} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </ResultGroup>
      )}

      {results && results.dayNotesEntries.length > 0 && (
        <ResultGroup title="📅 하루 돌아보기" count={results.dayNotesEntries.length} onOpen={() => go && go('planner')}>
          {results.dayNotesEntries.map((d) => (
            <div className="search-row" key={d.date}>
              <span className="tag" style={{ background: 'var(--green-700)' }}>{d.date}</span>
              <div className="search-row-body">
                <div className="search-row-snippet"><Snippet text={d.note} q={q} /></div>
              </div>
            </div>
          ))}
        </ResultGroup>
      )}

      {results && results.hobbies.length > 0 && (
        <ResultGroup title="🎨 취미" count={results.hobbies.length} onOpen={() => go && go('rest')}>
          {results.hobbies.map((h) => (
            <div className="search-row" key={h.id}>
              <span style={{ fontSize: 24 }}>{h.emoji || '🎨'}</span>
              <div className="search-row-body">
                <div className="search-row-title"><Highlight text={h.name} q={q} /></div>
                {h.note && (
                  <div className="search-row-snippet">
                    <Snippet text={h.note} q={q} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </ResultGroup>
      )}

      {results && results.photos.length > 0 && (
        <ResultGroup title="🧡 사진 캡션" count={results.photos.length} onOpen={() => go && go('rest')}>
          {results.photos.map((p) => (
            <div className="search-row" key={p.id}>
              <img src={p.src} alt={p.caption} className="search-photo-thumb" />
              <div className="search-row-body">
                <div className="search-row-snippet"><Highlight text={p.caption} q={q} /></div>
                <div className="search-row-snippet" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {p.addedAt}
                </div>
              </div>
            </div>
          ))}
        </ResultGroup>
      )}
    </div>
  )
}

// 검색어가 들어간 부분을 노란색으로 강조
function Highlight({ text, q }) {
  const s = String(text ?? '')
  if (!q) return <>{s}</>
  const lower = s.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx < 0) return <>{s}</>
  return (
    <>
      {s.slice(0, idx)}
      <mark className="search-mark">{s.slice(idx, idx + q.length)}</mark>
      {s.slice(idx + q.length)}
    </>
  )
}

// 긴 본문에서 검색어 주변만 잘라서 보여줌
function Snippet({ text, q, around = 50 }) {
  const s = String(text ?? '')
  if (!q || s.length === 0) return <>{s.slice(0, 120)}{s.length > 120 ? '…' : ''}</>
  const lower = s.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx < 0) return <>{s.slice(0, 120)}{s.length > 120 ? '…' : ''}</>
  const start = Math.max(0, idx - around)
  const end = Math.min(s.length, idx + q.length + around * 2)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < s.length ? '…' : ''
  return <>{prefix}<Highlight text={s.slice(start, end)} q={q} />{suffix}</>
}

function ResultGroup({ title, count, onOpen, children }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="flex-between" style={{ marginBottom: 10 }}>
        <div className="card-title" style={{ margin: 0 }}>
          {title} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {count}건</span>
        </div>
        {onOpen && (
          <button className="btn ghost sm" onClick={onOpen}>이 화면 열기 →</button>
        )}
      </div>
      {children}
    </div>
  )
}
