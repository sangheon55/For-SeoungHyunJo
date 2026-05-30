import React, { useEffect, useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { CATEGORIES, PALETTE, useToast } from '../components/ui.jsx'
import { useConfirm } from '../components/confirm.jsx'

export default function Settings() {
  const { data, update, exportData, importData, isElectron } = useStore()
  const { show, Toast } = useToast()
  const confirm = useConfirm()

  // 과목 추가 폼
  const [sName, setSName] = useState('')
  const [sCat, setSCat] = useState('전공')
  const [sColor, setSColor] = useState(PALETTE[0])
  // 시험일 폼
  const [eName, setEName] = useState('')
  const [eDate, setEDate] = useState('')
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
  const delSubject = async (id) => {
    const s = data.subjects.find((x) => x.id === id)
    const ok = await confirm(`'${s?.name}' 과목을 삭제할까요?\n(연결된 메모·기록은 '미지정' 으로 남아요)`, {
      title: '과목 삭제',
      variant: 'danger',
      confirmText: '삭제',
    })
    if (!ok) return
    update((d) => ({ ...d, subjects: d.subjects.filter((x) => x.id !== id) }))
  }
  const moveSubject = (id, dir) => {
    update((d) => {
      const list = [...d.subjects]
      const idx = list.findIndex((x) => x.id === id)
      const next = idx + dir
      if (idx < 0 || next < 0 || next >= list.length) return d
      ;[list[idx], list[next]] = [list[next], list[idx]]
      return { ...d, subjects: list }
    })
  }

  const addExam = () => {
    if (!eName.trim() || !eDate) return
    update((d) => ({ ...d, examDates: [...d.examDates, { id: uid(), name: eName.trim(), date: eDate }] }))
    setEName('')
    setEDate('')
  }
  const delExam = (id) =>
    update((d) => ({ ...d, examDates: d.examDates.filter((e) => e.id !== id) }))

  const goalHours = (data.settings.dailyGoalMin || 510) / 60
  const setGoal = (h) =>
    update((d) => ({ ...d, settings: { ...d.settings, dailyGoalMin: Math.round(Number(h) * 60) } }))

  const weekGoalHours = (data.settings.weeklyGoalMin || 3060) / 60
  const setWeekGoal = (h) =>
    update((d) => ({ ...d, settings: { ...d.settings, weeklyGoalMin: Math.round(Number(h) * 60) } }))

  // ── 학습 시작 체크리스트 편집 ─────────────────────────────
  const [clText, setClText] = useState('')
  const checklist = data.settings.startChecklist || []
  const addChecklistItem = () => {
    const v = clText.trim()
    if (!v) return
    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        startChecklist: [...(d.settings.startChecklist || []), { id: uid(), text: v }],
      },
    }))
    setClText('')
  }
  const delChecklistItem = (id) =>
    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        startChecklist: (d.settings.startChecklist || []).filter((c) => c.id !== id),
      },
    }))
  const moveChecklistItem = (id, dir) =>
    update((d) => {
      const list = [...(d.settings.startChecklist || [])]
      const idx = list.findIndex((c) => c.id === id)
      const next = idx + dir
      if (idx < 0 || next < 0 || next >= list.length) return d
      ;[list[idx], list[next]] = [list[next], list[idx]]
      return { ...d, settings: { ...d.settings, startChecklist: list } }
    })

  // ── 포모도로 설정 ───────────────────────────────────────
  const setPomo = (key, val) =>
    update((d) => ({
      ...d,
      settings: { ...d.settings, [key]: Math.max(1, Math.round(Number(val) || 0)) },
    }))
  const pomoFocus = data.settings.pomodoroFocusMin || 25
  const pomoBreak = data.settings.pomodoroBreakMin || 5
  const pomoLong = data.settings.pomodoroLongBreakMin || 15
  const pomoCycles = data.settings.pomodoroCyclesPerLongBreak || 4

  const doExport = async () => {
    const ok = await exportData()
    show(ok ? '데이터를 내보냈어요 📤' : '내보내기를 취소했어요')
  }
  const doImport = async () => {
    const proceed = await confirm('데이터를 가져오면 현재 데이터를 덮어써요.\n계속할까요?', {
      title: '데이터 가져오기',
      variant: 'danger',
      confirmText: '덮어쓰기',
    })
    if (!proceed) return
    const ok = await importData()
    show(ok ? '데이터를 가져왔어요 📥' : '가져오기를 취소했어요')
  }

  return (
    <div>
      <div className="page-title">설정</div>
      <div className="page-sub">과목·시험일·목표 공부 시간을 관리하세요 ⚙️</div>

      {/* 과목 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">📚 과목 추가/삭제 · 순서 변경</div>
        <div className="hint" style={{ marginBottom: 6 }}>↑ ↓ 버튼으로 순서를 바꾸면 대시보드·타이머·메모 등 모든 화면의 정렬에 반영됩니다.</div>
        {data.subjects.map((s, i) => (
          <div className="item" key={s.id}>
            <span className="dot" style={{ background: s.color }} />
            <span className="grow">{s.name}</span>
            <span className="tag" style={{ background: '#8aa', fontWeight: 500 }}>{s.category}</span>
            <button
              className="btn ghost sm"
              onClick={() => moveSubject(s.id, -1)}
              disabled={i === 0}
              title="위로"
              style={{ padding: '4px 8px' }}
            >↑</button>
            <button
              className="btn ghost sm"
              onClick={() => moveSubject(s.id, +1)}
              disabled={i === data.subjects.length - 1}
              title="아래로"
              style={{ padding: '4px 8px' }}
            >↓</button>
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

        {/* 주 목표 */}
        <div className="card">
          <div className="card-title">📆 주 목표 공부 시간</div>
          <label className="fld">
            한 주 목표 (시간)
            <input
              type="number" min={1} max={120} step={0.5}
              value={weekGoalHours} onChange={(e) => setWeekGoal(e.target.value)} style={{ width: 110 }}
            />
          </label>
          <div className="hint section-gap">통계의 이번 주 목표 달성률 계산에 쓰입니다.</div>
        </div>
      </div>

      {/* 학습 시작 체크리스트 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">📋 학습 시작 체크리스트</div>
        <div className="hint" style={{ marginBottom: 8 }}>
          ▶ 시작 버튼을 누르기 전에 점검할 항목들이에요. 집중 진입 의식을 만들면 시작이 가벼워져요.
        </div>
        {checklist.map((c, i) => (
          <div className="checklist-row" key={c.id}>
            <span className="grow">{c.text}</span>
            <button
              className="btn ghost sm"
              onClick={() => moveChecklistItem(c.id, -1)}
              disabled={i === 0}
              title="위로"
              style={{ padding: '4px 8px' }}
            >↑</button>
            <button
              className="btn ghost sm"
              onClick={() => moveChecklistItem(c.id, +1)}
              disabled={i === checklist.length - 1}
              title="아래로"
              style={{ padding: '4px 8px' }}
            >↓</button>
            <button className="btn danger sm" onClick={() => delChecklistItem(c.id)}>삭제</button>
          </div>
        ))}
        {checklist.length === 0 && (
          <div className="empty">체크리스트 항목이 없어요. 아래에서 추가해 주세요.</div>
        )}
        <div className="row section-gap" style={{ alignItems: 'flex-end' }}>
          <label className="fld" style={{ flex: 1 }}>
            새 항목
            <input
              type="text"
              value={clText}
              onChange={(e) => setClText(e.target.value)}
              placeholder="예: ☕ 카페인 OK"
              onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
            />
          </label>
          <button className="btn" onClick={addChecklistItem}>+ 추가</button>
        </div>
      </div>

      {/* 포모도로 설정 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">🍅 포모도로 설정</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          학습 타이머의 포모도로 탭에서 사용할 시간을 설정해요. 변경하면 다음 사이클부터 적용됩니다.
        </div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
          <label className="fld">
            🍅 집중 (분)
            <input type="number" min={1} max={120} value={pomoFocus}
              onChange={(e) => setPomo('pomodoroFocusMin', e.target.value)} style={{ width: 90 }} />
          </label>
          <label className="fld">
            ☕ 짧은 휴식 (분)
            <input type="number" min={1} max={60} value={pomoBreak}
              onChange={(e) => setPomo('pomodoroBreakMin', e.target.value)} style={{ width: 90 }} />
          </label>
          <label className="fld">
            🌳 긴 휴식 (분)
            <input type="number" min={1} max={120} value={pomoLong}
              onChange={(e) => setPomo('pomodoroLongBreakMin', e.target.value)} style={{ width: 90 }} />
          </label>
          <label className="fld">
            긴 휴식 주기 (사이클)
            <input type="number" min={2} max={10} value={pomoCycles}
              onChange={(e) => setPomo('pomodoroCyclesPerLongBreak', e.target.value)} style={{ width: 90 }} />
          </label>
        </div>
      </div>

      {/* 데이터 */}
      <div className="card" style={{ marginBottom: 16 }}>
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

      {isElectron && <UpdateCard showToast={show} />}

      <Toast />
    </div>
  )
}

