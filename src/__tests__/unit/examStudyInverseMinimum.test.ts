import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ExamStudyDraft } from "@/contracts/examStudy.contract";
import {
  studyRequirementIdSchema,
  STUDY_REQUIREMENT_IDS,
} from "@/contracts/examStudy.contract";
import {
  inverseMinimum as family,
  inverseMinimumStudyMetadata,
} from "@/lib/examStudy/families/middle/inverseMinimum";
import { generateExamStudy } from "@/lib/examStudy/generate";
import {
  examStudyFamilies,
  getExamStudyCatalog,
} from "@/lib/examStudy/registry";
import { familyCoverage } from "@/lib/examStudy/evidence";
import { studyReleaseHold } from "@/lib/examStudy/releaseEligibility";
import { checkPaperRender } from "@/lib/testchanger/mathRenderQa";

const demand = "number.inverse-extreme-range" as const;
type Sum = Map<number, number>; // key0 is the rational constant, other keys are radicands.
function readSum(text: string): Sum {
  const out: Sum = new Map(),
    tokens = /([+-]?)(?:(\d+)?\\sqrt(?:\{(\d+)\}|(\d+))|(\d+))/gy;
  let consumed = 0;
  while (consumed < text.length) {
    tokens.lastIndex = consumed;
    const t = tokens.exec(text);
    if (!t) throw new Error(`Unsupported printed constant at ${consumed}`);
    const sign = t[1] === "-" ? -1 : 1;
    const key = t[3] || t[4] ? Number(t[3] || t[4]) : 0;
    const value = sign * Number(key ? t[2] || "1" : t[5]);
    const next = (out.get(key) ?? 0) + value;
    if (next) out.set(key, next);
    else out.delete(key);
    consumed = tokens.lastIndex;
  }
  return out;
}
function subtract(a: Sum, b: Sum): Sum {
  const result = new Map(a);
  for (const [key, value] of b) {
    const next = (result.get(key) ?? 0) - value;
    if (next) result.set(key, next);
    else result.delete(key);
  }
  return result;
}
function bounds(values: Sum): [number, number] {
  const scale = 100000;
  let low = 0,
    high = 0;
  for (const [radicand, coefficient] of values) {
    if (!radicand) {
      low += coefficient * scale;
      high += coefficient * scale;
      continue;
    }
    let a = 0,
      b = 1000000;
    while (a + 1 < b) {
      const mid = Math.floor((a + b) / 2);
      if (mid * mid < radicand * scale * scale) a = mid;
      else b = mid;
    }
    expect(a * a).toBeLessThan(radicand * scale * scale);
    expect(b * b).toBeGreaterThan(radicand * scale * scale);
    low += coefficient > 0 ? coefficient * a : coefficient * b;
    high += coefficient > 0 ? coefficient * b : coefficient * a;
  }
  return [low, high];
}
const sorted = (s: Sum) => [...s].sort(([a], [b]) => a - b);
function solvePrinted(item: ExamStudyDraft) {
  const displayed = [...item.content.matchAll(/\$([^$]*)\$/gu)].map(
    (x) => x[1],
  );
  expect(displayed).toHaveLength(2);
  const visible = displayed[0].split(", ").map(readSum),
    gap = readSum(displayed[1]);
  expect(visible).toHaveLength(4);
  const ranges = visible.map(bounds),
    best = ranges.findIndex((r, i) =>
      ranges.every((q, j) => i === j || r[0] > q[1]),
    );
  expect(best).toBeGreaterThanOrEqual(0);
  const minimum = subtract(visible[best], gap),
    interval = bounds(minimum);
  for (const r of ranges) expect(interval[1]).toBeLessThan(r[0]);
  expect(bounds(gap)[0]).toBeGreaterThan(0);
  expect(sorted(subtract(visible[best], minimum))).toEqual(sorted(gap));
  return { minimum, interval, ranges };
}

