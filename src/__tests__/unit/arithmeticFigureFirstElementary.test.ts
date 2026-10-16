import { describe, expect, it } from "vitest";
import { getArithmeticV2Definition } from "@/lib/arithmetic-v2";
import { arithmeticGeometryCatalogSvg } from "@/lib/arithmetic-v2/geometry";
import { lineHitsBox } from "@/lib/arithmetic-v2/families/geometryTriangles/core";
import { arithmeticGeometryLaidOutSvg } from "@/lib/arithmetic-v2/presentation";
import {
  figureFirstDrawing,
  figureFirstGroupInstruction,
  figureFirstSvg,
  isFigureFirstType,
} from "@/lib/arithmetic-v2/presentation/figureFirst";
import {
  ELEMENTARY_FIGURE_FIRST,
  elementaryFigureLayout,
} from "@/lib/arithmetic-v2/presentation/figureFirstElementary";
import { ELEMENTARY_FIGURE_POLICY } from "@/lib/arithmetic-v2/presentation/figurePolicyElementary";
import { arithmeticFigurePresentation } from "@/lib/arithmetic-v2/presentation/figurePolicy";

const typeIds = Object.keys(ELEMENTARY_FIGURE_FIRST);
const parse = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");
type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pad = (box: Box, by: number): Box => ({
  x: box.x - by,
  y: box.y - by,
  w: box.w + 2 * by,
  h: box.h + 2 * by,
});
const TARGET =
  /<g data-drill-label="target" role="img" aria-label="([^"]*)">([^]*?)<\/g>/g;
const LEADER = /<line [^>]*data-leader="target"\/>/g;
const MASK_HOLE = /<polygon points="[^"]+" fill="#000000"\/>/g;

/** The ink box of the drawn mark: the square (stroke included), the degree
 * ring and the typeset unit, from the pre-typeset markup. */
