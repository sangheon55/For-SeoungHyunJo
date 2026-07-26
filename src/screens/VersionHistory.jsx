import { APP_VERSION, VERSION_HISTORY } from '../appVersion.js'

export default function VersionHistory() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>업데이트 내역</h1>
          <p className="hint">현재 사용 중인 버전과 주요 변경 사항을 확인할 수 있어요.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex-between" style={{ gap: 12 }}>
          <span className="card-title" style={{ marginBottom: 0 }}>현재 버전</span>
          <b style={{ color: '#701920', fontSize: 18 }}>v{APP_VERSION}</b>
        </div>
      </div>

      <div className="card">
        {VERSION_HISTORY.map((release, index) => (
          <section
            key={release.version}
            style={{
              padding: index === 0 ? '0 0 16px' : '16px 0',
              borderTop: index === 0 ? 'none' : '1px solid var(--line)',
            }}
          >
            <div className="flex-between" style={{ gap: 12, alignItems: 'flex-start' }}>
              <b style={{ color: '#701920' }}>v{release.version} · {release.title}</b>
              <span className="hint" style={{ whiteSpace: 'nowrap' }}>{release.date}</span>
            </div>
            <ul style={{ margin: '9px 0 0', paddingLeft: 20, lineHeight: 1.75 }}>
              {release.changes.map((change) => <li key={change}>{change}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
