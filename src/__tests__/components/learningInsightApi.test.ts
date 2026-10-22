import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLearningInsight,
  inquireLearningInsight,
  getLearningInsightV2,
  inquireLearningInsightV2,
} from "@/components/math-srs/courseApi";
import {
  insightFixture,
  inquiryFixture,
  scopeA,
} from "../../../scripts/qa/math-insight-ui/data";

afterEach(() => vi.unstubAllGlobals());
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("learning insight strict client transport", () => {
  it("GET encodes enrollment/branch context and validates the owned response DTO", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response({ data: insightFixture() }));
    vi.stubGlobal("fetch", fetch);
    const result = await getLearningInsight(
      scopeA.studentId,
      scopeA.classId,
      scopeA.branchId,
    );
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      `/api/students/${scopeA.studentId}/math-srs/insight?classId=${scopeA.classId}&branchId=${scopeA.branchId}`,
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetch.mock.calls[0][1].method).toBeUndefined();
  });
  it("POST sends only validated query and context, with no student answers or snapshot", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response({ data: inquiryFixture() }));
    vi.stubGlobal("fetch", fetch);
    expect(
      (
        await inquireLearningInsight(
          scopeA.studentId,
          scopeA.classId,
          { query: "  근거는?  " },
          scopeA.branchId,
        )
      ).ok,
    ).toBe(true);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ query: "근거는?" }),
    });
  });
  it.each(["", " ", "가".repeat(501)])(
    "rejects invalid query before fetch",
    async (query) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      expect(
        (
          await inquireLearningInsight(scopeA.studentId, scopeA.classId, {
            query,
          })
        ).ok,
      ).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("rejects extra request fields rather than silently discarding them", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const input = { query: "근거는?", studentAnswer: "private" };
    expect(
      (await inquireLearningInsight(scopeA.studentId, scopeA.classId, input))
        .ok,
    ).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects unknown fields in a success response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({ data: { ...insightFixture(), answer: "not permitted" } }),
        ),
    );
    expect(
      await getLearningInsight(scopeA.studentId, scopeA.classId),
    ).toMatchObject({ ok: false, message: expect.stringContaining("형식") });
  });
  it("preserves structured unavailable messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            error: {
              code: "UNAVAILABLE",
              message: "질문 기능을 사용할 수 없습니다.",
            },
          },
          503,
        ),
      ),
    );
    expect(
      await inquireLearningInsight(scopeA.studentId, scopeA.classId, {
        query: "근거는?",
      }),
    ).toMatchObject({
      ok: false,
      status: 503,
      code: "UNAVAILABLE",
      message: "질문 기능을 사용할 수 없습니다.",
    });
  });
  it("propagates caller cancellation to the actual GET and POST fetches", async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            signals.push(options.signal);
            options.signal.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );
    for (const post of [false, true]) {
      const caller = new AbortController();
      const pending = post
        ? inquireLearningInsight(
            scopeA.studentId,
            scopeA.classId,
            { query: "근거는?" },
            scopeA.branchId,
            caller.signal,
          )
        : getLearningInsight(
            scopeA.studentId,
            scopeA.classId,
            scopeA.branchId,
            caller.signal,
          );
      await vi.waitFor(() => expect(signals.length).toBe(post ? 2 : 1));
      caller.abort();
      expect((await pending).ok).toBe(false);
      expect(signals.at(-1)!.aborted).toBe(true);
    }
  });
});

describe("learning insight explicit v2 opt-in", () => {
  it("uses the opt-in header and rejects a v1 response without silently falling back", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response({ data: insightFixture() }));
    vi.stubGlobal("fetch", fetch);
    expect(
      await getLearningInsightV2(
        scopeA.studentId,
        scopeA.classId,
        scopeA.branchId,
      ),
    ).toMatchObject({ ok: false, message: expect.stringContaining("형식") });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      cache: "no-store",
      headers: { "x-math-insight-version": "2" },
    });
  });
  it("sends only trimmed query with v2 header and preserves structured conflict without retry", async () => {
    const fetch = vi.fn().mockResolvedValue(
      response(
        {
          error: { code: "CONFLICT", message: "조회한 기록이 바뀌었습니다." },
        },
        409,
      ),
    );
    vi.stubGlobal("fetch", fetch);
    expect(
      await inquireLearningInsightV2(
        scopeA.studentId,
        scopeA.classId,
        { query: "  계획 맥락은?  " },
        scopeA.branchId,
      ),
    ).toMatchObject({ ok: false, status: 409, code: "CONFLICT" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ query: "계획 맥락은?" }),
      headers: {
        "content-type": "application/json",
        "x-math-insight-version": "2",
      },
    });
  });
  it.each(["", " ", "가".repeat(501)])(
    "rejects invalid v2 input before fetch",
    async (query) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      expect(
        await inquireLearningInsightV2(scopeA.studentId, scopeA.classId, {
          query,
        }),
      ).toMatchObject({ ok: false, status: 400 });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});

describe("learning insight actual v2 projections", () => {
  it("parses actual frozen core GET and POST DTOs", async () => {
    const v2 = await import("../../../scripts/qa/math-insight-ui/data-v2");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ data: v2.insightFixture() }))
      .mockResolvedValueOnce(response({ data: v2.inquiryFixture() }));
    vi.stubGlobal("fetch", fetch);
    expect(
      (
        await getLearningInsightV2(
          scopeA.studentId,
          scopeA.classId,
          scopeA.branchId,
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await inquireLearningInsightV2(
          scopeA.studentId,
          scopeA.classId,
          { query: "보존된 사실은?" },
          scopeA.branchId,
        )
      ).ok,
    ).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("v1 GET/POST never send the opt-in header", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ data: insightFixture() }))
      .mockResolvedValueOnce(response({ data: inquiryFixture() }));
    vi.stubGlobal("fetch", fetch);
    await getLearningInsight(scopeA.studentId, scopeA.classId);
    await inquireLearningInsight(scopeA.studentId, scopeA.classId, {
      query: "기존 조회",
    });
    for (const call of fetch.mock.calls)
      expect(new Headers(call[1].headers).has("x-math-insight-version")).toBe(
        false,
      );
  });
});
