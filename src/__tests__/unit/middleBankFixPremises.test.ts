import { describe, expect, it } from "vitest";
import { generateMiddleProblem } from "../../lib/middle/generate";

const numberIn = (text: string) => Number(text.match(/\$(-?[\d.]+)/)![1]);
const close = (a: number, b: number) => Math.abs(a - b) < 1e-7;
const unique = (values: number[]) => [
  ...new Set(values.map((v) => Math.round(v * 1e7) / 1e7)),
];

describe("MID-001: the stated radii determine one sector answer", () => {
  for (const type of ["02", "05"]) {
    it(`sector ${type}: both branches, seeds 0..299`, () => {
      const branches = [0, 0];
      for (let seed = 0; seed < 300; seed++) {
        const p = generateMiddleProblem(`1-2|원과 부채꼴|${type}`, seed);
        const angles = p.content.match(
          /각각 \$(\d+)\^\\circ\$, \$(x|\d+)\^\\circ\$/,
        )!;
        const sizes = p.content.match(
          /각각 \$(\d+)\\,\\mathrm\{cm\}(?:\^2)?\$, \$(y|\d+)\\,\\mathrm\{cm\}/,
        )!;
        expect(angles, p.content).not.toBeNull();
        expect(sizes, p.content).not.toBeNull();
        const firstAngle = Number(angles[1]);
        const firstSize = Number(sizes[1]);
        const askAngle = angles[2] === "x";
        branches[askAngle ? 0 : 1]++;
        // Arc = r*theta; area = r^2*theta (the common unit factors cancel).
        // Without a radius condition, r2 = 2*r1 is also admissible.
        const ratios = p.content.includes("반지름의 길이가 같은")
          ? [1]
          : [1, 2];
        const answers = ratios.map((ratio) => {
          const factor = type === "02" ? ratio : ratio ** 2;
          return askAngle
            ? (Number(sizes[2]) * firstAngle) / (firstSize * factor)
            : (firstSize * Number(angles[2]) * factor) / firstAngle;
        });
        expect(unique(answers), `${type}/${seed}: ${p.content}`).toHaveLength(
          1,
        );
        expect(answers[0]).toBeCloseTo(numberIn(p.answer));
      }
      expect(branches[0]).toBeGreaterThan(0);
      expect(branches[1]).toBeGreaterThan(0);
      expect(branches[0] + branches[1]).toBe(300);
    });
  }
});

type Triangle = { A: number; B: number; C: number };
const signs = [-1, 1];
function admissible(t: Triangle, acute: boolean) {
  return Object.values(t).every((a) => a > 0 && a < (acute ? 90 : 180));
}

describe("MID-002: enumerate acute and obtuse circumcenter configurations", () => {
  it("70: the prompt admits exactly one OCA angle, seeds 0..299", () => {
    let checked = 0;
    for (let seed = 0; seed < 300; seed++) {
      const p = generateMiddleProblem("2-2|삼각형의 외심과 내심|70", seed);
      const given = [
        ...p.content.matchAll(/\\angle O(?:AB|BC)=(\d+)\^\\circ/g),
      ].map((m) => Number(m[1]));
      expect(given).toHaveLength(2);
      const answers: number[] = [];
      for (const signC of signs)
        for (const signA of signs) {
          // In any triangle, angle between radius OA and chord AB is |90-C|.
          const C = 90 + signC * given[0]!;
          const A = 90 + signA * given[1]!;
          const B = 180 - A - C;
          if (admissible({ A, B, C }, p.content.includes("예각삼각형")))
            answers.push(Math.abs(90 - B));
        }
      expect(unique(answers), `${seed}: ${p.content}`).toEqual([
        numberIn(p.answer),
      ]);
      checked++;
    }
    expect(checked).toBe(300);
  });

  it("105X: all sign choices of the radius/chord angles leave one central angle", () => {
    let checked = 0;
    const targets = new Set<string>();
    for (let seed = 0; seed < 300; seed++) {
      const p = generateMiddleProblem("2-2|삼각형의 외심과 내심|105X", seed);
      const ratio = p.content.match(/= (\d+) : (\d+) : (\d+)\$/)!;
      expect(ratio, p.content).not.toBeNull();
      const [u, v, w] = ratio.slice(1).map(Number) as [number, number, number];
      const target = p.content.match(/\$\\angle (BOC|COA|AOB)\$의 크기/)!;
      expect(target, p.content).not.toBeNull();
      targets.add(target[1]!);
      const answers: number[] = [];
      for (const signA of signs)
        for (const signB of signs)
          for (const signC of signs) {
            const k = -90 / (signA * v + signB * w + signC * u);
            if (!(k > 0 && Number.isFinite(k))) continue;
            const t = {
              A: 90 + signA * k * v,
              B: 90 + signB * k * w,
              C: 90 + signC * k * u,
            };
            if (!admissible(t, p.content.includes("예각삼각형"))) continue;
            const opposite =
              t[target[1] === "BOC" ? "A" : target[1] === "COA" ? "B" : "C"];
            answers.push(2 * Math.min(opposite, 180 - opposite));
          }
      expect(unique(answers), `${seed}: ${p.content}`).toEqual([
        numberIn(p.answer),
      ]);
      checked++;
    }
    expect(checked).toBe(300);
    expect(targets.size).toBe(3);
  });

  it("the reported obtuse triangle really has a different answer", () => {
    const t = { A: 59, B: 10, C: 111 };
    expect(t.A + t.B + t.C).toBe(180);
    expect([Math.abs(90 - t.C), Math.abs(90 - t.A)]).toEqual([21, 31]);
    expect(Math.abs(90 - t.B)).toBe(80);
    expect(admissible(t, true)).toBe(false);
  });
});

it("MID-005: the described partition and drawn rays agree, and the angles sum to 180", () => {
  let checked = 0;
  for (let seed = 0; seed < 300; seed++) {
    const p = generateMiddleProblem("1-2|기본 도형|09", seed);
    const figure = p.figureSpec as {
      points: Record<string, [number, number]>;
      angles: Record<string, { points: [string, string]; label: string }>;
    };
    const angles = Object.values(figure.angles);
    const rays = new Set(angles.flatMap((a) => a.points));
    const describedRays = p.content.includes("세 반직선") ? 3 : rays.size;
    expect(describedRays, p.content).toBe(rays.size);
    expect(angles).toHaveLength(3);
    expect(rays.size).toBe(4);
    const ratio = p.content.match(/=(\d+):(\d+):(\d+)\$/)!;
    expect(ratio, p.content).not.toBeNull();
    const rs = ratio.slice(1).map(Number);
    const expected = rs.map((r) => (180 * r) / rs.reduce((a, b) => a + b));
    const measured = angles.map(({ points: [left, right] }) => {
      const O = figure.points.O!;
      const u = figure.points[left]!.map((v, i) => v - O[i]!) as [
        number,
        number,
      ];
      const v = figure.points[right]!.map((v, i) => v - O[i]!) as [
        number,
        number,
      ];
      return (
        (Math.acos(
          (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v)),
        ) *
          180) /
        Math.PI
      );
    });
    expect(
      close(
        measured.reduce((a, b) => a + b),
        180,
      ),
    ).toBe(true);
    for (let i = 0; i < 3; i++)
      expect(Math.abs(measured[i]! - expected[i]!)).toBeLessThan(0.02);
    const ask = p.content.match(/\$\\angle ([xyz])\$의 크기/)![1]!;
    expect(numberIn(p.answer)).toBe(expected["xyz".indexOf(ask)]);
    checked++;
  }
  expect(checked).toBe(300);
});
