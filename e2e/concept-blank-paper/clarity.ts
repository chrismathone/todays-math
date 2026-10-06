import type { ConceptBlankSheet } from "../../src/contracts/conceptBlank.contract";
import { BANK_PARTS } from "../../src/lib/concept-blank/bank";
import { composeSheets } from "../../src/lib/concept-blank/compose";
import remediation from "../../docs/planning/tracks/reports/concept-cloze-fix-all-20261006/applied-changes.json";
import type { RealGrade } from "./grades";

/** Every changed concept, both base and plus, through the production C renderer.
 * One section per selection avoids the grade-wide count cap excluding entries.
 */
export function claritySheets(grade: RealGrade): ConceptBlankSheet[] {
  const ids = new Set(
    remediation.changes.map((change: { id: string }) => change.id),
  );
  const concepts = [
    ...BANK_PARTS[grade]!.concepts,
    ...BANK_PARTS[`${grade}plus`]!.concepts,
  ].filter((concept) => ids.has(concept.id));
  const bank = { concepts, ox: [], apply: [], figures: [] };
  return [...new Set(concepts.map((c) => c.section))].flatMap((section) =>
    composeSheets(
      {
        sections: [section],
        forms: [
          {
            form: "cloze",
            counts: { 하: 40, 중: 40, 상: 40 },
            extras: { 하: 0, 중: 0, 상: 0 },
          },
        ],
        date: "2026-10-06",
      },
      bank,
    ),
  );
}
