# 연결 검토 — Claude · 루트의 코스 · 탐험 연결 (읽기 전용)

2026-10-03 · 루트가 `D:/todays-math` 에서 시험 · 병합하는 동안 읽기만 했다. 고친 것 · 돌린 것은 없다 — 시험 · tsc · 빌드는 이 검토에서 돌리지 않았고, 루트의 관문을 통과했다고 말하지 않는다.

## 대상

| | |
|---|---|
| main HEAD | `70abc9346` (검토 중 `d95e4c7b8` → `70abc9346` 으로 움직였다 — 와이어 기록 병합. 아래 파일과는 무관) |
| 미커밋 수정 | `courseAutomation.ts` · `courseServer.ts` · `courseRoutes.ts` · `expedition.ts` · `expeditionStart.ts` · `math-explorers/routes.ts` · `mathExpedition.contract.ts` |
| 새 파일 | `src/lib/math-prerequisite/{courseIntegration,display,requestIds}.ts` · `mathPrerequisiteIntegration.test.ts` · 픽스처 |
| 스냅숏 | `git diff -- src` sha256 앞 16자리 `2f6f62fc16eefa16`(08:13). 보고 직전에 다시 대 보니 같았고, 새 파일 셋도 바이트가 같았다 |

판단의 바탕은 내 모듈의 API(`994ae0bdb` · `b3a8a6485` 로 main 에 병합)다. 줄 번호는 위 작업 트리 기준이다.

## 1. 막는 것 — 셋 (08:13 에 루트에 바로 보냄 · `msg_ff4a928b325d`)

### B1. `display.ts` 가 없는 모듈을 부른다 — 꺼져 있어도 깨진다

- `src/lib/math-prerequisite/display.ts:6` — `import { GRAPH_CONTENT_HASH } from "./graph";`
- `src/lib/math-prerequisite/graph.ts` 는 `D:/todays-math` 에 없다(`ls` 확인). 저장소에서 `./graph` 를 부르는 곳은 이 한 줄뿐이다.
- `display.ts` 는 `expedition.ts`(`contextForDecision`)와 `courseServer.ts` 가 부른다. 그래서 스위치와 상관없이 **불러오는 순간** `/learn` 탐험 · 코스 DTO 경로 전체가 실패한다. tsc 도, `expedition.ts` 를 건드리는 시험도 그래야 한다.
- 덧붙여 `display.ts:17` 은 모듈을 불러올 때 `prerequisiteVersions(GRAPH_CONTENT_HASH)` 를 parse 한다. 해시가 잘못되면 꺼져 있어도 모든 코스 경로가 500 이다.

고칠 것: Codex 의 `graph.ts` 가 먼저 들어온 뒤에만 이 연결을 병합한다. `versions` 는 부를 때 만든다(지연).

### B2. 스위치를 켜면 시범 밖 학생의 미션이 멈춘다

- `src/lib/math-explorers/expedition.ts:593-596` — 켜져 있으면 `!course.plan?.enabled || mission.goal - mission.answered < 5` 일 때 **모든** 열린 초등 미션에서 `null` 을 돌려준다.
- 고치기 전에는 교사가 미션 도중 계획을 꺼도(교사 쓰기는 미션 중에도 통과한다 — `expedition.ts` 의 `settingsChanged`/`teacherPlanEdit`) 기존 대체 가지(현재 소단원 review)로 미션을 끝낼 수 있었다. 이제는 시범과 무관한 학생도 미션이 열린 채 멈춘다. 열린 초등 미션은 개념 활동 · 보충 카드까지 막는다(`updateExpedition` 가드).
- 계획 꺼짐 · 남은 분량 검사는 이미 `prerequisiteStep` 안에 있다(`policy.ts` — 계획 꺼짐 · 5문항 미만이면 `null`). 바깥에서 한 번 더 걸 까닭이 없다.

고칠 것: 593-596 을 지운다. 시범 결정이 `null` 이면 기존 사슬이 그대로 간다.

### B3. 공급 부족이 «오늘 다 했다»로 보고된다

