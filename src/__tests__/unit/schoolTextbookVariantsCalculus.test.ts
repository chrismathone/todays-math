import { describe, expect, it } from "vitest";
import recovered from "../../../docs/planning/tracks/reports/textbook-variants-calculus-20261011/recovered-sources.json";
import corpus from "../../../docs/planning/tracks/reports/textbook-variants-calculus-20261011/census/candidates.json";
import {
  generateTextbookCalculusPair,
  validateTextbookCalculusPair,
  type TextbookCalculusCandidate,
} from "@/lib/import/schoolTextbook/variantsCalculus";
import {
  textbookVariantSourceDigest,
  type TextbookVariantSource,
} from "@/lib/import/schoolTextbook/variants";

const sources = recovered as TextbookVariantSource[];
const actualSources = corpus.sources as TextbookVariantSource[];
const byExternal = (id: string) =>
  sources.find((source) => source.external_id === id)!;
function pair(
  source: TextbookVariantSource,
): [TextbookCalculusCandidate, TextbookCalculusCandidate] {
  const result = generateTextbookCalculusPair(source);
  expect(result.status, JSON.stringify(result)).toBe("matched");
  if (result.status !== "matched") throw new Error(result.reason);
  return result.candidates;
}
function reason(source: TextbookVariantSource, expected: string) {
  const result = generateTextbookCalculusPair(source);
  expect(result.status).toBe("unresolved");
  if (result.status === "unresolved") expect(result.reason).toBe(expected);
}

describe("calculus drafting against the twenty acquired, unpromoted originals", () => {
  it.each(sources.map((source) => [source.external_id, source] as const))(
    "drafts exactly two for %s while preserving actual pending fields",
    (_, source) => {
      const before = structuredClone(source),
        candidates = pair(source);
      expect(candidates).toHaveLength(2);
      expect(candidates.map((c) => c.slot)).toEqual([1, 2]);
      expect(new Set(candidates.map((c) => c.content)).size).toBe(2);
      expect(candidates.every((c) => c.content !== source.content)).toBe(true);
      expect(source).toEqual(before);
      expect(source.direct_use_allowed).toBe(false);
      expect(source.review_status).toBe("pending");
      for (const candidate of candidates) {
        expect(candidate.sourceDigest).toBe(
          textbookVariantSourceDigest(before),
        );
        expect(candidate.originProblemId).toBe(source.id);
        expect(candidate.externalId).toBe(
          `tb-retry-v1:${source.id}:${candidate.slot}`,
        );
        expect(candidate.questionType).toBe(source.question_type);
        expect(candidate.figureUrls).toEqual([]);
        expect(candidate.solution.length).toBeGreaterThan(70);
        expect(candidate.validation.checks).toContain(
          "pending-draft-no-review-promotion",
        );
      }
      expect(validateTextbookCalculusPair(source, candidates)).toEqual({
        valid: true,
        issues: [],
      });
      expect(pair(source)).toEqual(candidates);
    },
  );
  it("uses real UUIDs and digests for every covered source in the complete 12,301-original census", () => {
    expect(actualSources).toHaveLength(27);
    expect(
      actualSources.filter((s) =>
        sources.some((row) => row.external_id === s.external_id),
      ),
    ).toHaveLength(20);
    for (const source of actualSources) {
      expect(source.id).toMatch(/^[0-9a-f-]{36}$/);
      const candidates = pair(source);
      expect(validateTextbookCalculusPair(source, candidates).valid).toBe(true);
      expect(candidates).toEqual(
        corpus.candidates.filter((c) => c.sourceId === source.id),
      );
    }
  });
  it("rejects a false source answer in every template rather than reusing a provided answer", () => {
    for (const source of sources)
      expect(
        generateTextbookCalculusPair({ ...source, answer: "$999$" }).status,
      ).toBe("unresolved");
  });
  it("preserves every multipart tangent contact, including both cubic tangents", () => {
    const candidates = pair(byExternal("tb-f84c254aaee88ed5-0-2"));
    expect(candidates[0].answer).toBe(
      "⑴ $y=6x-8$ ⑵ $y=6x+2$ 또는 $y=6x-\\frac{46}{9}$",
    );
    expect(candidates[1].validation.computedAnswers).toHaveLength(3);
    expect(candidates[0].solution).toContain("⑵ ");
    reason(
      {
        ...byExternal("tb-f84c254aaee88ed5-0-2"),
        answer: "⑴ $y=3x-1$ ⑵ $y=3x+4$",
      },
      "source-answer-shape",
    );
  });
  it("keeps MVT k=1/2 invariant while varying the quadratic and recalculating the proof", () => {
    const [candidate] = pair(byExternal("tb-5e59c02795c04cf9-0-4"));
    expect(candidate.answer).toBe("$\\frac{1}{2}$");
    expect(candidate.content).toContain("f(x)=6x^{2}-10x+6");
    expect(candidate.solution).toContain("h>0");
  });
});

