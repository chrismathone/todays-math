// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/gilbut-calculation-1-2026-v1.json";
import coverage from "../../../data/commercial-workbooks/gilbut-calculation-1-2026-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({ requestId: "gilbut1-expansion-20261024", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
const at = (page: number, number: string) => parsed.exercises.find(row => row.address.page === String(page) && row.address.number === number)!;
// Independent visual inventory: each stage's eight A/B pages and two day-5 pages.
const counts = [
 [15,15,15,15,15,15,15,15,6,4], [30,0,30,0,30,0,30,0,10,4], [30,0,30,0,30,0,30,0,10,4],
 [30,24,30,24,30,24,30,24,10,4], [20,20,20,20,20,20,20,20,20,20], [30,24,30,24,30,24,30,24,10,4],
 [24,30,24,30,24,30,24,30,10,4], [24,30,24,30,24,30,24,30,10,4], [24,30,24,30,24,30,24,30,10,4], [5,16,5,16,5,16,5,16,8,4],
];
const titles = ["수를 가르고 모으기","합이 9까지인 덧셈","차가 9까지인 뺄셈","합과 차가 9까지인 덧셈과 뺄셈 종합","연이은 덧셈, 뺄셈","(몇십)+(몇), (몇)+(몇십)","(몇십몇)+(몇), (몇십몇)−(몇)","(몇십)+(몇십), (몇십)−(몇십)","(몇십몇)+(몇십몇), (몇십몇)−(몇십몇)","1학년 방정식"];
const nullPages = new Set([11,13,15,17,20,119,121,123,125]);
const circle = (zeroIndex: number) => String.fromCodePoint(zeroIndex < 20 ? 0x2460 + zeroIndex : 0x3251 + zeroIndex - 20);

describe("Gilbut calculation 1, 2026 revised official complete answers", () => {
  it("uses canonical schema and round-trips every TSV cell", () => {
    const tsv = readFileSync(fileURLToPath(new URL("../../../data/commercial-workbooks/gilbut-calculation-1-2026-v1.tsv", import.meta.url)), "utf8");
    const imported = parseWorkbookImport(tsv);
    expect(imported.issues).toEqual([]);
    expect(imported.exercises).toEqual(parsed.exercises);
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
  });

  it("preserves all printed circles, page numbers, stages, days and PDF source pages", () => {
    const expected = counts.flatMap((stage, stageIndex) => stage.flatMap((count, offset) => Array.from({ length: count }, (_, n) => ({
      volume: "1권", section: `${1 + stageIndex}단계 ${titles[stageIndex]} / ${Math.floor(offset / 2) + 1}일 / ${offset >= 8 && stageIndex !== 4 ? "문장 연산" : offset % 2 ? "B" : "A"}`,
      page: String(11 + stageIndex * 12 + offset), number: circle(n), subpart: "",
    }))));
    expect(parsed.exercises.map(row => row.address)).toEqual(expected);
    expect(parsed.exercises).toHaveLength(1844);
    for (const [stageIndex, stage] of counts.entries()) for (const [offset, count] of stage.entries()) {
      const page = 11 + stageIndex * 12 + offset;
      const sourcePage = 4 + stageIndex * 2 + (offset >= 4 ? 1 : 0);
      const rows = parsed.exercises.filter(row => row.address.page === String(page));
      expect(rows).toHaveLength(count);
      expect(rows.every(row => nullPages.has(page) ? row.key === null : row.key?.sourcePage === sourcePage && row.key.status === "reviewed")).toBe(true);
      if (count === 0) continue;
      expect(coverage.pageGroups.find(group => group.page === String(page))).toMatchObject({ exerciseCount: count, reviewedKeyCount: nullPages.has(page) ? 0 : count, nullKeyCount: nullPages.has(page) ? count : 0, sourcePage });
    }
  });

  it("retains visual fixtures from every answer page, including multiline and example symbols", () => {
    const fixtures: [number, string, string][] = [
      [12,"⑮","3"], [19,"⑥","5, 5"], [23,"㉚","4"], [32,"④","6+3=9, 9"], [37,"㉚","4"], [44,"④","7−3=4, 4"],
      [48,"㉔","0"], [55,"⑩","7−4=3"], [60,"⑳","2"], [68,"⑳","1"], [73,"㉚","41"], [78,"㉔","88"],
      [86,"㉚","34"], [92,"④","34−3=31, 31"], [98,"㉚","20"], [103,"⑩","70−10=60"], [109,"㉔","16"],
      [114,"㉚","13"], [122,"⑯","2"], [128,"③","예: □+3=5, 2"],
    ];
    for (const [page, number, value] of fixtures) expect(at(page, number).key?.answerText).toBe(value);
    let checked = 0;
    for (const row of parsed.exercises) {
      const match = row.key?.answerText.match(/^(\d+)([+−])(\d+)=(\d+)/);
      if (!match) continue;
      const [, a, operation, b, result] = match;
      expect(operation === "+" ? Number(a) + Number(b) : Number(a) - Number(b)).toBe(Number(result));
      checked++;
    }
    expect(checked).toBe(98);
    const missing = parsed.exercises.filter(row => row.key === null);
    expect(missing).toHaveLength(84);
    expect(coverage.nullKeyLedger.map(row => row.address)).toEqual(missing.map(row => row.address));
    expect(coverage.nullKeyLedger.every(row => nullPages.has(Number(row.address.page)) && row.reason.includes("그림"))).toBe(true);
    expect(coverage.unaddressableActivities.map(row => row.page)).toEqual(["24","26","28","30","36","38","40","42"]);
    expect(coverage.unaddressableActivities.reduce((n, row) => n + row.answerCells, 0)).toBe(220);
  });

  it("separates verified edition evidence, source identity, full address scope and null ledger", () => {
    expect(pack.id).toBe("gilbut-calculation-1-2026-v1");
    expect(coverage.packId).toBe(pack.id);
    expect(parsed.metadata.isbn).toBe("9791174672629");
    expect(parsed.metadata.curriculum).toBeUndefined();
    expect(coverage.source.editionEvidence).toMatchObject({ publicationDate: "2026-11-02", publicationDateIsFutureAtReview: true, curriculum: null, impression: null });
    expect(coverage.source.sha256).toBe("35c88d12164b3ad047df7256b1ee470f6bc72e54bf0ca73de02a32d1ca6ca7f8");
    expect(pack.provenance.description).toContain(coverage.source.sha256);
    expect(coverage.source.reviewedImages.map(image => image.sourcePage)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(coverage.source.reviewedImages.every(image => /^[a-f0-9]{64}$/.test(image.sha256))).toBe(true);
    expect(coverage.counts).toEqual({ exercises: 1844, reviewedKeys: 1760, nullKeys: 84, unreviewedKeys: 0, omittedInScopeAddresses: 0, pageGroups: 92, unaddressableTables: 8, unaddressableAnswerCells: 220 });
    expect(coverage.nullKeyLedger).toHaveLength(84);
    expect(coverage.scope).toMatchObject({ allExpectedAddressesPresent: true, allAnswersPresent: false, wholeRequestedQuickAnswerScope: false, wholeBookAddressAudit: false });
  });
});
