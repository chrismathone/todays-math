import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { DevAiProvider, useDevAi } from "@/components/unified/useDevAi";

/**
 * 계정에 저장한 작업을 되살리면 그림이 브라우저 안의 `blob:` 주소가 된다(`privateCloudClient.materialize`).
 * 그대로 보내면 서버 스키마(`data:image/…;base64,` 만 받는다)가 400 을 낸다 — 2026-09-18 원장님 화면에서
 * 「디지털화 전체」의 도형 다시 그리기가 전부 «잘못된 문자열: 정규식 … 원본 그림을 유지했습니다»로 끝났다.
 * 보내기 직전에 `blob:` 을 `data:` 로 바꾼다. 운영(`/api/studio/ai`)도 같은 스키마라 같은 자리에서 고친다.
 */
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
const PNG = Uint8Array.of(0x89, 0x50, 0x4e, 0x47); // base64 «iVBORw==»

function Runner({ image }: { image: string }) {
  const ai = useDevAi();
  return (
    <button
      disabled={!ai.status?.enabled}
      onClick={() =>
        void ai
          .run({ action: "figure-redraw", grade: "중1", imageDataUrl: image })
          .then(
            () => document.body.setAttribute("data-outcome", "ok"),
            (error: Error) =>
              document.body.setAttribute("data-outcome", error.message),
          )
      }
    >
      실행
    </button>
  );
}

function stubFetch(blobType: string) {
  const fetcher = vi
    .fn()
    .mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.startsWith("blob:"))
        // jsdom 의 Blob 은 stream() 이 없어 Response 본문이 못 된다 — 바이트와 머리글로 준다.
        return new Response(PNG, { headers: { "content-type": blobType } });
      if (init?.method === "POST")
        return Response.json({
          provider: "codex",
          action: "figure-redraw",
          result: { svg: "<svg/>", warnings: [] },
        });
      return Response.json(cli);
    });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
const posted = (fetcher: ReturnType<typeof vi.fn>) =>
  fetcher.mock.calls.filter(([, init]) => init?.method === "POST");

async function runWith(image: string) {
  render(
    <DevAiProvider>
      <Runner image={image} />
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

beforeEach(() => {
  localStorage.clear();
  document.body.removeAttribute("data-outcome");
  vi.stubEnv("NODE_ENV", "development");
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AI 요청의 그림 — 되살린 작업의 blob: 주소", () => {
  it("blob: 그림은 data: 로 바꿔 보낸다", async () => {
    const fetcher = stubFetch("image/png");
    expect(await runWith("blob:http://localhost:3000/restored")).toBe("ok");
    const [post] = posted(fetcher);
    expect(JSON.parse(String(post[1].body)).imageDataUrl).toBe(
      "data:image/png;base64,iVBORw==",
    );
  });
  it("data: 그림은 그대로 보낸다 — blob 을 읽으러 가지 않는다", async () => {
    const fetcher = stubFetch("image/png");
    const image = "data:image/jpeg;base64,/9j/4AAQ";
    expect(await runWith(image)).toBe("ok");
    expect(JSON.parse(String(posted(fetcher)[0][1].body)).imageDataUrl).toBe(
      image,
    );
    expect(
      fetcher.mock.calls.some(([url]) => String(url).startsWith("blob:")),
    ).toBe(false);
  });
  it("서버가 못 받는 형식이면 보내지 않고 이유를 말한다", async () => {
    const fetcher = stubFetch("image/gif");
    const outcome = await runWith("blob:http://localhost:3000/gif");
    expect(outcome).not.toBe("ok");
    expect(outcome).not.toMatch(/정규식/);
    expect(posted(fetcher)).toHaveLength(0);
  });
});
