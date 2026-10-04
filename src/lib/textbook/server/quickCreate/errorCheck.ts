import "server-only";
import { randomUUID } from "node:crypto";
import { TEXTBOOK_CORE_BANK } from "../../coreConceptBank";
import { invalid } from "../errors";
import {
  keyOf,
  type QuickCreateAssembly,
  type QuickCreateLesson,
} from "./context";

export function appendErrorCheck(
  ctx: QuickCreateAssembly,
  lesson: QuickCreateLesson,
): void {
  const { components } = ctx;
  const { unit, section } = lesson;
  if (components.errorCheck) {
    const checks = TEXTBOOK_CORE_BANK.ox.filter(
      (entry) => entry.section === keyOf(unit),
    );
    if (!checks.length)
      throw invalid(`${unit.section}: 준비된 오류 점검 문장이 없습니다.`);
    section.blocks.push(
      {
        blockId: randomUUID(),
        kind: "concept-recall",
        phase: "sentences",
        conceptKey: `concept-${unit.id}`,
        showRepetitionChecks: false,
        semantic: { activity: "errorCheck", title: "오류 점검" },
        markdown: checks
          .map(
            (entry, index) =>
              `${index + 1}. ${entry.statement}\n\n{{${entry.answer ? "옳음" : "틀림"}: ${entry.why}}}`,
          )
          .join("\n\n"),
      },
    );
  }
}
