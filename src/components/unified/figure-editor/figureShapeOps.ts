import type {
  FigureEditCommand,
  FigureEditPointRef,
} from "@/lib/dev-ai/figure-edit-contract";
import {
  addFigureObject,
  editFigureObject,
  figureObjects,
  readFigureSvg,
} from "./figureSvgEditing";
import { figurePointNames } from "./figureEditElements";
import { objectName } from "./figureObjectNames";
import {
  applyPoint,
  elementMatrix,
  scaleOf,
  type Affine,
} from "./figureEditGeometry";
import { rotateFigureSelection, rotationBlock } from "./figureRotate";
import {
  bucketFill,
  faceSourceObjects,
  faceTolerance,
  isTiedFace,
} from "./figureFaceEditing";
import {
  DEFAULT_FACE_FILL,
  FACE_REASONS,
  faceCurves,
} from "./figureFaceSources";
import {
  arrangeFaceCurves,
  boundedFaces,
  interiorPoint,
  pointInRegion,
  ringArea,
} from "./figureFaceGeometry";
import { formatPoints, parsePoints } from "./figureShapeAdjust";
import { isSizeLocked } from "./figureSizeLock";

/**
 * «요청대로 고치기» 동작 더하기 ② — 도형·변환(원장님 2026-09-19 «추가할 수 있는 것 전부»).
 * 원 · 호 · 크기 · 90° 회전 · 색칠 · 수선 · 중점 · 교점. 적용 분기(figureEditApply.ts)는 한 줄로 여기에 넘긴다.
 *
 * - 새 요소는 편집기가 이미 읽는 모양이다 — 원은 원 도구, 호는 엔진 add_arc 의 `M … A …`, 면은 채우기 통(`bucketFill`)
 *   그대로, 회전은 편집기 단추의 `rotateFigureSelection` 그대로. 점·선분·각 표시·글자는 다른 수정 명령(addPoint ·
 *   addLine · addAngle · addText)을 **그대로 불러** 만든다 — 크기·굵기·이웃 각 표시 따르기·중복 거절이 한 길이다.
 * - 점은 이름으로 받고 발 · 반지름 · 중점 · 교점은 **코드가 계산한다**. 이름은 요소 목록의 0.1 반올림이 아니라
 *   그림의 점 그대로(`figurePointNames`) — 수선의 발이 변 위에, 호의 끝이 원 위에 정확히 선다.
 * - 새로 계산한 좌표는 엔진처럼 소수 셋째 자리(figure_scene.py `_fmt`).
 */

type FigureObject = ReturnType<typeof figureObjects>[number];
type XY = { x: number; y: number };

const SHAPE_OPS = [
  "addCircle",
  "addArc",
  "resize",
  "rotate",
  "fillRegion",
  "addPerpendicular",
  "addMidpoint",
  "addIntersection",
] as const;
export type FigureShapeCommand = Extract<
  FigureEditCommand,
  { op: (typeof SHAPE_OPS)[number] }
>;
export const isShapeCommand = (
  command: FigureEditCommand,
): command is FigureShapeCommand =>
  (SHAPE_OPS as readonly string[]).includes(command.op);

/** 적용 분기(figureEditApply.ts)가 넘기는 것 — 이름·거절·다른 명령 적용은 그쪽과 같은 함수를 쓴다. */
export interface FigureShapeContext {
  /** 지금 그림 — 앞 명령까지 적용한 것. */
  svg: string;
  /** 요청을 보낼 때의 그림 — 번호와 점 이름은 이 그림 기준(앞 명령이 지워도 «3번»은 처음 그림의 3번). */
  sent: string;
  before: readonly FigureObject[];
  viewBox: readonly [number, number, number, number];
  /** 이 명령의 이름 — 결과 줄·거절 줄 앞머리. */
  label: string;
  nameOf: (index: number) => string;
  resolve: (ref: FigureEditPointRef) => XY;
  inside: (p: XY) => boolean;
  reject: (reason: string) => never;
  /** 다른 수정 명령을 적용한다(applyFigureEdits) — 점·선분·각 표시·글자를 그 명령과 같은 길로 만든다. */
  edit: (
    svg: string,
    commands: readonly unknown[],
  ) => { svg: string; applied: string[]; rejected: string[] };
}

