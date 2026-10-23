// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/gilbut-calculation-7-2026-v1.json";
import coverage from "../../../data/commercial-workbooks/gilbut-calculation-7-2026-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({ requestId: "gilbut7-expansion-20261024", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
const at = (page: number, number: string) => parsed.exercises.find(row => row.address.page === String(page) && row.address.number === number)!;
// Independent visual inventory: each stage's eight A/B pages and two day-5 pages.
const counts = [
  [20,15,20,15,20,15,20,15,10,4], [15,12,15,12,15,12,15,12,10,4],
  [12,9,12,9,12,9,12,9,5,4], [12,9,12,9,12,9,12,9,5,4],
  [15,12,15,12,15,12,15,12,4,3], [15,12,15,12,15,12,15,12,4,3],
  [15,12,15,12,15,12,15,12,4,3], [12,9,12,9,12,9,12,9,4,3],
  [12,9,12,9,12,9,12,9,5,3], [5,10,5,10,6,10,6,10,5,3],
];
const titles = ["몇십, 몇백 곱하기", "(세 자리 수)×(몇십)", "(세 자리 수)×(두 자리 수) ❶", "(세 자리 수)×(두 자리 수) ❷", "몇십으로 나누기", "(두 자리 수)÷(두 자리 수)", "(세 자리 수)÷(두 자리 수) ❶", "(세 자리 수)÷(두 자리 수) ❷", "곱셈과 나눗셈 종합", "4학년 방정식"];

describe("Gilbut calculation 7, 2026 revised official complete answers", () => {
  it("uses canonical schema and round-trips every TSV cell", () => {
    const tsv = readFileSync(fileURLToPath(new URL("../../../data/commercial-workbooks/gilbut-calculation-7-2026-v1.tsv", import.meta.url)), "utf8");
    const imported = parseWorkbookImport(tsv);
    expect(imported.issues).toEqual([]);
    expect(imported.exercises).toEqual(parsed.exercises);
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
  });

  it("preserves all printed circles, page numbers, stages, days and PDF source pages", () => {
    const expected = counts.flatMap((stage, stageIndex) => stage.flatMap((count, offset) => Array.from({ length: count }, (_, n) => ({
      volume: "7권", section: `${61 + stageIndex}단계 ${titles[stageIndex]} / ${Math.floor(offset / 2) + 1}일 / ${offset >= 8 ? "문장 연산" : offset % 2 ? "B" : "A"}`,
      page: String(11 + stageIndex * 12 + offset), number: String.fromCodePoint(0x2460 + n), subpart: "",
    }))));
    expect(parsed.exercises.map(row => row.address)).toEqual(expected);
    expect(parsed.exercises).toHaveLength(1060);
    for (const [stageIndex, stage] of counts.entries()) for (const [offset, count] of stage.entries()) {
      const page = 11 + stageIndex * 12 + offset;
      const sourcePage = 4 + stageIndex * 2 + (offset >= 4 ? 1 : 0);
      const rows = parsed.exercises.filter(row => row.address.page === String(page));
      expect(rows).toHaveLength(count);
      expect(rows.every(row => row.key?.sourcePage === sourcePage && row.key.status === "reviewed")).toBe(true);
      expect(coverage.pageGroups.find(group => group.page === String(page))).toMatchObject({ exerciseCount: count, reviewedKeyCount: count, nullKeyCount: 0, sourcePage });
    }
  });

  it("retains visual fixtures from every answer page, including multiline and example symbols", () => {
    const fixtures: [number, string, string][] = [
      [11,"⑳","328000"], [20,"④","300×40=12000, 12000"], [24,"⑫","29890"], [31,"⑩","434×30=13020"],
      [36,"⑨","22436"], [44,"③","448×68=30464, 30464"], [49,"⑫","27528"], [56,"④","714×28=19992, 19992"],
      [59,"⑮","2…65"], [67,"③","30, 1, 15 / 1, 15"], [73,"⑥","1…42"], [80,"③","95÷13=7…4, 7, 4"],
      [85,"⑭","6…62"], [91,"④","39, 6, 11 / 6, 11"], [97,"⑩","65…8"], [104,"②","913÷59=15…28, 15, 28"],
      [109,"⑫","9408"], [115,"⑤","886÷60=14…46 / 14, 46"], [121,"④","36×18 또는 18×36, 648"],
      [125,"②","−1, −1 / 14"], [125,"④","−7, −7 / 416 / 416, 32"], [125,"⑤","−10, −10 / 375 / 375, 25"],
      [125,"⑥","−12, −12 / 810 / 810, 30"], [128,"②","예: □÷30=25…12, 762"], [128,"③","예: 400÷□=17…9, 23"],
    ];
    for (const [page, number, value] of fixtures) expect(at(page, number).key?.answerText).toBe(value);
    // Mechanical arithmetic check for every complete numeric equation; references remain publisher answers.
    let checked = 0;
    for (const row of parsed.exercises) {
      const match = row.key?.answerText.match(/^(\d+)([×÷])(\d+)=(\d+)(?:…(\d+))?/);
      if (!match) continue;
      const [, a, operation, b, result, remainder] = match;
      if (operation === "×") expect(Number(a) * Number(b)).toBe(Number(result));
      else expect(Number(b) * Number(result) + Number(remainder ?? 0)).toBe(Number(a));
      checked++;
    }
    expect(checked).toBeGreaterThan(60);
  });

  it("separates verified edition evidence, source identity, full address scope and null ledger", () => {
    expect(pack.id).toBe("gilbut-calculation-7-2026-v1");
    expect(coverage.packId).toBe(pack.id);
    expect(parsed.metadata.isbn).toBe("9791174672681");
    expect(parsed.metadata.curriculum).toBeUndefined();
    expect(coverage.source.editionEvidence).toMatchObject({ publicationDate: "2026-11-02", publicationDateIsFutureAtReview: true, curriculum: null, impression: null });
    expect(coverage.source.sha256).toBe("24620bffde9ffdc47e6c185c251e254448752306001984fd089a14299b5227f3");
    expect(pack.provenance.description).toContain(coverage.source.sha256);
    expect(coverage.source.reviewedImages.map(image => image.sourcePage)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(coverage.source.reviewedImages.every(image => /^[a-f0-9]{64}$/.test(image.sha256))).toBe(true);
    expect(coverage.counts).toEqual({ exercises: 1060, reviewedKeys: 1060, nullKeys: 0, unreviewedKeys: 0, omittedInScopeAddresses: 0, pageGroups: 100 });
    expect(coverage.nullKeyLedger).toEqual(parsed.exercises.filter(row => !row.key));
    expect(coverage.scope).toMatchObject({ allExpectedAddressesPresent: true, allAnswersPresent: true, wholeBookAddressAudit: false });
  });
});
