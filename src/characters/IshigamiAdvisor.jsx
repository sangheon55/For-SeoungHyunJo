import React, { useEffect, useMemo, useRef, useState } from 'react'
import { dateStr } from '../lib/util.js'
import { getIshigamiAdvice } from '../kaguya/kaguyaApi.js'
import IshigamiLayer from './IshigamiLayer.jsx'
import { buildIshigamiStudySummary, getIshigamiFallback } from './ishigamiState.js'

export default function IshigamiAdvisor({ data }) {
  const today = dateStr()
  const requestRef = useRef(null)
  const summary = useMemo(() => buildIshigamiStudySummary(data, today), [data, today])
  const fallback = useMemo(() => getIshigamiFallback(summary), [summary])
  const [presentation, setPresentation] = useState(fallback)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadAdvice = async ({ refresh = false } = {}) => {
    requestRef.current?.abort()
    const cacheKey = `sh_ishigami_advice_benchmark_v1_${today}`
    if (!refresh) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          setPresentation(JSON.parse(cached))
          return
        } catch {
          localStorage.removeItem(cacheKey)
        }
      }
    }

    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError('')
    try {
      const result = await getIshigamiAdvice(summary, { signal: controller.signal })
      const next = { face: result.face, advice: result.text }
      setPresentation(next)
      localStorage.setItem(cacheKey, JSON.stringify(next))
    } catch (loadError) {
      if (!controller.signal.aborted) {
        setPresentation(fallback)
        setError(loadError instanceof Error ? loadError.message : 'AI 분석을 불러오지 못했어.')
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadAdvice()
    return () => requestRef.current?.abort()
    // 하루 한 번 캐시된 기록 조언을 사용한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today])

  return (
    <IshigamiLayer
      face={presentation.face}
      advice={presentation.advice}
      loading={loading}
      error={error}
      onRefresh={() => loadAdvice({ refresh: true })}
    />
  )
}
