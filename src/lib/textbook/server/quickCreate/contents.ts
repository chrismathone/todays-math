import type { TextbookSemantic } from "@/contracts/textbookSemantic.contract";
import { ACTIVITY_LABELS } from "../../activities";
import type { SectionPlan } from "./context";

type ContentsSection = Pick<
  SectionPlan,
  "unitKey" | "sectionKey" | "title" | "blocks"
>;
type ReferenceEntry = Extract<
  NonNullable<TextbookSemantic["node"]>,
  { kind: "references" }
>["entries"][number];

/** New lesson partitions retain their destinations while the contents names each activity. */
export function contentsEntries(
  sections: readonly ContentsSection[],
): ReferenceEntry[] {
  const titleCounts = new Map<string, number>();
  const titleKey = (section: ContentsSection) =>
    JSON.stringify([section.unitKey, section.title]);
  for (const section of sections) {
    const key = titleKey(section);
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }
  const labels = sections.map((section) => {
    if (titleCounts.get(titleKey(section)) === 1) return section.title;
    const activities = [
      ...new Set(
        section.blocks.flatMap((block) =>
          block.semantic ? [block.semantic.activity] : [],
        ),
      ),
    ];
    return activities.length
      ? `${section.title} · ${activities.map((activity) => ACTIVITY_LABELS[activity]).join(" / ")}`
      : section.title;
  });
  const labelCounts = new Map<string, number>();
  const labelKey = (index: number) =>
    JSON.stringify([sections[index].unitKey, labels[index]]);
  labels.forEach((_, index) => {
    const key = labelKey(index);
    labelCounts.set(key, (labelCounts.get(key) ?? 0) + 1);
  });
  const occurrences = new Map<string, number>();
  return sections.map((section, index) => {
    const key = labelKey(index);
    const occurrence = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, occurrence);
    const count = labelCounts.get(key)!;
    return {
      key: section.sectionKey,
      label: labels[index] + (count > 1 ? ` (${occurrence}/${count})` : ""),
      targetUnitKey: section.unitKey,
      targetSectionKey: section.sectionKey,
    };
  });
}
