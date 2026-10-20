import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrintOptionsPanel } from "@/components/unified/print/PrintOptionsPanel";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";

describe("Mathgen print spacing presets", () => {
  it("keeps arithmetic type headings mandatory without offering ineffective per-question metadata toggles", () => {
    const props = {
      title: "연산",
      setTitle: vi.fn(),
      meta: DEFAULT_PRINT_META,
      onMeta: vi.fn(),
      onOptions: vi.fn(),
      options: {
        ...DEFAULT_PRINT_OPTIONS,
        quickAnswerOnly: true,
        showAnswers: true,
      },
    };
    const { rerender } = render(
      <PrintOptionsPanel {...props} groupedArithmetic answersOnly />,
    );
    expect(screen.queryByRole("checkbox", { name: "문항 단원명" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "난이도 라벨" })).toBeNull();
    // 연산 연습지에는 보기(객관식)도 배점도 없다 — 그 설정은 보이지 않는다(원장님 2026-10-16).
    expect(screen.queryByRole("group", { name: "보기 번호 배치" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "배점 숨기기" })).toBeNull();
    expect(
      screen.queryByText("이미지에 포함된 배점은 그대로 남습니다."),
    ).toBeNull();
    expect(screen.getByRole("checkbox", { name: "정답지 포함" })).toBeChecked();
    expect(props.onOptions).not.toHaveBeenCalled();
    rerender(<PrintOptionsPanel {...props} />);
    expect(screen.getByRole("checkbox", { name: "문항 단원명" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "난이도 라벨" })).toBeChecked();
    expect(screen.getByRole("group", { name: "보기 번호 배치" })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "배점 숨기기" })).toBeVisible();
  });
  it("defaults score hiding ON and offers a reversible checkbox", () => {
    const onOptions = vi.fn();
    const props = {
      title: "시험지",
      setTitle: vi.fn(),
      meta: DEFAULT_PRINT_META,
      onMeta: vi.fn(),
      onOptions,
      options: { ...DEFAULT_PRINT_OPTIONS },
    };
    const { rerender } = render(<PrintOptionsPanel {...props} />);
    const toggle = screen.getByRole("checkbox", { name: "배점 숨기기" });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(onOptions).toHaveBeenLastCalledWith({ hideScores: false });
    rerender(
      <PrintOptionsPanel
        {...props}
        options={{ ...props.options, hideScores: false }}
      />,
    );
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(onOptions).toHaveBeenLastCalledWith({ hideScores: true });
  });

  it("offers the optional right solving area only for one column and names the two-column divider", () => {
    const onOptions = vi.fn();
    const props = {
      title: "시험지",
      setTitle: vi.fn(),
      meta: DEFAULT_PRINT_META,
      onMeta: vi.fn(),
      onOptions,
      options: { ...DEFAULT_PRINT_OPTIONS },
    };
    const view = render(<PrintOptionsPanel {...props} />);
    const area = screen.getByRole("combobox", { name: "오른쪽 풀이 공간" });
    expect(area).toHaveValue("off");
    for (const value of ["blank", "ruled", "chalkboard", "off"]) {
      fireEvent.change(area, { target: { value } });
      expect(onOptions).toHaveBeenLastCalledWith({ solvingArea: value });
    }
    view.rerender(
      <PrintOptionsPanel
        {...props}
        options={{ ...props.options, columns: 2 }}
      />,
    );
    expect(
      screen.queryByRole("combobox", { name: "오른쪽 풀이 공간" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "단 사이 구분선" }));
    expect(onOptions).toHaveBeenLastCalledWith({ columnDivider: true });
  });

  it("represents legacy spacing with the nearest preset without rewriting it on render", () => {
    const onOptions = vi.fn();
    render(
      <PrintOptionsPanel
        title="시험지"
        setTitle={vi.fn()}
        options={{
          ...DEFAULT_PRINT_OPTIONS,
          spacing: 26,
          smartSpacing: false,
          layoutMode: "spacing",
        }}
        meta={DEFAULT_PRINT_META}
        onOptions={onOptions}
        onMeta={vi.fn()}
      />,
    );
    const group = screen.getByRole("group", { name: "세로 배치" });
    expect(within(group).getByRole("button", { name: "보통" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(onOptions).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("spinbutton", { name: "문항 간 여백 (px)" }),
    ).not.toBeInTheDocument();
    for (const [label, spacing] of [
      ["좁게", 16],
      ["보통", 32],
      ["넓게", 56],
      ["최대", 88],
    ] as const) {
      fireEvent.click(within(group).getByRole("button", { name: label }));
      expect(onOptions).toHaveBeenLastCalledWith({
        spacing,
        smartSpacing: false,
      });
    }
    fireEvent.click(
      within(group).getByRole("button", { name: "문항 수 지정" }),
    );
    expect(onOptions).toHaveBeenLastCalledWith({ layoutMode: "count" });
  });

  it("offers the four choice-number layouts the director picked, defaulting to 자동", () => {
    // 원장님 2026-09-20 확정 — 라벨은 원장님 표 그대로(D-08).
    const onOptions = vi.fn();
    const props = {
      title: "시험지",
      setTitle: vi.fn(),
      meta: DEFAULT_PRINT_META,
      onMeta: vi.fn(),
      onOptions,
      options: { ...DEFAULT_PRINT_OPTIONS },
    };
    const view = render(<PrintOptionsPanel {...props} />);
    const group = screen.getByRole("group", { name: "보기 번호 배치" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["5행", "3열 2행", "2열 3행", "자동"]);
    expect(within(group).getByRole("button", { name: "자동" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const [label, choiceLayout] of [
      ["5행", "5x1"],
      ["3열 2행", "2x3"],
      ["2열 3행", "3x2"],
      ["자동", "auto"],
    ] as const) {
      fireEvent.click(within(group).getByRole("button", { name: label }));
      expect(onOptions).toHaveBeenLastCalledWith({ choiceLayout });
    }
    // 감수할 것은 값마다 다르고, 그 값을 고른 동안에만 알린다(D-08).
    expect(group).not.toHaveTextContent("열을 줄입니다");
    expect(group).not.toHaveTextContent("두 줄이 됩니다");
    for (const [choiceLayout, note] of [
      ["2x3", "보기가 길어 3열에 안 들어가는 문항은 그 문항만 열을 줄입니다."],
      ["3x2", "고른 열 수를 지킵니다. 보기가 길면 칸 안에서 두 줄이 됩니다."],
    ] as const) {
      view.rerender(
        <PrintOptionsPanel
          {...props}
          options={{ ...props.options, choiceLayout }}
        />,
      );
      expect(
        screen.getByRole("group", { name: "보기 번호 배치" }),
      ).toHaveTextContent(note);
    }
    // 「5행」은 접힐 일이 없어 아무 말도 안 한다.
    view.rerender(
      <PrintOptionsPanel
        {...props}
        options={{ ...props.options, choiceLayout: "5x1" }}
      />,
    );
    expect(
      screen.getByRole("group", { name: "보기 번호 배치" }),
    ).not.toHaveTextContent("두 줄이 됩니다");
  });

  it("restores every print option to its default, including the choice layout", () => {
    const onOptions = vi.fn();
    render(
      <PrintOptionsPanel
        title="시험지"
        setTitle={vi.fn()}
        options={{ ...DEFAULT_PRINT_OPTIONS, choiceLayout: "2x3" }}
        meta={DEFAULT_PRINT_META}
        onOptions={onOptions}
        onMeta={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "기본값으로 재설정" }));
    expect(onOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ choiceLayout: "auto" }),
    );
  });
});
