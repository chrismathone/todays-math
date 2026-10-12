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
        disabled={!ai.status?.enabled}
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
  it("keeps production generation on the automatic provider without a status panel", async () => {
    vi.stubEnv("NODE_ENV", "production");
    window.history.replaceState(null, "", "/studio");
    localStorage.setItem("today-math-dev-ai-provider-model-api", "gemini");
    const fetcher = vi.fn<typeof fetch>(async (_url, init) =>
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
          : api,
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    render(
      <DevAiProvider>
        <Controls />
      </DevAiProvider>,
    );
    await waitFor(() => expect(screen.getByText("해설 실행")).toBeEnabled());
    expect(screen.queryByLabelText("AI 상태판")).toBeNull();
    fireEvent.click(screen.getByText("해설 실행"));
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([, init]) => init?.method === "POST"),
      ).toBe(true),
    );
    const post = fetcher.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    expect(post[0]).toBe("/api/studio/ai");
    expect(JSON.parse(String(post[1]?.body))).toMatchObject({
      provider: "auto",
      action: "solution",
    });
  });
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
    // 서버 모델 API 에는 구독 CLI 모델 칸이 없다
    expect(screen.queryByLabelText("AI 모델")).toBeNull();
    expect(JSON.parse(post[1].body).model).toBeUndefined();
  });
  /**
   * 원장님 2026-09-18 — 구독 CLI 로 그릴 때 모델을 고른다(Codex astra·sol… · Claude fable·opus·sonnet).
   * 도구 아래 모델 칸 · 첫 항목 «CLI 설정»(원장님 CLI 설정의 모델 — 서버가 넘긴다) · 고른 값은 브라우저에 기억.
   */
  it("dev 구독 CLI 는 도구 아래 모델 칸 — 기본은 «CLI 설정», 고른 모델을 보내고 다시 열어도 기억한다", async () => {
    window.history.replaceState(null, "", "/studio");
    const status = {
      ...cli,
      providers: [
        {
          ...cli.providers[0],
          models: ["gpt-6-astra", "gpt-5.6-sol"],
          defaultModel: "gpt-6-astra",
        },
      ],
    };
    const fetcher = vi
      .fn()
      .mockImplementation(async (_url: string, init?: RequestInit) =>
        Response.json(
          init?.method === "POST"
            ? {
                provider: "codex",
                action: "solution",
                result: {
                  answer: "2",
                  solution: "",
                  content: "",
                  warnings: [],
                },
              }
            : status,
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const posts = () =>
      fetcher.mock.calls
        .filter(([, init]) => init?.method === "POST")
        .map(([, init]) => JSON.parse(init.body));
    const view = render(
      <DevAiProvider>
        <Controls />
      </DevAiProvider>,
    );
    const select = (await screen.findByLabelText(
      "AI 모델",
    )) as HTMLSelectElement;
    expect([...select.options].map((option) => option.text)).toEqual([
      "CLI 설정 (gpt-6-astra)",
      "gpt-6-astra",
      "gpt-5.6-sol",
    ]);
    expect(select.value).toBe("");
    fireEvent.click(screen.getByText("해설 실행"));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0].model).toBeUndefined();
    await screen.findByText("해설 생성 완료");
    fireEvent.change(select, { target: { value: "gpt-5.6-sol" } });
    fireEvent.click(screen.getByText("해설 실행"));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts()[1]).toMatchObject({
      provider: "codex",
      model: "gpt-5.6-sol",
    });
    view.unmount();
    render(
      <DevAiProvider>
        <Controls />
      </DevAiProvider>,
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText("AI 모델") as HTMLSelectElement).value,
      ).toBe("gpt-5.6-sol"),
    );
  });
  /**
   * 🔴 원장님 2026-09-18 — *「dev 모드인데 왜 구독요금제가 아니라 서버로 되어있지?」*
   * development 에서는 작업실 표면(`/`·`/studio`)에서도 **AI 요청만** 구독 CLI 다리(`/api/dev/unified/ai`)로 간다.
   * 데이터 경로는 로그인·계정별 `/api/studio/*` 그대로다.
   * 🔴 상태판은 **개발 모드면 기존 칸 그대로**다 — 원장님 같은 날 «작업실 AI칸은 dev 모드일때는 기존처럼,
   * production에서만 최소화». 도구 고르기가 있고, 예전에 저장한 도구도 복원한다.
   */
  it.each(["/studio", "/"])(
    "dev 의 %s 는 AI 를 구독 CLI 다리로, 데이터는 /api/studio 로 — 상태판은 기존 칸, 저장한 도구 복원",
    async (pathname) => {
      window.history.replaceState(null, "", pathname);
      localStorage.setItem(
        "today-math-dev-ai-provider-subscription-cli",
        "claude",
      );
      const cliTwo = {
        ...cli,
        providers: [
          ...cli.providers,
          {
            id: "claude",
            label: "Claude",
            status: "ready",
            image: true,
            detail: "connected",
          },
        ],
      };
      const fetcher = vi
        .fn()
        .mockImplementation(async (_url: string, init?: RequestInit) =>
          Response.json(
            init?.method === "POST"
              ? {
                  provider: "claude",
                  action: "solution",
                  result: {
                    answer: "2",
                    solution: "1+1=2",
                    content: "",
                    warnings: [],
                  },
                }
              : cliTwo,
          ),
        );
      vi.stubGlobal("fetch", fetcher);
      render(
        <DevAiProvider>
          <Controls />
        </DevAiProvider>,
      );
      // 기존 칸 — 제목과 도구 고르기가 있다(최소화된 한 줄이 아니다)
      await screen.findByText("AI 작업 연결");
      await screen.findByRole("option", { name: "Claude" });
      expect(screen.getByLabelText("개발용 AI 도구")).toBeTruthy();
      expect(screen.queryByText("AI 연결됨")).toBeNull();
      expect(fetcher.mock.calls[0][0]).toBe("/api/dev/unified/ai");
      // 작업실 표면이라 연결 방식(CLI/API) 바꾸기는 기존처럼 없다
      expect(screen.queryByLabelText("AI 연결 방식")).toBeNull();
      // 모드 바꾸기는 작업실 표면에서 여전히 막혀 있다 — 상태를 다시 묻지 않는다
      fireEvent.click(screen.getByText("CLI 요청"));
      fireEvent.click(screen.getByText("해설 실행"));
      await waitFor(() =>
        expect(
          fetcher.mock.calls.some(([, init]) => init?.method === "POST"),
        ).toBe(true),
      );
      const post = fetcher.mock.calls.find(
        ([, init]) => init?.method === "POST",
      )!;
      expect(post[0]).toBe("/api/dev/unified/ai");
      expect(JSON.parse(post[1].body)).toMatchObject({ provider: "claude" });
      expect(getStudioEndpoints()).toMatchObject({
        production: true,
        productionBuild: false,
        ai: "/api/dev/unified/ai",
        problems: "/api/studio/problems",
        overview: "/api/studio/overview",
        teaching: "/api/studio/teaching",
        pdfWorker: "/api/studio/pdf-worker",
        pdfAssets: "/api/studio/pdf-assets/",
      });
    },
  );
  it.each(["/", "/studio", "/dev/unified"])(
    "운영 빌드면 %s 도 AI 는 /api/studio/ai — 개발 다리는 운영에서 안 쓴다",
    (pathname) => {
      vi.stubEnv("NODE_ENV", "production");
      expect(getStudioEndpoints(pathname)).toMatchObject({
        production: true,
        productionBuild: true,
        ai: "/api/studio/ai",
        problems: "/api/studio/problems",
      });
    },
  );
});
