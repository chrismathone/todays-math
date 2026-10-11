// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { DEEPSEEK_MODEL } from "@/lib/ai/client";
import type {
  DbRetryFigures,
  DbRetryOrigin,
} from "@/lib/import/schoolTextbook/dbRetry.types";
import {
  buildDbRetryPrompts,
  DB_RETRY_VISION_MODEL,
  generateDbRetryPair,
  prepareDbRetryInsertion,
  type DbRetryCompletion,
} from "@/lib/import/schoolTextbook/dbRetryGeneration";
import { reviewDigest } from "@/lib/import/schoolTextbook/qualification";
import { textbookVariantSourceDigest } from "@/lib/import/schoolTextbook/variants";

export const retryOrigin: DbRetryOrigin = {
  grade: "공통수학1",
  chapter: "다항식",
  section: "다항식의 계산",
  problem: {
    id: "2ff8fe3f-4b29-408b-bf17-e1d5f92c2a39",
    source: "school_textbook",
    pool: "shared",
    content: "$2+3$을 계산하시오.",
    answer: "$5$",
    solution: "$2+3=5$이다.",
    difficulty: "기본",
    problem_type: "계산",
    question_type: "단답형",
    direct_use_allowed: true,
    review_status: "approved",
    origin_problem_id: null,
    unit_id: "0ff8fe3f-4b29-408b-bf17-e1d5f92c2a39",
    source_material_id: "1ff8fe3f-4b29-408b-bf17-e1d5f92c2a39",
    family_key: "textbook:poly-1",
    external_id: "original-external-1",
    source_file: "books/one.hwpx",
    figure_svg: null,
    figure_urls: [],
    figure_dims: [],
    figure_source_mm: [],
    choice_figure_index: [],
  },
};
export const noRetryFigures: DbRetryFigures = {
  images: [],
  digest: reviewDigest([]),
};
export function retryCompletion(
  slot: number,
  fields: Record<string, unknown> = {},
): DbRetryCompletion {
  return {
    model: DEEPSEEK_MODEL,
    content: JSON.stringify([
      {
        content: `$${slot + 3}+3$을 계산하시오.`,
        answer: `$${slot + 6}$`,
        solution: `$${slot + 3}+3=${slot + 6}$이다.`,
        originalAnswerRecomputed: "$5$",
        ...fields,
      },
    ]),
    finishReason: "stop",
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      reasoningTokens: 5,
      cacheHitTokens: 2,
    },
  };
}
export const retryTransport = () =>
  vi
    .fn()
    .mockResolvedValueOnce(retryCompletion(1))
    .mockResolvedValueOnce(retryCompletion(2));

