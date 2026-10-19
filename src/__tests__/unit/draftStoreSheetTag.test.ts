/**
 * 시험지 태그(W8) — 시험지 초안에 같이 저장되고, 다시 열거나 작업 파일로 오가도 남는다.
 * 칸이 없는 옛 저장본은 «태그 없음», 모르는 값도 «태그 없음»(여는 일을 막지 않는다).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkspaceDraftStore,
  DRAFT_STORE_KEY,
  parseImport,
} from "@/components/unified/draftStore";

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
function memory() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
  return {
    values,
    create: () =>
      createWorkspaceDraftStore(() => storage, { autoResume: true }),
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("sheet tag in the worksheet draft", () => {
  it("saves with the draft and comes back when the sheet is reopened", () => {
    const m = memory();
    const store = m.create();
    store.hydrate();
    store.setProblems([problem]);
    store.setTag("일일TEST");
    vi.runAllTimers();
    const saved = JSON.parse(m.values.get(DRAFT_STORE_KEY)!);
    expect(saved.drafts[0].tag).toBe("일일TEST");
    const again = m.create();
    again.hydrate();
    expect(again.getSnapshot().draft.tag).toBe("일일TEST");
    again.setTag(null);
    vi.runAllTimers();
    expect(
      JSON.parse(m.values.get(DRAFT_STORE_KEY)!).drafts[0],
    ).not.toHaveProperty("tag");
  });

  it("a work file keeps the tag; old files and unknown values read as no tag", () => {
    const file = { version: 1, title: "시험", problems: [problem] };
    expect(parseImport({ ...file, tag: "숙제" }).tag).toBe("숙제");
    expect(parseImport(file)).not.toHaveProperty("tag");
    expect(parseImport({ ...file, tag: "기말" })).not.toHaveProperty("tag");
  });

  it("a new sheet starts without a tag", () => {
    const m = memory();
    const store = m.create();
    store.hydrate();
    store.setProblems([problem]);
    store.setTag("오답");
    vi.runAllTimers();
    store.createDraft();
    expect(store.getSnapshot().draft.tag).toBeUndefined();
  });
});
