/** Browser measurements in SCREEN coordinates, including every ancestor CTM.
 * getBBox/CTM geometry compared with untransformed SVG coordinates can silently
 * miss collisions in a 216px thumbnail. This probe also counts labels and marks,
 * checks their mutual overlap, and associates outside labels with their arcs.
 */
import type { Page } from "playwright";

export async function measureGeometryDrills(page: Page) {
  // tsx preserves nested function names using this helper. Playwright serializes
  // the callback alone, so supply the harmless identity helper in the QA page.
  await page.evaluate("globalThis.__name ??= (fn) => fn");
  return page.locator("article svg").evaluateAll((roots) =>
    roots.map((element) => {
      const root = element as SVGSVGElement;
      type XY = [number, number];
      type Box = [number, number, number, number];
      const scale = root.getScreenCTM()!.a;
      const point = (el: SVGGraphicsElement, x: number, y: number): XY => {
        const m = el.getScreenCTM()!;
        return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
      };
      const overlaps = (a: Box, b: Box) =>
        a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
      const inside = ([x, y]: XY, b: Box) =>
        x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
      // Exact segment/box clipping, including tangencies (curves sampled at 0.2px).
      const hitsBox = (a: XY, b: XY, box: Box) => {
        let lo = 0,
          hi = 1;
        for (let axis = 0; axis < 2; axis++) {
          const delta = b[axis] - a[axis];
          if (Math.abs(delta) < 1e-12) {
            if (a[axis] < box[axis] || a[axis] > box[axis + 2]) return false;
          } else {
            const u = (box[axis] - a[axis]) / delta;
            const v = (box[axis + 2] - a[axis]) / delta;
            lo = Math.max(lo, Math.min(u, v));
            hi = Math.min(hi, Math.max(u, v));
            if (lo > hi) return false;
          }
        }
        return true;
      };
      const labels = Array.from(
        root.querySelectorAll<SVGGElement>("[data-label]"),
      ).map((g) => {
        const b = g.getBoundingClientRect(); // actual paths, not text em boxes
        const pad = (Number(g.getAttribute("data-halo")) * scale) / 2;
        return {
          text: g.getAttribute("data-label")!,
          fontPx: Number(g.getAttribute("data-fs")) * scale,
          inkHeightPx: b.height,
          box: [
            b.left - pad,
            b.top - pad,
            b.right + pad,
            b.bottom + pad,
          ] as Box,
        };
      });
      const geometry = Array.from(
        root.querySelectorAll<SVGGeometryElement>("line,path"),
      ).filter((el) => !el.closest("[data-label]"));
      const geometryHits: { label: number; kind: string }[] = [];
      for (const el of geometry) {
        const length = el.getTotalLength();
        const count = Math.max(2, Math.ceil((length * scale) / 0.2));
        const path: XY[] = [];
        for (let i = 0; i <= count; i++) {
          const p = el.getPointAtLength((length * i) / count);
          path.push(point(el, p.x, p.y));
        }
        const stroke = (Number(el.getAttribute("stroke-width")) * scale) / 2;
        labels.forEach((label, i) => {
          const b = label.box;
          const grown: Box = [
            b[0] - stroke,
            b[1] - stroke,
            b[2] + stroke,
            b[3] + stroke,
          ];
          if (path.slice(1).some((p, j) => hitsBox(path[j], p, grown))) {
            geometryHits.push({ label: i, kind: el.tagName });
          }
        });
      }
      const labelHits: number[][] = [];
      labels.forEach((label, i) =>
        labels.slice(i + 1).forEach((other, j) => {
          if (overlaps(label.box, other.box)) labelHits.push([i, i + j + 1]);
        }),
      );
      const frame = root.getBoundingClientRect();
      const frameBox: Box = [frame.left, frame.top, frame.right, frame.bottom];
      const clipped = labels.flatMap((label, i) =>
        inside([label.box[0], label.box[1]], frameBox) &&
        inside([label.box[2], label.box[3]], frameBox)
          ? []
          : [i],
      );

      const sides = Array.from(root.querySelectorAll<SVGLineElement>("line"));
      // The triangle spec emits AB, BC, CA; use the actual rendered endpoints.
      const vertices = sides.map((el) =>
        point(el, Number(el.getAttribute("x1")), Number(el.getAttribute("y1"))),
      );
      const angles = vertices.map((v, i) => {
        if (vertices.length !== 3) return NaN;
        const p = vertices[(i + 1) % 3],
          q = vertices[(i + 2) % 3];
        const ux = p[0] - v[0],
          uy = p[1] - v[1];
        const vx = q[0] - v[0],
          vy = q[1] - v[1];
        return (
          (Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy) * 180) /
          Math.PI
        );
      });
      const arcs = geometry.filter(
        (el) => el.tagName === "path" && / A /.test(el.getAttribute("d") ?? ""),
      );
      const leaders = geometry.filter(
        (el) => el.tagName === "path" && / Q /.test(el.getAttribute("d") ?? ""),
      );
      const withinTriangle = ([x, y]: XY) => {
        const signs = vertices.map((v, i) => {
          const w = vertices[(i + 1) % 3];
          return (w[0] - v[0]) * (y - v[1]) - (w[1] - v[1]) * (x - v[0]);
        });
        return signs.every((x) => x >= 0) || signs.every((x) => x <= 0);
      };
      const outsideWithoutLeader: number[] = [];
      const ambiguousInside: number[] = [];
      labels.forEach(({ box }, i) => {
        if (vertices.length !== 3) return;
        if (withinTriangle([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2])) {
          // A legible label must also unambiguously belong to its own vertex.
          // Measure the actual typeset ink/halo box in screen coordinates.
          const own = vertices[i];
          if (
            vertices.some(
              (other, j) =>
                j !== i &&
                [box[0], box[2]].some((x) =>
                  [box[1], box[3]].some(
                    (y) =>
                      Math.hypot(x - other[0], y - other[1]) <=
                      Math.hypot(x - own[0], y - own[1]),
                  ),
                ),
            )
          )
            ambiguousInside.push(i);
          return;
        }
        const arc = arcs[i];
        const p = arc?.getPointAtLength(arc.getTotalLength() / 2);
        const middle = p && point(arc, p.x, p.y);
        const linked =
          middle &&
          leaders.some((leader) => {
            const a = leader.getPointAtLength(0),
              b = leader.getPointAtLength(leader.getTotalLength());
            const start = point(leader, a.x, a.y),
              end = point(leader, b.x, b.y);
            const labelGap = Math.hypot(
              Math.max(box[0] - end[0], 0, end[0] - box[2]),
              Math.max(box[1] - end[1], 0, end[1] - box[3]),
            );
            return (
              Math.hypot(start[0] - middle[0], start[1] - middle[1]) < 0.3 &&
              labelGap < 8
            );
          });
        if (!linked) outsideWithoutLeader.push(i);
      });
      return {
        viewBox: root.getAttribute("viewBox"),
        widthPx: frame.width,
        heightPx: frame.height,
        labels,
        angles,
        sideCount: sides.length,
        arcCount: arcs.length,
        leaderCount: leaders.length,
        geometryHits,
        labelHits,
        clipped,
        outsideWithoutLeader,
        ambiguousInside,
      };
    }),
  );
}

