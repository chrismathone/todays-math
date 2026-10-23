// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { workbookCreateEditionSchema } from '@/contracts/commercialWorkbook.contract';
import { assertUniqueAddresses, parseWorkbookImport } from '@/lib/commercialWorkbooks/import';
import pack from '../../../data/commercial-workbooks/ne-dalgom-calculation-4-2-v1.json';
import coverage from '../../../data/commercial-workbooks/ne-dalgom-calculation-4-2-v1.coverage.json';
const parsed = workbookCreateEditionSchema.parse({requestId:'dalgom-expansion-20261024',metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
// Independent inventory recorded while viewing all 40 answer pages.
const counts=[[7,8],[8,7],[14,13],[15,14],[5,4],[9,8],[15,15],[15,15],[5,5],[6,5],[7,7],[11,11],[8,7],[9,9],[15,15],[15,15],[5,5],[6,7],[14,14],[14,14],[5,4],[7,7],[15,15],[15,15],[2,3],[4,5],[7,7],[14,14],[5,5],[10,10],[14,15],[8,8],[15,19],[5,4],[10,11],[15,15],[8,8],[15,19],[5,5],[10,10],[14,15],[8,8],[15,19],[3,3],[10,11],[15,15],[8,8],[15,19]];
const starts=[10,22,34,46,58,70,82,94,108,122,136];
const at=(p:number,n:number)=>parsed.exercises.find(r=>r.address.page===String(p)&&r.address.number===String(n))!;
describe('NE Dalgom 4-2 numbered Day 01–48 official answers',()=>{
 it('uses the strict contract and lossless TSV including nulls',()=>{
  const tsv=readFileSync(fileURLToPath(new URL('../../../data/commercial-workbooks/ne-dalgom-calculation-4-2-v1.tsv',import.meta.url)),'utf8');
  const imported=parseWorkbookImport(tsv);expect(imported.issues).toEqual([]);expect(imported.exercises).toEqual(parsed.exercises);expect(parsed.exercises).toEqual(pack.exercises);expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
 });
 it('covers every independently inventoried numbered address without guessing activity addresses',()=>{
  const expected=[];let day=0;
  for(const [ci,start] of starts.entries())for(let d=0;d<(ci<7?4:5);d++){
   const pair=counts[day++];for(let half=0;half<2;half++)for(let n=1;n<=pair[half];n++)expected.push({volume:'4-2',section:`Day ${String(day).padStart(2,'0')}`,page:String(start+d*2+half),number:String(n+(half?pair[0]:0)),subpart:''});
  }
  expect(parsed.exercises.map(r=>r.address)).toEqual(expected);expect(coverage.pageGroups).toHaveLength(96);expect(coverage.counts.exercises).toBe(expected.length);
  expect(coverage.nullKeyLedger.map(x=>x.address)).toEqual(parsed.exercises.filter(r=>!r.key).map(r=>r.address));expect(coverage.nullKeyLedger.every(x=>x.reason&&x.sourcePage)).toBe(true);
  expect(coverage.counts.reviewedKeys).toBe(parsed.exercises.filter(r=>r.key?.status==='reviewed').length);expect(coverage.counts.nullKeys).toBe(coverage.nullKeyLedger.length);expect(coverage.counts.unreviewedKeys).toBe(0);
  expect(coverage.outOfScope[1].numberCounts).toEqual([52,56,51]);expect(coverage.scope.wholeRequestedQuickAnswerScope).toBe(false);
 });
 it('preserves fractions, decimals, continuation pages and numeric equality chains',()=>{
  const fixtures:[number,number,string,number][]=[[14,14,'26/9',2],[17,29,'7',3],[27,30,'1 3/19',5],[29,30,'1 1/4',6],[37,11,'(3+2)+(14/17+12/17)=5+26/17=5+1 9/17=6 9/17',8],[41,22,'5 8/9',10],[51,30,'1/6',12],[53,30,'15/25',13],[61,13,'(6−4)+(22/23−18/23)=2+4/23=2 4/23',16],[77,30,'5 15/32',20],[84,4,'4 13/9−3 6/9=(4−3)+(13/9−6/9)=1+7/9=1 7/9',22],[86,1,'25, 13, 12, 1 5/7',22],[99,29,'32.08',26],[115,16,'23.89',29],[125,20,'29.38',32],[139,21,'53.254',35],[145,34,'6.189',37]];
  for(const [p,n,answer,sourcePage] of fixtures)expect(at(p,n).key).toEqual({answerText:answer,status:'reviewed',sourcePage});
  for(const [p,n] of [[59,10],[94,5],[123,10]])expect(at(p,n).key).toBeNull();
  let equations=0;
  // Flat fraction equality chains: independent arithmetic catches flipped numerator/denominator.
  const val=(raw:string)=>{const m=raw.match(/^(?:(\d+) )?(\d+)\/(\d+)$/);return m?Number(m[1]??0)+Number(m[2])/Number(m[3]):Number(raw)};
  for(const row of parsed.exercises){const t=row.key?.answerText??'';const m=t.match(/^(\d+\/\d+)([+−])(\d+\/\d+)=(\d+\/\d+)=(\d+(?: \d+\/\d+)?)$/);if(m){expect(m[2]==='+'?val(m[1])+val(m[3]):val(m[1])-val(m[3])).toBeCloseTo(val(m[4]),10);expect(val(m[4])).toBeCloseTo(val(m[5]),10);equations++}}
  expect(equations).toBeGreaterThan(20);expect(parsed.exercises.filter(r=>/^\d+\.\d+$/.test(r.key?.answerText??'')).length).toBeGreaterThan(400);
 });
 it('keeps verified provenance and explicitly unknown curriculum',()=>{
  expect(pack.id).toBe('ne-dalgom-calculation-4-2-v1');expect(parsed.metadata.isbn).toBe('9791125343110');expect(parsed.metadata.curriculum).toBeUndefined();expect(coverage.source.sha256).toBe('bcb165c907d9586d9168465b7c96c4662c79b676c8328c2fe114f5c25e3122c4');expect(pack.provenance.description).toContain(coverage.source.sha256);expect(coverage.source.pageCount).toBe(40);expect(coverage.source.reviewedImages).toHaveLength(40);expect(coverage.reviewMethod.allAnswerRegionsVisuallyInspected).toBe(true);
 });
});
