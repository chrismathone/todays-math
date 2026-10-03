import { describe, expect, it } from "vitest";
import { createRng } from "../../lib/elementary/rng";
import { asMultipleChoice } from "../../lib/engine/deriveFormats";
import { M3_TRIG } from "../../lib/middle/m3Trig";
import { parseProblemContent } from "../../lib/problem/parseProblemContent";
import { TRIG_KEY } from "../helpers/bankDecideEngineEvidence";

const entry = M3_TRIG.find((candidate) => candidate.key === TRIG_KEY)!;
const angles = Array.from({ length: 51 }, (_, i) => i + 20).filter(
  (a) => a !== 45,
);
const round = (v: number) => Number(v.toFixed(4));
const marks = ["①", "②", "③", "④", "⑤"];

function value(tex: string): number {
  const match = /^\$(\d+\.\d{4})\$$/.exec(tex);
  expect(match, `소수 넷째 자리 보기: ${tex}`).not.toBeNull();
  return Number(match![1]);
}

function make(angle: number, mode: number) {
  const inputs = [
    (angles.indexOf(angle) + 0.5) / angles.length,
    (mode + 0.5) / 3,
  ];
  let draws = 0;
  const p = entry.handler(() => {
    if (draws >= inputs.length)
      throw new Error("삼각비 18이 난수를 더 소비했다");
    return inputs[draws++];
  });
  expect(draws).toBe(2);
  expect(p.facts.a).toBe(angle);
  expect(p.facts.mode).toBe(mode);
  return p;
}

describe("B5: 삼각비 18의 개념 오답", () => {
  it.each([0, 1, 2])(
    "갈래 %i: 가능한 각 전부의 실제 객관식은 값이 다른 양수 다섯이다",
    (mode) => {
      expect(angles).toHaveLength(50);
      for (const angle of angles) {
        const p = make(angle, mode);
        const s = round(Math.sin((angle * Math.PI) / 180));
        const c = round(Math.cos((angle * Math.PI) / 180));
        const given = [...p.content.matchAll(/=(0\.\d{4})/g)].map((m) =>
          Number(m[1]),
        );
        expect(given).toEqual([s, c]);
        const correct = value(p.answer);
        expect(correct).toBe([s, c, round(s + c)][mode]);
        const mc = asMultipleChoice(
          { ...p, familyKey: `mid:${TRIG_KEY}`, problemType: "활용" },
          createRng(angle * 10 + mode),
        );
        const choices = parseProblemContent(mc.content).choices;
        const values = choices.map(value);
        expect(values).toHaveLength(5);
        expect(new Set(values).size).toBe(5);
        expect(values.every((v) => v > 0)).toBe(true);
        expect(values.filter((v) => v === correct)).toHaveLength(1);
        expect(values[marks.indexOf(mc.answer)]).toBe(correct);
        if (mode < 2) expect(values).toContain(mode === 0 ? c : s);
        else expect(values).toEqual(expect.arrayContaining([s, c]));
        expect(values).toContain(1);
      }
    },
  );

  it("최신 합의 순서대로 네 오답을 고르며 30도·60도의 반올림 중복은 뒤 후보로 채운다", () => {
    const fallback: string[] = [];
    for (const angle of angles)
      for (const mode of [0, 1, 2]) {
        const p = make(angle, mode);
        const s = round(Math.sin((angle * Math.PI) / 180));
        const c = round(Math.cos((angle * Math.PI) / 180));
        const correct = value(p.answer);
        const candidates =
          mode === 2
            ? [s, c, Math.abs(s - c), 1, 2 * s, 2 * c]
            : [
                mode === 0 ? c : s,
                1 - correct,
                1 - (mode === 0 ? c : s),
                1,
                (s + c) / 2,
                Math.abs(s - c),
                s * c,
              ];
        const expected = [...new Set(candidates.map(round))]
          .filter((v) => v > 0 && v !== correct)
          .slice(0, 4);
        expect(expected).toHaveLength(4);
        expect(p.distractors, `${angle}도 갈래 ${mode}`).toBeDefined();
        expect(p.distractors!.map(value)).toEqual(expected);
        if (mode < 2 && expected.includes(round((s + c) / 2)))
          fallback.push(`${angle}/${mode}`);
      }
    expect(fallback).toEqual(["30/0", "30/1", "60/0", "60/1"]);
  });
});
