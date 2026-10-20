import { afterEach, describe, expect, it, vi } from "vitest";
import { getGuide, saveGuide } from "@/components/math-srs/guideApi";

afterEach(() => vi.unstubAllGlobals());

const chosen = { id: "marten", chosenAt: "2026-10-20T01:00:00.000Z" };
function stubFetch(payload: unknown, status = 200) {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => Response.json(payload, { status }));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("guide client requests (plan §2 decision 10)", () => {
  it("reads the guide, null before the first choice", async () => {
    const fetcher = stubFetch({ data: { guide: null } });
    expect(await getGuide()).toEqual({ ok: true, data: null });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("/api/learn/math-srs/guide");
    expect(options.method).toBeUndefined();
  });

  it("posts only the chosen id and returns the saved guide", async () => {
    const fetcher = stubFetch({ data: { guide: chosen } });
    expect(await saveGuide("marten")).toEqual({ ok: true, data: chosen });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("/api/learn/math-srs/guide");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ guideId: "marten" });
  });

  it("reports a failed save instead of throwing, so study goes on", async () => {
    stubFetch({ error: { code: "UNAVAILABLE", message: "잠시 뒤" } }, 503);
    expect(await saveGuide("marten")).toMatchObject({ ok: false, status: 503 });
    stubFetch({ data: { guide: { id: "dragon", chosenAt: chosen.chosenAt } } });
    expect(await getGuide()).toMatchObject({ ok: false });
  });
});
