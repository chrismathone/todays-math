// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { workbookCreateEditionSchema } from '@/contracts/commercialWorkbook.contract';
import { assertUniqueAddresses, parseWorkbookImport } from '@/lib/commercialWorkbooks/import';
import pack from '../../../data/commercial-workbooks/imath-rpm-pro-common-math1-2022-v1.json';
import coverage from '../../../data/commercial-workbooks/imath-rpm-pro-common-math1-2022-v1.coverage.json';

const parsed = workbookCreateEditionSchema.parse({
  requestId: 'rpm-expansion-20261024', metadata: pack.metadata,
  provenance: pack.provenance, exercises: pack.exercises,
});
const at = (n: number) => parsed.exercises.find(r => r.address.number === String(n).padStart(4, '0'))!;

// Literal second visual census of all printed headings and boundaries, not generated from pack rows.
// Each entry: unit, self-CHECK PDF page, printed page reference, letters, first type,
// type first-numbers, type printed start-pages, main end, grade range/end, exam range/end.
type Unit = [string, number, string, string, number, number[], number[], number, string, number, string, number];
const units: Unit[] = [
  ['01 다항식의 연산',2,'8~9','ABCDEFGH',1,
    [1,5,9,14,18,23,27,30,33,37,41,44,49,53,56,59],
    [10,10,11,12,12,13,14,14,15,15,16,16,17,18,18,19],61,'20~21',69,'22~25',91],
  ['02 항등식과 나머지정리',17,'26','ABCD',17,
    [92,96,99,102,106,110,112,116,120,124,127,130,133,136,140],
    [27,27,28,28,29,29,29,30,30,31,31,32,32,33,33],143,'34~35',151,'36~39',173],
  ['03 인수분해',32,'40','ABC',32,
    [174,178,182,186,189,192,197,200,202,205,209,213],
    [41,41,42,43,43,44,44,45,45,46,46,47],216,'48~49',224,'50~53',246],
  ['04 복소수',46,'56','ABCDEFG',44,
    [247,249,254,257,261,264,267,271,274,277,281,285,289,292,295,299],
    [57,57,58,58,59,59,60,60,61,61,62,63,63,64,64,65],302,'66~67',309,'68~71',331],
  ['05 이차방정식',60,'72','ABCDEF',60,
    [332,336,341,344,347,351,355,358,362,366,369,373,377,380,383,386,389,391,393,395],
    [73,73,74,74,75,75,76,76,77,77,78,78,79,79,80,80,80,81,81,81],398,'82~83',405,'84~87',427],
  ['06 이차방정식과 이차함수',78,'88','ABCDE',80,
    [428,432,437,441,445,448,452,454,458,463,466,470,474,478],
    [89,89,90,91,91,92,92,93,93,94,95,95,96,97],483,'98~99',489,'100~103',511],
  ['07 여러 가지 방정식',93,'104~105','ABCDEFGHI',94,
    [512,519,522,526,528,532,537,541,544,547,551,558,562,565,568,571,574,577,580,583],
    [106,107,107,108,108,109,110,110,111,111,112,113,114,114,115,115,116,116,117,117],585,'118~119',592,'120~123',614],
  ['08 연립일차부등식',114,'124','ABCD',114,
    [615,619,623,626,631,635,640,645,649,655,659,664],
    [125,125,126,126,127,127,128,129,129,130,130,131],667,'132~133',675,'134~137',697],
  ['09 이차부등식과 연립이차부등식',131,'138~139','ABCDEFG',126,
    [698,701,706,709,714,718,722,725,728,733,736,741,744,747,752,757,760,764,768,771,775,779,783],
    [140,140,141,141,142,142,143,143,144,144,145,145,146,146,147,147,148,148,149,150,150,151,151],785,'152~153',792,'154~157',816],
  ['10 경우의 수와 순열',156,'160','ABCD',149,
    [817,821,825,831,836,840,844,847,851,856,861,867,871,876],
    [161,161,162,162,163,164,164,165,165,166,167,168,168,169],879,'170~171',886,'172~175',908],
  ['11 조합',175,'176','ABCD',163,
    [909,913,915,921,925,930,933,936,939,942,946,949,953],
    [177,177,178,178,179,180,180,181,181,182,182,183,183],955,'184~185',962,'186~189',984],
  ['12 행렬',190,'192','ABCDE',176,
    [985,991,995,1000,1002,1007,1010,1014,1018,1022,1025,1029,1034],
    [193,194,194,195,195,196,197,197,198,199,200,200,201],1037,'202~203',1044,'204~207',1066],
];
const address = (section: string, page: string, number: string) => ({volume:'공통수학 1',section,page,number,subpart:''});
const range = (a: number, b: number) => Array.from({length:b-a+1},(_,i)=>String(a+i).padStart(4,'0'));
const expectedGroups = units.flatMap(([unit,,selfPage,letters,typeStart,starts,pages,mainEnd,gradePage,gradeEnd,examPage,examEnd]) => [
  {section:`${unit} / 셀프 CHECK`, page:selfPage, numbers:[...letters]},
  ...starts.map((start,i)=>({section:`${unit} / 내신유형다지기 / 유형 ${String(typeStart+i).padStart(3,'0')}`,page:`유형 시작 ${pages[i]}`,numbers:range(start,starts[i+1]===undefined?mainEnd:starts[i+1]-1)})),
  {section:`${unit} / 1등급 유형 도전하기`,page:gradePage,numbers:range(mainEnd+1,gradeEnd)},
  {section:`${unit} / 시험 만점 완성하기`,page:examPage,numbers:range(gradeEnd+1,examEnd)},
]);

