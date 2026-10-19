# 지시서 — 초5 혼자 공부: 탐험 개념 카드의 «한 번 더 → 풀이» 화면 (codex, 2026-10-20)

은행 문제 쪽(`brief-srs-e5-wrong-codex.md`, 당신이 한 `8281a8fa3` · `05dd9a841` · `63ea98cde`)과 **같은 흐름 · 같은 모양**을 개념 카드 활동(문장 조립 · 예 모으기 · 맞다/아니다)에 입힌다.
확정: `05-design-system.md` §8.25(«첫 오답» · «풀이» 줄) · 원장님 결정 2 · 6. 서버 계약은 리드 가지 `chrismathone/srs-e5-audit`(`9c884be3e` 쓰는 쪽 · `6718a855c` 읽는 쪽)에 있고 **고치지 않는다** — `AGENTS.md` «Explorer card follow-ups».

## 1. 무엇을

`src/components/math-explorers/ExplorerPractice.tsx`(카드 활동) · 탐험 API 를 부르는 곳(`StudentMathExplorers.tsx` 의 요청 · `mathSrsApi.ts` 류) · 관련 CSS. 보충 카드(D-147)는 옛 바퀴 그대로 — 건드리지 않는다.

| 순간 | 화면 |
| --- | --- |
| 첫 오답 | 응답 `feedback.advance === false` · `currentActivity.followUp.state === "again"` → «다시 해 볼까요» · **같은 문항** · 보기(조각 · 예 · 맞다/아니다)의 **표시 순서만** 섞는다 — 제출은 서버가 준 `choices[].id` 그대로 · 고른 것 없는 상태로 · `followUp.firstChoiceIds` 의 보기에 옅은 «앞에서 고른 답» · «아직 모르겠어요»도 그대로(빈 답) |
| 두 번째 답 | 지금과 같은 `{ type: "answer", questionId, choiceIds }` |
| 두 번째에 맞음 | 응답 `correct: true, advance: true` → «맞았어요» → 지금처럼 다음 활동 |
| 두 번째도 틀림 · «아직 모르겠어요» | `followUp.state === "solution"` · `currentActivity.solution`(또는 `feedback.solution`) — 문항 **아래로 이어진 종이**: «다시 살펴봐요» · «정답과 풀이» · 개념의 뜻(`definition`) · 이 활동의 정답(조립이면 완성 문장, 예 모으기면 예마다 맞음/아님, 맞다/아니다면 그 문장과 참거짓) · 설명(`explanation`) · 바닥 줄 «이 개념은 다음 복습에서 다시 만나요.» + **«알겠어요» 오른쪽**(폰 전체 폭) → `{ type: "understood", questionId }` |
| 새로고침 · 다시 들어옴 | `currentActivity.followUp` · `solution` 이 상태를 되살린다 |

## 2. 서버 계약(고치지 않는다)

- **모든 탐험 요청(GET · POST)에 머리글 `x-explorer-follow-up: 1`**(`EXPLORER_FOLLOW_UP_HEADER` — `src/contracts/mathExplorers.contract.ts`). 없으면 옛 바퀴 흐름 · 옛 응답 그대로다.
- 새 동작 `{ type: "understood", questionId }` — 풀이가 열린 문항에서만(아니면 400). 풀이가 열린 동안 답을 보내면 400.
- 응답 `currentActivity.followUp?: { state: "again" | "solution", firstChoiceIds }` · `currentActivity.solution?`(뜻 · 설명 · 예시 정오 · 참거짓 문장) — 머리글이 있을 때만.
- 오늘의 미션 · 하루 계획 수는 서버가 맞춘다(기다리는 활동을 한 번만 센다).

## 3. 지킬 것

은행 문제 지시서 §3 과 같다 — 서버 · 계약 · 저장 꼴 불변 · §8.16 · §8.18(번호 키는 화면 순서) · D-30 · D-08 · `prefers-reduced-motion` · TDD(RTL) · 정션 `node_modules` · `npm install` / `prisma generate` 금지 · 전체 `type-check` 는 끝에 한 번(알림) · 단위마다 커밋 · **푸시하지 않는다**.
은행 문제 쪽에서 만든 부품(이어진 종이 · 앞에서 고른 답 · «알겠어요» 줄)이 있으면 **같은 부품을 쓴다**(절대 규칙 11 — 비슷한 화면은 하나의 방식).
다 되면 커밋 · 바꾼 파일 · 시험 결과 · PC 1366 / 폰 390 캡처(갈래 셋의 첫 오답 · 풀이) · 원장님께 물을 세부.
