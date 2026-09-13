import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioView from "@/components/unified/StudioView";
import { DevAiProvider } from "@/components/unified/useDevAi";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";

vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => (
    <div data-testid="math-content">{content}</div>
  ),
}));
const posts: DevAiRequest[] = [];
let respond: (request: DevAiRequest) => Promise<Response>;
const recognized = String.raw`$\frac{7}{3}$ + 1의 값을 구하세요.`;
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function normal(request: DevAiRequest) {
  return Promise.resolve(
    json({
      provider: request.provider,
      action: request.action,
      result: {
        content: recognized,
        answer: String.raw`$\frac{10}{3}$`,
        solution: "한 개를 더합니다.",
        warnings: [],
        problems: [
          {
            content: recognized,
            answer: "",
            bbox: { left: 80, top: 180, width: 840, height: 170 },
          },
        ],
      },
    }),
  );
}
beforeEach(() => {
  posts.length = 0;
  respond = normal;
  localStorage.clear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    new Proxy({}, { get: () => vi.fn() }) as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,c291cmNl",
  );
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const request = JSON.parse(init.body as string) as DevAiRequest;
        posts.push(request);
        return respond(request);
      }
      return json({
        enabled: true,
        mode: "subscription-cli",
        defaultProvider: "codex",
        providers: [
          {
            id: "codex",
            label: "Codex",
            status: "ready",
            detail: "사용 가능",
            image: true,
          },
          {
            id: "claude",
            label: "Claude",
            status: "login-required",
            detail: "Claude CLI에서 로그인해 주세요.",
            image: true,
          },
        ],
      });
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
async function open() {
  const onAdd = vi.fn();
  const onExport = vi.fn();
  const view = render(
    <DevAiProvider>
      <StudioView onAdd={onAdd} onExport={onExport} />
    </DevAiProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "예제로 시작" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "페이지 자동 인식" }),
    ).toBeEnabled(),
  );
  return { ...view, onAdd, onExport };
}
async function recognize() {
  fireEvent.click(screen.getByRole("button", { name: "페이지 자동 인식" }));
  await screen.findByDisplayValue(recognized);
}

describe("Studio AI review controls", () => {
  it("imports without a paid request, reviews recognized text and sends edits to the solution request", async () => {
    const { onAdd } = await open();
    expect(posts).toEqual([]);
    fireEvent.click(screen.getByText("AI 연결"));
    expect(
      screen.getByRole("option", { name: "Claude · 연결 필요" }),
    ).toBeDisabled();
    expect(screen.getByText(/Claude CLI에서 로그인/)).toBeInTheDocument();
    await recognize();
    expect(posts.map((post) => post.action)).toEqual(["page-ocr"]);
    expect(screen.getByRole("radio", { name: "원본 이미지" })).toBeChecked();
    const content = screen.getByDisplayValue(recognized);
    fireEvent.change(content, { target: { value: "검수한 도형 문제" } });
    fireEvent.click(
      screen.getByRole("button", { name: "해설 생성" }),
    );
    await screen.findByDisplayValue("한 개를 더합니다.");
    expect(posts[1]).toMatchObject({
      action: "solution",
      content: "검수한 도형 문제",
      imageDataUrl: "data:image/png;base64,c291cmNl",
      grade: "초5",
    });
    fireEvent.click(screen.getByRole("button", { name: "1문항 담기" }));
    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        croppedImage: "data:image/png;base64,c291cmNl",
        content: "",
        solution: "한 개를 더합니다.",
      }),
    ]);
  });

  it("keeps editable raw fractions and applies mixed fractions only in elementary previews", async () => {
    await open();
    await recognize();
    fireEvent.click(screen.getByRole("radio", { name: "입력한 텍스트" }));
    fireEvent.click(screen.getByRole("button", { name: "출력 미리보기" }));
    expect(screen.getByTestId("math-content")).toHaveTextContent(
      String.raw`$2\frac{1}{3}$ + 1의 값을 구하세요.`,
    );
    expect(screen.getByDisplayValue(recognized)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "중·고등" }));
    expect(screen.getByTestId("math-content")).toHaveTextContent(recognized);
  });

  it("preserves a pending request on restart dialog cancel, then aborts and resets on acceptance without clearing added problems", async () => {
    const { onAdd } = await open();
    await recognize();
    fireEvent.click(screen.getByRole("button", { name: "1문항 담기" }));
    let finish!: (value: Response) => void;
    respond = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    fireEvent.click(screen.getByRole("button", { name: "문제 다시 읽기" }));
    await screen.findByRole("button", { name: "AI 작업 취소" });
    const request = vi.mocked(fetch).mock.calls.at(-1)![1] as RequestInit;
    fireEvent.click(
      screen.getByRole("button", { name: "새로 시작" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /취소/ }));
    expect(request.signal?.aborted).toBe(false);
    expect(screen.getByDisplayValue(recognized)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "새로 시작" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /새로 시작/,
      }),
    );
    expect(request.signal?.aborted).toBe(true);
    await act(async () => {
      finish(await normal(posts.at(-1)!));
    });
    expect(screen.queryByDisplayValue(recognized)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "예제로 시작" }),
    ).toBeInTheDocument();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("retains keyboard crop controls and allows manual image output without OCR", async () => {
    const { onAdd } = await open();
    const area = screen.getByRole("group", { name: "문제 자르기 영역" });
    fireEvent.keyDown(area, { key: "ArrowRight" });
    fireEvent.keyDown(area, { key: "Enter" });
    expect(
      screen.getByRole("img", { name: "검수할 자른 원본 문제" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1문항 담기" }));
    expect(posts).toEqual([]);
    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        croppedImage: "data:image/png;base64,c291cmNl",
      }),
    ]);
  });
});
