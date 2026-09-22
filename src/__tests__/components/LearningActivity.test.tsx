import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LearningActivity from "@/components/lab/cube31/LearningActivity";
import type { CubeTask } from "@/lib/lab/cube31/types";

const base = {
  id: "activity",
  title: "학습",
  instruction: "풀어 보세요",
  hint: "힌트",
  explanation: "완료한 뒤에만 부모가 보여 줄 설명",
  sourcePages: [24],
};
type Task = Exclude<CubeTask, { kind: "regroup" }>;
const question: Task = {
  ...base,
  kind: "question",
  choices: [
    { label: "합하기", value: "add" },
    { label: "빼기", value: "subtract" },
  ],
  correctChoice: "add",
  fields: [{ id: "answer", label: "전체 책", answer: "383", suffix: "권" }],
};
const cards: Task = {
  ...base,
  kind: "cards",
  digits: [2, 3, 6],
  order: "largest",
  add: 178,
};
const repair: Task = {
  ...base,
  kind: "repair",
  a: 529,
  b: 343,
  operation: "add",
  wrongResult: 862,
  wrongPlace: 1,
  reason: "carry",
  reasons: [
    { label: "올라온 묶음을 빠뜨렸어요", value: "carry" },
    { label: "빼야 해요", value: "subtract" },
  ],
};
const estimate: Task = {
  ...base,
  kind: "estimate",
  a: 312,
  b: 126,
  operation: "add",
};
const puzzle: Task = { ...base, kind: "puzzle" };

function mount(task: Task) {
  const onComplete = vi.fn(),
    onAttempt = vi.fn();
  const view = render(
    <StrictMode>
      <LearningActivity
        key={task.id}
        task={task}
        onComplete={onComplete}
        onAttempt={onAttempt}
      />
    </StrictMode>,
  );
  return { ...view, onComplete, onAttempt };
}
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
const enter = (label: string, value: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: label }), {
    target: { value },
  });
const check = () => click("확인하기");
function placeCard(digit: number, place: string) {
  click(`${digit} 카드`);
  click(new RegExp(`^${place}:`));
}
function placePiece(piece: string, place: number) {
  click(new RegExp(`^${piece} 조각:`));
  click(new RegExp(`^${place}번 자리:`));
}
function dragData(value: string) {
  return {
    getData: vi.fn(() => value),
    setData: vi.fn(),
    effectAllowed: "move",
  };
}

describe("Cube learning question checks", () => {
  it("requires choice and field together, keeps answers private, and completes once", () => {
    const { onComplete, onAttempt, container } = mount(question);
    expect(screen.queryByText(base.explanation)).not.toBeInTheDocument();
    check();
    expect(onComplete).not.toHaveBeenCalled();
    expect(container).not.toHaveTextContent("383");
    enter("전체 책 권", "383");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "빼기" }));
    check();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "합하기" }));
    enter("전체 책 권", "382");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    enter("전체 책 권", " 383 ");
    check();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onAttempt).toHaveBeenCalledTimes(4);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("radio", { name: "합하기" })).toBeDisabled();
    fireEvent.submit(container.querySelector("form")!);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onAttempt).toHaveBeenCalledTimes(4);
  });

  it("checks every field, including nonnumeric comparisons", () => {
    const { onComplete } = mount({
      ...base,
      kind: "question",
      fields: [
        { id: "tens", label: "십의 자리", answer: "4" },
        { id: "comparison", label: "비교 기호", answer: ">" },
      ],
    });
    enter("십의 자리", "4");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    enter("비교 기호", "<");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    enter("비교 기호", ">");
    check();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("never prints or sizes a hidden bar using its answer", () => {
    const { container } = mount({
      ...base,
      kind: "question",
      fields: [{ id: "x", label: "파란 구슬", answer: "128" }],
      visual: {
        type: "bars",
        labels: ["빨간 구슬", "파란 구슬 ?"],
        values: [120, 128],
      },
    });
    expect(container).toHaveTextContent("120");
    expect(container).not.toHaveTextContent("128");
    expect(container.querySelector('[data-unknown="true"]')).toHaveStyle({
      width: "65%",
    });
    check();
    expect(container).not.toHaveTextContent("128");
  });

  it.each([
    { type: "column" as const, a: 469, b: 543, operation: "add" as const },
    { type: "machine" as const, start: 469, operations: ["+543"] },
    { type: "equation" as const, lines: ["469 + 543 = ?"] },
  ])(
    "renders $type givens without calculating the answer into the visual",
    (visual) => {
      const { container } = mount({
        ...base,
        kind: "question",
        fields: [{ id: "answer", label: "답", answer: "1012" }],
        visual,
      });
      expect(container).toHaveTextContent("469");
      expect(container).toHaveTextContent("543");
      expect(container).not.toHaveTextContent("1012");
    },
  );
});

