// @vitest-environment node
/** Track E of the arithmetic-type expansion (2026-10-16): 중2 expressions and
 * exponents plus the 중1 square-multiplier item that lives in numbers.ts.
 *
 * Written before the definitions (RED). Each new type is checked for
 * 1. domain round-trip: every index yields a candidate that verifies, parses
 *    the contract schema, has unique parameters and a unique prompt identity,
 *    and `domainSize` is exact (one past the end throws);
 * 2. an independent oracle written here, with no production helpers;
 * 3. verify false on a tampered answer (every exact field, plus self-consistent
 *    wrong answers) and on a tampered prompt (text, latex, instruction);
 * 4. normal-form checks: bivariate polynomial exact triples descend
 *    lexicographically with nonzero coefficients and the display is rebuilt
 *    here; rational fields are reduced with a positive denominator;
 * 5. a trivial-item screen per type (no cancellation to a monomial, no answer
 *    of 1 for the square multiplier, no period-1 recurring decimals, …).
 */
import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { EXPRESSION_DEFINITIONS } from "../../lib/arithmetic-v2/families/algebraComplete/expressions";
import { NUMBER_DEFINITIONS } from "../../lib/arithmetic-v2/families/algebraComplete/numbers";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Definition,
} from "../../lib/arithmetic-v2/types";
import {
  arithmeticV2CandidateSchema,
  arithmeticV2PromptIdentity,
} from "../../contracts/arithmeticV2.contract";

const EXPRESSION_IDS = [
  "m2-polynomial-two-variable-add",
  "m2-polynomial-two-variable-subtract",
  "m2-polynomial-nested-braces",
  "m2-expression-substitute",
  "m2-formula-rearrange",
  "m2-exponent-base-match",
  "m2-exponent-equation",
  "m2-power-digit-count",
] as const;
const NUMBER_IDS = ["m1-square-multiplier", "m2-recurring-nth-digit"] as const;
const NEW_IDS = [...EXPRESSION_IDS, ...NUMBER_IDS];

const all = [...EXPRESSION_DEFINITIONS, ...NUMBER_DEFINITIONS];
const byId = new Map(all.map((d) => [d.id, d]));
const definition = (id: string): ArithmeticV2Definition => {
  const found = byId.get(id);
  assert(found, `missing definition ${id}`);
  return found;
};
const every = (d: ArithmeticV2Definition) =>
  Array.from({ length: d.domainSize }, (_, i) => d.problemAt(i));

// Deliberately no imports from production arithmetic helpers.
const B = BigInt;
const abs = (n: bigint) => (n < B(0) ? -n : n);
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
function reduced(n: bigint, d: bigint): [bigint, bigint] {
  if (d < B(0)) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || B(1);
  return [n / g, d / g];
}
const isSquare = (v: bigint) => {
  if (v < B(0)) return false;
  let r = B(Math.floor(Math.sqrt(Number(v))));
  while (r * r > v) r--;
  while ((r + B(1)) * (r + B(1)) <= v) r++;
  return r * r === v;
};
/** Bivariate integer polynomial display rebuilt independently. */
function renderTerms(triples: number[][], latex: boolean): string {
  let out = "";
  for (const [x, y, c] of triples) {
    const pow = (v: string, e: number) =>
      e === 0 ? "" : e === 1 ? v : latex ? `${v}^{${e}}` : `${v}^${e}`;
    const vars = pow("x", x) + pow("y", y);
    const mag = Math.abs(c);
    const body = `${vars && mag === 1 ? "" : mag}${vars}`;
    out += `${out ? (c < 0 ? " - " : " + ") : c < 0 ? "-" : ""}${body}`;
  }
  return out || "0";
}
function readTriples(answer: ArithmeticV2Answer): number[][] {
  assert.equal(answer.kind, "polynomial");
  assert.equal(answer.exact.length % 3, 0);
  const triples: number[][] = [];
  for (let i = 0; i < answer.exact.length; i += 3)
    triples.push(answer.exact.slice(i, i + 3).map(Number));
  return triples;
}
function polyValue(triples: number[][], x: bigint, y: bigint): bigint {
  let sum = B(0);
  for (const [dx, dy, c] of triples) sum += B(c) * x ** B(dx) * y ** B(dy);
  return sum;
}
const points: [bigint, bigint][] = [
  [B(0), B(0)],
  [B(1), B(0)],
  [B(0), B(1)],
  [B(2), B(-3)],
  [B(-5), B(7)],
  [B(11), B(13)],
];
function rationalText(n: bigint, d: bigint, latex = false) {
  return d === B(1)
    ? String(n)
    : latex
      ? `${n < B(0) ? "-" : ""}\\frac{${abs(n)}}{${d}}`
      : `${n}/${d}`;
}
const integerAnswer = (v: bigint): ArithmeticV2Answer => ({
  kind: "integer",
  exact: [String(v)],
  text: String(v),
  latex: String(v),
});
const polynomialAnswer = (triples: number[][]): ArithmeticV2Answer => ({
  kind: "polynomial",
  exact: triples.flatMap((t) => t.map(String)),
  text: renderTerms(triples, false),
  latex: renderTerms(triples, true),
});
/** Decimal digit k (1-based) of n/d by exact long division. */
function nthDigit(n: number, d: number, k: number): bigint {
  return ((B(n) * B(10) ** B(k)) / B(d)) % B(10);
}
function period(n: number, d: number): number {
  // Length of the repeating block of n/d, by remainder recurrence.
  const seen = new Map<number, number>();
  let r = n % d,
    step = 0;
  while (!seen.has(r)) {
    seen.set(r, step);
    r = (r * 10) % d;
    step++;
  }
  return step - seen.get(r)!;
}

