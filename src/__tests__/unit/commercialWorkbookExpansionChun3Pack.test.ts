// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { workbookCreateEditionSchema } from '@/contracts/commercialWorkbook.contract';
import { assertUniqueAddresses, parseWorkbookImport } from '@/lib/commercialWorkbooks/import';
import pack from '../../../data/commercial-workbooks/chun-ddapul-3-1-upper-v1.json';
import coverage from '../../../data/commercial-workbooks/chun-ddapul-3-1-upper-v1.coverage.json';
const parsed=workbookCreateEditionSchema.parse({requestId:'chun3-expansion-20261024',metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
// Independent visual inventory, first/second printed page per A/B type.
const pairs=[[4,12],[4,12],[2,8],[4,4],[4,11],[3,9],[6,9],[1,8],[4,9],[4,9],[6,10],[3,10],[4,8],[4,12],[4,8],[4,4],[2,2],[2,3],[4,6],[0,3],[4,4],[2,6],[0,10],[4,6],[2,4],[0,6],[6,4],[6,4],[0,5],[1,5],[3,9],[0,6],[4,12],[6,13],[6,16],[4,12],[2,8],[0,9],[1,10],[2,8]];
const guideCounts:Record<number,number>={6:2,8:3,10:2,12:3,14:2,16:5,18:3,20:4,22:3,24:3,26:2,28:2,30:2,32:3,34:3,36:3,38:2,39:3,40:2,41:3,42:2,44:4,52:2,53:2,54:2,56:4,58:3,60:2,62:3,64:3,66:3,68:4,70:3,72:6,74:3,76:2,78:3,80:2,82:3,84:3,86:4,88:2,90:2};
const at=(p:number,n:string,sub='')=>parsed.exercises.find(r=>r.address.page===String(p)&&r.address.number===n&&r.address.subpart===sub)!;
describe('Chun Ddapul 3-1 upper official typed exercises and examples',()=>{
 it('uses canonical contract and exact TSV roundtrip',()=>{
  const tsv=readFileSync(fileURLToPath(new URL('../../../data/commercial-workbooks/chun-ddapul-3-1-upper-v1.tsv',import.meta.url)),'utf8');const imported=parseWorkbookImport(tsv);expect(imported.issues).toEqual([]);expect(imported.exercises).toEqual(parsed.exercises);expect(pack.exercises).toEqual(parsed.exercises);expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
 });
 it('covers independent page, type, two-digit number and parenthesized subpart expectations',()=>{
  const expected=[];
  for(const [i,pair]of pairs.entries()){
   const part=i<20?'PART 1':'PART 2',sec=String(Math.floor(i/2)+1).padStart(2,'0')+(i%2?'B':'A');
   for(let h=0;h<2;h++){
    const page=6+i*2+(i>=20?6:0)+h;
    for(let s=1;s<=(guideCounts[page]??0);s++)expected.push({volume:'3-1 상',section:part,page:String(page),number:sec,subpart:`(${s})`});
    for(let n=1;n<=pair[h];n++)expected.push({volume:'3-1 상',section:`${part} / ${sec}`,page:String(page),number:String(n+(h?pair[0]:0)).padStart(2,'0'),subpart:''});
   }
  }
  expect(parsed.exercises.map(r=>r.address)).toEqual(expected);expect(expected).toHaveLength(558);expect(coverage.pageGroups).toHaveLength(80);
  expect(coverage.nullKeyLedger.map(x=>x.address)).toEqual(parsed.exercises.filter(r=>!r.key).map(r=>r.address));expect(coverage.counts).toEqual({exercises:558,reviewedKeys:502,nullKeys:56,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:80});expect(coverage.scope.wholeRequestedQuickAnswerScope).toBe(false);expect(coverage.outOfScope.slice(0,2).map(x=>x.numbers?.length)).toEqual([12,12]);
 });
 it('checks decoded math glyphs, fraction ordering, example subparts and chapter boundaries',()=>{
  for(const [p,n,answer] of [[6,'01','749−412=337'],[15,'15','420'],[30,'01','3/8'],[31,'12','4/12'],[33,'10','13/34, 13/30, 17/30'],[53,'08','100'],[65,'10','42, 4, 54, 1, 55, 6'],[81,'22','198'],[88,'01','1/2, 1/4, 1/8, 1/16'],[90,'02','6/8']] as const)expect(at(p,n).key?.answerText).toBe(answer);
  expect(at(26,'06A','(2)').key?.answerText).toBe('25 m');expect(at(16,'03B','(4)').key?.answerText).toBe('100, 18200');expect(at(68,'15A','(4)').key).toBeNull();expect(at(75,'01').key).toBeNull();expect(at(78,'01').key).toBeNull();expect(at(91,'10').key).toBeNull();expect(at(52,'01').address.section).toBe('PART 2 / 11A');
  let n=0;for(const row of parsed.exercises){const m=row.key?.answerText.match(/^(\d+)([+−×÷])(\d+)=(\d+)$/);if(m){const a=Number(m[1]),b=Number(m[3]);expect(m[2]==='+'?a+b:m[2]==='−'?a-b:m[2]==='×'?a*b:a/b).toBe(Number(m[4]));n++}}expect(n).toBeGreaterThanOrEqual(18);
 });
 it('does not invent edition or source metadata',()=>{
  expect(pack.id).toBe('chun-ddapul-3-1-upper-v1');expect(parsed.metadata.isbn).toBeUndefined();expect(parsed.metadata.curriculum).toBeUndefined();expect(coverage.source.editionEvidence).toMatchObject({isbn:null,publicationDate:null,curriculum:null,impression:null});expect(coverage.source.sha256).toBe('ba4f685bb4246d096b1f89d6db6fc3903366a4978f2eac063658c7bd56d61023');expect(pack.provenance.description).toContain(coverage.source.sha256);expect(coverage.source.reviewedImages).toHaveLength(32);expect(coverage.reviewMethod.allAnswerRegionsVisuallyInspected).toBe(true);
 });
});
