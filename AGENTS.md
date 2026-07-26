# Codex 작업 안내

이 프로젝트에서 작업을 시작할 때 `README.md`와 `VERSION.md`를 읽는다.
데이터·인증·동기화 작업이면 `DATA_STORAGE.md`도 읽고, 과거 구현 세부사항이 필요하면 `CHANGELOG_DETAIL.md`를 확인한다.

사용자에게 전달되는 기능, 화면, 데이터 구조 또는 동작을 변경했다면 `VERSION.md`에 배포 예정 내용을 기록한다. 실제 버전 번호와 업데이트 내역의 확정은 Production 배포 시 한 번만 동기화한다.

웹 업데이트 화면은 큰 변화만 1~3줄로 요약한다. 상세 구현 내역은 `CHANGELOG_DETAIL.md`에만 기록한다.

작업 완료 전 다음 명령을 실행한다.

```text
npm run test
npm run build
```
