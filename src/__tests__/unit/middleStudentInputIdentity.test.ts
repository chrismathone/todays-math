import fs from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { generateMiddleProblem, generateMiddleSet, registeredTypes } from "@/lib/middle/generate";
import { middleStudentInputIdentity } from "@/lib/middle/studentInputIdentity";
import type { MidProblem } from "@/lib/middle/types";

const KEY = "3-2|상자그림과 산점도|11";
afterEach(() => vi.restoreAllMocks());

describe("산점도 세트의 학생에게 주어진 자료", () => {
  it.each(["06", "07", "08", "09", "10", "11", "12", "14", "15"])("%s는 점과 축의 뜻을 비교한다", (type) => {
    const key = `3-2|상자그림과 산점도|${type}`;
    const a = generateMiddleProblem(key, 20261021);
    const identity = middleStudentInputIdentity(key, a);
    expect(middleStudentInputIdentity(key, {...a, figureSpec:{...a.figureSpec, xLabel:"다른 과목(점)"}})).not.toBe(identity);
    const points = a.figureSpec!.points as number[][];
    expect(middleStudentInputIdentity(key, {...a, figureSpec:{...a.figureSpec, points:points.map(([x,y],i) => [x!+(i===0 ? 0.25 : 0),y])}})).not.toBe(identity);
    expect(middleStudentInputIdentity(key, {...a, figureSpec:{...a.figureSpec, points:[...points].reverse(), xStep:5, style:{color:"red"}}})).toBe(identity);
  });

  it.each(["3-2|상자그림과 산점도|13", "3-2|산포도|01", "3-1|다항식의 곱셈|01", "3-2|상자그림과 산점도|06A"])("범위 밖 %s는 발문 비교를 그대로 쓴다", (key) => {
    const a = generateMiddleProblem(KEY, 20261021);
    expect(middleStudentInputIdentity(key, {...a, figureSpec:null})).toBe(a.content);
    expect(middleStudentInputIdentity(key, {...a, answer:"999", figureSpec:{points:"invalid"}})).toBe(a.content);
  });

  it.each([
    null, {version:"geo-2",kind:"scatterPlot"}, {version:"elem-1",kind:"boxPlot"},
    {xLabel:""}, {yLabel:"   "}, {xLabel:1}, {xLabel:"a".repeat(201)},
    {points:null}, {points:[[1,2]]}, {points:Array(2)}, {points:[Array(2),[3,4]]},
    {points:Array.from({length:41},(_,i)=>[i,i])},
    {points:[[1,2],[1,2]]}, {points:[[0,2],[-0,2]]}, {points:[[1,2,3],[4,5]]},
    {points:[["1",2],[3,4]]}, {points:[[1,NaN],[3,4]]}, {points:[[1,Infinity],[3,4]]},
    {points:[[100001,2],[3,4]]},
  ])("해석할 수 없거나 중복 점이 숨는 입력은 거부한다: %j", (change) => {
    const a = generateMiddleProblem(KEY, 20261021);
    const figureSpec = change === null ? null : {...a.figureSpec,...change};
    expect(() => middleStudentInputIdentity(KEY,{...a,figureSpec})).toThrow("산점도 입력 자료");
  });

  it("음의 0, 점 순서, 축 이름의 바깥 공백은 새 자료가 아니다", () => {
    const a = generateMiddleProblem(KEY,20261021);
    const figureSpec = {...a.figureSpec,points:[[0,2],[3,4]],xLabel:"수학(점)"};
    const other = {...figureSpec,points:[[3,4],[-0,2]],xLabel:" 수학(점) "};
    expect(middleStudentInputIdentity(KEY,{...a,figureSpec})).toBe(middleStudentInputIdentity(KEY,{...a,figureSpec:other}));
  });

  it("같은 발문에서 실제 점 자료가 바뀌면 두 문항을 채운다", () => {
    const entry = registeredTypes().find(e => e.key === KEY)!;
    const a = generateMiddleProblem(KEY, 20261021);
    const b = generateMiddleProblem(KEY, 20268940);
    expect(a.figureSpec!.points).not.toEqual(b.figureSpec!.points);
    const body = "다음 산점도에서 과학 점수가 가장 높은 학생의 수학 점수를 구하시오.";
    let called = 0;
    vi.spyOn(entry, "handler").mockImplementation(() => ({ ...(called++ % 2 ? b : a), content:body }));
    const set = generateMiddleSet(KEY, 1, 2);
    expect(set).toHaveLength(2);
    expect(set[0]!.content).toBe(set[1]!.content);
    expect(set[0]!.figureSpec!.points).not.toEqual(set[1]!.figureSpec!.points);
  });

  it("정답·해설·facts·점 순서·장식만 바뀌면 변형 공간이 늘어나지 않는다", () => {
    const entry = registeredTypes().find(e => e.key === KEY)!;
    const a = generateMiddleProblem(KEY, 20261021);
    let called = 0;
    vi.spyOn(entry, "handler").mockImplementation(() => {
      called += 1;
      return { ...a, answer:`$${called}$점`, solution:`해설 ${called}`, facts:{irrelevant:called},
        figureSpec:{...a.figureSpec, points:called % 2 ? a.figureSpec!.points : [...a.figureSpec!.points as number[][]].reverse(), style:{color:called}} };
    });
    expect(() => generateMiddleSet(KEY, 1, 2)).toThrow("변형 공간이 좁아");
  });

  it("산점도 변형 이후에도 범위 밖 기존 API80개와 세트16개는 바뀌지 않는다", () => {
    const baseline = JSON.parse(fs.readFileSync("src/__tests__/fixtures/m3Scatter-before-input-identity-20261022.json", "utf8")) as {
      actualAPI:{key:string;seed:number;output:MidProblem}[];
      outside:{key:string;seed:number;output:MidProblem}[];
      sets:{key:string;seed:number;output:MidProblem[]}[];
      sharedSets:{key:string;seed:number;output:MidProblem[]}[];
    };
    expect(baseline.actualAPI).toHaveLength(288);
    expect(baseline.outside).toHaveLength(80);
    // 산점도 9유형의 이전 출력은 보존한다. 새 출력의 수학·그림은 별도 시험에서 검산한다.
    for (const row of baseline.outside) expect(generateMiddleProblem(row.key, row.seed)).toEqual(row.output);
    for (const row of baseline.sharedSets) expect(generateMiddleSet(row.key, row.seed, 4)).toEqual(row.output);
  });
});
