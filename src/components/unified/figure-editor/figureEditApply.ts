import {
  FigureEditCommandSchema,
  type FigureEditCommand,
  type FigureEditPointRef,
} from "@/lib/dev-ai/figure-edit-contract";
import {
  addFigureObject,
  editFigureObject,
  figureNumbers,
  figureObjects,
  readFigureSvg,
  removeFigureObject,
} from "./figureSvgEditing";
import { transformFigureSelection } from "./figureClipboard";
import { moveFigureHandle } from "./figureHandles";
import { blocksSizeChange, isMoveHandle, isSizeLocked } from "./figureSizeLock";
import { isTiedFace } from "./figureFaceEditing";
import { SHAPE_ATTR } from "./figureShapeAdjust";
import { figureLabelSummary } from "./FigureLabelInput";
import {
  describeFigureForEdit,
  figureEditVertices,
  figurePointNames,
} from "./figureEditElements";
import { objectName } from "./figureObjectNames";
import {
  applyShapeCommand,
  isShapeCommand,
  shapeCommandLabel,
} from "./figureShapeOps";
import {
  applyLineCircleCommand,
  isLineCircleCommand,
  lineCircleCommandLabel,
} from "./figureLineCircleOps";
import { figureAngleKinds } from "./figureObjectGroups";
import {
  applyPoint,
  applyVector,
  elementMatrix,
  invert,
  parentMatrix,
  round2,
  type Point,
} from "./figureEditGeometry";
import { BENT_ACROSS, bentCurveReason, flipFigureCurve } from "./figureFlip";
import {
  figureGroupNames,
  ORDER_LABELS,
  ORDER_NONE,
  orderBlock,
  orderFigureSelection,
  withGroupMates,
  type OrderBox,
} from "./figureOrder";
import {
  mirrorBlock,
  mirrorFigureSelection,
  type MirrorAxis,
} from "./figureMirror";
import {
  ANGLE_MARK_RADIUS,
  ANGLE_MARK_WIDTH,
  angleMarkCorner,
  angleMarkPath,
  innerAngleArcs,
  outerMarkRadii,
  sameAngle,
} from "./figureAngleMark";
import {
  addFigureMark,
  figureMarkLabel,
  isFigureMarkCommand,
} from "./figureMarks";
import {
  addAngleSizeLabel,
  addFigureLabel,
  figureLabelOpLabel,
  isFigureLabelCommand,
  relocateFigureLabel,
} from "./figureLabelOps";

type FigureObject = ReturnType<typeof figureObjects>[number];

export interface FigureEditApplyResult {
  /** 명령을 모두 적용한 그림 — 편집기가 한 번에 넘긴다(되돌리기 한 번). 적용한 것이 없으면 받은 그림 그대로. */
  svg: string;
  /** 적용한 명령 — «7번 선분 삭제», «글자 A 위로 이동» … */
  applied: string[];
  /** 적용 못 한 명령과 이유 — «3번 선분: 크기 고정이라 모양을 바꾸지 않았습니다» … */
  rejected: string[];
  /** 요약 한 줄 — 적용한 것을 «·»로 잇는다. */
  summary: string;
}

/** 편집기 점선 칸과 같은 값(FigureEditor 서식 칸). */
const DASH = "5 4";
const INK = "#111111";

const DIRECTIONS = [
  "오른쪽으로",
  "오른쪽 아래로",
  "아래로",
  "왼쪽 아래로",
  "왼쪽으로",
  "왼쪽 위로",
  "위로",
  "오른쪽 위로",
];
/** 그림 좌표는 y 가 아래로 자란다 — 8방향 가운데 가까운 쪽. */
const direction = (dx: number, dy: number) =>
  DIRECTIONS[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];

const labelOf = (o: FigureObject) =>
  figureLabelSummary(o.attrs["data-mj"] ?? o.text);
/** 새로 넣는 글의 이름 — 있는 요소와 같은 함수(`objectName`)로 «수식»·«글자». */
const textKind = (text: string) =>
  objectName({ type: "text", attrs: {}, text });

class Rejected extends Error {}
function reject(reason: string): never {
  throw new Rejected(reason);
}

