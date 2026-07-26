# 조성현 합격 플래너

5급 공채 과학기술직 산림자원을 준비하는 조성현을 위한 개인용 React/Vite 웹·PWA 플래너다.

- 운영 주소: https://seonghyeon-planner.vercel.app
- 현재 버전: `v2.2.0`
- 운영 계정: 허용된 Google 계정만 접속 가능
- 저장 방식: IndexedDB 로컬 우선 + 사용자 UID별 Firestore 실시간 동기화

## 현재 주요 기능

- 홈: 오늘 현황, 할 일, D-day, 나무 성장, 카구야 주도권
- 플래너: 날짜·과목별 할 일과 이이노 레이어
- 학습 타이머: 일일 공부량, 포모도로, 스톱워치, 기록 기반 카구야 AI 질문
- 학습 자료: 과목 메모, 회독 관리, 오답노트, 플래시카드, 통합 검색
- 통계: 공부량 비교, 과목 비중, 학습 잔디, 약점 분석, 이시가미 AI 조언
- 기타: 자주 가는 곳, 쉼, 나의 숲, 설정, 업데이트 내역

## 캐릭터 구성

- `四宮かぐや`: 홈과 학습 타이머
- `伊井野ミコ`: 플래너
- `石上優`: 통계의 공부 기록 분석
- `카구야 레이어` 설정으로 캐릭터 표시를 함께 켜고 끈다.
- `카구야 UI 테마`는 캐릭터 표시와 독립된 화면 테마다.
- 학생회실 배경은 오전 6시와 오후 6시를 기준으로 낮·야간이 바뀐다.

## AI 기능

### 카구야

학습 타이머에서 현재 과목, 타이머 상태, 현재 세션 시간, 오늘 누적 공부량과 목표 달성률을 바탕으로 질문에 답한다.

### 이시가미

오늘 및 최근 7일 공부량, 학습일 수, 과목 비중, 할 일과 복습 현황을 집계해 조언한다. 공부 기록 원문이나 개인 식별 정보는 보내지 않는다. 공개된 5급 공채 합격 수기의 공통 학습 방식과 산림자원 직렬 과목을 참고하되 특정 공부시간을 절대 기준으로 단정하지 않는다.

## 데이터와 배포

- 로컬 개발은 기본적으로 운영 Firebase에 연결하지 않는다.
- Vercel Production만 운영 Firebase를 사용한다.
- 사용자 데이터는 `users/{uid}/...` 경로로 분리한다.
- 캐릭터와 배경은 Vercel 정적 파일이다.
- 첨부 이미지는 현재 앱 데이터에 포함되며 Firebase Storage는 아직 사용하지 않는다.
- 상세 운영 방법은 [DATA_STORAGE.md](DATA_STORAGE.md)를 따른다.

## 로컬 실행

```text
npm install
npm run dev
```

기본 로컬 설정:

```env
VITE_DATA_ENV=local
VITE_ENABLE_CLOUD_SYNC=false
```

## 작업 완료 확인

```text
npm run test
npm run build
```

Production 배포:

```text
npx vercel deploy --prod --yes
```

현재 Vite 빌드는 정상 완료되지만 Firebase 번들이 700KB를 넘는다는 경고가 남아 있다. 오류는 아니며 추후 화면 단위 코드 분할 대상으로 검토할 수 있다.

## 프로젝트 구조

```text
api/                         Vercel AI API
public/assets/               캐릭터와 배경 정적 파일
src/auth/                    Google 로그인과 허용 계정 처리
src/characters/              이이노·이시가미 레이어와 상태 계산
src/kaguya/                  카구야 레이어, 대사, AI 클라이언트
src/screens/                 각 메뉴 화면
src/storage/                 IndexedDB·Firestore 동기화와 데이터 이전
test/                        Node 자동 테스트
firestore.rules              사용자별 Firestore 보안 규칙
```

## 다음 Codex 작업 시작 순서

1. `AGENTS.md`
2. `README.md`
3. `VERSION.md`
4. 데이터 작업이면 `DATA_STORAGE.md`
5. 과거 구현 세부사항이 필요하면 `CHANGELOG_DETAIL.md`

사용자에게 보이는 업데이트 화면은 간단한 요약만 표시한다. 구현 세부사항은 로컬 `CHANGELOG_DETAIL.md`에 기록한다.
