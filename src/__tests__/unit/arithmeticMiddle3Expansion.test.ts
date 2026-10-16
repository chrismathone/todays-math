// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import katex from "katex";
import { ALGEBRA_RADICAL_SUPPLEMENT_DEFINITIONS } from "@/lib/arithmetic-v2/families/middle/algebraRadicalSupplement";
import { FACTORIZATION_DEFINITIONS } from "@/lib/arithmetic-v2/families/algebraComplete/factorization";
import { QUADRATIC_DEFINITIONS } from "@/lib/arithmetic-v2/families/algebraComplete/quadratic";
import { TRIGONOMETRY_COMPLETE_DEFINITIONS } from "@/lib/arithmetic-v2/families/trigonometryComplete";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
} from "@/lib/arithmetic-v2/types";

/** Track F (2026-10-16): 중3 radical / factorization / quadratic / figure-free
 * trigonometry drills. Every oracle below is written from the task statement,
 * without production arithmetic helpers, so the generator, its solver and its
 * verifier are each checked against an outside reading of the specification.
 *
 * Trivial-item screen (documented, asserted per family below):
 * - sqrt families never use a perfect-square radicand (√36 → x=1, 정수 부분 6).
 * - integers-between always has at least one integer in the interval.
 * - numeric formula drills never show the round base itself (k ≠ 0) and the
 *   difference-of-squares drill never shows b = 0.
 * - perfect-square / double-root drills never show a zero linear coefficient.
 * - the trig expression never divides a value by itself and never has a
 *   negative result (the shared renderer would print "-1√3/2").
 * - the parallelogram always has both sides ≥ 2.
 */
type Spec = {
  id: string;
  grade: "중3";
  curriculum: { semester: 1 | 2; unit: string };
  size: number;
};
const specs: Spec[] = [
  {
    id: "m3-sqrt-natural-multiplier",
    grade: "중3",
    curriculum: { semester: 1, unit: "제곱근과 실수" },
    size: 220,
  },
  {
    id: "m3-sqrt-integer-part",
    grade: "중3",
    curriculum: { semester: 1, unit: "제곱근과 실수" },
    size: 440,
  },
  {
    id: "m3-sqrt-decimal-part",
    grade: "중3",
    curriculum: { semester: 1, unit: "제곱근과 실수" },
    size: 440,
  },
  {
    id: "m3-sqrt-integers-between",
    grade: "중3",
    curriculum: { semester: 1, unit: "제곱근과 실수" },
    size: 2332,
  },
  {
    id: "m3-radical-mixed",
    grade: "중3",
    curriculum: { semester: 1, unit: "제곱근과 실수" },
    size: 2352,
  },
  {
    id: "m3-formula-numeric",
    grade: "중3",
    curriculum: { semester: 1, unit: "다항식의 곱셈과 인수분해" },
    size: 707,
  },
  {
    id: "m3-factor-numeric",
    grade: "중3",
    curriculum: { semester: 1, unit: "다항식의 곱셈과 인수분해" },
    size: 243,
  },
  {
    id: "m3-perfect-square-constant",
    grade: "중3",
    curriculum: { semester: 1, unit: "다항식의 곱셈과 인수분해" },
    size: 96,
  },
  {
    id: "m3-perfect-square-linear-coefficient",
    grade: "중3",
    curriculum: { semester: 1, unit: "다항식의 곱셈과 인수분해" },
    size: 40,
  },
  {
    id: "m3-quadratic-double-root-constant",
    grade: "중3",
    curriculum: { semester: 1, unit: "이차방정식" },
    size: 96,
  },
  {
    id: "m3-quadratic-double-root-coefficient",
    grade: "중3",
    curriculum: { semester: 1, unit: "이차방정식" },
    size: 40,
  },
  {
    id: "m3-trig-special-expression",
    grade: "중3",
    curriculum: { semester: 2, unit: "삼각비" },
    size: 640,
  },
  {
    id: "m3-trig-parallelogram-area-special-angle",
    grade: "중3",
    curriculum: { semester: 2, unit: "삼각비" },
    size: 198,
  },
];
const all: ArithmeticV2Definition[] = [
  ...ALGEBRA_RADICAL_SUPPLEMENT_DEFINITIONS,
  ...FACTORIZATION_DEFINITIONS,
  ...QUADRATIC_DEFINITIONS,
  ...TRIGONOMETRY_COMPLETE_DEFINITIONS,
];
const definition = (id: string): ArithmeticV2Definition => {
  const found = all.find((d) => d.id === id);
  if (!found) throw new Error(`missing definition ${id}`);
  return found;
};

