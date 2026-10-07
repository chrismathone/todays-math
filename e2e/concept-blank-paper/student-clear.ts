import {
  conceptEntrySchema,
  type ConceptBlankSheet,
} from "../../src/contracts/conceptBlank.contract";
import { composeSheets } from "../../src/lib/concept-blank/compose";
import fixtures from "./student-clear-fixtures.json";

/** 최종 적용 은행에서 선택한 학년별 표본이다. 실제 학생 학습 효과는 별도 검증이 필요하다. */
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

/** 지도 배치만 검증하는 계약 상한 표본. 새 학습 문항으로 쓰지 않는다. */
export function studentClearMapSheets(): ConceptBlankSheet[] {
  const base = conceptEntrySchema.parse(fixtures.entries[3]);
  const prompt =
    "주어진 상황에서 계산할 식을 쓰고 그 식으로 확인할 수 있는 까닭을 설명하세요. "
      .repeat(8)
      .slice(0, 240);
  const answer =
    "계산한 결과와 처음 주어진 양이 같으므로 두 계산은 서로 맞는지 확인할 수 있다. "
      .repeat(8)
      .slice(0, 240);
  const entries = [
    base,
    {
      ...base,
      id: base.id + "-layout-stress",
      bQuestion: { ...base.bQuestion!, prompt, answer },
    },
    { ...base, id: base.id + "-second-map" },
  ];
  return composeSheets(
    {
      sections: [base.section],
      forms: [
        {
          form: "map",
          counts: { 하: 40, 중: 40, 상: 40 },
          extras: { 하: 0, 중: 0, 상: 0 },
        },
      ],
    },
    { concepts: entries, ox: [], apply: [], figures: [] },
  );
}
