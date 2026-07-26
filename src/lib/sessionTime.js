// 세션 시간 계산은 화면 갱신 주기와 무관하게 타임스탬프만 사용한다.
export function computeElapsedSec(
  { startedAt, pausedMs = 0, lastPausedAt = null },
  now = Date.now()
) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0
  const safePausedMs = Number.isFinite(pausedMs) ? Math.max(0, pausedMs) : 0
  const pausedNow = Number.isFinite(lastPausedAt) ? Math.max(0, now - lastPausedAt) : 0
  return Math.max(0, (now - startedAt - safePausedMs - pausedNow) / 1000)
}
