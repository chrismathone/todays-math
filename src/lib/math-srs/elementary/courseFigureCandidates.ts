import { generateElementaryProblem } from "../../elementary/generate";

/** Reader entrypoint. The legacy candidate stays first for requests without a fingerprint. */
export function courseFigureCandidates(
  ...args: Parameters<typeof generateElementaryProblem>
) {
  return [generateElementaryProblem(...args)];
}
