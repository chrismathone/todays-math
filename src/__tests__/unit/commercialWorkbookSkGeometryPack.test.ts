// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport, workbookAddressKey } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/sk-suryeok-geometry-public-v1.json";
import coverage from "../../../data/commercial-workbooks/sk-suryeok-geometry-public-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({ requestId: "sk-geometry-reviewed-20261024", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
const tsv = readFileSync(fileURLToPath(new URL("../../../data/commercial-workbooks/sk-suryeok-geometry-public-v1.tsv", import.meta.url)), "utf8");
// Independently read printed headings and number runs; no inferred individual page positions.
const groups = [
  ["10~31", 1, 68, 8], ["32~33", 1, 12, 18], ["34~45", 69, 100, 20], ["46~47", 1, 12, 28],
  ["52~63", 1, 35, 30], ["64~65", 1, 12, 33], ["66~71", 36, 54, 34], ["72~73", 1, 12, 36],
  ["74~79", 55, 75, 38], ["80~81", 1, 12, 40], ["82~89", 76, 99, 42], ["90~91", 1, 12, 46],
  ["96~103", 1, 22, 48], ["104~105", 1, 12, 49], ["106~113", 23, 51, 51], ["114~115", 1, 12, 53],
  ["116~125", 52, 99, 55], ["126~127", 1, 12, 61],
] as const;
const at = (page: string, number: number) => parsed.exercises.find(row => row.address.page === page && row.address.number === String(number).padStart(2, "0"))!;

