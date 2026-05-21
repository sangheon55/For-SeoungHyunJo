import React, { useEffect, useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { CATEGORIES, PALETTE, useToast } from '../components/ui.jsx'

export default function Settings() {
  const { data, update, exportData, importData, isElectron } = useStore()
  const { show, Toast } = useToast()

  // 과목 추가 폼
  const [sName, setSName] = useState('')
  const [sCat, setSCat] = useState('전공')
  const [sColor, setSColor] = useState(PALETTE[0])
  // 시험일 폼
  const [eName, setEName] = useState('')
  const [eDate, setEDate] = useState('')
  // 응원 문구 폼
  const [cheer, setCheer] = useState('')
  // 데이터 파일 경로
  const [filePath, setFilePath] = useState('')

  useEffect(() => {
    if (isElectron && window.plannerStore.filePath) {
      window.plannerStore.filePath().then(setFilePath)
    }
  }, [isElectron])

  const addSubject = () => {
    const v = sName.trim()
    if (!v) return
    update((d) => ({
      ...d,
      subjects: [...d.subjects, { id: uid(), name: v, category: sCat, color: sColor }],
    }))
    setSName('')
    show('과목을 추가했어요 🌿')
  }
  const delSubject = (id) => {
    const s = data.subjects.find((x) => x.id === id)
    if (!window.confirm(`'${s?.name}' 과목을 삭제할까요?\n(연결된 메모·기록은 '미지정'으로 남습니다)`)) return
    update((d) => ({ ...d, subjects: d.subjects.filter((x) => x.id !== id) }))
  }

  const addExam = () => {
    if (!eName.trim() || !eDate) return
    update((d) => ({ ...d, examDates: [...d.examDates, { id: uid(), name: eName.trim(), date: eDate }] }))
    setEName('')
    setEDate('')
  }
  const delExam = (id) =>
    update((d) => ({ ...d, examDates: d.examDates.filter((e) => e.id !== id) }))

  const addCheer = () => {
    const v = cheer.trim()
    if (!v) return
    update((d) => ({ ...d, customEncouragements: [...(d.customEncouragements || []), v] }))
    setCheer('')
    show('응원 문구를 추가했어요 💌')
  }
  const delCheer = (i) =>
    update((d) => ({ ...d, customEncouragements: d.customEncouragements.filter((_, idx) => idx !== i) }))

  const goalHours = (data.settings.dailyGoalMin || 510) / 60
  const setGoal = (h) =>
    update((d) => ({ ...d, settings: { ...d.settings, dailyGoalMin: Math.round(Number(h) * 60) } }))

  const setCert = (group, patch) =>
    update((d) => ({ ...d, certs: { ...d.certs, [group]: { ...d.certs[group], ...patch } } }))

  const doExport = async () => {
    const ok = await exportData()
    show(ok ? '데이터를 내보냈어요 📤' : '내보내기를 취소했어요')
  }
  const doImport = async () => {
    if (!window.confirm('데이터를 가져오면 현재 데이터를 덮어씁니다. 계속할까요?')) return
    const ok = await importData()
    show(ok ? '데이터를 가져왔어요 📥' : '가져오기를 취소했어요')
  }

  return (
    <div>
      <div className="page-title">설정</div>
      <div className="page-sub">과목·시험일·응원 문구를 관리하세요 ⚙️</div>

      {/* 과목 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">📚 과목 추가/삭제</div>
        {data.subjects.map((s) => (
          <div className="item" key={s.id}>
            <span className="dot" style={{ background: s.color }} />
            <span className="grow">{s.name}</span>
            <span className="tag" style={{ background: '#8aa', fontWeight: 500 }}>{s.category}</span>
            <button className="btn danger sm" onClick={() => delSubject(s.id)}>삭제</button>
          </div>
        ))}
        <div className="row section-gap" style={{ alignItems: 'flex-end' }}>
          <label className="fld" style={{ flex: 1 }}>
            과목명
            <input type="text" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="예: 조림학" />
          </label>
          <label className="fld">
            분류
            <select value={sCat} onChange={(e) => setSCat(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="fld">
            색상
            <div className="row" style={{ gap: 4 }}>
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setSColor(c)}
                  style={{
                    width: 22, height: 22, borderRadius: 6, background: c,
                    border: sColor === c ? '3px solid #1b3c2e' : '1px solid #ccc',
                  }}
                />
              ))}
            </div>
          </label>
          <button className="btn" onClick={addSubject}>+ 추가</button>
        </div>
      </div>

      {/* 시험일 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">📅 시험일 / D-day</div>
        {data.examDates.map((e) => (
          <div className="item" key={e.id}>
            <span className="grow">{e.name}</span>
            <span className="hint">{e.date}</span>
            <button className="btn danger sm" onClick={() => delExam(e.id)}>삭제</button>
          </div>
        ))}
        <div className="row section-gap" style={{ alignItems: 'flex-end' }}>
          <label className="fld" style={{ flex: 1 }}>
            명칭
            <input type="text" value={eName} onChange={(e) => setEName(e.target.value)} placeholder="예: 2차 시험" />
          </label>
          <label className="fld">
            날짜
            <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
          </label>
          <button className="btn" onClick={addExam}>+ 추가</button>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        {/* 일일 목표 */}
        <div className="card">
          <div className="card-title">🎯 일일 목표 공부 시간</div>
          <label className="fld">
            하루 목표 (시간)
            <input
              type="number" min={1} max={18} step={0.5}
              value={goalHours} onChange={(e) => setGoal(e.target.value)} style={{ width: 110 }}
            />
          </label>
          <div className="hint section-gap">대시보드·타이머의 달성률 계산에 쓰입니다.</div>
        </div>

        {/* 검정시험 */}
        <div className="card">
          <div className="card-title">🏅 검정시험</div>
          <div className="row" style={{ marginBottom: 8 }}>
            <label className="fld" style={{ flex: 1 }}>
              영어 점수
              <input
                type="text" value={data.certs.english.score}
                onChange={(e) => setCert('english', { score: e.target.value })}
                placeholder="예: TOEIC 845"
              />
            </label>
            <label className="fld" style={{ flex: 1 }}>
              유효기간
              <input
                type="date" value={data.certs.english.validUntil}
                onChange={(e) => setCert('english', { validUntil: e.target.value })}
              />
            </label>
          </div>
          <label className="fld">
            한국사능력검정 등급
            <input
              type="text" value={data.certs.history.level}
              onChange={(e) => setCert('history', { level: e.target.value })}
              placeholder="예: 1급 (또는 미취득)"
            />
          </label>
        </div>
      </div>

      {/* 응원 문구 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">💌 나만의 응원 문구</div>
        <div className="hint" style={{ marginBottom: 8 }}>
          기본 문구 외에 직접 추가한 문구도 매일 순환에 포함됩니다.
        </div>
        {(data.customEncouragements || []).map((c, i) => (
          <div className="item" key={i}>
            <span className="grow">{c}</span>
            <button className="btn danger sm" onClick={() => delCheer(i)}>삭제</button>
          </div>
        ))}
        <div className="row section-gap">
          <input
            type="text" style={{ flex: 1 }} value={cheer}
            onChange={(e) => setCheer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCheer()}
            placeholder="성현이에게 해주고 싶은 응원 한마디"
          />
          <button className="btn" onClick={addCheer}>+ 추가</button>
        </div>
      </div>

      {/* 데이터 */}
      <div className="card">
        <div className="card-title">💾 데이터</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          모든 데이터는 아래 파일에 저장됩니다. 앱(.exe)을 새 버전으로 교체해도
          이 파일은 그대로 유지되므로 데이터가 사라지지 않습니다.
          {filePath && <><br /><b style={{ color: '#2e7d32' }}>📁 {filePath}</b></>}
        </div>
        <div className="row">
          <button className="btn ghost" onClick={doExport}>📤 데이터 내보내기</button>
          <button className="btn ghost" onClick={doImport}>📥 데이터 가져오기</button>
          {isElectron && (
            <button className="btn ghost" onClick={() => window.plannerStore.openFolder()}>
              📂 데이터 폴더 열기
            </button>
          )}
        </div>
        <div className="hint section-gap">
          다른 PC로 옮길 때: 내보내기 → 파일 전달 → 새 PC에서 가져오기
        </div>
      </div>
      <Toast />
    </div>
  )
}
