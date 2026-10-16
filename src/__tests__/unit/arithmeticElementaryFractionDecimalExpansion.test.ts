// @vitest-environment node
import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { DECIMAL_DEFINITIONS } from "../../lib/arithmetic-v2/families/elementary/decimals";
import { FRACTION_DEFINITIONS } from "../../lib/arithmetic-v2/families/elementary/fractions";
import { arithmeticCurriculum } from "../../lib/arithmetic-v2/curriculum";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
} from "../../lib/arithmetic-v2/types";

/** Track C of the arithmetic-type expansion (2026-10-16): 초5·초6 fraction and
 * decimal drills. Every expectation below is derived in the test itself —
 * no production domain, formatter, or solver is reused.
 *
 * Parameter conventions (frozen with the IDs):
 * - 분수 strand: parameters are the displayed literals, [n, d, m, e(, o, f)];
 *   the three-term ± type is [mode, n, d, m, e, o, f] with mode 0..3.
 * - 소수 strand: every operand is stored in hundredths, including whole
 *   numbers (7 → 700, ×100 → 10000), as in the rest of the decimal family.
 */
type Rational = [bigint, bigint];
const B = BigInt;

const NEW_TYPES: {
  id: string;
  family: readonly ArithmeticV2Definition[];
  grade: "초5" | "초6";
  strand: "분수" | "소수";
  semester: 1 | 2;
  unit: string;
}[] = [
  {
    id: "elem-g5-fraction-mul-proper",
    family: FRACTION_DEFINITIONS,
    grade: "초5",
    strand: "분수",
    semester: 2,
    unit: "분수의 곱셈",
  },
  {
    id: "elem-g5-natural-mul-fraction",
    family: FRACTION_DEFINITIONS,
    grade: "초5",
    strand: "분수",
    semester: 2,
    unit: "분수의 곱셈",
  },
  {
    id: "elem-g5-fraction-mul-three",
    family: FRACTION_DEFINITIONS,
    grade: "초5",
    strand: "분수",
    semester: 2,
    unit: "분수의 곱셈",
  },
  {
    id: "elem-g5-fraction-three-terms",
    family: FRACTION_DEFINITIONS,
    grade: "초5",
    strand: "분수",
    semester: 1,
    unit: "분수의 덧셈과 뺄셈",
  },
  {
    id: "elem-g5-natural-mul-decimal",
    family: DECIMAL_DEFINITIONS,
    grade: "초5",
    strand: "소수",
    semester: 2,
    unit: "소수의 곱셈",
  },
  {
    id: "elem-g5-decimal-point-shift",
    family: DECIMAL_DEFINITIONS,
    grade: "초5",
    strand: "소수",
    semester: 2,
    unit: "소수의 곱셈",
  },
  {
    id: "elem-g6-natural-div-natural-decimal",
    family: DECIMAL_DEFINITIONS,
    grade: "초6",
    strand: "소수",
    semester: 1,
    unit: "소수의 나눗셈",
  },
];

const PREVIOUS_FRACTION_IDS = [
  "elem-g4-fraction-same-add",
  "elem-g4-fraction-same-sub",
  "elem-g4-mixed-same-add",
  "elem-g4-mixed-same-sub",
  "elem-g5-fraction-unlike-add",
  "elem-g5-fraction-unlike-sub",
  "elem-g5-mixed-unlike-add",
  "elem-g5-mixed-unlike-sub",
  "elem-g5-fraction-mul",
  "elem-g5-fraction-mul-natural",
  "elem-g6-fraction-div",
  "elem-g6-fraction-div-natural",
];
const PREVIOUS_DECIMAL_IDS = [
  "elem-g4-decimal-add",
  "elem-g4-decimal-sub",
  "elem-g5-decimal-mul",
  "elem-g6-decimal-div",
  "elem-g6-decimal-div-natural",
];

const get = (id: string): ArithmeticV2Definition => {
  const found = [...FRACTION_DEFINITIONS, ...DECIMAL_DEFINITIONS].find(
    (d) => d.id === id,
  );
  assert(found, `missing definition ${id}`);
  return found;
};
const key = (p: number[]) => p.join(",");
const copy = (p: ArithmeticV2Candidate) => structuredClone(p);
const text = (p: ArithmeticV2Candidate) =>
  p.prompt.layout === "math" ? p.prompt.text : "";

