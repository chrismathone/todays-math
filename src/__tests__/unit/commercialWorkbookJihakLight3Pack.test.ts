// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/jihak-poongsanja-light-middle3-1-2022-v1.json";
import coverage from "../../../data/commercial-workbooks/jihak-poongsanja-light-middle3-1-2022-v1.coverage.json";
const parsed = workbookCreateEditionSchema.parse({ requestId: "jihak-light-3-1-reviewed-20261024", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
// Independently inventoried starts at all thirty printed section headers.
const starts = [1,64,128,151,190,228,241,272,314,328,356,403,418,469,533,556,615,683,707,764,843,867,881,922,944,990,1056,1078,1094,1161];
const pages = ["007, 009","010~018","019~021","023, 025","026~031","032~033","035","036~041","042~043","045","046~052","053~054","057, 059","060~068","069~071","073, 075, 077","078~087","088~090","093, 095, 097","098~108","109~111","113","114~119","120~122","125, 127","128~138","139~141","143, 145","146~156","157~159"];
const titles = ["1 제곱근의 뜻과 성질","2 무리수와 실수","3 근호를 포함한 식의 곱셈과 나눗셈","4 근호를 포함한 식의 덧셈과 뺄셈","1 다항식의 곱셈","2 다항식의 인수분해","1 이차방정식의 풀이","2 이차방정식의 활용","1 이차함수의 그래프 ⑴","2 이차함수의 그래프 ⑵"];
const kinds = ["개념으로 연습하기","유형으로 도전하기","배운내용 점검하기"];
const at = (n: number) => parsed.exercises[n-1];
describe("Poongsanja Light middle 3-1 complete official address scope", () => {
  it("strictly parses and exactly roundtrips every TSV row", () => {
    expect(Object.keys(pack).sort()).toEqual(["coverage","exercises","id","label","metadata","provenance"]);
    expect(parseWorkbookImport(readFileSync(new URL("../../../data/commercial-workbooks/jihak-poongsanja-light-middle3-1-2022-v1.tsv",import.meta.url),"utf8"))).toEqual({ exercises: parsed.exercises, issues: [] });
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(1182);
  });
  it("matches every independent printed section, page range and continuous number", () => {
    const expected = starts.flatMap((start,i) => Array.from({length: (starts[i+1] ?? 1183)-start},(_,j) => ({volume:"",section:`${titles[Math.floor(i/3)]} / ${kinds[i%3]}`,page:pages[i],number:String(start+j).padStart(4,"0"),subpart:""})));
    expect(parsed.exercises.map(row=>row.address)).toEqual(expected);
    expect(coverage.pageGroups.map(g=>g.page)).toEqual(pages);
    expect(coverage.counts).toMatchObject({exercises:1182,reviewedKeys:1172,nullKeys:10,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:30});
  });
  it("retains every graph and partial solution exclusion with exact evidence", () => {
    const missing=[974,975,980,981,988,989,1026,1034,1042,1078];
    expect(parsed.exercises.filter(row=>!row.key).map(row=>Number(row.address.number))).toEqual(missing);
    expect(coverage.nullKeyLedger.map(row=>row.address)).toEqual(missing.map(n=>at(n).address));
    expect(coverage.nullKeyLedger.every(row=>row.key===null && row.registered && row.bbox.length===4 && row.note.length>30)).toBe(true);
  });
  it("preserves reviewed fractions, radicals, signs, units and multipart keys", () => {
    const fixtures = [[20,"sqrt(1/3)",2],[83,"sqrt(24)cm",4],[254,"sqrt(13)/4",16],[262,"-sqrt(3/25)",16],[270,"8sqrt(11)/11",16],[346,"(sqrt(6)+2)/2",22],[468,"64, 16, 80",31],[574,"25",39],[709,"×",47],[750,"5, 5, 3, 1, (-5±sqrt(13))/2",48],[827,"sqrt(41)/2",55],[867,"1, 2 / -44, 0 / 0, 1",58],[987,"꼭짓점의 좌표: (-1/5, 3/10), 축의 방정식: x=-1/5",67],[1182,"70m",86]] as const;
    for(const [n,answerText,sourcePage] of fixtures) expect(at(n).key).toEqual({answerText,status:"reviewed",sourcePage});
  });
  it("checks whole-book numeric and choice invariants and every chapter ending", () => {
    const ends=[150,240,327,417,555,706,866,943,1077,1182];
    expect(ends.map(n=>at(n).key?.answerText)).toEqual(["①","③","③","③","④","a+7","x=-3","14cm","a<0, p<0, q<0","70m"]);
    expect(parsed.exercises.filter(row=>row.key && /^[①②③④⑤]$/.test(row.key.answerText))).toHaveLength(478);
    const byPage:Record<string,number>={};
    for(const row of parsed.exercises) if(row.key){
      expect(row.key.status).toBe("reviewed");
      expect(row.key.answerText).not.toMatch(/[\u0000-\u001F\uFFFD§¶Ä®]|풀이 참조/);
      expect(row.key.sourcePage).toBeGreaterThanOrEqual(2);
      expect(row.key.sourcePage).toBeLessThanOrEqual(86);
      byPage[row.key.sourcePage!]=(byPage[row.key.sourcePage!]??0)+1;
    }
    expect(byPage).toEqual(coverage.counts.byReviewedKeySourcePage);
    expect(Object.keys(byPage)).toHaveLength(85);
  });
  it("keeps official provenance and unknown edition details explicit", () => {
    expect(coverage.source).toMatchObject({sourceRelativePath:"major/pdfs/jihak-5.pdf",pageCount:88,byteCount:2329925,sha256:"71a38053bd7ad06b9bda1e3e399b3aafd8dcf42ac0a6cdd367b80fea8c67d7b2"});
    expect(parsed.metadata.curriculum).toBe("2022 개정");
    expect(parsed.metadata.edition).toContain("미확인");
    expect(parsed.metadata).not.toHaveProperty("isbn");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
    expect(parsed.provenance.reference).toContain(coverage.source.bookUrl);
    expect(coverage.grading).toBe("manual-reference-only");
  });
});