describe('RPM Pro common mathematics 1: whole-source reviewed reference pack', () => {
  it('strictly imports and roundtrips TSV with the unresolved row intact', () => {
    const tsv=readFileSync(fileURLToPath(new URL('../../../data/commercial-workbooks/imath-rpm-pro-common-math1-2022-v1.tsv',import.meta.url)),'utf8');
    const result=parseWorkbookImport(tsv);
    expect(result.issues).toEqual([]);
    expect(result.exercises).toEqual(parsed.exercises);
    expect(parsed.exercises).toEqual(pack.exercises);
    expect(()=>assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(tsv.split('\n')[0]).toBe('volume\tsection\tpage\tnumber\tsubpart\tanswerText\tkeyStatus\tsourcePage');
    expect(tsv).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFFD]/);
    expect(parsed.exercises.length).toBeLessThanOrEqual(5000);
  });

  it('matches every independently censused address, type boundary and printed page reference', () => {
    const expected=expectedGroups.flatMap(g=>g.numbers.map(n=>address(g.section,g.page,n)));
    expect(expected).toHaveLength(1132);
    expect(parsed.exercises.map(r=>r.address)).toEqual(expected);
    expect(coverage.pageGroups.map(g=>[g.section,g.page,g.firstNumber,g.lastNumber,g.exerciseCount])).toEqual(expectedGroups.map(g=>[g.section,g.page,g.numbers[0],g.numbers.at(-1),g.numbers.length]));
    expect(parsed.exercises.filter(r=>/^\d{4}$/.test(r.address.number)).map(r=>r.address.number)).toEqual(range(1,1066));
    expect(coverage.pageGroups.filter(g=>g.pageBasis==='type-start-reference')).toHaveLength(188);
    for(const g of coverage.pageGroups) {
      expect(g.individualTextbookPageResolved).toBe(false);
      expect(g.page).toBe(g.pageBasis==='type-start-reference'?`유형 시작 ${g.printedPageReference}`:g.printedPageReference);
    }
    for(const [unit,pdfPage,,letters] of units) {
      const self=parsed.exercises.filter(r=>r.address.section===`${unit} / 셀프 CHECK`);
      expect(self.map(r=>r.address.number).join('')).toBe(letters);
      expect(self.every(r=>r.key?.sourcePage===pdfPage)).toBe(true);
    }
  });

  it('accounts for the one unresolved composite answer and all unnumbered exclusions', () => {
    expect(coverage.counts).toEqual({exercises:1132,reviewedKeys:1131,nullKeys:1,unreviewedKeys:0,omittedInScopeAddresses:0,pageGroups:224});
    const missing=parsed.exercises.filter(r=>r.key===null);
    expect(missing.map(r=>r.address.number)).toEqual(['0484']);
    expect(coverage.nullKeyLedger.map(r=>r.address)).toEqual(missing.map(r=>r.address));
    expect(coverage.nullKeyLedger[0]).toMatchObject({sourcePage:86,regionId:'086/11',reasonCode:'printed-solution-reference'});
    expect(coverage.nullKeyLedger[0].reason).toContain('(1)은 풀이 참조');
    expect(coverage.unnumberedExclusions.map(r=>r.afterNumber)).toEqual([62,144,217,304,399,485,586,786,880,1038]);
    expect(coverage.scope).toMatchObject({allExpectedAddressesPresent:true,allAnswersPresent:false,wholeBookAddressAudit:true,individualTextbookPageResolved:false,unnumberedCheckItemsExcluded:10});
    expect(coverage.outsideExerciseScope).toEqual([{sourcePages:[1],reason:'cover'},{sourcePages:[208],reason:'memo page'}]);
  });

  it('links each row to hash-pinned visual evidence and the actual PDF answer page', () => {
    const refs=coverage.answerReferences;
    const hashes=new Map(coverage.reviewMethod.imageHashes.map(i=>[i.file,i.sha256]));
    expect(refs.map(r=>r.address)).toEqual(parsed.exercises.map(r=>r.address));
    expect(hashes.size).toBe(277); // 208 renders, 40 region sheets, 20 detail crops, 9 full-layout sheets.
    expect(coverage.reviewMethod.imageHashes.filter(i=>i.role==='source-render')).toHaveLength(208);
    expect(coverage.reviewMethod.imageHashes.filter(i=>i.role==='visually-inspected-answer-regions')).toHaveLength(40);
    for(const [i,ref] of refs.entries()) {
      expect(hashes.get(ref.reviewImage)).toBe(ref.reviewImageSha256);
      expect(hashes.get(`pages/p${String(ref.sourcePage).padStart(3,'0')}.png`)).toBe(ref.sourceImageSha256);
      expect(ref.sourceBBox).toHaveLength(4);
      const [x0,y0,x1,y1]=ref.sourceBBox;
      expect(x1).toBeGreaterThan(x0); expect(y1).toBeGreaterThan(y0);
      expect(ref.sourcePage).toBeGreaterThanOrEqual(2); expect(ref.sourcePage).toBeLessThanOrEqual(207);
      if(ref.detailImage) expect(hashes.get(ref.detailImage)).toBe(ref.detailImageSha256);
      const key=parsed.exercises[i].key;
      expect(ref.status).toBe(key?'reviewed':'excluded');
      if(key) expect(key.sourcePage).toBe(ref.sourcePage);
    }
    const inputs=coverage.reviewMethod.inputHashes;
    for(const name of ['address-overrides.json','answer-overrides.json','reviewed-answers.txt','self-answers.tsv','independent-census.json','build_pack.py']) expect(inputs.find(i=>i.file===name)?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(coverage.reviewMethod.reviewManifest.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(coverage.reviewMethod.ocrAloneIsReview).toBe(false);
    expect(coverage.reviewMethod.allPublishedKeyRegionsVisuallyInspected).toBe(true);
    expect(at(62).key?.sourcePage).toBe(11); // Number begins on PDF 10; answer is on 11.
    expect(at(643).key?.sourcePage).toBe(119); // Number begins on PDF 118.
    expect(at(1066).key?.sourcePage).toBe(207);
  });

  it('preserves signs, fractions, radicals, choices, multipart labels, units and matrices', () => {
    const fixtures: [number,string][] = [
      [28,'−1/2'],[86,'√11'],[272,'②, ⑤'],[303,'(1) (가) 순허수, (나) 0, (다) 순허수; (2) ㄷ'],
      [328,'3'],[362,'ㄱ, ㄹ'],[479,'20 m'],[480,'200 m²'],[481,'5000원'],
      [559,'(9−3√5) m'],[561,'272π cm²'],[617,'A≤5'],[643,'300 g 이상 550 g 이하'],
      [816,'10/3<\\overline{QC}<20/3'],[913,'(가) (n−r−1)!, (나) r, (다) n'],
      [956,'(1) (가) 56, (나) 28, (다) 84; (2) 56'],
      [986,'[[0, 1, 1], [1, 1, 1], [2, 0, 1]]'],[1026,'[[−12, 13], [5, −3]]'],[1061,'15/4'],[1066,'256'],
    ];
    for(const [n,a]of fixtures)expect(at(n).key?.answerText).toBe(a);
    const self=(unit:string,letter:string)=>parsed.exercises.find(r=>r.address.section===`${unit} / 셀프 CHECK`&&r.address.number===letter)?.key?.answerText;
    expect(self('05 이차방정식','B')).toBe('(1) x=(7±√41)/2; (2) x=−2±√2i');
    expect(self('12 행렬','E')).toBe('(1) [[−1, 0], [0, −1]]; (2) [[1, 0], [0, 1]]');
    const choices: Record<string,number>={}; const integers:number[]=[];
    for(const r of parsed.exercises) {
      if(!r.key)continue;
      expect(r.key.status).toBe('reviewed');
      const a=r.key.answerText;
      if(/^[①②③④⑤]$/.test(a))choices[a]=(choices[a]??0)+1;
      if(/^−?\d+$/.test(a))integers.push(Number(a.replace('−','-')));
    }
    expect(choices).toEqual({'①':65,'②':91,'③':104,'④':111,'⑤':83});
    expect(integers).toHaveLength(482);
    expect(integers.reduce((a,b)=>a+b,0)).toBe(50534);
    expect(Math.min(...integers)).toBe(-85); expect(Math.max(...integers)).toBe(7200);
    // Independent arithmetic using the printed final operands (PDF 11, 59, 86).
    expect(at(62).key?.answerText).toBe(String(5*180-525));
    expect(at(328).key?.answerText).toBe(String(-4-2+9));
    expect(at(481).key?.answerText).toBe(`${4000+200*5}원`);
  });

  it('keeps unknown edition metadata unknown and limits grading to manual reference', () => {
    expect(pack.id).toBe('imath-rpm-pro-common-math1-2022-v1');
    expect(parsed.metadata.curriculum).toBe('2022 개정 교육과정');
    expect(parsed.metadata.isbn).toBeUndefined();
    expect(coverage.source.editionEvidence).toMatchObject({publicationDate:null,publicationYear:null,impression:null,isbn:null,publisherPostingDate:'2026-09-17'});
    expect(coverage.source.sha256).toBe('b570069029339bd5767e266c718baaa6f1bba6fa46c1f3448613930ad70dbfeb');
    expect(coverage.source.pageCount).toBe(208);
    expect(pack.provenance.description).toContain(coverage.source.sha256);
    expect(pack.provenance.description).toContain('개별 문항 쪽 미확인');
    expect(coverage.grading).toBe('manual-reference-only');
  });
});
