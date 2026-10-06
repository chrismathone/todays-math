# 지시서 — 교사 «학생 현황» Hi-fi (codex ⑤)

2026-10-06 · 리드 → codex ⑤ · 워크트리 `srs`

## 정해진 것 (원장님 «추천방안으로 진행» · «연결 가능한 hifi 수준되면 연결»)

Wire 보고서(`docs/planning/tracks/reports/fading-teacher-wire.md`)의 «원장님이 고르실 것» 넷이 추천대로 정해졌다.

| 물음                | 정해진 것                                                                  |
| ------------------- | -------------------------------------------------------------------------- |
| 기본 구조           | **B — 살펴볼 학생 먼저**(위 확인 명단 · 아래 전체 명단 · 오른쪽 학생 상세) |
| 처음 펼칠 학생 상세 | 밀림 학생 하나(없으면 첫 학생) — Wire 그대로                               |
| 처음 볼 반 범위     | 전체 반                                                                    |
| «미리 보기»의 자리  | 머리 오른쪽 — «저장되지 않음»을 같이 적는다                                |

## 할 일

1. **Hi-fi 4안** — B 의 구조는 그대로 두고 겉(밀도 · 강조 · 딱지와 표의 결 · 상세의 짜임)을 네 가지로. `05` §8.9 의 작업실 말씨와 이미 있는 토큰만 쓴다(새 색 · 새 글꼴 · 아이콘 묶음 · 의존물 없음 · `05` §0 의 금지 목록).
   볼 곳은 `/dev/fading-teacher-hifi?variant=H1`(… `H4`) · `&class=0..3` — Wire 와 같은 표본(`teacher/fixture.ts` — 숫자는 `teacher.ts` 의 함수가 낸 값)을 쓴다.
2. **하나를 추천하고 그 안을 제품 부품으로 짓는다** — `src/components/fading/teacher/TeacherFadingStatus.tsx`.
   자료는 밖에서 받는다: 명단을 주는 함수와 학생 하나를 주는 함수(계약 `src/contracts/fadingTeacher.contract.ts` 의 두 꼴 그대로 — `GET /api/math-srs/fading` · `GET /api/students/{id}/math-srs/fading` 의 `{ data }`). 부품 안에서 `fetch` 주소를 굳히지 않는다 — API 구현(`teacher/apiSource.ts`)과 표본 구현을 같은 꼴로 둔다.
   상태를 다 그린다: 싣는 중 · 빈 반 · 학생 0 · 실패(다시 시도) · **닫혀 있음(404 — 서버 문이 꺼진 배포판)** · 권한 없음(403).
   «미리 보기»는 학생 앱을 저장 없이 띄운다 — 이미 있는 `FadingPreview`(`createLocalFadingSource`)를 쓴다(그 파일은 고치지 않는다 · 필요한 것이 있으면 리드에게).
3. 🔴 **제품에 꽂지 않는다** — `UnifiedWorkspace` · 기존 `math-srs` 화면 · 접근 관문은 건드리지 않는다. 리드가 Hi-fi 를 검수한 뒤에 따로 지시한다(원장님 «연결 가능한 hifi 수준되면 연결»). 그 사이 리드가 이 워크트리를 커밋하고 main 을 합친다 — 🔴 정정: main 의 99커밋은 영어듣기 폐기와 교재 쪽이고 `UnifiedWorkspace` · 학생 관문 · `math-srs` 는 고치지 않았다(`git diff --name-only <갈림점> origin/main` 211파일에서 확인). 병합이 꽂는 일을 막는 것은 아니다.

## 지켜야 하는 것

- 숫자 · 사유 · 날짜는 **받은 값**이다. 화면에서 다시 세거나 문턱을 다시 만들지 않는다. 뭉친 점수 · 기억 보존율 · 정답률 · 백분율 · «마스터» 표시는 없다(Wire 와 같다).
- 학생의 문장 · 빈칸의 답을 교사 화면으로 가져오지 않는다 — 계약에 있는 용어와 상태 · 개수 · 날짜 · 평가 건수만.
- D-30 — 표의 행 · 이름 · 딱지는 누르는 것이 아니다. 누르는 것은 행 안의 «보기» 단추다. 손가락 커서와 hover 배경은 실제 단추에만.
- 문구는 간결 · 사무적(D-08). 느낌표 · 이모지 없음.
- 작업실의 실제 폭에서 잰다 — 1280(옆 메뉴 240px) · 768(212px). 넘침 0 · 누르는 것 44px 이상 · 글자 12px 이상 · 낱말 단위 줄바꿈(`word-break: keep-all`).
- 🔴 소단원 · 대단원 이름은 수식 렌더러에 넣지 않는다(«1-5-1»이 빼기로 조판된다 — 덧붙임 3). 용어에만 `FadingMath`.

## 만지는 곳

`src/components/fading/teacher/**` · `src/app/dev/fading-teacher-hifi/**` · `src/__tests__/components/fadingTeacher*.test.tsx` 뿐이다.
`src/lib/fading` · `src/contracts` · 학생 앱의 파일(`src/components/fading/*.tsx` — 지금 codex ④ 가 고치는 중이다)은 만지지 않는다.

개발 서버는 `http://localhost:3443` 에 떠 있다(새로 띄우지 않는다 · 지금은 main 의 환경값으로 떠 있다 — 🔴 개발 화면에서 실제 API 를 부르지 않는다 · 표본으로 그린다). 커밋 · 푸시 · 서버 문 `MATH_FADING` · DB 는 건드리지 않는다.

## 다 됐다는 기준

