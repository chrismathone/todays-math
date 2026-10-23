// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { workbookCreateEditionSchema } from '@/contracts/commercialWorkbook.contract';
import { assertUniqueAddresses, parseWorkbookImport } from '@/lib/commercialWorkbooks/import';
import pack from '../../../data/commercial-workbooks/mathtian-facto-gifted-e5-6-v1.json';
import coverage from '../../../data/commercial-workbooks/mathtian-facto-gifted-e5-6-v1.coverage.json';
const parsed = workbookCreateEditionSchema.parse({requestId:'facto-gifted-expansion-20261024',metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
const at=(p:string,n:string,subpart='')=>parsed.exercises.find(r=>r.address.page===p&&r.address.number===n&&r.address.subpart===subpart)!.key!.answerText;
const nums=(count:number)=>Array.from({length:count},(_,i)=>String(i+1).padStart(2,'0'));
const parens=(count:number)=>Array.from({length:count},(_,i)=>`(${i+1})`);
const evaluate=(s:string):number=>{
 const t=s.match(/\d+|[()+×÷−]/g)!;let i=0;
 const atom=():number=>{if(t[i]==='('){i++;const n=sum();expect(t[i++]).toBe(')');return n}return Number(t[i++])};
 const product=():number=>{let n=atom();while(t[i]==='×'||t[i]==='÷'){const op=t[i++],v=atom();n=op==='×'?n*v:n/v}return n};
 const sum=():number=>{let n=product();while(t[i]==='+'||t[i]==='−'){const op=t[i++],v=product();n=op==='+'?n+v:n-v}return n};
 const n=sum();expect(i).toBe(t.length);return n;
};
describe('Facto gifted grade 5–6 complete printed number census',()=>{
 it('validates strict contracts, uniqueness and exact TSV roundtrip',()=>{
  const t=readFileSync(fileURLToPath(new URL('../../../data/commercial-workbooks/mathtian-facto-gifted-e5-6-v1.tsv',import.meta.url)),'utf8');const got=parseWorkbookImport(t);
  expect(got.issues).toEqual([]);expect(got.exercises).toEqual(parsed.exercises);expect(pack.exercises).toEqual(parsed.exercises);expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();
 });
 it('matches the independent census of every printed section, number and selected subpart',()=>{
  const expected:typeof parsed.exercises[number]['address'][]=[];
  const add=(section:string,page:string,numbers:string[],subparts?:string[])=>numbers.forEach((number,i)=>expected.push({volume:'초등5~6학년',section,page,number,subpart:subparts?.[i]??''}));
  for(const [title,p,q,count]of [
   ['창의성 1 발명하기','055','058',3],['창의성 2 그림 완성하기','063','066',3],['창의성 3 때에 따른 다른 것 찾기','071','074',3],['창의성 4 기발한 해결 방법','079','082',3],['언어적 사고력 1 언어의 규칙','087','090',3],['언어적 사고력 2 조건에 맞게 글쓰기','095','098',3],['언어적 사고력 3 스토리텔링','103','106',2],
  ]as const){add(`2단계 영재성 검사 / ${title} / 연습하기`,p,nums(count));add(`2단계 영재성 검사 / ${title} / 실전문제`,q,nums(2))}
  for(const [title,groups]of [
   ['수리적 사고력 1 귀납적 논리',[['Drill','109',nums(2)],['유형 탐구','110',nums(4)],['Plus 유형','112',nums(4)]]],
   ['수리적 사고력 2 규칙 찾기',[['Drill','115',parens(3)],['유형 탐구','116',nums(3)],['Plus 유형','118',nums(4)]]],
   ['수리적 사고력 3 문제해결력',[['유형 탐구','121',nums(8)]]],
   ['수리적 사고력 4 여러 가지 퍼즐',[['대표 유형 탐구','126',parens(2)],['Drill','127',parens(3)],['유형 탐구','128',nums(4)]]],
   ['공간지각적 사고력 1 접어서 자른 모양',[['Drill','133',parens(2)],['유형 탐구','134',nums(4)],['Plus 유형','136',nums(2)]]],
   ['공간지각적 사고력 2 거울에 비친 모양',[['Drill','139',parens(4)],['유형 탐구','140',nums(3)],['Plus 유형','142',nums(2)]]],
   ['공간지각적 사고력 3 위, 앞, 옆에서 본 모양',[['Drill','145',parens(3)],['유형 탐구','146',nums(2)],['Plus 유형','148',nums(2)]]],
  ]as const)for(const [group,page,ids]of groups)add(`2단계 영재성 검사 / ${title} / ${group}`,page,[...ids]);
  for(const [group,start,titles]of [
   ['수와 연산',152,['포포즈','복면산','나눗셈','약속에 따른 계산','식 만들기']],['도형',157,['도형 그리기','조건에 맞게 그리기','도형 나누기','도형 붙이기','정육면체 전개도']],['규칙과 측정',162,['수 배열 규칙','눈금 없는 철사 자','양팔저울','둘레가 같은 도형','넓이가 같은 도형']],['논리와 퍼즐',167,['길 찾기','같은 합 만들기','두 수의 차','선잇기 퍼즐','도형 나누기 퍼즐']],
  ]as const)titles.forEach((title,i)=>add(`2단계 창의적 문제해결력 검사 / ${group} / ${title}`,String(start+i),[String(i+1)]));
  for(const [title,page,ids,subparts]of [
   ['1 고대의 수','174',['01','02','03','03'],['','','(1)','(2)']],['2 거울과 대칭','178',nums(3),[]],['3 시차','182',nums(2),[]],['4 물통과 그래프','186',['01','01','02','03'],['(1)','(2)','','']],['5 님게임','190',nums(3),[]],
  ]as const)add(`3단계 창의적 문제해결력 수행 관찰 / ${title}`,page,[...ids],[...subparts]);
  expect(parsed.exercises.map(r=>r.address)).toEqual(expected);expect(expected).toHaveLength(131);
  expect(coverage.counts).toEqual({exercises:131,reviewedKeys:47,nullKeys:84,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:58});
  const missing=parsed.exercises.filter(r=>r.key===null).map(r=>r.address);
  expect(coverage.nullKeyLedger.map(r=>r.address)).toEqual(missing);expect(missing).toHaveLength(84);expect(coverage.nullKeyLedger.every(r=>r.reason.length>10)).toBe(true);
  expect(coverage.scope.individualTextbookPageResolved).toBe(false);expect(coverage.scope.sectionReferencePageOnly).toBe(true);expect(pack.provenance.description).toContain('단원 시작 쪽 참조 · 개별 문항 쪽 미확인');
  expect(coverage.printedSectionReferences).toHaveLength(58);expect(coverage.outOfScope.map(r=>r.sourcePage)).toEqual([1,31,35,37,43,46,48]);
 });
 it('checks all published equation examples, unit mappings, numeral conversion and choice circles',()=>{
  for(const [page,n,count]of [['152','1',10],['153','2',5],['156','5',8]]as const){const e=at(page,n).split('; ');expect(e).toHaveLength(count);for(const s of e){const [lhs,rhs]=s.split('=');expect(evaluate(lhs)).toBeCloseTo(Number(rhs),10)}}
  for(const [page,n,unit,count]of [['163','2','cm',15],['164','3','g',11]]as const){const e=at(page,n).split('; ');expect(e).toHaveLength(count);for(const s of e){const [lhs,rhs]=s.split(': ');expect(evaluate(rhs)).toBe(Number(lhs.replace(unit,'')))}}
  expect(at('154','3').split('; ').map(s=>evaluate(s))).toEqual([170,215,152,140,134,80,68,80]);
  const fib=[1,2];for(let i=2;i<9;i++)fib.push(fib[i-1]+fib[i-2]);expect(at('121','04')).toBe(`${fib[6]}가지`);expect(at('121','05')).toBe(`${fib[8]}가지`);
  expect(at('116','01')).toBe(String(3*4-8));expect(at('116','02')).toBe(`(1) ${1*5-3}; (2) ${1*5+3}`);expect(at('118','01')).toBe(String(36-8-4-3-10));
  expect(at('174','03','(1)')).toBe('39, 657, LXIV, MMDCCCXLVI');expect(1000+1000+500+100+100+100+50-10+5+1).toBe(2846);
  expect(at('182','02')).toContain('(2) 18시간; (3) 오후 8시 30분(8월 19일)');expect(18+5.5-8).toBe(15.5);
  const choices=parsed.exercises.filter(r=>r.key&&/^[①-⑳㉮-㉻, ]+$/.test(r.key.answerText)).map(r=>[r.address.page,r.address.number,r.key!.answerText]);
  expect(choices).toEqual([['110','03','㉮, ㉰'],['121','06','⑧'],['121','07','③'],['134','01','⑤'],['140','01','①, ⑤'],['140','02','⑤'],['140','03','⑤'],['142','01','②'],['146','02','①'],['148','01','③'],['148','02','③']]);
 });
 it('records official provenance, all 64 rendered pages and explicit unknown edition details',()=>{
  expect(pack.id).toBe('mathtian-facto-gifted-e5-6-v1');expect(coverage.source.sha256).toBe('bc2711daa0fd2ad7717e79120b5b80ea53f187b7bd07963329efdc405179ccc9');expect(pack.provenance.description).toContain(coverage.source.sha256);expect(parsed.metadata.isbn).toBeUndefined();expect(parsed.metadata.curriculum).toBeUndefined();expect(coverage.source.editionEvidence.listingDateIsPublicationDate).toBe(false);expect(coverage.source.reviewedImages).toHaveLength(64);expect(coverage.reviewMethod.allAnswerRegionsVisuallyInspected).toBe(true);expect(coverage.reviewMethod.ocrUsedAsReviewedText).toBe(false);expect(parsed.exercises.every(r=>r.key===null||(r.key.status==='reviewed'&&r.key.sourcePage!<=64))).toBe(true);
 });
});
