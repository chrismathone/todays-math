import {
  visibleLength,
  type ApplyItem,
  type ConceptBlankSheet,
  type ConceptEntry,
  type FigureItem,
  type OxItem,
} from "@/contracts/conceptBlank.contract";
import { termIsKeyword } from "@/lib/concept-blank/audit";
import {
  clozeAlternatives,
  clozeSentence,
  termAnswer,
  termCriteria,
  termPrompt,
} from "@/lib/concept-blank/questions";

import {
  BOLD_MATH,
  circled,
  estimateLines,
  plainSentence,
  sentenceAtoms,
  mathEm,
  sentenceKeywords,
  splitSentence,
  wrapLines,
} from "./text";

/**
 * 개념 백지 쪽 나누기(D-150 · 브리프 cb-paper) — 🔴 **DOM 을 재지 않는 고정 규칙**이다. 같은 지면 모델이면
 * 서버 인쇄 페이지 · 화면 미리보기 · 시험 어디서나 이 함수 하나(`planSheet`)로 같은 장 수 · 같은 문항 번호가 나온다.
 *
 * 나누는 법(리드 결정 2026-09-30) — **글자 수로 어림한 줄 단위 높이 예산**이 먼저고, 정원은 그 위의 천장이다.
 *  · 장마다 천장(`PAGE_CAPS` — A 네 칸 · B 아홉 문항 · C 문장 여덟(적용이 붙는 장) / 열넷(문장만) · D 지도 하나 ·
 *    E 여섯 · 채점표 스물넷)을 넘지 않는다.
 *  · B · C · 채점표는 글 길이로 어림한 높이(`GEOMETRY` — `paper.module.css` 의 치수를 옮긴 값)가 장의 몸 높이를
 *    넘으면 천장 전이라도 다음 장으로 넘긴다. **넘침 0 이 빈 공간보다 먼저다** — 어림은 넉넉히(크게) 잡는다.
 *  · A · B · E 는 마지막 두 장을 고르게 나눈다(9 + 2 → 6 + 5) — 칸이 늘어나 장을 채우므로 한두 칸만 남은 장이 없게.
 *    C · 채점표는 앞에서부터 채운다(문장 · 줄은 늘어나지 않아, 고르게 나누면 두 장이 다 빈다).
 *  · A · D · E 는 칸이 늘고 줄어드는(flex) 틀이라 천장만 본다.
 * 넘침 0 · 어림이 실제보다 작지 않음은 Playwright 가 인쇄 매체로 잰다(`e2e/concept-blank-paper`).
 */
export const PAGE_CAPS = {
  recall: 4,
  term: 9,
  /** C — 적용이 붙는 장의 문장 수(시안 «문장 여덟 + 적용»). */
  cloze: 8,
  /** C — 문장만 있는 장의 천장. */
  clozeOnly: 14,
  map: 1,
  figure: 6,
  /** 채점표 — 천장. 줄 높이 예산이 먼저 차면 거기서 끊는다. */
  key: 24,
} as const;

/**
 * 어림에 쓰는 치수(px, 96dpi A4 794×1123) — `paper.module.css` 와 짝. 몸 높이 · 한 덩이 높이는 Playwright 인쇄 매체에서
 * 잰 값이다(2026-09-30 · `e2e/concept-blank-paper/estimate.spec.ts` 가 어림 ≥ 실제를 잠근다).
 */
export const GEOMETRY = {
  /**
   * 학생지 첫 장 · 이어지는 장의 몸 높이(머리 · 발 사이). 잰 값 913.6(제목 두 줄) · 1015.5 에서
   * 어림이 못 보는 것(높은 수식 줄 등)을 위해 15~18px 을 남긴다.
   * 2026-10-01(트랙 cb-code) — 모든 장 맨 아래 지면 코드 줄(아래 `codeLine` 16px)만큼 낮췄다(남기는 여유는 그대로).
   */
  bodyFirst: 895 - 16,
  bodyNext: 1000 - 16,
  /**
   * 채점표 첫 장 · 이어지는 장의 줄 칸 높이(머리 · 표 머리를 뺀 자리, 채점 안내 상자는 따로 뺀다).
   * 잰 값 952.8(제목 한 줄 20px — 40자 제목도 글씨가 줄어 한 줄이다) · 1017.3 에서 한 줄(17)쯤 남긴다.
   * 제목이 두 줄로 접혀도(939.8) 넘지 않는 값이다. 코드 줄만큼 낮춘 것은 학생지와 같다.
   */
  keyFirst: 935 - 16,
  keyNext: 1000 - 16,
  /** 지면 코드 줄 — 위 여백 4 + 한 줄 12(9px 고딕). `paper.module.css` `.codeLine` 과 짝. */
  codeLine: 16,
  /** 채점 안내 상자 — 위 여백 12 + 테두리 · 안쪽 22 + «채점» 19.2, 줄마다 17.6(11px · 1.6). */
  notes: { fixed: 53.2, line: 17.6, font: 11, width: 666 },
  contentWidth: 694,
  /** 문항 번호 열(`--cb-num`) — 어림은 넓은 쪽(세 자리 번호)으로 본다. */
  numberWidth: 52,
  /** B 용어 — 위아래 안쪽 10 + 점선 1 + 줄 위 2, 용어 한 줄 22.5(15px · 1.5), 쓰기 줄 30. */
  term: { font: 15, line: 22.5, ruledLine: 30, fixed: 13 },
  /** B ○× — 위아래 안쪽 10 + 점선 1 + 까닭 줄 위 8 + 까닭 한 줄 30 + 번호 줄 넘김 2.3, 첫 ○× 앞 안내 줄 28. */
  ox: { font: 13.5, line: 20.25, fixed: 51.3, part: 28 },
  /** C 문장 — 위아래 안쪽 14 + 점선 1 + 사이 4, 한 줄 30.1(14px · 2.15). «가» 머리 34 + 목록 아래 14. */
  sentence: { font: 14, line: 30.1, fixed: 19.1, part: 48 },
  /**
   * C 적용 — 테두리 · 안쪽 26 + 답 줄 36, 물음 줄 21, 사이 12. «나» 머리 34.
   * 풀 자리가 있어야 해서 한 칸을 `min` 보다 낮게 어림하지 않는다(칸은 남는 높이만큼 더 늘어난다).
   */
  apply: {
    font: 14,
    line: 21,
    fixed: 62,
    gap: 12,
    part: 34,
    width: 612,
    min: 120,
  },
  key: {
    font: 11.5,
    /** 11.5px · 1.55 */
    line: 17.83,
    /** 예 · 물음 줄 — 10px · 1.55 + 위 여백 2 */
    sub: 15.5,
    subGap: 2,
    /** 소단원 이름 — 9px · 1.55 + 위 여백 2 */
    place: 13.95,
    /** 칸 위아래 7 + 밑줄 1 + 기준선 맞춤 여유 1 */
    fixed: 16,
    conceptWidth: 118,
    textWidth: 508,
    /** 그림 줄 — 작은 그림(폭 150) 옆 글 칸 */
    figureTextWidth: 348,
  },
} as const;

