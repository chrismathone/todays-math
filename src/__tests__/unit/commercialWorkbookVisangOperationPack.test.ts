// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport, workbookAddressKey } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/visang-26711-2022-full-v1.json";
import coverage from "../../../data/commercial-workbooks/visang-26711-2022-full-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({
  requestId: "visang-operation-reviewed-20261024",
  metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises,
});
const tsv = readFileSync(fileURLToPath(new URL(
  "../../../data/commercial-workbooks/visang-26711-2022-full-v1.tsv", import.meta.url,
)), "utf8");
const chapters = [
  "1. 자연수의 혼합 계산", "2. 약수와 배수", "3. 대응 관계",
  "4. 약분과 통분", "5. 분수의 덧셈과 뺄셈", "6. 다각형의 둘레와 넓이",
];

// Independently recorded printed page/number boundaries from the page images.
// These are actual textbook labels, not page positions inferred from an array.
const imageInventory: [number, string][] = [
  [2, "8:1-14 9:15-28 10:1-14 11:15-28 12:1-14 13:15-28"],
  [3, "14:1-14 15:15-28 16:1-10 17:11-19 18:1-14 19:15-28 20:1-14 21:15-28"],
  [4, "22:1-14 23:15-28 24:1-14 25:15-28 26:1-7 27:8-21"],
  [5, "28:1-14 29:15-28 30:1-10 31:11-17 32:1-14 33:15-25"],
  [6, "36:1-3 37:4-15 38:1-12 39:13-24 40:1-3 41:4-15 42:1-12 43:13-24"],
  [7, "44:1-4 45:5-16 46:1-4 47:5-10 48:1-8 49:9-16"],
  [8, "50:1-8 51:9-16 52:1-8 53:9-16 54:1-8 55:9-16"],
  [9, "56:1-4 57:5-10 58:1-8 59:9-16 60:1-8 61:9-16"],
  [10, "62:1-8 63:9-16 64:1-8 65:9-16 66:1-6 67:7-14"],
  [11, "68:1-12 69:13-20 72:1-3 73:4-6"],
  [12, "74:1-3 75:4-6 76:1-3 77:4-6 78:1-6 79:7-12"],
  [13, "82:1-10 83:11-20 84:1-14 85:15-28 86:1-8 87:9-29"],
  [14, "88:1-14 89:15-28 90:1-7 91:8-14 92:1-14 93:15-28"],
  [15, "94:1-7 95:8-14 96:1-21 97:22-42 98:1-10 99:11-24"],
  [16, "100:1-5 101:6-26 102:1-12 103:13-25"],
  [17, "106:1-14 107:15-35 108:1-21 109:22-42"],
  [18, "110:1-14 111:15-35 112:1-21 113:22-42"],
  [19, "114:1-14 115:15-35 116:1-21 117:22-42 118:1-8 119:9-17"],
  [20, "120:1-14 121:15-35 122:1-21 123:22-42"],
  [21, "124:1-14 125:15-35 126:1-21 127:22-42"],
  [22, "128:1-14 129:15-35 130:1-21 131:22-42 132:1-8 133:9-17"],
  [23, "134:1-6 135:7-16 136:1-14 137:15-25"],
  [24, "140:1-4 141:5-12 142:1-8 143:9-16 144:1-4 145:5-12 146:1-6 147:7-20"],
  [25, "148:1-14 149:15-28 150:1-4 151:5-12 152:1-8 153:9-16 154:1-4 155:5-12"],
  [26, "156:1-8 157:9-16 158:1-4 159:5-12 160:1-8 161:9-16 162:1-4 163:5-12 164:1-8 165:9-16"],
  [27, "166:1-4 167:5-12 168:1-8 169:9-16 170:1-12 171:13-20"],
  [28, "1:1-16 2:1-16 3:1-16 4:1-16 5:1-16 7:1-12"],
  [29, "8:1-12 9:1-6 10:1-8 11:1-8 12:1-6 13:1-8 14:1-8"],
  [30, "15:1-4 16:1-4 17:1-3 19:1-12 20:1-12 21:1-12 22:1-21"],
  [31, "23:1-21 25:1-21 26:1-21 27:1-21 28:1-21 29:1-21"],
  [32, "30:1-21 31:1-8 32:1-8 33:1-16 34:1-8 35:1-8 36:1-8 37:1-8 38:1-8"],
];
const expectedGroups = imageInventory.flatMap(([sourcePage, labels]) => labels.split(" ").map(label => {
  const [page, firstNumber, lastNumber] = label.split(/[:-]/).map(Number);
  const main = sourcePage < 28;
  const chapterIndex = (main ? [33, 69, 79, 103, 137, 171] : [5, 14, 17, 23, 30, 38])
    .findIndex(end => page <= end);
  return { volume: main ? "메인 북" : "클리닉 북", section: chapters[chapterIndex],
    page: String(page), firstNumber, lastNumber, sourcePage };
}));
const at = (volume: string, page: number, number: number) => {
  const row = parsed.exercises.find(r => r.address.volume === volume
    && r.address.page === String(page) && r.address.number === String(number));
  if (!row) throw new Error(`Missing ${volume}/${page}/${number}`);
  return row;
};

