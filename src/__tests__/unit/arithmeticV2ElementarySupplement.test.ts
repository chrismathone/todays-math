// @vitest-environment node
import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { ELEMENTARY_SUPPLEMENT_DEFINITIONS as definitions } from "../../lib/arithmetic-v2/families/elementary/supplement";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
} from "../../lib/arithmetic-v2/types";

type Rational = [bigint, bigint];
const B = BigInt;
const get = (suffix: string) => {
  const found = definitions.find((d) => d.id === `elem-${suffix}`);
  assert(found, suffix);
  return found;
};
const copy = (p: ArithmeticV2Candidate) => structuredClone(p);
const key = (p: number[]) => p.join(",");
const display = (p: ArithmeticV2Candidate) =>
  p.prompt.layout === "math"
    ? p.prompt.text
    : `${p.prompt.left} ${p.prompt.operator} ${p.prompt.right}`;

// Test-only arithmetic: no production helper, solver, domain, or formatter.
function reduce(n: bigint, d: bigint): Rational {
  let a = n,
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
function evaluate(source: string): Rational {
  const tokens = source.match(
    /\d+ \d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[()+\-×÷]/g,
  )!;
  assert.equal(tokens.join("").replaceAll(" ", ""), source.replaceAll(" ", ""));
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
    if (tokens[cursor] !== "(") return literal(tokens[cursor++]);
    cursor++;
    const value = add();
    assert.equal(tokens[cursor++], ")");
    return value;
  };
  const multiply = (): Rational => {
    let result = atom();
    while (tokens[cursor] === "×" || tokens[cursor] === "÷") {
      const op = tokens[cursor++];
      result = apply(result, atom(), op);
    }
    return result;
  };
  const add = (): Rational => {
    let result = multiply();
    while (tokens[cursor] === "+" || tokens[cursor] === "-") {
      const op = tokens[cursor++];
      result = apply(result, multiply(), op);
    }
    return result;
  };
  const result = add();
  assert.equal(cursor, tokens.length);
  assert(result[0] >= B(0) && result[1] > B(0));
  return reduce(...result);
}
function fractionText(n: number, d: number, latex = false): string {
  const whole = Math.floor(n / d),
    part = n % d;
  if (!part) return String(whole);
  return latex
    ? `${whole || ""}\\frac{${part}}{${d}}`
    : `${whole ? `${whole} ` : ""}${part}/${d}`;
}
function decimalText(coefficient: number): string {
  const padded = String(coefficient).padStart(3, "0");
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}
function assertAnswer(candidate: ArithmeticV2Candidate) {
  const { answer } = candidate;
  const [n, d] = evaluate(display(candidate));
  if (answer.kind === "remainder") {
    const [a, b] = candidate.parameters.map(B);
    assert.deepEqual(answer.exact, [String(a / b), String(a % b)]);
    assert.equal(answer.text, `몫 ${a / b}, 나머지 ${a % b}`);
    assert.equal(
      answer.latex,
      `\\text{몫 }${a / b},\\;\\text{나머지 }${a % b}`,
    );
    return;
  }
  if (answer.kind === "integer") {
    assert.equal(d, B(1));
    assert.deepEqual(answer.exact, [String(n)]);
    assert.equal(answer.text, String(n));
    assert.equal(answer.latex, String(n));
    return;
  }
  if (answer.kind === "rational") {
    assert.deepEqual(answer.exact, [String(n), String(d)]);
    assert.equal(answer.text, fractionText(Number(n), Number(d)));
    assert.equal(answer.latex, fractionText(Number(n), Number(d), true));
    return;
  }
  assert.equal(answer.kind, "decimal");
  // Repeated long division independently finds the minimal exact decimal scale.
  let remainder = n % d;
  let text = String(n / d),
    scale = 0;
  if (remainder !== B(0)) text += ".";
  while (remainder !== B(0)) {
    assert(scale < 3);
    remainder *= B(10);
    text += String(remainder / d);
    remainder %= d;
    scale++;
  }
  assert.deepEqual(answer.exact, [
    String(B(text.replace(".", ""))),
    String(scale),
  ]);
  assert.equal(answer.text, text);
  assert.equal(answer.latex, text);
}