export type GeometryDrillProof = Awaited<
  ReturnType<typeof measureGeometryDrills>
>[number];

export function geometryDrillFailures(
  proof: GeometryDrillProof,
  given: readonly [number, number],
) {
  const expected = [given[0], given[1], 180 - given[0] - given[1]];
  return [
    ...(proof.labels.length === 2
      ? []
      : ["expected only the two given angle labels"]),
    ...(proof.sideCount === 3 && proof.arcCount === 3
      ? []
      : ["expected three sides and three angle arcs"]),
    ...(proof.labels.every((label, i) => label.text === `${given[i]}°`)
      ? []
      : ["incorrect label text"]),
    ...(proof.labels.every(
      (label) => label.fontPx >= 16 && label.inkHeightPx >= 10,
    )
      ? []
      : ["unreadable label size"]),
    ...(proof.angles.length === 3 &&
    proof.angles.every((angle, i) => Math.abs(angle - expected[i]) < 0.01)
      ? []
      : ["rendered angles changed"]),
    ...(proof.geometryHits.length
      ? ["label overlaps geometry/mark/leader"]
      : []),
    ...(proof.labelHits.length ? ["labels overlap"] : []),
    ...(proof.clipped.length ? ["label clipped"] : []),
    ...(proof.outsideWithoutLeader.length
      ? ["outside label lacks its own arc leader"]
      : []),
    ...(proof.ambiguousInside.length
      ? ["inside label is ambiguous between marked vertices"]
      : []),
  ];
}
