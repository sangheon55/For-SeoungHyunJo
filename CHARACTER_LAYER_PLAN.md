# 캐릭터 레이어 확장 계획

## 목표

기존 카구야 전용 레이어를 공통 캐릭터 레이어로 확장하여 다음 캐릭터를 학습 이벤트에 연결한다.

- 시노미야 카구야
- 하야사카 아이
- 후지와라 치카

한 화면에는 한 명만 표시하고, 발생한 이벤트에 따라 등장 캐릭터와 표정을 교체한다.

## 캐릭터별 역할

### 시노미야 카구야

- 기본 학습 타이머 담당
- 학습 시작과 종료 안내
- 목표 달성 및 장시간 집중 칭찬
- 일일 학습 결과 판정

### 하야사카 아이

- 학습 계획 및 효율 점검
- 늦은 시간의 학습 안내
- 과도한 연속 학습 시 휴식 권유
- 현재 기록에 따른 현실적인 조언

### 후지와라 치카

- 포모도로 담당
- 짧은 집중 미션 제안
- 휴식 및 스트레칭 안내
- 밝고 가벼운 학습 독려

## 이벤트 매핑

| 조건 | 캐릭터 | 표정 | 예시 대사 |
|---|---|---|---|
| 타이머 기본 화면 | 카구야 | `neutral` | 오늘 계획은 확인하셨나요? |
| 타이머 시작 | 카구야 | `neutral` 또는 `smile` | 시작해 보세요. |
| 타이머 2시간 이상 완료 | 카구야 | `smug` | 제법이네요. |
| 오후 11시 이후 타이머 시작 | 하야사카 | `neutral` | 너무 늦게까지 하지는 마세요. |
| 3시간 이상 연속 학습 | 하야사카 | `flustered` | 이제는 잠깐 쉬는 편이 좋겠어요. |
| 포모도로 집중 시작 | 후지와라 | `smile` | 집중 시작이에요! |
| 포모도로 집중 완료 | 후지와라 | `smug` | 설마 벌써 지친 건 아니죠? |
| 포모도로 휴식 시작 | 후지와라 | `smile` | 휴식 시간이에요! |

## 공통 레이어 구조

기존 `KaguyaLayer`의 표시 기능을 범용 `CharacterLayer`로 분리한다.

```jsx
<CharacterLayer
  character="hayasaka"
  face="neutral"
  text="너무 늦게까지 하지는 마세요."
  inner="(또 무리하려는 건 아니겠지.)"
  active={false}
/>
```

공통 속성:

| 속성 | 설명 |
|---|---|
| `character` | `kaguya`, `hayasaka`, `fujiwara` |
| `face` | `neutral`, `blink`, `smile`, `smug`, `flustered` |
| `text` | 사용자에게 표시할 대사 |
| `inner` | 선택적으로 표시할 속마음 |
| `active` | 타이머 실행 등 활성 상태 |
| `studyContext` | 과목, 학습 시간, 목표 달성률 등의 문맥 |

## 에셋 경로

캐릭터명과 표정명을 사용해 에셋 경로를 자동 생성한다.

```js
const characterAsset = (character, face) =>
  `${import.meta.env.BASE_URL}assets/characters/${character}/upper_${face}.png`
```

폴더 구조:

```text
public/assets/characters/
├── kaguya/
│   ├── upper_neutral.png
│   ├── upper_blink.png
│   ├── upper_smile.png
│   ├── upper_smug.png
│   └── upper_flustered.png
├── hayasaka/
│   ├── upper_neutral.png
│   ├── upper_blink.png
│   ├── upper_smile.png
│   ├── upper_smug.png
│   └── upper_flustered.png
└── fujiwara/
    ├── upper_neutral.png
    ├── upper_blink.png
    ├── upper_smile.png
    ├── upper_smug.png
    └── upper_flustered.png
```

모든 에셋의 공통 규격:

- PNG
- 투명 배경
- 1024×1536
- 동일한 캐릭터 배치와 여백

## 대사 데이터 구조

대사마다 등장 캐릭터와 표정을 지정한다.

```json
{
  "id": "timer-end-impressive-01",
  "key": "timer.end.impressive",
  "char": "kaguya",
  "face": "smug",
  "text": "제법이네요.",
  "inner": "(두 시간 이상 집중하다니… 솔직히 감탄했어.)"
}
```

```json
{
  "id": "pomodoro-break-fujiwara-01",
  "key": "pomodoro.break",
  "char": "fujiwara",
  "face": "smile",
  "text": "휴식 시간이에요! 간식이라도 먹을까요?",
  "inner": ""
}
```

```json
{
  "id": "timer-start-late-night-hayasaka-01",
  "key": "timer.start.lateNight",
  "char": "hayasaka",
  "face": "neutral",
  "text": "이 시간부터 시작하시는 건가요? 무리는 하지 마세요.",
  "inner": "(또 밤을 새우려는 건 아니겠지.)"
}
```

## 이벤트 우선순위

동시에 여러 조건을 만족할 때는 아래 순서로 하나만 표시한다.

1. 특별 달성 이벤트
2. 건강 및 휴식 경고
3. 포모도로 단계 전환
4. 타이머 시작 및 종료
5. 기본 대기 대사

예시:

- 2시간 이상 완료 시 카구야의 `제법이네요.` 이벤트를 우선 표시한다.
- 3시간 이상 연속 학습했다면 이후 하야사카의 휴식 안내를 표시할 수 있다.
- 특별 이벤트는 AI 생성 대사로 즉시 덮어쓰지 않는다.

## 구현 순서

- [ ] 기존 `KaguyaLayer`의 공통 표시 로직을 `CharacterLayer`로 분리
- [ ] 캐릭터별 에셋 경로 매핑 추가
- [ ] 대사의 `char` 값에 따라 캐릭터 이미지 교체
- [ ] 공통 눈 깜빡임 처리
- [ ] 캐릭터 변경 시 전환 애니메이션 추가
- [ ] 후지와라 포모도로 이벤트 연결
- [ ] 하야사카 야간 및 장시간 학습 이벤트 연결
- [ ] 모바일 화면에서 크기와 대사창 위치 확인
- [ ] 캐릭터 이벤트 설정의 켜기/끄기 기능 확인
- [ ] 이벤트 우선순위 단위 테스트 추가
- [ ] 프로덕션 빌드 검증

## 1차 구현 범위

첫 번째 구현에서는 다음 기능까지만 적용한다.

1. 공통 `CharacterLayer` 생성
2. 기존 카구야 타이머 기능 유지
3. 후지와라를 포모도로 시작·완료·휴식에 연결
4. 하야사카를 오후 11시 이후 시작과 장시간 학습 경고에 연결
5. 기존 캐릭터 활성화 설정을 세 캐릭터에 공통 적용

여러 캐릭터 동시 등장, 호감도, 이벤트 도감 및 랜덤 미션은 이후 단계에서 추가한다.
