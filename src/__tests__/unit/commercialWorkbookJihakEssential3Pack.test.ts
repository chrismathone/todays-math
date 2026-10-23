// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/jihak-poongsanja-essential-middle3-2-2022-v1.json";
import coverage from "../../../data/commercial-workbooks/jihak-poongsanja-essential-middle3-2-2022-v1.coverage.json";
const parsed = workbookCreateEditionSchema.parse({ requestId:"jihak-essential-3-2-20261024",metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises });
const starts=[1,12,61,75,88,130,144,156,216,229,235,272,284,290,333,345,352,376,388,398,440];
const pages=["9, 11","12~19","20~21","23, 25","26~32","33~34","37, 39","40~49","50~51","53","54~59","60~61","63","64~70","71~72","75","76~79","80~81","83, 85","86~93","94~95"];
const titles=["1 삼각비","2 삼각비의 활용","1 원과 직선","2 원주각","3 원주각의 활용","1 산포도","2 상자그림과 산점도"];
const kinds=["개념 확인하기","필수유형 다지기","만점에 도전하기"];
const addr=(volume:string,section:string,page:string,number:string)=>({volume,section,page,number,subpart:""});
describe("Poongsanja Essential middle 3-2 two-volume complete addresses",()=>{
 it("strictly parses and roundtrips all 648 unique rows",()=>{
  expect(Object.keys(pack).sort()).toEqual(["coverage","exercises","id","label","metadata","provenance"]);
  expect(parseWorkbookImport(readFileSync(new URL("../../../data/commercial-workbooks/jihak-poongsanja-essential-middle3-2-2022-v1.tsv",import.meta.url),"utf8"))).toEqual({exercises:parsed.exercises,issues:[]});
  expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();
  expect(parsed.exercises).toHaveLength(648);
 });
 it("matches every independently inventoried printed address in both volumes",()=>{
  const expected=starts.flatMap((s,i)=>Array.from({length:(starts[i+1]??451)-s},(_,j)=>addr("유형북",`${titles[Math.floor(i/3)]} / ${kinds[i%3]}`,pages[i],String(s+j).padStart(3,"0"))));
  for(let group=0;group<7;group++){
   const chapter=group<2?"Ⅰ. 삼각비":group<5?"Ⅱ. 원의 성질":"Ⅲ. 통계";
   for(const n of ["예제 1","유제 1-1","유제 1-2","예제 2","유제 2-1","유제 2-2"])expected.push(addr("실전북",`서술형 집중연습 / ${chapter} / 대표 서술형`,`${2+group*4}~${3+group*4}`,n));
   for(let n=1;n<=8;n++)expected.push(addr("실전북",`서술형 집중연습 / ${chapter} / 서술형 실전대비`,`${4+group*4}~${5+group*4}`,String(n)));
  }
  for(let g=0;g<4;g++)for(let n=1;n<=25;n++)expected.push(addr("실전북",`최종점검 TEST / 실전 TEST ${g+1}회`,`${32+g*4}~${35+g*4}`,String(n).padStart(2,"0")));
  expect(parsed.exercises.map(r=>r.address)).toEqual(expected);
  expect(coverage.counts).toMatchObject({exercises:648,reviewedKeys:600,nullKeys:48,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:39});
 });
 it("covers all withheld addresses, including entire structured examples",()=>{
  const missing=parsed.exercises.filter(r=>!r.key);
  expect(missing).toHaveLength(48);
  expect(missing.filter(r=>r.address.volume==="유형북").map(r=>Number(r.address.number))).toEqual([339,390,391,392,394,402]);
  expect(missing.filter(r=>r.address.volume==="실전북")).toHaveLength(42);
  expect(coverage.nullKeyLedger.map(r=>r.address)).toEqual(missing.map(r=>r.address));
  expect(coverage.nullKeyLedger.every(r=>r.key===null&&r.registered&&r.bbox.length===4&&r.note.length>25)).toBe(true);
 });
 it("preserves fractions, radicals, units, complete multipart answers and final tables",()=>{
  for(const [n,answerText,sourcePage]of [[164,"(289/9)π cm²",23],[257,"sqrt(5)/3",34],[389,"⑴ 제1사분위수: 11, 제2사분위수: 14, 제3사분위수: 18; ⑵ 제1사분위수: 14, 제2사분위수: 21.5, 제3사분위수: 27; ⑶ 제1사분위수: 8, 제2사분위수: 18, 제3사분위수: 29",51],[450,"③, ④",58]]as const)expect(parsed.exercises[n-1].key).toEqual({answerText,status:"reviewed",sourcePage});
  const tests=parsed.exercises.slice(548);
  expect([24,49,74,99].map(i=>tests[i].key?.answerText)).toEqual(["12π cm²","2 cm","2","17.5점"]);
  expect(tests[89].key?.answerText).toBe("①,⑤");
  expect(tests[98].key?.answerText).toBe("B 배터리");
 });
 it("checks book-level choice, numeric and source-page invariants",()=>{
  expect(parsed.exercises.filter(r=>r.key&&/^[①②③④⑤](?:, ?[①②③④⑤])*$/.test(r.key.answerText))).toHaveLength(246);
  const byPage:Record<string,number>={};
  for(const r of parsed.exercises)if(r.key){
   expect(r.key.status).toBe("reviewed");expect(r.key.answerText).not.toMatch(/[\u0000-\u001F\uFFFD§¶Ä®]|NULL:|풀이 참조/);
   expect(r.key.sourcePage).toBeGreaterThanOrEqual(2);expect(r.key.sourcePage).toBeLessThanOrEqual(83);
   byPage[r.key.sourcePage!]=(byPage[r.key.sourcePage!]??0)+1;
  }
  expect(byPage).toEqual(coverage.counts.byReviewedKeySourcePage);
 });
 it("preserves official source hash and unknown edition facts",()=>{
  expect(coverage.source).toMatchObject({sourceRelativePath:"major/pdfs/jihak-3.pdf",pageCount:88,byteCount:12208378,sha256:"04f91c7f5c78f47870a3dde050948347849f7e778270fe3b92d28c2132abcfef"});
  expect(parsed.metadata.curriculum).toBe("2022 개정");expect(parsed.metadata).not.toHaveProperty("isbn");expect(parsed.metadata.edition).toContain("미확인");
  expect(parsed.provenance.description).toContain(coverage.source.sha256);expect(parsed.provenance.reference).toContain(coverage.source.bookUrl);
  expect(coverage.grading).toBe("manual-reference-only");
 });
});
