// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/mothertong-solt-m1-1-9353-v1.json";
import coverage from "../../../data/commercial-workbooks/mothertong-solt-m1-1-9353-v1.coverage.json";
const parsed=workbookCreateEditionSchema.parse({requestId:"solt-complete-audit-20261024",metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
// Independent census of all 27 printed STEP headers, with continuation boundaries.
const census=[
  [1,"A","2",1,31,1],[1,"B","4",32,79,1],[1,"C","13",80,94,1],
  [2,"A","16",1,26,1],[2,"B","18",27,82,1],[2,"C","29",83,96,2],
  [3,"A","32",1,47,2],[3,"B","36",48,104,2],[3,"C","47",105,118,2],
  [4,"A","50",1,65,2],[4,"B","56",66,175,3],[4,"C","76",176,194,3],
  [5,"A","80",1,65,3],[5,"B","86",66,144,3],[5,"C","103",145,161,4],
  [6,"A","106",1,39,4],[6,"B","110",40,99,4],[6,"C","122",100,115,4],
  [7,"A","126",1,19,5],[7,"B","129",20,90,5],[7,"C","145",91,103,5],
  [8,"A","148",1,22,5],[8,"B","151",23,64,5],[8,"C","160",65,73,6],
  [9,"A","162",1,24,6],[9,"B","165",25,103,6],[9,"C","184",104,116,6],
] as const;
const chapters=["소인수분해","최대공약수와 최소공배수","정수와 유리수","유리수의 계산","문자의 사용과 식","일차방정식의 풀이","일차방정식의 활용","좌표평면과 그래프","정비례와 반비례"];
const stepNames={A:"기본 개념 익히기",B:"유형 정복하기",C:"고난도 도전하기"};
const pad=(n:number)=>String(n).padStart(3,"0");
const source=(chapter:number,step:string,n:number,base:number)=>chapter===2&&step==="B"&&n>=78?2:chapter===4&&step==="A"&&n>=62?3:chapter===5&&step==="B"&&n>=73?4:chapter===6&&step==="C"&&n>=112?5:chapter===8&&step==="B"&&n>=35?6:base;
const at=(page:string,number:string)=>parsed.exercises.find(r=>r.address.page===page&&r.address.number===number);
describe("Mothertong 쏠트: all six answer-table pages",()=>{
  it("strictly parses and exactly round-trips TSV including all 27 null keys",()=>{
    const tsv=readFileSync(new URL("../../../data/commercial-workbooks/mothertong-solt-m1-1-9353-v1.tsv",import.meta.url),"utf8");
    expect(parseWorkbookImport(tsv)).toEqual({exercises:parsed.exercises,issues:[]});
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();
  });
  it("covers every printed address without inventing page ranges or splitting the shared graph",()=>{
    const expected=census.flatMap(([ch,step,page,first,last,pdf])=>Array.from({length:last-first+1},(_,i)=>first+i)
      .filter(n=>!(ch===8&&step==="A"&&[16,17].includes(n)))
      .map(n=>({address:{volume:"문제편",section:`${String(ch).padStart(2,"0")} ${chapters[ch-1]} / STEP ${step} ${stepNames[step]}`,page,number:ch===8&&step==="A"&&n===15?"015-017":pad(n),subpart:""},sourcePage:source(ch,step,n,pdf)})));
    expect(parsed.exercises.map(r=>r.address)).toEqual(expected.map(r=>r.address));
    expect(expected).toHaveLength(1068);
    for(const [i,r] of parsed.exercises.entries()) {
      if(r.key) expect(r.key).toMatchObject({sourcePage:expected[i].sourcePage,status:"reviewed"});
      else expect(coverage.nullKeyLedger.find(x=>x.address.page===r.address.page&&x.address.number===r.address.number)?.sourcePage).toBe(expected[i].sourcePage);
    }
    expect(coverage.pageGroups).toHaveLength(27);
    expect(coverage.counts.byAnswerSourcePage).toEqual({"1":171,"2":198,"3":205,"4":200,"5":139,"6":155});
  });
  it("locks the whole missing-key ledger and keeps valid neighboring answers",()=>{
    const missing:Record<string,string[]>={"2":["014","015","016","023"],"16":["009","010","019","020"],"32":["024"],"50":["045","062"],"106":["015","016"],"148":["009","010","015-017","019"],"162":["001","002","003","006","007","013","014","015","018","019"]};
    expect(parsed.exercises.filter(r=>!r.key).map(r=>[r.address.page,r.address.number])).toEqual(Object.entries(missing).flatMap(([page,numbers])=>numbers.map(number=>[page,number])));
    expect(coverage.nullKeyLedger.map(r=>r.address)).toEqual(parsed.exercises.filter(r=>!r.key).map(r=>r.address));
    expect(at("148","018")?.key?.answerText).toBe("(−3, −5), (−2, −2), (−1, 0), (0, 2), (1, 3), (2, 4), (3, 6)");
    expect(at("162","016")?.key?.answerText).toBe("y=6000/x");
  });
  it("preserves numeric references, signs, units, alternatives and multipart content across the whole book",()=>{
    for(const [page,n,answer] of [
      ["2","009","밑: 1/5, 지수: 4"],["13","091","2^72"],["18","064","50/3"],["18","069","오전 9시 15분"],
      ["32","023","A: −2 2/3 (=−8/3), B: −1/2, C: 1, D: 2 1/2 (=5/2 또는 +5/2)"],
      ["36","054","⑴ 10, 4; ⑵ −6/3, −9; ⑶ 10, 0, 4"],["47","117","⑴ −3≤a<7/4; ⑵ 1, −5/4, 0.6, −2"],
      ["50","061","−15/4"],["56","163","⑴ ㉣, ㉢, ㉡, ㉤, ㉠; ⑵ 1/3"],["76","193","−320/3"],
      ["80","017","a² cm²"],["86","096","45℃"],["103","157","−7/24"],
      ["110","097","a=2, b≠7"],["122","114","2, 4, 6, 8"],["129","084","4시 240/11 분"],
      ["145","097","360/11 분"],["151","061","⑴ ㄷ; ⑵ ㄴ; ⑶ ㄱ"],["165","091","③"],["184","116","27"],
    ]) expect(at(page,n)?.key?.answerText).toBe(answer);
    expect(parsed.exercises.filter(r=>r.key&&/^[①②③④⑤]$/.test(r.key.answerText))).toHaveLength(362);
    expect(coverage.counts).toMatchObject({exercises:1068,reviewedKeys:1041,nullKeys:27,unreviewedKeys:0,omittedInScopeAddresses:0});
  });
  it("does not turn an upload date into an edition or pretend OCR alone was review",()=>{
    expect(pack.metadata.edition).toBe("공식 정답표 게시물 9353 · 판·쇄 미확인");
    expect(pack.metadata).not.toHaveProperty("isbn");
    expect(pack.metadata).not.toHaveProperty("curriculum");
    expect(coverage.source.sha256).toBe("2d301861bb9531fe61a3f7623256878134915dab0aa68d6474a4644492f74e0b");
    expect(coverage.source.reviewedImages).toHaveLength(12);
    for(const image of coverage.source.reviewedImages) expect(image.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(coverage.scope).toMatchObject({allExpectedAddressesPresent:true,allAnswersPresent:false,wholeBookAddressAudit:false});
  });
});
