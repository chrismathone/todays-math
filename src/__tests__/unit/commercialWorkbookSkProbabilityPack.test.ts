// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/sk-suryeok-probability-statistics-public-v1.json";
import coverage from "../../../data/commercial-workbooks/sk-suryeok-probability-statistics-public-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({ requestId: "sk-probability-reviewed-20261024", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
// Independent printed headings and numbered runs, including all three chapter summaries.
const groups = [["10~21", 1, 29, 2], ["22~31", 30, 53, 8], ["32~33", 1, 13, 12], ["38~52", 1, 57, 14], ["53~63", 58, 90, 21], ["64~65", 1, 12, 25], ["70~79", 1, 30, 27], ["80~92", 31, 60, 31], ["93~101", 61, 84, 36], ["102~103", 1, 12, 39]] as const;
const at = (page: string, number: number) => parsed.exercises.find(row => row.address.page === page && row.address.number === String(number).padStart(2, "0"))!;

describe("Sookyung probability complete official answer scope", () => {
  it("uses the strict edition contract and exact TSV roundtrip", () => {
    expect(Object.keys(pack).sort()).toEqual(["coverage", "exercises", "id", "label", "metadata", "provenance"]);
    const tsv = readFileSync(new URL("../../../data/commercial-workbooks/sk-suryeok-probability-statistics-public-v1.tsv", import.meta.url), "utf8");
    expect(parseWorkbookImport(tsv)).toEqual({ exercises: parsed.exercises, issues: [] });
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(264);
    expect(coverage.pageGroups.map(g => [g.page, g.firstNumber, g.lastNumber, g.addressHeaderSourcePage])).toEqual(groups);
    expect(parsed.exercises.map(row => [row.address.page, row.address.number])).toEqual(groups.flatMap(([page, first, last]) => Array.from({ length: last - first + 1 }, (_, i) => [page, String(first + i).padStart(2, "0")])));
    expect(parsed.exercises.every(row => row.address.volume === "" && row.address.subpart === "")).toBe(true);
  });
  it("registers all missing answers with a per-address exclusion instead of correcting the source", () => {
    const missing = [["38~52", "29"], ["53~63", "83"], ["70~79", "05"], ["70~79", "06"], ["70~79", "07"], ["93~101", "65"], ["93~101", "73"]];
    expect(parsed.exercises.filter(row => !row.key).map(row => [row.address.page, row.address.number])).toEqual(missing);
    expect(coverage.nullKeyLedger.map(row => row.address)).toEqual(parsed.exercises.filter(row => !row.key).map(row => row.address));
    expect(coverage.nullKeyLedger.filter(row => row.reason === "diagram")).toHaveLength(4);
    expect(coverage.nullKeyLedger.filter(row => row.reason === "source-anomaly")).toHaveLength(3);
    expect(coverage.nullKeyLedger.every(row => row.registered && row.key === null && row.note.length > 20)).toBe(true);
    expect(coverage.counts).toMatchObject({ exercises: 264, reviewedKeys: 257, nullKeys: 7, unreviewedKeys: 0, omittedInScopeAddresses: 0 });
  });
  it("preserves independently read numeric, fraction, radical, sign, unit and subpart references", () => {
    const fixtures = [
      ["10~21", 6, "1) 2; 2) 240; 3) 10080; 4) 20160; 5) 20160; 6) 11!×2"],
      ["10~21", 11, "1) Π(3,2); 2) Π(3,3); 3) Π(4,2); 4) Π(3,4)"],
      ["22~31", 51, "1) 7; 2) 9; 3) 10; 4) 2^48; 5) 2^98"],
      ["38~52", 17, "1) 1/56; 2) 15/28; 3) 1/2"], ["38~52", 23, "153/250"],
      ["38~52", 28, "1) 2/π; 2) 1-2/π; 3) 2/π-1/2"],
      ["53~63", 68, "1) 25/61; 2) 16/61"], ["53~63", 76, "1) 0.7; 2) 1/3; 3) 1/2 또는 2/5"],
      ["70~79", 15, "1) 5/6; 2) 29/36; 3) sqrt(29)/6"],
      ["70~79", 21, "1) -3; 2) 10; 3) 1/2; 4) 2; 5) 3sqrt(2)/2"],
      ["80~92", 33, "1) 1; 2) f(x)=x+1 (-1≤x<0), -x+1 (0≤x≤1); 3) 3/8; 4) 3/4"],
      ["80~92", 51, "1) 200; 2) 174.2 cm"],
      ["93~101", 67, "1) m=2, σ²=2/3, σ=sqrt(2/3); 2) 2, 2, 3; 3) 1/3, 2/9, 1/9"],
      ["93~101", 78, "1) 19.02≤m≤20.98; 2) 48.71≤m≤51.29"],
    ] as const;
    for (const [page, number, answer] of fixtures) expect(at(page, number).key?.answerText).toBe(answer);
    for (const row of parsed.exercises) if (row.key) {
      expect(row.key.status).toBe("reviewed");
      expect(row.key.sourcePage).toBeGreaterThanOrEqual(2);
      expect(row.key.sourcePage).toBeLessThanOrEqual(40);
      expect(row.key.answerText).not.toMatch(/[\u0000-\u001F\uFFFD]|해설 참조/);
    }
  });
  it("checks every chapter-summary choice and numeric answer, not only a sample", () => {
    const summaries = [
      ["32~33", "④|③|①|81|③|300|15|60|108|6|-8|④|④"],
      ["64~65", "②|A와 C 또는 B와 C|④|20|0.1|0.92|②|15/53|③|3|⑤|①"],
      ["102~103", "②|③|③|④|③|⑤|1|73|①|32|0.1587|318.71≤m≤321.29"],
    ];
    for (const [page, sequence] of summaries) expect(parsed.exercises.filter(row => row.address.page === page).map(row => row.key?.answerText)).toEqual(sequence.split("|"));
  });
  it("pins official provenance and leaves unsupported edition metadata unconfirmed", () => {
    expect(parsed.metadata).toEqual({ title: "수력충전 확률과 통계", publisher: "수경출판사", grade: "고등", edition: "공식 공개 PDF 보관본 · 발행연도·교육과정·쇄·ISBN 미확인" });
    expect(coverage.source).toMatchObject({ sourceRelativePath: "secondary/files/sk_pdf1.pdf", pageCount: 40, byteCount: 2670653, sha256: "0400aeca7ea463e4115f5b44c096f2efad5cd5966613d743f1aa5ea9e85b2eee" });
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
    expect(parsed.provenance.reference).toContain(coverage.source.pdfUrl);
    expect(coverage.source.answerRegions).toHaveLength(264);
    expect(coverage.scope.sourcePdfPagesVisuallyReviewed).toEqual(Array.from({ length: 39 }, (_, i) => i + 2));
    expect(coverage.scope).toMatchObject({ wholeBook: true, addressCoverage: "full", answerCoverage: "partial" });
    expect(coverage.grading).toBe("manual-reference-only");
  });
});