/**
 * 지면 코드 줄(트랙 cb-code)의 정원 — 점 뺀 글자 수. 가장 넓은 글자로만 지은 코드가 글 폭 694px 한 줄에 서는 수에서 내렸다.
 * `e2e/concept-blank-paper/code.spec.ts`(글꼴 둘 — 이 PC 의 제품 스택 · Pretendard)가 «잰 정원 ≥ 이 값»을 잠근다.
 * 넘는 코드는 찍지 않고 «코드 없음»(리드 2026-10-01) — 쪽 나눔은 코드 길이와 상관없이 같다.
 */
export const SHEET_CODE_LINE_CAPACITY = 60;

/* ───────── 학생지 한 장 ───────── */

export type RecallZone = Extract<
  ConceptBlankSheet,
  { form: "recall" }
>["zones"][number];
export type TermBlock =
  | { kind: "term"; n: number; entry: ConceptEntry }
  | { kind: "ox"; n: number; item: OxItem };
export type ClozeBlock =
  | { kind: "sentence"; n: number; entry: ConceptEntry }
  | { kind: "apply"; n: number; item: ApplyItem };
export type MapPlan = Extract<
  ConceptBlankSheet,
  { form: "map" }
>["maps"][number];

export type StudentPage =
  | { form: "recall"; zones: { n: number; zone: RecallZone }[] }
  | { form: "term"; blocks: TermBlock[] }
  | { form: "cloze"; blocks: ClozeBlock[] }
  | { form: "map"; n: number; map: MapPlan }
  | { form: "figure"; cards: { n: number; figure: FigureItem }[] };

/* ───────── 채점표 한 줄 ───────── */

export type KeyRow =
  | {
      kind: "concept";
      n: string;
      entry: ConceptEntry;
      /** B/C는 일반 설명이 아니라 당시 문항의 답으로 채점한다. 없는 값은 옛 지면 또는 A/D다. */
      questionForm?: "term" | "cloze";
      /** 채점 칸 아래 작은 글(A 의 소단원 · D 의 지도 이름). */
      place?: string;
      /** 예 줄 — D 는 예 칸의 답(예가 없으면 «뜻에 맞는 예»), A 는 참고로 은행의 예. */
      example?: "answer" | "reference" | "free";
    }
  | { kind: "ox"; n: string; item: OxItem }
  | { kind: "apply"; n: string; item: ApplyItem }
  | { kind: "figure"; n: string; item: FigureItem };

export type SheetPlan = {
  sheet: ConceptBlankSheet;
  student: StudentPage[];
  key: KeyRow[][];
  /** 학생지 첫 장 발의 «맞은 개수» 칸. */
  tally: string;
};

/** 천장 · 높이 어림으로 앞에서부터 채운다. 한 덩이가 몸보다 커도 빈 장을 만들지 않고 그 장에 혼자 둔다. */
export function packPages<T>(
  items: readonly T[],
  cap: number,
  cost: (item: T, prev: T | undefined) => number,
  body: (pageIndex: number) => number,
): T[][] {
  const pages: T[][] = [];
  let page: T[] = [];
  let used = 0;
  for (const item of items) {
    const c = cost(item, page[page.length - 1]);
    if (
      page.length > 0 &&
      (page.length >= cap || used + c > body(pages.length))
    ) {
      pages.push(page);
      page = [];
      used = 0;
    }
    used += cost(item, page[page.length - 1]);
    page.push(item);
  }
  if (page.length) pages.push(page);
  return pages;
}