/**
 * «요청대로 고치기»(원장님 2026-09-19) — AI 가 돌려준 수정 명령을 지금 그림에 적용한다. 편집기의 기존 편집 함수만 쓴다
 * (지우기 · 옮기기 · 조절점 · 서식 · 요소 더하기). 명령에 없는 요소는 건드리지 않는다.
 * - 번호는 **요청을 보낼 때의 그림** 기준이다 — 앞 명령이 요소를 지워도 뒤 명령의 «3번»은 처음 그림의 3번이다.
 *   번호는 그리는 차례가 아니라 요소에 붙은 **고정 번호**(`figureNumbers`, 원장님 2026-09-21 «순서를 바꿔도 요소 번호가
 *   안바뀌게») — 요소 목록·그림 위 번호표·AI 자료 목록과 같은 값이다. 맨 뒤로 보낸 «5번»도 5번이다.
 * - 크기 고정(트랙 3) 요소는 옮기기·서식만 받고 모양 바꾸기는 거절한다.
 * - 도형·변환(원 · 호 · 크기 · 90° 회전 · 색칠 · 수선 · 중점 · 교점)은 figureShapeOps.ts — 편집기 도구·단추와 같은 함수로.
 * - 대칭(`mirror`)은 편집기 «좌우 대칭»·«상하 대칭» 단추와 같은 함수(figureMirror.ts) — 축은 세로·가로 또는 두 점이
 *   정하는 직선이고, 그 두 점은 요소 목록의 0.1 반올림이 아니라 그림의 점 그대로(`figurePointNames`) 쓴다.
 * - 선을 따라가는 면(트랙 4)은 스스로 옮기지 않는다 — 선을 고치면 편집기 `commit` 의 `syncFigureFaces` 가 따라오게 한다.
 *   삼각형·평행사변형(`data-shape`)은 꼭짓점 하나만 옮기지 않는다(노란 점이 모양을 지킨다).
 * - 표지 속성(크기 고정 · 면 · 글자 배경 · 모양)은 건드리지 않는다 — 명령이 바꾸는 속성만 고친다.
 * - 좌표는 그림 좌표(루트 viewBox)이고 그림 둘레 1/4 까지만 받는다.
 * - 뒤집기(`flip`)는 곡선을 두 끝을 잇는 현에 대해 대칭하고 딸린 값 글자를 따라 옮긴다(figureFlip.ts). 곡선의 점을
 *   하나씩 옮겨(`point`) 곡선이 현을 가로질러 꺾이거나 스스로 엇갈리면 그 곡선의 점 옮기기를 모두 거절한다
 *   (원장님 2026-09-19 «치수선 고치기가 제대로 안 되네.» — 조용히 망가진 그림을 내지 않는다).
 * - 각 표시(`addAngle`)는 엔진·편집기와 같은 모양(figureAngleMark.ts) — 크기·굵기는 그림에 있는 각 표시를 따르고,
 *   이미 표시가 있는 각에는 다시 달지 않는다.
 */
