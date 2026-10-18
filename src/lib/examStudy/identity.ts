import { createHash } from "node:crypto";
import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { circledValueRaw } from "@/lib/math/circledNumber";

/** No object insertion-order, clock, locale or platform dependent serialization. */
export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite canonical value");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
      .join(",")}}`;
  }
  throw new Error("Unsupported canonical value");
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function normalizeTaskText(value: string): string {
  // NFKC would turn circled choice marks into ordinary digits before parsing.
  return value
    .normalize("NFC")
    .replace(/\\(?:left|right)(?=[([\])])/g, "")
    .replace(/\\(?:,|;|!|quad|qquad)/g, " ")
    .replace(
      /\$([^$]*)\$/g,
      (_whole, math: string) =>
        `$${/\\(?:text|textrm|textsf)\b/.test(math) ? math.trim() : math.replace(/\s+/g, "")}$`,
    )
    .replace(/\s+/g, " ")
    .trim();
}

const RENDER_METADATA =
  /^(?:figureSvg|rendererId|renderId|svgId|glyphId|renderedAt|requestId)$/i;
export function mathematicalFigure(spec: unknown): unknown {
  if (Array.isArray(spec)) return spec.map(mathematicalFigure);
  if (spec !== null && typeof spec === "object") {
    return Object.fromEntries(
      Object.entries(spec)
        .filter(([k]) => !RENDER_METADATA.test(k))
        .map(([k, v]) => [k, mathematicalFigure(v)]),
    );
  }
  return spec ?? null;
}

/**
 * Pure numeric/expression answer choices are response packaging. Conceptual
 * alternatives are part of the mathematical task and remain as a sorted set.
 */
export function mathematicalTask(
  item: Pick<
    ExamStudyDraft,
    "content" | "answer" | "questionType" | "figureSpec"
  >,
): unknown {
  const parsed = parseProblemContent(item.content);
  const selected =
    item.questionType === "객관식"
      ? [...item.answer]
          .map(circledValueRaw)
          .filter((n) => n >= 1 && n <= 5)
          .map((n) => n - 1)
      : [];
  if (selected.length && parsed.choices.length === 5) {
    const choices = parsed.choices.map(normalizeTaskText);
    const numericPackaging =
      selected.length === 1 &&
      choices.every((c) =>
        /^\$[^$]+\$(?:\s*(?:개|cm|m|원|분|초|도|%)|\s*)$/.test(c),
      );
    return {
      task: normalizeTaskText(parsed.question),
      answer:
        selected.length === 1
          ? choices[selected[0]!]
          : selected.map((i) => choices[i]).sort(),
      ...(numericPackaging ? {} : { alternatives: [...choices].sort() }),
      figure: mathematicalFigure(item.figureSpec),
    };
  }
  return {
    task: normalizeTaskText(item.content),
    answer: normalizeTaskText(item.answer),
    figure: mathematicalFigure(item.figureSpec),
  };
}

export function contentDigest(
  item: Pick<
    ExamStudyDraft,
    "content" | "answer" | "questionType" | "figureSpec"
  >,
): string {
  return sha256(mathematicalTask(item));
}

export function legacyCanonicalParams(item: ExamStudyDraft): CanonicalParams {
  return { nativeTaskDigest: contentDigest(item) };
}

export function logicalKey(
  family: Pick<ExamStudyFamily, "id" | "version">,
  params: CanonicalParams,
): string {
  // Parameters are deliberately not a seed or a response format.
  return `${family.id}@${family.version}:${stableStringify(params)}`;
}

export function seedFrom(value: unknown): number {
  return Number.parseInt(sha256(value).slice(0, 8), 16) & 0x7fffffff;
}
