import { afterEach, describe, expect, it, vi } from "vitest";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import { createWorkspaceDraftStore } from "@/components/unified/draftStore";

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M0 0L20 20"/></svg>';
const crop: StudioCrop = {
  id: "crop-1",
  sourceId: "source-1",
  sourceLabel: "시험지.pdf",
  page: 2,
  rect: { x: 0, y: 0, width: 0.5, height: 0.5 },
  image: "data:image/png;base64,AAAA",
  content: "문제",
  answer: "1",
  solution: "풀이",
  level: "secondary",
  grade: "중1",
  mode: "text",
  added: false,
  ocr: {
    number: 4,
    blocks: [{ type: "text", value: "문제", rows: [] }],
    choiceGroups: [],
    subQuestions: [
      {
        number: 1,
        contents: [{ type: "equation", value: "x+1", rows: [] }],
        printedScore: "3.0",
        score: 3,
      },
    ],
    confidence: "high",
    choicesLayout: "2x3",
    bodyMissing: false,
    choicesMissing: false,
    labelType: "서답형",
    printedScore: "3.0",
    score: 3,
  },
  figures: [
    {
      id: "figure-1",
      rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      image: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      originalImage: "data:image/png;base64,BBBB",
      svg,
      spec: { version: 2 },
      engine: "todays-math-python",
      figureReview: { mode: "source-image-and-spec", passed: true, issues: [] },
    },
  ],
};
afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe("worksheet source provenance", () => {
  it("retains a detached editable crop and all figure variants through saving and reload", () => {
    vi.useFakeTimers();
    const problem = studioProblem(crop);
    expect(problem.studioCrop).toEqual(crop);
    expect(problem.studioCrop).not.toBe(crop);
    const store = createWorkspaceDraftStore();
    store.hydrate();
    expect(
      store.importDraft({
        version: 1,
        title: "원본 보존",
        problems: [problem],
        columns: 1,
        answers: true,
      }),
    ).toBe(true);
    const restored = createWorkspaceDraftStore();
    restored.hydrate();
    expect(restored.getSnapshot().draft.problems[0].studioCrop).toEqual(crop);
    expect(restored.getSnapshot().draft.problems[0].ocr).toEqual(crop.ocr);
    expect(restored.getSnapshot().draft.problems[0].figureUrls[0]).toContain(
      "data:image/svg+xml",
    );
  });
  it("rejects active SVG hidden in original-edit provenance before restoring it", () => {
    const problem = studioProblem(crop);
    problem.studioCrop!.figures![0].svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const store = createWorkspaceDraftStore();
    store.hydrate();
    expect(
      store.importDraft({ version: 1, title: "변조", problems: [problem] }),
    ).toBe(false);
  });
  it("rejects malformed typed OCR without replacing the existing draft", () => {
    const store = createWorkspaceDraftStore();
    store.hydrate();
    const before = store.getSnapshot().draft;
    expect(
      store.importDraft({
        version: 1,
        title: "잘못된 메타데이터",
        problems: [
          {
            ...studioProblem(crop),
            ocr: { ...crop.ocr, choicesLayout: "99x99" },
          },
        ],
      }),
    ).toBe(false);
    expect(store.getSnapshot().draft).toBe(before);
  });
});
