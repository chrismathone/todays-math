// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/erum-summa-concept-middle3-2-2027-v1.json";
import coverage from "../../../data/commercial-workbooks/erum-summa-concept-middle3-2-2027-v1.coverage.json";
const parsed = workbookCreateEditionSchema.parse({ requestId: "erum-middle-2027-source-review", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
const numbered = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, "0"));
const typed = (ns: number[]) => ns.flatMap((n, i) => Array.from({ length: n }, (_, j) => `${i + 1}-${j + 1}`));
const concepts = (n: number) => ["개념 확인", ...numbered(n)];
// Printed page/header/last-number inventory, independently read from all 58 source boxes.
const main: [string, string[]][] = [
  ["026", concepts(5)], ["027~028", typed([3, 2, 3, 3, 2])], ["039", concepts(5)], ["040~042", typed([4, 8, 3, 5, 2])],
  ["043~045", numbered(20)], ["054", concepts(4)], ["055~057", typed([4, 4, 8, 5])], ["062", concepts(5)], ["063~064", typed([4, 3, 2, 2, 2])],
  ["065~067", numbered(20)], ["070~073", numbered(25)], ["087", concepts(5)], ["088~089", typed([5, 2, 3, 3])], ["096", concepts(5)],
  ["097~100", typed([4, 6, 5, 5, 7])], ["101~103", numbered(20)], ["111", concepts(4)], ["112~114", typed([4, 4, 4, 4, 4, 2])],
  ["120", concepts(4)], ["121~122", typed([3, 9, 2])], ["128", concepts(4)], ["129~130", typed([3, 3, 2, 2, 2])], ["131~133", numbered(21)],
  ["136~139", numbered(25)], ["157", concepts(4)], ["158~160", typed([4, 6, 7, 4])], ["161~163", numbered(20)], ["172", concepts(3)],
  ["173~175", typed([6, 3, 4, 2])], ["183", concepts(3)], ["184~187", typed([5, 2, 4, 4, 4])], ["188~190", numbered(16)], ["192~195", numbered(22)], ["196~197", numbered(2)],
];
const test: [string, number][] = [["002~004",23],["005~008",28],["009~011",10],["012~014",22],["015~016",16],["017~019",10],["020~022",20],["023",2],["024~025",16],["026~029",31],["030~032",10],["033~035",24],["036~037",14],["038~039",16],["040~043",12],["044~046",20],["047",2],["048~050",20],["051~052",6],["053~054",12],["055~057",14],["058~059",7],["060~062",20],["063",2]];
const at = (volume: string, page: string, number: string) => parsed.exercises.find(r => r.address.volume === volume && r.address.page === page && r.address.number === number)!;
describe("Summa concept middle 3-2 2027 complete answer scope", () => {
  it("strictly parses and roundtrips all 823 unique addresses", () => {
    const text = readFileSync(new URL("../../../data/commercial-workbooks/erum-summa-concept-middle3-2-2027-v1.tsv", import.meta.url), "utf8");
    expect(parseWorkbookImport(text)).toEqual({ exercises: parsed.exercises, issues: [] });
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(823);
    expect(Object.keys(pack).sort()).toEqual(["coverage", "exercises", "id", "label", "metadata", "provenance"]);
  });
  it("matches complete independent printed number runs in both volumes", () => {
    const actual = (volume: string) => parsed.exercises.filter(r => r.address.volume === volume).map(r => [r.address.page, r.address.number]);
    expect(actual("개념 BOOK")).toEqual(main.flatMap(([page, ns]) => ns.map(n => [page, n])));
    expect(actual("테스트 BOOK")).toEqual(test.flatMap(([page, n]) => numbered(n).map(num => [page, num])));
    expect(coverage.pageGroups).toHaveLength(58);
    expect(coverage.counts).toMatchObject({ exercises: 823, reviewedKeys: 819, nullKeys: 4, unreviewedKeys: 0, omittedInScopeAddresses: 0, byVolume: { "개념 BOOK": 466, "테스트 BOOK": 357 } });
  });
  it("accounts for every partial or entire solution-reference exclusion", () => {
    const missing = [["개념 BOOK","172","02"],["개념 BOOK","173~175","2-1"],["개념 BOOK","183","01"],["테스트 BOOK","053~054","08"]];
    for (const [volume, page, n] of missing) expect(at(volume, page, n).key).toBeNull();
    expect(parsed.exercises.filter(r => !r.key).map(r => r.address)).toEqual(coverage.nullKeyLedger.map(r => r.address));
    expect(coverage.nullKeyLedger.every(r => r.registered && r.reason === "solution-reference" && r.key === null)).toBe(true);
  });
  it("preserves radicals, units, signs, multipart answers and printed choice circles", () => {
    const fixtures = [["개념 BOOK","026","02","sqrt(5)/2",2],["개념 BOOK","027~028","2-2","4sqrt(5) cm²",2],["테스트 BOOK","012~014","19","100(sqrt(3)-1) cm²",59],["테스트 BOOK","036~037","13","②, ③",77],["테스트 BOOK","036~037","05","222°",77]] as const;
    for (const [volume, page, number, answerText, sourcePage] of fixtures) expect(at(volume,page,number).key).toEqual({ answerText, status: "reviewed", sourcePage });
  });
  it("checks all numeric/choice references and source-page bindings", () => {
    const byPage: Record<string, number> = {};
    const allowed = new Set(coverage.source.reviewedAnswerBoxes.map(b => b.sourcePage));
    for (const r of parsed.exercises) if (r.key) {
      expect(allowed.has(r.key.sourcePage!)).toBe(true);
      expect(r.key.status).toBe("reviewed");
      expect(r.key.answerText).not.toMatch(/[\u0000-\u001F\uFFFD⑥⑦⑧⑨⑩]|풀이 참조|\/0(?:\D|$)/);
      expect((r.key.answerText.match(/\(/g) ?? []).length).toBe((r.key.answerText.match(/\)/g) ?? []).length);
      byPage[r.key.sourcePage!] = (byPage[r.key.sourcePage!] ?? 0) + 1;
    }
    expect(parsed.exercises.filter(r => r.key && /^[①②③④⑤]$/.test(r.key.answerText))).toHaveLength(121);
    expect(byPage).toEqual(coverage.counts.byReviewedKeySourcePage);
  });
  it("freezes source and all reviewed box images without inventing edition metadata", () => {
    expect(coverage.source).toMatchObject({ sourceRelativePath: "secondary/files/erum_pdf3.pdf", pageCount: 96, byteCount: 92048491, sha256: "81254db8b92b04d439bf3e364cb074d598cda23765f5ecbf9e71784d39f78f31" });
    expect(coverage.source.reviewedAnswerBoxes).toHaveLength(58);
    for (const b of coverage.source.reviewedAnswerBoxes) expect(b.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.metadata.edition).toContain("1판1쇄");
    expect(parsed.metadata.edition).toContain("발행연도·ISBN 미확인");
    expect(parsed.metadata).not.toHaveProperty("isbn");
    expect(parsed.provenance.reference).toBe("https://www.erumenb.com/bookdata/index.php?section=3");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
  });
});
