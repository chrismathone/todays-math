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
import pack from "../../../data/commercial-workbooks/visang-5761-2026-ch1-v1.json";
import coverage from "../../../data/commercial-workbooks/visang-5761-2026-ch1-v1.coverage.json";

const input = {
  requestId: "publisher-pack-fixture-20261023",
  metadata: pack.metadata,
  provenance: pack.provenance,
  exercises: pack.exercises,
};
const parsed = workbookCreateEditionSchema.parse(input);
const tsv = readFileSync(fileURLToPath(new URL(
  "../../../data/commercial-workbooks/visang-5761-2026-ch1-v1.tsv", import.meta.url,
)), "utf8");
const expectedGroups = [
  ["8", 2, 2], ["9", 4, 2], ["10", 2, 2], ["11", 4, 2], ["12", 2, 2],
  ["13", 4, 3], ["14", 2, 3], ["15", 4, 3], ["16", 2, 3], ["17", 4, 4],
  ["18~19", 28, 4], ["20~21", 14, 4], ["22~23", 8, 5], ["24~26", 20, 5],
] as const;
const at = (page: string, number: number) => {
  const found = parsed.exercises.find(row => row.address.page === page && row.address.number === String(number));
  if (!found) throw new Error(`Missing fixture ${page} / ${number}`);
  return found;
};

