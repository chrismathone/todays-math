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
import { FRAME_PAD } from "./figureFrame";
import { widenToShow, type FigureShapeContext } from "./figureShapeOps";

/**
 * «요청대로 고치기» 동작 더하기 ④ — 직선·원(원장님 2026-09-20 «아직 없는 명령을 전부»).
 * 연장 · 평행선 · 수직이등분선 · 각의 이등분선 · 접선 · 외접원 · 내접원 · 원의 교점 · 호의 중점.
 * 적용 분기(figureEditApply.ts)는 한 줄로 여기에 넘기고, 문맥(FigureShapeContext)은 도형·변환과 같은 것을 쓴다.
 *
 * - **좌표는 코드가 계산한다.** 점은 이름으로 받고 외심·내심·접점·교점·중점은 여기서 푼다
 *   (모델이 지은 좌표를 믿지 않는다 — 트랙 21 규칙). 이름은 요소 목록의 0.1 반올림이 아니라
 *   그림의 점 그대로(`figurePointNames`).
 * - 새 요소는 편집기 도구가 짓는 것과 **같은 모양**이다 — 선은 다른 수정 명령(addLine · addPoint · addAngle)을
 *   그대로 불러 만들고(서식·중복 거절이 한 길이다), 원은 편집기 원 도구(`addFigureObject("circle")`)와 같다.
 *   **연장선만은 늘이는 선분의 서식을 그대로 베낀다** — 이어 붙은 자리에 굵기·색이 바뀌는 단이 지면 안 된다.
 * - **기본 길이는 그림 틀 안에서 정한다**(`roomAlong`). 무한 직선의 일부를 그리는 명령(연장 · 수직이등분선 ·
 *   각의 이등분선 · 원 위의 점에서 그은 접선)은 «보기 좋은 길이»를 상한으로 두고 틀 가장자리에서 여백만큼
 *   안쪽까지만 간다 — 틀을 넓혀 그림을 작게 만들지 않는다. 길이를 명시했거나(`length`) 끝을 정했으면(`until`)
 *   그대로 긋고, 틀 밖이면 도형·변환과 **같은 함수**로 틀을 넓힌다(`widenToShow` → `figureFrame.widenFrame`).
 * - 새로 계산한 좌표는 엔진처럼 소수 셋째 자리(figure_scene.py `_fmt`).
 */

type FigureObject = ReturnType<typeof figureObjects>[number];
type XY = { x: number; y: number };

const LINE_CIRCLE_OPS = [
  "extendLine",
  "addParallel",
  "addPerpendicularBisector",
  "addAngleBisector",
  "addTangent",
  "addCircumcircle",
  "addIncircle",
  "addCircleIntersection",
  "addArcMidpoint",
] as const;
export type FigureLineCircleCommand = Extract<
  FigureEditCommand,
  { op: (typeof LINE_CIRCLE_OPS)[number] }
>;
export const isLineCircleCommand = (
  command: FigureEditCommand,
): command is FigureLineCircleCommand =>
  (LINE_CIRCLE_OPS as readonly string[]).includes(command.op);

/** 편집기 점선 칸과 같은 값(figureEditApply.ts `DASH` · FigureEditor 서식 칸). */
const DASH = "5 4";
/** 엔진 `_fmt` — 소수 셋째 자리. */
const fmt = (value: number) => {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
};
const spot = (p: XY): XY => ({ x: fmt(p.x), y: fmt(p.y) });
/** 결과 줄에 적는 길이 — 요소 목록의 반지름 표기와 같은 소수 첫째 자리. */
const tenth = (value: number) => Math.round(value * 10) / 10;
const distance = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y);
const sub = (a: XY, b: XY): XY => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: XY, b: XY) => a.x * b.x + a.y * b.y;
const cross = (a: XY, b: XY) => a.x * b.y - a.y * b.x;
const along = (from: XY, u: XY, t: number): XY => ({
  x: from.x + u.x * t,
  y: from.y + u.y * t,
});
const lerp = (a: XY, b: XY, t: number): XY => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
/** 단위 벡터 — 길이 0 이면 null. */
const unit = (v: XY): XY | null => {
  const length = Math.hypot(v.x, v.y);
  return length > 0 ? { x: v.x / length, y: v.y / length } : null;
};
const number = (o: FigureObject, key: string) =>
  Number.parseFloat(o.attrs[key] ?? "") || 0;
const xy = ([x, y]: readonly number[]): XY => ({ x, y });
/** 거절 줄 «라벨: 이유» 에서 이유만(figureShapeOps 와 같다). */
const reasonOf = (line: string) => line.slice(line.indexOf(": ") + 2);
const refName = (ref: FigureEditPointRef) =>
  typeof ref === "string" ? ref : null;
