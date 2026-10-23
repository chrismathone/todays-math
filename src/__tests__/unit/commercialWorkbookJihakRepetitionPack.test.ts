// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import {
  assertUniqueAddresses,
  parseWorkbookImport,
  workbookAddressKey,
} from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/jihak-repetition-m3-2-2022-v1.json";
import coverage from "../../../data/commercial-workbooks/jihak-repetition-m3-2-2022-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({
  requestId: "jihak-repetition-reviewed-20261024",
  metadata: pack.metadata,
  provenance: pack.provenance,
  exercises: pack.exercises,
});
const tsv = readFileSync(fileURLToPath(new URL(
  "../../../data/commercial-workbooks/jihak-repetition-m3-2-2022-v1.tsv",
  import.meta.url,
)), "utf8");

// Independent inventory of the printed answer boxes, read from all 40 page images.
// Columns: textbook label, main-number count, first PDF source page.
const expectedGroups = [
  ["9~11", 6, 2], ["12~13", 7, 2], ["14", 5, 3], ["15", 8, 4],
  ["16~18", 8, 4], ["19~20", 4, 6], ["21", 5, 6], ["22", 8, 6],
  ["23", 4, 7], ["24", 3, 8], ["25~26", 4, 8], ["27", 8, 8],
  ["29~30", 4, 10], ["31~33", 8, 10], ["34~35", 4, 11], ["36~37", 14, 12],
  ["38~40", 7, 13], ["41~42", 5, 14], ["43", 1, 15], ["44", 7, 15],
  ["47~49", 6, 16], ["50~51", 5, 17], ["52", 8, 18], ["53~55", 6, 19],
  ["56~57", 4, 19], ["58~59", 4, 20], ["60~61", 14, 20],
  ["63~64", 5, 22], ["65~67", 7, 22], ["68~70", 6, 23], ["71~72", 15, 24],
  ["73", 3, 25], ["74~75", 3, 25], ["76", 3, 26], ["77~79", 7, 26], ["80", 8, 27],
  ["83~84", 5, 28], ["85~86", 5, 28], ["87~88", 6, 29], ["89", 6, 30],
  ["91", 4, 31], ["92", 2, 31], ["93~94", 5, 31], ["95", 5, 32],
  ["96", 3, 33], ["97~98", 3, 33], ["99~100", 4, 34], ["101", 2, 34], ["102~103", 10, 34],
] as const;

const at = (page: string, number: number) => {
  const row = parsed.exercises.find(item => item.address.page === page && item.address.number === String(number));
  if (!row) throw new Error(`Missing printed address ${page} / ${number}`);
  return row;
};

