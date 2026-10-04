// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  httpQuickCreateApi,
  QuickCreateApiError,
} from "@/lib/textbook/quickCreateClient";
import type {
  QuickCreateInput,
  QuickCreateResult,
} from "@/contracts/textbookQuickCreate.contract";

const input: QuickCreateInput = {
  requestId: randomUUID(),
  schoolLevel: "middle",
  grade: 2,
  semester: 1,
  startUnitId: randomUUID(),
  endUnitId: randomUUID(),
  difficulty: "standard",
  problemCountPerUnit: 8,
  includeConcepts: true,
};
const result: QuickCreateResult = {
  book: {
    id: randomUUID(),
    ownerId: randomUUID(),
    ownerName: "교사",
    isOwner: true,
    title: "자동 교재",
    visibility: "private",
    sharedBranchId: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    draftEditionId: randomUUID(),
    latestPublishedEditionId: null,
  },
  problemCount: 8,
  conceptCount: 1,
  warnings: [],
};
afterEach(() => vi.unstubAllGlobals());
describe("quick create HTTP client", () => {
  it("loads the exact semester-scoped direct catalog response", async () => {
    const catalog = {
      units: [
        {
          id: input.startUnitId,
          chapter: "1. 수와 식",
          section: "순환소수",
          label: "1. 수와 식 · 순환소수",
          problemCount: 42,
          conceptCount: 4,
        },
      ],
    };
    const fetcher = vi.fn(async () => Response.json(catalog));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await httpQuickCreateApi.listUnits({
        schoolLevel: "middle",
        grade: 2,
        semester: 1,
      }),
    ).toEqual(catalog);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/textbook/quick-create?schoolLevel=middle&grade=2&semester=1",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
  });
  it("sends the original requestId for retries and returns the native book summary", async () => {
    const fetcher = vi.fn(async () => Response.json(result, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await httpQuickCreateApi.create(input)).toEqual(result);
    expect(await httpQuickCreateApi.create(input)).toEqual(result);
    expect(fetcher.mock.calls).toHaveLength(2);
    for (const call of fetcher.mock.calls as unknown as [string, RequestInit][])
      expect(JSON.parse(String(call[1].body)).requestId).toBe(input.requestId);
  });
  it("rejects invalid inputs before network access", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      httpQuickCreateApi.listUnits({
        schoolLevel: "elementary",
        grade: 2,
        semester: 1,
      }),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("preserves actionable server errors and rejects malformed success data", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              code: "CONFLICT",
              message: "다른 내용에 쓰인 요청 번호입니다.",
            },
          },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ ...result, book: { id: result.book.id } }),
      )
      .mockResolvedValueOnce(new Response("bad-json", { status: 500 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(httpQuickCreateApi.create(input)).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "다른 내용에 쓰인 요청 번호입니다.",
    });
    await expect(httpQuickCreateApi.create(input)).rejects.toBeInstanceOf(
      QuickCreateApiError,
    );
    await expect(httpQuickCreateApi.create(input)).rejects.toBeInstanceOf(
      QuickCreateApiError,
    );
  });
});
