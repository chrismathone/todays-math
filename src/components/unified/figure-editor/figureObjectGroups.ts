import {
  figureObjects,
  GROUP_STACK_ATTR,
  numberedFigureObjects,
  readGroupStack,
  setFigureGroup,
} from "./figureSvgEditing";
import {
  isArcPath,
  objectName,
  type FigureAngleKind,
  type FigureAngleKinds,
  type FigureSegmentMarkKind,
} from "./figureObjectNames";
import { figureSegmentMarks } from "./figureSegmentMarks";

type FigureObject = ReturnType<typeof figureObjects>[number];

export interface FigureObjectGroup {
  key: string;
  name: string;
  /** 사용자가 만든 묶음 — 요소의 `data-group` 에 이름이 적혀 원문과 같이 저장된다. */
  custom: boolean;
  /** 묶음 밖(해제한 요소) — `data-group=""`. 늘 맨 끝에 하나. */
  loose?: boolean;
  ids: string[];
}

/** 차례의 글자 이름 — 0 → A, 25 → Z, 26 → AA (스프레드시트 열 이름과 같은 규칙). */
function letterName(index: number) {
  let name = "";
  for (let n = index; ; n = Math.floor(n / 26) - 1) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    if (n < 26) return name;
  }
}

/**
 * 새 묶음의 기본 이름 — **A · B · C …** 차례(원장님 2026-09-21 «그룹화는 숫자가 아니라 그룹 순서대로
 * A 그룹, B 그룹, C 그룹 이런 식으로»). Z 다음은 AA · AB … 로 이어 간다.
 * 이미 쓰는 이름은 건너뛰고 **빈 자리부터** 채운다 — 가운데 묶음을 풀면 그 글자가 다시 나온다.
 * 옛 그림의 손수 지은 이름(«오르막»)이나 전에 쓰던 «묶음 1» 은 글자 이름이 아니라 그대로 남는다(덮지 않는다).
 */
export function nextGroupName(used: Iterable<string>): string {
  const taken = new Set([...used].map((name) => name.trim()));
  for (let i = 0; ; i++) {
    const name = letterName(i);
    if (!taken.has(name)) return name;
  }
}

/**
 * 자동으로 붙은 이름인가 — A · B · … · AA 꼴(글자 한둘)만 그렇다.
 * 손수 지은 이름(«오르막» · 옛 «묶음 1»)은 아니다 — 다시 매기지 않는다.
 */
export const isAutoGroupName = (name: string) =>
  /^[A-Z]{1,2}$/.test(name.trim());

/** 겹친 묶음 속(`data-group-stack`)에 숨은 묶음 이름 — 새 묶음·다시 매기기가 이 글자를 피한다. */
export function stackedGroupNames(
  objects: readonly { attrs: Record<string, string> }[],
): Set<string> {
  const names = new Set<string>();
  for (const o of objects)
    for (const name of readGroupStack(o.attrs[GROUP_STACK_ATTR]))
      if (name?.trim()) names.add(name.trim());
  return names;
}

/**
 * 자동으로 붙은 묶음 이름을 **목록 차례**에 맞춰 다시 매긴다 — 위에서부터 A · B · C
 * (원장님 2026-09-21). 목록 차례는 첫 요소의 번호 차례라, 나중에 묶어도 위에 있으면 A 가 된다.
 *
 * 🔴 **손수 지은 이름은 절대 안 건드리고 그 자리를 건너뛴다** — 원장님이 «오르막 그룹을 …» 하실 때
 * 그 이름이 딴 것을 가리키면 안 된다. 손수 이름은 글자 차례에서도 빠진다(A 를 가져가지 않는다).
 * 손수 지은 이름이 마침 «A» 꼴이면 자동 이름과 가를 길이 없어 같이 다시 매겨진다 — 그때도 손잡이는 글자 하나라 뜻이 같다.
 *
 * 묶음을 만들 때 · 풀 때 · 끌어 옮길 때 — 목록 차례가 바뀌는 **모든 자리**에서 한 번에 부른다
 * (편집기 `assignGroup`). 바꿀 것이 없으면 **받은 원문을 그대로** 돌려준다(되돌리기 자리가 안 생긴다).
 */
