/**
 * 치수선 가운데 글자 — 원장님 2026-09-22 «치수선 위에 라벨을 넣으려고 하는데, 흰색을 넣자니 배경색이 흰색이 되어버리는데,
 * 스마트하게 치수선 위에 글자 넣을 방법 없을까» → «곡선에서 바로 글자» 안.
 *
 * 곡선(한 토막 `M…Q…`)이나 선을 고르고 글자를 치면 선 한가운데(곡선이면 노란 손잡이 자리)에 글자가 선다.
 * 글자에는 «뒤 선 끊기» 표시(`data-line-gap`)만 단다 — **배경색이 아니다**(색 칸은 «없음» 그대로).
 * 조판(`typesetFigureSvg` — 화면·저장 이미지·인쇄가 모두 지나는 길)이 그 글자 상자만큼 선에 구멍을 낸다.
 * 구멍은 글자를 따라다닌다 — 글자를 옮기면 구멍도 옮겨 가고, 선은 끊긴 채로 저장되지 않는다(원래 선 그대로).
 */
import { SVG_NS, addFigureObject, editFigureObject } from "./figureSvgEditing";
import { curveMidpoint } from "./figureHandles";
import {
  applyPoint,
  elementMatrix,
  invert,
  round2,
  type Affine,
  type Point,
} from "./figureEditGeometry";

export const LINE_GAP_ATTR = "data-line-gap";

type FigureObject = { id: string; type: string; attrs: Record<string, string> };

/** 가운데 글자를 세울 수 있는 요소인가 — 선, 한 토막 곡선. */
export function midLabelTarget(object: FigureObject | undefined) {
  if (!object) return false;
  if (object.type === "line") return true;
  return object.type === "path" && !!curveMidpoint(object.attrs.d ?? "");
}

/** 그림에 이미 있는 글자 크기 중 가장 흔한 것 — 새 글자가 옆 글자들과 같은 크기로 선다. */
function commonFontSize(doc: Document) {
  const counts = new Map<string, number>();
  for (const text of doc.querySelectorAll("text")) {
    const size = text.getAttribute("font-size");
    if (size && Number(size) > 0) counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "18";
}

/**
 * 고른 선·곡선 한가운데에 글자를 더한다. 가운데는 그림 좌표(요소가 옮겨져 있으면 그 자리)로 옮겨 세운다.
 * 세울 수 없는 요소면 null.
 */
export function addMidLabel(
  svg: string,
  id: string,
  text: string,
): { svg: string; id: string } | null {
  const label = text.trim();
  if (!label) return null;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const element = [...doc.querySelectorAll("[data-object-id]")].find(
    (node) => node.getAttribute("data-object-id") === id,
  );
  if (!element) return null;
  let local: Point | null = null;
  if (element.localName === "line") {
    const n = (name: string) => Number(element.getAttribute(name)) || 0;
    local = [(n("x1") + n("x2")) / 2, (n("y1") + n("y2")) / 2];
  } else if (element.localName === "path") {
    const mid = curveMidpoint(element.getAttribute("d") ?? "");
    if (mid) local = [mid.x, mid.y];
  }
  if (!local) return null;
  const [x, y] = applyPoint(elementMatrix(element), local);
  const added = addFigureObject(
    svg,
    "text",
    { x: round2(x), y: round2(y) },
    { x: 0, y: 0 },
    label,
  );
  return {
    svg: editFigureObject(added.svg, added.id, {
      "font-size": commonFontSize(doc),
      "text-anchor": "middle",
      "dominant-baseline": "central",
      [LINE_GAP_ATTR]: "1",
    }),
    id: added.id,
  };
}

/** 선 모양 — 구멍은 선만 낸다. 칠한 면·점은 글자 밑이어도 그대로 둔다(흰 구멍이 면에 뚫리지 않게). */
const STROKES = "path,line,polyline,polygon,circle,ellipse,rect";
const unfilled = (node: Element) => {
  const fill = (
    (node as SVGElement).style?.getPropertyValue("fill") ||
    node.getAttribute("fill") ||
    ""
  ).trim();
  return fill === "none" || fill === "transparent";
};

/** 구멍을 낼 선 — 조판 **전에** 원문에서 고른다(조판이 만든 글자 모양·배경 사각형은 빠진다). */
export function gapCandidates(doc: Document) {
  return [...doc.querySelectorAll(STROKES)].filter(
    (node) =>
      !node.closest("defs,clipPath,mask,marker,pattern,text") &&
      // 선(`<line>`)은 채울 곳이 없다 — fill 을 안 적어도(기본값 검정) 선이다.
      (node.localName === "line" || unfilled(node)),
  );
}

/** 글자 상자(글자 자신의 좌표)를 그림 좌표의 네 꼭짓점으로. */
export function gapPolygon(
  box: { x: number; y: number; width: number; height: number },
  matrix: Affine,
): Point[] {
  const { x, y, width: w, height: h } = box;
  return (
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ] as Point[]
  ).map((p) => applyPoint(matrix, p));
}

