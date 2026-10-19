/**
 * 새 시험지 기본 양식(W6 · 2026-10-16) — 기본 양식이 있으면 새 시험지가 그 서식 · 머리 정보로 열린다.
 * 손대지 않은 빈 시험지에도 덮지만 저장하지 않는다(유령 시험지를 만들지 않는다). 담긴 시험지는 그대로다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkspaceDraftStore,
  DEFAULT_DRAFT_TITLE,
  type NewSheetSeed,
} from "@/components/unified/draftStore";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";

const problem = {
  id: "p1",
  content: "$1+1$",
  answer: "2",
  solution: "",
  grade: "중1",
  chapter: "",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
};
const seed: NewSheetSeed = {
  printOptions: {
    ...DEFAULT_PRINT_OPTIONS,
    template: "workbook",
    columns: 2,
    showAnswers: true,
    showDate: false,
  },
  printMeta: {
    schoolName: "인재원학원",
    subject: "수학",
    examDuration: "20분",
    examiner: "박선생",
    totalScore: 50,
    academyName: "",
    instructorName: "",
  },
};
function storeWithMemory() {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void values.set(key, value)),
  };
  return {
    storage,
    store: createWorkspaceDraftStore(() => storage, { autoResume: false }),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("new sheets open with the default 양식", () => {
  it("seeds the untouched blank sheet without saving it", () => {
    const { store, storage } = storeWithMemory();
    store.hydrate();
    store.seedNewSheet(seed);
    const { draft, saveStatus } = store.getSnapshot();
    expect(draft.printOptions).toEqual(seed.printOptions);
    expect(draft.columns).toBe(2);
    expect(draft.answers).toBe(true);
    expect(draft.printMeta).toMatchObject(seed.printMeta);
    expect(draft.title).toBe(DEFAULT_DRAFT_TITLE);
    expect(saveStatus).toBe("saved");
    vi.runAllTimers();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("every later new sheet starts from the seed; clearing it returns to 처음 값", () => {
    const { store } = storeWithMemory();
    store.hydrate();
    store.seedNewSheet(seed);
    store.setProblems([problem]);
    vi.runAllTimers();
    store.createDraft();
    expect(store.getSnapshot().draft.printOptions).toEqual(seed.printOptions);
    store.seedNewSheet(null);
    expect(store.getSnapshot().draft.printOptions).toEqual(
      DEFAULT_PRINT_OPTIONS,
    );
    expect(store.getSnapshot().draft.printMeta).toEqual(DEFAULT_PRINT_META);
  });

  it("never touches a sheet that already has problems or edits", () => {
    const { store } = storeWithMemory();
    store.hydrate();
    store.setProblems([problem]);
    store.seedNewSheet(seed);
    expect(store.getSnapshot().draft.printOptions).toEqual(
      DEFAULT_PRINT_OPTIONS,
    );
    vi.runAllTimers();
    store.seedNewSheet(seed);
    expect(store.getSnapshot().draft.printOptions).toEqual(
      DEFAULT_PRINT_OPTIONS,
    );
    expect(store.getSnapshot().draft.problems).toHaveLength(1);
  });

  it("a seed that arrives before hydration applies to the first sheet", () => {
    const { store } = storeWithMemory();
    store.seedNewSheet(seed);
    store.hydrate();
    expect(store.getSnapshot().draft.printOptions).toEqual(seed.printOptions);
  });
});
