// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { workbookCreateEditionSchema } from '@/contracts/commercialWorkbook.contract';
import { assertUniqueAddresses, parseWorkbookImport } from '@/lib/commercialWorkbooks/import';
import pack from '../../../data/commercial-workbooks/chun-ddapul-6-2-upper-v1.json';
import coverage from '../../../data/commercial-workbooks/chun-ddapul-6-2-upper-v1.coverage.json';
const parsed=workbookCreateEditionSchema.parse({requestId:'chun6-expansion-20261024',metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
// Independent visual inventory, first/second printed page per A/B type.
const pairs=[[0,12],[4,8],[0,6],[2,6],[0,6],[1,6],[2,6],[2,6],[0,6],[2,6],[0,8],[4,5],[0,8],[4,8],[2,8],[0,8],[2,6],[2,6],[2,8],[4,8],[3,7],[3,5],[1,8],[1,8],[1,5],[1,5],[1,6],[2,5],[1,6],[0,6],[0,6],[0,6],[0,8],[0,8],[2,6],[0,8],[0,6],[0,6],[2,8],[1,8]];
const guideCounts:Record<number,number>={6:6,8:4,10:5,12:2,14:6,16:3,18:2,20:5,22:5,24:3,26:4,28:3,30:4,32:2,34:3,36:5,38:3,40:4,42:3,44:3,52:4,54:3,56:4,58:4,60:5,62:3,64:5,66:3,68:3,70:6,72:7,74:4,76:3,78:5,80:5,82:5,84:3,86:3,88:4,90:3};
const at=(p:number,n:string,sub='')=>parsed.exercises.find(r=>r.address.page===String(p)&&r.address.number===n&&r.address.subpart===sub)!;
describe('Chun Ddapul 6-2 upper official typed exercises and examples',()=>{
 it('uses canonical contract and exact TSV roundtrip',()=>{
  const tsv=readFileSync(fileURLToPath(new URL('../../../data/commercial-workbooks/chun-ddapul-6-2-upper-v1.tsv',import.meta.url)),'utf8');const imported=parseWorkbookImport(tsv);expect(imported.issues).toEqual([]);expect(imported.exercises).toEqual(parsed.exercises);expect(pack.exercises).toEqual(parsed.exercises);expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
 });
 it('covers independent page, type, two-digit number and parenthesized subpart expectations',()=>{
  const expected=[];
  for(const [i,pair]of pairs.entries()){
   const part=i<20?'PART 1':'PART 2',sec=String(Math.floor(i/2)+1).padStart(2,'0')+(i%2?'B':'A');
   for(let h=0;h<2;h++){
    const page=6+i*2+(i>=20?6:0)+h;
    for(let s=1;s<=(guideCounts[page]??0);s++)expected.push({volume:'6-2 상',section:part,page:String(page),number:sec,subpart:`(${s})`});
    for(let n=1;n<=pair[h];n++)expected.push({volume:'6-2 상',section:`${part} / ${sec}`,page:String(page),number:String(n+(h?pair[0]:0)).padStart(2,'0'),subpart:''});
   }
  }
  expect(parsed.exercises.map(r=>r.address)).toEqual(expected);expect(expected).toHaveLength(481);expect(coverage.pageGroups).toHaveLength(80);
  expect(coverage.nullKeyLedger.map(x=>x.address)).toEqual(parsed.exercises.filter(r=>!r.key).map(r=>r.address));expect(coverage.counts).toEqual({exercises:481,reviewedKeys:460,nullKeys:21,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:80});expect(coverage.scope.wholeRequestedQuickAnswerScope).toBe(false);expect(coverage.outOfScope.slice(0,2).map(x=>x.numbers?.length)).toEqual([12,12]);
 });
 it('preserves mixed fractions, ratio colons, degrees and units and checks numerical references',()=>{
  for(const [p,n,answer] of [[8,'01','31 1/2'],[9,'09','3/50'],[17,'04','71 2/3'],[31,'01','1/3'],[34,'01','2/9'],[60,'01','5:7, 35'],[67,'06','6:4:3'],[67,'07','15:12:20'],[83,'08','2287.125'],[90,'01','2110.08−226.08+602.88=2486.88']] as const)expect(at(p,n).key?.answerText).toBe(answer);
  expect(at(36,'08B','(3)').key?.answerText).toBe('150°');expect(at(42,'10A','(3)').key?.answerText).toBe('392.5 cm³');expect(at(34,'08A','(3)').key?.answerText).toBe('51.7 cm');expect(at(56,'01').key).toBeNull();expect(at(87,'02').key).toBeNull();expect(at(52,'01').address.section).toBe('PART 2 / 11A');
  const fraction=(x:string)=>{const a=x.split('/').map(Number);return a[0]/a[1]};expect(fraction('70/360')).toBe(fraction('7/36'));expect((2+1/4)/(5+1/7)).toBeCloseTo(7/16);expect(7/16*20).toBe(8+3/4);expect(2110.08-226.08+602.88).toBeCloseTo(Number(at(90,'01').key!.answerText.split('=')[1]));
  const numeric=parsed.exercises.flatMap(x=>x.key&&/^\d+(?:\.\d+)?$/.test(x.key.answerText)?[Number(x.key.answerText)]:[]);expect(numeric.length).toBeGreaterThan(220);expect(numeric.every(Number.isFinite)).toBe(true);expect(at(6,'01A','(2)').key?.answerText).toContain('‘약수’에 ○표');
 });
 it('does not invent edition or source metadata',()=>{
  expect(pack.id).toBe('chun-ddapul-6-2-upper-v1');expect(parsed.metadata.isbn).toBeUndefined();expect(parsed.metadata.curriculum).toBeUndefined();expect(coverage.source.editionEvidence).toMatchObject({isbn:null,publicationDate:null,curriculum:null,impression:null});expect(coverage.source.sha256).toBe('23bff37009fa0b6dbe61388ad6d7f44e292a5508b07aa250799f31059dadbd19');expect(pack.provenance.description).toContain(coverage.source.sha256);expect(coverage.source.reviewedImages).toHaveLength(40);expect(coverage.reviewMethod.allAnswerRegionsVisuallyInspected).toBe(true);
 });
});
