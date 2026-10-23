// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { workbookCreateEditionSchema } from '@/contracts/commercialWorkbook.contract';
import { assertUniqueAddresses, parseWorkbookImport } from '@/lib/commercialWorkbooks/import';
import pack from '../../../data/commercial-workbooks/chun-ddapul-5-1-upper-v1.json';
import coverage from '../../../data/commercial-workbooks/chun-ddapul-5-1-upper-v1.coverage.json';
const parsed=workbookCreateEditionSchema.parse({requestId:'chun5-expansion-20261024',metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
// Independent visual inventory, first/second printed page per A/B type.
const pairs=[[2,10],[3,13],[4,7],[0,12],[0,14],[6,4],[0,9],[0,9],[0,9],[0,9],[2,8],[0,8],[2,6],[0,8],[0,10],[3,6],[4,6],[4,8],[0,6],[2,6],[1,5],[0,5],[1,5],[1,5],[1,5],[2,5],[1,5],[2,6],[0,8],[2,8],[4,4],[2,8],[1,8],[0,8],[0,8],[3,7],[2,7],[3,7],[0,8],[0,7]];
const guideCounts:Record<number,number>={6:3,8:1,10:3,12:6,14:4,16:3,18:3,20:2,22:2,24:2,26:4,28:2,30:4,32:4,34:4,36:3,38:3,40:3,42:7,44:3,52:4,54:4,56:4,58:4,60:4,62:4,64:4,66:4,68:4,70:4,72:2,73:3,74:3,76:3,78:6,80:6,82:3,84:3,86:3,88:5,90:4};
const at=(p:number,n:string,sub='')=>parsed.exercises.find(r=>r.address.page===String(p)&&r.address.number===n&&r.address.subpart===sub)!;
describe('Chun Ddapul 5-1 upper official typed exercises and examples',()=>{
 it('uses canonical contract and exact TSV roundtrip',()=>{
  const tsv=readFileSync(fileURLToPath(new URL('../../../data/commercial-workbooks/chun-ddapul-5-1-upper-v1.tsv',import.meta.url)),'utf8');const imported=parseWorkbookImport(tsv);expect(imported.issues).toEqual([]);expect(imported.exercises).toEqual(parsed.exercises);expect(pack.exercises).toEqual(parsed.exercises);expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
 });
 it('covers independent page, type, two-digit number and parenthesized subpart expectations',()=>{
  const expected=[];
  for(const [i,pair]of pairs.entries()){
   const part=i<20?'PART 1':'PART 2',sec=String(Math.floor(i/2)+1).padStart(2,'0')+(i%2?'B':'A');
   for(let h=0;h<2;h++){
    const page=6+i*2+(i>=20?6:0)+h;
    for(let s=1;s<=(guideCounts[page]??0);s++)expected.push({volume:'5-1 상',section:part,page:String(page),number:sec,subpart:page===8?'':`(${s})`});
    for(let n=1;n<=pair[h];n++)expected.push({volume:'5-1 상',section:`${part} / ${sec}`,page:String(page),number:String(n+(h?pair[0]:0)).padStart(2,'0'),subpart:''});
   }
  }
  expect(parsed.exercises.map(r=>r.address)).toEqual(expected);expect(expected).toHaveLength(502);expect(coverage.pageGroups).toHaveLength(80);
  expect(coverage.nullKeyLedger.map(x=>x.address)).toEqual(parsed.exercises.filter(r=>!r.key).map(r=>r.address));expect(coverage.counts).toEqual({exercises:502,reviewedKeys:472,nullKeys:30,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:80});expect(coverage.scope.wholeRequestedQuickAnswerScope).toBe(false);expect(coverage.outOfScope.slice(0,2).map(x=>x.numbers?.length)).toEqual([12,12]);
 });
 it('checks arithmetic, fractions, marked choices and example subparts',()=>{
  for(const [p,n,answer] of [[6,'01','4+4×4÷4−4=4'],[15,'01','○7, △9'],[37,'04','18/27'],[39,'10','5/18, 7/18, 11/18, 13/18'],[82,'02','18/42'],[85,'06','5/7'],[87,'06','8, 20, 6/14, 3/7'],[91,'07','144']] as const)expect(at(p,n).key?.answerText).toBe(answer);
  expect(at(8,'01B').key?.answerText).toContain('(44−4)÷4=10');expect(at(54,'11B','(4)').key?.answerText).toBe('100000÷500=200');expect(at(88,'20A','(4)').key?.answerText).toBe('40 cm²');expect(at(29,'01').key).toBeNull();expect(at(41,'12').key).toBeNull();expect(at(52,'01').address.section).toBe('PART 2 / 11A');
  let n=0;for(const row of parsed.exercises){for(const chain of row.key?.answerText.split(/[;,] */)??[]){if(!/^[\d()+−×÷]+=[\d]+$/.test(chain))continue;const [lhs,rhs]=chain.split('=');const value=Function('return ('+lhs.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-')+')')();expect(value).toBe(Number(rhs));n++}}expect(n).toBeGreaterThanOrEqual(50);
 });
 it('does not invent edition or source metadata',()=>{
  expect(pack.id).toBe('chun-ddapul-5-1-upper-v1');expect(parsed.metadata.isbn).toBeUndefined();expect(parsed.metadata.curriculum).toBeUndefined();expect(coverage.source.editionEvidence).toMatchObject({isbn:null,publicationDate:null,curriculum:null,impression:null});expect(coverage.source.sha256).toBe('043d90b25a61c8a27794d6469407fa23d0281b7c4e3b6c270194ec2d58c07eac');expect(pack.provenance.description).toContain(coverage.source.sha256);expect(coverage.source.reviewedImages).toHaveLength(32);expect(coverage.reviewMethod.allAnswerRegionsVisuallyInspected).toBe(true);
 });
});