describe("DB-source generation is a pending draft, not approval", () => {
  it("preserves every parent link, exact slots, source file and immutable source digest", async () => {
    const origin = structuredClone(retryOrigin);
    const before = structuredClone(origin);
    const complete = retryTransport();
    let clock = 1000;
    const pair = await generateDbRetryPair(origin, noRetryFigures, {
      complete,
      now: () => (clock += 100),
    });
    expect(origin).toEqual(before);
    expect(pair.sourceDigest).toBe(textbookVariantSourceDigest(before.problem));
    expect(pair.candidatePayloadDigest).toBe(reviewDigest(pair.candidates));
    expect(pair.mathematicalApproval).toBe(false);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(
      complete.mock.calls.every(
        ([r]) => r.model === DEEPSEEK_MODEL && r.figures.images.length === 0,
      ),
    ).toBe(true);
    for (const candidate of pair.candidates) {
      expect(candidate).toMatchObject({
        sourceId: origin.problem.id,
        originProblemId: origin.problem.id,
        sourceMaterialId: origin.problem.source_material_id,
        sourceFile: origin.problem.source_file,
        familyKey: origin.problem.family_key,
        unitId: origin.problem.unit_id,
      });
      expect(candidate.validation.checks).toContain(
        "mathematical-approval:not-performed",
      );
    }
    expect(pair.candidates.map((c) => [c.slot, c.externalId])).toEqual([
      [1, `tb-retry-v1:${origin.problem.id}:1`],
      [2, `tb-retry-v1:${origin.problem.id}:2`],
    ]);
    expect(pair.calls).toHaveLength(2);
    expect(pair.calls[0]).toMatchObject({
      model: DEEPSEEK_MODEL,
      requestedModel: DEEPSEEK_MODEL,
      latencyMs: 100,
      usage: { totalTokens: 30, reasoningTokens: 5, cacheHitTokens: 2 },
    });
    expect(
      prepareDbRetryInsertion(origin, pair.candidates).every(
        (r) =>
          r.reviewStatus === "pending" &&
          r.directUseAllowed === false &&
          r.sourceFile === origin.problem.source_file,
      ),
    ).toBe(true);
  });
  it.each(["중1", "대수", "공통수학2", "미적분1", "기하", "확률과 통계"])(
    "uses actual grade %s and original question format",
    (grade) => {
      const prompts = buildDbRetryPrompts(
        { ...retryOrigin, grade },
        1,
        noRetryFigures,
      );
      expect(prompts.system).toContain(`한국 ${grade} 수학`);
      expect(prompts.system).not.toContain("한국 중학교 수학");
      expect(prompts.prompt).toContain(retryOrigin.section);
      expect(prompts.prompt).toContain("단답형 그대로");
    },
  );
  it("retains a reproduction mismatch and a wrong worked solution without claiming approval", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(
        retryCompletion(1, {
          originalAnswerRecomputed: "$99$",
          solution: "$4+3=8$이다.",
        }),
      )
      .mockResolvedValueOnce(retryCompletion(2));
    const pair = await generateDbRetryPair(retryOrigin, noRetryFigures, {
      complete,
    });
    expect(pair.candidates[0].validation.checks).toContain(
      "generator-self-reproduction:mismatched",
    );
    expect(pair.candidates[0].solution).toContain("4+3=8");
    expect(pair.mathematicalApproval).toBe(false);
    expect(
      prepareDbRetryInsertion(retryOrigin, pair.candidates)[0]!.reviewStatus,
    ).toBe("pending");
  });
  it.each([
    "answer",
    "content",
    "source_file",
    "unit_id",
    "family_key",
    "updated_at",
  ])("rejects changed source %s using the captured digest", async (field) => {
    const pair = await generateDbRetryPair(retryOrigin, noRetryFigures, {
      complete: retryTransport(),
    });
    expect(() =>
      prepareDbRetryInsertion(
        {
          ...retryOrigin,
          problem: { ...retryOrigin.problem, [field]: "changed" },
        },
        pair.candidates,
      ),
    ).toThrow("source-digest-changed");
  });
  it("rejects candidate metadata mutation and duplicate or incomplete pairs", async () => {
    const pair = await generateDbRetryPair(retryOrigin, noRetryFigures, {
      complete: retryTransport(),
    });
    expect(() =>
      prepareDbRetryInsertion(retryOrigin, [
        { ...pair.candidates[0], familyKey: "other" },
        pair.candidates[1],
      ]),
    ).toThrow("candidate-provenance-changed");
    expect(() =>
      prepareDbRetryInsertion(retryOrigin, [pair.candidates[0]]),
    ).toThrow();
    expect(() =>
      prepareDbRetryInsertion(retryOrigin, [
        pair.candidates[0],
        pair.candidates[0],
      ]),
    ).toThrow();
  });
  it("retries a parse failure once, retains both call usages, and never uses reasoning as final output", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({
        ...retryCompletion(1),
        content: "this is reasoning",
      })
      .mockResolvedValueOnce(retryCompletion(1))
      .mockResolvedValueOnce(retryCompletion(2));
    const pair = await generateDbRetryPair(retryOrigin, noRetryFigures, {
      complete,
    });
    expect(pair.calls.map((c) => [c.slot, c.attempt])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
    ]);
    expect(pair.calls.reduce((n, c) => n + c.usage!.totalTokens, 0)).toBe(90);
  });
  it("does not retry a truncated answer, and keeps paid usage on failure", async () => {
    const complete = vi
      .fn()
      .mockResolvedValue({ ...retryCompletion(1), finishReason: "length" });
    await expect(
      generateDbRetryPair(retryOrigin, noRetryFigures, { complete }),
    ).rejects.toMatchObject({
      code: "generation-truncated",
      calls: [{ usage: { totalTokens: 30 } }],
    });
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it("sanitizes transport errors and does not retry them", async () => {
    const complete = vi
      .fn()
      .mockRejectedValue(
        new Error("SECRET_KEY https://private/db data:image/png;base64,AAA"),
      );
    await expect(
      generateDbRetryPair(retryOrigin, noRetryFigures, { complete }),
    ).rejects.toMatchObject({
      message: "generation-transport",
      calls: [{ status: "transport-failed", usage: null }],
    });
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it("detects source mutation during an asynchronous provider call", async () => {
    const origin = structuredClone(retryOrigin);
    let calls = 0;
    const complete = vi.fn().mockImplementation(async () => {
      origin.problem.answer = "$8$";
      return retryCompletion(++calls);
    });
    await expect(
      generateDbRetryPair(origin, noRetryFigures, { complete }),
    ).rejects.toMatchObject({ code: "source-mutated-during-generation" });
  });
  it("blocks held sources and missing DB figures before any paid call", async () => {
    const complete = retryTransport();
    await expect(
      generateDbRetryPair(
        {
          ...retryOrigin,
          problem: { ...retryOrigin.problem, direct_use_allowed: false },
        },
        noRetryFigures,
        { complete },
      ),
    ).rejects.toThrow("source-held");
    await expect(
      generateDbRetryPair(
        {
          ...retryOrigin,
          problem: {
            ...retryOrigin.problem,
            figure_urls: ["/figures/source.png"],
          },
        },
        noRetryFigures,
        { complete },
      ),
    ).rejects.toThrow("source-figure-missing");
    expect(complete).not.toHaveBeenCalled();
  });
  it("passes actual DB bytes and choice order to Flash and requires two newly rendered diagrams", async () => {
    const raw = Buffer.from("actual-read-image-bytes");
    const image = {
      dataUrl: `data:image/png;base64,${raw.toString("base64")}`,
      sha256: createHash("sha256").update(raw).digest("hex"),
      choiceIndex: 2,
      origin: "database-raster" as const,
    };
    const figures = {
      images: [image],
      digest: reviewDigest([
        {
          sha256: image.sha256,
          choiceIndex: 2,
          origin: image.origin,
          sourceSha256: null,
        },
      ]),
    };
    const origin = {
      ...retryOrigin,
      problem: {
        ...retryOrigin.problem,
        figure_urls: ["/figures/actual.png"],
        figure_dims: [10, 10],
        figure_source_mm: [30],
        choice_figure_index: [2],
      },
    };
    const complete = vi
      .fn()
      .mockResolvedValueOnce(
        retryCompletion(1, {
          content: "[그림] $4+3$을 계산하시오.",
          figureSpec: { version: 2 },
        }),
      )
      .mockResolvedValueOnce(
        retryCompletion(2, {
          content: "[그림] $5+3$을 계산하시오.",
          figureSpec: { version: 2 },
        }),
      );
    const renderFigure = vi
      .fn()
      .mockResolvedValue({
        svg: '<svg viewBox="0 0 100 100"><line x1="0" y1="0" x2="50" y2="50"/></svg>',
        figures: {
          images: [{ ...image, origin: "generated-svg" }],
          digest: "generated",
        },
      });
    const pair = await generateDbRetryPair(origin, figures, {
      complete,
      renderFigure,
    });
    expect(complete.mock.calls[0]![0]).toMatchObject({
      model: DB_RETRY_VISION_MODEL,
      figures,
    });
    expect(complete.mock.calls[0]![0].prompt).toContain(
      "원본 그림을 직접 보고",
    );
    expect(renderFigure).toHaveBeenCalledTimes(2);
    expect(
      pair.candidates.every((c) => c.figureSvg && !c.figureUrls.length),
    ).toBe(true);
    const noSpec = vi
      .fn()
      .mockResolvedValue(retryCompletion(1, { figureSpec: null }));
    await expect(
      generateDbRetryPair(origin, figures, { complete: noSpec, renderFigure }),
    ).rejects.toThrow("candidate-figure-spec-missing");
    await expect(
      generateDbRetryPair(origin, { ...figures, digest: "fake" }, { complete }),
    ).rejects.toThrow("source-figure-digest-mismatch");
    await expect(
      generateDbRetryPair(
        origin,
        { ...figures, images: [{ ...image, sha256: "fake" }] },
        { complete },
      ),
    ).rejects.toThrow("source-figure-hash-mismatch");
  });
});