- `expedition.ts:446` — `const canStart = wouldStart && matching?.kind !== "unavailable";`
- `expeditionStart.ts:101-103` — `canStart` 가 거짓이면 «오늘의 탐험을 모두 마쳤어요. 지난 칸을 다시 풀어 볼 수 있어요.»를 던진다. 공급 부족의 사유를 던지는 `expeditionStart.ts:132` 에는 닿지 않는다.
- 합의 기록은 공급 부족을 «완료된 복습 루프라고 보고하지 않는다»고 했다. 지금은 오래된 탭 · 두 탭에서 시작을 누르면 서버가 «완료»라고 답한다.

고칠 것: `canStart` 검사 앞에서 시범 결정이 `unavailable` 이면 그 사유로 던진다. 또는 DTO 의 `canStart` 와 시작 거절이 같은 사유를 공유하게 한다.

화면 단계에 남길 것(지금 코드는 그대로이고 시안 뒤의 일): `src/components/math-srs/StudentCourseSrs.tsx:255-268` 은 세션이 끝난 뒤 추천이 `null` 이면 `expedition?.onComplete()` 를 부른다. 공급 부족도 «완료» 흐름으로 처리된다. 탐험 홈 단추는 `canStart === false` 로 꺼지지만(`ExplorerHome.tsx:405-417`) 사유는 아직 그려지지 않는다.

## 2. 고치면 좋은 것 (막지 않음)

| # | 무엇 | 줄 | 제안 |
|---|---|---|---|
| S1 | DTO 와 시작의 결정 함수가 다르다. DTO 는 `coursePrerequisiteDecision(state.course, now, {10, 0})` 에 **소단원만** 같은 탐험 단원인지 보고(`expedition.ts:434-444`), 시작은 `expeditionInitialPrerequisiteDecision` 이 소단원 **과 목표** 둘 다 본다(`expeditionStart.ts:58-73`). 시범 넷은 한 단원이라 지금은 같다 | `expedition.ts:434-444` | DTO 도 `expeditionInitialPrerequisiteDecision(state, nextPlan, now)` 를 부른다 — `canStart` 와 시작의 수락이 한 함수에서 나오게 |
| S2 | 한 요청에서 결정을 여러 번 계산한다. `courseSummary` 가 모든 호출에서 `prerequisiteStep` 을 부르고(`courseAutomation.ts:303`), DTO · 가드 · 대체 가지 · 표시가 또 부른다. 발동 · 복귀 상태 학생은 부를 때마다 공급기가 돈다(후보 하나에 생성기 5문항 + 보기). 모두 바닥나면 한 번에 20세션. 발동 밖 학생은 0회 그대로다 | `courseAutomation.ts:303` · `expedition.ts:598` · `courseServer.ts:75, 133` | `(course 객체, now)` 를 열쇠로 한 요청 안의 메모. 결과가 같아야 하니 가드 일치에도 도움이 된다 |
| S3 | 교사 근거가 공급 부족의 **교사용 문장**(`teacherReason` — 시작 소단원 변경 · 기능 해제로 풀린다)을 잃는다. 계약의 `context` 는 학생 문장만 싣는다 | `display.ts:120-135` | 화면이 `context.kind === "unavailable" && !canStart` 일 때 고정 안내를 그린다 — 합의 기록이 요구한 회복 방법이다 |
| S4 | 공급 부족일 때 코스 요약의 상태가 `"ready"` 다. 교사 명단에는 «준비»로 보이는데 시작할 수 있는 것이 없다 | `courseAutomation.ts:355-356` | `"done"` 도 거짓이다. 상태는 두고 교사 화면에서 `prerequisite.context` 를 함께 보이는 쪽이 낫다 |
| S5 | 표시 문맥이 다시 불러오면 사라지는 경우: 대체 연습(`fallback`)으로 시작한 T 세션은 직전 세션이 P 가 아니라서 진행 중 문맥이 없다. 보통 만기로 푼 P 세션도 «먼저 확인해요»로 보인다 | `display.ts:52-97` | 문장을 Hi-fi 에서 두 경우 모두 참이 되게 고른다(합의 기록의 복귀 문장과 같은 결) |
| S6 | 화면 문구가 코드에 새로 들어왔다 — «확인을 마쳤어요. 다음 학습 때 분수의 곱셈으로 돌아가요.» | `display.ts:111` | 시안 선택에 같이 올린다. 지금은 `PREREQUISITE_REASONS` 밖의 문자열이다 |

