import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { mergeDefaults } from './storage/defaultData.js'
import { loadFlatData, persistDiff, persistFullReplace } from './storage/legacyMapping.js'
import { migrateLegacyLocalStorageIfNeeded } from './storage/migrateLegacyLocalStorage.js'
import { startRealtimeSync, stopRealtimeSync, pushAllToFirestore } from './storage/firestoreSync.js'

export const uid = () => crypto.randomUUID()

// ── Context ─────────────────────────────────────────────────
const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [data, setData] = useState(null)
  const ready = useRef(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const imported = await migrateLegacyLocalStorageIfNeeded()
      const loaded = await loadFlatData()
      if (alive) {
        setData(mergeDefaults(loaded))
        ready.current = true
      }
      // 레거시 localStorage에서 실제로 뭔가 가져왔을 때만 업로드 — 매 기동마다가 아니라
      if (imported) pushAllToFirestore().catch((e) => console.warn('[sync] push after migrate failed', e))
    })()
    return () => { alive = false }
  }, [])

  // W5-lite: Firestore 실시간 동기화. 위 로컬 로드 effect와 독립적으로 즉시 리스너를 건다.
  // 원격 변경이 로컬 Dexie에 반영될 때마다 다시 읽어서 setData — Dexie 읽기는 로컬이라 싸다.
  useEffect(() => {
    const reconcileFromLocal = async () => {
      const loaded = await loadFlatData()
      setData(mergeDefaults(loaded))
    }
    startRealtimeSync(reconcileFromLocal)
    return () => stopRealtimeSync()
  }, [])

  const update = (patch) => {
    setData((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
      persistDiff(prev, next).catch((e) => console.warn('[store] persist failed', e))
      return next
    })
  }

  const exportData = async () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '조성현플래너-데이터.json'
    a.click()
    return true
  }

  const importData = async () => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = () => {
        const file = input.files[0]
        if (!file) return resolve(false)
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const merged = mergeDefaults(JSON.parse(reader.result))
            await persistFullReplace(merged)
            setData(merged)
            pushAllToFirestore().catch((e) => console.warn('[sync] push after import failed', e))
            resolve(true)
          } catch {
            resolve(false)
          }
        }
        reader.readAsText(file)
      }
      input.click()
    })
  }

  if (!data) {
    return <div className="loading-screen">🌲 불러오는 중…</div>
  }

  return (
    <Ctx.Provider value={{ data, update, exportData, importData, isElectron: false }}>
      {children}
    </Ctx.Provider>
  )
}

export const useStore = () => useContext(Ctx)
