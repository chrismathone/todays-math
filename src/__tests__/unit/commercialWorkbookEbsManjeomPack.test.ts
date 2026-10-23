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
import pack from "../../../data/commercial-workbooks/ebs-manjeom-e5-1-2026-v1.json";
import coverage from "../../../data/commercial-workbooks/ebs-manjeom-e5-1-2026-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({
  requestId: "ebs-manjeom-pack-review-20261024",
  metadata: pack.metadata,
  provenance: pack.provenance,
  exercises: pack.exercises,
});
const tsv = readFileSync(fileURLToPath(new URL(
  "../../../data/commercial-workbooks/ebs-manjeom-e5-1-2026-v1.tsv", import.meta.url,
)), "utf8");
const chapters = [
  "1. 자연수의 혼합 계산", "2. 약수와 배수", "3. 대응 관계",
  "4. 약분과 통분", "5. 분수의 덧셈과 뺄셈", "6. 다각형의 둘레와 넓이",
] as const;

// Independent census of the printed headings and final main numbers on PDF 2–17.
// Each tuple: chapter, printed textbook page label, main-question count, PDF page.
// Four groups continue on the next PDF page; those splits are asserted separately.
const book1Groups = [
  [1, "9", 3, 2], [1, "10~11", 11, 2], [1, "13", 3, 2],
  [1, "14~15", 11, 2], [1, "17", 3, 2], [1, "18~19", 11, 2], [1, "20~23", 20, 3],
  [2, "29", 4, 3], [2, "30~31", 11, 3], [2, "33", 3, 3], [2, "34~35", 11, 3],
  [2, "37", 3, 4], [2, "38~39", 11, 4], [2, "40~43", 20, 4],
  [3, "49", 5, 4], [3, "50~51", 11, 4], [3, "53", 4, 4], [3, "54~55", 11, 4],
  [3, "57", 4, 5], [3, "58~59", 11, 5], [3, "60~63", 20, 5],
  [4, "69", 3, 6], [4, "70~71", 11, 6], [4, "73", 3, 6], [4, "74~75", 11, 6],
  [4, "77", 4, 6], [4, "78~79", 11, 6], [4, "80~83", 20, 7],
  [5, "89", 3, 7], [5, "90~91", 11, 7], [5, "93", 2, 7], [5, "94~95", 11, 8],
  [5, "97", 3, 8], [5, "98~99", 11, 8], [5, "101", 2, 8], [5, "102~103", 11, 8],
  [5, "104~107", 20, 9],
  [6, "113", 2, 9], [6, "114~115", 11, 9], [6, "117", 3, 9], [6, "118~119", 11, 9],
  [6, "121", 2, 10], [6, "122~123", 11, 10], [6, "125", 3, 10], [6, "126~127", 11, 10],
  [6, "129", 3, 10], [6, "130~131", 11, 10], [6, "133", 3, 10], [6, "134~135", 11, 11],
  [6, "137", 3, 11], [6, "138~139", 11, 11], [6, "141", 3, 11], [6, "142~143", 11, 11],
  [6, "144~147", 20, 11],
] as const;
const book2Pages = [
  ["5", "6~8", "9~11", "12~13"], ["15", "16~18", "19~21", "22~23"],
  ["25", "26~28", "29~31", "32~33"], ["35", "36~38", "39~41", "42~43"],
  ["45", "46~48", "49~51", "52~53"], ["55", "56~58", "59~61", "62~63"],
] as const;
const groups = [
  ...book1Groups.map(([chapter, page, count, sourcePage]) => ({
    volume: "BOOK1 개념책", section: chapters[chapter - 1], page, count, sourcePage,
  })),
  ...book2Pages.flatMap((pages, chapterIndex) => pages.map((page, activityIndex) => ({
    volume: "BOOK2 실전책", section: chapters[chapterIndex], page,
    count: activityIndex === 0 || activityIndex === 3 ? 10 : 20,
    sourcePage: 12 + chapterIndex,
  }))),
];
const pad = (number: number) => String(number).padStart(2, "0");
const sourceAt = (volume: string, page: string, number: number, firstSource: number) => {
  if (volume === "BOOK2 실전책") return firstSource;
  const continuations: Record<string, readonly [number, number]> = {
    "18~19": [10, 3], "54~55": [4, 5], "102~103": [7, 9], "118~119": [7, 10],
  };
  const continuation = continuations[page];
  return continuation && number >= continuation[0] ? continuation[1] : firstSource;
};
const at = (volume: 1 | 2, page: string, number: string) => {
  const result = parsed.exercises.find(row => row.address.volume.startsWith(`BOOK${volume} `)
    && row.address.page === page && row.address.number === number);
  if (!result) throw new Error(`Missing BOOK${volume} ${page}/${number}`);
  return result;
};

