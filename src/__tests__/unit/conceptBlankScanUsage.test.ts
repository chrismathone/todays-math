// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createScanModel,
  scanConfig,
  scanReservation,
} from "@/lib/concept-blank/scan/model";
import {
  createMemoryScanUsageStore,
  scanTokenCostNanoUsd,
} from "@/lib/concept-blank/scan/usage";
import { runModelApi } from "@/lib/studio-ai/api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const request = {
  operation: "read" as const,
  prompt: "one page",
  signal: new AbortController().signal,
};
const usage = {
  inputTokens: 100,
  outputTokens: 20,
  cachedInputTokens: 5,
  cacheCreationInputTokens: 3,
};

describe("scan config, paid API boundary and usage", () => {
  it("recovers a durable v2 grade before dispatching the corresponding v3 job", async () => {
    const store = createMemoryScanUsageStore();
    const transport = vi
      .fn<typeof runModelApi>()
      .mockImplementation(async (options) => {
        options.onAnthropicUsage?.(usage);
        return "cached v2 grade";
      });
    const model = createScanModel({
      store,
      transport,
      requestKey: "same-original-grade-evidence",
    });
    const v2 = {
      ...request,
      operation: "grade" as const,
      promptVersion: "v2",
      jsonSchema: { type: "object" },
    };
    expect(await model(v2)).toBe("cached v2 grade");
    const onRecovered = vi.fn();
    expect(
      await model({
        ...v2,
        prompt: "v3 request",
        promptVersion: "v3",
        recover: { ...v2, onRecovered },
      }),
    ).toBe("cached v2 grade");
    expect(onRecovered).toHaveBeenCalledOnce();
    expect(transport).toHaveBeenCalledOnce();
  });
  it("defaults to Opus high, allows separate grade model, and fails closed for invalid settings", () => {
    expect(scanConfig({})).toMatchObject({
      model: "claude-opus-5-5",
      gradeModel: "claude-opus-5-5",
      effort: "high",
      monthlyUsdCap: 100,
      enabled: true,
    });
    expect(
      scanConfig({ CONCEPT_BLANK_SCAN_GRADE_MODEL: "claude-haiku-5-5" })
        .gradeModel,
    ).toBe("claude-haiku-5-5");
    expect(scanConfig({ CONCEPT_BLANK_SCAN_ENABLED: "off" }).enabled).toBe(
      false,
    );
    expect(scanConfig({ CONCEPT_BLANK_SCAN_ENABLED: "typo" }).enabled).toBe(
      false,
    );
    expect(() =>
      scanConfig({ CONCEPT_BLANK_SCAN_MONTHLY_USD_CAP: "NaN" }),
    ).toThrow();
    expect(() => scanConfig({ CONCEPT_BLANK_SCAN_EFFORT: "turbo" })).toThrow();
    expect(() =>
      scanConfig({ CONCEPT_BLANK_SCAN_MODEL: "unpriced-model" }),
    ).toThrow();
  });

  it("never calls the real API under tests, even with a key and enabled env", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-key-must-not-leave-test");
    vi.stubEnv("CONCEPT_BLANK_SCAN_ENABLED", "on");
    const fetch = vi.fn().mockRejectedValue(new Error("network forbidden"));
    vi.stubGlobal("fetch", fetch);
    const call = createScanModel({ store: createMemoryScanUsageStore() });
    await expect(call(request)).rejects.toThrow(/시험|test/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("replays a durable job result without another dispatch and binds replay to its exact inputs", async () => {
    const store = createMemoryScanUsageStore();
    const transport = vi
      .fn<typeof runModelApi>()
      .mockImplementation(async (input) => {
        input.onAnthropicUsage?.(usage);
        return "saved result";
      });
    const deps = { store, transport, requestKey: "submission-photo-read-v1" };
    expect(await createScanModel(deps)(request)).toBe("saved result");
    expect(await createScanModel(deps)(request)).toBe("saved result");
    expect(transport).toHaveBeenCalledTimes(1);
    await createScanModel(deps)({
      ...request,
      prompt: "different page content",
    });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("never dispatches when remaining money is below actual-request plus maximum-output reservation", async () => {
    const transport = vi.fn<typeof runModelApi>();
    const call = createScanModel({
      store: createMemoryScanUsageStore(),
      transport,
      config: scanConfig({
        CONCEPT_BLANK_SCAN_MONTHLY_USD_CAP: String(
          ((await scanReservation("claude-opus-5-5", request)).reservedNanoUsd -
            1) /
            1e9,
        ),
      }),
    });
    await expect(call(request)).rejects.toThrow(/예약액/);
    expect(transport).not.toHaveBeenCalled();
  });

  it("counts actual input/cache/output tokens without adding thinking twice", () => {
    expect(scanTokenCostNanoUsd("claude-opus-5-5", usage)).toBe(832_000);
    expect(() =>
      scanTokenCostNanoUsd("claude-opus-5-5", { ...usage, outputTokens: -1 }),
    ).toThrow();
  });

  it.each(["end_turn", "max_tokens", "refusal"])(
    "accounts real adapter usage on %s, with mocked fetch only",
    async (stopReason) => {
      vi.stubEnv("ANTHROPIC_API_KEY", "fake-test-key");
      const fetch = vi.fn().mockResolvedValue(
        Response.json({
          stop_reason: stopReason,
          content: [{ type: "text", text: '{"slots":[]}' }],
          usage: {
            input_tokens: 100,
            output_tokens: 20,
            cache_read_input_tokens: 5,
            cache_creation_input_tokens: 3,
          },
        }),
      );
      vi.stubGlobal("fetch", fetch);
      const store = createMemoryScanUsageStore();
      const call = createScanModel({
        store,
        transport: runModelApi,
        now: () => new Date("2026-11-25T00:00:00Z"),
      });
      if (stopReason === "end_turn")
        await expect(call(request)).resolves.toBe('{"slots":[]}');
      else await expect(call(request)).rejects.toThrow();
      expect(await store.inspect("2026-11")).toEqual({
        spentNanoUsd: 832_000,
        reservedNanoUsd: 0,
        busy: false,
        unresolved: false,
        activeCalls: 0,
        queuedCalls: 0,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetch.mock.calls[0]![1].body);
      expect(body.output_config.effort).toBe("high");
      expect(body.model).toBe("claude-opus-5-5");
      expect(body.max_tokens).toBe(16_000);
      expect(body.messages).toEqual([
        { role: "user", content: [{ type: "text", text: request.prompt }] },
      ]);
      expect(body.system).toBeUndefined();
      expect(body.tools).toBeUndefined();
    },
  );

  it("routes grading separately and charges the bound on malformed token evidence", async () => {
    const store = createMemoryScanUsageStore();
    const transport = vi
      .fn<typeof runModelApi>()
      .mockImplementation(async (input) => {
        input.onAnthropicUsage?.({ ...usage, inputTokens: null });
        return "valid text but unknown cost";
      });
    const call = createScanModel({
      store,
      transport,
      config: scanConfig({
        CONCEPT_BLANK_SCAN_GRADE_MODEL: "claude-haiku-5-5",
      }),
      now: () => new Date("2026-11-25T00:00:00Z"),
    });
    await expect(call({ ...request, operation: "grade" })).rejects.toThrow(
      /사용량/,
    );
    expect(transport.mock.calls[0]![0].model).toBe("claude-haiku-5-5");
    expect(await store.inspect("2026-11")).toMatchObject({
      unresolved: false,
      reservedNanoUsd: 0,
      spentNanoUsd: (await scanReservation("claude-haiku-5-5", request))
        .reservedNanoUsd,
    });
  });

  it("settles the admission month at rollover, rejects double settlements and reopens a new month", async () => {
    const store = createMemoryScanUsageStore();
    const nov = await store.begin("2026-11", 20, {
      reservedNanoUsd: 20,
      requestKey: "nov",
      operation: "read",
      model: "claude-opus-5-5",
      promptVersion: "test",
    });
    const dec = await store.begin("2026-12", 20, {
      reservedNanoUsd: 20,
      requestKey: "dec",
      operation: "read",
      model: "claude-opus-5-5",
      promptVersion: "test",
    });
    await store.settle(nov, 20);
    await expect(store.settle(nov, 20)).rejects.toThrow();
    await store.settle(dec, 0);
    expect(await store.inspect("2026-11")).toMatchObject({ spentNanoUsd: 20 });
    expect(await store.inspect("2026-12")).toMatchObject({ spentNanoUsd: 0 });
    await expect(
      store.begin("2026-11", 20, {
        reservedNanoUsd: 1,
        requestKey: "nov-next",
        operation: "read",
        model: "claude-opus-5-5",
        promptVersion: "test",
      }),
    ).rejects.toThrow(/상한/);
    await expect(
      store.begin("2026-12", 20, {
        reservedNanoUsd: 1,
        requestKey: "dec-next",
        operation: "read",
        model: "claude-opus-5-5",
        promptVersion: "test",
      }),
    ).resolves.toHaveProperty("token");
  });

  it("serializes admission across model instances so concurrent requests cannot slip past the cap", async () => {
    const store = createMemoryScanUsageStore();
    const now = () => new Date("2026-11-25T00:00:00Z");
    let finish!: () => void;
    const transport = vi
      .fn<typeof runModelApi>()
      .mockImplementation(async (input) => {
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        input.onAnthropicUsage?.(usage);
        return '{"slots":[]}';
      });
    const config = scanConfig({
      CONCEPT_BLANK_SCAN_MONTHLY_USD_CAP: String(
        ((await scanReservation("claude-opus-5-5", request)).reservedNanoUsd +
          831_999) /
          1e9,
      ),
    });
    const first = createScanModel({ store, now, config, transport });
    const second = createScanModel({ store, now, config, transport });
    const pending = first(request);
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
    await expect(second({ ...request, operation: "grade" })).rejects.toThrow(
      /상한/,
    );
    finish();
    await pending;
    expect(await store.inspect("2026-11")).toMatchObject({
      spentNanoUsd: 832_000,
      busy: false,
      unresolved: false,
    });
    await expect(second(request)).rejects.toThrow(/월.*상한/);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("charges malformed/truncated output too, uses one attempt and forwards abort", async () => {
    const store = createMemoryScanUsageStore();
    const transport = vi
      .fn<typeof runModelApi>()
      .mockImplementation(async (input) => {
        input.onAnthropicUsage?.(usage);
        throw new Error("truncated");
      });
    const call = createScanModel({
      store,
      transport,
      now: () => new Date("2026-11-25T00:00:00Z"),
    });
    await expect(call(request)).rejects.toThrow("truncated");
    expect(await store.inspect("2026-11")).toMatchObject({
      spentNanoUsd: 832_000,
      unresolved: false,
    });
    expect(transport.mock.calls[0]![0]).toMatchObject({
      vendor: "anthropic",
      effort: "high",
      singleAttempt: true,
      suppressUpstreamDetails: true,
      signal: request.signal,
    });
  });

  it("settles unknown usage conservatively and never auto-repeats the same request", async () => {
    const store = createMemoryScanUsageStore();
    const transport = vi
      .fn<typeof runModelApi>()
      .mockRejectedValue(new Error("connection lost"));
    const call = createScanModel({
      store,
      requestKey: "unknown-once",
      transport,
      now: () => new Date("2026-11-25T00:00:00Z"),
    });
    await expect(call(request)).rejects.toThrow("connection lost");
    expect(await store.inspect("2026-11")).toMatchObject({
      unresolved: false,
      reservedNanoUsd: 0,
      spentNanoUsd: (await scanReservation("claude-opus-5-5", request))
        .reservedNanoUsd,
      busy: false,
    });
    await expect(call(request)).rejects.toThrow(/이미/);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("does not reserve on disabled, zero cap or already aborted requests", async () => {
    const transport = vi.fn<typeof runModelApi>();
    const store = createMemoryScanUsageStore();
    await expect(
      createScanModel({
        store,
        transport,
        config: scanConfig({ CONCEPT_BLANK_SCAN_ENABLED: "off" }),
      })(request),
    ).rejects.toThrow();
    await expect(
      createScanModel({
        store,
        transport,
        config: scanConfig({ CONCEPT_BLANK_SCAN_MONTHLY_USD_CAP: "0" }),
      })(request),
    ).rejects.toThrow();
    await expect(
      createScanModel({ store, transport })({
        ...request,
        signal: AbortSignal.abort(),
      }),
    ).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });

  it("does not reserve or dispatch if the exact uploaded image cannot be bounded", async () => {
    const store = createMemoryScanUsageStore(),
      transport = vi.fn<typeof runModelApi>();
    const begin = vi.spyOn(store, "begin");
    await expect(
      createScanModel({ store, transport })({
        ...request,
        imageDataUrl: "data:image/png;base64,AAAA",
      }),
    ).rejects.toThrow();
    expect(begin).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
});
