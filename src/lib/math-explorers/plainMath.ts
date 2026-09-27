/**
 * 통합 탐험 개념 카드의 «일반 글자 수식» → 제품 수식 표기(`$…$` + LaTeX) — 트랙 K (2026-09-27).
 *
 * 원장님(학생 폰에서 탐험을 처음부터 해 보신 뒤): «카텍스 적용시키고».
 *
 * 카드 자료(`definition-content.ts`·`definition-cards.ts`, 230개념)는 원장님이 주신 패키지를 **그대로**
 * 들여온 것이고 원본 SHA-256 을 `PROVENANCE.md` 에 박아 두었다 — 자료는 고치지 않고 **그릴 때** 이 함수를
 * 지난다(`components/math-explorers/ExplorerMath.tsx`). 자료는 수식을 일반 글자로 적었다:
 * `x + 2 = 5` · `x²` · `1/2` · `√9` · `3cm` · `90°` · `1과 1/2`(대분수) · `빨강:파랑 = 2:3`.
 *
 * 규칙 — 모양별 기대값은 `src/__tests__/unit/mathExplorersPlainMath.test.ts` 의 규칙 표:
 *  - **숫자 하나도 수식으로 둔다.** 원장님 «모든 숫자는 일반텍스트 말고 KaTeX»(2026-08-22 — 초등 엔진
 *    `n()`)이고, 한 걸음 문항도 «숫자는 모두 수식 안»을 시험으로 지킨다. 같은 학생 화면끼리 같은 모양.
 *  - 한글은 수식 밖이다. 한글에 끼인 연산자는 연산자만 수식이 된다(`빨강:파랑` → `빨강$:$파랑`).
 *  - 분수는 **피연산자 사이의 `/`** 만 세운다. `중심각/360°` 는 빗금 그대로 — 한글은 분자에 못 넣는다
 *    (제품 전처리가 수식 안 한글을 밖으로 떼어 낸다).
 *  - 대분수 «자연수 + 과/와 + 진분수»(`1과 1/2`)는 `1\frac{1}{2}` — 초등 엔진 `fracLatex` 와 같은 모양.
 *  - 단위는 `\,\mathrm{cm}` — 초등 엔진 `unitNum` 과 같은 모양.
 *  - 공백은 연산자·쉼표·함수·단위를 사이에 둘 때만 한 식으로 잇는다. 수와 수가 연산자 없이 띄어 있으면
 *    두 식이다(`1L 500mL`) — 수식 안에서는 공백이 사라져 `1 L500 mL` 로 붙는다.
 *  - 이미 `$…$` 인 구간은 건드리지 않는다 — 두 번 지나도 같다.
 *
 * 채점과 무관하다 — 채점은 보기의 **번호**(choice id)로 하고 이 함수는 그리는 글자만 바꾼다.
 */

type Lexeme =
  | {
      k:
        | "ws"
        | "text"
        | "num"
        | "var"
        | "unit"
        | "func"
        | "sup"
        | "op"
        | "sym"
        | "lp"
        | "rp"
        | "comma";
      v: string;
    }
  | { k: "mixed"; v: string; whole: string; num: string; den: string };

