import { useEffect, useState } from 'react'

export const MOBILE_BREAKPOINT = 768 // px — 재기획서 §2-1

// 순수 CSR Vite 앱이라 SSR 안전 처리는 필요 없다.
export default function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize) // 일부 모바일 브라우저는 회전 시 resize가 늦게 옴
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [breakpoint])

  return isMobile
}