// ---------- independent integer helpers (no production imports) ----------
const range = (lo: number, hi: number) =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const nonzero = (k: number) => range(-k, k).filter((n) => n !== 0);
function isqrt(n: number): number {
  let k = 0;
  while ((k + 1) * (k + 1) <= n) k++;
  return k;
}
const isSquare = (n: number) => isqrt(n) * isqrt(n) === n;
const nonsquares = (lo: number, hi: number) =>
  range(lo, hi).filter((n) => !isSquare(n));
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
function reduce(n: number, d: number): [number, number] {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}
/** Largest square divisor searched downward: [outside, squarefree inside]. */
function split(n: number): [number, number] {
  for (let k = isqrt(n); k >= 1; k--)
    if (n % (k * k) === 0) return [k, n / (k * k)];
  throw new Error("unreachable");
}
const sqrtOfSquare = (a: number) => {
  const k = isqrt(a);
  if (k * k !== a) throw new Error(`not a square: ${a}`);
  return k;
};

// ---------- expected answers ----------
type Expected = { kind: ArithmeticV2Answer["kind"]; exact: string[] };
const integer = (n: number): Expected => ({
  kind: "integer",
  exact: [String(n)],
});
const rationalKind = (n: number, d: number): Expected => {
  const [p, q] = reduce(n, d);
  return { kind: "rational", exact: [String(p), String(q)] };
};
/** Supplement surd normal form: triples [key, n, d] ascending by key, key 1 is rational. */
function supplementSurd(terms: Map<number, [number, number]>): Expected {
  const exact = [...terms]
    .filter(([, [n]]) => n !== 0)
    .sort(([a], [b]) => a - b)
    .flatMap(([key, [n, d]]) => {
      const [p, q] = reduce(n, d);
      return [String(key), String(p), String(q)];
    });
  return { kind: "surd", exact };
}
/** Geometry/trig value normal form: integer [n], rational [n,d], surd [n,r,d]. */
function trigValue(n: number, r: number, d: number): Expected {
  const [o, inside] = split(r);
  n *= o;
  r = inside;
  [n, d] = reduce(n, d);
  if (n === 0) return integer(0);
  if (r > 1) return { kind: "surd", exact: [n, r, d].map(String) };
  return d === 1 ? integer(n) : rationalKind(n, d);
}
// Special-angle table as (n, r, d) read from the 1:√3:2 and 1:1:√2 triangles.
const special: [number, number, number][] = [
  [1, 1, 2], // sin30
  [1, 3, 2], // cos30
  [1, 3, 3], // tan30
  [1, 2, 2], // sin45
  [1, 2, 2], // cos45
  [1, 1, 1], // tan45
  [1, 3, 2], // sin60
  [1, 1, 2], // cos60
  [1, 3, 1], // tan60
];
function normalize(n: number, r: number, d: number): [number, number, number] {
  const [o, inside] = split(r);
  n *= o;
  [n, d] = reduce(n, d);
  return [n, n === 0 ? 1 : inside, n === 0 ? 1 : d];
}
function trigExpression([t1, t2, t3, o1, o2]: number[]):
  [number, number, number] | null {
  const [n2, r2, d2] = special[t2],
    [n3, r3, d3] = special[t3];
  const p =
    o2 === 0
      ? normalize(n2 * n3, r2 * r3, d2 * d3)
      : normalize(n2 * d3, r2 * r3, d2 * n3 * r3);
  const [n1, r1, d1] = special[t1];
  if (p[1] !== r1) return null;
  return normalize(n1 * p[2] + (o1 === 0 ? 1 : -1) * p[0] * d1, r1, d1 * p[2]);
}
const bases = [20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 500, 1000];
const sums = [20, 30, 40, 50, 60, 70, 80, 90, 100];
const radicands = [2, 3, 5, 6, 8, 12, 18];

