# M-07 학생은 둘러보기 — 원천 점검과 구현 (2026-10-21)

기준 `eeabac9bb` (착수 시 HEAD = origin/main). 결정 5와 전용 브리프만 범위다.
리드 `term_ac71210e-74fb-461d-bba8-8793c5889a8d`가 A 운영 Ready를 확인한 뒤 B를 배포한다.
M02/M10 `5dd0816af`, scope 후보, 엔진 가지는 합치지 않는다.

## 1. 먼저 보고하는 원천·역할·기존 클라이언트 영향

| 원천 / 실제 진입                                                                                                   | 역할과 현재 동작                                                                                                                                        | A / B 및 기존 클라이언트 영향                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/learn/page.tsx` → `StudentMathExplorers` → `ExplorerConceptMemory` → `ExplorerHome`                              | 실제 학생 기본 화면. fading 켜짐이면 studyBook으로 기기 설정만 보임. fading 꺼짐/기억학습 없는 렌더에서는 옛 학년·목표 설정이 남음                      | A: 모든 분기에서 학년/목표 폼과 `course`/`goal` 호출 제거. 소리·움직임 기기 설정은 유지                                                                                               |
| `StudentMathExplorers` → `ExplorerCardDialog.onSetGoal`                                                            | 도감 및 카드 상세의 목표 설정 단추 → `send({type: "goal", unitId})` → `POST /api/learn/math-explorers`                                                  | A: 단추·prop·호출 제거. 도감, 뜻·해설, 앞개념, 탐색 유지. 기존 목표는 계속 읽음                                                                                                       |
| `ExplorerHome`의 도감 카드 선택 → `StudentMathExplorers.detailId`; `ExplorerConceptMemory`의 개념 학년/검색        | 도감 카드 선택은 로컬 상세만 바꿈. 개념 목록의 학년은 catalog 읽기, 검색은 로컬 거르기이며 탐험 course/goal과 별개                                      | 유지. 도감 열기·카드 열기·닫기에서 POST 없음 확인. `ExplorerHome`에는 별도의 읽기 전용 단원 picker가 없으며 제거 대상 학년·단원은 저장용 설정임                                       |
| `ExplorerBankActivity` → 동적 `StudentCourseSrs`                                                                   | 현재 앱에서는 expedition prop으로 공부/재개. 코스 독립 화면은 `/dev/mobile-elementary-review-qa`에도 존재. `/learn/math-srs`는 `/learn`으로 redirect    | A: 독립 렌더에 남은 학습 설정/시작 진도 폼·단추·`saveOwnCoursePlan` 호출 제거. 문제 시작/복습/재개·계획 표시 유지                                                                     |
| `courseApi.saveOwnCoursePlan` → `POST /api/learn/math-srs/course/plan` → `handleCourseStudentRequest(..., "plan")` | `requireStudent` 학생 계정 전용, 교사 세션은 학생 아님. `setCoursePlan`을 CAS 안에서 호출                                                               | A: UI 연결 및 전용 클라이언트 helper 제거. B 검토안: 허용 목록에서 POST 제거 + 직접 route도 인증/origin 확인 뒤 403, CAS 이전 거절. 구 탭은 B 이후 저장 실패; A Ready가 선행되어야 함 |
| `POST /api/learn/math-explorers` → `handleExplorerRequest` → `changeExplorer` → `applyExplorerAction`              | 학생 전용 HTTP. `course`/`goal` 외 시작/답/뜻·해설/보상 등 여러 action이 공존                                                                           | B 검토안: parsed studentId 확인 뒤 `course`/`goal`만 403, `changeExplorer` 이전 거절. endpoint 전체와 공유 action 계약/engine은 유지. 구 탭의 해당 두 action만 실패                   |
| `CourseDashboard` → 공용 `CoursePlanForm` → `saveCourseStudentPlan` → `/api/students/{id}/math-srs/course`         | 교사/admin의 계획 writer. `courseTeacherRoutes`의 메뉴·학생 소유권·반/지점 관문을 거쳐 `setCoursePlan`                                                  | 유지. 공용 폼·계약·교사 클라이언트/helper·route 변경하지 않음                                                                                                                         |
| 학생 계정 패널 → `saveExplorerTeacherSettings` → `/api/admin/students/{id}/explorer-settings` → `teacherSettings`  | 교사/admin 설정. 같은 `applyExplorerAction`의 `course`/`goal`을 내부에서 호출                                                                           | 유지. engine에서 두 action을 삭제/거절하면 교사까지 막히므로 HTTP 학생 경계에서만 닫음                                                                                                |
| `/dev/explorer-srs`의 `StudentMathExplorers preview`                                                               | 메모리 FadingSource + snapshot, `preview`일 때 send/읽기 없음. 교사 writer가 아님                                                                       | 학생 화면을 공유하므로 목표 조작을 같이 제거. 메모리 미리보기와 개념 탐색 유지                                                                                                        |
| `withDefaultCoursePlan`, `courseStudentDto`, `explorerView`, 저장 계약                                             | 교사 코스 plan 우선. plan 없으면 기존 elementary explorer goal, 없으면 정확한 반 학년 초3~6 + 한국 학기. 읽기는 저장하지 않음. 쓰기는 최신 CAS에 재적용 | 전부 유지. 기존 goal/plan/session/mission/receipt/FSRS/followUp/relearn/guide 및 reader floor 무변경                                                                                  |

학생 접근 관문 `studentRouteAccess.ts`는 코스 plan POST를 명시 허용 중이다.
탐험 POST는 정상 학습에 필요하므로 유지하고 payload별 거절은 route에서만 한다.
기존 탭의 403은 기존 실패 UI로 표시된다. 브라우저 새로고침 강제나 호환 필드 추가는 제안하지 않는다.

## 2. 두 단계 순서와 검토 요청

1. 실제 컴포넌트 RED → A 화면·호출 제거 → GREEN, 관련 회귀/전체 타입/ESLint/affordance/diff → A만 로컬 커밋.
2. 리드가 위 표와 B의 HTTP 경계 거절 방식을 확인하면 B만 별도 로컬 커밋. 공유 engine·계약의 옛 action/필드/reader는 유지.
3. 리드가 A를 반영하고 운영 Ready 확인. 그 뒤에만 B 반영/배포. 현재 세션에서 main/build/push/deploy/DB/운영 UI 쓰기는 하지 않음.

브라우저·서버는 명시 허용 전 실행하지 않았다. 사용자 허용 뒤 로컬 검증했고 19:03 KST에 반환했다. 풀이 수식 캡처 보완을 리드가 별도 허용한 뒤 19:07 KST 재반환했다(아래 기록).
증거 위치: `/Users/pss/Desktop/creative/display-survey/srs-m07-20261021/`.

## 3. 구현·검증 기록

### A — 화면·호출 제거

- `ExplorerCardDialog` 목표 단추/prop와 `StudentMathExplorers`의 목표 send를 제거했다.
- `ExplorerHome`의 비-studyBook 분기에 남은 학년·목표 폼을 제거했다. 기기 설정·도감·해설·앞개념·단원/카드 표시는 유지했다. CSS/디자인 토큰은 바꾸지 않았다.
- `StudentCourseSrs`의 저장 폼·설정 단추·전용 상태/초점 효과와 `saveOwnCoursePlan` client helper를 제거했다. 삭제된 폼으로 유도하던 두 설명도 걷고, 이미 있던 중립 제목/추천 설명을 사용했다(새 문구 없음).
- 교사 `CoursePlanForm`, `CourseDashboard`, teacher/admin writer, 모든 API/관문/엔진/계약/reader를 그대로 두었다. A만 적용한 서버는 구 탭의 저장 요청을 여전히 받는다.
- React 검토: 삭제한 폼에만 쓰던 hook/ref/import 제거, 남은 기기 설정과 dialog 초점/취소 동작 유지. 신규 제품 상태/효과/디자인 없음.

### 실제 시험과 한계

| 검사                 | 결과 / 증거                                                                                                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 실제 컴포넌트 RED    | 도감 목표 단추, 일반/재도전 탐험 설정, 코스 계획 있음/없음 폼을 잡는 5건 실패. `A-red.log`                                                                                                                                                                                          |
| 초기 GREEN           | 핵심 2파일 80건 통과. `A-green-initial.log`                                                                                                                                                                                                                                         |
| 최종 관련 회귀       | 17파일 295건 통과, `--maxWorkers=3`. `A-regression-final.log`                                                                                                                                                                                                                       |
| 역할·기존 기록 보존  | `mathExplorerSettingsRoutes`, `srsStoredContractWalk`, `courseSrsAccess` 3파일 27건 통과. 교사/admin 쓰기, 학생/교사 구분, 기존 명시 목표·계획·미션·일자별 재개를 기존 경로로 검증. `A-record-role-regression.log`                                                                  |
| 실제 코스 client     | `StudentCourseBrowseOnly`는 API helper를 mock하지 않는다. 계획 있음/없음/paused 각각 실제 GET 한 번, POST 없음, 15문제 교사 계획 표시 및 저장 snapshot 불변                                                                                                                         |
| 기존 네트워크 재시도 | 삭제된 학년 저장을 누르던 시험을 학습 시작 요청으로 바꾸고 같은 요청 id/revision 재전송, 성공 후 오류 해제/세션 생성까지 확인                                                                                                                                                       |
| 전체 type-check      | 실패. `scripts/qa/arithmetic-angle-presentation-verify.ts(36,52)` TS2345(두 Playwright Page 타입), `scripts/qa/paperProbe.tsx(174,24)` TS2769/TS2321(두 PostCSS 타입). 알려진 QA 2파일의 3진단만 남음. `A-type-check-final.log`; 제품/기대값/tsconfig/공유 의존성으로 우회하지 않음 |
| ESLint               | 변경 TS/TSX + 신규 fixture/검수 script에 오류·경고 0. `A-eslint-final.log`, `A-fixture-eslint.log`                                                                                                                                                                                  |
| affordance / diff    | 통과. `A-affordance-final.log`, `git diff --check`                                                                                                                                                                                                                                  |
| fixture 준비         | 실제 앱 shell, globals/KaTeX/로컬 폰트, 저장 목표/수집 카드/교사 plan snapshot, 390/1440 검수 script 준비. `explorerStateSchema`로 메모리 snapshot parse 확인. script 문법 검사 통과                                                                                                |
| Browser / PNG        | 5 scenes x 390/1440 passed (`browser.json`); math-render recapture passed (`study-complete/browser.json`). See the dated verification and release record below.                                                                                                                     |

중간 확장 회귀는 삭제된 목표 단추를 계속 찾던 chest 시험 하나가 멈추면서 후속 시험으로 실패가 이어졌다. 해당 시험을 해설 읽기 잠금으로 옮기고 정상적으로 대기 저장을 종료하도록 한 뒤 최종 295건이 통과했다. 신규 실제 client 시험의 router mock도 안정된 객체로 바로잡아 불필요한 재읽기를 없앴다. 최종 로그에는 이 실패가 남지 않는다.

포맷터에 디렉터리를 건넨 한 번은 ExFAT `._*` 메타파일을 읽어 실패했다. 실제 소스 파일명을 명시한 포맷 재실행은 통과했고 제품/설정은 바꾸지 않았다.

### 허용된 브라우저 검수와 반환

허용 후 실제 검증 범위와 한계를 구분해 기록한다.

- 사용자 명시 허용 뒤 설치된 Chromium headless shell 한 개와 로컬 Vite 서버만 사용했다. 운영 test_s 탭·기존 엔진·실제 API/DB는 건드리지 않았다. 환경파일은 읽지 않으며 서버 전용 선수학습 flag를 fixture에서만 off로 정의한다. 제품 flag/엔진 변경 없음.
- 합성 snapshot으로 옛 탐험/공부책, 교사 계획 있음(15문제)/paused/없음 5상태를 두 폭에서 검증했다. 도감·통분 카드·앞개념·뜻과 해설, 기존 목표 표시, 설정의 기기 스위치와 키보드 Space/Enter/Esc를 확인했다. 목표/계획 버튼·폼 및 해당 요청은 0이었다.
- 정상 공부는 실제 course 엔진의 메모리 시작→첫 문제 «아직 모르겠어요»→정답과 풀이→«알겠어요»→두 번째 문제로 이어졌다. 메모리 3회 갱신, 기존 계획 불변. 모바일의 «예와 연습 보기»를 거쳐 실제 «문제 풀기»를 눌렀다. 서버/운영 학습 저장 검증은 아니다.
- 10상태에서 외부/실제 API·금지 fetch 0, console.error/pageerror 0, 루트 가로 넘침 0, 폰트 로드 true. `browser.json`은 모두 통과했고 `browserClosed/serverClosed`가 true다. 19:03 KST `msg_7f32bb269d19`로 문서 정리 전 반환했다.
- 반환 후 PNG 직접 확인에서 첫 공부 풀이 캡처가 지연 MathText 표시 전임을 발견했다. 그 PNG와 `browser.json`, 진단 당시 `study-failed.png`를 보존했다. 리드 재허용 `msg_a8841b387bee` 뒤 **제품 변경 없이** 풀이 region의 `.katex`와 답 표시/폰트를 기다려 390/1440을 다시 찍었다. 보완본은 `study-complete/`에 별도 저장했고 두 장의 정답·풀이 수식과 다음 문제 PNG를 직접 확인했다. `study-complete/browser.json`에서도 오류·금지 요청·넘침 0, finally await 종료 true. 19:07 KST `msg_bccaa695bd30`로 다시 반환했다. 이후 브라우저/API 무조작.
- 직접 확인한 대표 증거: `explorer-card-{390,1440}.png`, `book-settings-390.png`, `explorer-settings-1440.png`, `explorer-home-390.png`, `book-home-{390,1440}.png`, `paused-home-{390,1440}.png`, `setup-home-{390,1440}.png`, `study-complete/study-solution-{390,1440}.png`, `study-complete/ready-home-390.png`.
- 초기 검수 스크립트의 OS reduced-motion switch 선택, 서버 전용 flag 부재, 모바일 책의 앞장 전환 대기 및 지연 수식 캡처를 fixture에서 바로잡았다. 기존 setup의 완료 배지/표현은 M02 범위이므로 이번 목표·계획 조작 제거에서 바꾸지 않았다. 빈 concept source인 공부책의 기억 학습 시작은 비활성이며 코스 정상 공부는 별도의 ready 장면에서 검증했다.

### A 파일 목록(명시 stage)

제품 5파일:

- `src/components/math-explorers/ExplorerCardDialog.tsx`
- `src/components/math-explorers/ExplorerHome.tsx`
- `src/components/math-explorers/StudentMathExplorers.tsx`
- `src/components/math-srs/StudentCourseSrs.tsx`
- `src/components/math-srs/courseApi.ts`

시험 11파일:

- `src/__tests__/components/StudentCourseBrowseOnly.test.tsx` (신규)
- `src/__tests__/components/StudentMathExplorers.test.tsx`
- `src/__tests__/components/StudentCourseSrs.test.tsx`
- `src/__tests__/components/ExplorerChestPress.test.tsx`
- `src/__tests__/components/ExplorerHomeAtelier.test.tsx`
- `src/__tests__/components/ExplorerHomeSound.test.tsx`
- `src/__tests__/components/ExplorerConceptHeadA11y.test.tsx`
- `src/__tests__/components/ExplorerMathKatex.test.tsx`
- `src/__tests__/components/StudentLearningSoundsIntegration.test.tsx`
- `src/__tests__/unit/courseSrsClientApi.test.ts`
- `src/__tests__/unit/courseFollowUpClientApi.test.ts`

검수 7파일: `scripts/qa/srs-m07-student-plan/`의 `data.ts`, `fixture.tsx`, `fixture.css`, `index.html`, `server.mjs`, `verify.mjs`, `README.md`.
보고서 1파일: 이 문서. 총 24파일. 콘텐츠·그림·일정·FSRS·분량·채점·저장 형식·엔진 울타리 혼입 없음.

### B / 납품 상태

리드가 2026-10-21 18:52 KST에 원천표와 B 방식을 승인했다(`msg_da0f43e30c19`). A 커밋 시점에는 B를 아직 구현하지 않았고, A 뒤 별도 로컬 커밋으로 진행한다. 리드에게 A 로컬 SHA와 브라우저 차례 요청을 전달한다. A 운영 Ready 전 B 배포 금지. 리드 main 반영/종료 확인 전 현재 가지·트리를 보존한다.
