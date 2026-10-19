import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addToBasket,
  changeBasketFormat,
  clearBasket,
  EMPTY_BASKET,
  loadBasket,
  makeTestFromBasket,
  removeFromBasket,
} from "@/lib/problem/basketApi";
import { loadProblems, loadProblemFormat } from "@/lib/problem/problemApi";
import { MOCK_PROBLEMS } from "@/mocks/data";
import { selectedQuestionFormat } from "@/lib/problem/questionSelectionClient";
import type { QuestionRepresentation } from "@/contracts/questionFormats.contract";

const raw = MOCK_PROBLEMS[0];
const option: QuestionRepresentation = {
  problemId: raw.id,
  format: "short_answer",
  revision: "server-revision",
  state: "available",
  reasonCode: null,
};
const problem = {
  ...raw,
  questionId: `row:${raw.id}`,
  questionFormats: [option],
};
const selection = selectedQuestionFormat(problem)!;
const basket = {
  ...EMPTY_BASKET,
  items: [{ orderIndex: 4, problem }],
  total: 1,
  spread: { ...EMPTY_BASKET.spread, [raw.difficulty]: 1 },
};
afterEach(() => vi.unstubAllGlobals());

describe("question view API clients", () => {
  it("requests grouped reads and uses explicit add/PATCH/test selections without adding a recent default", async () => {
    const requests: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push({ url, init });
        return Response.json(
          url.endsWith("/test")
            ? { data: { testId: raw.id, problemCount: 1 } }
            : { data: basket },
        );
      }),
    );
    expect((await loadBasket("question")).total).toBe(1);
    await addToBasket(raw.id, selection);
    await changeBasketFormat(raw.id, selection);
    await removeFromBasket(raw.id, "question");
    await clearBasket("question");
    await makeTestFromBasket({
      classId: raw.id,
      testDate: "2026-10-18",
      selections: [selection],
    });
    expect(requests[0].url).toBe("/api/basket?identity=question");
    expect(JSON.parse(String(requests[1].init?.body))).toEqual({
      problemId: raw.id,
      identity: "question",
      selection,
    });
    expect(requests[2].init?.method).toBe("PATCH");
    expect(JSON.parse(String(requests[2].init?.body))).toEqual({
      fromProblemId: raw.id,
      selection,
    });
    expect(requests[3].url).toContain("identity=question");
    const testRequest = JSON.parse(String(requests[5].init?.body));
    expect(testRequest).toEqual({
      classId: raw.id,
      testDate: "2026-10-18",
      identity: "question",
      selections: [selection],
    });
    expect(testRequest).not.toHaveProperty("recent");
  });

  it("keeps omitted basket/test options on the legacy defaults", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return Response.json(
          url.endsWith("/test")
            ? { data: { testId: raw.id, problemCount: 1 } }
            : { data: { items: [], spread: EMPTY_BASKET.spread, total: 0 } },
        );
      }),
    );
    await loadBasket();
    await addToBasket(raw.id);
    await makeTestFromBasket({ classId: raw.id, testDate: "2026-10-18" });
    expect(calls[0].url).toBe("/api/basket");
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      problemId: raw.id,
    });
    expect(JSON.parse(String(calls[2].init?.body))).toEqual({
      classId: raw.id,
      testDate: "2026-10-18",
    });
  });

  it("preserves server conflict text and refuses row-count fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json(
            {
              error: {
                message:
                  "다른 기기에서 바구니를 변경했습니다. 현재 선택을 다시 확인하세요.",
              },
            },
            { status: 409 },
          ),
        )
        .mockResolvedValueOnce(
          Response.json({
            data: { items: [], spread: EMPTY_BASKET.spread, total: 7 },
          }),
        ),
    );
    await expect(changeBasketFormat(raw.id, selection)).rejects.toThrow(
      "다른 기기에서 바구니를 변경했습니다",
    );
    await expect(loadBasket("question")).rejects.toThrow(
      "문항 단위 목록을 확인하지 못했습니다",
    );
  });

  it("keeps the actual detail UUID and detects stale metadata instead of inventing a representation", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: problem }))
      .mockResolvedValueOnce(
        Response.json({
          data: {
            ...problem,
            questionFormats: [{ ...option, revision: "changed" }],
          },
        }),
      );
    vi.stubGlobal("fetch", request);
    const actual = await loadProblemFormat(
      problem,
      option,
      new AbortController().signal,
    );
    expect(actual.id).toBe(raw.id);
    expect(actual.content).toBe(raw.content);
    expect(request.mock.calls[0][0]).toBe(
      `/api/problems/${raw.id}?identity=question`,
    );
    await expect(
      loadProblemFormat(problem, option, new AbortController().signal),
    ).rejects.toThrow("변경되었습니다");
  });

  it("validates the question unit before showing a legacy ProblemBank page total", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          version: 2,
          countUnit: "question",
          queryKey: "fixture",
          data: [problem],
          meta: { total: 1, page: 1, pageSize: 20 },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [raw],
          meta: { total: 2, page: 1, pageSize: 20 },
        }),
      );
    vi.stubGlobal("fetch", request);
    const list = await loadProblems({}, 1);
    expect(list.meta.total).toBe(1);
    expect(String(request.mock.calls[0][0])).toContain("identity=question");
    await expect(loadProblems({}, 1)).rejects.toThrow(
      "문항 단위 목록을 확인하지 못했습니다",
    );
  });
});