describe("official publisher starter pack: Visang 5761 chapter 1", () => {
  it("uses the canonical create-edition schema with explicit edition and publisher provenance", () => {
    expect(pack.id).toBe("visang-5761-2026-ch1-v1");
    expect(coverage.packId).toBe(pack.id);
    expect(parsed.metadata.edition).toBe("2026년 학습 · 2022개정");
    expect(parsed.metadata.isbn).toBe("979-11-7316-537-5");
    expect(parsed.provenance.kind).toBe("publisher");
    expect(parsed.provenance.reference).toBe(
      "https://book.visang.com/books/info/5761\nhttps://cdn.visang.com/book/202506/20250617123239292.pdf",
    );
    const withoutEdition = Object.fromEntries(Object.entries(input.metadata).filter(([key]) => key !== "edition"));
    expect(workbookCreateEditionSchema.safeParse({ ...input, metadata: withoutEdition }).success).toBe(false);
    expect(coverage.source.sha256).toBe("37ebf8296a8b15784ae5306a61ce53b14f923246ebde701374c8fcf5f255b0e1");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
    expect(coverage.source.sourceListingYear).toBe("2025");
    expect(coverage.source.productLearningYear).toBe("2026");
  });

  it("imports every TSV row without loss, including null answers and ordered subparts", () => {
    expect(tsv.split("\n")[0]).toBe("volume\tsection\tpage\tnumber\tsubpart\tanswerText\tkeyStatus\tsourcePage");
    const result = parseWorkbookImport(tsv);
    expect(result.issues).toEqual([]);
    expect(result.exercises).toEqual(parsed.exercises);
    expect(result.exercises).toHaveLength(100);
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/);
    for (const row of tsv.trimEnd().split("\n").slice(1)) {
      const cells = row.split("\t");
      // A quoted empty final cell preserves eight columns without trailing whitespace.
      if (!cells[5]) expect(cells.slice(5)).toEqual(["", "", '""']);
    }
  });

  it("registers each of the 100 exact five-field addresses once, preserving printed page ranges", () => {
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    const expectedAddresses = expectedGroups.flatMap(([page, count]) =>
      Array.from({ length: count }, (_, index) => ({
        volume: "개념책", section: "1. 자연수의 혼합 계산", page, number: String(index + 1), subpart: "",
      })),
    );
    expect(parsed.exercises.map(row => row.address)).toEqual(expectedAddresses);
    expect(new Set(parsed.exercises.map(row => workbookAddressKey(row.address))).size).toBe(100);
    expect(() => assertUniqueAddresses([
      ...parsed.exercises,
      { ...parsed.exercises[0], address: { ...parsed.exercises[0].address, page: " 8 " } },
    ])).toThrow("같은 권·단원·쪽·번호·소문항이 중복되었습니다.");
  });

  it("maps all keys and null ledgers to the correct answer-box source page, not the textbook page", () => {
    for (const [page, count, sourcePage] of expectedGroups) {
      const rows = parsed.exercises.filter(row => row.address.page === page);
      const group = coverage.pageGroups.find(item => item.page === page);
      expect(group).toMatchObject({
        firstNumber: 1, lastNumber: count, exerciseCount: count, answerBoxSourcePage: sourcePage,
        reviewedKeyCount: rows.filter(row => row.key).length,
        nullKeyCount: rows.filter(row => !row.key).length,
      });
      for (const row of rows) {
        if (row.key) expect(row.key).toMatchObject({ status: "reviewed", sourcePage });
        else expect(coverage.nullKeyLedger.find(item =>
          workbookAddressKey(item.address) === workbookAddressKey(row.address),
        )).toMatchObject({ sourcePage, registered: true, key: null });
      }
    }
    expect(coverage.counts).toMatchObject({
      exercises: 100, reviewedKeys: 94, unreviewedKeys: 0, nullKeys: 6, omittedInScopeAddresses: 0,
    });
    const countBySource = (onlyReviewed: boolean) => Object.fromEntries([2, 3, 4, 5].map(sourcePage => [
      String(sourcePage),
      onlyReviewed
        ? parsed.exercises.filter(row => row.key?.sourcePage === sourcePage).length
        : coverage.pageGroups.filter(group => group.answerBoxSourcePage === sourcePage)
          .reduce((sum, group) => sum + group.exerciseCount, 0),
    ]));
    expect(countBySource(true)).toEqual(coverage.counts.byReviewedKeySourcePage);
    expect(countBySource(false)).toEqual(coverage.counts.byAnswerBoxSourcePage);
    expect(coverage.scope.sourcePdfPagesVisuallyReviewed).toEqual([2, 3, 4, 5, 6]);
    expect(coverage.source.reviewedImages.map(page => page.sourcePage)).toEqual([2, 3, 4, 5, 6]);
    for (const page of coverage.source.reviewedImages) expect(page.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("locks all 28 arithmetic PLUS answers against the visually reviewed table, including OCR-joined 4/3 and 5/4", () => {
    expect(parsed.exercises.filter(row => row.address.page === "18~19").map(row => row.key?.answerText)).toEqual([
      "30", "21", "39", "3", "4", "18", "36", "20", "11", "75", "42", "30", "68", "39",
      "32", "23", "37", "38", "17", "13", "15", "88", "81", "17", "74", "28", "31", "66",
    ]);
  });

  it("preserves answer order, equation alternatives, units, operation order and distinct part markers", () => {
    const fixtures = [
      ["8", 2, "⑴ 28, 22; ⑵ 24, 47; ⑶ 14, 13; ⑷ 4, 73"],
      ["10", 2, "⑴ 24, 3; ⑵ 6, 12; ⑶ 9, 4; ⑷ 7, 35"],
      ["16", 2, "⑴ 15, 15, 3, 13, 3, 16; ⑵ 15, 45, 45, 5, 50"],
      ["20~21", 12, "−, +"],
      ["20~21", 14, "5+2×(8−4)=13"],
      ["22~23", 1, "❶ 6; ❷ 1, 2"],
      ["22~23", 3, "❶ (▲+7)×2−10=8; ❷ 2"],
      ["22~23", 5, "❶ (4500+2500÷5)−700×3=2900 (또는 (4500+2500÷5)−700×3); ❷ 2900"],
      ["22~23", 8, "8, 5, 3, 37 (또는 5, 8, 3, 37)"],
      ["24~26", 1, "㉢, ㉡, ㉠"],
      ["24~26", 2, "37−(12+11)=37−23=14 [① +, ② −]"],
      ["24~26", 15, "72−56÷(2+5)=64"],
      ["24~26", 17, "5000−(700+2000÷5×3)=3100 (또는 5000−(700+2000÷5×3)) / 3100원"],
    ] as const;
    for (const [page, number, answerText] of fixtures) expect(at(page, number).key?.answerText).toBe(answerText);
    expect(at("15", 1).key?.answerText).toContain("[① ÷, ② −, ③ +]");
    expect(at("17", 1).key?.answerText).toContain("[① +, ② ÷, ③ ×, ④ −]");
    expect(at("11", 3).key?.answerText).toBe("12, 3 / ≠");
  });

  it("keeps diagram, solution-reference and nonnumeric composite answers null with a complete ledger", () => {
    const expected = [
      ["20~21", "2", "diagram"], ["20~21", "6", "solution-reference"],
      ["22~23", "7", "non-numeric-response"], ["24~26", "5", "non-numeric-response"],
      ["24~26", "6", "diagram"], ["24~26", "18", "solution-reference"],
    ];
    expect(coverage.nullKeyLedger.map(item => [item.address.page, item.address.number, item.reason])).toEqual(expected);
    expect(parsed.exercises.filter(row => row.key === null).map(row => row.address)).toEqual(
      coverage.nullKeyLedger.map(item => item.address),
    );
    for (const item of coverage.nullKeyLedger) expect(item.note.length).toBeGreaterThan(20);
    expect(coverage.limitedAnswerReferences.map(item => item.address.number)).toEqual(["19", "20"]);
    expect(at("24~26", 19).key?.answerText).toBe("7개");
    expect(at("24~26", 20).key?.answerText).toBe("3개");
  });

  it("states partial coverage and manual reference use without claiming the full 72-page source", () => {
    expect(coverage.grading).toBe("manual-reference-only");
    expect(coverage.scope.wholeBook).toBe(false);
    expect(coverage.scope.allChapterAnswersPresent).toBe(false);
    expect(coverage.scope.textbookPages).toEqual(Array.from({ length: 19 }, (_, i) => i + 8));
    expect(coverage.scope.textbookPageLabels).toEqual(expectedGroups.map(([page]) => page));
    expect(coverage.source.pageCount).toBe(72);
    expect(coverage.outOfScope.map(area => [area.volume, area.pages])).toEqual([
      ["개념책", "1~7"], ["개념책", "27"], ["개념책", "28~152"], ["복습책", "1~80"], ["평가책", "1~52"],
    ]);
    expect(pack.coverage).toContain("8~26쪽");
    expect(pack.coverage).toContain("미수록 정답 6개");
    expect(parsed.provenance.description).toContain("수동 채점용");
  });
});
