import { describe, expect, it } from "vitest";
import { ADVANCED_STUDY_FAMILIES } from "@/lib/examStudy/families/advanced";
import {
  readParabola,
  solveParabola,
  type Point,
} from "@/lib/examStudy/families/advanced/graph";
import {
  angleAt,
  constructSplit,
  incenter,
  lineIntersection,
  readSplit,
  solveSplit,
  readTwoCenters,
  solveTwoCenters,
} from "@/lib/examStudy/families/advanced/geometry";
import {
  incircleDrawingScale,
  readIncircle,
} from "@/lib/examStudy/families/advanced/incircle";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const parabola = ADVANCED_STUDY_FAMILIES.find(
  (f) => f.id === "exam-advanced:parabola-line-chain",
)!;
const split = ADVANCED_STUDY_FAMILIES.find(
  (f) => f.id === "exam-advanced:split-triangle-incenters",
)!;
const centers = ADVANCED_STUDY_FAMILIES.find(
  (f) => f.id === "exam-advanced:two-centers-angle",
)!;
const incircle = ADVANCED_STUDY_FAMILIES.find(
  (f) => f.id === "exam-advanced:incircle-shaded-area",
)!;
const domainSize = (f: typeof parabola) =>
  f.paramDomain.kind === "finite" ? f.paramDomain.size : 0;
const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const pointLineDistance = (p: Point, a: Point, b: Point) =>
  Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) /
  dist(a, b);

