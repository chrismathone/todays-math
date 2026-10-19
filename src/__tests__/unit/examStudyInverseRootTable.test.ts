import katex from "katex";
import { describe, expect, it, vi } from "vitest";
import {
  inverseRootTable as family,
  inverseRootTableStudyMetadata,
} from "@/lib/examStudy/families/middle/inverseRootTable";
import { familyCoverage } from "@/lib/examStudy/evidence";
import { generateExamStudy } from "@/lib/examStudy/generate";
import {
  examStudyFamilies,
  getExamStudyCatalog,
} from "@/lib/examStudy/registry";
import { studyReleaseHold } from "@/lib/examStudy/releaseEligibility";

const demand = "number.inverse-root-table" as const;
const scaled = (s: string) => Number(s.replace(".", ""));
function printed(q: ReturnType<typeof family.generate>) {
  const lines = q.content.split("\n"),
    inputs = lines
      .find((l) => l.startsWith("|$x$|"))!
      .split("|")
      .slice(2, -1)
      .map((s) => s.slice(1, -1)),
    roots = lines
      .find((l) => l.startsWith("|$\\sqrt{x}$의 근삿값|"))!
      .split("|")
      .slice(2, -1)
      .map((s) => scaled(s.slice(1, -1))),
    square = Number(/b\^\{2\}=(\d+)/u.exec(q.content)![1]),
    b = Array.from({ length: 100 }, (_, i) => i + 1).find(
      (n) => n * n === square,
    )!,
    result = scaled(/계산한 결과는 \$(\d+\.\d{2})\$였다/u.exec(q.content)![1]);
  // Each printed root r/1000 gives the a estimate r/10000. Calculate all five
  // hundredth-scaled outputs independently, without reading private params/answer.
  const outputs = roots.map((r) => r + 100 * b),
    indices = outputs.flatMap((v, i) => (v === result ? [i] : []));
  return { inputs, roots, square, b, result, outputs, indices };
}