// Independent finite specification. Enumerate raw operand ranges and filter;
// deliberately do not reuse production row counts or mixed-radix unranking.
const proper: number[][] = [];
for (let d = 2; d <= 12; d++) {
  for (let n = 1; n < d; n++) {
    let coprime = true;
    for (let divisor = 2; divisor <= n; divisor++)
      if (n % divisor === 0 && d % divisor === 0) coprime = false;
    if (coprime) proper.push([n, d]);
  }
}
const mixed = [1, 2, 3].flatMap((w) => proper.map(([n, d]) => [w * d + n, d]));
function atMostThreePlaces(numerator: number, denominator: number) {
  const [, d] = reduce(B(numerator), B(denominator));
  let rest = d,
    twos = 0,
    fives = 0;
  while (rest % B(2) === B(0)) {
    rest /= B(2);
    twos++;
  }
  while (rest % B(5) === B(0)) {
    rest /= B(5);
    fives++;
  }
  return rest === B(1) && Math.max(twos, fives) <= 3;
}
function* expectedDomain(id: string): Generator<number[]> {
  if (/g[23]-(add|sub)-/.test(id)) {
    const three = id.includes("g3");
    for (let a = three ? 100 : 10; a <= (three ? 999 : 99); a++)
      for (let b = 0; b <= (three ? 99 : 9); b++) yield [a, b];
  } else if (id.endsWith("mul-zero")) {
    for (let a = 0; a <= 99; a++) yield [a, 0];
  } else if (id.endsWith("div-small-remainder")) {
    for (let a = 0; a <= 9; a++) for (let b = 1; b <= 9; b++) yield [a, b];
  } else if (id.endsWith("decimal-mul-natural")) {
    for (let a = 1; a <= 999; a++)
      if (a % 100 !== 0) for (let b = 1; b <= 9; b++) yield [a, b];
  } else if (id.endsWith("natural-sub-decimal")) {
    for (let a = 1; a <= 99; a++)
      for (let b = 1; b < 100 * a; b++) if (b % 100 !== 0) yield [a, b];
  } else if (id.endsWith("natural-add-decimal")) {
    for (let a = 1; a <= 99; a++)
      for (let b = 1; b <= 9999; b++) if (b % 100 !== 0) yield [a, b];
  } else if (id.endsWith("decimal-sub-natural")) {
    for (let a = 1; a <= 9999; a++)
      if (a % 100 !== 0)
        for (let b = 1; b <= 99; b++) if (a > 100 * b) yield [a, b];
  } else if (id.endsWith("natural-div-decimal")) {
    for (let a = 1; a <= 99; a++)
      for (let b = 1; b <= 999; b++)
        if (b % 100 !== 0 && atMostThreePlaces(100 * a, b)) yield [a, b];
  } else if (id.endsWith("fraction-quotient")) {
    for (let a = 1; a <= 99; a++)
      for (let b = 2; b <= 12; b++) if (a % b !== 0) yield [a, b];
  } else if (
    id.endsWith("natural-div-fraction") ||
    id.endsWith("natural-sub-fraction") ||
    id.endsWith("natural-add-fraction")
  ) {
    for (let a = 1; a <= 9; a++)
      for (const [n, d] of [...proper, ...mixed])
        if (!id.endsWith("sub-fraction") || a * d > n) yield [a, 1, n, d];
  } else if (
    id.endsWith("mixed-add-proper") ||
    id.endsWith("mixed-sub-proper")
  ) {
    for (const a of mixed) for (const b of proper) yield [...a, ...b];
  } else if (id.endsWith("natural-mixed-order")) {
    for (let a = 1; a <= 100; a++)
      for (let b = 1; b <= 12; b++)
        for (let c = b; c <= 12; c++) if (a - b * c >= 0) yield [0, a, b, c];
    for (let a = 1; a <= 108; a++)
      for (let b = 2; b <= 9; b++)
        if (a % b === 0 && a / b <= 12)
          for (let c = 2; c <= 12; c++) yield [1, a, b, c];
    for (let a = 1; a <= 100; a++)
      for (let b = 1; b <= a; b++)
        for (let c = 1; c <= 20; c++) yield [2, a, b, c];
    for (let a = 1; a <= 100; a++)
      for (let b = 1; b <= a; b++)
        for (let c = 2; c <= 12; c++) if ((a + b) % c === 0) yield [3, a, b, c];
  } else assert.fail(`Missing independent specification: ${id}`);
}

