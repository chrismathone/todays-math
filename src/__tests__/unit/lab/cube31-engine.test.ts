import { afterEach, describe, expect, it, vi } from "vitest";

import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";
import * as elementary from "@/lib/elementary/generate";
import { generateCubePractice } from "@/lib/lab/cube31/engine";

vi.mock("server-only", () => ({}));
afterEach(() => vi.restoreAllMocks());

const concepts = [
  "add-none",
  "add-once",
  "add-many",
  "subtract-none",
  "subtract-once",
  "subtract-twice",
];

describe("Cube 3-1 practice from the real elementary generator", () => {
  it.each([undefined, 0, 1, 42, 20260922, -83, 4294967295])(
    "has six distinct, correctly classified and answered problems per concept for seed %s",
    (seed) => {
      const pool = generateCubePractice(seed);
      expect(pool).toHaveLength(36);
      expect(new Set(pool.map((problem) => problem.id)).size).toBe(36);
      for (const concept of concepts) {
        expect(
          pool.filter((problem) => problem.concept === concept),
        ).toHaveLength(6);
      }
      const unique = new Set<string>();
      for (const problem of pool) {
        const { a, b, operation, answer, concept, id } = problem;
        const [, section, sourceSeed] = /^cube31-(1-1-[1-4])-(\d+)$/.exec(id)!;
        const unit = CURRICULUM_UNITS.find(
          (item) =>
            item.grade === "초3" && item.section.startsWith(`${section} `),
        )!;
        const source = elementary.generateElementaryProblem(
          unit,
          Number(sourceSeed),
          "연산",
        );
        // 원본 문항의 식(세로셈 그림이 있으면 그림, 없으면 해설 «$a+b=c$» — 지면 전수 검사 2026-10-20 뒤 대부분 해설)
        const sign = operation === "add" ? "+" : "−";
        if (source.figureSpec?.kind === "columnOp") {
          expect(source.figureSpec).toMatchObject({ top: String(a), bottom: String(b) });
          expect(source.figureSpec.op).toBe(sign);
        } else {
          expect(source.solution.trim()).toMatch(
            new RegExp(`^\\$${a}[${sign}-]${b}=${answer}\\$$`),
          );
        }
        expect(source.answer).toBe(`$${answer}$`);
        expect(answer).toBe(operation === "add" ? a + b : a - b);
        expect(a).toBeGreaterThanOrEqual(100);
        expect(b).toBeGreaterThanOrEqual(100);
        expect(a).toBeLessThan(1000);
        expect(b).toBeLessThan(1000);
        expect(answer).toBeGreaterThanOrEqual(0);
        // Independent oracle: overflow/deficit in each suffix requires one exchange.
        const count = [10, 100, 1000].filter((base) =>
          operation === "add"
            ? (a % base) + (b % base) >= base
            : a % base < b % base,
        ).length;
        expect(concept).toBe(
          operation === "add"
            ? ["add-none", "add-once", "add-many", "add-many"][count]
            : ["subtract-none", "subtract-once", "subtract-twice"][count],
        );
        unique.add(
          operation === "add"
            ? `add:${Math.min(a, b)}:${Math.max(a, b)}`
            : `subtract:${a}:${b}`,
        );
      }
      expect(unique.size).toBe(36);
      expect(pool.some((p) => p.operation === "add" && p.answer >= 1000)).toBe(
        true,
      );
      expect(
        pool.some(
          (p) =>
            p.concept === "subtract-twice" &&
            Math.floor(p.a / 10) % 10 === 0 &&
            p.a % 10 < p.b % 10,
        ),
      ).toBe(true);
    },
  );

  it("is deterministic, varies by seed, and returns fresh serializable objects", () => {
    const first = generateCubePractice();
    expect(generateCubePractice()).toEqual(first);
    expect(generateCubePractice(123)).toEqual(generateCubePractice(123));
    expect(generateCubePractice(123)).not.toEqual(generateCubePractice(124));
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    first[0].answer = -1;
    expect(generateCubePractice()[0].answer).not.toBe(-1);
  });

  it.each([NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid seed %s",
    (seed) => {
      expect(() => generateCubePractice(seed)).toThrow("safe integer");
    },
  );

  it("uses a bounded search and fails explicitly when column operands are unavailable", () => {
    const unit = CURRICULUM_UNITS.find(
      (item) => item.grade === "초3" && item.section.startsWith("1-1-1 "),
    )!;
    const source = elementary.generateElementaryProblem(unit, 1, "연산");
    const spy = vi
      .spyOn(elementary, "generateElementaryProblem")
      .mockReturnValue({ ...source, figureSpec: null, solution: "두 수를 더합니다." });
    expect(() => generateCubePractice()).toThrow("after 2048 attempts");
    expect(spy).toHaveBeenCalledTimes(2048);
    expect(
      spy.mock.calls.every(
        ([target, , tier]) =>
          target.grade === "초3" &&
          target.chapter.startsWith("1-1 ") &&
          tier === "연산",
      ),
    ).toBe(true);
  });

  it("rejects a source answer that disagrees with its column operands", () => {
    const unit = CURRICULUM_UNITS.find(
      (item) => item.grade === "초3" && item.section.startsWith("1-1-2 "),
    )!;
    const source = elementary.generateElementaryProblem(unit, 1, "연산");
    vi.spyOn(elementary, "generateElementaryProblem").mockReturnValue({
      ...source,
      answer: "$-1$",
    });
    expect(() => generateCubePractice()).toThrow("disagrees");
  });
});
