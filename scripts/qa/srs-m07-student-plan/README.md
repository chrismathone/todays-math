# M-07 학생 목표·계획 조작 제거 검수

리드가 브라우저/서버 순번을 명시적으로 허용한 뒤에만 실행한다.

```sh
node scripts/qa/srs-m07-student-plan/verify.mjs --browser-granted
```

실제 `StudentAppShell`, `StudentMathExplorers`, `StudentCourseSrs`, globals,
KaTeX CSS와 로컬 Pretendard를 읽는다. Next의 navigation/link/dynamic만 Vite
어댑터로 연결한다. 화면·엔진·수식 렌더러는 실제 제품 코드다. 서버 전용
선수학습 flag는 이 fixture 안에서만 off로 정의하고 환경파일은 읽지 않는다.
`data.ts`는 기존 목표·수집 카드·교사 계획·계획 없음·일시정지를 가진 합성
메모리 snapshot이다. 학생 fetch는 메모리 응답만 받는다. 해설 읽기와 실제
코스 엔진의 메모리 시작·응답·풀이 확인만 허용하고 나머지 POST는 실패한다.
실제 계정·DB·API·유료 서비스에는 연결하지 않는다.

390/1440에서 옛 탐험 홈과 공부책 분기, 코스 계획 있음/없음/일시정지를
걷는다. 설정 열기, 기기 스위치, Esc, 도감, 뜻·해설, 앞개념 Enter와 닫기를
확인한다. 코스는 시작→모바일 예와 연습→문제 풀기→모르겠어요→풀이→알겠어요→다음 문제를 걷는다.
학생 목표/계획 조작 없음, 기존 계획의 15문제 표시와 불변,
가로 넘침, pageerror/console.error, 뜻밖의 요청을 기록한다.
외부 URL과 실제 `/api/` 네트워크는 차단한다.

실패해도 `finally`에서 자신의 Chromium 한 개와 서버 종료를 기다린다.
증거는 `/Users/pss/Desktop/creative/display-survey/srs-m07-20261021/`에 저장한다.
풀이의 실제 KaTeX 렌더와 폰트를 기다려 캡처한다. `--study-only`는 같은 두 폭의
공부 장면만 `study-complete/`에 별도 저장한다(기존 증거 보존).
PNG 직접 검수와 리드에게 사용권 반환을 마친 뒤 보고서를 정리한다.
현재 작업의 운영 검수나 학생 공부 결과를 대신하는 fixture가 아니다.