const allNames = (refs: readonly FigureEditPointRef[]) =>
  refs.every((ref) => typeof ref === "string") ? refs.join("") : null;
/** 반 도 안쪽으로 나란하면 평행으로 본다(figureShapeOps 의 교점과 같은 눈금). */
const PARALLEL = Math.sin((0.5 * Math.PI) / 180);

/** 명령 이름 — 번호로 가리키는 명령이 없어 요소 목록을 보지 않는다. 결과 줄·거절 줄 앞머리. */
export function lineCircleCommandLabel(
  command: FigureLineCircleCommand,
): string {
  switch (command.op) {
    case "extendLine": {
      const from = refName(command.from),
        to = refName(command.to);
      return from && to
        ? `선분 ${from}${to} 를 ${to} 쪽으로 연장`
        : "선분 연장";
    }
    case "addParallel": {
      const through = refName(command.through),
        base = allNames(command.to);
      return through && base
        ? `${through} 를 지나 ${base} 에 평행한 직선 추가`
        : "평행한 직선 추가";
    }
    case "addPerpendicularBisector": {
      const ends = allNames([command.from, command.to]);
      return ends ? `${ends} 의 수직이등분선 추가` : "수직이등분선 추가";
    }
    case "addAngleBisector": {
      const names = allNames([command.from, command.at, command.to]);
      return names ? `각 ${names} 의 이등분선 추가` : "각의 이등분선 추가";
    }
    case "addTangent": {
      const centre = refName(command.circle);
      const circle = centre ? `원 ${centre}` : "원";
      const from = command.from === undefined ? null : refName(command.from);
      return from
        ? `점 ${from} 에서 ${circle} 에 그은 접선 추가`
        : `${circle} 의 접선 추가`;
    }
    case "addCircumcircle":
    case "addIncircle": {
      const kind = command.op === "addCircumcircle" ? "외접원" : "내접원";
      const names = allNames(command.points);
      return names ? `삼각형 ${names} 의 ${kind} 추가` : `${kind} 추가`;
    }
    case "addCircleIntersection": {
      const centre = refName(command.circle);
      const other = command.other === undefined ? null : refName(command.other);
      const line = command.line ? allNames(command.line) : null;
      const second =
        command.other !== undefined
          ? other
            ? `원 ${other}`
            : "다른 원"
          : line
            ? `직선 ${line}`
            : "직선";
      return `${centre ? `원 ${centre}` : "원"} 와 ${second} 의 교점 추가`;
    }
    case "addArcMidpoint": {
      const from = refName(command.from),
        to = refName(command.to);
      const via = command.via === undefined ? "" : (refName(command.via) ?? "");
      const name = command.label ? ` ${command.label}` : "";
      return from && to
        ? `호 ${from}${via}${to} 의 중점${name} 추가`
        : `호의 중점${name} 추가`;
    }
  }
}

/** 명령 하나를 지금 그림에 적용한다. 못 하면 `ctx.reject` 로 이유를 던진다(적용 목록에 «라벨: 이유» 한 줄). */
export function applyLineCircleCommand(
  command: FigureLineCircleCommand,
  ctx: FigureShapeContext,
): { svg: string; text: string } {
  const result = applyOne(command, ctx);
  return { ...result, svg: widenToShow(ctx.svg, result.svg) };
}

