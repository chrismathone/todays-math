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
const CHAPTERS = new Set(["2-1", "2-2", "2-3", "2-4", "2-5", "2-6"]);

// Incomplete conditions or questions that only count objects without using the concept.
const EXCLUDED: Record<string, readonly string[]> = {
  "2-1-3:기본": ["06"], // The compared roster is missing from the printed question.
  "2-1-3:응용": ["08", "09", "10"],
  "2-3-1:기본": ["06"],
  "2-3-1:응용": ["08", "09", "10"],
  "2-3-3:응용": ["10"],
  "2-3-4:기본": ["05"], // The shown cells have not yet been completed into point symmetry.
  "2-4-5:응용": ["10"], // Comparing two numbers does not practice multiplication.
  "2-4-6:응용": ["10"],
  "2-5-1:응용": ["08", "09", "10"],
  "2-5-2:응용": ["08", "09"],
  "2-5-3:응용": ["09", "10"],
  "2-5-4:응용": ["08", "10"],
  "2-5-5:응용": ["10"],
  "2-5-6:응용": ["08"],
  "2-6-1:기본": ["05", "07"],
  "2-6-2:기본": ["05", "07"],
  "2-6-2:응용": ["08", "09"],
  "2-6-3:기본": ["02", "05", "06", "07"],
  "2-6-3:응용": ["03", "08", "09", "10"],
};

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
        form.tier === tier && !EXCLUDED[`${code}:${tier}`]?.includes(form.id),
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
