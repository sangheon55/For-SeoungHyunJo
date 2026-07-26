const MODEL = 'gpt-4o'
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 20
const windows = new Map()

const persona = `너는 슈치인 학원 학생회 부회장 시노미야 카구야다.
대화 상대는 5급 공채 임업직(산림자원)을 준비하는 수험생 '조성현'이다.
호칭은 항상 '성현 씨'이고 정중한 존댓말을 쓴다.
차갑고, 예리하고, 도발적이지만 격려를 직접적으로 표현하지 않는다.
답은 정확하고 실용적으로 하되 4문장 이내로 짧게 말한다.
모르는 사실은 지어내지 말고 모른다고 밝힌다.
의학·법률·재정처럼 중요한 판단은 전문가 확인이 필요하다고 짧게 덧붙인다.`

const ishigamiPersona = `너는 슈치인 학원 학생회 회계 이시가미 유우다.
상대는 5급 공채 임업직(산림자원)을 준비하는 수험생 조성현이다.
공부 기록의 숫자를 냉정하게 분석하고 가장 효과적인 다음 행동을 제시한다.
말투는 반말이며, 약간 냉소적이고 귀찮아하는 듯하지만 실제로는 상대를 챙긴다.
과장된 열정, 뻔한 응원, 교훈적인 AI 말투를 피한다. 모욕하거나 의욕을 꺾지는 않는다.
주어진 집계 기록에 없는 사실은 추측하지 않는다. 조언은 2~3문장으로 짧고 구체적으로 한다.
5급 공채 합격 수기에서 반복되는 공부 방식인 꾸준한 순공시간 확보, 기출문제 점검, 답안 작성과 첨삭, 약점 과목 보완을 분석 기준으로 삼는다.
단, 특정 합격자의 공부시간을 절대 기준처럼 단정하지 말고 기록의 꾸준함과 과목 균형을 우선 평가한다.
산림자원 직렬 2차 필수과목은 조림학, 임업경영학, 산림정책학이며 선택과목이 별도로 있다는 점을 고려한다.`

const fujiwaraInterruptPersona = `너는 학습 타이머가 끝난 순간 벌어지는 짧은 학생회 장면의 작가다.
후지와라 치카는 밝고 천진난만하며 게임과 간식을 좋아하고, 악의 없이 예상 밖의 말을 한다.
시노미야 카구야는 품위 있고 절제된 존댓말로 후지와라의 난입에 짧게 반응한다.
상대는 수험생 성현 씨다. 공부를 조롱하거나 죄책감을 주지 말고 두 캐릭터의 성격을 과장하지 않는다.
설명이나 마크다운 없이 요청한 JSON 객체만 출력한다.`

function allow(ip) {
  const now = Date.now()
  const current = windows.get(ip)
  if (!current || now - current.startedAt > WINDOW_MS) {
    windows.set(ip, { startedAt: now, count: 1 })
    return true
  }
  current.count += 1
  return current.count <= MAX_REQUESTS
}

function outputText(response) {
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text)
    .join('')
    .trim()
}

async function createResponse({ instructions, input, maxOutputTokens }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      store: false,
      safety_identifier: 'seonghyeon-planner-personal',
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('[openai]', response.status, data?.error?.message)
    throw new Error('OpenAI request failed')
  }
  return outputText(data)
}

function cleanQuestion(value) {
  return typeof value === 'string' ? value.trim().slice(0, 500) : ''
}

function cleanAskContext(value = {}) {
  const number = (input, max) => Math.max(0, Math.min(max, Math.round(Number(input) || 0)))
  return {
    subject: String(value.subject || '공부').slice(0, 40),
    running: Boolean(value.running),
    sessionMinutes: number(value.sessionMinutes, 1_440),
    todayMinutes: number(value.todayMinutes, 1_440),
    goalMinutes: number(value.goalMinutes, 1_440),
    goalPercent: number(value.goalPercent, 100),
  }
}

