# 지시서 — 초5 혼자 공부: 틀렸을 때 «한 번 더 → 풀이» 화면 (codex, 2026-10-19)

확정: `docs/planning/05-design-system.md` **§8.25**(Hi-fi C — «첫 오답» · «풀이» 줄), 시안 `docs/design/mockups/srs-e5-hifi-20261019.html`(C 탭 · B. 틀렸을 때),
원장님 결정 2 · 6(`docs/planning/srs-e5-30day-plan-20261019.md` §2 · §3.2). 화면은 codex, 속은 Claude — **서버 계약은 이미 섰다**(아래 §2). 이번 일은 **은행 · 엔진 문제(코스)의 틀렸을 때 화면**이다.
탐험 개념 카드(맞다/아니다 · 문장 조립 · 예 모으기)의 같은 흐름은 탐험 기록에 따로 저장 칸이 필요해 **다음 일**이다 — 이번에는 건드리지 않는다.

## 1. 무엇을

`src/components/math-srs/StudentCoursePractice.tsx`(탐험 안의 은행 문제 `ExplorerBankActivity` 도 이 화면을 쓴다) · `courseApi.ts` · 관련 CSS.

| 순간 | 화면(§8.25) |
| --- | --- |
| 첫 오답(자동 채점 문제) | «다시 해 볼까요»(`--learn-warning`) · **같은 문제** · 보기 **표시 순서만** 섞는다(제출은 보기 값 그대로) · **고른 것 없는 상태로** 다시 — 앞서 고른 답에는 옅은 표시 «앞에서 고른 답»만(코발트 «선택됨»을 남기지 않는다) · «아직 모르겠어요»도 그대로 |
| 두 번째 답 | `POST /api/learn/math-srs/course/follow-up` `{ sessionId, problemId, action: "answer", submittedAnswer }` · «모르겠어요»면 `{ …, action: "answer", giveUp: true }` |
| 두 번째에 맞음 | «맞았어요» + «다음» → `{ action: "done" }` → 다음 문제 |
| 두 번째도 틀림 · «모르겠어요»(첫 답이든 둘째 답이든) · 스스로 평가 «다시 연습» | 문제 **아래로 이어진 종이**: 딱지 «다시 살펴봐요» · «정답과 풀이» · 정답 한 줄 + 풀이 글(응답의 `hint.answer` · `hint.solution`) · 그림 칸은 문제에 그림(`figureUrl`)이 있을 때만 오른쪽 단에 · 바닥 줄 «이 문제는 다음 복습에서 다시 만나요.» + **«알겠어요» 오른쪽**(폰은 전체 폭) → `{ action: "done" }` → 다음 |
| 자동 넘김 | **없앤다**(지금 `setTimeout(onNext, 1200)`) — 맞은 첫 답도 «다음»을 누를지, 지금처럼 짧게 넘길지는 지금 동작을 유지하고 보고(원장님 결정은 «틀렸을 때»만 정했다) |
| 새로고침 · 다시 들어옴 | 응답의 `problems[].followUp` 이 상태를 되살린다 — `awaiting`(다시 해 볼까요) · `correct` + `done: false`(맞았어요 · 다음) · `solution` + `done: false`(풀이 · 알겠어요). `done: true` 면 지나간 문제 |

회차 끝의 «오답 복습»(재도전 `retry`)은 지금 화면 그대로 — 서버가 즉시 풀린 문제를 큐에서 이미 뺀다.

## 2. 서버 계약(main `65cf31da1` 쓰는 쪽 · `d63f892fe` 읽는 쪽 — 고치지 않는다)

- **모든 코스 요청에 머리글 `x-course-follow-up: 1`**(`COURSE_FOLLOW_UP_HEADER` — `src/contracts/mathSrsCourse.contract.ts`). 이 머리글이 있어야 서버가 «모르겠어요» · «다시 연습»의 풀이 연 기록을 쓰고, 응답에 `followUp` 을 싣는다. 없으면 예전 그대로다(옛 탭 보호).
- 입력: `courseFollowUpInputSchema` · 응답: 기존 `courseStudentResponseSchema`(`problems[].followUp?: { state: "awaiting" | "correct" | "solution", done } | null`). 풀이 상태면 `hint` 에 정답 · 풀이가 온다.
- 다시 풀기는 **가장 최근에 틀린 자동 채점 문제 하나**만, 다음 문제를 풀기 전에 — 어긋나면 409(«다시 불러와 주세요» 처리는 지금 화면의 409 처리를 따른다). 같은 요청을 다시 보내면 같은 답.
- 서버는 «알겠어요» 전이라도 다음 회차를 막지 않는다 — **화면이** `done: false` 인 풀이를 닫기 전에 넘어가지 않게 한다.

## 3. 지킬 것

- 서버 · 계약 · 저장 꼴(`src/lib/**` · `src/contracts/**` · `src/app/api/**`)은 고치지 않는다. 필요한 값이 없으면 보고.
- §8.16 선택됨 · §8.18 번호 키캡(섞인 순서의 번호 키가 화면 순서를 따른다) · D-30 · D-08 · `prefers-reduced-motion` · 학생에게 어른 말 없음.
- TDD — RTL 로: 첫 오답 뒤 순서만 섞이고 선택 없음 · 앞서 고른 답 표시 · 두 번째 답이 follow-up 으로 간다 · 맞음/풀이/알겠어요 · 자동 넘김 없음 · `followUp` 으로 되살림 · 머리글이 모든 요청에 붙는다. 기존 시험이 1.2초 넘김을 붙잡고 있으면 새 확정에 맞춰 고친다.
- 정션 `node_modules` · `npm install` · `prisma generate` 금지 · dev 는 `--webpack` · 전체 `type-check` 는 끝에 한 번(돌리기 전에 한 줄 알림) · 단위마다 커밋(신원 `chrismathone@gmail.com` / `SUN`) · **푸시하지 않는다**.
- 다 되면 커밋 · 바꾼 파일 · 시험 결과 · PC 1366 / 폰 390 캡처(첫 오답 · 풀이 · 맞았어요) · 원장님께 물을 세부.
