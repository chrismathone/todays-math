// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/mega-calculation-volume12-1400-v1.json";
import coverage from "../../../data/commercial-workbooks/mega-calculation-volume12-1400-v1.coverage.json";
const parsed=workbookCreateEditionSchema.parse({requestId:"mega-calculation-full-census-20261024",metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
// Independent visual census: each day's last number and the last number on its left printed page.
const dailyTotals=[[42,42,42,42,16],[42,42,42,42,20],[42,42,42,42,20],[21,18,24,24,18],[18,18,24,24,20],[23,23,29,30,18],[24,30,16,18,16],[24,21,20,22,28],[20,18,20,28,28],[12,12,28,28,16]];
const leftTotals=[[21,21,21,21,10],[21,21,21,21,10],[21,21,21,21,10],[9,6,6,6,10],[6,6,6,6,10],[8,8,8,9,10],[9,9,6,4,8],[12,7,6,8,14],[6,4,6,14,14],[6,6,14,14,10]];
const at=(page:string,number:string)=>parsed.exercises.find(r=>r.address.page===page&&r.address.number===number)?.key?.answerText;
describe("Mega calculation volume 12: all 50 numbered daily sets",()=>{
 it("satisfies the strict contract and round-trips every TSV cell",()=>{
  expect(parsed.exercises).toHaveLength(1321);
  expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();
  expect(parseWorkbookImport(readFileSync(new URL("../../../data/commercial-workbooks/mega-calculation-volume12-1400-v1.tsv",import.meta.url),"utf8"))).toEqual({exercises:parsed.exercises,issues:[]});
 });
 it("covers every independent printed page/number and uses PDF page for sourcePage",()=>{
  const expected=dailyTotals.flatMap((days,w)=>days.flatMap((total,d)=>Array.from({length:total},(_,i)=>({address:{volume:"12권",section:`${w+1}주 / ${d+1}일`,page:String(6+w*14+d*2+(i>=leftTotals[w][d]?1:0)),number:String(i+1),subpart:""},sourcePage:4+w*2+(d>=3?1:0)}))));
  expect(parsed.exercises.map(r=>r.address)).toEqual(expected.map(r=>r.address));
  for(const [i,row] of parsed.exercises.entries())expect(row.key).toMatchObject({status:"reviewed",sourcePage:expected[i].sourcePage});
  expect(coverage.pageGroups).toHaveLength(100);
  expect(coverage.counts.byAnswerSourcePage).toEqual({4:126,5:58,6:126,7:62,8:126,9:62,10:63,11:42,12:60,13:44,14:75,15:48,16:70,17:34,18:65,19:50,20:58,21:56,22:52,23:44});
 });
 it("preserves all quotient/remainder and simplified-ratio references",()=>{
  const remainders:Record<string,[number,string]>={
   90:[1,"7…2.8|4…1.1|26…0.07|5…0.1|5…5.5|22…0.04|8…0.5|6…0.4|16…0.12"],
   91:[10,"9…1.3|8…0.5|7…0.1|6…1.29|25…0.3|3…0.64|8…6.15|7…0.05|2…0.48|12…0.2|4…0.05|9…1.36|8…0.07|4…1.44|19…1.7"],
   92:[1,"6…0.6|2…1.56|28…0.2|5…0.24|3…1.49|13…1.4|4…2.6|4…0.84|26…0.06"],
   93:[10,"18…1.8|3…6.63|6…0.5|7…2.94|18…2.3|60…2.4|45…0.5|13…0.8|7…5.37|3…1.8|30…0.6|8…0.2|44…0.9|15…3.4|8…1.7|48…2.8|9…2.37|12…2.1|22…1.2|7…2.75|12…0.32"],
  };
  for(const [page,[start,answers]] of Object.entries(remainders))for(const [i,answer] of answers.split("|").entries())expect(at(page,String(start+i))).toBe(answer);
  const ratios=parsed.exercises.filter(r=>r.key?.answerText.includes(" : "));
  expect(ratios).toHaveLength(70);
  const gcd=(a:number,b:number):number=>b===0?a:gcd(b,a%b);
  for(const row of ratios){const parts=row.key!.answerText.split(" : ").map(Number);expect(parts.every(x=>Number.isInteger(x)&&x>0)).toBe(true);expect(gcd(parts[0],parts[1])).toBe(1);}
  expect(at("107","11")).toBe("35 : 52");expect(at("109","13")).toBe("77 : 18");expect(at("111","21")).toBe("27 : 37");expect(at("113","19")).toBe("114 : 91");
 });
 it("preserves fractions, decimals, wrapped answers and ordered multiple blanks",()=>{
  for(const [page,number,answer] of [
   ["6","12","2 1/17"],["7","25","27/35"],["13","24","27/112"],["15","12","(위에서부터) 2 / 3 13/21 / 14/19, 1 1/3"],
   ["20","5","30 2/3"],["25","22","3 9/17"],["34","4","10/117"],["38","2","2 43/80"],["39","42","1 41/64"],
   ["49","20","2.25"],["57","13","3.96 / 6.5"],["67","11","43.65"],["85","15","(위에서부터) 50 / 910"],
   ["98","2","3, 0.57 / 14, 0.62"],["98","8","23, 0.52 / 30, 0.6"],["99","16","12.7, 12.69"],
   ["104","3","(위에서부터) 28, 24 / 4"],["108","3","4 / 4, 24 / 32, 15"],["108","5","11, 7 / 11, 7, 10 / 11, 14"],["108","6","8, 12 / 8, 12 / 56, 36 / 56, 36, 4 / 14, 9"],
   ["120","4","4 / 32 / 32 / 32, 6 / 64"],["122","6","28.8 / 28.8 / 3.2"],["127","23","7 2/3"],["135","7","28 / 35 / 28, 35"],["140","5","18, 27 / 35, 10"],["141","16","175, 125 / 195, 105"],
  ])expect(at(page,number)).toBe(answer);
  for(const row of parsed.exercises){expect(row.key?.answerText).not.toMatch(/(?:None|undefined|NaN|\ufffd|\/\s*$)/);}
 });
 it("reports only the numbered daily scope and no invented publication metadata",()=>{
  expect(coverage.counts).toMatchObject({reviewedKeys:1321,nullKeys:0,unreviewedKeys:0,omittedInScopeAddresses:0,choiceKeys:0});
  expect(coverage.nullKeyLedger).toEqual([]);
  expect(coverage.scope).toMatchObject({allExpectedAddressesPresent:true,allAnswersPresent:true,wholeBookAddressAudit:false});
  expect(coverage.source.reviewedImages).toHaveLength(20);
  expect(coverage.reviewedRegions).toHaveLength(100);
  expect(coverage.source.sha256).toBe("88d4eea5af019b492e6309264e3a156d03ac375417ea42047e3ad0fb027b7b9d");
  expect(pack.metadata.edition).toBe("공식 정답 자료 1400 · 판·쇄 미확인");
  expect(pack.metadata).not.toHaveProperty("isbn");expect(pack.metadata).not.toHaveProperty("curriculum");
  expect(coverage.limitations.join(" ")).toContain("번호 없는 생각 수학 20쪽");
 });
});