export function renumberAutoGroups(svg: string): string {
  // 번호 차례 — 맨 앞으로·맨 뒤로로 그리는 차례가 바뀌어도 이름이 안 뒤바뀐다(번호 고정, 원장님 2026-09-21)
  const objects = numberedFigureObjects(svg);
  const viewBox = svg
    .match(/viewBox=["\']([^"\']+)/)?.[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number) ?? [0, 0, 480, 360];
  const custom = groupFigureObjects(objects, viewBox).filter((g) => g.custom);
  // 겹친 묶음 속에 숨은 이름은 비워 둔다 — 겉 묶음이 그 글자를 가져가면 해제할 때 딴 묶음과 합쳐진다.
  // 겉에도 같은 이름이 있으면(일부만 다시 묶은 경우) 그 묶음은 이름을 그대로 둔다.
  const reserved = stackedGroupNames(objects);
  const changes = new Map<string, string[]>();
  let index = 0;
  for (const group of custom) {
    if (!isAutoGroupName(group.name) || reserved.has(group.name)) continue;
    let name = letterName(index++);
    while (reserved.has(name)) name = letterName(index++);
    if (name === group.name) continue;
    changes.set(name, [...(changes.get(name) ?? []), ...group.ids]);
  }
  if (!changes.size) return svg;
  let next = svg;
  for (const [name, ids] of changes) next = setFigureGroup(next, ids, name);
  return next;
}

type Box = { x1: number; y1: number; x2: number; y2: number };
interface Shape {
  object: FigureObject;
  index: number;
  box: Box;
  points: number[][];
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
    points,
    line,
    dashed: !!dash && dash !== "none" && numbers(dash).some((v) => v > 0),
  };
}

const label = (o: FigureObject) =>
  (o.attrs["data-mj"] ?? o.text).replace(/\$/g, "").replace(/\s+/g, "");
const numeric = (o: FigureObject) =>
  /^(?:[-−+]?\d+(?:[.,]\d+)?|[-−]?\\[dt]?frac\{\d+\}\{\d+\}|O)$/.test(label(o));
const DOT = /^[●•∙⋅·○◦⚫⬤]$/;
const width = (b: Box) => b.x2 - b.x1;
const height = (b: Box) => b.y2 - b.y1;
const center = (b: Box) => [(b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2];
const near = (a: number[], b: number[], limit: number) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]) <= limit;
const distanceToSegment = (p: number[], a: number[], b: number[]) => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
/** 곧은 변 — 선분 · 다각형(닫는 변 포함) · 꺾은선의 한 토막 · 사각형(rect)의 네 변. 어느 요소의 변인지 같이 든다. */
type Edge = { s: Shape; e: number[][] };
const edgesOf = (s: Shape): Edge[] => {
  const p = s.points,
    type = s.object.type;
  let edges: number[][][] = [];
  if (type === "line") edges = [p];
  else if (type === "rect") {
    // 초등 엔진은 직사각형을 rect 한 요소로 그리고 네 모서리에 직각 표시를 단다(elem-1 markedShape)
    const [[x1, y1], [x2, y2]] = p;
    const c = [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ];
    edges = c.map((q, i) => [q, c[(i + 1) % 4]]);
  } else if (type === "polygon" || type === "polyline")
    edges = p.flatMap((q, i) =>
      i + 1 < p.length
        ? [[q, p[i + 1]]]
        : type === "polygon" && p.length > 2
          ? [[q, p[0]]]
          : [],
    );
  return edges.map((e) => ({ s, e }));
};
const unfilled = (o: FigureObject) =>
  (o.attrs.fill ?? "").trim().toLowerCase() === "none" ||
  /(?:^|;)\s*fill\s*:\s*none\b/i.test(o.attrs.style ?? "");

/**
 * 직각 표시 — 두 선이 만나는 꼭짓점 **안쪽**의 같은 길이 두 토막이 이루는 ㄱ자 한 획(엔진 v2 `right: true`,
 * vendor/figure-engine/core/figure_scene.py `_angle_mark_polylines`: 꼭짓점 V 에서 두 변을 따라 같은 거리 s 인
 * 두 점 A·C 와 그 맞은 모서리 B 를 A→B→C 로 잇는다). 엔진 SVG 에 표지(class·data)가 없어 모양과 자리로 가른다:
 * 열린 획 · 점 셋 · 두 토막 길이가 같고 90° · 양 끝 A·C 가 서로 다른 두 선 위에 있고 V = A + C − B 가 두 선에 다 닿는다.
 * 모양만으로는 90° 로 벌린 열린 V 화살촉과 같다 — 화살촉은 꺾인 점이 선 **위**, 양 끝이 선 밖이라 자리에서 갈린다.
 * 실선만 — 점에서 두 축으로 내린 점선 꺾은선(elem-1 linearGraph)은 원점과 사각형을 이뤄 꼴·자리가 같다(2026-09-19 실측).
 * 직각 표시가 아니면 빈 목록, 맞으면 그 표시가 앉은 변들의 요소를 돌려준다.
 */
