import type { figureObjects } from "./figureSvgEditing";
import { NAMES } from "./figureObjectNames";

type FigureObject = ReturnType<typeof figureObjects>[number];

export interface FigureObjectGroup {
  key: string;
  name: string;
  /** 사용자가 만든 묶음 — 요소의 `data-group` 에 이름이 적혀 원문과 같이 저장된다. */
  custom: boolean;
  ids: string[];
}

type Box = { x1: number; y1: number; x2: number; y2: number };
interface Shape {
  object: FigureObject;
  index: number;
  box: Box;
  line?: [number, number, number, number];
  dashed: boolean;
}

const number = (o: FigureObject, key: string) =>
  Number.parseFloat(o.attrs[key] ?? "") || 0;
const pairs = (values: number[]) =>
  values.flatMap((x, i) =>
    i % 2 || i + 1 >= values.length ? [] : [[x, values[i + 1]]],
  );
const numbers = (value = "") =>
  (value.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? []).map(
    Number,
  );
const boxOf = (points: number[][]): Box => ({
  x1: Math.min(...points.map((p) => p[0])),
  y1: Math.min(...points.map((p) => p[1])),
  x2: Math.max(...points.map((p) => p[0])),
  y2: Math.max(...points.map((p) => p[1])),
});

/** 자리 계산은 평행 이동만 따라간다 — 돌리거나 늘린 요소는 역할을 어림하지 않고 종류로 둔다. */
function offset(o: FigureObject): [number, number] | null {
  const transform = o.attrs.transform?.trim() ?? "";
  let dx = 0,
    dy = 0;
  const rest = transform.replace(
    /translate\(\s*([-+\d.e]+)(?:[\s,]+([-+\d.e]+))?\s*\)/gi,
    (_, x: string, y?: string) => {
      dx += Number(x) || 0;
      dy += Number(y ?? 0) || 0;
      return "";
    },
  );
  return rest.trim() ? null : [dx, dy];
}

function shapeOf(object: FigureObject, index: number): Shape | null {
  const shift = offset(object);
  if (!shift) return null;
  const n = (key: string) => number(object, key);
  let points: number[][] = [];
  let line: Shape["line"];
  if (object.type === "line") {
    points = [
      [n("x1"), n("y1")],
      [n("x2"), n("y2")],
    ];
  } else if (object.type === "polygon" || object.type === "polyline")
    points = pairs(numbers(object.attrs.points));
  else if (object.type === "circle" || object.type === "ellipse") {
    const rx = n(object.type === "circle" ? "r" : "rx"),
      ry = n(object.type === "circle" ? "r" : "ry");
    points = [
      [n("cx") - rx, n("cy") - ry],
      [n("cx") + rx, n("cy") + ry],
    ];
  } else if (object.type === "rect")
    points = [
      [n("x"), n("y")],
      [n("x") + n("width"), n("y") + n("height")],
    ];
  else if (object.type === "path") points = pairs(numbers(object.attrs.d));
  else if (object.type === "text") points = [[n("x"), n("y")]];
  if (!points.length) return null;
  points = points.map(([x, y]) => [x + shift[0], y + shift[1]]);
  if (object.type === "line")
    line = [points[0][0], points[0][1], points[1][0], points[1][1]];
  const dash = object.attrs["stroke-dasharray"] ?? "";
  return {
    object,
    index,
    box: boxOf(points),
    line,
    dashed: !!dash && dash !== "none" && numbers(dash).some((v) => v > 0),
  };
}

const label = (o: FigureObject) =>
  (o.attrs["data-mj"] ?? o.text).replace(/\$/g, "").replace(/\s+/g, "");
const numeric = (o: FigureObject) =>
  /^(?:[-−+]?\d+(?:[.,]\d+)?|[-−]?\\[dt]?frac\{\d+\}\{\d+\}|O)$/.test(label(o));
const width = (b: Box) => b.x2 - b.x1;
const height = (b: Box) => b.y2 - b.y1;
const center = (b: Box) => [(b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2];
const near = (a: number[], b: number[], limit: number) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]) <= limit;