function oracle(id: string, p: number[]): Expected {
  const [a, b, c, d, e] = p;
  switch (id) {
    case "m3-sqrt-natural-multiplier":
      return integer(split(b)[1]);
    case "m3-sqrt-integer-part":
      return integer(isqrt(a) + b);
    case "m3-sqrt-decimal-part": {
      const [outside, inside] = split(a);
      return supplementSurd(
        new Map([
          [1, [-isqrt(a), 1]],
          [inside, [outside, 1]],
        ]),
      );
    }
    case "m3-sqrt-integers-between": {
      let count = 0;
      for (let n = 1; n * n < b; n++) if (n * n > a) count++;
      return integer(count);
    }
    case "m3-radical-mixed": {
      const terms = new Map<number, [number, number]>();
      const [outside, inside] = split(a * b);
      terms.set(inside, [outside, 1]);
      const previous = terms.get(d) ?? [0, 1];
      terms.set(d, [previous[0] * d + c * previous[1], previous[1] * d]);
      return supplementSurd(terms);
    }
    case "m3-formula-numeric": {
      const second = a === 0 ? c : a === 1 ? -c : d;
      return integer((b + c) * (b + second));
    }
    case "m3-factor-numeric": {
      if (a === 0) {
        const x = b / 2 + c,
          y = b / 2 - c;
        return integer(x * x - y * y);
      }
      const x = a === 1 ? b - c : b + c,
        y = c;
      return integer(x * x + (a === 1 ? 2 : -2) * x * y + y * y);
    }
    case "m3-perfect-square-constant":
    case "m3-quadratic-double-root-constant":
      return rationalKind(b * b, 4 * a);
    case "m3-perfect-square-linear-coefficient":
    case "m3-quadratic-double-root-coefficient":
      return integer(2 * sqrtOfSquare(a) * b);
    case "m3-trig-special-expression": {
      const v = trigExpression(p);
      if (!v) throw new Error("mixed radicands");
      return trigValue(v[0], v[1], v[2]);
    }
    case "m3-trig-parallelogram-area-special-angle":
      return trigValue(a * b, c === 30 ? 1 : c === 45 ? 2 : 3, 2);
  }
  void e;
  throw new Error(`no oracle for ${id}`);
}

// ---------- expected prompt text (the human-readable spec) ----------
const trigName = (t: number) => ["\\sin", "\\cos", "\\tan"][t % 3];
const trigAngle = (t: number) => [30, 45, 60][Math.floor(t / 3)];
const trigTerm = (t: number) => `${trigName(t)}${trigAngle(t)}^{\\circ}`;
const quadratic = (a: number, b: number) =>
  `${a === 1 ? "" : a}x^2 ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}x`;
function promptText(id: string, p: number[]): string {
  const [a, b, c, d] = p;
  switch (id) {
    case "m3-sqrt-natural-multiplier":
      return a === 0 ? `√(${b}x)` : `√(${b}/x)`;
    case "m3-sqrt-integer-part":
    case "m3-sqrt-decimal-part":
      return b === 0 ? `√${a}` : `√${a} + ${b}`;
    case "m3-sqrt-integers-between":
      // The candidate schema forbids "<" in display text; the inequality
      // families use the fullwidth sign in text and \lt in latex.
      return `√${a} ＜ n ＜ √${b}`;
    case "m3-radical-mixed":
      return `√${a} × √${b} ${c < 0 ? "-" : "+"} ${Math.abs(c)}/(√${d})`;
    case "m3-formula-numeric":
      return a === 0
        ? `${b + c}²`
        : a === 1
          ? `${b + c} × ${b - c}`
          : `${b + c} × ${b + d}`;
    case "m3-factor-numeric": {
      if (a === 0) return `${b / 2 + c}² - ${b / 2 - c}²`;
      const x = a === 1 ? b - c : b + c;
      return `${x}² ${a === 1 ? "+" : "-"} 2 × ${x} × ${c} + ${c}²`;
    }
    case "m3-perfect-square-constant":
      return `${quadratic(a, b)} + □`;
    case "m3-perfect-square-linear-coefficient":
      return `${a === 1 ? "" : a}x^2 + □x + ${b * b}`;
    case "m3-quadratic-double-root-constant":
      return `${quadratic(a, b)} + k = 0`;
    case "m3-quadratic-double-root-coefficient":
      return `${a === 1 ? "" : a}x^2 + kx + ${b * b} = 0`;
    case "m3-trig-special-expression": {
      const [t1, t2, t3, o1, o2] = p;
      return `$${trigTerm(t1)}${o1 === 0 ? "+" : "-"}${trigTerm(t2)}${o2 === 0 ? "\\times" : "\\div"}${trigTerm(t3)}$`;
    }
    case "m3-trig-parallelogram-area-special-angle":
      return `평행사변형 $ABCD$에서 $\\mathrm{AB}=${a}\\,\\mathrm{cm}$, $\\mathrm{AD}=${b}\\,\\mathrm{cm}$이고 $\\angle A=${c}^{\\circ}$이다.`;
  }
  throw new Error(`no prompt template for ${id}`);
}
const instructions: Record<string, string | ((p: number[]) => string)> = {
  "m3-sqrt-natural-multiplier":
    "자연수가 되도록 하는 가장 작은 자연수 x의 값을 구하시오.",
  "m3-sqrt-integer-part": "정수 부분을 구하시오.",
  "m3-sqrt-decimal-part": "소수 부분을 구하시오.",
  "m3-sqrt-integers-between": "부등식을 만족시키는 자연수 n의 개수를 구하시오.",
  "m3-radical-mixed": "근호를 가장 간단히 하여 계산하시오.",
  "m3-formula-numeric": "곱셈 공식을 이용하여 계산하시오.",
  "m3-factor-numeric": "인수분해를 이용하여 계산하시오.",
  "m3-perfect-square-constant": "완전제곱식이 되도록 하는 □의 값을 구하시오.",
  "m3-perfect-square-linear-coefficient":
    "완전제곱식이 되도록 하는 양수 □의 값을 구하시오.",
  "m3-quadratic-double-root-constant":
    "이차방정식이 중근을 가질 때 상수 k의 값을 구하시오.",
  "m3-quadratic-double-root-coefficient":
    "이차방정식이 중근을 가질 때 양수 k의 값을 구하시오.",
  "m3-trig-special-expression": "정확한 값을 계산하시오.",
  "m3-trig-parallelogram-area-special-angle":
    "평행사변형 ABCD의 넓이를 구하시오.",
};

