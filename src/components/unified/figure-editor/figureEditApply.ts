import {
  FigureEditCommandSchema,
  type FigureEditCommand,
  type FigureEditPointRef,
} from "@/lib/dev-ai/figure-edit-contract";
import {
  addFigureObject,
  editFigureObject,
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
} from "./figureEditElements";
import { objectName } from "./figureObjectNames";
import {
  applyShapeCommand,
  isShapeCommand,
  shapeCommandLabel,
} from "./figureShapeOps";
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
 * - 크기 고정(트랙 3) 요소는 옮기기·서식만 받고 모양 바꾸기는 거절한다.
 * - 도형·변환(원 · 호 · 크기 · 90° 회전 · 색칠 · 수선 · 중점 · 교점)은 figureShapeOps.ts — 편집기 도구·단추와 같은 함수로.
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
): FigureEditApplyResult {
  const figure = describeFigureForEdit(svg);
  const before = figureObjects(svg);
  const [vx, vy, width, height] = figure.viewBox;
  const inside = ({ x, y }: { x: number; y: number }) =>
    x >= vx - width / 4 &&
    x <= vx + width * 1.25 &&
    y >= vy - height / 4 &&
    y <= vy + height * 1.25;
  const names = new Map(
    (figure.names ?? []).map(({ name, x, y }) => [name, { x, y }]),
  );
  const firstFontSize = before
    .filter((o) => o.type === "text")
    .map((o) => Number.parseFloat(o.attrs["font-size"] ?? ""))
    .find((size) => Number.isFinite(size) && size > 0);
  // 결과 줄의 이름은 편집기 요소 목록·보낸 요소 목록과 같은 함수(`objectName`) — 각 표시는 직각·예각·둔각
  const angles = figureAngleKinds(before, figure.viewBox);
  const nameOf = (index: number) => {
    const o = before[index];
    return o.type === "text"
      ? `${objectName(o, angles)} ${labelOf(o)}`
      : `${index + 1}번 ${objectName(o, angles)}`;
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
    if (checked.data.target > before.length) continue;
    moves.set(checked.data.target, [
      ...(moves.get(checked.data.target) ?? []),
      checked.data,
    ]);
  }
  for (const [target, list] of moves) {
    const o = before[target - 1];
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

  let current = svg;
  const applied: string[] = [];
  const rejected: string[] = [];
  const applyOne = (
    command: FigureEditCommand,
    label: string,
  ): { svg: string; text: string } => {
    if (isShapeCommand(command))
      return applyShapeCommand(command, {
        svg: current,
        sent: svg,
        before,
        viewBox: figure.viewBox,
        label,
        nameOf,
        resolve,
        inside,
        reject,
        edit: applyFigureEdits,
      });
    // 치수 · 같은 길이 표시 · 평행 표시 — 엔진과 같은 모양(figureMarks.ts)
    if (isFigureMarkCommand(command)) {
      const mark = addFigureMark(current, command, {
        resolve,
        names: figure.names ?? [],
        nameOf: (id) => {
          const index = before.findIndex((o) => o.id === id);
          return index < 0 ? undefined : nameOf(index);
        },
      });
      return "reason" in mark ? reject(mark.reason) : mark;
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
        // 이웃 크기 — 꼭짓점마다 바깥 호만(겹 호의 안쪽 호가 끌어내리지 않게)
        radius: marks.length
          ? middle(outerMarkRadii(marks.map((m) => m.corner)))
          : Math.min(ANGLE_MARK_RADIUS, 0.08 * Math.max(width, height)),
      });
      if ("reason" in mark) reject(mark.reason);
      const twin = marks.find((m) =>
        sameAngle(m.corner, point(at), point(from), point(to)),
      );
      if (twin) {
        const index = before.findIndex((o) => o.id === twin.o.id);
        reject(
          `이미 각 표시가 있습니다(${index >= 0 ? nameOf(index) : objectName(twin.o, kinds)})`,
        );
      }
      const widths = marks
        .map((m) => Number.parseFloat(m.o.attrs["stroke-width"] ?? ""))
        .filter((value) => value > 0);
      const color = marks
        .map((m) => m.o.attrs.stroke?.trim())
        .find((value) => value && /^#[\da-f]{3,6}$/i.test(value));
      if (arcs > 1 && mark.right) reject("직각 표시는 겹으로 하지 않습니다");
      const inner = innerAngleArcs(mark.d, arcs, {
        at: point(at),
        from: point(from),
        to: point(to),
      });
      if ("reason" in inner) return reject(inner.reason);
      // 호마다 요소 하나(엔진 이중 호처럼) — 바깥 호부터
      let next = current;
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
      const detail = [kind, arcs > 1 ? `${arcs}겹` : ""].filter(Boolean);
      return {
        svg: next,
        text: detail.length ? `${label}(${detail.join(", ")})` : label,
      };
    }
    const id = before[command.target - 1].id;
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
      const index = command.target - 1;
      if (index >= before.length) {
        rejected.push(`${command.target}번: 그런 번호의 요소가 없습니다`);
        continue;
      }
      label = nameOf(index);
    } else if (isShapeCommand(command))
      label = shapeCommandLabel(command, before, nameOf);
    else if (isFigureMarkCommand(command)) label = figureMarkLabel(command);
    else
      label =
        command.op === "addLine"
          ? command.arrow
            ? "화살표 추가"
            : "선분 추가"
          : command.op === "addText"
            ? `${textKind(command.text)} ${figureLabelSummary(command.text)} 추가`
            : command.op === "addAngle"
              ? [command.from, command.at, command.to].every(
                  (ref) => typeof ref === "string",
                )
                ? `각 ${command.from}${command.at}${command.to} 표시 추가`
                : "각 표시 추가"
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
