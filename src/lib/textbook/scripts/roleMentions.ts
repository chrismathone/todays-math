import type { ConceptScriptParticle, ConceptScriptRoleMention } from "./types";

type MentionSpec = Pick<ConceptScriptRoleMention, "role" | "name" | "particle">;

/**
 * Every place where the v15 manuscript addresses a student by name, keyed by
 * `unit:scriptIndex:blockIndex`. This list is the anchor: a name that is not
 * listed here is ordinary text (for example "지은" inside "짝지은") and is never
 * replaced. The teacher is addressed by the role word "선생님", which stays as is.
 */
export const V15_ROLE_MENTIONS: Readonly<
  Record<string, readonly MentionSpec[]>
> = {
  "U01:1:3": [
    { role: "student1", name: "민서", particle: "은/는" },
    { role: "student2", name: "지호", particle: "은/는" },
  ],
};

const PARTICLE_FORMS: Record<
  ConceptScriptParticle,
  readonly [afterConsonant: string, afterVowel: string]
> = {
  "은/는": ["은", "는"],
  "이/가": ["이", "가"],
  "을/를": ["을", "를"],
  "과/와": ["과", "와"],
  "아/야": ["아", "야"],
  "": ["", ""],
};

/** The particle form that follows `name`; a non-Hangul ending keeps both forms visible. */
export function particleAfter(
  name: string,
  particle: ConceptScriptParticle,
): string {
  const [afterConsonant, afterVowel] = PARTICLE_FORMS[particle];
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xac00 || code > 0xd7a3)
    return afterConsonant === afterVowel
      ? afterConsonant
      : `${afterConsonant}(${afterVowel})`;
  return (code - 0xac00) % 28 ? afterConsonant : afterVowel;
}

const insideMath = (markdown: string, at: number) =>
  (markdown.slice(0, at).match(/\$/g) ?? []).length % 2 === 1;

/** Authoring step: each listed mention must occur exactly once, outside math. */
export function anchorRoleMentions(
  markdown: string,
  specs: readonly MentionSpec[],
): ConceptScriptRoleMention[] {
  const mentions = specs.map((spec) => {
    const written = spec.name + particleAfter(spec.name, spec.particle);
    const found: number[] = [];
    for (
      let at = markdown.indexOf(written);
      at >= 0;
      at = markdown.indexOf(written, at + 1)
    )
      if (!insideMath(markdown, at)) found.push(at);
    if (found.length !== 1)
      throw new Error(
        `Role mention "${written}" must occur exactly once: ${markdown}`,
      );
    return { ...spec, start: found[0]!, end: found[0]! + written.length };
  });
  return mentions.sort((a, b) => a.start - b.start);
}

/**
 * New-generation step: write the chosen student names into the anchored spans and
 * return the anchors for the new text. Text outside the spans, and every `$…$`,
 * is returned byte for byte. A role without a chosen name keeps the manuscript's.
 */
export function applyRoleMentions(
  markdown: string,
  mentions: readonly ConceptScriptRoleMention[] | undefined,
  names: Partial<Record<ConceptScriptRoleMention["role"], string>>,
): { markdown: string; roleMentions: ConceptScriptRoleMention[] } {
  let result = "";
  let cursor = 0;
  const roleMentions: ConceptScriptRoleMention[] = [];
  for (const mention of [...(mentions ?? [])].sort(
    (a, b) => a.start - b.start,
  )) {
    const written =
      mention.name + particleAfter(mention.name, mention.particle);
    if (
      mention.start < cursor ||
      markdown.slice(mention.start, mention.end) !== written ||
      insideMath(markdown, mention.start)
    )
      throw new Error(`Stale role mention anchor: ${written}`);
    const name = names[mention.role]?.trim() || mention.name;
    const replaced = name + particleAfter(name, mention.particle);
    result += markdown.slice(cursor, mention.start);
    roleMentions.push({
      ...mention,
      name,
      start: result.length,
      end: result.length + replaced.length,
    });
    result += replaced;
    cursor = mention.end;
  }
  return { markdown: result + markdown.slice(cursor), roleMentions };
}
