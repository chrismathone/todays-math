# 초5 SRS 예습 카드 — 2학기 2단원 «분수의 곱셈» · 3단원 «합동과 대칭» 여덟 장 (codex 지시서, 2026-10-20)

한국어로 보고한다(코드 · 경로 · 식별자만 원문).

> 2026-10-21: 이 지시서는 처음에 리드 기계의 scratchpad 에만 있었다. 다른 컴퓨터에서 이어 하도록 저장소로 옮겼다.
> 첫 작업자(10-21 오후)는 그 기계의 남은 메모리가 0.4GB 라 구현 전에 멈췄다. 그때 찾아 둔 재사용 경로는 맨 끝 «앞선 작업자가 확인한 것»에 있다.
> 아직 한 것은 없다. 시험 · 카드 · 그림 모두 처음부터 한다.

## 근거

- 계획서 `docs/planning/srs-e5-30day-plan-20261019.md` §3.4 · §3.7 · §4(«~11/2 시범 소단원의 예습 카드 · SVG 그림»).
- 화면 꼴은 확정된 Hi-fi C «바다의 넘김책»이다(`docs/planning/05-design-system.md` §8.25). 예습 카드 화면은 이미 있다(`src/components/math-srs/StudentCoursePreview.tsx`). **화면을 새로 짓지 않는다 — 데이터와 그림만 더한다.**
- 지금 카드는 5-2-1 여섯 장이다(`src/lib/math-srs/preview/cards.ts`). 그림은 수직선 하나(`numberLine.ts`)뿐이다. 시험은 `src/__tests__/unit/previewCards.test.ts` · `previewNumberLine.test.ts` 다.
- 다시 배우는 날의 «개념 다시 보기»는 이미 main 에 있다(`session.relearn`).

## 할 일 — 여덟 장

| 소단원 | 이름 | 탐험 개념 카드(`curriculumBridge.ts`) |
|---|---|---|
| `5-2-2-1` | (분수)×(자연수)의 계산 | 없음 — 뜻 문장을 직접 쓴다 |
| `5-2-2-2` | (자연수)×(분수)의 계산 | 없음 — 뜻 문장을 직접 쓴다 |
| `5-2-2-3` | 진분수의 곱셈 | `g5-fraction-multiply` |
| `5-2-2-4` | 여러 가지 분수의 곱셈 | `g5-fraction-multiply` |
| `5-2-3-1` | 도형의 합동 알아보기 | `g5-congruence` |
| `5-2-3-2` | 합동인 도형의 성질 알아보기 | `g5-congruence` |
| `5-2-3-3` | 선대칭도형과 그 성질 알아보기 | `g5-line-symmetry` |
| `5-2-3-4` | 점대칭도형과 그 성질 알아보기 | `g5-point-symmetry` |

각 장은 지금 카드와 같은 짜임이다: 뜻 → 그림 → 풀어 보인 예 둘 → 따라 풀기 하나.

- **뜻:** 탐험 카드가 있으면 그 문장을 그대로 쓴다(`meaning: { cardId }`). 없으면 같은 말투로 한두 문장.
- **그림:** 정확한 수로 그린 SVG 하나 + 그림 아래 한 줄.
  - 분수의 곱셈 — 넓이(직사각형 모눈) 모형이나 띠 모형. 칸 수 · 색칠 칸이 식과 수로 맞아야 한다.
  - 합동 · 대칭 — 모눈 위의 도형 · 대칭축 · 대칭의 중심.
  - **먼저 초등 엔진의 그림을 찾아 쓴다.** `docs/planning/09-figure-engine-guide.md` 를 먼저 읽는다(재발 금지 §4). 5-2-3 문항은 이미 모눈 대칭 그림을 그린다(`src/lib/elementary/g5.ts` 의 2-3 문형 · `renderFigureSpec`). 맞는 것이 없을 때만 `numberLine.ts` 처럼 작은 결정적 그리기 함수를 새로 둔다.
  - 선 · 색 · 글자 크기는 지금 수직선 그림과 같은 결로 둔다. 새 색을 지어내지 않는다.
  - `PreviewCard.figure` 가 수직선만 받으면, 갈래가 있는 값(`{ kind: "numberLine", … } | { kind: … }`)으로 넓힌다. 이미 있는 여섯 장은 그대로 그려져야 한다.
- **풀어 보인 예:** 학생 말로 두세 걸음. 계산의 «왜»가 보이게 쓴다(예: 3/4×2 는 3/4 를 두 번 더한 것).
- **따라 풀기:** 하나. 정답은 시험이 수로 다시 계산한다.
  - 지금 `checkPreviewAnswer` 는 자연수만 받는다. 분수 답이 필요하면 **강좌 문제가 이미 쓰는 분수 채점**(`src/lib/math-srs/elementary/answers.ts` 의 `gradeCourseAnswer` 쪽)을 재사용한다. 기약분수 · 대분수 처리도 그 규칙을 따른다.
  - 분수 입력 칸이 필요하면 강좌 문제 화면이 이미 쓰는 입력을 재사용한다. **새 입력 꼴을 짓지 않는다.** 재사용이 안 되면 멈추고 보고한다.

