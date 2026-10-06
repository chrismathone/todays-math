import {
  conceptEntrySchema,
  type ConceptBlankSheet,
} from "../../src/contracts/conceptBlank.contract";
import { composeSheets } from "../../src/lib/concept-blank/compose";
import fixtures from "./student-clear-fixtures.json";

/** 학년별 구조 표본이다. 운영 은행의 전수 교정 완료를 뜻하지 않는다. */
export function studentClearFixtureSheets(): ConceptBlankSheet[] {
  const entries = fixtures.entries.map((entry) =>
    conceptEntrySchema.parse(entry),
  );
  return entries.flatMap((entry) =>
    composeSheets(
      {
        sections: [entry.section],
        forms: ["term", "cloze"].map((form) => ({
          form: form as "term" | "cloze",
          counts: { 하: 40, 중: 40, 상: 40 },
          extras: { 하: 0, 중: 0, 상: 0 },
        })),
        date: "2026-10-06",
      },
      { concepts: [entry], ox: [], apply: [], figures: [] },
    ),
  );
}
