// @vitest-environment node
import { expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";

function box(w: number, d: number, h: number) {
  const dims = [w, d, h];
  const vertices = [0, w].flatMap((x) =>
    [0, d].flatMap((y) => [0, h].map((z) => [x, y, z])),
  );
  const edges = vertices.flatMap((a, i) =>
    vertices.slice(i + 1).flatMap((b) => {
      const axes = a.map((x, k) => (x !== b[k] ? k : -1)).filter((k) => k >= 0);
      return axes.length === 1
        ? [
            {
              axis: axes[0],
              length: Math.abs(a[axes[0]] - b[axes[0]]),
              hidden: a.filter((_, k) => k !== axes[0]).every((v) => v === 0),
            },
          ]
        : [];
    }),
  );
  const faces = dims.flatMap((_, axis) =>
    [0, 1].map(() => {
      const sides = dims.filter((_, k) => k !== axis);
      const cells = new Set<string>();
      for (let x = 0; x < sides[0]; x++)
        for (let y = 0; y < sides[1]; y++) cells.add(`${x},${y}`);
      return {
        axis,
        area: cells.size,
        key: [...sides].sort((a, b) => a - b).join(":"),
      };
    }),
  );
  return { vertices, edges, faces };
}
function netBoundary(w: number, d: number, h: number) {
  // The renderer's six rectangles as unit squares; cancel shared cell edges.
  const cells = new Set<string>();
  for (const [x0, y0, rw, rh] of [
    [0, 0, w, d],
    [-d, d, d, h],
    [0, d, w, h],
    [w, d, d, h],
    [0, d + h, w, d],
    [0, d + h + d, w, h],
  ])
    for (let x = x0; x < x0 + rw; x++)
      for (let y = y0; y < y0 + rh; y++) cells.add(`${x},${y}`);
  let boundary = 0;
  for (const key of cells) {
    const [x, y] = key.split(",").map(Number);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (!cells.has(`${x + dx},${y + dy}`)) boundary++;
  }
  return boundary;
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

it("recalculates box frames from vertices, edges, face unit squares and unfolded boundaries", () => {
  for (const s of COURSE_SECTIONS.filter((s) => s.chapterId === "5-2-5"))
    for (const tier of ["기본", "응용"] as const)
      for (let seed = 1; seed <= 32; seed++) {
        const p = generateCourseEngineRedraw(s.unit, seed * 7919, tier);
        const nums = [...p.content.matchAll(/\$(\d+)\$/g)].map((m) =>
          Number(m[1]),
        );
        const spec = p.figureSpec as { w: number; d: number; h: number } | null;
        const last = Number(s.id.split("-").at(-1)),
          id = p.formId;
        let expected: number;
        if (!spec) {
          if (last === 1)
            expected = Array.from({ length: 50 }, (_, i) => i + 1).find(
              (v) =>
                sum(box(nums[1], nums[2], v).edges.map((e) => e.length)) ===
                nums[0],
            )!;
          else
            expected = Array.from({ length: 20 }, (_, i) => i + 1).find(
              (v) => netBoundary(v, v, v) === nums[0],
            )!;
        } else {
          const { w, d, h } = spec;
          const { vertices, edges, faces } = box(w, d, h);
          const total = sum(edges.map((e) => e.length));
          const visible = edges.filter((e) => !e.hidden),
            hidden = edges.filter((e) => e.hidden);
          const unique = new Map(faces.map((f) => [f.key, f.area]));
          if (!id) {
            if (last === 1)
              expected = p.content.includes("남는")
                ? nums.at(-1)! - total
                : sum(Array.from({ length: nums.at(-1)! }, () => total));
            else if (last === 2)
              expected = sum(Array.from({ length: nums.at(-1)! }, () => total));
            else if (last === 3)
              expected =
                Math.max(...faces.map((f) => f.area)) -
                Math.min(...faces.map((f) => f.area));
            else
              expected =
                Math.max(...hidden.map((e) => e.length)) +
                Math.min(...hidden.map((e) => e.length));
          } else if (last === 1) {
            expected =
              id === "02"
                ? faces.length
                : id === "05"
                  ? vertices.length
                  : id === "06"
                    ? edges.length
                    : unique.size;
          } else if (last === 2) {
            expected =
              id === "02"
                ? total
                : id === "05"
                  ? faces.length
                  : id === "06"
                    ? vertices.length
                    : id === "07"
                      ? edges.length
                      : id === "03"
                        ? nums[0] - total
                        : sum(
                            edges.filter((e) => e.hidden).map((e) => e.length),
                          );
          } else if (last === 3) {
            expected =
              id === "02"
                ? Math.max(
                    ...faces.filter((f) => f.axis !== 2).map((f) => f.area),
                  )
                : id === "05"
                  ? sum(edges.filter((e) => e.axis === 2).map((e) => e.length))
                  : id === "06"
                    ? Math.max(...faces.map((f) => f.area))
                    : id === "07"
                      ? Math.min(...faces.map((f) => f.area))
                      : id === "03"
                        ? sum(
                            faces
                              .filter((f) => f.axis !== 2)
                              .map((f) => f.area),
                          )
                        : sum([...unique.values()]);
          } else if (last === 4) {
            expected =
              id === "02"
                ? sum(visible.map((e) => e.length))
                : id === "05"
                  ? hidden.length
                  : id === "06"
                    ? visible.length
                    : id === "07"
                      ? hidden.find((e) => e.axis === 0)!.length
                      : id === "03"
                        ? sum(visible.map((e) => e.length)) -
                          sum(hidden.map((e) => e.length))
                        : total;
          } else if (last === 5) {
            expected =
              id === "02"
                ? faces.length
                : id === "05"
                  ? vertices.length
                  : id === "06"
                    ? edges.length
                    : id === "07"
                      ? w
                      : id === "03"
                        ? nums[0] - netBoundary(w, d, h)
                        : netBoundary(w, d, h) - total;
          } else {
            expected =
              id === "02"
                ? sum(faces.filter((f) => f.axis === 1).map((f) => f.area))
                : id === "05"
                  ? faces.filter((f) => f.axis === 2).length
                  : id === "06"
                    ? faces.length
                    : id === "07"
                      ? faces.find((f) => f.axis === 1)!.area
                      : id === "03"
                        ? faces.find((f) => f.axis === 2)!.area +
                          faces.find((f) => f.axis === 1)!.area
                        : id === "09"
                          ? sum([...unique.values()])
                          : netBoundary(w, d, h);
          }
        }
        expect(
          Number(p.answer.replaceAll("$", "")),
          `${s.id}/${id} ${p.content}`,
        ).toBe(expected);
      }
});