## 확인

- `previewCards.test.ts` 를 넓힌다: 여덟 장의 따라 풀기 답과 풀어 보인 예의 답을 수로 다시 계산한다. 그림의 칸 수 · 색칠 칸 · 좌표가 카드의 수와 맞는지 시험한다.
- 교재 원문 누출: 개념 백지의 `scripts/qa/concept-blank/check-leak.ts` 를 새 카드 글에 대어 볼 수 있으면 대어 본다. 못 대면 까닭을 보고한다.
- **정답 없이 풀기 표:** 여덟 장의 풀어 보인 예 · 따라 풀기 문제만(정답 · 풀이 없이) `docs/planning/tracks/reports/srs-e5-preview-cards-g5-2-blind.md` 에 적는다. 리드가 다른 모델로 정답 없이 풀어 대조한다.
- 실제 Chromium 에서 PC(1280) · 폰(390) 폭으로 여덟 장을 찍어 보고서에 둔다. 진도판 테마 셋 이상(`classic` 포함). 가로 넘침이 없어야 한다. 이미 있는 Vite 하네스 꼴을 따른다.

## 지킬 것

- TDD 다. RED 를 확인한 뒤 GREEN 으로 가고, 단위마다 커밋한다(분수 넷 · 합동 대칭 넷 · 그림 갈래 넓히기는 따로).
  - 신원: `git config --local user.email chrismathone@gmail.com` · `user.name SUN`
  - 커밋 끝: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
- **서버 · 계약 · 저장 꼴은 고치지 않는다**(리드 몫). 카드는 코드 데이터다 — DB 무변경.
- 그림은 지금 수직선처럼 **SVG 문자열로 화면에 바로 싣는다.** `public/` 에 새 파일을 두지 않는다. 학생 관문은 허용 목록이라 새 정적 경로는 학생에게 막힌다(2026-10-20 길잡이 그림이 `/lab/guides/` 로 와서 막힐 뻔했다). 꼭 파일이 필요하면 멈추고 보고한다.
- 하지 않는 것: `npm install` · `prisma generate`(작업트리 `node_modules` 가 실제 폴더이고 비어 있을 때만 보고 뒤 판단) · `git stash` · 푸시 · 새 작업트리.
- 메모리:
  - vitest · Vite · Chromium · tsc 를 띄우기 전에 남은 메모리 3GB 이상, 다른 `tsc --noEmit` 이 없는지 본다.
  - vitest 는 `--maxWorkers=1` 로 돌린다.
  - 전체 타입 검사는 마지막에 한 번만, 띄우기 직전에 알리고 한다.
- 끝에 `docs/planning/tracks/reports/srs-e5-preview-cards-g5-2-20261020.md` 를 쓴다. 담을 것: 한 것 · 그림을 어디서 가져왔나(엔진 재사용 / 새 함수) · 스크린샷 경로 · 시험 수 · 커밋 목록 · 남은 것. 보고서를 커밋하고 멈춘다.

## 앞선 작업자가 확인한 것 (2026-10-21 — 코드는 안 바꿨다)

- 그림 분기의 입구는 `src/lib/math-srs/preview/index.ts` 의 `previewFigureSvg` 다. 갈래를 넓힐 자리가 여기다.
- 초등 `g5.ts` 의 2-3-3 · 2-3-4 문형은 `fig("symmetry", { axis, n, cells })` 로 모눈 대칭을 그린다. 실제로 그려 보기 전이라 그대로 쓸 수 있는지는 정하지 않았다.
- 분수 채점은 `elementary/answers.ts` 의 `parseCourseAnswerQuantity` · `sameCourseAnswerValue` · `gradeCourseAnswer` 가 한다. 대분수를 읽고, 값은 교차곱으로 정확히 견준다.
- 강좌 문제의 입력(`StudentCoursePractice.tsx`)은 보통 글 입력에 `problem.input.placeholder` 와 도움말을 붙인다. 지금 예습 입력은 `inputMode="numeric"` 이다 — 분수를 받으려면 이 차이를 맞춰야 한다.
- 누출 검사기(`check-leak.ts`)는 개념 백지 은행을 직접 돈다. 새 카드 글을 넣는 인자가 없다 — 대려면 작은 어댑터가 필요하다. 교재 원문 폴더는 `C:/Creative/testautocreator-data/I-개념용어`(기계마다 다르다).
