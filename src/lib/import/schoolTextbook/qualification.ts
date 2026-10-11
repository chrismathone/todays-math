import { createHash } from "node:crypto";

export function stableReviewValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableReviewValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableReviewValue(item)]),
    );
  return value;
}
export function reviewDigest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableReviewValue(value)))
    .digest("hex");
}
export const RETRY_REVIEW_FIELDS = [
  "externalId",
  "sourceId",
  "slot",
  "content",
  "answer",
  "solution",
  "figureSvg",
  "figureUrls",
  "figureDims",
  "figureSourceMm",
  "choiceFigureIndex",
] as const;
/** Common content/diagram binding for independent math and production rendering packets. */
export function retryReviewPayloadDigest(
  candidates: readonly Record<string, unknown>[],
): string {
  return reviewDigest(
    [...candidates]
      .sort((a, b) => String(a.externalId).localeCompare(String(b.externalId)))
      .map((candidate) =>
        Object.fromEntries(
          RETRY_REVIEW_FIELDS.map((field) => [
            field,
            candidate[field] ??
              (field === "figureSvg"
                ? null
                : field.startsWith("figure") || field === "choiceFigureIndex"
                  ? []
                  : null),
          ]),
        ),
      ),
  );
}
