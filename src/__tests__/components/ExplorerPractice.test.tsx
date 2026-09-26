import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExplorerPractice from "@/components/math-explorers/ExplorerPractice";
import type {
  ExplorerActivity,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";

const session: NonNullable<ExplorerState["session"]> = {
  id: "session",
  route: "unit",
  title: "약수와 배수",
  unitId: "unit",
  cardIds: ["a", "b", "c", "d", "e"],
  index: 0,
  total: 15,
  round: 0,
  done: false,
  first: 0,
  stars: 0,
  unresolved: [],
  reviewOnly: false,
};
const activity: ExplorerActivity = {
  questionId: "question",
  cardId: "a",
  cardName: "약수",
  unitId: "unit",
  unitTitle: "약수와 배수",
  kind: "assemble",
  prompt: "빈칸을 채워 주세요.",
  pieces: ["어떤 수를 ", "나누어 떨어지게 하는 ", "입니다."],
  choices: [
    { id: 2, label: "자연수" },
    { id: 0, label: "정확히" },
    { id: 3, label: "소수" },
    { id: 1, label: "남김없이" },
  ],
};
function fixture(value = activity) {
  const onAction = vi.fn();
  const result = render(
    <ExplorerPractice
      activity={value}
      session={session}
      busy={false}
      correct={null}
      eventKey=""
      onAction={onAction}
      onHome={vi.fn()}
    />,
  );
  return { ...result, onAction };
}

describe("ExplorerPractice", () => {
  it("keeps word order editable and submits the chosen order only after confirmation", () => {
    const { onAction } = fixture();
    fireEvent.click(screen.getByRole("button", { name: "2 정확히" }));
    fireEvent.click(screen.getByRole("button", { name: "1 자연수" }));
    expect(onAction).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "빈칸 1, 정확히" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "빈칸 1, 정확히" }));
    expect(
      screen.getByRole("button", { name: "빈칸 1, 자연수" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "4 남김없이" }));
    fireEvent.click(
      screen.getByRole("button", { name: "완성한 정의 확인하기" }),
    );
    expect(onAction).toHaveBeenCalledWith({
      type: "answer",
      questionId: "question",
      choiceIds: [2, 1],
    });
  });

  it("submits true/false on a single tap without a confirmation page", () => {
    const { onAction } = fixture({
      ...activity,
      kind: "truth",
      pieces: undefined,
      prompt: "모든 약수는 자연수입니다.",
      choices: [
        { id: 1, label: "맞아요" },
        { id: 0, label: "아니에요" },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "1 맞아요" }));
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [1],
    });
    expect(
      screen.queryByRole("button", { name: /확인하기/ }),
    ).not.toBeInTheDocument();
  });

  it("allows multiple examples and deselection before submitting", () => {
    const { onAction } = fixture({
      ...activity,
      kind: "examples",
      pieces: undefined,
    });
    const first = screen.getByRole("button", { name: "1 자연수" });
    fireEvent.click(first);
    fireEvent.click(screen.getByRole("button", { name: "3 소수" }));
    fireEvent.click(first);
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "선택한 예 확인하기" }));
    expect(onAction).toHaveBeenCalledWith({
      type: "answer",
      questionId: "question",
      choiceIds: [3],
    });
  });

  it("only shows the supplied first reading and asks the server to hide it", () => {
    const { onAction, container } = fixture({
      ...activity,
      kind: "read",
      choices: [],
      reading: { definition: "약수의 뜻입니다.", note: "나누어 생각해 봐요." },
    });
    expect(screen.getByText("약수의 뜻입니다.")).toBeVisible();
    expect(container.querySelector("[data-explorer-dock]")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /정의를 가리고 도전하기/ }),
    );
    expect(onAction).toHaveBeenCalledWith({
      type: "read",
      questionId: "question",
    });
  });

  it("blocks duplicate taps and shows wrong feedback without revealing the answer", () => {
    const onAction = vi.fn();
    const { container } = render(
      <ExplorerPractice
        activity={activity}
        session={session}
        busy
        correct={false}
        eventKey="answer-event"
        onAction={onAction}
        onHome={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "1 자연수" }));
    expect(onAction).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-answer-feedback="incorrect"]'),
    ).toBeVisible();
    expect(screen.queryByText(/정답은|해설 보기/)).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-answer-state="correct"]'),
    ).toHaveLength(0);
  });
});
