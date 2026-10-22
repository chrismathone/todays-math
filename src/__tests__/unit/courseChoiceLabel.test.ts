// @vitest-environment node
import { expect, it } from "vitest";
import { courseChoiceLabel } from "@/lib/math-srs/elementary/choiceLabel";

it.each([
  ["$37$", "37"],
  ["$0.5$", "0.5"],
  ["$\\frac{2}{4}$", "4분의 2"],
  ["$1\\frac{1}{2}$", "1과 2분의 1"],
  ["$-\\frac{1}{2}$", "2분의 -1"],
  ["$3\\,\\mathrm{cm}$", "3 cm"],
])(
  "names the displayed %s without rounding or simplifying",
  (answer, label) => {
    expect(courseChoiceLabel(answer)).toBe(label);
  },
);
