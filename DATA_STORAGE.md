# 데이터 저장·인증 운영 가이드

## 확정 구조

```text
로컬 개발
└─ IndexedDB 전용 (운영 Firebase 쓰기 금지)

Vercel Preview
└─ 개발용 Firebase 프로젝트

Vercel Production
└─ 운영 Firebase 프로젝트
   └─ users/{uid}/... 사용자별 데이터
```

- Google 로그인은 사용자 식별에 사용한다.
- `allowedUsers/{uid}`에 등록되고 `enabled: true`인 초대 사용자만 앱을 이용한다.
- 각 사용자는 `users/{uid}` 아래의 자기 데이터만 읽고 쓴다.
- `owo2002@gmail.com`은 관리자 `owner`로 최초 등록하며 기존 전체 데이터 복사 권한을 가진다.
- `shjo1218@gmail.com`은 조성현 `user`로 최초 등록하며 기존 데이터 이전 권한을 가진다.
- 두 계정의 실제 데이터는 각 Firebase UID 경로에 완전히 분리된다.
- 신규 사용자는 같은 구조로 초대 목록에 추가할 수 있다.
- 캐릭터 이미지는 Vercel 정적 파일로 유지한다.
- 사용자 첨부 이미지는 추후 Firebase Storage의 `users/{uid}` 경로로 이전한다.

## 환경별 설정

### 로컬 개발

기본값은 다음과 같으며 운영 Firebase와 동기화하지 않는다.

```env
VITE_DATA_ENV=local
VITE_ENABLE_CLOUD_SYNC=false
```

로컬 화면에서 만든 계획, 메모, 삭제 테스트는 조성현 운영 데이터에 영향을 주지 않는다.

### Vercel Preview

별도의 개발용 Firebase 프로젝트를 만든 뒤 Preview 환경변수에 개발 프로젝트 설정을 넣는다.

```env
VITE_DATA_ENV=preview
VITE_ENABLE_CLOUD_SYNC=true
VITE_FIREBASE_API_KEY=개발용 값
VITE_FIREBASE_AUTH_DOMAIN=개발용 값
VITE_FIREBASE_PROJECT_ID=개발용 값
VITE_FIREBASE_STORAGE_BUCKET=개발용 값
VITE_FIREBASE_MESSAGING_SENDER_ID=개발용 값
VITE_FIREBASE_APP_ID=개발용 값
```

### Vercel Production

Production 환경변수에만 실제 운영 프로젝트를 연결한다.

```env
VITE_DATA_ENV=production
VITE_ENABLE_CLOUD_SYNC=true
VITE_FIREBASE_API_KEY=운영 값
VITE_FIREBASE_AUTH_DOMAIN=운영 값
VITE_FIREBASE_PROJECT_ID=study-planner-19670
VITE_FIREBASE_STORAGE_BUCKET=운영 값
VITE_FIREBASE_MESSAGING_SENDER_ID=운영 값
VITE_FIREBASE_APP_ID=운영 값
```

환경변수 변경은 새 배포부터 적용된다.

## Firebase 콘솔 최초 설정

1. Firebase Authentication에서 Google 제공업체를 활성화한다.
2. Vercel 운영 도메인과 필요한 Preview 도메인을 승인된 도메인에 등록한다.
3. 저장소의 `firestore.rules`를 운영 프로젝트에 배포한다.
4. `owo2002@gmail.com` 또는 `shjo1218@gmail.com`으로 로그인한다.
5. 최초 로그인 시 본인의 UID로 `allowedUsers/{uid}` 문서가 안전하게 자동 생성된다.
6. 그 외 Google 계정은 초대 문서를 만들 수 없고 앱에서 차단된다.

다른 사용자를 추가할 때는 같은 방식으로 `allowedUsers/{새 UID}` 문서를 만들고 `role: "user"`를 지정한다.

## 기존 Firebase 데이터 이전

기존 데이터는 루트의 `planner_*` 컬렉션에 남겨둔다. 즉시 삭제하지 않는다.

1. 위 Google 로그인 설정과 보안 규칙 적용을 완료한다.
2. Vercel Production의 설정 화면을 연다.
3. `기존 데이터 확인`을 눌러 발견된 항목 수를 확인한다.
4. `백업 후 안전하게 복사`를 누른다.
5. 기존 루트 데이터가 JSON 파일로 먼저 다운로드되는지 확인한다.
6. 데이터가 `users/{조성현 UID}/planner_*`로 복사된다.
7. 같은 ID가 이미 있으면 `updatedAt`이 더 최신인 데이터만 사용한다.
8. 원본과 복사본의 개수 및 주요 화면을 확인한다.
9. 충분한 확인 기간이 끝날 때까지 기존 루트 컬렉션은 삭제하지 않는다.

이전 기능은 다음 조건을 모두 만족할 때만 표시된다.

- 클라우드 동기화 활성화
- `VITE_DATA_ENV=production`
- 로그인 사용자가 기존 전체 데이터 복사 권한을 가진 허용 계정

## 배포 전 필수 확인

- 로컬 `.env.local`에 운영 Firebase 설정을 넣지 않았는지 확인
- Vercel Preview가 운영 Firebase 프로젝트를 바라보지 않는지 확인
- Production에서만 운영 Firebase가 활성화되는지 확인
- `allowedUsers`에 등록하지 않은 계정이 차단되는지 확인
- 사용자 A가 사용자 B의 경로를 읽거나 쓰지 못하는지 규칙 테스트
- 기존 데이터 JSON 백업 및 이전 결과 확인
- 사이트 데이터 삭제 후 같은 Google 계정으로 복구되는지 확인

## 백업 정책

- IndexedDB: 오프라인 및 기기 로컬 사본
- Firestore: 사용자별 운영 데이터
- JSON 내보내기: 비상 복구용 수동 백업
- Firebase Storage 도입 후: 첨부파일 ZIP 또는 별도 버킷 백업

Firebase 동기화는 백업을 완전히 대체하지 않는다. 월 1회 JSON 백업을 권장한다.
