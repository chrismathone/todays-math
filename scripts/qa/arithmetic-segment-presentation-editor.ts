/** Offline only: use the editor command itself, never a parallel dimension renderer. */
import assert from "node:assert/strict";
import { addFigureMark } from "../../src/components/unified/figure-editor/figureMarks";
import {
  addFigureObject,
  editFigureObject,
  prepareFigureSvg,
} from "../../src/components/unified/figure-editor/figureSvgEditing";
import {
  CURVE_BEND_HANDLE,
  moveFigureHandle,
} from "../../src/components/unified/figure-editor/figureHandles";
import { addMidLabel } from "../../src/components/unified/figure-editor/figureMidLabel";
import { sampleFigurePath } from "../../src/components/unified/figure-editor/figureFlip";
import { typesetFigureSvg } from "../../src/components/unified/figure-editor/figureTypeset";
import {
  escapeXml,
  type Point,
  type SegmentPlan,
} from "./arithmetic-segment-presentation-model";

export interface EditorDimension {
  side: "out" | "in";
  bend?: number;
  labelFraction?: number;
  curve: string;
  label: string;
  at: Point;
  fontSize: number;
  sourceGeometry: string;
  sourceInkClear?: boolean;
  box?: { x: number; y: number; width: number; height: number };
}

const inputs = new Map<string, string>();
const commands = new Map<string, string>();

/** Preserve raw editable labels, but copy the gap produced by the real editor
 * typesetter. Layout already proves no source geometry intersects this label. */
export async function applyEditorDimensionGap(doc: Document) {
  const curve = doc.querySelector("[data-segment-curve]")!;
  curve.removeAttribute("mask");
  doc.documentElement
    .querySelectorAll(":scope > defs")
    .forEach((node) => node.remove());
  const rendered = new DOMParser().parseFromString(
    await typesetFigureSvg(doc.documentElement.outerHTML, true),
    "image/svg+xml",
  );
  const reference = rendered
    .querySelector("[data-segment-curve]")!
    .getAttribute("mask");
  assert.ok(reference);
  const id = /^url\(#([^)]*)\)$/.exec(reference)![1];
  const mask = rendered.getElementById(id);
  assert.ok(mask);
  const defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.append(doc.importNode(mask, true));
  doc.documentElement.prepend(defs);
  curve.setAttribute("mask", reference);
}

export function editorDimension(
  plan: SegmentPlan,
  side: "out" | "in" = "out",
  bend?: number,
  labelFraction = 0.5,
): EditorDimension {
  const points = plan.labels
    .map(({ key, text }) => {
      const [x, y] = plan.points[key];
      return `<text x="${x}" y="${y}" font-size="16" font-family="Arial, sans-serif" data-px="${x}" data-py="${y}">${escapeXml(text)}</text>`;
    })
    .join("");
  const base = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-180 -180 360 360">${plan.geometry}${points}</svg>`;
  let input = inputs.get(base);
  if (!input) {
    input = prepareFigureSvg(base);
    inputs.set(base, input);
  }
  const commandKey = `${input}\n${plan.given.key}\n${plan.given.text}\n${side}`;
  let marked = commands.get(commandKey);
  if (!marked) {
    const result = addFigureMark(
      input,
      {
        op: "addDimension",
        from: plan.given.key[0],
        to: plan.given.key[1],
        text: plan.given.text,
        side,
      },
      {
        resolve(ref) {
          assert.equal(typeof ref, "string");
          const [x, y] = plan.points[ref as string];
          return { x, y };
        },
        names: Object.values(plan.points).map(([x, y]) => ({ x, y })),
        nameOf: () => undefined,
      },
    );
    assert.ok(
      "svg" in result,
      `${plan.id}: ${"reason" in result ? result.reason : ""}`,
    );
    marked = result.svg;
    commands.set(commandKey, marked);
  }
  let doc = new DOMParser().parseFromString(marked, "image/svg+xml");
  if (bend !== undefined) {
    // The editor's existing manual workflow: draw between the actual points,
    // move its bend handle, then use its "label at curve midpoint" command.
    // Only curvature changes. There is no translated chord or invented witness.
    const defaultCurve = [...doc.querySelectorAll("path")].at(-1)!;
    const defaultLabel = [...doc.querySelectorAll("text")].at(-1)!;
    const [a, b] = plan.given.endpoints;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const normal = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const font = Number(defaultLabel.getAttribute("font-size"));
    const labelCenter = [
      Number(defaultLabel.getAttribute("x")),
      Number(defaultLabel.getAttribute("y")) - 0.32 * font,
    ];
    const sign = Math.sign(
      (labelCenter[0] - mid[0]) * normal[0] +
        (labelCenter[1] - mid[1]) * normal[1],
    );
    assert.notEqual(sign, 0);
    const added = addFigureObject(
      input,
      "curve",
      { x: a[0], y: a[1] },
      { x: b[0], y: b[1] },
    );
    const styled = editFigureObject(
      added.svg,
      added.id,
      Object.fromEntries(
        ["stroke", "stroke-width", "stroke-dasharray", "stroke-linecap"].map(
          (key) => [key, defaultCurve.getAttribute(key)!],
        ),
      ),
    );
    const bent = moveFigureHandle(styled, added.id, CURVE_BEND_HANDLE, {
      x: mid[0] + normal[0] * sign * bend,
      y: mid[1] + normal[1] * sign * bend,
    });
    const labelled = addMidLabel(bent, added.id, plan.given.text);
    assert.ok(labelled);
    let labelledSvg = labelled.svg;
    if (labelFraction !== 0.5) {
      const bentDoc = new DOMParser().parseFromString(bent, "image/svg+xml");
      const path = [...bentDoc.querySelectorAll("path")].at(-1)!;
      const sampled = sampleFigurePath(path.getAttribute("d")!, 100)![0];
      const [x, y] = sampled[Math.round(labelFraction * 100)];
      // The editor's normal label-position edit, keeping the line-gap marker.
      labelledSvg = editFigureObject(labelled.svg, labelled.id, {
        x: String(x),
        y: String(y),
      });
    }
    doc = new DOMParser().parseFromString(labelledSvg, "image/svg+xml");
  }
  const curve = [...doc.querySelectorAll("path")].at(-1)!;
  const label = [...doc.querySelectorAll("text")].at(-1)!;
  assert.equal(label.textContent, plan.given.text);
  // Only editor selection IDs are discarded. All drawing attributes stay exact.
  for (const el of [curve, label]) {
    el.removeAttribute("data-object-id");
    el.removeAttribute("data-n");
    el.removeAttribute("data-n-last");
  }
  return {
    side,
    ...(bend === undefined ? {} : { bend, labelFraction }),
    curve: curve.outerHTML,
    label: label.outerHTML,
    at: [Number(label.getAttribute("x")), Number(label.getAttribute("y"))],
    fontSize: Number(label.getAttribute("font-size")),
    sourceGeometry: plan.geometry,
  };
}
