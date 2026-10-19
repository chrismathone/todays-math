// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ELEMENTARY_ARITHMETIC_DEFINITIONS as definitions } from "../../lib/arithmetic-v2/families/elementary";
import type {
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
} from "../../lib/arithmetic-v2/types";

type Rational = [bigint, bigint];
const B = BigInt;
const def = (id: string) => definitions.find((d) => d.id === `elem-${id}`)!;
const clone = (p: ArithmeticV2Candidate) =>
  JSON.parse(JSON.stringify(p)) as ArithmeticV2Candidate;

// Test-only expression parser with rational arithmetic; never imports production
// arithmetic/domain/rendering helpers and never evaluates JavaScript source.
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

function expressionValue(text: string): Rational {
  const tokens = text.match(/\d+ \d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[()+\-×÷]/g)!;
  expect(tokens.join("").replaceAll(" ", "")).toBe(text.replaceAll(" ", ""));
  let cursor = 0;
  const apply = ([a, b]: Rational, [c, d]: Rational, op: string): Rational =>
    op === "+"
      ? [a * d + c * b, b * d]
      : op === "-"
        ? [a * d - c * b, b * d]
        : op === "×"
          ? [a * c, b * d]
          : [a * d, b * c];
  const atom = (): Rational => {
    const token = tokens[cursor++];
    if (token !== "(") return literal(token);
    const value = add();
    expect(tokens[cursor++]).toBe(")");
    return value;
  };
  const multiply = (): Rational => {
    let value = atom();
    while (tokens[cursor] === "×" || tokens[cursor] === "÷") {
      const op = tokens[cursor++];
      value = apply(value, atom(), op);
    }
    return value;
  };
  const add = (): Rational => {
    let value = multiply();
    while (tokens[cursor] === "+" || tokens[cursor] === "-") {
      const op = tokens[cursor++];
      value = apply(value, multiply(), op);
    }
    return value;
  };
  const result = add();
  expect(cursor).toBe(tokens.length);
  return result;
}

function assertOracle(candidate: ArithmeticV2Candidate) {
  const { prompt, answer } = candidate;
  const source =
    prompt.layout === "math"
      ? prompt.text
      : `${prompt.left} ${prompt.operator} ${prompt.right}`;
  const [n, d] = expressionValue(source);
  expect(n >= B(0) && d > B(0)).toBe(true);
  if (answer.kind === "remainder") {
    const [a, b] = candidate.parameters.map(B);
    expect(answer.exact).toEqual([String(a / b), String(a % b)]);
    expect(answer.text).toBe(`몫 ${a / b}, 나머지 ${a % b}`);
    expect(answer.latex).toBe(`\\text{몫 }${a / b},\\;\\text{나머지 }${a % b}`);
    return;
  }
  const [shownN, shownD] = literal(answer.text);
  expect(shownN * d).toBe(n * shownD);
  let exact: Rational;
  if (answer.kind === "integer") exact = [B(answer.exact[0]), B(1)];
  else if (answer.kind === "rational") exact = answer.exact.map(B) as Rational;
  else {
    expect(answer.kind).toBe("decimal");
    const [coefficient, scale] = answer.exact.map(B);
    expect(scale >= B(0) && scale <= B(4)).toBe(true);
    expect(scale === B(0) || coefficient % B(10) !== B(0)).toBe(true);
    exact = [coefficient, B(10) ** scale];
  }
  expect(exact[0] * d).toBe(n * exact[1]);
  if (answer.kind === "rational") {
    // Trial division independently establishes the claimed normal form.
    const numerator = Number(exact[0]);
    const denominator = Number(exact[1]);
    expect(denominator).toBeGreaterThan(0);
    let coprime = true;
    for (let factor = 2; factor <= Math.min(numerator, denominator); factor++) {
      if (numerator % factor === 0 && denominator % factor === 0) {
        coprime = false;
        break;
      }
    }
    expect(coprime).toBe(true);
    if (numerator === 0) expect(denominator).toBe(1);
    const whole = Math.floor(numerator / denominator);
    const part = numerator % denominator;
    const latex = part
      ? `${whole || ""}\\frac{${part}}{${denominator}}`
      : String(whole);
    expect(answer.latex).toBe(latex);
  } else expect(answer.latex).toBe(answer.text);
}

