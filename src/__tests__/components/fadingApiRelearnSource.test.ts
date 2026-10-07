import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiFadingRelearnSource } from "@/components/fading/apiRelearnSource";
import { createLocalFadingSource } from "@/lib/fading/local";
import { createLocalFadingRelearnSource } from "@/lib/fading/relearnLocal";
import { newFadingId } from "@/lib/fading/source";
afterEach(() => vi.unstubAllGlobals());
describe("학생 재확인 API 소스", () => {
  it("서버 시각과 기본 분량 외 집계를 계약 그대로 받아 학생 헤더로 묶는다", async () => {
    const main = createLocalFadingSource({ concepts: [], today: "2026-10-07" });
    const local = createLocalFadingRelearnSource({
      main,
      concepts: [],
      now: () => 1_800_000_000_000,
    });
    const queue = await local.queue();
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: queue })));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await createApiFadingRelearnSource({ studentId: "student-a" }).queue(),
    ).toEqual(queue);
    expect(fetcher).toHaveBeenCalledWith("/api/learn/fading/relearn", {
      cache: "no-store",
      headers: { "x-student-id": "student-a" },
    });
  });
  it("모든 쓰기는 같은 학생을 묶고 실패한 시도 번호와 본문을 바꾸지 않는다", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: "CONFLICT", message: "로그인한 학생이 바뀌었어요." },
          }),
          { status: 409 },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const source = createApiFadingRelearnSource({ studentId: "student-a" });
    const attempt = {
      conceptId: "concept-a",
      propositionId: "sentence-a",
      token: newFadingId(),
      attemptId: newFadingId(),
      answers: [],
      gaveUp: true,
    };
    const observation = {
      kind: "rated" as const,
      conceptId: "concept-a",
      requestId: newFadingId(),
    };
    const judgement = {
      conceptId: attempt.conceptId,
      propositionId: attempt.propositionId,
      attemptId: attempt.attemptId,
      judged: {},
    };
    for (const call of [
      () => source.record(observation),
      () => source.grade(attempt),
      () => source.grade(attempt),
      () => source.judge(judgement),
    ])
      await expect(call()).rejects.toMatchObject({
        code: "CONFLICT",
        status: 409,
      });
    const requests = fetcher.mock.calls as unknown as [string, RequestInit][];
    for (const [, options] of requests)
      expect(options.headers).toEqual({
        "x-student-id": "student-a",
        "content-type": "application/json",
      });
    expect(requests[1]![1].body).toBe(requests[2]![1].body);
    expect(JSON.parse(requests[1]![1].body as string)).toEqual({
      action: "grade",
      attempt,
    });
  });
  it("연결 실패와 꺼진 서버 문은 각각 OFFLINE과 NOT_FOUND로 전한다", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    const source = createApiFadingRelearnSource();
    await expect(source.queue()).rejects.toMatchObject({ code: "OFFLINE" });
    await expect(source.queue()).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });
  it("잘못된 응답을 성공으로 취급하지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ data: { enabled: true } })),
      ),
    );
    await expect(createApiFadingRelearnSource().queue()).rejects.toMatchObject({
      code: "UNKNOWN",
    });
  });
});
