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
| `src/components/math-srs/CourseDashboard.tsx` (Grok `226a0fdba`) | **request_changes** | §5.1 T1 — 계획 저장 뒤 연결도의 학생 기록이 다시 오지 않는다(재현) |
| `src/components/math-srs/CurriculumGraphPanel.tsx` (Grok `226a0fdba`) | **request_changes** | §5.1 T2 · T3 — 교사에게 학생 문장 · 회복 방법 없음 · «낼 문제가 없고» |
| `src/components/math-srs/curriculum-graph.module.css` (Grok `226a0fdba`) | **approve** | hover 는 단추에만(D-30) |
| `src/__tests__/components/CurriculumGraphPanel.test.tsx` (Grok `226a0fdba`) | **approve** · 보강 권고 | T1 을 지키는 시험이 없다 · 옛 문구 픽스처 |
| `src/lib/math-prerequisite/supply.ts` 의 `interactive: null` · 그 시험 · `expeditionStart.ts` 문구 (루트 작업 트리, 커밋 전) | **approve** | §6 — 8파일 114 통과 · 공개 세션 탐침 |

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
| N5 | `expeditionStart.ts:119-121` 의 옛 공급 부족 문장 | `PREREQUISITE_REASONS.unavailable` — 루트 작업 트리에서 고침(§6) |
| N6 | `ExplorerHome` 의 꺼진 시작 단추 · 사유 줄에 컴포넌트 시험이 없다. 서버가 같은 사유로 거절해서 안전 문제는 아니다 | 시험 하나 |
| N7 | 루트 그림 `student-a-return-*.png` 는 옛 복귀 문장이다. 새 문장은 320 에서 두 줄이 된다(`.prerequisiteReason` 은 `overflow-wrap: anywhere`) | `d94f6efad` 로 다시 찍기 |
| N8 | `student-b-isolated.png` 는 «학습 화면을 준비하고 있어요…»만 보인다. 하네스가 «불러오는 중» 문자열이 없고 단추가 하나라도 있기만 기다리고 찍는다(`browser-check.mjs:28-33` · `:159`) — 그림에 보이는 단추 후보는 머리의 «나가기»뿐이다. B 의 격리는 고정물 상태 단정(`:149-158`)이 지키고 그림은 증거가 아니다. `result.json` 의 `requests` 도 B 를 열기 전 A 의 상태에서 읽어 B 요청이 없다 | B 화면의 제목을 기다린 뒤 찍기 · 요청 목록은 마지막에 읽기 |
| N9 | 앞 검토의 S2(요청당 결정 반복 계산) · S4(공급 부족 때 교사 상태 `ready`) | 그대로 — §5 에서 교사 화면과 같이 본다 |

## 5. 교사 화면 — Grok · `CourseDashboard` / `CurriculumGraphPanel`

대상: Grok 워크트리 커밋 `226a0fdba` «교육과정 연결도를 현황 화면에 연다»(바탕 `7a286033a`). 커밋 전 작업 파일을 먼저 읽어 루트 · Grok 에 알렸고(`msg_778050c47efe` · `msg_6f4a012ef4ff`), 커밋 뒤 다시 읽었다(`msg_819b2b790c9f`). 이 워크트리의 `src/components` · `src/lib` · `src/contracts` 는 `7a286033a` 와 같다.

### 5.1 막는 것

| # | 자리 | 무엇 | 확인 | 고칠 길 |
|---|---|---|---|---|
| T1 | `CourseDashboard.tsx` — 연결도에 `selected ? { id: selected.id, revision: selected.revision } : null` | `selected` 는 학생을 열 때만 정해진다. 계획 저장은 `onStudentUpdate={updateRow}` 로 목록 줄만 바꾸고 `selected` 는 그대로다. 연결도의 학생 기록은 옛 `revision` 을 붙들어 다시 부르지 않는다 | **재현** — 기존 «saves the actual form» 흐름을 본뜬 임시 시험(지웠다): 저장 전 `getCourseStudentDetail` 2번(상세 + 연결도), 저장 뒤 3번(상세 다시 부르기뿐) | 목록의 최신 줄을 넘긴다(`students.find((row) => row.id === selected.id) ?? selected`) 또는 `updateRow` 에서 `selected` 도 바꾼다. 저장 뒤 연결도가 다시 부르는 시험 하나 |
| T2 | `CurriculumGraphPanel.tsx:401-412` | 공급 부족이면 학생 문장 «새 문제를 준비하지 못했어요. 선생님께 알려 주세요.»를 **교사에게** 보이고, 회복 길은 일반 문장(`FROZEN_MISSION`)뿐이다. H1 조건 C3 은 «시작 소단원 변경 · 기능 끄기»를 함께 보이라고 했다 | 읽기. 서버에 `PREREQUISITE_REASONS.unavailableTeacher` 가 있으나 DTO(`prerequisiteContextSchema`)에는 학생 `reason` 만 실린다 | 교사 문장을 화면에서 `kind` · `canStart` 로 고르거나 DTO 에 교사 문장 칸을 더한다(계약 변경이면 3자) |
| T3 | `CurriculumGraphPanel.tsx:174-178` | 시범 밖 단원에 «낼 문제가 없고»라고 쓴다. 초3~초6 단원 다수는 보통 코스가 문제를 낸다 — 거짓이다 | 읽기 | «자동 확인 문제는 내지 않습니다»처럼 시범 공급의 범위로 말한다 |