// ---------- expected domains, in index order ----------
function* domain(id: string): Generator<number[]> {
  switch (id) {
    case "m3-sqrt-natural-multiplier":
      for (const mode of [0, 1])
        for (const a of nonsquares(2, 120)) yield [mode, a];
      return;
    case "m3-sqrt-integer-part":
    case "m3-sqrt-decimal-part":
      for (const n of nonsquares(2, 120))
        for (const c of [0, 1, 2, 3]) yield [n, c];
      return;
    case "m3-sqrt-integers-between":
      for (const a of range(2, 40))
        for (const b of range(2, 100)) {
          if (isSquare(a) || isSquare(b) || b <= a) continue;
          if (oracle(id, [a, b]).exact[0] === "0") continue;
          yield [a, b];
        }
      return;
    case "m3-radical-mixed":
      for (const n of radicands)
        for (const m of radicands)
          for (const c of nonzero(6))
            for (const d of [2, 3, 5, 6]) yield [n, m, c, d];
      return;
    case "m3-formula-numeric":
      // 25² appears once (as 30 − 5), so k = 5 is skipped when base + 10 is a base.
      for (const base of bases)
        for (const k of nonzero(5))
          if (k !== 5 || !bases.includes(base + 10)) yield [0, base, k, 0];
      for (const base of bases)
        for (const k of range(1, 5)) yield [1, base, k, 0];
      for (const base of bases)
        for (const k of nonzero(5))
          for (const m of nonzero(5))
            if (k < m && k + m !== 0) yield [2, base, k, m];
      return;
    case "m3-factor-numeric":
      for (const mode of [0, 1, 2])
        for (const s of sums) for (const k of range(1, 9)) yield [mode, s, k];
      return;
    case "m3-perfect-square-constant":
      for (const a of [1, 4, 9, 16]) for (const b of nonzero(12)) yield [a, b];
      return;
    case "m3-perfect-square-linear-coefficient":
    case "m3-quadratic-double-root-coefficient":
      for (const a of [1, 4, 9, 16]) for (const m of range(1, 10)) yield [a, m];
      return;
    case "m3-quadratic-double-root-constant":
      for (const a of range(1, 4)) for (const b of nonzero(12)) yield [a, b];
      return;
    case "m3-trig-special-expression":
      for (const t1 of range(0, 8))
        for (const t2 of range(0, 8))
          for (const t3 of range(0, 8))
            for (const o1 of [0, 1])
              for (const o2 of [0, 1]) {
                if (o2 === 1 && t2 === t3) continue;
                const v = trigExpression([t1, t2, t3, o1, o2]);
                if (!v || v[0] < 0) continue;
                yield [t1, t2, t3, o1, o2];
              }
      return;
    case "m3-trig-parallelogram-area-special-angle":
      for (const a of range(2, 12))
        for (const b of range(a, 12))
          for (const angle of [30, 45, 60]) yield [a, b, angle];
      return;
  }
  throw new Error(`no domain for ${id}`);
}

