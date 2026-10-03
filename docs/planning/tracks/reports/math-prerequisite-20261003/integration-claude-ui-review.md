# 선수 조회 화면 연결 검토 — Claude

2026-10-03 · 대상: 루트 커밋 `d94f6efad`(main `68cbcfec1` 위) «show agreed practice reasons and stop unavailable starts».
처음에는 루트 작업 트리의 미커밋 변경을 읽었고(`StudentCourseSrs` · `StudentCoursePractice` · `ExplorerHome` · CSS · 새 컴포넌트 시험 넷), 커밋 뒤 커밋 blob 으로 다시 읽었다.
`StudentCourseSrs.tsx` 는 내가 시험한 사본과 커밋 blob 의 SHA-256 앞 16자리가 같다(`de2eb276c5870971`).

기준은 세 모델이 승인한 하이파이 H1(Grok 워크트리 `docs/design/mockups/math-prerequisite-hifi.html`, SHA-256 `fd9b4950…1c39869`)과 그 투표의 구현 조건 C1~C5([hifi-claude-vote.md](./hifi-claude-vote.md))다. 시안을 다시 승인하는 문서가 아니라, **실제 구현**을 하나씩 판정한다.

## 판정

| 구현 | 판정 | 비고 |
|---|---|---|
| `src/lib/math-prerequisite/policy.ts` · `display.ts` 학생 문구 | **approve** (처음 request_changes → `d94f6efad` 에서 풀림) | §1 |
| `src/components/math-srs/StudentCourseSrs.tsx` | **approve** | §2 · 막지 않는 관찰 N1~N3 |
| `src/components/math-srs/StudentCoursePractice.tsx` | **approve** | §2.5 · N4 |
| `src/components/math-explorers/ExplorerHome.tsx` | **approve** | §2.1 · 시험 없음(N6) |
| `src/components/math-srs/elementary-practice.module.css` | **approve** | C4 를 지킨다 |
| `src/__tests__/components/StudentCourseSrs.test.tsx` 새 시험 넷 | **approve** | 변이 넷 중 하나만 문다 — 코드가 맞아 막지 않음(§3) |
| 교사 화면(Grok · `CourseDashboard` · `CurriculumGraphPanel`) | 아래 §5 | 루트가 커밋 · 읽을 곳을 알려 주면 판정 |

## 1. 막는 것이었던 것 — 학생 문구가 승인 시안과 달랐다 (풀림)

루트 작업 트리에서 처음 읽었을 때 학생에게 보이는 사유 넷이 승인된 H1 과 달랐다. 곧바로 루트에 알렸다(`msg_96b65c3f4dad`).

| 자리 | 그때 | H1 (시안 행) | `d94f6efad` |
|---|---|---|---|
| `policy.ts:78` 복귀 | 확인을 마쳤어요. 분수의 곱셈을 다시 학습해요. | 분수의 뺄셈 확인 범위를 본 뒤, 분수의 곱셈을 다시 학습해요. (609 · 921) | H1 그대로 |
| `display.ts:111` 다음 학습 때 복귀 | 확인을 마쳤어요. 다음 학습 때 분수의 곱셈으로 돌아가요. | 시안에 없음 | 분수의 뺄셈 확인 범위를 본 뒤, 다음 학습 때 분수의 곱셈으로 돌아가요. |
| `policy.ts:83` 공급 부족 | 지금 낼 수 있는 새 문제가 없어요. 선생님께 알려 주세요. | 새 문제를 준비하지 못했어요. 선생님께 알려 주세요. (620 · 627) | H1 그대로 |
| `policy.ts:80` 대체 | 안전한 확인 문제를 준비하지 못해 목표 학습을 이어갑니다. | 확인 문제를 준비하지 못해 분수의 곱셈 학습을 이어 갑니다. (636 · 643) | H1 그대로 |

막은 까닭은 문구의 맛이 아니라 **참 거짓**이다. 복귀는 «확인을 끝냈을 때»만이 아니라 확인 범위의 보통 복습(P 복습) 뒤에도 온다. «확인을 마쳤어요»는 그 경우에 거짓이고, H1 문장은 그래서 «확인 범위를 본 뒤»로 골랐다. 루트의 브라우저 그림 `student-a-return-320/390/pc.png` 가 옛 문장을 그리고 있었다 — 그 그림은 `d94f6efad` 전의 것이라 **다시 찍어야 한다**(N7).

다음 학습 때 복귀 문장(`display.ts`)은 시안에 없던 경우다. 남은 코스 예산이 다섯 문제보다 적어 오늘은 목표로 돌아가지 못하는 때(`canStart: false`)에 쓴다. H1 복귀 문장과 같은 «본 뒤» 꼴이고 «다음 학습 때»가 사실이라 받는다.

