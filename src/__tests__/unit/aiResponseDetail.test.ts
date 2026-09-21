import { describe, expect, it } from "vitest";
import { AiRequestError, readAiJson } from "@/components/unified/aiResponse";

// 트랙 45(2026-09-21) — 서버가 화면 문구(error)와 따로 싣는 개발자용 원문(detail)을 버리지 않는다.
// 원장님께는 error 한 줄만, detail 은 마우스 올림·콘솔로만 간다.
describe("AI failure detail", () => {
  const failed = (body: unknown, status = 422) =>
    readAiJson(new Response(JSON.stringify(body), { status })).catch(
      (error: unknown) => error,
    );

  it("keeps the server's developer detail apart from the screen line", async () => {
    const failure = await failed({
      error: "도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
      detail:
        "도형을 그리지 못했습니다: labels.lA.point conflicts with its key",
    });
    expect(failure).toBeInstanceOf(AiRequestError);
    expect((failure as AiRequestError).message).toBe(
      "도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
    );
    expect((failure as AiRequestError).detail).toBe(
      "도형을 그리지 못했습니다: labels.lA.point conflicts with its key",
    );
  });

  it.each([
    [{ error: "요청이 실패했습니다." }],
    [{ error: "요청이 실패했습니다.", detail: 42 }],
    [{ error: "요청이 실패했습니다.", detail: "  " }],
  ])("has no detail when the server sent none: %j", async (body) => {
    const failure = await failed(body);
    expect(failure).toBeInstanceOf(AiRequestError);
    expect((failure as AiRequestError).detail).toBeUndefined();
  });
});
