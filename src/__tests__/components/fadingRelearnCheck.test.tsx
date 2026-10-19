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
import userEvent from "@testing-library/user-event";
import {
  usePausedFeedback,
  usePausedQuestionClock,
} from "@/components/math-srs/usePausedQuestionClock";
import {
  FadingRelearnCheck,
  FadingRelearnModal,
  FadingRelearnStatus,
} from "@/components/fading/FadingRelearnCheck";
import { useFadingRelearn } from "@/components/fading/useFadingRelearn";
import type {
  FadingRelearnItem,
  FadingRelearnQueue,
  FadingRelearnResult,
} from "@/contracts/fadingRelearn.contract";
import type { FadingRelearnSource } from "@/lib/fading/relearnSource";
import { FadingSourceError, newFadingId } from "@/lib/fading/source";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const content: FadingRelearnQueue["contents"][string] = {
  concept: {
    id: "minute-ui-test",
    section: "중2::도형",
    level: "하",
    ordinal: 1,
    siblings: 1,
    propositions: [
      {
        id: "p0",
        term: "외심",
        kind: "정의",
        pieces: [
          { kind: "text", text: "이 중심은 " },
          {
            kind: "target",
            target: { id: "p0#1", text: "외심", tier: "text" },
          },
          { kind: "text", text: "이고 거리는 " },
          {
            kind: "target",
            target: { id: "p0#2", text: "반지름", tier: "text" },
          },
          { kind: "text", text: "입니다." },
        ],
      },
    ],
  },
  traps: [],
};
const item: FadingRelearnItem = {
  key: "minute-ui-test/p0",
  conceptId: content.concept.id,
  propositionId: "p0",
  token: newFadingId(),
  state: "ready",
  stage: "retry",
  origin: "missed",
  dueAt: 1000,
  waitMs: 0,
  since: 0,
  fails: 1,
  checks: 0,
  changed: false,
};
function queue(items: FadingRelearnItem[] = [item]): FadingRelearnQueue {
  return {
    enabled: true,
    now: 1000,
    intervals: { retryMs: 60000, confirmMs: 300000 },
    items,
    contents: { [content.concept.id]: content },
    counts: {
      ready: items.filter((row) => row.state === "ready").length,
      judging: items.filter((row) => row.state === "judging").length,
      waiting: items.filter((row) => row.state === "waiting").length,
    },
    nextDueAt: null,
    today: { on: "2026-10-07", checks: 0, cleared: 0, entered: 1 },
  };
}
function result(
  attemptId: string,
  verdict: FadingRelearnResult["verdict"] = "passed",
): FadingRelearnResult {
  return {
    attemptId,
    conceptId: item.conceptId,
    propositionId: item.propositionId,
    verdict,
    targets: [],
    next: { stage: "confirm", dueAt: 301000 },
    replayed: false,
  };
}
function source(): FadingRelearnSource {
  return {
    queue: vi.fn(async () => queue()),
    record: vi.fn(),
    grade: vi.fn(async (attempt) => ({
      queue: queue([]),
      result: result(attempt.attemptId),
    })),
    judge: vi.fn(async (judgement) => ({
      queue: queue([]),
      result: result(judgement.attemptId),
    })),
  };
}
function view(api = source(), current = item, onConflict = vi.fn()) {
  const onQueue = vi.fn();
  const close = vi.fn();
  const rendered = render(
    <FadingRelearnCheck
      item={current}
      content={content}
      source={api}
      onQueue={onQueue}
      onConflict={onConflict}
      onClose={close}
    />,
  );
  return { api, close, onQueue, onConflict, ...rendered };
}
function fill() {
  fireEvent.change(screen.getByLabelText("빈칸 1"), {
    target: { value: "외심" },
  });
  fireEvent.change(screen.getByLabelText("빈칸 2"), {
    target: { value: "반지름" },
  });
}
function QueueHost({ api }: { api: FadingRelearnSource }) {
  const controller = useFadingRelearn(api);
  return (
    <>
      <FadingRelearnStatus controller={controller} />
      <FadingRelearnModal controller={controller} />
    </>
  );
}

