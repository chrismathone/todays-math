import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevAiProvider, useDevAi } from "@/components/unified/useDevAi";
import DevAiStatusPanel from "@/components/unified/DevAiStatusPanel";
import type { DevAiResponse } from "@/lib/dev-ai/contracts";

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

async function concurrentHarness({ delayAbort = false } = {}) {
  const pending: Array<{
    signal: AbortSignal;
    resolve: (response: Response) => void;
    reject: (error: Error) => void;
  }> = [];
  const fetcher = vi.fn().mockImplementation((_url, init) => {
    if (!init?.method) return Promise.resolve(Response.json(status));
    return new Promise<Response>((resolve, reject) => {
      pending.push({ signal: init.signal, resolve, reject });
      if (!delayAbort)
        init.signal.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const hook = renderHook(() => useDevAi(), {
    wrapper: ({ children }) => (
      <DevAiProvider>
        <DevAiStatusPanel collapsed={false} onExpand={() => {}} />
        {children}
      </DevAiProvider>
    ),
  });
  await waitFor(() => expect(hook.result.current.status?.enabled).toBe(true));
  const start = (signal?: AbortSignal) =>
    hook.result.current
      .run({ action: "solution", content: "1+1", grade: "초5" }, signal)
      .catch((error: Error) => error);
  const complete = (index: number) =>
    pending[index].resolve(
      Response.json({
        provider: "codex",
        action: "solution",
        result: { content: "1+1", answer: "2", solution: "2", warnings: [] },
      } satisfies DevAiResponse),
    );
  return { ...hook, pending, fetcher, start, complete };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe("development AI subscription status and task controller", () => {
  it("notifies queue owners before aborting requests and removes unmounted listeners", async () => {
    const h = await concurrentHarness();
    let call!: ReturnType<typeof h.start>;
    act(() => {
      call = h.start();
    });
    const removed = vi.fn();
    const unsubscribe = h.result.current.subscribeCancel(removed);
    unsubscribe();
    const owner = vi.fn(() => expect(h.pending[0].signal.aborted).toBe(false));
    h.result.current.subscribeCancel(owner);
    await act(async () => {
      h.result.current.cancel();
      await call;
    });
    expect(owner).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
    expect(h.pending[0].signal.aborted).toBe(true);
  });
  it("allows concurrent callers and keeps older completion from clearing newer work", async () => {
    const h = await concurrentHarness();
    let first!: ReturnType<typeof h.start>;
    let second!: ReturnType<typeof h.start>;
    act(() => {
      first = h.start();
      second = h.start();
      h.result.current.setProvider("grok");
    });
    expect(h.pending).toHaveLength(2);
    expect(h.result.current.activeCount).toBe(2);
    expect(h.result.current.provider).toBe("codex");
    expect(screen.getByText("AI 작업 2개 진행 중")).toBeTruthy();
    const secondId = h.result.current.activities[1].id;
    expect(h.result.current.activities[0].id).not.toBe(secondId);
    await act(async () => {
      h.complete(0);
      await first;
    });
    expect(h.result.current.activeCount).toBe(1);
    expect(h.result.current.activity).toMatchObject({
      id: secondId,
      state: "running",
    });
    expect(screen.getByLabelText("개발용 AI 도구")).toBeDisabled();
    await act(async () => {
      h.complete(1);
      await second;
    });
    expect(h.result.current.activities).toEqual([]);
    expect(h.result.current.activeCount).toBe(0);
    expect(h.result.current.activity).toMatchObject({
      id: secondId,
      state: "complete",
    });
    expect(screen.getByLabelText("개발용 AI 도구")).not.toBeDisabled();
  });

  it("cancels only the caller signal and cleans its listener without disturbing peers", async () => {
    const h = await concurrentHarness();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    let first!: ReturnType<typeof h.start>;
    let second!: ReturnType<typeof h.start>;
    act(() => {
      first = h.start(controller.signal);
      second = h.start();
    });
    await act(async () => {
      controller.abort();
      expect(await first).toMatchObject({ name: "AbortError" });
    });
    expect(h.pending[0].signal.aborted).toBe(true);
    expect(h.pending[1].signal.aborted).toBe(false);
    expect(h.result.current.activity?.state).toBe("running");
    expect(h.result.current.activeCount).toBe(1);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    await act(async () => {
      h.complete(1);
      await second;
    });
  });

  it("aborts every running or server-queued call and tracks them until they settle", async () => {
    const h = await concurrentHarness({ delayAbort: true });
    let calls!: ReturnType<typeof h.start>[];
    act(() => {
      calls = [h.start(), h.start(), h.start()];
      h.result.current.cancel();
    });
    expect(h.pending.every((request) => request.signal.aborted)).toBe(true);
    expect(h.result.current.activeCount).toBe(3);
    await act(async () => {
      // Late successful HTTP responses must still become cancellation.
      h.complete(1);
      expect(await calls[1]).toMatchObject({ name: "AbortError" });
    });
    expect(h.result.current.activeCount).toBe(2);
    expect(h.result.current.activity?.state).toBe("running");
    await act(async () => {
      h.complete(0);
      h.complete(2);
      await Promise.all(calls);
    });
    expect(h.result.current.activeCount).toBe(0);
    expect(h.result.current.activity?.state).toBe("cancelled");
  });

  it("rejects pre-aborted calls without requests and cancels all calls on unmount", async () => {
    const h = await concurrentHarness();
    const aborted = new AbortController();
    aborted.abort();
    expect(await h.start(aborted.signal)).toMatchObject({ name: "AbortError" });
    expect(h.pending).toHaveLength(0);
    let calls!: ReturnType<typeof h.start>[];
    act(() => {
      calls = [h.start(), h.start()];
    });
    await act(async () => {
      h.unmount();
      expect(await Promise.all(calls)).toEqual([
        expect.objectContaining({ name: "AbortError" }),
        expect.objectContaining({ name: "AbortError" }),
      ]);
    });
    expect(h.pending.every((request) => request.signal.aborted)).toBe(true);
  });

  it("keeps a peer running after failure and permits the next request", async () => {
    const h = await concurrentHarness();
    let calls!: ReturnType<typeof h.start>[];
    act(() => {
      calls = [h.start(), h.start()];
    });
    await act(async () => {
      h.pending[1].resolve(
        Response.json({ error: "CLI failed" }, { status: 502 }),
      );
      expect(await calls[1]).toMatchObject({ message: "CLI failed" });
    });
    expect(h.result.current.activeCount).toBe(1);
    expect(h.result.current.activity?.state).toBe("running");
    act(() => {
      calls.push(h.start());
    });
    expect(h.result.current.activeCount).toBe(2);
    await act(async () => {
      h.complete(0);
      h.complete(2);
      await Promise.all(calls);
    });
    expect(h.result.current.activeCount).toBe(0);
  });

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
