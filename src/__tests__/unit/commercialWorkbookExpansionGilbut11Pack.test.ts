// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/gilbut-calculation-11-2026-v1.json";
import coverage from "../../../data/commercial-workbooks/gilbut-calculation-11-2026-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({ requestId: "gilbut11-expansion-20261024", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
const at = (page: number, number: string) => parsed.exercises.find(row => row.address.page === String(page) && row.address.number === number)!;
// Independent visual inventory: each stage's eight A/B pages and two day-5 pages.
const counts = [
 [14,14,14,14,14,14,14,14,10,4], [14,14,14,14,14,14,14,14,10,4],
 [9,9,9,9,9,9,9,9,5,4], [9,9,9,9,9,9,9,9,5,4], [9,9,9,9,9,9,9,9,5,4],
 [9,6,9,6,9,6,9,6,5,4], [14,9,14,9,14,9,14,9,4,4],
 [10,10,10,10,10,10,10,10,10,10], [14,14,14,14,14,14,14,14,14,14], [5,10,5,10,5,10,5,10,5,4],
];
const titles = ["(자연수)÷(자연수) ❶","(분수)÷(자연수)","(소수)÷(자연수) ❶","(소수)÷(자연수) ❷","(소수)÷(자연수) ❸","(자연수)÷(자연수) ❷","(분수)÷(자연수), (소수)÷(자연수)","비와 비율","백분율","6학년 방정식"];
const value = (raw: string): number => {
 const m = raw.trim().match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
 return m ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : Number(raw.trim());
};

describe("Gilbut calculation 11, 2026 revised official complete answers", () => {
  it("uses canonical schema and round-trips every TSV cell", () => {
    const tsv = readFileSync(fileURLToPath(new URL("../../../data/commercial-workbooks/gilbut-calculation-11-2026-v1.tsv", import.meta.url)), "utf8");
    const imported = parseWorkbookImport(tsv);
    expect(imported.issues).toEqual([]);
    expect(imported.exercises).toEqual(parsed.exercises);
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
  });

  it("preserves all printed circles, page numbers, stages, days and PDF source pages", () => {
    const expected = counts.flatMap((stage, stageIndex) => stage.flatMap((count, offset) => Array.from({ length: count }, (_, n) => ({
      volume: "11권", section: `${101 + stageIndex}단계 ${titles[stageIndex]} / ${Math.floor(offset / 2) + 1}일 / ${offset >= 8 && ![7, 8].includes(stageIndex) ? "문장 연산" : offset % 2 ? "B" : "A"}`,
      page: String(11 + stageIndex * 12 + offset), number: String.fromCodePoint(0x2460 + n), subpart: "",
    }))));
    expect(parsed.exercises.map(row => row.address)).toEqual(expected);
    expect(parsed.exercises).toHaveLength(973);
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
      [11,"⑭","9/16"], [17,"⑭","22/35"], [24,"⑭","14/33"], [31,"⑥","49/2÷7=3 1/2"],
      [36,"⑨","3.2"], [43,"⑤","30.54÷6=5.09"], [48,"⑨","0.08"], [56,"④","3.22÷14=0.23, 0.23"],
      [60,"⑥","0.925"], [63,"③","0.046"], [74,"⑥","5.18"], [80,"④","17÷5=3.4, 3.4"],
      [85,"⑭","1/5"], [87,"⑭","2 32/45"], [96,"⑨","9/5(1 4/5), 1.8"], [104,"⑥","54/125, 0.432"],
      [110,"⑦","19/250"], [116,"⑤","7/5(1 2/5)"], [119,"⑤","8 2/3÷6, 1 4/9"],
      [128,"①","□×9=11 1/4, 1 1/4"], [128,"④","예: 2×□=8/9, 4/9"],
    ];
    for (const [page, number, answer] of fixtures) expect(at(page, number).key?.answerText).toBe(answer);
    let equations = 0, equivalents = 0;
    for (const row of parsed.exercises) {
      const text = row.key!.answerText;
      const equation = text.match(/^([\d./ ]+)÷(\d+)[=,] ?([\d./ ]+)/);
      if (equation) {
        expect(value(equation[1]) / Number(equation[2])).toBeCloseTo(value(equation[3]), 10);
        equations++;
      }
      const equivalent = text.match(/^(\d+\/\d+)(?:\(([\d /]+)\))?, ([\d.]+)$/);
      if (equivalent) {
        expect(value(equivalent[1])).toBeCloseTo(value(equivalent[3]), 10);
        if (equivalent[2]) expect(value(equivalent[1])).toBeCloseTo(value(equivalent[2]), 10);
        equivalents++;
      }
    }
    expect(equations).toBeGreaterThan(80);
    expect(equivalents).toBe(50);
  });

  it("separates verified edition evidence, source identity, full address scope and null ledger", () => {
    expect(pack.id).toBe("gilbut-calculation-11-2026-v1");
    expect(coverage.packId).toBe(pack.id);
    expect(parsed.metadata.isbn).toBe("9791174672728");
    expect(parsed.metadata.curriculum).toBeUndefined();
    expect(coverage.source.editionEvidence).toMatchObject({ publicationDate: "2026-11-02", publicationDateIsFutureAtReview: true, curriculum: null, impression: null });
    expect(coverage.source.sha256).toBe("672d5674db5cf694da6fbe033ad4c21dd2dceb72581b646aefd8add8f0eaf237");
    expect(pack.provenance.description).toContain(coverage.source.sha256);
    expect(coverage.source.reviewedImages.map(image => image.sourcePage)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(coverage.source.reviewedImages.every(image => /^[a-f0-9]{64}$/.test(image.sha256))).toBe(true);
    expect(coverage.counts).toEqual({ exercises: 973, reviewedKeys: 973, nullKeys: 0, unreviewedKeys: 0, omittedInScopeAddresses: 0, pageGroups: 100 });
    expect(coverage.nullKeyLedger).toEqual(parsed.exercises.filter(row => !row.key));
    expect(coverage.scope).toMatchObject({ allExpectedAddressesPresent: true, allAnswersPresent: true, wholeBookAddressAudit: false });
  });
});
