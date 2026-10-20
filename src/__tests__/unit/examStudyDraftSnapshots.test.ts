import { describe, expect, it } from "vitest";
import type { ExamStudyDraft, ExamStudyFamily, ExamStudyGenerateOptions } from "@/contracts/examStudy.contract";
import { generateExamStudy } from "@/lib/examStudy/generate";
import { contentDigest, logicalKey } from "@/lib/examStudy/identity";
import { verifyDraft } from "@/lib/examStudy/evidence";

// Transport controls only: these are not bank questions or grade/rights evidence.
function fixture(mode: "fresh" | "shared" | "nested" = "fresh") {
  let shared: ExamStudyDraft | undefined;
  const terms = [0, 1], points = [[0, 0], [0, 1]];
  const family: ExamStudyFamily = {
    id: "synthetic-transport-sum", version: "1", title: "합성 운송 검사", course: "중2",
    source: "authored", unitIds: [], unitSections: ["합성 운송 검사"],
    fulfills: [{ requirement: "algebra.linear-model", level: "full" }],
    formats: ["단답형", "객관식"], difficulties: ["기본"],
    representation: "figure-required", figureKinds: ["synthetic-transport"],
    paramDomain: { kind: "finite", size: 3, enumerate: () => [1, 2, 3].map(n => ({ n, terms: [n, 1] })) },
    evidence: { testFile: "src/__tests__/unit/examStudyDraftSnapshots.test.ts", sampleCount: 3,
      boundaryCases: ["synthetic finite bounds"], checkedRequirements: ["algebra.linear-model"],
      checks: ["independent-solution", "essential-conditions"] },
    generate(_seed, variant) {
      const n = variant + 1;
      terms[0] = n; points[0]![0] = n;
      const next: ExamStudyDraft = { content: `합성 운송 검사: $${n}+1$의 값은?`,
        answer: String(n + 1), solution: `합성 계산: $${n}+1=${n + 1}$.`,
        difficulty: "기본", difficultyBasis: ["합성 경계 검사"], questionType: "단답형",
        parameters: { n, terms: mode === "nested" ? terms : [n, 1] },
        figureSpec: { kind: "synthetic-transport", geometry: { points: mode === "nested" ? points : [[n, 0], [0, 1]] } },
        distractors: [2, 3, 4, 5].map(d => String(n + d)) };
      if (mode === "shared") { shared ??= next; Object.assign(shared, next); return shared; }
      return next;
    },
    canonicalParams: item => item.parameters,
    verify(item) {
      const printed = /\$(\d+)\+1\$/.exec(item.content);
      const n = printed ? Number(printed[1]) : NaN;
      const p = item.figureSpec?.geometry as { points?: number[][] } | undefined;
      const valid = Number.isSafeInteger(n) && item.answer === String(n + 1) &&
        item.parameters.n === n && (item.parameters.terms as number[])[0] === n && p?.points?.[0]?.[0] === n;
      return { valid, checks: ["independent-solution", "essential-conditions"], errors: valid ? [] : ["printed sum or synthetic figure mismatch"] };
    },
  };
  return family;
}
const request = (family: ExamStudyFamily, count = 2) => ({
  course: family.course, familyIds: [family.id], count, maxPerFamily: count, seed: 71,
});
const purePrepare: NonNullable<ExamStudyGenerateOptions["prepare"]> = async () => ({ ok: true, figureSvg: "<svg/>" });

