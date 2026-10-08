/**
 * **지면 관문의 자** — 판정형의 보기(식)가 제품의 보기 배치로 **접히지 않고** 칸에 들어가는가
 * (2026-10-08 엔진 보강 2단계 · 리드 결정 «C»).
 *
 * ## 왜 있나 — 시험이 다 초록인데 문제지에서 식이 접혔다
 *
 * 판정형은 보기가 **식**이다(`\left(-\dfrac{11}{4}\right)\times\left(-\dfrac{2}{11}\right)`). 보기의 열 수는
 * 제품의 자동 규칙이 정한다(`src/lib/math/choiceLayout.ts` 의 `choiceColumnCount("auto")` — 표시폭이 다섯 다
 * 24 이하면 2열). 그 자(`src/lib/math/displayWidth.ts`)는 글리프를 세는데, 큰 괄호와 분수가 든 식을 실제보다
 * 좁게 본다 — 위 식을 16단위(≈112px)로 보지만 실제는 134px 이고, 통합 시험지 2단의 2열 칸은 127.6px 이다.
 * 2026-10-08 표본을 제품 지면으로 떠 보니 두 수 비교형의 43~65% · 거듭제곱 판정의 87% 가 칸에서 접혔다
 * (`docs/planning/tracks/reports/engine-judge-step2.md` §지면). 값이 맞는가를 보는 시험은 이것을 못 본다.
 *
 * 인쇄 쪽 자는 건드리지 않는다(기존 문항의 열 수가 바뀐다 — 리드가 따로 올린다). 여기서는 판정형이
 * **지금의 제품 규칙 아래에서** 접히지 않는 문항만 내게 한다:
 *
 *   ⑴ 열 수는 제품 함수를 **그대로 부른다**(옮겨 적지 않는다 — 제품의 규칙이 바뀌면 같이 바뀐다)
 *   ⑵ 식의 실제 폭은 KaTeX 글리프 폭으로 계산한다 — 우리 문항이 찍는 꼴만 읽는다
 *   ⑶ 그 폭이 그 열 수의 칸보다 넓으면 «접힌다»
 *
 * ## 폭 계산 — KaTeX 의 글꼴 치수 그대로
 *
 * KaTeX 의 조판은 글꼴 치수로 정해진다(`katex/dist/katex.js` 의 `fontMetricsData`). 수 · 부호 · 분수 ·
 * `\left(…\right)` · 거듭제곱 · 한 글자 문자가 전부라 원자 사이 간격 규칙(TeXbook 18장)까지 그대로 옮길 수 있다.
 * Chromium 실측(4,800 보기)과 0.5px 안에서 맞는다 — 시험이 실측값 몇을 못 박아 둔다(`judgePaper.test.ts`).
 * 읽는 꼴이 아니면 null — 폭을 모르는 문항은 관문이 안 낸다(넓게 읽으려 애쓰지 않는다).
 */
import { choiceColumnCount } from "../../math/choiceLayout";

// ── KaTeX 글꼴 치수 (em) — katex 0.18 `fontMetricsData` ───────────────────────────
/** Main-Regular 숫자 한 자 */
const DIGIT = 0.5;
/** Main-Regular `+` `−` `×` `÷` `=` */
const SIGN = 0.77778;
/** Main-Regular `(` `)` — 분수를 품지 않은 `\left(…\right)` */
const PAREN = 0.38889;
/** Size3-Regular `(` `)` — `\dfrac` 을 품은 `\left(…\right)` */
const PAREN_TALL = 0.73611;
/** Math-Italic — 식의 값 문형이 쓰는 문자 둘 */
const LETTER: Readonly<Record<string, number>> = { x: 0.57153, a: 0.52859 };
/** 분수 좌우의 빈 구분자(`.nulldelimiter`) */
const NULL_DELIMITER = 0.12;
/** 지수 — 첨자 크기 0.7 */
const SCRIPT = 0.7;
/** 지수 뒤의 여백(`scriptspace` 0.5pt) */
const SCRIPT_SPACE = 0.05;
/** 원자 사이 간격 — thin 3mu · medium 4mu · thick 5mu */
const THIN = 3 / 18;
const MEDIUM = 4 / 18;
const THICK = 5 / 18;