describe("Visang operation 26711: full main and clinic answer scope", () => {
  it("identifies the official product independently of archive/production years", () => {
    expect(Object.keys(pack).sort()).toEqual(["coverage", "exercises", "id", "label", "metadata", "provenance"]);
    expect(pack.id).toBe("visang-26711-2022-full-v1");
    expect(coverage.packId).toBe(pack.id);
    expect(parsed.metadata).toEqual({
      title: "개념플러스연산 라이트 초등 수학 5-1 (22 개정)", publisher: "비상교육",
      grade: "초등 5학년 1학기", curriculum: "2022개정",
      edition: "2026년 학습 · 2022개정", isbn: "979-11-7316-354-8",
    });
    expect(parsed.provenance.kind).toBe("publisher");
    expect(parsed.provenance.reference).toBe("https://book.visang.com/books/info/5765\nhttps://cdn.visang.com/book/202506/20250623163004477.pdf");
    expect(coverage.source.sourceListingYear).toBe("2025");
    expect(coverage.source.productLearningYear).toBe("2026");
    expect(coverage.editionEvidence.printingOrImpressionDate).toBeNull();
    expect(coverage.source.sha256).toBe("01e9f604de6a07e806eeb1663257ff6f000fb3536a9d7d16581d7d29876c394b");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
    expect(coverage.source.byteCount).toBe(15397939);
    expect(coverage.source.pageCount).toBe(32);
  });

  it("round-trips every UTF-8 TSV row through the canonical importer", () => {
    const result = parseWorkbookImport(tsv);
    expect(result.issues).toEqual([]);
    expect(result.exercises).toEqual(parsed.exercises);
    expect(parsed.exercises).toHaveLength(2138);
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/);
    expect(Buffer.byteLength(tsv, "utf8")).toBeLessThan(2_000_000);
    expect(JSON.stringify(parsed.exercises).length).toBeLessThan(2_000_000);
    expect(parsed.exercises.length).toBeLessThanOrEqual(5000);
  });

  it("contains exactly all 2138 five-field addresses, preserving continued numbering", () => {
    const expected = expectedGroups.flatMap(({ volume, section, page, firstNumber, lastNumber }) =>
      Array.from({ length: lastNumber - firstNumber + 1 }, (_, i) => ({
        volume, section, page, number: String(firstNumber + i), subpart: "",
      })));
    expect(parsed.exercises.map(r => r.address)).toEqual(expected);
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(new Set(parsed.exercises.map(r => workbookAddressKey(r.address))).size).toBe(2138);
    expect(parsed.exercises.filter(r => r.address.volume === "메인 북")).toHaveLength(1703);
    expect(parsed.exercises.filter(r => r.address.volume === "클리닉 북")).toHaveLength(435);
    for (const page of [34, 35, 70, 71, 80, 81, 104, 105, 138, 139, 172])
      expect(parsed.exercises.some(r => r.address.volume === "메인 북" && r.address.page === String(page))).toBe(false);
    for (const page of [6, 18, 24, 39, 40])
      expect(parsed.exercises.some(r => r.address.volume === "클리닉 북" && r.address.page === String(page))).toBe(false);
  });

  it("maps every group, key and withheld answer to its 1-indexed PDF source page", () => {
    expect(coverage.pageGroups).toHaveLength(189);
    for (const expected of expectedGroups) {
      const matching = parsed.exercises.filter(r => r.address.volume === expected.volume && r.address.page === expected.page);
      const group = coverage.pageGroups.find(g => g.volume === expected.volume && g.page === expected.page);
      expect(group).toMatchObject({ volume: expected.volume, section: expected.section, page: expected.page,
        firstNumber: expected.firstNumber, lastNumber: expected.lastNumber,
        exerciseCount: expected.lastNumber - expected.firstNumber + 1,
        reviewedKeyCount: matching.filter(r => r.key).length, nullKeyCount: matching.filter(r => !r.key).length,
        answerBoxSourcePage: expected.sourcePage, visuallyReviewedSourcePages: [expected.sourcePage] });
      for (const row of matching) {
        if (row.key) expect(row.key).toMatchObject({ status: "reviewed", sourcePage: expected.sourcePage });
        else expect(coverage.nullKeyLedger.find(n => workbookAddressKey(n.address) === workbookAddressKey(row.address)))
          .toMatchObject({ sourcePage: expected.sourcePage, registered: true, key: null });
      }
    }
    for (const [sourcePage] of imageInventory) {
      expect(coverage.counts.byAnswerBoxSourcePage[String(sourcePage) as keyof typeof coverage.counts.byAnswerBoxSourcePage])
        .toBe(expectedGroups.filter(g => g.sourcePage === sourcePage).reduce((sum, g) => sum + g.lastNumber - g.firstNumber + 1, 0));
      expect(coverage.counts.byReviewedKeySourcePage[String(sourcePage) as keyof typeof coverage.counts.byReviewedKeySourcePage])
        .toBe(parsed.exercises.filter(r => r.key?.sourcePage === sourcePage).length);
    }
    expect(coverage.scope.sourcePdfPagesVisuallyReviewed).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
    expect(coverage.source.reviewedImages.map(p => p.sourcePage)).toEqual(coverage.scope.sourcePdfPagesVisuallyReviewed);
    expect(new Set(coverage.source.reviewedImages.map(p => p.sha256)).size).toBe(32);
    for (const page of coverage.source.reviewedImages) expect(page.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("withholds the entire ladder answer, never just its diagram or intermediate values", () => {
    const expectedNulls = [
      ["메인 북", 53, 9, 16], ["메인 북", 54, 1, 8], ["메인 북", 55, 9, 16],
      ["메인 북", 63, 9, 16], ["메인 북", 64, 1, 8], ["메인 북", 65, 9, 16],
      ["메인 북", 66, 4, 6], ["클리닉 북", 11, 1, 8], ["클리닉 북", 14, 1, 8],
    ] as const;
    const expected = expectedNulls.flatMap(([volume, page, first, last]) =>
      Array.from({ length: last - first + 1 }, (_, i) => at(volume, page, first + i).address));
    expect(parsed.exercises.filter(r => r.key === null).map(r => r.address)).toEqual(expected);
    expect(coverage.nullKeyLedger.map(n => n.address)).toEqual(expected);
    expect(expected).toHaveLength(67);
    for (const entry of coverage.nullKeyLedger) {
      expect(entry.reason).toBe("unsupported-notation");
      expect(entry.note).toContain("세로 나눗셈표");
      expect(entry.visuallyReviewedSourcePages).toEqual([entry.sourcePage]);
    }
  });

  it("locks independent visual fixtures for split columns, examples, symbols, mixed numbers and units", () => {
    const fixtures = [
      ["메인 북", 17, 19, "16, 3, 4, 12", 3],
      ["메인 북", 27, 8, "29", 4],
      ["메인 북", 31, 17, "40, 4, 6, 3, 10", 5],
      ["메인 북", 39, 18, "1, 2, 3, 4, 6, 8, 12, 16, 24, 48", 6],
      ["메인 북", 45, 11, "×", 7],
      ["메인 북", 49, 11, "예: 2×13, 2×2×13 / 26", 7],
      ["메인 북", 79, 10, "▲×42=■ 또는 ■÷42=▲", 12],
      ["메인 북", 85, 26, "7/42, 2/12, 1/6", 13],
      ["메인 북", 88, 9, "6/36, 4/24, 3/18, 2/12, 1/6", 14],
      ["메인 북", 99, 24, "1/1000", 15],
      ["메인 북", 103, 24, "=", 16],
      ["메인 북", 109, 42, "119/144", 17],
      ["메인 북", 113, 40, "1 17/100", 18],
      ["메인 북", 119, 17, "4 1/2, 7 3/5, 12 1/10", 19],
      ["메인 북", 125, 32, "17/60", 21],
      ["메인 북", 131, 42, "2 77/120", 22],
      ["메인 북", 135, 16, "2 31/48, 2 31/48", 23],
      ["메인 북", 149, 21, "1620000", 25],
      ["메인 북", 153, 13, "4 m²", 25],
      ["메인 북", 171, 20, "63 m²", 27],
      ["클리닉 북", 3, 12, "160", 28],
      ["클리닉 북", 10, 3, "예: 2×2×2×2×2, 2×2×5 / 4", 29],
      ["클리닉 북", 19, 7, "4/8, 2/4, 1/2", 30],
      ["클리닉 북", 23, 13, "=", 31],
      ["클리닉 북", 27, 9, "6 65/84", 31],
      ["클리닉 북", 29, 21, "4 11/120", 31],
      ["클리닉 북", 30, 19, "1 53/78", 32],
      ["클리닉 북", 33, 12, "2500000", 32],
      ["클리닉 북", 37, 1, "18 cm²", 32],
      ["클리닉 북", 38, 1, "10 cm²", 32],
    ] as const;
    for (const [volume, page, number, answerText, sourcePage] of fixtures)
      expect(at(volume, page, number).key).toEqual({ answerText, sourcePage, status: "reviewed" });
    expect(at("메인 북", 30, 1).key?.answerText).toBe("33, 15");
    expect(at("클리닉 북", 30, 1).key?.answerText).toBe("19/20");
  });

  it("states full address coverage and partial teacher-reference text honestly", () => {
    expect(coverage.counts).toMatchObject({ exercises: 2138, reviewedKeys: 2071,
      unreviewedKeys: 0, nullKeys: 67, omittedInScopeAddresses: 0, pageGroups: 189 });
    expect(coverage.counts.byVolume).toEqual({
      "메인 북": { exercises: 1703, reviewedKeys: 1652, nullKeys: 51, pageGroups: 154 },
      "클리닉 북": { exercises: 435, reviewedKeys: 419, nullKeys: 16, pageGroups: 35 },
    });
    expect(coverage.scope).toMatchObject({ wholeBook: true, allAnswerAddressesPresent: true,
      allAnswersTranscribed: false, addressCoverage: "full", answerTextCoverage: "partial" });
    expect(coverage.grading).toBe("manual-reference-only");
    expect(pack.coverage).toContain("미수록 정답 67개");
    expect(parsed.provenance.description).toContain("수동 채점 참조용");
    expect(parsed.exercises.filter(r => r.key)).toHaveLength(2071);
  });
});
