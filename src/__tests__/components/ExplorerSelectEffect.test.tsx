/**
 * 통합 탐험 «선택됨» 효과 — 1안 코발트 차오름(원장님 확정 2026-09-27, 05 §8.16).
 *
 * 이 파일은 **DOM 의 약속**만 본다 — 누른 순간에만 붙는 움직임 표지(`data-anim`), ✓ 칸이 없음,
 * `aria-pressed`·채점 요청이 그대로임. 색·차오름·움직임 줄이기 같은 **모양**은 jsdom 이 CSS 를 계산하지
 * 않아(`css: false`) 여기서 잴 수 없다 — 교훈 «RTL 은 클래스 이름을 보고 초록»(2026-09-16).
 * 모양은 실제 브라우저에서 계산된 스타일로 잰다: `scripts/qa/mobile-explorers-qa.mjs` 의 `select` 시나리오.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ExplorerActivity,
  ExplorerState,
  WorkshopView,
} from "@/contracts/mathExplorers.contract";
import ExplorerPractice from "@/components/math-explorers/ExplorerPractice";
import ExplorerWorkshop from "@/components/math-explorers/ExplorerWorkshop";

const session: NonNullable<ExplorerState["session"]> = {
  id: "session",
  route: "unit",
  title: "문자와 식",
  unitId: "unit",
  cardIds: ["a", "b", "c", "d", "e"],
  index: 0,
  total: 15,
  round: 0,
  continuation: 0,
  done: false,
  first: 0,
  stars: 0,
  unresolved: [],
  reviewOnly: false,
};
const examples: ExplorerActivity = {
  questionId: "question",
  cardId: "a",
  cardName: "항등식",
  unitId: "unit",
  unitTitle: "일차방정식",
  kind: "examples",
  prompt: "항등식을 모두 골라봐.",
  choices: [
    { id: 0, label: "x + 1 = 1 + x" },
    { id: 1, label: "2x = 6" },
    { id: 2, label: "x + 1 = 3" },
    { id: 3, label: "2(x + 1) = 2x + 2" },
  ],
};
function practice(activity: ExplorerActivity, correct: boolean | null = null) {
  const onAction = vi.fn();
  const view = render(
    <ExplorerPractice
      activity={activity}
      session={session}
      busy={false}
      correct={correct}
      eventKey=""
      onAction={onAction}
      onHome={vi.fn()}
    />,
  );
  const choice = (index: number) =>
    screen.getByRole("group", { name: "답 고르기" }).querySelectorAll("button")[
      index
    ]!;
  return { ...view, onAction, choice };
}

describe("«선택됨» — 누른 순간에만 움직임 표지가 붙는다", () => {
  it("처음 그릴 때는 표지가 없고, 누르면 «in» · 다시 누르면 «out»", () => {
    const { choice } = practice(examples);
    for (const index of [0, 1, 2, 3])
      expect(choice(index)).not.toHaveAttribute("data-anim");
    fireEvent.click(choice(1));
    expect(choice(1)).toHaveAttribute("aria-pressed", "true");
    expect(choice(1)).toHaveAttribute("data-anim", "in");
    expect(choice(0)).not.toHaveAttribute("data-anim");
    fireEvent.click(choice(1));
    expect(choice(1)).toHaveAttribute("aria-pressed", "false");
    expect(choice(1)).toHaveAttribute("data-anim", "out");
  });

  it("✓ 칸이 없다 — 보기 단추 안에 화면 읽기에서 숨긴 조각이 없다", () => {
    const { choice } = practice(examples);
    fireEvent.click(choice(0));
    for (const index of [0, 1, 2, 3]) {
      expect(choice(index).textContent).not.toContain("✓");
      // KaTeX 의 그림 쪽(`.katex-html`)은 원래 aria-hidden 이다 — 그 밖의 숨은 조각(✓ 칸)이 없어야 한다.
      const hidden = [
        ...choice(index).querySelectorAll('[aria-hidden="true"]'),
      ].filter((node) => !node.closest(".katex"));
      expect(hidden).toEqual([]);
    }
  });

  it("채점 뒤 다시 그려도 표지가 바뀌지 않는다 — 틀림이어도 고른 표시(aria-pressed) 그대로", () => {
    const { choice, rerender, onAction } = practice(examples);
    fireEvent.click(choice(1));
    fireEvent.click(screen.getByRole("button", { name: "선택한 예 확인하기" }));
    expect(onAction).toHaveBeenCalledWith({
      type: "answer",
      questionId: "question",
      choiceIds: [1],
    });
    rerender(
      <ExplorerPractice
        activity={examples}
        session={session}
        busy={false}
        correct={false}
        eventKey="graded"
        onAction={onAction}
        onHome={vi.fn()}
      />,
    );
    expect(choice(1)).toHaveAttribute("aria-pressed", "true");
    expect(choice(1)).toHaveAttribute("data-anim", "in");
    expect(choice(1)).toHaveAttribute("data-answer-state", "incorrect");
    expect(choice(0)).not.toHaveAttribute("data-anim");
  });

  it("정의 조립 — 고른 조각은 «in», 빈칸을 눌러 빼면 그 조각은 «out»", () => {
    const { choice } = practice({
      ...examples,
      kind: "assemble",
      pieces: ["", " 는 ", " 이다."],
    });
    fireEvent.click(choice(2));
    expect(choice(2)).toHaveAttribute("data-anim", "in");
    expect(choice(2)).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /^빈칸 1,/ }));
    expect(choice(2)).toHaveAttribute("aria-pressed", "false");
    expect(choice(2)).toHaveAttribute("data-anim", "out");
  });

  it("경계 살피기 — 한 번 누르면 «in» 표지와 함께 바로 채점을 부른다", () => {
    const { choice, onAction } = practice({
      ...examples,
      kind: "truth",
      prompt: "항등식은 모든 값에서 참이다.",
      choices: [
        { id: 0, label: "맞다" },
        { id: 1, label: "아니다" },
      ],
    });
    fireEvent.click(choice(1));
    expect(choice(1)).toHaveAttribute("data-anim", "in");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [1],
    });
  });
});

const workshopBase: NonNullable<WorkshopView["session"]> = {
  id: "workshop",
  route: "explore",
  stage: "predict",
  attachedTo: {
    sessionId: "session",
    questionId: "question",
    cardId: "g5-common-denominator",
  },
  questionId: "predict-question",
  checkIndex: 0,
  checkTotal: 2,
  done: false,
  prompt: "색칠한 반쪽을 잘게 나누면 색칠한 부분의 크기는 어떻게 될까요?",
  fractions: [{ numerator: 1, denominator: 2 }],
  targetDenominator: null,
  factors: [1, 1],
  choices: [
    { id: 0, label: "더 커져요" },
    { id: 1, label: "그대로예요" },
    { id: 2, label: "더 작아져요" },
  ],
  predictionLabel: null,
  stars: 0,
};
function workshop(changes: Partial<typeof workshopBase> = {}) {
  const onAction = vi.fn();
  const view = render(
    <ExplorerWorkshop
      workshop={{ ...workshopBase, ...changes }}
      session={session}
      busy={false}
      correct={null}
      eventKey=""
      onAction={onAction}
      onHome={vi.fn()}
    />,
  );
  return { ...view, onAction };
}

describe("«선택됨» — 작업실도 같은 효과(모든 화면 일치)", () => {
  it("하나 고르기 — 누르면 «in» 표지와 함께 바로 보낸다", () => {
    const { onAction } = workshop();
    const button = screen.getByRole("button", { name: "2 그대로예요" });
    expect(button).not.toHaveAttribute("data-anim");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-anim", "in");
    expect(onAction).toHaveBeenCalledWith({
      type: "lab-predict",
      questionId: "predict-question",
      choiceId: 1,
    });
  });

  it("칠하기 칸은 칠해져도 ✓ 글자가 없다", () => {
    workshop({
      stage: "check",
      choices: [],
      targetDenominator: 6,
      fractions: [{ numerator: 1, denominator: 2 }],
      prompt: "분모가 6일 때 같은 크기가 되도록 조각을 칠해 보세요.",
    });
    const cell = screen.getByRole("button", {
      name: "1번째 분수 1번째 조각",
    });
    fireEvent.click(cell);
    expect(cell).toHaveAttribute("aria-pressed", "true");
    expect(cell.textContent).toBe("");
  });
});
