import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { ALGEBRA_COMPLETE_DEFINITIONS as definitions } from "../../lib/arithmetic-v2/families/algebraComplete";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
} from "../../lib/arithmetic-v2/types";
import {
  arithmeticV2CandidateSchema,
  arithmeticV2PromptIdentity,
} from "../../contracts/arithmeticV2.contract";

// Deliberately no imports from production arithmetic helpers/solvers/checkers.
const abs = (n: bigint) => (n < BigInt(0) ? -n : n);
function gcd(a: bigint, b: bigint): bigint {
  while (b) {
    [a, b] = [b, a % b];
  }
  return abs(a);
}
function reduced(n: bigint, d = BigInt(1)): bigint[] {
  if (d < BigInt(0)) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return [n / g, d / g];
}
function numeric(answer: ArithmeticV2Answer, n: bigint, d = BigInt(1)) {
  const q = reduced(n, d);
  assert.deepEqual(
    answer.exact,
    answer.kind === "integer" ? [String(q[0])] : q.map(String),
  );
}
function primePowers(n: number): number[][] {
  const result: number[][] = [];
  for (let p = 2; p <= n; p++) {
    let e = 0;
    for (let multiple = p; multiple <= n && n % multiple === 0; multiple *= p)
      e++;
    if (e) {
      result.push([p, e]);
      n /= p ** e;
    }
  }
  return result;
}
function squareFreePart(n: number): [number, number] {
  let outside = 1,
    inside = 1;
  for (const [p, e] of primePowers(n)) {
    outside *= p ** Math.floor(e / 2);
    if (e % 2) inside *= p;
  }
  return [outside, inside];
}
function rootOracle(a: number, b: number, c: number): string[] {
  const D = b * b - 4 * a * c;
  if (D === 0) {
    const [p, s] = reduced(BigInt(-b), BigInt(2 * a));
    return ["1", String(p), "0", "0", String(s)];
  }
  const [k, r] = squareFreePart(D);
  const entries = [-1, 1].map((sign) => {
    if (r === 1) {
      const [p, s] = reduced(BigInt(-b + sign * k), BigInt(2 * a));
      return [p, BigInt(0), BigInt(0), s];
    }
    const g = gcd(gcd(BigInt(b), BigInt(k)), BigInt(2 * a));
    return [BigInt(-b) / g, BigInt(sign * k) / g, BigInt(r), BigInt(2 * a) / g];
  });
  return ["2", ...entries.flat().map(String)];
}
const rationalText = (n: bigint, d: bigint, latex = false) =>
  d === BigInt(1)
    ? String(n)
    : latex
      ? `${n < BigInt(0) ? "-" : ""}\\frac{${abs(n)}}{${d}}`
      : `${n}/${d}`;