// ---- test-only arithmetic -------------------------------------------------
function gcdN(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}
const lcm3 = (a: number, b: number, c: number) => {
  const ab = (a * b) / gcdN(a, b);
  return (ab * c) / gcdN(ab, c);
};
function reduce(n: bigint, d: bigint): Rational {
  let a = n < B(0) ? -n : n,
    b = d;
  while (b !== B(0)) [a, b] = [b, a % b];
  return [n / a, d / a];
}
function literal(token: string): Rational {
  if (token.includes("/")) {
    const [head, denominator] = token.split("/");
    const parts = head.split(" ");
    return [
      parts.length === 2 ? B(parts[0]) * B(denominator) + B(parts[1]) : B(head),
      B(denominator),
    ];
  }
  const [whole, decimal = ""] = token.split(".");
  return [B(whole + decimal), B(10) ** B(decimal.length)];
}
/** Left-to-right ± and × over rational literals; no precedence is needed here. */
function evaluate(source: string): Rational {
  const tokens = source.match(/\d+ \d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[+\-×÷]/g)!;
  assert.equal(tokens.join("").replaceAll(" ", ""), source.replaceAll(" ", ""));
  let [n, d] = literal(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const [m, e] = literal(tokens[i + 1]);
    const op = tokens[i];
    [n, d] =
      op === "+"
        ? [n * e + m * d, d * e]
        : op === "-"
          ? [n * e - m * d, d * e]
          : op === "×"
            ? [n * m, d * e]
            : [n * e, d * m];
  }
  assert(n >= B(0) && d > B(0), `negative or undefined value in ${source}`);
  return reduce(n, d);
}
function fractionText(n: number, d: number, latex = false): string {
  const whole = Math.floor(n / d),
    part = n % d;
  if (!part) return String(whole);
  return latex
    ? `${whole || ""}\\frac{${part}}{${d}}`
    : `${whole ? `${whole} ` : ""}${part}/${d}`;
}
/** Hundredths → shortest decimal text (0.35, 7, 2.4, 100). */
function hundredths(value: number): string {
  const padded = String(value).padStart(3, "0");
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

function assertAnswer(candidate: ArithmeticV2Candidate) {
  const { answer } = candidate;
  const [n, d] = evaluate(text(candidate));
  if (answer.kind === "rational") {
    assert.deepEqual(answer.exact, [String(n), String(d)]);
    assert.equal(answer.text, fractionText(Number(n), Number(d)));
    assert.equal(answer.latex, fractionText(Number(n), Number(d), true));
    return;
  }
  assert.equal(answer.kind, "decimal");
  // Long division finds the minimal exact scale independently of the engine.
  let remainder = n % d;
  let shown = String(n / d),
    scale = 0;
  if (remainder !== B(0)) shown += ".";
  while (remainder !== B(0)) {
    assert(scale < 4, `non-terminating or over-precision ${text(candidate)}`);
    remainder *= B(10);
    shown += String(remainder / d);
    remainder %= d;
    scale++;
  }
  assert.deepEqual(answer.exact, [
    String(B(shown.replace(".", ""))),
    String(scale),
  ]);
  assert.equal(answer.text, shown);
  assert.equal(answer.latex, shown);
}

// ---- independent finite specifications -----------------------------------
const proper: number[][] = [];
for (let d = 2; d <= 12; d++)
  for (let n = 1; n < d; n++) if (gcdN(n, d) === 1) proper.push([n, d]);
const mixed = [1, 2, 3].flatMap((w) => proper.map(([n, d]) => [w * d + n, d]));
const pool = [...proper, ...mixed];
const same = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1];
const SHIFTS = [10, 1, 1000, 10000, 100000]; // ×0.1 ×0.01 ×10 ×100 ×1000, in hundredths