/** 편집기 점선 칸과 같은 값(figureEditApply.ts `DASH` · FigureEditor 서식 칸). */
const DASH = "5 4";
/** 엔진 `_fmt` — 소수 셋째 자리. */
const fmt = (value: number) => {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
};
/** 요소 목록의 반지름 표기와 같은 소수 첫째 자리. */
const tenth = (value: number) => Math.round(value * 10) / 10;
const distance = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y);
const xy = ([x, y]: readonly number[]): XY => ({ x, y });
const number = (o: FigureObject, key: string) =>
  Number.parseFloat(o.attrs[key] ?? "") || 0;
const nodeOf = (svg: string, id: string) =>
  [...readFigureSvg(svg).querySelectorAll("[data-object-id]")].find(
    (node) => node.getAttribute("data-object-id") === id,
  )!;
/** 거절 줄 «라벨: 이유» 에서 이유만. */
const reasonOf = (line: string) => line.slice(line.indexOf(": ") + 2);
const refName = (ref: FigureEditPointRef) =>
  typeof ref === "string" ? ref : null;
const allNames = (refs: readonly FigureEditPointRef[]) =>
  refs.every((ref) => typeof ref === "string") ? refs.join("") : null;
const POLYGONS: Record<number, string> = { 3: "삼각형", 4: "사각형" };

/** 명령 이름 — 번호로 가리키지 않는 명령만(번호가 있으면 `nameOf`). 결과 줄·거절 줄 앞머리. */
export function shapeCommandLabel(
  command: FigureShapeCommand,
  before: readonly unknown[],
  nameOf: (index: number) => string,
): string {
  switch (command.op) {
    case "addCircle": {
      const center = refName(command.center);
      const parts = [
        center ? `중심 ${center}` : "",
        command.r !== undefined
          ? `반지름 ${command.r}`
          : center && command.through !== undefined && refName(command.through)
            ? `반지름 ${center}${refName(command.through)}`
            : "",
      ].filter(Boolean);
      return parts.length ? `원 추가(${parts.join(", ")})` : "원 추가";
    }
    case "addArc": {
      // 지나는 점이 이름이면 가운데에(호 ACB), 좌표면 두 끝만(호 AB)
      const from = refName(command.from),
        to = refName(command.to);
      const via = command.via === undefined ? "" : (refName(command.via) ?? "");
      const center = refName(command.center);
      return `${from && to ? `호 ${from}${via}${to}` : "호"} 추가${center ? `(중심 ${center})` : ""}`;
    }
    case "resize":
      return command.target <= before.length
        ? nameOf(command.target - 1)
        : `${command.target}번`;
    case "rotate":
      if (command.targets === "all") return "그림 전체";
      if (command.targets.length === 1)
        return command.targets[0] <= before.length
          ? nameOf(command.targets[0] - 1)
          : `${command.targets[0]}번`;
      return `${command.targets.length}개 요소`;
    case "fillRegion": {
      if (!Array.isArray(command.at)) return "칸 색칠";
      const kind = POLYGONS[command.at.length] ?? "다각형";
      const names = allNames(command.at);
      return names ? `${kind} ${names} 색칠` : `${kind} 색칠`;
    }
    case "addPerpendicular": {
      const from = refName(command.from),
        onto = allNames(command.onto);
      return from && onto
        ? `${from}에서 ${onto}에 내린 수선 추가`
        : "수선 추가";
    }
    case "addMidpoint": {
      const ends = allNames([command.from, command.to]);
      const name = command.label ? ` ${command.label}` : "";
      return ends ? `${ends}의 중점${name} 추가` : `중점${name} 추가`;
    }
    case "addIntersection": {
      const [first, second] = command.lines.map(allNames);
      const name = command.label ? ` ${command.label}` : "";
      return first && second
        ? `${first}·${second}의 교점${name} 추가`
        : `교점${name} 추가`;
    }
  }
}

