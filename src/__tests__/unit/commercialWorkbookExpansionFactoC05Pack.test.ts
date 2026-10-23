// @vitest-environment node
import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {describe,expect,it} from 'vitest';
import {workbookCreateEditionSchema} from '@/contracts/commercialWorkbook.contract';import {assertUniqueAddresses,parseWorkbookImport} from '@/lib/commercialWorkbooks/import';
import pack from '../../../data/commercial-workbooks/mathtian-facto-operation-c05-v1.json';import coverage from '../../../data/commercial-workbooks/mathtian-facto-operation-c05-v1.coverage.json';
const parsed=workbookCreateEditionSchema.parse({requestId:'facto-c05-expansion-20261024',metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
const at=(n:number)=>parsed.exercises[n-1].key!.answerText;
const fraction=(s:string)=>{const p=s.split(' '),f=p.at(-1)!.split('/').map(Number);return (p.length===2?Number(p[0]):0)+(f.length===2?f[0]/f[1]:f[0])};
describe('Facto C05 all addressable printed numbered exercises',()=>{
 it('validates strict import contracts and exact TSV roundtrip',()=>{const t=readFileSync(fileURLToPath(new URL('../../../data/commercial-workbooks/mathtian-facto-operation-c05-v1.tsv',import.meta.url)),'utf8');const got=parseWorkbookImport(t);expect(got.issues).toEqual([]);expect(got.exercises).toEqual(parsed.exercises);expect(pack.exercises).toEqual(parsed.exercises);expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow()});
 it('keeps all 40 test numbers and 9 printed crossword identifiers without numbering unlabelled activities',()=>{
  const a=[];for(const [page,start,end]of [[38,1,12],[39,13,24],[40,25,37],[41,38,40]])for(let n=start;n<=end;n++)a.push({volume:'C05',section:'1주 연산 실력 체크',page:String(page),number:String(n),subpart:''});for(const [group,ids]of [['가로 열쇠','①②③④⑤'],['세로 열쇠','㉠㉡㉢㉣']])for(const number of ids)a.push({volume:'C05',section:`2주 5일차 소수의 표현 / ${group}`,page:'63',number,subpart:''});expect(parsed.exercises.map(r=>r.address)).toEqual(a);expect(coverage.counts).toEqual({exercises:49,reviewedKeys:49,nullKeys:0,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:6});expect(coverage.nullKeyLedger).toEqual([]);expect(coverage.scope.wholeBookAddressAudit).toBe(false);expect(coverage.outOfScope).toHaveLength(26);expect(new Set(parsed.exercises.map(r=>r.key?.sourcePage))).toEqual(new Set([12,17]));
 });
 it('checks mixed/improper fraction pairs, comparison signs and decimal arithmetic',()=>{
  expect([at(4),at(5),at(6)]).toEqual(['<','>','<']);expect(at(3)).toBe('4/6');expect(at(22)).toBe('4 6/7, 34/7');for(let n=19;n<=30;n++){const [a,b]=at(n).split(', ');expect(fraction(a)).toBeCloseTo(fraction(b),12)}
  for(const [n,a,b,op]of [[31,3.4,2.9,'+'],[32,1.7,6.5,'+'],[33,4.7,3.3,'-'],[34,6.2,1.8,'-'],[35,8.4,5.9,'-'],[36,1.46,2.25,'+'],[37,4.58,1.79,'+'],[38,4.79,1.32,'-'],[39,3.14,1.09,'-'],[40,6.41,2.87,'-']]as const)expect(Number(at(n))).toBeCloseTo(op==='+'?a+b:a-b,12);
  const expected=[0.23+0.22,0.85+0.78,8.9+5.8,5.65+2.25,1.96+1.85,5.23-0.27,1.12-0.75,7.39-1.53,11-1.1];parsed.exercises.slice(40).forEach((r,i)=>expect(Number(r.key!.answerText)).toBeCloseTo(expected[i],12));
 });
 it('records provenance and scan review without guessing edition details',()=>{expect(pack.id).toBe('mathtian-facto-operation-c05-v1');expect(parsed.metadata.isbn).toBeUndefined();expect(parsed.metadata.curriculum).toBeUndefined();expect(coverage.source.sha256).toBe('3450da5fb9ff2ece7ab324d2527993ad03697e0b50df8108b02b7918bc6928b8');expect(pack.provenance.description).toContain(coverage.source.sha256);expect(coverage.source.reviewedImages).toHaveLength(27);expect(coverage.reviewMethod.ocrUsedAsReviewedText).toBe(false);expect(parsed.exercises.every(r=>r.key?.status==='reviewed')).toBe(true)});
});
