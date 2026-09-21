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
    // `added: true` 는 옛 배포본의 draftStore 를 위한 칸이다(`StudioCrop.added`) — 나머지는 그대로.
    const snapshot = { ...crop, added: true };
    expect(problem.studioCrop).toEqual(snapshot);
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
    expect(restored.getSnapshot().draft.problems[0].studioCrop).toEqual(
      snapshot,
    );
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
  it("«담음» 칸(added)이 없는 원본 편집 스냅숏도 읽는다 — 담았는지는 시험지 목록이 정한다", () => {
    const problem = studioProblem(crop);
    const { added: _legacy, ...withoutAdded } = problem.studioCrop!;
    void _legacy;
    const store = createWorkspaceDraftStore();
    store.hydrate();
    expect(
      store.importDraft({
        version: 1,
        title: "added 없는 스냅숏",
        problems: [{ ...problem, studioCrop: withoutAdded }],
      }),
    ).toBe(true);
    expect(store.getSnapshot().draft.problems[0].studioCrop?.id).toBe("crop-1");
    // 칸이 있는데 boolean 이 아니면 여전히 막는다.
    expect(
      store.importDraft({
        version: 1,
        title: "added 가 문자",
        problems: [
          { ...problem, studioCrop: { ...withoutAdded, added: "yes" } },
        ],
      }),
    ).toBe(false);
  });
});
