import { describe, expect, it, vi } from "vitest";
import type {
  ExamStudyFamily,
  ExamStudyGenerateOptions,
  ExamStudyProfile,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";
import {
  EXAM_STUDY_LIMITS,
  STUDY_REQUIREMENT_IDS,
} from "@/contracts/examStudy.contract";
import {
  generateExamStudy,
  parseExamStudyRequest,
  ExamStudyRequestError,
} from "@/lib/examStudy/generate";
import { familyCoverage } from "@/lib/examStudy/evidence";
import {
  contentDigest,
  logicalKey,
  stableStringify,
} from "@/lib/examStudy/identity";
import { allocateStudyQuotas } from "@/lib/examStudy/planner";
import { EXAM_STUDY_PROFILES } from "@/lib/examStudy/profiles";
import { STUDY_REQUIREMENTS } from "@/lib/examStudy/requirements";

const A: StudyRequirementId = "algebra.linear-simplify";
const B: StudyRequirementId = "algebra.linear-model";
const V: StudyRequirementId = "graph.piecewise-multi-claim";
const W: StudyRequirementId = "written.linear-fuel-model";
const request = (changes: Record<string, unknown> = {}) => ({
  course: "중1",
  count: 1,
  seed: 17,
  ...changes,
});

function factory(
  id: string,
  demands: readonly StudyRequirementId[] = [A],
  overrides: Partial<ExamStudyFamily> = {},
): ExamStudyFamily {
  return {
    id,
    title: id,
    version: "r1",
    course: "중1",
    source: "authored",
    unitIds: [],
    unitSections: ["일차식"],
    fulfills: demands.map((requirement) => ({ requirement, level: "full" })),
    formats: ["단답형", "객관식"],
    difficulties: ["기본"],
    representation: "text",
    figureKinds: [],
    paramDomain: {
      kind: "finite",
      size: 3,
      enumerate: () => [{ n: 2 }, { n: 3 }, { n: 4 }],
    },
    evidence: {
      testFile: "src/__tests__/unit/examStudyCore.test.ts",
      sampleCount: 3,
      boundaryCases: ["smallest and largest square"],
      checkedRequirements: demands,
      checks: ["independent-solution", "essential-conditions"],
    },
    generate(_seed, variant) {
      const n = 2 + (variant % 3);
      return {
        content: `$x^2=${n * n}$일 때 양수 $x$의 값을 구하시오.`,
        answer: `$${n}$`,
        solution: `양수 조건을 만족하는 제곱근은 $${n}$이다.`,
        difficulty: "기본",
        difficultyBasis: ["양수 조건으로 두 제곱근 중 선택"],
        questionType: "단답형",
        parameters: { n },
        figureSpec: null,
      };
    },
    canonicalParams: (item) => item.parameters,
    verify(item) {
      const radicand = /x\^2=(\d+)/.exec(item.content);
      const value = /^\$(\d+)\$$/.exec(item.answer);
      const valid =
        !!radicand &&
        !!value &&
        Number(value[1]) > 0 &&
        Number(value[1]) ** 2 === Number(radicand[1]) &&
        item.content.includes("양수");
      return {
        valid,
        checks: ["independent-solution", "essential-conditions"],
        errors: valid
          ? []
          : ["independent root or positive-domain check failed"],
      };
    },
    ...overrides,
  };
}

function profile(
  id: string,
  demands: readonly StudyRequirementId[],
  overrides: Partial<ExamStudyProfile> = {},
): ExamStudyProfile {
  return {
    id,
    version: "r1",
    schoolId: "reviewed",
    schoolName: "검토학교",
    aliases: ["검토중"],
    region: "검토지역",
    course: "중1",
    scope: {
      label: "같은 범위",
      sourceYear: 2025,
      semester: 1,
      round: "기말",
      reviewedOn: "2026-10-18",
      visibleCount: 7,
      totalCount: 9,
      unknownCount: 2,
      difficultyCalibration: "unmeasured",
    },
    requirements: demands.map((id) => ({ id, weight: 1 })),
    ...overrides,
  };
}

const options = (
  families: readonly ExamStudyFamily[],
  changes: ExamStudyGenerateOptions = {},
): ExamStudyGenerateOptions => ({ families, profiles: [], ...changes });
const distinctFactory = (
  id: string,
  demands: readonly StudyRequirementId[],
) => {
  const base = factory(id, demands);
  return factory(id, demands, {
    generate(seed, variant) {
      const item = base.generate(seed, variant);
      return { ...item, content: `${id} 검사: ${item.content}` };
    },
  });
};

describe("exam study strict boundary", () => {
  it.each([
    { count: 0 },
    { count: 31 },
    { count: 1.5 },
    { seed: -1 },
    { seed: Infinity },
    { seed: 0.5 },
    { maxPerFamily: 0 },
    { maxPerFamily: 31 },
    { course: "고3" },
    { format: "주관식" },
    { difficulty: "상" },
    { familyIds: [] },
    { familyIds: ["a", "a"] },
    { requirementIds: [A, A] },
    { requirementIds: ["made-up"] },
    { originalStem: "untrusted" },
    { coefficients: [1, 2] },
    { figureSpec: {} },
  ])("rejects unsupported or source-bearing input %j", (changes) => {
    expect(() => parseExamStudyRequest(request(changes))).toThrow(
      ExamStudyRequestError,
    );
  });
  it("enforces bytes, a closed vocabulary, and normalized defaults", () => {
    expect(() =>
      parseExamStudyRequest(request({ schoolName: "가".repeat(20000) })),
    ).toThrow(/크기/);
    expect(STUDY_REQUIREMENTS.map((r) => r.id)).toEqual([
      ...STUDY_REQUIREMENT_IDS,
    ]);
    expect(
      STUDY_REQUIREMENTS.every(
        (r) =>
          r.concepts.length &&
          r.conditionTopology.length &&
          r.structuralDifficultyBasis.length,
      ),
    ).toBe(true);
    expect(parseExamStudyRequest(request())).toMatchObject({
      format: "혼합",
      maxPerFamily: 1,
    });
  });
  it("rejects unregistered and cross-course family/profile injection", async () => {
    const f = factory("known");
    await expect(
      generateExamStudy(request({ familyIds: ["invented"] }), options([f])),
    ).rejects.toMatchObject({ code: "unknown-family" });
    await expect(
      generateExamStudy(
        request({ course: "중2", familyIds: [f.id] }),
        options([f]),
      ),
    ).rejects.toMatchObject({ code: "family-course-conflict" });
    await expect(
      generateExamStudy(request({ profileId: "missing" }), options([f])),
    ).rejects.toMatchObject({ code: "unknown-profile" });
    await expect(
      generateExamStudy(
        request({ course: "중2", profileId: "p" }),
        options([f], { profiles: [profile("p", [A])] }),
      ),
    ).rejects.toMatchObject({ code: "profile-course-conflict" });
  });
  it("rejects conflicting school attribution and out-of-scope selected demands", async () => {
    const opts = options([factory("f")], { profiles: [profile("p", [A])] });
    await expect(
      generateExamStudy(
        request({ profileId: "p", schoolName: "다른학교" }),
        opts,
      ),
    ).rejects.toMatchObject({ code: "profile-school-conflict" });
    await expect(
      generateExamStudy(request({ profileId: "p", requirementIds: [B] }), opts),
    ).rejects.toMatchObject({ code: "profile-scope-conflict" });
    await expect(
      generateExamStudy(request({ course: "중2", schoolName: "검토중" }), opts),
    ).rejects.toMatchObject({ code: "school-course-unreviewed" });
  });
});

describe("demand planning, evidence and deterministic identity", () => {
  it("counterfactual profiles in the same range select different mathematics", async () => {
    const opts = options(
      [distinctFactory("A", [A]), distinctFactory("B", [B])],
      { profiles: [profile("p-a", [A]), profile("p-b", [B])] },
    );
    const a = await generateExamStudy(request({ profileId: "p-a" }), opts);
    const b = await generateExamStudy(request({ profileId: "p-b" }), opts);
    expect(a.status).toBe("complete");
    expect(b.status).toBe("complete");
    expect(a.questions[0]!.familyId).toBe("A");
    expect(b.questions[0]!.familyId).toBe("B");
    expect(a.questions[0]!.content).not.toBe(b.questions[0]!.content);
  });
  it("school/alias/region/label renaming leaves math, seeds and digest unchanged", async () => {
    const f = factory("f");
    const p = profile("p", [A]);
    const renamed = {
      ...p,
      schoolName: "새 표시 이름",
      aliases: ["새 별칭"],
      region: "새 지역",
      scope: { ...p.scope, label: "새 표시 범위" },
    };
    const a = await generateExamStudy(
      request({ profileId: "p", schoolName: "검토중" }),
      options([f], { profiles: [p] }),
    );
    const b = await generateExamStudy(
      request({ profileId: "p", schoolName: "새 별칭" }),
      options([f], { profiles: [renamed] }),
    );
    expect(a.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(a.digest).toBe(b.digest);
    expect(a.questions).toEqual(b.questions);
    expect(
      (await generateExamStudy(a.recipe, options([f], { profiles: [p] })))
        .digest,
    ).toBe(a.digest);
  });
  it("profile revision and actual demand changes change the pinned digest", async () => {
    const f = factory("f", [A, B]);
    const p = profile("p", [A]);
    const a = await generateExamStudy(
      request({ profileId: "p" }),
      options([f], { profiles: [p] }),
    );
    const b = await generateExamStudy(
      request({ profileId: "p" }),
      options([f], { profiles: [{ ...p, version: "r2" }] }),
    );
    const c = await generateExamStudy(
      request({ profileId: "p" }),
      options([f], { profiles: [profile("p", [B])] }),
    );
    expect(new Set([a.digest, b.digest, c.digest]).size).toBe(3);
  });
  it("maximum matching reallocates a flexible family to avoid greedy starvation", async () => {
    const aOnly = distinctFactory("only-a", [A]);
    const flexible = distinctFactory("flexible", [A, B]);
    const result = await generateExamStudy(
      request({ count: 2, requirementIds: [A, B] }),
      options([flexible, aOnly]),
    );
    expect(result.status).toBe("complete");
    expect(result.requirements.every((r) => r.status === "full")).toBe(true);
    expect(result.questions.map((q) => q.familyId).sort()).toEqual([
      "flexible",
      "only-a",
    ]);
  });
  it("joint demands cannot be declared complete from count alone", async () => {
    const result = await generateExamStudy(
      request({ count: 2, maxPerFamily: 2, requirementIds: [A, B] }),
      options([factory("a", [A])]),
    );
    expect(result.deliveredCount).toBe(2);
    expect(result.status).toBe("partial");
    expect(result.requirements.find((r) => r.id === B)).toMatchObject({
      delivered: 0,
      status: "unavailable",
    });
  });
  it("weights allocate finite quotas jointly with a minimum for every demand", () => {
    const quotas = allocateStudyQuotas(
      [
        { id: A, weight: 3 },
        { id: B, weight: 1 },
        { id: V, weight: 1 },
      ],
      10,
    );
    expect(quotas.map((q) => q.requested)).toEqual([5, 3, 2]);
    expect(
      allocateStudyQuotas(
        [
          { id: A, weight: 1 },
          { id: B, weight: 1 },
        ],
        1,
      ).map((q) => q.requested),
    ).toEqual([1, 1]);
  });
  it("a single task can fulfill several independently verified demands", async () => {
    const result = await generateExamStudy(
      request({ requirementIds: [A, B] }),
      options([factory("bundle", [A, B])]),
    );
    expect(result.status).toBe("complete");
    expect([...result.questions[0]!.requirements].sort()).toEqual(
      [A, B].sort(),
    );
  });
  it.each(["missing", "test", "samples", "boundaries", "checks", "scope"])(
    "lowers declared full with %s evidence gap",
    async (gap) => {
      const f = factory("f");
      if (gap === "missing") f.evidence = undefined;
      else
        f.evidence = {
          ...f.evidence!,
          ...(gap === "test"
            ? { testFile: "report.md" }
            : gap === "samples"
              ? { sampleCount: 0 }
              : gap === "boundaries"
                ? { boundaryCases: [] }
                : gap === "checks"
                  ? { checks: ["independent-solution"] as const }
                  : { checkedRequirements: [B] }),
        };
      const result = await generateExamStudy(
        request({ requirementIds: [A] }),
        options([f]),
      );
      expect(familyCoverage(f, A)).not.toBe("full");
      expect(result.status).toBe("partial");
      expect(result.requirements[0]!.delivered).toBe(0);
    },
  );
  it("requires each actual verifier to pass and carry its claimed checks", async () => {
    const wrong = factory("wrong", [A], {
      verify: () => ({ valid: false, checks: [], errors: ["wrong root"] }),
    });
    const incomplete = factory("incomplete", [A], {
      verify: () => ({
        valid: true,
        checks: ["independent-solution"],
        errors: [],
      }),
    });
    expect(
      (
        await generateExamStudy(
          request({ requirementIds: [A] }),
          options([wrong]),
        )
      ).status,
    ).toBe("unavailable");
    const result = await generateExamStudy(
      request({ requirementIds: [A] }),
      options([incomplete]),
    );
    expect(result.status).toBe("partial");
    expect(result.requirements[0]!.status).toBe("component");
  });
  it("unknown schools use explicitly warned general practice", async () => {
    const result = await generateExamStudy(
      request({ schoolName: "미검토학교", familyIds: ["f"] }),
      options([factory("f", [], { evidence: undefined })]),
    );
    expect(result.profileId).toBeNull();
    expect(result.schoolEvidence).toBeNull();
    expect(result.warnings.join(" ")).toMatch(/일반 범위/);
    expect(result.requirements).toEqual([]);
    expect(result.questions[0]!.requirements).toEqual([]);
  });
});

describe("strict formats, mathematical validation and bounded spaces", () => {
  it("enforces a bare difficulty on actual output, including legacy unknown tiers", async () => {
    const f = factory("f", [A], { difficulties: [] });
    const result = await generateExamStudy(
      request({ difficulty: "심화상", familyIds: [f.id] }),
      options([f]),
    );
    expect(result.status).toBe("unavailable");
    expect(
      (await generateExamStudy(request({ familyIds: [f.id] }), options([f])))
        .questions[0]!.difficulty,
    ).toBe("기본");
  });
  it("derives MC with established conversion while keeping logical/content identities", async () => {
    const f = factory("f");
    const a = await generateExamStudy(
      request({ format: "단답형" }),
      options([f]),
    );
    const b = await generateExamStudy(
      request({ format: "객관식" }),
      options([f]),
    );
    expect(b.questions[0]!.questionType).toBe("객관식");
    expect(b.questions[0]!.logicalKey).toBe(a.questions[0]!.logicalKey);
    expect(b.questions[0]!.contentDigest).toBe(a.questions[0]!.contentDigest);
    expect(b.questions[0]!.content).toContain("⑤");
  });
  it("never manufactures written tasks or relaxes fixed-MC/short-only policies", async () => {
    const f = factory("f", [A], { formats: ["단답형"] });
    expect(
      (await generateExamStudy(request({ format: "객관식" }), options([f])))
        .status,
    ).toBe("unavailable");
    expect(
      (await generateExamStudy(request({ format: "서술형" }), options([f])))
        .status,
    ).toBe("unavailable");
    const mc = factory("mc", [A], {
      formats: ["객관식"],
      generate(seed, variant) {
        const p = f.generate(seed, variant);
        return { ...p, questionType: "객관식" };
      },
    });
    expect(
      (await generateExamStudy(request({ format: "단답형" }), options([mc])))
        .status,
    ).toBe("unavailable");
  });
  it("rejects an MC label without actual choices and valid answer marks", async () => {
    const base = factory("invalid-mc");
    const invalid = factory("invalid-mc", [A], {
      formats: ["객관식"],
      generate(seed, variant) {
        return { ...base.generate(seed, variant), questionType: "객관식" };
      },
    });
    expect(
      (
        await generateExamStudy(
          request({ format: "객관식" }),
          options([invalid]),
        )
      ).status,
    ).toBe("unavailable");
  });
  it("rejects incorrect mathematics even if the generator self-reports success", async () => {
    const base = factory("bad");
    const f = factory("bad", [A], {
      generate(seed, variant) {
        return { ...base.generate(seed, variant), answer: "$999$" };
      },
    });
    expect((await generateExamStudy(request(), options([f]))).status).toBe(
      "unavailable",
    );
  });
  it("does not infer written validity merely from a rubric field", async () => {
    const base = factory("written");
    const f = factory("written", [W], {
      formats: ["서술형"],
      evidence: {
        ...base.evidence!,
        checkedRequirements: [W],
        checks: [
          "independent-solution",
          "essential-conditions",
          "native-rubric",
        ],
      },
      generate(seed, variant) {
        return {
          ...base.generate(seed, variant),
          questionType: "서술형",
          rubric: {
            totalPoints: 10,
            criteria: [
              {
                criterionId: "a",
                points: 3,
                expected: "단위",
                alternatives: ["다른 풀이"],
                errors: ["오류"],
              },
              {
                criterionId: "b",
                points: 3,
                expected: "관계",
                alternatives: ["다른 풀이"],
                errors: ["오류"],
              },
            ],
          },
        };
      },
    });
    expect(
      (
        await generateExamStudy(
          request({ format: "서술형", requirementIds: [W] }),
          options([f]),
        )
      ).status,
    ).toBe("unavailable");
  });
  it("caps families by default and permits explicit distinct-parameter practice", async () => {
    const f = factory("f");
    expect(
      (await generateExamStudy(request({ count: 3 }), options([f])))
        .deliveredCount,
    ).toBe(1);
    const result = await generateExamStudy(
      request({ count: 3, maxPerFamily: 3 }),
      options([f]),
    );
    expect(result.status).toBe("complete");
    expect(new Set(result.questions.map((q) => q.logicalKey)).size).toBe(3);
  });
  it("reports small finite exhaustion without manufacturing seeds/format clones", async () => {
    const spy = vi.fn(factory("f").generate);
    const f = factory("f", [A], { generate: spy });
    const result = await generateExamStudy(
      request({ count: 5, maxPerFamily: 5, requirementIds: [A] }),
      options([f]),
    );
    expect(result.status).toBe("partial");
    expect(result.deliveredCount).toBe(3);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(result.requirements[0]!.requested).toBe(5);
    expect(result.requirements[0]!.delivered).toBe(3);
  });
  it.each([0, -1, Infinity, 361, 1.5])(
    "refuses unsafe sampled retry bounds %s",
    async (maxAttempts) => {
      const f = factory("f", [A], {
        paramDomain: { kind: "sampled", description: "bad", maxAttempts },
      });
      await expect(generateExamStudy(request(), options([f]))).rejects.toThrow(
        /budget/,
      );
    },
  );
  it("validates finite enumerator size, uniqueness, canonical domain and values", async () => {
    await expect(
      generateExamStudy(
        request(),
        options([
          factory("f", [A], {
            paramDomain: {
              kind: "finite",
              size: 2,
              enumerate: () => [{ n: 1 }],
            },
          }),
        ]),
      ),
    ).rejects.toThrow(/size/);
    await expect(
      generateExamStudy(
        request(),
        options([
          factory("f", [A], {
            paramDomain: {
              kind: "finite",
              size: 2,
              enumerate: () => [{ n: 1 }, { n: 1 }],
            },
          }),
        ]),
      ),
    ).rejects.toThrow(/Duplicate/);
    const base = factory("f");
    const outside = factory("f", [A], {
      generate(seed, variant) {
        return { ...base.generate(seed, variant), parameters: { n: 90 } };
      },
    });
    expect(
      (await generateExamStudy(request(), options([outside]))).status,
    ).toBe("unavailable");
    const nonfinite = factory("f", [A], {
      generate(seed, variant) {
        return { ...base.generate(seed, variant), parameters: { n: NaN } };
      },
    });
    expect(
      (await generateExamStudy(request(), options([nonfinite]))).status,
    ).toBe("unavailable");
  });
});

describe("logical/content deduplication and strict visual delivery", () => {
  it("deduplicates aliases, same canonical tuple and identical content with different tuples", async () => {
    const base = factory("base");
    const alias = factory("alias");
    const aliases = await generateExamStudy(
      request({ count: 2 }),
      options([base, alias]),
    );
    expect(new Set(aliases.questions.map((q) => q.contentDigest)).size).toBe(
      aliases.deliveredCount,
    );
    const sameTuple = factory("tuple", [A], {
      canonicalParams: () => ({ n: 2 }),
    });
    expect(
      (
        await generateExamStudy(
          request({ count: 3, maxPerFamily: 3 }),
          options([sameTuple]),
        )
      ).deliveredCount,
    ).toBe(1);
    const sameContent = factory("same-content", [A], {
      generate(seed, variant) {
        return { ...base.generate(seed, 0), parameters: { n: 2 + variant } };
      },
    });
    expect(
      (
        await generateExamStudy(
          request({ count: 3, maxPerFamily: 3 }),
          options([sameContent]),
        )
      ).deliveredCount,
    ).toBe(1);
  });
  it("choice reorder/format twins have one mathematical digest", () => {
    const base = factory("f").generate(1, 0);
    const mc = {
      ...base,
      content: `${base.content}\n① $2$\n② $3$\n③ $4$\n④ $5$\n⑤ $6$`,
      answer: "①",
      questionType: "객관식" as const,
    };
    const reordered = {
      ...mc,
      content: `${base.content}\n① $6$\n② $5$\n③ $4$\n④ $3$\n⑤ $2$`,
      answer: "⑤",
    };
    expect(contentDigest(base)).toBe(contentDigest(mc));
    expect(contentDigest(mc)).toBe(contentDigest(reordered));
    expect(logicalKey({ id: "f", version: "r1" }, { a: 2, b: 3 })).toBe(
      logicalKey({ id: "f", version: "r1" }, { b: 3, a: 2 }),
    );
    expect(stableStringify({ b: -0, a: [1, null] })).toBe(
      '{"a":[1,null],"b":0}',
    );
  });
  it("deduplicates reordered multiple-selection choices and harmless math spacing", () => {
    const base = factory("f").generate(1, 0);
    const multi = {
      ...base,
      content:
        "참인 진술을 모두 고르시오.\n① 양수\n② 음수\n③ 정수\n④ 분수\n⑤ 자연수",
      answer: "①, ③",
      questionType: "객관식" as const,
    };
    const reordered = {
      ...multi,
      content:
        "참인 진술을 모두 고르시오.\n① 자연수\n② 분수\n③ 정수\n④ 음수\n⑤ 양수",
      answer: "③, ⑤",
    };
    expect(contentDigest(multi)).toBe(contentDigest(reordered));
    expect(contentDigest(base)).toBe(
      contentDigest({
        ...base,
        content: base.content.replace("x^2=", "x^2 = "),
      }),
    );
  });
  const visualFactory = () => {
    const base = factory("visual", [V]);
    return factory("visual", [V], {
      representation: "figure-required",
      figureKinds: ["graph-1"],
      evidence: {
        ...base.evidence!,
        checks: [...base.evidence!.checks, "visual-information"],
      },
      generate(seed, variant) {
        return {
          ...base.generate(seed, variant),
          figureSpec: {
            version: "graph-1",
            kind: "graph",
            segments: [
              [0, 1],
              [2, 3],
            ],
            labels: ["A"],
          },
        };
      },
      verify(item) {
        return {
          ...base.verify(item),
          checks: [
            "independent-solution",
            "essential-conditions",
            "visual-information",
          ],
        };
      },
    });
  };
  it("never delivers a figureSpec without actual preparation, even in general mode", async () => {
    const f = visualFactory();
    const scoped = await generateExamStudy(
      request({ requirementIds: [V] }),
      options([f]),
    );
    const general = await generateExamStudy(
      request({ familyIds: [f.id] }),
      options([f]),
    );
    expect(scoped.status).toBe("unavailable");
    expect(scoped.requirements[0]!.status).toBe("unavailable");
    expect(general.questions).toEqual([]);
  });
  it("bounds render retry, refuses empty success, and continues to alternate parameters", async () => {
    const f = visualFactory();
    const fail = vi.fn(async () => ({
      ok: false as const,
      reason: "label omitted",
    }));
    const failed = await generateExamStudy(
      request({ requirementIds: [V] }),
      options([f], { prepare: fail }),
    );
    expect(failed.status).toBe("unavailable");
    expect(fail.mock.calls.length).toBeLessThanOrEqual(
      EXAM_STUDY_LIMITS.maxRenderRetries + 1,
    );
    const empty = await generateExamStudy(
      request(),
      options([f], { prepare: async () => ({ ok: true, figureSvg: null }) }),
    );
    expect(empty.deliveredCount).toBe(0);
    let attempts = 0;
    const recovered = await generateExamStudy(
      request({ count: 2, requirementIds: [V], maxPerFamily: 2 }),
      options([f], {
        prepare: async (item) => {
          attempts++;
          return item.parameters.n === 2
            ? { ok: false, reason: "one parameter fails" }
            : { ok: true, figureSvg: "<svg/>" };
        },
      }),
    );
    expect(
      recovered.questions.every(
        (q) => q.figureSvg === "<svg/>" && q.parameters.n !== 2,
      ),
    ).toBe(true);
    expect(recovered.deliveredCount).toBe(2);
    expect(attempts).toBeLessThanOrEqual(6);
  });
  it("does not substitute a figure-free component for a visual requirement", async () => {
    const f = factory("text-component", [V], { evidence: undefined });
    const result = await generateExamStudy(
      request({ requirementIds: [V] }),
      options([f]),
    );
    expect(result.status).toBe("unavailable");
    expect(result.questions).toEqual([]);
  });
  it("SVG glyph IDs and renderer metadata do not alter content/generation digests", async () => {
    const f = visualFactory();
    const a = await generateExamStudy(
      request({ requirementIds: [V] }),
      options([f], {
        prepare: async () => ({ ok: true, figureSvg: '<svg id="a"/>' }),
      }),
    );
    const b = await generateExamStudy(
      request({ requirementIds: [V] }),
      options([f], {
        prepare: async () => ({ ok: true, figureSvg: '<svg id="b"/>' }),
      }),
    );
    expect(a.status).toBe("complete");
    expect(a.digest).toBe(b.digest);
    expect(a.questions[0]!.contentDigest).toBe(b.questions[0]!.contentDigest);
    const base = f.generate(1, 0);
    expect(
      contentDigest({
        ...base,
        figureSpec: { ...base.figureSpec, rendererId: "first" },
      }),
    ).toBe(
      contentDigest({
        ...base,
        figureSpec: { ...base.figureSpec, rendererId: "second" },
      }),
    );
  });
});

describe("aggregate source profiles", () => {
  it("preserves source year/term/visibility/uncertainty and unmeasured calibration", () => {
    expect(EXAM_STUDY_PROFILES).toHaveLength(5);
    expect(
      EXAM_STUDY_PROFILES.find((p) => p.id === "daeryun-m1")!.scope,
    ).toMatchObject({
      sourceYear: 2025,
      semester: 1,
      round: "기말",
      visibleCount: 19,
      totalCount: 22,
      unknownCount: 3,
      difficultyCalibration: "unmeasured",
    });
    expect(
      EXAM_STUDY_PROFILES.find((p) => p.id === "kyungshin-common2")!.scope,
    ).toMatchObject({ semester: 2, visibleCount: 20, totalCount: 20 });
    for (const p of EXAM_STUDY_PROFILES) {
      expect(Object.keys(p).sort()).toEqual(
        [
          "aliases",
          "course",
          "id",
          "region",
          "requirements",
          "schoolId",
          "schoolName",
          "scope",
          "version",
        ].sort(),
      );
      expect(p.scope.label).not.toMatch(/\d/);
      expect(
        p.requirements.every(
          (r) => STUDY_REQUIREMENT_IDS.includes(r.id) && r.weight === 1,
        ),
      ).toBe(true);
      expect(JSON.stringify(p)).not.toMatch(
        /"(?:sourceNo|coefficient|originalStem|figureSpec|answer|content)":/,
      );
    }
  });
});
