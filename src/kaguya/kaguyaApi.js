const ACCESS_KEY = 'sh_kaguya_ai_access'
const ENDPOINT_KEY = 'sh_kaguya_ai_endpoint'
const REQUEST_TIMEOUT_MS = 15_000

export function getKaguyaAiConfig() {
  return {
    accessCode: localStorage.getItem(ACCESS_KEY) || '',
    endpoint: localStorage.getItem(ENDPOINT_KEY) || `${import.meta.env.BASE_URL}api/kaguya`,
  }
}

export function saveKaguyaAiConfig({ accessCode, endpoint }) {
  localStorage.setItem(ACCESS_KEY, accessCode.trim())
  if (endpoint.trim()) localStorage.setItem(ENDPOINT_KEY, endpoint.trim())
  else localStorage.removeItem(ENDPOINT_KEY)
}

export function isKaguyaAiConfigured() {
  return !!getKaguyaAiConfig().accessCode
}

async function request(body, { signal } = {}) {
  const { accessCode, endpoint } = getKaguyaAiConfig()
  if (!accessCode) throw new Error('설정에서 AI 연결 암호를 먼저 입력해 주세요.')

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller, { once: true })

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kaguya-Access': accessCode,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(signal?.aborted
        ? '요청이 취소되었습니다.'
        : '카구야 AI 응답 시간이 초과됐어요.')
    }
    throw new Error('카구야 AI에 연결하지 못했어요.')
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || '카구야 AI에 연결하지 못했어요.')
  }
  return data
}

export async function askKaguya(question, context, options) {
  const data = await request({ mode: 'ask', question, context }, options)
  if (typeof data.answer !== 'string' || !data.answer.trim()) {
    throw new Error('카구야 AI가 올바른 답변을 보내지 않았어요.')
  }
  return data.answer
}

export async function generateKaguyaDialogue(context, options) {
  if (!isKaguyaAiConfigured()) return null
  try {
    const data = await request({ mode: 'dialogue', context }, options)
    return data.dialogue && typeof data.dialogue === 'object' ? data.dialogue : null
  } catch (error) {
    if (!options?.signal?.aborted) {
      console.warn('[kaguya-ai] local dialogue fallback:', error)
    }
    return null
  }
}

export async function generateFujiwaraInterrupt(context, options) {
  if (!isKaguyaAiConfigured()) return null
  try {
    const data = await request({ mode: 'fujiwara-interrupt', context }, options)
    return Array.isArray(data.beats) ? data.beats : null
  } catch (error) {
    if (!options?.signal?.aborted) {
      console.warn('[fujiwara-ai] local interruption fallback:', error)
    }
    return null
  }
}

export async function getIshigamiAdvice(summary, options) {
  const data = await request({ mode: 'ishigami-advice', summary }, options)
  if (!data.advice || typeof data.advice !== 'object') {
    throw new Error('이시가미가 올바른 분석을 보내지 않았어요.')
  }
  return data.advice
}