function applyOne(
  command: FigureLineCircleCommand,
  ctx: FigureShapeContext,
): { svg: string; text: string } {
  // 이름은 그림의 점 그대로 — 요소 목록(0.1 반올림)이 아니라(figureShapeOps 와 같은 규칙)
  const exact = new Map(
    figurePointNames(ctx.sent).map(({ name, x, y }) => [name, { x, y }]),
  );
  const point = (ref: FigureEditPointRef): XY =>
    (typeof ref === "string" ? exact.get(ref) : undefined) ?? ctx.resolve(ref);
  const [, , width, height] = ctx.viewBox;
  const size = Math.max(width, height);
  /** 같은 점으로 보는 거리 — 면 찾기 허용 오차(긴 변의 0.4%)와 같다. */
  const close = Math.max(0.5, 0.004 * size);
  /** 그려진 선 위인가를 보는 여유 — 표시 명령(figureMarks.ts)과 같은 눈금. */
  const tolerance = Math.max(1.5, 0.01 * size);
  const { svg, reject } = ctx;
  const parts = figureParts(svg);

  switch (command.op) {
    case "extendLine": {
      const from = point(command.from),
        to = point(command.to);
      const span = distance(from, to);
      if (span < 0.5) reject("두 점이 같습니다");
      const u = unit(sub(to, from))!;
      const source =
        drawnAlong(straightEdges(parts), from, to, tolerance) ??
        reject("그림에 없는 선분입니다");
      let reach: number;
      if (command.until !== undefined) {
        const reached = Array.isArray(command.until)
          ? meetLine(from, u, command.until.map(point) as [XY, XY], ctx)
          : onRay(from, u, point(command.until), command.until, tolerance, ctx);
        if (reached <= span + close) reject("연장 쪽에서 만나지 않습니다");
        reach = reached - span;
      } else if (command.length !== undefined) reach = command.length;
      else {
        // 기본은 그 선분 길이의 1/3 — 틀 안 여백까지만(틀을 넓혀 그림을 작게 만들지 않는다)
        const want = span / 3;
        reach = Math.min(want, roomAlong(ctx.viewBox, to, u));
        if (reach < want / 5) reject("그림 틀 안에 연장할 자리가 없습니다");
      }
      const end = spot(along(to, u, reach));
      if (!ctx.inside(end)) reject("연장선이 그림 밖입니다");
      const added = addFigureObject(svg, "line", spot(to), end);
      // 늘이는 선분의 서식 그대로 — 이어 붙은 자리에 단이 지지 않게
      const dash = command.dashed
        ? DASH
        : (source.o.attrs["stroke-dasharray"] ?? "");
      return {
        svg: editFigureObject(added.svg, added.id, {
          stroke: source.o.attrs.stroke ?? "",
          "stroke-width": source.o.attrs["stroke-width"] ?? "",
          "stroke-dasharray": dash === "none" ? "" : dash,
        }),
        text: `${ctx.label}(길이 ${tenth(reach)})`,
      };
    }

    case "addParallel": {
      const through = point(command.through);
      const [p, q] = command.to.map(point);
      const base = distance(p, q);
      if (base < 0.5) reject("직선의 두 점이 같습니다");
      const u = unit(sub(q, p))!;
      const foot = along(p, u, dot(sub(through, p), u));
      if (distance(through, foot) < close) reject("그 점이 직선 위에 있습니다");
      const [a, b] =
        command.length === undefined
          ? // 기준 선분을 그대로 평행이동 — 길이도 자리도 «BC 를 A 로 옮긴 것»
            [p, q].map((corner) => ({
              x: corner.x + through.x - foot.x,
              y: corner.y + through.y - foot.y,
            }))
          : [
              along(through, u, -command.length / 2),
              along(through, u, command.length / 2),
            ];
      return addSegment(ctx, parts, spot(a), spot(b), close, {
        dashed: command.dashed,
        outside: "평행선이 그림 밖입니다",
        twin: "같은 평행선이 이미 있습니다",
      });
    }

    case "addPerpendicularBisector": {
      const from = point(command.from),
        to = point(command.to);
      const span = distance(from, to);
      if (span < 0.5) reject("두 점이 같습니다");
      const u = unit(sub(to, from))!;
      const normal: XY = { x: -u.y, y: u.x };
      const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      const want = span / 2;
      const back = Math.min(
        want,
        roomAlong(ctx.viewBox, middle, { x: -normal.x, y: -normal.y }),
      );
      const forth = Math.min(want, roomAlong(ctx.viewBox, middle, normal));
      if (back + forth < span / 5) reject("그림 틀 안에 그을 자리가 없습니다");
      const a = spot(along(middle, normal, -back)),
        b = spot(along(middle, normal, forth));
      const line = addSegment(ctx, parts, a, b, close, {
        dashed: command.dashed,
        outside: "수직이등분선이 그림 밖입니다",
        twin: "수직이등분선이 이미 있습니다",
      });
      const notes: string[] = [];
      let next = line.svg;
      if (command.label) {
        const named = ctx.edit(next, [
          { op: "addPoint", ...spot(middle), label: command.label },
        ]);
        if (named.rejected.length)
          notes.push(`중점 안 찍음 — ${reasonOf(named.rejected[0])}`);
        else notes.push(`중점 ${command.label}`);
        next = named.svg;
      }
      // 직각 표시는 각 표시 더하기(addAngle) 그대로 — 이웃 크기·굵기를 따르고 중복이면 스스로 거절한다
      const mark = ctx.edit(next, [
        {
          op: "addAngle",
          at: spot(middle),
          from,
          to: back >= forth ? a : b,
          right: true,
        },
      ]);
      if (mark.rejected.length)
        notes.push(`직각 표시 안 함 — ${reasonOf(mark.rejected[0])}`);
      return {
        svg: mark.svg,
        text: notes.length ? `${ctx.label}(${notes.join(", ")})` : ctx.label,
      };
    }

    case "addAngleBisector": {
      const vertex = point(command.at);
      const first = point(command.from),
        second = point(command.to);
      const arms = [distance(vertex, first), distance(vertex, second)];
      if (Math.min(...arms) < 0.5) reject("변의 끝이 꼭짓점과 같습니다");
      const u1 = unit(sub(first, vertex))!,
        u2 = unit(sub(second, vertex))!;
      const sum: XY = { x: u1.x + u2.x, y: u1.y + u2.y };
      // |u1 + u2| = 2 cos(각/2) — 179° 를 넘으면 이등분선 방향을 정할 수 없다(트랙 18 평각 눈금과 같다)
      if (Math.hypot(sum.x, sum.y) < 2 * Math.cos((89.5 * Math.PI) / 180))
        reject("평각이라 이등분선을 그을 수 없습니다");
      if (dot(u1, u2) > Math.cos((1 * Math.PI) / 180))
        reject("두 변이 겹칩니다");
      const w = unit(sum)!;
      let reach: number;
      if (command.until) {
        reach = meetLine(vertex, w, command.until.map(point) as [XY, XY], ctx, {
          parallel: "그 직선과 만나지 않습니다",
        });
        if (reach <= close) reject("그 직선과 만나지 않습니다");
      } else {
        const want = Math.min(...arms);
        reach = Math.min(want, roomAlong(ctx.viewBox, vertex, w));
        if (reach < want / 5) reject("그림 틀 안에 그을 자리가 없습니다");
      }
      const end = spot(along(vertex, w, reach));
      const line = addSegment(ctx, parts, spot(vertex), end, close, {
        dashed: command.dashed,
        outside: "이등분선이 그림 밖입니다",
        twin: "같은 이등분선이 이미 있습니다",
      });
      if (!command.label) return line;
      const named = ctx.edit(line.svg, [
        { op: "addPoint", ...end, label: command.label },
      ]);
      if (named.rejected.length) reject(reasonOf(named.rejected[0]));
      return {
        svg: named.svg,
        text: `${ctx.label}(${command.until ? "교점" : "끝점"} ${command.label})`,
      };
    }

    case "addTangent":
      return addTangent(command, ctx, parts, point, close);

    case "addCircumcircle":
    case "addIncircle": {
      const [p1, p2, p3] = command.points.map(point);
      const twice = cross(sub(p2, p1), sub(p3, p1));
      if (Math.abs(twice) < Math.max(1, 0.0002 * size * size))
        reject("세 점이 한 직선 위에 있습니다");
      const { centre, radius } =
        command.op === "addCircumcircle"
          ? circumcircle(p1, p2, p3)
          : incircle(p1, p2, p3, Math.abs(twice));
      return addCircle(ctx, parts, centre, radius, close, size, {
        dashed: command.dashed,
        label: command.label,
        note: "중심",
      });
    }

    case "addCircleIntersection": {
      const first = circleAround(parts, point(command.circle), close, ctx);
      let crossings: XY[];
      if (command.other !== undefined) {
        const second = circleAround(parts, point(command.other), close, ctx);
        const gap = distance(first.centre, second.centre);
        if (gap < close && Math.abs(first.radius - second.radius) < close)
          reject("두 원이 같습니다");
        if (gap > first.radius + second.radius + close)
          reject("두 원이 만나지 않습니다");
        if (gap < Math.abs(first.radius - second.radius) - close)
          reject("한 원이 다른 원 안에 있습니다");
        const reach =
          (gap * gap + first.radius ** 2 - second.radius ** 2) / (2 * gap);
        const half = Math.sqrt(Math.max(0, first.radius ** 2 - reach * reach));
        const u = unit(sub(second.centre, first.centre))!;
        crossings = bothSides(along(first.centre, u, reach), u, half, close);
      } else {
        const [p, q] = command.line!.map(point);
        if (distance(p, q) < 0.5) reject("직선의 두 점이 같습니다");
        const u = unit(sub(q, p))!;
        const foot = along(p, u, dot(sub(first.centre, p), u));
        const gap = distance(foot, first.centre);
        if (gap > first.radius + close) reject("직선이 원과 만나지 않습니다");
        const half = Math.sqrt(Math.max(0, first.radius ** 2 - gap * gap));
        crossings = bothSides(foot, { x: -u.y, y: u.x }, half, close).reverse();
      }
      let next = svg;
      const named: string[] = [];
      for (const [index, crossing] of crossings.entries()) {
        const at = spot(crossing);
        if (!ctx.inside(at)) reject("교점이 그림 밖입니다");
        const name = command.labels?.[index];
        const added = ctx.edit(next, [
          { op: "addPoint", ...at, ...(name ? { label: name } : {}) },
        ]);
        if (added.rejected.length) reject(reasonOf(added.rejected[0]));
        next = added.svg;
        if (name) named.push(name);
      }
      return {
        svg: next,
        text: `${ctx.label}(${named.length ? named.join("·") : `${crossings.length}개`})`,
      };
    }

    case "addArcMidpoint": {
      let centre = point(command.center);
      const from = point(command.from),
        to = point(command.to);
      const r1 = distance(centre, from),
        r2 = distance(centre, to);
      if (Math.min(r1, r2) < 0.5) reject("호의 끝이 중심과 같습니다");
      if (Math.abs(r1 - r2) > 0.05 * Math.max(r1, r2))
        reject("두 끝이 중심에서 같은 거리가 아닙니다");
      // 그림에 그 원이 있으면 그 원 위에 — 끝점이 셋째 자리로 반올림돼도 반지름이 원과 같다(addArc 와 같은 규칙)
      const drawn = circleNear(parts, centre, r1, close);
      if (drawn) centre = drawn.centre;
      const radius = drawn?.radius ?? r1;
      const TURN = 2 * Math.PI;
      const angle = (p: XY) => Math.atan2(p.y - centre.y, p.x - centre.x);
      const wrap = (value: number) => ((value % TURN) + TURN) % TURN;
      const start = angle(from);
      const forward = wrap(angle(to) - start);
      const EPSILON = (0.5 * Math.PI) / 180;
      if (forward < EPSILON || forward > TURN - EPSILON)
        reject("두 끝이 같은 자리입니다");
      let sweep: boolean;
      if (command.via !== undefined) {
        const via = point(command.via);
        if (distance(via, centre) < 0.5) reject("지나는 점이 중심입니다");
        sweep = wrap(angle(via) - start) < forward;
      } else {
        if (Math.abs(forward - Math.PI) < EPSILON)
          reject("반원이라 어느 쪽 호인지 정할 수 없습니다");
        sweep = forward < Math.PI;
      }
      const half = (sweep ? forward : forward - TURN) / 2;
      const at = spot({
        x: centre.x + radius * Math.cos(start + half),
        y: centre.y + radius * Math.sin(start + half),
      });
      if (!ctx.inside(at)) reject("호의 중점이 그림 밖입니다");
      const added = ctx.edit(svg, [
        {
          op: "addPoint",
          ...at,
          ...(command.label ? { label: command.label } : {}),
        },
      ]);
      if (added.rejected.length) reject(reasonOf(added.rejected[0]));
      return { svg: added.svg, text: ctx.label };
    }
  }
}