/** 같은 내용이면 같은 이름 — 한 화면에 그림이 여럿 인라인으로 서도 서로의 구멍을 빌리지 않는다. */
function hash(value: string) {
  let h = 5381;
  for (let i = 0; i < value.length; i++)
    h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * 모은 구멍으로 선에 마스크를 건다. 흰 바탕(보임)에 글자 상자만 검게(안 보임). 마스크 칸은 그림 틀보다 넉넉히
 * (`userSpaceOnUse` — 기본값 objectBoundingBox 는 가로선처럼 높이 0 인 요소를 통째로 지운다).
 * 요소 자신·조상에 변환이 있으면 마스크 좌표도 그 요소의 좌표라, 변환마다 거꾸로 옮긴 마스크를 따로 둔다.
 * 이미 마스크를 가진 요소는 건드리지 않는다.
 */
export function applyLineGaps(
  doc: Document,
  candidates: Element[],
  gaps: Point[][],
) {
  if (!gaps.length || !candidates.length) return;
  const root = doc.documentElement;
  const box = (root.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const [vx, vy, vw, vh] =
    box.length === 4 && box.every(Number.isFinite) ? box : [0, 0, 480, 360];
  let defs = root.querySelector(":scope > defs");
  const masks = new Map<string, string>();
  for (const node of candidates) {
    if (node.hasAttribute("mask") || !node.isConnected) continue;
    const matrix = elementMatrix(node);
    const back = invert(matrix);
    if (!back) continue;
    const key = matrix.join(",");
    let id = masks.get(key);
    if (!id) {
      const shapes = gaps.map((polygon) =>
        polygon
          .map((p) => applyPoint(back, p))
          .map(([x, y]) => `${round2(x)},${round2(y)}`)
          .join(" "),
      );
      // 마스크 칸 — 그림 틀을 요소 좌표로 옮긴 뒤 사방으로 틀 크기만큼 더.
      const corners = (
        [
          [vx, vy],
          [vx + vw, vy],
          [vx + vw, vy + vh],
          [vx, vy + vh],
        ] as Point[]
      ).map((p) => applyPoint(back, p));
      const xs = corners.map((p) => p[0]),
        ys = corners.map((p) => p[1]);
      const left = Math.min(...xs),
        top = Math.min(...ys);
      const width = Math.max(...xs) - left,
        height = Math.max(...ys) - top;
      const region = [left - width, top - height, width * 3, height * 3].map(
        round2,
      );
      id = `line-gap-${hash(`${region.join(",")}|${shapes.join("|")}`)}`;
      masks.set(key, id);
      if (!doc.getElementById(id)) {
        const mask = doc.createElementNS(SVG_NS, "mask");
        const set = (el: Element, attrs: Record<string, string | number>) => {
          for (const [name, value] of Object.entries(attrs))
            el.setAttribute(name, String(value));
        };
        set(mask, {
          id,
          maskUnits: "userSpaceOnUse",
          x: region[0],
          y: region[1],
          width: region[2],
          height: region[3],
        });
        const open = doc.createElementNS(SVG_NS, "rect");
        set(open, {
          x: region[0],
          y: region[1],
          width: region[2],
          height: region[3],
          fill: "#ffffff",
        });
        mask.append(open);
        for (const points of shapes) {
          const hole = doc.createElementNS(SVG_NS, "polygon");
          set(hole, { points, fill: "#000000" });
          mask.append(hole);
        }
        if (!defs) {
          defs = doc.createElementNS(SVG_NS, "defs");
          root.prepend(defs);
        }
        defs.append(mask);
      }
    }
    node.setAttribute("mask", `url(#${id})`);
  }
}
