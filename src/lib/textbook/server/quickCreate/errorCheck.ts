import "server-only";
import { randomUUID } from "node:crypto";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { invalid } from "../errors";
import {
  keyOf,
  text,
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
    const checks = CONCEPT_BLANK_BANK.ox.filter(
      (entry) => entry.section === keyOf(unit),
    );
    if (!checks.length)
      throw invalid(`${unit.section}: 준비된 오류 점검 문장이 없습니다.`);
    section.blocks.push(
      text("### 오류 점검 · 문장의 옳고 그름을 판단하고 이유를 설명하세요."),
      {
        blockId: randomUUID(),
        kind: "concept-recall",
        phase: "sentences",
        conceptKey: `concept-${unit.id}`,
        showRepetitionChecks: false,
        markdown: checks
          .slice(0, 3)
          .map(
            (entry, index) =>
              `${index + 1}. ${entry.statement}\n\n{{${entry.answer ? "옳음" : "틀림"}: ${entry.why}}}`,
          )
          .join("\n\n"),
      },
    );
  }
}
