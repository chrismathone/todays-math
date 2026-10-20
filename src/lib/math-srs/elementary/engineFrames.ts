import type { UnitSeed } from "../../../../prisma/seed-data/units";
import {
  coreForms,
  generateElementaryForm,
  generateElementaryProblem,
} from "../../elementary/generate";
import type { ElemTier } from "../../elementary/difficulty";
import { getCourseProblemInput } from "./answers";
import { extraCourseFrames } from "./extraFrames";

/** Opt in chapter by chapter after reviewing the existing authored forms. */
const CHAPTERS = new Set(["2-1", "2-2"]);

/** Explicit SRS redraw entry point; the bank's default generator stays unchanged. */
export function generateCourseEngineRedraw(
  unit: UnitSeed,
  seed: number,
  tier: ElemTier,
) {
  if (
    unit.grade === "초5" &&
    CHAPTERS.has(unit.chapter.split(" ")[0]) &&
    (tier === "기본" || tier === "응용")
  ) {
    const code = unit.section.split(" ")[0];
    const forms = coreForms(unit).filter(
      (form) =>
        form.tier === tier &&
        !(
          code === "2-1-3" &&
          (tier === "응용" ? form.id !== "03" : form.id === "06")
        ),
    );
    const candidates = [
      ...forms.map((form) => () => generateElementaryForm(unit, seed, form.id)),
      ...extraCourseFrames(unit, seed, tier).map((problem) => () => problem),
    ];
    for (let i = 0; i < candidates.length; i++) {
      const problem = candidates[((seed >>> 0) + i) % candidates.length]();
      // Explanations, symbolic answers and comparison questions keep their existing flow.
      if (getCourseProblemInput(problem).mode !== "self-check") return problem;
    }
  }
  return generateElementaryProblem(unit, seed, tier);
}