// Independent oracle per type: throws on a wrong answer.
function oracle(id: string, p: number[], answer: ArithmeticV2Answer) {
  const [a, b, c, d, e, f] = p;
  if (
    id === "m2-polynomial-two-variable-add" ||
    id === "m2-polynomial-two-variable-subtract"
  ) {
    const triples = readTriples(answer);
    const sign = id.endsWith("add") ? B(1) : B(-1);
    for (const [x, y] of points)
      assert.equal(
        polyValue(triples, x, y),
        B(a) * x + B(b) * y + B(c) + sign * (B(d) * x + B(e) * y + B(f)),
      );
    return;
  }
  if (id === "m2-polynomial-nested-braces") {
    // a x s1 { b x s2 ( c x + d ) }
    const [, , , , s1, s2] = p;
    const triples = readTriples(answer);
    for (const [x, y] of points)
      assert.equal(
        polyValue(triples, x, y),
        B(a) * x + B(s1) * (B(b) * x + B(s2) * (B(c) * x + B(d))),
      );
    return;
  }
  if (id === "m2-expression-substitute") {
    // A = a x + b y, B = c x + d y, answer = e A + f B
    const triples = readTriples(answer);
    for (const [x, y] of points)
      assert.equal(
        polyValue(triples, x, y),
        B(e) * (B(a) * x + B(b) * y) + B(f) * (B(c) * x + B(d) * y),
      );
    return;
  }
  if (id === "m2-formula-rearrange") {
    // a x + b y = c solved for x (d = 0) or y (d = 1): exact [sn, sd, tn, td].
    assert.equal(answer.kind, "polynomial");
    assert.equal(answer.exact.length, 4);
    const [sn, sd, tn, td] = answer.exact.map(B);
    assert(sd > B(0) && td > B(0));
    assert.equal(gcd(sn, sd), B(1));
    assert.equal(gcd(tn, td), B(1));
    const solved = d === 1 ? B(b) : B(a),
      other = d === 1 ? B(a) : B(b);
    // solved·(s·v + t) + other·v = c for every v  ⇔  solved·s + other = 0, solved·t = c
    assert.equal(solved * sn + other * sd, B(0));
    assert.equal(solved * tn, B(c) * td);
    return;
  }
  if (id === "m2-exponent-base-match") {
    // (b^p)^m op (b^q)^n = b^k, op 0 = ×, 1 = ÷
    const [base, pp, q, m, n, op] = p;
    assert.equal(answer.kind, "integer");
    const k = B(answer.exact[0]);
    assert(k >= B(1));
    const left = B(base ** pp) ** B(m),
      right = B(base ** q) ** B(n);
    if (op === 0) assert.equal(left * right, B(base) ** k);
    else assert.equal(left, right * B(base) ** k);
    return;
  }
  if (id === "m2-exponent-equation") {
    // base^(x + k) = base^n
    const [base, k, n] = p;
    assert.equal(answer.kind, "integer");
    const x = Number(answer.exact[0]);
    assert(x + k >= 0);
    assert.equal(B(base) ** B(x + k), B(base) ** B(n));
    return;
  }
  if (id === "m2-power-digit-count") {
    const [x, y, k] = p;
    assert.equal(answer.kind, "integer");
    const value = B(2) ** B(x) * B(5) ** B(y) * B(k);
    assert.equal(answer.exact[0], String(String(value).length));
    return;
  }
  if (id === "m1-square-multiplier") {
    const [n, op] = p;
    assert.equal(answer.kind, "integer");
    const m = Number(answer.exact[0]);
    assert(m >= 1);
    const square = (v: number) =>
      op === 0 ? isSquare(B(n) * B(v)) : n % v === 0 && isSquare(B(n / v));
    assert(square(m), `${n}:${m}`);
    for (let v = 1; v < m; v++) assert(!square(v), `${n}: ${v} < ${m}`);
    return;
  }
  if (id === "m2-recurring-nth-digit") {
    const [n, den, k] = p;
    assert.equal(answer.kind, "integer");
    assert.equal(B(answer.exact[0]), nthDigit(n, den, k));
    return;
  }
  throw new Error(`no oracle for ${id}`);
}

