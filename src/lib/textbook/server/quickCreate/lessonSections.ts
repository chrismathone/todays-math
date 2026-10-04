import "server-only";
import { randomUUID } from "node:crypto";
import { conceptContentHash } from "../../hash.server";
import type { QuickCreateAssembly, SectionPlan } from "./context";

/** Partition new, large lessons at existing activity boundaries before saving any manuscript.
 * This bounds jobs without changing any source row, dialogue, problem or its order.
 */
export function splitLargeAutomaticLesson(
  ctx: QuickCreateAssembly,
  section: SectionPlan,
): void {
  const atomicCount = section.blocks.reduce(
    (sum, block) =>
      sum +
      (block.kind === "dialogue"
        ? block.turns.length
        : block.kind === "concept"
          ? (ctx.concepts.find(
              (concept) => concept.conceptKey === block.conceptKey,
            )?.frozen?.entries.length ?? 1)
          : block.kind === "concept-recall" &&
              (block.semantic?.node?.kind === "rows" ||
                block.semantic?.node?.kind === "concept")
            ? block.semantic.node.rows.length
            : 1),
    0,
  );
  if (atomicCount <= 48) return;
  const runs: SectionPlan["blocks"][] = [];
  for (const block of section.blocks) {
    const last = runs.at(-1);
    if (last && last[0].semantic?.activity === block.semantic?.activity)
      last.push(block);
    else runs.push([block]);
  }
  if (runs.length < 2) return;
  const parts = runs.map((blocks, index): SectionPlan => ({
    ...section,
    id: index === 0 ? section.id : randomUUID(),
    sectionKey:
      index === 0
        ? section.sectionKey
        : `${section.sectionKey}.part-${index + 1}`,
    templateKey: "auto-lesson-part",
    blocks,
  }));
  for (const item of ctx.items.filter(
    (item) => item.sectionId === section.id,
  )) {
    const owner = parts.find((part) =>
      part.blocks.some(
        (block) => block.kind === "problem" && block.itemId === item.id,
      ),
    );
    if (!owner) throw new Error("Missing automatic item owner");
    item.sectionId = owner.id;
    item.orderIndex = owner.blocks
      .filter((block) => block.kind === "problem")
      .findIndex((block) => block.itemId === item.id);
  }
  for (const concept of ctx.concepts.filter(
    (concept) => concept.sectionKey === section.sectionKey,
  )) {
    // A newly created canonical concept is shared by its selected activity sections.
    // The database already supports unit-wide concepts (nullable section_id).
    concept.sectionKey = null;
    if (concept.frozen)
      concept.frozen.contentHash = conceptContentHash(concept);
  }
  ctx.sections.splice(ctx.sections.indexOf(section), 1, ...parts);
}
