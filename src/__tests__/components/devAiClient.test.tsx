import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevAiProvider, useDevAi } from "@/components/unified/useDevAi";
import DevAiStatusPanel from "@/components/unified/DevAiStatusPanel";

const status = {
  enabled: true,
  mode: "subscription-cli",
  defaultProvider: "codex",
  providers: [
    {
      id: "codex",
      label: "Codex",
      status: "ready",
      detail: "ChatGPT 로그인 확인",
      image: true,
    },
    {
      id: "grok",
      label: "Grok",
      status: "login-required",
      detail: "Grok 로그인이 필요합니다.",
      image: true,
    },
  ],
};
function TestTask() {
  const ai = useDevAi();
  return (
    <button
      onClick={() =>
        void ai
          .run({ action: "solution", content: "1+1", grade: "초5" })
          .catch(() => {})
      }
    >
      해설 테스트
    </button>
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe("development AI subscription status and task controller", () => {
  it("probes status without inference and does not invent a quota balance", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(status));
    vi.stubGlobal("fetch", fetcher);
    render(
      <DevAiProvider>
        <DevAiStatusPanel collapsed={false} onExpand={() => {}} />
      </DevAiProvider>,
    );
    await screen.findByTitle("ChatGPT 로그인 확인");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].method).toBeUndefined();
    expect(screen.queryByText(/남은.*%/)).toBeNull();
    fireEvent.change(screen.getByLabelText("개발용 AI 도구"), {
      target: { value: "grok" },
    });
    expect(screen.getByTitle("Grok 로그인이 필요합니다.")).toBeTruthy();
  });
  it("keeps a running task on its chosen provider and cancels its request", async () => {
    let taskSignal: AbortSignal | undefined;
    const fetcher = vi.fn().mockImplementation((_url, init) => {
      if (!init?.method) return Promise.resolve(Response.json(status));
      taskSignal = init.signal;
      return new Promise((_resolve, reject) =>
        taskSignal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        ),
      );
    });
    vi.stubGlobal("fetch", fetcher);
    render(
      <DevAiProvider>
        <DevAiStatusPanel collapsed={false} onExpand={() => {}} />
        <TestTask />
      </DevAiProvider>,
    );
    await screen.findByTitle("ChatGPT 로그인 확인");
    fireEvent.click(screen.getByText("해설 테스트"));
    await screen.findByText("해설 생성 중");
    expect(
      (screen.getByLabelText("개발용 AI 도구") as HTMLSelectElement).disabled,
    ).toBe(true);
    expect(JSON.parse(fetcher.mock.calls[1][1].body).provider).toBe("codex");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "AI 작업 취소" }));
    });
    expect(taskSignal?.aborted).toBe(true);
    await screen.findByText("작업 취소됨");
    await waitFor(() =>
      expect(
        (screen.getByLabelText("개발용 AI 도구") as HTMLSelectElement).disabled,
      ).toBe(false),
    );
  });
});