// ---------- trivial-item screen ----------
function trivial(id: string, p: number[]): boolean {
  const [a, b, c] = p;
  switch (id) {
    case "m3-sqrt-natural-multiplier":
      return isSquare(b);
    case "m3-sqrt-integer-part":
    case "m3-sqrt-decimal-part":
      return isSquare(a);
    case "m3-sqrt-integers-between":
      return isSquare(a) || isSquare(b) || oracle(id, p).exact[0] === "0";
    case "m3-radical-mixed":
      return c === 0;
    case "m3-formula-numeric":
      return c === 0 || (a === 2 && (p[3] === 0 || p[3] === c));
    case "m3-factor-numeric":
      return c === 0 || (a === 0 && b / 2 - c < 1);
    case "m3-perfect-square-constant":
    case "m3-quadratic-double-root-constant":
      return b === 0;
    case "m3-perfect-square-linear-coefficient":
    case "m3-quadratic-double-root-coefficient":
      return b === 0 || !isSquare(a);
    case "m3-trig-special-expression":
      return (
        (p[4] === 1 && p[1] === p[2]) || Number(oracle(id, p).exact[0]) < 0
      );
    case "m3-trig-parallelogram-area-special-angle":
      return a < 2 || b < 2;
  }
  return true;
}

// ---------- coherent tampered displays (so rejection is mathematical, not textual) ----------
function render(
  kind: ArithmeticV2Answer["kind"],
  exact: string[],
  unit: string,
): ArithmeticV2Answer {
  const textUnit = unit ? ` ${unit}` : "",
    latexUnit = unit === "cm²" ? "\\,\\mathrm{cm}^{2}" : "";
  if (kind === "integer")
    return {
      kind,
      exact,
      text: exact[0] + textUnit,
      latex: exact[0] + latexUnit,
    };
  if (kind === "rational") {
    const [n, d] = exact.map(Number);
    if (unit)
      return {
        kind,
        exact,
        text: `${n}/${d}${textUnit}`,
        latex: `\\frac{${n}}{${d}}${latexUnit}`,
      };
    return {
      kind,
      exact,
      text: d === 1 ? String(n) : `${n}/${d}`,
      latex:
        d === 1 ? String(n) : `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`,
    };
  }
  if (exact.length === 3 && unit !== "supplement") {
    // trig value surd n√r/d
    const [n, r, d] = exact.map(Number);
    const coefficient = n === 1 ? "" : String(n);
    return {
      kind: "surd",
      exact,
      text: `${d === 1 ? `${coefficient}√${r}` : `${coefficient}√${r}/${d}`}${textUnit}`,
      latex: `${d === 1 ? `${coefficient}\\sqrt{${r}}` : `\\frac{${coefficient}\\sqrt{${r}}}{${d}}`}${latexUnit}`,
    };
  }
  // supplement multi-term surd
  const parts = (latex: boolean) => {
    let out = "";
    for (let i = 0; i < exact.length; i += 3) {
      const [key, n, d] = exact.slice(i, i + 3).map(Number);
      const magnitude = Math.abs(n);
      let body: string;
      if (key === 1)
        body =
          d === 1
            ? String(magnitude)
            : latex
              ? `\\frac{${magnitude}}{${d}}`
              : `${magnitude}/${d}`;
      else {
        const numerator = `${magnitude === 1 ? "" : magnitude}${latex ? `\\sqrt{${key}}` : `√${key}`}`;
        body =
          d === 1
            ? numerator
            : latex
              ? `\\frac{${numerator}}{${d}}`
              : `${numerator}/${d}`;
      }
      out += `${out ? (n < 0 ? " - " : " + ") : n < 0 ? "-" : ""}${body}`;
    }
    return out || "0";
  };
  return { kind: "surd", exact, text: parts(false), latex: parts(true) };
}
const supplementIds = new Set([
  "m3-sqrt-natural-multiplier",
  "m3-sqrt-integer-part",
  "m3-sqrt-decimal-part",
  "m3-sqrt-integers-between",
  "m3-radical-mixed",
]);
function tampered(
  id: string,
  c: ArithmeticV2Candidate,
  exact: string[],
): ArithmeticV2Candidate {
  const unit =
    c.prompt.layout === "math" && c.prompt.answerUnit
      ? c.prompt.answerUnit
      : supplementIds.has(id) && c.answer.kind === "surd"
        ? "supplement"
        : "";
  return { ...c, answer: render(c.answer.kind, exact, unit) };
}