describe("Sookyung Suryeok Geometry public PDF complete answer scope", () => {
  it("uses the strict edition contract and exact TSV roundtrip", () => {
    expect(pack.id).toBe("sk-suryeok-geometry-public-v1");
    expect(Object.keys(pack).sort()).toEqual(["coverage", "exercises", "id", "label", "metadata", "provenance"]);
    expect(parseWorkbookImport(tsv)).toEqual({ exercises: parsed.exercises, issues: [] });
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(406);
    expect(new Set(parsed.exercises.map(row => workbookAddressKey(row.address))).size).toBe(406);
  });
  it("covers every independently inventoried printed address, including three-digit number 100", () => {
    expect(coverage.pageGroups.map(g => [g.page, g.firstNumber, g.lastNumber, g.addressHeaderSourcePage])).toEqual(groups);
    expect(parsed.exercises.map(row => [row.address.page, row.address.number])).toEqual(groups.flatMap(([page, first, last]) => Array.from({ length: last - first + 1 }, (_, i) => [page, String(first + i).padStart(2, "0")])));
    expect(parsed.exercises.every(row => row.address.volume === "문제편" && row.address.subpart === "")).toBe(true);
    expect(at("34~45", 100).key?.answerText).toBe("1) -1; 2) tan θ; 3) 접선");
    expect(at("82~89", 76).address.section).toBe("Ⅱ-4 직선의 방정식과 원의 방정식");
  });
  it("leaves every diagram-dependent main answer null with exactly one exclusion", () => {
    const missing = [["10~31", "01"], ["10~31", "05"], ["10~31", "09"], ["52~63", "02"], ["52~63", "11"], ["52~63", "15"], ["52~63", "20"], ["52~63", "21"], ["74~79", "67"], ["116~125", "53"]];
    expect(coverage.nullKeyLedger.map(row => [row.address.page, row.address.number])).toEqual(missing);
    expect(parsed.exercises.filter(row => !row.key).map(row => row.address)).toEqual(coverage.nullKeyLedger.map(row => row.address));
    expect(coverage.nullKeyLedger.every(row => row.registered && row.reason === "diagram" && row.key === null && row.note.length > 20)).toBe(true);
    expect(coverage.counts).toMatchObject({ exercises: 406, reviewedKeys: 396, nullKeys: 10, unreviewedKeys: 0, omittedInScopeAddresses: 0 });
  });
  it("preserves numeric, radical, unit, vector and split-page references read from all six pages", () => {
    const fixtures = [
      ["10~31", 12, "25/4"], ["10~31", 13, "94/5"], ["10~31", 34, "2sqrt(2)"],
      ["32~33", 3, "4 m"], ["10~31", 56, "1) y=±(2/3)x; 2) y=±(3/2)x; 3) y=±x; 4) y=±(2sqrt(3)/3)x"],
      ["34~45", 90, "1) y=-x-1, y=(1/2)x+2; 2) y=-sqrt(2)x-sqrt(2), y=sqrt(2)x+sqrt(2); 3) y=-2x-2, y=x+4"],
      ["52~63", 22, "1) 8vec(a)-13vec(b); 2) vec(a)+2vec(b); 3) -vec(a)+vec(c)"],
      ["72~73", 5, "vec(OC)=(3vec(OB)+2vec(OA))/5"], ["80~81", 12, "sqrt(6)/2"],
      ["82~89", 88, "1) 11sqrt(5)/25; 2) sqrt(2)/2; 3) sqrt(10)/10"],
      ["96~103", 1, "1) ○; 2) ×; 3) ○; 4) ○; 5) ×; 6) ○"],
      ["106~113", 25, "1) 2sqrt(2); 2) 2sqrt(61)/5"], ["106~113", 49, "24sqrt(3)π"],
      ["106~113", 50, "10 cm"], ["116~125", 71, "1) sqrt(2); 2) sqrt(5)/3; 3) 2"],
      ["126~127", 3, "-1/4"], ["126~127", 8, "96π"],
    ] as const;
    for (const [page, number, answer] of fixtures) expect(at(page, number).key?.answerText).toBe(answer);
    expect(at("34~45", 90).key?.sourcePage).toBe(3); // Starts on PDF 3, continues on PDF 4.
    expect(at("116~125", 79).key?.answerText).toContain("3) ((x₁+x₂+x₃)/2, (y₁+y₂+y₃)/2, (z₁+z₂+z₃)/2)"); // Printed anomaly, not silently corrected.
    for (const row of parsed.exercises) if (row.key) {
      expect(row.key.status).toBe("reviewed");
      expect(row.key.answerText).not.toMatch(/[\u0000-\u001F\uFFFD]|해설 참조|빠\/|\[Ⅰ/);
    }
  });
  it("checks whole-book choice sequences independently and retains source page counts", () => {
    const choices = [
      ["32~33", "②|13|4 m|①|④|x²/9+y²/8=1|6|(x-1)²/25+(y+1)²/16=1|②|k<1|20sqrt(5)|12"],
      ["46~47", "⑤|②|③|③|-sqrt(3)≤k≤sqrt(3)|④|④|③|⑤|③|2sqrt(7)|sqrt(5)/5"],
      ["90~91", "②|①|③|④|③|⑤|④|3|③|④|③|②"],
      ["126~127", "①|③|-1/4|2sqrt(10)|2|6|96|96π|②|8|④|③"],
    ];
    for (const [page, values] of choices) expect(Array.from({ length: 12 }, (_, i) => at(page, i + 1).key?.answerText)).toEqual(values.split("|"));
    const byPage: Record<string, number> = {};
    for (const row of parsed.exercises) if (row.key) byPage[String(row.key.sourcePage)] = (byPage[String(row.key.sourcePage)] ?? 0) + 1;
    expect(byPage).toEqual({ "2": 41, "3": 58, "4": 73, "5": 78, "6": 91, "7": 55 });
    expect(byPage).toEqual(coverage.counts.byReviewedKeySourcePage);
  });
  it("pins official provenance without deriving an edition from a filename", () => {
    expect(parsed.metadata).toEqual({ title: "수력충전 기하", publisher: "수경출판사", grade: "고등", edition: "공식 공개 PDF 보관본 · 발행연도·교육과정·쇄·ISBN 미확인" });
    expect(coverage.source).toMatchObject({ pageCount: 64, byteCount: 11413112, sha256: "33c22526f99668787c45721c4eb4a8f1563778e118f77105a9ee6d077bf7dd56", sourceRelativePath: "secondary/files/sk_pdf2.pdf" });
    expect(parsed.provenance.reference).toContain(coverage.source.pdfUrl);
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
    expect(coverage.source.reviewedImages.map(image => image.sourcePage)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(coverage.scope).toMatchObject({ wholeBook: true, addressCoverage: "full", answerCoverage: "partial" });
    expect(coverage.grading).toBe("manual-reference-only");
  });
});
