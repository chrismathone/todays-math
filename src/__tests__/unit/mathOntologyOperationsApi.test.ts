import { afterEach, describe, expect, it, vi } from "vitest";
import { createOntologyWorkspaceSource } from "@/components/math-ontology/api";
afterEach(() => vi.unstubAllGlobals());
describe("operation policy errors", () => {
  it("loads deterministic coverage through the direct GET port", async () => {
    const fetch = vi.fn<(url: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => Response.json({ data: { id: "synthetic-coverage", summary: "서버가 센 원천 범위", steps: [], details: [], coverage: [] } })); vi.stubGlobal("fetch", fetch);
    const source = createOntologyWorkspaceSource();
    expect((await source.coverage!(new AbortController().signal)).summary).toBe("서버가 센 원천 범위"); expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("/api/math-ontology/coverage"); expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
  });
  it("preserves the predecessor metadata through the actual HTTP source without exposing support or hash controls", async () => {
    const predecessor = { previousReviewId: "00000000-0000-4000-8000-000000000011", expectedPreviousRevision: 3 };
    const fetch = vi.fn<(url: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => Response.json({ data: { id: "synthetic-result", summary: "근거 미확인 후보", steps: [], details: [], coverage: [], reprepare: { ...predecessor, query: "새 근거를 찾아줘" } } })); vi.stubGlobal("fetch", fetch);
    const input = { query: "편집한 요청", student: null, ...predecessor };
    const result = await createOntologyWorkspaceSource().run(input, new AbortController().signal);
    expect(result).toMatchObject({ reprepare: { ...predecessor, query: "새 근거를 찾아줘" } });
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ query: input.query, ...predecessor });
  });
  it("shows the missing-evidence reason instead of incorrectly calling it a stale record or retrying confirmation", async () => {
    const fetch = vi.fn(async () => Response.json({ error: { code: "EVIDENCE_INSUFFICIENT" } }, { status: 409 }));
    vi.stubGlobal("fetch", fetch);
    await expect(createOntologyWorkspaceSource().confirm({ kind: "relation", id: "synthetic-review", label: "승인", changes: [], effects: [] }, new AbortController().signal)).rejects.toMatchObject({ code: "BLOCKED", message: "근거 또는 배포 허용을 확인해야 승인·게시할 수 있습니다. 후보는 보존했습니다." });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
