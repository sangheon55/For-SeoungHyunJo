import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { auth, cloudEnabled, db, isProductionData } from './firebaseClient.js'
import { SYNCED_ENTITIES } from './firestoreSync.js'

const PREFIX = 'planner_'

export async function inspectLegacyFirebaseData() {
  if (!cloudEnabled || !isProductionData || !auth.currentUser) {
    throw new Error('운영 환경에서 로그인한 경우에만 기존 데이터를 확인할 수 있습니다.')
  }
  const counts = {}
  for (const entity of SYNCED_ENTITIES) {
    const snapshot = await getDocs(collection(db, `${PREFIX}${entity}`))
    counts[entity] = snapshot.size
  }
  return counts
}

async function readLegacyRows() {
  const data = {}
  for (const entity of SYNCED_ENTITIES) {
    const snapshot = await getDocs(collection(db, `${PREFIX}${entity}`))
    data[entity] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  }
  return data
}

export async function downloadLegacyFirebaseBackup() {
  const data = await readLegacyRows()
  const blob = new Blob([JSON.stringify({
    exportedAt: new Date().toISOString(),
    source: 'legacy-root-collections',
    data,
  }, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `기존-Firebase-백업-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export async function migrateLegacyFirebaseData() {
  const uid = auth.currentUser?.uid
  if (!cloudEnabled || !isProductionData || !uid) {
    throw new Error('운영 환경에서 로그인한 경우에만 이전할 수 있습니다.')
  }

  const counts = {}
  let copied = 0
  for (const entity of SYNCED_ENTITIES) {
    const snapshot = await getDocs(collection(db, `${PREFIX}${entity}`))
    counts[entity] = snapshot.size
    const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    const targetSnapshot = await getDocs(collection(db, 'users', uid, `${PREFIX}${entity}`))
    const targetRows = new Map(targetSnapshot.docs.map((item) => [item.id, item.data()]))
    const winners = rows.filter((row) => {
      const target = targetRows.get(row.id)
      return !target || String(row.updatedAt || '') > String(target.updatedAt || '')
    })

    for (let offset = 0; offset < winners.length; offset += 400) {
      const batch = writeBatch(db)
      winners.slice(offset, offset + 400).forEach((row) => {
        batch.set(
          doc(db, 'users', uid, `${PREFIX}${entity}`, row.id),
          row,
          { merge: true },
        )
      })
      await batch.commit()
      copied += Math.min(400, winners.length - offset)
    }
  }

  await setDoc(doc(db, 'users', uid, 'system', 'legacyMigration'), {
    completed: true,
    copied,
    counts,
    completedAt: serverTimestamp(),
    source: 'legacy-root-collections',
  })

  return { copied, counts }
}