function rightAngleMark(s: Shape, edges: Edge[], S: number): Shape[] {
  const o = s.object;
  if ((o.type !== "path" && o.type !== "polyline") || !unfilled(o)) return [];
  if (s.dashed) return [];
  if (
    o.type === "path" &&
    !/^ML{1,2}$/.test((o.attrs.d ?? "").replace(/[^A-Za-z]/g, ""))
  )
    return [];
  if (s.points.length !== 3) return [];
  const [a, b, c] = s.points;
  const l1 = Math.hypot(a[0] - b[0], a[1] - b[1]),
    l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
  if (!l1 || !l2 || Math.max(l1, l2) > 1.25 * Math.min(l1, l2)) return [];
  if (Math.max(l1, l2) > 0.12 * S) return [];
  const cos =
    ((a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1])) / (l1 * l2);
  if (Math.abs(cos) > 0.1) return [];
  const v = [a[0] + c[0] - b[0], a[1] + c[1] - b[1]];
  const tol = Math.max(1, 0.15 * Math.min(l1, l2));
  const on = (p: number[], { e }: Edge) =>
    distanceToSegment(p, e[0], e[1]) <= tol;
  const first = edges.filter((e) => on(a, e) && on(v, e)),
    second = edges.filter((e) => on(c, e) && on(v, e));
  return first.some((e1) => second.some((e2) => e2 !== e1))
    ? [...first, ...second].map(({ s }) => s)
    : [];
}

/** 각 표시 하나 — 각의 종류와, 표시가 앉은 변의 요소(좌표평면 위 닫힌 도형 찾기의 씨앗). */
interface AngleMark {
  kind: FigureAngleKind;
  sides: Shape[];
}
/** 호로 그린 90° 를 «직각»으로 읽는 여유(도). 엔진 호는 두 변으로 재면 0.1° 안쪽이다 — 88° 는 예각으로 남긴다. */
const RIGHT_SLACK = 1;
const kindOf = (degrees: number): FigureAngleKind =>
  Math.abs(degrees - 90) <= RIGHT_SLACK
    ? "직각"
    : degrees < 90
      ? "예각"
      : "둔각";

/**
 * 각의 호 — 꼭짓점 V 를 중심으로 한 변에서 다른 변까지 **작은 쪽**으로 돈 원호 한 획(엔진 v2 `figure_svg.angle_arc`:
 * `M 시작 A r r 0 0 방향 끝`. 여러 겹이면 반지름을 3 씩 줄인 호가 겹마다 따로 선다 — 겹마다 같은 각이다).
 * 엔진 SVG 에 표지가 없어 모양과 자리로 가른다: 열린 호 한 획 · 원호(rx = ry) · 1°~179° 를 돈다 · 작다.
 * 호의 두 끝에서 중심을 지나는 변을 찾으면 **두 변 사이 각**을, 못 찾으면 **호가 돈 각**을 잰다.
 * 부채꼴의 호는 중심을 지나는 변(반지름)이 호 끝에서 **끝난다** — 각 표시의 변은 호 너머로 뻗는다. 그래서 도형의 호로 둔다.
 */