// ── 접선 ───────────────────────────────────────────────────────────────
function addTangent(
  command: Extract<FigureLineCircleCommand, { op: "addTangent" }>,
  ctx: FigureShapeContext,
  parts: readonly Part[],
  point: (ref: FigureEditPointRef) => XY,
  close: number,
): { svg: string; text: string } {
  const { reject } = ctx;
  const { centre, radius } = circleAround(
    parts,
    point(command.circle),
    close,
    ctx,
  );
  const ref = command.at ?? command.from!;
  const from = point(ref);
  const gap = distance(from, centre);
  if (gap < 0.5) reject("점이 원의 중심입니다");
  /** 원 위로 끌어다 놓기 — 이름 붙은 점이 셋째 자리로 반올림돼 반지름과 0.001 어긋난다. */
  const onCircle = (p: XY) => along(centre, unit(sub(p, centre))!, radius);
  if (command.at !== undefined && Math.abs(gap - radius) > close)
    reject("그 점이 원 위에 있지 않습니다");
  if (command.from !== undefined && gap < radius - close)
    reject("점이 원 안에 있어 접선이 없습니다");

  // 접점 — 원 위의 점이면 그 점, 밖의 점이면 코드가 둘을 계산한다(접선의 길이 √(d²−r²))
  const single = Math.abs(gap - radius) <= close;
  const reach = radius ** 2 / gap;
  const height =
    (radius * Math.sqrt(Math.max(0, gap * gap - radius ** 2))) / gap;
  const toPoint = unit(sub(from, centre))!;
  const touches = single
    ? [onCircle(from)]
    : bothSides(along(centre, toPoint, reach), toPoint, height, close);

  let next = ctx.svg;
  const notes: string[] = [];
  const named: string[] = [];
  let drewRadius = false;
  for (const [index, raw] of touches.entries()) {
    const touch = spot(raw);
    let mark: XY;
    if (single) {
      // 원 위의 점에서는 접점 양쪽으로 — 교과서 접선은 원 지름만 한 폭이다(반지름의 0.8배씩)
      const u: XY = { x: -toPoint.y, y: toPoint.x };
      const want = 0.8 * radius;
      const back = Math.min(
        want,
        roomAlong(ctx.viewBox, touch, { x: -u.x, y: -u.y }),
      );
      const forth = Math.min(want, roomAlong(ctx.viewBox, touch, u));
      if (back + forth < 0.4 * radius)
        reject("그림 틀 안에 접선을 그을 자리가 없습니다");
      const a = spot(along(touch, u, -back)),
        b = spot(along(touch, u, forth));
      next = addSegment(ctx, parts, a, b, close, {
        dashed: command.dashed,
        outside: "접선이 그림 밖입니다",
        twin: "같은 접선이 이미 있습니다",
        svg: next,
      }).svg;
      mark = back >= forth ? a : b;
    } else {
      // 밖의 점에서는 그 점부터 접점까지 — «접선의 길이»가 보이게
      next = addSegment(ctx, parts, spot(from), touch, close, {
        dashed: command.dashed,
        outside: "접선이 그림 밖입니다",
        twin: "같은 접선이 이미 있습니다",
        svg: next,
      }).svg;
      mark = spot(from);
      const name = command.labels?.[index];
      if (name) {
        const added = ctx.edit(next, [
          { op: "addPoint", ...touch, label: name },
        ]);
        if (added.rejected.length) reject(reasonOf(added.rejected[0]));
        next = added.svg;
        named.push(name);
      }
    }
    if (!command.rightAngle) continue;
    // 접선 ⊥ 반지름을 보이려면 반지름이 있어야 한다 — 없으면 같이 긋는다(교과서 그림)
    if (!segmentBetween(figureParts(next), centre, touch, close)) {
      const line = ctx.edit(next, [
        { op: "addLine", from: spot(centre), to: touch },
      ]);
      if (line.rejected.length) reject(reasonOf(line.rejected[0]));
      next = line.svg;
      drewRadius = true;
    }
    const angle = ctx.edit(next, [
      { op: "addAngle", at: touch, from: spot(centre), to: mark, right: true },
    ]);
    if (angle.rejected.length)
      notes.push(`직각 표시 안 함 — ${reasonOf(angle.rejected[0])}`);
    next = angle.svg;
  }
  if (named.length) notes.unshift(`접점 ${named.join("·")}`);
  if (drewRadius) {
    const centreName = refName(command.circle);
    const touchName = command.at === undefined ? null : refName(command.at);
    notes.unshift(
      centreName && touchName ? `반지름 ${centreName}${touchName}` : "반지름",
    );
  }
  if (command.rightAngle && !notes.some((note) => note.startsWith("직각")))
    notes.push("직각 표시");
  return {
    svg: next,
    text: notes.length ? `${ctx.label}(${notes.join(", ")})` : ctx.label,
  };
}

