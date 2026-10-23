// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/mega-cpr-m2-1-1493-v1.json";
import coverage from "../../../data/commercial-workbooks/mega-cpr-m2-1-1493-v1.coverage.json";

// Independent visual census of all 30 printed body-page headers and first numbers.
const census = [
  [1,"007,009"],[47,"010~019"],[117,"020~022"],
  [137,"025,027"],[204,"028~035"],[265,"036~038"],
  [285,"041"],[308,"042~049"],[365,"050~052"],
  [384,"055,057"],[436,"058~066"],[500,"067~070"],
  [527,"073"],[544,"074~082"],[604,"083~086"],
  [630,"089,091"],[656,"092~102"],[734,"103~106"],
  [758,"109"],[771,"110~122"],[850,"123~126"],
  [873,"129,131"],[910,"132~140"],[969,"141~144"],
  [994,"147,149"],[1032,"150~158"],[1092,"159~162"],
  [1115,"165,167"],[1150,"168~179"],[1222,"180~183"],
] as const;
const chapters = ["유리수와 순환소수","단항식의 계산","다항식의 계산","일차부등식","일차부등식의 활용","연립일차방정식","연립일차방정식의 활용","일차함수의 그래프(1)","일차함수의 그래프(2)","일차함수와 일차방정식"];
const majors = ["I. 수와 식의 계산","I. 수와 식의 계산","I. 수와 식의 계산","II. 일차부등식","II. 일차부등식","III. 연립일차방정식","III. 연립일차방정식","IV. 일차함수","IV. 일차함수","IV. 일차함수"];
const activities = ["C CONCEPT 개념 체크","P PATTERN 유형 마스터","R REAL 실전 업"];
const missingNumbers = [116,416,417,418,419,420,468,888,897,898,899,900,908,909,1116,1130,1146,1147];
const parsed = workbookCreateEditionSchema.parse({requestId:"major-cpr-20261024",metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
const key = (n: number) => parsed.exercises[n-1].key?.answerText;

describe("Mega CPR complete scanned solution-source addresses", () => {
  it("strictly parses and exactly round-trips all 1245 TSV rows", () => {
    const tsv=readFileSync(new URL(`../../../data/commercial-workbooks/${pack.id}.tsv`,import.meta.url),"utf8");
    expect(parseWorkbookImport(tsv)).toEqual({exercises:parsed.exercises,issues:[]});
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(1245);
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
  });
  it("matches the independent chapter/activity/page census without inventing individual pages", () => {
    const expected=census.flatMap(([start,page],i)=>Array.from({length:(census[i+1]?.[0]??1246)-start},(_,j)=>({
      volume:"",section:`${majors[Math.floor(i/3)]} / ${String(Math.floor(i/3)+1).padStart(2,"0")}. ${chapters[Math.floor(i/3)]} / ${activities[i%3]}`,page,number:String(start+j).padStart(4,"0"),subpart:"",
    })));
    expect(parsed.exercises.map(e=>e.address)).toEqual(expected);
    expect(coverage.pageGroups.flatMap(g=>g.expectedNumbers.map(number=>({volume:g.volume,section:g.section,page:g.page,number,subpart:""})))).toEqual(expected);
    expect(coverage.pageGroups).toHaveLength(30);
    expect(coverage.scope).toMatchObject({wholeRequestedSolutionScope:true,sourcePdfPages:[2,96],allExpectedAddressesPresent:true,allAnswersPresent:false,wholeBookAddressAudit:false});
  });
  it("accounts for every key, source page, and individual diagram or explanation exclusion", () => {
    expect(coverage.counts).toMatchObject({exercises:1245,reviewedKeys:1227,nullKeys:18,choiceKeys:356,unreviewedKeys:0,omittedInScopeAddresses:0});
    const missing=parsed.exercises.filter(e=>!e.key);
    expect(missing.map(e=>Number(e.address.number))).toEqual(missingNumbers);
    expect(missing.map(e=>e.address)).toEqual(coverage.nullKeyLedger.map(e=>e.address));
    for(const e of coverage.nullKeyLedger) {
      expect(e.reason).toBe(e.address.number==="0116"?"long-explanation":"diagram-answer");
      expect(e.bboxPixels).toHaveLength(4);
      expect(e.image).toBe(`followup/recheck-${e.address.number}.png`);
      expect(e.key).toBeNull();
    }
    expect(coverage.reviewedRegions).toHaveLength(1245);
    parsed.exercises.forEach((e,i)=>{
      const region=coverage.reviewedRegions[i];
      expect(region.number).toBe(e.address.number);
      expect(region.keyReviewed).toBe(Boolean(e.key));
      expect(region.bboxPixels).toHaveLength(4);
      if(e.key) {
        expect(e.key.status).toBe("reviewed");
        expect(e.key.sourcePage).toBe(region.sourcePage);
        expect(e.key.sourcePage).toBeGreaterThanOrEqual(2);
        expect(e.key.sourcePage).toBeLessThanOrEqual(96);
      }
    });
    for(const [page,count] of Object.entries(coverage.counts.byAnswerSourcePage)) expect(parsed.exercises.filter(e=>e.key?.sourcePage===Number(page))).toHaveLength(count);
    expect(parsed.exercises.filter(e=>e.key && /^[①②③④⑤]$/.test(e.key.answerText))).toHaveLength(356);
    expect(parsed.exercises.filter(e=>e.key?.answerText.includes("풀이 참조"))).toHaveLength(0);
  });
  it("pins the public original and keeps unconfirmed edition fields absent", () => {
    expect(coverage.source.sha256).toBe("4aab4b7f6e2958b823d963d23e267769eb6139e972baeb734bdbb9ede62348e9");
    expect(pack.provenance.description).toContain(coverage.source.sha256);
    expect(pack.provenance.reference).toContain("https://www.megastudybooks.com/download/1493");
    expect(pack.provenance.reference).toContain("https://www.megastudybooks.com/book/file/explanation?page=31");
    expect(pack.metadata).not.toHaveProperty("isbn");
    expect(pack.metadata).not.toHaveProperty("curriculum");
    expect(coverage.source.editionClaims).toMatchObject({curriculumConfirmed:false,isbnConfirmed:false,printingNumberConfirmed:false,publicationDateConfirmed:false});
    expect(coverage.source.reviewedImages).toHaveLength(54);
    expect(coverage.source.reviewedImages.every(e=>/^[a-f0-9]{64}$/.test(e.sha256))).toBe(true);
    expect(coverage.grading).toBe("manual-reference-only");
  });
  it("preserves numeric, choice, recurring-decimal, table and unit answers across all ten chapters", () => {
    const checks: [number,string][] = [
      [10,"05, -0.0̇5̇"],[13,"377, -3.653̇77̇"],[16,"-1.2̇96̇"],[93,"㉢, 299/90"],[102,"⑴ 999; ⑵ 317; ⑶ 0.3̇17̇"],[136,"0.0̇9̇, 0.2̇7̇, 0.4̇5̇"],
      [169,"-y^9/(27x^3)"],[191,"-2a^7/b"],[242,"A=y^6/x^2, B=x^2y^13"],[258,"12πa^5b^3"],[283,"-x^5y^3/2"],
      [303,"18a-30b+18b^2/a"],[327,"A=3x^2-7x+3, B=-x^2+x-4, C=4x^2-8x+7"],[378,"36πa^2+12πab"],
      [435,"x≥-3/8"],[460,"a=-2, b≠3"],[497,"9/2<a≤6"],[526,"8/5"],[550,"26℃"],[579,"⑴ (1000x+50000)원, 3000x원; ⑵ 26개"],[599,"300 mL"],
      [637,"㉠ x: 1, 2, 3, 4, 5; y: 5, 4, 3, 2, 1; ㉡ x: 7, 5, 3, 1; y: 1, 2, 3, 4; 해: (3, 3)"],[682,"3, 3, 6, -4, 17/7"],[733,"a=3/4, b≠13/2"],
      [763,"x+y=30000, 8x/100+13y/100=2800"],[822,"⑴ y=x+40, x/6=y/8; ⑵ x=120, y=160; ⑶ 20초 후"],[863,"⑴ (가): 초속 5/3 m, (나): 초속 5/6 m; ⑵ 선분 CD"],
      [896,"x절편: -1/3, y절편: -1/4"],[946,"25/3"],[989,"⑴ A(a, 2a); ⑵ D(3a, 2a); ⑶ 3/4; ⑷ 9/4"],[994,"㉢, ㉣"],
      [1047,"a=-3, b≠5"],[1073,"⑴ y=1.8x+32; ⑵ 68℉"],[1088,"y=2400-80x, 2000 kcal"],[1115,"x: -4, -2, -1, 0, 1, 2, 4; y: 6, 9/2, 15/4, 3, 9/4, 3/2, 0"],
      [1149,"⑴ a≠3; ⑵ a=3, b≠2; ⑶ a=3, b=2"],[1221,"오후 3시 20분"],[1242,"y=2x/3+1/4"],[1245,"⑴ 물통 A: 5 L, 물통 B: 3 L; ⑵ 5분 후"],
    ];
    for(const [n,answer] of checks) expect(key(n),`#${n}`).toBe(answer);
    expect(key(528)).toContain("금액(원) 500(12-x)");
    expect(key(768)).toContain("60(=10/100×600)");
    expect(key(874)).toContain("1 / 1, 2 / 1, 3 / 1, 2, 4 / …");
    const choices: [number,string][] = [[121,"④"],[204,"③"],[308,"④"],[436,"①, ④"],[545,"①"],[656,"②"],[771,"④"],[910,"⑤"],[1033,"①, ⑤"],[1150,"④, ⑤"],[1222,"③"]];
    for(const [n,answer] of choices) expect(key(n),`choice #${n}`).toBe(answer);
  });
});
