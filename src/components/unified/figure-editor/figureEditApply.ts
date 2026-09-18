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
import { figureLabelSummary, isFigureMathLabel } from "./FigureLabelInput";
import {
  describeFigureForEdit,
  figureEditKind,
  figureEditVertices,
} from "./figureEditElements";
import {
  applyPoint,
  applyVector,
  elementMatrix,
  invert,
  parentMatrix,
  round2,
  type Point,
} from "./figureEditGeometry";

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
const textKind = (text: string) => (isFigureMathLabel(text) ? "수식" : "글자");

class Rejected extends Error {}
function reject(reason: string): never {
  throw new Rejected(reason);
}

/**
 * «요청대로 고치기»(원장님 2026-09-19) — AI 가 돌려준 수정 명령을 지금 그림에 적용한다. 편집기의 기존 편집 함수만 쓴다
 * (지우기 · 옮기기 · 조절점 · 서식 · 요소 더하기). 명령에 없는 요소는 건드리지 않는다.
 * - 번호는 **요청을 보낼 때의 그림** 기준이다 — 앞 명령이 요소를 지워도 뒤 명령의 «3번»은 처음 그림의 3번이다.
 * - 크기 고정(트랙 3) 요소는 옮기기·서식만 받고 모양 바꾸기는 거절한다.
 * - 좌표는 그림 좌표(루트 viewBox)이고 그림 둘레 1/4 까지만 받는다.
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
  const nameOf = (index: number) => {
    const o = before[index];
    return o.type === "text"
      ? `${figureEditKind(o)} ${labelOf(o)}`
      : `${index + 1}번 ${figureEditKind(o)}`;
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

  let current = svg;
  const applied: string[] = [];
  const rejected: string[] = [];
  const applyOne = (
    command: FigureEditCommand,
    label: string,
  ): { svg: string; text: string } => {
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
    const id = before[command.target - 1].id;
    const object = figureObjects(current).find((o) => o.id === id);
    if (!object) return reject("앞 명령에서 지웠습니다");
    if (command.op === "delete")
      return {
        svg: removeFigureObject(current, id),
        text: `${label} 삭제`,
      };
    if (command.op === "move") {
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
        text: `${figureEditKind(object)} ${labelOf(object)} → ${figureLabelSummary(command.text)}`,
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
    } else
      label =
        command.op === "addLine"
          ? command.arrow
            ? "화살표 추가"
            : "선분 추가"
          : command.op === "addText"
            ? `${textKind(command.text)} ${figureLabelSummary(command.text)} 추가`
            : command.label
              ? `점 ${command.label} 추가`
              : "점 추가";
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