export function applyFigureEdits(
  svg: string,
  commands: readonly unknown[],
  options: {
    /**
     * 요소 id → 화면 상자(편집기 `measureOrderBoxes`) — 순서 명령의 «한 칸»이 편집기 단추처럼 겹치는 것만 센다.
     * 없으면 문서 한 칸(상자를 못 잰 요소는 겹친다고 본다, figureOrder.ts).
     */
    boxes?: ReadonlyMap<string, OrderBox>;
  } = {},
): FigureEditApplyResult {
  const figure = describeFigureForEdit(svg);
  const before = figureObjects(svg);
  // 번호 → 요소(요청을 보낼 때의 그림). 번호를 쓰는 자리가 모두 `figureNumbers` 한 함수를 읽는다.
  const numbers = figureNumbers(svg);
  const byNumber = new Map(before.map((o) => [numbers.get(o.id)!, o]));
  const numbered = (n: number) => byNumber.get(n);
  const [vx, vy, width, height] = figure.viewBox;
  const inside = ({ x, y }: { x: number; y: number }) =>
    x >= vx - width / 4 &&
    x <= vx + width * 1.25 &&
    y >= vy - height / 4 &&
    y <= vy + height * 1.25;
  // 이름 붙은 점은 **정확한** 자리로 — 요소 목록(`figure.names`)은 0.1 로 반올림해 싣는다(모델에게 보내는 값).
  // 그 반올림한 값으로 그으면 엔진이 그린 같은 그림과 0.05 어긋난다(각의 크기 글자가 그만큼 밀렸다, 2026-09-20).
  const names = new Map(
    figurePointNames(svg).map(({ name, x, y }) => [name, { x, y }]),
  );
  const firstFontSize = before
    .filter((o) => o.type === "text")
    .map((o) => Number.parseFloat(o.attrs["font-size"] ?? ""))
    .find((size) => Number.isFinite(size) && size > 0);
  // 결과 줄의 이름은 편집기 요소 목록·보낸 요소 목록과 같은 함수(`objectName`) — 각 표시는 직각·예각·둔각
  const angles = figureAngleKinds(before, figure.viewBox);
  // 요청 때 있던 요소면 번호와 함께(«5번 다각형»), 앞 명령이 만든 것이면 이름만. 글은 번호 대신 내용(«글자 A»).
  const nameOf = (o: FigureObject) => {
    const n = numbers.get(o.id);
    return o.type === "text"
      ? `${objectName(o, angles)} ${labelOf(o)}`
      : n === undefined
        ? objectName(o, angles)
        : `${n}번 ${objectName(o, angles)}`;
  };
  const nodeOf = (source: string, id: string) =>
    [...readFigureSvg(source).querySelectorAll("[data-object-id]")].find(
      (node) => node.getAttribute("data-object-id") === id,
    )!;
  const resolve = (ref: FigureEditPointRef) => {
    if (typeof ref === "string")
      return (
        names.get(ref) ?? reject(`점 이름 ${ref} — 그림에서 찾지 못했습니다`)
      );
    return inside(ref) ? ref : reject("좌표가 그림 밖입니다");
  };
  // 대칭축의 점은 요소 목록의 0.1 반올림이 아니라 **그림의 점 그대로** 쓴다 — 축이 0.01 만 어긋나도 비친 그림이
  // 통째로 밀린다. 이제 `names` 자체가 `figurePointNames` 라(위 주석) 따로 둘 이유가 없다 — 한 벌로 합쳤다.
  const exactPoint = resolve;
  const addText = (
    source: string,
    text: string,
    at: { x: number; y: number },
  ) => {
    const added = addFigureObject(source, "text", at, at, text);
    return editFigureObject(added.svg, added.id, {
      "text-anchor": "middle",
      "dominant-baseline": "central",
      ...(firstFontSize ? { "font-size": String(firstFontSize) } : {}),
    });
  };

  // 곡선(경로)의 점 옮기기는 한 곡선 몫을 한꺼번에 미리 적용해 본다 — 현을 가로질러 꺾이거나 스스로 엇갈리면 그 곡선의
  // 점 옮기기를 모두 거절한다(원장님 2026-09-19: 치수 호의 틈 두 끝만 아래로 옮겨 두 조각으로 꺾였다). 기준은 figureFlip.ts.
  const bent = new Map<number, { message: string; reported: boolean }>();
  const moves = new Map<number, { vertex: number; x: number; y: number }[]>();
  for (const raw of commands) {
    const checked = FigureEditCommandSchema.safeParse(raw);
    if (!checked.success || checked.data.op !== "point") continue;
    if (!numbered(checked.data.target)) continue;
    moves.set(checked.data.target, [
      ...(moves.get(checked.data.target) ?? []),
      checked.data,
    ]);
  }
  for (const [target, list] of moves) {
    const o = numbered(target)!;
    if (o.type !== "path" || !/[QTCSA]/i.test(o.attrs.d ?? "")) continue;
    // 면·모양·크기 고정은 적용할 때 제 이유로 거절된다
    if (isTiedFace(o) || o.attrs[SHAPE_ATTR] || isSizeLocked(o)) continue;
    const vertices = figureEditVertices(o);
    const inverse = invert(elementMatrix(nodeOf(svg, o.id)));
    if (!inverse) continue;
    let trial = svg;
    const moved: number[] = [];
    for (const move of list) {
      const vertex = vertices[move.vertex - 1];
      if (!vertex || !inside(move)) continue;
      const [x, y] = applyPoint(inverse, [move.x, move.y]);
      trial = moveFigureHandle(trial, o.id, vertex.key, {
        x: round2(x),
        y: round2(y),
      });
      moved.push(move.vertex);
    }
    const after = figureObjects(trial).find((t) => t.id === o.id)?.attrs.d;
    const reason = moved.length && after && bentCurveReason(o.attrs.d, after);
    if (reason)
      bent.set(target, {
        message: `꼭짓점 ${moved.join("·")} 이동 — ${reason}. 적용하지 않았습니다${
          reason === BENT_ACROSS ? "(반대쪽으로는 뒤집기)" : ""
        }`,
        reported: false,
      });
  }

  // 여럿을 한꺼번에 가리키는 명령(대칭)의 번호 풀기 — 번호는 **요청을 보낼 때의 그림** 기준이다.
  const targetIds = (
    targets: number[] | "all",
    objects: readonly { id: string }[],
  ): string[] => {
    if (targets === "all") return objects.map((o) => o.id);
    const missing = targets.find((n) => !numbered(n));
    if (missing)
      reject(
        targets.length === 1
          ? "그런 번호의 요소가 없습니다"
          : `${missing}번 — 그런 번호의 요소가 없습니다`,
      );
    const present = new Set(objects.map((o) => o.id));
    const ids = [...new Set(targets)]
      .map((n) => numbered(n)!.id)
      .filter((id) => present.has(id));
    if (!ids.length) reject("앞 명령에서 지웠습니다");
    return ids;
  };
  /** 여럿을 가리키는 명령의 이름 — 회전(`shapeCommandLabel`)과 같은 말. */
  const targetsLabel = (targets: number[] | "all") =>
    targets === "all"
      ? "그림 전체"
      : targets.length === 1
        ? numbered(targets[0])
          ? nameOf(numbered(targets[0])!)
          : `${targets[0]}번`
        : `${targets.length}개 요소`;

  let current = svg;
  const applied: string[] = [];
  const rejected: string[] = [];
  // 표시·글자 모듈이 거절 이유에 쓰는 요소 이름 — 요소 목록과 같은 함수(`objectName`)
  const labelContext = {
    resolve,
    nameOf: (id: string) => {
      const o = before.find((item) => item.id === id);
      return o ? nameOf(o) : undefined;
    },
  };
  const applyOne = (
    command: FigureEditCommand,
    label: string,
  ): { svg: string; text: string } => {
    // 도형·변환과 직선·원은 같은 문맥을 쓴다(figureShapeOps.ts `FigureShapeContext`)
    const geometry = () => ({
      svg: current,
      sent: svg,
      before,
      numbered,
      viewBox: figure.viewBox,
      label,
      nameOf,
      resolve,
      inside,
      reject,
      edit: applyFigureEdits,
    });
    if (isShapeCommand(command)) return applyShapeCommand(command, geometry());
    // 연장 · 평행선 · 수직이등분선 · 각의 이등분선 · 접선 · 외접원 · 내접원 · 원의 교점 · 호의 중점
    if (isLineCircleCommand(command))
      return applyLineCircleCommand(command, geometry());
    // 치수 · 같은 길이 표시 · 평행 표시 — 엔진과 같은 모양(figureMarks.ts)
    if (isFigureMarkCommand(command)) {
      const mark = addFigureMark(current, command, {
        resolve,
        names: [...names.values()],
        nameOf: labelContext.nameOf,
      });
      return "reason" in mark ? reject(mark.reason) : mark;
    }
    // 점 이름 — 엔진 꼭짓점 라벨 자리 규칙(figureLabelOps.ts)
    if (isFigureLabelCommand(command)) {
      const added = addFigureLabel(current, command, labelContext);
      return "reason" in added ? reject(added.reason) : added;
    }
    if (command.op === "addLine") {
      const from = resolve(command.from),
        to = resolve(command.to);
      const added = addFigureObject(
        current,
        command.arrow ? "arrow" : "line",
        from,
        to,
      );
      const kind = command.arrow ? "화살표" : "선분";
      return {
        svg: command.dashed
          ? editFigureObject(added.svg, added.id, {
              "stroke-dasharray": DASH,
            })
          : added.svg,
        text:
          typeof command.from === "string" && typeof command.to === "string"
            ? `${kind} ${command.from}–${command.to} 추가`
            : `${kind} 추가`,
      };
    }
    if (command.op === "addText") {
      if (!inside(command)) reject("좌표가 그림 밖입니다");
      return { svg: addText(current, command.text, command), text: label };
    }
    if (command.op === "addPoint") {
      if (!inside(command)) reject("좌표가 그림 밖입니다");
      const dot = addFigureObject(current, "circle", command, {
        x: command.x + 3,
        y: command.y,
      });
      let next = editFigureObject(dot.svg, dot.id, {
        fill: INK,
        stroke: "",
        "stroke-width": "",
      });
      if (command.label)
        next = addText(next, command.label, {
          x: command.x + 10,
          y: command.y - 10,
        });
      return { svg: next, text: label };
    }
    if (command.op === "addAngle") {
      const at = resolve(command.at),
        from = resolve(command.from),
        to = resolve(command.to);
      const point = ({ x, y }: { x: number; y: number }): Point => [x, y];
      // 지금 그림(앞 명령이 더한 각 표시까지)의 각 표시 — 크기·굵기를 따르고, 같은 각에 두 번 달지 않는다
      const objects = figureObjects(current);
      const kinds = figureAngleKinds(objects, figure.viewBox);
      const nodes = [
        ...readFigureSvg(current).querySelectorAll("[data-object-id]"),
      ];
      const marks = objects.flatMap((o, i) => {
        const corner = kinds.has(o.id)
          ? angleMarkCorner(o, elementMatrix(nodes[i]))
          : null;
        return corner ? [{ o, corner }] : [];
      });
      const middle = (values: number[]) =>
        [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const arcs = command.arcs ?? 1;
      const mark = angleMarkPath({
        at: point(at),
        from: point(from),
        to: point(to),
        // 겹 호는 호로 그린다 — 직각 ㄱ자는 겹으로 하지 않는다(엔진: right 면 arcs 는 1)
        right: command.right ?? (arcs > 1 ? false : undefined),
        perspective: command.right === true && command.perspective === true,
        // 이웃 크기 — 꼭짓점마다 바깥 호만(겹 호의 안쪽 호가 끌어내리지 않게).
        // 이웃이 없으면 엔진과 같은 22 — 틀 크기로 줄이지 않는다(figureAngleMark.ts `ANGLE_MARK_RADIUS`).
        radius: marks.length
          ? middle(outerMarkRadii(marks.map((m) => m.corner)))
          : ANGLE_MARK_RADIUS,
      });
      if ("reason" in mark) reject(mark.reason);
      const twin = marks.find((m) =>
        sameAngle(m.corner, point(at), point(from), point(to)),
      );
      // 크기 글자(`text`)는 **이미 표시가 있는 각에도** 적는다 — «각 B 에 40°» 는 호를 하나 더 그리라는 말이 아니다.
      // 글자 없이 같은 각을 다시 달라고 하면 전처럼 거절한다(트랙 18 규칙).
      if (twin && !command.text) {
        reject(
          `이미 각 표시가 있습니다(${numbers.has(twin.o.id) ? nameOf(twin.o) : objectName(twin.o, kinds)})`,
        );
      }
      const widths = marks
        .map((m) => Number.parseFloat(m.o.attrs["stroke-width"] ?? ""))
        .filter((value) => value > 0);
      const color = marks
        .map((m) => m.o.attrs.stroke?.trim())
        .find((value) => value && /^#[\da-f]{3,6}$/i.test(value));
      if (arcs > 1 && mark.right) reject("직각 표시는 겹으로 하지 않습니다");
      let next = current;
      const detail: string[] = [];
      // 글자만 더하는 길이면 표시는 그대로 두고 그 표시의 반지름을 쓴다(지시선이 그 호에서 시작한다)
      let radius = twin?.corner.radius ?? 0;
      if (!twin) {
        const inner = innerAngleArcs(mark.d, arcs, {
          at: point(at),
          from: point(from),
          to: point(to),
        });
        if ("reason" in inner) return reject(inner.reason);
        // 호마다 요소 하나(엔진 이중 호처럼) — 바깥 호부터
        const ids: string[] = [];
        for (const d of [mark.d, ...inner]) {
          const added = addFigureObject(next, "curve", at, to);
          ids.push(added.id);
          next = editFigureObject(added.svg, added.id, {
            d,
            stroke: color ?? INK,
            "stroke-width": String(
              widths.length ? middle(widths) : ANGLE_MARK_WIDTH,
            ),
          });
        }
        const kind = figureAngleKinds(figureObjects(next), figure.viewBox).get(
          ids[0],
        );
        if (kind) detail.push(kind);
        if (arcs > 1) detail.push(`${arcs}겹`);
        radius =
          angleMarkCorner(
            { type: "path", attrs: { d: mark.d } },
            [1, 0, 0, 1, 0, 0],
          )?.radius ?? ANGLE_MARK_RADIUS;
      }
      // 각의 크기 글자(원장님 2026-09-20 «각 B 에 40° 표시») — 엔진 자리 규칙은 figureLabelOps.ts
      if (command.text) {
        const written = addAngleSizeLabel(
          next,
          { at: point(at), from: point(from), to: point(to), radius },
          command.text,
          labelContext,
        );
        if ("reason" in written) reject(written.reason);
        next = written.svg;
        if (written.leader) detail.push("지시선");
      }
      return {
        svg: next,
        text: detail.length ? `${label}(${detail.join(", ")})` : label,
      };
    }
    // 대칭 — 편집기 «좌우 대칭»·«상하 대칭» 단추와 같은 함수(figureMirror.ts). 여럿은 한 덩어리로.
    if (command.op === "mirror") {
      const objects = figureObjects(current);
      const ids = targetIds(command.targets, objects);
      const axis: MirrorAxis =
        typeof command.axis === "string"
          ? command.axis
          : (command.axis.map((ref) => {
              const { x, y } = exactPoint(ref);
              return [x, y];
            }) as [Point, Point]);
      // 끄는 이유는 편집기 단추가 꺼지는 이유 그대로(크기 고정 · 면만 · 세로·가로에 글자 하나만 · 축의 두 점이 같음)
      const blocked = mirrorBlock(objects, ids, axis);
      if (blocked) reject(blocked.replace(/\.$/, ""));
      const mirrored = mirrorFigureSelection(current, ids, axis);
      if (mirrored === current) reject("대칭할 것이 없습니다");
      const named =
        typeof command.axis !== "string" &&
        command.axis.every((ref) => typeof ref === "string")
          ? ` ${command.axis.join("")}`
          : "";
      return {
        svg: mirrored,
        text: `${label} ${
          command.axis === "vertical"
            ? "좌우"
            : command.axis === "horizontal"
              ? "상하"
              : `직선${named}`
        } 대칭`,
      };
    }
    // 순서 — 편집기 «맨 앞으로·앞으로·뒤로·맨 뒤로» 단추와 같은 함수(figureOrder.ts). 가리킨 요소가 묶음에 들었으면
    // 묶음 전부(캔버스에서 누를 때와 같다). 끄는 이유·«겹친 것 없음»도 단추 알림과 같은 말.
    if (command.op === "order") {
      const objects = figureObjects(current);
      const ids = withGroupMates(objects, targetIds(command.targets, objects));
      const blocked = orderBlock(objects, ids, command.to);
      if (blocked) reject(blocked.replace(/\.$/, ""));
      const moved = orderFigureSelection(current, ids, command.to, {
        groups: figureGroupNames(objects),
        boxes: options.boxes,
      });
      if (moved === current)
        reject(
          (ORDER_NONE[command.to] ?? "옮길 곳이 없습니다").replace(/\.$/, ""),
        );
      return { svg: moved, text: `${label} ${ORDER_LABELS[command.to]}` };
    }
    const id = numbered(command.target)!.id;
    const object = figureObjects(current).find((o) => o.id === id);
    if (!object) return reject("앞 명령에서 지웠습니다");
    if (command.op === "delete")
      return {
        svg: removeFigureObject(current, id),
        text: `${label} 삭제`,
      };
    const tied = isTiedFace(object);
    const following = "선을 따라가는 면은 선을 옮기면 따라옵니다";
    if (command.op === "flip") {
      // 거절 규칙(곡선만 · 각 표시 · 면 · 크기 고정)은 편집기 단추와 같게 flipFigureCurve 안에 있다
      const flipped = flipFigureCurve(current, id);
      if ("reason" in flipped) return reject(flipped.reason);
      const value = flipped.labelId
        ? figureObjects(current).find((o) => o.id === flipped.labelId)
        : undefined;
      return {
        svg: flipped.svg,
        text: `${label} 반대쪽으로 뒤집기${
          value ? `(${objectName(value, angles)} ${labelOf(value)} 함께)` : ""
        }`,
      };
    }
    if (command.op === "relabel") {
      // 이미 있는 점 이름을 선·다른 글자에서 비켜 세운다 — 더하기와 같은 자리 규칙(figureLabelOps.ts)
      const placed = relocateFigureLabel(current, id, command.position);
      if ("reason" in placed) return reject(placed.reason);
      if (!placed.moved) reject("이미 제자리입니다");
      return { svg: placed.svg, text: `${label} 자리 고침` };
    }
    if (command.op === "move") {
      if (tied) reject(following);
      if (Math.abs(command.dx) > width || Math.abs(command.dy) > height)
        reject("옮기는 거리가 그림보다 큽니다");
      if (!command.dx && !command.dy) reject("옮길 거리가 없습니다");
      const node = nodeOf(current, id);
      const inverse =
        invert(parentMatrix(node)) ?? reject("변환 때문에 옮길 수 없습니다");
      const [lx, ly] = applyVector(inverse, [command.dx, command.dy]);
      const previous = node.getAttribute("transform")?.trim();
      return {
        svg: transformFigureSelection(current, [
          {
            id,
            transform: `translate(${round2(lx)} ${round2(ly)})${previous ? ` ${previous}` : ""}`,
          },
        ]),
        text: `${label} ${direction(command.dx, command.dy)} 이동`,
      };
    }
    if (command.op === "text") {
      if (object.type !== "text") reject("글자 요소가 아닙니다");
      return {
        svg: editFigureObject(current, id, {}, command.text),
        text: `${objectName(object, angles)} ${labelOf(object)} → ${figureLabelSummary(command.text)}`,
      };
    }
    if (command.op === "style") {
      const attrs: Record<string, string> = {};
      const changes: string[] = [];
      const text = object.type === "text";
      if (text && (command.width !== undefined || command.dashed !== undefined))
        reject("선 두께·점선은 선에만 바꿉니다");
      if (text && command.fill !== undefined)
        reject("채우기는 도형에만 바꿉니다");
      if (!text && command.fontSize !== undefined)
        reject("글자 크기는 글자에만 바꿉니다");
      if (command.dashed !== undefined) {
        attrs["stroke-dasharray"] = command.dashed ? DASH : "";
        changes.push(command.dashed ? "점선" : "실선");
      }
      if (command.color !== undefined) {
        attrs[text ? "fill" : "stroke"] = command.color;
        changes.push("색");
      }
      if (command.width !== undefined) {
        attrs["stroke-width"] = String(command.width);
        changes.push("두께");
      }
      if (command.fill !== undefined) {
        attrs.fill = command.fill;
        changes.push("채우기");
      }
      if (command.fontSize !== undefined) {
        attrs["font-size"] = String(command.fontSize);
        changes.push("글자 크기");
      }
      if (blocksSizeChange(object, attrs))
        reject("크기 고정이라 모양을 바꾸지 않았습니다");
      return {
        svg: editFigureObject(current, id, attrs),
        text: `${label} 서식 변경(${changes.join("·")})`,
      };
    }
    // point — 꼭짓점·끝점 옮기기
    if (tied) reject(following);
    if (object.attrs[SHAPE_ATTR])
      reject("모양을 지키는 도형이라 꼭짓점을 따로 옮기지 않았습니다");
    if (!inside(command)) reject("좌표가 그림 밖입니다");
    const vertices = figureEditVertices(object);
    if (!vertices.length) reject("옮길 꼭짓점이 없습니다");
    if (command.vertex > vertices.length)
      reject(`꼭짓점은 ${vertices.length}개뿐입니다`);
    const { key } = vertices[command.vertex - 1];
    if (isSizeLocked(object) && !isMoveHandle(key))
      reject("크기 고정이라 모양을 바꾸지 않았습니다");
    const inverse =
      invert(elementMatrix(nodeOf(current, id))) ??
      reject("변환 때문에 옮길 수 없습니다");
    const [x, y]: Point = applyPoint(inverse, [command.x, command.y]);
    return {
      svg: moveFigureHandle(current, id, key, { x: round2(x), y: round2(y) }),
      text: `${label} ${
        object.type === "line"
          ? command.vertex === 1
            ? "시작점"
            : "끝점"
          : `꼭짓점 ${command.vertex}`
      } 이동`,
    };
  };
  for (const raw of commands) {
    const checked = FigureEditCommandSchema.safeParse(raw);
    if (!checked.success) {
      rejected.push("형식이 맞지 않는 명령");
      continue;
    }
    const command: FigureEditCommand = checked.data;
    let label: string;
    if ("target" in command) {
      const o = numbered(command.target);
      if (!o) {
        rejected.push(`${command.target}번: 그런 번호의 요소가 없습니다`);
        continue;
      }
      label = nameOf(o);
    } else if (command.op === "mirror" || command.op === "order")
      label = targetsLabel(command.targets);
    else if (isShapeCommand(command))
      label = shapeCommandLabel(command, numbered, nameOf);
    else if (isLineCircleCommand(command))
      label = lineCircleCommandLabel(command);
    else if (isFigureMarkCommand(command)) label = figureMarkLabel(command);
    else if (isFigureLabelCommand(command)) label = figureLabelOpLabel(command);
    else
      label =
        command.op === "addLine"
          ? command.arrow
            ? "화살표 추가"
            : "선분 추가"
          : command.op === "addText"
            ? `${textKind(command.text)} ${figureLabelSummary(command.text)} 추가`
            : command.op === "addAngle"
              ? (() => {
                  const named = [command.from, command.at, command.to].every(
                    (ref) => typeof ref === "string",
                  )
                    ? `각 ${command.from}${command.at}${command.to}`
                    : "각";
                  return command.text
                    ? `${named} 에 ${figureLabelSummary(command.text)} 표시 추가`
                    : `${named} 표시 추가`;
                })()
              : command.label
                ? `점 ${command.label} 추가`
                : "점 추가";
    const bend = command.op === "point" && bent.get(command.target);
    if (bend) {
      // 한 곡선의 점 옮기기는 한 줄로 알린다
      if (!bend.reported) rejected.push(`${label}: ${bend.message}`);
      bend.reported = true;
      continue;
    }
    try {
      const result = applyOne(command, label);
      current = result.svg;
      applied.push(result.text);
      // 이번 요청에서 새로 이름 붙은 점(중점 M · 수선의 발 H · 교점 O · 점 P)은 뒤 명령이 이름으로 부른다
      // («M 은 AB 의 중점» = 중점 찍기 + 같은 길이 표시 둘). 요청 때 있던 이름은 그대로.
      if (!("target" in command))
        for (const { name, x, y } of describeFigureForEdit(current).names ?? [])
          if (!names.has(name)) names.set(name, { x, y });
    } catch (error) {
      if (!(error instanceof Rejected)) throw error;
      rejected.push(`${label}: ${error.message}`);
    }
  }
  return {
    svg: current,
    applied,
    rejected,
    summary: applied.length ? applied.join(" · ") : "바꾼 것 없음",
  };
}
