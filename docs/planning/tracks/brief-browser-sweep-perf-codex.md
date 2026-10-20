# 브라우저 전수 점검에서 나온 병목 (원장님 2026-10-20 «직접 브라우저로 확인하면서 병목현상 전수체크»)

리드가 운영(today.aywa.co.kr, 슈퍼관리자 계정, Orca 브라우저 1685px)에서 메뉴마다 열고 Resource Timing · Long Task 로 잰 값. 문제없던 곳: 시험지 만들기(재방문 68ms에 화면, 요청 0.3초) · 문제 추출 · 내 시험지(28문항 시험지 열기 0.26초) · 홈 · 관리 콘솔(0.5~1초) · 개념 백지.

| 순위 | 화면 | 실측 | 의심 원인(리드가 본 코드) |
|---|---|---|---|
| 1 | 교재 제작 | `GET /api/textbook/quick-create?schoolLevel=middle&grade=2&semester=1` **5,393ms** | `src/lib/textbook/server/quickCreate.ts:119 listQuickCreateUnits` — 학년 문항 전부의 `content`·`answer` 를 읽어 행마다 `classifyFormat` + 내용 문자열로 중복 제거. 문항 형식은 이제 DB 칸 `problem.actual_format`(+버전·digest — main 6f1fef46f · 5051fea68 의 읽기 규칙)에 있다 → 저장된 형식을 쓰고, 중복 제거·집계는 SQL(예: md5(btrim(content)))로. 결과 수는 지금과 **완전히 같아야**. |
| 2 | 교재 제작 | `GET /api/textbook/books` 1,325ms | 확인 후 줄일 것 |
| 3 | 오늘의 기억 · SRS (작업실 · `/admin/math-srs` 둘 다) | `GET /api/math-srs/course` 1,351~1,587ms (11KB) | 확인 후 줄일 것 — 학생 전원의 기록 JSON 통째 읽기 의심(전 감사에서 `loadSrsRoster` 0.5초 · 1.2MB) |
| 4 | 연산대장 | 화면 열 때 **메인 스레드 멈춤 981ms**(Long Task 하나) + `POST /api/studio/problems/labels` 860ms + catalog 425ms(53KB) | 렌더 중 무거운 계산(카탈로그 전체 전개 · 모든 유형 미리보기 등) 찾기 — 성능 프로필로 원인 함수 확정 후, 보이는 것만 계산 · 메모 · 나눠 그리기 |
| 5 | 수업 · 학생 관리 | 요청이 **차례로** 이어짐: studio/teaching(+810) → classes(+2127) → students · progress · progress-plan(+2473) — 다 뜨기까지 2.8초 | 서로 기다릴 필요 없는 요청을 함께 보내기(반 목록과 첫 반 상세를 서버에서 한 번에 주거나, 클라이언트 폭포 제거) |
| 6 | 오늘의 개념 | `GET /api/concept` 883ms | 확인 후 줄일 것 |

## 규칙
- 화면 모양 · 문구 · 동작 결과는 바꾸지 않는다(D-07). 결과가 같음을 시험으로 잠근다(전/후 응답 비교).
- 공유 DB 는 **읽기만** — 전/후 측정 스크립트 `scripts/qa/measure-sweep-20261020.ts` 를 남기고 3회 실측 표를 보고서에. 실행: `npx tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env …`. 비밀값 · 개인정보 출력 금지. 학생 SRS 흐름을 운영 DB 로 돌리지 말 것(읽기 측정만).
- DB 스키마 변경이 필요하면 하지 말고 초안(`prisma/drafts/`)과 근거만.
- 4번은 브라우저 프로필(Playwright + 로컬 dev 서버, 로그인 없이 도는 `/dev` 화면이나 시험 픽스처)로 원인을 확정한 뒤 고친다.
- 관련 시험 · `npm run type-check` · 변경 파일 eslint · `npm run lint:affordance`. 커밋 금지. 보고서 `docs/planning/tracks/reports/browser-sweep-perf-codex-20261020.md`(항목마다 전/후 · 고친 것 · 못 고친 것과 까닭).