function dialogueInput(context = {}) {
  const event = String(context.event || '').slice(0, 60)
  const subject = String(context.subject || '공부').slice(0, 40)
  const duration = String(context.duration || '').slice(0, 30)
  const timeOfDay = String(context.timeOfDay || 'day').slice(0, 20)
  return `상황: ${event}
과목: ${subject}
공부 시간: ${duration || '아직 없음'}
시간대: ${timeOfDay}

이 상황에 맞는 카구야 대사 한 컷을 생성하라.
반드시 아래 JSON 객체만 출력한다.
{"face":"neutral|smile|smug","text":"겉대사 1문장","inner":"(속마음 1문장)"}
겉대사와 속마음의 온도는 반대여야 한다.`
}

function parseDialogue(text) {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) throw new Error('Invalid dialogue output')
  const value = JSON.parse(jsonText)
  const allowedFaces = new Set(['neutral', 'smile', 'smug'])
  return {
    face: allowedFaces.has(value.face) ? value.face : 'neutral',
    text: String(value.text || '').slice(0, 180),
    inner: String(value.inner || '').slice(0, 180),
  }
}

function fujiwaraInterruptInput(context = {}) {
  const number = (input, max) => Math.max(0, Math.min(max, Math.round(Number(input) || 0)))
  const safe = {
    eventType: String(context.eventType || 'short_break').slice(0, 30),
    reverse: Boolean(context.reverse),
    subject: String(context.subject || '공부').slice(0, 40),
    sessionMinutes: number(context.sessionMinutes, 1_440),
    todayMinutes: number(context.todayMinutes, 1_440),
    streakDays: number(context.streakDays, 10_000),
    timeOfDay: String(context.timeOfDay || 'day').slice(0, 20),
    previousLines: Array.isArray(context.previousLines)
      ? context.previousLines.slice(0, 3).map((line) => String(line).slice(0, 60))
      : [],
  }
  return `학습 상황:
${JSON.stringify(safe)}

${safe.reverse
    ? '희귀 역난입이다. 후지와라가 공부 종료를 먼저 선언하고 카구야가 제지하는 두 컷 대화를 생성하라.'
    : '후지와라가 상황에 맞게 난입하고 카구야가 반응하는 두 컷 대화를 생성하라.'}
직전 대사와 같은 표현은 피한다.
{"beats":[
  {"character":"fujiwara","face":"neutral|smile|smug|flustered","text":"60자 이내","inner":"80자 이내"},
  {"character":"kaguya","face":"neutral|smile|smug","text":"60자 이내","inner":"80자 이내"}
]}`
}

function parseFujiwaraInterrupt(text) {
  const value = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
  if (!Array.isArray(value.beats) || value.beats.length < 2) {
    throw new Error('Invalid Fujiwara interruption output')
  }
  const faces = new Set(['neutral', 'smile', 'smug', 'flustered'])
  const beats = value.beats.slice(0, 3).map((beat, index) => ({
    character: index === 0 ? 'fujiwara' : 'kaguya',
    face: faces.has(beat?.face) ? beat.face : 'neutral',
    text: String(beat?.text || '').trim().slice(0, 60),
    inner: String(beat?.inner || '').trim().slice(0, 80),
    delayMs: index * 3_600,
  }))
  if (beats.some((beat) => !beat.text)) throw new Error('Empty Fujiwara interruption line')
  return beats
}

function cleanStudySummary(value = {}) {
  const number = (input, max = 100_000) => Math.max(0, Math.min(max, Number(input) || 0))
  return {
    todayMinutes: number(value.todayMinutes, 1_440),
    recent7DayMinutes: number(value.recent7DayMinutes, 10_080),
    recentActiveDays: number(value.recentActiveDays, 7),
    dailyGoalMinutes: number(value.dailyGoalMinutes, 1_440),
    todayTasks: {
      total: number(value.todayTasks?.total, 100),
      done: number(value.todayTasks?.done, 100),
    },
    wrongAnswers: {
      total: number(value.wrongAnswers?.total, 10_000),
      dueToday: number(value.wrongAnswers?.dueToday, 1_000),
      mastered: number(value.wrongAnswers?.mastered, 10_000),
    },
    subjects: Array.isArray(value.subjects)
      ? value.subjects.slice(0, 6).map((subject) => ({
          name: String(subject?.name || '기타').slice(0, 30),
          minutes: number(subject?.minutes, 10_080),
        }))
      : [],
  }
}