describe("figure-required mathematical information", () => {
  it("re-solves each printed parabola/line chain and checks every essential dependency", () => {
    const signs = new Set<number>();
    for (let i = 0; i < domainSize(parabola); i++) {
      const item = parabola.generate(0, i),
        p = readParabola(item),
        solved = solveParabola(p);
      signs.add(Math.sign(solved.slope));
      const [h, k] = p.vertex,
        [ax, ay] = p.given;
      const a = (ay - k) / (ax - h) ** 2;
      // Independent Vieta solution in the original x coordinate.
      const slope = p.multiplier * a,
        bx = 2 * h + slope / a - ax;
      const by = a * (bx - h) ** 2 + k;
      expect(item.answer).toBe(`(${bx}, ${by})`);
      expect(by - ay).toBe(slope * (bx - ax));
      expect(bx).not.toBe(ax);
      expect(bx).not.toBe(h); // a must be essential to the requested ordinate.
      for (const text of ["V", "A"]) {
        const altered = structuredClone(item);
        const fig = altered.figureSpec as { labels: { text: string }[] };
        fig.labels = fig.labels.filter((l) => !l.text.startsWith(`${text}(`));
        expect(parabola.verify(altered).valid).toBe(false);
      }
      const noFigure = { ...item, figureSpec: null };
      expect(parabola.verify(noFigure).valid).toBe(false);
      expect(
        parabola.verify({
          ...item,
          content: item.content.replace(
            /기울기가 \(-?\d+\)a/,
            "기울기가 정해지지 않은",
          ),
        }).valid,
      ).toBe(false);
      const corruptCurve = structuredClone(item);
      (
        corruptCurve.figureSpec!.curves as { coefficients: number[] }[]
      )[0]!.coefficients[2]! += 1;
      expect(parabola.verify(corruptCurve).valid).toBe(false);
      const corruptLine = structuredClone(item);
      (
        corruptLine.figureSpec!.curves as { coefficients: number[] }[]
      )[1]!.coefficients[0]! += 1;
      expect(parabola.verify(corruptLine).valid).toBe(false);
    }
    expect(signs).toEqual(new Set([-1, 1]));
  });

  it("checks two distinct incenters, all side distances, ray incidence and angle branches", () => {
    for (let i = 0; i < domainSize(split); i++) {
      const item = split.generate(0, i),
        { alpha, beta } = readSplit(item),
        q = constructSplit(alpha, beta);
      const result = solveSplit(item);
      expect(dist(q.a, q.b)).toBeCloseTo(dist(q.a, q.d), 10);
      expect(angleAt(q.b, q.a, q.d)).toBeCloseTo(alpha, 10);
      expect(angleAt(q.d, q.a, q.c)).toBeCloseTo(beta, 10);
      expect(dist(q.i, q.j)).toBeGreaterThan(0.1);
      // Each incenter is equidistant from the THREE sides of ITS OWN triangle.
      for (const [center, vertices] of [
        [q.i, [q.a, q.b, q.d]],
        [q.j, [q.a, q.d, q.c]],
      ] as const) {
        const distances = vertices.map((v, i) =>
          pointLineDistance(center, v, vertices[(i + 1) % 3]!),
        );
        expect(distances[0]).toBeCloseTo(distances[1]!, 10);
        expect(distances[1]).toBeCloseTo(distances[2]!, 10);
      }
      expect(pointLineDistance(q.e, q.a, q.i)).toBeLessThan(1e-10);
      expect(pointLineDistance(q.e, q.c, q.j)).toBeLessThan(1e-10);
      expect(dist(q.c, q.e)).toBeGreaterThan(dist(q.c, q.j)); // C-J-E
      expect(dist(q.a, q.e)).toBeLessThan(dist(q.a, q.i)); // A-E-I
      expect(angleAt(q.i, q.e, q.j)).toBeCloseTo(result.exact, 10);
      expect(item.answer).toBe(`${result.exact}°`);
      const asymmetric = constructSplit(alpha, beta, 94 - alpha / 2);
      expect(angleAt(asymmetric.i, asymmetric.e, asymmetric.j)).not.toBeCloseTo(
        result.exact,
        5,
      );
      // Replacing ABD's incenter by ABC's collapses E onto it. Treating the two
      // centers as the same triangle's center is therefore a real wrong method.
      const wrongI = incenter(q.a, q.b, q.c),
        wrongE = lineIntersection(q.a, wrongI, q.c, q.j);
      expect(dist(wrongI, wrongE)).toBeLessThan(1e-9);
      for (const clause of [
        "AB=AD",
        "각각 삼각형 ABD와 삼각형 ACD의 내심",
        "반직선 CJ를 J 너머로 연장",
        "D는 선분 BC의 내부",
      ])
        expect(
          split.verify({ ...item, content: item.content.replace(clause, "") })
            .valid,
        ).toBe(false);
      const noAngle = structuredClone(item);
      const fig = noAngle.figureSpec as { labels: { text: string }[] };
      fig.labels = fig.labels.filter((l) => !l.text.startsWith("α="));
      expect(split.verify(noAngle).valid).toBe(false);
      const wrongCenter = structuredClone(item);
      const labels = wrongCenter.figureSpec!.labels as {
        text: string;
        at: number[];
      }[];
      labels.find((l) => l.text === "J")!.at[0]! += 0.1;
      expect(split.verify(wrongCenter).valid).toBe(false);
      const noExtension = structuredClone(item);
      (noExtension.figureSpec!.segments as unknown[]).pop();
      expect(split.verify(noExtension).valid).toBe(false);
    }
  });

  it("resolves the two circumcenter/incenter branches with equal given angles", () => {
    const byTheta = new Map<number, Set<string>>();
    for (let index = 0; index < domainSize(centers); index++) {
      const item = centers.generate(0, index),
        p = readTwoCenters(item),
        q = solveTwoCenters(p);
      const set = byTheta.get(p.theta) ?? new Set();
      set.add(item.answer);
      byTheta.set(p.theta, set);
      expect(dist(q.o, q.a)).toBeCloseTo(dist(q.o, q.b), 10);
      expect(dist(q.o, q.c)).toBeCloseTo(dist(q.o, q.b), 10);
      for (const [u, v] of [
        [q.a, q.b],
        [q.b, q.c],
        [q.c, q.a],
      ] as const)
        expect(pointLineDistance(q.i, u, v)).toBeCloseTo(
          pointLineDistance(q.i, q.a, q.b),
          10,
        );
      expect(angleAt(q.o, q.b, q.i)).toBeCloseTo(p.theta, 10);
      expect(angleAt(q.b, q.i, q.c)).toBeCloseTo(
        Number(item.answer.slice(0, -1)),
        10,
      );
      for (const clause of [
        "AB=AC인 예각삼각형",
        "O는 외심, I는 내심",
        "그림의 O와 I의 위치 관계",
        "∠OBI=θ",
      ])
        expect(
          centers.verify({ ...item, content: item.content.replace(clause, "") })
            .valid,
        ).toBe(false);
      const missingAngle = structuredClone(item);
      (missingAngle.figureSpec!.labels as { text: string }[]) = (
        missingAngle.figureSpec!.labels as { text: string }[]
      ).filter((l) => !l.text.startsWith("θ="));
      expect(centers.verify(missingAngle).valid).toBe(false);
      const wrongOrder = structuredClone(item);
      const labels = wrongOrder.figureSpec!.labels as {
        text: string;
        at: number[];
      }[];
      const o = labels.find((l) => l.text === "O")!,
        i = labels.find((l) => l.text === "I")!;
      [o.at, i.at] = [i.at, o.at];
      expect(centers.verify(wrongOrder).valid).toBe(false);
    }
    expect([...byTheta.values()].every((set) => set.size === 2)).toBe(true);
  });

  it("reconstructs incircle radius and shaded area from printed leg labels, checking all tangencies", () => {
    for (let index = 0; index < domainSize(incircle); index++) {
      const item = incircle.generate(0, index),
        { legAB: a, legAC: b, spec } = readIncircle(item);
      const hypotenuse = Math.sqrt(a * a + b * b),
        r = (a + b - hypotenuse) / 2;
      expect(item.answer).toBe(`${(a * b) / 2} - ${r * r}π`);
      const point = (name: string) =>
        (spec.points[name] as Point).map(
          (n) => n / incircleDrawingScale(a, b),
        ) as unknown as Point;
      const A = point("A"),
        B = point("B"),
        C = point("C"),
        I = point("I");
      const D = point("D"),
        E = point("E"),
        F = point("F");
      expect(angleAt(B, A, C)).toBeCloseTo(90, 10);
      expect(dist(I, D)).toBeCloseTo(r, 10);
      expect(dist(I, E)).toBeCloseTo(r, 10);
      expect(dist(I, F)).toBeCloseTo(r, 10);
      expect(dist(B, D)).toBeCloseTo(dist(B, F), 10);
      expect(dist(C, E)).toBeCloseTo(dist(C, F), 10);
      expect(angleAt(I, F, B)).toBeCloseTo(90, 10);
      expect(pointLineDistance(F, B, C)).toBeLessThan(1e-10);
      // Independent area decomposition about the incenter.
      expect((r * (a + b + hypotenuse)) / 2).toBe((a * b) / 2);
      for (const clause of [
        "∠A=90°인 삼각형 ABC",
        "I는 내심",
        "D, E, F는 각각 AB, AC, BC와 내접원의 접점",
        "삼각형 ABC의 내부에서 원의 내부를 제외한 음영 부분",
      ])
        expect(
          incircle.verify({
            ...item,
            content: item.content.replace(clause, ""),
          }).valid,
        ).toBe(false);
      const noHole = structuredClone(item);
      (noHole.figureSpec!.regions as { disk: { fill: string } }).disk.fill =
        "#eeeeee";
      expect(incircle.verify(noHole).valid).toBe(false);
      const noLeg = structuredClone(item);
      delete (noLeg.figureSpec!.labels as Record<string, unknown>).L_AB;
      expect(incircle.verify(noLeg).valid).toBe(false);
      const wrongRadius = structuredClone(item);
      (wrongRadius.figureSpec!.circles as { incircle: { radius: number } })
        .incircle.radius++;
      expect(incircle.verify(wrongRadius).valid).toBe(false);
    }
  });

  it("strictly renders graph-1/v2 combinations with their essential printed labels", async () => {
    // Set PYTHON_BIN to the installed 3.12 for this optional reproduction.
    // No transport/network variables or .env are loaded by the offline config.
    const artifacts = path.join(
      process.cwd(),
      ".qa-artifacts/math-exam-engine-upgrade-20261018/advanced-evidence",
    );
    mkdirSync(artifacts, { recursive: true });
    for (const [name, family, index] of [
      ["parabola-down-positive-line", parabola, 0],
      ["parabola-down-negative-line", parabola, 3],
      ["parabola-up-negative-line", parabola, 4],
      ["parabola-up-positive-line", parabola, 7],
      ["split-incenters-narrow", split, 0],
      ["split-incenters-wide", split, domainSize(split) - 1],
      ["two-centers-outer-above", centers, 0],
      ["two-centers-outer-below", centers, domainSize(centers) - 1],
      ["incircle-wide", incircle, 0],
      ["incircle-tall", incircle, 1],
      ["incircle-slender-tall", incircle, domainSize(incircle) - 2],
      ["incircle-slender-wide", incircle, domainSize(incircle) - 1],
    ] as const) {
      const item = family.generate(0, index);
      const rendered = await renderFigureSpec(item.figureSpec, {
        strict: true,
      });
      expect(rendered.ok, JSON.stringify(rendered)).toBe(true);
      if (!rendered.ok) continue;
      expect(rendered.droppedDimensions ?? []).toEqual([]);
      expect(rendered.svg).toContain("<svg");
      if (item.figureSpec!.version === "graph-1") {
        const labels = item.figureSpec!.labels as { text: string }[];
        for (const label of labels) expect(rendered.svg).toContain(label.text);
      } else {
        const labels = item.figureSpec!.labels as Record<
          string,
          string | { text: string }
        >;
        for (const label of Object.values(labels))
          expect(rendered.svg).toContain(
            typeof label === "string" ? label : label.text,
          );
        expect(rendered.svg).toContain('fill="white"');
      }
      expect(family.verify(item).valid).toBe(true);
      writeFileSync(path.join(artifacts, `${name}.svg`), rendered.svg);
      writeFileSync(
        path.join(artifacts, `${name}.json`),
        JSON.stringify(item, null, 2),
      );
    }
  }, 30_000);

  it("strictly renders every bounded figure tuple without dropping dimensions", async () => {
    const records: {
      family: string;
      variant: number;
      valid: boolean;
      dropped: readonly string[];
    }[] = [];
    for (const family of [parabola, split, centers, incircle])
      for (let index = 0; index < domainSize(family); index++) {
        const item = family.generate(0, index),
          rendered = await renderFigureSpec(item.figureSpec, { strict: true });
        expect(
          rendered.ok,
          `${family.id} tuple ${index}: ${JSON.stringify(rendered)}`,
        ).toBe(true);
        if (!rendered.ok) continue;
        expect(rendered.droppedDimensions ?? []).toEqual([]);
        records.push({
          family: family.id,
          variant: index,
          valid: true,
          dropped: rendered.droppedDimensions ?? [],
        });
      }
    expect(records).toHaveLength(117);
    const dir = path.join(
      process.cwd(),
      ".qa-artifacts/math-exam-engine-upgrade-20261018/advanced-evidence",
    );
    writeFileSync(
      path.join(dir, "all-strict-renders.json"),
      JSON.stringify(records, null, 2),
    );
  }, 30_000);
});