const FUNCTIONS = new Set(["sin", "cos", "tan"]);
/** 자료에 나오는 단위 전부. `m`·`g`·`L` 는 자료에서 변수로 쓰이지 않는다(전수 시험이 본다). */
const UNITS = new Set(["mm", "cm", "km", "m", "g", "kg", "mL", "L"]);
/** 변수(곱 `ab`·`xy` 포함)·점 이름(`AB`·`SSS`). 그 밖의 라틴 낱말(`prime number`)은 글이다. */
const VARIABLE = /^(?:[abcdnpqxy]+|[A-Z]+)$/;
const SUPERSCRIPT: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  ⁿ: "n",
};
const OPERATORS: Record<string, string> = {
  "+": "+",
  "−": "-",
  "-": "-",
  "×": "\\times",
  "÷": "\\div",
  "=": "=",
  "≠": "\\ne",
  "<": "<",
  ">": ">",
  "≤": "\\le",
  "≥": "\\ge",
  "±": "\\pm",
  ":": ":",
  "/": "/",
  "→": "\\rightarrow",
  "↔": "\\leftrightarrow",
};
/** 홀로 선 기호. `°`·`%` 는 앞 수에 붙고 `√` 는 뒤 피연산자를 덮는다. */
const SYMBOLS: Record<string, string> = {
  π: "\\pi",
  "…": "\\cdots",
  "□": "\\square",
  "△": "\\triangle",
  "°": "^{\\circ}",
  "%": "\\%",
  "√": "\\sqrt",
};
/** 수식이 될 수 있는 글자 — 대분수 앞자리가 이것이면 식의 일부다(`3/6과 2/6` 의 `6`). */
const MATH_CHAR = /[0-9A-Za-z⁰-⁹²³¹ⁿ+\-−×÷=≠<>≤≥±:/√π°%…→↔□△()]/;

