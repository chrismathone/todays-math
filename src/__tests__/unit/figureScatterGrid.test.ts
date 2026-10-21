import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { svgLabels } from "@/lib/figure/svgLabels";
import catalog from "../../../scripts/figure/engine-catalog.json";

const spec = (changes:Record<string,unknown>={}) => ({version:"elem-1",kind:"scatterPlot",gridStep:5,
  xMin:20,xMax:100,xStep:10,yMin:20,yMax:100,yStep:10,xLabel:"수학(점)",yLabel:"과학(점)",
  points:[[40,45],[55,70],[90,95]],...changes});

describe("선택형 산점도 모눈의 실제 공개 렌더", () => {
  it("정제 뒤에도 모눈 한 층·주 눈금·과목 이름·점이 남는다", async () => {
    const rendered=await renderFigureSpec(spec(),{strict:true});
    expect(rendered.ok,JSON.stringify(rendered)).toBe(true);
    if(!rendered.ok)throw Error(rendered.error);
    expect(rendered.svg.match(/data-grid="[^"]+"/g)).toHaveLength(1);
    expect(rendered.svg.match(/<circle\b/g)).toHaveLength(3);
    const labels=svgLabels(rendered.svg);
    expect(labels.map(l=>l.text)).toEqual(expect.arrayContaining(["수학(점)","과학(점)","20","100"]));
    expect(labels.filter(l=>/^\d+$/.test(l.text))).toHaveLength(18);
    expect(labels.filter(l=>/^\d+$/.test(l.text)).every(l=>l.typeset && l.width!>0)).toBe(true);
    expect(labels.some(l=>l.text==="25")).toBe(false);
  });

  it.each([
    {gridStep:null},{gridStep:true},{gridStep:3},{xMax:105},
    {points:[[41,45],[55,70]]},{points:[[40,45],[40,45]]},{xLabel:""},
  ])("잘못된 입력 %j는 공개 경로에서도 거부한다", async (changes) => {
    const rendered=await renderFigureSpec(spec(changes),{strict:true});
    expect(rendered.ok).toBe(false);
  });

  it("선택하지 않은 기존 9개 실제 엄격 SVG는 바이트가 같다", async () => {
    const out=".qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-input-20261021-r1/";
    const baseline=JSON.parse(fs.readFileSync("src/__tests__/fixtures/m3Scatter-before-input-identity-20261022.json","utf8")) as {plots:{file:string;output:{figureSpec:Record<string,unknown>}}[]};
    expect(baseline.plots).toHaveLength(9);
    for(const row of baseline.plots){
      const rendered=await renderFigureSpec(row.output.figureSpec,{strict:true});
      expect(rendered.ok).toBe(true);
      if(!rendered.ok)throw Error(rendered.error);
      expect(rendered.svg).toBe(fs.readFileSync(out+row.file,"utf8"));
    }
  });

  it("생성된 카탈로그에 허용 키와 정수·교점·기본 보존 계약이 실린다", () => {
    expect(catalog.elementary.scatterPlot.optional).toContain("gridStep");
    for(const word of ["정수","교점","정사각형","그대로 유지"])expect(catalog.elementary.scatterPlot.help).toContain(word);
  });
});
