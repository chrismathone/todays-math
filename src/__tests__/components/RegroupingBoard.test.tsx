import { StrictMode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RegroupingBoard from "@/components/lab/cube31/RegroupingBoard";
import type { RegroupingProblem } from "@/components/lab/cube31/RegroupingBoard";

const names = ["일의 자리", "십의 자리", "백의 자리", "천의 자리"];
function click(name: string, count = 1) {
  for (let i = 0; i < count; i++)
    fireEvent.click(screen.getByRole("button", { name }));
}
function transferAll(b: number) {
  for (let place = 0; place < 3; place++)
    click(`${names[place]} 1개 옮기기`, Math.floor(b / 10 ** place) % 10);
}
function removeAll(b: number) {
  for (let place = 0; place < 3; place++)
    click(`${names[place]} 1개 빼기`, Math.floor(b / 10 ** place) % 10);
}
function enter(
  problem: RegroupingProblem,
  digits: number[],
  marks: (number | null)[],
) {
  digits.forEach((n, p) =>
    fireEvent.change(screen.getByRole("textbox", { name: `${names[p]} 답` }), {
      target: { value: String(n) },
    }),
  );
  marks.forEach((n, p) => {
    if (n !== null)
      fireEvent.change(
        screen.getByRole("textbox", {
          name: `${names[p]} ${problem.operation === "add" ? "받아올린 수" : "바꾼 뒤의 수"}`,
        }),
        { target: { value: String(n) } },
      );
  });
}
const confirm = () =>
  fireEvent.click(screen.getByRole("button", { name: /블록과 세로셈 확인/ }));

describe("RegroupingBoard", () => {
  it.each([
    [312, 126, [], [8, 3, 4], [null, null, null]],
    [248, 135, [0], [3, 8, 3], [null, 1, null]],
    [586, 275, [0, 1], [1, 6, 8], [null, 1, 1]],
    [659, 584, [0, 1, 2], [3, 4, 2, 1], [null, 1, 1, 1]],
  ] as [number, number, number[], number[], (number | null)[]][])(
    "completes %i + %i only after manipulation and notation",
    (a, b, trades, digits, marks) => {
      const problem = { a, b, operation: "add" } as const;
      const onComplete = vi.fn();
      render(<RegroupingBoard problem={problem} onComplete={onComplete} />);
      expect(
        screen
          .getAllByRole("textbox")
          .every((input) => (input as HTMLInputElement).value === ""),
      ).toBe(true);
      enter(problem, digits, marks);
      confirm();
      expect(onComplete).not.toHaveBeenCalled();
      transferAll(b);
      if (trades.length) {
        confirm();
        expect(onComplete).not.toHaveBeenCalled();
      }
      for (const place of trades) click(`${names[place]} 10개 묶기`);
      confirm();
      expect(onComplete).toHaveBeenCalledTimes(1);
      confirm();
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("status")).toHaveTextContent(
        "블록과 세로셈이 같아요",
      );
    },
  );

  it.each([
    [402, 175, [2, 1], [7, 2, 2], [12, 9, 3]],
    [500, 268, [2, 1], [2, 3, 2], [10, 9, 4]],
    [254, 138, [1], [6, 1, 1], [14, 4, null]],
    [617, 342, [2], [5, 7, 2], [null, 11, 5]],
    [324, 156, [1, 2], [8, 6, 1], [14, 11, 2]],
  ] as [number, number, number[], number[], (number | null)[]][])(
    "makes the necessary splits and removals for %i − %i",
    (a, b, splits, digits, marks) => {
      const problem = { a, b, operation: "subtract" } as const;
      const onComplete = vi.fn();
      render(<RegroupingBoard problem={problem} onComplete={onComplete} />);
      for (const place of splits) click(`${names[place]} 1개 풀기`);
      expect(screen.getByRole("status")).toHaveTextContent("전체 수는");
      removeAll(b);
      confirm();
      expect(onComplete).not.toHaveBeenCalled();
      digits.forEach((n, p) =>
        fireEvent.change(
          screen.getByRole("textbox", { name: `${names[p]} 답` }),
          { target: { value: String(n) } },
        ),
      );
      confirm();
      expect(onComplete).not.toHaveBeenCalled(); // the borrowing entries matter, too
      enter(problem, digits, marks);
      confirm();
      expect(onComplete).toHaveBeenCalledTimes(1);
      // 빼기는 정답 개수로 막지 않는다 — 끝난 활동은 부모가 판 전체를 잠근다(disabled)
      expect(screen.getByRole("status")).toHaveTextContent(
        "블록과 세로셈이 같아요",
      );
    },
  );

  it("moves actual blocks with mouse drag, rejects a wrong column, and supports Enter/Space", async () => {
    const user = userEvent.setup();
    const problem = { a: 312, b: 126, operation: "add" } as const;
    render(<RegroupingBoard problem={problem} onComplete={vi.fn()} />);
    const source = screen.getByRole("button", {
      name: "옮기기: 십의 자리 십 막대 1번",
    });
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.drop(screen.getByLabelText("일의 자리 작업판"), { dataTransfer });
    expect(screen.getByRole("status")).toHaveTextContent(
      "다른 자리에 놓으면 수의 크기가 달라져요",
    );
    expect(screen.getByLabelText("십의 자리 작업판 1개")).toBeInTheDocument();
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.drop(screen.getByLabelText("십의 자리 작업판"), { dataTransfer });
    expect(screen.getByLabelText("십의 자리 작업판 2개")).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: "일의 자리 1개 옮기기",
    });
    button.focus();
    await user.keyboard("{Enter} ");
    expect(screen.getByLabelText("일의 자리 작업판 4개")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "옮기기: 일의 자리 낱개 1번" }),
    );
    expect(screen.getByLabelText("일의 자리 작업판 5개")).toBeInTheDocument();
  });

  it("accepts touch/pen pointer dragging and cancels a pointer without moving a block", () => {
    const problem = { a: 312, b: 126, operation: "add" } as const;
    render(<RegroupingBoard problem={problem} onComplete={vi.fn()} />);
    const source = screen.getByRole("button", {
      name: "옮기기: 십의 자리 십 막대 1번",
    });
    const target = screen.getByLabelText("십의 자리 작업판");
    const originalPointer = window.PointerEvent;
    const originalElementFromPoint = document.elementFromPoint;
    // jsdom does not implement PointerEvent/elementFromPoint; retain real React
    // event handlers and supply only those missing browser primitives.
    window.PointerEvent = MouseEvent as typeof PointerEvent;
    document.elementFromPoint = vi.fn(() => target);
    try {
      fireEvent.pointerDown(source, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(source, { pointerId: 1, clientX: 70, clientY: 50 });
      fireEvent.pointerUp(source, { pointerId: 1, clientX: 70, clientY: 50 });
      expect(screen.getByLabelText("십의 자리 작업판 2개")).toBeInTheDocument();
      const second = screen.getByRole("button", {
        name: "옮기기: 십의 자리 십 막대 1번",
      });
      fireEvent.pointerDown(second, { pointerId: 2, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(second, { pointerId: 2, clientX: 70, clientY: 50 });
      fireEvent.pointerCancel(second);
      fireEvent.pointerUp(second, { pointerId: 2, clientX: 70, clientY: 50 });
      expect(screen.getByLabelText("십의 자리 작업판 2개")).toBeInTheDocument();
    } finally {
      window.PointerEvent = originalPointer;
      document.elementFromPoint = originalElementFromPoint;
    }
  });

  // 원장님 2026-09-22 «정답을 정해놓고 빼고 넣도록 하지말것. 자유롭게 뺴고 넣도록 … 자유롭게 빼고 넣고 정답 맞추도록»
  it("refuses insufficient blocks, but lets the learner take out more and put blocks back", () => {
    const problem = { a: 402, b: 175, operation: "subtract" } as const;
    const onComplete = vi.fn();
    render(<RegroupingBoard problem={problem} onComplete={onComplete} />);
    expect(
      screen.getByRole("button", { name: "십의 자리 1개 풀기" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "십의 자리 1개 빼기" }),
    ).toBeDisabled();
    // 빼야 할 개수를 미리 보여 주지 않는다
    expect(screen.queryByText(/빼야 할/)).toBeNull();
    expect(screen.queryByText(/개 뺐어요/)).toBeNull();
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    const hundred = screen.getByRole("button", {
      name: "빼기: 백의 자리 백 판 1번",
    });
    fireEvent.dragStart(hundred, { dataTransfer });
    fireEvent.drop(screen.getByLabelText("십의 자리 빼기 상자"), {
      dataTransfer,
    });
    expect(screen.getByLabelText("백의 자리 작업판 4개")).toBeInTheDocument();
    fireEvent.dragStart(hundred, { dataTransfer });
    fireEvent.drop(screen.getByLabelText("백의 자리 빼기 상자"), {
      dataTransfer,
    });
    expect(screen.getByLabelText("백의 자리 작업판 3개")).toBeInTheDocument();
    // 빼는 수(175)의 백의 자리 숫자 1보다 더 뺄 수 있다
    click("백의 자리 1개 빼기");
    expect(screen.getByLabelText("백의 자리 작업판 2개")).toBeInTheDocument();
    expect(screen.getByLabelText("백의 자리 뺀 블록 2개")).toBeInTheDocument();
    // 다시 넣기 — 단추 · 뺀 블록 누르기 · 작업판으로 끌기
    click("백의 자리 1개 넣기");
    expect(screen.getByLabelText("백의 자리 작업판 3개")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "넣기: 백의 자리 백 판 1번" }),
    );
    expect(screen.getByLabelText("백의 자리 작업판 4개")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "백의 자리 1개 넣기" }),
    ).toBeDisabled();
    click("백의 자리 1개 빼기");
    fireEvent.dragStart(
      screen.getByRole("button", { name: "넣기: 백의 자리 백 판 1번" }),
      { dataTransfer },
    );
    fireEvent.drop(screen.getByLabelText("백의 자리 작업판"), {
      dataTransfer,
    });
    expect(screen.getByLabelText("백의 자리 작업판 4개")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("undoes trades, resets locally, and emits completion once even after replay under StrictMode", () => {
    const problem = { a: 248, b: 135, operation: "add" } as const;
    const onComplete = vi.fn();
    render(
      <StrictMode>
        <RegroupingBoard problem={problem} onComplete={onComplete} />
      </StrictMode>,
    );
    transferAll(135);
    click("일의 자리 10개 묶기");
    expect(screen.getByLabelText("일의 자리 작업판 3개")).toBeInTheDocument();
    click("한 번 되돌리기");
    expect(screen.getByLabelText("일의 자리 작업판 13개")).toBeInTheDocument();
    expect(screen.getByLabelText("십의 자리 작업판 7개")).toBeInTheDocument();
    enter(problem, [3, 8, 3], [null, 1, null]);
    confirm();
    expect(onComplete).not.toHaveBeenCalled();
    click("일의 자리 10개 묶기");
    confirm();
    expect(onComplete).toHaveBeenCalledTimes(1);
    click("처음부터");
    expect(screen.getByLabelText("일의 자리 작업판 8개")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "일의 자리 답" })).toHaveValue(
      "",
    );
    transferAll(135);
    click("일의 자리 10개 묶기");
    enter(problem, [3, 8, 3], [null, 1, null]);
    confirm();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("rejects incorrect, empty, and nonnumeric notation; a disabled board cannot complete", () => {
    const problem = { a: 312, b: 126, operation: "add" } as const;
    const onComplete = vi.fn();
    const { rerender } = render(
      <RegroupingBoard problem={problem} onComplete={onComplete} />,
    );
    transferAll(126);
    for (const value of ["", "x", "9"]) {
      enter(problem, [8, 3, 4], []);
      fireEvent.change(screen.getByRole("textbox", { name: "일의 자리 답" }), {
        target: { value },
      });
      confirm();
      expect(onComplete).not.toHaveBeenCalled();
    }
    enter(problem, [8, 3, 4], []);
    rerender(
      <RegroupingBoard problem={problem} onComplete={onComplete} disabled />,
    );
    confirm();
    expect(onComplete).not.toHaveBeenCalled();
    expect(
      screen
        .getAllByRole("textbox")
        .every((input) => (input as HTMLInputElement).disabled),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "처음부터" })).toBeDisabled();
    rerender(<RegroupingBoard problem={problem} onComplete={onComplete} />);
    confirm();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("represents an empty operand explicitly and resets when the parent activity key changes", () => {
    const problem = { a: 0, b: 0, operation: "add" } as const;
    const onComplete = vi.fn();
    const { rerender } = render(
      <RegroupingBoard key="first" problem={problem} onComplete={onComplete} />,
    );
    enter(problem, [0, 0, 0], []);
    confirm();
    expect(onComplete).not.toHaveBeenCalled();
    click("옮기거나 뺄 블록이 0개임을 확인");
    confirm();
    expect(onComplete).toHaveBeenCalledTimes(1);
    rerender(
      <RegroupingBoard
        key="second"
        problem={{ a: 100, b: 100, operation: "subtract" }}
        onComplete={onComplete}
      />,
    );
    expect(screen.getByRole("textbox", { name: "백의 자리 답" })).toHaveValue(
      "",
    );
    click("백의 자리 1개 빼기");
    enter({ a: 100, b: 100, operation: "subtract" }, [0, 0, 0], []);
    confirm();
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});