남은 한 곳(막지 않음, N5): `src/lib/math-explorers/expeditionStart.ts:119-121` 이 아직 옛 공급 부족 문장을 손으로 적어 던진다. 이 줄은 DTO 가 `canStart: true` 라고 한 뒤 추천이 비었을 때만 닿는 방어 가지다 — 공급 부족의 정상 거절은 `:84-89` 가 DTO 사유로 먼저 던진다(내 회귀 시험 B3 · S1 이 그 길을 지키고, `d94f6efad` 문구로도 통과했다). 그래도 한 상태에 문장이 둘이 되지 않게 `PREREQUISITE_REASONS.unavailable` 을 쓰는 편이 낫다.

## 2. 지시서의 초점별 확인

### 2.1 공급 부족(`canStart: false`)과 새 대체(`canStart: true`)를 가르는가 — 가른다

서버는 대체를 `kind: "unavailable"` · `canStart: true` 로 보낸다. 세 화면 모두 «멈춤»을 `kind === "unavailable" && !canStart` 로만 읽는다.

| 자리 | 공급 부족 | 대체 |
|---|---|---|
| `StudentCourseSrs.tsx:181-183` 의 `unavailable` | 참 → 제목 «지금은 새 문제를 열 수 없어요.»(`:211-212`) · 사유(`:398-399`) · 꺼진 «오늘의 추천 학습 시작»(`:417-422`, 진도판이 있을 때는 `:352-361`) · «완료» 표지 없음(`:435-436`) | 거짓 → 보통 화면에 대체 사유(`:404-405`) |
| 불러올 때 자동 시작 `:106-110` | `canStart !== false` 라 시작하지 않음 | 시작함(새 시험 넷째) |
| `start()` `:161-166` | 바로 돌아감 — 단추가 꺼졌어도 두 번째 문 | 시작 |
| 탐험 안 설정 칸 `:302-326` | 제목 · 사유 · 꺼진 시작 단추 · «탐험판으로» | — |
| `ExplorerHome.tsx:313-316` · `:424` | 시작 단추 꺼짐 (풀던 복습 · 다시 풀기는 막지 않음) · 사유 줄에 `role="status"`(`:409-415`) | 단추 켜짐 · 사유 줄 |
| `StudentCoursePractice.tsx:832-834` 마침 화면 | «다음 학습 준비» · «지금은 새 문제를 열 수 없어요.» · 사유 · 진도판 «다음» 없음(`:871`) | 보통 마침 화면 |

진도판이 있으면 `StudentReviewOverview` 가 추천 카드 대신 진도판과 `boardActions` 를 그린다(`StudentReviewHome.tsx:191-213`). 그래서 `:352-361` 의 꺼진 단추와 추천 카드의 꺼진 단추(`:417-422`)는 한 화면에 함께 나오지 않는다 — 겹침 아님.

### 2.2 거짓 «완료» 신호를 막는가 — 막는다

- 마지막 답 뒤 `onNext`(`StudentCourseSrs.tsx:272-288`): 추천이 있고 오늘 완료가 아니면 다음 세션, 아니면 연습을 닫고 `if (!unavailable) expedition?.onComplete()`. 공급 부족이면 탐험 부모에 «완료»를 알리지 않는다. 새 시험 둘째가 이것을 지키고, 이 조건을 지우는 변이를 문다(§3).
- 불러올 때(`:98-105`): `journey.todayComplete` 이면서 공급 부족이 **아닐** 때만 `onComplete`. 이 예외는 막지 않는 관찰 N1 을 보라.
- 서버 쪽: 공급 부족이면 DTO `completedToday` 거짓 · 미션 미완료 · 코스 요약 `done`/`complete` 아님 — 내 회귀 시험 B3 두 개가 지킨다(`4284a7c69`).

### 2.3 원래의 이어 풀기 · 다시 풀기 — 그대로다

- 불러올 때 풀던 세션(첫 풀이 미완료 또는 다시 풀기 미완료)이 있으면 문맥을 보기 **전에** 연습을 연다(`:93-97`). 공급 부족 검사는 그 뒤 가지에만 있다.
- 서버는 열린 세션 동안 문맥을 그 세션에서 만든다(확인 · 복귀). 결정 함수가 열린 세션이면 `null` 을 돌려주므로(`policy.ts:200`) 열린 세션이 있을 때 `unavailable` 문맥은 나오지 않는다 — 이 화면의 꺼진 단추가 이어 풀기를 막는 길이 없다.
- 탐험 홈의 꺼짐 조건은 `!activeReview && !pendingRetry && unavailable` 이라 풀던 복습 · 다시 풀기는 막지 않는다.
- «완료한 문제 다시 풀기»(`:362-371`)와 다시 풀기 진행(`retryPending`)은 바뀌지 않았다.
- 새 시험 셋째: 풀던 P 복습(`5-1-5-4`)을 열면 그 사유와 «대분수의 뺄셈» 제목이 보이고 새 시작을 부르지 않는다.

