import { generateElementaryProblem } from "../../elementary/generate";
import { generateCourseEngineRedraw } from "./engineFrames";

/** Reader entrypoint. The legacy candidate stays first for requests without a fingerprint. */
export function courseFigureCandidates(
  ...args: Parameters<typeof generateElementaryProblem>
) {
  const [unit, seed, tier] = args;
  const original = generateElementaryProblem(...args);
  return tier === undefined || seed === undefined
    ? [original]
    : [original, generateCourseEngineRedraw(unit, seed, tier)];
}
