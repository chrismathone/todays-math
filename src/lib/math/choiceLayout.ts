/**
 * 보기 번호 배치 — «보기 ①②③④⑤ 를 몇 열로 늘어놓나» 한 곳.
 *
 * 원장님 2026-09-20: 시험지 설정에서 고를 값 **넷**을 직접 정하셨다.
 *   「5행」 = 한 줄에 하나씩 · 「3열 2행」 = ①②③ / ④⑤ · 「2열 3행」 = ①② / ③④ / ⑤
 *   · 「자동」 = 지금처럼 들어갈 때만 여러 열(**기본값**)
 *
 * ## 어휘를 새로 만들지 않았다
 * 값 문자열은 OCR 이 **원본 시험지의 보기 배치**를 기록하는
 * `OCRProblem.choicesLayout`(`src/lib/mathgen/contracts.ts:89`) 과 같은 «행x열» 표기다.
 * `NativeProblem` 이 이미 그 힌트로 열 수를 정하고 있어서, 두 벌을 만들면 같은 지면을
 * 두 규칙이 그리게 된다. 그래서 라벨과 값이 뒤집혀 보이는 것을 감수하고 그대로 쓴다 —
 * 「3열 2행」이 `2x3`(2행 × 3열)이다.
 *
 * ## 누가 이 규칙을 쓰나
 * - `ProblemContent` — 마크다운 문항(문제은행·검수·지면)
 * - `NativeProblem` — OCR·오려낸 문항
 * 둘 다 같은 함수를 부른다. 한쪽만 배선하면 지면과 화면이 조용히 갈린다
 * (2026-08-18 교훈 「규칙이 옳아도 배선이 한쪽만 되면 그쪽 지표만 좋아진다」).
 */
import { displayWidth, fitsTwoColumns } from "./displayWidth";

/** 계약(OCR 힌트)과 같은 어휘. `1x5` 는 힌트에만 있고 원장님 고름에는 없다. */
export type ChoiceLayout = "auto" | "1x5" | "2x3" | "3x2" | "5x1";

/** 시험지 설정에서 원장님이 고르는 값 — 넷. */
export type PrintChoiceLayout = "auto" | "5x1" | "2x3" | "3x2";

/* ────────────────────────────────────────────────────────────────────────
 * 칸 폭 — 새 상수를 지어내지 않고 `TWO_COLUMN_WIDTH_LIMIT` 의 실측을 이어 쓴다
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 인쇄 문항 열 폭. `displayWidth.ts` 의 `TWO_COLUMN_WIDTH_LIMIT` 주석에서 그대로 온다:
 * (210mm − 100px − 14px) × 1.15 / 2.15 ≈ 364px.
 */
const PROBLEM_COLUMN_PX = 364;
/** 보기 사이 가로 간격 — `gap-x-8` = 2rem. 열 수가 달라져도 이 클래스는 그대로다. */
const CHOICE_GAP_PX = 32;
/** 마커(①)와 그 뒤 간격 — 실측 약 19px. 본문이 쓸 수 있는 폭에서 빠진다. */
const CHOICE_MARKER_PX = 19;
/** 표시폭 1 단위의 픽셀. 본문 12.5px 한글 한 글자 = 표시폭 2 → 6.25px. */
const WIDTH_UNIT_PX = 6.25;

/**
 * 그 열 수에서 **한 칸이 받아 주는 최대 표시폭**.
 *
 * 🔴 `choiceColumnLimit(2)` 는 `TWO_COLUMN_WIDTH_LIMIT`(24) 와 **같은 수여야 한다** —
 * 그것이 「새 문턱을 지어내지 않았다」는 증거다(`choiceLayout.test.ts` 가 잠근다).
 * 문턱이 안 갈라 주면 문턱을 옮기지 말고 자(`displayWidth`)를 고칠 것.
 */
export function choiceColumnLimit(columns: number): number {
  const cell = (PROBLEM_COLUMN_PX - CHOICE_GAP_PX * (columns - 1)) / columns;
  return Math.max(1, Math.round((cell - CHOICE_MARKER_PX) / WIDTH_UNIT_PX));
}

/** 보기 **전부**가 그 열 수의 한 칸에 들어가는가. 하나라도 넘으면 그 행이 어긋난다. */
function fitsColumns(texts: readonly string[], columns: number): boolean {
  const limit = choiceColumnLimit(columns);
  return texts.every((text) => displayWidth(text) <= limit);
}

/** 값 → 열 수. `auto` 는 폭을 재야 알 수 있어 여기 없다. */
const LAYOUT_COLUMNS: Record<Exclude<ChoiceLayout, "auto">, number> = {
  "1x5": 5,
  "2x3": 3,
  "3x2": 2,
  "5x1": 1,
};

/**
 * 배치 값 → 열 수.
 *
 * ## 규칙 (원장님께 여쭐 세부 — 지금은 우리가 정했다)
 * - **자동**: 오늘 그대로. 모든 보기가 2열 칸(표시폭 24)에 들어가면 2열, 아니면 1열.
 * - **5행 · 2열 3행**: 고른 값을 **그대로 지킨다.** 보기가 길어 칸 안에서 접혀도
 *   열 수를 바꾸지 않는다 — 그래야 「2열 3행」이 「자동」과 갈린다(자동은 1열로 내려간다).
 * - **3열 2행**: 3열 칸은 표시폭 13 밖에 안 돼 조금만 긴 보기도 접힌다. 그래서
 *   **3열 이상을 고른 문항에 한해** 들어가는 가장 넓은 배치까지 한 단계씩 내린다
 *   (3열 → 2열 → 1열). 내려가는 것은 **그 문항 하나**이고, 나머지 문항은 3열 그대로다.
 *
 * @param chosen 원장님이 시험지 설정에서 고른 값인가.
 *   `false` 면 **OCR 원본 배치 힌트**다 — 폭을 재지 않고 그대로 쓴다(오늘 그대로).
 *   기본값(«자동»)에서 지면이 한 픽셀도 달라지면 안 되기 때문이다.
 */
export function choiceColumnCount(
  layout: ChoiceLayout,
  texts: readonly string[],
  chosen = false,
): number {
  if (!texts.length) return 1;
  if (layout === "auto") return fitsTwoColumns(texts) ? 2 : 1;
  if (!chosen) return LAYOUT_COLUMNS[layout];
  // 보기 수보다 많은 열은 빈 칸을 남긴다 — 고른 값을 고를 때만 깎는다.
  let columns = Math.min(LAYOUT_COLUMNS[layout], texts.length);
  if (columns > 2) {
    while (columns > 1 && !fitsColumns(texts, columns)) columns -= 1;
  }
  return columns;
}

/**
 * 열 수 → Tailwind 클래스. **정적 문자열**이어야 Tailwind v4 의 소스 스캔이 본다 —
 * `grid-cols-${n}` 으로 지으면 빌드에서 그 클래스가 통째로 빠진다.
 */
export const CHOICE_COLUMN_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};