describe("Track E: 중2 expressions/exponents and 중1 square multiplier", () => {
  it("registers every new type once, in the right file, with 중 placement", () => {
    for (const id of EXPRESSION_IDS)
      expect(EXPRESSION_DEFINITIONS.map((d) => d.id)).toContain(id);
    for (const id of NUMBER_IDS)
      expect(NUMBER_DEFINITIONS.map((d) => d.id)).toContain(id);
    expect(new Set(all.map((d) => d.id)).size).toBe(all.length);
    for (const id of NEW_IDS) {
      const d = definition(id);
      expect(d.grade).toBe(id.startsWith("m1-") ? "중1" : "중2");
      expect(d.curriculum).toMatchObject({ semester: 1 });
      expect(d.curriculum?.unit).toBe(
        id === "m1-square-multiplier"
          ? "소인수분해"
          : id === "m2-recurring-nth-digit"
            ? "유리수와 순환소수"
            : "식의 계산",
      );
      expect(d.rankGroup).toBe(id);
      expect(d.labels).toContain(d.title);
      expect(d.domainSize).toBeGreaterThanOrEqual(20);
    }
  });

  it("round-trips every domain index through verify, schema, identity and the oracle", () => {
    const identities = new Set<string>();
    let total = 0;
    for (const id of NEW_IDS) {
      const d = definition(id);
      const keys = new Set<string>();
      for (let i = 0; i < d.domainSize; i++) {
        const candidate = d.problemAt(i);
        assert(d.verify(candidate), `${id}:${i}`);
        assert(
          arithmeticV2CandidateSchema.safeParse(candidate).success,
          `${id}:${i}:schema`,
        );
        oracle(id, candidate.parameters, candidate.answer);
        const identity = arithmeticV2PromptIdentity(candidate.prompt);
        assert(!identities.has(identity), `${id}:${i}:duplicate task`);
        identities.add(identity);
        const key = candidate.parameters.join(",");
        assert(!keys.has(key), `${id}:${i}:duplicate parameters`);
        keys.add(key);
        assert(candidate.parameters.length <= 6);
        total++;
      }
      assert.equal(keys.size, d.domainSize);
      for (const index of [-1, d.domainSize, 0.5, NaN])
        expect(() => d.problemAt(index)).toThrow();
      expect(d.problemAt(0)).toEqual(d.problemAt(0));
    }
    console.log(
      `Track E: ${NEW_IDS.length} types, ${total} unique tasks — ${NEW_IDS.map((id) => `${id}=${definition(id).domainSize}`).join(", ")}`,
    );
  });

  it("rejects every tampered exact field and every tampered prompt", () => {
    for (const id of NEW_IDS) {
      const d = definition(id);
      for (const c of every(d)) {
        for (let field = 0; field < c.answer.exact.length; field++) {
          const exact = [...c.answer.exact];
          exact[field] = String(B(exact[field]) + B(1));
          let answer: ArithmeticV2Answer = { ...c.answer, exact };
          if (answer.kind === "integer")
            answer = { ...answer, text: exact[0], latex: exact[0] };
          assert(
            !d.verify({ ...c, answer }),
            `${id}:${c.parameters.join(",")}:field${field}`,
          );
        }
        for (const key of ["text", "latex"] as const)
          assert(!d.verify({ ...c, answer: { ...c.answer, [key]: "x" } }));
      }
      const c = d.problemAt(0);
      for (const key of ["text", "latex", "instruction"] as const)
        assert(
          !d.verify({ ...c, prompt: { ...c.prompt, [key]: "changed" } }),
          `${id}:prompt.${key}`,
        );
      assert(!d.verify({ ...c, parameters: [...c.parameters, 0] }));
      assert(!d.verify({ ...c, parameters: c.parameters.map(() => 99) }));
      for (const exact of [[], ["01"], ["-0"], ["1.0"], ["1e2"], [""]])
        assert(!d.verify({ ...c, answer: { ...c.answer, exact } }), id);
    }
  });

  it("rejects self-consistent wrong answers, not just broken displays", () => {
    // Polynomial types: a correctly rendered but wrong polynomial (sign flipped
    // on the first term) and an unsorted exact list with the sorted display.
    for (const id of [
      "m2-polynomial-two-variable-add",
      "m2-polynomial-two-variable-subtract",
      "m2-polynomial-nested-braces",
      "m2-expression-substitute",
    ]) {
      const d = definition(id);
      for (const c of every(d).slice(0, 50)) {
        const triples = readTriples(c.answer);
        const flipped = triples.map((t, i) => (i ? t : [t[0], t[1], -t[2]]));
        assert(!d.verify({ ...c, answer: polynomialAnswer(flipped) }), id);
        const unsorted = [...triples].reverse();
        assert(
          !d.verify({
            ...c,
            answer: {
              ...polynomialAnswer(triples),
              exact: unsorted.flat().map(String),
            },
          }),
          `${id}:unsorted`,
        );
        const padded = [...triples, [0, 0, 0]];
        assert(
          !d.verify({
            ...c,
            answer: {
              ...polynomialAnswer(triples),
              exact: padded.flat().map(String),
            },
          }),
          `${id}:zero term`,
        );
      }
    }
    // Rearranged formula: unreduced slope with matching display, and the
    // other variable's solution.
    const rearrange = definition("m2-formula-rearrange");
    for (const c of every(rearrange)) {
      const [sn, sd, tn, td] = c.answer.exact.map(B);
      const scaled = [sn * B(2), sd * B(2), tn, td].map(String);
      assert(
        !rearrange.verify({ ...c, answer: { ...c.answer, exact: scaled } }),
        "unreduced",
      );
      const [a, b, cc, v] = c.parameters;
      const otherSolved = v === 1 ? B(a) : B(b),
        other = v === 1 ? B(b) : B(a);
      const [wn, wd] = reduced(-other, otherSolved),
        [un, ud] = reduced(B(cc), otherSolved);
      const swapped = [wn, wd, un, ud].map(String);
      if (swapped.join() !== c.answer.exact.join())
        assert(
          !rearrange.verify({ ...c, answer: { ...c.answer, exact: swapped } }),
          "other variable",
        );
    }
    // Integer types: the integer just below and above, rendered consistently.
    for (const id of [
      "m2-exponent-base-match",
      "m2-exponent-equation",
      "m2-power-digit-count",
      "m1-square-multiplier",
      "m2-recurring-nth-digit",
    ]) {
      const d = definition(id);
      for (const c of every(d))
        for (const delta of [B(-1), B(1), B(2)])
          assert(
            !d.verify({
              ...c,
              answer: integerAnswer(B(c.answer.exact[0]) + delta),
            }),
            `${id}:${c.parameters.join(",")}:${delta}`,
          );
    }
    // Square multiplier: any larger square-making multiplier is not minimal.
    const square = definition("m1-square-multiplier");
    for (const c of every(square)) {
      const [n, op] = c.parameters;
      const m = Number(c.answer.exact[0]);
      const bigger = op === 0 ? m * 4 : n % (m * 4) === 0 ? m * 4 : null;
      if (bigger !== null)
        assert(!square.verify({ ...c, answer: integerAnswer(B(bigger)) }));
    }
  });

  it("keeps the documented normal forms", () => {
    for (const id of [
      "m2-polynomial-two-variable-add",
      "m2-polynomial-two-variable-subtract",
      "m2-polynomial-nested-braces",
      "m2-expression-substitute",
    ]) {
      const d = definition(id);
      for (const c of every(d)) {
        const triples = readTriples(c.answer);
        let previous = Infinity;
        for (const [x, y, coefficient] of triples) {
          assert(x >= 0 && y >= 0 && coefficient !== 0, `${id}:zero`);
          assert(x * 20 + y < previous, `${id}:order`);
          previous = x * 20 + y;
        }
        assert.equal(c.answer.text, renderTerms(triples, false));
        assert.equal(c.answer.latex, renderTerms(triples, true));
        for (const s of c.answer.exact) assert.match(s, /^(0|-?[1-9]\d*)$/);
      }
    }
    const rearrange = definition("m2-formula-rearrange");
    for (const c of every(rearrange)) {
      const [sn, sd, tn, td] = c.answer.exact.map(B);
      const v = c.parameters[3] === 1 ? ["y", "x"] : ["x", "y"];
      const coefficientText =
        sd === B(1)
          ? abs(sn) === B(1)
            ? sn < B(0)
              ? "-"
              : ""
            : String(sn)
          : `(${rationalText(sn, sd)})`;
      const coefficientLatex =
        sd === B(1)
          ? abs(sn) === B(1)
            ? sn < B(0)
              ? "-"
              : ""
            : String(sn)
          : rationalText(sn, sd, true);
      const tail = (latex: boolean) =>
        `${tn < B(0) ? " - " : " + "}${rationalText(abs(tn), td, latex)}`;
      assert.equal(
        c.answer.text,
        `${v[0]} = ${coefficientText}${v[1]}${tail(false)}`,
      );
      assert.equal(
        c.answer.latex,
        `${v[0]} = ${coefficientLatex}${v[1]}${tail(true)}`,
      );
    }
    for (const id of [
      "m2-exponent-base-match",
      "m2-exponent-equation",
      "m2-power-digit-count",
      "m1-square-multiplier",
      "m2-recurring-nth-digit",
    ])
      for (const c of every(definition(id))) {
        assert.equal(c.answer.kind, "integer");
        assert.equal(c.answer.exact.length, 1);
        assert.equal(c.answer.text, c.answer.exact[0]);
        assert.equal(c.answer.latex, c.answer.exact[0]);
      }
  });

  it("screens trivial items out of every domain", () => {
    for (const id of [
      "m2-polynomial-two-variable-add",
      "m2-polynomial-two-variable-subtract",
    ])
      for (const c of every(definition(id))) {
        // Never cancels to fewer than the three kinds of term.
        assert.equal(readTriples(c.answer).length, 3, `${id}:cancelled`);
        // Never the audit's (−5x−5)+(−5x−5) shape: the operands differ.
        const [a, b, cc, d, e, f] = c.parameters;
        assert(a !== d || b !== e || cc !== f, `${id}:identical operands`);
      }
    for (const c of every(definition("m2-polynomial-nested-braces")))
      assert(
        readTriples(c.answer).some(([x]) => x === 1),
        "nested: x term vanished",
      );
    for (const c of every(definition("m2-expression-substitute"))) {
      const [a, b, cc, d] = c.parameters;
      assert(a !== cc || b !== d, "substitute: A equals B");
      assert.equal(readTriples(c.answer).length, 2, "substitute: cancelled");
    }
    for (const c of every(definition("m2-exponent-base-match"))) {
      const [, p, q, m, n] = c.parameters;
      assert(p !== 1 || q !== 1, "base-match: plain same-base law");
      assert(m !== 1 || n !== 1, "base-match: no exponent to distribute");
    }
    for (const c of every(definition("m2-exponent-equation")))
      assert(Number(c.answer.exact[0]) >= 1, "exponent equation: x < 1");
    for (const c of every(definition("m1-square-multiplier"))) {
      assert(!isSquare(B(c.parameters[0])), "square multiplier: n is a square");
      assert(Number(c.answer.exact[0]) > 1, "square multiplier: a = 1");
    }
    for (const c of every(definition("m2-recurring-nth-digit"))) {
      const [n, d] = c.parameters;
      assert(period(n, d) >= 2, `nth digit: ${n}/${d} repeats one digit`);
    }
  });

  it("keeps prompts in the shared Korean math style", () => {
    for (const id of NEW_IDS)
      for (const c of every(definition(id)).slice(0, 30)) {
        assert.equal(c.prompt.layout, "math");
        if (c.prompt.layout !== "math") continue;
        assert.match(c.prompt.instruction ?? "", /시오\.$/);
        assert.doesNotMatch(c.prompt.latex, /[<>]/);
        assert.doesNotMatch(c.prompt.text, /\\/);
      }
    const nested = definition("m2-polynomial-nested-braces").problemAt(
      0,
    ).prompt;
    if (nested.layout === "math") {
      expect(nested.text).toMatch(/\{.*\(.*\).*\}/);
      expect(nested.latex).toMatch(/\\\{.*\\\}/);
    }
    const match = definition("m2-exponent-base-match").problemAt(0).prompt;
    if (match.layout === "math") {
      expect(match.text).toContain("□");
      expect(match.latex).toContain("\\square");
    }
    const digit = definition("m2-recurring-nth-digit").problemAt(0).prompt;
    if (digit.layout === "math")
      expect(digit.instruction).toMatch(/소수점 아래 \d+번째 자리/);
  });
});
