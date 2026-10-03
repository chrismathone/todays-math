import "server-only";
import type { z } from "zod";
import type {
  textbookConceptTargetQuerySchema,
  TextbookConceptTargetCatalog,
} from "@/contracts/textbookConceptCatalog.contract";
import {
  definitionCards,
  definitionUnits,
  gradeLabel,
} from "@/lib/math-explorers/definition-cards";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { curriculumGraph } from "@/lib/math-prerequisite/graph";

/** Preserve each source's namespace and ID. Reading never creates a link or a learning event. */
export function listConceptTargetCatalog(
  query: z.infer<typeof textbookConceptTargetQuerySchema>,
): TextbookConceptTargetCatalog {
  const entries: TextbookConceptTargetCatalog["entries"] = [
    ...definitionCards.map((card) => {
      const unit = definitionUnits.find((row) => row.id === card.unit);
      return {
        target: { namespace: "explorer-card" as const, cardId: card.id },
        title: card.name,
        context: unit ? `${gradeLabel(unit.grade)} · ${unit.title}` : card.unit,
        description: card.definition,
      };
    }),
    ...COURSE_SECTIONS.map((section) => ({
      target: {
        namespace: "course-section" as const,
        courseSectionId: section.id,
      },
      title: section.title,
      context: `초${section.grade} · ${section.semester}학기 · ${section.chapterTitle}`,
      description: `${section.unit.chapter} · ${section.unit.section}`,
    })),
    ...curriculumGraph().units.map((unit) => ({
      target: { namespace: "graph-unit" as const, graphUnitId: unit.id },
      title: unit.title,
      context: `${unit.gradeBand} · ${unit.course} · ${unit.domain}`,
      description: unit.topics.join("; "),
    })),
  ];
  const search = (query.q ?? "").trim().toLocaleLowerCase("ko-KR");
  const matching = entries.filter(
    (entry) =>
      (!query.namespace || entry.target.namespace === query.namespace) &&
      (!search ||
        `${Object.values(entry.target).join(" ")} ${entry.title} ${entry.context} ${entry.description}`
          .toLocaleLowerCase("ko-KR")
          .includes(search)),
  );
  const offset = Number(query.cursor ?? 0),
    limit = Number(query.limit ?? 50);
  return {
    entries: matching.slice(offset, offset + limit),
    nextCursor:
      offset + limit < matching.length ? String(offset + limit) : null,
  };
}
