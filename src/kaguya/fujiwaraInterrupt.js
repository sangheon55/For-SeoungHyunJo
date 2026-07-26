const STORAGE_KEY = 'sh_fujiwara_interrupt_v1'
const MAX_DAILY_INTERRUPTS = 2
const MIN_SESSION_SECONDS = 25 * 60
const GUARANTEED_SESSION_SECONDS = 2 * 60 * 60

export function readFujiwaraInterruptState(storage, today) {
  try {
    const value = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null')
    if (value?.date === today) {
      return {
        date: today,
        count: Math.max(0, Math.min(MAX_DAILY_INTERRUPTS, Number(value.count) || 0)),
        lastEventId: String(value.lastEventId || ''),
        lastLine: String(value.lastLine || '').slice(0, 60),
      }
    }
  } catch {
    // 손상된 로컬 기록은 새 날짜 상태로 안전하게 초기화한다.
  }
  return { date: today, count: 0, lastEventId: '', lastLine: '' }
}

export function decideFujiwaraInterrupt({
  seconds,
  today,
  storage,
  random = Math.random,
  enabled = true,
}) {
  const state = readFujiwaraInterruptState(storage, today)
  if (!enabled || seconds < MIN_SESSION_SECONDS || state.count >= MAX_DAILY_INTERRUPTS) {
    return { trigger: false, state }
  }

  const guaranteed = seconds >= GUARANTEED_SESSION_SECONDS && state.count === 0
  const trigger = guaranteed || random() < 0.15
  const reverse = trigger && random() < 0.03
  return { trigger, guaranteed, reverse, state }
}

export function recordFujiwaraInterrupt(storage, today, state, eventId, line = '') {
  const next = {
    date: today,
    count: Math.min(MAX_DAILY_INTERRUPTS, state.count + 1),
    lastEventId: String(eventId || ''),
    lastLine: String(line || '').slice(0, 60),
  }
  storage?.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function getFujiwaraEventType({ seconds, hour, streakDays }) {
  if (seconds >= GUARANTEED_SESSION_SECONDS) return 'two_hours'
  if (streakDays >= 7) return 'streak'
  if (hour >= 22 || hour < 4) return 'late_night'
  if (seconds >= 60 * 60) return 'one_hour'
  return 'short_break'
}

export function fallbackFujiwaraSequence(seconds, { eventType, reverse = false } = {}) {
  if (reverse) {
    return [
      {
        character: 'fujiwara',
        face: 'smug',
        text: '오늘 공부는 여기까지! 제가 종료를 선언합니다!',
        inner: '(완벽한 타이밍에 등장했어요.)',
        delayMs: 0,
      },
      {
        character: 'kaguya',
        face: 'neutral',
        text: '마음대로 종료시키지 마세요, 후지와라 씨.',
        inner: '(대체 언제부터 기다리고 있었던 거야?)',
        delayMs: 3_600,
      },
    ]
  }

  if (eventType === 'streak') {
    return [
      {
        character: 'fujiwara',
        face: 'smile',
        text: '연속 학습 기록이라니, 축하 파티가 필요해요!',
        inner: '(케이크도 준비해야겠죠?)',
        delayMs: 0,
      },
      {
        character: 'kaguya',
        face: 'smug',
        text: '파티보다 기록을 이어 가는 게 먼저예요.',
        inner: '(그래도 축하는 해 줘야겠네.)',
        delayMs: 3_600,
      },
    ]
  }

  if (eventType === 'late_night') {
    return [
      {
        character: 'fujiwara',
        face: 'flustered',
        text: '이 시간까지 공부요? 야식이라도 가져올까요?',
        inner: '(저도 조금 배고픈데요.)',
        delayMs: 0,
      },
      {
        character: 'kaguya',
        face: 'neutral',
        text: '야식보다 휴식이 먼저겠네요.',
        inner: '(오늘은 무리하지 않았으면 좋겠어.)',
        delayMs: 3_600,
      },
    ]
  }

  if (seconds >= GUARANTEED_SESSION_SECONDS) {
    return [
      {
        character: 'fujiwara',
        face: 'smile',
        text: '두 시간이나 했으면 이제 놀아도 되는 거죠?',
        inner: '(보드게임 한 판 정도는 괜찮겠죠?)',
        delayMs: 0,
      },
      {
        character: 'kaguya',
        face: 'neutral',
        text: '그 보상은 누가 정한 거죠?',
        inner: '(정말 어디서 나타난 거야?)',
        delayMs: 3_600,
      },
    ]
  }

  if (seconds >= 60 * 60) {
    return [
      {
        character: 'fujiwara',
        face: 'smug',
        text: '저라면 중간에 게임 한 판 했을 텐데요.',
        inner: '(한 시간 내내 집중하는 건 역시 무리예요.)',
        delayMs: 0,
      },
      {
        character: 'kaguya',
        face: 'neutral',
        text: '후지와라 씨와 비교할 필요는 없겠네요.',
        inner: '(칭찬하려던 분위기가 전부 망가졌잖아.)',
        delayMs: 3_600,
      },
    ]
  }

  return [
    {
      character: 'fujiwara',
      face: 'smile',
      text: '수고했어요! 이제 간식 시간인가요?',
      inner: '(오늘 간식은 뭘까요?)',
      delayMs: 0,
    },
    {
      character: 'kaguya',
      face: 'smug',
      text: '후지와라 씨는 쉬는 이야기뿐이군요.',
      inner: '(그래도 성현 씨도 잠깐은 쉬어야겠지.)',
      delayMs: 3_600,
    },
  ]
}

export function normalizeFujiwaraSequence(value, fallback) {
  if (!Array.isArray(value) || value.length < 2) return fallback

  const characters = new Set(['kaguya', 'fujiwara'])
  const faces = new Set(['neutral', 'smile', 'smug', 'flustered'])
  const beats = value.slice(0, 3).map((beat, index) => ({
    character: characters.has(beat?.character) ? beat.character : (index === 0 ? 'fujiwara' : 'kaguya'),
    face: faces.has(beat?.face) ? beat.face : 'neutral',
    text: String(beat?.text || '').trim().slice(0, 60),
    inner: String(beat?.inner || '').trim().slice(0, 80),
    delayMs: index * 3_600,
  }))

  if (
    beats.some((beat) => !beat.text) ||
    beats[0].character !== 'fujiwara' ||
    !beats.some((beat) => beat.character === 'kaguya')
  ) {
    return fallback
  }
  return beats
}
