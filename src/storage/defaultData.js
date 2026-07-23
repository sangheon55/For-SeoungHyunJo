// ── 기본 데이터 ──────────────────────────────────────────────
export const defaultData = {
  version: 1,
  subjects: [
    { id: 's1', name: '언어논리', category: 'PSAT', color: '#2E7D32' },
    { id: 's2', name: '자료해석', category: 'PSAT', color: '#43A047' },
    { id: 's3', name: '상황판단', category: 'PSAT', color: '#66BB6A' },
    { id: 's4', name: '조림학', category: '전공', color: '#1B5E20' },
    { id: 's5', name: '임업경영학', category: '전공', color: '#33691E' },
    { id: 's6', name: '영어', category: '영어', color: '#00897B' },
    { id: 's7', name: '한국사', category: '한국사', color: '#5D4037' },
  ],
  tasks: [],        // { id, date, subjectId, text, done }
  sessions: [],     // { id, subjectId, date, seconds, start:'HH:MM', end:'HH:MM', manual, mock }
  memos: [],        // { id, subjectId, title, body, updatedAt }
  reviews: [],      // { id, name, subjectId, totalChapters, doneChapters, targetRounds, round }
  wrongAnswers: [], // 오답노트 — 자세한 스키마는 lib/ebbinghaus.js 참고
  linkCategories: [ // 자주 가는 사이트의 카테고리 — 사용자가 추가/이름변경/삭제/순서변경 가능
    { name: '시험 정보',  color: '#1976D2' },
    { name: '강의·인강',  color: '#7B1FA2' },
    { name: '기출문제',   color: '#F57C00' },
    { name: '산림자원직', color: '#2E7D32' },
    { name: '학습 자료',  color: '#5D4037' },
    { name: '커뮤니티',   color: '#00897B' },
  ],
  links: [          // 자주 가는 사이트 모음 — { id, name, alias, url, category, description, createdAt }
    { id: 'lk1', name: '사이버국가고시센터', alias: '', url: 'https://gosi.kr',                 category: '시험 정보',  description: '시험 일정·공고·합격자 발표가 여기에서 나와요',                     createdAt: '2026-05-24' },
    { id: 'lk2', name: '인사혁신처',         alias: '', url: 'https://www.mpm.go.kr',          category: '시험 정보',  description: '5급 공무원 시험 주관 부처',                                       createdAt: '2026-05-24' },
    { id: 'lk3', name: '국립산림과학원',     alias: '', url: 'https://nifos.forest.go.kr',     category: '산림자원직', description: '산림자원직 전공 자료·연구 보고서',                                createdAt: '2026-05-24' },
    { id: 'lk4', name: '산림청',             alias: '', url: 'https://www.forest.go.kr',      category: '산림자원직', description: '산림청 정책·통계',                                                 createdAt: '2026-05-24' },
    { id: 'lk5', name: '나무위키',           alias: '', url: 'https://namu.wiki',              category: '학습 자료',  description: '개념 빠르게 훑을 때',                                              createdAt: '2026-05-24' },
  ],
  photos: [],       // 가족·친구 사진 — { id, src(dataURL), caption, addedAt }
  hobbies: [],      // 취미 목록 — { id, name, emoji, note, lastDoneAt }
  examDates: [
    { id: 'e1', name: '1차 시험(PSAT)', date: '2027-03-06' },
    { id: 'e2', name: '원서 접수 마감', date: '2027-01-20' },
  ],
  dayNotes: {},     // { 'YYYY-MM-DD': '하루 돌아보기 메모' }
  flashcards: [],   // 플래시카드 — { id, subjectId, front, back, correctStreak, totalAttempts, lastReviewedAt, status, createdAt }
  settings: {
    dailyGoalMin: 510,            // 하루 8.5시간
    weeklyGoalMin: 3060,          // 주 51시간
    pomodoroFocusMin: 25,         // 포모도로 집중 시간(분)
    pomodoroBreakMin: 5,          // 짧은 휴식(분)
    pomodoroLongBreakMin: 15,     // 긴 휴식(분) — 4사이클 후
    pomodoroCyclesPerLongBreak: 4,
    startChecklist: [             // 학습 시작 체크리스트 — 사용자가 편집 가능
      { id: 'cl1', text: '💧 물 준비됐어요' },
      { id: 'cl2', text: '📱 휴대폰 멀리 놨어요' },
      { id: 'cl3', text: '📚 책·자료 준비됐어요' },
    ],
    forceDesktopLayout: false, // 모바일 폭에서도 항상 데스크탑 레이아웃을 강제할지
  },
  wrongSettings: {
    intervals: [1, 3, 7, 14, 30], // 에빙하우스 5단계(일)
    resetOnMiss: true,            // 틀리면 1단계로 리셋
  },
}

// 새 버전에서 추가된 키를 기존 데이터에 채워 넣는다(주간 업데이트 호환).
export function mergeDefaults(loaded) {
  if (!loaded || typeof loaded !== 'object') return clone(defaultData)
  return {
    ...defaultData,
    ...loaded,
    settings: { ...defaultData.settings, ...(loaded.settings || {}) },
    wrongSettings: { ...defaultData.wrongSettings, ...(loaded.wrongSettings || {}) },
    wrongAnswers: Array.isArray(loaded?.wrongAnswers) ? loaded.wrongAnswers : [],
    links: Array.isArray(loaded?.links) ? loaded.links : defaultData.links,
    linkCategories: Array.isArray(loaded?.linkCategories) ? loaded.linkCategories : defaultData.linkCategories,
    photos: Array.isArray(loaded?.photos) ? loaded.photos : [],
    hobbies: Array.isArray(loaded?.hobbies) ? loaded.hobbies : [],
    flashcards: Array.isArray(loaded?.flashcards) ? loaded.flashcards : [],
    subjects: Array.isArray(loaded?.subjects) ? loaded.subjects : defaultData.subjects,
    examDates: Array.isArray(loaded?.examDates) ? loaded.examDates : defaultData.examDates,
  }
}

export const clone = (o) => JSON.parse(JSON.stringify(o))