/** 명령 하나를 지금 그림에 적용한다. 못 하면 `ctx.reject` 로 이유를 던진다(적용 목록에 «라벨: 이유» 한 줄). */
export function applyShapeCommand(
  command: FigureShapeCommand,
  ctx: FigureShapeContext,
): { svg: string; text: string } {
  // 이름은 그림의 점 그대로 — 요소 목록(0.1 반올림)이 아니라. 이름이 없거나 둘이면 applyFigureEdits 와 같은 이유로 거절
  const exact = new Map(
    figurePointNames(ctx.sent).map(({ name, x, y }) => [name, { x, y }]),
  );
  const point = (ref: FigureEditPointRef) =>
    (typeof ref === "string" ? exact.get(ref) : undefined) ?? ctx.resolve(ref);
  const [, , width, height] = ctx.viewBox;
  const size = Math.max(width, height);
  /** 같은 점으로 보는 거리 — 면 찾기 허용 오차(긴 변의 0.4%)와 같다. */
  const close = Math.max(0.5, 0.004 * size);
  const { svg, reject } = ctx;

  switch (command.op) {
    case "addCircle": {
      const center = point(command.center);
      const radius = fmt(
        command.r ?? distance(center, point(command.through!)),
      );
      if (radius < 0.5) reject("반지름이 0 입니다");
      if (radius > size) reject("반지름이 그림보다 큽니다");
      const twin = circleAt(svg, center, radius, close);
      if (twin) reject(`같은 원이 이미 있습니다(${nameIn(ctx, twin.o)})`);
      // 편집기 원 도구(드래그: 중심 → 원 위의 점)와 같은 요소. 반지름만 소수 셋째 자리로 적는다
      const added = addFigureObject(svg, "circle", center, {
        x: center.x + radius,
        y: center.y,
      });
      return {
        svg: editFigureObject(added.svg, added.id, {
          r: String(radius),
          ...(command.dashed ? { "stroke-dasharray": DASH } : {}),
        }),
        text: ctx.label,
      };
    }

    case "addArc": {
      let center = point(command.center);
      const from = point(command.from),
        to = point(command.to);
      const r1 = distance(center, from),
        r2 = distance(center, to);
      if (r1 < 0.5 || r2 < 0.5) reject("호의 끝이 중심과 같습니다");
      if (Math.abs(r1 - r2) > 0.05 * Math.max(r1, r2))
        reject("두 끝이 중심에서 같은 거리가 아닙니다");
      // 그림에 이미 그 원이 있으면 그 원 위에 — 끝점이 셋째 자리로 반올림돼도 반지름이 원과 같다
      const circle = circleAt(svg, center, r1, close);
      if (circle) center = circle.center;
      const radius = fmt(circle?.radius ?? r1);
      const TURN = 2 * Math.PI;
      const angle = (p: XY) => Math.atan2(p.y - center.y, p.x - center.x);
      const wrap = (value: number) => ((value % TURN) + TURN) % TURN;
      const start = angle(from),
        end = angle(to);
      // y 가 아래인 그림 좌표에서 각이 커지는 쪽 = 화면 시계 방향 = SVG sweep 1
      const forward = wrap(end - start);
      const EPSILON = (0.5 * Math.PI) / 180;
      if (forward < EPSILON || forward > TURN - EPSILON)
        reject("두 끝이 같은 자리입니다");
      let sweep: 0 | 1;
      if (command.via !== undefined) {
        const via = point(command.via);
        if (distance(via, center) < 0.5) reject("지나는 점이 중심입니다");
        sweep = wrap(angle(via) - start) < forward ? 1 : 0;
      } else {
        if (Math.abs(forward - Math.PI) < EPSILON)
          reject("반원이라 어느 쪽 호인지 정할 수 없습니다");
        sweep = forward < Math.PI ? 1 : 0;
      }
      const large = (sweep ? forward : TURN - forward) > Math.PI ? 1 : 0;
      const tip = {
        x: fmt(center.x + radius * Math.cos(end)),
        y: fmt(center.y + radius * Math.sin(end)),
      };
      const added = addFigureObject(svg, "curve", from, tip);
      return {
        svg: editFigureObject(added.svg, added.id, {
          d: `M ${fmt(from.x)} ${fmt(from.y)} A ${radius} ${radius} 0 ${large} ${sweep} ${tip.x} ${tip.y}`,
          ...(command.dashed ? { "stroke-dasharray": DASH } : {}),
        }),
        text: ctx.label,
      };
    }

    case "resize":
      return resize(command, ctx);

    case "rotate": {
      const objects = figureObjects(svg);
      let ids: string[];
      if (command.targets === "all") ids = objects.map((o) => o.id);
      else {
        const missing = command.targets.find((n) => n > ctx.before.length);
        if (missing)
          reject(
            command.targets.length === 1
              ? "그런 번호의 요소가 없습니다"
              : `${missing}번 — 그런 번호의 요소가 없습니다`,
          );
        const present = new Set(objects.map((o) => o.id));
        ids = [...new Set(command.targets)]
          .map((n) => ctx.before[n - 1].id)
          .filter((id) => present.has(id));
        if (!ids.length) reject("앞 명령에서 지웠습니다");
      }
      // 편집기 단추가 꺼지는 이유 그대로(크기 고정 · 면만 · 글자 하나만)
      const blocked = rotationBlock(objects, ids);
      if (blocked) reject(blocked.replace(/\.$/, ""));
      const turned = rotateFigureSelection(svg, ids, command.direction);
      if (turned === svg) reject("돌릴 것이 없습니다");
      return {
        svg: turned,
        text: `${ctx.label} ${command.direction === "cw" ? "시계" : "반시계"} 90° 회전`,
      };
    }

    case "fillRegion":
      return fillRegion(command, ctx, point);

    case "addPerpendicular": {
      const from = point(command.from);
      const [b, c] = command.onto.map(point);
      const dx = c.x - b.x,
        dy = c.y - b.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.5) reject("직선의 두 점이 같습니다");
      const t = ((from.x - b.x) * dx + (from.y - b.y) * dy) / length ** 2;
      const foot = { x: fmt(b.x + t * dx), y: fmt(b.y + t * dy) };
      if (distance(from, foot) < close)
        reject("점이 그 직선 위에 있어 수선을 그을 수 없습니다");
      if (!ctx.inside(foot)) reject("수선의 발이 그림 밖입니다");
      const twin = segmentBetween(svg, from, foot, close);
      if (twin) reject(`수선이 이미 있습니다(${nameIn(ctx, twin)})`);
      // 발이 선분 밖이면 가까운 끝에서 발까지 연장선을 점선으로(교과서 관례)
      const beyond =
        t * length < -close ? b : (t - 1) * length > close ? c : null;
      const far = distance(foot, b) >= distance(foot, c) ? b : c;
      const lines = ctx.edit(svg, [
        ...(beyond
          ? [{ op: "addLine", from: beyond, to: foot, dashed: true }]
          : []),
        {
          op: "addLine",
          from,
          to: foot,
          ...(command.dashed ? { dashed: true } : {}),
        },
      ]);
      if (lines.rejected.length) reject(reasonOf(lines.rejected[0]));
      const notes: string[] = [];
      // 직각 표시 — 각 표시 더하기(addAngle) 그대로: 이웃 각 표시의 크기·굵기를 따르고, 이미 있으면 달지 않는다
      const mark = ctx.edit(lines.svg, [
        { op: "addAngle", at: foot, from, to: far, right: true },
      ]);
      let next = mark.svg;
      if (command.foot) {
        // 발 이름은 직선 건너편 — 수선을 따라 발 너머로 글자 크기의 0.8
        const fontSize = firstFontSize(ctx.before);
        const along = distance(from, foot);
        const at = {
          x: fmt(foot.x + ((foot.x - from.x) / along) * 0.8 * fontSize),
          y: fmt(foot.y + ((foot.y - from.y) / along) * 0.8 * fontSize),
        };
        const named = ctx.edit(next, [
          { op: "addText", text: command.foot, ...at },
        ]);
        if (named.rejected.length)
          notes.push(`발 이름 안 붙임 — ${reasonOf(named.rejected[0])}`);
        else notes.push(`발 ${command.foot}`);
        next = named.svg;
      }
      if (beyond) notes.push("연장선 점선");
      if (mark.rejected.length)
        notes.push(`직각 표시 안 함 — ${reasonOf(mark.rejected[0])}`);
      return {
        svg: next,
        text: notes.length ? `${ctx.label}(${notes.join(", ")})` : ctx.label,
      };
    }

    case "addMidpoint": {
      const from = point(command.from),
        to = point(command.to);
      if (distance(from, to) < 0.5) reject("두 끝이 같은 점입니다");
      return addDot(
        ctx,
        {
          x: fmt((from.x + to.x) / 2),
          y: fmt((from.y + to.y) / 2),
        },
        command.label,
      );
    }

    case "addIntersection": {
      const [[a, b], [c, d]] = command.lines.map((pair) => pair.map(point));
      const r = { x: b.x - a.x, y: b.y - a.y },
        s = { x: d.x - c.x, y: d.y - c.y };
      const lengths = Math.hypot(r.x, r.y) * Math.hypot(s.x, s.y);
      if (Math.hypot(r.x, r.y) < 0.5 || Math.hypot(s.x, s.y) < 0.5)
        reject("직선의 두 점이 같습니다");
      const cross = r.x * s.y - r.y * s.x;
      // 반 도 안쪽으로 나란하면 평행
      if (Math.abs(cross) < Math.sin((0.5 * Math.PI) / 180) * lengths)
        reject("두 직선이 평행합니다");
      const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / cross;
      const at = { x: fmt(a.x + t * r.x), y: fmt(a.y + t * r.y) };
      if (!ctx.inside(at)) reject("교점이 그림 밖입니다");
      return addDot(ctx, at, command.label);
    }
  }
}

