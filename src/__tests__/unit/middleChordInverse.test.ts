import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/elementary/rng";
import { M3_TYPES } from "@/lib/middle/m3";
import { generateMiddleProblem } from "@/lib/middle/generate";
import { asDescriptive, asMultipleChoice } from "@/lib/engine/deriveFormats";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { legacyStudyFamilies } from "@/lib/examStudy/adapters";
import type { MidProblem } from "@/lib/middle/types";

const key = "3-2|원과 직선|06";
const entry = M3_TYPES.find(e => e.key === key)!;
// Exhaust the finite 21 angles and both targets, without relying on random coverage.
const cases = Array.from({length:21}, (_, n) => [0, 1].map(mode => ({n, mode}))).flat();
function example(n: number, mode: number) {
  const draws = [(n + 0.5) / 21, (mode + 0.5) / 2];
  return entry.handler(() => {
    const draw = draws.shift();
    if (draw === undefined) throw new Error("Unexpected hidden condition sampling");
    return draw;
  });
}
function solvePrinted(content: string) {
  const given = /\\angle (BAC|ABC)=(\d+)\^\\circ/.exec(content);
  const asked = /\\angle (BAC|ABC)\$의 크기/.exec(content);
  if (!given || !asked || given[1] === asked[1]) throw new Error("Missing or conflicting angle roles");
  const angle = Number(given[2]);
  // Equal centre-to-chord distances imply equal sides; only the triangle angle sum is needed.
  return {givenAt:given[1], given:angle, target:asked[1], answer:asked[1] === "BAC" ? 180 - angle - angle : (180 - angle) / 2};
}
type Geometry = {points: Record<string, unknown>; angles: Record<string, {vertex:string; label:string}>};
function geometry(item: MidProblem) { return item.figureSpec as unknown as Geometry; }

