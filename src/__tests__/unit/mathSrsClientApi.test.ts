import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchMathSrs,
  revealMathSrsHint,
  submitMathSrsAttempt,
} from "@/components/math-srs/mathSrsApi";
import { createMemories } from "@/lib/math-srs/memory";

const id = "11111111-1111-4111-8111-111111111111";
const data = {
  student: { id, name: "학생", classId: id, className: "반" },
  revision: 0,
  memories: createMemories(),
  mission: null,
  recentMissions: [],
  currentProgress: null,
  lectures: [],
  available: true,
};
afterEach(() => vi.unstubAllGlobals());

describe("math practice API client boundary", () => {
  it("parses the shared contract and sends only the answer request", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ data }));
    vi.stubGlobal("fetch", fetch);
    const body = {
      missionId: id,
      problemId: id,
      submittedAnswer: "1/3",
      elapsedSeconds: 19,
      rating: "good" as const,
    };
    expect(await submitMathSrsAttempt(body)).toEqual({ ok: true, data });
    const [url, request] = fetch.mock.calls[0];
    expect(url).toBe("/api/learn/math-srs/attempts");
    expect(request).toMatchObject({ cache: "no-store", method: "POST" });
    expect(JSON.parse(request.body)).toEqual(body);
  });

  it("retains setup and authorization failures without accepting malformed success data", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: { message: "저장 기능 준비 중" } },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { ...data, available: false } }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { error: { message: "접근할 수 없습니다." } },
          { status: 403 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    expect(await fetchMathSrs()).toEqual({
      ok: false,
      status: 503,
      message: "저장 기능 준비 중",
    });
    expect(await fetchMathSrs()).toMatchObject({ ok: false });
    expect(await revealMathSrsHint({ missionId: id, problemId: id })).toEqual({
      ok: false,
      status: 403,
      message: "접근할 수 없습니다.",
    });
  });

  it("reports an offline submission as a failure so the caller can retry its exact payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    expect(await fetchMathSrs()).toMatchObject({
      ok: false,
      status: 0,
      message: "연결되지 않았습니다. 다시 시도하세요.",
    });
  });
});
