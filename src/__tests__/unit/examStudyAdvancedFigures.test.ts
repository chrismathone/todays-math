import { describe, expect, it } from "vitest";
import { ADVANCED_STUDY_FAMILIES } from "@/lib/examStudy/families/advanced";
import {
  readParabola,
  solveParabola,
  graphFigure,
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
import {
  FIGURE_SVG_PRINT_MM,
  figureSvgSize,
} from "@/lib/figure/figureSvgFrame";
import { stripLabels, svgLabels } from "@/lib/figure/svgLabels";
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

const artifacts =
  process.env.ADVANCED_EVIDENCE_DIR ??
  path.join(
    process.cwd(),
    ".qa-artifacts/math-exam-engine-upgrade-20261018/advanced-evidence",
  );
type Box = readonly [number, number, number, number];
type Stroke = readonly [number, number, number, number];
const attribute = (tag: string, name: string) =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
const overlaps = (a: Box, b: Box) =>
  a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

function crosses(stroke: Stroke, box: Box): boolean {
  let low = 0,
    high = 1;
  for (let axis = 0; axis < 2; axis++) {
    const start = stroke[axis]!,
      delta = stroke[axis + 2]! - start,
      min = box[axis]!,
      max = box[axis + 2]!;
    if (Math.abs(delta) < 1e-10) {
      if (start <= min || start >= max) return false;
    } else {
      const a = (min - start) / delta,
        b = (max - start) / delta;
      low = Math.max(low, Math.min(a, b));
      high = Math.min(high, Math.max(a, b));
      if (low >= high) return false;
    }
  }
  return true;
}

/** Read printed primitives after removing MathJax's em-space glyph paths.
 * The authored graphs use straight M/L paths; v2 adds circle strokes and the
 * right-angle marker. Filled region paths are not obstacles to annotations. */
function printedGeometry(svg: string) {
  const strokes: Stroke[] = [],
    dots: { x: number; y: number; radius: number }[] = [],
    circles: { x: number; y: number; radius: number }[] = [];
  for (const match of stripLabels(svg).matchAll(
    /<(line|polygon|path|circle)\b[^>]*>/g,
  )) {
    const tag = match[0];
    if (match[1] === "line") {
      strokes.push(
        ["x1", "y1", "x2", "y2"].map((key) =>
          Number(attribute(tag, key)),
        ) as unknown as Stroke,
      );
    } else if (match[1] === "circle") {
      const x = Number(attribute(tag, "cx")),
        y = Number(attribute(tag, "cy")),
        radius = Number(attribute(tag, "r"));
      if (attribute(tag, "fill") !== "none") dots.push({ x, y, radius });
      else circles.push({ x, y, radius });
    } else {
      if (attribute(tag, "stroke") === "none") continue;
      const data = attribute(tag, match[1] === "polygon" ? "points" : "d")!;
      // Fail if a future emitter adds an unmeasured curve/transform.
      expect(data.replace(/[MLZmlz\d.,\s+-]/g, "")).toBe("");
      expect(attribute(tag, "transform")).toBeUndefined();
      const values = (data.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      const points = Array.from(
        { length: values.length / 2 },
        (_, i) => [values[2 * i]!, values[2 * i + 1]!] as const,
      );
      for (let i = 1; i < points.length; i++)
        strokes.push([...points[i - 1]!, ...points[i]!]);
      if (match[1] === "polygon" || /[Zz]/.test(data))
        strokes.push([...points.at(-1)!, ...points[0]!]);
    }
  }
  return { strokes, dots, circles };
}

function measurePrintedLabels(svg: string, expected: readonly string[]) {
  const frame = /viewBox="([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"/.exec(svg)!;
  expect(frame).not.toBeNull();
  const [left, top, width, height] = frame.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
  ];
  const size = figureSvgSize(svg),
    scale = (FIGURE_SVG_PRINT_MM[size] * 96) / 25.4 / width,
    labels = svgLabels(svg),
    geometry = printedGeometry(svg),
    issues: string[] = [];
  expect(labels.map((label) => label.text).sort()).toEqual(
    [...expected].sort(),
  );
  const boxes = labels.map((label) => {
    expect(label.typeset, label.text).toBe(true);
    expect(label.width, label.text).not.toBeNull();
    expect(label.ascent, label.text).not.toBeNull();
    expect(label.descent, label.text).not.toBeNull();
    const x =
      label.x -
      label.width! *
        (label.anchor === "middle" ? 0.5 : label.anchor === "end" ? 1 : 0);
    const halo = label.halo / 2;
    const box: Box = [
      x - halo,
      label.baseline - label.ascent! - halo,
      x + label.width! + halo,
      label.baseline + label.descent! + halo,
    ];
    if (
      box[0] < left ||
      box[1] < top ||
      box[2] > left + width ||
      box[3] > top + height
    )
      issues.push(`${label.text}: clipped`);
    // One SVG unit covers the half-width of the largest 2-unit stroke.
    const clear: Box = [box[0] - 1, box[1] - 1, box[2] + 1, box[3] + 1];
    if (geometry.strokes.some((stroke) => crosses(stroke, clear)))
      issues.push(`${label.text}: stroke overlap`);
    if (
      geometry.dots.some(
        (dot) =>
          Math.hypot(
            dot.x - Math.max(clear[0], Math.min(clear[2], dot.x)),
            dot.y - Math.max(clear[1], Math.min(clear[3], dot.y)),
          ) < dot.radius,
      )
    )
      issues.push(`${label.text}: point overlap`);
    if (
      geometry.circles.some(({ x, y, radius }) => {
        const nearest = Math.hypot(
          x - Math.max(clear[0], Math.min(clear[2], x)),
          y - Math.max(clear[1], Math.min(clear[3], y)),
        );
        const farthest = Math.max(
          ...[clear[0], clear[2]].flatMap((bx) =>
            [clear[1], clear[3]].map((by) => Math.hypot(x - bx, y - by)),
          ),
        );
        return nearest < radius && farthest > radius;
      })
    )
      issues.push(`${label.text}: circle overlap`);
    return { text: label.text, box, cssPx: label.fontSize * scale };
  });
  for (let i = 0; i < boxes.length; i++)
    for (let j = 0; j < i; j++)
      if (overlaps(boxes[i]!.box, boxes[j]!.box))
        issues.push(`${boxes[i]!.text}: overlaps ${boxes[j]!.text}`);
  const minimumCssPx = Math.min(...boxes.map((label) => label.cssPx));
  if (minimumCssPx < 12.5)
    issues.push(`font floor: ${minimumCssPx.toFixed(6)}px`);
  return {
    frame: { left, top, width, height, size },
    minimumCssPx,
    labels: boxes,
    issues,
  };
}

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

  it("strictly renders every bounded figure tuple with readable, collision-free print labels", async () => {
    const records: {
      family: string;
      variant: number;
      valid: boolean;
      dropped: readonly string[];
      print: ReturnType<typeof measurePrintedLabels>;
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
        expect(family.verify(item).valid).toBe(true);
        const labels = item.figureSpec!.labels as
          { text: string }[] | Record<string, string | { text: string }>;
        const expected = Object.values(labels).map((label) =>
          typeof label === "string" ? label : label.text,
        );
        if (item.figureSpec!.axes) {
          const [xlo, xhi] = item.figureSpec!.xRange as number[];
          const [ylo, yhi] = item.figureSpec!.yRange as number[];
          if (ylo! <= 0 && yhi! >= 0) expected.push("x");
          if (xlo! <= 0 && xhi! >= 0) expected.push("y");
        }
        const print = measurePrintedLabels(rendered.svg, expected);
        if (item.figureSpec!.version === "graph-1") {
          const spec = graphFigure(item);
          const scaleX =
            (print.frame.width - 96) / (spec.xRange[1] - spec.xRange[0]);
          const scaleY =
            (print.frame.height - 96) / (spec.yRange[1] - spec.yRange[0]);
          if (!spec.axes) expect(scaleX).toBeCloseTo(scaleY, 10);
          const project = ([x, y]: Point): Point => [
            48 + (x - spec.xRange[0]) * scaleX,
            print.frame.height - 48 - (y - spec.yRange[0]) * scaleY,
          ];
          const dots = printedGeometry(rendered.svg).dots;
          for (const label of spec.labels.filter((label) =>
            /^[A-Z]$/.test(label.text),
          )) {
            const owner = project(label.at);
            expect(
              dots.some((dot) => dist([dot.x, dot.y], owner) < 0.08),
              label.text,
            ).toBe(true);
            const box = print.labels.find(
              (actual) => actual.text === label.text,
            )!.box;
            const center: Point = [
              (box[0] + box[2]) / 2,
              (box[1] + box[3]) / 2,
            ];
            // Actual glyph centers must still identify the correct point after
            // Python/SVG rounding, especially the close E/I and O/I pairs.
            for (const dot of dots)
              expect(
                dist(center, owner),
                `${family.id}:${index} ${label.text}: wrong point role`,
              ).toBeLessThanOrEqual(dist(center, [dot.x, dot.y]) + 0.08);
          }
        } else {
          expect(rendered.svg).toMatch(
            /<path\b[^>]*fill="white"[^>]*data-region="disk"/,
          );
        }
        const directory = path.join(
          artifacts,
          "renders",
          family.id.replaceAll(":", "-"),
        );
        mkdirSync(directory, { recursive: true });
        writeFileSync(path.join(directory, `${index}.svg`), rendered.svg);
        writeFileSync(
          path.join(directory, `${index}.json`),
          JSON.stringify(item, null, 2),
        );
        records.push({
          family: family.id,
          variant: index,
          valid: true,
          dropped: rendered.droppedDimensions ?? [],
          print,
        });
      }
    expect(records).toHaveLength(117);
    mkdirSync(artifacts, { recursive: true });
    writeFileSync(
      path.join(artifacts, "all-strict-renders.json"),
      JSON.stringify(records, null, 2),
    );
    expect(
      records.flatMap((record) =>
        record.print.issues.map(
          (issue) => `${record.family}:${record.variant} ${issue}`,
        ),
      ),
    ).toEqual([]);
    // This exhausts 117 real Python renders; allow process startup on Windows.
    // All tuple, glyph, collision and point-role assertions still run unchanged.
  }, 120_000);
});
