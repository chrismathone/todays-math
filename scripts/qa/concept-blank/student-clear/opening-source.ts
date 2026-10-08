/** Offline source provenance for authored chapter goals; assessment questions are separate. */
import { createHash } from "node:crypto";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type { UnitOpening } from "@/lib/textbook/unitOpenings";

const assessmentFields = new Set([
  "questionRevision",
  "bQuestion",
  "clozeQuestion",
  "questionExclusions",
]);
const learningSource = (entry: ConceptEntry) =>
  Object.fromEntries(
    Object.entries(entry).filter(([field]) => !assessmentFields.has(field)),
  );
const stable = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(stable).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map(
            (key) =>
              `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`,
          )
          .join(",")}}`
      : JSON.stringify(value);
const sha = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");

export const coreSectionSourceHash = (
  key: string,
  entries: readonly ConceptEntry[],
): string =>
  sha(stable({ section: key, concepts: entries.map(learningSource) }));

/** Returns a plan only. Changed chapter goals still require actual reading before applying it. */
export function planOpeningSourceHashes(input: {
  openings: readonly UnitOpening[];
  baseline: readonly ConceptEntry[];
  candidate: readonly ConceptEntry[];
}) {
  const original = new Map(input.baseline.map((entry) => [entry.id, entry]));
  const candidate = new Map(input.candidate.map((entry) => [entry.id, entry]));
  if (
    original.size !== input.baseline.length ||
    candidate.size !== input.candidate.length ||
    original.size !== candidate.size
  )
    throw new Error("도입부 원천 ID 범위가 다릅니다.");
  for (const entry of input.baseline) {
    const next = candidate.get(entry.id);
    if (
      !next ||
      stable({ ...learningSource(entry), definition: "" }) !==
        stable({ ...learningSource(next), definition: "" })
    )
      throw new Error(
        `도입부 원천의 ID·위치·설명 외 내용이 바뀌었습니다: ${entry.id}`,
      );
  }
  const openings = structuredClone(input.openings) as UnitOpening[];
  const seen = new Set<string>();
  const sectionKeys = new Set<string>();
  const sectionChanges: {
    chapterId: string;
    sectionId: string;
    beforeHash: string;
    afterHash: string;
    changedIds: string[];
  }[] = [];
  for (const opening of openings) {
    if (
      sha(opening.sections.map((section) => section.sourceHash).join("\n")) !==
      opening.provenance.sourceHash
    )
      throw new Error(`기존 대단원 원천 지문이 다릅니다: ${opening.id}`);
    for (const section of opening.sections) {
      if (sectionKeys.has(section.key)) throw new Error("중복 도입 소단원");
      sectionKeys.add(section.key);
      const before = input.baseline.filter(
        (entry) => entry.section === section.key,
      );
      if (
        before.length !== section.conceptIds.length ||
        before.some((entry, index) => entry.id !== section.conceptIds[index]) ||
        coreSectionSourceHash(section.key, before) !== section.sourceHash
      )
        throw new Error(`기존 소단원 원천과 ID 순서가 다릅니다: ${section.id}`);
      for (const entry of before) {
        if (seen.has(entry.id)) throw new Error("중복 도입 원천 ID");
        seen.add(entry.id);
      }
      const after = before.map((entry) => candidate.get(entry.id)!);
      const afterHash = coreSectionSourceHash(section.key, after);
      if (afterHash === section.sourceHash) continue;
      sectionChanges.push({
        chapterId: opening.id,
        sectionId: section.id,
        beforeHash: section.sourceHash,
        afterHash,
        changedIds: before
          .filter(
            (entry) => entry.definition !== candidate.get(entry.id)!.definition,
          )
          .map((entry) => entry.id),
      });
      // These cloned provenance objects are the only changed fields.
      (section as { sourceHash: string }).sourceHash = afterHash;
    }
    (opening.provenance as { sourceHash: string }).sourceHash = sha(
      opening.sections.map((section) => section.sourceHash).join("\n"),
    );
  }
  if (seen.size !== original.size)
    throw new Error("도입부에 대응하지 않은 핵심 원천 ID가 있습니다.");
  return { openings, sectionChanges };
}