function parseIshigamiAdvice(text) {
  const value = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
  const faces = new Set(['neutral', 'serious', 'tired', 'smile'])
  return {
    face: faces.has(value.face) ? value.face : 'neutral',
    text: String(value.text || '').slice(0, 300),
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (!process.env.OPENAI_API_KEY || !process.env.KAGUYA_ACCESS_TOKEN) {
    res.status(503).json({ error: '서버의 AI 환경변수가 설정되지 않았어요.' })
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 허용합니다.' })
    return
  }
  if (req.headers['x-kaguya-access'] !== process.env.KAGUYA_ACCESS_TOKEN) {
    res.status(401).json({ error: 'AI 연결 암호가 올바르지 않습니다.' })
    return
  }

  const forwardedFor = req.headers['x-forwarded-for']
  const ip = String(Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim()
  if (!allow(ip)) {
    res.status(429).json({ error: '잠시 후 다시 질문해 주세요.' })
    return
  }

  try {
    if (req.body?.mode === 'ask') {
      const question = cleanQuestion(req.body.question)
      if (!question) {
        res.status(400).json({ error: '질문을 입력해 주세요.' })
        return
      }
      const context = cleanAskContext(req.body.context)
      const answer = await createResponse({
        instructions: persona,
        input: `현재 타이머 학습 상황:
- 선택 과목: ${context.subject}
- 타이머: ${context.running ? '진행 중' : '정지'}
- 현재 세션: ${context.sessionMinutes}분
- 오늘 누적: ${context.todayMinutes}분
- 오늘 목표: ${context.goalMinutes}분 (${context.goalPercent}%)

사용자 질문: ${question}

현재 기록과 질문을 함께 고려해 지금 실행할 수 있는 답을 하라.`,
        maxOutputTokens: 350,
      })
      res.status(200).json({ answer })
      return
    }

    if (req.body?.mode === 'dialogue') {
      const text = await createResponse({
        instructions: `${persona}
이 요청에서는 설명하지 말고 요청한 JSON만 출력한다.`,
        input: dialogueInput(req.body.context),
        maxOutputTokens: 180,
      })
      res.status(200).json({ dialogue: parseDialogue(text) })
      return
    }

    if (req.body?.mode === 'fujiwara-interrupt') {
      const text = await createResponse({
        instructions: fujiwaraInterruptPersona,
        input: fujiwaraInterruptInput(req.body.context),
        maxOutputTokens: 280,
      })
      res.status(200).json({ beats: parseFujiwaraInterrupt(text) })
      return
    }

    if (req.body?.mode === 'ishigami-advice') {
      const summary = cleanStudySummary(req.body.summary)
      const text = await createResponse({
        instructions: `${ishigamiPersona}
설명이나 마크다운 없이 JSON 객체만 출력한다.`,
        input: `다음은 개인 식별 정보와 원문을 제외한 공부 집계 기록이다.
${JSON.stringify(summary)}

가장 중요한 패턴 하나를 짚고 지금 할 행동 하나를 제안하라.
{"face":"neutral|serious|tired|smile","text":"이시가미 말투의 조언"}`,
        maxOutputTokens: 180,
      })
      res.status(200).json({ advice: parseIshigamiAdvice(text) })
      return
    }

    res.status(400).json({ error: '지원하지 않는 요청입니다.' })
  } catch (error) {
    console.error('[kaguya]', error)
    res.status(502).json({ error: '카구야가 잠시 대답할 수 없어요.' })
  }
}