describe("review-only inverse root table", () => {
  it("independently checks all45 actual tables, integer rounding bounds and unique reverse mappings", () => {
    expect(family.paramDomain.kind).toBe("finite");
    if (family.paramDomain.kind !== "finite") throw new Error("finite");
    expect(family.paramDomain.size).toBe(45);
    const contents = new Set<string>(),
      answers = new Set<string>();
    for (let i = 0; i < 45; i++) {
      const q = family.generate(0, i),
        x = printed(q);
      expect(x.inputs).toHaveLength(5);
      expect(x.roots).toHaveLength(5);
      expect(new Set(x.outputs).size).toBe(5);
      expect(x.indices).toHaveLength(1);
      expect(q.answer).toBe(x.inputs[x.indices[0]]);
      expect(x.b).toBeGreaterThan(0);
      expect(x.b * x.b).toBe(x.square);
      for (let j = 0; j < 5; j++) {
        const radicand4 = 4 * scaled(x.inputs[j]) * 10000,
          root = x.roots[j];
        expect((2 * root - 1) ** 2).toBeLessThanOrEqual(radicand4);
        expect(radicand4).toBeLessThan((2 * root + 1) ** 2);
        expect(x.outputs[j] - 100 * x.b).toBe(root);
      }
      expect(q.solution).toContain(
        "실제 제곱근과 정확히 같다고 놓은 것이 아니다",
      );
      expect(q.content).toContain("소수 넷째 자리에서 반올림");
      expect(q.content).toContain("표의 소수값을 그대로 이용");
      for (const text of [q.content, q.solution, q.answer])
        for (const m of text.matchAll(/\$([^$]+)\$/gu))
          expect(() =>
            katex.renderToString(m[1], { throwOnError: true }),
          ).not.toThrow();
      expect(family.verify(q).valid).toBe(true);
      contents.add(q.content);
      answers.add(q.answer);
    }
    expect(contents.size).toBe(45);
    expect(answers.size).toBe(15);
  });

  it("rejects changed tables, approximation semantics, conditions, answers and unsupported response formats", () => {
    for (let i = 0; i < 45; i++) {
      const q = family.generate(0, i);
      for (const bad of [
        { ...q, answer: "999" },
        { ...q, content: q.content.replace("근삿값", "정확한 값") },
        { ...q, content: q.content.replace("양수", "실수") },
        {
          ...q,
          content: q.content.replace(/\|\$\d\.\d{3}\$/u, () => "|$9.999$"),
        },
        {
          ...q,
          content: q.content.replace(
            /계산한 결과는 \$\d+\.\d{2}\$/u,
            () => "계산한 결과는 $99.99$",
          ),
        },
        {
          ...q,
          solution: q.solution + " 실제 근호값도 이 소수와 정확히 같다.",
        },
        { ...q, parameters: { ...q.parameters, index: 999 } },
        { ...q, questionType: "객관식" as const },
        { ...q, questionType: "서술형" as const },
        { ...q, distractors: ["1", "2", "3", "4"] },
        { ...q, difficulty: "기본" as const },
      ])
        expect(family.verify(bad).valid).toBe(false);
    }
  });

  it("preserves finite domains and seed reproducibility without multiplying seeds or formats into tuples", () => {
    if (family.paramDomain.kind !== "finite") throw new Error("finite");
    const params = family.paramDomain.enumerate();
    expect(new Set(params.map((p) => JSON.stringify(p))).size).toBe(45);
    (params[0] as { start: number }).start = 999;
    expect(printed(family.generate(0, 0)).inputs[0]).toBe("1.10");
    for (const seed of [
      -1,
      0,
      1,
      47,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
    ]) {
      const q = family.generate(seed, 10);
      expect(q).toEqual(family.generate(seed, 10));
      expect(family.verify(q).valid).toBe(true);
    }
    for (const bad of [NaN, Infinity, 0.5])
      expect(() => family.generate(bad, 0)).toThrow();
    expect(() => family.generate(0, -1)).toThrow();
  });

  it.each(["혼합", "단답형", "객관식", "서술형"] as const)(
    "blocks every public %s request before factory execution despite native/rename/component/approval labels",
    async (format) => {
      for (const change of [
        {},
        {
          id: "renamed-root-table",
          version: "999",
          gradeApproved: true,
          rightsApproved: true,
          confidence: 1,
        },
        { source: "native" as const },
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
        expect(result.requirements[0].status).toBe("unavailable");
        expect(generate).not.toHaveBeenCalled();
        expect(studyReleaseHold(f)?.status).toBe("review-only-template");
        expect(familyCoverage(f, demand)).toBe("unavailable");
      }
    },
  );

  it("keeps the internal factory hidden and the actual Unit proposal separate from live-family, rights and grade approval", () => {
    expect(examStudyFamilies().some((f) => f.id === family.id)).toBe(true);
    const catalog = getExamStudyCatalog("중3");
    expect(catalog.families.some((f) => f.id === family.id)).toBe(false);
    expect(catalog.requirements.some((r) => r.id === demand)).toBe(true);
    expect(inverseRootTableStudyMetadata.unitId).toBe(
      "28032bdd-3db3-4788-9e7a-2f1909233fdb",
    );
    expect(inverseRootTableStudyMetadata.liveFamilyKey).toBeNull();
    expect(inverseRootTableStudyMetadata.rightsApproved).toBe(false);
    expect(inverseRootTableStudyMetadata.loadable).toBe(false);
    expect(inverseRootTableStudyMetadata.proposedCurriculumScope).toMatchObject(
      {
        sourceStudyAcademicYear: 2025,
        sourceStudyEdition: "2015",
        practiceAcademicYear: 2026,
        practiceEdition: "2015",
        m3From2027: "requires-2022-grade-placement-review",
        proposalIsNotApproval: true,
      },
    );
  }, 40000);
});