function lex(text: string): Lexeme[] {
  const out: Lexeme[] = [];
  const pushText = (value: string) => {
    const last = out.at(-1);
    if (last?.k === "text") last.v += value;
    else out.push({ k: "text", v: value });
  };
  for (let i = 0; i < text.length;) {
    const rest = text.slice(i);
    const ch = text[i]!;
    const space = /^\s+/.exec(rest);
    const mixed = /^(\d+)[과와] (\d+)\/(\d+)(?![\d./])/.exec(rest);
    const number = /^\d+(?:\.\d+)?/.exec(rest);
    const word = /^[A-Za-z]+/.exec(rest)?.[0];
    const sup = /^[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+/.exec(rest)?.[0];
    if (space) {
      out.push({ k: "ws", v: space[0] });
      i += space[0].length;
    } else if (
      mixed &&
      Number(mixed[2]) > 0 &&
      Number(mixed[2]) < Number(mixed[3]) &&
      // 앞이 식이면 대분수가 아니다 — `3/6과 2/6` 의 `6` 은 분모다.
      !MATH_CHAR.test(text.slice(0, i).trimEnd().at(-1) ?? "")
    ) {
      out.push({
        k: "mixed",
        v: mixed[0],
        whole: mixed[1]!,
        num: mixed[2]!,
        den: mixed[3]!,
      });
      i += mixed[0].length;
    } else if (number) {
      out.push({ k: "num", v: number[0] });
      i += number[0].length;
    } else if (word) {
      if (FUNCTIONS.has(word)) out.push({ k: "func", v: word });
      else if (UNITS.has(word)) out.push({ k: "unit", v: word });
      else if (VARIABLE.test(word)) out.push({ k: "var", v: word });
      else pushText(word);
      i += word.length;
    } else if (sup) {
      out.push({ k: "sup", v: sup });
      i += sup.length;
    } else {
      if (ch in OPERATORS) out.push({ k: "op", v: ch });
      else if (ch in SYMBOLS) out.push({ k: "sym", v: ch });
      else if (ch === "(") out.push({ k: "lp", v: ch });
      else if (ch === ")") out.push({ k: "rp", v: ch });
      else if (ch === ",") out.push({ k: "comma", v: ch });
      else pushText(ch);
      i += 1;
    }
  }
  return out;
}

const OPERAND_START = new Set(["num", "mixed", "var", "unit", "func", "lp"]);
const OPERAND_END = new Set(["num", "mixed", "var", "unit", "sup", "rp"]);
const startsOperand = (t: Lexeme | undefined) =>
  !!t &&
  (OPERAND_START.has(t.k) ||
    (t.k === "sym" && "π…□△√".includes(t.v)) ||
    (t.k === "op" && "−-+".includes(t.v)));
const endsOperand = (t: Lexeme | undefined) =>
  !!t && (OPERAND_END.has(t.k) || (t.k === "sym" && t.v !== "√"));

/** 괄호 짝 — 안에 글(한글)이 없을 때만 수식 괄호다. 짝이 없거나 글을 품으면 글 괄호. */
function mathParens(lexemes: Lexeme[]): Set<number> {
  const math = new Set<number>();
  lexemes.forEach((t, open) => {
    if (t.k !== "lp") return;
    let depth = 0;
    for (let j = open; j < lexemes.length; j += 1) {
      const u = lexemes[j]!;
      if (u.k === "text") return;
      if (u.k === "lp") depth += 1;
      if (u.k === "rp" && --depth === 0) {
        math.add(open).add(j);
        return;
      }
    }
  });
  return math;
}

type Item = {
  tex: string;
  operand: boolean;
  /** 괄호째 선 피연산자의 안쪽 — 분자·분모·근호 안에 들어가면 괄호를 벗는다. */
  inner?: string;
  op?: string;
};

function joinTex(items: Item[]): string {
  let tex = "";
  for (const item of items) {
    // `\times3` 도 맞는 LaTeX 지만 `\sin A` 는 띄어야 한다 — 명령 뒤 글자·숫자는 늘 띄운다.
    if (/\\[A-Za-z]+$/.test(tex) && /^[A-Za-z0-9]/.test(item.tex)) tex += " ";
    tex += item.tex;
  }
  return tex;
}

/** 한 식(괄호 안 포함)의 낱말 → LaTeX 조각. */
function toItems(lexemes: Lexeme[]): Item[] {
  const items: Item[] = [];
  let sqrt = false;
  const pushOperand = (item: Item) => {
    if (sqrt) {
      item = { tex: `\\sqrt{${item.inner ?? item.tex}}`, operand: true };
      sqrt = false;
    }
    items.push(item);
  };
  const attach = (suffix: string) => {
    const last = items.at(-1);
    if (last?.operand) {
      last.tex += suffix;
      last.inner = undefined;
    } else items.push({ tex: `{}${suffix}`, operand: true });
  };
  for (let i = 0; i < lexemes.length; i += 1) {
    const t = lexemes[i]!;
    if (t.k === "ws") continue;
    if (t.k === "num" || t.k === "var")
      pushOperand({ tex: t.v, operand: true });
    else if (t.k === "mixed")
      pushOperand({
        tex: `${t.whole}\\frac{${t.num}}{${t.den}}`,
        operand: true,
      });
    else if (t.k === "unit") {
      // 수 뒤 단위는 그 수에 붙인다(`3\,\mathrm{cm}`) — 뒤따르는 `²` 가 단위에 걸린다.
      const last = items.at(-1);
      if (last?.operand) {
        last.tex += `\\,\\mathrm{${t.v}}`;
        last.inner = undefined;
      } else pushOperand({ tex: `\\mathrm{${t.v}}`, operand: true });
    } else if (t.k === "func") items.push({ tex: `\\${t.v}`, operand: false });
    else if (t.k === "sup")
      attach(`^{${[...t.v].map((ch) => SUPERSCRIPT[ch]).join("")}}`);
    else if (t.k === "sym") {
      if (t.v === "√") sqrt = true;
      else if (t.v === "°") attach(SYMBOLS[t.v]!);
      else if (t.v === "%" && items.at(-1)?.operand) attach(SYMBOLS[t.v]!);
      else pushOperand({ tex: SYMBOLS[t.v]!, operand: true });
    } else if (t.k === "op")
      items.push({ tex: OPERATORS[t.v]!, operand: false, op: t.v });
    else if (t.k === "comma") items.push({ tex: ",", operand: false });
    else if (t.k === "lp") {
      let depth = 0;
      let close = i;
      for (; close < lexemes.length; close += 1) {
        const u = lexemes[close]!;
        if (u.k === "lp") depth += 1;
        if (u.k === "rp" && --depth === 0) break;
      }
      const inner = joinTex(toItems(lexemes.slice(i + 1, close)));
      pushOperand({ tex: `(${inner})`, operand: true, inner });
      i = close;
    } else items.push({ tex: t.v, operand: false });
  }
  if (sqrt) items.push({ tex: "\\surd", operand: true });
  // 피연산자 사이의 `/` 만 분수로. 앞 분수를 먼저 세워 `1/2 × 1/3` 이 각각 선다.
  for (let i = 1; i < items.length - 1; i += 1) {
    const [left, slash, right] = [items[i - 1]!, items[i]!, items[i + 1]!];
    if (slash.op !== "/" || !left.operand || !right.operand) continue;
    items.splice(i - 1, 3, {
      tex: `\\frac{${left.inner ?? left.tex}}{${right.inner ?? right.tex}}`,
      operand: true,
    });
    i -= 1;
  }
  return items;
}

function convertProse(text: string): string {
  const lexemes = lex(text);
  const parens = mathParens(lexemes);
  const mathable = (j: number) => {
    const t = lexemes[j];
    if (!t) return false;
    if (t.k === "lp" || t.k === "rp") return parens.has(j);
    return !["ws", "text", "comma"].includes(t.k);
  };
  let out = "";
  let chunk: Lexeme[] | null = null;
  let depth = 0;
  const last = () => chunk?.findLast((t) => t.k !== "ws");
  const flush = () => {
    if (chunk) out += `$${joinTex(toItems(chunk))}$`;
    chunk = null;
    depth = 0;
  };
  /**
   * 쉼표는 괄호 안(`(2, −3)`)이거나 **붙여 쓴** 목록(`1,3,5`)일 때만 식 안이다. 띄어 쓴 목록
   * (`3, 3, 4` · `x+y=3, x−y=1`)은 수마다 따로 세우고 쉼표는 글로 둔다 — 초등 엔진의 나열
   * (`$485$, $342$`)과 같은 모양이고, `x축 방향으로 p, y축` 의 `p` 와 `y` 를 한 식으로 묶지 않는다.
   */
  const commaJoins = (j: number) =>
    depth > 0 ||
    (endsOperand(last()) && startsOperand(lexemes[j + 1]) && mathable(j + 1));
  /** 공백은 연산자·쉼표·함수·단위·`…` 를 사이에 둘 때만 식을 잇는다. */
  const wsJoins = (j: number) => {
    const next = lexemes[j + 1];
    if (!next) return false;
    if (next.k === "comma") return commaJoins(j + 1);
    if (!mathable(j + 1)) return false;
    if (depth > 0) return true;
    const prev = last();
    return (
      ["op", "func", "comma", "lp"].includes(prev?.k ?? "") ||
      (prev?.k === "sym" && prev.v === "…") ||
      ["op", "rp", "unit"].includes(next.k) ||
      (next.k === "sym" && next.v === "…")
    );
  };
  lexemes.forEach((t, j) => {
    if (chunk && t.k === "ws" && wsJoins(j)) return;
    if (t.k === "comma" && chunk && commaJoins(j)) {
      chunk.push(t);
      return;
    }
    if (t.k !== "ws" && t.k !== "comma" && mathable(j)) {
      (chunk ??= []).push(t);
      if (t.k === "lp") depth += 1;
      if (t.k === "rp") depth -= 1;
      return;
    }
    flush();
    out += t.v;
  });
  flush();
  return out;
}

/** 탐험 카드 글 한 조각 → 제품 수식 표기. 이미 `$…$` 인 구간은 그대로 둔다. */
export function plainMathToTex(text: string): string {
  const cached = cache.get(text);
  if (cached !== undefined) return cached;
  const result = text
    .split(/(\$[^$]*\$)/)
    .map((part) => (part.startsWith("$") ? part : convertProse(part)))
    .join("");
  cache.set(text, result);
  return result;
}

/** 카드 글은 230개념 × 스무 남짓 — 자료가 고정이라 캐시가 끝없이 자라지 않는다. */
const cache = new Map<string, string>();