function assertPrompt(id: string, candidate: ArithmeticV2Candidate) {
  const { parameters: p, prompt } = candidate;
  if (/g[23]-(add|sub)-/.test(id) || id.endsWith("mul-zero")) {
    assert.deepEqual(prompt, {
      layout: "vertical",
      operator: id.includes("-add-") ? "+" : id.includes("-sub-") ? "-" : "×",
      left: p[0],
      right: p[1],
    });
    return;
  }
  let text: string, latex: string, instruction: string | undefined;
  if (id.endsWith("natural-mixed-order")) {
    const [mode, a, b, c] = p;
    text = [
      `${a} - ${b} × ${c}`,
      `${a} ÷ ${b} × ${c}`,
      `${a} - ${b} + ${c}`,
      `(${a} + ${b}) ÷ ${c}`,
    ][mode];
    latex = text.replaceAll("×", "\\times").replaceAll("÷", "\\div");
  } else if (
    id.endsWith("div-small-remainder") ||
    id.endsWith("fraction-quotient")
  ) {
    text = `${p[0]} ÷ ${p[1]}`;
    latex = `${p[0]} \\div ${p[1]}`;
    instruction = id.endsWith("remainder")
      ? "몫과 나머지를 구하세요."
      : "몫을 기약분수로 나타내세요. 가분수는 대분수로 나타내세요.";
  } else if (id.includes("decimal")) {
    const mul = id.endsWith("decimal-mul-natural");
    const decimalLeft = mul || id.endsWith("decimal-sub-natural");
    const op = mul
      ? "×"
      : id.includes("-sub-")
        ? "-"
        : id.includes("-add-")
          ? "+"
          : "÷";
    const a = decimalLeft ? decimalText(p[0]) : String(p[0]);
    const b = decimalLeft ? String(p[1]) : decimalText(p[1]);
    text = `${a} ${op} ${b}`;
    latex = `${a} ${op === "×" ? "\\times" : op === "÷" ? "\\div" : op} ${b}`;
  } else {
    const [n, d, m, e] = p;
    const op = id.includes("-div-") ? "÷" : id.includes("-sub-") ? "-" : "+";
    text = `${fractionText(n, d)} ${op} ${fractionText(m, e)}`;
    latex = `${fractionText(n, d, true)} ${op === "÷" ? "\\div" : op} ${fractionText(m, e, true)}`;
    instruction = "계산하고 약분하세요. 가분수는 대분수로 나타내세요.";
  }
  assert.deepEqual(prompt, {
    layout: "math",
    text,
    latex,
    ...(instruction ? { instruction } : {}),
  });
}

function indexes(size: number): number[] {
  if (size <= 40000) return Array.from({ length: size }, (_, i) => i);
  const result = new Set([0, 1, size - 2, size - 1]);
  let seed = 20261014;
  for (let i = 0; i < 2048; i++) {
    result.add(Math.floor((i * (size - 1)) / 2047));
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    result.add(seed % size);
  }
  return [...result].sort((a, b) => a - b);
}

