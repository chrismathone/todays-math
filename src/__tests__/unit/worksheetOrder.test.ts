import { describe, expect, it } from "vitest";
import type { StudioProblem } from "@/components/unified/types";
import type { StudioCrop } from "@/components/unified/studioHelpers";
import {
  isSourceOrdered,
  sortBySourceOrder,
  worksheetRowLabel,
} from "@/components/unified/worksheetOrder";

function crop(sourceId: string, sourceLabel: string, page: number): StudioCrop {
  return {
    id: `${sourceId}-${page}`,
    sourceId,
    sourceLabel,
    page,
    rect: { x: 0, y: 0, width: 1, height: 1 },
    image: "data:image/png;base64,AA==",
    content: "",
    answer: "",
    solution: "",
    level: "secondary",
    grade: "중2",
    mode: "image",
    added: true,
  };
}

function problem(
  id: string,
  options: {
    sourceId?: string;
    sourceLabel?: string;
    page?: number;
    number?: number;
    section?: string;
  } = {},
): StudioProblem {
  const studioCrop =
    options.page === undefined
      ? undefined
      : crop(
          options.sourceId ?? "source-a",
          options.sourceLabel ?? "[경신중] (원본).pdf",
          options.page,
        );
  return {
    id,
    content: "",
    answer: "",
    solution: "",
    grade: "중2",
    chapter: "",
    section: options.section ?? "",
    difficulty: "",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
    ...(studioCrop ? { studioCrop } : {}),
    ...(options.number === undefined
      ? {}
      : {
          ocr: {
            number: options.number,
            blocks: [],
            choiceGroups: [],
            subQuestions: [],
            confidence: "high" as const,
            choicesLayout: "auto" as const,
            bodyMissing: false,
            choicesMissing: false,
          },
        }),
    ...(options.sourceLabel === undefined && options.page === undefined
      ? {}
      : {
          sourceLabel: `${options.sourceLabel ?? "[경신중] (원본).pdf"} · ${options.page}쪽`,
        }),
  };
}

describe("문제 순서 칸의 이름", () => {
  it("원본 쪽과 인쇄된 번호만 보여 준다", () => {
    const label = worksheetRowLabel(problem("a", { page: 3, number: 7 }));
    expect(label.text).toBe("3쪽 7번");
  });
  it("파일 이름은 글자로 두지 않고 title 에만 남긴다", () => {
    const label = worksheetRowLabel(
      problem("a", { sourceLabel: "[경신중][2][25-2-중간].pdf", page: 1 }),
    );
    expect(label.text).not.toContain(".pdf");
    expect(label.title).toContain("[경신중][2][25-2-중간].pdf");
  });
  it("문자 인식 전이라 번호를 모르면 쪽만 쓴다 — 번호를 지어내지 않는다", () => {
    const label = worksheetRowLabel(problem("a", { page: 12 }));
    expect(label.text).toBe("12쪽");
  });
  it("원본 쪽이 없는 문제은행 문항은 지금처럼 단원명을 쓴다", () => {
    const label = worksheetRowLabel(problem("a", { section: "일차방정식" }));
    expect(label.text).toBe("일차방정식");
  });
  it("아무 이름도 없으면 «가져온 문제»로 둔다", () => {
    expect(worksheetRowLabel(problem("a")).text).toBe("가져온 문제");
  });
});

describe("원본 차례로 되돌리기", () => {
  it("한 파일 안에서는 쪽·번호 차례로 세운다", () => {
    const list = [
      problem("c", { page: 2, number: 1 }),
      problem("a", { page: 1, number: 3 }),
      problem("b", { page: 1, number: 10 }),
    ];
    expect(sortBySourceOrder(list).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
  it("파일이 섞여 있으면 파일끼리 묶고 처음 나온 파일을 앞에 둔다", () => {
    const list = [
      problem("b1", { sourceId: "b", page: 2, number: 1 }),
      problem("a2", { sourceId: "a", page: 1, number: 2 }),
      problem("a1", { sourceId: "a", page: 1, number: 1 }),
      problem("b0", { sourceId: "b", page: 1, number: 9 }),
    ];
    expect(sortBySourceOrder(list).map((p) => p.id)).toEqual([
      "b0",
      "b1",
      "a1",
      "a2",
    ]);
  });
  it("원본 자리를 모르는 문항은 지금 자리를 지킨다", () => {
    const list = [
      problem("bank1", { section: "일차방정식" }),
      problem("s2", { page: 2, number: 1 }),
      problem("s1", { page: 1, number: 1 }),
      problem("bank2", { section: "부등식" }),
    ];
    expect(sortBySourceOrder(list).map((p) => p.id)).toEqual([
      "bank1",
      "s1",
      "s2",
      "bank2",
    ]);
  });
  it("번호를 모르는 문항은 같은 쪽 안에서 지금 차례를 지킨다", () => {
    const list = [
      problem("y", { page: 1 }),
      problem("x", { page: 1 }),
      problem("z", { page: 1, number: 4 }),
    ];
    expect(sortBySourceOrder(list).map((p) => p.id)).toEqual(["y", "x", "z"]);
  });
  it("두 번 눌러도 결과가 같다", () => {
    const list = [
      problem("c", { page: 3, number: 1 }),
      problem("a", { page: 1, number: 1 }),
      problem("b", { page: 2, number: 1 }),
    ];
    const once = sortBySourceOrder(list);
    expect(sortBySourceOrder(once)).toEqual(once);
  });
  it("이미 원본 차례이면 그렇다고 답한다", () => {
    const ordered = [
      problem("a", { page: 1, number: 1 }),
      problem("b", { page: 2, number: 1 }),
    ];
    expect(isSourceOrdered(ordered)).toBe(true);
    expect(isSourceOrdered([ordered[1], ordered[0]])).toBe(false);
  });
  it("빈 목록과 한 문항은 이미 원본 차례다", () => {
    expect(isSourceOrdered([])).toBe(true);
    expect(isSourceOrdered([problem("a", { page: 9, number: 2 })])).toBe(true);
  });
});