describe("verified drafts remain independent through the rendering boundary", () => {
  it.each(["fresh", "shared", "nested"] as const)("isolates %s factory references before pooling", async mode => {
    const f = fixture(mode);
    const result = await generateExamStudy(request(f), { families: [f], profiles: [], prepare: purePrepare });
    expect(result.status).toBe("complete");
    expect(new Set(result.questions.map(q => q.content)).size).toBe(2);
    for (const q of result.questions) {
      expect(verifyDraft(f, q).valid).toBe(true);
      expect(q.logicalKey).toBe(logicalKey(f, q.parameters));
      expect(q.contentDigest).toBe(contentDigest(q));
    }
    // The engine must freeze its own copy, allowing a factory to reuse its object.
    expect(() => f.generate(71, 0)).not.toThrow();
  });

  it("detaches a canonicalParams callback's shared return object", async () => {
    const f = fixture(), canonical = { n: 0, terms: [0, 1] };
    f.canonicalParams = item => { canonical.n = Number(item.parameters.n); canonical.terms[0] = canonical.n; return canonical; };
    const result = await generateExamStudy(request(f), { families: [f], profiles: [], prepare: purePrepare });
    expect(result.deliveredCount).toBe(2);
    canonical.n = 100; canonical.terms[0] = 100;
    for (const q of result.questions) {
      expect(q.logicalKey).toBe(logicalKey(f, q.parameters));
      expect(verifyDraft(f, q).valid).toBe(true);
    }
  });

  it("preserves ordered parameter JSON expected by an existing verifier", async () => {
    const f = fixture(), make = f.generate, verify = f.verify;
    f.generate = (seed, variant) => {
      const item = make(seed, variant);
      // Existing native verifiers use JSON comparison, including this order.
      item.parameters = { terms: item.parameters.terms!, n: item.parameters.n! };
      return item;
    };
    f.verify = item => {
      const check = verify(item);
      const n = Number(item.parameters.n);
      const ordered = JSON.stringify(item.parameters) === JSON.stringify({ terms: [n, 1], n });
      return { ...check, valid: check.valid && ordered, errors: ordered ? check.errors : ["existing ordered parameter comparison failed"] };
    };
    const result = await generateExamStudy(request(f), { families: [f], profiles: [], prepare: purePrepare });
    expect(result.status).toBe("complete");
    expect(result.deliveredCount).toBe(2);
    expect(result.questions.every(q => verifyDraft(f, q).valid)).toBe(true);
  });

  const mutations: readonly [string, (item: ExamStudyDraft) => void][] = [
    ["answer", item => { item.answer = "999"; }],
    ["question", item => { item.content = "changed after verification"; }],
    ["solution", item => { item.solution = "changed after verification"; }],
    ["format", item => { item.questionType = "서술형"; }],
    ["difficulty basis", item => { (item.difficultyBasis as string[]).push("changed"); }],
    ["canonical number", item => { (item.parameters as Record<string, unknown>).n = 999; }],
    ["canonical array", item => { (item.parameters.terms as number[])[0] = 999; }],
    ["figure point", item => { (item.figureSpec!.geometry as { points: number[][] }).points[0]![0] = 999; }],
    ["distractor", item => { (item.distractors as string[])[0] = "999"; }],
  ];
  it.each(mutations)("rejects a renderer that writes %s after verification", async (_name, mutate) => {
    const f = fixture();
    const result = await generateExamStudy(request(f), { families: [f], profiles: [], prepare: async item => {
      mutate(item); return { ok: true, figureSvg: "<svg/>" };
    } });
    expect(result.status).toBe("unavailable");
    expect(result.questions).toEqual([]);
  });

  it("also prevents writes after an asynchronous renderer yield", async () => {
    const f = fixture();
    const result = await generateExamStudy(request(f), { families: [f], profiles: [], prepare: async item => {
      await Promise.resolve();
      (item.parameters.terms as number[])[0] = 999;
      return { ok: true, figureSvg: "<svg/>" };
    } });
    expect(result.questions).toEqual([]);
  });

  it("a retained renderer reference cannot change an already returned item", async () => {
    const f = fixture();
    const retained: ExamStudyDraft[] = [];
    const result = await generateExamStudy(request(f), { families: [f], profiles: [], prepare: async item => {
      retained.push(item); return { ok: true, figureSvg: "<svg/>" };
    } });
    expect(retained).toHaveLength(2);
    const before = JSON.stringify(result);
    expect(() => { (retained[0]!.parameters.terms as number[])[0] = 999; }).toThrow(TypeError);
    expect(() => { (retained[0]!.figureSpec!.geometry as { points: number[][] }).points[0]![0] = 999; }).toThrow(TypeError);
    expect(JSON.stringify(result)).toBe(before);
  });

  it("freezes the actual derived multiple-choice draft, not just its short-answer base", async () => {
    const f = fixture();
    const result = await generateExamStudy({ ...request(f), format: "객관식" }, { families: [f], profiles: [], prepare: async item => {
      expect(item.questionType).toBe("객관식");
      item.answer = "⑤";
      return { ok: true, figureSvg: "<svg/>" };
    } });
    expect(result.questions).toEqual([]);
  });

  it("refuses a verifier that rewrites the task instead of checking it", async () => {
    const f = fixture(), originalVerify = f.verify;
    f.verify = item => { item.answer = "999"; return originalVerify({ ...item, answer: String(Number(item.parameters.n) + 1) }); };
    const result = await generateExamStudy(request(f), { families: [f], profiles: [], prepare: purePrepare });
    expect(result.questions).toEqual([]);
  });

  it("pure SVG changes leave mathematical digests and logical identities unchanged", async () => {
    const f = fixture();
    const a = await generateExamStudy(request(f), { families: [f], profiles: [], prepare: purePrepare });
    const b = await generateExamStudy(request(f), { families: [f], profiles: [], prepare: async () => ({ ok: true, figureSvg: '<svg id="other"/>' }) });
    expect(a.digest).toBe(b.digest);
    expect(a.questions.map(q => q.logicalKey)).toEqual(b.questions.map(q => q.logicalKey));
    expect(a.questions.map(q => q.contentDigest)).toEqual(b.questions.map(q => q.contentDigest));
  });
});