// ── 기하 ───────────────────────────────────────────────────────────────
/** 외심 — 세 변의 수직이등분선이 만나는 점(행렬식 꼴). */
function circumcircle(p1: XY, p2: XY, p3: XY) {
  const d =
    2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
  const s = [p1, p2, p3].map((p) => p.x * p.x + p.y * p.y);
  const centre = {
    x: (s[0] * (p2.y - p3.y) + s[1] * (p3.y - p1.y) + s[2] * (p1.y - p2.y)) / d,
    y: (s[0] * (p3.x - p2.x) + s[1] * (p1.x - p3.x) + s[2] * (p2.x - p1.x)) / d,
  };
  return { centre, radius: distance(centre, p1) };
}

/** 내심 — 대변 길이로 가중한 무게중심. 반지름은 넓이 ÷ 반둘레. */
function incircle(p1: XY, p2: XY, p3: XY, twiceArea: number) {
  const a = distance(p2, p3),
    b = distance(p3, p1),
    c = distance(p1, p2);
  const perimeter = a + b + c;
  return {
    centre: {
      x: (a * p1.x + b * p2.x + c * p3.x) / perimeter,
      y: (a * p1.y + b * p2.y + c * p3.y) / perimeter,
    },
    radius: twiceArea / perimeter,
  };
}