describe("Cube card activity", () => {
  it("prevents an answer bypass and requires the largest arrangement before calculation", () => {
    const { onComplete, onAttempt } = mount(cards);
    expect(screen.getByRole("textbox", { name: "계산한 답" })).toBeDisabled();
    placeCard(2, "백의 자리");
    placeCard(3, "십의 자리");
    placeCard(6, "일의 자리");
    click("수 만들기 확인");
    expect(onComplete).not.toHaveBeenCalled();
    expect(onAttempt).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox", { name: "계산한 답" })).toBeDisabled();
    click(/^백의 자리:/);
    click(/^일의 자리:/);
    expect(
      screen.getByRole("button", { name: "백의 자리: 6" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "일의 자리: 2" }),
    ).toBeInTheDocument();
    click("수 만들기 확인");
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "계산한 답" })).toBeEnabled();
    enter("계산한 답", "800");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    enter("계산한 답", "810");
    check();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onAttempt).toHaveBeenCalledTimes(2);
    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
  });

  it("supports keyboard placement, removal, replacement, and reset", async () => {
    mount(cards);
    const user = userEvent.setup();
    screen.getByRole("button", { name: "6 카드" }).focus();
    await user.keyboard("{Enter}");
    screen.getByRole("button", { name: "백의 자리: 빈자리" }).focus();
    await user.keyboard(" ");
    expect(
      screen.getByRole("button", { name: "백의 자리: 6" }),
    ).toBeInTheDocument();
    click("6 카드");
    click("선택 카드 빼기");
    expect(
      screen.getByRole("button", { name: "백의 자리: 빈자리" }),
    ).toBeInTheDocument();
    placeCard(3, "백의 자리");
    placeCard(2, "백의 자리");
    expect(
      screen.queryByRole("button", { name: /: 3$/ }),
    ).not.toBeInTheDocument();
    click("카드 다시 놓기");
    expect(screen.getAllByRole("button", { name: /: 빈자리$/ })).toHaveLength(
      3,
    );
  });

  it("supports smallest order and subtraction, clearing the answer gate if cards move", () => {
    const task = {
      ...cards,
      order: "smallest" as const,
      operation: "subtract" as const,
      add: 145,
    };
    const { onComplete } = mount(task);
    placeCard(2, "백의 자리");
    placeCard(3, "십의 자리");
    placeCard(6, "일의 자리");
    click("수 만들기 확인");
    enter("계산한 답", "91");
    click(/^백의 자리:/);
    click(/^십의 자리:/);
    expect(screen.getByRole("textbox", { name: "계산한 답" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "계산한 답" })).toHaveValue("");
    click("수 만들기 확인");
    expect(onComplete).not.toHaveBeenCalled();
    click(/^백의 자리:/);
    click(/^십의 자리:/);
    click("수 만들기 확인");
    enter("계산한 답", "91");
    check();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("moves cards by drag without duplicating a used digit", () => {
    mount(cards);
    const dataTransfer = dragData("2");
    fireEvent.dragStart(screen.getByRole("button", { name: "6 카드" }), {
      dataTransfer,
    });
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "2");
    fireEvent.drop(screen.getByRole("button", { name: "백의 자리: 빈자리" }), {
      dataTransfer,
    });
    fireEvent.drop(screen.getByRole("button", { name: "일의 자리: 빈자리" }), {
      dataTransfer,
    });
    expect(
      screen.getByRole("button", { name: "백의 자리: 빈자리" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "일의 자리: 6" }),
    ).toBeInTheDocument();
  });
});

describe("Cube repair activity", () => {
  it("requires the wrong digit position, reason, and corrected answer together", () => {
    const { onComplete, onAttempt } = mount(repair);
    enter("고친 답", "872");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    click("백의 자리 8");
    fireEvent.click(
      screen.getByRole("radio", { name: "올라온 묶음을 빠뜨렸어요" }),
    );
    check();
    expect(onComplete).not.toHaveBeenCalled();
    click("십의 자리 6");
    fireEvent.click(screen.getByRole("radio", { name: "빼야 해요" }));
    check();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("radio", { name: "올라온 묶음을 빠뜨렸어요" }),
    );
    enter("고친 답", "862");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    enter("고친 답", "872");
    check();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onAttempt).toHaveBeenCalledTimes(4);
  });

  it("treats wrongPlace zero as the ones place, including subtraction", () => {
    const { onComplete } = mount({
      ...repair,
      a: 356,
      b: 214,
      operation: "subtract",
      wrongResult: 143,
      wrongPlace: 0,
    });
    click("일의 자리 3");
    fireEvent.click(
      screen.getByRole("radio", { name: "올라온 묶음을 빠뜨렸어요" }),
    );
    enter("고친 답", "142");
    check();
    expect(onComplete).toHaveBeenCalledOnce();
  });
});

