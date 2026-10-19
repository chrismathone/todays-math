// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import katex from "katex";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2";
import { ELEMENTARY_COMPLETE_DEFINITIONS } from "@/lib/arithmetic-v2/families/elementaryComplete";
import { GRADE1_COMPLETE } from "@/lib/arithmetic-v2/families/elementaryComplete/grade1";
import { GRADE2_COMPLETE } from "@/lib/arithmetic-v2/families/elementaryComplete/grade2";
import type {
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "@/lib/arithmetic-v2/types";

/* Track A of the 2026-10-16 gap audit: 초1·초2 core drills. Every expectation
 * below is written from the drill's definition (ranges, carry rules), not from
 * the family code, so the sizes and answers here are an independent oracle.
 */
const definitions = [...GRADE1_COMPLETE, ...GRADE2_COMPLETE];
const byId = new Map(definitions.map((d) => [d.id, d]));
const def = (key: string) => {
  const found = byId.get(`ec-${key}-v1`);
  if (!found) throw new Error(`missing ${key}`);
  return found;
};
const clone = (c: ArithmeticV2Candidate) =>
  JSON.parse(JSON.stringify(c)) as ArithmeticV2Candidate;
const range = (a: number, b: number) =>
  Array.from({ length: b - a + 1 }, (_, i) => a + i);
const count = (predicate: () => Iterable<boolean>) => {
  let n = 0;
  for (const ok of predicate()) if (ok) n++;
  return n;
};
const digits = (n: number) => String(n).split("").map(Number);
// 일·삼·육·칠·팔 and 십·백 end in a consonant: 2는/3은, 2와/3과.
const batchim = (n: number) => n % 10 === 0 || [1, 3, 6, 7, 8].includes(n % 10);
const eun = (n: number) => (batchim(n) ? "은" : "는");
const gwa = (n: number) => (batchim(n) ? "과" : "와");
const carries = (l: number, r: number) => {
  const ones = (l % 10) + (r % 10) >= 10 ? 1 : 0;
  const tens =
    Math.floor(l / 10) + Math.floor(r / 10) + ones >= 10 ? ones + 1 : ones;
  return tens;
};

type Expectation = {
  key: string;
  grade: "초1" | "초2";
  unit: string;
  size: number;
  /** Expected prompt from the parameters alone. */
  prompt: (p: number[]) => Partial<ArithmeticV2Prompt> & { text?: string };
  answer: (p: number[]) => number;
  /** Drill screening invariant, checked on every enumerated item. */
  screen: (p: number[]) => boolean;
};

const placeName = ["일", "십", "백", "천"];
const expectations: Expectation[] = [
  {
    key: "g1-add-within-9",
    grade: "초1",
    unit: "덧셈과 뺄셈",
    size: count(function* () {
      for (const a of range(1, 9))
        for (const b of range(1, 9)) yield a + b <= 9;
    }),
    prompt: ([a, b]) => ({ layout: "math", text: `${a} + ${b}` }),
    answer: ([a, b]) => a + b,
    screen: ([a, b]) => a >= 1 && b >= 1 && a + b <= 9,
  },
  {
    key: "g1-sub-within-9",
    grade: "초1",
    unit: "덧셈과 뺄셈",
    size: count(function* () {
      for (const a of range(1, 9)) for (const b of range(1, 9)) yield b < a;
    }),
    prompt: ([a, b]) => ({ layout: "math", text: `${a} - ${b}` }),
    answer: ([a, b]) => a - b,
    screen: ([a, b]) => a <= 9 && b >= 1 && b < a,
  },
  {
    key: "g1-decompose",
    grade: "초1",
    unit: "덧셈과 뺄셈",
    size: count(function* () {
      for (const t of range(2, 9)) for (const a of range(1, 9)) yield a < t;
    }),
    prompt: ([t, a]) => ({
      layout: "math",
      text: `${t}${eun(t)} ${a}${gwa(a)} □로 가르기`,
    }),
    answer: ([t, a]) => t - a,
    screen: ([t, a]) => a >= 1 && a < t && t <= 9,
  },
  {
    key: "g1-make-ten",
    grade: "초1",
    unit: "덧셈과 뺄셈 (2)",
    size: 18,
    prompt: ([mode, a]) => ({
      layout: "math",
      text: mode === 0 ? `${a} + □ = 10` : `□ + ${a} = 10`,
    }),
    answer: ([, a]) => 10 - a,
    screen: ([mode, a]) => (mode === 0 || mode === 1) && a >= 1 && a <= 9,
  },
  {
    key: "g1-sub-from-ten",
    grade: "초1",
    unit: "덧셈과 뺄셈 (2)",
    size: 9,
    prompt: ([a]) => ({ layout: "math", text: `10 - ${a}` }),
    answer: ([a]) => 10 - a,
    screen: ([a]) => a >= 1 && a <= 9,
  },
  ...(["value", "tens", "ones"] as const).map((mode): Expectation => ({
    key: `g1-tens-ones-${mode}`,
    grade: "초1",
    unit: "50까지의 수",
    size: 4 * 9,
    prompt: ([t, o]) => ({
      layout: "math",
      text:
        mode === "value"
          ? `10개씩 ${t}묶음과 낱개 ${o}개`
          : mode === "tens"
            ? `${10 * t + o}${eun(o)} 10개씩 □묶음과 낱개 ${o}개`
            : `${10 * t + o}${eun(o)} 10개씩 ${t}묶음과 낱개 □개`,
    }),
    answer: ([t, o]) =>
      mode === "value" ? 10 * t + o : mode === "tens" ? t : o,
    screen: ([t, o]) => t >= 1 && t <= 4 && o >= 1 && o <= 9,
  })),
  {
    key: "g1-neighbor",
    grade: "초1",
    unit: "100까지의 수",
    size: count(function* () {
      for (const n of range(10, 99))
        for (const delta of [1, -1, 10, -10]) yield n + delta <= 100;
    }),
    prompt: ([n, mode]) => ({
      layout: "math",
      text: `${n}보다 ${[1, 1, 10, 10][mode]} ${mode % 2 ? "작은" : "큰"} 수`,
    }),
    answer: ([n, mode]) => n + [1, -1, 10, -10][mode],
    screen: ([n, mode]) =>
      n >= 10 && n <= 99 && n + [1, -1, 10, -10][mode] <= 100,
  },
  {
    key: "g1-add-three",
    grade: "초1",
    unit: "덧셈과 뺄셈 (2)",
    size: count(function* () {
      for (const a of range(1, 9))
        for (const b of range(1, 9))
          for (const c of range(1, 9)) yield a + b + c <= 9;
    }),
    prompt: ([a, b, c]) => ({ layout: "math", text: `${a} + ${b} + ${c}` }),
    answer: ([a, b, c]) => a + b + c,
    screen: ([a, b, c]) => Math.min(a, b, c) >= 1 && a + b + c <= 9,
  },
  {
    key: "g1-sub-three",
    grade: "초1",
    unit: "덧셈과 뺄셈 (2)",
    size: count(function* () {
      for (const a of range(1, 9))
        for (const b of range(1, 9))
          for (const c of range(1, 9)) yield a - b - c >= 1;
    }),
    prompt: ([a, b, c]) => ({ layout: "math", text: `${a} - ${b} - ${c}` }),
    answer: ([a, b, c]) => a - b - c,
    screen: ([a, b, c]) => a <= 9 && b >= 1 && c >= 1 && a - b - c >= 1,
  },
  {
    key: "g1-make-ten-three",
    grade: "초1",
    unit: "덧셈과 뺄셈 (2)",
    size: count(function* () {
      for (const x of range(1, 9))
        for (const y of range(1, 9))
          for (const z of range(1, 9)) yield x + y === 10 || y + z === 10;
    }),
    prompt: ([x, y, z]) => ({ layout: "math", text: `${x} + ${y} + ${z}` }),
    answer: ([x, y, z]) => x + y + z,
    screen: ([x, y, z]) =>
      [x, y, z].every((n) => n >= 1 && n <= 9) &&
      (x + y === 10 || y + z === 10),
  },
  {
    key: "g1-add-carry",
    grade: "초1",
    unit: "덧셈과 뺄셈 (3)",
    size: count(function* () {
      for (const a of range(1, 9))
        for (const b of range(1, 9)) yield a + b >= 11;
    }),
    prompt: ([a, b]) => ({ layout: "math", text: `${a} + ${b}` }),
    answer: ([a, b]) => a + b,
    screen: ([a, b]) => a <= 9 && b <= 9 && a + b >= 11,
  },
  {
    key: "g1-sub-borrow",
    grade: "초1",
    unit: "덧셈과 뺄셈 (3)",
    size: count(function* () {
      for (const m of range(11, 19))
        for (const b of range(1, 9)) yield m - b < 10 && m - b >= 1;
    }),
    prompt: ([m, b]) => ({ layout: "math", text: `${m} - ${b}` }),
    answer: ([m, b]) => m - b,
    screen: ([m, b]) =>
      m >= 11 && m <= 19 && b <= 9 && m - b < 10 && m - b >= 1,
  },
  {
    key: "g1-add-2x1-no-carry",
    grade: "초1",
    unit: "덧셈과 뺄셈 (1)",
    size: count(function* () {
      for (const l of range(10, 99))
        for (const r of range(1, 9)) yield (l % 10) + r <= 9;
    }),
    prompt: ([l, r]) => ({
      layout: "vertical",
      operator: "+",
      left: l,
      right: r,
    }),
    answer: ([l, r]) => l + r,
    screen: ([l, r]) =>
      l >= 10 && l <= 99 && r >= 1 && r <= 9 && carries(l, r) === 0,
  },
  {
    key: "g1-add-2x2-no-carry",
    grade: "초1",
    unit: "덧셈과 뺄셈 (1)",
    size: count(function* () {
      for (const l of range(10, 99))
        for (const r of range(10, 99)) yield carries(l, r) === 0;
    }),
    prompt: ([l, r]) => ({
      layout: "vertical",
      operator: "+",
      left: l,
      right: r,
    }),
    answer: ([l, r]) => l + r,
    screen: ([l, r]) =>
      l >= 10 && r >= 10 && carries(l, r) === 0 && l + r <= 99,
  },
  {
    key: "g1-sub-2x1-no-borrow",
    grade: "초1",
    unit: "덧셈과 뺄셈 (1)",
    size: count(function* () {
      for (const l of range(10, 99))
        for (const r of range(1, 9)) yield r <= l % 10;
    }),
    prompt: ([l, r]) => ({
      layout: "vertical",
      operator: "-",
      left: l,
      right: r,
    }),
    answer: ([l, r]) => l - r,
    screen: ([l, r]) => l >= 10 && l <= 99 && r >= 1 && r <= l % 10,
  },
  {
    key: "g1-sub-2x2-no-borrow",
    grade: "초1",
    unit: "덧셈과 뺄셈 (1)",
    size: count(function* () {
      for (const l of range(10, 99))
        for (const r of range(10, 99))
          yield l !== r &&
            r % 10 <= l % 10 &&
            Math.floor(r / 10) <= Math.floor(l / 10);
    }),
    prompt: ([l, r]) => ({
      layout: "vertical",
      operator: "-",
      left: l,
      right: r,
    }),
    answer: ([l, r]) => l - r,
    screen: ([l, r]) =>
      l >= 10 && r >= 10 && l !== r && r % 10 <= l % 10 && r <= l,
  },
  {
    key: "g2-times-table",
    grade: "초2",
    unit: "곱셈구구",
    size: 64,
    prompt: ([a, b]) => ({ layout: "math", text: `${a} × ${b}` }),
    answer: ([a, b]) => a * b,
    screen: ([a, b]) => a >= 2 && a <= 9 && b >= 2 && b <= 9,
  },
  ...range(2, 9).map((n): Expectation => ({
    key: `g2-times-table-${n}`,
    grade: "초2",
    unit: "곱셈구구",
    size: 8,
    prompt: ([a, b]) => ({ layout: "math", text: `${a} × ${b}` }),
    answer: ([a, b]) => a * b,
    screen: ([a, b]) => a === n && b >= 2 && b <= 9,
  })),
  {
    key: "g2-times-table-missing",
    grade: "초2",
    unit: "곱셈구구",
    size: 128,
    prompt: ([mode, a, b]) => ({
      layout: "math",
      text: mode === 0 ? `${a} × □ = ${a * b}` : `□ × ${b} = ${a * b}`,
    }),
    answer: ([mode, a, b]) => (mode === 0 ? b : a),
    screen: ([mode, a, b]) =>
      (mode === 0 || mode === 1) && a >= 2 && a <= 9 && b >= 2 && b <= 9,
  },
  {
    key: "g2-groups-count",
    grade: "초2",
    unit: "곱셈",
    size: 64,
    prompt: ([m, k]) => ({
      layout: "math",
      text: `${m}씩 ${k}묶음`,
      answerUnit: "개",
    }),
    answer: ([m, k]) => m * k,
    screen: ([m, k]) => m >= 2 && m <= 9 && k >= 2 && k <= 9,
  },
  {
    key: "g2-times-as-many",
    grade: "초2",
    unit: "곱셈",
    size: 64,
    prompt: ([m, k]) => ({ layout: "math", text: `${m}의 ${k}배` }),
    answer: ([m, k]) => m * k,
    screen: ([m, k]) => m >= 2 && m <= 9 && k >= 2 && k <= 9,
  },
  {
    key: "g2-add-2x2-carry-once",
    grade: "초2",
    unit: "덧셈과 뺄셈",
    size: count(function* () {
      for (const l of range(10, 99))
        for (const r of range(10, 99)) yield carries(l, r) === 1;
    }),
    prompt: ([l, r]) => ({
      layout: "vertical",
      operator: "+",
      left: l,
      right: r,
    }),
    answer: ([l, r]) => l + r,
    screen: ([l, r]) =>
      l >= 10 && l <= 99 && r >= 10 && r <= 99 && carries(l, r) === 1,
  },
  {
    key: "g2-add-2x2-carry-twice",
    grade: "초2",
    unit: "덧셈과 뺄셈",
    size: count(function* () {
      for (const l of range(10, 99))
        for (const r of range(10, 99)) yield carries(l, r) === 2;
    }),
    prompt: ([l, r]) => ({
      layout: "vertical",
      operator: "+",
      left: l,
      right: r,
    }),
    answer: ([l, r]) => l + r,
    screen: ([l, r]) =>
      l >= 10 && l <= 99 && r >= 10 && r <= 99 && carries(l, r) === 2,
  },
  {
    key: "g2-sub-2x2-borrow",
    grade: "초2",
    unit: "덧셈과 뺄셈",
    size: count(function* () {
      for (const l of range(10, 99))
        for (const r of range(10, 99)) yield l > r && l % 10 < r % 10;
    }),
    prompt: ([l, r]) => ({
      layout: "vertical",
      operator: "-",
      left: l,
      right: r,
    }),
    answer: ([l, r]) => l - r,
    screen: ([l, r]) => l <= 99 && r >= 10 && l > r && l % 10 < r % 10,
  },
  {
    key: "g2-three-add-sub",
    grade: "초2",
    unit: "덧셈과 뺄셈",
    size: count(function* () {
      for (const a of range(10, 99))
        for (const b of range(10, 99))
          for (const c of range(10, 99)) yield a + b >= c;
    }),
    prompt: ([a, b, c]) => ({ layout: "math", text: `${a} + ${b} - ${c}` }),
    answer: ([a, b, c]) => a + b - c,
    screen: ([a, b, c]) =>
      [a, b, c].every((n) => n >= 10 && n <= 99) && a + b >= c,
  },
  {
    key: "g2-three-sub-add",
    grade: "초2",
    unit: "덧셈과 뺄셈",
    size: count(function* () {
      for (const a of range(10, 99))
        for (const b of range(10, 99))
          for (let c = 10; c <= 99; c++) yield a > b && c >= 10;
    }),
    prompt: ([a, b, c]) => ({ layout: "math", text: `${a} - ${b} + ${c}` }),
    answer: ([a, b, c]) => a - b + c,
    screen: ([a, b, c]) => [a, b, c].every((n) => n >= 10 && n <= 99) && a > b,
  },
  {
    key: "g2-missing-add",
    grade: "초2",
    unit: "덧셈과 뺄셈",
    size: 2 * 90 * 90,
    prompt: ([mode, a, b]) => ({
      layout: "math",
      text: mode === 0 ? `□ + ${b} = ${a + b}` : `${a} + □ = ${a + b}`,
    }),
    answer: ([mode, a, b]) => (mode === 0 ? a : b),
    screen: ([mode, a, b]) =>
      (mode === 0 || mode === 1) && a >= 10 && a <= 99 && b >= 10 && b <= 99,
  },
  {
    key: "g2-missing-sub",
    grade: "초2",
    unit: "덧셈과 뺄셈",
    size: count(function* () {
      for (const mode of [0, 1])
        for (const a of range(10, 99))
          for (const b of range(10, 99)) yield mode >= 0 && a > b;
    }),
    prompt: ([mode, a, b]) => ({
      layout: "math",
      text: mode === 0 ? `□ - ${b} = ${a - b}` : `${a} - □ = ${a - b}`,
    }),
    answer: ([mode, a, b]) => (mode === 0 ? a : b),
    screen: ([mode, a, b]) =>
      (mode === 0 || mode === 1) && a <= 99 && b >= 10 && a > b,
  },
  ...([3, 4] as const).map((width): Expectation => ({
    key: `g2-place-value-${width}`,
    grade: "초2",
    unit: width === 3 ? "세 자리 수" : "네 자리 수",
    size: count(function* () {
      for (const n of range(10 ** (width - 1), 10 ** width - 1))
        for (const p of range(0, width - 1))
          yield digits(n)[width - 1 - p] !== 0;
    }),
    prompt: ([n, p]) => ({
      layout: "math",
      text: `${n}에서 ${placeName[p]}의 자리 숫자가 나타내는 값`,
    }),
    answer: ([n, p]) => digits(n)[width - 1 - p] * 10 ** p,
    screen: ([n, p]) =>
      String(n).length === width &&
      p >= 0 &&
      p < width &&
      digits(n)[width - 1 - p] !== 0,
  })),
  ...([3, 4] as const).map((width): Expectation => ({
    key: `g2-skip-count-${width}`,
    grade: "초2",
    unit: width === 3 ? "세 자리 수" : "네 자리 수",
    size: count(function* () {
      for (const start of range(10 ** (width - 1), 10 ** width - 1))
        for (const step of range(0, width - 1).map((e) => 10 ** e))
          for (const times of range(2, 5))
            yield start + step * times <= 10 ** width - 1;
    }),
    prompt: ([start, step, times]) => ({
      layout: "math",
      text: `${start}부터 ${step}씩 ${times}번 뛰어 센 수`,
    }),
    answer: ([start, step, times]) => start + step * times,
    screen: ([start, step, times]) =>
      String(start).length === width &&
      [1, 10, 100, 1000].slice(0, width).includes(step) &&
      times >= 2 &&
      times <= 5 &&
      String(start + step * times).length === width,
  })),
];

const unitTitles = (() => {
  const seed = JSON.parse(
    readFileSync(resolve(process.cwd(), "src/lib/lab/units.json"), "utf8"),
  ) as { units: { grade: number; semester: number; title: string }[] };
  return new Set(
    seed.units.map((u) => `초${u.grade}/${u.semester}/${u.title}`),
  );
})();

function indexes(size: number): number[] {
  if (size <= 40_000) return range(0, size - 1);
  const step = Math.ceil(size / 4000);
  const picked = new Set<number>([0, size - 1]);
  for (let i = 0; i < size; i += step) picked.add(i);
  return [...picked].sort((a, b) => a - b);
}

describe("초1·초2 core drills (Track A)", () => {
  it("adds exactly the frozen type list with the independently counted domain sizes", () => {
    expect(definitions.map((d) => d.id).sort()).toEqual(
      expectations.map((e) => `ec-${e.key}-v1`).sort(),
    );
    for (const e of expectations) {
      const d = def(e.key);
      expect(d.domainSize, e.key).toBe(e.size);
      expect(d.grade, e.key).toBe(e.grade);
      expect(d.strand, e.key).toBe("자연수");
      expect(d.curriculum?.unit, e.key).toBe(e.unit);
      expect(
        unitTitles.has(`${e.grade}/${d.curriculum?.semester}/${e.unit}`),
        `${e.key} unit placement ${e.unit}`,
      ).toBe(true);
      expect(d.title).not.toMatch(/[!！]/);
      expect(d.description).not.toMatch(/[!！]/);
    }
    expect(GRADE1_COMPLETE.length).toBe(18);
    expect(GRADE2_COMPLETE.length).toBe(23);
  });

  it("is registered through the aggregator and makes 초1 selectable", () => {
    const aggregated = new Set(
      ELEMENTARY_COMPLETE_DEFINITIONS.map((d) => d.id),
    );
    for (const d of definitions) expect(aggregated.has(d.id), d.id).toBe(true);
    const catalog = listArithmeticV2Types();
    expect(catalog.some((t) => t.grade === "초1")).toBe(true);
    for (const d of definitions) {
      const entry = catalog.find((t) => t.id === d.id);
      expect(entry?.curriculum, d.id).toEqual(d.curriculum);
    }
  });

  it.each(expectations.map((e) => [e.key, e] as const))(
    "%s: every item verifies, matches the oracle, passes screening and is unique",
    (key, e) => {
      const d = def(key);
      const identities = new Set<string>();
      const sampled = indexes(d.domainSize);
      for (const i of sampled) {
        const c = d.problemAt(i);
        expect(e.screen(c.parameters), `${key}#${i} ${c.parameters}`).toBe(
          true,
        );
        expect(c.prompt).toMatchObject(e.prompt(c.parameters));
        const expected = e.answer(c.parameters);
        expect(c.answer).toEqual({
          kind: "integer",
          exact: [String(expected)],
          text: String(expected),
          latex: String(expected),
        });
        expect(d.verify(c), `${key}#${i}`).toBe(true);
        identities.add(JSON.stringify(c.prompt));
      }
      expect(identities.size).toBe(sampled.length);
      if (d.domainSize <= 40_000) {
        // Reverse direction of the round-trip: each parameter tuple occurs once.
        expect(
          new Set(sampled.map((i) => d.problemAt(i).parameters.join(","))).size,
        ).toBe(d.domainSize);
      }
      for (const bad of [-1, d.domainSize, 0.5, Number.NaN, -0])
        expect(() => d.problemAt(bad), String(bad)).toThrow(RangeError);
    },
  );

  it.each(expectations.map((e) => [e.key] as const))(
    "%s: rejects tampered answers, prompts and parameters",
    (key) => {
      const d = def(key);
      const probe = [0, Math.floor(d.domainSize / 2), d.domainSize - 1];
      for (const i of probe) {
        const original = d.problemAt(i);
        const tampered = (mutate: (c: ArithmeticV2Candidate) => void) => {
          const c = clone(original);
          mutate(c);
          return d.verify(c);
        };
        expect(d.verify(clone(original))).toBe(true);
        const n = Number(original.answer.exact[0]);
        expect(tampered((c) => (c.answer.exact = [String(n + 1)]))).toBe(false);
        expect(tampered((c) => (c.answer.text = String(n + 1)))).toBe(false);
        expect(tampered((c) => (c.answer.latex = `${n}0`))).toBe(false);
        expect(tampered((c) => (c.answer.kind = "rational"))).toBe(false);
        expect(tampered((c) => (c.answer.exact = [`0${n}`]))).toBe(false);
        expect(
          tampered((c) => {
            if (c.prompt.layout === "vertical") c.prompt.left += 1;
            else c.prompt.text = `${c.prompt.text} `;
          }),
        ).toBe(false);
        expect(
          tampered((c) => {
            if (c.prompt.layout === "math")
              c.prompt.latex = `${c.prompt.latex}+0`;
            else c.prompt.operator = c.prompt.operator === "+" ? "-" : "+";
          }),
        ).toBe(false);
        expect(
          tampered((c) => {
            if (c.prompt.layout === "math") c.prompt.instruction = "다르게";
            else c.prompt.instruction = "세로로 계산하세요.";
          }),
        ).toBe(false);
        expect(tampered((c) => c.parameters.push(1))).toBe(false);
        expect(tampered((c) => (c.parameters[0] += 1000))).toBe(false);
        expect(
          tampered((c) => ((c as unknown as { extra: number }).extra = 1)),
        ).toBe(false);
        // A different valid parameter tuple with this prompt/answer must fail.
        const other = d.problemAt(i === 0 ? d.domainSize - 1 : 0);
        if (other.parameters.join() !== original.parameters.join())
          expect(tampered((c) => (c.parameters = [...other.parameters]))).toBe(
            false,
          );
      }
    },
  );

  it("renders every example prompt with KaTeX", () => {
    for (const d of definitions) {
      const prompt = d.problemAt(0).prompt;
      if (prompt.layout !== "math") continue;
      expect(() =>
        katex.renderToString(prompt.latex, {
          throwOnError: true,
          strict: "ignore",
        }),
      ).not.toThrow();
      expect(prompt.instruction).toMatch(/하세요\.$/);
    }
  });

  it("keeps screening explicit: no ×0·×1, no a−a, no +0, no 0 place value", () => {
    for (const d of definitions) {
      const all = indexes(d.domainSize).map((i) => d.problemAt(i));
      for (const c of all) {
        const p = c.prompt;
        if (/times-table|groups|times-as-many/.test(d.id))
          expect(
            c.parameters.slice(-2).every((n) => n >= 2),
            d.id,
          ).toBe(true);
        if (p.layout === "vertical") {
          expect(p.right, d.id).toBeGreaterThan(0);
          expect(p.left, d.id).toBeGreaterThan(
            p.operator === "-" ? p.right : 0,
          );
        }
        if (/place-value/.test(d.id)) expect(c.answer.text).not.toBe("0");
        if (/g1-(add|sub)-within-9|add-three|sub-three/.test(d.id))
          expect(
            c.parameters.every((n) => n >= 1),
            d.id,
          ).toBe(true);
      }
    }
  });

  it("keeps the domains deterministic and independent of call order", () => {
    for (const d of definitions as ArithmeticV2Definition[]) {
      const mid = Math.floor(d.domainSize / 2);
      const first = d.problemAt(mid);
      d.problemAt(0);
      expect(d.problemAt(mid)).toEqual(first);
    }
  });
});
