// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/studio-ai/api", async (original) => ({
  ...(await original<typeof import("@/lib/studio-ai/api")>()),
  runModelApi: vi.fn(),
}));
vi.mock("@/lib/dev-ai/cli", () => ({
  runSubscriptionCli: vi.fn(),
  getDevAiProviderStatuses: vi.fn(),
}));
vi.mock("@/lib/figure/renderFigureSpec", () => ({ renderFigureSpec: vi.fn() }));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(),
}));
import { POST } from "@/app/api/studio/ai/route";
import { getSessionUser } from "@/lib/session";
import { auth } from "@/lib/auth";
import { runModelApi } from "@/lib/studio-ai/api";
import { runSubscriptionCli } from "@/lib/dev-ai/cli";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { buildFigureComparisonImage } from "@/lib/dev-ai/figure-comparison";

/** 운영 경로(`/api/studio/ai`)의 «요청대로 고치기» — 모델 한 번, 엔진·원본 대조 없음, 사유는 화면까지. */
const origin = "https://math.example";
const body = {
  provider: "auto",
  action: "figure-edit",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "2번 선분을 점선으로 바꿔 주세요.",
  figure: {
    viewBox: [0, 0, 300, 240],
    elements: [
      {
        n: 1,
        kind: "선분",
        points: [
          [37, 26],
          [37, 206],
        ],
      },
      {
        n: 2,
        kind: "선분",
        points: [
          [37, 206],
          [277, 206],
        ],
      },
    ],
  },
};
const post = (value: unknown) =>
  POST(
    new Request(`${origin}/api/studio/ai`, {
      method: "POST",
      body: JSON.stringify(value),
      headers: { origin, "content-type": "application/json" },
    }),
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AUTH_URL", origin);
  for (const name of ["GEMINI", "DEEPSEEK", "ANTHROPIC", "OPENAI"])
    vi.stubEnv(`${name}_API_KEY`, "unit-test-key");
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "teacher",
    name: "teacher",
    email: "teacher@example.test",
    isAdmin: false,
  });
  vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
    user: { id: "teacher", role: "director" },
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/studio/ai figure-edit", () => {
  it("returns edit commands from one figure-model call", async () => {
    vi.mocked(runModelApi).mockResolvedValueOnce(
      JSON.stringify({
        commands: [{ op: "style", target: 2, dashed: true }],
      }),
    );
    const response = await post(body);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider: "auto",
      action: "figure-edit",
      model: "gemini-3.8-flash",
      result: {
        content: "",
        answer: "",
        solution: "",
        warnings: [],
        edits: [{ op: "style", target: 2, dashed: true }],
      },
    });
    expect(runModelApi).toHaveBeenCalledTimes(1);
    expect(vi.mocked(runModelApi).mock.calls[0][0]).toMatchObject({
      vendor: "gemini",
      model: "gemini-3.8-flash",
      imageDataUrl: body.imageDataUrl,
    });
    expect(renderFigureSpec).not.toHaveBeenCalled();
    expect(buildFigureComparisonImage).not.toHaveBeenCalled();
    expect(runSubscriptionCli).not.toHaveBeenCalled();
  });

  it("rejects a request without the element list before inference", async () => {
    expect((await post({ ...body, figure: undefined })).status).toBe(400);
    expect((await post({ ...body, content: "" })).status).toBe(400);
    expect(runModelApi).not.toHaveBeenCalled();
  });

  it("shows the reason on screen when the model cannot express the request", async () => {
    vi.mocked(runModelApi).mockResolvedValueOnce(
      JSON.stringify({ commands: [], note: "요청한 점 D 가 그림에 없습니다." }),
    );
    const response = await post(body);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "요청한 점 D 가 그림에 없습니다. 지금 그림은 그대로입니다.",
    });
  });

  it("still hides upstream failures it did not write", async () => {
    vi.mocked(runModelApi).mockRejectedValueOnce(
      new Error("upstream body with sk-live-secret"),
    );
    const response = await post(body);
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("sk-live");
  });
});
