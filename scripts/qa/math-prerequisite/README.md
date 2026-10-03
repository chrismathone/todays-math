# 선수 확인의 격리 브라우저 검증

승인한 `plan-v03.md`의 마지막 구현 검증용이다. 실제 학생·교사 API 핸들러와 React 플레이어/현황 화면을 사용한다. 인증과 DB는 메모리 fixture이며 운영 DB에 접속하지 않는다. Next 탐색과 이미지/동적 로딩은 Vite에서 실행할 수 있게 작은 어댑터로 대체한다. 전체 Next 배포 검증은 별도의 `npm run build`로 수행한다.

학생 A는 최근 완료한 목표 두 세션의 직접 실패가 있어 선수 확인 뒤 목표 학습으로 돌아간다. B는 보존된 완료 실패가 하나뿐이어서 기존 목표 복습을 유지한다. C는 동일한 두 실패를 갖지만 해당 학생의 원천 세션 ID에 한해 공급 실패를 주입한다. C의 학생 조회와 교사 상세 조회 모두 같은 공급 부족을 계산하며 다른 학생의 공급에는 개입하지 않는다. A/B는 실제 생성기와 공급기를 쓴다.

서버는 `127.0.0.1:4336`에만 열리며 `/__fixture/*`는 이 검증 서버에만 존재한다. 검증 중에만 `MATH_PREREQ_CHECK=on`을 stub하고 종료 시 되돌린다. 기본 테스트에는 이 지속 서버가 포함되지 않는다.

저장소 루트에서 다음 순서로 실행한다. 첫 명령은 별도 터미널에 유지한다.

```powershell
npx vitest run --config scripts/qa/math-prerequisite/vitest.server.mts
node scripts/qa/math-prerequisite/browser-check.mjs smoke
node scripts/qa/math-prerequisite/browser-check.mjs students
node scripts/qa/math-prerequisite/inspect-browser.mjs
node scripts/qa/math-prerequisite/teacher-controls.mjs
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4336/__fixture/stop
```

서버가 READY로 표시되거나 포트가 열린 뒤 즉시 smoke를 실행한다. 로딩 완료한 실제 문제와 교사 현황, 빈 화면/오류 overlay/페이지 예외를 확인한다. `students`는 A의 다섯 답을 실제 API에 저장하고 복귀·B의 기록 격리를 확인한다. `inspect-browser`는 C의 시작 비활성화/자동 POST 없음과 학생 선택 전 교사 연결도·선택된 학생의 부분 근거·PC/390/320 화면을 확인한다. 처음부터 다시 실행하려면 서버를 종료해 fixture를 초기화한다. 로컬에 설치된 Microsoft Edge와 기존 Playwright를 사용한다.

`teacher-controls`는 네 필터의 동시 적용, 필터 밖 관계 단원으로 이동, 수동 선수 후보 제외, 고등학교 도움·과목 관계를 실제 화면에서 확인하며 교사 저장 요청이 늘지 않는지도 검사한다. C의 계획 변경 뒤 첫 추천에는 기존 만기 복습이 우선될 수 있다. 같은 목표 단원에서 새 풀이를 실제로 시작할 수 있는지 확인한다.

결과는 `docs/planning/tracks/reports/math-prerequisite-20261003/browser-shots/`에 저장한다. 종료한 서버 테스트는 세 학생의 저장 상태를 기존 strict parser로 검사한다. 이 검증은 실제 운영 학생의 진단 정확도나 교육 효과를 증명하지 않는다.
