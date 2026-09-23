import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoursePlayer } from "@/components/lab/CoursePlayer";
import { emptySave } from "@/lib/lab/progress";
import type { CourseDef, LabSave } from "@/lib/lab/types";

const { judgeAnswer } = vi.hoisted(() => ({ judgeAnswer: vi.fn() }));
const course: CourseDef = {
  id: "recovery",
  title: "Recovery course",
  gradeLabel: "3학년",
  unitIds: [],
  summary: "",
  flow: "",
  activities: ["First", "Second", "Third"].map((title, index) => ({
    id: `activity-${index}`,
    kind: "apply",
    title,
    intro: "Choose an answer.",
    engine: {
      type: "choice",
      options: [
        { id: "wrong", label: "Wrong" },
        { id: "correct", label: "Correct" },
      ],
      correct: "correct",
    },
    hints: [{ id: "hint", text: "Try again." }],
    success: "Correct answer.",
    wrong: "Try another answer.",
  })),
};

vi.mock("@/lib/lab/courses", () => ({ courseById: () => course }));
vi.mock("@/lib/lab/judge", () => ({ judge: judgeAnswer }));
vi.mock("@/lib/lab/sound", () => ({ playHit: vi.fn() }));
vi.mock("@/components/lab/LabShell", () => ({
  LabShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/lab/ActivityEngine", () => ({
  emptyValue: () => "",
  toJudgeAnswer: (_spec: unknown, answer: unknown) => answer,
  ActivityEngine: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (answer: string) => void;
  }) => (
    <div>
      <span data-testid="selected-answer">{value || "empty"}</span>
      <button type="button" onClick={() => onChange("wrong")}>
        Wrong
      </button>
      <button type="button" onClick={() => onChange("correct")}>
        Correct
      </button>
    </div>
  ),
}));
vi.mock("@/components/lab/useLabSave", () => ({
  useLabSave: () => {
    const [save, setSave] = useState<LabSave>(() => ({
      ...emptySave(),
      courses: { recovery: { index: 1, activities: {} } },
    }));
    return { save, setSave, ready: true };
  },
}));

beforeEach(() => {
  localStorage.clear();
  judgeAnswer.mockImplementation((_spec, answer: string) => ({
    ok: answer === "correct",
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("lab course recovery", () => {
  it("lets a learner reset a wrong selection and try the same choice again", () => {
    render(<CoursePlayer courseId="recovery" />);
    expect(screen.getByRole("heading", { name: "Second" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Wrong" }));
    expect(screen.getByText("Try another answer.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 해보기" }));
    expect(screen.getByTestId("selected-answer")).toHaveTextContent("empty");
    expect(screen.getByRole("button", { name: "Wrong" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Wrong" }));
    expect(judgeAnswer).toHaveBeenCalledTimes(2);
  });

  it("cancels delayed auto advance when the learner goes to an earlier activity", () => {
    vi.useFakeTimers();
    render(<CoursePlayer courseId="recovery" />);
    fireEvent.click(screen.getByRole("button", { name: "Correct" }));
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    expect(screen.getByRole("heading", { name: "First" })).toHaveFocus();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("heading", { name: "First" })).toBeInTheDocument();
  });
});