/**
 * 요소 목록을 역할로 묶는다(원장님 2026-09-18 «역할별로 묶고 사용자 커스텀도 가능하게»).
 * 좌표 그래프면 x축·y축(화살촉 포함) · 그래프 · 점선 · 점 · 눈금 · 눈금 숫자 · 축 이름,
 * 아니면 종류(선분·원·글자 …)로 묶는다. 사용자가 만든 묶음(`data-group`)이 먼저 오고 그 요소는 역할 묶음에서 빠진다.
 * 묶음 차례는 첫 요소의 번호 차례다 — 그림 위 번호와 같은 차례로 읽힌다.
 * 어림은 자리만 본다(평행 이동까지) — 틀리게 묶였으면 사용자가 묶음을 만들어 옮긴다.
 */
export function groupFigureObjects(
  objects: FigureObject[],
  viewBox: number[],
): FigureObjectGroup[] {
  const W = viewBox[2] || 480,
    H = viewBox[3] || 360,
    S = Math.max(W, H);
  const custom = new Map<string, string[]>();
  const role = new Map<string, string>();
  const free: Shape[] = [];
  objects.forEach((object, index) => {
    const name = object.attrs["data-group"]?.trim();
    if (name) {
      custom.set(name, [...(custom.get(name) ?? []), object.id]);
      return;
    }
    const shape = shapeOf(object, index);
    if (shape) free.push(shape);
  });

  // 축 — 곧고 긴 실선. 둘이 만나고, 화살촉·눈금 중 하나는 있어야 축이다(세로 높이선이 곧다고 축이 아니다).
  const solidLines = free.filter((s) => s.line && !s.dashed);
  const longest = (
    list: Shape[],
    along: (b: Box) => number,
  ): Shape | undefined =>
    [...list].sort((a, b) => along(b.box) - along(a.box))[0];
  const xAxis = longest(
    solidLines.filter(
      (s) => height(s.box) <= 0.01 * S && width(s.box) >= 0.35 * W,
    ),
    width,
  );
  const yAxis = longest(
    solidLines.filter(
      (s) => width(s.box) <= 0.01 * S && height(s.box) >= 0.35 * H,
    ),
    height,
  );
  const tol = 0.02 * S;
  const ticksOf = (axis: Shape | undefined, horizontal: boolean) =>
    !axis
      ? []
      : solidLines.filter((s) => {
          if (s === xAxis || s === yAxis) return false;
          const b = s.box,
            a = axis.box;
          return horizontal
            ? width(b) <= 0.01 * S &&
                height(b) > 0 &&
                height(b) <= 0.05 * S &&
                b.y1 <= a.y1 + tol &&
                b.y2 >= a.y1 - tol &&
                b.x1 >= a.x1 - tol &&
                b.x1 <= a.x2 + tol
            : height(b) <= 0.01 * S &&
                width(b) > 0 &&
                width(b) <= 0.05 * S &&
                b.x1 <= a.x1 + tol &&
                b.x2 >= a.x1 - tol &&
                b.y1 >= a.y1 - tol &&
                b.y1 <= a.y2 + tol;
        });
  const arrowsOf = (axis: Shape | undefined) =>
    !axis
      ? []
      : free.filter((s) => {
          if (!["polygon", "path", "polyline"].includes(s.object.type))
            return false;
          if (Math.hypot(width(s.box), height(s.box)) > 0.06 * S) return false;
          const [x1, y1, x2, y2] = axis.line!;
          return (
            near(center(s.box), [x1, y1], 0.04 * S) ||
            near(center(s.box), [x2, y2], 0.04 * S)
          );
        });
  const crosses =
    !!xAxis &&
    !!yAxis &&
    yAxis.box.x1 >= xAxis.box.x1 - tol &&
    yAxis.box.x1 <= xAxis.box.x2 + tol &&
    xAxis.box.y1 >= yAxis.box.y1 - tol &&
    xAxis.box.y1 <= yAxis.box.y2 + tol;
  const xTicks = ticksOf(xAxis, true),
    yTicks = ticksOf(yAxis, false);
  const xArrows = arrowsOf(xAxis),
    yArrows = arrowsOf(yAxis);
  const marked = (axis?: Shape) => !!axis?.object.attrs["marker-end"];
  const evidence = (axis: Shape | undefined, ticks: Shape[], arrows: Shape[]) =>
    ticks.length >= 2 || arrows.length > 0 || marked(axis);
  const axes: [Shape, string, Shape[], Shape[]][] = [];
  if (crosses) {
    if (evidence(xAxis, xTicks, xArrows) || evidence(yAxis, yTicks, yArrows))
      axes.push(
        [xAxis!, "x축", xTicks, xArrows],
        [yAxis!, "y축", yTicks, yArrows],
      );
  } else {
    // 축 하나(수직선 등) — 눈금이 셋 이상일 때만.
    if (xAxis && xTicks.length >= 3) axes.push([xAxis, "x축", xTicks, xArrows]);
    else if (yAxis && yTicks.length >= 3)
      axes.push([yAxis, "y축", yTicks, yArrows]);
  }
  const graph = axes.length > 0;
  for (const [axis, name, ticks, arrows] of axes) {
    role.set(axis.object.id, name);
    for (const s of arrows) role.set(s.object.id, name);
    for (const s of ticks) role.set(s.object.id, "눈금");
  }

  const reach = 0.12 * S;
  for (const s of free) {
    const o = s.object;
    if (role.has(o.id)) continue;
    if (
      (o.type === "circle" || o.type === "ellipse") &&
      Math.max(width(s.box), height(s.box)) <= 0.04 * S
    ) {
      role.set(o.id, "점");
      continue;
    }
    if (o.type === "text") {
      if (!graph) continue;
      const [x, y] = [s.box.x1, s.box.y1];
      const beside = axes.some(([axis, name]) => {
        const a = axis.box;
        return name === "x축"
          ? Math.abs(y - a.y1) <= reach &&
              x >= a.x1 - reach &&
              x <= a.x2 + reach
          : Math.abs(x - a.x1) <= reach &&
              y >= a.y1 - reach &&
              y <= a.y2 + reach;
      });
      if (numeric(o) && beside) role.set(o.id, "눈금 숫자");
      else if (
        axes.some(([axis, name]) => {
          const [x1, y1, x2, y2] = axis.line!;
          // 화살표 쪽 끝 — x축은 오른쪽, y축은 위쪽
          const end =
            name === "x축"
              ? x1 > x2
                ? [x1, y1]
                : [x2, y2]
              : y1 < y2
                ? [x1, y1]
                : [x2, y2];
          return near([x, y], end, 0.15 * S);
        })
      )
        role.set(o.id, "축 이름");
      continue;
    }
    if (s.dashed && o.type !== "text") {
      role.set(o.id, "점선");
      continue;
    }
    if (
      graph &&
      (o.type === "line" || o.type === "path" || o.type === "polyline")
    )
      role.set(o.id, "그래프");
  }

  const groups: FigureObjectGroup[] = [...custom].map(([name, ids]) => ({
    key: `custom:${name}`,
    name,
    custom: true,
    ids,
  }));
  const auto = new Map<string, FigureObjectGroup>();
  objects.forEach((object) => {
    if (object.attrs["data-group"]?.trim()) return;
    const name =
      role.get(object.id) ??
      (object.attrs["data-function"]
        ? "함수 그래프"
        : object.type === "text"
          ? "글자"
          : (NAMES[object.type] ?? object.type));
    const key = `${role.has(object.id) ? "role" : "type"}:${name}`;
    const group = auto.get(key);
    if (group) group.ids.push(object.id);
    else auto.set(key, { key, name, custom: false, ids: [object.id] });
  });
  return [...groups, ...auto.values()];
}
