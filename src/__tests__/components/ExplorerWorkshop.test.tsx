import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExplorerWorkshop from "@/components/math-explorers/ExplorerWorkshop";
import type {
  ExplorerState,
  WorkshopView,
} from "@/contracts/mathExplorers.contract";

const session: NonNullable<ExplorerState["session"]> = {
  id: "concept-session",
  route: "unit",
  title: "약분과 통분",
  unitId: "g5-fraction",
  cardIds: ["a", "b", "c", "d", "e"],
  index: 4,
  total: 15,
  round: 0,
  continuation: 0,
  done: false,
  first: 3,
  stars: 0,
  unresolved: [],
  reviewOnly: false,
};
const workshop: NonNullable<WorkshopView["session"]> = {
  id: "workshop",
  route: "explore",
  stage: "split",
  attachedTo: {
    sessionId: "concept-session",
    questionId: "concept-question",
    cardId: "g5-common-denominator",
  },
  questionId: "split-question",
  checkIndex: 0,
  checkTotal: 2,
  done: false,
  prompt: "한 조각을 세 개로 나눠 보세요.",
  fractions: [{ numerator: 1, denominator: 2 }],
  targetDenominator: null,
  factors: [1, 1],
  choices: [],
  predictionLabel: "그대로예요",
  stars: 0,
};
function fixture(changes: Partial<typeof workshop> = {}) {
  const onAction = vi.fn();
  const result = render(
    <ExplorerWorkshop
      workshop={{ ...workshop, ...changes }}
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

describe("ExplorerWorkshop inside the shared expedition frame", () => {
  it("splits the same shaded quantity interactively without typing", () => {
    const { onAction, container } = fixture();
    expect(screen.getByLabelText("전체 2조각 중 1조각 색칠")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "1번째 분수 나누는 수 늘리기" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "1번째 분수 나누는 수 늘리기" }),
    );
    expect(screen.getByLabelText("전체 6조각 중 3조각 색칠")).toBeVisible();
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "나눈 조각 확인하기" }));
    expect(onAction).toHaveBeenCalledWith({
      type: "lab-split",
      questionId: "split-question",
      factor: 3,
    });
    expect(container.querySelector("input")).not.toBeInTheDocument();
    expect(container.querySelector("[data-explorer-dock]")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "4");
  });

  it("keeps the two fraction controls independent and sends their chosen factors", () => {
    const { onAction } = fixture({
      stage: "match",
      fractions: [
        { numerator: 1, denominator: 2 },
        { numerator: 1, denominator: 3 },
      ],
    });
    fireEvent.click(
      screen.getByRole("button", { name: "1번째 분수 나누는 수 늘리기" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "1번째 분수 나누는 수 늘리기" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "2번째 분수 나누는 수 늘리기" }),
    );
    expect(screen.getByLabelText("전체 6조각 중 3조각 색칠")).toBeVisible();
    expect(screen.getByLabelText("전체 6조각 중 2조각 색칠")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "나눈 조각 확인하기" }));
    expect(onAction).toHaveBeenCalledWith({
      type: "lab-match",
      questionId: "split-question",
      factors: [3, 2],
    });
  });

  it("lets the learner paint and erase arbitrary parts, then submits only their counts", () => {
    const { onAction } = fixture({
      stage: "check",
      targetDenominator: 12,
      fractions: [{ numerator: 2, denominator: 3 }],
    });
    const first = screen.getByRole("button", { name: "1번째 분수 1번째 조각" });
    fireEvent.click(first);
    fireEvent.click(
      screen.getByRole("button", { name: "1번째 분수 9번째 조각" }),
    );
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "칠한 조각 확인하기" }));
    expect(onAction).toHaveBeenCalledWith({
      type: "lab-check",
      questionId: "split-question",
      parts: [1],
    });
    expect(
      screen.queryByRole("button", { name: /해설/ }),
    ).not.toBeInTheDocument();
  });

  it("submits a prediction on one tap and keeps it within the shared answer dock", () => {
    const { onAction, container } = fixture({
      stage: "predict",
      choices: [
        { id: 0, label: "더 커져요" },
        { id: 1, label: "그대로예요" },
        { id: 2, label: "더 작아져요" },
      ],
    });
    const choice = screen.getByRole("button", { name: "2 그대로예요" });
    expect(container.querySelector("[data-explorer-dock]")).toContainElement(
      choice,
    );
    fireEvent.click(choice);
    expect(onAction).toHaveBeenCalledWith({
      type: "lab-predict",
      questionId: "split-question",
      choiceId: 1,
    });
  });
});

describe("ExplorerWorkshop — 머리 이름 줄(05 §8.19 · D-143)", () => {
  it("«통분» + 갈래 딱지 «정의» + «조각 활동 · 단계 이름» — 풀이 화면과 같은 이름 줄", () => {
    fixture({ stage: "predict", choices: [{ id: 0, label: "더 작아져요" }] });
    const row = document.querySelector("[data-concept-row]")!;
    expect(row.querySelector("[data-concept-name]")).toHaveTextContent("통분");
    expect(row.querySelector("[data-concept-kind]")).toHaveTextContent("정의");
    expect(row).toHaveTextContent("조각 활동 · 먼저 예상하기");
    expect(
      screen.queryByText("통분 · 조각으로 이해하기"),
    ).not.toBeInTheDocument();
  });
});
