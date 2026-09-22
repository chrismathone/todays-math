import { StrictMode, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RelationExplorer from "@/components/lab/cube31/RelationExplorer";
import type { RelationExperiment } from "@/lib/lab/cube31/explorationTypes";

const join: RelationExperiment = {
  kind: "relation",
  mode: "join",
  prompt: "두 책장의 책을 합쳐 보세요.",
  parts: [
    { label: "첫 책장", value: 248 },
    { label: "옆 책장", value: 135 },
  ],
};
const compare: RelationExperiment = {
  kind: "relation",
  mode: "compare",
  prompt: "두 음식의 열량을 비교해 보세요.",
  parts: [
    { label: "잡곡밥", value: 310 },
    { label: "닭감자조림", value: 172 },
    { label: "국", value: 80 },
  ],
};
const part: RelationExperiment = {
  kind: "relation",
  mode: "part",
  prompt: "전체 248개 중 빨간 구슬이 120개예요.",
  parts: [{ label: "빨간 구슬", value: 120 }],
  total: 248,
  answerField: "part",
};
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
function bounds(
  element: HTMLElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON: () => ({}),
  });
  Object.defineProperty(element, "offsetWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(element, "offsetHeight", {
    configurable: true,
    value: height,
  });
}
function joinLayout(source: HTMLElement) {
  bounds(source, 0, 0, 180, 44);
  bounds(screen.getByLabelText("주어진 수 막대"), 0, 0, 360, 44);
  bounds(screen.getByLabelText("전체를 만드는 칸"), 0, 80, 360, 48);
}
function compareLayout(source: HTMLElement, y = 0) {
  bounds(source, 155, y, 160, 28);
  bounds(source.parentElement!, 116, y, 300, 28);
}
function pointer(
  source: HTMLElement,
  phase: "Down" | "Move" | "Up" | "Cancel",
  x: number,
  y: number,
  pointerType = "mouse",
  pointerId = 1,
) {
  fireEvent[`pointer${phase}`](source, {
    pointerId,
    pointerType,
    clientX: x,
    clientY: y,
    button: 0,
    isPrimary: true,
  });
}
function drag(
  source: HTMLElement,
  start: [number, number],
  end: [number, number],
  pointerType = "mouse",
) {
  pointer(source, "Down", ...start, pointerType);
  pointer(source, "Move", ...end, pointerType);
  pointer(source, "Up", ...end, pointerType);
}

