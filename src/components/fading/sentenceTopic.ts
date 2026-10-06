import type { FadingTarget } from "@/lib/fading/concepts";

/** A presentation cue must not disclose any answer erased anywhere in this step. */
function normalizeTopic(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\[a-z]+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function fadingSafeTopic(
  term: string,
  erased: readonly Pick<FadingTarget, "text">[],
): string | undefined {
  if (!erased.length) return term;
  const topic = normalizeTopic(term);
  if (!topic) return undefined;
  return erased.some((target) => {
    const answer = normalizeTopic(target.text);
    return !answer || topic.includes(answer) || answer.includes(topic);
  })
    ? undefined
    : term;
}
