// dongsang2mong.com과 연결하는 작은 다리.
// W5(전체 동기화)와는 별개 — "친구 진행상황 보기 + 응원 메시지"만을 위한 좁은 목적의 모듈이라
// src/storage/remoteAdapter.js(§2 sync 인터페이스)와는 분리했다.
import { collection, doc, setDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore'
import { auth, cloudEnabled, db } from '../storage/firebaseClient.js'
import { dateStr, streak, treeInfo } from './util.js'

const userCollection = (name) => {
  const uid = auth.currentUser?.uid
  if (!cloudEnabled || !uid) return null
  return collection(db, 'users', uid, name)
}

// data(useStore()의 그 data)로부터 오늘의 진행상황 스냅샷을 계산한다
export function computeProgressSnapshot(data) {
  const today = dateStr()
  const sessions = data.sessions || []
  const todaySec = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.seconds, 0)
  const totalHours = sessions.reduce((a, s) => a + s.seconds, 0) / 3600
  const tree = treeInfo(totalHours)
  return {
    date: today,
    studiedMinutes: Math.round(todaySec / 60),
    streakDays: streak(sessions),
    treeStageLabel: tree.stage.name,
    treeStageEmoji: tree.stage.emoji,
  }
}

// 실패해도 조용히 무시한다 — 동기화 실패는 사용자에게 에러를 띄우지 않는다는 원칙(구현_스펙 §3-3)
export async function pushProgress(data) {
  try {
    const progress = userCollection('planner_progress')
    if (!progress) return false
    const snapshot = computeProgressSnapshot(data)
    await setDoc(
      doc(progress, snapshot.date),
      { ...snapshot, updatedAt: serverTimestamp() },
      { merge: true }
    )
    return true
  } catch (e) {
    console.warn('[friendBridge] pushProgress failed', e)
    return false
  }
}

export async function pullCheers(max = 5) {
  try {
    const cheers = userCollection('planner_cheers')
    if (!cheers) return []
    const q = query(cheers, orderBy('createdAt', 'desc'), limit(max))
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const v = d.data()
      return {
        id: d.id,
        fromMemberId: v.fromMemberId || '',
        text: v.text || '',
        createdAt: v.createdAt?.toDate ? v.createdAt.toDate().toISOString() : null,
      }
    })
  } catch (e) {
    console.warn('[friendBridge] pullCheers failed', e)
    return []
  }
}