/** 점 더하기(addPoint) 그대로 — 같은 점·같은 라벨 자리. */
function addDot(ctx: FigureShapeContext, at: XY, label?: string) {
  const result = ctx.edit(ctx.svg, [
    { op: "addPoint", ...at, ...(label ? { label } : {}) },
  ]);
  if (result.rejected.length) ctx.reject(reasonOf(result.rejected[0]));
  return { svg: result.svg, text: ctx.label };
}

/** 그림 글자 크기 — 새 글자가 따르는 값(applyFigureEdits 의 addText 와 같다). 없으면 편집기 글자 도구의 18. */
const firstFontSize = (objects: readonly FigureObject[]) =>
  objects
    .filter((o) => o.type === "text")
    .map((o) => Number.parseFloat(o.attrs["font-size"] ?? ""))
    .find((value) => Number.isFinite(value) && value > 0) ?? 18;

/** 결과 줄에 쓰는 요소 이름 — 요청 때 있던 요소면 번호와 함께(«1번 원»), 앞 명령이 만든 것이면 이름만. */
function nameIn(ctx: FigureShapeContext, o: FigureObject) {
  const index = ctx.before.findIndex((b) => b.id === o.id);
  return index >= 0 ? ctx.nameOf(index) : objectName(o);
}

/** 그림에 있는 원 가운데 중심·반지름이 같은 것(그림 좌표). */
function circleAt(svg: string, center: XY, radius: number, close: number) {
  const nodes = [...readFigureSvg(svg).querySelectorAll("[data-object-id]")];
  for (const [i, o] of figureObjects(svg).entries()) {
    if (o.type !== "circle") continue;
    const matrix = elementMatrix(nodes[i]);
    const c = xy(applyPoint(matrix, [number(o, "cx"), number(o, "cy")]));
    const r = number(o, "r") * scaleOf(matrix);
    if (distance(c, center) <= close && Math.abs(r - radius) <= close)
      return { o, center: c, radius: r };
  }
  return null;
}