/**
 * 고르게 나누기 — 앞에서부터 채운 장 수는 그대로 두고, 장마다 덩이 수를 비슷하게(9 + 2 → 6 + 5).
 * 칸이 늘어나 장을 채우는 형식(A · B · E)에 쓴다 — 한두 칸만 남은 마지막 장이 없게.
 * 고르게 나눈 것이 높이 때문에 장이 늘면 앞에서부터 채운 것을 그대로 쓴다(장 수는 절대 늘지 않는다).
 */
export function packBalanced<T>(
  items: readonly T[],
  cap: number,
  cost: (item: T, prev: T | undefined) => number,
  body: (pageIndex: number) => number,
): T[][] {
  const greedy = packPages(items, cap, cost, body);
  if (greedy.length < 2) return greedy;
  const even = packPages(
    items,
    Math.ceil(items.length / greedy.length),
    cost,
    body,
  );
  return even.length === greedy.length ? even : greedy;
}

const G = GEOMETRY;
const studentBody = (i: number) => (i === 0 ? G.bodyFirst : G.bodyNext);
const keyBody = (i: number) => (i === 0 ? G.keyFirst : G.keyNext);
const qWidth = G.contentWidth - G.numberWidth;
/** 높이를 보지 않는 형식(A · E — 칸이 늘고 줄어든다)의 천장만 보는 나누기. */
const byCount = <T>(items: readonly T[], cap: number) =>
  packBalanced(
    items,
    cap,
    () => 0,
    () => Infinity,
  );

/**
 * 문항 번호 열의 폭(px) — 지면 하나 안에서는 한 값이다(번호 뒤 글이 한 줄에 선다). 번호가 두 자리까지면 44,
 * 세 자리(문항 100개부터)면 52. 어림(`GEOMETRY.numberWidth`)은 늘 넓은 쪽으로 본다 — 글 칸이 좁을수록 줄이 는다.
 */
export function numberColumnWidth(sheet: ConceptBlankSheet): 44 | 52 {
  const count =
    sheet.form === "term"
      ? sheet.terms.length + sheet.ox.length
      : sheet.form === "cloze"
        ? sheet.sentences.length + sheet.apply.length
        : sheet.form === "figure"
          ? sheet.figures.length
          : 0;
  return count >= 100 ? 52 : 44;
}

/**
 * B 답 칸의 최소 쓰기 줄 — 새 질문은 참고 답의 보이는 글 32자마다 한 줄을 남긴다.
 * 옛 동결 자료는 뜻 문장이 짧으면 한 줄, 아니면 두 줄인 기존 규칙을 유지한다.
 * 길이는 **보이는 글자 수**(계약의 `visibleLength` — 띄어쓰기 빼고)로 잰다. 수식 마크업까지 세면 `$1000\,\mathrm{m}$` 하나가
 * 열여덟 자라, 짧은 뜻도 다 두 줄이 된다.
 */
export const termRuledLines = (entry: ConceptEntry): number => {
  const shown = plainSentence(termAnswer(entry));
  const spaces = shown.replace(/\$[^$]*\$/g, "").match(/\s/g)?.length ?? 0;
  if (entry.bQuestion)
    return Math.max(1, Math.ceil((visibleLength(shown) - spaces) / 32));
  return visibleLength(shown) - spaces <= 18 ? 1 : 2;
};

/**
 * 수식이 든 줄은 글줄보다 높아질 수 있다(제품 수식 경로는 수식을 본문의 1.21배로, 분수를 크게 그린다).
 * 수식 줄의 높이를 글씨 크기의 배수로 본다 — 갈래마다 잰 값(`e2e/concept-blank-paper/calibrate.ts` · 2026-09-30)에 여유:
 *
 * | 갈래 | 잰 줄 높이(em) | 어림 | 보기 |
 * |---|---|---|---|
 * | `small` 글자 · 첨자 · 근호 · 윗줄 · 괄호 | ≤ 1.71 | 1.8 | `x^2` · `\sqrt{b^2-4ac}` · `\overline{AB}` · `\sin 30^\circ` · `(a+b)^2` |
 * | `raised` 글자 위에 얹는 것 · 괄호와 만난 근호 | ≤ 2.11 | 2.25 | `\overset{\frown}{AB}` · `\overleftrightarrow{AB}` · `\sqrt 2(\sqrt 3+1)` |
 * | `tall` 분수 한 겹 · 괄호 안 근호에 첨자 | 2.43 ~ 2.49 | 2.6 | `\frac{1}{2}` · `-\frac{b}{a}` · `(-\sqrt 5)^2` |
 * | `tallPlus` 분수 + 첨자 · 근호 · 늘인 괄호 · 윗줄 | 2.64 ~ 3.15 | 3.3 | `\left(-\frac{2}{3}\right)^2` · `\sqrt{\frac{1}{2}}` · 근의 공식 |
 * | `huge` 겹친 분수 · 합 · 적분 · 여러 줄 | 3.73 ~ 3.89 | 4.2(여러 줄은 줄 수만큼) | `\frac{1}{1+\frac{1}{2}}` |
 *
 * 그 높이가 글줄 높이(`linePx`)를 넘는 만큼만 더한다 — 줄 간격이 넓은 C 문장(30.1px)은 분수가 있어야 늘고, 촘촘한 채점표
 * (17.8px)는 글자 수식에도 조금 는다. 수식이 든 줄은 기준선이 어긋나 1~2px 늘 수 있어 줄마다 `MATH_LINE_MIN` 은 더한다.
 * 수식 조각 하나가 한 줄을 높인다고 보고(긴 수식은 연산자에서 줄이 바뀌니 300px 마다 한 줄 더), 글의 줄 수를 넘지 않게
 * 높은 것부터 센다.
 */