describe("RelationExplorer", () => {
  it("starts separate and conserves each given through place, remove, repeated drop and reset", () => {
    const onValueChange = vi.fn();
    render(
      <RelationExplorer experiment={join} onValueChange={onValueChange} />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("놓은 막대의 합 0");
    expect(screen.queryByText(/383/)).not.toBeInTheDocument();
    click("옆 책장 135 놓기");
    expect(status).toHaveTextContent("135 = 135");
    expect(
      screen.getByRole("button", { name: "옆 책장 135 놓기" }),
    ).toBeDisabled();
    const source = screen.getByRole("button", { name: "첫 책장 248 놓기" });
    joinLayout(source);
    drag(source, [50, 20], [290, 100]);
    pointer(source, "Up", 290, 100);
    expect(status).toHaveTextContent("135 + 248 = 383");
    expect(screen.getAllByRole("button", { name: /빼기$/ })).toHaveLength(2);
    click("옆 책장 135 빼기");
    expect(status).toHaveTextContent("248 = 248");
    expect(
      screen.getByRole("button", { name: "옆 책장 135 놓기" }),
    ).toBeEnabled();
    click("처음으로");
    expect(status).toHaveTextContent("놓은 막대의 합 0");
    expect(
      screen.queryByRole("button", { name: /빼기$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "첫 책장 248 놓기" }),
    ).toBeEnabled();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("returns an outside drop and pointer cancellation without placing or clicking", () => {
    render(<RelationExplorer experiment={join} />);
    const source = screen.getByRole("button", { name: "첫 책장 248 놓기" });
    joinLayout(source);
    drag(source, [50, 20], [600, 200]);
    fireEvent.click(source, { detail: 1 });
    expect(source).toHaveAttribute("data-dragging", "false");
    pointer(source, "Down", 50, 20);
    pointer(source, "Move", 80, 100);
    expect(source).toHaveAttribute("data-dragging", "true");
    expect(screen.getByLabelText("전체를 만드는 칸")).toHaveAttribute(
      "data-drop-ready",
      "true",
    );
    pointer(source, "Cancel", 80, 100);
    pointer(source, "Up", 80, 100);
    fireEvent.click(source, { detail: 1 });
    expect(source.style.translate).toBe("");
    expect(screen.getByLabelText("전체를 만드는 칸")).not.toHaveAttribute(
      "data-drop-ready",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("놓은 막대의 합 0");
  });

  it("uses the chosen pair, including the distractor, and reveals a difference only after alignment", () => {
    const onValueChange = vi.fn();
    render(
      <RelationExplorer experiment={compare} onValueChange={onValueChange} />,
    );
    const status = screen.getByRole("status");
    expect(status).not.toHaveTextContent("138");
    expect(
      screen.getByRole("button", { name: "시작선 맞추기 ←" }),
    ).toBeDisabled();
    click("잡곡밥 310 비교 선택");
    click("국 80 비교 선택");
    expect(status).toHaveTextContent("310 − 80 = ?");
    expect(
      screen.getByRole("button", { name: "닭감자조림 172 비교 선택" }),
    ).toBeEnabled();
    const soup = screen.getByLabelText("국 막대 80");
    expect(soup).toHaveStyle({ marginLeft: "8%" });
    compareLayout(soup);
    drag(soup, [200, 14], [170, 14]);
    expect(soup).toHaveStyle({ marginLeft: "0%" });
    expect(status).toHaveTextContent("310 − 80 = ?");
    const rice = screen.getByLabelText("잡곡밥 막대 310");
    compareLayout(rice);
    drag(rice, [200, 14], [170, 14]);
    expect(status).toHaveTextContent("310 − 80 = 230");
    expect(status).not.toHaveTextContent("138");
    click("국 80 비교 선택");
    expect(status).not.toHaveTextContent("230");
    click("닭감자조림 172 비교 선택");
    expect(status).toHaveTextContent("310 − 172 = ?");
    click("시작선 맞추기 ←");
    expect(status).toHaveTextContent("310 − 172 = 138");
    click("처음으로");
    expect(status).toHaveTextContent("0/2개 선택");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("starts two given bars offset and supports zero difference without an answer key", () => {
    render(
      <RelationExplorer
        experiment={{
          ...compare,
          parts: [
            { label: "왼쪽", value: 80 },
            { label: "오른쪽", value: 80 },
          ],
        }}
      />,
    );
    expect(screen.getByLabelText("왼쪽 막대 80")).toHaveStyle({
      marginLeft: "3%",
    });
    expect(screen.getByLabelText("오른쪽 막대 80")).toHaveStyle({
      marginLeft: "13%",
    });
    expect(screen.getByRole("status")).toHaveTextContent("80 − 80 = ?");
    click("시작선 맞추기 ←");
    expect(screen.getByRole("status")).toHaveTextContent("80 − 80 = 0");
  });

  it("drags joined strips back to the full tray with touch and suppresses the trailing click", () => {
    render(<RelationExplorer experiment={join} />);
    click("첫 책장 248 놓기");
    click("옆 책장 135 놓기");
    const source = screen.getByRole("button", { name: "첫 책장 248 빼기" });
    joinLayout(source);
    bounds(source, 0, 80, 180, 44);
    pointer(source, "Down", 50, 100, "touch");
    pointer(source, "Move", 330, 20, "touch");
    expect(screen.getByLabelText("주어진 수 막대")).toHaveAttribute(
      "data-drop-ready",
      "true",
    );
    expect(source).toHaveStyle({ translate: "280px -80px" });
    expect(screen.getByRole("status")).toHaveTextContent("248 + 135 = 383");
    pointer(source, "Up", 330, 20, "touch");
    const returned = screen.getByRole("button", { name: "첫 책장 248 놓기" });
    fireEvent.click(returned, { detail: 1 });
    expect(screen.getByRole("status")).toHaveTextContent("135 = 135");
    expect(returned).toBeEnabled();
    // A new ordinary press is still a click, including small hand jitter.
    pointer(returned, "Down", 50, 20);
    pointer(returned, "Up", 52, 21);
    fireEvent.click(returned, { detail: 1 });
    expect(screen.getByRole("status")).toHaveTextContent("135 + 248 = 383");
  });

  it("auto-selects and aligns one bar per drag, permits replacing a pair and preserves chosen bars", () => {
    render(<RelationExplorer experiment={compare} />);
    const rice = screen.getByLabelText("잡곡밥 막대 310");
    const soup = screen.getByLabelText("국 막대 80");
    compareLayout(rice);
    compareLayout(soup, 72);
    drag(rice, [200, 14], [170, 14]);
    fireEvent.click(rice, { detail: 1 });
    expect(screen.getByRole("status")).toHaveTextContent("1/2개 선택");
    expect(rice).toHaveAttribute("data-aligned", "true");
    expect(soup).toHaveAttribute("data-aligned", "false");
    drag(soup, [200, 86], [170, 86], "touch");
    expect(screen.getByRole("status")).toHaveTextContent("310 − 80 = 230");
    // Moving an already chosen strip never toggles its selection off.
    drag(soup, [200, 86], [170, 86]);
    expect(
      screen.getByRole("button", { name: "국 80 비교 선택" }),
    ).toHaveAttribute("aria-pressed", "true");
    click("닭감자조림 172 비교 선택");
    expect(screen.getByRole("status")).toHaveTextContent("172 − 80 = ?");
    expect(rice).toHaveAttribute("data-aligned", "false");
    expect(soup).toHaveAttribute("data-aligned", "true");
    click("닭감자조림 막대 172");
    expect(screen.getByRole("status")).toHaveTextContent("172 − 80 = 92");
  });

  it("cancels comparison outside the capture zone, Escape and lost capture without selecting", () => {
    render(<RelationExplorer experiment={compare} />);
    const source = screen.getByLabelText("잡곡밥 막대 310");
    compareLayout(source);
    drag(source, [200, 14], [450, 150]);
    fireEvent.click(source, { detail: 1 });
    expect(screen.getByRole("status")).toHaveTextContent("0/2개 선택");
    pointer(source, "Down", 200, 14);
    pointer(source, "Move", 170, 14);
    fireEvent.keyDown(window, { key: "Escape" });
    pointer(source, "Up", 170, 14);
    expect(source.style.translate).toBe("");
    expect(source).toHaveAttribute("data-aligned", "false");
    pointer(source, "Down", 200, 14);
    pointer(source, "Move", 170, 14);
    fireEvent.lostPointerCapture(source, { pointerId: 1 });
    pointer(source, "Up", 170, 14);
    expect(screen.getByRole("status")).toHaveTextContent("0/2개 선택");
    expect(screen.getByLabelText("막대 시작선")).not.toHaveAttribute(
      "data-drop-ready",
      "true",
    );
  });

  it("keeps the moving strip under the pointer at combined zoom/transform scale and ignores other pointers", () => {
    render(<RelationExplorer experiment={join} />);
    const source = screen.getByRole("button", { name: "첫 책장 248 놓기" });
    joinLayout(source);
    Object.defineProperty(source, "offsetWidth", { value: 360 });
    Object.defineProperty(source, "offsetHeight", { value: 88 });
    pointer(source, "Down", 50, 20);
    pointer(source, "Move", 100, 100, "touch", 2);
    expect(source.style.translate).toBe("");
    pointer(source, "Move", 100, 100);
    expect(source).toHaveStyle({ translate: "100px 160px" });
    pointer(source, "Up", 100, 100, "touch", 2);
    expect(screen.getByRole("status")).toHaveTextContent("놓은 막대의 합 0");
    pointer(source, "Up", 100, 100);
    expect(screen.getByRole("status")).toHaveTextContent("248 = 248");
  });

  it("offers keyboard selection and single-bar alignment without submitting the parent form", async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <RelationExplorer experiment={compare} />
      </form>,
    );
    screen.getByLabelText("국 막대 80").focus();
    await user.keyboard("{Enter}");
    screen.getByLabelText("잡곡밥 막대 310").focus();
    await user.keyboard(" ");
    expect(screen.getByRole("status")).toHaveTextContent("310 − 80 = 230");
    expect(submit).not.toHaveBeenCalled();
  });

  it("keeps the unknown blank and never exposes its value until the learner supplies it", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <StrictMode>
        <RelationExplorer experiment={part} onValueChange={onValueChange} />
      </StrictMode>,
    );
    const range = screen.getByRole("slider", { name: "모르는 부분의 크기" });
    expect(range).toHaveValue("0");
    expect(range).toHaveAttribute("aria-valuetext", "아직 정하지 않음");
    expect(container.innerHTML).not.toContain("128");
    expect(screen.getByRole("status")).toHaveTextContent("120 + ? → 전체 248");
    expect(onValueChange).not.toHaveBeenCalled();
    click("모르는 부분 10 늘리기");
    expect(range).toHaveValue("10");
    expect(screen.getByRole("status")).toHaveTextContent(
      "120 + 10 = 130 < 248",
    );
    expect(container.innerHTML).not.toContain("128");
    fireEvent.change(range, { target: { value: "200" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      "120 + 200 = 320 > 248",
    );
    expect(screen.getByRole("status")).toHaveTextContent("전체 선을 넘었어요");
    fireEvent.change(range, { target: { value: "128" } });
    expect(screen.getByRole("status")).toHaveTextContent("120 + 128 = 248");
    expect(screen.getByRole("status")).toHaveTextContent("전체와 같아요");
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([
      "10",
      "200",
      "128",
    ]);
    click("처음으로");
    expect(range).toHaveValue("0");
    expect(container.innerHTML).not.toContain("128");
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("links parent answer edits and range/buttons bidirectionally without submitting a surrounding form", async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event) => event.preventDefault());
    function Parent() {
      const [answer, setAnswer] = useState("");
      return (
        <form onSubmit={submit}>
          <RelationExplorer
            experiment={part}
            value={answer}
            onValueChange={setAnswer}
          />
          <input
            aria-label="파란 구슬 답"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </form>
      );
    }
    render(<Parent />);
    const answer = screen.getByRole("textbox", { name: "파란 구슬 답" });
    fireEvent.change(answer, { target: { value: "119" } });
    expect(screen.getByRole("slider")).toHaveValue("119");
    const plus = screen.getByRole("button", { name: "모르는 부분 1 늘리기" });
    plus.focus();
    await user.keyboard("{Enter} ");
    expect(answer).toHaveValue("121");
    click("모르는 부분 10 늘리기");
    click("모르는 부분 1 줄이기");
    click("모르는 부분 10 줄이기");
    expect(answer).toHaveValue("120");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "128" } });
    expect(answer).toHaveValue("128");
    fireEvent.change(answer, { target: { value: "" } });
    expect(screen.getByRole("status")).toHaveTextContent("120 + ?");
    expect(screen.getByRole("slider")).toHaveValue("0");
    expect(submit).not.toHaveBeenCalled();
    expect(
      screen
        .getAllByRole("button")
        .every((button) => button.getAttribute("type") === "button"),
    ).toBe(true);
  });

  it("keeps scale fixed, permits overfill, and bounds the learner controls using only givens", () => {
    const { rerender } = render(<RelationExplorer experiment={part} />);
    const whole = screen.getByText("248", { selector: "div" });
    const initialWidth = whole.style.width;
    fireEvent.change(screen.getByRole("slider"), { target: { value: "248" } });
    expect(whole.style.width).toBe(initialWidth);
    expect(
      screen.getByRole("button", { name: "모르는 부분 1 늘리기" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("전체 선을 넘었어요");
    click("처음으로");
    expect(
      screen.getByRole("button", { name: "모르는 부분 1 줄이기" }),
    ).toBeDisabled();
    click("모르는 부분 1 늘리기");
    click("모르는 부분 10 줄이기");
    expect(screen.getByRole("slider")).toHaveValue("0");
    rerender(<RelationExplorer experiment={part} value="hello" />);
    expect(screen.getByRole("status")).toHaveTextContent("120 + ?");
    rerender(<RelationExplorer experiment={part} value="9999" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "120 + 9999 = 10119 > 248",
    );
  });

  it("supports keyboard assembly and clears local exploration when the givens change", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RelationExplorer experiment={join} />);
    screen.getByRole("button", { name: "첫 책장 248 놓기" }).focus();
    await user.keyboard("{Enter}");
    screen.getByRole("button", { name: "옆 책장 135 놓기" }).focus();
    await user.keyboard(" ");
    expect(screen.getByRole("status")).toHaveTextContent("248 + 135 = 383");
    rerender(
      <RelationExplorer
        experiment={{ ...join, parts: [{ label: "새 부분", value: 10 }] }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("놓은 막대의 합 0");
    expect(
      screen.getByRole("button", { name: "새 부분 10 놓기" }),
    ).toBeEnabled();
  });

  it("guards an in-flight join drag when the parent disables the board", () => {
    const { rerender } = render(<RelationExplorer experiment={join} />);
    const source = screen.getByRole("button", { name: "첫 책장 248 놓기" });
    joinLayout(source);
    pointer(source, "Down", 50, 20);
    pointer(source, "Move", 80, 100);
    rerender(<RelationExplorer experiment={join} disabled />);
    pointer(source, "Up", 80, 100);
    expect(source.style.translate).toBe("");
    click("옆 책장 135 놓기");
    expect(screen.getByRole("status")).toHaveTextContent("놓은 막대의 합 0");
    expect(
      screen
        .getAllByRole("button")
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
  });

  it("guards comparison selection, alignment and reset while disabled", () => {
    const twoParts = { ...compare, parts: compare.parts.slice(0, 2) };
    const { rerender } = render(<RelationExplorer experiment={twoParts} />);
    const source = screen.getByLabelText("닭감자조림 막대 172");
    compareLayout(source);
    pointer(source, "Down", 200, 14);
    pointer(source, "Move", 170, 14);
    rerender(<RelationExplorer experiment={twoParts} disabled />);
    pointer(source, "Up", 170, 14);
    click("시작선 맞추기 ←");
    click("잡곡밥 310 비교 선택");
    expect(screen.getByRole("status")).toHaveTextContent("310 − 172 = ?");
    expect(screen.getByLabelText("닭감자조림 막대 172")).toHaveAttribute(
      "draggable",
      "false",
    );
    rerender(<RelationExplorer experiment={twoParts} />);
    click("시작선 맞추기 ←");
    rerender(<RelationExplorer experiment={twoParts} disabled />);
    click("처음으로");
    expect(screen.getByRole("status")).toHaveTextContent("310 − 172 = 138");
  });

  it("guards native range change events and all part actions when disabled", () => {
    const onValueChange = vi.fn();
    render(
      <RelationExplorer
        experiment={part}
        disabled
        value="40"
        onValueChange={onValueChange}
      />,
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "128" } });
    click("모르는 부분 10 늘리기");
    click("처음으로");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "120 + 40 = 160 < 248",
    );
    expect(screen.getByRole("slider")).toBeDisabled();
    expect(
      screen
        .getAllByRole("button")
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
  });
});
