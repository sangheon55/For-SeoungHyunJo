import React, { useEffect, useState } from 'react'
import { useStore } from './store.jsx'
import useIsMobile from './lib/useIsMobile.js'
import DesktopShell from './shells/DesktopShell.jsx'
import MobileShell from './shells/MobileShell.jsx'
import SessionRecovery from './components/SessionRecovery.jsx'

export default function App() {
  const { data, update } = useStore()
  const [tab, setTab] = useState('home')
  const [sessionForceDesktop, setSessionForceDesktop] = useState(false)
  const isNarrow = useIsMobile()

  const go = (id) => setTab(id)

  const forceDesktopPersisted = !!data.settings.forceDesktopLayout
  const useMobileShell = isNarrow && !forceDesktopPersisted && !sessionForceDesktop

  useEffect(() => {
    document.body.classList.toggle('theme-kaguya', !!data.settings.kaguyaThemeEnabled)
    return () => document.body.classList.remove('theme-kaguya')
  }, [data.settings.kaguyaThemeEnabled])

  // 게이트 카드의 "항상 데스크탑으로 보기" — 설정에 영구 저장 + 이번 세션도 즉시 반영
  const alwaysDesktop = () => {
    update((d) => ({ ...d, settings: { ...d.settings, forceDesktopLayout: true } }))
    setSessionForceDesktop(true)
  }

  return (
    <>
      <SessionRecovery go={go} />
      {useMobileShell ? (
        <MobileShell
          tab={tab}
          go={go}
          onViewAsDesktop={() => setSessionForceDesktop(true)}
          onAlwaysDesktop={alwaysDesktop}
        />
      ) : (
        <DesktopShell tab={tab} go={go} />
      )}
    </>
  )
}
