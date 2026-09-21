import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

/**
 * 트랙 39 (2026-09-21) — 원장님 화면: «5쪽 · Unexpected token 'R', "Request En"... is not valid JSON».
 * ㉠ 쪽 그림(크롬 PNG 4.77~5.09MB)이 Vercel 본문 상한 4.5MB 를 넘어 플랫폼이 413 을 냈고
 * ㉡ 그 평문 본문(`Request Entity Too Large`)을 `response.json()` 으로 읽어 파서 오류가 화면에 나왔다.
 * 여기서는 보내는 자리(`useDevAi.run`) 하나를 본다 — 쪽·잘라 낸 문항·도형이 모두 이 길로 나간다.
 */
vi.mock("@/components/unified/aiImageSurface", () => ({
  decodeAiImageSurface: vi.fn(),
}));
import { decodeAiImageSurface } from "@/components/unified/aiImageSurface";
import {
  AI_IMAGE_BUDGET,
  AI_IMAGE_TOO_LARGE,
  type AiImageSurface,
} from "@/components/unified/aiImageBudget";
import { DevAiProvider, useDevAi } from "@/components/unified/useDevAi";

const VERCEL_BODY_LIMIT = 4_500_000;
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
// 크롬 실측(원장님 PDF 5쪽, 2200×1553): PNG 4,970,414자 · WebP q0.92 756,023 · q0.85 444,079
const PER_PIXEL: Record<string, number> = {
  "image/png": 4970414 / 3416600,
  "image/webp@0.92": 756023 / 3416600,
  "image/webp@0.85": 444079 / 3416600,
};
function scanSurface(density = 1): AiImageSurface {
  return {
    width: 2200,
    height: 1553,
    encode(scale, type, quality) {
      const key =
        type === "image/png" ? type : `${type}@${quality?.toFixed(2)}`;
      const pixels = Math.round(2200 * scale) * Math.round(1553 * scale);
      return (
        `data:${type};base64,` +
        "A".repeat(Math.round(pixels * (PER_PIXEL[key] ?? 1) * density))
      );
    },
  };
}
const PAGE_PNG = scanSurface().encode(1, "image/png");

function Runner({ image }: { image?: string }) {
  const ai = useDevAi();
  return (
    <>
      <output aria-label="상태 오류">{ai.statusError}</output>
      <button
        disabled={!ai.status?.enabled}
        onClick={() =>
          void ai
            .run({ action: "page-ocr", grade: "중2", imageDataUrl: image })
            .then(
              (response) =>
                document.body.setAttribute(
                  "data-outcome",
                  `ok:${JSON.stringify(response.result.warnings)}`,
                ),
              (error: Error) =>
                document.body.setAttribute("data-outcome", error.message),
            )
        }
      >
        실행
      </button>
    </>
  );
}

type Reply = Response | (() => Response);
function stubFetch(...posts: Reply[]) {
  const fetcher = vi
    .fn()
    .mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method !== "POST") return Response.json(cli);
      const next = posts.shift() ?? ok();
      return typeof next === "function" ? next() : next;
    });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
const ok = () =>
  Response.json({
    provider: "codex",
    action: "page-ocr",
    result: {
      content: "",
      answer: "",
      solution: "",
      warnings: [],
      problems: [],
    },
  });
