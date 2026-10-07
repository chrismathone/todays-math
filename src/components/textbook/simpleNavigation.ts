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

/** «내용 고르기» 창의 한 줄 — 구획 하나. `name` 은 묶음 안에서의 이름(활동 이름)이다. */
export type ContentEntry = { sectionId: string; name: string; label: string };
/** 같은 소단원의 활동들을 묶은 것. 활동으로 나뉘지 않는 구획은 저 혼자 한 묶음이다. */
export type ContentGroup = { title: string; entries: ContentEntry[] };
export type ContentUnit = {
  unitKey: string;
  title: string;
  groups: ContentGroup[];
};

/**
 * 교재의 구획을 «대단원 → 소단원 → 활동» 세 단으로 묶는다 — 완성 보기의 «내용 고르기» 창이 읽는다.
 * 이름표가 «소단원 · 활동» 꼴이고 앞부분이 그 구획의 제목이면 활동으로 보고, 이웃한 같은 소단원끼리 한 묶음에 넣는다.
 * 그 밖의 구획(표지 · 목차, 학습 안내, 단원 도입, 색인 …)은 이름표 그대로 저 혼자 한 묶음이다.
 */
export function contentOutline(
  edition: EditionDetail,
  labels: ReadonlyMap<string, string>,
): ContentUnit[] {
  return edition.units.map((unit) => {
    const groups: ContentGroup[] = [];
    for (const section of unit.sections) {
      const label = labels.get(section.sectionId) ?? section.title;
      const prefix = `${section.title} · `;
      const activity = label.startsWith(prefix);
      const title = activity ? section.title : label;
      const entry = {
        sectionId: section.sectionId,
        name: activity ? label.slice(prefix.length) : label,
        label,
      };
      const last = groups.at(-1);
      // 활동이 아닌 구획은 제목이 같아도 묶지 않는다 — 고르면 바로 그 구획으로 간다.
      if (
        activity &&
        last &&
        last.title === title &&
        last.entries[0]!.name !== last.entries[0]!.label
      )
        last.entries.push(entry);
      else groups.push({ title, entries: [entry] });
    }
    return { unitKey: unit.unitKey, title: unit.title, groups };
  });
}
