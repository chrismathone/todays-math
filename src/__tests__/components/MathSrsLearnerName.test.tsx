import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ElementaryCourseApp from "@/components/math-srs/ElementaryCourseApp";
import MathSrsApp from "@/components/math-srs/MathSrsApp";
import {
  addLearner,
  createStore,
  loadStore,
  saveStore,
} from "@/lib/math-srs/storage";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("learner picker accessible name", () => {
  it.each([
    { name: "elementary course", App: ElementaryCourseApp },
    { name: "algebra review", App: MathSrsApp },
  ])("keeps the $name picker named and usable when its visual label is hidden", async ({ App }) => {
    const initial = createStore();
    const originalId = initial.activeLearnerId;
    const twoLearners = addLearner(initial, "다른 학습자");
    expect(saveStore(twoLearners).ok).toBe(true);
    const user = userEvent.setup();
    render(<App />);
    const picker = screen.getByRole<HTMLSelectElement>("combobox", {
      name: "학습자",
    });
    await waitFor(() => expect(picker).toBeEnabled());

    // jsdom does not load breakpoint CSS. Apply the real mobile condition to
    // the label and ask the accessibility API for the control's name again.
    picker.labels![0].style.display = "none";
    expect(screen.getByRole("combobox", { name: "학습자" })).toBe(picker);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "학습자" }),
      originalId,
    );
    expect(picker).toHaveValue(originalId);
    expect(loadStore().store.activeLearnerId).toBe(originalId);
  });
});
