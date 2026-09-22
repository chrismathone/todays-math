import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LearningActivity from "@/components/lab/cube31/LearningActivity";
import { CUBE_LESSONS } from "@/lib/lab/cube31/lessons";
import { CUBE_EXPERIMENTS } from "@/lib/lab/cube31/experiments";
import type { CubeTask } from "@/lib/lab/cube31/types";

const questions = CUBE_LESSONS.flatMap((lesson) => lesson.tasks).filter(
  (task): task is Extract<CubeTask, { kind: "question" }> =>
    task.kind === "question",
);
function mount(id: string) {
  const task = questions.find((task) => task.id === id)!;
  const onComplete = vi.fn();
  const onAttempt = vi.fn();
  render(
    <LearningActivity
      task={task}
      onComplete={onComplete}
      onAttempt={onAttempt}
    />,
  );
  return { onComplete, onAttempt };
}

describe("connected cube question experiments", () => {
  it("gives every conceptual question an explicit experiment with valid answer links", () => {
    expect(questions.length).toBe(30);
    expect(Object.keys(CUBE_EXPERIMENTS).sort()).toEqual(
      questions.map((task) => task.id).sort(),
    );
    for (const task of questions) {
      expect(task.experiment, task.id).toBeDefined();
      const experiment = task.experiment!;
      if (experiment.kind === "relation" && experiment.answerField) {
        expect(
          task.fields?.some((field) => field.id === experiment.answerField),
        ).toBe(true);
      }
      if (experiment.kind === "digits") {
        const ids = experiment.rows
          .flat()
          .filter((entry) => typeof entry === "string");
        expect(ids.sort()).toEqual(
          task.fields?.map((field) => field.id).sort(),
        );
      }
      expect(experiment).not.toHaveProperty("answer");
      expect(experiment).not.toHaveProperty("correctChoice");
    }
  });

  it("links digit pieces and typed fields without submitting the answer on a piece click", async () => {
    const user = userEvent.setup();
    const { onComplete, onAttempt } = mount("hidden-addition");
    const tens = screen.getByRole("textbox", { name: "더하는 수의 십의 자리" });
    const ones = screen.getByRole("textbox", { name: "더하는 수의 일의 자리" });
    expect(tens).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "1 숫자 넣기" }));
    expect(tens).toHaveValue("1");
    expect(onComplete).not.toHaveBeenCalled();
    expect(onAttempt).not.toHaveBeenCalled();
    await user.type(ones, "8");
    expect(
      screen.getByRole("button", { name: "더하는 수의 일의 자리, 8" }),
    ).toHaveTextContent("8");
    await user.keyboard("{Enter}");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "2 숫자 넣기" })).toBeDisabled();
    fireEvent.drop(
      screen.getByRole("button", { name: "더하는 수의 십의 자리, 1" }),
      {
        dataTransfer: { getData: () => "9" },
      },
    );
    expect(tens).toHaveValue("1");
  });

  it("lets a learner test a wrong placement and updates the corresponding answer choice", async () => {
    const user = userEvent.setup();
    const { onComplete, onAttempt } = mount("align-place");
    await user.click(
      screen.getByRole("button", { name: "백의 자리에 2 놓기" }),
    );
    expect(
      screen.getByRole("radio", { name: "백의 자리 3 아래" }),
    ).toBeChecked();
    expect(
      within(
        screen.getByRole("region", { name: "자릿값 배치 실험" }),
      ).getByRole("status"),
    ).toHaveTextContent("200");
    await user.click(screen.getByRole("button", { name: "확인하기" }));
    expect(onAttempt).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("radio", { name: "십의 자리 1 아래" }));
    expect(
      screen.getByRole("button", { name: "십의 자리에 2 놓기" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Enter}");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps missing-part slider and typed answer in sync while the operation remains a learner choice", async () => {
    const user = userEvent.setup();
    const { onComplete } = mount("story-part");
    const field = screen.getByRole("textbox", { name: "파란 구슬 개" });
    const slider = screen.getByRole("slider");
    expect(field).toHaveValue("");
    fireEvent.change(slider, { target: { value: "120" } });
    expect(field).toHaveValue("120");
    await user.clear(field);
    await user.type(field, "128");
    expect(slider).toHaveValue("128");
    expect(screen.getByRole("radio", { name: "248 − 120" })).not.toBeChecked();
    await user.click(screen.getByRole("radio", { name: "248 − 120" }));
    await user.keyboard("{Enter}");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