describe("EBS 만점왕 수학 5-1 (2026): both complete quick-answer sections", () => {
  it("identifies the paper edition from official evidence without confusing its ebook ISBN or posting date", () => {
    expect(pack.id).toBe("ebs-manjeom-e5-1-2026-v1");
    expect(coverage.packId).toBe(pack.id);
    expect(parsed.metadata).toMatchObject({
      title: "만점왕 수학 5-1 (2026)", edition: "2026년판 · 2022개정",
      curriculum: "2022개정", isbn: "9788954795920", grade: "초등 5학년 1학기",
    });
    expect(parsed.provenance.kind).toBe("publisher");
    expect(coverage.source.sha256).toBe("5488c312b7212b3431010c1af7e83c262b9e983b66852b40ee356599d8dc5c11");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
    expect(coverage.source).toMatchObject({
      pageCount: 80, byteCount: 6076876, sourceListingDate: "2025-12-29", editionYear: "2026",
      publicationDateConfirmed: false, printingNumberConfirmed: false,
    });
    expect(coverage.source.editionEvidence.some(item => item.claims.some(claim => claim.includes("9788954796095")))).toBe(true);
    expect(coverage.source.editionEvidence.some(item => item.url.endsWith("courseId=100007146"))).toBe(true);
    for (const item of coverage.source.editionEvidence) expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("round-trips the UTF-8 TSV through the canonical parser, including every null and leading zero", () => {
    expect(tsv.split("\n")[0]).toBe("volume\tsection\tpage\tnumber\tsubpart\tanswerText\tkeyStatus\tsourcePage");
    const imported = parseWorkbookImport(tsv);
    expect(imported.issues).toEqual([]);
    expect(imported.exercises).toEqual(parsed.exercises);
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/);
    for (const line of tsv.trimEnd().split("\n").slice(1)) {
      const cells = line.split("\t");
      if (!cells[5]) expect(cells.slice(5)).toEqual(["", "", '""']);
    }
  });

  it("contains exactly the 818 printed main addresses in 78 groups, preserving page ranges and volume identity", () => {
    const expected = groups.flatMap(group => Array.from({ length: group.count }, (_, i) => ({
      volume: group.volume, section: group.section, page: group.page, number: pad(i + 1), subpart: "",
    })));
    expect(parsed.exercises.map(row => row.address)).toEqual(expected);
    expect(groups).toHaveLength(78);
    expect(parsed.exercises).toHaveLength(818);
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(new Set(parsed.exercises.map(row => workbookAddressKey(row.address))).size).toBe(818);
    expect(parsed.exercises.every(row => /^\d{2}$/.test(row.address.number))).toBe(true);
    expect(parsed.exercises.every(row => row.address.subpart === "")).toBe(true);
    expect(at(1, "9", "01").key?.answerText).toContain("28−6");
    expect(at(2, "9~11", "01").key?.answerText).toBe("⑴ 7; ⑵ 9");
  });

  it("checks every key and null source against printed groups, including all four cross-page continuations", () => {
    expect(coverage.pageGroups).toHaveLength(groups.length);
    const bySource: Record<string, number> = {};
    const reviewedBySource: Record<string, number> = {};
    for (const group of groups) {
      const rows = parsed.exercises.filter(row => row.address.volume === group.volume && row.address.page === group.page);
      const ledger = coverage.pageGroups.find(item => item.volume === group.volume && item.page === group.page);
      expect(ledger).toMatchObject({
        section: group.section, exerciseCount: group.count,
        expectedNumbers: Array.from({ length: group.count }, (_, i) => pad(i + 1)),
        reviewedKeyCount: rows.filter(row => row.key).length, nullKeyCount: rows.filter(row => !row.key).length,
      });
      const segmentAddresses = ledger!.answerSourceSegments.flatMap(segment =>
        Array.from({ length: segment.exerciseCount }, (_, i) => ({
          number: pad(Number(segment.firstNumber) + i), sourcePage: segment.sourcePage,
        })));
      expect(segmentAddresses).toEqual(rows.map((row, i) => ({
        number: row.address.number, sourcePage: sourceAt(group.volume, group.page, i + 1, group.sourcePage),
      })));
      for (const [index, row] of rows.entries()) {
        const sourcePage = sourceAt(group.volume, group.page, index + 1, group.sourcePage);
        bySource[sourcePage] = (bySource[sourcePage] ?? 0) + 1;
        if (row.key) {
          expect(row.key).toMatchObject({ sourcePage, status: "reviewed" });
          reviewedBySource[sourcePage] = (reviewedBySource[sourcePage] ?? 0) + 1;
        } else {
          expect(coverage.nullKeyLedger.find(item => workbookAddressKey(item.address) === workbookAddressKey(row.address)))
            .toMatchObject({ sourcePage, visuallyReviewedSourcePages: [sourcePage], key: null, registered: true });
        }
      }
    }
    expect(bySource).toEqual(coverage.counts.byAnswerSourcePage);
    expect(Object.values(bySource)).toEqual([40, 51, 57, 43, 43, 36, 33, 47, 49, 59, 60, 60, 60, 60, 60, 60]);
    expect(reviewedBySource).toEqual(coverage.counts.byReviewedKeySourcePage);
    expect(coverage.source.reviewedImages.map(item => item.sourcePage)).toEqual(Array.from({ length: 17 }, (_, i) => i + 2));
    for (const item of coverage.source.reviewedImages) expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("locks the entire null ledger rather than silently dropping graphical and solution-reference addresses", () => {
    // Codes: d = diagram; r = explicit solution reference; e = explanatory prose;
    // w = multi-method worked calculation. These are independent visual-review fixtures.
    const nullGroups: [1 | 2, string, string][] = [
      [1, "9", "02d"], [1, "10~11", "06d 11r"], [1, "14~15", "02d 11r"],
      [1, "18~19", "02d 11r"], [1, "20~23", "01d"], [1, "30~31", "11r"],
      [1, "34~35", "11r"], [1, "38~39", "11r"], [1, "49", "01d"],
      [1, "50~51", "04d 06e 11r"], [1, "54~55", "11r"], [1, "58~59", "03e 10e 11r"],
      [1, "60~63", "06d 18e"], [1, "69", "01d 02d"], [1, "70~71", "02d 11r"],
      [1, "74~75", "11r"], [1, "78~79", "11r"], [1, "80~83", "01d 12e"],
      [1, "90~91", "01d 11r"], [1, "93", "01d"], [1, "94~95", "03w 11r"],
      [1, "98~99", "05w 11r"], [1, "102~103", "02w 11r"], [1, "114~115", "04d 11r"],
      [1, "118~119", "06d 07d 10d 11r"], [1, "122~123", "11r"], [1, "126~127", "11r"],
      [1, "129", "01d"], [1, "130~131", "09d 11r"], [1, "133", "01d"],
      [1, "134~135", "09d 11r"], [1, "138~139", "11r"], [1, "142~143", "11r"],
      [2, "6~8", "03r 08r"], [2, "9~11", "07r 11r 12d"],
      [2, "16~18", "05r 17r"], [2, "19~21", "08r 15r"],
      [2, "26~28", "05e 10r 11e 20r"], [2, "29~31", "01d 10r 20r"],
      [2, "35", "01d"], [2, "36~38", "01d 02d 09r 12w 15r"], [2, "39~41", "01d 02d 10r 20r"],
      [2, "46~48", "08r 20r"], [2, "49~51", "16r 20r"],
      [2, "56~58", "08r 15r"], [2, "59~61", "05d 07r 20r"],
    ];
    for (const pages of book2Pages) nullGroups.push([
      2, pages[3], Array.from({ length: 10 }, (_, i) => `${pad(i + 1)}${pages[3] === "32~33" && [1, 4].includes(i + 1) ? "e" : "r"}`).join(" "),
    ]);
    const reasons: Record<string, string> = {
      d: "diagram", r: "solution-reference", e: "explanation-required", w: "worked-calculation",
    };
    const expected = nullGroups.flatMap(([volume, page, codes]) => codes.split(" ").map(code => ({
      address: at(volume, page, code.slice(0, 2)).address, reason: reasons[code[2]],
    }))).sort((a, b) => workbookAddressKey(a.address).localeCompare(workbookAddressKey(b.address)));
    const actual = coverage.nullKeyLedger.map(({ address, reason }) => ({ address, reason }))
      .sort((a, b) => workbookAddressKey(a.address).localeCompare(workbookAddressKey(b.address)));
    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(149);
    expect(parsed.exercises.filter(row => row.key === null).map(row => row.address)).toEqual(
      coverage.nullKeyLedger.map(row => row.address),
    );
    for (const item of coverage.nullKeyLedger) expect(item.note.length).toBeGreaterThan(30);
    // Both quick-answer cells contain final numbers, but also say 풀이 참조.
    expect(at(2, "6~8", "03").key).toBeNull(); // 19명 must not replace the full response.
    expect(at(2, "52~53", "07").key).toBeNull(); // 우체국 and 7/80 km likewise.
  });

  it("preserves independently reread fractions, mixed numbers, symbols, units, subparts and alternatives", () => {
    const fixtures: [1 | 2, string, string, string][] = [
      [1, "18~19", "10", "2, 3, 5, 4 (또는 3, 2, 5, 4) / 21"],
      [1, "33", "03", "⑴ (위에서부터) 3, 33, 5, 11 / 3, 9; ⑵ (위에서부터) 30, 3, 15, 3, 5 / 2, 3, 12"],
      [1, "54~55", "09", "◎×10=☆ 또는 ☆÷10=◎"],
      [1, "60~63", "11", "( ) ( ) (○)"],
      [1, "73", "01", "⑴ 2, 4; ⑵ 2, 4/6, 4, 2/3"],
      [1, "74~75", "07", "63/135, 60/135 / 21/45, 20/45"],
      [1, "78~79", "03", "18, 35, < / 49, 45, > / 14, 25, < / 7/9, 5/7, 2/5"],
      [1, "80~83", "18", "0.59, 14/25"],
      [1, "90~91", "09", "1 13/28 km"],
      [1, "94~95", "04", "⑴ 4 31/40; ⑵ 4 13/36"],
      [1, "94~95", "09", "35 3/10 kg"],
      [1, "98~99", "07", "(위에서부터) 2 27/56, 4 19/36"],
      [1, "102~103", "07", "3 59/72"],
      [1, "104~107", "19", "⑴ 1 7/8; ⑵ 1 7/8, 4 13/24; ⑶ 4 13/24, 2 2/3 / 2 2/3"],
      [1, "125", "03", "⑴ 70000; ⑵ 6; ⑶ 5000000; ⑷ 0.9"],
      [1, "130~131", "01", "㉠, ㉤"],
      [1, "144~147", "17", "⑴ 1, 8; ⑵ 8; ⑶ 17, 102 / 6 / 6 cm"],
      [2, "19~21", "03", "2, 3, 5, 7, 11, 13에 ○표"],
      [2, "36~38", "07", "2/6"], // Do not silently reduce the printed answer to 1/3.
      [2, "39~41", "19", "2 12/20, 2 13/20"],
      [2, "45", "05", "6 23/30, 8 6/35"],
      [2, "49~51", "07", "10 29/45"],
      [2, "49~51", "12", "⑴ 2 1/30; ⑵ 1 27/70"],
      [2, "55", "06", "⑴ 12; ⑵ 40000000"],
      [2, "59~61", "15", "350 cm² / 425 cm² / 775 cm²"],
      [2, "59~61", "18", "12 m²"],
    ];
    for (const [volume, page, number, expected] of fixtures) expect(at(volume, page, number).key?.answerText).toBe(expected);
    expect(at(1, "10~11", "05").key?.answerText).toBe("예: 26−(12+10)=4 (또는 26−(12+10)) / 4명");
  });

  it("reports full requested address coverage and partial reference keys with exact per-volume totals", () => {
    expect(coverage.counts).toMatchObject({
      exercises: 818, reviewedKeys: 669, nullKeys: 149, unreviewedKeys: 0,
      omittedInScopeAddresses: 0, pageGroups: 78,
      byVolume: {
        "BOOK1 개념책": { exercises: 458, reviewedKeys: 404, nullKeys: 54 },
        "BOOK2 실전책": { exercises: 360, reviewedKeys: 265, nullKeys: 95 },
      },
      nullReasons: { diagram: 30, "solution-reference": 106, "explanation-required": 9, "worked-calculation": 4 },
    });
    expect(parsed.exercises.filter(row => row.key?.status === "reviewed")).toHaveLength(669);
    expect(coverage.scope).toMatchObject({
      wholeRequestedQuickAnswerScope: true, allExpectedAddressesPresent: true,
      allAnswersPresent: false, wholeBookAddressAudit: false,
    });
    expect(coverage.scope.sourceQuickAnswerPages).toEqual(Array.from({ length: 16 }, (_, i) => i + 2));
    expect(coverage.grading).toBe("manual-reference-only");
    expect(pack.coverage).toContain("미수록 정답 149개");
    expect(coverage.outOfScope.map(item => item.sourcePages)).toEqual(["1", "18~80"]);
    expect(parsed.exercises.every(row => !row.key || !/풀이 참조|됩니다|이므로|때문/.test(row.key.answerText))).toBe(true);
  });
});
