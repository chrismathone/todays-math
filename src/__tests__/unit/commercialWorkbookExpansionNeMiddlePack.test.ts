// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/ne-middle1-kwon-evaluation-2022-v1.json";
import coverage from "../../../data/commercial-workbooks/ne-middle1-kwon-evaluation-2022-v1.coverage.json";
const parsed = workbookCreateEditionSchema.parse({ requestId: "ne-middle1-expansion-20261024", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
// Independent inventory read from all 18 printed quick-answer boxes, not generated from pack rows.
const inventory: [string, string, number, number][] = [
 ["2~3","1. 소인수분해",14,1], ["4~5","2. 정수와 유리수",14,2], ["6~9","",24,2],
 ["10~11","1. 문자의 사용과 식",15,5], ["12~13","2. 일차방정식",14,6], ["14~17","",24,7],
 ["18~19","1. 좌표평면과 그래프",13,10], ["20~21","2. 정비례와 반비례",14,11], ["22~25","",23,12],
 ["26~27","1. 기본 도형",14,15], ["28~29","2. 작도와 합동",12,16], ["30~33","",24,17],
 ["34~35","1. 평면도형의 성질",15,19], ["36~37","2. 입체도형의 성질",13,20], ["38~41","",24,21],
 ["42~43","1. 대푯값",12,24], ["44~45","2. 도수분포표와 상대도수",9,25], ["46~49","",18,25],
];
const at = (page: string, number: string) => parsed.exercises.find(row => row.address.page === page && row.address.number === number)!;
describe("NE middle 1 Kwon evaluation official answer pack", () => {
 it("round-trips exact canonical rows, including null keys and printed page ranges", () => {
  const tsv = readFileSync(fileURLToPath(new URL("../../../data/commercial-workbooks/ne-middle1-kwon-evaluation-2022-v1.tsv", import.meta.url)), "utf8");
  const imported = parseWorkbookImport(tsv);
  expect(imported.issues).toEqual([]);
  expect(imported.exercises).toEqual(parsed.exercises);
  expect(parsed.exercises).toEqual(pack.exercises);
  expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
  expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
 });
 it("covers every independent printed number with exactly one source address", () => {
  const expected = inventory.flatMap(([page, sub, count]) => Array.from({length: count}, (_, i) => ({volume:"평가문제집",section:sub ? `${sub} / 중단원 마무리 평가` : "대단원 마무리 평가",page,number:String(i+1).padStart(2,"0"),subpart:""})));
  expect(parsed.exercises.map(row=>row.address)).toEqual(expected);
  expect(parsed.exercises).toHaveLength(296);
  for (const [page,, count, sourcePage] of inventory) {
   const rows = parsed.exercises.filter(row=>row.address.page===page);
   expect(rows).toHaveLength(count);
   expect(rows.every(row => !row.key || row.key.status === "reviewed" && row.key.sourcePage===sourcePage)).toBe(true);
   expect(coverage.pageGroups.find(group=>group.page===page)).toMatchObject({exerciseCount:count,sourcePage});
  }
  const missing=parsed.exercises.filter(row=>!row.key);
  expect(missing.map(row=>[row.address.page,row.address.number])).toEqual([["18~19","04"],["44~45","02"]]);
  expect(coverage.nullKeyLedger.map(row=>row.address)).toEqual(missing.map(row=>row.address));
 });
 it("preserves numeric, multiple-choice, fraction, unit and geometry fixtures from every box", () => {
  const fixtures: [string,string,string][] = [
   ["2~3","03","a=7, b=4"],["4~5","02","②, ④"],["6~9","09","2³×3²×5³"],["6~9","23","37/33"],
   ["10~11","06","30 ℃"],["12~13","06","(가) ㄴ (나) ㄹ"],["14~17","21","(1) x−1 (2) 3x+1"],
   ["18~19","03","A(−5/2), B(4/3)"],["20~21","12","−9/5"],["22~25","22","y=−2/x"],
   ["26~27","02","∠x=50°, ∠y=130°"],["28~29","07","(가): C̅D̅, (나): A̅D̅, (다): SSS"],
   ["30~33","23","(1) △ABD≡△BCE (SAS 합동) (2) 120°"],["34~35","15","72 cm²"],
   ["36~37","04","(8π+30) cm²"],["38~41","24","겉넓이: 117π cm², 부피: 162π cm³"],
   ["42~43","09","(1) 평균: 15시간, 중앙값: 12시간 (2) 중앙값"],["44~45","06","0.25"],["46~49","17","52 %"],
  ];
  for (const [page,number,answer] of fixtures) expect(at(page,number).key?.answerText).toBe(answer);
  const choices = parsed.exercises.filter(row=>/^[①-⑤](, [①-⑤])*$/.test(row.key?.answerText??""));
  expect(choices.length).toBeGreaterThan(180);
  for (const row of choices) expect(new Set(row.key!.answerText.split(", ")).size).toBe(row.key!.answerText.split(", ").length);
  expect(Number(at("2~3","14").key!.answerText)).toBe(105-11);
  expect(Number(at("4~5","04").key!.answerText.replace("−","-"))).toBe((8/3)*(-15/4));
 });
 it("records provenance, edition evidence and separate address/key counts", () => {
  expect(pack.id).toBe("ne-middle1-kwon-evaluation-2022-v1");
  expect(coverage.packId).toBe(pack.id);
  expect(parsed.metadata).toMatchObject({isbn:"979-11-253-4972-3",curriculum:"2022 개정 교육과정"});
  expect(coverage.source.editionEvidence).toMatchObject({publicationDate:"2025.02",impression:null});
  expect(coverage.source.sha256).toBe("9e1137d301d24bb488443a9b8fdb509f5af56a16622231caff8bba6156469f4f");
  expect(pack.provenance.description).toContain(coverage.source.sha256);
  expect(coverage.source.reviewedAnswerRegions).toHaveLength(18);
  expect(coverage.source.reviewedAnswerRegions.every(region=>/^[a-f0-9]{64}$/.test(region.sha256))).toBe(true);
  expect(coverage.counts).toEqual({exercises:296,reviewedKeys:294,nullKeys:2,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:18});
  expect(coverage.scope).toMatchObject({wholeRequestedQuickAnswerScope:true,allExpectedAddressesPresent:true,allAnswersPresent:false,wholeBookAddressAudit:false});
 });
});
