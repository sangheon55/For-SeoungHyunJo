import { useEffect, useRef } from 'react'
import { useConfirm } from './confirm.jsx'
import { activeSessionStore } from '../storage/activeSessionStore.js'

// 앱 시작 시 진행 중이던 activeSession이 있으면 복구 다이얼로그를 띄운다.
// App.jsx에 탭 전환과 무관하게 한 번만 마운트되어, 기본 탭이 '홈'이어도 반드시 체크된다.
export default function SessionRecovery({ go }) {
  const confirm = useConfirm()
  const checked = useRef(false) // StrictMode 이중 실행 가드

  useEffect(() => {
    if (checked.current) return
    checked.current = true
    ;(async () => {
      const session = await activeSessionStore.get()
      if (!session) return
      const ok = await confirm('진행 중이던 세션이 있습니다. 이어서 할까요?', {
        title: '이어서 하기',
        icon: '⏱️',
        confirmText: '이어서 하기',
        cancelText: '새로 시작',
      })
      if (ok) go('timer')
      else await activeSessionStore.clear()
    })()
  }, [go, confirm])

  return null
}
