import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkspaceDraftStore,
  DEFAULT_DRAFT_TITLE,
  DRAFT_STORE_KEY,
  LEGACY_DRAFT_KEY,
} from "@/components/unified/draftStore";

const problem = {
  id: "raw-problem",
  content: String.raw`원문 $\frac{1}{2}$\n  공백과 \\ 줄바꿈`,
  answer: String.raw`\frac{3}{4}`,
  solution: String.raw`$\dfrac{2}{3}$ 그대로`,
  grade: "초5",
  chapter: "분수",
  section: "계산",
  difficulty: "중",
  problemCode: "M-001",
  figureUrls: ["/figures/source/q01.svg"],
  figureDims: [400, 200],
  figureSourceMm: [45],
  figureSvg:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><path id="glyph" d="M0 0L1 1"/></defs><use href="#glyph"/><text x="20" y="20">½</text></svg>',
  croppedImage: "data:image/png;base64,aGVsbG8=",
  sourceLabel: "원본.pdf · 3쪽",
  source: { file: "원본.pdf", page: 3, crop: [1, 2, 30, 40] },
};

function memory() {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
  return {
    values,
    storage,
    create: () => createWorkspaceDraftStore(() => storage),
  };
}

const file = (title = "수학 원문", problems = [problem]) => ({
  version: 1,
  title,
  problems,
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("browser worksheet draft durability", () => {
  it("does not access storage or accept edits before hydration, and visiting never saves a blank draft", () => {
    const { storage, create } = memory();
    const store = create();
    store.setTitle("복원 전 수정");
    expect(store.saveNow()).toBe(false);
    expect(store.createDraft()).toBe(false);
    expect(store.importDraft(file())).toBe(false);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({
      hydrated: false,
      saveStatus: "loading",
      draft: { title: DEFAULT_DRAFT_TITLE },
    });
    store.hydrate();
    store.hydrate();
    vi.advanceTimersByTime(2000);
    expect(store.saveNow()).toBe(true);
    expect(store.getSnapshot().recent).toEqual([]);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("recovers the active worksheet, its settings, and all recent summaries after reload", () => {
    const { create } = memory();
    const first = create();
    first.hydrate();
    first.importDraft({ ...file("첫 작업"), columns: 1, answers: true });
    const firstId = first.getSnapshot().draft.id;
    vi.advanceTimersByTime(1000);
    first.importDraft(file("둘째 작업"));
    expect(first.openDraft(firstId)).toBe(true);
    const reload = create();
    reload.hydrate();
    expect(reload.getSnapshot()).toMatchObject({
      hydrated: true,
      saveStatus: "saved",
      draft: {
        id: firstId,
        title: "첫 작업",
        columns: 1,
        answers: true,
        problems: [problem],
      },
    });
    expect(reload.getSnapshot().recent.map((draft) => draft.title)).toEqual([
      "둘째 작업",
      "첫 작업",
    ]);
  });

  it("migrates the legacy draft once, preserving its source bytes, maths, crops, and metadata", () => {
    const { values, storage, create } = memory();
    const legacy = JSON.stringify(
      {
        ...file(),
        columns: 1,
        answers: true,
        updatedAt: "2026-08-01T10:00:00.000Z",
      },
      null,
      2,
    );
    values.set(LEGACY_DRAFT_KEY, legacy);
    const first = create();
    first.hydrate();
    expect(first.getSnapshot().draft).toMatchObject({
      columns: 1,
      answers: true,
      problems: [problem],
    });
    expect(values.get(LEGACY_DRAFT_KEY)).toBe(legacy);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const recoveredId = first.getSnapshot().draft.id;
    const reload = create();
    reload.hydrate();
    expect(reload.getSnapshot().draft.id).toBe(recoveredId);
    expect(reload.getSnapshot().recent).toHaveLength(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it("keeps a legacy draft usable when migration hits quota, and retries without losing the original", () => {
    const { values, storage, create } = memory();
    const legacy = JSON.stringify(file());
    values.set(LEGACY_DRAFT_KEY, legacy);
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const store = create();
    store.hydrate();
    expect(store.getSnapshot()).toMatchObject({
      hydrated: true,
      saveStatus: "error",
      draft: { problems: [problem] },
    });
    expect(store.getSnapshot().saveError).toContain("저장 공간");
    expect(values.get(LEGACY_DRAFT_KEY)).toBe(legacy);
    expect(values.has(DRAFT_STORE_KEY)).toBe(false);
    expect(store.saveNow()).toBe(true);
    expect(store.getSnapshot().recent).toHaveLength(1);
    expect(values.get(LEGACY_DRAFT_KEY)).toBe(legacy);
  });

  it("atomically saves rapid edits to the outgoing worksheet before creating or opening another", () => {
    const { storage, create } = memory();
    const store = create();
    store.hydrate();
    store.setProblems([problem]);
    const firstId = store.getSnapshot().draft.id;
    store.setTitle("마지막 제목");
    store.setProblems((current) => [...current, { ...problem, id: "second" }]);
    expect(store.createDraft()).toBe(true);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().draft.problems).toEqual([]);
    const secondId = store.getSnapshot().draft.id;
    store.setProblems([{ ...problem, id: "new-draft-problem" }]);
    expect(store.openDraft(firstId)).toBe(true);
    expect(store.getSnapshot().draft).toMatchObject({
      title: "마지막 제목",
      problems: [problem, { ...problem, id: "second" }],
    });
    expect(store.openDraft(secondId)).toBe(true);
    expect(store.getSnapshot().draft.problems[0].id).toBe("new-draft-problem");
    vi.advanceTimersByTime(1000);
    expect(store.getSnapshot().recent).toHaveLength(2);
  });

  it.each(["create", "open", "import"] as const)(
    "blocks %s on quota without pruning saved work or losing pending edits",
    (action) => {
      const { values, storage, create } = memory();
      const store = create();
      store.hydrate();
      store.importDraft(file("첫 작업"));
      const firstId = store.getSnapshot().draft.id;
      store.importDraft(file("둘째 작업"));
      const currentId = store.getSnapshot().draft.id;
      const durable = values.get(DRAFT_STORE_KEY);
      store.setTitle("아직 저장하지 못한 제목");
      storage.setItem.mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });
      const result =
        action === "create"
          ? store.createDraft()
          : action === "open"
            ? store.openDraft(firstId)
            : store.importDraft(file("셋째 작업"));
      expect(result).toBe(false);
      expect(store.getSnapshot()).toMatchObject({
        saveStatus: "error",
        draft: { id: currentId, title: "아직 저장하지 못한 제목" },
      });
      expect(store.getSnapshot().saveError).toContain("저장 공간");
      expect(store.getSnapshot().recent).toHaveLength(2);
      expect(values.get(DRAFT_STORE_KEY)).toBe(durable);
    },
  );

  it("retains unsaved edits if the incoming import itself exceeds quota", () => {
    const { values, storage, create } = memory();
    const store = create();
    store.hydrate();
    store.setProblems([problem]);
    const currentId = store.getSnapshot().draft.id;
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(store.importDraft(file("가져온 작업"))).toBe(false);
    expect(values.has(DRAFT_STORE_KEY)).toBe(false);
    expect(store.getSnapshot().draft.id).toBe(currentId);
    expect(store.saveNow()).toBe(true);
    const reload = create();
    reload.hydrate();
    expect(reload.getSnapshot().draft.problems).toEqual([problem]);
  });

  it.each([DRAFT_STORE_KEY, LEGACY_DRAFT_KEY])(
    "does not overwrite a malformed existing %s",
    (key) => {
      const { values, storage, create } = memory();
      values.set(key, "{broken source");
      const store = create();
      store.hydrate();
      store.setProblems([problem]);
      expect(store.saveNow()).toBe(false);
      expect(store.createDraft()).toBe(false);
      expect(store.importDraft(file())).toBe(false);
      expect(store.getSnapshot().saveError).toContain("덮어쓰지 않았습니다");
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(values.get(key)).toBe("{broken source");
    },
  );

  it("blocks writes when an existing store becomes malformed after hydration", () => {
    const { values, create } = memory();
    const store = create();
    store.hydrate();
    store.importDraft(file());
    values.set(DRAFT_STORE_KEY, '{"version":99,"drafts":[]}');
    store.setTitle("새 편집");
    expect(store.saveNow()).toBe(false);
    expect(values.get(DRAFT_STORE_KEY)).toBe('{"version":99,"drafts":[]}');
  });

  it("exposes a storage-permission failure without treating it as corrupt data or accepting a switch", () => {
    const store = createWorkspaceDraftStore(() => {
      throw new DOMException("denied", "SecurityError");
    });
    store.hydrate();
    expect(store.getSnapshot()).toMatchObject({
      hydrated: true,
      saveStatus: "error",
    });
    store.setProblems([problem]);
    expect(store.saveNow()).toBe(false);
    expect(store.createDraft()).toBe(false);
    expect(store.getSnapshot().saveError).toContain("저장 권한");
    expect(store.getSnapshot().draft.problems).toEqual([problem]);
  });

  it("preserves other tabs' unrelated work and rejects conflicting edits to the same worksheet", () => {
    const { values, create } = memory();
    const a = create();
    a.hydrate();
    a.importDraft(file());
    const b = create();
    b.hydrate();
    b.importDraft(file("다른 창의 새 작업"));
    a.setTitle("원래 작업 수정");
    expect(a.saveNow()).toBe(true);
    expect(a.getSnapshot().recent).toHaveLength(2);
    const c = create();
    c.hydrate();
    a.setTitle("먼저 저장한 수정");
    a.saveNow();
    const durable = values.get(DRAFT_STORE_KEY);
    c.setTitle("늦게 저장한 수정");
    expect(c.saveNow()).toBe(false);
    expect(c.getSnapshot().saveError).toContain("다른 창");
    expect(values.get(DRAFT_STORE_KEY)).toBe(durable);
  });

  it("preserves an intentional clear of a saved worksheet, while a fresh blank is absent from recents", () => {
    const { create } = memory();
    const store = create();
    store.hydrate();
    store.importDraft(file());
    const id = store.getSnapshot().draft.id;
    store.setProblems([]);
    store.createDraft();
    expect(store.getSnapshot().recent).toEqual([
      expect.objectContaining({ id, problemCount: 0 }),
    ]);
    const reload = create();
    reload.hydrate();
    expect(reload.getSnapshot().draft).toMatchObject({
      title: DEFAULT_DRAFT_TITLE,
      problems: [],
    });
    expect(reload.getSnapshot().draft.id).not.toBe(id);
    reload.openDraft(id);
    expect(reload.getSnapshot().draft.problems).toEqual([]);
  });

  it("refreshes a clean worksheet before editing again when another tab has changed it", () => {
    const { create } = memory();
    const first = create();
    first.hydrate();
    first.importDraft(file());
    const other = create();
    other.hydrate();
    other.setProblems((current) => [
      ...current,
      { ...problem, id: "added-in-other-tab" },
    ]);
    other.saveNow();
    expect(first.saveNow()).toBe(true);
    first.setTitle("다른 창의 문제를 보존하는 제목 수정");
    expect(first.saveNow()).toBe(true);
    expect(first.getSnapshot().draft.problems).toHaveLength(2);
  });
});

describe("worksheet JSON import validation", () => {
  it.each([
    null,
    [],
    { version: 2, title: "지원하지 않는 버전", problems: [] },
    { version: 1, title: {}, problems: [] },
    file("bad", [null as never]),
    file("bad", [{ ...problem, content: {} as never }]),
    file("bad", [{ ...problem, answer: [] as never }]),
    file("bad", [{ ...problem, figureUrls: [3 as never] }]),
    file("bad", [{ ...problem, figureDims: null as never }]),
    file("bad", [{ ...problem, figureDims: [-1] }]),
    file("bad", [problem, problem]),
    file("bad", [{ ...problem, croppedImage: "javascript:alert(1)" }]),
    file("bad", [{ ...problem, figureSvg: '<svg onload="alert(1)" />' }]),
    file("bad", [
      { ...problem, figureSvg: "<svg><script>alert(1)</script></svg>" },
    ]),
    file("bad", [
      {
        ...problem,
        figureSvg: "<svg><foreignObject><div>html</div></foreignObject></svg>",
      },
    ]),
    file("bad", [
      { ...problem, figureSvg: '<svg><use href="javascript:alert(1)"/></svg>' },
    ]),
    file("bad", [
      {
        ...problem,
        figureSvg:
          '<svg><rect style="fill:url(https://example.com/a.svg)"/></svg>',
      },
    ]),
    file("bad", [
      {
        ...problem,
        figureSvg:
          '<svg><title><![CDATA[</title><img src="x" onerror="alert(1)">]]></title></svg>',
      },
    ]),
  ])(
    "rejects malformed or active payload %# without touching the current worksheet",
    (value) => {
      const { values, create } = memory();
      const store = create();
      store.hydrate();
      store.importDraft(file());
      const current = store.getSnapshot().draft;
      const durable = values.get(DRAFT_STORE_KEY);
      expect(store.importDraft(value)).toBe(false);
      expect(store.getSnapshot().draft).toBe(current);
      expect(store.getSnapshot().saveError).toContain("작업 파일 형식");
      expect(values.get(DRAFT_STORE_KEY)).toBe(durable);
    },
  );

  it("supports older minimal problem records with safe defaults and leaves raw content untouched", () => {
    const { create } = memory();
    const store = create();
    store.hydrate();
    expect(
      store.importDraft({
        version: 1,
        title: "원문",
        columns: 3,
        answers: "yes",
        problems: [{ id: "p", content: problem.content }],
      }),
    ).toBe(true);
    expect(store.getSnapshot().draft).toMatchObject({
      columns: 2,
      answers: false,
      problems: [
        {
          id: "p",
          content: problem.content,
          answer: "",
          solution: "",
          grade: "",
          figureUrls: [],
          figureSvg: null,
          figureDims: [],
          figureSourceMm: [],
        },
      ],
    });
  });
});
