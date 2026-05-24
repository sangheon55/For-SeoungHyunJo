import React, { useMemo, useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { dateStr } from '../lib/util.js'
import { useToast } from '../components/ui.jsx'

const DEFAULT_CATEGORIES = [
  { name: '시험 정보',  color: '#1976D2' },
  { name: '강의·인강',  color: '#7B1FA2' },
  { name: '기출문제',   color: '#F57C00' },
  { name: '산림자원직', color: '#2E7D32' },
  { name: '학습 자료',  color: '#5D4037' },
  { name: '커뮤니티',   color: '#00897B' },
]
const FALLBACK_COLOR = '#9aa'

function categoryColor(name) {
  const hit = DEFAULT_CATEGORIES.find((c) => c.name === name)
  return hit ? hit.color : FALLBACK_COLOR
}

// 'gosi.kr' 같은 입력을 'https://gosi.kr'로 자동 보정
function normalizeUrl(raw) {
  const v = String(raw || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  return 'https://' + v
}

export default function Links() {
  const { data, update } = useStore()
  const { show, Toast } = useToast()

  const [selectedCat, setSelectedCat] = useState('all')
  const [editId, setEditId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)

  // 폼 상태
  const [fName, setFName] = useState('')
  const [fAlias, setFAlias] = useState('')
  const [fUrl, setFUrl] = useState('')
  const [fCategory, setFCategory] = useState('시험 정보')
  const [fNewCategory, setFNewCategory] = useState('') // "+ 새 카테고리…" 선택 시 입력
  const [fDescription, setFDescription] = useState('')

  // 데이터에서 사용 중인 카테고리 추출 (기본 + 사용자 정의)
  const allCategories = useMemo(() => {
    const fromData = new Set((data.links || []).map((l) => l.category || '기타'))
    const merged = []
    const seen = new Set()
    for (const c of DEFAULT_CATEGORIES) { merged.push(c.name); seen.add(c.name) }
    for (const c of fromData) if (!seen.has(c)) { merged.push(c); seen.add(c) }
    return merged
  }, [data.links])

  // 카테고리별 개수
  const counts = useMemo(() => {
    const m = { all: (data.links || []).length }
    for (const c of allCategories) m[c] = 0
    for (const l of data.links || []) {
      const c = l.category || '기타'
      m[c] = (m[c] || 0) + 1
    }
    return m
  }, [data.links, allCategories])

  // 필터링된 카드 목록
  const cards = useMemo(() => {
    const arr = data.links || []
    if (selectedCat === 'all') return arr
    return arr.filter((l) => (l.category || '기타') === selectedCat)
  }, [data.links, selectedCat])

  const resetForm = () => {
    setFName(''); setFAlias(''); setFUrl(''); setFDescription('')
    setFCategory(selectedCat !== 'all' && allCategories.includes(selectedCat) ? selectedCat : '시험 정보')
    setFNewCategory('')
    setEditId(null)
  }

  const openCreate = () => {
    resetForm()
    setFormOpen(true)
  }
  const openEdit = (l) => {
    setEditId(l.id)
    setFName(l.name || '')
    setFAlias(l.alias || '')
    setFUrl(l.url || '')
    setFDescription(l.description || '')
    const cat = l.category || '시험 정보'
    if (allCategories.includes(cat)) { setFCategory(cat); setFNewCategory('') }
    else { setFCategory('__new__'); setFNewCategory(cat) }
    setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); resetForm() }

  const save = () => {
    const name = fName.trim()
    const url = normalizeUrl(fUrl)
    if (!name) { alert('이름을 입력해 주세요.'); return }
    if (!url)  { alert('URL을 입력해 주세요.'); return }
    const category = (fCategory === '__new__' ? fNewCategory.trim() : fCategory) || '기타'
    const alias = fAlias.trim()
    const description = fDescription.trim()

    if (editId) {
      update((d) => ({
        ...d,
        links: d.links.map((l) => l.id === editId ? { ...l, name, alias, url, category, description } : l),
      }))
      show('사이트를 수정했어요 ✍️')
    } else {
      update((d) => ({
        ...d,
        links: [...d.links, { id: uid(), name, alias, url, category, description, createdAt: dateStr() }],
      }))
      show('사이트를 추가했어요 🔗')
    }
    closeForm()
  }

  const del = (l) => {
    if (!window.confirm(`'${l.alias || l.name}' 을(를) 삭제할까요?`)) return
    update((d) => ({ ...d, links: d.links.filter((x) => x.id !== l.id) }))
    show('삭제했어요')
  }

  const openLink = async (url) => {
    const safe = normalizeUrl(url)
    if (!safe) { show('URL이 비어있어요'); return }
    try {
      if (window.plannerShell) {
        const ok = await window.plannerShell.openExternal(safe)
        if (!ok) show('이 링크는 열 수 없어요 (http/https만 허용)')
      } else {
        window.open(safe, '_blank', 'noopener,noreferrer')
      }
    } catch {
      show('링크를 열지 못했어요')
    }
  }

  return (
    <div>
      <div className="page-title">자주 가는 곳</div>
      <div className="page-sub">공부에 자주 들르는 사이트를 모아두고 한 번에 열어요 🔗</div>

      <div className="split">
        {/* 좌측: 카테고리 분할 */}
        <div className="card subj-list">
          <div className="card-title">카테고리</div>
          <button
            className={'pick' + (selectedCat === 'all' ? ' active' : '')}
            onClick={() => setSelectedCat('all')}
          >
            <span className="dot" style={{ background: '#9aa' }} />
            전체
            <span className="wa-count">{counts.all || 0}</span>
          </button>
          {allCategories.map((c) => (
            <button
              key={c}
              className={'pick' + (selectedCat === c ? ' active' : '')}
              onClick={() => setSelectedCat(c)}
            >
              <span className="dot" style={{ background: categoryColor(c) }} />
              {c}
              <span className="wa-count">{counts[c] || 0}</span>
            </button>
          ))}
        </div>

        {/* 우측: 폼 + 카드 리스트 */}
        <div>
          <div className="card" style={{ marginBottom: 12, padding: '14px 16px' }}>
            <div className="flex-between">
              <div className="hint">
                {selectedCat === 'all' ? '전체 사이트' : selectedCat}
                {' · '}
                <b>{cards.length}</b>개
              </div>
              {!formOpen && (
                <button className="btn sm" onClick={openCreate}>+ 새 사이트 추가</button>
              )}
            </div>
          </div>

          {/* 인라인 폼 */}
          {formOpen && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">{editId ? '사이트 수정' : '새 사이트'}</div>
              <div className="grid g2" style={{ gap: 10, marginBottom: 10 }}>
                <label className="fld">
                  이름 <span style={{ color: 'var(--danger)' }}>*</span>
                  <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="예: 사이버국가고시센터" />
                </label>
                <label className="fld">
                  별명 (있으면 카드 제목으로 표시)
                  <input type="text" value={fAlias} onChange={(e) => setFAlias(e.target.value)} placeholder="예: 고시센터" />
                </label>
              </div>
              <label className="fld" style={{ marginBottom: 10 }}>
                URL <span style={{ color: 'var(--danger)' }}>*</span>
                <input type="text" value={fUrl} onChange={(e) => setFUrl(e.target.value)} placeholder="https://gosi.kr" />
              </label>
              <div className="grid g2" style={{ gap: 10, marginBottom: 10 }}>
                <label className="fld">
                  카테고리
                  <select value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                    {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ 새 카테고리…</option>
                  </select>
                </label>
                {fCategory === '__new__' && (
                  <label className="fld">
                    새 카테고리명
                    <input type="text" value={fNewCategory} onChange={(e) => setFNewCategory(e.target.value)} placeholder="예: 오답연구실" />
                  </label>
                )}
              </div>
              <label className="fld" style={{ marginBottom: 10 }}>
                메모/설명
                <textarea rows={2} value={fDescription} onChange={(e) => setFDescription(e.target.value)}
                  placeholder="이 사이트를 어떤 용도로 쓰는지 메모해 두세요" />
              </label>
              <div className="row">
                <button className="btn" onClick={save}>{editId ? '수정 저장' : '+ 저장'}</button>
                <button className="btn ghost" onClick={closeForm}>취소</button>
              </div>
            </div>
          )}

          {/* 카드 목록 */}
          {cards.length === 0 && (
            <div className="card empty">
              {selectedCat === 'all'
                ? '아직 등록된 사이트가 없어요. [+ 새 사이트 추가]로 시작해 보세요.'
                : '이 카테고리에 등록된 사이트가 없어요.'}
            </div>
          )}
          {cards.map((l) => <LinkCard
            key={l.id}
            link={l}
            color={categoryColor(l.category || '기타')}
            onOpen={() => openLink(l.url)}
            onEdit={() => openEdit(l)}
            onDelete={() => del(l)}
          />)}
        </div>
      </div>

      <Toast />
    </div>
  )
}

function LinkCard({ link, color, onOpen, onEdit, onDelete }) {
  const title = link.alias?.trim() || link.name
  const showName = link.alias?.trim() && link.alias.trim() !== link.name
  return (
    <div className="memo-card" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex-between">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ marginBottom: 4 }}>
            {title}
            {showName && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginLeft: 8 }}>({link.name})</span>}
          </h4>
          <div className="hint" style={{ fontSize: 12, wordBreak: 'break-all', marginBottom: 4 }}>
            🔗 {link.url}
          </div>
        </div>
        <div className="row" style={{ gap: 6, alignItems: 'flex-start' }}>
          <button className="btn sm" onClick={onOpen}>열기 ↗</button>
          <button className="btn ghost sm" onClick={onEdit}>수정</button>
          <button className="btn danger sm" onClick={onDelete}>삭제</button>
        </div>
      </div>
      {link.description && (
        <div className="body" style={{ fontSize: 13, color: '#34433a', marginTop: 6, whiteSpace: 'pre-wrap' }}>
          {link.description}
        </div>
      )}
      <div className="meta" style={{ marginTop: 8 }}>
        <span className="tag" style={{ background: color }}>{link.category || '기타'}</span>
      </div>
    </div>
  )
}