### 2.4 목표 5 와 탐험 10 — 이 변경이 건드리지 않는다

연습 머리의 «1 / 5 문제»는 세션 크기(`session.problems.length`)이고, 홈의 «오늘의 학습 n / 목표»는 `summary.todayGoal` 그대로다(`:445-449`, 이 커밋에서 안 바뀜). 탐험에 끼운 코스는 서버 DTO 가 목표를 미션 목표로 덮는다. 루트의 그림에서 연습은 «1 / 5 문제», 교사 목록은 «0 / 10» 이다 — 루트가 찍은 그림이고 내가 브라우저를 돌린 것은 아니다.

### 2.5 실제 확인 · 복귀와 그 사유

- `StudentCoursePractice.tsx:126-130` 은 문제가 남아 있는 연습 화면에서만 진행 막대 아래에 사유 한 줄을 그린다. 마침 화면에는 공급 부족일 때만 사유가 나온다.
- 머리는 기존 그대로라 확인 세션은 «초5 · 1학기 · 분수의 덧셈과 뺄셈» · «기억을 꺼내는 복습» · «대분수의 뺄셈» — 와이어 투표의 «고칠 것 1» 이 제품에서 그대로 나온다(루트 그림 `student-a-check-pc.png`).
- 루트의 하네스(`scripts/qa/math-prerequisite/browser-check.mjs`)는 학생 A 의 확인 다섯을 실제 선택지로 맞히고, 서버 상태가 `5-2-2-1` · `learn` 으로 돌아오는지 단정한다. 화면의 사유 단정은 확인 문장의 앞부분(«분수의 뺄셈을 먼저 확인», `:95`)뿐이고 복귀 문장은 그림으로만 남았다.

### 2.6 계획 변경 · 기능 꺼짐

- 꺼짐이면 서버가 `prerequisiteContext` 를 보내지 않는다. 세 화면 모두 `?.` 로 읽어 `unavailable` 거짓 · 사유 줄 없음 · 문구 사슬도 예전 그대로다.
- 꺼짐과 무관하게 바뀐 것은 CSS 한 줄 — `.practice .back { white-space: nowrap; }`(`elementary-practice.module.css:53-64`). 하이파이 조건 C4(«← 학습 홈»이 320 에서 두 줄로 끊기지 않게)이고, 모든 초등 연습 머리에 걸린다. 루트의 320 그림에서 한 줄이고 빵부스러기도 한 줄이다. 나빠진 곳은 못 찾았다.
- 계획 변경(`configuredAt`) 판단은 서버에 있고 화면은 문맥만 읽는다. 시범 학생의 열린 미션은 교사가 계획을 끄면 멈추는데, 이때 탐험 안 설정 칸이 기존 문장 «학습 설정을 확인한 뒤 같은 탐험을 이어 갈 수 있어요.»를 보인다 — N2.

## 3. 내가 직접 돌린 것

모두 이 워크트리에서 했다. 루트의 파일을 커밋에서 꺼내 잠시 덮어쓰고 돌린 뒤 `git checkout` 으로 되돌렸다(`git status` 깨끗). 커밋하지 않았다.

| 무엇 | 결과 |
|---|---|
| `d94f6efad` 의 화면 · 문구 · 시험 파일 + Codex `mathPrerequisiteRoutes.test.ts`(`68cbcfec1`) 로 7파일: `StudentCourseSrs` · `ElementaryCourseApp` · `StudentMathExplorers` · `ElementaryPractice` · `StudentCourseRoutes` · 내 `mathPrerequisiteRegressions` · `mathPrerequisiteRoutes` | **99 통과** |
| 같은 상태로 프로젝트 전체 `tsc --noEmit` | 오류 0 |
| 미커밋 단계(문구 고치기 전)의 컴포넌트 5파일 | 71 통과 |

`StudentCourseSrs.tsx` 변이(한 번에 하나, `StudentCourseSrs.test.tsx` 36개로):

