import React from 'react'
import { useStore } from '../store.jsx'
import { treeInfo, hm } from '../lib/util.js'

export default function Forest() {
  const { data } = useStore()
  const totalSec = data.sessions.reduce((a, s) => a + s.seconds, 0)
  const totalHours = totalSec / 3600
  const tree = treeInfo(totalHours)
  const nextHours = Math.max(0, Math.ceil(tree.nextAt - tree.cur))

  return (
    <div>
      <div className="page-title">나의 숲</div>
      <div className="page-sub">공부할수록 나무가 자라고, 큰나무가 모여 숲이 됩니다 🌲</div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card tree-box">
          <div className={'tree-emoji big'}>{tree.stage.emoji}</div>
          <div className="tree-soil" style={{ width: 220 }} />
          <div className="tree-stage" style={{ fontSize: 18, marginTop: 14 }}>
            {tree.stage.name} · Lv.{tree.level}
          </div>
          <div className="tree-sub">지금 나무 누적 {Math.floor(tree.cur)}시간</div>
          <div className="bar" style={{ maxWidth: 300, margin: '8px auto' }}>
            <span style={{ width: Math.round(tree.progress * 100) + '%' }} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">🌲 키운 숲</div>
          {tree.completed === 0 ? (
            <div className="empty">아직 완성한 큰나무가 없어요.<br />꾸준히 공부해서 첫 나무를 완성해 보세요!</div>
          ) : (
            <>
              <div className="forest-grid">
                {Array.from({ length: tree.completed }).map((_, i) => (
                  <span className="ftree" key={i}>🌲</span>
                ))}
              </div>
              <div className="hint" style={{ marginTop: 10 }}>
                완성한 큰나무 {tree.completed}그루 — 정말 대단해, 성현아!
              </div>
            </>
          )}
          <div className="hint section-gap">
            총 학습 {hm(totalSec)} · 누적 {Math.floor(totalHours)}시간
          </div>
        </div>
      </div>

      {/* 다음 단계는 비밀 — 목표 시간만 공개 */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="card-title" style={{ textAlign: 'left' }}>🌱 다음 단계까지</div>
        <div style={{ fontSize: 44, fontWeight: 800, color: '#1b5e20', margin: '6px 0' }}>
          약 {nextHours}시간
        </div>
        <div className="hint">
          다음에 어떤 나무로 자랄지는 <b>비밀</b>이에요. 🤫<br />
          목표 시간을 채우고 직접 확인해 보세요!
        </div>
      </div>
    </div>
  )
}
