// @vitest-environment node
import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { NATURAL_DEFINITIONS as definitions } from "../../lib/arithmetic-v2/families/elementary/natural";
import type {
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
} from "../../lib/arithmetic-v2/types";

// Track B of the 2026-10-16 arithmetic expansion: 초3·초4 natural-number drills.
// Every expectation here is written independently of the production domain
// helpers: raw operand ranges are enumerated with loops and filtered, and the
// answers are recomputed with BigInt from the displayed operands.

const B = BigInt;
const key = (p: number[]) => p.join(",");
const clone = (p: ArithmeticV2Candidate) => structuredClone(p);
const get = (id: string): ArithmeticV2Definition => {
  const found = definitions.find((d) => d.id === id);
  assert(found, `missing definition ${id}`);
  return found;
};

type Spec = {
  id: string;
  grade: "초3" | "초4";
  title: string;
  semester: 1 | 2;
  unit: string;
  operator: "×" | "÷";
  kind: "integer" | "remainder";
  size: number;
  domain(): number[][];
  outside: number[][];
};

const tens = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const hundreds = tens.map((t) => t * 10);

const SPECS: Spec[] = [
  {
    id: "elem-g3-div-times-table",
    grade: "초3",
    title: "곱셈구구 범위의 나눗셈",
    semester: 1,
    unit: "나눗셈",
    operator: "÷",
    kind: "integer",
    size: 64,
    domain() {
      const out: number[][] = [];
      for (let b = 2; b <= 9; b++)
        for (let q = 2; q <= 9; q++) out.push([b * q, b]);
      return out;
    },
    outside: [
      [8, 1], // ÷1
      [8, 8], // a ÷ a
      [0, 4], // zero dividend
      [57, 8], // not a times-table product
      [90, 9], // quotient 10 is outside 곱셈구구
      [12, 4, 3], // extra parameter
    ],
  },
  {
    id: "elem-g3-mul-tens-by-one",
    grade: "초3",
    title: "(몇십) × (몇)",
    semester: 1,
    unit: "곱셈",
    operator: "×",
    kind: "integer",
    size: 72,
    domain() {
      const out: number[][] = [];
      for (const a of tens) for (let b = 2; b <= 9; b++) out.push([a, b]);
      return out;
    },
    outside: [
      [30, 1], // ×1
      [30, 0], // ×0
      [35, 4], // not 몇십
      [100, 4], // 몇백
      [4, 30], // reversed order
    ],
  },
  {
    id: "elem-g3-mul-tens-by-tens",
    grade: "초3",
    title: "(몇십) × (몇십)",
    semester: 2,
    unit: "곱셈",
    operator: "×",
    kind: "integer",
    size: 81,
    domain() {
      const out: number[][] = [];
      for (const a of tens) for (const b of tens) out.push([a, b]);
      return out;
    },
    outside: [
      [30, 1],
      [30, 4], // right operand is not 몇십
      [35, 40],
      [100, 40],
      [0, 40],
    ],
  },
  {
    id: "elem-g3-mul-2digit-by-tens",
    grade: "초3",
    title: "(몇십몇) × (몇십)",
    semester: 2,
    unit: "곱셈",
    operator: "×",
    kind: "integer",
    size: 729,
    domain() {
      const out: number[][] = [];
      for (let a = 11; a <= 99; a++)
        if (a % 10 !== 0) for (const b of tens) out.push([a, b]);
      return out;
    },
    outside: [
      [30, 40], // 몇십 belongs to the other type
      [23, 4], // right operand is not 몇십
      [23, 1],
      [9, 40], // one digit
      [123, 40],
    ],
  },
  {
    id: "elem-g3-div-2x1-exact",
    grade: "초3",
    title: "나누어떨어지는 (두 자리 수) ÷ (한 자리 수)",
    semester: 2,
    unit: "나눗셈",
    operator: "÷",
    kind: "integer",
    size: 106,
    domain() {
      const out: number[][] = [];
      for (let a = 10; a <= 99; a++)
        for (let b = 2; b <= 9; b++)
          if (a % b === 0 && a / b >= 10) out.push([a, b]);
      return out;
    },
    outside: [
      [60, 1], // ÷1
      [61, 3], // remainder
      [18, 2], // quotient inside 곱셈구구 (other type)
      [20, 20], // a ÷ a
      [120, 4], // three digits
      [0, 3],
    ],
  },
  {
    id: "elem-g4-mul-hundreds-by-tens",
    grade: "초4",
    title: "(몇백) × (몇십)",
    semester: 1,
    unit: "곱셈과 나눗셈",
    operator: "×",
    kind: "integer",
    size: 81,
    domain() {
      const out: number[][] = [];
      for (const a of hundreds) for (const b of tens) out.push([a, b]);
      return out;
    },
    outside: [
      [300, 4],
      [300, 1],
      [320, 40],
      [30, 40],
      [1000, 40],
    ],
  },
  {
    id: "elem-g4-mul-3digit-by-tens",
    grade: "초4",
    title: "(세 자리 수) × (몇십)",
    semester: 1,
    unit: "곱셈과 나눗셈",
    operator: "×",
    kind: "integer",
    size: 8019,
    domain() {
      const out: number[][] = [];
      for (let a = 100; a <= 999; a++)
        if (a % 100 !== 0) for (const b of tens) out.push([a, b]);
      return out;
    },
    outside: [
      [300, 40], // 몇백 belongs to the other type
      [243, 3],
      [243, 1],
      [99, 40],
      [1000, 40],
    ],
  },
  {
    id: "elem-g4-div-by-tens-remainder",
    grade: "초4",
    title: "몇십으로 나누는 나눗셈",
    semester: 1,
    unit: "곱셈과 나눗셈",
    operator: "÷",
    kind: "remainder",
    size: 7552,
    domain() {
      const out: number[][] = [];
      for (const b of tens.slice(1))
        for (let a = b + 1; a <= 999; a++) out.push([a, b]);
      return out;
    },
    outside: [
      [250, 10], // ÷10 only reads off the digits
      [250, 3],
      [250, 1],
      [30, 30], // a ÷ a
      [19, 20], // dividend below the divisor
      [1000, 30],
      [0, 30],
    ],
  },
];