describe("all authored fields are bound to the current source", () => {
  it("rejects tampering in every candidate field, including solution and validation proof", () => {
    const source = sources[0]!,
      original = pair(source);
    for (const field of Object.keys(
      original[0],
    ) as (keyof TextbookCalculusCandidate)[]) {
      const changed = structuredClone(original);
      const current = changed[0][field];
      (changed[0] as unknown as Record<string, unknown>)[field] =
        typeof current === "string"
          ? current + "tamper"
          : typeof current === "number"
            ? 99
            : { tamper: true };
      expect(validateTextbookCalculusPair(source, changed).valid, field).toBe(
        false,
      );
    }
  });
  it("invalidates source approval, direct-use flags, update times and extra fields without rewriting them", () => {
    const source = sources[0]!,
      candidates = pair(source);
    for (const patch of [
      { review_status: "approved" },
      { direct_use_allowed: true },
      { updated_at: "2026-10-12T00:00:00Z" },
      { solution: "updated source solution" },
      { source_material_id: "changed" },
      { unit_id: "changed" },
      { family_key: "changed" },
      { external_id: "changed" },
      { source_file: "changed.hwp" },
      { new_source_field: 1 },
    ]) {
      const next = { ...source, ...patch };
      expect(validateTextbookCalculusPair(next, candidates).issues).toContain(
        "source-provenance-or-digest-mismatch",
      );
    }
    const approved = {
      ...source,
      review_status: "approved",
      direct_use_allowed: true,
    };
    const fresh = pair(approved);
    expect(fresh[0].sourceDigest).not.toBe(candidates[0].sourceDigest);
    expect(approved.direct_use_allowed).toBe(true);
  });
  it("rejects missing slots, swaps, copies, duplicate questions and a forged source ID", () => {
    const source = sources[0]!,
      candidates = pair(source);
    for (const altered of [
      [candidates[0]],
      [candidates[1], candidates[0]],
      [candidates[0], candidates[0]],
      [{ ...candidates[0], sourceId: "other" }, candidates[1]],
      [{ ...candidates[0], content: source.content }, candidates[1]],
    ])
      expect(validateTextbookCalculusPair(source, altered).valid).toBe(false);
  });
  it("never falls back to a random same-unit question or copies a diagram", () => {
    const source = sources[0]!;
    reason(
      { ...source, content: source.content + " 추가 조건도 증명하시오." },
      "no-exact-calculus-template",
    );
    reason(
      { ...source, figure_urls: ["source-raster.png"] },
      "figure-dependent",
    );
    reason({ ...source, source: "transformed" }, "not-textbook-original");
    reason({ ...source, origin_problem_id: "parent" }, "not-textbook-original");
    reason(
      { ...source, review_status: "rejected" },
      "source-review-state-unsupported",
    );
    reason(
      { ...source, question_type: "객관식" },
      "unsupported-calculus-question-format",
    );
  });
});

describe("contact, root and physical domains are checked", () => {
  it("rejects a stated point off its curve and a slope having no real contact", () => {
    reason(
      {
        ...sources[0]!,
        content: sources[0]!.content.replace("(2,~8)", "(2,~9)"),
      },
      "source-point-off-curve",
    );
    reason(
      {
        ...sources[0]!,
        content:
          "곡선 $y=x^{3}+x$에 접하고 기울기가 $-1$인 접선의 방정식을 구하시오.",
        answer: "$y=-x$",
      },
      "no-real-contact",
    );
  });
  it("includes an exact repeated derivative root rather than claiming no contact", () => {
    const source = {
      ...sources[0]!,
      content:
        "곡선 $y=x^{3}+1$에 접하고 기울기가 $0$인 접선의 방정식을 구하시오.",
      answer: "$y=1$",
    };
    expect(pair(source)[0].answer).toBe("$y=2$");
  });
  it("rejects an open interval straddling the quadratic vertex", () => {
    const source = byExternal("tb-beba382c1b0cc7fd-0-4");
    reason(
      { ...source, content: source.content.replace("(1,~3)", "(-2,~3)") },
      "interval-not-monotone",
    );
  });
  it("requires a genuine cubic local maximum and the correct difference-quotient denominator", () => {
    const source = byExternal("tb-ccfc7256c368fb59-0-5");
    reason(
      { ...source, content: source.content.replace("=9$", "=30$") },
      "local-maximum-or-limit-failed",
    );
    reason(
      { ...source, content: source.content.replace("{x-1}", "{x-2}") },
      "limit-denominator-not-x-minus-point",
    );
  });
  it("checks all quartic critical points and both endpoints", () => {
    const source = byExternal("tb-31300a3c654d244c-0-2"),
      [candidate] = pair(source);
    expect(candidate.answer).toBe("$54$");
    expect(candidate.solution).toContain("f(0)=54");
    expect(candidate.solution).toContain("f(1)=0");
    expect(candidate.solution).toContain("f(3)=48");
  });
  it("requires a consistent integral basepoint and a nonzero continuity factor", () => {
    const integral = byExternal("tb-1f59f8726f20495b-0-2");
    reason(
      {
        ...integral,
        content: integral.content.replace("x^{3}-3x+2", "x^{3}-3x+3"),
      },
      "integral-basepoint-inconsistent",
    );
    const continuous = byExternal("tb-855f74a7a4c95fd5-0-6");
    reason(
      {
        ...continuous,
        content: continuous.content.replace("x^{2}+5x+6", "x^{2}+6x+9"),
      },
      "zero-limit-factor",
    );
  });
  it("rejects braking with positive acceleration and wrong reverse bounds", () => {
    const braking = byExternal("tb-8f346039a6d28ad3-0-10");
    reason(
      {
        ...braking,
        content: braking.content.replace("80t-8t^{2}", "80t+8t^{2}"),
      },
      "braking-domain-shape",
    );
    const integral = byExternal("tb-6ecb67c37ab48c18-0-4");
    reason(
      {
        ...integral,
        content: integral.content.replace("_{3}^{1}", "_{3}^{2}"),
      },
      "bounds-not-reversed",
    );
  });
});