function assertPromptParameters(
  definition: ArithmeticV2Definition,
  candidate: ArithmeticV2Candidate,
) {
  const { parameters: p, prompt } = candidate;
  if (prompt.layout === "vertical") {
    expect([prompt.left, prompt.right]).toEqual(p);
    return;
  }
  if (definition.id === "elem-g5-natural-mixed") {
    const [mode, a, b, c] = p;
    expect(prompt.text).toBe(
      [
        `${a} + ${b} × ${c}`,
        `(${a} + ${b}) × ${c}`,
        `${a} ÷ ${b} + ${c}`,
        `(${a} - ${b}) × ${c}`,
      ][mode],
    );
    return;
  }
  const operands = prompt.text.split(/ [+\-×÷] /);
  // Three-term fraction drills (2026-10-16, track C): the only elementary
  // prompts with three displayed operands. Everything else stays binary.
  if (definition.id === "elem-g5-fraction-mul-three") {
    expect(operands).toHaveLength(3);
    expect(prompt.text.match(/ [+\-×÷] /g)).toEqual([" × ", " × "]);
    expect(operands.flatMap((operand) => literal(operand).map(Number))).toEqual(
      p,
    );
    return;
  }
  if (definition.id === "elem-g5-fraction-three-terms") {
    const [mode, ...fractions] = p;
    expect(operands).toHaveLength(3);
    expect(prompt.text.match(/ [+\-×÷] /g)).toEqual(
      [
        [" + ", " + "],
        [" + ", " - "],
        [" - ", " + "],
        [" - ", " - "],
      ][mode],
    );
    expect(operands.flatMap((operand) => literal(operand).map(Number))).toEqual(
      fractions,
    );
    return;
  }
  expect(operands).toHaveLength(2);
  if (definition.strand === "분수") {
    const shown = operands.map((operand) => literal(operand).map(Number));
    // Literal parsing retains unreduced same-denominator representations.
    expect(shown.flat()).toEqual(p);
  } else if (definition.strand === "소수") {
    operands.forEach((operand, index) => {
      const [n, d] = literal(operand);
      const scale = definition.id.endsWith("-natural") && index === 1 ? 1 : 100;
      expect(n * B(scale)).toBe(B(p[index]) * d);
    });
  } else expect(operands.map(Number)).toEqual(p);
}

function indices(size: number): number[] {
  if (size <= 40000) return Array.from({ length: size }, (_, i) => i);
  const selected = new Set<number>([0, 1, size - 2, size - 1]);
  for (let i = 0; i < 2048; i++)
    selected.add(Math.floor((i * (size - 1)) / 2047));
  let state = 0x7a19c8;
  for (let i = 0; i < 512; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    selected.add(state % size);
  }
  return [...selected];
}

