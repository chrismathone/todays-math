import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { DevAiProvider, useDevAi } from "@/components/unified/useDevAi";
import {
  useStudioDemo,
  useStudioDemoFile,
} from "@/components/unified/useStudioDemo";
import { sha256OfFile, sha256OfText } from "@/components/unified/studioDemo";

/**
 * 문제 추출 시연(원장님 2026-11-11 «로그인해서 문제 추출 탭 들어가면 자동으로 이어지게» · «시연 PDF 일 때만»).
 * 원본 목록에 시연 PDF 가 들어오면 서버에 녹화본을 묻고, 서버가 내주면 AI 요청을 녹화본으로 답한다.
 * 시연 PDF 가 빠지면(새로 시작) 다시 실제로 분석한다.
 */
const cli = {
  enabled: true,
  mode: "subscription-cli",
  defaultProvider: "codex",
  providers: [
    { id: "codex", label: "Codex", status: "ready", image: true, detail: "" },
  ],
};
const answer = (solution: string) => ({
  provider: "codex",
  action: "solution",
  result: { content: "", answer: "", solution, warnings: [] },
});
const pdf = (text: string) =>
  new File([text], "시험지.pdf", { type: "application/pdf" });
type Source = { kind: "pdf" | "image" | "sample"; original?: File };

function Probe({
  sources,
  source,
}: {
  sources: Source[];
  source: { bytes: number; sha256: string };
}) {
  useStudioDemo(sources, { source, saveDelay: 0 });
  const ai = useDevAi();
  return (
    <button
      disabled={!ai.status?.enabled}
      onClick={() =>
        void ai
          .run({ action: "solution", grade: "고1", content: "1+1=?" })
          .then((response) =>
            document.body.setAttribute(
              "data-outcome",
              String(response.result.solution),
            ),
          )
      }
    >
      실행
    </button>
  );
}

let fetcher: ReturnType<typeof vi.fn>;
let recording: unknown[];
let demoStatus: number;
const calls = (pattern: RegExp, method = "GET") =>
  fetcher.mock.calls.filter(
    ([url, init]) =>
      pattern.test(String(url)) && (init?.method ?? "GET") === method,
  );

beforeEach(() => {
  localStorage.clear();
  document.body.removeAttribute("data-outcome");
  vi.stubEnv("NODE_ENV", "development");
  window.history.replaceState(null, "", "/");
  recording = [];
  demoStatus = 200;
  fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).startsWith("/api/studio/demo"))
      return init?.method === "POST"
        ? Response.json({ saved: 1 })
        : Response.json({ entries: recording }, { status: demoStatus });
    return init?.method === "POST"
      ? Response.json(answer("서버 해설"))
      : Response.json(cli);
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function run() {
  document.body.removeAttribute("data-outcome");
  const button = await screen.findByText("실행");
  await waitFor(() => expect(button).not.toBeDisabled());
  button.click();
  await waitFor(() =>
    expect(document.body.getAttribute("data-outcome")).not.toBeNull(),
  );
  return document.body.getAttribute("data-outcome");
}

