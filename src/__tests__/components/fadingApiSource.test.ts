import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiFadingSource } from "@/components/fading/apiSource";
import { createLocalFadingSource } from "@/lib/fading/local";
afterEach(() => vi.unstubAllGlobals());
describe("학생 API 소스", () => {
  it("서버의 실패 문구와 409를 그대로 전한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "CONFLICT",
                message: "다른 풀이가 열려 있습니다.",
              },
            }),
            { status: 409 },
          ),
      ),
    );
    await expect(createApiFadingSource().state()).rejects.toMatchObject({
      code: "CONFLICT",
      message: "다른 풀이가 열려 있습니다.",
      status: 409,
    });
  });
  it("끊긴 연결은 한 문구와 OFFLINE으로 받는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network");
      }),
    );
    await expect(createApiFadingSource().state()).rejects.toMatchObject({
      code: "OFFLINE",
      message: "연결되지 않았습니다. 다시 시도하세요.",
    });
  });
  it("로컬과 같은 계약의 응답을 받고 잘못된 응답은 거절한다", async () => {
    const data = await createLocalFadingSource({
      concepts: [],
      today: "2026-10-06",
    }).state();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { broken: true } })),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await createApiFadingSource().state()).toEqual(data);
    await expect(createApiFadingSource().state()).rejects.toMatchObject({
      code: "UNKNOWN",
    });
    expect(fetcher).toHaveBeenCalledWith("/api/learn/fading", {
      cache: "no-store",
    });
  });
});
