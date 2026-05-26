import React, { useRef, useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { dateStr } from '../lib/util.js'
import { useToast } from '../components/ui.jsx'
import { filesToImages } from '../lib/image.js'

export default function PeopleGallery() {
  const { data, update } = useStore()
  const { show, Toast } = useToast()
  const photos = data.photos || []

  const fileRef = useRef()
  const [lightbox, setLightbox] = useState(null) // { src, caption } or null
  const [busy, setBusy] = useState(false)

  const onPick = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setBusy(true)
    try {
      const images = await filesToImages(files)
      if (images.length === 0) { show('이미지를 읽지 못했어요'); return }
      const today = dateStr()
      const newPhotos = images.map((img) => ({
        id: uid(),
        src: img.src,
        caption: '',
        addedAt: today,
      }))
      update((d) => ({ ...d, photos: [...(d.photos || []), ...newPhotos] }))
      show(`${newPhotos.length}장 추가했어요 🧡`)
    } catch (err) {
      show('이미지 처리 중 문제가 생겼어요')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const setCaption = (id, caption) => {
    update((d) => ({
      ...d,
      photos: (d.photos || []).map((p) => p.id === id ? { ...p, caption } : p),
    }))
  }

  const del = (p) => {
    if (!window.confirm('이 사진을 지울까요?')) return
    update((d) => ({ ...d, photos: (d.photos || []).filter((x) => x.id !== p.id) }))
    show('지웠어요')
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12, padding: '14px 16px' }}>
        <div className="flex-between">
          <div className="hint">
            사랑하는 사람들 · <b>{photos.length}</b>장
          </div>
          <label className="btn sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
            {busy ? '추가하는 중…' : '+ 사진 추가'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              disabled={busy}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="card">
          <div className="photo-empty">
            <div className="big">🧡</div>
            사랑하는 사람들의 사진을 올려두면,<br />
            공부하다 힘들 때 한 번씩 보면서 힘 낼 수 있어요.
          </div>
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div className="photo-card" key={p.id}>
              <div
                className="img-wrap"
                onClick={() => setLightbox(p)}
                title="크게 보기"
              >
                <img src={p.src} alt={p.caption || '사진'} />
              </div>
              <div className="cap-wrap">
                <input
                  type="text"
                  value={p.caption || ''}
                  placeholder="누구·언제 (선택)"
                  onChange={(e) => setCaption(p.id, e.target.value)}
                />
              </div>
              <div className="cap-foot">
                <span className="when">{p.addedAt}</span>
                <button className="btn danger sm" onClick={() => del(p)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="photo-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox.src} alt={lightbox.caption || '사진'} />
          {lightbox.caption && <div className="cap">{lightbox.caption}</div>}
        </div>
      )}

      <Toast />
    </div>
  )
}
