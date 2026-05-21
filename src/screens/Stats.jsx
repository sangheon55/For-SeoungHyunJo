import React, { useState } from 'react'
import { useStore } from '../store.jsx'
import { dateStr, addDays, weekStart, monthKey, hm, inRange, streak } from '../lib/util.js'

function sumWhere(sessions, fn) {
  return sessions.reduce((a, s) => (fn(s) ? a + s.seconds : a), 0)
}

function Compare({ label, cur, prev, unit }) {
  const diff = cur - prev
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : null
  const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—'
  return (
    <div className="card cmp">
      <div className="lbl">{label}</div>
      <div className="vals">{hm(cur)} <span style={{ color: '#9aa' }}>vs {hm(prev)}</span></div>
      <div className={'delta ' + cls}>
        {arrow} {pct === null ? '신규 기록' : Math.abs(pct) + '%'}
      </div>
    </div>
  )
}

const grassColor = (sec) => {
  if (sec <= 0) return '#e8f5e9'
  if (sec < 3600) return '#c8e6c9'
  if (sec < 10800) return '#81c784'
  if (sec < 18000) return '#43a047'
  return '#1b5e20'
}

export default function Stats() {
  const { data } = useStore()
  const [range, setRange] = useState('month')
  const today = dateStr()
  const ss = data.sessions

  // 비교
  const todaySec = sumWhere(ss, (s) => s.date === today)
  const ydaySec = sumWhere(ss, (s) => s.date === addDays(today, -1))

  const tw = weekStart(today)
  const lw = addDays(tw, -7)
  const thisWeek = sumWhere(ss, (s) => weekStart(s.date) === tw)
  const lastWeek = sumWhere(ss, (s) => weekStart(s.date) === lw)

  const tm = monthKey(today)
  const lmDate = addDays(today.slice(0, 8) + '01', -1)
  const lm = monthKey(lmDate)
  const thisMonth = sumWhere(ss, (s) => monthKey(s.date) === tm)
  const lastMonth = sumWhere(ss, (s) => monthKey(s.date) === lm)

  // 과목별
  const subjTotals = data.subjects
    .map((s) => ({
      ...s,
      sec: sumWhere(ss, (x) => x.subjectId === s.id && inRange(x.date, range, today)),
    }))
    .sort((a, b) => b.sec - a.sec)
  const maxSec = Math.max(1, ...subjTotals.map((s) => s.sec))

  // 잔디 (최근 119일)
  const days = []
  for (let i = 118; i >= 0; i--) {
    const d = addDays(today, -i)
    days.push({ d, sec: sumWhere(ss, (s) => s.date === d) })
  }

  const totalSec = ss.reduce((a, s) => a + s.seconds, 0)
  const studyDays = new Set(ss.filter((s) => s.seconds > 0).map((s) => s.date)).size
  const avg = studyDays > 0 ? totalSec / studyDays : 0

  return (
    <div>
      <div className="page-title">통계</div>
      <div className="page-sub">공부량의 흐름을 한눈에 확인하세요 📊</div>

      <div className="card-title">📈 공부량 비교</div>
      <div className="grid g3" style={{ marginBottom: 18 }}>
        <Compare label="전일 대비 (오늘 vs 어제)" cur={todaySec} prev={ydaySec} />
        <Compare label="전주 대비 (이번 주 vs 지난주)" cur={thisWeek} prev={lastWeek} />
        <Compare label="전달 대비 (이번 달 vs 지난달)" cur={thisMonth} prev={lastMonth} />
      </div>

      <div className="stat-mini" style={{ marginBottom: 18 }}>
        <div className="chip">🔥 연속 학습 <b>{streak(ss)}</b>일</div>
        <div className="chip">📅 공부한 날 <b>{studyDays}</b>일</div>
        <div className="chip">⏱ 총 학습 <b>{Math.floor(totalSec / 3600)}</b>시간</div>
        <div className="chip">📌 일평균 <b>{hm(avg)}</b></div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">🌱 학습 잔디 (최근 17주)</div>
        <div className="grass">
          {days.map((x) => (
            <div
              className="cell"
              key={x.d}
              title={`${x.d} · ${hm(x.sec)}`}
              style={{ background: grassColor(x.sec) }}
            />
          ))}
        </div>
        <div className="hint" style={{ marginTop: 8 }}>진할수록 그날 많이 공부한 거예요.</div>
      </div>

      <div className="card">
        <div className="flex-between">
          <div className="card-title" style={{ marginBottom: 0 }}>과목별 공부 시간</div>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">오늘</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
            <option value="all">전체</option>
          </select>
        </div>
        <div style={{ marginTop: 14 }}>
          {subjTotals.every((s) => s.sec === 0) && <div className="empty">기록이 없어요.</div>}
          {subjTotals.map((s) => (
            s.sec > 0 && (
              <div className="subj-row" key={s.id}>
                <span className="nm" style={{ color: s.color }}>{s.name}</span>
                <span className="bar thin">
                  <span style={{ width: Math.round((s.sec / maxSec) * 100) + '%', background: s.color }} />
                </span>
                <span className="tm">{hm(s.sec)}</span>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
