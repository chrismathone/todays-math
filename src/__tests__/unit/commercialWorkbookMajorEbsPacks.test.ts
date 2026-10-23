// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import math1 from "../../../data/commercial-workbooks/ebs-suneung-2027-math1-v1.json";
import math2 from "../../../data/commercial-workbooks/ebs-suneung-2027-math2-v1.json";
import coverage1 from "../../../data/commercial-workbooks/ebs-suneung-2027-math1-v1.coverage.json";
import coverage2 from "../../../data/commercial-workbooks/ebs-suneung-2027-math2-v1.coverage.json";

// Independent visual census of EVERY printed answer panel, including its final
// number and page range. Colon tokens are literal numeric answers; others are circles.
const expected1 = [
  ["5~13",2,"1 3 :125 4 1 2 5 3 3 1"], ["14~15",3,"5 5 2 5 :100 :5 5 5 1 3"],
  ["16~17",4,"4 4 5 1 2 1 4 5"], ["18",6,"5 3 3"],
  ["21~29",8,"2 3 5 4 4 2 2 4 3 :2"], ["30~31",10,"3 4 2 5 5 4 2 :27"],
  ["32~33",11,"5 4 3 :3 3 5 :7 3"], ["34",13,"5 1 2"],
  ["37~45",15,"4 :4 2 5 :5 :5 1 3 2 4"], ["46~47",17,"1 2 4 3 1 3 1 4"],
  ["48~49",19,"2 2 2 3 4 2 4 4"], ["50",23,"5 3 4"],
  ["53~59",27,"4 3 5 :6 :2 5 :2 3"], ["60~62",29,"1 4 2 1 3 1 5 2 1 2 5 4"],
  ["63~65",32,"5 2 3 2 4 1 3 4 3 5 1"], ["66",37,"3 2 :20"],
  ["69~77",40,"1 3 3 :9 2 1 2 5 2 4"], ["78~79",42,"1 2 4 3 5 3 1 5"],
  ["80~81",44,"2 1 1 :4 2 1 :330 :129"], ["82",47,"5 :80 4"],
  ["85~95",48,":93 5 5 1 1 :4 4 3 4 :30 2"], ["96~97",51,"2 2 3 2 1 4 2 5"],
  ["98~99",52,"2 3 :27 5 1 5 4"], ["100",55,"1 5 1"],
] as const;
const expected2 = [
  ["5~11",2,"2 2 1 :24 5 2 1 3"], ["12~13",3,"3 3 3 1 2 5 4 4"],
  ["14~15",5,"2 4 1 :16 :51 2 2"], ["16",8,"2 :7 2"],
  ["19~25",10,"4 4 3 :2 4 5"], ["26~27",12,"5 3 2 1 1 1 5 4"],
  ["28~29",13,"1 4 :12 2 4 3 3"], ["30",17,":39 3 :44"],
  ["33~39",20,":10 :3 :3 :6 4 1"], ["40~41",21,"4 :2 5 4 1 2 2"],
  ["42~43",23,"4 2 3 3 :20 :7 2 2"], ["44",26,"2 2 :248"],
  ["47~53",29,"1 5 :2 :7 3 2"], ["54~55",30,"4 1 3 3 2 2 5 :8"],
  ["56~57",32,"1 1 :31 1 :7 :48 1"], ["58",36,"2 3 5"],
  ["61~67",39,":48 1 :32 3 4 5 :12"], ["68~69",40,"1 1 2 4 3 2 4 2"],
  ["70~71",42,"3 2 3 :52 1 :6 2"], ["72",45,"3 1 5"],
  ["75~81",48,"1 2 :8 5 4 4 2"], ["82~83",50,"4 3 5 3 2 2 1 2"],
  ["84~85",51,"1 1 3 2 3 3 4 1"], ["86",53,"5 4 :164"],
  ["89~95",56,"1 2 2 4"], ["96~97",57,"1 :27 4 5 4 2 2 4"],
  ["98~99",59,"3 5 2 :90 4 3 4"], ["100",62,"3 1 3"],
] as const;
const chapters = [
  ["지수와 로그", "지수함수와 로그함수", "삼각함수", "사인법칙과 코사인법칙", "등차수열과 등비수열", "수열의 합과 수학적 귀납법"],
  ["함수의 극한", "함수의 연속", "미분계수와 도함수", "도함수의 활용 ⑴", "도함수의 활용 ⑵", "부정적분과 정적분", "정적분의 활용"],
];
const labels = ["유제", "Level 1 기초 연습", "Level 2 기본 연습", "Level 3 실력 완성"];
for (const [bookIndex, pack, coverage, expected, total, choices, isbn] of [
  [0,math1,coverage1,expected1,181,158,"9788954798204"],
  [1,math2,coverage2,expected2,171,140,"9788954798211"],
] as const) describe(pack.id, () => {
  const parsed = workbookCreateEditionSchema.parse({requestId:"major-ebs-audit-20261024",metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
  it("strictly parses and exactly round-trips TSV without changing addresses or answers", () => {
    const tsv = readFileSync(new URL(`../../../data/commercial-workbooks/${pack.id}.tsv`,import.meta.url),"utf8");
    expect(parseWorkbookImport(tsv)).toEqual({exercises:parsed.exercises,issues:[]});
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
  });
  it("matches every printed address and visually reread answer, not just samples", () => {
    const rows = expected.flatMap(([page,sourcePage,answers], index) => answers.split(" ").map((token,n) => ({
      address:{volume:"",section:`${String(Math.floor(index/4)+1).padStart(2,"0")} ${chapters[bookIndex][Math.floor(index/4)]} / ${labels[index%4]}`,page,number:String(n+1),subpart:""},
      key:{answerText:token.startsWith(":")?token.slice(1):"①②③④⑤"[Number(token)-1],status:"reviewed",sourcePage},
    })));
    expect(parsed.exercises).toEqual(rows);
    expect(rows).toHaveLength(total);
    expect(coverage.pageGroups.map(g=>[g.page,g.sourcePage,g.exerciseCount])).toEqual(expected.map(([page,pdf,answers])=>[page,pdf,answers.split(" ").length]));
  });
  it("keeps paper ISBN, provenance, image evidence and separate counts", () => {
    expect(parsed.metadata.isbn).toBe(isbn);
    expect(parsed.metadata.edition).toBe("2027학년도 수능 대비 · 공식 2026년 자료");
    expect(parsed.metadata).not.toHaveProperty("curriculum");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
    expect(coverage.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(coverage.counts).toMatchObject({exercises:total,reviewedKeys:total,nullKeys:0,unreviewedKeys:0,choiceKeys:choices,omittedInScopeAddresses:0});
    expect(coverage.nullKeyLedger).toEqual([]);
    expect(coverage.source.reviewedImages).toHaveLength(expected.length);
    for (const item of coverage.source.reviewedImages) expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(coverage.scope.allExpectedAddressesPresent).toBe(true);
    expect(coverage.scope.wholeBookAddressAudit).toBe(false);
  });
});
