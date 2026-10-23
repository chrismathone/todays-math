// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/visang-conceptroot-common1-2022-v1.json";
import coverage from "../../../data/commercial-workbooks/visang-conceptroot-common1-2022-v1.coverage.json";

// Independent transcription of all printed page headers, not generated from exercises.
const census = [
  [1,"9","C"],[3,"11","U"],[7,"15","C"],[12,"17~27","U"],[35,"29","C"],[37,"31~35","U"],[49,"36~38","E"],
  [69,"41","C"],[72,"43~51","U"],[92,"53","C"],[96,"55~65","U"],[120,"66~68","E"],
  [138,"69","C"],[139,"71","U"],[142,"75~85","U"],[166,"86~88","E"],
  [184,"91","C"],[187,"93","C"],[188,"95~103","U"],[208,"105","C"],[211,"107~113","U"],[227,"114~116","E"],
  [247,"121","C"],[250,"123~130","U"],[267,"133","C"],[270,"135~137","U"],[278,"138~139","E"],
  [292,"143","C"],[297,"145~153","U"],[317,"154~156","E"],
  [335,"161","C"],[337,"163~169","U"],[353,"170~171","E"],[364,"173","C"],[366,"175~182","U"],[383,"183~184","E"],
  [395,"187","C"],[396,"189~199","U"],[420,"201","C"],[423,"203~205","U"],[431,"207","C"],[432,"209","U"],[436,"210~212","E"],
  [457,"217~229","U"],[481,"230~232","E"],[498,"237","C"],[501,"239~251","U"],[529,"253","C"],[531,"255","U"],[535,"256~258","E"],
  [553,"263","C"],[558,"265~277","U"],[586,"278~280","E"],[605,"281","C"],[606,"283~293","U"],[626,"295~296","E"],
  [640,"299","C"],[643,"301~311","U"],[667,"312~314","E"],[686,"317","C"],[688,"319~329","U"],[712,"330~332","E"],
  [729,"337","C"],[732,"339~347","U"],[752,"349~350","E"],[766,"353","C"],[768,"355~357","U"],[776,"359","C"],[779,"361~363","U"],[787,"364~365","E"],
  [799,"367","C"],[801,"369~373","U"],[813,"375","C"],[814,"377~382","U"],[827,"383~384","E"],
] as const;
const chapters = [
  [1,"Ⅰ. 다항식 / Ⅰ-1. 다항식의 연산 / 01 다항식의 연산"],
  [69,"Ⅰ. 다항식 / Ⅰ-2. 나머지 정리와 인수분해 / 01 항등식과 나머지 정리"],
  [138,"Ⅰ. 다항식 / Ⅰ-2. 나머지 정리와 인수분해 / 02 인수분해"],
  [184,"Ⅱ. 방정식과 부등식 / Ⅱ-1. 복소수 / 01 복소수의 뜻과 사칙연산"],
  [247,"Ⅱ. 방정식과 부등식 / Ⅱ-2. 이차방정식 / 01 이차방정식의 판별식"],
  [292,"Ⅱ. 방정식과 부등식 / Ⅱ-2. 이차방정식 / 02 이차방정식의 근과 계수의 관계"],
  [335,"Ⅱ. 방정식과 부등식 / Ⅱ-3. 이차방정식과 이차함수 / 01 이차방정식과 이차함수의 관계"],
  [364,"Ⅱ. 방정식과 부등식 / Ⅱ-3. 이차방정식과 이차함수 / 02 이차함수의 최대, 최소"],
  [395,"Ⅱ. 방정식과 부등식 / Ⅱ-4. 여러 가지 방정식 / 01 삼차방정식과 사차방정식"],
  [457,"Ⅱ. 방정식과 부등식 / Ⅱ-4. 여러 가지 방정식 / 02 연립이차방정식"],
  [498,"Ⅱ. 방정식과 부등식 / Ⅱ-5. 연립일차부등식 / 01 연립일차부등식"],
  [553,"Ⅱ. 방정식과 부등식 / Ⅱ-6. 이차부등식 / 01 이차부등식"],
  [605,"Ⅱ. 방정식과 부등식 / Ⅱ-6. 이차부등식 / 02 연립이차부등식"],
  [640,"Ⅲ. 경우의 수 / Ⅲ-1. 경우의 수와 순열 / 01 합의 법칙과 곱의 법칙"],
  [686,"Ⅲ. 경우의 수 / Ⅲ-1. 경우의 수와 순열 / 02 순열"],
  [729,"Ⅲ. 경우의 수 / Ⅲ-2. 조합 / 01 조합"],
  [766,"Ⅳ. 행렬 / Ⅳ-1. 행렬의 연산 / 01 행렬의 덧셈, 뺄셈과 실수배"],
  [799,"Ⅳ. 행렬 / Ⅳ-1. 행렬의 연산 / 02 행렬의 곱셈"],
] as const;
const labels = {C:"개념 확인",U:"유제",E:"연습문제"};
const parsed = workbookCreateEditionSchema.parse({requestId:"major-followup-root-20261024",metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
const key = (number: number) => parsed.exercises[number-1].key?.answerText;

describe("Visang Concept Root distributed-solution source", () => {
  it("strictly parses and exactly round-trips the canonical TSV", () => {
    const tsv=readFileSync(new URL(`../../../data/commercial-workbooks/${pack.id}.tsv`,import.meta.url),"utf8");
    expect(parseWorkbookImport(tsv)).toEqual({exercises:parsed.exercises,issues:[]});
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(839);
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
  });
  it("matches every independently read section, page group and three-digit number", () => {
    const expected=census.flatMap(([start,page,type],i)=>Array.from({length:(census[i+1]?.[0]??840)-start},(_,j)=>({
      volume:"",section:`${chapters.filter(([n])=>n<=start).at(-1)![1]} / ${labels[type]}`,page,number:String(start+j).padStart(3,"0"),subpart:"",
    })));
    expect(parsed.exercises.map(r=>r.address)).toEqual(expected);
    expect(coverage.pageGroups.flatMap(g=>g.expectedNumbers.map(number=>({volume:g.volume,section:g.section,page:g.page,number,subpart:""})))).toEqual(expected);
    expect(coverage.pageGroups).toHaveLength(75);
    expect(new Set(coverage.pageGroups.map(g=>g.section.split(" / ").slice(0,-1).join(" / "))).size).toBe(18);
  });
  it("accounts separately for all addresses, reviewed keys and exclusion reasons", () => {
    expect(coverage.counts).toMatchObject({exercises:839,reviewedKeys:839,nullKeys:0,choiceKeys:139,unreviewedKeys:0,omittedInScopeAddresses:0});
    expect(parsed.exercises.filter(r=>!r.key).map(r=>r.address)).toEqual(coverage.nullKeyLedger);
    expect(coverage.nullKeyLedger).toEqual([]);
    expect(parsed.exercises.filter(r=>r.key && /^[①②③④⑤]$/.test(r.key.answerText))).toHaveLength(139);
    expect(coverage.scope).toMatchObject({wholeRequestedSolutionScope:true,sourcePdfPages:[2,153],allExpectedAddressesPresent:true,allAnswersPresent:true,wholeBookAddressAudit:false});
    expect(coverage.reviewedRegions).toHaveLength(839);
    expect(coverage.reviewedRegions.map(r=>r.number)).toEqual(parsed.exercises.map(r=>r.address.number));
    for(const [i,r] of parsed.exercises.entries()) {
      expect(r.key?.status).toBe("reviewed");
      expect(r.key?.sourcePage).toBe(coverage.reviewedRegions[i].sourcePage);
      expect(r.key?.sourcePage).toBeGreaterThanOrEqual(2);
      expect(r.key?.sourcePage).toBeLessThanOrEqual(153);
    }
    for(const [page,count] of Object.entries(coverage.counts.byAnswerSourcePage)) expect(parsed.exercises.filter(r=>r.key?.sourcePage===Number(page))).toHaveLength(count);
    expect(coverage.grading).toBe("manual-reference-only");
  });
  it("pins the original source identity, confirmed ISBN and external visual evidence", () => {
    expect(coverage.source.sha256).toBe("891d9b528d67ed309fc4ca5cc77f1d2b783ebe73434057b0d9884f7b60b63649");
    expect(pack.provenance.description).toContain(coverage.source.sha256);
    expect(pack.provenance.reference).toContain("https://book.visang.com/books/info/5396");
    expect(pack.provenance.reference).toContain("https://cdn.visang.com/book/202407/20240716171708456.pdf");
    expect(pack.metadata.isbn).toBe("979-11-6940-929-2");
    expect(coverage.source.editionClaims).toMatchObject({curriculum:"2022개정",printingNumberConfirmed:false,publicationDateConfirmed:false});
    expect(coverage.source.reviewedImages).toHaveLength(46);
    expect(coverage.source.reviewedImages.every(r=>/^[a-f0-9]{64}$/.test(r.sha256))).toBe(true);
  });
  it("preserves fractional, signed, complex, conditional, matrix and unit answers across the book", () => {
    const checks: [number,string][] = [
      [13,"2"],[14,"274"],[18,"⑤"],[25,"-4√2"],[41,"③"],[53,"-10√2"],[65,"7/6"],[92,"⑴ -29; ⑵ 5/9"],
      [128,"⑴ a=3, b=6, c=3, d=2; ⑵ 2.363"],[162,"6√5"],[190,"2/3"],[203,"1/2"],
      [209,"⑴ ±2; ⑵ ±√7i; ⑶ ±i/4"],[216,"-64+128i"],[230,"3/4"],[254,"2, 1/2"],[255,"-5, -23/6"],[262,"1 m"],[266,"⑴ x=√3/3 또는 x=1; ⑵ 2≤x<4"],
      [274,"m=3, n=9/2"],[287,"15 cm"],[316,"3/2"],[331,"⑴ -4; ⑵ 5; ⑶ 2±i"],[363,"9/2 m"],[379,"110 m"],[387,"13/2"],
      [412,"-20, 0, 1/4"],[416,"512 cm^3"],[418,"10 m"],[450,"3 mm"],[455,"80/9"],[472,"13/6"],[480,"5√2/2"],
      [501,"⑴ a>2일 때, x>3; a=2일 때, 해는 없다.; a<2일 때, x<3; ⑵ 4"],[547,"50 g 이상 300 g 이하"],[568,"9 m 이상 13 m 이하"],[574,"⑴ -1/4≤a≤1; ⑵ 0≤a≤1"],
      [606,"⑴ -2<x<2/3; ⑵ 3<x≤4"],[638,"4/5<a≤6"],[662,"260"],[693,"990"],[701,"2640"],[726,"selmi"],[750,"200"],
      [772,"[[0, 0, 1], [1, 1, 1], [2, 1, 0]]"],[774,"[[0, 1, 0], [0, 1, 1], [1, 1, 1]]"],[792,"[[5, 6, 8], [6, 2, 4], [8, 4, 2]]"],
      [795,"33/5"],[810,"-5^9"],[819,"[[16], [11]]"],[828,"-1/2"],[831,"[[3], [1]]"],[838,"350"],[839,"6"],
    ];
    for(const [n,answer] of checks) expect(key(n),`printed #${n}`).toBe(answer);
    expect(key(498)).toBe("⑴ a>0일 때, x≤4; a=0일 때, 모든 실수; a<0일 때, x≥4; ⑵ a>2일 때, x>1/(a-2); a=2일 때, 해는 없다.; a<2일 때, x<1/(a-2)");
    expect(key(477)).toBe("{x=-13, y=0} 또는 {x=-3, y=-10} 또는 {x=-1, y=12} 또는 {x=9, y=2}");
    expect(parsed.exercises.every(r=>r.key && !/(?:-<|->|not=|\^$)/.test(r.key.answerText))).toBe(true);
  });
});
