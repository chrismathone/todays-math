import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import {
  DevAiProvider,
  useDevAi,
  type StudioAiInterceptor,
} from "@/components/unified/useDevAi";

/**
 * 문제 추출 시연(원장님 2026-11-11) — AI 요청이 나가는 한 자리(`useDevAi` 의 send)에 가로채기 칸을 둔다.
 * 칸이 차 있으면 요청 본문과 «실제로 보내기»를 그 함수에 넘기고, 비어 있으면 전과 같이 바로 보낸다.
 */
const cli = {
  enabled: true,
  mode: "subscription-cli",
  defaultProvider: "codex",
  providers: [
    { id: "codex", label: "Codex", status: "ready", image: true, detail: "" },
  ],
};
const answer = (content: string) =>
  Response.json({
    provider: "codex",
    action: "ocr",
    result: { content, answer: "", solution: "", warnings: [] },
  });

function Runner({ interceptor }: { interceptor: StudioAiInterceptor | null }) {
  const ai = useDevAi();
  const { setInterceptor } = ai;
  useEffect(() => {
    setInterceptor(interceptor);
    return () => setInterceptor(null);
  }, [interceptor, setInterceptor]);
  return (
    <button
      disabled={!ai.status?.enabled}
      onClick={() =>
        void ai
          .run({
            action: "ocr",
            grade: "고1",
            imageDataUrl: "data:image/png;base64,iVBORw==",
          })
          .then(
            (response) =>
              document.body.setAttribute(
                "data-outcome",
                String(response.result.content),
              ),
            (error: Error) =>
              document.body.setAttribute("data-outcome", error.message),
          )
      }
    >
      실행
    </button>
  );
}
async function runWith(interceptor: StudioAiInterceptor | null) {
  render(
    <DevAiProvider>
      <Runner interceptor={interceptor} />
    </DevAiProvider>,
  );
  const button = await screen.findByText("실행");
  await waitFor(() => expect(button).not.toBeDisabled());
  button.click();
  await waitFor(() =>
    expect(document.body.getAttribute("data-outcome")).not.toBeNull(),
  );
  return document.body.getAttribute("data-outcome");
}
const posts = (fetcher: ReturnType<typeof vi.fn>) =>
  fetcher.mock.calls.filter(([, init]) => init?.method === "POST");

let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  document.body.removeAttribute("data-outcome");
  vi.stubEnv("NODE_ENV", "development");
  window.history.replaceState(null, "", "/");
  fetcher = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === "POST" ? answer("서버 응답") : Response.json(cli),
  );
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AI 요청 가로채기 칸", () => {
  it("칸이 비어 있으면 전과 같이 서버로 보낸다", async () => {
    expect(await runWith(null)).toBe("서버 응답");
    expect(posts(fetcher)).toHaveLength(1);
  });

  it("칸이 차 있으면 요청 본문을 넘기고, 돌려준 응답을 서버 응답처럼 쓴다", async () => {
    const interceptor = vi.fn<StudioAiInterceptor>(async () =>
      answer("녹화본 응답"),
    );
    expect(await runWith(interceptor)).toBe("녹화본 응답");
    expect(posts(fetcher)).toHaveLength(0);
    const [payload, , signal] = interceptor.mock.calls[0];
    expect(payload).toMatchObject({
      action: "ocr",
      grade: "고1",
      provider: "codex",
      imageDataUrl: "data:image/png;base64,iVBORw==",
    });
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("가로채기가 «실제로 보내기»를 부르면 같은 본문이 서버로 나간다", async () => {
    const interceptor: StudioAiInterceptor = (_payload, forward) => forward();
    expect(await runWith(interceptor)).toBe("서버 응답");
    const [[, init]] = posts(fetcher);
    expect(JSON.parse(String(init.body))).toMatchObject({
      action: "ocr",
      provider: "codex",
    });
  });
});
