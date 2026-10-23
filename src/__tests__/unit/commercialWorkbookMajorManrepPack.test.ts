// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  workbookCreateEditionSchema,
  type WorkbookAddress,
} from "@/contracts/commercialWorkbook.contract";
import {
  assertUniqueAddresses,
  parseWorkbookImport,
} from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/visang-typemanrep-m2-1-2022-v1.json";
import coverage from "../../../data/commercial-workbooks/visang-typemanrep-m2-1-2022-v1.coverage.json";

// Independently read from the 40 main page headers and 10 supplement headers.
const mainCensus = [
  [1, "8~11"],
  [45, "12~23"],
  [117, "24~26"],
  [137, "27"],
  [141, "28~31"],
  [194, "32~41"],
  [258, "42~44"],
  [276, "45"],
  [280, "46~47"],
  [303, "48~55"],
  [352, "56~58"],
  [370, "59"],
  [374, "62~65"],
  [422, "66~75"],
  [483, "76~78"],
  [501, "79"],
  [505, "80~81"],
  [510, "82~89"],
  [559, "90~92"],
  [577, "93"],
  [581, "94~97"],
  [612, "98~109"],
  [686, "110~112"],
  [704, "113"],
  [708, "114~115"],
  [713, "116~127"],
  [783, "128~130"],
  [804, "131"],
  [808, "134~137"],
  [846, "138~147"],
  [905, "148~150"],
  [924, "151"],
  [928, "152~153"],
  [946, "154~163"],
  [1004, "164~166"],
  [1022, "167"],
  [1026, "168~171"],
  [1061, "172~180"],
  [1114, "181~183"],
  [1133, "184"],
] as const;
const chapters = [
  "유리수와 순환소수",
  "단항식의 계산",
  "다항식의 계산",
  "일차부등식",
  "일차부등식의 활용",
  "연립일차방정식",
  "연립일차방정식의 활용",
  "일차함수와 그 그래프",
  "일차함수의 그래프의 성질과 활용",
  "일차함수와 일차방정식의 관계",
];
const activities = [
  "A 개념 확인",
  "B 유형 완성",
  "AB 유형 점검",
  "C 실력 향상",
];
const supplementPages = [
  "2~5",
  "6~9",
  "10~13",
  "14~17",
  "18~21",
  "22~25",
  "26~29",
  "30~33",
  "34~37",
  "38~41",
];
const parsed = workbookCreateEditionSchema.parse({
  requestId: "major-manrep-20261024",
  metadata: pack.metadata,
  provenance: pack.provenance,
  exercises: pack.exercises,
});
const mainKey = (n: number) => parsed.exercises[n - 1].key?.answerText;
const bookKey = (chapter: number, n: number) =>
  parsed.exercises[1136 + (chapter - 1) * 25 + n - 1].key?.answerText;
const diagramNumbers = [
  406, 407, 408, 409, 836, 837, 844, 845, 1031, 1036, 1037, 1038, 1039, 1049,
  1050, 1053, 1054,
].map((n) => String(n).padStart(4, "0"));

