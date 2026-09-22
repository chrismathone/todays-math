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
const transfer = () => ({ setData: vi.fn(), effectAllowed: "" });

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
    const dataTransfer = transfer();
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.drop(screen.getByLabelText("전체를 만드는 칸"), { dataTransfer });
    fireEvent.drop(screen.getByLabelText("전체를 만드는 칸"), { dataTransfer });
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

  it("cancels a join drag without placing anything and ignores unrelated drops", () => {
    render(<RelationExplorer experiment={join} />);
    const source = screen.getByRole("button", { name: "첫 책장 248 놓기" });
    const dataTransfer = transfer();
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragEnd(source, { dataTransfer });
    fireEvent.drop(screen.getByLabelText("전체를 만드는 칸"), { dataTransfer });
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
    ).toBeDisabled();
    const soup = screen.getByLabelText("국 막대 80");
    expect(soup).toHaveStyle({ marginLeft: "8%" });
    fireEvent.dragStart(soup, { dataTransfer: transfer() });
    fireEvent.drop(screen.getByLabelText("막대 시작선"));
    expect(soup).toHaveStyle({ marginLeft: "0%" });
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
    fireEvent.dragStart(
      screen.getByRole("button", { name: "첫 책장 248 놓기" }),
      { dataTransfer: transfer() },
    );
    rerender(<RelationExplorer experiment={join} disabled />);
    fireEvent.drop(screen.getByLabelText("전체를 만드는 칸"));
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
    fireEvent.dragStart(screen.getByLabelText("닭감자조림 막대 172"), {
      dataTransfer: transfer(),
    });
    rerender(<RelationExplorer experiment={twoParts} disabled />);
    fireEvent.drop(screen.getByLabelText("막대 시작선"));
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