/**
 * 가운데에서 법선 양쪽으로 — 두 원·원과 직선의 교점, 밖의 점에서 그은 두 접점이 같은 차례를 쓴다.
 * 첫째는 기준 방향을 화면에서 시계 방향으로 90° 돈 쪽(y 가 아래인 그림 좌표). 닿기만 하면 한 점.
 */
function bothSides(base: XY, direction: XY, height: number, close: number) {
  if (height < close) return [base];
  const normal: XY = { x: -direction.y, y: direction.x };
  return [along(base, normal, height), along(base, normal, -height)];
}

/** from 에서 u 방향 반직선이 직선 [p, q] 와 만나는 거리 — 평행하거나 두 점이 같으면 거절. */
function meetLine(
  from: XY,
  u: XY,
  [p, q]: [XY, XY],
  ctx: FigureShapeContext,
  reasons: { parallel?: string } = {},
) {
  const s = sub(q, p);
  const length = Math.hypot(s.x, s.y);
  if (length < 0.5) ctx.reject("직선의 두 점이 같습니다");
  const denominator = cross(u, s);
  if (Math.abs(denominator) < PARALLEL * length)
    ctx.reject(reasons.parallel ?? "연장선과 평행합니다");
  return cross(sub(p, from), s) / denominator;
}

