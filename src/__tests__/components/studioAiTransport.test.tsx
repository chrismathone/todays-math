import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { DevAiProvider, useDevAi } from "@/components/unified/useDevAi";
import DevAiStatusPanel from "@/components/unified/DevAiStatusPanel";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";

const cli = {
  enabled: true,
  mode: "subscription-cli",
  defaultProvider: "codex",
  providers: [
    {
      id: "codex",
      label: "Codex",
      status: "ready",
      image: true,
      detail: "connected",
    },
  ],
};
const api = {
  enabled: true,
  mode: "model-api",
  defaultProvider: "auto",
  providers: [
    {
      id: "auto",
      label: "원본 기본 모델",
      status: "ready",
      image: true,
      detail: "configured",
    },
  ],
};
function Controls() {
  const ai = useDevAi();
  return (
    <>
      <DevAiStatusPanel collapsed={false} onExpand={() => {}} />
      <button
        onClick={() =>
          void ai.run({ action: "solution", grade: "중1", content: "1+1" })
        }
      >
        해설 실행
      </button>
      <button onClick={() => ai.setMode("subscription-cli")}>CLI 요청</button>
    </>
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("NODE_ENV", "development");
  window.history.replaceState(null, "", "/dev/unified");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
});
describe("Studio transport selection", () => {
  it("offers explicit API mode in dev and posts to the selected transport with its own provider", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async (url: string, init?: RequestInit) =>
        Response.json(
          init?.method === "POST"
            ? {
                provider: "auto",
                action: "solution",
                result: {
                  answer: "2",
                  solution: "1+1=2",
                  content: "",
                  warnings: [],
                },
              }
            : url.includes("mode=model-api")
              ? api
              : cli,
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    render(
      <DevAiProvider>
        <Controls />
      </DevAiProvider>,
    );
    const mode = await screen.findByLabelText("AI 연결 방식");
    expect(fetcher.mock.calls[0][0]).toBe("/api/dev/unified/ai");
    fireEvent.change(mode, { target: { value: "model-api" } });
    await screen.findByRole("option", { name: "원본 기본 모델" });
    fireEvent.click(screen.getByText("해설 실행"));
    await screen.findByText("해설 생성 완료");
    const post = fetcher.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    expect(post[0]).toBe("/api/dev/unified/ai?mode=model-api");
    expect(JSON.parse(post[1].body)).toMatchObject({
      provider: "auto",
      action: "solution",
    });
  });
  it.each(["/studio", "/"])(
    "forces authenticated %s onto API even in dev and ignores a stored CLI provider",
    async (pathname) => {
      window.history.replaceState(null, "", pathname);
      localStorage.setItem("today-math-dev-ai-provider", "codex");
      const fetcher = vi.fn().mockResolvedValue(Response.json(api));
      vi.stubGlobal("fetch", fetcher);
      render(
        <DevAiProvider>
          <Controls />
        </DevAiProvider>,
      );
      await screen.findByRole("option", { name: "원본 기본 모델" });
      expect(screen.queryByLabelText("AI 연결 방식")).toBeNull();
      fireEvent.click(screen.getByText("CLI 요청"));
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      expect(fetcher.mock.calls[0][0]).toBe("/api/studio/ai");
      expect(getStudioEndpoints()).toMatchObject({
        problems: "/api/studio/problems",
        overview: "/api/studio/overview",
        teaching: "/api/studio/teaching",
        pdfWorker: "/api/studio/pdf-worker",
        pdfAssets: "/api/studio/pdf-assets/",
      });
    },
  );
  it("uses production endpoints irrespective of pathname in a production build", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getStudioEndpoints("/dev/unified").ai).toBe("/api/studio/ai");
  });
});
