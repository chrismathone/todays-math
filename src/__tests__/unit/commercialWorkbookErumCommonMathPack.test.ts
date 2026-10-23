// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/erum-summa-common-math1-4ed2print-v1.json";
import coverage from "../../../data/commercial-workbooks/erum-summa-common-math1-4ed2print-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({ requestId: "erum-common-math-reviewed-20261024", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
// Independently inventoried final printed number for each of the 30 numbered concepts.
const conceptCounts = [4, 5, 4, 5, 5, 3, 3, 4, 5, 4, 4, 4, 5, 3, 5, 3, 4, 5, 4, 4, 5, 5, 4, 5, 5, 4, 4, 4, 4, 4];
const guidedCounts = [4, 12, 8, 10, 14, 2, 14, 6, 12, 4, 4, 12, 6, 2, 6, 10, 14, 10, 12, 6, 24, 24, 12, 14, 4, 10, 6, 12, 10, 13];
const conceptPages = ["021, 029, 040", "055, 065", "081, 087", "107, 116, 126", "138, 146, 157, 163", "177, 185", "203, 217", "234, 245", "264", "289, 308", "331", "348, 353", "368, 376", "400, 415"];
const guidedPages = ["022, 030, 041", "056, 066", "082, 088", "108, 117, 127", "139, 147, 158, 164", "178, 186", "204, 218", "235, 246", "265", "290, 309", "332", "349, 354", "369, 377", "401, 416"];
const exercisePages = [["045", "048"], ["073", "076"], ["095", "098"], ["129", "132"], ["165", "168"], ["191", "194"], ["223", "226"], ["249", "252"], ["277", "280"], ["315", "318"], ["339", "342"], ["359", "362"], ["383", "386"], ["423", "426"]];
const at = (family: string, number: string, page?: string) => parsed.exercises.find(row => row.address.section.startsWith(family) && row.address.number === number && (!page || row.address.page === page))!;