describe("Visang Type Manrep complete solution-source addresses", () => {
  it("strictly parses and exactly round-trips the TSV without invalid glyphs", () => {
    const tsv = readFileSync(
      new URL(
        `../../../data/commercial-workbooks/${pack.id}.tsv`,
        import.meta.url,
      ),
      "utf8",
    );
    expect(parseWorkbookImport(tsv)).toEqual({
      exercises: parsed.exercises,
      issues: [],
    });
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(1386);
    expect(tsv).not.toMatch(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/,
    );
  });
  it("matches all main numbers and every independently restarted supplement chapter", () => {
    const expected: WorkbookAddress[] = mainCensus.flatMap(([start, page], i) =>
      Array.from(
        { length: (mainCensus[i + 1]?.[0] ?? 1137) - start },
        (_, j) => ({
          volume: "",
          section: `${String(Math.floor(i / 4) + 1).padStart(2, "0")} ${chapters[Math.floor(i / 4)]} / ${activities[i % 4]}`,
          page,
          number: String(start + j).padStart(4, "0"),
          subpart: "",
        }),
      ),
    );
    expected.push(
      ...supplementPages.flatMap((page, i) =>
        Array.from({ length: 25 }, (_, j) => ({
          volume: "기출 BOOK",
          section: `${String(i + 1).padStart(2, "0")} ${chapters[i]}`,
          page,
          number: String(j + 1),
          subpart: "",
        })),
      ),
    );
    expect(parsed.exercises.map((e) => e.address)).toEqual(expected);
    expect(
      coverage.pageGroups.flatMap((g) =>
        g.expectedNumbers.map((number) => ({
          volume: g.volume,
          section: g.section,
          page: g.page,
          number,
          subpart: "",
        })),
      ),
    ).toEqual(expected);
    expect(coverage.pageGroups).toHaveLength(50);
    expect(coverage.scope).toMatchObject({
      wholeRequestedSolutionScope: true,
      sourcePdfPages: [2, 114],
      allExpectedAddressesPresent: true,
      allAnswersPresent: false,
      wholeBookAddressAudit: false,
    });
  });
  it("accounts for each of the 17 diagram exclusions and every reviewed source region", () => {
    expect(coverage.counts).toMatchObject({
      exercises: 1386,
      reviewedKeys: 1369,
      nullKeys: 17,
      choiceKeys: 557,
      unreviewedKeys: 0,
      omittedInScopeAddresses: 0,
    });
    const missing = parsed.exercises.filter((e) => !e.key);
    expect(missing.map((e) => e.address.number)).toEqual(diagramNumbers);
    expect(missing.map((e) => e.address)).toEqual(
      coverage.nullKeyLedger.map((e) => e.address),
    );
    for (const entry of coverage.nullKeyLedger) {
      expect(entry.reason).toBe("diagram-answer");
      expect(entry.sourcePage).toBeGreaterThanOrEqual(27);
      expect(entry.bbox).toHaveLength(4);
      expect(entry.image).toBe(`followup/answer-${entry.address.number}.png`);
      expect(entry.key).toBeNull();
    }
    expect(coverage.reviewedRegions).toHaveLength(1386);
    parsed.exercises.forEach((e, i) => {
      const region = coverage.reviewedRegions[i];
      expect(region.number).toBe(e.address.number);
      expect(region.keyReviewed).toBe(Boolean(e.key));
      if (e.key) {
        expect(e.key.status).toBe("reviewed");
        expect(e.key.sourcePage).toBe(region.sourcePage);
        expect(e.key.sourcePage).toBeGreaterThanOrEqual(2);
        expect(e.key.sourcePage).toBeLessThanOrEqual(114);
      }
    });
    for (const [page, count] of Object.entries(
      coverage.counts.byAnswerSourcePage,
    ))
      expect(
        parsed.exercises.filter((e) => e.key?.sourcePage === Number(page)),
      ).toHaveLength(count);
    expect(
      parsed.exercises.filter(
        (e) => e.key && /^[①②③④⑤]$/.test(e.key.answerText),
      ),
    ).toHaveLength(557);
    expect(
      parsed.exercises.filter((e) => e.key?.answerText.includes("풀이 참조")),
    ).toHaveLength(0);
  });
  it("pins official metadata, immutable PDF hash and all external review sheets", () => {
    expect(coverage.source.sha256).toBe(
      "fd8960c4f3bb09c060d3575c85275078e0581bf0ac0aaf985018b24cec4b79b6",
    );
    expect(pack.provenance.description).toContain(coverage.source.sha256);
    expect(pack.provenance.reference).toContain(
      "https://book.visang.com/books/info/5738",
    );
    expect(pack.provenance.reference).toContain(
      "https://cdn.visang.com/book/202505/20250512175755316.pdf",
    );
    expect(pack.metadata.isbn).toBe("979-11-7316-400-2");
    expect(coverage.source.editionClaims).toMatchObject({
      curriculum: "2022개정",
      printingNumberConfirmed: false,
      publicationDateConfirmed: false,
    });
    expect(coverage.source.reviewedImages).toHaveLength(61);
    expect(
      coverage.source.reviewedImages.every((e) =>
        /^[a-f0-9]{64}$/.test(e.sha256),
      ),
    ).toBe(true);
    expect(coverage.grading).toBe("manual-reference-only");
  });
  it("preserves recurring decimals, powers, inequalities, tables, choices and units throughout both volumes", () => {
    const checks: [number, string][] = [
      [1, "0.333…, 무한소수"],
      [3, "-1.25, 유한소수"],
      [9, "86, 1.8̇6̇"],
      [12, "5432, 2.5̇432̇"],
      [35, "1027/198"],
      [95, "⑴ p=90, q=11 ⑵ 0.12̇"],
      [141, "2^9"],
      [142, "a^8"],
      [156, "1/x^4"],
      [162, "-27x^12"],
      [266, "3x^12y^5"],
      [283, "(17x+11y)/6"],
      [362, "33xy-8y^2"],
      [370, "(9/14 a+2/7 b)원"],
      [466, "x≤3"],
      [479, "5≤a<7"],
      [481, "1/2≤a<1"],
      [527, "x≥10"],
      [549, "7/8 km"],
      [566, "53 개"],
      [567, "350 MB"],
      [
        591,
        "표 x: 1, 2, 3, 4, 5, 6; y: 17, 13, 9, 5, 1, -3; (1, 17), (2, 13), (3, 9), (4, 5), (5, 1)",
      ],
      [603, "x=-1/2, y=3"],
      [621, "⑴ 30x+15y=180; ⑵ (1, 10), (2, 8), (3, 6), (4, 4), (5, 2)"],
      [708, "⑴ {x+y=84, x-y=8}; ⑵ x=46, y=38; ⑶ 38, 46"],
      [766, "371"],
      [801, "121 cm^2"],
      [825, "y=10/x, 일차함수가 아니다."],
      [924, "⑴ A(a, 2a), 선분 AB=2a; ⑵ 3; ⑶ 36"],
      [961, "-5≤a≤-2/3"],
      [981, "⑴ y=4+4x; ⑵ 64°C; ⑶ 24분 후"],
      [1012, "y=100-(1/274)x"],
      [1018, "20°C"],
      [1089, "⑴ 직선 l: y=-x+2, 직선 m: y=2x-3; ⑵ (5/3, 1/3)"],
      [1136, "-4"],
    ];
    for (const [n, answer] of checks)
      expect(mainKey(n), `main #${n}`).toBe(answer);
    expect(mainKey(509)).toContain("⑵ x/3+x/4≤3; ⑶ x≤36/7; ⑷ 36/7 km");
    expect(mainKey(595)).toContain("⑶ (1, 4)");
    expect(mainKey(711)).toContain("⑷ 8km, 2km");
    expect(mainKey(712)).toContain("⑷ 남학생: 250, 여학생: 300");
    const supplementChecks: [number, number, string][] = [
      [1, 7, "86"],
      [1, 17, "a=14, b=134, c=45"],
      [2, 11, "2^14 배"],
      [2, 19, "-6x^11"],
      [3, 15, "A=10x-5xy+25y, B=12x^4y^2-6x^4y^3+30x^3y^3"],
      [4, 1, "T"],
      [4, 13, "x≥9"],
      [4, 25, "a≥-5/2"],
      [5, 24, "2.1 km"],
      [6, 14, "x=-24, y=-8"],
      [7, 20, "616"],
      [8, 23, "15/2"],
      [9, 25, "90 mL"],
      [10, 24, "17/4"],
      [10, 25, "④"],
    ];
    for (const [chapter, n, answer] of supplementChecks)
      expect(bookKey(chapter, n), `supplement ${chapter} #${n}`).toBe(answer);
  });
});
