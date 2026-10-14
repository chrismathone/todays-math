import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DRAFT_STORE_KEY,
  LEGACY_DRAFT_KEY,
} from "@/components/unified/draftStore";
import { useWorkspaceDrafts } from "@/components/unified/useWorkspaceDrafts";
import type { StudioProblem } from "@/components/unified/types";
import { privateServer } from "../fixtures/privateCloud";

const problem = (id: string): StudioProblem => ({
  id,
  content: String.raw`$\frac{1}{2}$ + $\frac{1}{3}$`,
  answer: "",
  solution: "",
  grade: "초5",
  chapter: "분수",
  section: "",
  difficulty: "중",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
});

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("useWorkspaceDrafts browser lifecycle", () => {
  it("shares early prepare with tab activation and StrictMode without publishing ready or saving early", async () => {
    const server = privateServer();
    const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return server.transport(url, init);
    });
    vi.stubGlobal("fetch", fetch);
    const set = vi.spyOn(Storage.prototype, "setItem");
    const { result, rerender } = renderHook(
      ({ active }) => useWorkspaceDrafts("owner-a", true, active),
      { initialProps: { active: false }, wrapper: StrictMode },
    );
    let preparing: void | Promise<void>;
    act(() => {
      preparing = result.current.prepare();
      expect(result.current.prepare()).toBe(preparing);
      result.current.setTitle("must not overwrite recovery");
    });
    rerender({ active: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(99);
    });
    expect(result.current.hydrated).toBe(false);
    expect(set).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await preparing;
    });
    expect(result.current.hydrated).toBe(true);
    expect(result.current.draft.title).not.toBe("must not overwrite recovery");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      server.transport.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
  });

  it("defers account storage until a worksheet tab opens and keeps the draft when leaving", async () => {
    const server = privateServer();
    vi.stubGlobal("fetch", server.transport);
    const get = vi.spyOn(Storage.prototype, "getItem");
    const set = vi.spyOn(Storage.prototype, "setItem");
    const { result, rerender, unmount } = renderHook(
      ({ active }) => useWorkspaceDrafts("owner-a", true, active),
      { initialProps: { active: false }, wrapper: StrictMode },
    );
    act(() => window.dispatchEvent(new Event("pagehide")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.hydrated).toBe(false);
    expect(server.transport).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();

    rerender({ active: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.hydrated).toBe(true);
    act(() => result.current.setProblems([problem("a")]));
    const id = result.current.draft.id;
    // Leaving before the debounce fires must still finish the pending edit.
    rerender({ active: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.saveStatus).toBe("saved");
    expect(
      server.transport.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);
    server.transport.mockClear();
    get.mockClear();
    set.mockClear();
    act(() => window.dispatchEvent(new Event("pagehide")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(server.transport).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();

    rerender({ active: true });
    expect(result.current.draft).toMatchObject({
      id,
      problems: [problem("a")],
    });
    expect(server.transport).not.toHaveBeenCalled();
    unmount();
  });

  it("can explicitly prepare a new worksheet from outside worksheet tabs", async () => {
    const server = privateServer();
    vi.stubGlobal("fetch", server.transport);
    const { result } = renderHook(() =>
      useWorkspaceDrafts("owner-a", true, false),
    );
    await act(async () => {
      await result.current.prepare();
    });
    await act(async () => {
      expect(await result.current.createDraft()).toBe(true);
    });
    act(() => result.current.setTitle("새 수학 시험지"));
    await act(async () => {
      expect(await result.current.saveNow()).toBe(true);
    });
    expect(result.current.draft.title).toBe("새 수학 시험지");
    expect(result.current.saveStatus).toBe("saved");
  });

  it("isolates signed-in cloud owners and does not adopt the unscoped development worksheet", async () => {
    const server = privateServer();
    vi.stubGlobal("fetch", server.transport);
    localStorage.setItem(
      LEGACY_DRAFT_KEY,
      JSON.stringify({
        version: 1,
        title: "개발 작업",
        problems: [problem("dev")],
        columns: 1,
        answers: false,
      }),
    );
    const first = renderHook(() => useWorkspaceDrafts("owner-a"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(first.result.current.draft.problems).toEqual([]);
    act(() => {
      first.result.current.setTitle("첫 계정 작업");
      first.result.current.setProblems([problem("a")]);
    });
    await act(async () => {
      await first.result.current.saveNow();
    });
    first.unmount();
    server.switchAccount("owner-b");
    const second = renderHook(() => useWorkspaceDrafts("owner-b"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(second.result.current.draft.problems).toEqual([]);
    second.unmount();
    server.switchAccount("owner-a");
    const restored = renderHook(() => useWorkspaceDrafts("owner-a"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(restored.result.current.draft.problems).toEqual([]);
    expect(restored.result.current.recent).toHaveLength(1);
    await act(async () => {
      expect(
        await restored.result.current.openDraft(
          restored.result.current.recent[0].id,
        ),
      ).toBe(true);
    });
    expect(restored.result.current.draft.title).toBe("첫 계정 작업");
    expect(
      restored.result.current.draft.problems.map((item) => item.id),
    ).toEqual(["a"]);
    expect(localStorage.getItem(DRAFT_STORE_KEY)).toBeNull();
  });

  it("does not access cloud documents or account caches when private menus are disabled", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    localStorage.setItem(`${DRAFT_STORE_KEY}:owner-a`, "preserved");
    const hook = renderHook(() => useWorkspaceDrafts("owner-a", false));
    expect(hook.result.current.saveStatus).toBe("disabled");
    expect(hook.result.current.draft.problems).toEqual([]);
    expect(hook.result.current.saveNow()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.getItem(`${DRAFT_STORE_KEY}:owner-a`)).toBe(
      "preserved",
    );
  });

  it("renders a deterministic SSR snapshot without touching browser storage", () => {
    const get = vi.spyOn(Storage.prototype, "getItem");
    const set = vi.spyOn(Storage.prototype, "setItem");
    function ServerSnapshot() {
      const { draft, hydrated, saveStatus } = useWorkspaceDrafts();
      return (
        <span>{`${hydrated}:${saveStatus}:${draft.title}:${draft.id}:${draft.updatedAt}`}</span>
      );
    }
    expect(renderToString(<ServerSnapshot />)).toBe(
      "<span>false:loading:오늘 수학 학습지::</span>",
    );
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it("lists legacy recovery under StrictMode and waits for explicit resume", () => {
    const legacy = JSON.stringify({
      version: 1,
      title: "복원할 작업",
      problems: [problem("a")],
      columns: 1,
      answers: true,
    });
    localStorage.setItem(LEGACY_DRAFT_KEY, legacy);
    const set = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useWorkspaceDrafts(), {
      wrapper: StrictMode,
    });
    expect(result.current).toMatchObject({
      hydrated: true,
      saveStatus: "saved",
      draft: { problems: [] },
    });
    act(() => vi.advanceTimersByTime(2000));
    expect(set).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LEGACY_DRAFT_KEY)).toBe(legacy);
    expect(result.current.recent).toHaveLength(1);
    act(() => {
      expect(result.current.openDraft(result.current.recent[0].id)).toBe(true);
    });
    expect(result.current.draft).toMatchObject({
      title: "복원할 작업",
      columns: 1,
      answers: true,
      problems: [problem("a")],
    });
  });

  it("debounces edits for 600ms and persists the latest composed functional updates", () => {
    const { result } = renderHook(() => useWorkspaceDrafts());
    const set = vi.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.setProblems([problem("a")]);
      result.current.setTitle("첫 제목");
    });
    act(() => vi.advanceTimersByTime(500));
    expect(set).not.toHaveBeenCalled();
    act(() => {
      result.current.setTitle("최종 제목");
      result.current.setProblems((current) => [...current, problem("b")]);
      result.current.setProblems((current) => [...current, problem("c")]);
      result.current.setColumns(1);
      result.current.setAnswers(true);
    });
    expect(result.current.saveStatus).toBe("saving");
    act(() => vi.advanceTimersByTime(599));
    expect(set).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(set).toHaveBeenCalledTimes(1);
    expect(result.current.saveStatus).toBe("saved");
    expect(result.current.draft.updatedAt).not.toBe("");
    const saved = JSON.parse(localStorage.getItem(DRAFT_STORE_KEY)!).drafts[0];
    expect(saved).toMatchObject({
      title: "최종 제목",
      columns: 1,
      answers: true,
    });
    expect(saved.problems.map((item: StudioProblem) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("flushes pagehide even when it fires in the same batch as an edit", () => {
    const { result } = renderHook(() => useWorkspaceDrafts());
    act(() => {
      result.current.setProblems([problem("a")]);
      result.current.setTitle("떠나기 직전");
      window.dispatchEvent(new Event("pagehide"));
    });
    const envelope = JSON.parse(localStorage.getItem(DRAFT_STORE_KEY)!);
    expect(envelope.drafts[0]).toMatchObject({
      title: "떠나기 직전",
      problems: [problem("a")],
    });
    expect(result.current.saveStatus).toBe("saved");
  });

  it("continues autosaving a newly created worksheet across separate edit cycles", () => {
    const { result } = renderHook(() => useWorkspaceDrafts());
    act(() => result.current.setProblems([problem("a")]));
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.saveStatus).toBe("saved");
    act(() => {
      result.current.setTitle("두 번째 자동 저장");
      result.current.setProblems((current) => [...current, problem("b")]);
    });
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.saveStatus).toBe("saved");
    expect(
      JSON.parse(localStorage.getItem(DRAFT_STORE_KEY)!).drafts[0],
    ).toMatchObject({
      title: "두 번째 자동 저장",
      problems: [problem("a"), problem("b")],
    });
  });

  it("preserves edits when new/open are invoked before React has rerendered", () => {
    const { result } = renderHook(() => useWorkspaceDrafts());
    const originalId = result.current.draft.id;
    act(() => {
      result.current.setProblems([problem("a")]);
      result.current.setProblems((current) => [...current, problem("b")]);
      result.current.setTitle("빠른 편집");
      expect(result.current.createDraft()).toBe(true);
    });
    expect(result.current.draft.problems).toEqual([]);
    act(() => {
      result.current.setProblems([problem("c")]);
      expect(result.current.openDraft(originalId)).toBe(true);
    });
    expect(result.current.draft).toMatchObject({
      title: "빠른 편집",
      problems: [problem("a"), problem("b")],
    });
    expect(result.current.recent).toHaveLength(2);
  });

  it("flushes on unmount and starts blank until explicit resume on remount", () => {
    const first = renderHook(() => useWorkspaceDrafts());
    act(() => first.result.current.setProblems([problem("a")]));
    const id = first.result.current.draft.id;
    first.unmount();
    const second = renderHook(() => useWorkspaceDrafts());
    expect(second.result.current.draft.problems).toEqual([]);
    expect(second.result.current.recent).toHaveLength(1);
    act(() => {
      expect(second.result.current.openDraft(id)).toBe(true);
    });
    expect(second.result.current.draft).toMatchObject({
      id,
      problems: [problem("a")],
    });
  });

  it("exposes quota errors after autosave and retries successfully without changing the active draft", () => {
    const { result } = renderHook(() => useWorkspaceDrafts());
    const id = result.current.draft.id;
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    act(() => result.current.setProblems([problem("a")]));
    act(() => vi.advanceTimersByTime(600));
    expect(result.current).toMatchObject({
      saveStatus: "error",
      draft: { id, problems: [problem("a")] },
    });
    expect(result.current.saveError).toContain("저장 공간");
    act(() => {
      expect(result.current.saveNow()).toBe(true);
    });
    expect(result.current).toMatchObject({
      saveStatus: "saved",
      saveError: null,
      draft: { id },
    });
  });
});
