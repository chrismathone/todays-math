import "server-only";
import type { TextbookSemantic } from "@/contracts/textbookSemantic.contract";
import { coreConceptsForSection } from "../../coreConceptBank";
import { referenceActivityBlocks } from "../quickCreateRecovery";
import { keyOf, type QuickCreateAssembly } from "./context";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { contentsEntries } from "./contents";

type References = Extract<
  NonNullable<TextbookSemantic["node"]>,
  { kind: "references" }
>["entries"];
/** References point to actual selected content. A standalone index has no invented page. */
export async function appendIndexes(ctx: QuickCreateAssembly): Promise<void> {
  const { components, sections, units, concepts, items, outline, addSection } =
    ctx;
  const originalUnit = ctx.unitKey;
  if (components.conceptIndex || components.typeIndex) {
    ctx.unitKey = "indexes";
    outline.push({
      unitKey: ctx.unitKey,
      title: "찾아보기",
      sourceUnitIds: [],
      prerequisites: [],
      goals: [],
      conceptLectureRefs: [],
    });
  }
  if (components.conceptIndex) {
    const entries: References = units.flatMap((unit) => {
      const concept = concepts.find((entry) => entry.unitId === unit.id);
      const owner =
        concept &&
        sections.find(
          (entry) =>
            entry.sectionKey === concept.sectionKey ||
            entry.blocks.some(
              (block) =>
                (block.kind === "concept" || block.kind === "concept-recall") &&
                block.conceptKey === concept.conceptKey,
            ),
        );
      return coreConceptsForSection(keyOf(unit)).map((entry) => ({
        key: entry.id,
        label: `${entry.term} · ${unit.section}`,
        ...(owner
          ? { targetUnitKey: owner.unitKey, targetSectionKey: owner.sectionKey }
          : { pageLabel: "—" }),
      }));
    });
    addSection(
      "개념 색인",
      "auto-concept-index",
      referenceActivityBlocks("conceptIndex", entries),
    );
  }
  if (components.typeIndex) {
    const entries: References = [];
    const seen = new Set<string>();
    for (const item of items) {
      const unit = units.find((entry) => entry.id === item.snapshot.unitId)!;
      const key = `${unit.id}:${item.snapshot.problemType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        key: `type-${entries.length}`,
        label: `${unit.section} · ${item.snapshot.problemType}`,
        targetItemId: item.id,
      });
    }
    if (!entries.length)
      for (const unit of units) {
        const types = await ctx.tx.query<{ problemType: string }>(
          `SELECT DISTINCT "problem_type"::text AS "problemType" FROM "problem" WHERE "unit_id"=$1::uuid AND "review_status"::text='approved' AND "direct_use_allowed"=true AND "pool"::text=$2::text AND "answer" <> $3::text ORDER BY "problemType"`,
          [unit.id, DEFAULT_PROBLEM_POOL, MISSING_ANSWER],
        );
        for (const type of types)
          entries.push({
            key: `type-${entries.length}`,
            label: `${unit.section} · ${type.problemType}`,
            pageLabel: "—",
          });
      }
    if (!entries.length)
      entries.push({
        key: "type-unavailable",
        label: "선택한 범위에 검증된 유형 정보가 없습니다.",
        pageLabel: "—",
      });
    addSection(
      "유형 색인",
      "auto-type-index",
      referenceActivityBlocks("typeIndex", entries),
    );
  }
  if (components.tableOfContents) {
    // Include the independently selected index sections after they exist.
    const entries: References = contentsEntries(sections);
    if (!entries.length)
      entries.push(
        ...units.map((unit) => ({
          key: `toc-${unit.id}`,
          label: unit.section,
          pageLabel: "—",
        })),
      );
    ctx.unitKey = "front-matter";
    const toc = addSection(
      "목차",
      "auto-table-of-contents",
      referenceActivityBlocks("tableOfContents", entries),
    );
    sections.splice(sections.indexOf(toc), 1);
    sections.unshift(toc);
  }
  ctx.unitKey = originalUnit;
}
