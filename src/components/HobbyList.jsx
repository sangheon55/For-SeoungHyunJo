import React, { useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { dateStr, addDays } from '../lib/util.js'
import { useToast } from '../components/ui.jsx'
import { useConfirm } from '../components/confirm.jsx'

const STALE_DAYS = 7

export default function HobbyList() {
  const { data, update } = useStore()
  const { show, Toast } = useToast()
  const confirm = useConfirm()
  const hobbies = data.hobbies || []

  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [fName, setFName] = useState('')
  const [fEmoji, setFEmoji] = useState('🎨')
  const [fNote, setFNote] = useState('')

  const resetForm = () => {
    setFName(''); setFEmoji('🎨'); setFNote(''); setEditId(null)
  }
  const openCreate = () => { resetForm(); setFormOpen(true) }
  const openEdit = (h) => {
    setEditId(h.id)
    setFName(h.name || '')
    setFEmoji(h.emoji || '🎨')
    setFNote(h.note || '')
    setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); resetForm() }

  const save = () => {
    const name = fName.trim()
    const emoji = fEmoji.trim() || '🎨'
    const note = fNote.trim()
    if (!name) { alert('취미 이름을 입력해 주세요.'); return }
    if (editId) {
      update((d) => ({
        ...d,
        hobbies: (d.hobbies || []).map((h) => h.id === editId ? { ...h, name, emoji, note } : h),
      }))
      show('취미를 수정했어요 ✍️')
    } else {
      update((d) => ({
        ...d,
        hobbies: [...(d.hobbies || []), { id: uid(), name, emoji, note, lastDoneAt: null }],
      }))
      show('취미를 추가했어요 🎨')
    }
    closeForm()
  }

  const markToday = (h) => {
    const today = dateStr()
    if (h.lastDoneAt === today) {
      show('오늘 이미 기록했어요 ☺️')
      return
    }
    update((d) => ({
      ...d,
      hobbies: (d.hobbies || []).map((x) => x.id === h.id ? { ...x, lastDoneAt: today } : x),
    }))
    show('오늘도 잘 했어요 ✨')
  }

  const del = async (h) => {
    const ok = await confirm(`'${h.name}' 취미를 지울까요?`, {
      title: '취미 삭제',
      variant: 'danger',
      confirmText: '삭제',
    })
    if (!ok) return
    update((d) => ({ ...d, hobbies: (d.hobbies || []).filter((x) => x.id !== h.id) }))
    show('지웠어요')
  }

  const labelFor = (h) => {
    if (!h.lastDoneAt) return { text: '아직 기록 없음', stale: false }
    const today = dateStr()
    if (h.lastDoneAt === today) return { text: '오늘', stale: false }
    if (h.lastDoneAt === addDays(today, -1)) return { text: '어제', stale: false }
    const daysAgo = Math.round((new Date(today) - new Date(h.lastDoneAt)) / 86400000)
    return { text: `${daysAgo}일 전`, stale: daysAgo >= STALE_DAYS }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12, padding: '14px 16px' }}>
        <div className="flex-between">
          <div className="hint">
            내 취미 · <b>{hobbies.length}</b>개
            <div style={{ fontSize: 11, marginTop: 3 }}>
              쉬는 것도 공부의 일부예요. 자주 하는 취미를 적어두고 "오늘 했어요"로 토닥여 주세요.
            </div>
          </div>
          {!formOpen && (
            <button className="btn sm" onClick={openCreate}>+ 새 취미</button>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">{editId ? '취미 수정' : '새 취미'}</div>
          <div className="grid g2" style={{ gap: 10, marginBottom: 10 }}>
            <label className="fld">
              이모지
              <input
                type="text"
                value={fEmoji}
                onChange={(e) => setFEmoji(e.target.value)}
                placeholder="🎨"
                maxLength={4}
              />
            </label>
            <label className="fld">
              이름 <span style={{ color: 'var(--danger)' }}>*</span>
              <input
                type="text"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                placeholder="예: 산책"
              />
            </label>
          </div>
          <label className="fld" style={{ marginBottom: 10 }}>
            메모
            <textarea
              rows={2}
              value={fNote}
              onChange={(e) => setFNote(e.target.value)}
              placeholder="어떤 식으로 즐기는지, 왜 좋은지"
            />
          </label>
          <div className="row">
            <button className="btn" onClick={save}>{editId ? '수정 저장' : '+ 저장'}</button>
            <button className="btn ghost" onClick={closeForm}>취소</button>
          </div>
        </div>
      )}

      {hobbies.length === 0 && !formOpen && (
        <div className="card empty">
          취미를 등록해 두면 쉬어가는 길목이 보여요. <b>+ 새 취미</b> 로 시작해 보세요.
        </div>
      )}

      {hobbies.map((h) => {
        const lbl = labelFor(h)
        return (
          <div className={'hobby-card' + (lbl.stale ? ' hobby-stale' : '')} key={h.id}>
            <div className="emoji">{h.emoji || '🎨'}</div>
            <div className="body">
              <h4>{h.name}</h4>
              {h.note && <div className="note">{h.note}</div>}
              <div className="when">
                마지막: {lbl.text}
                {lbl.stale && <span className="stale-lbl">오랜만이네요 🌱</span>}
              </div>
            </div>
            <div className="actions">
              <button className="btn sm" onClick={() => markToday(h)}>오늘 했어요 ✨</button>
              <button className="btn ghost sm" onClick={() => openEdit(h)}>수정</button>
              <button className="btn danger sm" onClick={() => del(h)}>삭제</button>
            </div>
          </div>
        )
      })}

      <Toast />
    </div>
  )
}