describe("Summa common math 1 fourth edition second printing complete official answer scope", () => {
  it("strictly parses and exactly roundtrips every TSV row", () => {
    expect(Object.keys(pack).sort()).toEqual(["coverage", "exercises", "id", "label", "metadata", "provenance"]);
    const tsv = readFileSync(new URL("../../../data/commercial-workbooks/erum-summa-common-math1-4ed2print-v1.tsv", import.meta.url), "utf8");
    expect(parseWorkbookImport(tsv)).toEqual({ exercises: parsed.exercises, issues: [] });
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(774);
  });
  it("covers every independently inventoried concept, guided, and chapter exercise address", () => {
    for (const [kind, counts] of [["개념 TEST", conceptCounts], ["유제", guidedCounts]] as const) {
      expect(parsed.exercises.filter(row => row.address.section.startsWith(kind)).map(row => row.address.number)).toEqual(counts.flatMap((count, i) => Array.from({ length: count }, (_, n) => `${String(i + 1).padStart(2, "0")}-${n + 1}`)));
    }
    expect(coverage.pageGroups.filter(g => g.section.startsWith("개념 TEST")).map(g => g.page)).toEqual(conceptPages);
    expect(coverage.pageGroups.filter(g => g.section.startsWith("유제")).map(g => g.page)).toEqual(guidedPages);
    expect(parsed.exercises.filter(row => row.address.section.startsWith("연습문제")).map(row => [row.address.page, row.address.number])).toEqual(exercisePages.flatMap(([a, b]) => Array.from({ length: 25 }, (_, n) => [n < 15 ? a : b, String(n + 1).padStart(2, "0")])));
    expect(coverage.counts).toMatchObject({ exercises: 774, reviewedKeys: 769, nullKeys: 5, unreviewedKeys: 0, omittedInScopeAddresses: 0, byFamily: { "개념 TEST": 127, "유제": 297, "연습문제": 350 } });
  });
  it("keeps every long-solution exclusion as a registered null address", () => {
    const missing = [["유제", "21-2", "265"], ["유제", "25-2", "349, 354"], ["유제", "27-5", "369, 377"], ["유제", "27-6", "369, 377"], ["연습문제", "02", "277"]];
    for (const [family, number, page] of missing) expect(at(family, number, page).key).toBeNull();
    expect(parsed.exercises.filter(row => !row.key).map(row => row.address)).toEqual(coverage.nullKeyLedger.map(row => row.address));
    expect(coverage.nullKeyLedger.every(row => row.registered && row.key === null && row.reason === "long-solution" && row.note.length > 20)).toBe(true);
  });
  it("preserves manually checked complex fractions, matrices, signs and source-page bindings", () => {
    const fixtures = [
      ["개념 TEST", "12-2", "⑴ x=(1±sqrt(21))/2; ⑵ x=(-1±sqrt(13))/6; ⑶ x=(1±sqrt(3)i)/2; ⑷ x=3±sqrt(2)i", 3],
      ["개념 TEST", "29-1", "A=[[1,0],[0,1]]", 4],
      ["개념 TEST", "29-3", "X=[[8,8],[8,8]], Y=[[-6,-2],[2,6]]", 4],
      ["유제", "04-4", "44/3", 5],
      ["유제", "17-7", "x=1/2 또는 x=2 또는 x=(-1±sqrt(15)i)/4", 6],
      ["유제", "26-10", "erfath", 7],
      ["유제", "29-2", "A=[[1,1],[3,3]], B=[[1,3],[1,3]]", 7],
      ["유제", "30-1", "-4", 7],
      ["유제", "30-5", "[[1,-18],[-7,-14]]", 7],
    ] as const;
    for (const [family, number, answer, sourcePage] of fixtures) expect(at(family, number).key).toEqual({ answerText: answer, status: "reviewed", sourcePage });
    expect(at("연습문제", "16", "048").key?.answerText).toBe("-25/3");
    expect(at("연습문제", "14", "165").key?.answerText).toBe("x=(1±sqrt(5))/2");
    expect(at("연습문제", "17", "426").key?.answerText).toBe("[[1,5],[-2,0]]");
    expect(at("연습문제", "22", "426").key?.answerText).toBe("[[-4,4],[4,-20]]");
  });
  it("checks whole-book source-page and choice counts plus all chapter final answers", () => {
    const lastAnswers = ["④", "91", "44", "②", "6", "⑤", "ㄱ, ㄴ, ㄷ", "③", "200g 이상 400g 이하", "k>4", "②", "144", "510", "①"];
    exercisePages.forEach(([, page], i) => expect(at("연습문제", "25", page).key?.answerText).toBe(lastAnswers[i]));
    expect(parsed.exercises.filter(row => row.key && /^[①②③④⑤]$/.test(row.key.answerText))).toHaveLength(103);
    const byPage: Record<string, number> = {};
    for (const row of parsed.exercises) if (row.key) {
      byPage[row.key.sourcePage!] = (byPage[row.key.sourcePage!] ?? 0) + 1;
      expect(row.key.status).toBe("reviewed");
      expect(row.key.answerText).not.toMatch(/[\u0000-\u001F\uFFFD§¶Ä]|풀이 참조/);
    }
    expect(byPage).toEqual({ 2: 42, 3: 37, 4: 48, 5: 95, 6: 102, 7: 96, 8: 100, 9: 124, 10: 125 });
    expect(byPage).toEqual(coverage.counts.byReviewedKeySourcePage);
  });
  it("retains official provenance and confirmed printing without guessing year or ISBN", () => {
    expect(coverage.source).toMatchObject({ sourceRelativePath: "secondary/files/erum_pdf1.pdf", pageCount: 168, byteCount: 12009800, sha256: "4d2d31e7522c4d9c982068a377c5b66a80670f40c8f06db798e2baeca1120c23" });
    expect(parsed.metadata.edition).toContain("4판 2쇄");
    expect(parsed.metadata.curriculum).toBe("2022 개정");
    expect(parsed.metadata).not.toHaveProperty("isbn");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
    expect(parsed.provenance.reference).toContain(coverage.source.pdfUrl);
    expect(coverage.source.reviewedAnswerBoxes).toHaveLength(61);
    expect(coverage.scope.addressHeaderPdfPagesVisuallyReviewed).toHaveLength(28);
    expect(coverage.grading).toBe("manual-reference-only");
  });
});