### 5.2 지시서의 초점별

| 초점 | 판단 | 근거 |
|---|---|---|
| 고른 학생이 바뀐 뒤 늦게 온 응답 | **지킨다** | 요청 번호 + 정리 함수의 번호 올림 + 응답의 학생 id · `revision` 대조(`:267-309`). `226a0fdba` 에서 기록을 그 요청의 `studentId` · `revision` 에 묶어 다른 학생으로 바뀐 첫 그림에 옛 학생이 비치지 않는다(`:311-318`). 같은 `revision` 이 바뀌지 않는 경우는 T1 |
| 부분 범위 | 지킨다 | «부분 범위 N 줄이며 합산하지 않습니다» · 줄마다 «소단원 일부입니다. 단원 숙달이 아닙니다.» · 단원 화면의 «보이는 후보 n / m» |
| 보류 | 지킨다 · 날짜는 없음 | 보류 범위 이름 + 서버 `holdReason`(«목표를 마치거나 14일이 지날 때까지»). 풀리는 날짜는 줄의 마지막 기록 시각으로만 짐작된다 — 막지 않음 |
| 회복 | **T2** | 위 |
| 감사가 없다는 사실 | 지킨다 | «성취기준 대조는 끝나지 않았습니다»는 계약이 받쳐 준다 — 단원 스키마가 `needsCurriculumAudit: z.literal(true)` · `achievementStandardIds` 길이 0 을 강제해, 데이터가 바뀌면 그래프 적재가 먼저 실패하고 문장만 거짓으로 남을 수 없다. 학생 기록이 안 오면 «이 학생의 선수 기록은 오지 않았습니다» — 기록이 없다고 단정하지 않는다 |
| 시작 단추 없음 | 지킨다 | 연결도에 시작 · 연습 컨트롤이 없다(시험이 확인) |
| D-30 | 지킨다 | hover 배경은 `.row` · `.jump` · `.entryButton` · `.reset` · `.close` — 모두 단추 |

### 5.3 막지 않는 것

- `:335` 학생을 고르지 않아도 «선택한 학생의 기록» 칸과 «선택된 학생 없음.»이 그려진다. H1 은 «학생을 고르지 않으면 이 줄은 없습니다»였다.
- 시험 픽스처(`CurriculumGraphPanel.test.tsx:242` · `:317`)가 `d94f6efad` 전의 문장이다. 늦은 응답 시험은 두 요청에 같은 약속을 돌려줘 id 불일치 가지를 지난다 — 요청 번호 가지도 «대분수의 뺄셈이 안 보임» 단정으로 함께 물린다.
- `OUTSIDE_PILOT = ["5-2-2-3", "5-2-2-4"]` 은 손으로 적었다. 오늘 카탈로그의 5-2-2 소단원은 그 넷이 전부라 맞다.

### 5.4 내가 돌린 것

`226a0fdba` 의 네 파일을 이 워크트리에 잠시 꺼내 `CurriculumGraphPanel.test.tsx` · `CourseDashboard.test.tsx` — **2파일 31 통과**. T1 재현 시험은 따로 만들어 돌리고 지웠다. 되돌린 뒤 `git status` 깨끗. 브라우저로 교사 화면을 열지는 않았다.

## 6. 공급 관문의 `interactive` — 루트가 브라우저에서 찾은 것