function expectedPrompt(spec: Spec, [a, b]: number[]) {
  const op = spec.operator;
  return {
    layout: "math",
    text: `${a} ${op} ${b}`,
    latex: `${a} ${op === "×" ? "\\times" : "\\div"} ${b}`,
    ...(spec.kind === "remainder"
      ? { instruction: "몫과 나머지를 구하세요." }
      : {}),
  };
}

function expectedAnswer(spec: Spec, [a, b]: number[]) {
  const [x, y] = [B(a), B(b)];
  if (spec.kind === "remainder") {
    const q = x / y;
    const r = x % y;
    return {
      kind: "remainder",
      exact: [String(q), String(r)],
      text: `몫 ${q}, 나머지 ${r}`,
      latex: `\\text{몫 }${q},\\;\\text{나머지 }${r}`,
    };
  }
  const n = spec.operator === "×" ? x * y : x / y;
  if (spec.operator === "÷") assert.equal(x % y, B(0));
  return {
    kind: "integer",
    exact: [String(n)],
    text: String(n),
    latex: String(n),
  };
}

describe("초3·초4 natural-number drill expansion (Track B)", () => {
  it("adds eight frozen IDs with their unit placement, after the existing ten", () => {
    const ids = definitions.map((d) => d.id);
    expect(ids.slice(0, 10)).toEqual([
      "elem-g3-add-3digit",
      "elem-g3-sub-3digit",
      "elem-g3-mul-3x1",
      "elem-g3-mul-2x2",
      "elem-g3-div-2x1-remainder",
      "elem-g3-div-3x1-remainder",
      "elem-g4-mul-3x2",
      "elem-g4-div-2x2-remainder",
      "elem-g4-div-3x2-remainder",
      "elem-g5-natural-mixed",
    ]);
    expect(ids.slice(10)).toEqual(SPECS.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const spec of SPECS) {
      const definition = get(spec.id);
      expect(definition.grade).toBe(spec.grade);
      expect(definition.strand).toBe("자연수");
      expect(definition.title).toBe(spec.title);
      expect(definition.description.length).toBeGreaterThan(0);
      expect(definition.labels[0]).toBe("직접 연산");
      expect(definition.rankGroup).toBe(
        `elementary-natural-${spec.operator === "×" ? "mul" : "div"}`,
      );
      expect(definition.curriculum).toEqual({
        semester: spec.semester,
        unit: spec.unit,
      });
      expect(definition.domainSize).toBe(spec.size);
      expect(definition.promptPresentation).toBeUndefined();
    }
  });

  for (const spec of SPECS) {
    it(`${spec.id}: exhaustive domain round-trip with an independent oracle`, () => {
      const definition = get(spec.id);
      const expected = new Set(spec.domain().map(key));
      assert.equal(expected.size, spec.size, "test enumeration is unique");
      const seen = new Set<string>();
      const prompts = new Set<string>();
      for (let index = 0; index < definition.domainSize; index++) {
        const candidate = definition.problemAt(index);
        const k = key(candidate.parameters);
        assert(
          expected.has(k),
          `index ${index} produced ${k} outside the domain`,
        );
        assert(!seen.has(k), `duplicate parameters ${k} at ${index}`);
        seen.add(k);
        const promptKey = JSON.stringify(candidate.prompt);
        assert(!prompts.has(promptKey), `duplicate prompt at ${index}`);
        prompts.add(promptKey);
        expect(candidate.prompt).toEqual(
          expectedPrompt(spec, candidate.parameters),
        );
        expect(candidate.answer).toEqual(
          expectedAnswer(spec, candidate.parameters),
        );
        assert(definition.verify(candidate), `verify false at ${index}`);
        expect(definition.problemAt(index)).toEqual(candidate);
      }
      expect(seen.size).toBe(expected.size);
      for (const bad of [-1, 0.5, NaN, Infinity, definition.domainSize])
        expect(() => definition.problemAt(bad)).toThrow(RangeError);
    });

    it(`${spec.id}: screens trivial items (×0, ×1, ÷1, a÷a, zero operands, quotient 1)`, () => {
      // Documented screen: no operand is 0 or 1; a product never equals an
      // operand; a quotient is never 0 or 1 and the dividend never equals the
      // divisor. (10, 100 are allowed: they are what 몇십·몇백 means.)
      const definition = get(spec.id);
      for (let index = 0; index < definition.domainSize; index++) {
        const { parameters, answer } = definition.problemAt(index);
        const [a, b] = parameters;
        expect(parameters).toHaveLength(2);
        expect(a).toBeGreaterThanOrEqual(2);
        expect(b).toBeGreaterThanOrEqual(2);
        if (spec.operator === "×") {
          expect(Number(answer.exact[0])).not.toBe(a);
          expect(Number(answer.exact[0])).not.toBe(b);
        } else {
          expect(a).not.toBe(b);
          const quotient = Number(answer.exact[0]);
          expect(quotient).toBeGreaterThanOrEqual(1);
          if (spec.kind === "integer")
            expect(quotient).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it(`${spec.id}: verify rejects tampered answers, prompts and excluded operands`, () => {
      const definition = get(spec.id);
      const original = definition.problemAt(
        Math.floor(definition.domainSize / 2),
      );
      const detached = {
        ...definition,
        problemAt: () => {
          throw new Error("generator forbidden");
        },
      };
      expect(detached.verify(original)).toBe(true);

      const bad: ArithmeticV2Candidate[] = [];
      const mutate = (change: (c: ArithmeticV2Candidate) => void) => {
        const c = clone(original);
        change(c);
        bad.push(c);
      };
      mutate((c) => {
        c.answer.exact[0] = String(Number(c.answer.exact[0]) + 1);
      });
      mutate((c) => {
        c.answer.exact[0] = `0${c.answer.exact[0]}`;
      });
      mutate((c) => {
        c.answer.exact = [...c.answer.exact, "0"];
      });
      mutate((c) => {
        c.answer.text += "0";
      });
      mutate((c) => {
        c.answer.latex += "0";
      });
      mutate((c) => {
        c.answer.kind = spec.kind === "integer" ? "remainder" : "integer";
      });
      if (spec.kind === "remainder") {
        mutate((c) => {
          // quotient one lower, remainder raised by the divisor: same total, bad remainder
          const [q, r] = c.answer.exact.map(Number);
          c.answer.exact = [String(q - 1), String(r + c.parameters[1])];
        });
        mutate((c) => {
          c.answer.text = c.answer.text.replace("몫", "몫 ");
        });
      }
      mutate((c) => {
        if (c.prompt.layout === "math") c.prompt.text += " + 1";
      });
      mutate((c) => {
        if (c.prompt.layout === "math") c.prompt.latex += " + 1";
      });
      // Swapped operands change the prompt only when they differ (50 × 50 does not).
      if (original.parameters[0] !== original.parameters[1])
        mutate((c) => {
          if (c.prompt.layout === "math")
            c.prompt.text = `${c.parameters[1]} ${spec.operator} ${c.parameters[0]}`;
        });
      mutate((c) => {
        c.prompt.instruction = "tampered";
      });
      mutate((c) => {
        Object.assign(c.prompt, { unexpected: true });
      });
      mutate((c) => {
        c.parameters = [...c.parameters, 1];
      });
      mutate((c) => {
        c.parameters = [c.parameters[0] + 0.5, c.parameters[1]];
      });
      for (const candidate of bad)
        assert.equal(
          definition.verify(candidate),
          false,
          JSON.stringify(candidate),
        );

      // Excluded operands with internally consistent prompt and answer.
      for (const parameters of spec.outside) {
        const [a, b] = parameters;
        const fake: ArithmeticV2Candidate = {
          parameters,
          prompt: expectedPrompt(spec, [
            a,
            b,
          ]) as ArithmeticV2Candidate["prompt"],
          answer:
            spec.kind === "remainder"
              ? (expectedAnswer(spec, [
                  a,
                  b,
                ]) as ArithmeticV2Candidate["answer"])
              : {
                  kind: "integer",
                  exact: [
                    String(spec.operator === "×" ? a * b : Math.floor(a / b)),
                  ],
                  text: String(
                    spec.operator === "×" ? a * b : Math.floor(a / b),
                  ),
                  latex: String(
                    spec.operator === "×" ? a * b : Math.floor(a / b),
                  ),
                },
        };
        expect(definition.verify(fake)).toBe(false);
      }
      for (const broken of [
        null,
        {},
        { ...original, parameters: null },
        { ...original, answer: null },
      ])
        expect(definition.verify(broken as ArithmeticV2Candidate)).toBe(false);
    });
  }

  const examples: [string, number[], string, string][] = [
    ["elem-g3-div-times-table", [56, 8], "56 ÷ 8", "7"],
    ["elem-g3-div-times-table", [81, 9], "81 ÷ 9", "9"],
    ["elem-g3-mul-tens-by-one", [30, 4], "30 × 4", "120"],
    ["elem-g3-mul-tens-by-tens", [30, 40], "30 × 40", "1200"],
    ["elem-g3-mul-2digit-by-tens", [23, 30], "23 × 30", "690"],
    ["elem-g3-div-2x1-exact", [60, 3], "60 ÷ 3", "20"],
    ["elem-g3-div-2x1-exact", [84, 4], "84 ÷ 4", "21"],
    ["elem-g3-div-2x1-exact", [70, 5], "70 ÷ 5", "14"],
    ["elem-g4-mul-hundreds-by-tens", [300, 40], "300 × 40", "12000"],
    ["elem-g4-mul-3digit-by-tens", [243, 30], "243 × 30", "7290"],
    ["elem-g4-div-by-tens-remainder", [250, 30], "250 ÷ 30", "몫 8, 나머지 10"],
    ["elem-g4-div-by-tens-remainder", [85, 20], "85 ÷ 20", "몫 4, 나머지 5"],
    ["elem-g4-div-by-tens-remainder", [240, 30], "240 ÷ 30", "몫 8, 나머지 0"],
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
      expect(found.prompt.layout).toBe("math");
      if (found.prompt.layout === "math")
        expect(found.prompt.text).toBe(prompt);
      expect(found.answer.text).toBe(answer);
    });
  }
});