describe("Jihak repetition middle school 3-2 official full answer scope", () => {
  it("uses canonical schema and distinguishes curriculum from an unconfirmed publication year", () => {
    expect(Object.keys(pack).sort()).toEqual(["coverage", "exercises", "id", "label", "metadata", "provenance"]);
    expect(pack.id).toBe("jihak-repetition-m3-2-2022-v1");
    expect(coverage.packId).toBe(pack.id);
    expect(parsed.metadata).toEqual({
      title: "풍산자 반복수학 중학수학 3-2 (2022 개정)",
      publisher: "지학사",
      grade: "중학 3학년 2학기",
      curriculum: "2022 개정",
      edition: "2022 개정 교육과정 · 발행연도·쇄 미확인",
    });
    expect(parsed.metadata.isbn).toBeUndefined();
    expect(coverage.source.editionEvidence).toMatchObject({
      publicationYear: null, impression: null, isbn: null,
      confirmedComposition: "진도북 104쪽, 정답과 풀이 40쪽",
    });
    expect(parsed.provenance.kind).toBe("publisher");
    expect(coverage.source.productUrl).toBe("https://www.jihak.co.kr/reference-book/middle-school/HSFXztywBFQ2bis8");
    expect(coverage.source.pdfUrl).toContain("/HSFXztywBFQ2bis8/t8Su8xAJamy0p8xc.pdf");
    expect(coverage.source.sha256).toBe("6f2970153237e8505771cb00f409eb95d123273dafbf168c79cfd30f7220b2f2");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
  });

  it("imports the UTF-8 TSV exactly, including blank keys without a review status or source page", () => {
    const imported = parseWorkbookImport(tsv);
    expect(imported.issues).toEqual([]);
    expect(imported.exercises).toEqual(parsed.exercises);
    expect(imported.exercises).toHaveLength(284);
    expect(tsv.split("\n")[0]).toBe("volume\tsection\tpage\tnumber\tsubpart\tanswerText\tkeyStatus\tsourcePage");
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/);
    for (const line of tsv.trimEnd().split("\n").slice(1)) {
      const cells = line.split("\t");
      if (!cells[5]) expect(cells.slice(5)).toEqual(["", "", '""']);
    }
  });

  it("covers every printed main number once, preserving source ranges and the actual volume", () => {
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(new Set(parsed.exercises.map(row => workbookAddressKey(row.address))).size).toBe(284);
    expect(coverage.pageGroups.map(group => [group.page, group.exerciseCount, group.answerBoxSourcePage])).toEqual(expectedGroups);
    expect(parsed.exercises.map(row => [row.address.page, row.address.number])).toEqual(
      expectedGroups.flatMap(([page, count]) => Array.from({ length: count }, (_, i) => [page, String(i + 1)])),
    );
    for (const [page, count] of expectedGroups) {
      const rows = parsed.exercises.filter(row => row.address.page === page);
      const group = coverage.pageGroups.find(item => item.page === page)!;
      expect(rows.map(row => row.address)).toEqual(Array.from({ length: count }, (_, i) => ({
        volume: "진도북", section: group.section, page, number: String(i + 1), subpart: "",
      })));
      expect(group).toMatchObject({ firstNumber: 1, lastNumber: count, exerciseCount: count });
    }
    expect(at("9~11", 1).address.section).toBe("Ⅰ. 삼각비 / 1. 삼각비 / 01 삼각비의 뜻");
    expect(at("47~49", 1).address.section).toBe("Ⅱ. 원의 성질 / 1. 원과 직선 / 01 현의 수직이등분선");
    expect(at("102~103", 10).address.section).toBe("Ⅲ. 통계 / 2. 상자그림과 산점도 / 스스로 점검하기");
  });

  it("maps every reviewed answer to its 1-indexed PDF page, including the answer box split at pages 4/5", () => {
    const bySource: Record<string, number> = {};
    const allBySource: Record<string, number> = {};
    for (const [page, count, firstSourcePage] of expectedGroups) {
      const rows = parsed.exercises.filter(row => row.address.page === page);
      const group = coverage.pageGroups.find(item => item.page === page)!;
      expect(group.reviewedKeyCount).toBe(rows.filter(row => row.key).length);
      expect(group.nullKeyCount).toBe(rows.filter(row => !row.key).length);
      for (let n = 1; n <= count; n++) {
        const expectedSource = page === "16~18" && n > 1 ? 5 : firstSourcePage;
        const row = at(page, n);
        allBySource[expectedSource] = (allBySource[expectedSource] ?? 0) + 1;
        if (row.key) {
          expect(row.key).toMatchObject({ status: "reviewed", sourcePage: expectedSource });
          bySource[expectedSource] = (bySource[expectedSource] ?? 0) + 1;
        } else {
          expect(coverage.nullKeyLedger.find(item => workbookAddressKey(item.address) === workbookAddressKey(row.address)))
            .toMatchObject({ sourcePage: expectedSource, registered: true, key: null });
        }
      }
    }
    expect(bySource).toEqual(coverage.counts.byReviewedKeySourcePage);
    expect(allBySource).toEqual(coverage.counts.byRegisteredAddressSourcePage);
    expect(coverage.source.pageCount).toBe(40);
    expect(coverage.source.byteCount).toBe(1078156);
    expect(coverage.source.reviewedImages.map(item => item.sourcePage)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    for (const item of coverage.source.reviewedImages) expect(item.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(coverage.sourcePagesWithoutAnswerBoxes.map(item => item.sourcePage)).toEqual([1, 9, 21, 35, 36, 37, 38, 39, 40]);
  });

  it("locks visually read fractions, radicals, table cells, units and subpart identities independently of extraction", () => {
    const fixtures = [
      ["9~11", 6, "a/b, c/b, a/c"],
      ["12~13", 7, "C, b/c, a/c, b/a"],
      ["14", 4, "9, sqrt(65), 4, 4/9, sqrt(65)/9, 4sqrt(65)/65"],
      ["14", 5, "sqrt(a²+b²+c²), sqrt(a²+b²), c"],
      ["16~18", 3, "⑴ 3sqrt(3)/2; ⑵ 3/2; ⑶ 1/2; ⑷ −sqrt(3); ⑸ sqrt(3)/2; ⑹ 1/2; ⑺ 3/2; ⑻ sqrt(2)"],
      ["25~26", 3, "⑴ 0.5150, x, x, 0.5150, 51.50; ⑵ 6.249; ⑶ 16.774; ⑷ 2.796"],
      ["31~33", 7, "⑴ 30sqrt(7) m; ⑵ 60(sqrt(2)+sqrt(6)) m"],
      ["36~37", 14, "(10−10sqrt(3)/3) m"],
      ["43", 1, "⑴ 1/2, 1/2, 4, 60, 3sqrt(3); ⑵ 30sqrt(3); ⑶ 21sqrt(2)/2; ⑷ 7; ⑸ 36sqrt(3)"],
      ["65~67", 2, "⑴ 36, 2, 72; ⑵ ∠x=40°, ∠y=80°; ⑶ ∠x=24°, ∠y=24°; ⑷ ∠x=110°, ∠y=220°"],
      ["71~72", 3, "15π cm²"],
      ["89", 4, "분산: 6, 표준편차: sqrt(6)회"],
      ["91", 2, "⑴ 7; ⑵ 1, 2; ⑶ 9, 9"],
      ["93~94", 1, "⑴ 10개; ⑵ 20개; ⑶ 약 25%; ⑷ 약 50%; ⑸ ㉢; ⑹ ㉠"],
      ["97~98", 3, "⑴ C; ⑵ A, D; ⑶ 30%; ⑷ 3명; ⑸ 4명; ⑹ 30%"],
      ["101", 2, "⑴ 양의 상관관계; ⑵ A; ⑶ B; ⑷ D"],
      ["102~103", 10, "③"],
    ] as const;
    for (const [page, number, answer] of fixtures) expect(at(page, number).key?.answerText).toBe(answer);
    expect(at("34~35", 1).key?.answerText).toContain("❸ (sqrt(3)/3)h, h, sqrt(3)/3+1, 5(3−sqrt(3))");
    expect(at("85~86", 1).key?.answerText).toContain("(편차)²: 4, 1, 25, 16, 49, 1 / ❶ 96, 6, 16 ❷ 16, 4");
    expect(at("23", 1).key?.answerText).toContain("tan A=0, sqrt(3)/3, 1, sqrt(3), 정할 수 없다");
    for (const row of parsed.exercises) if (row.key) {
      expect(row.key.answerText).not.toMatch(/\\(?:frac|sqrt)|[\uFFFD\u0000-\u001F]/);
    }
  });

  it("keeps all seven diagram/composite answers null with their printed subparts in the ledger", () => {
    const missing = [["31~33", "1"], ["31~33", "3"], ["31~33", "4"], ["92", "1"], ["92", "2"], ["96", "1"], ["96", "2"]];
    expect(coverage.nullKeyLedger.map(item => [item.address.page, item.address.number])).toEqual(missing);
    expect(parsed.exercises.filter(row => !row.key).map(row => row.address)).toEqual(coverage.nullKeyLedger.map(item => item.address));
    expect(coverage.nullKeyLedger.map(item => item.printedSubparts)).toEqual([
      ["❶", "❷", "❸", "❹"], ["❶", "❷", "❸", "❹"], ["❶", "❷", "❸", "❹"], ["⑴", "⑵", "⑶"], ["⑴", "⑵"], [], [],
    ]);
    for (const item of coverage.nullKeyLedger) {
      expect(item.reason).toBe("diagram");
      expect(item.note.length).toBeGreaterThan(20);
    }
  });

  it("reports full official address coverage and partial answer coverage without promising automatic grading", () => {
    expect(coverage.scope).toMatchObject({ wholeBook: true, addressCoverage: "full", answerCoverage: "partial", allChapterAnswersPresent: false });
    expect(coverage.scope.textbookPageLabels).toEqual(expectedGroups.map(([page]) => page));
    expect(coverage.counts).toMatchObject({ pageGroups: 49, exercises: 284, reviewedKeys: 277, nullKeys: 7, unreviewedKeys: 0, omittedInScopeAddresses: 0 });
    expect(coverage.counts.byChapter).toEqual({ "Ⅰ. 삼각비": 120, "Ⅱ. 원의 성질": 104, "Ⅲ. 통계": 60 });
    expect(coverage.grading).toBe("manual-reference-only");
    expect(parsed.provenance.description).toContain("수동 채점용");
    expect(pack.coverage).toContain("미수록 7개");
  });
});