const MATH_LINE_EM = {
  small: 1.8,
  raised: 2.25,
  tall: 2.6,
  tallPlus: 3.3,
  huge: 4.2,
} as const;
type MathKind = keyof typeof MATH_LINE_EM;
const MATH_LINE_MIN = 3;
const ROOT = /[\\]sqrt(?![a-zA-Z])/;
const PAREN = /[()]|[\\](?:left|right)(?![a-zA-Z])/;
const SCRIPT = /[\^_]/;
const FRACTION = /[\\](?:d?frac|tfrac|over|binom)(?![a-zA-Z])/;
const FRACTION_AT = /[\\](?:d?frac|tfrac)(?![a-zA-Z])/y;
const HUGE_MATH = /[\\](?:cfrac|sum|int|prod|lim|begin)(?![a-zA-Z])/;
/** 분수와 같이 있으면 줄을 더 높이는 것 — 첨자 · 근호 · 늘인 괄호 · 윗줄 · 얹는 것. */
const STACKER =
  /[\^_]|[\\](?:sqrt|left|right|big+[lr]?|overline|underline|overset|underset|bar|hat|vec|dot|tilde|widehat|overrightarrow|overleftarrow|overleftrightarrow)(?![a-zA-Z])/i;
/** 글자 위에 얹는 것(분수 없이) — 순환소수의 점(`0.\dot{3}`)도 글줄을 위로 민다(굵은 용어에서 잰 값 1.85em). */
const RAISER =
  /[\\](?:overset|underset|stackrel|widehat|hat|vec|tilde|d?dot|overrightarrow|overleftarrow|overleftrightarrow)(?![a-zA-Z])/;
const MATH_ROW_BREAK = /[\\]{2}/g;
const MATH_SEGMENT = /\$[^$]*\$/g;

/**
 * 분수 안에 분수가 또 있는가 — 겹친 분수는 한 겹보다 훨씬 높다. 나란히 놓인 분수 둘
 * (`\frac{2}{3}\times\frac{9}{4}`)은 겹친 것이 아니다. 분수의 두 묶음 `{ }{ }` 이 열려 있는 동안 분수를 또 만나면 겹친 것.
 */
export function hasNestedFraction(segment: string): boolean {
  let depth = 0;
  /** 방금 본 분수의 아직 안 열린 묶음 수. */
  let pending = 0;
  /** 분수 묶음이 열린 중괄호 깊이. */
  const open: number[] = [];
  for (let i = 0; i < segment.length; i++) {
    FRACTION_AT.lastIndex = i;
    const found = FRACTION_AT.exec(segment);
    if (found) {
      if (open.length) return true;
      pending = 2;
      i += found[0].length - 1;
      continue;
    }
    const ch = segment[i];
    if (ch === "{") {
      depth += 1;
      if (pending) {
        pending -= 1;
        open.push(depth);
      }
    } else if (ch === "}") {
      if (open[open.length - 1] === depth) open.pop();
      depth -= 1;
    }
  }
  return false;
}

/** 수식 조각 하나의 갈래. */
export function mathKind(segment: string): MathKind {
  if (HUGE_MATH.test(segment) || hasNestedFraction(segment)) return "huge";
  if (FRACTION.test(segment))
    return STACKER.test(segment) ? "tallPlus" : "tall";
  // 근호가 괄호와 만나면 근호는 위로, 괄호는 아래로 줄을 민다 — 거기에 첨자까지 붙으면 분수만큼 높다
  if (ROOT.test(segment) && PAREN.test(segment))
    return SCRIPT.test(segment) ? "tall" : "raised";
  return RAISER.test(segment) ? "raised" : "small";
}

/** 그 갈래의 수식 줄 높이(글씨 크기의 배수) — 여러 줄 수식(`\\` 로 나눈 것)은 줄 수만큼 높다. */
function mathLineEm(segment: string, kind: MathKind): number {
  if (kind !== "huge") return MATH_LINE_EM[kind];
  const rows = (segment.match(MATH_ROW_BREAK)?.length ?? 0) + 1;
  return Math.max(MATH_LINE_EM.huge, rows * 1.9 + 0.8);
}

export function mathExtra(
  text: string,
  lines: number,
  fontPx: number,
  linePx: number,
): number {
  if (!text.includes("$")) return 0;
  /** 수식이 높이는 줄마다의 높이(em) — 조각 하나가 한 줄(긴 조각은 여러 줄). */
  const heights: number[] = [];
  for (const segment of text.match(MATH_SEGMENT) ?? [text]) {
    const em = mathLineEm(segment, mathKind(segment));
    const spread = 1 + Math.floor((mathEm(segment) * fontPx) / 300);
    for (let i = 0; i < spread; i++) heights.push(em);
  }
  return heights
    .sort((a, b) => b - a)
    .slice(0, lines)
    .reduce(
      (extra, em) => extra + Math.max(MATH_LINE_MIN, em * fontPx - linePx),
      0,
    );
}