describe("minute typed checks", () => {
  it("keeps the final result visible after its last queue content is removed, then releases the paused screen", async () => {
    const api = source();
    vi.mocked(api.grade).mockImplementationOnce(async (attempt) => ({
      queue: { ...queue([]), contents: {} },
      result: { ...result(attempt.attemptId), next: null },
    }));
    render(<QueueHost api={api} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "추가 확인 시작" }),
    );
    fill();
    fireEvent.click(screen.getByRole("button", { name: "답 제출" }));
    const close = await screen.findByRole("button", { name: "원래 학습으로" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "이 문장의 추가 확인을 마쳤어요",
    );
    fireEvent.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("types every target, switches blanks with Tab and keeps canonical/correctness hidden until server receipt", async () => {
    const api = source();
    let accept!: (
      value: Awaited<ReturnType<FadingRelearnSource["grade"]>>,
    ) => void;
    vi.mocked(api.grade).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          accept = resolve;
        }),
    );
    view(api);
    expect(screen.queryByText("외심")).not.toBeInTheDocument();
    expect(screen.queryByText("반지름")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "같은 뜻" }),
    ).not.toBeInTheDocument();
    fill();
    const first = screen.getByLabelText("빈칸 1");
    first.focus();
    fireEvent.keyDown(first, { key: "Tab" });
    expect(screen.getByLabelText("빈칸 2")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(api.grade).toHaveBeenCalledTimes(1);
    const attempt = vi.mocked(api.grade).mock.calls[0]![0];
    expect(attempt.answers).toEqual([
      { targetId: "p0#1", text: "외심" },
      { targetId: "p0#2", text: "반지름" },
    ]);
    expect(
      screen.queryByLabelText("추가 확인 기준안 대조"),
    ).not.toBeInTheDocument();
    await act(async () =>
      accept({ queue: queue([]), result: result(attempt.attemptId) }),
    );
    expect(screen.getByLabelText("추가 확인 기준안 대조")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("5분 뒤");
  });

  it("retries the identical attempt after a lost response and refreshes on 409", async () => {
    const api = source();
    vi.mocked(api.grade).mockRejectedValueOnce(
      new FadingSourceError("OFFLINE", "응답을 받지 못했어요", 0),
    );
    const { onConflict } = view(api);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "답 제출" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "같은 답 다시 보내기" }),
    );
    await screen.findByRole("button", { name: "원래 학습으로" });
    expect(vi.mocked(api.grade).mock.calls[1]![0]).toEqual(
      vi.mocked(api.grade).mock.calls[0]![0],
    );
    expect(onConflict).not.toHaveBeenCalled();
    cleanup();
    vi.mocked(api.grade).mockRejectedValueOnce(
      new FadingSourceError("CONFLICT", "문장이 바뀌었어요", 409),
    );
    view(api, item, onConflict);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "답 제출" }));
    await waitFor(() => expect(onConflict).toHaveBeenCalledOnce());
    expect(
      screen.queryByLabelText("추가 확인 기준안 대조"),
    ).not.toBeInTheDocument();
  });

  it("resumes persisted unknown wording with same/different comparison and original attempt ID", async () => {
    const pending = {
      ...item,
      state: "judging" as const,
      pending: {
        attemptId: newFadingId(),
        answers: [
          { targetId: "p0#1", text: "바깥 중심", outcome: "unknown" as const },
          { targetId: "p0#2", text: "반지름", outcome: "correct" as const },
        ],
      },
    };
    const { api } = view(source(), pending);
    expect(screen.getByText("내 답: 바깥 중심")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "대조 제출" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "같은 뜻" }));
    fireEvent.click(screen.getByRole("button", { name: "대조 제출" }));
    await screen.findByRole("button", { name: "원래 학습으로" });
    expect(api.grade).not.toHaveBeenCalled();
    expect(api.judge).toHaveBeenCalledWith({
      conceptId: item.conceptId,
      propositionId: item.propositionId,
      attemptId: pending.pending.attemptId,
      judged: { "p0#1": "same" },
    });
  });

  it("does not submit an IME Enter and sends a give-up before displaying any answer", async () => {
    const { api } = view();
    fireEvent.keyDown(screen.getByLabelText("빈칸 1"), {
      key: "Enter",
      isComposing: true,
    });
    expect(api.grade).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    await screen.findByRole("button", { name: "원래 학습으로" });
    expect(api.grade).toHaveBeenCalledWith(
      expect.objectContaining({ answers: [], gaveUp: true }),
    );
  });
});

