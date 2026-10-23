// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport, workbookAddressKey } from "@/lib/commercialWorkbooks/import";
import olympus from "../../../data/commercial-workbooks/ebs-olympus-common1-2022-v1.json";
import olympusCoverage from "../../../data/commercial-workbooks/ebs-olympus-common1-2022-v1.coverage.json";
import mega from "../../../data/commercial-workbooks/mega-n-probability-165-2022-v1.json";
import megaCoverage from "../../../data/commercial-workbooks/mega-n-probability-165-2022-v1.coverage.json";
import black from "../../../data/commercial-workbooks/jinhak-blacklabel-common1-firstprint-2022-v1.json";
import blackCoverage from "../../../data/commercial-workbooks/jinhak-blacklabel-common1-firstprint-2022-v1.coverage.json";

for (const [pack,coverage,total,reviewed,choices] of [
  [olympus,olympusCoverage,281,280,154], [mega,megaCoverage,165,165,102], [black,blackCoverage,562,561,268],
] as const) describe(pack.id, () => {
  const parsed=workbookCreateEditionSchema.parse({requestId:"major-reference-audit-20261024",metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
  it("passes the strict schema and exact canonical TSV round-trip", () => {
    const tsv=readFileSync(new URL(`../../../data/commercial-workbooks/${pack.id}.tsv`,import.meta.url),"utf8");
    expect(parseWorkbookImport(tsv)).toEqual({exercises:parsed.exercises,issues:[]});
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/);
  });
  it("accounts for each address, reviewed key and excluded key independently", () => {
    expect(parsed.exercises).toHaveLength(total);
    expect(parsed.exercises.filter(r=>r.key)).toHaveLength(reviewed);
    expect(parsed.exercises.filter(r=>r.key && /^[①②③④⑤]$/.test(r.key.answerText))).toHaveLength(choices);
    expect(coverage.counts).toMatchObject({exercises:total,reviewedKeys:reviewed,nullKeys:total-reviewed,choiceKeys:choices,unreviewedKeys:0,omittedInScopeAddresses:0});
    expect(parsed.exercises.filter(r=>!r.key).map(r=>r.address)).toEqual(coverage.nullKeyLedger.map(r=>r.address));
    expect(coverage.nullKeyLedger.every(r=>r.key===null&&r.registered&&r.note.length>30)).toBe(true);
    expect(coverage.pageGroups.flatMap(g=>g.expectedNumbers.map(number=>({volume:g.volume,section:g.section,page:g.page,number,subpart:""})))).toEqual(parsed.exercises.map(r=>r.address));
    expect(new Set(parsed.exercises.map(r=>workbookAddressKey(r.address))).size).toBe(total);
    for(const g of coverage.pageGroups) {
      const rows=parsed.exercises.filter(r=>r.address.page===g.page && r.address.section===g.section);
      expect(rows).toHaveLength(g.exerciseCount);
      for(const r of rows) if(r.key) expect(r.key).toMatchObject({sourcePage:g.sourcePage,status:"reviewed"});
    }
    expect(coverage.scope).toMatchObject({wholeRequestedQuickAnswerScope:true,allExpectedAddressesPresent:true,wholeBookAddressAudit:false});
    expect(coverage.grading).toBe("manual-reference-only");
  });
  it("pins public provenance, external visual evidence, and truthful metadata", () => {
    expect(parsed.provenance.kind).toBe("publisher");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
    expect(parsed.provenance.reference).toContain(coverage.source.downloadUrl);
    expect(coverage.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(coverage.source.reviewedImages.length).toBeGreaterThan(2);
    for(const image of coverage.source.reviewedImages) expect(image.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.exercises.every(r=>!r.key || !/[\uE000-\uF8FF\uFFFD]/.test(r.key.answerText))).toBe(true);
  });
});
const key=(pack:typeof olympus|typeof mega|typeof black,page:string,number:string,part?:string)=>pack.exercises.find(r=>r.address.page===page && r.address.number===number && (!part||r.address.section.includes(part)))?.key?.answerText;

it("Olympus has every one of the 36 printed activity groups and exact number styles",()=>{
  // [printed range, main count, quick-answer PDF page, one-digit 유제 numbering]
  const census=[
    ["8~9",4,2,1],["10~11",12,2,0],["12",3,2,0],["13",3,2,0],
    ["16~17",4,2,1],["18~19",12,2,0],["20",3,2,0],["21",3,2,0],
    ["24~25",4,2,1],["26~27",12,2,0],["28",3,2,0],["29",3,2,0],["30~33",23,2,0],
    ["37~39",6,2,1],["40~41",12,2,0],["42",3,2,0],["43",3,2,0],
    ["46~47",4,2,1],["48~49",12,2,0],["50",3,3,0],["51",3,3,0],
    ["55~57",6,3,1],["58~59",12,3,0],["60",3,3,0],["61",3,3,0],["62~65",21,3,0],
    ["69~71",6,3,1],["72~75",24,3,0],["76",3,3,0],["77",4,3,0],["78~81",24,3,0],
    ["84~85",4,3,1],["86~87",12,3,0],["88",3,3,0],["89",4,3,0],["90~92",17,3,0],
  ] as const;
  expect(olympus.exercises.map(r=>[r.address.page,r.address.number,r.key?.sourcePage ?? 3])).toEqual(census.flatMap(([p,n,s,plain])=>Array.from({length:n},(_,i)=>[p,plain?String(i+1):String(i+1).padStart(2,"0"),s])));
  expect(olympusCoverage.nullKeyLedger.map(r=>[r.address.page,r.address.number,r.reason])).toEqual([["55~57","3","complex-expression"]]);
  expect(olympus.metadata.isbn).toBe("9788954786928");
  for(const [page,number,answer] of [
    ["16~17","4","몫: x²−x−1/2, 나머지: 3/2"],["30~33","18","13/8"],["30~33","22","495√17"],
    ["37~39","5","⑴ 10; ⑵ 21/2"],["40~41","08","k>9/4"],["42","03","7/8"],
    ["48~49","12","162 cm²"],["62~65","20","19/9"],["72~75","15","660"],["78~81","24","132"],["90~92","17","18"],
  ]) expect(key(olympus,page,number)).toBe(answer);
});
it("Mega N covers exactly 001–165 in the nine printed page ranges, with every answer reread",()=>{
  const groups=[["06~07",1,7],["08~21",8,52],["22~26",53,61],["28~29",62,67],["30~42",68,106],["43~48",107,116],["50~51",117,123],["52~63",124,158],["64~68",159,165]] as const;
  expect(mega.exercises.map(r=>[r.address.page,r.address.number])).toEqual(groups.flatMap(([p,a,b])=>Array.from({length:b-a+1},(_,i)=>[p,String(a+i).padStart(3,"0")])));
  const answers="④ ④ 120 117 84 ③ 115 363 ③ ① 197 ② ⑤ 600 180 ⑤ ④ ③ ⑤ ⑤ ⑤ ④ ④ ⑤ ① ⑤ 10 ② 333 ② 93 105 910 340 360 196 ④ 120 199 ② ② ⑤ 240 360 ③ ① 40 ④ ⑤ 2 715 ③ 232 882 ④ 600 ③ 129 ② 410 ④ ④ ④ ③ ② ⑤ 62 6 ② ③ ① 49 ② ③ ① 44 29 ② ② ④ ⑤ ⑤ ④ ④ ③ ① ③ ① ③ ② ⑤ ② 53 ⑤ ① ④ 30 ⑤ ② ⑤ ② ⑤ ② ③ ③ 19 151 20 249 ③ 198 ④ ④ ⑤ 457 240 78 10 ④ ① ③ ④ ① 25 ⑤ ② 619 ③ ⑤ ⑤ 31 ④ ⑤ 12 ① 25 ④ 33 ③ 775 20 ③ ④ ⑤ ④ ④ 49 ② 64 ① 12 ④ 42 ③ ④ 23 144 ② ⑤ 5 78 ④ 67 465 142";
  expect(mega.exercises.map(r=>r.key.answerText)).toEqual(answers.split(" "));
  expect(mega.metadata).not.toHaveProperty("isbn");
});
it("Black Label keeps all 27 STEP groups and the archived first-print identity",()=>{
  const census=[
    ["009~019",21,36,12],["021~026",14,18,6],["029~037",14,30,12],["039~048",21,30,12],
    ["050~059",21,30,11],["061~070",21,30,12],["073~084",21,42,12],["087~097",21,35,12],["101~111",21,36,11],
  ] as const;
  expect(black.exercises.map(r=>[r.address.page,r.address.section.match(/STEP (\d)/)?.[1],r.address.number])).toEqual(census.flatMap(([p,...counts])=>counts.flatMap((n,s)=>Array.from({length:n},(_,i)=>[p,String(s+1),String(i+1).padStart(2,"0")]))));
  expect(blackCoverage.nullKeyLedger.map(r=>[r.address.page,r.address.number,r.reason])).toEqual([["087~097","16","solution-reference"]]);
  expect(black.metadata.edition).toContain("1쇄");
  expect(blackCoverage.source.editionClaims).toMatchObject({currentAttachmentIdentityConfirmed:false,errataApplied:false,isbnConfirmed:false});
  expect(black.provenance.description).toContain("현재 로그인 뒤 첨부 파일과의 동일성");
  for(const [page,step,number,answer] of [
    ["009~019","3","08","2/3"],["029~037","3","06","3(α³−β³)"],["029~037","3","12","√3/4"],
    ["039~048","2","27","7−2√6"],["039~048","3","09","−3/4"],["050~059","2","11","80/7"],["050~059","3","02","13/4"],
    ["061~070","1","04","x=(1±√3i)/2 (중근)"],["061~070","2","07","13/3"],
    ["073~084","2","04","6/5<x≤15/11"],["073~084","3","12","2/3<p<1 또는 1<p≤4/3"],
    ["087~097","3","05","9번"],["101~111","2","24","A"],["101~111","3","04","18000원"],
  ]) expect(key(black,page,number,`STEP ${step}`)).toBe(answer);
});
