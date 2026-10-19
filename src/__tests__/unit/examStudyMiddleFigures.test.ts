import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MIDDLE_STUDY_FAMILIES } from "@/lib/examStudy/families/middle";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { stripLabels, svgLabels } from "@/lib/figure/svgLabels";

type Segment = [number, number, number, number];
function actualSegments(svg: string): Segment[] {
  const body = stripLabels(svg),
    result: Segment[] = [];
  for (const m of body.matchAll(
    /<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g,
  ))
    result.push(m.slice(1).map(Number) as Segment);
  for (const m of body.matchAll(
    /<(?:polygon|path)\b[^>]*(?:points|d)="([^"]+)"/g,
  )) {
    const data = m[1];
    // graph-1 paths contain straight sampled M/L strokes; glyph paths were removed above.
    if (/[CQAS]/.test(data)) continue;
    const numbers = (data.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const points = Array.from({ length: numbers.length / 2 }, (_, i) => [
      numbers[2 * i],
      numbers[2 * i + 1],
    ]);
    for (let i = 1; i < points.length; i++)
      result.push([
        points[i - 1][0],
        points[i - 1][1],
        points[i][0],
        points[i][1],
      ]);
    if (m[0].startsWith("<polygon") && points.length > 2)
      result.push([
        points.at(-1)![0],
        points.at(-1)![1],
        points[0][0],
        points[0][1],
      ]);
  }
  return result;
}
function crosses(s: Segment, box: [number, number, number, number]) {
  let low = 0,
    high = 1;
  for (let axis = 0; axis < 2; axis++) {
    const start = s[axis],
      delta = s[axis + 2] - start,
      min = box[axis],
      max = box[axis + 2];
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

/** Run with MIDDLE_RENDER=1 and Python 3.12; never loads repository .env or network transport. */
describe.skipIf(process.env.MIDDLE_RENDER !== "1")(
  "middle actual strict Python renders",
  () => {
    for (const family of MIDDLE_STUDY_FAMILIES.filter(
      (f) => f.representation === "figure-required",
    )) {
      it(`${family.id}: every visual tuple preserves the printed data`, async () => {
        expect(process.env.STUDIO_ENGINE_URL).toBeUndefined();
        expect(process.env.VERCEL).toBeUndefined();
        expect(family.paramDomain.kind).toBe("finite");
        const count =
          family.paramDomain.kind === "finite" ? family.paramDomain.size : 0;
        const dir = process.env.MIDDLE_EVIDENCE_DIR;
        if (dir) mkdirSync(path.join(dir, family.id), { recursive: true });
        for (let i = 0; i < count; i++) {
          const item = family.generate(0, i);
          expect(family.verify(item).valid).toBe(true);
          const result = await renderFigureSpec(item.figureSpec, {
            strict: true,
          });
          expect(
            result.ok,
            result.ok ? "" : `${family.id}:${i}: ${result.error}`,
          ).toBe(true);
          if (!result.ok) throw new Error(result.error);
          expect(result.droppedDimensions ?? []).toEqual([]);
          const expectedLabels = (
            item.figureSpec!.labels as { text: string }[]
          ).map((l) => l.text);
          const actual = svgLabels(result.svg);
          for (const text of expectedLabels)
            expect(actual.map((l) => l.text)).toContain(text);
          expect(actual.map((l) => l.text)).toContain("x");
          expect(actual.map((l) => l.text)).toContain("y");
          // Verify actual MathJax glyph boxes, not only schema acceptance or text anchors.
          const frame =
            /viewBox="([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"/.exec(
              result.svg,
            )!;
          expect(frame).not.toBeNull();
          const [left, top, width, height] = frame.slice(1).map(Number);
          const strokes = actualSegments(result.svg);
          const boxes: {
            text: string;
            box: [number, number, number, number];
          }[] = [];
          for (const l of actual) {
            const labelLeft =
              l.x -
              (l.anchor === "middle"
                ? (l.width ?? 0) / 2
                : l.anchor === "end"
                  ? (l.width ?? 0)
                  : 0);
            expect(labelLeft, l.text).toBeGreaterThanOrEqual(left);
            expect(labelLeft + (l.width ?? 0), l.text).toBeLessThanOrEqual(
              left + width,
            );
            expect(
              l.baseline - (l.ascent ?? l.fontSize),
              l.text,
            ).toBeGreaterThanOrEqual(top);
            expect(l.baseline + (l.descent ?? 0), l.text).toBeLessThanOrEqual(
              top + height,
            );
            expect(
              (l.fontSize * ((70 * 96) / 25.4)) / width,
            ).toBeGreaterThanOrEqual(12.5);
            const box: [number, number, number, number] = [
              labelLeft,
              l.baseline - (l.ascent ?? l.fontSize),
              labelLeft + (l.width ?? 0),
              l.baseline + (l.descent ?? 0),
            ];
            expect(
              strokes.some((s) => crosses(s, box)),
              `${family.id}:${i} ${l.text} overlaps a printed stroke`,
            ).toBe(false);
            for (const previous of boxes)
              expect(
                box[0] < previous.box[2] &&
                  box[2] > previous.box[0] &&
                  box[1] < previous.box[3] &&
                  box[3] > previous.box[1],
                `${l.text} overlaps ${previous.text}`,
              ).toBe(false);
            boxes.push({ text: l.text, box });
          }
          if (dir) {
            writeFileSync(path.join(dir, family.id, `${i}.svg`), result.svg);
            writeFileSync(
              path.join(dir, family.id, `${i}.json`),
              JSON.stringify(
                { familyId: family.id, variant: i, ...item },
                null,
                2,
              ),
            );
          }
        }
      }, 60000);
    }
  },
);