function* expectedDomain(id: string): Generator<number[]> {
  if (id === "elem-g5-fraction-mul-proper") {
    for (const a of proper)
      for (const b of proper) if (!same(a, b)) yield [...a, ...b];
  } else if (id === "elem-g5-natural-mul-fraction") {
    for (let k = 2; k <= 9; k++) for (const f of pool) yield [k, 1, ...f];
  } else if (id === "elem-g5-fraction-mul-three") {
    for (const a of proper)
      for (const b of proper)
        for (const c of proper)
          if (!same(a, b) && !same(b, c) && !same(a, c))
            yield [...a, ...b, ...c];
  } else if (id === "elem-g5-fraction-three-terms") {
    for (let mode = 0; mode <= 3; mode++)
      for (const [n, d] of proper)
        for (const [m, e] of proper)
          for (const [o, f] of proper) {
            if (d === e || e === f || d === f || lcm3(d, e, f) > 60) continue;
            const L = lcm3(d, e, f);
            const [x, y, z] = [(n * L) / d, (m * L) / e, (o * L) / f];
            const ok =
              mode === 0 ||
              (mode === 1 && x + y - z >= 0) ||
              (mode === 2 && x - y >= 0) ||
              (mode === 3 && x - y - z >= 0);
            if (ok) yield [mode, n, d, m, e, o, f];
          }
  } else if (id === "elem-g5-natural-mul-decimal") {
    for (let k = 2; k <= 9; k++)
      for (let b = 1; b <= 999; b++) if (b % 100 !== 0) yield [100 * k, b];
  } else if (id === "elem-g5-decimal-point-shift") {
    for (let a = 1; a <= 999; a++)
      if (a % 100 !== 0) for (const r of SHIFTS) if (r !== a) yield [a, r];
    for (let n = 2; n <= 999; n++) for (const r of [10, 1]) yield [100 * n, r];
  } else if (id === "elem-g6-natural-div-natural-decimal") {
    for (let b = 2; b <= 99; b++)
      for (let a = 1; a <= 99; a++)
        if (a % b !== 0 && (1000 * a) % b === 0) yield [100 * a, 100 * b];
  } else assert.fail(`no independent specification for ${id}`);
}

function expectedPrompt(id: string, p: number[]) {
  const frac = (n: number, d: number) => fractionText(n, d);
  const fracL = (n: number, d: number) => fractionText(n, d, true);
  const reduceInstruction =
    "계산하고 약분하세요. 가분수는 대분수로 나타내세요.";
  if (id === "elem-g5-fraction-three-terms") {
    const [mode, n, d, m, e, o, f] = p;
    const [op1, op2] = [
      ["+", "+"],
      ["+", "-"],
      ["-", "+"],
      ["-", "-"],
    ][mode];
    return {
      layout: "math",
      text: `${frac(n, d)} ${op1} ${frac(m, e)} ${op2} ${frac(o, f)}`,
      latex: `${fracL(n, d)} ${op1} ${fracL(m, e)} ${op2} ${fracL(o, f)}`,
      instruction: reduceInstruction,
    };
  }
  if (id === "elem-g5-fraction-mul-three") {
    const [n, d, m, e, o, f] = p;
    return {
      layout: "math",
      text: `${frac(n, d)} × ${frac(m, e)} × ${frac(o, f)}`,
      latex: `${fracL(n, d)} \\times ${fracL(m, e)} \\times ${fracL(o, f)}`,
      instruction: reduceInstruction,
    };
  }
  if (
    id === "elem-g5-fraction-mul-proper" ||
    id === "elem-g5-natural-mul-fraction"
  ) {
    const [n, d, m, e] = p;
    return {
      layout: "math",
      text: `${frac(n, d)} × ${frac(m, e)}`,
      latex: `${fracL(n, d)} \\times ${fracL(m, e)}`,
      instruction: reduceInstruction,
    };
  }
  const [a, b] = p;
  if (id === "elem-g6-natural-div-natural-decimal")
    return {
      layout: "math",
      text: `${hundredths(a)} ÷ ${hundredths(b)}`,
      latex: `${hundredths(a)} \\div ${hundredths(b)}`,
      instruction: "몫을 소수로 나타내세요.",
    };
  return {
    layout: "math",
    text: `${hundredths(a)} × ${hundredths(b)}`,
    latex: `${hundredths(a)} \\times ${hundredths(b)}`,
    ...(id === "elem-g5-decimal-point-shift"
      ? { instruction: "소수 또는 자연수로 계산하세요." }
      : {}),
  };
}

function sampleIndexes(size: number): number[] {
  if (size <= 20000) return Array.from({ length: size }, (_, i) => i);
  const chosen = new Set([0, 1, size - 2, size - 1]);
  let seed = 20261016;
  for (let i = 0; i < 3000; i++) {
    chosen.add(Math.floor((i * (size - 1)) / 2999));
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    chosen.add(seed % size);
  }
  return [...chosen].sort((a, b) => a - b);
}