function arcAngleMark(s: Shape, edges: Edge[], S: number): AngleMark | null {
  const o = s.object;
  if (o.type !== "path" || !unfilled(o)) return null;
  const d = o.attrs.d ?? "";
  // 각의 호도 한 원 위의 호 한 획이라, 꼴 판정은 요소 이름이 «호»를 가르는 자리와 **같은 한 함수**를 쓴다
  // (figureObjectNames.ts `isArcPath` — 획 하나 · 수 아홉 · rx ≈ ry). 여기서 갈리면 이름과 묶음이 어긋난다.
  if (!isArcPath(d)) return null;
  const v = numbers(d);
  const [dx, dy] = offset(o) ?? [0, 0];
  const [x0, y0, rx, ry, , large, sweep, x1, y1] = v;
  const a = [x0 + dx, y0 + dy],
    b = [x1 + dx, y1 + dy];
  const r = (Math.abs(rx) + Math.abs(ry)) / 2;
  // 중심 — SVG 호 규격(F.6.5)을 원(rx = ry)·기울기 0 으로 줄인 것. 반지름이 모자라면 SVG 처럼 늘린다(반원).
  const hx = (a[0] - b[0]) / 2,
    hy = (a[1] - b[1]) / 2;
  const half = hx * hx + hy * hy;
  if (!half) return null;
  const k =
    (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, r * r - half) / half);
  const c = [k * hy + (a[0] + b[0]) / 2, -k * hx + (a[1] + b[1]) / 2];
  const radius = Math.max(r, Math.sqrt(half));
  let turn =
    Math.atan2(b[1] - c[1], b[0] - c[0]) - Math.atan2(a[1] - c[1], a[0] - c[0]);
  if (sweep && turn < 0) turn += 2 * Math.PI;
  if (!sweep && turn > 0) turn -= 2 * Math.PI;
  const span = (Math.abs(turn) * 180) / Math.PI;
  if (span < 1 || span > 179) return null;
  const tol = Math.max(1, 0.08 * radius);
  let sector = false;
  // 호 끝 p 에서 중심을 지나는 변 — 호 너머로 뻗으면 각의 변(방향은 중심에서 p 쪽), 호 끝에서 끝나면 부채꼴의 반지름.
  const sideAt = (p: number[]) => {
    const ux = (p[0] - c[0]) / radius,
      uy = (p[1] - c[1]) / radius;
    for (const edge of edges) {
      const [e0, e1] = edge.e;
      if (
        distanceToSegment(c, e0, e1) > tol ||
        distanceToSegment(p, e0, e1) > tol
      )
        continue;
      const reach = Math.max(
        ...edge.e.map((q) => (q[0] - c[0]) * ux + (q[1] - c[1]) * uy),
      );
      if (reach < radius + tol) {
        sector = true;
        continue;
      }
      const ex = e1[0] - e0[0],
        ey = e1[1] - e0[1];
      const sign = (ex * ux + ey * uy < 0 ? -1 : 1) / Math.hypot(ex, ey);
      return { s: edge.s, dir: [sign * ex, sign * ey] };
    }
    return null;
  };
  const first = sideAt(a),
    second = sideAt(b);
  if (first && second) {
    if (radius > 0.25 * S) return null;
    const cos = first.dir[0] * second.dir[0] + first.dir[1] * second.dir[1];
    const degrees = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    return { kind: kindOf(degrees), sides: [first.s, second.s] };
  }
  // 두 변을 못 찾으면 호가 돈 각 — 변이 경로 속에 있는 그림(전개도 등). 도형의 호와 헷갈리지 않게 더 작은 것만.
  if (sector || radius > 0.12 * S) return null;
  return { kind: kindOf(span), sides: [] };
}

/** 그림의 각 표시 전부 — 직각 표시(ㄱ자)와 각의 호. */
function angleMarks(free: Shape[], S: number) {
  const edges = free.flatMap(edgesOf);
  const marks = new Map<Shape, AngleMark>();
  for (const s of free) {
    const on = rightAngleMark(s, edges, S);
    const mark: AngleMark | null = on.length
      ? { kind: "직각", sides: on }
      : arcAngleMark(s, edges, S);
    if (mark) marks.set(s, mark);
  }
  return marks;
}

const sizeOf = (viewBox: number[]) =>
  Math.max(viewBox[2] || 480, viewBox[3] || 360);

/**
 * 편집기는 끄는 걸음마다 **같은 요소 배열**로 묶기(`groupFigureObjects`)와 각 종류(`figureAngleKinds`)를 둘 다 부른다 —
 * 요소 1,000개 그림에서 자리 읽기·각 판정을 두 번 하면 걸음당 2.2ms 가 4.9ms 가 됐다(2026-09-19 실측).
 * 마지막 한 벌(요소 배열 · 캔버스 크기)만 기억한다. 요소 배열은 원문을 읽을 때마다 새로 생긴다(`figureObjects`).
 */