type Kind = "ord" | "bin" | "rel" | "inner";
/** 원자 하나 — 종류 · 폭 · 분수를 품었나(괄호 크기를 정한다). */
type Atom = { kind: Kind; w: number; tall: boolean };

/** 원자 사이 간격(본문 크기) — TeXbook 18장의 표에서 우리 원자 넷만. */
function gap(a: Kind, b: Kind): number {
  if (a === "bin" || b === "bin") return MEDIUM;
  if (a === "rel" || b === "rel") return THICK;
  if (a === "inner" || b === "inner") return THIN;
  return 0;
}

/** 원자 줄의 폭 — 이항 연산자가 맨 앞 · 연산자 뒤 · 맨 끝 · 관계 기호 앞이면 부호(ord)로 조판된다. */
function widthOf(atoms: readonly Atom[]): number {
  const kinds = atoms.map((a, i): Kind => {
    if (a.kind !== "bin") return a.kind;
    const prev = atoms[i - 1]?.kind;
    const next = atoms[i + 1]?.kind;
    const unary =
      prev === undefined ||
      prev === "bin" ||
      prev === "rel" ||
      next === undefined ||
      next === "rel";
    return unary ? "ord" : "bin";
  });
  let w = 0;
  atoms.forEach((a, i) => {
    w += a.w;
    if (i > 0) w += gap(kinds[i - 1]!, kinds[i]!);
  });
  return w;
}

/** 한 번 읽기 — 실패는 null 로 올린다. */
class Reader {
  private at = 0;
  constructor(private readonly s: string) {}

  done(): boolean {
    return this.at === this.s.length;
  }

  private eat(word: string): boolean {
    if (!this.s.startsWith(word, this.at)) return false;
    this.at += word.length;
    return true;
  }

  /** `{…}` 한 덩어리의 원자 줄. */
  private group(): Atom[] | null {
    if (!this.eat("{")) return null;
    const atoms = this.sequence("}");
    return atoms !== null && this.eat("}") ? atoms : null;
  }

  /** 닫는 글(`}` · `\right)`)이나 끝을 만날 때까지 원자를 읽는다. */
  sequence(close: string | null): Atom[] | null {
    const out: Atom[] = [];
    while (!this.done()) {
      if (close !== null && this.s.startsWith(close, this.at)) return out;
      const digits = /^\d+/.exec(this.s.slice(this.at));
      if (digits) {
        this.at += digits[0].length;
        out.push({ kind: "ord", w: DIGIT * digits[0].length, tall: false });
      } else if (this.eat("\\left(")) {
        const inner = this.sequence("\\right)");
        if (inner === null || !this.eat("\\right)")) return null;
        const tall = inner.some((a) => a.tall);
        out.push({
          kind: "inner",
          w: widthOf(inner) + 2 * (tall ? PAREN_TALL : PAREN),
          tall,
        });
      } else if (this.eat("\\dfrac")) {
        const num = this.group();
        const den = num === null ? null : this.group();
        if (num === null || den === null) return null;
        out.push({
          kind: "ord",
          w: Math.max(widthOf(num), widthOf(den)) + 2 * NULL_DELIMITER,
          tall: true,
        });
      } else if (this.eat("^")) {
        // 지수 — 자연수만. 바로 앞 원자에 붙는다.
        const base = out.at(-1);
        const e = /^\{(\d+)\}/.exec(this.s.slice(this.at));
        if (!base || !e) return null;
        this.at += e[0].length;
        base.w += DIGIT * SCRIPT * e[1]!.length + SCRIPT_SPACE;
      } else if (this.eat("\\times") || this.eat("\\div")) {
        out.push({ kind: "bin", w: SIGN, tall: false });
      } else {
        const c = this.s[this.at]!;
        const letter = LETTER[c];
        if (c === "+" || c === "-")
          out.push({ kind: "bin", w: SIGN, tall: false });
        else if (c === "=") out.push({ kind: "rel", w: SIGN, tall: false });
        else if (letter !== undefined)
          out.push({ kind: "ord", w: letter, tall: false });
        else return null;
        this.at += 1;
      }
    }
    return close === null ? out : null;
  }
}