/** 그림에 있는 선분 가운데 두 끝이 p·q 인 것(그림 좌표, 차례 무관). */
function segmentBetween(svg: string, p: XY, q: XY, close: number) {
  const nodes = [...readFigureSvg(svg).querySelectorAll("[data-object-id]")];
  return figureObjects(svg).find((o, i) => {
    if (o.type !== "line") return false;
    const matrix = elementMatrix(nodes[i]);
    const a = xy(applyPoint(matrix, [number(o, "x1"), number(o, "y1")])),
      b = xy(applyPoint(matrix, [number(o, "x2"), number(o, "y2")]));
    return (
      (distance(a, p) <= close && distance(b, q) <= close) ||
      (distance(a, q) <= close && distance(b, p) <= close)
    );
  });
}

const RESIZABLE = new Set(["circle", "ellipse", "rect", "polygon"]);

/** 크기 — 가운데는 그대로. 원은 반지름으로도. 크기 고정·선을 따라가는 면은 거절(편집기 조절점과 같은 규칙). */
function resize(
  command: Extract<FigureShapeCommand, { op: "resize" }>,
  ctx: FigureShapeContext,
) {
  const { svg, reject } = ctx;
  const id = ctx.before[command.target - 1].id;
  const o =
    figureObjects(svg).find((item) => item.id === id) ??
    reject("앞 명령에서 지웠습니다");
  if (isTiedFace(o)) reject("선을 따라가는 면은 선을 옮기면 따라옵니다");
  if (!RESIZABLE.has(o.type)) reject("원·타원·사각형·다각형만 크기를 바꿉니다");
  if (isSizeLocked(o)) reject("크기 고정이라 모양을 바꾸지 않았습니다");
  const matrix: Affine = elementMatrix(nodeOf(svg, id));
  const scale = scaleOf(matrix);
  let factor: number, text: string;
  if (command.r !== undefined) {
    if (o.type !== "circle") reject("반지름은 원에만 바꿉니다");
    const old = number(o, "r") * scale;
    if (!(old > 0)) reject("반지름을 읽지 못했습니다");
    factor = command.r / old;
    text = `${ctx.label} 반지름 ${tenth(old)} → ${command.r}`;
  } else {
    factor = command.scale!;
    text = `${ctx.label} 크기 ${command.scale}배`;
  }
  if (Math.abs(factor - 1) < 1e-6) reject("크기가 그대로입니다");

  const attrs: Record<string, string> = {};
  let corners: [number, number][];
  // 가운데는 그대로 — 원·타원은 중심, 사각형은 상자 가운데, 다각형은 점들의 상자 가운데
  if (o.type === "circle" || o.type === "ellipse") {
    const cx = number(o, "cx"),
      cy = number(o, "cy");
    const keys = o.type === "circle" ? ["r"] : ["rx", "ry"];
    for (const key of keys) attrs[key] = String(fmt(number(o, key) * factor));
    const rx = Number(attrs[keys[0]]),
      ry = Number(attrs[keys.at(-1)!]);
    corners = [
      [cx - rx, cy],
      [cx + rx, cy],
      [cx, cy - ry],
      [cx, cy + ry],
    ];
  } else if (o.type === "rect") {
    const x = number(o, "x"),
      y = number(o, "y"),
      w = number(o, "width"),
      h = number(o, "height");
    const nw = fmt(w * factor),
      nh = fmt(h * factor);
    const nx = fmt(x + (w - nw) / 2),
      ny = fmt(y + (h - nh) / 2);
    Object.assign(attrs, {
      x: String(nx),
      y: String(ny),
      width: String(nw),
      height: String(nh),
    });
    for (const key of ["rx", "ry"])
      if (o.attrs[key] !== undefined)
        attrs[key] = String(fmt(number(o, key) * factor));
    corners = [
      [nx, ny],
      [nx + nw, ny + nh],
      [nx + nw, ny],
      [nx, ny + nh],
    ];
  } else {
    // 다각형 — 점 차례 그대로 상자 가운데에 대해(삼각형·평행사변형의 노란 점 모양도 닮은꼴로 남는다)
    const points = parsePoints(o.attrs.points);
    if (points.length < 2) reject("꼭짓점을 읽지 못했습니다");
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2,
      cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const scaled = points.map((p) => ({
      x: fmt(cx + (p.x - cx) * factor),
      y: fmt(cy + (p.y - cy) * factor),
    }));
    attrs.points = formatPoints(scaled);
    corners = scaled.map((p): [number, number] => [p.x, p.y]);
  }
  if (!corners.every((p) => ctx.inside(xy(applyPoint(matrix, p)))))
    reject("그림 밖으로 나갑니다");
  return { svg: editFigureObject(svg, id, attrs), text };
}

