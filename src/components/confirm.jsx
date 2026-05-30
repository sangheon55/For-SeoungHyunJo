import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

// 앱 톤에 맞춘 확인 다이얼로그 — window.confirm 대체.
// 사용:
//   const confirm = useConfirm()
//   const ok = await confirm('삭제할까요?', { variant: 'danger', confirmText: '삭제' })
//   if (!ok) return
const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setState({ message, ...opts, resolve })
    })
  }, [])

  const handle = (result) => {
    if (state?.resolve) state.resolve(result)
    setState(null)
  }

  // Esc 키로 취소
  useEffect(() => {
    if (!state) return
    const onKey = (e) => {
      if (e.key === 'Escape') handle(false)
      else if (e.key === 'Enter') handle(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const variant = state?.variant || 'default'
  const icon = state?.icon ?? (variant === 'danger' ? '🗑️' : '❓')

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="wa-backdrop" onClick={() => handle(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()} role="alertdialog">
            <div className="confirm-icon">{icon}</div>
            {state.title && <h3 className="confirm-title">{state.title}</h3>}
            <p className="confirm-message">{state.message}</p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => handle(false)}>
                {state.cancelText || '취소'}
              </button>
              <button
                className={'btn ' + (variant === 'danger' ? 'solid-danger' : '')}
                onClick={() => handle(true)}
                autoFocus
              >
                {state.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// 컨텍스트가 없으면 native confirm 으로 폴백 (개발 모드 단일 컴포넌트 테스트 대비)
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (ctx) return ctx
  return async (message) => window.confirm(message)
}