/** B 한 문항의 가장 낮은 높이(쓰기 줄은 남는 만큼 더 늘어난다). */
export function termCost(
  block: TermBlock,
  prev: TermBlock | undefined,
): number {
  if (block.kind === "term") {
    const prompt = termPrompt(block.entry);
    // 용어는 굵은 글이다 — 그 안의 수식도 굵은 벌로 그려져 넓다
    const lines = estimateLines(prompt, G.term.font, qWidth, BOLD_MATH);
    return (
      G.term.fixed +
      lines * G.term.line +
      mathExtra(prompt, lines, G.term.font, G.term.line) +
      termRuledLines(block.entry) * G.term.ruledLine
    );
  }
  const text = block.item.statement;
  const lines = estimateLines(text, G.ox.font, qWidth);
  return (
    G.ox.fixed +
    lines * G.ox.line +
    mathExtra(text, lines, G.ox.font, G.ox.line) +
    (prev?.kind === "ox" ? 0 : G.ox.part)
  );
}

/** C 한 덩이의 가장 낮은 높이 — 문장은 빈칸(끊기지 않는 조각)을 낀 채 낱말 단위로 줄을 센다. */
export function clozeCost(
  block: ClozeBlock,
  prev: ClozeBlock | undefined,
): number {
  if (block.kind === "sentence") {
    const text = clozeSentence(block.entry);
    const lines = wrapLines(sentenceAtoms(text, G.sentence.font), qWidth);
    // 학생지에 그려지는 수식은 글 조각의 것뿐이다 — 핵심어의 수식(`{$\frac{1}{2}$}`)은 밑줄 빈칸이라 줄을 높이지 않는다
    const shown = splitSentence(text)
      .filter((piece) => piece.kind === "text")
      .map((piece) => piece.text)
      .join(" ");
    return (
      G.sentence.fixed +
      lines * G.sentence.line +
      mathExtra(shown, lines, G.sentence.font, G.sentence.line) +
      (prev?.kind === "sentence" ? 0 : G.sentence.part)
    );
  }
  const text = block.item.prompt;
  const lines = estimateLines(text, G.apply.font, G.apply.width);
  return (
    Math.max(
      G.apply.min,
      G.apply.fixed +
        lines * G.apply.line +
        mathExtra(text, lines, G.apply.font, G.apply.line),
    ) +
    G.apply.gap +
    (prev?.kind === "apply" ? 0 : G.apply.part)
  );
}

/** 뜻 문장 글 — 채점표는 핵심어를 굵게 그대로 쓴다(수식 안의 TeX 묶음 { } 는 건드리지 않는다). */
const keySentence = (row: Extract<KeyRow, { kind: "concept" }>) =>
  row.questionForm === "cloze"
    ? clozeSentence(row.entry)
    : row.questionForm === "term"
      ? termAnswer(row.entry)
      : row.entry.definition;
const keyText = (row: Extract<KeyRow, { kind: "concept" }>) =>
  plainSentence(keySentence(row));

export function keyRowCost(row: KeyRow): number {
  const k = G.key;
  /** `bold` — 굵은 글(개념 칸 · 굵은 답 · 굵은 핵심어가 든 뜻)이면 수식 폭을 굵은 벌로 센다. */
  const scale = (bold: boolean) => (bold ? BOLD_MATH : 1);
  const main = (text: string, width: number = k.textWidth, bold = false) => {
    const lines = estimateLines(text, k.font, width, scale(bold));
    return lines * k.line + mathExtra(text, lines, k.font, k.line);
  };
  const sub = (text: string, bold = false) => {
    const lines = estimateLines(text, 10, k.textWidth - 10, scale(bold));
    return k.subGap + lines * k.sub + mathExtra(text, lines, 10, k.sub);
  };
  /** 개념 칸 — 굵은 용어 + 그 아래 자리 줄(소단원 이름 · 지도 이름). 소단원 이름에도 수식이 있다(`sectionTitleTex` — 분수면 줄이 높다). */
  const concept = (label: string, place?: string) => {
    if (!place) return main(label, k.conceptWidth, true);
    const lines = estimateLines(place, 9, k.conceptWidth);
    return (
      main(label, k.conceptWidth, true) +
      k.subGap +
      lines * k.place +
      mathExtra(place, lines, 9, k.place)
    );
  };
  /**
   * 칸들은 첫 줄 기준선을 맞춘다 — 한 칸의 첫 줄에 수식이 있어 높으면 **옆 칸**이 그만큼 내려온다. 그래서 줄 높이는
   * «칸 높이 + 옆 칸 첫 줄이 높아진 만큼» 가운데 큰 쪽이다(수식이 든 칸 자신은 내려오지 않는다 — 두 번 세지 않는다).
   */
  const rise = (text: string, font: number = k.font, line: number = k.line) =>
    mathExtra(text, 1, font, line);
  switch (row.kind) {
    case "concept": {
      const ex = row.entry.example;
      const criteria =
        row.questionForm === "term" ? termCriteria(row.entry) : [];
      const alternatives =
        row.questionForm === "cloze" ? clozeAlternatives(row.entry) : [];
      const assessmentLines = [
        ...criteria.map((line, index) => `확인할 내용 ${index + 1}: ${line}`),
        ...alternatives,
      ].reduce((sum, line) => sum + sub(line), 0);
      // 예의 답 · 핵심어는 굵다 — 거기 수식이 있으면 그 글줄의 수식을 굵은 벌로 센다(넉넉한 쪽)
      const exLine =
        row.example && ex
          ? sub(`예(참고) ${ex.prompt} → ${ex.answer}`, ex.answer.includes("$"))
          : row.example === "free"
            ? sub("예 — 학생이 든 예가 뜻에 맞으면 ○")
            : 0;
      const boldKey = sentenceKeywords(keySentence(row)).some((key) =>
        key.includes("$"),
      );
      return (
        k.fixed +
        Math.max(
          concept(row.entry.term, row.place) + rise(keyText(row)),
          main(keyText(row), k.textWidth, boldKey) +
            assessmentLines +
            exLine +
            rise(row.entry.term),
        )
      );
    }
    case "ox":
      return (
        k.fixed +
        Math.max(
          main("○×", k.conceptWidth) + rise(row.item.why),
          main(`${row.item.answer ? "○" : "×"} · ${row.item.why}`) +
            sub(row.item.statement),
        )
      );
    case "apply":
      return (
        k.fixed +
        Math.max(
          main("적용", k.conceptWidth) + rise(row.item.prompt, 10, k.sub),
          sub(row.item.prompt) -
            k.subGap +
            main(row.item.answer, k.textWidth, true),
        )
      );
    case "figure": {
      const [, , w, h] = row.item.viewBox.split(" ").map(Number);
      const svg = Math.min(96, (150 * h!) / w!) + 2;
      const text =
        (row.item.tags.length
          ? main(
              `이름표: ${row.item.tags.map((t) => t.answer).join(" · ")}`,
              k.figureTextWidth,
              true,
            )
          : 0) +
        row.item.lines.reduce(
          (sum, l) => sum + main(`${l.label}: ${l.answer}`, k.figureTextWidth),
          0,
        );
      return (
        k.fixed +
        Math.max(main(row.item.prompt, k.conceptWidth, true), svg, text)
      );
    }
  }
}