describe("초5·초6 fraction and decimal expansion (track C)", () => {
  it("appends the seven new types after the frozen earlier IDs", () => {
    expect(FRACTION_DEFINITIONS.slice(0, 12).map((d) => d.id)).toEqual(
      PREVIOUS_FRACTION_IDS,
    );
    expect(DECIMAL_DEFINITIONS.slice(0, 5).map((d) => d.id)).toEqual(
      PREVIOUS_DECIMAL_IDS,
    );
    const all = [...FRACTION_DEFINITIONS, ...DECIMAL_DEFINITIONS];
    expect(new Set(all.map((d) => d.id)).size).toBe(all.length);
    for (const spec of NEW_TYPES) {
      const definition = get(spec.id);
      expect(spec.family.includes(definition)).toBe(true);
      expect(definition.grade).toBe(spec.grade);
      expect(definition.strand).toBe(spec.strand);
      expect(definition.rankGroup).toMatch(/^elementary-(fraction|decimal)-/);
      expect(definition.title.trim().length).toBeGreaterThan(0);
      expect(definition.description.trim().length).toBeGreaterThan(0);
      expect(definition.labels.length).toBeGreaterThan(0);
      expect(arithmeticCurriculum(definition)).toEqual({
        semester: spec.semester,
        unit: spec.unit,
      });
    }
  });

  it("has the documented exact domain sizes", () => {
    expect(get("elem-g5-fraction-mul-proper").domainSize).toBe(45 * 44);
    expect(get("elem-g5-natural-mul-fraction").domainSize).toBe(8 * 180);
    expect(get("elem-g5-fraction-mul-three").domainSize).toBe(45 * 44 * 43);
    expect(get("elem-g5-natural-mul-decimal").domainSize).toBe(8 * 990);
    // 0.1 × 0.1 and 0.01 × 0.01 are the two identical-operand items screened out.
    expect(get("elem-g5-decimal-point-shift").domainSize).toBe(
      990 * 5 + 998 * 2 - 2,
    );
    const count = (id: string) => [...expectedDomain(id)].length;
    const quotients = count("elem-g6-natural-div-natural-decimal");
    expect(get("elem-g6-natural-div-natural-decimal").domainSize).toBe(
      quotients,
    );
    expect(quotients).toBeGreaterThan(200);
    const terms = count("elem-g5-fraction-three-terms");
    expect(get("elem-g5-fraction-three-terms").domainSize).toBe(terms);
    expect(terms).toBeGreaterThan(1000);
  });

  for (const spec of NEW_TYPES) {
    it(`${spec.id}: domain round-trip, exact prompts, independent answers, verify`, () => {
      const definition = get(spec.id);
      const seen = new Set<string>();
      const prompts = new Set<string>();
      for (let index = 0; index < definition.domainSize; index++) {
        const candidate = definition.problemAt(index);
        const k = key(candidate.parameters);
        assert(!seen.has(k), `duplicate parameters at ${index}`);
        seen.add(k);
        const shown = JSON.stringify(candidate.prompt);
        assert(!prompts.has(shown), `duplicate prompt at ${index}`);
        prompts.add(shown);
        assert.deepEqual(
          candidate.prompt,
          expectedPrompt(spec.id, candidate.parameters),
        );
      }
      let count = 0;
      for (const p of expectedDomain(spec.id)) {
        assert(seen.delete(key(p)), `generator never yields ${key(p)}`);
        count++;
      }
      assert.equal(count, definition.domainSize);
      assert.equal(
        seen.size,
        0,
        "generator yields parameters outside the spec",
      );
      for (const index of sampleIndexes(definition.domainSize)) {
        const candidate = definition.problemAt(index);
        assertAnswer(candidate);
        assert(definition.verify(candidate), `verify false at ${index}`);
        assert.deepEqual(definition.problemAt(index), candidate);
      }
    }, 60000);

    it(`${spec.id}: screens trivial items (×1, ÷1, identical operands)`, () => {
      const definition = get(spec.id);
      for (const index of sampleIndexes(definition.domainSize)) {
        const candidate = definition.problemAt(index);
        const operands = text(candidate).split(/ [+\-×÷] /);
        assert(operands.length >= 2);
        assert(
          new Set(operands).size === operands.length,
          `identical operands in ${text(candidate)}`,
        );
        if (spec.id === "elem-g5-fraction-three-terms") {
          // Three different denominators: genuine three-way 통분.
          const [, , d, , e, , f] = candidate.parameters;
          assert(new Set([d, e, f]).size === 3, text(candidate));
          assert(lcm3(d, e, f) <= 60, text(candidate));
        } else if (spec.id === "elem-g6-natural-div-natural-decimal") {
          // 1 ÷ 2 = 0.5 is real practice; only dividing by 1 is trivial.
          assert(operands[1] !== "1", `÷1 is trivial: ${text(candidate)}`);
        } else {
          assert(!operands.includes("1"), `×1 is trivial: ${text(candidate)}`);
        }
        if (spec.id === "elem-g6-natural-div-natural-decimal")
          assert(
            candidate.answer.text.includes("."),
            `whole quotient is not decimal practice: ${text(candidate)}`,
          );
      }
    });

    it(`${spec.id}: rejects tampering, noncanonical forms and off-domain parameters`, () => {
      const definition = get(spec.id);
      for (const bad of [-1, 0.5, NaN, Infinity, definition.domainSize])
        expect(() => definition.problemAt(bad)).toThrow(RangeError);
      const original = definition.problemAt(
        Math.floor(definition.domainSize / 2),
      );
      const detached = {
        ...definition,
        problemAt: () => {
          throw new Error("verify must not call the generator");
        },
      };
      expect(detached.verify(original)).toBe(true);
      const bad: ArithmeticV2Candidate[] = [];
      const mutate = (change: (c: ArithmeticV2Candidate) => void) => {
        const c = copy(original);
        change(c);
        bad.push(c);
      };
      mutate((c) => {
        c.answer.exact[0] = String(Number(c.answer.exact[0]) + 1);
      });
      mutate((c) => {
        c.answer.text += "0";
      });
      mutate((c) => {
        c.answer.latex += "0";
      });
      mutate((c) => {
        c.answer.kind = c.answer.kind === "rational" ? "decimal" : "rational";
      });
      mutate((c) => {
        c.answer.exact.push("0");
      });
      mutate((c) => {
        c.answer.exact = ["1.5", c.answer.exact[1]];
      });
      mutate((c) => {
        if (c.prompt.layout === "math") c.prompt.text += " + 1";
      });
      mutate((c) => {
        if (c.prompt.layout === "math") c.prompt.latex += " + 1";
      });
      mutate((c) => {
        c.prompt.instruction = "changed";
      });
      mutate((c) => {
        Object.assign(c.prompt, { figureId: "x" });
      });
      mutate((c) => {
        c.parameters = definition.problemAt(0).parameters;
      });
      mutate((c) => {
        c.parameters[0] = -1;
      });
      mutate((c) => {
        c.parameters[0] += 0.5;
      });
      mutate((c) => {
        c.parameters.push(1);
      });
      mutate((c) => {
        c.parameters = c.parameters.slice(0, -1);
      });
      // Equivalent but noncanonical exact values.
      mutate((c) => {
        if (c.answer.kind === "rational")
          c.answer.exact = c.answer.exact.map((v) => String(B(v) * B(2)));
        else
          c.answer.exact = [
            String(B(c.answer.exact[0]) * B(10)),
            String(Number(c.answer.exact[1]) + 1),
          ];
      });
      for (const candidate of bad)
        assert.equal(
          definition.verify(candidate),
          false,
          JSON.stringify(candidate),
        );
      for (const junk of [
        null,
        {},
        { ...original, parameters: null },
        { ...original, answer: null },
      ])
        expect(
          definition.verify(junk as unknown as ArithmeticV2Candidate),
        ).toBe(false);
    });
  }

  it("rejects screened operands even with a correct answer and prompt", () => {
    const fake = (
      id: string,
      parameters: number[],
      prompt: string,
      answer: ArithmeticV2Answer,
      instruction?: string,
    ) => {
      const definition = get(id);
      const candidate: ArithmeticV2Candidate = {
        parameters,
        prompt: {
          layout: "math",
          text: prompt,
          latex: prompt
            .replaceAll("×", "\\times")
            .replaceAll("÷", "\\div")
            .replace(/(\d+)\/(\d+)/g, "\\frac{$1}{$2}"),
          ...(instruction ? { instruction } : {}),
        },
        answer,
      };
      expect(definition.verify(candidate)).toBe(false);
    };
    const rational = (n: number, d: number): ArithmeticV2Answer => ({
      kind: "rational",
      exact: [String(n), String(d)],
      text: fractionText(n, d),
      latex: fractionText(n, d, true),
    });
    const decimal = (
      coefficient: number,
      scale: number,
    ): ArithmeticV2Answer => {
      const padded = String(coefficient).padStart(scale + 1, "0");
      const shown = scale
        ? `${padded.slice(0, -scale)}.${padded.slice(-scale)}`
        : padded;
      return {
        kind: "decimal",
        exact: [String(coefficient), String(scale)],
        text: shown,
        latex: shown,
      };
    };
    const reduceInstruction =
      "계산하고 약분하세요. 가분수는 대분수로 나타내세요.";
    fake(
      "elem-g5-natural-mul-fraction",
      [1, 1, 3, 4],
      "1 × 3/4",
      rational(3, 4),
      reduceInstruction,
    );
    fake(
      "elem-g5-fraction-mul-proper",
      [3, 4, 3, 4],
      "3/4 × 3/4",
      rational(9, 16),
      reduceInstruction,
    );
    fake(
      "elem-g5-fraction-mul-proper",
      [2, 4, 1, 3],
      "2/4 × 1/3",
      rational(1, 6),
      reduceInstruction,
    );
    fake(
      "elem-g5-fraction-mul-three",
      [1, 2, 1, 2, 1, 3],
      "1/2 × 1/2 × 1/3",
      rational(1, 12),
      reduceInstruction,
    );
    // repeated denominator (3, 3) and lcm 84 > 60 are both outside the domain
    fake(
      "elem-g5-fraction-three-terms",
      [1, 1, 2, 1, 3, 2, 3],
      "1/2 + 1/3 - 2/3",
      rational(1, 6),
      reduceInstruction,
    );
    fake(
      "elem-g5-fraction-three-terms",
      [0, 1, 7, 1, 4, 1, 3],
      "1/7 + 1/4 + 1/3",
      rational(61, 84),
      reduceInstruction,
    );
    // identical operands and a plain ×1 in the point shift
    fake(
      "elem-g5-decimal-point-shift",
      [1, 1],
      "0.01 × 0.01",
      decimal(1, 4),
      "소수 또는 자연수로 계산하세요.",
    );
    fake(
      "elem-g5-decimal-point-shift",
      [10, 10],
      "0.1 × 0.1",
      decimal(1, 2),
      "소수 또는 자연수로 계산하세요.",
    );
    fake(
      "elem-g5-fraction-three-terms",
      [1, 1, 2, 1, 3, 1, 4],
      "1/2 + 1/3 - 1/4",
      rational(7, 12),
    ); // instruction missing
    fake(
      "elem-g5-fraction-three-terms",
      [3, 1, 2, 1, 3, 1, 4],
      "1/2 - 1/3 - 1/4",
      rational(0, 1),
      reduceInstruction,
    );
    fake(
      "elem-g5-fraction-three-terms",
      [4, 1, 2, 1, 3, 1, 4],
      "1/2 + 1/3 + 1/4",
      rational(13, 12),
      reduceInstruction,
    );
    fake("elem-g5-natural-mul-decimal", [100, 35], "1 × 0.35", decimal(35, 2));
    fake("elem-g5-natural-mul-decimal", [700, 300], "7 × 3", decimal(21, 0));
    fake(
      "elem-g5-natural-mul-decimal",
      [7, 35],
      "0.07 × 0.35",
      decimal(245, 4),
    );
    fake(
      "elem-g5-decimal-point-shift",
      [237, 100],
      "2.37 × 1",
      decimal(237, 2),
      "소수 또는 자연수로 계산하세요.",
    );
    fake(
      "elem-g5-decimal-point-shift",
      [100, 10],
      "1 × 0.1",
      decimal(1, 1),
      "소수 또는 자연수로 계산하세요.",
    );
    fake(
      "elem-g5-decimal-point-shift",
      [42500, 1000],
      "425 × 10",
      decimal(4250, 0),
      "소수 또는 자연수로 계산하세요.",
    );
    fake(
      "elem-g5-decimal-point-shift",
      [237, 10000],
      "2.37 × 100",
      decimal(237, 0),
    ); // instruction missing
    fake(
      "elem-g6-natural-div-natural-decimal",
      [800, 400],
      "8 ÷ 4",
      decimal(2, 0),
      "몫을 소수로 나타내세요.",
    );
    fake(
      "elem-g6-natural-div-natural-decimal",
      [300, 100],
      "3 ÷ 1",
      decimal(3, 0),
      "몫을 소수로 나타내세요.",
    );
    fake(
      "elem-g6-natural-div-natural-decimal",
      [100, 300],
      "1 ÷ 3",
      decimal(3333, 4),
      "몫을 소수로 나타내세요.",
    );
    fake(
      "elem-g6-natural-div-natural-decimal",
      [100, 1600],
      "1 ÷ 16",
      decimal(625, 4),
      "몫을 소수로 나타내세요.",
    );
    fake(
      "elem-g6-natural-div-natural-decimal",
      [3, 4],
      "3 ÷ 4",
      decimal(75, 2),
      "몫을 소수로 나타내세요.",
    );
  });

  const examples: [string, number[], string, string][] = [
    ["elem-g5-fraction-mul-proper", [3, 4, 2, 9], "3/4 × 2/9", "1/6"],
    ["elem-g5-fraction-mul-proper", [5, 6, 1, 5], "5/6 × 1/5", "1/6"],
    ["elem-g5-natural-mul-fraction", [6, 1, 3, 4], "6 × 3/4", "4 1/2"],
    ["elem-g5-natural-mul-fraction", [2, 1, 7, 2], "2 × 3 1/2", "7"],
    [
      "elem-g5-fraction-mul-three",
      [2, 3, 3, 4, 5, 6],
      "2/3 × 3/4 × 5/6",
      "5/12",
    ],
    [
      "elem-g5-fraction-three-terms",
      [0, 1, 2, 1, 3, 1, 4],
      "1/2 + 1/3 + 1/4",
      "1 1/12",
    ],
    [
      "elem-g5-fraction-three-terms",
      [1, 1, 2, 1, 3, 1, 4],
      "1/2 + 1/3 - 1/4",
      "7/12",
    ],
    [
      "elem-g5-fraction-three-terms",
      [2, 2, 3, 1, 4, 1, 6],
      "2/3 - 1/4 + 1/6",
      "7/12",
    ],
    [
      "elem-g5-fraction-three-terms",
      [3, 5, 6, 1, 2, 1, 4],
      "5/6 - 1/2 - 1/4",
      "1/12",
    ],
    ["elem-g5-natural-mul-decimal", [700, 35], "7 × 0.35", "2.45"],
    ["elem-g5-natural-mul-decimal", [400, 250], "4 × 2.5", "10"],
    ["elem-g5-decimal-point-shift", [237, 10000], "2.37 × 100", "237"],
    ["elem-g5-decimal-point-shift", [42500, 1], "425 × 0.01", "4.25"],
    ["elem-g5-decimal-point-shift", [50, 1000], "0.5 × 10", "5"],
    ["elem-g5-decimal-point-shift", [237, 10], "2.37 × 0.1", "0.237"],
    ["elem-g5-decimal-point-shift", [2, 1], "0.02 × 0.01", "0.0002"],
    ["elem-g5-decimal-point-shift", [20000, 1], "200 × 0.01", "2"],
    ["elem-g6-natural-div-natural-decimal", [300, 400], "3 ÷ 4", "0.75"],
    ["elem-g6-natural-div-natural-decimal", [700, 800], "7 ÷ 8", "0.875"],
    ["elem-g6-natural-div-natural-decimal", [1100, 400], "11 ÷ 4", "2.75"],
    ["elem-g6-natural-div-natural-decimal", [300, 600], "3 ÷ 6", "0.5"],
  ];
  for (const [id, parameters, prompt, answer] of examples) {
    it(`contains ${prompt} = ${answer}`, () => {
      const definition = get(id);
      let found: ArithmeticV2Candidate | undefined;
      for (let i = 0; i < definition.domainSize && !found; i++) {
        const candidate = definition.problemAt(i);
        if (key(candidate.parameters) === key(parameters)) found = candidate;
      }
      assert(found, `missing ${prompt}`);
      expect(text(found)).toBe(prompt);
      expect(found.answer.text).toBe(answer);
      assertAnswer(found);
      expect(definition.verify(found)).toBe(true);
    });
  }
});