let measured: {
  objects: FigureObject[];
  S: number;
  free: Shape[];
  marks: Map<Shape, AngleMark>;
  /** 선분 위 표시(같은 길이 눈금 · 평행 ») — figureSegmentMarks.ts 한 규칙. */
  segments: Map<string, FigureSegmentMarkKind>;
} | null = null;
function measure(objects: FigureObject[], S: number) {
  if (!measured || measured.objects !== objects || measured.S !== S) {
    const free = objects.flatMap(
      (object, index) => shapeOf(object, index) ?? [],
    );
    measured = {
      objects,
      S,
      free,
      marks: angleMarks(free, S),
      segments: figureSegmentMarks(objects, S),
    };
  }
  return measured;
}

/**
 * 각 표시의 종류(요소 id → 직각·예각·둔각, 원장님 2026-09-19 «직각 둔각 예각»)와 선분 위 표시의 이름(«같은 길이 표시»·
 * «평행 표시», 원장님 2026-09-19 «추가할 수 있는 것 전부»). 요소 이름(`objectName`)이 이것으로 표시를 부른다 —
 * 요소 목록 · 오른쪽 칸 제목 · AI 요소 목록 · AI 결과 줄이 같은 이름을 쓰게 한 곳에서 잰다.
 */
export function figureAngleKinds(
  objects: FigureObject[],
  viewBox: number[],
): FigureAngleKinds {
  const { marks, segments } = measure(objects, sizeOf(viewBox));
  return new Map<string, FigureAngleKind | FigureSegmentMarkKind>([
    ...segments,
    ...[...marks].map(([s, mark]) => [s.object.id, mark.kind] as const),
  ]);
}

/**
 * 직각 표시가 앉은 닫힌 도형의 변 — 선분들이 끝점을 맞대어 한 바퀴 돈다(좌표평면 위 직각삼각형 OAB).
 * 함수의 그래프는 제자리로 돌아오지 않는다(한 x 에 한 y). 끝점을 묶어 잎을 걷어 내고(고리에 든 선분만 남기고),
 * 그중 직각 표시가 앉은 변과 이어진 덩어리만 돌려준다 — 격자 테두리처럼 직각 표시 없이 닫히는 선은 건드리지 않는다.
 */
function markedFigureSides(lines: Shape[], seeds: Set<Shape>, tol: number) {
  // 끄는 걸음마다 불린다 — 직각 표시가 없으면(대부분) 끝점 묶기를 아예 안 한다
  if (!seeds.size) return new Set<Shape>();
  const nodes: number[][] = [];
  const node = (p: number[]) => {
    const found = nodes.findIndex((q) => near(p, q, tol));
    if (found >= 0) return found;
    nodes.push(p);
    return nodes.length - 1;
  };
  let edges = lines.flatMap((s) => {
    const [x1, y1, x2, y2] = s.line!;
    const u = node([x1, y1]),
      v = node([x2, y2]);
    return u === v ? [] : [{ s, u, v }];
  });
  for (;;) {
    const degree = new Map<number, number>();
    for (const { u, v } of edges)
      for (const n of [u, v]) degree.set(n, (degree.get(n) ?? 0) + 1);
    const kept = edges.filter(
      ({ u, v }) => degree.get(u)! > 1 && degree.get(v)! > 1,
    );
    if (kept.length === edges.length) break;
    edges = kept;
  }
  // 덩어리 — 끝점을 공유하는 선분끼리 한 덩어리
  const root = nodes.map((_, i) => i);
  const find = (n: number): number =>
    root[n] === n ? n : (root[n] = find(root[n]));
  for (const { u, v } of edges) root[find(u)] = find(v);
  const marked = new Set(
    edges.filter(({ s }) => seeds.has(s)).map(({ u }) => find(u)),
  );
  return new Set(
    edges.filter(({ u }) => marked.has(find(u))).map(({ s }) => s),
  );
}

