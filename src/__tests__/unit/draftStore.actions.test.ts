import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkspaceDraftStore,
  DRAFT_STORE_KEY,
} from "@/components/unified/draftStore";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const imported = (title: string) => ({
  version: 1,
  title,
  problems: [{ id: title, content: "문제" }],
  columns: 1,
  answers: false,
});
function twoDrafts() {
  const store = createWorkspaceDraftStore();
  store.hydrate();
  store.importDraft(imported("첫 시험지"));
  const first = store.getSnapshot().draft.id;
  store.importDraft(imported("둘째 시험지"));
  const second = store.getSnapshot().draft.id;
  return { store, first, second };
}
const saved = () => JSON.parse(localStorage.getItem(DRAFT_STORE_KEY)!);

describe("saved worksheet actions", () => {
  it("renames the active worksheet together with pending content and survives reload", () => {
    const { store, second } = twoDrafts();
    store.setProblems((problems) =>
      problems.map((p) => ({ ...p, content: "수정한 문제" })),
    );
    expect(store.renameDraft(second, "  새 이름  ")).toBe(true);
    expect(store.getSnapshot().draft.title).toBe("새 이름");
    const restored = createWorkspaceDraftStore();
    restored.hydrate();
    expect(restored.getSnapshot().draft).toMatchObject({
      id: second,
      title: "새 이름",
      problems: [{ content: "수정한 문제" }],
    });
  });
  it("renames an inactive worksheet without switching away from pending active work", () => {
    const { store, first, second } = twoDrafts();
    store.setTitle("아직 저장 전");
    expect(store.renameDraft(first, "보관함 이름")).toBe(true);
    expect(store.getSnapshot().draft).toMatchObject({
      id: second,
      title: "아직 저장 전",
    });
    expect(
      saved().drafts.find((d: { id: string }) => d.id === first).title,
    ).toBe("보관함 이름");
    expect(saved().activeId).toBe(second);
  });
  it("deletes an inactive worksheet and atomically saves outgoing active edits", () => {
    const { store, first, second } = twoDrafts();
    store.setTitle("보존할 현재 작업");
    expect(store.deleteDraft(first)).toBe(true);
    expect(saved().drafts).toHaveLength(1);
    expect(saved().drafts[0]).toMatchObject({
      id: second,
      title: "보존할 현재 작업",
    });
  });
  it("refuses to discard unsaved active edits and permits explicit deletion after saving", () => {
    const { store, second } = twoDrafts();
    const before = localStorage.getItem(DRAFT_STORE_KEY);
    store.setTitle("잃으면 안 되는 수정");
    expect(store.deleteDraft(second)).toBe(false);
    expect(store.getSnapshot().draft.title).toBe("잃으면 안 되는 수정");
    expect(localStorage.getItem(DRAFT_STORE_KEY)).toBe(before);
    expect(store.saveNow()).toBe(true);
    expect(store.deleteDraft(second)).toBe(true);
    expect(store.getSnapshot().draft.problems).toEqual([]);
    expect(store.getSnapshot().draft.id).not.toBe(second);
    expect(saved().activeId).toBe(null);
    vi.advanceTimersByTime(1000);
    expect(saved().drafts.some((d: { id: string }) => d.id === second)).toBe(
      false,
    );
  });
  it.each(["rename", "delete"])(
    "keeps durable and active data on a %s storage failure",
    (action) => {
      const { store, first } = twoDrafts();
      const before = localStorage.getItem(DRAFT_STORE_KEY),
        draft = store.getSnapshot().draft;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Full", "QuotaExceededError");
      });
      expect(
        action === "rename"
          ? store.renameDraft(first, "새 이름")
          : store.deleteDraft(first),
      ).toBe(false);
      expect(store.getSnapshot().draft).toBe(draft);
      expect(localStorage.getItem(DRAFT_STORE_KEY)).toBe(before);
    },
  );
  it.each(["rename", "delete"])(
    "rejects %s after another tab changes the target",
    (action) => {
      const { store, first } = twoDrafts();
      const other = createWorkspaceDraftStore();
      other.hydrate();
      expect(other.renameDraft(first, "다른 창 변경")).toBe(true);
      const before = localStorage.getItem(DRAFT_STORE_KEY);
      expect(
        action === "rename"
          ? store.renameDraft(first, "덮어쓰기")
          : store.deleteDraft(first),
      ).toBe(false);
      expect(localStorage.getItem(DRAFT_STORE_KEY)).toBe(before);
    },
  );
});