/** 뜻을 문장으로 쓰는 칸(B · D)의 기준 — 굵은 부분은 내용 기준이고, 느슨한 것은 말 · 식 · 단위의 꼴이다. */
const MEANING_RULE =
  "굵은 부분의 뜻이 모두 있어야 ○. 말 · 식 · 단위의 꼴이 달라도 된다.";
/** 굵은 글이 용어 이름인 줄의 기준(합의 안건 12) — 핵심어 표기를 늘리지 않고 채점 안내로 가른다. */
const NAME_RULE =
  "굵은 글이 용어와 같으면 그 이름은 답이 아니다 — 이름을 뺀 나머지 뜻이 문장과 같으면 ○.";
/** A 채점표에서 사례 문항을 뺐을 때만 붙이는 말(합의 안건 11) — 뺀 것이 없는 지면에는 헛말이다. */
const CASES_LEFT_OFF =
  " 용어에 주어진 값으로 답이 정해지는 사례 문항은 싣지 않았다.";

/**
 * 채점 안내(채점표 마지막 장 아래) — 우리 말.
 * 🔴 «굵은 핵심어가 다 들어가야 ○»라고 쓰지 않는다(전수 검토 2026-10-02 · 26 §10) — 같은 뜻의 다른 말 · 같은 값의 다른 꼴이
 * 오답이 된다. «본보기 답»이라고도 쓰지 않는다 — 굵은 내용을 빼도 되게 읽혀 교사마다 ○× 가 갈린다.
 */
export function keyNotes(sheet: ConceptBlankSheet): string[] {
  // 굵은 글이 용어 이름인 줄(`…을 {세로셈}이라 한다`)이 있을 때만 — 그 이름은 학생이 본 글이라 답이 아니다.
  const nameOnly = (entries: readonly ConceptEntry[]) =>
    entries.some((c) => termIsKeyword(c.term, c.definition)) ? [NAME_RULE] : [];
  switch (sheet.form) {
    case "recall":
      return [
        `칸에 적힌 것을 아래 ${sheet.key.length}개와 맞춰 본다. 굵은 부분의 뜻이 다 있으면 ○, 하나 빠지면 △, 없으면 ×.`,
        `말 · 식의 꼴이 달라도 뜻이 같으면 있는 것으로 본다.${sheet.omittedCases ? CASES_LEFT_OFF : ""}`,
        "«떠올린 개념»에는 ○ 개수를 적는다. 그림 · 예 칸은 채점하지 않고 뜻이 모자랄 때 보탬으로 본다.",
      ];
    case "term":
      return [
        ...(sheet.terms.some((entry) => entry.bQuestion)
          ? [
              "문항 하나가 한 개. 확인할 내용을 모두 답했으면 ○. 참고 답과 말 · 식의 꼴이 달라도 뜻이 같으면 ○.",
            ]
          : [`문항 하나가 한 개. ${MEANING_RULE}`]),
        ...nameOnly(sheet.terms.filter((entry) => !entry.bQuestion)),
        ...(sheet.ox.length ? ["○× 는 표시와 까닭이 둘 다 맞아야 한 개."] : []),
      ];
    case "cloze": {
      const blanks = sheet.sentences.reduce(
        (sum, s) => sum + sentenceKeywords(clozeSentence(s)).length,
        0,
      );
      return [
        ...(sheet.sentences.length
          ? [
              `가 — 빈칸 하나가 한 개(${blanks}개). 굵은 글이 빈칸의 답이다. 같은 값 · 같은 뜻의 다른 꼴도 ○.`,
            ]
          : []),
        ...(sheet.apply.length
          ? [
              // 적용의 답은 까닭이 든 문장이다(26 §11) — 문장이 같아야 ○ 가 아니다
              `나 — 문항 하나가 한 개(${sheet.apply.length}개). 결론과 까닭이 다 있어야 ○ — 말이 달라도 뜻이 같으면 된다.`,
            ]
          : []),
      ];
    }
    case "map": {
      const nodes = sheet.maps.reduce((s, m) => s + m.nodes.length, 0);
      return [
        `가지마다 «뜻» 한 칸 + «예» 한 칸 — 모두 ${nodes * 2}칸.`,
        `«뜻»은 ${MEANING_RULE}`,
        ...nameOnly(sheet.maps.flatMap((m) => m.nodes)),
        "예 칸이 비어 있던 가지는 학생이 든 예가 뜻에 맞으면 ○.",
      ];
    }
    case "figure": {
      const cells = sheet.figures.reduce(
        (s, f) => s + f.tags.length + f.lines.length,
        0,
      );
      return [
        `이름표 한 칸 · 줄 한 칸이 각각 한 개 — 모두 ${cells}칸.`,
        "이름표는 작은 그림 속 네모에 적힌 답과 맞춰 본다.",
      ];
    }
  }
}