/**
 * 요소 목록을 역할로 묶는다(원장님 2026-09-18 «역할별로 묶고 사용자 커스텀도 가능하게»).
 * 좌표 그래프면 x축·y축(화살촉 포함) · 그래프 · 점선 · 점 · 눈금 · 눈금 숫자 · 축 이름,
 * 아니면 종류(선분·원·글자 …)로 묶는다. 각 표시(직각 표시 ㄱ자 · 각의 호)는 어느 그림에서나 «각» 하나로 모은다
 * (원장님 2026-09-19). 좌표평면 위 도형의 변(각 표시가 앉아 한 바퀴 도는 선분)은 그래프가 아니라 종류로 둔다.
 * 사용자가 정한 묶음(`data-group`)이 어림을 이긴다 — 이름이 역할 묶음과 같으면 그 묶음에 합쳐 보이고(끌어서 옮기기),
 * 새 이름이면 사용자 묶음으로 맨 앞에, 빈 이름이면 **묶음 밖**(해제)으로 맨 끝에 간다.
 * 묶음 차례는 첫 요소의 번호 차례다 — 그림 위 번호와 같은 차례로 읽힌다.
 * 어림은 자리만 본다(평행 이동까지) — 틀리게 묶였으면 사용자가 묶음을 만들어 옮긴다.
 */
