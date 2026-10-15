/** Final MathJax clearance using only actual editor text/curve-handle edits. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import {
  figureObjects,
  editFigureObject,
} from "../../src/components/unified/figure-editor/figureSvgEditing";
import {
  figureHandles,
  moveFigureHandle,
} from "../../src/components/unified/figure-editor/figureHandles";
import { typesetFigureSvg } from "../../src/components/unified/figure-editor/figureTypeset";
import { widenFrame } from "../../src/components/unified/figure-editor/figureFrame";
import { plainTextBox } from "../../src/components/unified/figure-editor/figureTextBackground";
import { readFigureSvg } from "../../src/components/unified/figure-editor/figureSvgEditing";
import { editorAuditHtml } from "./arithmetic-full-figure-audit-editor";

type Point = [number, number];
export type LabelMove = {
  index: number;
  text: string;
  attrs: { x: string; y: string };
  leader?: { index: number; key: string; x: number; y: number };
};
export function replayLabelMoves(source: string, moves: LabelMove[]) {
  let svg = source;
  for (const move of moves) {
    const objects = figureObjects(svg),
      label = objects[move.index];
    assert.equal(label.text, move.text);
    svg = editFigureObject(svg, label.id, move.attrs);
    if (move.leader)
      svg = moveFigureHandle(
        svg,
        objects[move.leader.index].id,
        move.leader.key,
        { x: move.leader.x, y: move.leader.y },
      );
    const node = readFigureSvg(svg).querySelector(
      `[data-object-id="${label.id}"]`,
    )!;
    const b = plainTextBox(node);
    svg = widenFrame(
      svg,
      [
        [b.x, b.y],
        [b.x + b.width, b.y + b.height],
      ],
      12,
    );
  }
  return svg;
}
export async function adjustAngleLabels(
  page: Page,
  source: string,
  angles: { at: Point; from: Point; to: Point; text?: string }[],
) {
  let svg = source;
  const moves: LabelMove[] = [],
    used = new Set<number>();
  for (const angle of angles.filter((a) => a.text)) {
    const objects = figureObjects(svg),
      index = objects.findIndex(
        (o, i) => o.type === "text" && o.text === angle.text && !used.has(i),
      );
    assert.ok(index >= 0, angle.text);
    used.add(index);
    const label = objects[index],
      before = objects[index - 1],
      after = objects[index + 1];
    const leader =
      after?.type === "path" &&
      /Q/i.test(after.attrs.d) &&
      !after.attrs["stroke-dasharray"]
        ? after
        : undefined;
    const end = leader
      ? figureHandles(leader)
          .filter((h) => !h.control)
          .at(-1)!
      : undefined;
    const fs = Number(label.attrs["font-size"]),
      origin: Point = [Number(label.attrs.x), Number(label.attrs.y)];
    const unit = (p: Point): Point => {
      const l = Math.hypot(p[0] - angle.at[0], p[1] - angle.at[1]);
      return [(p[0] - angle.at[0]) / l, (p[1] - angle.at[1]) / l];
    };
    const a = unit(angle.from),
      b = unit(angle.to);
    let v: Point = leader
      ? [origin[0] - angle.at[0], origin[1] - 0.32 * fs - angle.at[1]]
      : [a[0] + b[0], a[1] + b[1]];
    const length = Math.hypot(...v);
    v = [v[0] / length, v[1] / length];
    let accepted = false;
    for (const distance of [
      0, 2, 4, 6, 8, 10, 12, 16, 20, 24, -2, -4, -6, -8, -10, -12, -16, -20,
      -24,
    ]) {
      const delta: Point = [distance * v[0], distance * v[1]];
      const move: LabelMove = {
        index,
        text: label.text,
        attrs: {
          x: String(origin[0] + delta[0]),
          y: String(origin[1] + delta[1]),
        },
        ...(end
          ? {
              leader: {
                index: index + 1,
                key: end.key,
                x: end.x + delta[0],
                y: end.y + delta[1],
              },
            }
          : {}),
      };
      if (!leader) {
        const center: Point = [
            Number(move.attrs.x),
            Number(move.attrs.y) - 0.32 * fs,
          ],
          own = Math.hypot(center[0] - angle.at[0], center[1] - angle.at[1]);
        const points = [
          angle.from,
          angle.to,
          ...objects
            .filter(
              (o) =>
                o.type === "text" &&
                Number.isFinite(Number(o.attrs["data-px"])) &&
                Number.isFinite(Number(o.attrs["data-py"])),
            )
            .map(
              (o) =>
                [
                  Number(o.attrs["data-px"]),
                  Number(o.attrs["data-py"]),
                ] as Point,
            ),
        ];
        if (
          points.some(
            (p) =>
              Math.hypot(p[0] - angle.at[0], p[1] - angle.at[1]) > 2 &&
              Math.hypot(center[0] - p[0], center[1] - p[1]) < own,
          )
        )
          continue;
      }
      const candidate = distance ? replayLabelMoves(svg, [move]) : svg;
      await page.setContent(
        editorAuditHtml(await typesetFigureSvg(candidate, true)),
      );
      const clear = await page.locator("article > svg").evaluate(
        (root, ids) => {
          const svg = root as SVGSVGElement,
            label = svg.querySelector(
              `[data-object-id="${ids.label}"]`,
            )! as SVGGraphicsElement,
            b = label.getBoundingClientRect(),
            pad = 2.3;
          const overlap = (q: DOMRect) =>
            b.left < q.right + pad &&
            b.right > q.left - pad &&
            b.top < q.bottom + pad &&
            b.bottom > q.top - pad;
          if (
            [
              ...svg.querySelectorAll<SVGGraphicsElement>("[data-label],text"),
            ].some(
              (n) =>
                n !== label &&
                !label.contains(n) &&
                (n.matches("[data-label]") || !n.closest("[data-label]")) &&
                overlap(n.getBoundingClientRect()),
            )
          )
            return false;
          for (const g of svg.querySelectorAll<SVGGeometryElement>(
            "line,path,circle,ellipse,polygon,polyline,rect",
          )) {
            if (
              g.closest("[data-label],text,defs,mask") ||
              ids.ignore.includes(g.getAttribute("data-object-id") ?? "") ||
              getComputedStyle(g).stroke === "none" ||
              !overlap(g.getBoundingClientRect())
            )
              continue;
            const m = g.getScreenCTM()!,
              length = g.getTotalLength(),
              count = Math.max(2, Math.ceil(length * Math.hypot(m.a, m.b) * 2)),
              inkPad =
                pad +
                (parseFloat(getComputedStyle(g).strokeWidth) *
                  Math.hypot(m.a, m.b)) /
                  2;
            for (let k = 0; k <= count; k++) {
              const p = g
                .getPointAtLength((k * length) / count)
                .matrixTransform(m);
              if (
                p.x > b.left - inkPad &&
                p.x < b.right + inkPad &&
                p.y > b.top - inkPad &&
                p.y < b.bottom + inkPad
              )
                return false;
            }
          }
          return true;
        },
        {
          label: label.id,
          ignore: [
            ...(before?.type === "path" && /A/i.test(before.attrs.d)
              ? [before.id]
              : []),
            ...(leader ? [leader.id] : []),
          ],
        },
      );
      if (!clear) continue;
      if (distance) {
        svg = candidate;
        moves.push(move);
      }
      accepted = true;
      break;
    }
    assert.ok(
      accepted,
      `No true-bisector/leader clearance for ${angle.text} at ${angle.at}`,
    );
  }
  return { svg, moves };
}
