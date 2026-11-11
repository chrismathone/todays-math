// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CLAUDE_DEFAULT_MODEL, CLAUDE_HARD_MODEL } from "@/lib/ai/claudeModels";
import type {
  DbRetryFigures,
  DbRetryOrigin,
} from "@/lib/import/schoolTextbook/dbRetry.types";
import {
  buildDbRetryPrompts,
  completeDbRetry,
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
    model: CLAUDE_DEFAULT_MODEL,
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
  it("records an insufficient-balance status without provider bodies or credentials", async () => {
    const error = Object.assign(new Error("SECRET_PROVIDER_HEADERS"), {
      status: 402,
    });
    try {
      await generateDbRetryPair(retryOrigin, noRetryFigures, {
        complete: async () => {
          throw error;
        },
      });
      throw new Error("expected failure");
    } catch (caught) {
      expect(caught).toMatchObject({
        code: "provider-balance-insufficient",
        calls: [{ httpStatus: 402, status: "transport-failed" }],
      });
      expect(JSON.stringify(caught)).not.toContain("SECRET_PROVIDER_HEADERS");
    }
  });
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
        ([r]) =>
          r.model === CLAUDE_DEFAULT_MODEL && r.figures.images.length === 0,
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
      model: CLAUDE_DEFAULT_MODEL,
      requestedModel: CLAUDE_DEFAULT_MODEL,
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
    const renderFigure = vi.fn().mockResolvedValue({
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
      // 그림이 있어도 같은 모델이다(Claude 는 글 · 그림을 한 모델이 읽는다 — 원장님 2026-11-11)
      model: CLAUDE_DEFAULT_MODEL,
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

describe("DB 재시도 생성의 모델 — Claude Sonnet 5.5 · 심화상 Opus 5.5 (원장님 2026-11-11)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("원문이 심화상이면 Opus 5.5 로 부른다", async () => {
    const origin = structuredClone(retryOrigin);
    origin.problem.difficulty = "심화상";
    const complete = retryTransport();
    await generateDbRetryPair(origin, noRetryFigures, { complete });
    expect(complete.mock.calls.map(([r]) => r.model)).toEqual([
      CLAUDE_HARD_MODEL,
      CLAUDE_HARD_MODEL,
    ]);
  });

  it("전송은 Messages API 한 번 — 그림은 base64 블록, effort 를 싣고 temperature 는 없다, 끝난 까닭을 옮긴다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("TEXTBOOK_RETRY_MAX_TOKENS", "");
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        return new Response(
          JSON.stringify({
            model: CLAUDE_HARD_MODEL,
            stop_reason: bodies.length === 1 ? "end_turn" : "max_tokens",
            content: [
              { type: "thinking", thinking: "", signature: "s" },
              { type: "text", text: "[]" },
            ],
            usage: { input_tokens: 7, output_tokens: 11 },
          }),
          { status: 200 },
        );
      }),
    );
    const request = {
      model: CLAUDE_HARD_MODEL,
      system: "지시",
      prompt: "요청",
      figures: {
        images: [
          {
            dataUrl: "data:image/png;base64,YWJj",
            sha256: "x",
            choiceIndex: 2,
            origin: "database-raster",
          },
        ],
        digest: "d",
      } as unknown as DbRetryFigures,
    };
    const first = await completeDbRetry(request);
    expect(first).toEqual({
      content: "[]",
      model: CLAUDE_HARD_MODEL,
      finishReason: "stop",
      usage: { promptTokens: 7, completionTokens: 11, totalTokens: 18 },
    });
    const body = bodies[0] as {
      model: string;
      system: string;
      max_tokens: number;
      output_config: { effort: string };
      messages: { content: { type: string }[] }[];
    };
    expect(body.model).toBe(CLAUDE_HARD_MODEL);
    expect(body.system).toBe("지시");
    expect(body.max_tokens).toBe(64000);
    expect(body.output_config).toEqual({ effort: "high" });
    expect(body).not.toHaveProperty("temperature");
    expect(body.messages[0]!.content).toEqual([
      { type: "text", text: "요청" },
      { type: "text", text: "DB 그림 1, 보기 2" },
      {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: "YWJj" },
      },
    ]);
    // 한도에서 잘린 것은 이 도구의 말로 "length" — 생성기가 generation-truncated 로 멈춘다
    expect((await completeDbRetry(request)).finishReason).toBe("length");
  });

  it("ANTHROPIC_API_KEY 가 없으면 부르지 않는다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      completeDbRetry({
        model: CLAUDE_DEFAULT_MODEL,
        system: "",
        prompt: "",
        figures: noRetryFigures,
      }),
    ).rejects.toMatchObject({ code: "anthropic-key-missing" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
