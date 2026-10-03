import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listeningRequest,
  ListeningRequestError,
} from "@/components/english/listening/listeningClient";

afterEach(() => vi.unstubAllGlobals());

describe("teacher listening HTTP client", () => {
  it("awaits a server receipt and sends revision with same-origin credentials", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { revision: 8 } }));
    vi.stubGlobal("fetch", fetcher);
    const controller = new AbortController();
    await expect(
      listeningRequest("/sets/set", controller.signal, "PATCH", {
        expectedRevision: 7,
        title: "수정",
      }),
    ).resolves.toEqual({ revision: 8 });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("/api/english/listening/sets/set");
    expect(init).toMatchObject({
      method: "PATCH",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    expect(JSON.parse(init.body)).toEqual({
      expectedRevision: 7,
      title: "수정",
    });
  });

  it("preserves a server version conflict instead of reporting success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: "revision_conflict",
              message: "다른 곳에서 수정했습니다.",
            },
          },
          { status: 409 },
        ),
      ),
    );
    const pending = listeningRequest(
      "/sets/set",
      new AbortController().signal,
      "PATCH",
      {},
    );
    await expect(pending).rejects.toBeInstanceOf(ListeningRequestError);
    await expect(pending).rejects.toMatchObject({
      status: 409,
      code: "revision_conflict",
    });
  });

  it("rejects malformed success envelopes and network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ ok: true }))
        .mockRejectedValueOnce(new TypeError("offline")),
    );
    await expect(
      listeningRequest("/sets", new AbortController().signal),
    ).rejects.toThrow("응답을 확인");
    await expect(
      listeningRequest("/sets", new AbortController().signal),
    ).rejects.toThrow("offline");
  });
});
