import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CubeUnitLab from "@/components/lab/cube31/CubeUnitLab";
import { CUBE_LESSONS, CUBE_TASK_IDS } from "@/lib/lab/cube31/lessons";
import {
  CUBE_SAVE_KEY,
  CONCEPTS,
  emptyCubeSave,
} from "@/lib/lab/cube31/progress";
import type { CubePractice } from "@/lib/lab/cube31/types";

vi.mock("@/components/lab/cube31/RegroupingBoard", () => ({
  default: ({
    onComplete,
    onAttempt,
  }: {
    onComplete: () => void;
    onAttempt?: () => void;
  }) => (
    <div>
      <button onClick={onComplete}>모형 조작 완료</button>
      <button onClick={onAttempt}>세로셈 다시 시도</button>
    </div>
  ),
}));
vi.mock("@/components/lab/cube31/LearningActivity", () => ({
  default: ({
    onComplete,
    onAttempt,
  }: {
    onComplete: () => void;
    onAttempt?: () => void;
  }) => (
    <div>
      <button onClick={onComplete}>올바른 과정과 답 제출</button>
      <button onClick={onAttempt}>틀린 답 제출</button>
    </div>
  ),
}));
vi.mock("next/dynamic", () => ({ default: () => () => <p>3D 수 모형</p> }));
const pool: CubePractice[] = CONCEPTS.flatMap((concept, c) =>
  [0, 1].map((i) => ({
    id: concept + i,
    a: 100 + c + i,
    b: 100,
    operation: "add",
    answer: 200 + c + i,
    concept,
  })),
);
function stored() {
  return JSON.parse(localStorage.getItem(CUBE_SAVE_KEY)!);
}
function startChallenge() {
  const save = {
    ...emptyCubeSave(),
    lesson: CUBE_LESSONS.findIndex((l) => l.id === "challenge"),
  };
  localStorage.setItem(CUBE_SAVE_KEY, JSON.stringify(save));
  render(<CubeUnitLab practice={pool} />);
}
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
describe("CubeUnitLab learner evidence", () => {
  it("saves failed attempts, hints and completion without counting hints as completion", () => {
    render(<CubeUnitLab practice={pool} />);
    fireEvent.click(screen.getByRole("button", { name: "틀린 답 제출" }));
    fireEvent.click(screen.getByRole("button", { name: "생각하는 힌트 보기" }));
    expect(stored().tasks[CUBE_TASK_IDS[0]]).toEqual({
      attempts: 1,
      hints: 1,
      completed: false,
    });
    fireEvent.click(
      screen.getByRole("button", { name: "올바른 과정과 답 제출" }),
    );
    expect(stored().tasks[CUBE_TASK_IDS[0]]).toEqual({
      attempts: 2,
      hints: 1,
      completed: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "다음 활동 →" }));
    expect(stored().step).toBe(1);
    expect(
      screen.getByRole("heading", { name: "묶음을 바꾸어도 같은 수" }),
    ).toBeInTheDocument();
  });
  it("records first-attempt independent transfer and rotates fresh problems", () => {
    startChallenge();
    fireEvent.change(screen.getByRole("textbox", { name: "계산한 답" }), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "답 확인" }));
    expect(stored().mastery["add-none"]).toEqual(["add-none0"]);
    fireEvent.click(screen.getByRole("button", { name: /학습 기록/ }));
    fireEvent.click(screen.getByRole("button", { name: "다른 수로 도전" }));
    expect(stored().round).toBe(1);
    expect(screen.getByRole("textbox", { name: "계산한 답" })).toHaveValue("");
  });
  it.each(["incorrect", "help"])(
    "does not award independent transfer after %s",
    (mode) => {
      startChallenge();
      if (mode === "help") {
        fireEvent.click(
          screen.getByRole("button", { name: "수 모형으로 다시 생각하기" }),
        );
        fireEvent.click(screen.getByRole("button", { name: "모형 조작 완료" }));
      } else {
        fireEvent.change(screen.getByRole("textbox", { name: "계산한 답" }), {
          target: { value: "999" },
        });
        fireEvent.click(screen.getByRole("button", { name: "답 확인" }));
      }
      fireEvent.change(screen.getByRole("textbox", { name: "계산한 답" }), {
        target: { value: "200" },
      });
      fireEvent.click(screen.getByRole("button", { name: "답 확인" }));
      expect(stored().mastery).toEqual({});
      expect(screen.getByText(/다시 생각해서 해결했어요/)).toBeInTheDocument();
    },
  );
  it("restores completed learning and dismisses the report without changing it", () => {
    localStorage.setItem(
      CUBE_SAVE_KEY,
      JSON.stringify({
        ...emptyCubeSave(),
        lesson: 1,
        tasks: {
          [CUBE_TASK_IDS[0]]: { completed: true, attempts: 3, hints: 1 },
        },
      }),
    );
    render(<CubeUnitLab practice={pool} />);
    expect(
      screen.getByRole("heading", { name: "합쳐도 넘치지 않아요" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /학습 기록/ }));
    const dialog = screen.getByRole("dialog", { name: "나의 학습 기록" });
    expect(within(dialog).getByText(/개념 다시 살펴보기/)).toBeInTheDocument();
    fireEvent(
      dialog,
      new Event("cancel", { bubbles: false, cancelable: true }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(stored().tasks[CUBE_TASK_IDS[0]].attempts).toBe(3);
  });
});