/** until 로 준 점까지의 거리 — 그 점이 직선 위에 있어야 한다. */
function onRay(
  from: XY,
  u: XY,
  target: XY,
  ref: FigureEditPointRef,
  tolerance: number,
  ctx: FigureShapeContext,
) {
  if (Math.abs(cross(u, sub(target, from))) > tolerance) {
    const name = refName(ref);
    ctx.reject(
      `${name ? `점 ${name} 가 ` : "그 점이 "}연장선 위에 있지 않습니다`,
    );
  }
  return dot(sub(target, from), u);
}

/**
 * from 에서 u 방향으로 그림 틀(여백 pad) 안에 남은 거리 — «기본 길이»를 여기까지로 줄인다.
 * 길이를 명시하지 않은 직선(연장 · 이등분선 · 접선)이 틀을 넓혀 그림을 작게 만들지 않게(2026-09-20 결정).
 */
function roomAlong(
  viewBox: readonly [number, number, number, number],
  from: XY,
  u: XY,
  pad = FRAME_PAD,
) {
  const [vx, vy, width, height] = viewBox;
  let best = Infinity;
  for (const [value, step, low, high] of [
    [from.x, u.x, vx + pad, vx + width - pad],
    [from.y, u.y, vy + pad, vy + height - pad],
  ] as const) {
    if (Math.abs(step) < 1e-12) continue;
    best = Math.min(best, (step > 0 ? high - value : low - value) / step);
  }
  return Number.isFinite(best) ? Math.max(0, best) : 0;
}

// ── 그림 읽기 ───────────────────────────────────────────────────────────
interface Part {
  o: FigureObject;
  matrix: Affine;
}
const figureParts = (svg: string): Part[] => {
  const nodes = [...readFigureSvg(svg).querySelectorAll("[data-object-id]")];
  return figureObjects(svg).map((o, index) => ({
    o,
    matrix: elementMatrix(nodes[index]),
  }));
};

