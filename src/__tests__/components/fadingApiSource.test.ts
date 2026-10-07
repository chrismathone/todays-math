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
  it("일일 계획도 로컬과 같은 계약을 사용하며 명시한 분량을 전한다", async () => {
    const local = createLocalFadingSource({
      concepts: [],
      today: "2026-10-07",
    });
    const data = await local.dailyPlan!({ quota: 20 });
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data })));
    vi.stubGlobal("fetch", fetcher);
    const source = createApiFadingSource({ studentId: "student-scope" });
    expect(await source.dailyPlan!({ quota: 20 })).toEqual(data);
    expect(fetcher).toHaveBeenCalledWith("/api/learn/fading/daily?quota=20", {
      cache: "no-store",
      headers: { "x-student-id": "student-scope" },
    });
  });
  it("읽기와 쓰기 모두 화면을 연 학생을 묶어 다른 로그인에 이어 쓰지 않는다", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "CONFLICT",
              message: "로그인한 학생이 바뀌었어요. 다시 불러와 주세요.",
            },
          }),
          { status: 409 },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const source = createApiFadingSource({ studentId: "student-before" });
    const calls = [
      () => source.state(),
      () => source.catalog("초3"),
      () => source.concept("test-concept"),
      () => source.dailyPlan!(),
      () => source.act({ action: "pick", conceptId: "test-concept" }),
    ];
    for (const call of calls)
      await expect(call()).rejects.toMatchObject({
        code: "CONFLICT",
        status: 409,
      });
    expect(fetcher).toHaveBeenCalledTimes(5);
    for (const [, options] of fetcher.mock.calls as unknown as [
      string,
      RequestInit,
    ][])
      expect(options.headers).toMatchObject({
        "x-student-id": "student-before",
      });
    const requests = fetcher.mock.calls as unknown as [string, RequestInit][];
    expect(requests.at(-1)?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-student-id": "student-before",
      },
    });
  });
});