/** 채점 안내 상자 높이 — 채점표 마지막 장 아래. */
export function notesCost(notes: readonly string[]): number {
  const n = G.notes;
  return (
    n.fixed +
    notes.reduce(
      (sum, note) => sum + estimateLines(`· ${note}`, n.font, n.width) * n.line,
      0,
    )
  );
}

/**
 * 채점표 쪽 나누기 — 줄을 천장 · 높이로 앞에서부터 채운다. 마지막 장에 채점 안내 상자가 안 들어가면 **마지막 줄 하나만**
 * 상자와 함께 다음 장으로 넘긴다(상자만 홀로 넘어가지 않게 · 앞 장은 줄로 꽉 찬 채 둔다).
 */
export function packKeyPages(
  rows: readonly KeyRow[],
  notes: readonly string[],
): KeyRow[][] {
  const pages = packPages(rows, PAGE_CAPS.key, keyRowCost, keyBody);
  const last = pages[pages.length - 1];
  if (last && last.length > 1) {
    const used = last.reduce((sum, r) => sum + keyRowCost(r), 0);
    if (used + notesCost(notes) > keyBody(pages.length - 1))
      pages.push([last.pop()!]);
  }
  return pages;
}

/** 형식마다 채점표 줄 — 학생지와 같은 번호 · 같은 순서(쪽 나눔만 다르다). */
function keyRows(sheet: ConceptBlankSheet, student: StudentPage[]): KeyRow[] {
  switch (sheet.form) {
    case "recall": {
      const zoneOf = new Map(
        sheet.zones.map((z, i) => [z.section, { i, title: z.title }]),
      );
      return sheet.key.map((entry, i) => {
        const zone = zoneOf.get(entry.section);
        return {
          kind: "concept",
          n: String(i + 1),
          entry,
          place: zone ? `${circled(zone.i + 1)} ${zone.title}` : undefined,
          example: entry.example ? "reference" : undefined,
        };
      });
    }
    case "term":
    case "cloze":
      return student.flatMap((page) =>
        page.form === "term" || page.form === "cloze"
          ? page.blocks.map((b): KeyRow => {
              const n = String(b.n);
              if (b.kind === "term" || b.kind === "sentence")
                return {
                  kind: "concept",
                  n,
                  entry: b.entry,
                  questionForm:
                    b.kind === "term"
                      ? b.entry.bQuestion
                        ? "term"
                        : undefined
                      : b.entry.clozeQuestion
                        ? "cloze"
                        : undefined,
                };
              return b.kind === "ox"
                ? { kind: "ox", n, item: b.item }
                : { kind: "apply", n, item: b.item };
            })
          : [],
      );
    case "map": {
      let n = 0;
      return sheet.maps.flatMap((map) =>
        map.nodes.map((entry): KeyRow => ({
          kind: "concept",
          n: String(++n),
          entry,
          place: map.hub,
          example: entry.example ? "answer" : "free",
        })),
      );
    }
    case "figure":
      return sheet.figures.map((item, i) => ({
        kind: "figure",
        n: String(i + 1),
        item,
      }));
  }
}

/**
 * C 쪽 나누기 — 문장은 앞에서부터 채우고(문장만 있는 장은 열넷까지), 적용은 문장이 여덟 이하인 장에만 붙는다
 * (시안 «문장 여덟 + 적용»). 적용이 붙을 자리가 없으면 적용만 다음 장으로 간다.
 */
export function packCloze(blocks: readonly ClozeBlock[]): ClozeBlock[][] {
  const pages: ClozeBlock[][] = [];
  let page: ClozeBlock[] = [];
  let used = 0;
  for (const block of blocks) {
    const cost = clozeCost(block, page[page.length - 1]);
    const sentences = page.filter((b) => b.kind === "sentence").length;
    const full =
      used + cost > studentBody(pages.length) ||
      (block.kind === "sentence"
        ? sentences >= PAGE_CAPS.clozeOnly
        : sentences > PAGE_CAPS.cloze);
    if (page.length > 0 && full) {
      pages.push(page);
      page = [];
      used = 0;
    }
    used += clozeCost(block, page[page.length - 1]);
    page.push(block);
  }
  if (page.length) pages.push(page);
  return pages;
}

