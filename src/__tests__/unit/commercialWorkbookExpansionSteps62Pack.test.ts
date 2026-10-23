// @vitest-environment node
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe,expect,it} from 'vitest';
import {workbookCreateEditionSchema} from '@/contracts/commercialWorkbook.contract';
import {assertUniqueAddresses,parseWorkbookImport} from '@/lib/commercialWorkbooks/import';
import pack from '../../../data/commercial-workbooks/mathtian-steps-6-2-v1.json';
import coverage from '../../../data/commercial-workbooks/mathtian-steps-6-2-v1.coverage.json';
const parsed=workbookCreateEditionSchema.parse({requestId:'steps62-expansion-20261024',metadata:pack.metadata,provenance:pack.provenance,exercises:pack.exercises});
const units=['분수의 나눗셈','소수의 나눗셈','공간과 입체','비례식과 비례배분','원의 넓이','원기둥, 원뿔, 구'];
const topics=[['분모가 같은 (분수)÷(분수)','분모가 다른 (분수)÷(분수)','(자연수)÷(분수)','(분수)÷(분수)를 (분수)×(분수)로 나타내기','분수의 나눗셈 연습'],['(소수)÷(소수)의 기본','자연수의 나눗셈을 이용하여 계산하기','분수의 나눗셈을 이용하여 계산하기','세로셈으로 계산하기','몫을 반올림하여 나타내기'],['위, 앞, 옆에서 본 모양','위, 앞, 옆에서 본 모양으로 쌓기나무 개수 구하기','층별로 나타낸 모양','여러 가지 모양 만들기'],['비의 성질','간단한 자연수의 비로 나타내기','비례식','비례식의 성질','비례식의 활용','비례배분'],['원주율, 원주, 지름 구하기','여러 가지 원의 둘레 구하기','원의 넓이 구하기','여러 가지 원의 넓이 구하기'],['원기둥','원기둥의 전개도','원뿔과 구','입체도형의 특징 비교하기']];
const starts=[2,10,18,25,34,41];
const formSizes=[[5,5,5,5],[5,5,6,4],[5,5,5,5],[6,5,5,4],[5,5,5,5],[5,5,6,4]];
const finalSizes=[[5,5,5,5],[5,5,5,5],[6,4,5,5],[5,5,5,5],[5,5,5,5],[5,6,5,4]];
const addressKey=(a:{volume:string;section:string;page:string;number:string;subpart:string})=>[a.volume,a.section,a.page,a.number,a.subpart].join('|');
const at=(pdf:number,page:string,n:string)=>{const found=pack.exercises.find(r=>r.key?.sourcePage===pdf&&r.address.page===page&&r.address.number===n);expect(found).toBeDefined();return found!.key!.answerText};
describe('Steps 6-2 complete six-unit printed address pack',()=>{
 it('validates strict schema and lossless TSV including null rows',()=>{const t=readFileSync(fileURLToPath(new URL('../../../data/commercial-workbooks/mathtian-steps-6-2-v1.tsv',import.meta.url)),'utf8');const got=parseWorkbookImport(t);expect(got.issues).toEqual([]);expect(got.exercises).toEqual(parsed.exercises);expect(parsed.exercises).toEqual(pack.exercises);expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow()});
 it('independently covers every printed page and numbered exercise without inventing subquestion numbers',()=>{
  const wanted:string[]=[];const add=(section:string,page:number,number:string,subpart='')=>wanted.push(addressKey({volume:'6-2',section,page:String(page).padStart(2,'0'),number,subpart}));
  units.forEach((unit,u)=>{
   const prefix=`${u+1}단원 ${unit} / `;
   topics[u].forEach((topic,t)=>{const pdf=starts[u]+t;const section=prefix+`${String(t+1).padStart(2,'0')} ${topic}`;for(let q=1;q<=4;q++){const count=([3,5,6].includes(pdf)?17:[11,12].includes(pdf)?12:0);if(q===4&&count)for(let s=1;s<=count;s++)add(section,t*4+q+3,'4',String(s));else add(section,t*4+q+3,String(q))}});
   const base=4+topics[u].length*4;const section=prefix+'도전! 응용문제';
   if(u===1||u===3){add(section,base,'유형 1');add(section,base,'유형+ 1');add(section,base+1,'유형 2');add(section,base+1,'유형+ 2');for(let n=1;n<=4;n++){add(section+' / Drill',base+2,String(n));add(section+' / 도전',base+3,String(n))}}else for(let n=1;n<=4;n++)add(section,base+n-1,String(n));
   for(const [label,sizes,offset]of [['형성평가',formSizes[u],4],['단원평가',finalSizes[u],8]]as const){let n=0;sizes.forEach((count,q)=>{for(let j=0;j<count;j++){n++;add(prefix+label,base+offset+q,label==='형성평가'?String(n).padStart(2,'0'):String(n))}});expect(n).toBe(20)}
  });
  expect([...wanted].sort()).toEqual(parsed.exercises.map(r=>addressKey(r.address)).sort());expect(wanted).toHaveLength(462);expect(coverage.counts).toEqual({exercises:462,reviewedKeys:394,nullKeys:68,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:184});
  expect(coverage.nullKeyLedger.map(r=>addressKey(r.address)).sort()).toEqual(parsed.exercises.filter(r=>r.key===null).map(r=>addressKey(r.address)).sort());expect(coverage.nullKeyLedger.every(r=>r.reason.length>5)).toBe(true);
 });
 it('cross-checks all 75 separately numbered calculation answers and dimensional numeric references',()=>{
  const fraction=(s:string)=>{const parts=s.split(' '),f=parts.at(-1)!.split('/').map(Number);return(parts.length===2?Number(parts[0]):0)+(f.length===2?f[0]/f[1]:f[0])};
  const operands:Record<number,number[][]>={3:[[5/6,1/6],[8/9,1/9],[10/11,1/11],[6/7,2/7],[9/10,3/10],[12/13,3/13],[2/5,3/5],[3/8,7/8],[11/17,8/17],[3/4,3/8],[3/7,1/21],[5/6,3/4],[18/5,9/10],[7/3,5/6],[11/10,7/8],[1+3/5,5/7],[3.5,6/11]],5:[[3,2/5],[5,4/7],[4,3/4],[6,5/8],[9,2/5],[3/5,2/3],[3/7,4/5],[5/6,7/8],[8/9,4/7],[9/10,6/11],[7/3,2/5],[11/4,3/8],[9/5,3/7],[1.25,2/9],[2.1,3/5],[1+3/7,2/5],[6+2/7,2+1/5]],6:[[4/5,2/5],[8/9,4/9],[2/7,5/7],[6,2/3],[8,4/5],[10,2/9],[6/7,2/21],[7/9,2/3],[3/4,1/6],[5,3/4],[9,4/5],[15,3/7],[9/4,5/7],[8/3,5/8],[13/6,4/5],[3.25,5/9],[4.8,1.5]],11:[[1.8,.2],[2.4,.4],[1.12,.08],[4.51,.11],[5.16,.6],[6.12,.9],[20.25,1.5],[27,5.4],[30,7.5],[117,4.5],[9,2.25],[18,.75]],12:[[4.2,.6],[6.5,.5],[1.02,.17],[3.12,.13],[6.88,1.6],[9.52,3.4],[3.4,.85],[6.2,1.24],[12,1.5],[36,2.4],[29,1.16],[42,1.75]]};
  for(const [pdf,pairs]of Object.entries(operands)){const rs=parsed.exercises.filter(r=>r.key?.sourcePage===Number(pdf)&&r.address.subpart);expect(rs).toHaveLength(pairs.length);rs.forEach((r,i)=>expect(fraction(r.key!.answerText)).toBeCloseTo(pairs[i][0]/pairs[i][1],10))}
  expect(at(14,'22','3')).toBe([Math.round(17.3/6*10)/10,Math.round(18.7/7*100)/100].join(', ')+'; '+[Math.round(6.8/.9*100)/100,Math.round(8.7/.8*10)/10].join(', '));
  expect(at(36,'14','3').match(/[\d.]+(?= cm²)/g)?.map(Number)).toEqual([5,12,7,4,11,15,9,17].map(r=>Number((r*r*3.1).toFixed(1))));
  expect(at(45,'23','4')).toBe('48×2+120=216 cm²; 192×2+192=576 cm²; 147×2+504=798 cm²; 75×2+270=420 cm²; 432×2+648=1512 cm²; 300×2+420=1020 cm²');
  expect(at(9,'33','6')).toBe('③');expect(at(33,'37','6')).toBe('③, ④');expect(at(40,'30','15')).toBe('㉯, 86 cm²');expect(at(43,'13','2')).toBe('×, △, ×; ○, ×, ×; ×, △, ×; △, ×, ○');
 });
 it('retains official provenance, complete visual evidence and unknown edition limits',()=>{expect(pack.id).toBe('mathtian-steps-6-2-v1');expect(coverage.source.sha256).toBe('c6859cf17eca5fa4187f4063cbe4aadfca6f6727bcd4d8557532d8add6fc556f');expect(pack.provenance.description).toContain(coverage.source.sha256);expect(coverage.source.reviewedImages).toHaveLength(48);expect(coverage.scope.wholeBookAddressAudit).toBe(true);expect(coverage.source.editionEvidence.publicationDate).toBeNull();expect(parsed.metadata.isbn).toBeUndefined();expect(parsed.metadata.curriculum).toBeUndefined();expect(coverage.reviewMethod.ocrUsedAsReviewedText).toBe(false);expect(coverage.outOfScope.map(r=>r.sourcePage)).toEqual([1,48]);expect(parsed.exercises.every(r=>r.key===null||r.key.status==='reviewed')).toBe(true)});
});