function renderRoots(exact: string[], latex = false) {
  const values: string[] = [];
  for (let i = 1; i < exact.length; i += 4) {
    const [p, q, r, s] = exact.slice(i, i + 4).map(BigInt);
    if (!q) values.push(rationalText(p, s, latex));
    else {
      const rad = `${abs(q) === BigInt(1) ? "" : abs(q)}${latex ? `\\sqrt{${r}}` : `√${r}`}`;
      const top = p
        ? `${p}${q < BigInt(0) ? " - " : " + "}${rad}`
        : `${q < BigInt(0) ? "-" : ""}${rad}`;
      values.push(
        s === BigInt(1)
          ? top
          : latex
            ? `\\frac{${top}}{${s}}`
            : `(${top})/${s}`,
      );
    }
  }
  return `x=${values.join(latex ? ",\\quad " : " 또는 ")}`;
}
function withRoots(
  candidate: ArithmeticV2Candidate,
  exact: string[],
): ArithmeticV2Candidate {
  return {
    ...candidate,
    answer: {
      kind: "surd",
      exact,
      text: renderRoots(exact),
      latex: renderRoots(exact, true),
    },
  };
}
function polyValue(exact: string[], x: bigint, y: bigint): bigint {
  let sum = BigInt(0);
  for (let i = 0; i < exact.length; i += 3)
    sum +=
      BigInt(exact[i + 2]) * x ** BigInt(exact[i]) * y ** BigInt(exact[i + 1]);
  return sum;
}
function factoredValue(exact: string[], x: bigint, y: bigint): bigint {
  let v = BigInt(exact[0]) * x ** BigInt(exact[1]) * y ** BigInt(exact[2]);
  for (let i = 4; i < exact.length; i += 4)
    v *=
      (BigInt(exact[i]) * x +
        BigInt(exact[i + 1]) * y +
        BigInt(exact[i + 2])) **
      BigInt(exact[i + 3]);
  return v;
}
function oracle(id: string, p: number[], answer: ArithmeticV2Answer) {
  const [a, b, c, d, e, f] = p,
    [A, B, C, D] = p.map(BigInt);
  if (id === "m1-prime-factorization") {
    assert.deepEqual(answer.exact, primePowers(a).flat().map(String));
    return;
  }
  if (id === "m1-divisor-count-factors") {
    const n = 2 ** a * 3 ** b * 5 ** c;
    let count = 0;
    for (let i = 1; i * i <= n; i++)
      if (n % i === 0) count += i * i === n ? 1 : 2;
    numeric(answer, BigInt(count));
    return;
  }
  if (id === "m1-factor-gcd" || id === "m1-factor-lcm") {
    const l = 2 ** a * 3 ** b * 5 ** c,
      r = 2 ** d * 3 ** e * 5 ** f;
    let greatest = 1;
    for (let i = 1; i <= Math.min(l, r); i++)
      if (l % i === 0 && r % i === 0) greatest = i;
    numeric(answer, BigInt(id.endsWith("gcd") ? greatest : (l * r) / greatest));
    return;
  }
  if (id === "m1-absolute-value") {
    numeric(answer, abs(A), B);
    return;
  }
  if (id === "m1-additive-opposite") {
    numeric(answer, -A, B);
    return;
  }
  if (id === "m2-recurring-pure-fraction") {
    numeric(answer, A, BigInt("9".repeat(b)));
    return;
  }
  if (id === "m2-recurring-mixed-fraction") {
    numeric(answer, BigInt(10 * a + b - a), BigInt(90));
    return;
  }
  if (id === "m2-recurring-rational-operations") {
    const [r, n, den, op] = p;
    if (op < 2)
      numeric(
        answer,
        BigInt(r * den + (op === 0 ? 1 : -1) * 9 * n),
        BigInt(9 * den),
      );
    else if (op === 2) numeric(answer, BigInt(r * n), BigInt(9 * den));
    else numeric(answer, BigInt(r * den), BigInt(9 * n));
    return;
  }
  if (id === "m2-terminating-minimum-multiplier") {
    let k = 1;
    for (const [prime, power] of primePowers(b))
      if (prime !== 2 && prime !== 5) k *= prime ** power;
    numeric(answer, BigInt(k));
    return;
  }
  if (id === "m2-terminating-decimal-places") {
    let multiplier = 10,
      places = 1;
    while (multiplier % b !== 0) {
      multiplier *= 10;
      places++;
    }
    numeric(answer, BigInt(places));
    return;
  }
  if (id === "m1-linear-substitution-value") {
    numeric(answer, A * C + B);
    return;
  }
  if (id === "m1-two-variable-substitution") {
    numeric(answer, A * C + B * D);
    return;
  }
  if (id === "m1-rational-substitution") {
    numeric(answer, A * C + B * D, D);
    return;
  }
  if (id.startsWith("m2-exponent-")) {
    numeric(
      answer,
      id.includes("product") ? A + B : id.includes("quotient") ? A - B : A * B,
    );
    return;
  }
  if (id === "m2-product-power-two-variable") {
    assert.deepEqual(answer.exact, [b * d, c * d, a ** d].map(String));
    return;
  }
  if (id === "m2-monomial-mixed-two-variable") {
    const q = reduced(A * B, C);
    assert.deepEqual(answer.exact, [
      String(d + 1),
      String(e + 1 - f),
      ...q.map(String),
    ]);
    return;
  }
  if (id === "m3-root-of-square-identity") {
    numeric(answer, abs(A));
    return;
  }
  if (id === "m3-square-of-root-identity") {
    numeric(answer, A);
    return;
  }
  if (id.startsWith("m3-multiplication-")) {
    for (let i = -2; i <= 2; i++)
      for (let j = -2; j <= 2; j++) {
        const x = BigInt(i),
          y = BigInt(j),
          rhs = id.includes("linear")
            ? (A * x + B) ** BigInt(2)
            : id.includes("conjugate")
              ? (A * x + B * y) * (A * x - B * y)
              : (A * x + B * y) ** BigInt(2);
        assert.equal(polyValue(answer.exact, x, y), rhs);
      }
    return;
  }
  if (id === "m3-square-formula-substitution") {
    numeric(answer, A * A + BigInt(2) * C * A * B + B * B);
    return;
  }
  if (id.startsWith("m1-linear-equation-")) {
    if (id.endsWith("missing-coefficient")) {
      numeric(answer, B);
      return;
    }
    if (id.endsWith("both-sides")) numeric(answer, D - B, A - C);
    else if (id.endsWith("parentheses")) numeric(answer, D - C - A * B, A);
    else if (id.endsWith("fraction")) numeric(answer, C * D - B, A);
    else numeric(answer, C - B, A);
    return;
  }
  if (id.startsWith("m2-linear-inequality-")) {
    const leftA = a;
    let leftB = b,
      rightA = 0,
      rightB = c,
      relation = d;
    if (id.endsWith("both-sides")) {
      rightA = c;
      rightB = d;
      relation = e;
    } else if (id.endsWith("parentheses")) leftB = a * b;
    else if (id.endsWith("fraction")) {
      rightB = c * d;
      relation = e;
    }
    const q = reduced(BigInt(rightB - leftB), BigInt(leftA - rightA));
    assert.deepEqual(answer.exact.slice(1), q.map(String));
    const actual = Number(answer.exact[0]);
    const truth = (v: bigint, code: number) =>
      code === 0
        ? v < BigInt(0)
        : code === 1
          ? v <= BigInt(0)
          : code === 2
            ? v > BigInt(0)
            : v >= BigInt(0);
    for (let n = -31; n <= 31; n++) {
      const comparison = q[0] * BigInt(2) - q[1] * BigInt(n);
      assert.equal(
        truth(BigInt((leftA - rightA) * n + 2 * (leftB - rightB)), relation),
        truth(-comparison, actual),
      );
    }
    return;
  }
  if (id === "m2-inequality-integer-bound") {
    const holds = (x: number) => {
      const v = a * x + b - c;
      return d === 0 ? v < 0 : d === 1 ? v <= 0 : d === 2 ? v > 0 : v >= 0;
    };
    const solutions = Array.from({ length: 101 }, (_, i) => i - 50).filter(
      holds,
    );
    const upper = (a < 0 ? d ^ 2 : d) < 2;
    numeric(
      answer,
      BigInt(upper ? solutions[solutions.length - 1] : solutions[0]),
    );
    return;
  }
  if (
    id.startsWith("m2-simultaneous-equations-") &&
    !id.endsWith("substitution")
  ) {
    const det = A * D - B * C,
      left = BigInt(
        e * (id.endsWith("fraction") ? 2 : id.endsWith("decimal") ? 10 : 1),
      ),
      right = BigInt(
        f * (id.endsWith("fraction") ? 3 : id.endsWith("decimal") ? 10 : 1),
      );
    assert.deepEqual(
      answer.exact,
      [
        ...reduced(left * D - B * right, det),
        ...reduced(A * right - left * C, det),
      ].map(String),
    );
    return;
  }
  if (id === "m2-simultaneous-equations-substitution") {
    assert.deepEqual(
      answer.exact,
      [...reduced(D - B, A + C), ...reduced(A * D + B * C, A + C)].map(String),
    );
    return;
  }
  if (id === "m2-system-missing-coefficient") {
    numeric(answer, A);
    return;
  }
  if (id.startsWith("m3-factor-")) {
    for (let i = -2; i <= 4; i++)
      for (let j = -2; j <= 4; j++) {
        const x = BigInt(i),
          y = BigInt(j);
        let rhs: bigint;
        if (id.endsWith("common-two-variable"))
          rhs = A * x ** B * y ** C * (D * x + BigInt(e) * y);
        else if (id.endsWith("common")) rhs = A * x ** B * (C * x + D);
        else if (id.includes("difference-squares"))
          rhs =
            A * A * x * x -
            B * B * (id.includes("bivariate") ? y * y : BigInt(1));
        else if (id.includes("perfect-square"))
          rhs =
            (A * x + B * (id.includes("bivariate") ? y : BigInt(1))) **
            BigInt(2);
        else if (id.endsWith("nonmonic-quadratic"))
          rhs = (A * x + B) * (C * x + D);
        else if (id.endsWith("monic-quadratic")) rhs = (x + A) * (x + B);
        else if (id.endsWith("common-binomial"))
          rhs = (x + A) ** BigInt(2) + (B + C) * (x + A) + B * C;
        else throw Error(id);
        assert.equal(factoredValue(answer.exact, x, y), rhs);
      }
    return;
  }
  if (id.startsWith("m3-quadratic-equation-")) {
    let coefficients: number[];
    if (id.endsWith("nonmonic-factoring"))
      coefficients = [a * c, a * d + b * c, b * d];
    else if (id.endsWith("factoring")) coefficients = [1, -a - b, a * b];
    else if (id.endsWith("square-root")) coefficients = [a, 0, -b];
    else if (id.endsWith("perfect-square"))
      coefficients = [a * a, 2 * a * b, b * b - c];
    else coefficients = [a, b, c];
    assert.deepEqual(
      answer.exact,
      rootOracle(coefficients[0], coefficients[1], coefficients[2]),
    );
    return;
  }
  if (id === "m3-quadratic-missing-coefficient") {
    numeric(answer, B);
    return;
  }
  throw Error(`Missing independent oracle: ${id}`);
}