describe("중3 arithmetic expansion (track F)", () => {
  it("registers every new type in the catalog with its placement", () => {
    const catalog = new Map(listArithmeticV2Types().map((t) => [t.id, t]));
    for (const spec of specs) {
      const entry = catalog.get(spec.id);
      expect(entry, spec.id).toBeDefined();
      expect(entry!.grade).toBe(spec.grade);
      expect(entry!.curriculum).toEqual(spec.curriculum);
      expect(entry!.domainSize).toBe(spec.size);
      expect(entry!.rankGroup.trim()).not.toBe("");
    }
  });

  for (const spec of specs) {
    const d = () => definition(spec.id);

    it(`${spec.id}: walks the whole domain in specification order with matching prompts and answers`, () => {
      const def = d();
      expect(def.domainSize).toBe(spec.size);
      const seen = new Set<string>(),
        texts = new Set<string>();
      let index = 0;
      for (const p of domain(spec.id)) {
        const c = def.problemAt(index);
        expect(c.parameters, `${spec.id}[${index}]`).toEqual(p);
        expect(c.prompt.layout).toBe("math");
        if (c.prompt.layout !== "math") throw new Error("layout");
        expect(c.prompt.text, `${spec.id}[${index}] text`).toBe(
          promptText(spec.id, p),
        );
        const instruction = instructions[spec.id];
        expect(c.prompt.instruction).toBe(
          typeof instruction === "function" ? instruction(p) : instruction,
        );
        const expected = oracle(spec.id, p);
        expect(
          { kind: c.answer.kind, exact: c.answer.exact },
          `${spec.id}[${index}] answer`,
        ).toEqual(expected);
        expect(def.verify(c), `${spec.id}[${index}] verify`).toBe(true);
        expect(trivial(spec.id, p), `${spec.id}[${index}] trivial`).toBe(false);
        const key = p.join(",");
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        texts.add(`${c.prompt.text}|${c.prompt.instruction}`);
        index++;
      }
      expect(index).toBe(spec.size);
      expect(texts.size).toBe(spec.size);
    });

    it(`${spec.id}: keeps every answer in its documented normal form`, () => {
      const def = d();
      for (let i = 0; i < def.domainSize; i++) {
        const { answer } = def.problemAt(i);
        for (const s of answer.exact) expect(s).toMatch(/^(0|-?[1-9][0-9]*)$/);
        if (answer.kind === "integer") expect(answer.exact).toHaveLength(1);
        else if (answer.kind === "rational") {
          expect(answer.exact).toHaveLength(2);
          const [n, dd] = answer.exact.map(Number);
          expect(dd).toBeGreaterThan(0);
          expect(gcd(n, dd)).toBe(1);
          if (!supplementIds.has(spec.id) && !spec.id.startsWith("m3-trig-"))
            expect(n).not.toBe(0);
          if (spec.id.startsWith("m3-trig-")) expect(dd).toBeGreaterThan(1);
        } else if (supplementIds.has(spec.id)) {
          expect(answer.kind).toBe("surd");
          expect(answer.exact.length % 3).toBe(0);
          let previous = 0;
          for (let j = 0; j < answer.exact.length; j += 3) {
            const [key, n, dd] = answer.exact.slice(j, j + 3).map(Number);
            expect(key).toBeGreaterThan(previous);
            previous = key;
            expect(split(key)[0]).toBe(1);
            expect(n).not.toBe(0);
            expect(dd).toBeGreaterThan(0);
            expect(gcd(n, dd)).toBe(1);
          }
        } else {
          expect(answer.kind).toBe("surd");
          expect(answer.exact).toHaveLength(3);
          const [n, r, dd] = answer.exact.map(Number);
          expect(n).toBeGreaterThan(0);
          expect(r).toBeGreaterThan(1);
          expect(split(r)[0]).toBe(1);
          expect(dd).toBeGreaterThan(0);
          expect(gcd(n, dd)).toBe(1);
        }
      }
    });

    it(`${spec.id}: is deterministic, bounded, verifier-independent and renders in KaTeX`, () => {
      const def = d();
      for (const i of [
        0,
        1,
        Math.floor(def.domainSize / 2),
        def.domainSize - 1,
      ]) {
        const c = def.problemAt(i);
        expect(def.problemAt(i)).toEqual(c);
        expect(def.verify(JSON.parse(JSON.stringify(c)))).toBe(true);
        if (c.prompt.layout !== "math") throw new Error("layout");
        for (const latex of [c.prompt.latex, c.answer.latex])
          expect(() =>
            katex.renderToString(latex, {
              throwOnError: true,
              strict: "error",
            }),
          ).not.toThrow();
        for (const match of c.prompt.text.matchAll(/\$([^$]+)\$/g))
          expect(() =>
            katex.renderToString(match[1], {
              throwOnError: true,
              strict: "error",
            }),
          ).not.toThrow();
      }
      for (const i of [
        -1,
        0.5,
        NaN,
        Infinity,
        def.domainSize,
        Number.MAX_SAFE_INTEGER,
      ])
        expect(() => def.problemAt(i)).toThrow(RangeError);
      const c = def.problemAt(0);
      const spy = vi.spyOn(def, "problemAt").mockImplementation(() => {
        throw new Error("generator called by verifier");
      });
      try {
        expect(def.verify(c)).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });

    it(`${spec.id}: rejects tampered prompts, kinds and mathematically coherent wrong answers`, () => {
      const def = d();
      for (const i of [0, Math.floor(def.domainSize / 2), def.domainSize - 1]) {
        const c = def.problemAt(i);
        if (c.prompt.layout !== "math") throw new Error("layout");
        // The trig expression's first row is [0,0,0,0,0] itself; that case is not a tamper.
        if (c.parameters.some((p) => p !== 0))
          expect(
            def.verify({ ...c, parameters: c.parameters.map(() => 0) }),
          ).toBe(false);
        expect(def.verify({ ...c, parameters: [...c.parameters, 1] })).toBe(
          false,
        );
        for (const field of ["text", "latex", "instruction"] as const)
          expect(
            def.verify({
              ...c,
              prompt: { ...c.prompt, [field]: `${c.prompt[field]} ` },
            }),
            field,
          ).toBe(false);
        const otherKind = c.answer.kind === "integer" ? "rational" : "integer";
        expect(
          def.verify({ ...c, answer: { ...c.answer, kind: otherKind } }),
        ).toBe(false);
        expect(
          def.verify({
            ...c,
            answer: { ...c.answer, text: `${c.answer.text} ` },
          }),
        ).toBe(false);
        if (c.answer.exact.length)
          expect(def.verify({ ...c, answer: { ...c.answer, exact: [] } })).toBe(
            false,
          );
        // Each exact field moved by one, with text/latex re-rendered to match.
        for (let k = 0; k < c.answer.exact.length; k++) {
          const exact = [...c.answer.exact];
          exact[k] = String(Number(exact[k]) + 1);
          expect(
            def.verify(tampered(spec.id, c, exact)),
            `${spec.id}[${i}] field ${k}`,
          ).toBe(false);
        }
        if (
          c.answer.kind === "rational" ||
          (c.answer.kind === "surd" && !supplementIds.has(spec.id))
        ) {
          // Unreduced equivalent of the same value.
          const exact = [...c.answer.exact];
          exact[0] = String(Number(exact[0]) * 2);
          exact[exact.length - 1] = String(Number(exact[exact.length - 1]) * 2);
          expect(def.verify(tampered(spec.id, c, exact))).toBe(false);
        }
        if (c.answer.kind === "surd" && !supplementIds.has(spec.id)) {
          // Non-squarefree equivalent: n√r/d = n√(4r)/(2d).
          const [n, r, dd] = c.answer.exact.map(Number);
          expect(
            def.verify(
              tampered(spec.id, c, [String(n), String(4 * r), String(2 * dd)]),
            ),
          ).toBe(false);
        }
      }
    });
  }

  it("rejects an unsimplified equivalent of the decimal part and of the mixed radical sum", () => {
    const part = definition("m3-sqrt-decimal-part");
    const eight = Array.from({ length: part.domainSize }, (_, i) =>
      part.problemAt(i),
    ).find((c) => c.parameters[0] === 8 && c.parameters[1] === 0)!;
    expect(eight.answer.exact).toEqual(["1", "-2", "1", "2", "2", "1"]);
    expect(
      part.verify(tampered(part.id, eight, ["1", "-2", "1", "8", "1", "1"])),
    ).toBe(false);
    expect(part.verify(tampered(part.id, eight, ["2", "2", "1"]))).toBe(false);
    expect(
      part.verify(tampered(part.id, eight, ["1", "2", "1", "2", "-2", "1"])),
    ).toBe(false);
    const mixed = definition("m3-radical-mixed");
    const sample = Array.from({ length: mixed.domainSize }, (_, i) =>
      mixed.problemAt(i),
    ).find((c) => c.parameters.join(",") === "12,3,-6,3")!;
    // √12×√3 − 6/√3 = 6 − 2√3
    expect(sample.answer.exact).toEqual(["1", "6", "1", "3", "-2", "1"]);
    expect(sample.answer.text).toBe("6 - 2√3");
    expect(
      mixed.verify(
        tampered(mixed.id, sample, ["1", "6", "1", "12", "-1", "1"]),
      ),
    ).toBe(false);
    expect(
      mixed.verify(tampered(mixed.id, sample, ["3", "-2", "1", "1", "6", "1"])),
    ).toBe(false);
    expect(mixed.verify(tampered(mixed.id, sample, ["1", "6", "1"]))).toBe(
      false,
    );
  });

  it("hand-checked examples", () => {
    const at = (id: string, parameters: number[]) => {
      const def = definition(id);
      let index = 0;
      for (const p of domain(id)) {
        if (p.join(",") === parameters.join(",")) return def.problemAt(index);
        index++;
      }
      throw new Error("outside domain");
    };
    expect(at("m3-sqrt-natural-multiplier", [0, 12]).answer.text).toBe("3");
    expect(at("m3-sqrt-natural-multiplier", [1, 108]).answer.text).toBe("3");
    expect(at("m3-sqrt-natural-multiplier", [1, 108]).prompt).toMatchObject({
      text: "√(108/x)",
    });
    expect(at("m3-sqrt-integer-part", [7, 0]).answer.text).toBe("2");
    expect(at("m3-sqrt-integer-part", [7, 3]).answer.text).toBe("5");
    expect(at("m3-sqrt-decimal-part", [7, 0]).answer.text).toBe("-2 + √7");
    expect(at("m3-sqrt-integers-between", [5, 50]).answer.text).toBe("5");
    expect(at("m3-formula-numeric", [0, 100, 2, 0]).answer.text).toBe("10404");
    expect(at("m3-formula-numeric", [1, 100, 3, 0]).prompt).toMatchObject({
      text: "103 × 97",
    });
    expect(at("m3-formula-numeric", [1, 100, 3, 0]).answer.text).toBe("9991");
    expect(at("m3-factor-numeric", [0, 100, 7]).prompt).toMatchObject({
      text: "57² - 43²",
    });
    expect(at("m3-factor-numeric", [0, 100, 7]).answer.text).toBe("1400");
    expect(at("m3-perfect-square-constant", [1, 6]).answer.text).toBe("9");
    expect(at("m3-perfect-square-constant", [1, 3]).answer.text).toBe("9/4");
    expect(at("m3-perfect-square-linear-coefficient", [1, 4]).answer.text).toBe(
      "8",
    );
    expect(at("m3-quadratic-double-root-constant", [1, -6]).answer.text).toBe(
      "9",
    );
    expect(at("m3-quadratic-double-root-coefficient", [4, 3]).answer.text).toBe(
      "12",
    );
    // sin30° + cos60° × tan45° = 1
    expect(at("m3-trig-special-expression", [0, 7, 5, 0, 0]).answer.text).toBe(
      "1",
    );
    // cos30° + sin60° × tan45° = √3
    expect(at("m3-trig-special-expression", [1, 6, 5, 0, 0]).answer.text).toBe(
      "√3",
    );
    expect(
      at("m3-trig-parallelogram-area-special-angle", [5, 8, 60]).answer.text,
    ).toBe("20√3 cm²");
    expect(
      at("m3-trig-parallelogram-area-special-angle", [3, 7, 30]).answer.text,
    ).toBe("21/2 cm²");
  });
});