function markBox(group: string): Box {
  const rect =
    /<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="none" stroke="#111111" stroke-width="([^"]+)"/.exec(
      group,
    )!;
  const [x, y, w, h, sw] = rect.slice(1).map(Number);
  let box: Box = { x: x - sw / 2, y: y - sw / 2, w: w + sw, h: h + sw };
  const ring =
    /<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)" fill="none" stroke="#111111"/.exec(
      group,
    );
  if (ring) {
    const [cx, cy, r] = ring.slice(1).map(Number);
    const top = Math.min(box.y, cy - r),
      right = Math.max(box.x + box.w, cx + r),
      bottom = Math.max(box.y + box.h, cy + r);
    box = { x: box.x, y: top, w: right - box.x, h: bottom - top };
  }
  const unit =
    /<text[^>]*x="([^"]+)"[^>]*font-size="([^"]+)"[^>]*>cm<\/text>/.exec(group);
  if (unit) {
    const [ux, fs] = unit.slice(1).map(Number);
    box = { ...box, w: ux + 1.277 * fs - box.x };
  }
  return box;
}

const ANGLE_TYPES = typeIds.filter((typeId) => typeId.startsWith("e4-"));
const SQUARE_TYPES = typeIds.filter((typeId) =>
  /-(?:side|base|height|diagonal|top|bottom)$/.test(typeId),
);
const WHOLE_TYPES = typeIds.filter(
  (typeId) => !ANGLE_TYPES.includes(typeId) && !SQUARE_TYPES.includes(typeId),
);

describe("figure-first 초등 각도 · 둘레 · 넓이 with the unknown marked □ (owner, 2026-10-16)", () => {
  it("covers the audited families with 초등 wording and leaves 단위 환산 · 입체 · 원의 역산 as prose", () => {
    expect([
      ANGLE_TYPES.length,
      SQUARE_TYPES.length,
      WHOLE_TYPES.length,
    ]).toEqual([10, 16, 16]);
    for (const typeId of typeIds) {
      expect(isFigureFirstType(typeId), typeId).toBe(true);
      const policy = ELEMENTARY_FIGURE_POLICY.find((p) => p.typeId === typeId);
      expect(policy?.showFigure, typeId).toBe(true);
      expect(policy?.reason, typeId).toBe(
        "그림 우선(2026-10-16 원장님) · 미지수는 □",
      );
      expect(figureFirstGroupInstruction(typeId), typeId).toMatch(
        ANGLE_TYPES.includes(typeId) || SQUARE_TYPES.includes(typeId)
          ? /^다음 (?:그림|[가-힣]+)에서 □의 값을 구하세요\.$/
          : /^다음 [가-힣]+의 (?:둘레|넓이|원주)를 구하세요\.$/,
      );
    }
    expect(figureFirstGroupInstruction("e5-rectangle-perimeter-side")).toBe(
      "다음 직사각형에서 □의 값을 구하세요.",
    );
    expect(figureFirstGroupInstruction("e4-angle-sum")).toBe(
      "다음 그림에서 □의 값을 구하세요.",
    );
    expect(figureFirstGroupInstruction("e6-circle-area-radius")).toBe(
      "다음 원의 넓이를 구하세요.",
    );
    for (const typeId of [
      "e6-circle-radius-circumference",
      "e6-circle-diameter-area",
      "e5-cuboid-edges",
      "e5-area-m2-cm2",
      "e3-circle-radius",
      "e2-polygon-sides-total",
    ])
      expect(isFigureFirstType(typeId), typeId).toBe(false);
  });

  it("keeps the frozen layout, every given and exactly one legible □ on all 5,025 variants", () => {
    let variants = 0,
      leaders = 0,
      shifted = 0;
    for (const typeId of typeIds) {
      const definition = getArithmeticV2Definition(typeId);
      const expectsSquare = !WHOLE_TYPES.includes(typeId);
      for (let index = 0; index < definition.domainSize; index++) {
        const { prompt } = definition.problemAt(index);
        if (prompt.layout !== "math" || !prompt.figureId)
          throw new Error(typeId);
        const id = prompt.figureId;
        const canonical = arithmeticGeometryCatalogSvg(id);
        const laidOut = arithmeticGeometryLaidOutSvg(id, canonical);
        const svg = figureFirstDrawing(typeId, prompt, canonical);
        expect(svg, id).toBeDefined();
        expect(parse(svg!).querySelector("parsererror"), id).toBeNull();
        expect(arithmeticGeometryCatalogSvg(id), id).toBe(canonical);
        expect(arithmeticFigurePresentation(prompt, typeId), id).toEqual({
          showFigure: true,
          lines: [],
        });
        const marks = [...svg!.matchAll(TARGET)];
        expect(marks, id).toHaveLength(expectsSquare ? 1 : 0);
        // The □ is drawn, never a font glyph the printer may lack.
        expect(svg, id).not.toMatch(/>[^<]*□[^<]*</);
        if (!expectsSquare) {
          expect(svg, id).toBe(laidOut);
          variants++;
          continue;
        }
        const [whole, label, body] = marks[0];
        const box = markBox(body);
        const layout = elementaryFigureLayout(laidOut)!;
        const { view } = layout;
        expect(
          box.x >= view.x &&
            box.y >= view.y &&
            box.x + box.w <= view.x + view.w &&
            box.y + box.h <= view.y + view.h,
          `${id} inside the view`,
        ).toBe(true);
        if (ANGLE_TYPES.includes(typeId)) {
          expect(label, id).toBe("□°");
          const leaderMarks = [...svg!.matchAll(LEADER)];
          expect(leaderMarks.length, id).toBeLessThanOrEqual(1);
          leaders += leaderMarks.length;
          expect(
            svg!.replace(whole, "").replace(leaderMarks[0]?.[0] ?? "", ""),
            id,
          ).toBe(laidOut);
          // Nothing of the figure runs under or against the mark.
          expect(
            layout.labels.some((other) => overlaps(pad(box, 2), other)),
            `${id} □ against a given`,
          ).toBe(false);
          expect(
            layout.segments.some(([a, b]) => lineHitsBox(a, b, pad(box, 3))),
            `${id} □ on a stroke`,
          ).toBe(false);
        } else {
          expect(label, id).toBe("□ cm");
          expect(svg, id).not.toMatch(LEADER);
          // The word label is gone, its number neighbours stay, the shared
          // mask may have one hole recut to the new width.
          const word = /data-mj="([^"]+)"[^>]*>\1<\/text>/.exec(
            laidOut.replace(
              /data-mj="(?:[\d.]+ cm²?)"[^>]*>[^<]*<\/text>/g,
              "",
            ),
          )![1];
          const withoutWord = laidOut.replace(
            new RegExp(`<text\\b[^>]*data-mj="${word}"[^>]*>${word}</text>`),
            "",
          );
          expect(
            svg!.replace(whole, "").replace(MASK_HOLE, "<hole/>"),
            id,
          ).toBe(withoutWord.replace(MASK_HOLE, "<hole/>"));
          expect(svg, id).not.toContain(`>${word}<`);
          for (const given of laidOut.matchAll(/data-mj="([^"]+)"/g))
            if (given[1] !== word) expect(svg, id).toContain(given[0]);
          // The mark sits off the segment it measures (a dashed height).
          const owner = [
            ...withoutWord
              .slice(0, svg!.indexOf(whole))
              .matchAll(/<g data-dimension="[^"]*" data-endpoints="([^"]+)"/g),
          ].pop();
          const [x1, y1, x2, y2] = owner![1].split(/\s+/).map(Number);
          expect(
            lineHitsBox([x1, y1], [x2, y2], pad(box, 1)),
            `${id} □ on its segment`,
          ).toBe(false);
          expect(word, id).toMatch(
            /^(?:가로|밑변|한 변|높이|윗변|아랫변|가로 대각선)$/,
          );
          const tag = [...laidOut.matchAll(/<text\b[^>]*>/g)].find((t) =>
            t[0].includes(`data-mj="${word}"`),
          )![0];
          const anchor = Number(/\bx="([^"]+)"/.exec(tag)![1]);
          if (Math.abs(box.x + box.w / 2 - anchor) > 0.5) shifted++;
        }
        variants++;
      }
    }
    expect(variants).toBe(5025);
    // Two 20°·25° apexes of 직각삼각형 take a leader; nothing else does.
    expect(leaders).toBe(2);
    // Only the in-figure 높이 marks move, by the few px that clear the
    // dashed height; every other mark keeps the word label's anchor.
    expect(shifted).toBeLessThanOrEqual(166 * 2 + 265);
    expect(shifted).toBeGreaterThan(0);
  }, 120_000);

  it("typesets the unit with the dictionary of the given numbers and keeps the □ as strokes", () => {
    const { prompt } = getArithmeticV2Definition(
      "e5-trapezoid-area-height",
    ).problemAt(3);
    if (prompt.layout !== "math") throw new Error();
    const display = figureFirstSvg(
      "e5-trapezoid-area-height",
      prompt,
      arithmeticGeometryCatalogSvg(prompt.figureId!),
    )!;
    expect(display).toContain("arithmetic-geometry-presentation-v1");
    expect(display).toContain('data-original-label="cm"');
    expect(display).toMatch(/<rect [^>]*stroke="#111111" stroke-width="1\.18"/);
    expect(display).not.toContain(">높이<");
    expect(display).toContain('aria-label="□ cm"');
    const angle = getArithmeticV2Definition("e4-angle-sum").problemAt(60);
    if (angle.prompt.layout !== "math") throw new Error();
    const angleDisplay = figureFirstSvg(
      "e4-angle-sum",
      angle.prompt,
      arithmeticGeometryCatalogSvg(angle.prompt.figureId!),
    )!;
    expect(angleDisplay).toContain('aria-label="□°"');
    expect(angleDisplay).toMatch(
      /<circle [^>]*r="1\.97" fill="none" stroke="#111111"/,
    );
  });
});