- 시험(없는 모듈의 빨강부터) — 네 안이 그려진다 · 제품 부품의 상태 여섯 · «보기»로 학생이 바뀐다 · 두 반에 등록된 학생 · 금지 표시가 없다 · 계약 스키마로 받은 값을 그대로 그린다.
- 자기 파일의 ESLint 0 · `node src/lint/check-affordance.mjs <자기 파일>` 0 · `tsc` 는 자기 파일 0(범위 밖 1건은 알고 있다).
- 4안 × 2폭 × 반 표본의 측정 0 과 캡처(`.qa-artifacts/fading-screens/teacher-hifi/`), Wire B 와 나란히 놓은 그림.
- 보고서 `docs/planning/tracks/reports/fading-teacher-hifi.md` — 네 안의 차이 · 추천과 까닭 · 제품 부품이 받는 것 · 꽂을 때 리드가 알아야 할 것(작업실의 어느 메뉴 · 어떤 틀 안에 놓일 것을 가정했는지).

막히거나 정할 것이 생기면 지어내지 말고 리드에게 묻는다.

## 덧붙임 — 제품에 꽂는다 (2026-10-06 · 리드가 H2 를 검수한 뒤)

리드가 `wire-B-vs-H2-1280.png` · `four-variants.png` 를 봤다. 연결할 수 있는 수준이다 — 원장님 «연결 가능한 hifi 수준되면 연결»에 따라 **H2 를 작업실에 꽂는다.**
리드가 이 워크트리를 커밋했고(커밋 셋) origin/main 을 합쳤다. 너의 Hi-fi 파일은 아직 커밋하지 않았다(그대로 있다).

### 꽂는 자리와 규칙

| 무엇                    | 어떻게                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 서버 문을 화면에 알리기 | `src/components/unified/WorkspacePage.tsx`(서버 부품)가 `fadingGate()`(`@/lib/fading/enabled` — `"off" \| "read" \| "on"`)를 읽어 `UnifiedWorkspace` 에 새 선택 prop `fadingGate` 로 넘긴다(생략하면 `"off"`). 화면에서 환경값을 읽거나 404 로 떠보지 않는다 |
| 작업실의 SRS 메뉴       | `UnifiedWorkspace` 의 `can("srs")` 자리에서 지금은 `<CourseDashboard textbookEnabled … />` 를 그린다. 이것을 새 부품 `src/components/fading/teacher/SrsWorkspaceView.tsx` 로 감싼다                                                                          |
| `"off"`                 | **지금과 글자 그대로 같다** — `CourseDashboard` 만 그린다. 탭도 새 요청도 없다(운영은 문이 꺼져 있다 — 보이는 변화가 0 이어야 한다)                                                                                                                          |
| `"read"`                | 위에 두 탭 — «기존 SRS 현황»(기본) · «오늘의 기억». 학생 쪽 길이 아직 닫혀 있어 새 현황은 전원 «시작 전»이므로 기존 것이 기본이다                                                                                                                            |
| `"on"`                  | 같은 두 탭 — «오늘의 기억»이 기본                                                                                                                                                                                                                            |
| «오늘의 기억» 탭        | `TeacherFadingStatus`(H2) + `createTeacherFadingApiSource({ branchId })` — 지점은 작업실이 이미 쥔 값(`currentUser.branchId` · 기존 SRS 화면이 지점을 다루는 방식과 같게). 탭을 처음 열 때 싣는다(그 전에는 요청 0)                                          |
| «미리 보기»의 자료      | 개념 은행 · 함정 · 그림은 크다 — **«미리 보기»를 누를 때 `import()` 로 싣는다**(작업실의 첫 묶음에 넣지 않는다). `TeacherFadingStatus` 의 `preview` 가 값만 받게 돼 있으면 «값 또는 값을 주는 함수»를 받게 넓혀라                                            |
| 탭의 생김새             | 작업실에 이미 있는 탭 · 구간 단추의 결을 그대로(새로 짓지 않는다). `role="tablist"` · 방향키 · 44px                                                                                                                                                          |

접근 규칙 · 메뉴 관문(`can("srs")`) · 교사 API · `CourseDashboard` 의 안은 건드리지 않는다. `src/lib/fading` · 계약도 그대로다(리드가 `enabled.ts` 에 `fadingGate` · `fadingReadable` 를 더해 두었다 — 읽기만 하라).

### 다 됐다는 기준

- 시험 — `"off"` 면 `CourseDashboard` 만 그려지고 교사 현황 요청이 0 이다 · `"read"` 는 기존이 기본 · `"on"` 은 «오늘의 기억»이 기본 · 탭을 열 때 처음 싣는다 · «미리 보기»를 누르기 전에는 은행을 싣지 않는다.
- `UnifiedWorkspace` 를 그리는 기존 시험과 전수 가드가 그대로 초록이다 — `npx vitest run src/__tests__/components src/__tests__/unit/englishFence.test.ts src/__tests__/unit/errorLogRouteCoverage.test.ts`(없는 파일은 빼고) 를 돌려 본다. 자기 파일의 ESLint 0 · 어포던스 0 · `tsc` 자기 파일 0.
- 개발 화면 하나 — `/dev/fading-teacher-hifi?product=read`(또는 비슷한 주소)에서 `SrsWorkspaceView` 를 표본 자료로 띄워 1280 · 768 을 잰다(실제 API 는 부르지 않는다). 리드가 그 뒤에 개발 서버를 `MATH_FADING=read` 로 다시 띄워 실제 명단으로 본다.
- 🔴 커밋 · 푸시 · 서버 문 · DB 는 건드리지 않는다. 끝나면 바꾼 파일 목록과 결과를 `worker_done` 으로.