describe("시연 PDF 가 열리면 녹화본으로 답한다", () => {
  it("시연 PDF 면 녹화본을 묻고, 녹화된 요청은 서버로 보내지 않고 녹화본으로 답한다", async () => {
    const file = pdf("demo-pdf-bytes");
    const source = { bytes: file.size, sha256: await sha256OfFile(file) };
    recording = [
      {
        action: "solution",
        content: await sha256OfText("1+1=?"),
        ms: 0,
        body: answer("녹화 해설"),
      },
    ];
    render(
      <DevAiProvider>
        <Probe sources={[{ kind: "pdf", original: file }]} source={source} />
      </DevAiProvider>,
    );
    await waitFor(() => expect(calls(/^\/api\/studio\/demo/)).toHaveLength(1));
    expect(String(calls(/^\/api\/studio\/demo/)[0][0])).toBe(
      `/api/studio/demo?sha256=${source.sha256}`,
    );
    await waitFor(async () => expect(await run()).toBe("녹화 해설"));
    expect(calls(/\/ai/, "POST")).toHaveLength(0);
  });

  it("녹화본에 없는 요청은 실제로 보내고, 그 응답을 녹화본으로 저장한다", async () => {
    const file = pdf("demo-pdf-bytes");
    const source = { bytes: file.size, sha256: await sha256OfFile(file) };
    render(
      <DevAiProvider>
        <Probe sources={[{ kind: "pdf", original: file }]} source={source} />
      </DevAiProvider>,
    );
    await waitFor(() => expect(calls(/^\/api\/studio\/demo/)).toHaveLength(1));
    expect(await run()).toBe("서버 해설");
    await waitFor(() =>
      expect(calls(/^\/api\/studio\/demo$/, "POST")).toHaveLength(1),
    );
    const saved = JSON.parse(
      String(calls(/^\/api\/studio\/demo$/, "POST")[0][1]?.body),
    );
    expect(saved.sha256).toBe(source.sha256);
    expect(saved.entries).toMatchObject([
      { action: "solution", body: answer("서버 해설") },
    ]);
  });

  it("크기나 지문이 다른 PDF · 서버가 거절한 계정은 평소처럼 실제로 분석한다", async () => {
    const file = pdf("demo-pdf-bytes");
    const other = pdf("other-pdf-byte");
    const source = { bytes: file.size, sha256: await sha256OfFile(file) };
    const { unmount } = render(
      <DevAiProvider>
        <Probe sources={[{ kind: "pdf", original: other }]} source={source} />
      </DevAiProvider>,
    );
    expect(await run()).toBe("서버 해설");
    expect(calls(/^\/api\/studio\/demo/)).toHaveLength(0);
    unmount();

    demoStatus = 404;
    recording = [
      {
        action: "solution",
        content: await sha256OfText("1+1=?"),
        ms: 0,
        body: answer("녹화 해설"),
      },
    ];
    render(
      <DevAiProvider>
        <Probe sources={[{ kind: "pdf", original: file }]} source={source} />
      </DevAiProvider>,
    );
    await waitFor(() => expect(calls(/^\/api\/studio\/demo/)).toHaveLength(1));
    expect(await run()).toBe("서버 해설");
  });

  it("시연 PDF 가 빠지면(새로 시작) 다시 실제로 분석한다", async () => {
    const file = pdf("demo-pdf-bytes");
    const source = { bytes: file.size, sha256: await sha256OfFile(file) };
    recording = [
      {
        action: "solution",
        content: await sha256OfText("1+1=?"),
        ms: 0,
        body: answer("녹화 해설"),
      },
    ];
    const { rerender } = render(
      <DevAiProvider>
        <Probe sources={[{ kind: "pdf", original: file }]} source={source} />
      </DevAiProvider>,
    );
    await waitFor(async () => expect(await run()).toBe("녹화 해설"));
    rerender(
      <DevAiProvider>
        <Probe sources={[]} source={source} />
      </DevAiProvider>,
    );
    expect(await run()).toBe("서버 해설");
  });
});

function FileProbe() {
  const demo = useStudioDemoFile();
  return demo ? (
    <button
      onClick={() =>
        void demo
          .open()
          .then(async (file) =>
            document.body.setAttribute(
              "data-outcome",
              `${file.name}|${file.type}|${await file.text()}`,
            ),
          )
      }
    >
      {demo.name}
    </button>
  ) : (
    <span>없음</span>
  );
}

describe("시연 시험지 파일 — 어디서든 아이디로(원장님 2026-11-11)", () => {
  it("시연 계정이면 서버에 둔 시연 PDF 의 이름을 알고, 누르면 그 파일을 받는다", async () => {
    fetcher.mockImplementation(async (url: string) =>
      String(url) === "/api/studio/demo?file=info"
        ? Response.json({ name: "시연.pdf", bytes: 3 })
        : String(url) === "/api/studio/demo?file=pdf"
          ? new Response("pdf", {
              headers: { "Content-Type": "application/pdf" },
            })
          : Response.json(cli),
    );
    render(<FileProbe />);
    (await screen.findByText("시연.pdf")).click();
    await waitFor(() =>
      expect(document.body.getAttribute("data-outcome")).toBe(
        "시연.pdf|application/pdf|pdf",
      ),
    );
  });

  it("시연 계정이 아니거나 올려 둔 파일이 없으면(404) 아무것도 보이지 않는다", async () => {
    fetcher.mockImplementation(async () =>
      Response.json({ error: "없음" }, { status: 404 }),
    );
    render(<FileProbe />);
    await waitFor(() =>
      expect(calls(/^\/api\/studio\/demo\?file=info$/)).toHaveLength(1),
    );
    expect(screen.getByText("없음")).toBeInTheDocument();
  });
});
