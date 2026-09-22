import { editFigureObject, figureObjects } from "./figureSvgEditing";

type FigureObject = ReturnType<typeof figureObjects>[number];
/** Project onto the nearest horizontal, vertical or 45-degree direction. */
export function snapFigurePoint(
  anchor: { x: number; y: number },
  pointer: { x: number; y: number },
) {
  const dx = pointer.x - anchor.x,
    dy = pointer.y - anchor.y;
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  const x = Math.cos(angle),
    y = Math.sin(angle);
  const distance = dx * x + dy * y;
  return { x: anchor.x + distance * x, y: anchor.y + distance * y };
}

export interface FigureHandle {
  key: string;
  x: number;
  y: number;
  label: string;
  control?: boolean;
  /** 노란 점(모양 조절 — 평행사변형 기울이기 · 삼각형 꼭짓점). figureShapeAdjust */
  adjust?: boolean;
}
type Segment = { command: string; values: number[] };

/**
 * 곡선 한가운데의 노란 손잡이(원장님 2026-09-22 «꺾이는곳에 도형처럼 노란원을 배치해서 곡선 정도를 조정»).
 * `M P0 Q C P2` 한 토막 곡선에만 — 곡선의 한가운데 점은 (P0 + 2C + P2) / 4 이고, 끈 자리 M 을 곡선이 지나가게
 * C = 2M − (P0 + P2) / 2 로 되짚는다. 옅은 파란 «휘어짐 조절»(C)은 곡선에서 꼭대기의 두 배 떨어져 있어 그대로 둔다.
 */
export const CURVE_BEND_HANDLE = "bend";
function singleCurve(d: string) {
  const segments = pathSegments(d);
  return segments?.length === 2 &&
    segments[0].command === "M" &&
    segments[1].command === "Q"
    ? segments
    : null;
}
const serializePath = (segments: Segment[]) =>
  segments
    .map(
      (s) =>
        `${s.command} ${s.values.map((v) => Math.round(v * 100) / 100).join(" ")}`,
    )
    .join(" ");

/** Normalize the editable path subset to absolute coordinates; preserve unsupported paths intact. */
function pathSegments(d: string): Segment[] | null {
  const tokens =
    d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? [];
  const sizes: Record<string, number> = {
    M: 2,
    L: 2,
    H: 1,
    V: 1,
    Q: 4,
    C: 6,
    Z: 0,
  };
  const segments: Segment[] = [];
  let i = 0,
    command = "",
    x = 0,
    y = 0,
    startX = 0,
    startY = 0;
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    const upper = command.toUpperCase(),
      size = sizes[upper];
    if (size === undefined) return null;
    if (upper === "Z") {
      segments.push({ command: "Z", values: [] });
      x = startX;
      y = startY;
      command = "";
      continue;
    }
    const values = tokens.slice(i, i + size).map(Number);
    if (values.length !== size || !values.every(Number.isFinite)) return null;
    i += size;
    const relative = command !== upper;
    if (upper === "H") {
      x = values[0] + (relative ? x : 0);
      segments.push({ command: "L", values: [x, y] });
    } else if (upper === "V") {
      y = values[0] + (relative ? y : 0);
      segments.push({ command: "L", values: [x, y] });
    } else {
      const absolute = values.map(
        (v, index) => v + (relative ? (index % 2 ? y : x) : 0),
      );
      x = absolute.at(-2)!;
      y = absolute.at(-1)!;
      segments.push({ command: upper, values: absolute });
      if (upper === "M") {
        startX = x;
        startY = y;
        command = relative ? "l" : "L";
      }
    }
  }
  return segments;
}
const number = (o: FigureObject, key: string) => Number(o.attrs[key]) || 0;
const corners = (
  x: number,
  y: number,
  width: number,
  height: number,
): FigureHandle[] =>
  [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ].map(([x, y], i) => ({
    key: `corner-${i}`,
    x,
    y,
    label: `모서리 ${i + 1}`,
  }));

export function figureHandles(object: FigureObject): FigureHandle[] {
  const n = (key: string) => number(object, key);
  if (object.type === "line")
    return [
      { key: "start", x: n("x1"), y: n("y1"), label: "시작점" },
      { key: "end", x: n("x2"), y: n("y2"), label: "끝점" },
    ];
  if (object.type === "circle" || object.type === "ellipse") {
    const x = n("cx"),
      y = n("cy"),
      rx = n(object.type === "circle" ? "r" : "rx"),
      ry = n(object.type === "circle" ? "r" : "ry");
    return [
      { key: "center", x, y, label: "중심 이동" },
      ...[
        [x + rx, y],
        [x, y + ry],
        [x - rx, y],
        [x, y - ry],
      ].map(([x, y], i) => ({
        key: `radius-${i}`,
        x,
        y,
        label: `크기 조절 ${i + 1}`,
      })),
    ];
  }
  if (object.type === "rect")
    return corners(n("x"), n("y"), n("width"), n("height"));
  if (object.type === "polygon" || object.type === "polyline") {
    const values =
      object.attrs.points
        ?.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)
        ?.map(Number) ?? [];
    return values.length > 64
      ? []
      : values.flatMap((x, i) =>
          i % 2 || i + 1 >= values.length
            ? []
            : [
                {
                  key: `point-${i}`,
                  x,
                  y: values[i + 1],
                  label: `꼭짓점 ${i / 2 + 1}`,
                },
              ],
        );
  }
  if (object.type === "path") {
    const segments = pathSegments(object.attrs.d ?? "");
    const points =
      segments?.flatMap((s, i) =>
        s.values.flatMap((x, j) =>
          j % 2
            ? []
            : [
                {
                  key: `path-${i}-${j}`,
                  x,
                  y: s.values[j + 1],
                  label: j + 2 < s.values.length ? "휘어짐 조절" : "꼭짓점",
                  control: j + 2 < s.values.length,
                },
              ],
        ),
      ) ?? [];
    if (points.length > 32) return [];
    const curve = singleCurve(object.attrs.d ?? "");
    if (!curve) return points;
    const [x0, y0] = curve[0].values;
    const [cx, cy, x2, y2] = curve[1].values;
    return [
      ...points,
      {
        key: CURVE_BEND_HANDLE,
        x: (x0 + 2 * cx + x2) / 4,
        y: (y0 + 2 * cy + y2) / 4,
        label: "곡선 휘어짐",
        // 꼭짓점이 아니다 — AI 에게 보내는 꼭짓점 번호(figureEditVertices)에서 빠진다
        control: true,
        adjust: true,
      },
    ];
  }
  return [];
}

