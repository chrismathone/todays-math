/**
 * Offline, never imported by the application. The approved corrections to the static
 * manuscripts, and the way back: undoing them gives the manuscripts as first committed.
 * `static-corrections.json` is written by hand, one entry per corrected turn; nothing
 * regenerates it, so a turn that changes without an entry here is caught by the tests.
 */
import ledger from "./static-corrections.json";
import type { ConceptScriptSource, ConceptTeachingScript } from "./types";

export type StaticCorrection = {
  id: string;
  sectionKey: string;
  turnIndex: number;
  source: ConceptScriptSource;
  kind:
    | "sentence-answer-copula"
    | "particle"
    | "missing-condition"
    | "ambiguous-wording";
  old: string;
  new: string;
  reason: string;
};

export const STATIC_CORRECTIONS = ledger.corrections as StaticCorrection[];
export const STATIC_CORRECTIONS_REVIEW = {
  reviewedOn: ledger.reviewedOn,
  review: ledger.review,
  authority: ledger.authority,
};

export const mathTokensOf = (markdown: string): string[] =>
  markdown.match(/\$[^$]*\$/g) ?? [];

/** Every math token of `before` is still in `after`, in the same order. */
export function keepsMathTokens(before: string, after: string): boolean {
  const kept = mathTokensOf(after);
  let at = 0;
  for (const token of mathTokensOf(before)) {
    at = kept.indexOf(token, at);
    if (at < 0) return false;
    at += 1;
  }
  return true;
}

/**
 * The manuscripts with each corrected turn put back to its earlier text. Throws when a
 * listed turn no longer reads as the ledger says, or its source has moved.
 */
export function withoutStaticCorrections(
  scripts: readonly ConceptTeachingScript[],
  corrections: readonly StaticCorrection[] = STATIC_CORRECTIONS,
): ConceptTeachingScript[] {
  const reverted = structuredClone(scripts) as ConceptTeachingScript[];
  const bySection = new Map(
    reverted.map((script) => [script.sectionKey, script]),
  );
  for (const correction of corrections) {
    const turn = bySection.get(correction.sectionKey)?.dialogue[
      correction.turnIndex
    ];
    if (!turn) continue;
    if (
      turn.markdown !== correction.new ||
      JSON.stringify(turn.source) !== JSON.stringify(correction.source)
    )
      throw new Error(
        `Correction ${correction.id} does not match the manuscript`,
      );
    turn.markdown = correction.old;
  }
  return reverted;
}