루트의 실제 학생 A 흐름에서 돌아온 T 세션의 문항 하나가 «칸 칠하기»(`interactive: fraction-parts`)로 나와 저장된 보기 넷이 화면에서 사라졌다. 내 `supply.ts` 머리말은 «학생 화면이 저장된 보기를 그대로 쓴다»를 약속하는데, 그 걸러 내기가 이 자리를 못 봤다 — **내 모듈의 구멍이다.**

- 생성기가 `makeCourseAnswerChoices` 의 `interactive` 를 문항에 저장한다(`generator.ts:71`). 답이 분모 2~12 의 진분수이면 붙는다(`choiceAnswers.ts` `fractionOf`).
- 연습 화면은 `interactive` 가 있으면 보기를 쓰지 않는다(`StudentCoursePractice.tsx:277`).
- plan-v03 §5 의 첫 구현 관문(«보기의 유일한 정답 · 정답 채점 성공/오답 거절»)은 보기가 입력이라는 전제다.

루트의 첫 안은 `interactive` 가 붙은 문항이 하나라도 있는 세션을 버리는 것이었다. 임시 탐침(실제 `supplySafeSession` · 열쇠 200개씩 · 이미 본 본문 없음, 지웠다)으로 잰 결과:

| 범위 | 지금 | 버리면 | 문항 중 `interactive` |
|---|---|---|---|
| T1 `5-2-2-1` learn | 200 / 200 | 145 / 200 | 41% |
| T2 `5-2-2-2` learn | 200 / 200 | 200 / 200 | 27% |
| P1 `5-1-5-4` review | 200 / 200 | 200 / 200 | 11% |
| P2 `5-1-5-3` review | 200 / 200 | **0 / 200** | 59% |

버리면 P2 는 영영 공급되지 않고 T1 의 복귀 · 대체가 네 번에 한 번꼴로 공급 부족이 된다. plan-v03 §5 는 관문에 못 드는 범위를 조용히 켜지 말고 3자 재검토하라고 했으므로, 버리기는 «관문 지키기»가 아니라 범위 바꾸기다. 루트도 같은 결과(실제 공급 · 연결 시험 다섯 실패)를 보고 다른 안으로 갔다.

**승인한 안**: 모든 기존 관문을 지난 뒤, 공급한 사본의 `interactive` 를 명시적 `null` 로 둔다. `publicCourseSession`(`courseAutomation.ts:916-933`)은 `answerChoices` 가 있고 `interactive !== undefined` 이면 다시 만들지 않으므로, 화면은 관문이 검사한 보기 넷을 그대로 쓴다. 생성기 · 연습 화면 · 계약 · 문턱 · 20씨앗 탐색은 그대로이고 공급은 넷 다 200 / 200 이다. 시험에서 볼 것: 공급한 문항이 모두 `interactive === null`(엄격 비교) · 본문 · 답 · 보기 · 씨앗 · 갈래는 생성기와 같음 · 공개 세션이 같은 보기 넷과 `null` · 보통 세션은 여전히 칸 칠하기.

**구현 확인**(루트 작업 트리, 커밋 전): `supply.ts` 가 검증한 사본을 `interactive: null` 로 돌려주고, `mathPrerequisiteSupply.test.ts` 가 칸 칠하기를 끼운 생성기로 «`interactive` 말고는 생성기 출력과 같다»를 단정한다. `expeditionStart.ts` 도 `PREREQUISITE_REASONS.unavailable` 을 쓴다(N5 풀림). 루트의 세 파일 + `d94f6efad` 화면 · 문구 + Codex 경로 시험을 이 워크트리에 잠시 꺼내 공급 · 공급 관문 · 회귀 · 연결 · 정책 · 경로 · `StudentCourseSrs` + 임시 탐침 = **8파일 114 통과**(되돌림, `git status` 깨끗). 탐침: P2 `5-1-5-3` 열쇠 40개(문항 200)에서 공급한 세션의 `publicCourseSession` 은 `interactive` 0/200 · 저장된 보기 넷 200/200, 같은 생성기 출력을 보통 세션으로 내면 칸 칠하기 117/200 — 보통 경로는 그대로다. **approve.** 브라우저는 내가 돌리지 않았다.

남는 것(막지 않음): 시범 P · T 세션은 늘 보기로, 같은 소단원의 보통 세션은 칸 칠하기로 나올 수 있다 — 한 학생이 한 소단원을 두 입력 꼴로 만난다.
