// @vitest-environment node
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe,expect,it} from 'vitest';
import {workbookCreateEditionSchema} from '@/contracts/commercialWorkbook.contract';
import {assertUniqueAddresses,parseWorkbookImport} from '@/lib/commercialWorkbooks/import';
import pack from '../../../data/commercial-workbooks/ne-gak-common-math1-2023-v1.json';
import coverage from '../../../data/commercial-workbooks/ne-gak-common-math1-2023-v1.coverage.json';
const parsed=workbookCreateEditionSchema.parse({requestId:'ne-high-expansion-20261024',metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
// Printed source headings and independently checked number boundaries, not generated pack rows.
const groups:[string,number,number][]=[['9, 11',1,11],['12 ~ 21',12,65],['22 ~ 25',66,85],['27, 29',86,95],['30 ~ 44',96,175],['45 ~ 47',176,192],['51, 53',193,203],['54 ~ 63',204,255],['64 ~ 67',256,275],['69, 71',276,291],['72 ~ 82',292,355],['83 ~ 85',356,371],['87, 89',372,382],['90 ~ 97',383,430],['98 ~ 101',431,448],['103, 105',449,462],['106 ~ 117',463,530],['118 ~ 121',531,550],['125, 127',551,560],['128 ~ 135',561,606],['136 ~ 139',607,624],['141, 143',625,642],['144 ~ 155',643,710],['156 ~ 159',711,728],['163, 165',729,741],['166 ~ 181',742,835],['182 ~ 185',836,855],['189, 191',856,869],['192 ~ 202',870,929],['203 ~ 205',930,945]];
const units=['01 다항식의 연산','02 나머지정리와 인수분해','03 복소수','04 이차방정식','05 이차방정식과 이차함수','06 여러 가지 방정식','07 연립일차부등식','08 이차부등식과 연립이차부등식','09 순열과 조합','10 행렬과 그 연산'];
const stages=['A step 개념 익히고,','B step 기출 & 변형하면…','C step 실력 완성!'];
const at=(n:number)=>parsed.exercises[n-1];
describe('NE Gak common math 1 complete numbered addresses and reviewed short references',()=>{
 it('conforms strictly and roundtrips the TSV without losing null rows',()=>{
  const tsv=readFileSync(fileURLToPath(new URL('../../../data/commercial-workbooks/ne-gak-common-math1-2023-v1.tsv',import.meta.url)),'utf8');const got=parseWorkbookImport(tsv);expect(got.issues).toEqual([]);expect(got.exercises).toEqual(parsed.exercises);expect(pack.exercises).toEqual(parsed.exercises);expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
 });
 it('covers exactly 0001–0945 with all 30 printed ranges and an exact missing-key ledger',()=>{
  const expected=groups.flatMap(([page,a,b],i)=>Array.from({length:b-a+1},(_,j)=>({volume:'공통수학1',section:`${units[Math.floor(i/3)]} / ${stages[i%3]}`,page,number:String(a+j).padStart(4,'0'),subpart:''})));
  expect(parsed.exercises.map(r=>r.address)).toEqual(expected);expect(expected).toHaveLength(945);expect(coverage.pageGroups.map(g=>[g.page,Number(g.firstNumber),Number(g.lastNumber)])).toEqual(groups);expect(coverage.nullKeyLedger.map(r=>r.address)).toEqual(parsed.exercises.filter(r=>!r.key).map(r=>r.address));expect(coverage.counts).toEqual({exercises:945,reviewedKeys:763,nullKeys:182,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:30});expect(coverage.scope.allAnswersPresent).toBe(false);expect(coverage.scope.individualTextbookPageResolved).toBe(false);
 });
 it('preserves choice circles, negative signs and whole integer values with source page transitions',()=>{
  for(const [n,a]of [[12,'④'],[19,'2'],[21,'0'],[33,'81'],[110,'−120'],[168,'10001'],[215,'−3'],[326,'−1'],[398,'−1'],[473,'0'],[600,'−9'],[775,'⑤'],[808,'④'],[816,'4800'],[885,'−24'],[934,'③'],[945,'16']]as const)expect(at(n).key?.answerText).toBe(a);
  const histogram:Record<string,number>={};let ints=0;for(const r of parsed.exercises){if(!r.key)continue;expect(r.key.status).toBe('reviewed');expect(r.key.answerText).toMatch(/^(?:[①②③④⑤]|−?\d+)$/);if(/^[①②③④⑤]$/.test(r.key.answerText))histogram[r.key.answerText]=(histogram[r.key.answerText]??0)+1;else{expect(Number.isSafeInteger(Number(r.key.answerText.replace('−','-')))).toBe(true);ints++}}
  expect(histogram).toEqual({'①':91,'②':93,'③':95,'④':94,'⑤':99});expect(ints).toBe(291);expect(at(934).key?.sourcePage).toBe(161);expect(at(945).key?.sourcePage).toBe(163);expect(at(1).key).toBeNull();expect(at(5).key).toBeNull();expect(at(445).key).toBeNull();expect(at(944).key).toBeNull();
 });
 it('records verified edition provenance without inventing curriculum or claiming all answers reviewed',()=>{
  expect(pack.id).toBe('ne-gak-common-math1-2023-v1');expect(parsed.metadata.isbn).toBe('979-11-253-4326-4');expect(parsed.metadata.curriculum).toBeUndefined();expect(coverage.source.editionEvidence).toMatchObject({publicationDate:'2023.11',curriculum:null,impression:null});expect(coverage.source.sha256).toBe('b219d92470219eb6d206aaf83353f026e35ed125569ab9df1dd4a76cc398b1b2');expect(pack.provenance.description).toContain(coverage.source.sha256);expect(coverage.reviewMethod.allPublishedKeyRegionsVisuallyInspected).toBe(true);expect(coverage.reviewMethod.unpublishedAnswersFullyReviewed).toBe(false);
 });
});