| 변이 | 결과 | 읽기 |
|---|---|---|
| `onNext` 의 `if (!unavailable)` 를 지움 — 공급 부족에도 `onComplete` | **1 실패**(둘째 시험) | 거짓 완료를 시험이 지킨다 |
| 불러올 때 `canStart !== false` 를 지움 | 36 통과 | 첫 시험의 픽스처가 추천을 `null` 로 둬서 추천 검사가 먼저 막는다. 서버도 공급 부족이면 추천이 `null` 이다(내 B3 단정) — 이중 방어의 한 겹이라 막지 않음 |
| `unavailable` 이 `canStart` 를 안 봄(대체도 멈춤) | 36 통과 | 넷째 시험은 자동 시작만 본다. 이 변이에서 대체 세션을 끝내면 `onComplete` 가 안 불리고 홈이 «열 수 없어요»가 된다 — N3 |
| 불러올 때 `todayComplete` 예외를 지움 | 36 통과 | 이 예외를 지키는 시험이 없다 — N1 |

브라우저는 내가 돌리지 않았다. §2 의 그림 이야기는 모두 루트가 찍은 `browser-shots/` 다(`result.json`: 격리된 모의 DB · 실제 API 처리기 · 학생 A 5문제 · 페이지 오류 0).

## 4. 막지 않는 관찰

| # | 무엇 | 제안 |
|---|---|---|
| N1 | `StudentCourseSrs.tsx:98-105` 는 `todayComplete` 이어도 공급 부족이면 `onComplete` 를 부르지 않는다. 탐험의 `todayComplete` 는 미션 완료이고, 그때는 남은 예산이 0 이라 공급 판단이 나지 않는 것으로 읽힌다 — 닿지 않는 가지다. 닿는다면 정말 끝난 날에 «열 수 없어요»를 보인다 | 예외를 빼거나, 남길 거면 시험 한 줄 |
| N2 | 시범 학생의 열린 미션이 계획 꺼짐으로 멈추면 탐험 안 설정 칸이 «학습 설정을 확인한 뒤…»를 보인다. 열린 미션 동안 학생은 설정을 바꿀 수 없다 | 교사 화면에서 «계획이 꺼져 미션이 멈춤»을 보이는 일(§5 의 회복 표시)로 넘긴다 |
| N3 | 넷째 시험은 대체에서 자동 시작만 단정한다 | 대체 세션의 마지막 답 뒤 `onComplete` 가 불리는지 한 줄 더하면 `canStart` 를 안 보는 변이를 문다 |
| N4 | 연습 화면의 사유 줄(`StudentCoursePractice.tsx:126-130`)은 문맥의 `sectionId` 와 보이는 세션의 범위를 대조하지 않는다. 서버는 열린 세션에서 문맥을 만들고, 세션 번호로 옛 세션을 부르면 문맥을 빼고 보낸다(`courseServer.ts:75-83`) — 지금 길들에서는 맞는다 | `sectionId === session.sectionId` 일 때만 그리면 화면 혼자서도 어긋날 수 없다 |
| N5 | `expeditionStart.ts:119-121` 의 옛 공급 부족 문장 | `PREREQUISITE_REASONS.unavailable` |
| N6 | `ExplorerHome` 의 꺼진 시작 단추 · 사유 줄에 컴포넌트 시험이 없다. 서버가 같은 사유로 거절해서 안전 문제는 아니다 | 시험 하나 |
| N7 | 루트 그림 `student-a-return-*.png` 는 옛 복귀 문장이다. 새 문장은 320 에서 두 줄이 된다(`.prerequisiteReason` 은 `overflow-wrap: anywhere`) | `d94f6efad` 로 다시 찍기 |
| N8 | `student-b-isolated.png` 는 «학습 화면을 준비하고 있어요…»만 보인다. 하네스가 «불러오는 중» 문자열이 없고 단추가 하나라도 있기만 기다리고 찍는다(`browser-check.mjs:28-33` · `:159`) — 그림에 보이는 단추 후보는 머리의 «나가기»뿐이다. B 의 격리는 고정물 상태 단정(`:149-158`)이 지키고 그림은 증거가 아니다. `result.json` 의 `requests` 도 B 를 열기 전 A 의 상태에서 읽어 B 요청이 없다 | B 화면의 제목을 기다린 뒤 찍기 · 요청 목록은 마지막에 읽기 |
| N9 | 앞 검토의 S2(요청당 결정 반복 계산) · S4(공급 부족 때 교사 상태 `ready`) | 그대로 — §5 에서 교사 화면과 같이 본다 |

## 5. 교사 화면 — Grok · `CourseDashboard` / `CurriculumGraphPanel`

루트가 커밋이나 읽을 곳을 알려 주면 여기에 판정을 더한다. 볼 것: 고른 학생이 바뀐 뒤 늦게 온 응답을 버리는가 · 부분 범위(«보이는 후보 2 / 9») · 보류(풀리는 조건) · 회복 방법(시작 소단원 변경 · 기능 끄기) · 감사 기록이 없을 때 «없다»를 사실대로 말하는가.
