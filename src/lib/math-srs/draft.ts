/** A separate, bounded draft per learner preserves hints/time before an answer exists. */
export interface ProblemDraft {
  problemId: string;
  usedHint: boolean;
  elapsedSeconds: number;
}
const drafts = new Map<string, ProblemDraft>();
const key = (learnerId: string) => `todays-math:srs:draft:${learnerId}`;

export function readDraft(learnerId: string, problemId: string): ProblemDraft {
  let draft = drafts.get(learnerId);
  try {
    const raw = window.localStorage.getItem(key(learnerId));
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (
        value &&
        typeof value === "object" &&
        "problemId" in value &&
        "usedHint" in value &&
        "elapsedSeconds" in value &&
        typeof value.problemId === "string" &&
        typeof value.usedHint === "boolean" &&
        typeof value.elapsedSeconds === "number" &&
        Number.isFinite(value.elapsedSeconds) &&
        value.elapsedSeconds >= 0 &&
        value.elapsedSeconds <= 86400
      ) {
        const saved = value as ProblemDraft;
        if (saved.problemId === problemId) {
          draft =
            draft?.problemId === problemId
              ? {
                  problemId,
                  usedHint: draft.usedHint || saved.usedHint,
                  elapsedSeconds: Math.max(
                    draft.elapsedSeconds,
                    saved.elapsedSeconds,
                  ),
                }
              : saved;
        }
      }
    }
  } catch {
    /* The in-memory draft still survives navigation when storage is denied. */
  }
  return draft?.problemId === problemId
    ? draft
    : { problemId, usedHint: false, elapsedSeconds: 0 };
}

export function writeDraft(learnerId: string, draft: ProblemDraft): void {
  drafts.set(learnerId, { ...draft });
  try {
    window.localStorage.setItem(key(learnerId), JSON.stringify(draft));
  } catch {
    /* Main storage surfaces availability warnings. */
  }
}

export function clearDraft(learnerId: string): void {
  drafts.delete(learnerId);
  try {
    window.localStorage.removeItem(key(learnerId));
  } catch {
    /* A stale draft cannot match the next problem. */
  }
}