describe("server clock queue controller", () => {
  it("keeps the original main source and sends no evidence when the server queue is disabled", async () => {
    const api = source();
    vi.mocked(api.queue).mockResolvedValue({ ...queue([]), enabled: false });
    const { result: hook } = renderHook(() => useFadingRelearn(api));
    await act(async () => {});
    const main = {
      state: vi.fn(),
      act: vi.fn(),
      catalog: vi.fn(),
      concept: vi.fn(),
    };
    expect(hook.current.wrap(main)).toBe(main);
    await act(async () =>
      hook.current.record({
        kind: "step",
        conceptId: item.conceptId,
        sessionId: newFadingId(),
        step: 2,
        placements: [],
        gaveUp: true,
      }),
    );
    expect(api.record).not.toHaveBeenCalled();
    expect(hook.current.failure).toBeNull();
  });
  it("excludes the overlay from question elapsed time without resetting earlier work and resumes the feedback remainder", async () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const complete = vi.fn();
    const { result: clock, rerender } = renderHook(
      ({ paused }) => {
        const elapsed = usePausedQuestionClock(paused);
        usePausedFeedback(complete, "question1", paused);
        return elapsed;
      },
      { initialProps: { paused: false } },
    );
    now = 400;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    rerender({ paused: true });
    expect(clock.current()).toBe(0.4);
    now = 300400;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300000);
    });
    expect(clock.current()).toBe(0.4);
    expect(complete).not.toHaveBeenCalled();
    rerender({ paused: false });
    now += 799;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(complete).not.toHaveBeenCalled();
    now += 1;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(complete).toHaveBeenCalledOnce();
    expect(clock.current()).toBe(1.2);
  });
  it("refreshes at server deadline/focus/visibility and only opens at a sentence boundary", async () => {
    vi.useFakeTimers();
    let monotonic = 0;
    vi.spyOn(performance, "now").mockImplementation(() => monotonic);
    const api = source();
    vi.mocked(api.queue).mockResolvedValueOnce({
      ...queue([{ ...item, state: "waiting", waitMs: 1000 }]),
      now: 0,
      nextDueAt: 1000,
    });
    const { result: hook } = renderHook(() => useFadingRelearn(api));
    await act(async () => {});
    expect(hook.current.active).toBeNull();
    vi.setSystemTime(new Date("2099-01-01"));
    expect(api.queue).toHaveBeenCalledTimes(1);
    monotonic = 1000;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(api.queue).toHaveBeenCalledTimes(2);
    expect(hook.current.queue?.counts.ready).toBe(1);
    expect(hook.current.active).toBeNull();
    act(() => hook.current.boundary());
    expect(hook.current.active?.key).toBe(item.key);
    act(() => hook.current.dismiss());
    await act(async () => fireEvent(window, new Event("focus")));
    await act(async () => fireEvent(document, new Event("visibilitychange")));
    expect(api.queue).toHaveBeenCalledTimes(4);
    expect(hook.current.active).toBeNull();
  });

  it("ignores an old identity's delayed queue and drops its open check", async () => {
    const first = source(),
      second = source();
    let resolve!: (value: FadingRelearnQueue) => void;
    vi.mocked(first.queue).mockImplementationOnce(
      () =>
        new Promise((ready) => {
          resolve = ready;
        }),
    );
    const { result: hook, rerender } = renderHook(
      ({ api }) => useFadingRelearn(api),
      { initialProps: { api: first } },
    );
    rerender({ api: second });
    await act(async () => {});
    act(() => hook.current.boundary());
    expect(hook.current.active?.key).toBe(item.key);
    await act(async () => resolve(queue([])));
    expect(hook.current.queue?.counts.ready).toBe(1);
    rerender({ api: first });
    await act(async () => {});
    expect(hook.current.active).toBeNull();
  });
});

describe("오늘의 끝 — 하루 30회 · 같은 문장 «틀림» 3회(2026-10-17 · Hi-fi Q2)", () => {
  const RESUME = 86_400_000;
  const ended = (
    o: { capped?: boolean; stopped?: number },
    items: FadingRelearnItem[] = [],
  ): FadingRelearnQueue => ({
    ...queue(items),
    limit: {
      cap: 30,
      checks: o.capped ? 30 : 12,
      reserved: 0,
      capped: o.capped ?? false,
      stopped: o.stopped ?? 0,
      resumeAt: RESUME,
    },
  });

  it("추가 확인 칸에 구분선 아래 두 줄 — 상한 수(30)는 보이지 않는다", async () => {
    const api = source();
    vi.mocked(api.queue).mockResolvedValue(ended({ capped: true, stopped: 2 }));
    render(<QueueHost api={api} />);
    const status = await screen.findByRole("complementary", {
      name: "추가 재학습 현황",
    });
    await waitFor(() =>
      expect(status).toHaveTextContent(
        "오늘 추가 확인은 여기까지예요. 남은 문장은 내일부터 이어서 확인해요.",
      ),
    );
    expect(status).toHaveTextContent(
      "오늘 멈춘 문장 2 · 내일부터 다시 확인해요.",
    );
    expect(status).not.toHaveTextContent("30");
    expect(
      screen.queryByRole("button", { name: "추가 확인 시작" }),
    ).not.toBeInTheDocument();
  });

  it("세 번째로 틀린 문장은 그 자리에서 «오늘 여기까지»", async () => {
    const api = source();
    vi.mocked(api.grade).mockImplementationOnce(async (attempt) => ({
      queue: ended({ stopped: 1 }, [
        { ...item, state: "waiting", dueAt: RESUME, waitMs: RESUME - 1000 },
      ]),
      result: {
        ...result(attempt.attemptId, "failed"),
        next: { stage: "retry", dueAt: 61000 },
      },
    }));
    view(api);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "답 제출" }));
    expect(
      await screen.findByText(/이 문장은 오늘 여기까지예요/),
    ).toHaveTextContent("내일부터 다시 확인해요.");
    expect(screen.getByRole("status")).not.toHaveTextContent("1분 뒤");
  });

  it("30회째 확인 뒤에는 그날의 끝을 알린다", async () => {
    const api = source();
    vi.mocked(api.grade).mockImplementationOnce(async (attempt) => ({
      queue: ended({ capped: true }),
      result: result(attempt.attemptId),
    }));
    view(api);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "답 제출" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "오늘 추가 확인은 여기까지예요.",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("5분 뒤");
  });
});