describe("same live family with a genuinely reversed angle question", () => {
  it.each(cases)("solves printed conditions, without answer/facts/figure oracle: n=$n mode=$mode", ({n, mode}) => {
    const item = example(n, mode), solved = solvePrinted(item.content);
    expect(item.answer).toBe(`$${solved.answer}^\\circ$`);
    expect(solved.givenAt).toBe(mode ? "ABC" : "BAC");
    expect(solved.target).toBe(mode ? "BAC" : "ABC");
    expect(solved.given).toBeGreaterThan(0);
    expect(solved.answer).toBeGreaterThan(0);
    expect(solved.answer).toBeLessThan(180);
    expect(item.content).toContain("\\overline{OM}=\\overline{ON}");
    expect(item.solution).toContain("이등변");
    expect(item.solution).not.toMatch(/sin|cos|tan|벡터|좌표|삼각함수|원주각의 정리/);
    const spec = geometry(item);
    const unknown = Object.values(spec.angles).filter(a => a.label === "x");
    expect(unknown).toEqual([expect.objectContaining({vertex:mode ? "A" : "B"})]);
    expect(spec.angles[mode ? "angB" : "angA"]!.label).toBe(`${solved.given}°`);
    expect(Object.values(spec.angles).some(a => a.label === `${solved.answer}°`)).toBe(solved.answer === solved.given);
  });

  it("checks the spec's equal chords, perpendicular feet and actual angles independently of raster pixels", () => {
    for (const {n, mode} of cases) {
      const item=example(n, mode), spec=geometry(item), printed=solvePrinted(item.content);
      const point=(name:string):number[] => {
        const value=spec.points[name];
        if (Array.isArray(value)) return value as number[];
        const p=value as {type:string;angle:number};
        expect(p.type).toBe("on_circle");
        return [120+76*Math.cos(p.angle*Math.PI/180),95-76*Math.sin(p.angle*Math.PI/180)];
      };
      const v=(a:number[],b:number[])=>[b[0]!-a[0]!,b[1]!-a[1]!];
      const dot=(a:number[],b:number[])=>a[0]!*b[0]!+a[1]!*b[1]!;
      const length=(a:number[],b:number[])=>Math.hypot(...v(a,b));
      const A=point("A"), B=point("B"), C=point("C"), O=point("O"), M=point("M"), N=point("N");
      expect(length(A,B)).toBeCloseTo(length(A,C),8);
      expect(length(O,M)).toBeCloseTo(length(O,N),8);
      expect(length(M,[(A[0]!+B[0]!)/2,(A[1]!+B[1]!)/2])).toBeLessThan(1e-8);
      expect(length(N,[(A[0]!+C[0]!)/2,(A[1]!+C[1]!)/2])).toBeLessThan(1e-8);
      expect(Math.abs(dot(v(A,B),v(O,M)))/length(A,B)).toBeLessThan(1e-8);
      expect(Math.abs(dot(v(A,C),v(O,N)))/length(A,C)).toBeLessThan(1e-8);
      const angle=(center:number[],p:number[],q:number[])=>Math.acos(dot(v(center,p),v(center,q))/(length(center,p)*length(center,q)))*180/Math.PI;
      const targetAngle=printed.target === "BAC" ? angle(A,B,C) : angle(B,A,C);
      const givenAngle=printed.givenAt === "BAC" ? angle(A,B,C) : angle(B,A,C);
      expect(givenAngle).toBeCloseTo(printed.given,8);
      expect(targetAngle).toBeCloseTo(printed.answer,8);
    }
  });

  it("keeps three actual response formats consistent with the independently solved question", () => {
    for (const {n, mode} of cases) {
      const item = example(n, mode), expected = solvePrinted(item.content).answer;
      const stem = {...item, familyKey:key, problemType:"활용"};
      const mc = asMultipleChoice(stem, createRng(121 + n));
      const choices = parseProblemContent(mc.content).choices;
      expect(choices).toHaveLength(5);
      expect(new Set(choices).size).toBe(5);
      expect(choices["①②③④⑤".indexOf(mc.answer)]).toBe(`$${expected}^\\circ$`);
      expect(solvePrinted(mc.content).answer).toBe(expected);
      const written = asDescriptive(stem);
      expect(written.questionType).toBe("서술형");
      expect(written.answer).toBe(item.answer);
      expect(solvePrinted(written.content).answer).toBe(expected);
    }
  });

  it("routes deterministically through the existing generator and versions only the changed family", () => {
    const modes = new Set<number>();
    for (let seed=1; seed<=64; seed++) {
      const first=generateMiddleProblem(key, seed, 2);
      expect(first).toEqual(generateMiddleProblem(key, seed, 2));
      modes.add(first.facts.mode!);
      expect(first.answer).toBe(`$${solvePrinted(first.content).answer}^\\circ$`);
      expect(first.grade).toBe("중3");
      expect(first.unitSection).toBe("원과 현");
    }
    expect([...modes].sort()).toEqual([0,1]);
    const families = legacyStudyFamilies();
    expect(families.find(f=>f.id===`legacy:mid:${key}`)?.version).toBe("20261019-inverse-chord-angle-r1");
    expect(families.find(f=>f.id==="legacy:mid:3-2|원과 직선|05")?.version).toBe("9cfbb8683-r1");
  }, 40_000);

  it("strictly renders all 42 question/figure tuples without dropping conditions", async () => {
    const output = process.env.INVERSE_CHORD_EVIDENCE_DIR ?? fs.mkdtempSync(path.join(os.tmpdir(), "math-chord-inverse-"));
    fs.mkdirSync(output, {recursive:true});
    for (const {n, mode} of cases) {
      const item=example(n, mode);
      const result=await renderFigureSpec(item.figureSpec, {strict:true});
      expect(result.ok, JSON.stringify({n,mode,result})).toBe(true);
      if (!result.ok) throw new Error(result.error);
      expect(result.droppedDimensions ?? []).toEqual([]);
      expect(result.svg).toMatch(/<svg[\s>]/);
      fs.writeFileSync(path.join(output, `angle-${n}-target-${mode}.svg`), result.svg, {flag:"wx"});
    }
  }, 120_000);
});
