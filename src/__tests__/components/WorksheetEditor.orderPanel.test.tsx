import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorksheetEditor from "@/components/unified/WorksheetEditor";
import type { StudioProblem } from "@/components/unified/types";
import type { StudioCrop } from "@/components/unified/studioHelpers";

vi.mock("@/components/unified/print/PrintOptionsPanel", () => ({
  PrintOptionsPanel: () => null,
}));
vi.mock("@/components/unified/print/WorksheetPrint", () => ({
  WorksheetPrint: () => <div data-mathgen-document />,
}));

const FILE = "[경신중][2][25-2-중간][미래엔] (원본).pdf";

function crop(page: number, sourceId = "source-a"): StudioCrop {
  return {
    id: `${sourceId}-${page}`,
    sourceId,
    sourceLabel: FILE,
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
  page: number,
  number?: number,
  sourceId?: string,
): StudioProblem {
  return {
    id,
    content: "",
    answer: "",
    solution: "",
    grade: "중2",
    chapter: "직접 가져온 문제",
    section: "",
    difficulty: "",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
    studioCrop: crop(page, sourceId),
    sourceLabel: `${FILE} · ${page}쪽`,
    ...(number === undefined
      ? {}
      : {
          ocr: {
            number,
            blocks: [],
            choiceGroups: [],
            subQuestions: [],
            confidence: "high" as const,
            choicesLayout: "auto" as const,
            bodyMissing: false,
            choicesMissing: false,
          },
        }),
  };
}

function setup(
  selected: StudioProblem[],
  arithmetic = false,
  builderScrollFrame = false,
) {
  const reorder = vi.fn();
  const props = {
    builderScrollFrame,
    selected,
    title: "시험지",
    columns: 2,
    answers: true,
    savedAt: "",
    setTitle: vi.fn(),
    setColumns: vi.fn(),
    setAnswers: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    download: vi.fn(),
    toggle: vi.fn(),
    move: vi.fn(),
    reorder,
    navigate: vi.fn(),
    onEditSource: vi.fn(),
    fixedComposition: arithmetic,
  };
  render(<WorksheetEditor {...props} />);
  fireEvent.click(
    screen.getByRole("tab", { name: arithmetic ? /유형별 구성/ : /문제 순서/ }),
  );
  return { reorder, props };
}

describe("문제 순서 칸 — 이름", () => {
  it("opts only the builder into a measured output frame", () => {
    setup([problem("frame", 1)], false, true);
    const inspector = screen.getByRole("complementary", {
      name: "시험지 설정",
    });
    expect(inspector.parentElement).toHaveAttribute("data-output-layout");
    expect(inspector.closest("main")?.className).toContain("builderFrame");
    expect(inspector.parentElement?.children).toHaveLength(2);
  });
  it("keeps the shared editor outside the builder frame by default", () => {
    setup([problem("default", 1)]);
    const inspector = screen.getByRole("complementary", {
      name: "시험지 설정",
    });
    expect(inspector.parentElement).not.toHaveAttribute("data-output-layout");
    expect(inspector.closest("main")?.className).not.toContain("builderFrame");
  });
  it("shows type counts and number ranges once per group for arithmetic", () => {
    const selected = Array.from({ length: 6 }, (_, index) => ({
      ...problem(`arithmetic-${index}`, 1),
      arithmetic: {
        round: index < 4 ? 1 : 2,
        number: index + 1,
        groupKey: index < 2 ? "add" : "subtract",
        groupTitle: index < 2 ? "두 자리 덧셈" : "두 자리 뺄셈",
      },
    }));
    setup(selected, true);
    expect(screen.getByRole("heading", { name: "유형별 구성" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "1회차" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "2회차" })).toBeVisible();
    expect(screen.getByText("두 자리 덧셈")).toBeVisible();
    expect(screen.getAllByText("두 자리 뺄셈")).toHaveLength(2);
    expect(screen.getAllByText("2문항")).toHaveLength(3);
    for (const range of ["1–2번", "3–4번", "5–6번"])
      expect(screen.getByText(range)).toBeVisible();
    expect(screen.queryByRole("button", { name: "순서 초기화" })).toBeNull();
    expect(screen.queryByRole("button", { name: /문제 위로/ })).toBeNull();
  });
  it("«N쪽 M번» 만 글자로 쓰고 파일 이름은 title 에만 둔다", () => {
    setup([problem("a", 1, 3)]);
    const name = screen.getByText("1쪽 3번");
    expect(name.textContent).not.toContain(".pdf");
    expect(name).toHaveAttribute("title", `${FILE} · 1쪽`);
  });
  it("번호를 모르면 쪽만 쓴다", () => {
    setup([problem("a", 12)]);
    expect(screen.getByText("12쪽")).toBeVisible();
  });
  it("둘째 줄의 학년·출처는 그대로 둔다", () => {
    setup([problem("a", 1, 3)]);
    expect(screen.getByText("중2 · 내 자료")).toBeVisible();
  });
});

describe("문제 순서 칸 — 단추 넷", () => {
  it("넷이 한 줄에 같은 부모로 나란히 선다", () => {
    setup([problem("a", 1, 1), problem("b", 2, 1)]);
    const names = [
      "1번 원본 편집",
      "1번 문제 위로",
      "1번 문제 아래로",
      "1번 문제 빼기",
    ];
    const buttons = names.map((name) => screen.getByRole("button", { name }));
    const row = buttons[0].parentElement;
    expect(row?.tagName).toBe("DIV");
    for (const button of buttons) expect(button.parentElement).toBe(row);
    expect([...(row?.children ?? [])]).toEqual(buttons);
  });
  it("원본 편집은 줄바꿈을 막는 제 클래스를 갖는다", () => {
    setup([problem("a", 1, 1)]);
    const edit = screen.getByRole("button", { name: "1번 원본 편집" });
    expect(edit.className).toMatch(/orderEdit/);
  });
  it("위로·아래로·빼기는 같은 정사각형 클래스를 함께 쓴다", () => {
    setup([problem("a", 1, 1), problem("b", 2, 1)]);
    const squares = ["1번 문제 위로", "1번 문제 아래로", "1번 문제 빼기"].map(
      (name) => screen.getByRole("button", { name }).className,
    );
    expect(new Set(squares).size).toBe(1);
    expect(squares[0]).toMatch(/orderStep/);
  });
});

describe("문제 순서 칸 — 순서 초기화", () => {
  it("제목 줄에 서고 원본 차례로 되돌린다", () => {
    const list = [problem("c", 3, 1), problem("a", 1, 2), problem("b", 1, 5)];
    const { reorder } = setup(list);
    const button = screen.getByRole("button", { name: "순서 초기화" });
    expect(button.closest("div")).toContainElement(
      screen.getByRole("heading", { name: "문제 순서" }),
    );
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(reorder).toHaveBeenCalledTimes(1);
    expect(reorder.mock.calls[0][0].map((p: StudioProblem) => p.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
  it("원본 자리를 모르는 문항만 있으면 되돌릴 차례가 없어 흐리다", () => {
    const bank: StudioProblem = {
      ...problem("bank", 1, 1),
      section: "일차방정식",
    };
    delete (bank as { studioCrop?: unknown }).studioCrop;
    delete (bank as { ocr?: unknown }).ocr;
    delete (bank as { sourceLabel?: unknown }).sourceLabel;
    setup([bank, { ...bank, id: "bank2", section: "부등식" }]);
    expect(screen.getByText("일차방정식")).toBeVisible();
    expect(screen.getByRole("button", { name: "순서 초기화" })).toBeDisabled();
  });
  it("이미 원본 차례이면 흐리다", () => {
    setup([problem("a", 1, 1), problem("b", 2, 1)]);
    expect(screen.getByRole("button", { name: "순서 초기화" })).toBeDisabled();
  });
});