function studentPages(sheet: ConceptBlankSheet): StudentPage[] {
  switch (sheet.form) {
    case "recall":
      return byCount(
        sheet.zones.map((zone, i) => ({ n: i + 1, zone })),
        PAGE_CAPS.recall,
      ).map((zones) => ({ form: "recall", zones }));
    case "term": {
      const blocks: TermBlock[] = [
        ...sheet.terms.map((entry, i) => ({
          kind: "term" as const,
          n: i + 1,
          entry,
        })),
        ...sheet.ox.map((item, i) => ({
          kind: "ox" as const,
          n: sheet.terms.length + i + 1,
          item,
        })),
      ];
      if (sheet.entryOrder) {
        const order = new Map(
          sheet.entryOrder.map((entry, i) => [
            `${entry.entryKind}:${entry.entryId}`,
            i,
          ]),
        );
        blocks.sort(
          (a, b) =>
            order.get(
              a.kind === "term" ? `concept:${a.entry.id}` : `ox:${a.item.id}`,
            )! -
            order.get(
              b.kind === "term" ? `concept:${b.entry.id}` : `ox:${b.item.id}`,
            )!,
        );
        blocks.forEach((block, i) => {
          block.n = i + 1;
        });
      }
      return packBalanced(blocks, PAGE_CAPS.term, termCost, studentBody).map(
        (page) => ({ form: "term", blocks: page }),
      );
    }
    case "cloze": {
      const blocks: ClozeBlock[] = [
        ...sheet.sentences.map((entry, i) => ({
          kind: "sentence" as const,
          n: i + 1,
          entry,
        })),
        ...sheet.apply.map((item, i) => ({
          kind: "apply" as const,
          n: sheet.sentences.length + i + 1,
          item,
        })),
      ];
      if (sheet.entryOrder) {
        const order = new Map(
          sheet.entryOrder.map((entry, i) => [
            `${entry.entryKind}:${entry.entryId}`,
            i,
          ]),
        );
        blocks.sort(
          (a, b) =>
            order.get(
              a.kind === "sentence"
                ? `concept:${a.entry.id}`
                : `apply:${a.item.id}`,
            )! -
            order.get(
              b.kind === "sentence"
                ? `concept:${b.entry.id}`
                : `apply:${b.item.id}`,
            )!,
        );
        blocks.forEach((block, i) => {
          block.n = i + 1;
        });
      }
      return packCloze(blocks).map((b) => ({ form: "cloze", blocks: b }));
    }
    case "map":
      return sheet.maps.map((map, i) => ({ form: "map", n: i + 1, map }));
    case "figure":
      return byCount(
        sheet.figures.map((figure, i) => ({ n: i + 1, figure })),
        PAGE_CAPS.figure,
      ).map((cards) => ({ form: "figure", cards }));
  }
}

function tallyOf(sheet: ConceptBlankSheet): string {
  switch (sheet.form) {
    case "recall":
      return `떠올린 개념 ____ / ${sheet.key.length}`;
    case "term":
      return `맞은 개수 ____ / ${sheet.terms.length + sheet.ox.length}`;
    case "cloze": {
      const blanks = sheet.sentences.reduce(
        (sum, s) => sum + sentenceKeywords(clozeSentence(s)).length,
        0,
      );
      const parts = [];
      if (sheet.sentences.length) parts.push(`빈칸 ____ / ${blanks}`);
      if (sheet.apply.length) parts.push(`적용 ____ / ${sheet.apply.length}`);
      return parts.join(" · ");
    }
    case "map":
      return `채운 칸 ____ / ${sheet.maps.reduce((s, m) => s + m.nodes.length * 2, 0)}`;
    case "figure":
      return `맞은 칸 ____ / ${sheet.figures.reduce((s, f) => s + f.tags.length + f.lines.length, 0)}`;
  }
}

/**
 * 담을 것이 없는 지면(A 채점 줄 0 · B · C 문항 0 · D 지도 0 · E 그림 0)은 뽑지 않는다. A 는 칸(소단원)이 있어도
 * 채점 줄이 0 이면 뺀다 — 손으로 만든 `?s=` 에서 개념 수가 전부 0 이면 채점표만은 빈 화면, 학생지 발은 «/ 0» 이었다
 * (리뷰 2026-10-01). 화면의 문항 수(`ConceptBlankView` 의 `itemCount`)도 A 는 채점 줄 수로 센다.
 */
export function sheetHasContent(sheet: ConceptBlankSheet): boolean {
  switch (sheet.form) {
    case "recall":
      return sheet.zones.length > 0 && sheet.key.length > 0;
    case "term":
      return sheet.terms.length + sheet.ox.length > 0;
    case "cloze":
      return sheet.sentences.length + sheet.apply.length > 0;
    case "map":
      return sheet.maps.some((m) => m.nodes.length > 0);
    case "figure":
      return sheet.figures.length > 0;
  }
}

/** 지면 하나 → 학생지 장들 · 채점표 장들 · 맞은 개수 칸. */
export function planSheet(sheet: ConceptBlankSheet): SheetPlan {
  const student = studentPages(sheet);
  const rows = keyRows(sheet, student);
  return {
    sheet,
    student,
    key: packKeyPages(rows, keyNotes(sheet)),
    tally: tallyOf(sheet),
  };
}
