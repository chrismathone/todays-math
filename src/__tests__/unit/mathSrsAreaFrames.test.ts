// @vitest-environment node
import { expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";

type Point = readonly [number, number];
function area(points: Point[]) {
  return (
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0),
    ) / 2
  );
}
const rect = (w: number, h: number) =>
  area([
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ]);
const tri = (w: number, h: number) =>
  area([
    [0, 0],
    [w, 0],
    [0, h],
  ]);
const rhomb = (w: number, h: number) =>
  area([
    [0, h / 2],
    [w / 2, 0],
    [w, h / 2],
    [w / 2, h],
  ]);
const trap = (top: number, base: number, h: number) =>
  area([
    [0, 0],
    [base, 0],
    [(base + top) / 2, h],
    [(base - top) / 2, h],
  ]);
const perimeter = (w: number, h: number) =>
  [w, h, w, h].reduce((a, b) => a + b, 0);
const find = (predicate: (n: number) => boolean) =>
  Array.from({ length: 100 }, (_, i) => i + 1).find(predicate)!;

it("recomputes perimeter and area redraws using polygons and forward enumeration", () => {
  for (const s of COURSE_SECTIONS.filter((s) => s.chapterId === "5-1-6"))
    for (const tier of ["기본", "응용"] as const)
      for (let seed = 1; seed <= 32; seed++) {
        const p = generateCourseEngineRedraw(s.unit, seed * 7919, tier),
          id = p.formId;
        const [a, b, c, d] = [...p.content.matchAll(/\$([^$]+)\$/g)]
          .map((m) => Number(m[1].match(/^\d+/)?.[0]))
          .filter(Number.isFinite);
        const last = Number(s.id.split("-").at(-1));
        let expected: number;
        const spec = p.figureSpec as {
          kind: string;
          shape: string;
          base: number;
          height: number;
          top?: number;
        } | null;
        if (spec?.kind === "areaPoly")
          expected =
            spec.shape === "tri"
              ? tri(spec.base, spec.height)
              : spec.shape === "rhombus"
                ? rhomb(spec.base, spec.height)
                : spec.shape === "trap"
                  ? trap(spec.top!, spec.base, spec.height)
                  : rect(spec.base, spec.height);
        else if (last === 1) {
          if (id === "02") expected = perimeter(a, b ?? a);
          else if (id === "05")
            expected = find(
              (n) =>
                Array.from({ length: n }, () => a).reduce(
                  (x, y) => x + y,
                  0,
                ) === b,
            );
          else if (id === "06") expected = a + b;
          else if (id === "07") expected = [a, b, b].reduce((x, y) => x + y, 0);
          else if (id === "08")
            expected = Math.abs(perimeter(a, a) - perimeter(b, c));
          else if (id === "09")
            expected = find(
              (n) =>
                Array.from({ length: a }, () => n).reduce(
                  (x, y) => x + y,
                  0,
                ) === b,
            );
          else if (id === "10")
            expected = perimeter(a + c, b) - perimeter(a, b);
          else if (p.content.includes("직사각형"))
            expected = find((w) => w > b && perimeter(w, w - b) === a);
          else {
            const names: Record<string, number> = {
              정삼각형: 3,
              정사각형: 4,
              정오각형: 5,
              정육각형: 6,
              정칠각형: 7,
              정팔각형: 8,
            };
            const sides = Object.entries(names).find(([name]) =>
              p.content.includes(name),
            )![1];
            expected = find(
              (n) =>
                Array.from({ length: sides }, () => n).reduce(
                  (x, y) => x + y,
                  0,
                ) === a,
            );
          }
        } else if (last === 2) {
          if (id === "05") expected = find((h) => rect(b, h) === a);
          else if (id === "06") expected = rect(a, b);
          else if (id === "07") expected = rect(a, a) - rect(b, b);
          else if (id === "09") expected = rect(a, b) + rect(c, d);
          else if (id === "10") expected = find((n) => rect(n, n) === a);
          else if (p.content.includes("정사각형")) {
            const side = find((n) => perimeter(n, n) === a);
            expected = rect(side, side);
          } else {
            const h = find((n) => perimeter(b, n) === a);
            expected = rect(b, h);
          }
        } else if (last === 3) {
          if (id === "02") expected = rect(a, b);
          else if (id === "05") expected = a / rect(100, 100);
          else if (id === "07") expected = rect(a * 100, b * 100);
          else if (id === "08") expected = a / rect(1000, 1000);
          else if (id === "09") expected = rect(a / 100, b);
          else expected = rect(a / 100, b / 100);
        } else if (last === 4) {
          if (id === "06") expected = find((n) => tri(n, b) === a);
          else if (id === "07") expected = find((n) => rect(n, b) === a);
          else if (id === "08") expected = tri(a, b) + tri(c, d);
          else if (id === "09") expected = tri(a, b);
          else if (id === "10") expected = rect(a, b * c);
          else
            expected = find(
              (n) =>
                (p.content.includes("평행사변형") ? rect(b, n) : tri(b, n)) ===
                a,
            );
        } else {
          if (id === "05") expected = rect(a, b);
          else if (id === "06") expected = a + b;
          else if (id === "07") expected = a + a;
          else if (id === "08") expected = find((h) => trap(b, c, h) === a);
          else if (id === "09") expected = rhomb(a, b) + rhomb(c, d);
          else if (id === "10")
            expected = find((base) => trap(b, base, c) === a);
          else
            expected = p.content.includes("마름모")
              ? find((diag) => rhomb(b, diag) === a)
              : find((top) => trap(top, b, c) === a);
        }
        expect(
          Number(p.answer.replaceAll("$", "")),
          `${s.id}/${id} ${p.content}`,
        ).toBe(expected);
      }
});