describe("complete middle number/algebra/equation families", () => {
  it("exhausts each actual domain against separate exact oracles, schema and prompt identity", () => {
    const identities = new Set<string>(),
      ids = new Set<string>();
    let total = 0;
    for (const definition of definitions) {
      assert(!ids.has(definition.id));
      ids.add(definition.id);
      assert.equal(definition.curriculum?.semester, 1);
      assert(definition.curriculum?.unit);
      const parameterKeys = new Set<string>();
      for (let i = 0; i < definition.domainSize; i++) {
        const candidate = definition.problemAt(i);
        assert(definition.verify(candidate), `${definition.id}:${i}`);
        assert(
          arithmeticV2CandidateSchema.safeParse(candidate).success,
          `${definition.id}:schema`,
        );
        oracle(definition.id, candidate.parameters, candidate.answer);
        const identity = arithmeticV2PromptIdentity(candidate.prompt);
        assert(!identities.has(identity), `${definition.id}:duplicate task`);
        identities.add(identity);
        const key = JSON.stringify(candidate.parameters);
        assert(!parameterKeys.has(key));
        parameterKeys.add(key);
        assert(candidate.parameters.length <= 6);
        assert(candidate.answer.exact.every((s) => s.length <= 40));
        total++;
      }
      assert.equal(parameterKeys.size, definition.domainSize);
    }
    assert.equal(total, identities.size);
    console.log(
      `Exhaustive independent oracle: ${definitions.length} families, ${total} unique tasks`,
    );
  });
  it("rejects every exact-field mutation throughout all domains", () => {
    let count = 0;
    for (const definition of definitions)
      for (let i = 0; i < definition.domainSize; i++) {
        const candidate = definition.problemAt(i);
        for (let field = 0; field < candidate.answer.exact.length; field++) {
          const exact = [...candidate.answer.exact];
          exact[field] = String(BigInt(exact[field]) + BigInt(1));
          let answer = { ...candidate.answer, exact };
          if (answer.kind === "integer")
            answer = { ...answer, text: exact[0], latex: exact[0] };
          else if (answer.kind === "rational") {
            const [n, d] = exact.map(BigInt);
            answer = {
              ...answer,
              text: rationalText(n, d),
              latex: rationalText(n, d, true),
            };
          }
          assert(
            !definition.verify({ ...candidate, answer }),
            `${definition.id}:${i}:field${field}`,
          );
          count++;
        }
      }
    console.log(`Rejected exact-field mutations: ${count}`);
  });
  it("is deterministic, property-order neutral, bounded and hostile-input safe", () => {
    for (const definition of definitions) {
      for (const index of [-1, definition.domainSize, 1.5, NaN, Infinity])
        expect(() => definition.problemAt(index)).toThrow();
      for (const index of [
        0,
        Math.floor(definition.domainSize / 2),
        definition.domainSize - 1,
      ]) {
        const c = definition.problemAt(index);
        expect(definition.problemAt(index)).toEqual(c);
        assert(
          definition.verify(
            JSON.parse(
              JSON.stringify({
                answer: {
                  latex: c.answer.latex,
                  text: c.answer.text,
                  exact: c.answer.exact,
                  kind: c.answer.kind,
                },
                prompt: Object.fromEntries(Object.entries(c.prompt).reverse()),
                parameters: c.parameters,
              }),
            ),
          ),
        );
        const variants: unknown[] = [
          null,
          {},
          { ...c, parameters: [...c.parameters, 0] },
          {
            ...c,
            parameters: c.parameters.map((_, i) =>
              i === 0 ? -0 : c.parameters[i],
            ),
          },
          { ...c, parameters: [Infinity] },
          { ...c, parameters: [NaN] },
          { ...c, parameters: [1.2] },
          { ...c, parameters: new Array(c.parameters.length) },
          { ...c, prompt: { ...c.prompt, text: "changed" } },
          { ...c, prompt: { ...c.prompt, latex: "changed" } },
          { ...c, prompt: { ...c.prompt, instruction: "changed" } },
          { ...c, prompt: { ...c.prompt, extra: true } },
          { ...c, answer: { ...c.answer, extra: true } },
        ];
        for (const exact of [
          [],
          ["01"],
          ["-0"],
          ["1.0"],
          ["NaN"],
          ["1e2"],
          ["9".repeat(81)],
          Array(31).fill("1"),
          new Array(c.answer.exact.length),
        ])
          variants.push({ ...c, answer: { ...c.answer, exact } });
        for (const variant of variants)
          assert(
            !definition.verify(variant as ArithmeticV2Candidate),
            definition.id,
          );
        for (const key of ["text", "latex"] as const)
          assert(
            !definition.verify({
              ...c,
              answer: { ...c.answer, [key]: "changed" },
            }),
          );
        if (c.answer.kind === "rational") {
          for (const d of ["0", "-1"]) {
            assert(
              !definition.verify({
                ...c,
                answer: { ...c.answer, exact: [c.answer.exact[0], d] },
              }),
            );
          }
          const exact = c.answer.exact.map((v) =>
            String(BigInt(v) * BigInt(2)),
          );
          const [n, d] = exact.map(BigInt);
          assert(
            !definition.verify({
              ...c,
              answer: {
                ...c.answer,
                exact,
                text: rationalText(n, d),
                latex: rationalText(n, d, true),
              },
            }),
          );
        }
      }
    }
  });
  it("rejects self-consistent incomplete, duplicate, reversed or unreduced quadratic root sets", () => {
    for (const definition of definitions.filter((d) =>
      d.id.startsWith("m3-quadratic-equation-"),
    ))
      for (let i = 0; i < definition.domainSize; i++) {
        const c = definition.problemAt(i),
          x = c.answer.exact;
        if (x[0] === "2") {
          assert(
            !definition.verify(withRoots(c, ["1", ...x.slice(1, 5)])),
            `${definition.id}:incomplete`,
          );
          assert(
            !definition.verify(
              withRoots(c, ["2", ...x.slice(5), ...x.slice(1, 5)]),
            ),
            `${definition.id}:reversed`,
          );
          assert(
            !definition.verify(
              withRoots(c, ["2", ...x.slice(1, 5), ...x.slice(1, 5)]),
            ),
            `${definition.id}:duplicate`,
          );
        }
        const scaled = [...x];
        for (const offset of [1, 2, 4])
          scaled[offset] = String(BigInt(scaled[offset]) * BigInt(2));
        assert(
          !definition.verify(withRoots(c, scaled)),
          `${definition.id}:unreduced`,
        );
      }
  });
  it("rejects self-consistent reversed systems and inequalities and unfactored equivalents", () => {
    const systems = definitions.filter((d) =>
      d.id.startsWith("m2-simultaneous-"),
    );
    for (const def of systems) {
      const c = Array.from({ length: def.domainSize }, (_, i) =>
        def.problemAt(i),
      ).find((c) => c.answer.exact[0] !== c.answer.exact[2])!;
      const exact = [...c.answer.exact.slice(2), ...c.answer.exact.slice(0, 2)];
      const [xn, xd, yn, yd] = exact.map(BigInt);
      assert(
        !def.verify({
          ...c,
          answer: {
            kind: "polynomial",
            exact,
            text: `x=${rationalText(xn, xd)}, y=${rationalText(yn, yd)}`,
            latex: `x=${rationalText(xn, xd, true)},\\quad y=${rationalText(yn, yd, true)}`,
          },
        }),
      );
    }
    for (const def of definitions.filter((d) =>
      d.id.startsWith("m2-linear-inequality-"),
    )) {
      const c = def.problemAt(0),
        [code, n, d] = c.answer.exact;
      const flipped = Number(code) ^ 2;
      assert(
        !def.verify({
          ...c,
          answer: {
            kind: "polynomial",
            exact: [String(flipped), n, d],
            text: `x ${["＜", "≤", "＞", "≥"][flipped]} ${rationalText(BigInt(n), BigInt(d))}`,
            latex: `x ${["\\lt", "\\le", "\\gt", "\\ge"][flipped]} ${rationalText(BigInt(n), BigInt(d), true)}`,
          },
        }),
      );
    }
    const factor = definitions.find(
        (d) => d.id === "m3-factor-difference-squares",
      )!,
      c = factor.problemAt(0);
    assert(
      !factor.verify({
        ...c,
        answer: {
          kind: "polynomial",
          exact: ["2", "1", "1", "0", "-1", "1"],
          text: "x² - 1",
          latex: "x^2-1",
        },
      }),
    );
    assert(
      !factor.verify({
        ...c,
        answer: {
          kind: "polynomial",
          exact: ["1", "0", "0", "2", "1", "0", "1", "1", "1", "0", "-1", "1"],
          text: "(x + 1)(x - 1)",
          latex: "(x + 1)(x - 1)",
        },
      }),
    );
    // Primitive factors cannot hide a common factor, even when expansion is exact.
    const common = definitions.find((d) => d.id === "m3-factor-common")!;
    const base = Array.from({ length: common.domainSize }, (_, i) =>
      common.problemAt(i),
    ).find((v) => v.parameters.join(",") === "2,1,1,1")!;
    assert(
      !common.verify({
        ...base,
        answer: {
          kind: "polynomial",
          exact: ["1", "1", "0", "1", "2", "0", "2", "1"],
          text: "x(2x + 2)",
          latex: "x(2x + 2)",
        },
      }),
    );
  });
});