describe("Cube estimate activity", () => {
  it("rejects a correct estimated total made from the wrong nearest tens", () => {
    const { onComplete, onAttempt } = mount(estimate);
    enter("첫째 수 어림값", "320");
    enter("둘째 수 어림값", "120");
    enter("어림한 계산 결과", "440");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("가장 가까운 십");
    fireEvent.change(
      screen.getByRole("slider", { name: "첫째 수 가까운 십 고르기" }),
      { target: { value: "310" } },
    );
    fireEvent.change(
      screen.getByRole("slider", { name: "둘째 수 가까운 십 고르기" }),
      { target: { value: "130" } },
    );
    expect(screen.getByRole("textbox", { name: "첫째 수 어림값" })).toHaveValue(
      "310",
    );
    expect(screen.getByRole("textbox", { name: "둘째 수 어림값" })).toHaveValue(
      "130",
    );
    enter("어림한 계산 결과", "438");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    enter("어림한 계산 결과", "440");
    check();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onAttempt).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("slider", { name: "첫째 수 가까운 십 고르기" }),
    ).toBeDisabled();
  });

  it("requires explicit estimates even for multiples of ten and supports subtraction", () => {
    const { onComplete } = mount({
      ...estimate,
      a: 360,
      b: 210,
      operation: "subtract",
    });
    enter("어림한 계산 결과", "150");
    check();
    expect(onComplete).not.toHaveBeenCalled();
    enter("첫째 수 어림값", "360");
    enter("둘째 수 어림값", "210");
    check();
    expect(onComplete).toHaveBeenCalledOnce();
  });
});

describe("Cube map puzzle", () => {
  it("requires five correct unique placements and swaps occupied targets", () => {
    const { onComplete, onAttempt, container } = mount(puzzle);
    check();
    expect(onComplete).not.toHaveBeenCalled();
    placePiece("A", 1);
    placePiece("D", 2);
    placePiece("E", 3);
    placePiece("B", 4);
    placePiece("C", 5);
    check();
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getAllByRole("status")[1]).toHaveTextContent("1, 4번");
    click(/^1번 자리:/);
    click(/^4번 자리:/);
    expect(
      screen.getByRole("button", { name: "1번 자리: B 조각" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "4번 자리: A 조각" }),
    ).toBeInTheDocument();
    check();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onAttempt).toHaveBeenCalledTimes(2);
    const before = screen.getByRole("button", { name: "1번 자리: B 조각" });
    fireEvent.drop(before, { dataTransfer: dragData("0") });
    expect(before).toHaveAccessibleName("1번 자리: B 조각");
    fireEvent.submit(container.querySelector("form")!);
    expect(onComplete).toHaveBeenCalledOnce();
    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
  });

  it("can return pieces, rejects invalid drags, and never duplicates a moved piece", () => {
    mount(puzzle);
    const target = screen.getByRole("button", { name: "1번 자리: 빈자리" });
    fireEvent.drop(target, { dataTransfer: dragData("999") });
    expect(target).toHaveAccessibleName("1번 자리: 빈자리");
    const dataTransfer = dragData("1");
    fireEvent.dragStart(screen.getByRole("button", { name: /^B 조각:/ }), {
      dataTransfer,
    });
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "1");
    fireEvent.drop(target, { dataTransfer });
    fireEvent.drop(screen.getByRole("button", { name: "4번 자리: 빈자리" }), {
      dataTransfer,
    });
    expect(
      screen.getByRole("button", { name: "1번 자리: 빈자리" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "4번 자리: B 조각" }),
    ).toBeInTheDocument();
    click(/^4번 자리:/);
    click("선택 조각 되돌리기");
    expect(
      screen.getAllByRole("button", { name: /^\d번 자리: 빈자리$/ }),
    ).toHaveLength(5);
    placePiece("A", 1);
    placePiece("B", 1);
    expect(
      screen.queryByRole("button", { name: /^\d번 자리: A 조각$/ }),
    ).not.toBeInTheDocument();
    click("조각 다시 놓기");
    expect(
      screen.getAllByRole("button", { name: /^\d번 자리: 빈자리$/ }),
    ).toHaveLength(5);
  });

  it("supports keyboard piece selection and placement with unique SVG clip IDs", async () => {
    const { container } = mount(puzzle);
    const user = userEvent.setup();
    screen.getByRole("button", { name: /^B 조각:/ }).focus();
    await user.keyboard("{Enter}");
    screen.getByRole("button", { name: "1번 자리: 빈자리" }).focus();
    await user.keyboard(" ");
    expect(
      screen.getByRole("button", { name: "1번 자리: B 조각" }),
    ).toBeInTheDocument();
    const ids = [...container.querySelectorAll("clipPath")].map(
      (clip) => clip.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(container.querySelectorAll('svg path[d*=" C"]')).not.toHaveLength(0);
  });
});