// Vercel 이 본문 상한을 넘은 요청에 돌려주는 모양 그대로 — JSON 이 아니다
const tooLarge = () =>
  new Response("Request Entity Too Large", {
    status: 413,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
const sent = (fetcher: ReturnType<typeof vi.fn>) =>
  fetcher.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([, init]) => String(init.body));

async function runWith(image?: string) {
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
  return document.body.getAttribute("data-outcome")!;
}
const PARSER = /Unexpected token|not valid JSON|JSON\.parse|SyntaxError/;

beforeEach(() => {
  localStorage.clear();
  document.body.removeAttribute("data-outcome");
  vi.stubEnv("NODE_ENV", "development");
  window.history.replaceState(null, "", "/");
  vi.mocked(decodeAiImageSurface).mockResolvedValue(scanSurface());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("AI 요청 본문 — 예산 안으로 줄여 보낸다", () => {
  it("빽빽한 스캔 쪽은 본문이 Vercel 상한 아래로 나간다 — 실제 길이로 잰다", async () => {
    expect(PAGE_PNG.length).toBeGreaterThan(VERCEL_BODY_LIMIT);
    const fetcher = stubFetch();
    expect(await runWith(PAGE_PNG)).toBe("ok:[]");
    const [body] = sent(fetcher);
    expect(body.length).toBeLessThan(VERCEL_BODY_LIMIT);
    const image = JSON.parse(body).imageDataUrl as string;
    expect(image.length).toBeLessThanOrEqual(AI_IMAGE_BUDGET);
    expect(image.startsWith("data:image/webp;base64,")).toBe(true);
  });

  it("예산 안의 그림은 손대지 않는다", async () => {
    const small = "data:image/png;base64,iVBORw==";
    const fetcher = stubFetch();
    await runWith(small);
    expect(JSON.parse(sent(fetcher)[0]).imageDataUrl).toBe(small);
    expect(decodeAiImageSurface).not.toHaveBeenCalled();
  });

  it("해상도까지 줄였으면 결과 경고 한 줄로 알린다", async () => {
    // 잡티가 여덟 배 — WebP q0.85 도 3.55MB 라 해상도를 줄여야 든다
    vi.mocked(decodeAiImageSurface).mockResolvedValue(scanSurface(8));
    stubFetch();
    const outcome = await runWith(PAGE_PNG);
    expect(outcome).toMatch(/^ok:/);
    expect(outcome).toMatch(/해상도를 줄여 보냈습니다\(긴 변 \d+px\)/);
  });

  it("아무리 줄여도 안 들어가면 보내지 않고 사람 말로 멈춘다", async () => {
    vi.mocked(decodeAiImageSurface).mockResolvedValue(scanSurface(500));
    const fetcher = stubFetch();
    expect(await runWith(PAGE_PNG)).toBe(AI_IMAGE_TOO_LARGE);
    expect(sent(fetcher)).toHaveLength(0);
  });
});

describe("AI 응답이 JSON 이 아니어도 파서 오류가 화면에 새지 않는다", () => {
  it("413 평문이 오면 한 번 더 줄여 다시 보낸다", async () => {
    const fetcher = stubFetch(tooLarge, ok);
    // 절반 예산(378,011자)은 WebP q0.85(444,079)로도 안 들어가 긴 변 1760px 로 줄인다 — 그 사실을 알린다
    expect(await runWith(PAGE_PNG)).toBe(
      `ok:${JSON.stringify(["그림이 커서 해상도를 줄여 보냈습니다(긴 변 1760px). 인식 결과를 확인해 주세요."])}`,
    );
    const [first, second] = sent(fetcher).map(
      (body) => JSON.parse(body).imageDataUrl as string,
    );
    expect(second.length).toBeLessThanOrEqual(first.length / 2);
  });

  it("다시 보내도 413 이면 사람 말로 멈춘다 — 두 번만 보낸다", async () => {
    const fetcher = stubFetch(tooLarge, tooLarge, tooLarge);
    const outcome = await runWith(PAGE_PNG);
    expect(outcome).toBe(AI_IMAGE_TOO_LARGE);
    expect(outcome).not.toMatch(PARSER);
    expect(sent(fetcher)).toHaveLength(2);
  });

  it("그림 없는 요청의 413 도 파서 오류가 아니다", async () => {
    const fetcher = stubFetch(tooLarge);
    const outcome = await runWith(undefined);
    expect(outcome).not.toMatch(PARSER);
    expect(outcome).toMatch(/너무 커서 보내지 못했습니다/);
    expect(sent(fetcher)).toHaveLength(1);
  });

  it.each([
    [
      502,
      "<html><body>Bad Gateway</body></html>",
      "text/html",
      /AI 서버가 응답하지 않았습니다\(502\)/,
    ],
    [
      504,
      "An error occurred with your deployment\n\nFUNCTION_INVOCATION_TIMEOUT",
      "text/plain",
      /시간이 초과되었습니다/,
    ],
    [500, "Internal Server Error", "text/plain", /\(500\)/],
    [403, "<!doctype html><title>Login</title>", "text/html", /로그인/],
  ])("%i 평문·HTML → 사람 문구", async (status, text, type, message) => {
    stubFetch(
      new Response(text, { status, headers: { "content-type": type } }),
    );
    const outcome = await runWith("data:image/png;base64,iVBORw==");
    expect(outcome).toMatch(message);
    expect(outcome).not.toMatch(PARSER);
  });

  it("우리 서버가 JSON 으로 준 사유는 그대로 보인다", async () => {
    stubFetch(
      Response.json(
        { error: "진행 중인 AI 작업이 끝나면 다시 시도해 주세요." },
        { status: 429 },
      ),
    );
    expect(await runWith("data:image/png;base64,iVBORw==")).toBe(
      "진행 중인 AI 작업이 끝나면 다시 시도해 주세요.",
    );
  });

  it("200 인데 JSON 이 아니면 읽지 못했다고 말한다", async () => {
    stubFetch(new Response("<html>login</html>", { status: 200 }));
    const outcome = await runWith("data:image/png;base64,iVBORw==");
    expect(outcome).toMatch(/AI 응답을 읽지 못했습니다/);
    expect(outcome).not.toMatch(PARSER);
  });

  it("연결 상태 확인(GET)이 JSON 이 아니어도 파서 오류가 아니다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>Authentication Required</html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      ),
    );
    render(
      <DevAiProvider>
        <Runner />
      </DevAiProvider>,
    );
    const status = screen.getByLabelText("상태 오류");
    await waitFor(() => expect(status.textContent).not.toBe(""));
    expect(status.textContent).not.toMatch(PARSER);
    expect(status.textContent).toMatch(/연결 상태를 확인하지 못했습니다/);
  });
});