## 3. 초점별 확인 — 맞음

| 초점 | 확인 | 줄 |
|---|---|---|
| 사전 검사 = 실제 시작 | 코스 경로는 CAS 콜백 **안에서** `expeditionCoursePrerequisiteDecision(state, now)` 를 다시 계산해 그 `session` 을 넘긴다. 시작은 그 문항을 그대로 쓰고, 소단원 · 모드가 다르면 409 다. 탐험 시작도 콜백 안의 `source` 로 다시 계산한다. 결정이 있으면 은행 후보를 넘기지 않는다 | `courseRoutes.ts:98-112` · `courseAutomation.ts:421-436` · `expeditionStart.ts:132-149` |
| 하루 5 · 미션 10 | 코스 요약은 코스 예산(`answered`, `todayGoal`), 열린 미션은 `{goal, answered}` 로 같은 `prerequisiteStep` 을 부른다. 미션 밖 기본 예산(`coursePrerequisiteBudget`)이 코스 요약의 식과 같다 | `courseAutomation.ts:303-306` · `expedition.ts:613-635` · `courseIntegration.ts:12-26` |
| 복귀가 `learnedToday` 를 넘음 | 코스 요약에서 시범 결정이 만기 · 다음 학습(`learnedToday`) 가지보다 앞이다. 대체 가지에서도 `prerequisiteRecommendation` 이 `learn` 을 낸다 | `courseAutomation.ts:326-340` · `expedition.ts:598-599` |
| 지금 계획의 복귀 · 앞날 기록 | 내 정책이 막는다(지금 계획 뒤 시작 · `now` 까지 끝남). 진행 중 문맥도 `startedAt` 을 `configuredAt` · `now` 와 견준다 | `display.ts:43-47` |
| 만기 보류 · `dueCount` | `heldCheckSections` 를 만기 목록에서 빼고, `dueCount` 도 그 목록의 길이라 보류를 세지 않는다 | `courseAutomation.ts:284-293` · `:365` |
| CAS 의 같은 ID | `requestIdAllocator` 가 재시도마다 같은 차례의 ID 를 돌려준다. 코스 · 탐험 시작 둘 다 콜백마다 `idAttempt()` 를 새로 받는다 | `requestIds.ts:2-11` · `courseRoutes.ts:98, 106` · `routes.ts`(탐험) |
| 꺼짐이면 기존과 같음 | 코스 요약 · 미션 시작 추천 · 대체 가지 · DTO 의 `canStart`/`next` 가 꺼짐에서 예전 식과 같다. B1(불러오기 실패)만 예외다 | — |
| 저장 꼴 | 새 저장 키가 없다. 학생 DTO 의 `prerequisiteContext` 는 현재 세션을 볼 때만 싣는다 | `courseServer.ts:75-85` |

## 4. 더할 시험

1. 켜짐 · 시범 **밖** 학생 · 열린 초등 미션 · 교사가 미션 중 계획을 끔 → 기존 대체 가지로 미션이 끝난다(B2).
2. 공급 부족(생성기 주입 또는 `supply` 모킹) → `expeditionDto().canStart === false` 이고, 시작이 «모두 마쳤어요»가 아니라 공급 부족 사유로 거절된다. 코스 시작은 세션을 만들지 않고 200 이며, 되풀이해 눌러도 상태가 바뀌지 않는다(B3).
3. `expedition.ts` 를 불러오는 연기 시험 — `graph.ts` 가 없으면 빨개야 한다(B1).
4. 확인 · 복귀 · 대체 · 공급 부족 네 상태에서 DTO 의 `canStart` 와 실제 시작의 수락이 같다(S1).
5. 한 요청 안에서 결정 계산 횟수 상한(S2 를 고친다면).

## 5. 이 검토가 말하지 않는 것

루트의 시험 · tsc · lint · 빌드 · 브라우저 관문은 돌리지 않았다. 위 «맞음»은 코드를 읽어 얻은 것이다.