/** 식(`$` 없이)이 한 줄로 조판될 때의 폭(em) — 우리 문항이 찍는 꼴이 아니면 null. */
export function texWidthEm(tex: string): number | null {
  const reader = new Reader(tex.replace(/\s+/g, ""));
  const atoms = reader.sequence(null);
  if (atoms === null || atoms.length === 0) return null;
  return widthOf(atoms);
}

/** 보기 글 `$식$` 의 폭(em) — 수식 한 덩어리가 아니면 null. */
export function choiceWidthEm(choiceText: string): number | null {
  const t = choiceText.trim();
  if (!t.startsWith("$") || !t.endsWith("$") || t.length < 3) return null;
  const body = t.slice(1, -1);
  return body.includes("$") ? null : texWidthEm(body);
}

// ── 칸 — 제품 지면에서 잰 것 (2026-10-08 · Chromium · 제품 컴포넌트 그대로) ──────────────

/** KaTeX 는 본문 글자의 1.21 배로 조판한다(`.katex { font-size: 1.21em }`). */
const KATEX_SCALE = 1.21;

/**
 * 보기 한 칸에서 **수식이 쓸 수 있는 폭**(마커 ① 과 간격을 뺀 것) — 지면 둘.
 * 통합 시험지 2단이 더 좁다(문항 열 327.2px — `choiceLayout.ts` 머리말의 실측과 같은 값이다).
 * 🔴 제품의 지면 치수가 바뀌면 다시 잰다 — 시험이 제품 상수(`choiceColumnLimit` · `JASEUP_MEASURED_PX`)와
 *    맞대어 두었다(`judgePaper.test.ts`). 재는 도구는 `scripts/qa/judge-paper/`.
 */
export const JUDGE_PAPERS = [
  {
    name: "통합 시험지 2단",
    fontPx: 13.5,
    roomPx: { 1: 307.2, 2: 127.6 },
  },
  {
    name: "일일테스트(TestPrint)",
    fontPx: 12.5,
    roomPx: { 1: 345, 2: 147.3 },
  },
] as const;

/** 칸 끝에 남기는 여유 — 폭이 칸과 1~2px 차이면 글꼴 · 반올림에 따라 접힐 수 있다. */
export const PAPER_MARGIN_PX = 4;

/** 그 열 수의 칸이 받아 주는 식의 폭(em) — 지면 둘 가운데 좁은 쪽. 모르는 열 수면 0(아무것도 안 들어간다). */
export function choiceRoomEm(columns: number): number {
  if (columns !== 1 && columns !== 2) return 0;
  return Math.min(
    ...JUDGE_PAPERS.map(
      (p) => (p.roomPx[columns] - PAPER_MARGIN_PX) / (p.fontPx * KATEX_SCALE),
    ),
  );
}

/** 보기 다섯의 지면 판정 — 제품이 고르는 열 수 · 그 칸의 폭 · 보기마다의 식 폭 · 들어가는가. */
export type PaperVerdict = {
  columns: number;
  roomEm: number;
  /** 보기 차례대로 — 폭을 못 잰 보기는 null */
  widthsEm: readonly (number | null)[];
  /** 접히는(또는 폭을 못 잰) 첫 보기의 자리 — 다 들어가면 -1 */
  worst: number;
};

export function paperVerdict(choiceTexts: readonly string[]): PaperVerdict {
  // 🔴 열 수는 제품의 규칙을 그대로 부른다 — 여기에 문턱을 옮겨 적지 않는다.
  const columns = choiceColumnCount("auto", choiceTexts);
  const roomEm = choiceRoomEm(columns);
  const widthsEm = choiceTexts.map(choiceWidthEm);
  return {
    columns,
    roomEm,
    widthsEm,
    worst: widthsEm.findIndex((w) => w === null || w > roomEm),
  };
}

/** 보기 다섯이 제품의 보기 배치로 접히지 않고 들어가는가. */
export function fitsPaper(choiceTexts: readonly string[]): boolean {
  return paperVerdict(choiceTexts).worst === -1;
}

/** 식 하나(`$` 없이)가 2열 칸에 들어가는가 — 비교형이 보기를 하나씩 고를 때 미리 거른다. */
export function fitsTwoColumnRoom(tex: string): boolean {
  const w = texWidthEm(tex);
  return w !== null && w <= choiceRoomEm(2);
}
