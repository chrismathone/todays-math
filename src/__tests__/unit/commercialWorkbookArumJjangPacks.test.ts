// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import calculus from "../../../data/commercial-workbooks/arum-jjang-hard-calculus1-2026-v1.json";
import calculusCoverage from "../../../data/commercial-workbooks/arum-jjang-hard-calculus1-2026-v1.coverage.json";
import probability from "../../../data/commercial-workbooks/arum-jjang-hard-probability-statistics-2026-v1.json";
import probabilityCoverage from "../../../data/commercial-workbooks/arum-jjang-hard-probability-statistics-2026-v1.coverage.json";

// Printed answer-box headings and complete number runs, separately inventoried from the rendered PDF.
const calculusGroups = [
  ["009~010", 1, 3], ["010~016", 4, 16], ["017", 17, 18],
  ["019~020", 1, 4], ["021~028", 5, 19], ["028~029", 20, 22],
  ["031", 1, 3], ["032~041", 4, 24], ["042~043", 25, 28],
  ["045~047", 1, 5], ["047~053", 6, 17], ["053~055", 18, 22],
  ["057~058", 1, 4], ["058~069", 5, 27], ["070~071", 28, 31],
  ["073", 1, 2], ["074~080", 3, 15], ["080~081", 16, 18],
  ["083", 1, 2], ["084~090", 3, 18], ["091", 19, 20],
  ["093~094", 1, 3], ["094~107", 4, 29], ["107~108", 30, 31],
  ["111", 1, 2], ["111~117", 3, 15], ["118", 16, 17],
] as const;
const probabilityGroups = [
  ["009", 1, 3], ["010~013", 4, 10], ["013", 11, 11],
  ["015", 1, 2], ["016~022", 3, 16], ["023", 17, 18],
  ["025", 1, 2], ["025~030", 3, 14], ["030~031", 15, 17],
  ["033", 1, 2], ["034~039", 3, 14], ["040~041", 15, 17],
  ["043~044", 1, 5], ["044~053", 6, 24], ["054~057", 25, 32],
  ["059", 1, 3], ["060~064", 4, 14], ["064~065", 15, 17],
  ["067", 1, 2], ["067~074", 3, 19], ["075", 20, 21],
  ["077", 1, 2], ["077~080", 3, 11], ["081", 12, 13],
  ["083", 1, 4], ["084~091", 5, 20], ["092~093", 21, 24],
  ["095", 1, 3], ["096~100", 4, 12], ["100~101", 13, 15],
  ["103", 1, 2], ["104~108", 3, 11], ["108~109", 12, 13],
] as const;
const books = [
  { pack: calculus, coverage: calculusCoverage, groups: calculusGroups, total: 207, choice: 125, numeric: 81,
    chapters: [18, 22, 28, 22, 31, 18, 20, 31, 17], sourcePages: [1, 1, 5, 6, 7, 12, 13, 14, 19, 21, 22, 27, 30, 30, 45, 48, 48, 52, 53, 54, 58, 59, 60, 66, 67, 67, 74],
    sha: "58a0b3c7cb6e5ca1af00280c2f19175d2c3ec1ce9bcf6504f55cd727ecd57798" },
  { pack: probability, coverage: probabilityCoverage, groups: probabilityGroups, total: 198, choice: 119, numeric: 79,
    chapters: [11, 18, 17, 17, 32, 17, 21, 13, 24, 15, 13], sourcePages: [1, 1, 3, 3, 3, 8, 9, 9, 12, 13, 13, 17, 18, 18, 23, 25, 26, 28, 29, 29, 35, 36, 36, 38, 39, 39, 43, 45, 45, 48, 49, 49, 50],
    sha: "509cd4dbc95d64b33a65b12cac1b4a9ddaa69d1215cf48f9c71ccd63c7d74261" },
];