describe("elementary arithmetic finite families", () => {
  it("has 42 stable IDs and the audited Korean grade placements", () => {
    // 27 original + 8 (2026-10-16 track B, natural) + 7 (track C, fraction/decimal).
    expect(definitions).toHaveLength(42);
    expect(new Set(definitions.map((d) => d.id)).size).toBe(42);
    const original = new Set([
      "g3-add-3digit",
      "g3-sub-3digit",
      "g3-mul-3x1",
      "g3-mul-2x2",
      "g3-div-2x1-remainder",
      "g3-div-3x1-remainder",
      "g4-mul-3x2",
      "g4-div-2x2-remainder",
      "g4-div-3x2-remainder",
      "g5-natural-mixed",
      "g4-fraction-same-add",
      "g4-fraction-same-sub",
      "g4-mixed-same-add",
      "g4-mixed-same-sub",
      "g5-fraction-unlike-add",
      "g5-fraction-unlike-sub",
      "g5-mixed-unlike-add",
      "g5-mixed-unlike-sub",
      "g5-fraction-mul",
      "g5-fraction-mul-natural",
      "g6-fraction-div",
      "g6-fraction-div-natural",
      "g4-decimal-add",
      "g4-decimal-sub",
      "g5-decimal-mul",
      "g6-decimal-div",
      "g6-decimal-div-natural",
    ]);
    expect(original.size).toBe(27);
    expect(
      definitions.map((d) => d.id.slice(5)).filter((id) => !original.has(id)),
    ).toEqual([
      "g3-div-times-table",
      "g3-mul-tens-by-one",
      "g3-mul-tens-by-tens",
      "g3-mul-2digit-by-tens",
      "g3-div-2x1-exact",
      "g4-mul-hundreds-by-tens",
      "g4-mul-3digit-by-tens",
      "g4-div-by-tens-remainder",
      "g5-fraction-mul-proper",
      "g5-natural-mul-fraction",
      "g5-fraction-mul-three",
      "g5-fraction-three-terms",
      "g5-natural-mul-decimal",
      "g5-decimal-point-shift",
      "g6-natural-div-natural-decimal",
    ]);
    for (const definition of definitions) {
      expect(definition.grade).toBe(`초${definition.id.slice(6, 7)}`);
      expect(definition.rankGroup).toMatch(
        /^elementary-(natural|fraction|decimal)-/,
      );
      expect(Number.isSafeInteger(definition.domainSize)).toBe(true);
      expect(definition.domainSize).toBeGreaterThan(0);
    }
    expect(def("g4-fraction-same-add").grade).toBe("초4");
    expect(def("g5-fraction-unlike-add").grade).toBe("초5");
    expect(def("g5-decimal-mul").grade).toBe("초5");
    expect(def("g6-fraction-div").grade).toBe("초6");
  });

  for (const definition of definitions) {
    it(`${definition.id}: ${definition.domainSize <= 40000 ? "exhaustive" : "sampled"} uniqueness, membership, independent numeric oracle`, () => {
      const parameterKeys = new Set<string>();
      const promptKeys = new Set<string>();
      for (const index of indices(definition.domainSize)) {
        const problem = definition.problemAt(index);
        const key = JSON.stringify(problem.parameters);
        const prompt = JSON.stringify(problem.prompt);
        expect(parameterKeys.has(key)).toBe(false);
        expect(promptKeys.has(prompt)).toBe(false);
        parameterKeys.add(key);
        promptKeys.add(prompt);
        expect(definition.verify(problem)).toBe(true);
        assertPromptParameters(definition, problem);
        assertOracle(problem);
      }
    }, 30000);

    it(`${definition.id}: deterministic boundaries, independent verifier, tamper rejection`, () => {
      for (const bad of [
        -1,
        definition.domainSize,
        definition.domainSize + 1,
        0.5,
        NaN,
        Infinity,
        -Infinity,
        Number.MAX_SAFE_INTEGER,
      ]) {
        expect(() => definition.problemAt(bad)).toThrow(RangeError);
      }
      const saved = definition.problemAt(definition.domainSize - 1);
      expect(definition.problemAt(definition.domainSize - 1)).toEqual(saved);
      const detached = {
        ...definition,
        problemAt: () => {
          throw new Error("Verifier invoked generator");
        },
      };
      expect(detached.verify(saved)).toBe(true);
      const mutations: ((p: ArithmeticV2Candidate) => void)[] = [
        (p) => {
          p.parameters[0] = -1;
        },
        (p) => {
          p.parameters[0] += 0.5;
        },
        (p) => {
          p.parameters[0] = Number.MAX_SAFE_INTEGER;
        },
        (p) => {
          p.parameters.push(1);
        },
        (p) => {
          p.parameters = definition.problemAt(0).parameters;
        },
        (p) => {
          p.answer.exact[0] = String(Number(p.answer.exact[0]) + 1);
        },
        (p) => {
          p.answer.exact[0] = `0${p.answer.exact[0]}`;
        },
        (p) => {
          p.answer.exact.push("0");
        },
        (p) => {
          p.answer.kind = "surd";
        },
        (p) => {
          p.answer.text += " = 0";
        },
        (p) => {
          p.answer.latex += " + 0";
        },
        (p) => {
          p.prompt.instruction = "tampered";
        },
        (p) => {
          if (p.prompt.layout === "math") p.prompt.text += " + 1";
          else p.prompt.left++;
        },
        (p) => {
          if (p.prompt.layout === "math") p.prompt.latex += " + 1";
          else p.prompt.right++;
        },
      ];
      for (const mutate of mutations) {
        const changed = clone(saved);
        mutate(changed);
        expect(definition.verify(changed)).toBe(false);
      }
      for (const bad of [
        null,
        {},
        { ...saved, parameters: null },
        { ...saved, answer: null },
        { ...saved, prompt: null },
        { ...saved, answer: { ...saved.answer, exact: [null] } },
      ]) {
        expect(definition.verify(bad as ArithmeticV2Candidate)).toBe(false);
      }
    });
  }

  it("has no generator/rank/calculation calls in the shared verification path", () => {
    const source = readFileSync(
      resolve("src/lib/arithmetic-v2/families/elementary/common.ts"),
      "utf8",
    );
    const verify = source.slice(
      source.indexOf("verify(candidate)"),
      source.indexOf("/** Check a claimed reduced rational"),
    );
    expect(verify).not.toMatch(/\b(?:problemAt|calculate)\s*\(/);
    expect(verify).not.toMatch(/domain\.at\s*\(/);
  });
});

function manually(
  definition: ArithmeticV2Definition,
  parameters: number[],
  text: string,
  latex: string,
  kind: ArithmeticV2Candidate["answer"]["kind"],
  exact: string[],
  answerText: string,
  answerLatex = answerText,
) {
  const instruction = definition.problemAt(0).prompt.instruction;
  const candidate: ArithmeticV2Candidate = {
    parameters,
    prompt: {
      layout: "math",
      text,
      latex,
      ...(instruction ? { instruction } : {}),
    },
    answer: { kind, exact, text: answerText, latex: answerLatex },
  };
  expect(definition.verify(candidate)).toBe(true);
  assertOracle(candidate);
  return candidate;
}

describe("elementary arithmetic hand calculations and domain counts", () => {
  it("counts natural product/triangular domains exactly", () => {
    const expected = {
      "g3-add-3digit": 810000,
      "g3-sub-3digit": 405450,
      "g3-mul-3x1": 8100,
      "g3-mul-2x2": 8100,
      "g3-div-2x1-remainder": 810,
      "g3-div-3x1-remainder": 8100,
      "g4-mul-3x2": 81000,
      "g4-div-2x2-remainder": 4095,
      "g4-div-3x2-remainder": 81000,
      "g5-natural-mixed": 80550,
    };
    for (const [id, size] of Object.entries(expected))
      expect(def(id).domainSize).toBe(size);
  });

  it("counts all fraction domains from an independent full operand enumeration", () => {
    const reduced = (n: number, d: number) => {
      for (let k = 2; k <= d; k++) if (n % k === 0 && d % k === 0) return false;
      return true;
    };
    for (const same of [true, false])
      for (const mixed of [true, false])
        for (const subtract of [true, false]) {
          let count = 0;
          for (let d = 2; d <= 12; d++)
            for (let e = 2; e <= 12; e++) {
              if (same !== (d === e)) continue;
              for (let n = mixed ? d + 1 : 1; n < (mixed ? 4 * d : d); n++) {
                if (n % d === 0 || (!same && !reduced(n, d))) continue;
                for (let m = mixed ? e + 1 : 1; m < (mixed ? 4 * e : e); m++) {
                  if (m % e === 0 || (!same && !reduced(m, e))) continue;
                  if (!subtract || n * e >= m * d) count++;
                }
              }
            }
          expect(
            def(
              `g${same ? 4 : 5}-${mixed ? "mixed" : "fraction"}-${same ? "same" : "unlike"}-${subtract ? "sub" : "add"}`,
            ).domainSize,
          ).toBe(count);
        }
    expect(def("g5-fraction-mul").domainSize).toBe(180 * 180);
    expect(def("g6-fraction-div").domainSize).toBe(180 * 180);
    expect(def("g5-fraction-mul-natural").domainSize).toBe(180 * 9);
    expect(def("g6-fraction-div-natural").domainSize).toBe(180 * 9);
  });

  it("counts exact finite decimal divisions by independent rational reduction", () => {
    for (const natural of [false, true]) {
      let count = 0;
      for (let a = 1; a <= 999; a++)
        for (let b = 1; b <= (natural ? 9 : 999); b++) {
          if (a % 100 === 0 || (!natural && b % 100 === 0)) continue;
          let denominator = natural ? b * 100 : b;
          let numerator = a;
          let x = numerator;
          let y = denominator;
          while (y) [x, y] = [y, x % y];
          numerator /= x;
          denominator /= x;
          let twos = 0;
          let fives = 0;
          while (denominator % 2 === 0) {
            denominator /= 2;
            twos++;
          }
          while (denominator % 5 === 0) {
            denominator /= 5;
            fives++;
          }
          if (denominator === 1 && Math.max(twos, fives) <= 3) count++;
        }
      expect(def(`g6-decimal-div${natural ? "-natural" : ""}`).domainSize).toBe(
        count,
      );
    }
    expect(def("g4-decimal-add").domainSize).toBe(9900 ** 2);
    expect(def("g4-decimal-sub").domainSize).toBe((9900 * 9901) / 2);
    expect(def("g5-decimal-mul").domainSize).toBe(990 ** 2);
  });

  it("counts the 2026-10-16 expansion domains by independent brute-force enumeration", () => {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const tens = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const hundreds = tens.map((n) => n * 10);
    // Track B (natural): screened pairs only — no 0, no ×1/÷1, no a÷a, quotient ≥ 2.
    let timesTable = 0;
    for (let a = 1; a <= 99; a++)
      for (let b = 2; b <= 9; b++)
        if (a % b === 0 && a / b >= 2 && a / b <= 9) timesTable++;
    expect(def("g3-div-times-table").domainSize).toBe(timesTable);
    expect(def("g3-mul-tens-by-one").domainSize).toBe(tens.length * 8);
    expect(def("g3-mul-tens-by-tens").domainSize).toBe(tens.length ** 2);
    let twoDigitNotTens = 0;
    for (let a = 11; a <= 99; a++) if (a % 10 !== 0) twoDigitNotTens++;
    expect(def("g3-mul-2digit-by-tens").domainSize).toBe(
      twoDigitNotTens * tens.length,
    );
    let exactTwoDigit = 0;
    for (let a = 10; a <= 99; a++)
      for (let b = 2; b <= 9; b++)
        if (a % b === 0 && a / b >= 10) exactTwoDigit++;
    expect(def("g3-div-2x1-exact").domainSize).toBe(exactTwoDigit);
    expect(def("g4-mul-hundreds-by-tens").domainSize).toBe(
      hundreds.length * tens.length,
    );
    let threeDigitNotHundreds = 0;
    for (let a = 101; a <= 999; a++) if (a % 100 !== 0) threeDigitNotHundreds++;
    expect(def("g4-mul-3digit-by-tens").domainSize).toBe(
      threeDigitNotHundreds * tens.length,
    );
    let byTens = 0;
    for (const b of tens.slice(1)) for (let a = b + 1; a <= 999; a++) byTens++;
    expect(def("g4-div-by-tens-remainder").domainSize).toBe(byTens);

    // Track C (fraction): reduced proper fractions with denominators 2~12.
    const proper: [number, number][] = [];
    for (let d = 2; d <= 12; d++)
      for (let n = 1; n < d; n++) if (gcd(n, d) === 1) proper.push([n, d]);
    const mixedCount = proper.length * 3; // whole parts 1~3
    expect(def("g5-fraction-mul-proper").domainSize).toBe(
      proper.length * (proper.length - 1),
    );
    expect(def("g5-natural-mul-fraction").domainSize).toBe(
      8 * (proper.length + mixedCount),
    );
    expect(def("g5-fraction-mul-three").domainSize).toBe(
      proper.length * (proper.length - 1) * (proper.length - 2),
    );
    let threeTerms = 0;
    const signs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (const [s1, s2] of signs)
      for (const [n, d] of proper)
        for (const [m, e] of proper)
          for (const [o, f] of proper) {
            if (d === e || e === f || d === f) continue;
            const common = (d * e) / gcd(d, e);
            const all = (common * f) / gcd(common, f);
            if (all > 60) continue;
            const partial = (n * all) / d + s1 * ((m * all) / e);
            const total = partial + s2 * ((o * all) / f);
            if (partial >= 0 && total >= 0) threeTerms++;
          }
    expect(def("g5-fraction-three-terms").domainSize).toBe(threeTerms);

    // Track C (decimal): hundredths with a nonzero fractional part are 990 values.
    let nonWhole = 0;
    for (let h = 1; h <= 999; h++) if (h % 100 !== 0) nonWhole++;
    expect(def("g5-natural-mul-decimal").domainSize).toBe(8 * nonWhole);
    let shifts = 0;
    for (let h = 1; h <= 999; h++) {
      if (h % 100 === 0) continue;
      for (const factor of [10, 1, 1000, 10000, 100000])
        if (factor !== h) shifts++;
    }
    for (let a = 2; a <= 999; a++) shifts += 2;
    expect(def("g5-decimal-point-shift").domainSize).toBe(shifts);
    let quotients = 0;
    for (let b = 2; b <= 99; b++)
      for (let a = 1; a <= 99; a++)
        if (a % b !== 0 && (1000 * a) % b === 0) quotients++;
    expect(def("g6-natural-div-natural-decimal").domainSize).toBe(quotients);
  });

  it("checks every triangular row boundary without allocating the large domain", () => {
    for (let row = 0; row < 9900; row++) {
      const start = (row * (row + 1)) / 2;
      for (const index of [start, start + row]) {
        const candidate = def("g4-decimal-sub").problemAt(index);
        expect(candidate.parameters[0]).toBe(row + 1 + Math.floor(row / 99));
        expect(candidate.parameters[1]).toBe(
          index === start ? 1 : candidate.parameters[0],
        );
        expect(def("g4-decimal-sub").verify(candidate)).toBe(true);
      }
    }
    for (let row = 0; row < 900; row++) {
      const start = (row * (row + 1)) / 2;
      expect(def("g3-sub-3digit").problemAt(start).parameters).toEqual([
        100 + row,
        100,
      ]);
      expect(def("g3-sub-3digit").problemAt(start + row).parameters).toEqual([
        100 + row,
        100 + row,
      ]);
    }
  });

  it("covers carrying, repeated borrowing, quotient zero digits and nonzero remainders", () => {
    const addition = def("g3-add-3digit").problemAt(810000 - 1);
    expect(addition.answer.exact).toEqual(["1998"]);
    const sub = def("g3-sub-3digit");
    const row = 407 - 100;
    expect(
      sub.problemAt((row * (row + 1)) / 2 + 168 - 100).answer.exact,
    ).toEqual(["239"]);
    manually(
      def("g3-div-3x1-remainder"),
      [808, 8],
      "808 ÷ 8",
      "808 \\div 8",
      "remainder",
      ["101", "0"],
      "몫 101, 나머지 0",
      "\\text{몫 }101,\\;\\text{나머지 }0",
    );
    manually(
      def("g4-div-3x2-remainder"),
      [745, 23],
      "745 ÷ 23",
      "745 \\div 23",
      "remainder",
      ["32", "9"],
      "몫 32, 나머지 9",
      "\\text{몫 }32,\\;\\text{나머지 }9",
    );
  });

  it("checks like/unlike fractions, mixed-number borrowing, cancellation, and division", () => {
    manually(
      def("g4-fraction-same-add"),
      [3, 4, 3, 4],
      "3/4 + 3/4",
      "\\frac{3}{4} + \\frac{3}{4}",
      "rational",
      ["3", "2"],
      "1 1/2",
      "1\\frac{1}{2}",
    );
    manually(
      def("g4-mixed-same-sub"),
      [17, 8, 15, 8],
      "2 1/8 - 1 7/8",
      "2\\frac{1}{8} - 1\\frac{7}{8}",
      "rational",
      ["1", "4"],
      "1/4",
      "\\frac{1}{4}",
    );
    manually(
      def("g5-fraction-unlike-add"),
      [3, 4, 2, 3],
      "3/4 + 2/3",
      "\\frac{3}{4} + \\frac{2}{3}",
      "rational",
      ["17", "12"],
      "1 5/12",
      "1\\frac{5}{12}",
    );
    manually(
      def("g5-mixed-unlike-sub"),
      [13, 6, 7, 4],
      "2 1/6 - 1 3/4",
      "2\\frac{1}{6} - 1\\frac{3}{4}",
      "rational",
      ["5", "12"],
      "5/12",
      "\\frac{5}{12}",
    );
    manually(
      def("g5-fraction-mul"),
      [3, 2, 2, 3],
      "1 1/2 × 2/3",
      "1\\frac{1}{2} \\times \\frac{2}{3}",
      "rational",
      ["1", "1"],
      "1",
    );
    manually(
      def("g6-fraction-div"),
      [3, 4, 2, 5],
      "3/4 ÷ 2/5",
      "\\frac{3}{4} \\div \\frac{2}{5}",
      "rational",
      ["15", "8"],
      "1 7/8",
      "1\\frac{7}{8}",
    );
  });

  it("uses exact integer-scale arithmetic and normalizes zero and trailing zeroes", () => {
    manually(
      def("g4-decimal-sub"),
      [205, 78],
      "2.05 - 0.78",
      "2.05 - 0.78",
      "decimal",
      ["127", "2"],
      "1.27",
    );
    manually(
      def("g4-decimal-sub"),
      [205, 205],
      "2.05 - 2.05",
      "2.05 - 2.05",
      "decimal",
      ["0", "0"],
      "0",
    );
    manually(
      def("g5-decimal-mul"),
      [120, 35],
      "1.2 × 0.35",
      "1.2 \\times 0.35",
      "decimal",
      ["42", "2"],
      "0.42",
    );
    manually(
      def("g6-decimal-div"),
      [126, 30],
      "1.26 ÷ 0.3",
      "1.26 \\div 0.3",
      "decimal",
      ["42", "1"],
      "4.2",
    );
    manually(
      def("g6-decimal-div-natural"),
      [1, 2],
      "0.01 ÷ 2",
      "0.01 \\div 2",
      "decimal",
      ["5", "3"],
      "0.005",
    );
  });

  it("rejects mathematically valid but out-of-domain parameters and noncanonical answers", () => {
    const test = (
      id: string,
      parameters: number[],
      text: string,
      latex: string,
      exact: string[],
      answerText: string,
    ) => {
      const candidate = def(id).problemAt(0);
      candidate.parameters = parameters;
      candidate.prompt = { ...candidate.prompt, layout: "math", text, latex };
      candidate.answer = {
        kind: id.includes("decimal") ? "decimal" : "rational",
        exact,
        text: answerText,
        latex: answerText,
      };
      expect(def(id).verify(candidate)).toBe(false);
    };
    test(
      "g5-fraction-unlike-add",
      [1, 2, 2, 4],
      "1/2 + 2/4",
      "\\frac{1}{2} + \\frac{2}{4}",
      ["1", "1"],
      "1",
    );
    test(
      "g4-fraction-same-add",
      [1, 13, 12, 13],
      "1/13 + 12/13",
      "\\frac{1}{13} + \\frac{12}{13}",
      ["1", "1"],
      "1",
    );
    test(
      "g6-decimal-div-natural",
      [1, 8],
      "0.01 ÷ 8",
      "0.01 \\div 8",
      ["125", "5"],
      "0.00125",
    );
    test(
      "g6-decimal-div",
      [1, 3],
      "0.01 ÷ 0.03",
      "0.01 \\div 0.03",
      ["333", "3"],
      "0.333",
    );
    test("g4-decimal-add", [100, 200], "1 + 2", "1 + 2", ["3", "0"], "3");
    const equalFraction = def("g4-fraction-same-sub").problemAt(0);
    equalFraction.answer.exact = ["0", "2"];
    expect(def("g4-fraction-same-sub").verify(equalFraction)).toBe(false);
    const equalDecimal = def("g4-decimal-sub").problemAt(0);
    equalDecimal.answer.exact = ["0", "1"];
    expect(def("g4-decimal-sub").verify(equalDecimal)).toBe(false);
  });

  it("respects precedence and parentheses and accepts only integral intermediate division", () => {
    manually(
      def("g5-natural-mixed"),
      [0, 7, 3, 4],
      "7 + 3 × 4",
      "7 + 3 \\times 4",
      "integer",
      ["19"],
      "19",
    );
    manually(
      def("g5-natural-mixed"),
      [1, 7, 3, 4],
      "(7 + 3) × 4",
      "(7 + 3) \\times 4",
      "integer",
      ["40"],
      "40",
    );
    manually(
      def("g5-natural-mixed"),
      [2, 24, 6, 7],
      "24 ÷ 6 + 7",
      "24 \\div 6 + 7",
      "integer",
      ["11"],
      "11",
    );
    manually(
      def("g5-natural-mixed"),
      [3, 10, 7, 6],
      "(10 - 7) × 6",
      "(10 - 7) \\times 6",
      "integer",
      ["18"],
      "18",
    );
    const bad = def("g5-natural-mixed").problemAt(0);
    bad.parameters = [2, 25, 6, 7];
    expect(def("g5-natural-mixed").verify(bad)).toBe(false);
  });
});