interface Edge {
  a: XY;
  b: XY;
  o: FigureObject;
}
/** 그려진 곧은 잉크 — 선분·꺾은선·다각형·사각형의 변(그림 좌표). 연장할 선분과 그 서식을 여기서 찾는다. */
function straightEdges(parts: readonly Part[]): Edge[] {
  const edges: Edge[] = [];
  for (const { o, matrix } of parts) {
    const put = (points: XY[], closed: boolean) => {
      const list = closed ? [...points, points[0]] : points;
      for (let i = 0; i + 1 < list.length; i++)
        edges.push({
          a: xy(applyPoint(matrix, [list[i].x, list[i].y])),
          b: xy(applyPoint(matrix, [list[i + 1].x, list[i + 1].y])),
          o,
        });
    };
    if (o.type === "line")
      put(
        [
          { x: number(o, "x1"), y: number(o, "y1") },
          { x: number(o, "x2"), y: number(o, "y2") },
        ],
        false,
      );
    else if (o.type === "polygon" || o.type === "polyline") {
      const points = (o.attrs.points ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .flatMap((x, i, all) =>
          i % 2 || i + 1 >= all.length ? [] : [{ x, y: all[i + 1] }],
        );
      if (points.length > 1) put(points, o.type === "polygon");
    } else if (o.type === "rect") {
      const x = number(o, "x"),
        y = number(o, "y"),
        w = number(o, "width"),
        h = number(o, "height");
      if (w > 0 && h > 0)
        put(
          [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
          ],
          true,
        );
    }
  }
  return edges;
}

const onEdge = (edge: Edge, p: XY, tolerance: number) => {
  const length = distance(edge.a, edge.b);
  if (!(length > 0)) return false;
  const u = unit(sub(edge.b, edge.a))!;
  const t = dot(sub(p, edge.a), u);
  return (
    Math.abs(cross(u, sub(p, edge.a))) <= tolerance &&
    t >= -tolerance &&
    t <= length + tolerance
  );
};

/**
 * 선분 a–b 가 그림에 그려져 있나 — 한 변이든 이어 붙은 변들이든(중점 M 으로 나뉜 AM·MB),
 * 선분 위 다섯 자리가 다 변 위(표시 명령 figureMarks.ts 의 `drawn` 과 같은 규칙).
 * 돌려주는 것은 가운데를 담은 변 — 연장선이 그 서식을 그대로 베낀다.
 */
function drawnAlong(edges: readonly Edge[], a: XY, b: XY, tolerance: number) {
  const covered = [0.02, 0.25, 0.5, 0.75, 0.98].every((t) =>
    edges.some((edge) => onEdge(edge, lerp(a, b, t), tolerance)),
  );
  if (!covered) return null;
  return edges.find((edge) => onEdge(edge, lerp(a, b, 0.5), tolerance)) ?? null;
}

/** 그림에 있는 선분 가운데 두 끝이 p·q 인 것(그림 좌표, 차례 무관) — 같은 선을 두 번 긋지 않는다. */
function segmentBetween(parts: readonly Part[], p: XY, q: XY, close: number) {
  return parts.find(({ o, matrix }) => {
    if (o.type !== "line") return false;
    const a = xy(applyPoint(matrix, [number(o, "x1"), number(o, "y1")])),
      b = xy(applyPoint(matrix, [number(o, "x2"), number(o, "y2")]));
    return (
      (distance(a, p) <= close && distance(b, q) <= close) ||
      (distance(a, q) <= close && distance(b, p) <= close)
    );
  })?.o;
}

/** 그림에 있는 원(그림 좌표) — 중심과 반지름. */
const circlesOf = (parts: readonly Part[]) =>
  parts.flatMap(({ o, matrix }) =>
    o.type === "circle"
      ? [
          {
            o,
            centre: xy(applyPoint(matrix, [number(o, "cx"), number(o, "cy")])),
            radius: number(o, "r") * scaleOf(matrix),
          },
        ]
      : [],
  );

/** 중심이 그 점인 원 — 하나여야 한다(겹친 동심원은 어느 쪽인지 알 수 없다). */
function circleAround(
  parts: readonly Part[],
  centre: XY,
  close: number,
  ctx: FigureShapeContext,
) {
  const found = circlesOf(parts).filter(
    (circle) => distance(circle.centre, centre) <= close,
  );
  if (!found.length) ctx.reject("중심이 그 점인 원이 없습니다");
  if (found.length > 1) ctx.reject("중심이 같은 원이 둘 이상입니다");
  return found[0];
}

/** 중심·반지름이 같은 원(그림 좌표). */
const circleNear = (
  parts: readonly Part[],
  centre: XY,
  radius: number,
  close: number,
) =>
  circlesOf(parts).find(
    (circle) =>
      distance(circle.centre, centre) <= close &&
      Math.abs(circle.radius - radius) <= close,
  );

/** 결과 줄에 쓰는 요소 이름 — 요청 때 있던 요소면 번호와 함께(«1번 원»), 앞 명령이 만든 것이면 이름만. */
function nameIn(ctx: FigureShapeContext, o: FigureObject) {
  const index = ctx.before.findIndex((before) => before.id === o.id);
  return index >= 0 ? ctx.nameOf(index) : objectName(o);
}

// ── 새 요소 ─────────────────────────────────────────────────────────────
/** 새 선분 — 선분 더하기(addLine) 그대로(편집기 선 도구와 같은 서식·같은 거절). */
function addSegment(
  ctx: FigureShapeContext,
  parts: readonly Part[],
  a: XY,
  b: XY,
  close: number,
  options: {
    dashed?: boolean;
    outside: string;
    twin: string;
    svg?: string;
  },
) {
  if (!ctx.inside(a) || !ctx.inside(b)) ctx.reject(options.outside);
  const source = options.svg ?? ctx.svg;
  const twin = segmentBetween(
    options.svg ? figureParts(source) : parts,
    a,
    b,
    close,
  );
  if (twin) ctx.reject(`${options.twin}(${nameIn(ctx, twin)})`);
  const added = ctx.edit(source, [
    {
      op: "addLine",
      from: a,
      to: b,
      ...(options.dashed ? { dashed: true } : {}),
    },
  ]);
  if (added.rejected.length) ctx.reject(reasonOf(added.rejected[0]));
  return { svg: added.svg, text: ctx.label };
}

/** 새 원 — 편집기 원 도구(드래그: 중심 → 원 위의 점)와 같은 요소(addCircle 과 같은 길). */
function addCircle(
  ctx: FigureShapeContext,
  parts: readonly Part[],
  raw: XY,
  rawRadius: number,
  close: number,
  size: number,
  options: { dashed?: boolean; label?: string; note: string },
) {
  const centre = spot(raw);
  const radius = fmt(rawRadius);
  if (radius < 0.5) ctx.reject("반지름이 0 입니다");
  if (radius > size) ctx.reject("반지름이 그림보다 큽니다");
  if (!ctx.inside(centre)) ctx.reject("중심이 그림 밖입니다");
  const twin = circleNear(parts, centre, radius, close);
  if (twin) ctx.reject(`같은 원이 이미 있습니다(${nameIn(ctx, twin.o)})`);
  const added = addFigureObject(ctx.svg, "circle", centre, {
    x: centre.x + radius,
    y: centre.y,
  });
  let next = editFigureObject(added.svg, added.id, {
    r: String(radius),
    ...(options.dashed ? { "stroke-dasharray": DASH } : {}),
  });
  if (!options.label) return { svg: next, text: ctx.label };
  const named = ctx.edit(next, [
    { op: "addPoint", ...centre, label: options.label },
  ]);
  if (named.rejected.length) ctx.reject(reasonOf(named.rejected[0]));
  next = named.svg;
  return { svg: next, text: `${ctx.label}(${options.note} ${options.label})` };
}