describe("elementary arithmetic supplement", () => {
  it("exports 18 distinct, finite append-only family IDs", () => {
    expect(definitions).toHaveLength(18);
    expect(new Set(definitions.map((d) => d.id)).size).toBe(18);
    for (const definition of definitions) {
      expect(definition.id).toMatch(/^elem-g[2-6]-[a-z0-9-]+$/);
      expect(Number.isSafeInteger(definition.domainSize)).toBe(true);
      expect(definition.domainSize).toBeGreaterThan(0);
      expect(definition.rankGroup).toMatch(/^elementary-/);
    }
  });

  for (const definition of definitions) {
    it(`${definition.id}: exact count, membership, unique prompts and independent arithmetic`, () => {
      const chosen = indexes(definition.domainSize);
      const parameters = new Set<string>(),
        prompts = new Set<string>();
      for (const index of chosen) {
        const candidate = definition.problemAt(index);
        const parameterKey = key(candidate.parameters);
        assert(
          !parameters.has(parameterKey),
          `Duplicate parameters at ${index}`,
        );
        assert(
          !prompts.has(JSON.stringify(candidate.prompt)),
          `Duplicate prompt at ${index}`,
        );
        parameters.add(parameterKey);
        prompts.add(JSON.stringify(candidate.prompt));
        assertPrompt(definition.id, candidate);
        assertAnswer(candidate);
        assert(definition.verify(candidate), `Verification failed at ${index}`);
      }
      let count = 0;
      for (const p of expectedDomain(definition.id)) {
        parameters.delete(key(p));
        count++;
      }
      assert.equal(count, definition.domainSize);
      assert.equal(
        parameters.size,
        0,
        "Generated parameters outside independently enumerated domain",
      );
      assert.deepEqual(definition.problemAt(0), definition.problemAt(0));
      assert.deepEqual(
        definition.problemAt(definition.domainSize - 1),
        definition.problemAt(definition.domainSize - 1),
      );
    });

    it(`${definition.id}: boundaries, malformed candidates and tampering`, () => {
      for (const index of [
        -1,
        0.5,
        NaN,
        Infinity,
        -Infinity,
        definition.domainSize,
        Number.MAX_SAFE_INTEGER,
      ])
        expect(() => definition.problemAt(index)).toThrow(RangeError);
      const original = definition.problemAt(
        Math.floor(definition.domainSize / 2),
      );
      const bad: unknown[] = [
        null,
        {},
        { ...original, parameters: null },
        { ...original, answer: null },
      ];
      const mutate = (change: (candidate: ArithmeticV2Candidate) => void) => {
        const candidate = copy(original);
        change(candidate);
        bad.push(candidate);
      };
      for (const n of [NaN, Infinity, 0.5, -1, Number.MAX_SAFE_INTEGER])
        mutate((c) => {
          c.parameters[0] = n;
        });
      mutate((c) => {
        c.parameters.push(0);
      });
      mutate((c) => {
        c.parameters = definition.problemAt(0).parameters;
      });
      mutate((c) => {
        c.answer.text += "0";
      });
      mutate((c) => {
        c.answer.latex += "0";
      });
      mutate((c) => {
        c.answer.kind = "surd";
      });
      mutate((c) => {
        c.answer.exact[0] = String(Number(c.answer.exact[0]) + 1);
      });
      for (const value of ["-1", "01", "1.5", "1e3", "9999999999999", "NaN"])
        mutate((c) => {
          c.answer.exact[0] = value;
        });
      mutate((c) => {
        c.answer.exact.push("0");
      });
      mutate((c) => {
        c.answer.exact = [null] as unknown as string[];
      });
      mutate((c) => {
        c.prompt.instruction = "changed";
      });
      mutate((c) => {
        Object.assign(c.prompt, { unexpected: true });
      });
      mutate((c) => {
        if (c.prompt.layout === "math") c.prompt.text += " + 1";
        else c.prompt.right++;
      });
      mutate((c) => {
        if (c.prompt.layout === "math") c.prompt.latex += " + 1";
        else c.prompt.operator = c.prompt.operator === "+" ? "-" : "+";
      });
      for (const candidate of bad)
        assert.equal(
          definition.verify(candidate as ArithmeticV2Candidate),
          false,
        );
      // Verifying never needs the index generator, even after it becomes unavailable.
      const verifierOnly = {
        ...definition,
        problemAt: () => {
          throw new Error("generator forbidden");
        },
      };
      expect(verifierOnly.verify(original)).toBe(true);
    });
  }

  const examples: [string, number[], string, string][] = [
    ["g2-sub-2x1", [13, 7], "13 - 7", "6"],
    ["g2-add-2x1", [27, 5], "27 + 5", "32"],
    ["g3-sub-3x-short", [305, 27], "305 - 27", "278"],
    ["g3-add-3x-short", [999, 99], "999 + 99", "1098"],
    ["g2-mul-zero", [8, 0], "8 × 0", "0"],
    ["g2-mul-zero", [0, 0], "0 × 0", "0"],
    ["g3-div-small-remainder", [8, 2], "8 ÷ 2", "몫 4, 나머지 0"],
    ["g3-div-small-remainder", [0, 2], "0 ÷ 2", "몫 0, 나머지 0"],
    ["g3-div-small-remainder", [3, 8], "3 ÷ 8", "몫 0, 나머지 3"],
    ["g5-decimal-mul-natural", [240, 3], "2.4 × 3", "7.2"],
    ["g6-natural-div-decimal", [3, 60], "3 ÷ 0.6", "5"],
    ["g6-natural-div-decimal", [1, 160], "1 ÷ 1.6", "0.625"],
    ["g4-natural-sub-decimal", [3, 40], "3 - 0.4", "2.6"],
    ["g6-natural-div-fraction", [3, 1, 1, 2], "3 ÷ 1/2", "6"],
    ["g5-natural-sub-fraction", [2, 1, 3, 5], "2 - 3/5", "1 2/5"],
    ["g5-mixed-add-proper", [7, 3, 1, 6], "2 1/3 + 1/6", "2 1/2"],
    ["g4-natural-add-decimal", [3, 40], "3 + 0.4", "3.4"],
    ["g4-decimal-sub-natural", [340, 2], "3.4 - 2", "1.4"],
    ["g5-natural-add-fraction", [2, 1, 3, 5], "2 + 3/5", "2 3/5"],
    ["g5-mixed-sub-proper", [7, 3, 1, 6], "2 1/3 - 1/6", "2 1/6"],
    ["g5-mixed-sub-proper", [4, 3, 2, 3], "1 1/3 - 2/3", "2/3"],
    ["g6-natural-div-fraction-quotient", [3, 4], "3 ÷ 4", "3/4"],
    ["g6-natural-div-fraction-quotient", [11, 4], "11 ÷ 4", "2 3/4"],
    ["g5-natural-mixed-order", [0, 20, 3, 4], "20 - 3 × 4", "8"],
    ["g5-natural-mixed-order", [1, 24, 3, 2], "24 ÷ 3 × 2", "16"],
    ["g5-natural-mixed-order", [2, 8, 3, 2], "8 - 3 + 2", "7"],
    ["g5-natural-mixed-order", [3, 8, 4, 3], "(8 + 4) ÷ 3", "4"],
  ];
  for (const [id, parameters, prompt, answer] of examples) {
    it(`contains ${prompt} = ${answer}`, () => {
      const definition = get(id);
      let found: ArithmeticV2Candidate | undefined;
      for (let i = 0; i < definition.domainSize; i++) {
        const candidate = definition.problemAt(i);
        if (key(candidate.parameters) === key(parameters)) {
          found = candidate;
          break;
        }
      }
      assert(found, `Missing ${prompt}`);
      expect(display(found)).toBe(prompt);
      expect(found.answer.text).toBe(answer);
      assertAnswer(found);
      expect(definition.verify(found)).toBe(true);
    });
  }

  it("checks every large subtraction row boundary", () => {
    const decimal = get("g4-natural-sub-decimal");
    let index = 0;
    for (let a = 1; a <= 99; a++) {
      for (const [i, expected] of [
        [index, [a, 1]],
        [index + 99 * a - 1, [a, 100 * a - 1]],
      ] as const) {
        const candidate = decimal.problemAt(i);
        expect(candidate.parameters).toEqual(expected);
        assertAnswer(candidate);
        assert(decimal.verify(candidate));
      }
      index += 99 * a;
    }
    const natural = get("g3-sub-3x-short");
    for (let a = 100; a <= 999; a++) {
      for (const b of [0, 99]) {
        const candidate = natural.problemAt((a - 100) * 100 + b);
        assert.deepEqual(candidate.parameters, [a, b]);
        assertAnswer(candidate);
        assert(natural.verify(candidate));
      }
    }
  });

  it("rejects excluded operands even with plausible exact answers and prompts", () => {
    const fake = (
      id: string,
      parameters: number[],
      prompt: string,
      answer: ArithmeticV2Answer,
    ) => {
      const definition = get(id);
      const candidate = definition.problemAt(0);
      candidate.parameters = parameters;
      candidate.prompt = {
        ...candidate.prompt,
        layout: "math",
        text: prompt,
        latex: prompt.replaceAll("×", "\\times").replaceAll("÷", "\\div"),
      };
      candidate.answer = answer;
      expect(definition.verify(candidate)).toBe(false);
    };
    const zero: ArithmeticV2Answer = {
      kind: "integer",
      exact: ["0"],
      text: "0",
      latex: "0",
    };
    fake("g3-div-small-remainder", [8, 0], "8 ÷ 0", zero);
    fake("g6-natural-div-decimal", [1, 30], "1 ÷ 0.3", {
      kind: "decimal",
      exact: ["3333", "3"],
      text: "3.333",
      latex: "3.333",
    });
    fake("g6-natural-div-decimal", [1, 320], "1 ÷ 3.2", {
      kind: "decimal",
      exact: ["3125", "4"],
      text: "0.3125",
      latex: "0.3125",
    });
    fake("g4-natural-sub-decimal", [1, 120], "1 - 1.2", zero);
    fake("g6-natural-div-fraction", [3, 1, 0, 2], "3 ÷ 0/2", zero);
    fake("g5-natural-mixed-order", [0, 2, 3, 4], "2 - 3 × 4", zero);
    fake("g5-natural-mixed-order", [3, 8, 3, 3], "(8 + 3) ÷ 3", zero);
    fake("g5-natural-mixed-order", [0, 20, 4, 3], "20 - 4 × 3", {
      kind: "integer",
      exact: ["8"],
      text: "8",
      latex: "8",
    });
  });

  it("rejects equivalent noncanonical exact answers", () => {
    const rational = get("g6-natural-div-fraction");
    const r = rational.problemAt(0);
    r.answer.exact = r.answer.exact.map((v) => String(B(v) * B(2)));
    expect(rational.verify(r)).toBe(false);
    const decimal = get("g5-decimal-mul-natural");
    const d = decimal.problemAt(0);
    d.answer.exact = [
      String(B(d.answer.exact[0]) * B(10)),
      String(Number(d.answer.exact[1]) + 1),
    ];
    expect(decimal.verify(d)).toBe(false);
  });
});
