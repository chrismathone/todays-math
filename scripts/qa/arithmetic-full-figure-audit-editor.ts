/** Offline, public editor operations plus Chromium collision evidence. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { arithmeticGeometryDisplaySize } from "../../src/lib/arithmetic-v2/presentation";
import type { Page } from "playwright";
import { addFigureMark } from "../../src/components/unified/figure-editor/figureMarks";
import {
  addFigureObject,
  editFigureObject,
  figureObjects,
  readFigureSvg,
} from "../../src/components/unified/figure-editor/figureSvgEditing";
import {
  moveFigureHandle,
  CURVE_BEND_HANDLE,
} from "../../src/components/unified/figure-editor/figureHandles";
import { addMidLabel } from "../../src/components/unified/figure-editor/figureMidLabel";
import { typesetFigureSvg } from "../../src/components/unified/figure-editor/figureTypeset";
import { arithmeticLabelTex } from "../../src/lib/arithmetic-v2/presentation/typographyLabel";
import { widenFrame } from "../../src/components/unified/figure-editor/figureFrame";
import { sampleFigurePath } from "../../src/components/unified/figure-editor/figureFlip";
import { plainTextBox } from "../../src/components/unified/figure-editor/figureTextBackground";
import { applyFigureEdits } from "../../src/components/unified/figure-editor/figureEditApply";
import type { FigureEditCommand } from "../../src/lib/dev-ai/figure-edit-contract";
type Point = [number, number];
/** Editor object UUIDs identify a session, not drawing bytes saved/typeset. */
export const editorHash = (svg: string) =>
  createHash("sha256")
    .update(svg.replace(/\sdata-object-id="[^"]*"/g, ""))
    .digest("hex");
export function editorAuditHtml(svg: string) {
  const size = arithmeticGeometryDisplaySize(svg);
  return `<style>article > svg{width:${size.width}px;height:${size.height}px}</style><article>${svg}</article>`;
}

/** Actual single-angle construction, then manual object paste through editor APIs.
 * Existing non-point text is parked only in the construction scratch document:
 * the editor's broad duplicate-value detector otherwise mistakes notes/other
 * vertices' givens for this angle. The destination retains every original item.
 * No angle path or label-placement algorithm is reproduced here.
 */
export function isolatedAngles(
  source: string,
  commands: FigureEditCommand[],
  layoutFont?: number,
) {
  let scratch = source;
  for (const object of figureObjects(scratch))
    if (object.type === "text")
      scratch = editFigureObject(scratch, object.id, {
        ...(!/^[A-Z]$/.test(object.text) ? { x: "10000", y: "10000" } : {}),
        ...(layoutFont ? { "font-size": String(layoutFont) } : {}),
      });
  if (layoutFont && !figureObjects(scratch).some((o) => o.type === "text")) {
    const given = commands.find((c) => c.op === "addAngle" && c.text);
    assert.ok(given?.op === "addAngle" && given.text);
    // A scratch-only copy of the public value supplies the editor's font
    // context when the canonical figure has no point-name labels.
    const context = addFigureObject(
      scratch,
      "text",
      { x: 10000, y: 10000 },
      { x: 0, y: 0 },
      given.text,
    );
    scratch = editFigureObject(context.svg, context.id, {
      "font-size": String(layoutFont),
    });
  }
  if (
    layoutFont &&
    !figureObjects(scratch).some(
      (o) => o.type === "text" && /^[A-Z]$/.test(o.text),
    )
  ) {
    // The editor limits an internal value by the nearest marked vertex. A
    // polygon with no names otherwise permits a value beyond its opposite
    // edge. Register its exact arm endpoints as scratch-only point dots; the
    // real addAngle routine then chooses its own external leader. None of
    // these context objects is copied to the displayed figure.
    const points = commands.flatMap((c) =>
      c.op === "addAngle" ? [c.from, c.to] : [],
    );
    for (const p of points) {
      assert.ok(typeof p !== "string");
      const dot = addFigureObject(scratch, "circle", p, {
        x: p.x + 0.25,
        y: p.y,
      });
      scratch = editFigureObject(dot.svg, dot.id, {
        cx: String(p.x),
        cy: String(p.y),
        r: "0.25",
        fill: "#111111",
        "stroke-width": "0.1",
      });
    }
  }
  const originalIds = new Set(figureObjects(scratch).map((o) => o.id));
  let svg = source;
  for (const command of commands) {
    const result = applyFigureEdits(scratch, [command]);
    assert.deepEqual(result.rejected, [], JSON.stringify(command));
    for (const object of figureObjects(result.svg).filter(
      (o) => !originalIds.has(o.id),
    )) {
      const added = addFigureObject(
        svg,
        object.type === "path" ? "curve" : object.type,
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        object.text,
      );
      const attrs = Object.fromEntries(
        Object.entries(object.attrs).filter(
          ([k]) => !["data-object-id", "data-n"].includes(k),
        ),
      );
      svg = editFigureObject(added.svg, added.id, attrs);
      // Larger scratch font asks the real editor for a less crowded placement;
      // manual font/stroke edits restore the final 16.8 profile at that position.
      if (layoutFont && object.type === "text")
        svg = editFigureObject(svg, added.id, {
          "font-size": "16.8",
          "stroke-width": "3.15",
        });
      if (layoutFont && object.type === "path")
        svg = editFigureObject(svg, added.id, { "stroke-width": "0.72" });
    }
    const frame = readFigureSvg(result.svg)
      .documentElement.getAttribute("viewBox")!
      .split(/[ ,]+/)
      .map(Number);
    svg = widenFrame(
      svg,
      [
        [frame[0], frame[1]],
        [frame[0] + frame[2], frame[1] + frame[3]],
      ],
      0,
    );
  }
  return svg;
}

export async function dimension(
  page: Page,
  source: string,
  d: { from: Point; to: Point; text: string },
  replay?: {
    offset: number;
    t: number;
    frameBounds?: Point[];
    measureFrame?: boolean;
  },
  validatedFamilyHint?: { offset: number; t: number },
) {
  const command = {
    op: "addDimension" as const,
    from: { x: d.from[0], y: d.from[1] },
    to: { x: d.to[0], y: d.to[1] },
    text: d.text,
    side: "out" as const,
  };
  const defaultResult = addFigureMark(source, command, {
    resolve: (ref) => {
      assert.ok(typeof ref !== "string");
      return ref;
    },
    names: [],
    nameOf: () => undefined,
  });
  if ("reason" in defaultResult) return defaultResult;
  const objects = figureObjects(defaultResult.svg),
    [curve, label] = objects.slice(-2);
  assert.equal(label.type, "text");
  assert.equal(curve.type, "path");
  const midpoint: Point = [
    (d.from[0] + d.to[0]) / 2,
    (d.from[1] + d.to[1]) / 2,
  ];
  const length = Math.hypot(d.to[0] - d.from[0], d.to[1] - d.from[1]);
  const normal: Point = [
    -(d.to[1] - d.from[1]) / length,
    (d.to[0] - d.from[0]) / length,
  ];
  const dot =
    (Number(label.attrs.x) - midpoint[0]) * normal[0] +
    (Number(label.attrs.y) - midpoint[1]) * normal[1];
  const sign = dot >= 0 ? 1 : -1;
  const checked = [];
  // This is the same user-accessible curve tool and yellow midpoint handle.
  // Endpoints are the measured points; only curvature changes. Choose the first
  // collision-free outward bend, never the smallest resulting card/viewBox.
  const choices = replay
    ? [replay]
    : [
        { offset: 14, t: 50 },
        // A previously accepted same-family label-width recipe is only a
        // starting point: this candidate still receives the complete gate.
        ...(validatedFamilyHint && Math.abs(validatedFamilyHint.offset) <= 82
          ? [validatedFamilyHint]
          : []),
        ...[
          16, 22, 30, 40, -16, -22, -30, -40, 52, -52, 66, -66, 82, -82, 100,
          -100, 120, -120, 145, -145, 175, -175,
        ].flatMap((offset) => [50, 35, 65].map((t) => ({ offset, t }))),
      ];
  for (const { offset, t } of choices) {
    let candidate = {
      svg: defaultResult.svg,
      labelId: label.id,
      curveId: curve.id,
      offset: 14,
      operation: "addDimension",
      handle: undefined as { x: number; y: number } | undefined,
    };
    if (offset !== 14) {
      const added = addFigureObject(source, "curve", command.from, command.to);
      const styled = editFigureObject(added.svg, added.id, {
        stroke: "#111111",
        "stroke-width": "0.72",
        "stroke-dasharray": "5 3",
        fill: "none",
        "stroke-linecap": "round",
      });
      const handle = {
        x: midpoint[0] + normal[0] * offset * sign,
        y: midpoint[1] + normal[1] * offset * sign,
      };
      const bent = moveFigureHandle(
        styled,
        added.id,
        CURVE_BEND_HANDLE,
        handle,
      );
      const middle = addMidLabel(
        bent,
        added.id,
        arithmeticLabelTex(d.text) ?? d.text,
      );
      assert.ok(middle);
      const curveD = figureObjects(bent).find((o) => o.id === added.id)!.attrs
        .d!;
      const sampled = sampleFigurePath(curveD, 100);
      assert.ok(sampled);
      const labelPoint = sampled[0][t];
      const next = editFigureObject(middle.svg, middle.id, {
        "font-size": "16.8",
        ...(t === 50
          ? {}
          : { x: String(labelPoint[0]), y: String(labelPoint[1]) }),
      });
      candidate = {
        svg: next,
        labelId: middle.id,
        curveId: added.id,
        offset,
        operation: "addFigureObject + moveFigureHandle + addMidLabel",
        handle,
      };
    }
    if (replay && !replay.measureFrame) {
      // The full-domain browser subsequently checks every replayed candidate,
      // including original geometry hidden by a gap. This is recipe replay only.
      const node = readFigureSvg(candidate.svg).querySelector(
        `[data-object-id="${candidate.labelId}"]`,
      )!;
      const b = plainTextBox(node);
      const frameBounds =
        replay.frameBounds ??
        ([
          [b.x, b.y],
          [b.x + b.width, b.y + b.height],
        ] as Point[]);
      return {
        svg: widenFrame(candidate.svg, frameBounds, 12),
        operation: candidate.operation,
        offset,
        t,
        handle: candidate.handle,
        checked: [],
        frameBounds,
      };
    }
    await page.setContent(
      editorAuditHtml(await typesetFigureSvg(candidate.svg, true)),
    );
    const check = await page.locator("article > svg").evaluate(
      (root, current) => {
        const svg = root as SVGSVGElement;
        const label = svg.querySelector(
          `[data-object-id="${current.labelId}"]`,
        ) as SVGGraphicsElement;
        const curve = svg.querySelector(
          `[data-object-id="${current.curveId}"]`,
        ) as SVGGeometryElement;
        const b = label.getBoundingClientRect(),
          pad = 4;
        const boxes = [
          ...svg.querySelectorAll<SVGGraphicsElement>("[data-label],text"),
        ]
          .filter(
            (n) =>
              !n.closest(`[data-object-id="${current.labelId}"]`) &&
              (n.matches("[data-label]") || !n.closest("[data-label]")),
          )
          .map((n) => n.getBoundingClientRect());
        const hitsBox = (
          g: SVGGeometryElement,
          box: DOMRect,
          padding: number,
        ) => {
          const m = g.getScreenCTM()!,
            len = g.getTotalLength(),
            count = Math.max(2, Math.ceil(len * Math.hypot(m.a, m.b) * 2));
          padding +=
            (parseFloat(getComputedStyle(g).strokeWidth) *
              Math.hypot(m.a, m.b)) /
            2;
          const maskId = /url\(["']?#([^"')]+)["']?\)/.exec(
            g.getAttribute("mask") ?? "",
          )?.[1];
          const holes =
            maskId && getComputedStyle(g).strokeDasharray !== "none"
              ? [
                  ...svg.querySelectorAll<SVGPolygonElement>(
                    `mask[id="${maskId}"] polygon`,
                  ),
                ].map((n) => [...n.points].map((p) => [p.x, p.y]))
              : [];
          const hidden = (x: number, y: number) =>
            holes.some((poly) => {
              let inside = false;
              for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const a = poly[i],
                  b = poly[j];
                if (
                  a[1] > y !== b[1] > y &&
                  x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
                )
                  inside = !inside;
              }
              return inside;
            });
          for (let k = 0; k <= count; k++) {
            const p = g.getPointAtLength((len * k) / count);
            if (hidden(p.x, p.y)) continue;
            const x = m.a * p.x + m.c * p.y + m.e,
              y = m.b * p.x + m.d * p.y + m.f;
            if (
              x > box.left - padding &&
              x < box.right + padding &&
              y > box.top - padding &&
              y < box.bottom + padding
            )
              return true;
          }
          return false;
        };
        const labelHit = boxes.some(
          (q) =>
            b.left < q.right + pad &&
            b.right > q.left - pad &&
            b.top < q.bottom + pad &&
            b.bottom > q.top - pad,
        );
        const shapeHit = [
          ...svg.querySelectorAll<SVGGeometryElement>(
            "line,path,circle,ellipse,polygon,polyline,rect",
          ),
        ]
          .filter(
            (g) =>
              g !== curve &&
              !g.closest("[data-label],text,defs,mask") &&
              getComputedStyle(g).stroke !== "none",
          )
          .some((g) => hitsBox(g, b, pad));
        const curveHit = boxes.some((q) => hitsBox(curve, q, pad));
        const back = svg.getScreenCTM()!.inverse(),
          a = new DOMPoint(b.left, b.top).matrixTransform(back),
          z = new DOMPoint(b.right, b.bottom).matrixTransform(back);
        return {
          labelHit,
          shapeHit,
          curveHit,
          bounds: [
            [a.x, a.y],
            [z.x, z.y],
          ] as [number, number][],
        };
      },
      { labelId: candidate.labelId, curveId: candidate.curveId },
    );
    checked.push({ offset, t, ...check });
    if (!replay && (check.labelHit || check.shapeHit || check.curveHit))
      continue;
    // Same public frame operation, fixed normal print extent. No viewBox minimizer.
    const svg = widenFrame(candidate.svg, check.bounds, 12);
    return {
      svg,
      operation: candidate.operation,
      offset,
      t,
      handle: candidate.handle,
      checked,
      frameBounds: check.bounds,
    };
  }
  return {
    reason:
      "No actual editor bend on either side through 175 units clears existing shape/labels",
    checked,
  };
}

export async function editorTypeset(svg: string) {
  // The editor's full real line-gap pipeline, including MathJax label metrics.
  return typesetFigureSvg(svg);
}