for (const { pack, coverage, groups, total, choice, numeric, chapters, sourcePages, sha } of books) {
  describe(pack.id, () => {
    const parsed = workbookCreateEditionSchema.parse({ requestId: `review-${pack.id}`, metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
    it("strictly parses and roundtrips the exact TSV", () => {
      expect(Object.keys(pack).sort()).toEqual(["coverage", "exercises", "id", "label", "metadata", "provenance"]);
      const tsv = readFileSync(new URL(`../../../data/commercial-workbooks/${pack.id}.tsv`, import.meta.url), "utf8");
      expect(parseWorkbookImport(tsv)).toEqual({ exercises: parsed.exercises, issues: [] });
      expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
      expect(parsed.exercises).toHaveLength(total);
    });
    it("includes every independently inventoried address and source-page binding", () => {
      expect(coverage.pageGroups.map(g => [g.page, g.firstNumber, g.lastNumber])).toEqual(groups);
      expect(coverage.pageGroups.map(g => g.sourcePage)).toEqual(sourcePages);
      expect(parsed.exercises.map(row => [row.address.page, row.address.number, row.key?.sourcePage])).toEqual(groups.flatMap(([page, first, last], index) => Array.from({ length: last - first + 1 }, (_, i) => [page, String(first + i).padStart(2, "0"), sourcePages[index]])));
      expect(parsed.exercises.every(row => row.address.volume === "본문" && row.address.subpart === "")).toBe(true);
      expect(Object.values(coverage.counts.byChapter)).toEqual(chapters);
      expect(coverage.counts).toMatchObject({ exercises: total, reviewedKeys: total, nullKeys: 0, unreviewedKeys: 0, omittedInScopeAddresses: 0, choiceKeys: choice, numericKeys: numeric });
      expect(coverage.nullKeyLedger).toEqual([]);
    });
    it("checks book-level numeric and choice domains and honest edition provenance", () => {
      expect(parsed.exercises.filter(row => /^[①②③④⑤]$/.test(row.key!.answerText))).toHaveLength(choice);
      expect(parsed.exercises.filter(row => /^-?[0-9]+$/.test(row.key!.answerText))).toHaveLength(numeric);
      expect(parsed.exercises.every(row => row.key?.status === "reviewed" && /^(?:[①②③④⑤ㄴ]|-?[0-9]+)$/.test(row.key.answerText))).toBe(true);
      expect(coverage.source.sha256).toBe(sha);
      expect(parsed.provenance.description).toContain(sha);
      expect(parsed.provenance.reference).toContain(coverage.source.pdfUrl);
      expect(coverage.source.editionEvidence).toMatchObject({ marketYear: 2026, publicationYear: null, isbn: null, impression: null });
      expect(parsed.metadata.edition).toContain("미확인");
      expect(parsed.metadata).not.toHaveProperty("isbn");
      expect(coverage.source.reviewedAnswerBoxes).toHaveLength(groups.length);
      expect(coverage.grading).toBe("manual-reference-only");
    });
  });
}

it("locks independently read numeric/choice sequences from every chapter's final table", () => {
  const expected = [
    [calculus, ["4 ①", "① ③ ⑤", "② 15 ③ 26", "① 5 15 ② 98", "512 ③ 90 85", "④ ④ ④", "④ ②", "② 23", "③ ③"]],
    [probability, ["321", "42 126", "② 63 68", "55 ⑤ 624", "③ 617 ③ 14 ④ ② ③ ③", "⑤ 46 ⑤", "② ②", "② ③", "① ① ③ ⑤", "③ ⑤ ③", "④ ③"]],
  ] as const;
  for (const [pack, sequences] of expected) {
    sequences.forEach((sequence, i) => expect(pack.exercises.filter(row => row.address.section.startsWith(`유형 ${String(i + 1).padStart(2, "0")} `) && row.address.section.endsWith("예상문제 도전하기")).map(row => row.key.answerText)).toEqual(sequence.split(" ")));
  }
  expect(calculus.exercises.find(row => row.address.page === "045~047" && row.address.number === "02")?.key.answerText).toBe("-6");
  expect(calculus.exercises.find(row => row.address.page === "045~047" && row.address.number === "01")?.key.answerText).toBe("ㄴ");
});
