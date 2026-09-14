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
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("useWorkspaceDrafts browser lifecycle", () => {
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
      "<span>false:loading:오늘의 수학 학습지::</span>",
    );
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it("recovers once under StrictMode and never overwrites recovery with the initial empty state", () => {
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
      draft: {
        title: "복원할 작업",
        columns: 1,
        answers: true,
        problems: [problem("a")],
      },
    });
    act(() => vi.advanceTimersByTime(2000));
    expect(set).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LEGACY_DRAFT_KEY)).toBe(legacy);
    expect(result.current.recent).toHaveLength(1);
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

  it("flushes on unmount and restores the active draft on remount", () => {
    const first = renderHook(() => useWorkspaceDrafts());
    act(() => first.result.current.setProblems([problem("a")]));
    const id = first.result.current.draft.id;
    first.unmount();
    const second = renderHook(() => useWorkspaceDrafts());
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