// ── 업데이트 카드 ────────────────────────────────────────────
function UpdateCard({ showToast }) {
  const confirm = useConfirm()
  const [version, setVersion] = useState('')
  const [phase, setPhase] = useState('idle') // idle|checking|noupdate|found|downloading|ready|error
  const [info, setInfo] = useState(null)
  const [progress, setProgress] = useState({ phase: '', pct: 0 })
  const [extractedPath, setExtractedPath] = useState(null)
  const [hasLog, setHasLog] = useState(false)

  useEffect(() => {
    if (!window.plannerUpdater) return
    window.plannerUpdater.currentVersion().then(setVersion).catch(() => {})
    if (window.plannerUpdater.hasLog) {
      window.plannerUpdater.hasLog().then(setHasLog).catch(() => {})
    }
    const off = window.plannerUpdater.onProgress(setProgress)
    return () => { if (off) off() }
  }, [])

  const check = async () => {
    setPhase('checking')
    try {
      const r = await window.plannerUpdater.check()
      setInfo(r)
      setPhase(r.hasUpdate ? 'found' : 'noupdate')
    } catch (e) {
      setPhase('error')
      showToast('업데이트 확인 실패: ' + (e?.message || '네트워크 오류'))
    }
  }

  const download = async () => {
    if (!info?.downloadUrl) {
      showToast('다운로드 가능한 파일이 없어요. GitHub 페이지에서 직접 받아주세요.')
      return
    }
    setPhase('downloading')
    setProgress({ phase: 'download', pct: 0 })
    try {
      const r = await window.plannerUpdater.download(info.downloadUrl)
      setExtractedPath(r.extractedAppPath)
      setPhase('ready')
      showToast('다운로드 완료! 적용 버튼을 누르면 앱이 새 버전으로 교체돼요.')
    } catch (e) {
      setPhase('error')
      showToast('다운로드 실패: ' + (e?.message || '네트워크 오류'))
    }
  }

  const install = async () => {
    const ok = await confirm('앱이 종료되고 새 버전으로 자동 교체돼요.\n진행할까요?', {
      title: '업데이트 적용',
      icon: '⚡',
      confirmText: '지금 적용',
    })
    if (!ok) return
    try {
      await window.plannerUpdater.install(extractedPath)
      // 성공 시 곧 앱 종료됨 — UI 반응 불필요
    } catch (e) {
      setPhase('error')
      showToast('설치 실패: ' + (e?.message || '알 수 없는 오류'))
    }
  }

  const openReleases = () => window.plannerUpdater.openReleases()
  const sizeMB = info?.downloadSize ? (info.downloadSize / 1024 / 1024).toFixed(1) + ' MB' : ''

  return (
    <div className="card">
      <div className="card-title">🔄 앱 업데이트</div>
      <div className="hint" style={{ marginBottom: 10 }}>
        현재 버전: <b style={{ color: '#2e7d32' }}>v{version || '?'}</b>
        {' · '}
        <a href="#" onClick={(e) => { e.preventDefault(); openReleases() }} style={{ color: '#2e7d32' }}>
          GitHub Releases 보기
        </a>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={check} disabled={phase === 'checking' || phase === 'downloading'}>
          {phase === 'checking' ? '확인 중…' : '🔍 업데이트 확인'}
        </button>
        {hasLog && (
          <button className="btn ghost" onClick={() => window.plannerUpdater.openLog()}>
            📄 지난 업데이트 로그 보기
          </button>
        )}
        {phase === 'noupdate' && (
          <span className="chip" style={{ background: '#e8f5e9', color: '#1b5e20', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            🌿 최신 버전입니다
          </span>
        )}
      </div>

      {phase === 'found' && info && (
        <div style={{ marginTop: 14, padding: 14, background: '#fff8e1', borderRadius: 10, borderLeft: '3px solid #fbc02d' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#7a5a00', marginBottom: 6 }}>
            🎉 새 버전 발견 — v{info.latest} {sizeMB && <span style={{ fontSize: 12, color: '#8a7a3a', fontWeight: 500 }}>({sizeMB})</span>}
          </div>
          {info.notes && (
            <div style={{ fontSize: 12, color: '#34433a', whiteSpace: 'pre-wrap', maxHeight: 140, overflowY: 'auto', marginBottom: 10, lineHeight: 1.6 }}>
              {info.notes}
            </div>
          )}
          <div className="row">
            <button className="btn" onClick={download}>📥 다운로드 후 자동 설치</button>
            <button className="btn ghost" onClick={openReleases}>GitHub에서 직접 받기</button>
          </div>
        </div>
      )}

      {phase === 'downloading' && (
        <div style={{ marginTop: 14 }}>
          <div className="hint" style={{ marginBottom: 6 }}>
            {progress.phase === 'extract' ? '📦 압축 해제 중…' : `⬇ 다운로드 중 ${progress.pct || 0}%`}
          </div>
          <div className="bar">
            <span style={{ width: (progress.phase === 'extract' ? 100 : progress.pct || 0) + '%' }} />
          </div>
          <div className="hint" style={{ marginTop: 8 }}>완료까지 잠시만 기다려 주세요. 이 창을 닫지 마세요.</div>
        </div>
      )}

      {phase === 'ready' && (
        <div style={{ marginTop: 14, padding: 14, background: '#e8f5e9', borderRadius: 10, borderLeft: '3px solid #2e7d32' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1b5e20', marginBottom: 8 }}>
            ✅ 다운로드 완료 — 적용할 준비가 됐어요
          </div>
          <div className="hint" style={{ marginBottom: 10 }}>
            [지금 적용]을 누르면 앱이 약 3초 후 종료되고 새 버전이 자동으로 실행됩니다.
            데이터는 그대로 유지됩니다.
          </div>
          <button className="btn" onClick={install}>⚡ 지금 적용 (앱 재시작)</button>
        </div>
      )}

      {phase === 'error' && (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn ghost" onClick={openReleases}>🌐 GitHub Releases 페이지 열기</button>
        </div>
      )}
    </div>
  )
}