describe("inverse minimum from an extreme difference", () => {
  it("independently solves all24 printed data sets, including positive and negative fourth values", () => {
    const printed = new Set<string>(),
      answers = new Set<string>();
    let positiveFourth = 0,
      negativeFourth = 0;
    for (let i = 0; i < 24; i++) {
      const item = family.generate(0, i),
        solved = solvePrinted(item);
      expect(sorted(readSum(item.answer))).toEqual(sorted(solved.minimum));
      expect(solved.interval[1]).toBeLessThan(0);
      if (solved.ranges[3][0] > 0) positiveFourth++;
      else negativeFourth++;
      expect(family.verify(item).valid).toBe(true);
      for (const text of [item.content, item.solution, `$${item.answer}$`])
        expect(checkPaperRender(text).safe).toBe(true);
      printed.add(item.content);
      answers.add(item.answer);
    }
    expect(printed.size).toBe(24);
    expect(answers.size).toBe(6);
    expect(positiveFourth).toBe(4);
    expect(negativeFourth).toBe(20);
  });
  it("binds the actual student text to the preimplementation proposal without inheriting its missing-solution approval", () => {
    const proposed = JSON.parse(
      fs.readFileSync(
        ".qa-artifacts/exam-resume-20261008/inverse-minimum-proposal-20261020-r1/student-only24.json",
        "utf8",
      ),
    );
    expect(proposed.students).toHaveLength(24);
    for (let i = 0; i < 24; i++)
      expect(family.generate(0, i).content).toBe(proposed.students[i].content);
    expect(
      inverseMinimumStudyMetadata.studentOnlyProposal
        .actualAuthorSolutionsReviewed,
    ).toBe(false);
    expect(
      inverseMinimumStudyMetadata.studentOnlyProposal.actualFactoryReviewed,
    ).toBe(false);
  });
  it("rejects changed printed conditions, answers, metadata parameters and student methods", () => {
    for (let i = 0; i < 24; i++) {
      const item = family.generate(0, i);
      const mutations: ExamStudyDraft[] = [
        {
          ...item,
          content: item.content.replace("가장 작은 수였다", "가장 큰 수였다"),
        },
        {
          ...item,
          content: item.content.replace(
            "최댓값에서 최솟값",
            "최솟값에서 최댓값",
          ),
        },
        {
          ...item,
          content: item.content.replace("\\sqrt3-\\sqrt2", "\\sqrt3+\\sqrt2"),
        },
        { ...item, content: item.content.replace("네 실수", "세 실수") },
        { ...item, content: item.content.replace("뺀 값", "더한 값") },
        { ...item, content: item.content.replace("뺀 값이 $2", "뺀 값이 $3") },
        { ...item, answer: "0" },
        { ...item, answer: `-(${item.answer})` },
        { ...item, solution: item.solution + " 미분으로 검산한다." },
        { ...item, parameters: { ...item.parameters, radicand: 0 } },
        { ...item, parameters: { ...item.parameters, extra: 1 } },
        { ...item, parameters: { ...item.parameters, small: NaN } },
        { ...item, questionType: "객관식", distractors: ["1", "2", "3", "4"] },
        { ...item, questionType: "서술형" },
        { ...item, difficulty: "응용" },
        { ...item, difficultyBasis: ["ignored"] },
        { ...item, figureSpec: { version: "graph-1" } },
      ];
      for (const changed of mutations)
        expect(family.verify(changed).valid).toBe(false);
    }
  });
  it("keeps finite tuples, enumeration copies and safe seed reproduction independent of formats", () => {
    expect(family.paramDomain.kind).toBe("finite");
    if (family.paramDomain.kind !== "finite")
      throw new Error("finite expected");
    expect(family.paramDomain.size).toBe(24);
    const changed = family.paramDomain.enumerate().map((x) => ({ ...x }));
    changed[0].radicand = -1;
    expect(family.paramDomain.enumerate()[0].radicand).toBe(7);
    for (const seed of [
      0,
      1,
      -1,
      24,
      -24,
      Number.MAX_SAFE_INTEGER,
      -Number.MAX_SAFE_INTEGER,
    ])
      for (const variant of [0, 23, 24, Number.MAX_SAFE_INTEGER])
        expect(family.verify(family.generate(seed, variant)).valid).toBe(true);
    for (const seed of [NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1])
      expect(() => family.generate(seed, 0)).toThrow();
    for (const variant of [-1, 0.5, Infinity])
      expect(() => family.generate(0, variant)).toThrow();
  });
  it.each(["혼합", "객관식", "단답형", "서술형"] as const)(
    "never calls the factory under caller approval/identity labels for %s",
    async (format) => {
      for (const change of [
        {},
        { id: "native-bypass" },
        { version: "999" },
        { source: "native" as const },
        { gradeApproved: true, rightsApproved: true, confidence: 1 },
        { fulfills: [{ requirement: demand, level: "component" as const }] },
      ]) {
        const generate = vi.fn(family.generate),
          f = { ...family, ...change, generate };
        const result = await generateExamStudy(
          {
            course: "중3",
            familyIds: [f.id],
            requirementIds: [demand],
            count: 1,
            maxPerFamily: 1,
            seed: 7,
            format,
          },
          { families: [f] },
        );
        expect(result.status).toBe("unavailable");
        expect(result.questions).toEqual([]);
        expect(generate).not.toHaveBeenCalled();
        expect(studyReleaseHold(f)?.status).toBe("review-only-template");
        expect(familyCoverage(f, demand)).toBe("unavailable");
      }
    },
  );
  it("retains a captured Unit proposal while the internal factory stays hidden in public catalogs", () => {
    expect(studyRequirementIdSchema.parse(demand)).toBe(demand);
    expect(STUDY_REQUIREMENT_IDS).toContain(demand);
    expect(examStudyFamilies().some((f) => f.id === family.id)).toBe(true);
    expect(
      getExamStudyCatalog("중3").families.some((f) => f.id === family.id),
    ).toBe(false);
    expect(inverseMinimumStudyMetadata.unitId).toBe(
      "28032bdd-3db3-4788-9e7a-2f1909233fdb",
    );
    expect(inverseMinimumStudyMetadata.liveFamilyKey).toBeNull();
    expect(inverseMinimumStudyMetadata.rightsApproved).toBe(false);
    expect(inverseMinimumStudyMetadata.loadable).toBe(false);
    expect(inverseMinimumStudyMetadata.proposedCurriculumScope.m3From2027).toBe(
      "requires-2022-grade-placement-review",
    );
  }, 40000);
});
