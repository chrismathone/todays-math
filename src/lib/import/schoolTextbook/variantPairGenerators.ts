import {
  generateTextbookVariantPair,
  validateTextbookVariantPair,
  type TextbookVariantSource,
  type TextbookVariantCandidate,
} from "./variants";
import {
  generateTextbookGeometryPair,
  validateTextbookGeometryPair,
  type TextbookGeometryCandidate,
} from "./variantsGeometry";
import { reviewDigest } from "./qualification";
import {
  generateTextbookCalculusPair,
  validateTextbookCalculusPair,
  type TextbookCalculusCandidate,
} from "./variantsCalculus";

export type ReviewedTextbookCandidate =
  | TextbookVariantCandidate
  | TextbookGeometryCandidate
  | TextbookCalculusCandidate;
export function generateReviewedTextbookPair(source: TextbookVariantSource) {
  const primary = generateTextbookVariantPair(source);
  if (primary.status === "matched")
    return { ...primary, generator: "primary" as const };
  const geometry = generateTextbookGeometryPair(source);
  if (geometry.status === "matched")
    return { ...geometry, generator: "geometry" as const };
  if (source.review_status === "approved" && source.direct_use_allowed) {
    const calculus = generateTextbookCalculusPair(source);
    if (calculus.status === "matched")
      return { ...calculus, generator: "calculus" as const };
  }
  return {
    ...primary,
    detail: `${primary.detail}; geometry: ${geometry.reason}`,
    generator: "unresolved" as const,
  };
}
export function validateReviewedTextbookPair(
  source: TextbookVariantSource,
  candidates: readonly ReviewedTextbookCandidate[],
) {
  const expected = generateReviewedTextbookPair(source);
  if (
    expected.status !== "matched" ||
    reviewDigest(expected.candidates) !== reviewDigest(candidates)
  )
    return {
      valid: false,
      issues: ["candidate-does-not-match-current-priority-generator"],
    };
  if (expected.generator === "primary")
    return validateTextbookVariantPair(
      source,
      candidates as TextbookVariantCandidate[],
    );
  if (expected.generator === "geometry")
    return validateTextbookGeometryPair(
      source,
      candidates as TextbookGeometryCandidate[],
    );
  return validateTextbookCalculusPair(
    source,
    candidates as TextbookCalculusCandidate[],
  );
}
