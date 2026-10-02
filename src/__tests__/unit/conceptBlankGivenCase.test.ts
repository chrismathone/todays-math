/**
 * 사례 문항 표지(`givenCase`) — 전수 검토 2026-10-02 합의 안건 11(26 §10).
 * 굵은 답이 용어에 주어진 값으로 정해지는 카드는 A(완전 백지) 채점표에 싣지 않는다 — A 는 소단원 이름만 보여 주므로
 * 학생이 그 수를 떠올릴 수도, 교사가 줄과 맞춰 볼 수도 없다. B · C · D 는 그대로 싣는다.
 */
import { describe, expect, it } from "vitest";
import {
  conceptBlankBankSchema,
  type ConceptBlankBank,
  type LevelCounts,
} from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import {
  CASE,
  markGivenCases,
  plusSection,
} from "@/lib/concept-blank/bank/plus";
import {
  composeSheets,
  stockCounts,
  stockTable,
} from "@/lib/concept-blank/compose";

const r = String.raw;
const SECTION = "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기";
const ALL: LevelCounts = { 하: 40, 중: 40, 상: 40 };
const NONE: LevelCounts = { 하: 0, 중: 0, 상: 0 };

const bank: ConceptBlankBank = plusSection(SECTION, "t-2-4-3", {
  concepts: [
    [
      "하",
      "소수를 곱한 곱의 크기",
      "성질",
      "$1$보다 작은 소수를 곱하면 곱은 처음 수보다 {작아진다}.",
    ],
    [
      "하",
      r`$4\,\mathrm{m}$의 $0.3$배 구하기`,
      "방법",
      r`$4\,\mathrm{m}$의 $0.3$배는 {$1.2\,\mathrm{m}$}이다.`,
      CASE,
    ],
    [
      "중",
      r`$6$의 $0.5$배와 나눗셈`,
      "방법",
      r`$6$의 $0.5$배는 $6$을 {$2$로 나눈} 값과 같다.`,
      [r`$8$의 $0.5$배는?`, "$4$"],
      CASE,
    ],
    [
      "중",
      "곱의 소수점 자리",
      "성질",
      "자연수에 소수 한 자리 수를 곱하면 곱은 {소수 한 자리 수}가 된다.",
      [r`$7\times0.3$의 값은?`, "$2.1$"],
    ],
  ],
});

describe("concept blank given-case cards", () => {
  it("reads the mark at the end of a plus row, with or without an example", () => {
    expect(conceptBlankBankSchema.safeParse(bank).success).toBe(true);
    expect(bank.concepts.map((c) => c.givenCase ?? false)).toEqual([
      false,
      true,
      true,
      false,
    ]);
    // 표지가 예 자리를 먹지 않는다
    expect(bank.concepts[1]!.example).toBeUndefined();
    expect(bank.concepts[2]!.example).toEqual({
      prompt: r`$8$의 $0.5$배는?`,
      answer: "$4$",
    });
  });

  it("marks cases in a base bank by id and refuses an unknown id", () => {
    const base: ConceptBlankBank = plusSection(SECTION, "t-2-4-3", {
      concepts: [["하", "몫 찾기", "방법", "곱셈식에서 {몫}을 찾는다."]],
    });
    markGivenCases(base, ["t-2-4-3-xc1"]);
    expect(base.concepts[0]!.givenCase).toBe(true);
    expect(() => markGivenCases(base, ["t-2-4-3-xc9"])).toThrow(/없는 개념/);
  });

  it("keeps case cards off the blank-recall key, and on every other form", () => {
    const sheets = composeSheets(
      {
        sections: [SECTION],
        forms: [
          { form: "recall", counts: ALL, extras: NONE },
          { form: "term", counts: ALL, extras: NONE },
          { form: "cloze", counts: ALL, extras: NONE },
          { form: "map", counts: ALL, extras: NONE },
        ],
      },
      bank,
    );
    const ids = (form: string) => {
      const sheet = sheets.find((s) => s.form === form)!;
      if (sheet.form === "recall") return sheet.key.map((c) => c.id);
      if (sheet.form === "term") return sheet.terms.map((c) => c.id);
      if (sheet.form === "cloze") return sheet.sentences.map((c) => c.id);
      if (sheet.form === "map")
        return sheet.maps.flatMap((m) => m.nodes.map((c) => c.id));
      return [];
    };
    expect(ids("recall")).toEqual(["t-2-4-3-xc1", "t-2-4-3-xc4"]);
    for (const form of ["term", "cloze", "map"])
      expect(ids(form), form).toHaveLength(4);
  });

  it("counts the recallable stock apart, so the screen caps A by it", () => {
    const counts = stockCounts(SECTION, bank);
    expect(counts.concepts).toEqual({ 하: 2, 중: 2, 상: 0 });
    expect(counts.recall).toEqual({ 하: 1, 중: 1, 상: 0 });
    expect(stockTable(bank).get(SECTION)).toEqual(counts);
  });

  it("gives the real bank a recall stock no larger than its concept stock", () => {
    for (const [, row] of stockTable(CONCEPT_BLANK_BANK))
      for (const level of ["하", "중", "상"] as const)
        expect(row.recall[level]).toBeLessThanOrEqual(row.concepts[level]);
  });
});