export function groupFigureObjects(
  objects: FigureObject[],
  viewBox: number[],
): FigureObjectGroup[] {
  const W = viewBox[2] || 480,
    H = viewBox[3] || 360,
    S = sizeOf(viewBox);
  const role = new Map<string, string>();
  // 역할 어림은 사용자가 옮긴 요소까지 다 본다 — 화살촉 하나를 옮겼다고 축이 안 서면 나머지 묶음이 흔들린다.
  // 각 표시(직각 표시 ㄱ자 · 각의 호)는 좌표평면 위에서도 «각» — 축 끝 가까이 있어도 화살촉이 아니다.
  const { free, marks, segments } = measure(objects, S);

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
  // 화살촉 — 축 끝에서 축을 따라 **바깥**을 향하는 작은 V·채운 삼각형: 가장 바깥 점(촉)이 축 위에 있다.
  // 직각 표시·각의 호는 두 선이 만나는 꼭짓점 안쪽에 앉아 가장 바깥 점이 다른 변 위(축 밖)에 있다 — 직각삼각형의
  // 두 변이 «x축»·«y축»으로 묶였다(2026-09-19). 캔버스가 크면 ㄱ자가 크기 문턱 안에 들어 끝 가까이만 보고는 못 가른다.
  const arrowsOf = (axis: Shape | undefined) =>
    !axis
      ? []
      : free.filter((s) => {
          if (!["polygon", "path", "polyline"].includes(s.object.type))
            return false;
          if (marks.has(s)) return false;
          const size = Math.hypot(width(s.box), height(s.box));
          if (size > 0.06 * S) return false;
          const [x1, y1, x2, y2] = axis.line!;
          const c = center(s.box);
          const toward = near(c, [x2, y2], 0.04 * S)
            ? 1
            : near(c, [x1, y1], 0.04 * S)
              ? -1
              : 0;
          if (!toward) return false;
          const length = Math.hypot(x2 - x1, y2 - y1);
          const ux = ((x2 - x1) / length) * toward,
            uy = ((y2 - y1) / length) * toward;
          const along = (p: number[]) => p[0] * ux + p[1] * uy;
          const off = (p: number[]) => (p[0] - x1) * uy - (p[1] - y1) * ux;
          const far = Math.max(...s.points.map(along));
          const tip = s.points.filter((p) => along(p) >= far - 0.1 * size);
          const offset = tip.reduce((sum, p) => sum + off(p), 0) / tip.length;
          // 여유는 크기의 1/5 — ㄱ자의 가장 바깥 점은 한 변 길이(크기의 71%)만큼 축에서 벗어난다.
          return Math.abs(offset) <= Math.max(1, 0.2 * size);
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
  // 눈금은 축을 따라 흩어져 있다 — 등변 표시(‖·‖|)는 변 가운데 한 자리에 3px 간격으로 모인다
  // (figure_scene.py `_MARK_GAP`). 직각이등변삼각형의 두 변이 «x축»·«y축», 선분 하나가 수직선으로 묶였다(2026-09-19).
  const spread = (ticks: Shape[], horizontal: boolean) => {
    const at = ticks.map((s) => center(s.box)[horizontal ? 0 : 1]);
    return at.length ? Math.max(...at) - Math.min(...at) : 0;
  };
  const scale = (ticks: Shape[], horizontal: boolean, count: number) =>
    ticks.length >= count && spread(ticks, horizontal) >= 0.04 * S;
  const evidence = (
    axis: Shape | undefined,
    ticks: Shape[],
    arrows: Shape[],
    horizontal: boolean,
  ) => scale(ticks, horizontal, 2) || arrows.length > 0 || marked(axis);
  const axes: [Shape, string, Shape[], Shape[]][] = [];
  if (crosses) {
    if (
      evidence(xAxis, xTicks, xArrows, true) ||
      evidence(yAxis, yTicks, yArrows, false)
    )
      axes.push(
        [xAxis!, "x축", xTicks, xArrows],
        [yAxis!, "y축", yTicks, yArrows],
      );
  } else {
    // 축 하나(수직선 등) — 눈금이 셋 이상일 때만.
    if (xAxis && scale(xTicks, true, 3))
      axes.push([xAxis, "x축", xTicks, xArrows]);
    else if (yAxis && scale(yTicks, false, 3))
      axes.push([yAxis, "y축", yTicks, yArrows]);
  }
  const graph = axes.length > 0;
  for (const [axis, name, ticks, arrows] of axes) {
    role.set(axis.object.id, name);
    for (const s of arrows) role.set(s.object.id, name);
    for (const s of ticks) role.set(s.object.id, "눈금");
  }
  // 원장님 2026-09-19 «기존의 각들은 다 각으로 묶어. 직각 둔각 예각.» — 점선으로 그린 호도 «점선»이 아니라 «각».
  for (const s of marks.keys()) role.set(s.object.id, "각");
  // 선분 위 표시(같은 길이 눈금 · 평행 ») — 좌표축 눈금으로 이미 묶인 것은 그대로
  for (const [id, kind] of segments) if (!role.has(id)) role.set(id, kind);

  // 좌표평면 위 도형 — 각 표시가 앉은 닫힌 도형의 변(삼각형 OAB)은 «그래프»가 아니다. 종류(선분)로 둔다.
  const sides = graph
    ? markedFigureSides(
        free.filter((s) => s.line && !role.has(s.object.id)),
        new Set([...marks.values()].flatMap((mark) => mark.sides)),
        0.01 * S,
      )
    : new Set<Shape>();

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
      // 점을 글자(●)로 찍은 그림이 있다 — 원장님 그림의 꺾은점 여섯이 «글자»·«축 이름»으로 묶였다(2026-09-18).
      if (DOT.test(label(o))) {
        role.set(o.id, "점");
        continue;
      }
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
    if (sides.has(s)) continue;
    if (
      graph &&
      (o.type === "line" || o.type === "path" || o.type === "polyline")
    )
      role.set(o.id, "그래프");
  }

  const auto = new Map<string, FigureObjectGroup>();
  objects.forEach((object) => {
    if (object.attrs["data-group"] !== undefined) return;
    const name =
      role.get(object.id) ??
      (object.attrs["data-function"]
        ? "함수 그래프"
        : object.type === "text"
          ? "글자"
          : objectName(object));
    const key = `${role.has(object.id) ? "role" : "type"}:${name}`;
    const group = auto.get(key);
    if (group) group.ids.push(object.id);
    else auto.set(key, { key, name, custom: false, ids: [object.id] });
  });
  const custom = new Map<string, FigureObjectGroup>();
  const loose: string[] = [];
  objects.forEach((object) => {
    const name = object.attrs["data-group"]?.trim();
    if (name === undefined) return;
    if (!name) {
      loose.push(object.id);
      return;
    }
    const match = [...auto.values()].find((group) => group.name === name);
    if (match) match.ids.push(object.id);
    else if (custom.has(name)) custom.get(name)!.ids.push(object.id);
    else
      custom.set(name, {
        key: `custom:${name}`,
        name,
        custom: true,
        ids: [object.id],
      });
  });
  const order = new Map(objects.map((object, index) => [object.id, index]));
  for (const group of auto.values())
    group.ids.sort((a, b) => order.get(a)! - order.get(b)!);
  return [
    ...custom.values(),
    ...auto.values(),
    ...(loose.length
      ? [
          {
            key: "loose",
            name: "묶음 없음",
            custom: false,
            loose: true,
            ids: loose,
          },
        ]
      : []),
  ];
}
