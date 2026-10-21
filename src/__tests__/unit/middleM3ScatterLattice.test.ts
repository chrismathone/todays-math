import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { generateMiddleProblem, generateMiddleSet } from "@/lib/middle/generate";
import { legacyStudyFamilies } from "@/lib/examStudy/adapters";

const TYPES=["06","07","08","09","10","11","12","14","15"];
const key=(type:string)=>`3-2|상자그림과 산점도|${type}`;
const number=(text:string)=>Number(text.match(/-?\d+(?:\.\d+)?/)![0]);

describe("산점도 9유형의 읽을 수 있는 모눈 자료",()=>{
  it.each(TYPES)("%s의 점은 5점 교점에 있고 축 이름은 발문과 맞는다",(type)=>{
    for(let i=0;i<32;i++){
      const p=generateMiddleProblem(key(type),20261022+i*7919);
      const fig=p.figureSpec!;
      expect(fig.gridStep).toBe(5);expect(fig.xStep).toBe(10);expect(fig.yStep).toBe(10);
      const points=fig.points as [number,number][];
      expect(new Set(points.map(v=>JSON.stringify(v))).size).toBe(points.length);
      for(const [x,y]of points){
        expect(Number.isInteger(x)&&Number.isInteger(y)).toBe(true);
        expect(x%5).toBe(0);expect(y%5).toBe(0);
        expect(x).toBeGreaterThanOrEqual(Number(fig.xMin));expect(x).toBeLessThanOrEqual(Number(fig.xMax));
        expect(y).toBeGreaterThanOrEqual(Number(fig.yMin));expect(y).toBeLessThanOrEqual(Number(fig.yMax));
      }
      const xSubject=type==="07"||type==="09"?"국어":"수학";
      const ySubject=type==="07"||type==="10"?"영어":type==="09"?"수학":"과학";
      expect(fig.xLabel).toBe(`${xSubject}(점)`);expect(fig.yLabel).toBe(`${ySubject}(점)`);
      expect(p.content).toContain(`${xSubject} 점수($x$)`);expect(p.content).toContain(`${ySubject} 점수($y$)`);
      expect(p.content).toContain("$(x, y)$:"); // 정확한 읽기 검수 전에는 원자료 목록을 유지한다.
    }
  });

  it.each(TYPES)("%s의 조건과 답을 주어진 점·발문에서 다시 계산한다",(type)=>{
    for(let i=0;i<100;i++){
      const p=generateMiddleProblem(key(type),20261022+i*3571);
      const points=p.figureSpec!.points as [number,number][];
      const n=Number(p.content.match(/학생 \$(\d+)\$명/)![1]);expect(n).toBe(points.length);
      const threshold=Number(p.content.match(/\$(\d+)\$점 이상/)?.[1]);
      let expected:number;
      switch(type){
        case "06":expected=points.filter(([x])=>x>=threshold).length;expect(expected).toBeGreaterThan(0);expect(expected).toBeLessThan(n);break;
        case "07":expected=points.filter(([x,y])=>x>y).length;expect(points.every(([x,y])=>x!==y)).toBe(true);expect(expected).toBeGreaterThan(0);expect(expected).toBeLessThan(n);break;
        case "08":{
          const ordered=[...points].sort((a,b)=>a[0]-b[0]);let plus=0,minus=0;
          for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){if(ordered[b]![1]>ordered[a]![1])plus++;else minus++;}
          const relation=minus===0?"양의 상관관계":plus===0?"음의 상관관계":"상관관계가 없다";
          if(plus&&minus)expect(Math.abs(plus-minus)).toBeLessThanOrEqual(1);
          expect(p.answer).toBe(relation);continue;
        }
        case "09":expected=points.filter(([x,y])=>x+y>=threshold).length;expect(expected).toBeGreaterThanOrEqual(2);expect(expected).toBeLessThanOrEqual(5);break;
        case "10":expected=points.reduce((s,[x])=>s+x,0)/n;break;
        case "11":{const highest=Math.max(...points.map(v=>v[1]));const top=points.filter(v=>v[1]===highest);expect(top).toHaveLength(1);expected=top[0]![0];break;}
        case "12":expected=100*points.filter(([x,y])=>x>=threshold&&y>=threshold).length/n;expect(expected).toBeGreaterThanOrEqual(20);expect(expected).toBeLessThanOrEqual(70);break;
        case "14":{const gaps=points.map(([x,y])=>Math.abs(x-y)).sort((a,b)=>b-a);expected=gaps[0]!;expect(expected).toBeGreaterThanOrEqual(8);expect(expected-gaps[1]!).toBeGreaterThanOrEqual(3);break;}
        case "15":{const selected=points.filter(([x])=>x>=threshold);expect(selected.length).toBeGreaterThanOrEqual(3);expect(selected.length).toBeLessThanOrEqual(n-2);expected=selected.reduce((s,[,y])=>s+y,0)/selected.length;break;}
        default:throw Error(type);
      }
      expect(Number.isInteger(expected)).toBe(true);expect(number(p.answer)).toBe(expected);
    }
  });

  it("범위 밖 16유형의 기존 API80개와 세트16개를 유지한다",()=>{
    const baseline=JSON.parse(fs.readFileSync("src/__tests__/fixtures/m3Scatter-before-input-identity-20261022.json","utf8"));
    for(const row of baseline.outside)expect(generateMiddleProblem(row.key,row.seed)).toEqual(row.output);
    for(const row of baseline.sharedSets)expect(generateMiddleSet(row.key,row.seed,4)).toEqual(row.output);
  });

  it("같은 씨앗은 같고 각 유형은 서로 다른 10문항을 채운다",()=>{
    for(const type of TYPES){
      const a=generateMiddleSet(key(type),20261022,10),b=generateMiddleSet(key(type),20261022,10);
      expect(a).toEqual(b);
      expect(new Set(a.map(p=>JSON.stringify([p.content,p.figureSpec!.points]))).size).toBe(10);
    }
  });

  it("같은 family ID의 새 결과는 별도 버전으로 재현한다",()=>{
    const families=legacyStudyFamilies();
    for(const type of TYPES){
      const family=families.find(f=>f.id===`legacy:mid:${key(type)}`);
      expect(family,`missing ${type}`).toBeDefined();
      expect(family!.version).toBe("20261022-scatter-five-point-grid-subject-axes-r1");
    }
  });
});