export function moveFigureHandle(
  svg: string,
  id: string,
  key: string,
  to: { x: number; y: number },
): string {
  const object = figureObjects(svg).find((o) => o.id === id);
  if (!object) return svg;
  const n = (name: string) => number(object, name);
  const attrs: Record<string, string> = {};
  const set = (key: string, value: number) => {
    attrs[key] = String(Math.round(value * 100) / 100);
  };
  if (object.type === "line") {
    set(key === "start" ? "x1" : "x2", to.x);
    set(key === "start" ? "y1" : "y2", to.y);
  } else if (key === "center") {
    set("cx", to.x);
    set("cy", to.y);
  } else if (key.startsWith("radius-")) {
    if (object.type === "circle")
      set("r", Math.max(1, Math.hypot(to.x - n("cx"), to.y - n("cy"))));
    else if (Number(key.slice(-1)) % 2)
      set("ry", Math.max(1, Math.abs(to.y - n("cy"))));
    else set("rx", Math.max(1, Math.abs(to.x - n("cx"))));
  } else if (object.type === "rect") {
    const opposite = corners(n("x"), n("y"), n("width"), n("height"))[
      (Number(key.slice(-1)) + 2) % 4
    ];
    set("x", Math.min(to.x, opposite.x));
    set("y", Math.min(to.y, opposite.y));
    set("width", Math.max(1, Math.abs(to.x - opposite.x)));
    set("height", Math.max(1, Math.abs(to.y - opposite.y)));
  } else if (key.startsWith("point-")) {
    const values = object.attrs.points
      .match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)!
      .map(Number);
    const index = Number(key.slice(6));
    values[index] = to.x;
    values[index + 1] = to.y;
    attrs.points = values.join(" ");
  } else if (key === CURVE_BEND_HANDLE) {
    const curve = singleCurve(object.attrs.d ?? "");
    if (!curve) return svg;
    const [x0, y0] = curve[0].values;
    const [, , x2, y2] = curve[1].values;
    curve[1].values[0] = 2 * to.x - (x0 + x2) / 2;
    curve[1].values[1] = 2 * to.y - (y0 + y2) / 2;
    attrs.d = serializePath(curve);
  } else if (key.startsWith("path-")) {
    const segments = pathSegments(object.attrs.d)!;
    const [, segment, index] = key.split("-").map(Number);
    segments[segment].values[index] = to.x;
    segments[segment].values[index + 1] = to.y;
    attrs.d = serializePath(segments);
  }
  return editFigureObject(svg, id, attrs);
}

/** Forgiving selection around thin strokes, measured in screen pixels at every zoom level. */
export function hitFigureObject(
  root: SVGSVGElement,
  clientX: number,
  clientY: number,
): SVGGraphicsElement | null {
  let closest: SVGGraphicsElement | null = null,
    distance = 9;
  for (const element of root.querySelectorAll<SVGGraphicsElement>(
    "[data-object-id]",
  )) {
    const rect = element.getBoundingClientRect();
    if (
      clientX < rect.left - 9 ||
      clientX > rect.right + 9 ||
      clientY < rect.top - 9 ||
      clientY > rect.bottom + 9
    )
      continue;
    const matrix = element.getScreenCTM();
    if (!matrix) continue;
    if (element instanceof SVGGeometryElement) {
      const length = element.getTotalLength(),
        scale = Math.hypot(matrix.a, matrix.b);
      const count = Math.min(
        1500,
        Math.max(2, Math.ceil((length * scale) / 4)),
      );
      for (let i = 0; i <= count; i++) {
        const at = element
          .getPointAtLength((length * i) / count)
          .matrixTransform(matrix);
        const d = Math.hypot(at.x - clientX, at.y - clientY);
        if (d <= distance) {
          distance = d;
          closest = element;
        }
      }
    } else if (
      clientX >= rect.left - 4 &&
      clientX <= rect.right + 4 &&
      clientY >= rect.top - 4 &&
      clientY <= rect.bottom + 4
    )
      closest = element;
  }
  return closest;
}