/** 선 위의 점인가 — 채우기 통이 칸을 정하지 못하는 자리. */
function onBoundary(
  objects: ReturnType<typeof faceSourceObjects>,
  p: XY,
  tolerance: number,
) {
  for (const curve of faceCurves(objects)) {
    const points = curve.closed
      ? [...curve.points, curve.points[0]]
      : curve.points;
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i],
        b = points[i + 1];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
      if (Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) <= tolerance)
        return true;
    }
  }
  return false;
}

/**
 * 색칠 — 편집기 채우기 통(`bucketFill`)을 칸마다 한 번씩 누른 것과 같다.
 * - 칸 안의 점 하나: 그 자리를 누른 것.
 * - 꼭짓점들(삼각형 ABC): 선이 가른 칸 가운데 안쪽 점이 그 다각형 안인 것들 — 넓이를 합쳐 다각형과 같을 때만
 *   (안쪽 선이 칸을 나눴으면 칸마다 면 하나씩, 손으로 칸마다 누른 것처럼). 선이 두르지 않았으면 거절.
 */
function fillRegion(
  command: Extract<FigureShapeCommand, { op: "fillRegion" }>,
  ctx: FigureShapeContext,
  point: (ref: FigureEditPointRef) => XY,
) {
  const { reject } = ctx;
  const color = command.color ?? DEFAULT_FACE_FILL;
  const objects = faceSourceObjects(ctx.svg);
  const tolerance = faceTolerance(ctx.svg);
  let seeds: XY[];
  if (Array.isArray(command.at)) {
    const corners = command.at.map(point);
    const area = Math.abs(ringArea(corners));
    if (area < 1) reject("꼭짓점이 한 직선 위에 있습니다");
    const cells = boundedFaces(
      arrangeFaceCurves(faceCurves(objects), tolerance),
    )
      .map((cell) => ({ cell, seed: interiorPoint(cell.outer, cell.holes) }))
      .filter(({ seed }) => pointInRegion(seed, corners));
    const covered = cells.reduce((sum, { cell }) => sum + cell.area, 0);
    if (!cells.length || Math.abs(covered - area) > 0.03 * area)
      reject(FACE_REASONS.open);
    seeds = cells.map(({ seed }) => seed);
  } else {
    const at = point(command.at);
    if (onBoundary(objects, at, tolerance))
      reject("선 위의 점이라 칠할 칸을 정할 수 없습니다");
    seeds = [at];
  }
  let svg = ctx.svg,
    created = 0,
    recolored = 0;
  for (const seed of seeds) {
    const result = bucketFill(svg, seed, color);
    if (result.notice) reject(result.notice);
    if (figureObjects(svg).some((o) => o.id === result.id)) recolored++;
    else created++;
    svg = result.svg;
  }
  const notes = [
    created > 1 ? `면 ${created}개` : "",
    recolored ? (created ? `색 변경 ${recolored}개` : "색 변경") : "",
  ].filter(Boolean);
  return {
    svg,
    text: notes.length ? `${ctx.label}(${notes.join(" · ")})` : ctx.label,
  };
}
