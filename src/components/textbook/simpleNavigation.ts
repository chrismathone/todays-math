import { ACTIVITY_LABELS } from "@/lib/textbook/activities";
import type { EditionDetail, SectionDetail } from "./model";

const activityLabels = new Set(Object.values(ACTIVITY_LABELS));

/** Reuse the generated contents' activity metadata without changing manuscript titles. */
export function simpleSectionLabels(
  edition: EditionDetail,
  contents: SectionDetail | null,
): ReadonlyMap<string, string> {
  const sections = edition.units.flatMap((unit) => unit.sections);
  const labels = new Map(
    sections.map((section) => [section.sectionId, section.title]),
  );
  if (
    contents?.editionId !== edition.editionId ||
    contents.templateKey !== "auto-table-of-contents"
  )
    return labels;

  const references = new Map(
    contents.blocks.flatMap((block) => {
      const semantic = block.semantic;
      return semantic?.activity === "tableOfContents" &&
        semantic.node?.kind === "references"
        ? semantic.node.entries.map(
            (entry) =>
              [
                JSON.stringify([entry.targetUnitKey, entry.targetSectionKey]),
                entry.label,
              ] as const,
          )
        : [];
    }),
  );
  const activities: { sectionId: string; label: string; group: string }[] = [];
  const counts = new Map<string, number>();
  for (const unit of edition.units) {
    const source = edition.structureSource?.outline.find(
      (row) => row.unitKey === unit.unitKey,
    );
    for (const section of unit.sections) {
      const key = source?.sections.find(
        (row) => row.id === section.sectionId,
      )?.sectionKey;
      const reference = references.get(JSON.stringify([unit.unitKey, key]));
      const prefix = `${section.title} · `;
      if (!reference?.startsWith(prefix)) continue;
      const label = reference.replace(/ \(\d+\/\d+\)$/, "");
      const names = label.slice(prefix.length).split(" / ");
      // An ordinary contents entry or an unknown activity keeps the existing title.
      if (!names.every((name) => activityLabels.has(name))) continue;
      const group = JSON.stringify([unit.unitKey, label]);
      activities.push({ sectionId: section.sectionId, label, group });
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
  }
  const occurrences = new Map<string, number>();
  for (const { sectionId, label, group } of activities) {
    const occurrence = (occurrences.get(group) ?? 0) + 1;
    occurrences.set(group, occurrence);
    const count = counts.get(group)!;
    labels.set(
      sectionId,
      label + (count > 1 ? ` (${occurrence}/${count})` : ""),
    );
  }
  if (
    references.size > 0 &&
    sections[0]?.sectionId === contents.sectionId &&
    edition.structureSource?.config.print.coverMode === "included"
  )
    labels.set(contents.sectionId, `표지 · ${contents.title}`);
  return labels;
}
