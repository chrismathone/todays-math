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
 * 칸 폭 — **실제 시험지 지면에서 잰 것**이다 (2026-09-20, `/dev/choice-layout`)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 🔴 **처음에 `TWO_COLUMN_WIDTH_LIMIT`(24) 의 주석에 적힌 364px 를 이어 쓰려다 틀렸다.**
 * 그 364px 는 옛 인쇄 경로(`TestPrint` → `TestPrint.module.css`)의 실측이고,
 * 원장님이 쓰시는 **통합 시험지**(`WorksheetPrint` → 여섯 템플릿)의 문항 열은 더 좁다.
 * Chromium 에서 2단 시험지를 띄워 직접 쟀다:
 *
 *   문항 열 폭      327.2px   (2단 · 쪽 여백 «보통»)
 *   보기 한 칸      2열 147.6px · 3열 87.7px   (gap 32px 를 빼고 나눈 값)
 *   마커 ① + 간격   14px + 6px = 20px
 *   본문 13.5px · 한글 한 글자 14px → **표시폭 1 단위 = 7px**
 *
 * 364px·6.25px 로 셌다면 3열 상한이 13 이 나오는데, 실제 3열 칸이 받아 주는 것은
 * 9 다. 그 차이만큼 **접히는 보기가 그대로 3열에 남았을 것**이다 — 원장님이 2026-08-17
 * 에 지적하신 「보기가 보기 안에서 두 줄 처리되잖아」가 3열에서 다시 났을 자리다.
 *
 * ⚠️ 그래서 이 상한은 **자동이 쓰는 24 보다 엄격하다**(2열 18 < 24). 자동을 같이
 *    고치지 않은 이유는 하나뿐이다 — 자동은 **기본값**이고, 문턱을 옮기면 지면이
 *    바뀐다(절대 규칙 6, 실물 출력 검수 대상). 「자동의 24 도 이 지면에서는 관대하다」는
 *    것은 이 변경이 드러낸 **별건**이라 보고서에 남겼다.
 */
const PAPER_COLUMN_PX = 327;
/** 보기 사이 가로 간격 — `ProblemContent` 의 `gap-x-8`. 열 수가 달라져도 그대로다. */
const CHOICE_GAP_PX = 32;
/** 마커(①) 폭 14px + `gap-1.5` 6px. 본문이 쓸 수 있는 폭에서 빠진다. */
const CHOICE_MARKER_PX = 20;
/** 표시폭 1 단위의 픽셀. 지면 본문 13.5px 에서 한글 한 글자 14px = 표시폭 2. */
const WIDTH_UNIT_PX = 7;

/**
 * 그 열 수에서 **한 칸이 받아 주는 최대 표시폭**. 넘치지 않는 것이 목적이라 내림한다.
 * 실측 그대로: 1열 43 · 2열 18 · 3열 9.
 */
export function choiceColumnLimit(columns: number): number {
  const cell = (PAPER_COLUMN_PX - CHOICE_GAP_PX * (columns - 1)) / columns;
  return Math.max(1, Math.floor((cell - CHOICE_MARKER_PX) / WIDTH_UNIT_PX));
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
 * - **자동**: 오늘 그대로. 모든 보기가 `TWO_COLUMN_WIDTH_LIMIT`(24)에 들어가면 2열, 아니면 1열.
 * - **5행 · 2열 3행**: 고른 값을 **그대로 지킨다.** 보기가 길어 칸 안에서 접혀도
 *   열 수를 바꾸지 않는다 — 그래야 「2열 3행」이 「자동」과 갈린다(자동은 1열로 내려간다).
 * - **3열 2행**: 3열 칸은 실측 87.7px, 표시폭 **9** 밖에 안 돼 조금만 긴 보기도 접힌다.
 *   그래서 **3열 이상을 고른 문항에 한해** 들어가는 가장 넓은 배치까지 한 단계씩 내린다
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
