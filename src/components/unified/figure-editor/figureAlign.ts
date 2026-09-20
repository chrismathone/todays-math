/**
 * 고른 요소를 **서로 맞추기**(정렬)와 **고르게 벌리기** — 원장님 2026-09-21
 * «요소별 각종 정렬 기능 넣어줄 수 있으면 넣어줘. 왼쪽 정렬, 가운데 정렬, 우측 정렬, 중앙 정렬 등등».
 *
 * 기준은 **고른 것들의 바깥 상자**다(그림 틀이 아니다) — 왼쪽 맞추기는 고른 것 중 가장 왼쪽에 다 같이 선다.
 * 상자는 요소가 «그림에서 차지하는 자리»로 잰다: 곡선은 조절점이 아니라 곡선이 닿는 끝, 글자는 조판한 상자.
 *
 * **묶음은 한 덩어리로 움직인다**(ppt 와 같다) — 상자 하나가 사각 + 이름 글자 둘인 관계도에서, 요소마다 따로
 * 맞추면 글자가 상자 밖으로 빠져나간다(브라우저 실측 2026-09-21). 묶음의 상자는 속 요소 상자를 합친 것이고,
 * 속 요소는 모두 **같은 만큼** 옮긴다. 묶음을 주지 않으면(`groups` 없음) 요소 하나하나가 제 단위다.
 *
 * 좌표를 그 자리에 적기 · 글자는 똑바로 선 채 자리만 · 면·노란 점·임자 꼭짓점 따라가기 · 넘치면 틀 넓히기는
 * **회전(figureRotate.ts)·대칭(figureMirror.ts)과 같은 한 엔진**(figureBake.ts)이 한다 — 규칙은 거기 적혀 있다.
 * 여기에는 «어디로 얼마나 옮기는가»와 «언제 단추를 끄는가»만 있다.
 *
 * 크기 고정(figureSizeLock)은 **막지 않는다** — 고정은 «이동만 가능»이고(그 파일의 규칙) 정렬은 옮기기뿐이라
 * 모양이 바뀌지 않는다. 회전·대칭이 고정을 막는 것은 그것들이 모양을 바꾸기 때문이다.
 */
import type { Affine } from "./figureEditGeometry";
import {
  bakeFigureObjects,
  type BakeOptions,
  type FigureObject,
  type SelectionBounds,
} from "./figureBake";
import { isTiedFace } from "./figureFaceEditing";
import { figureObjects } from "./figureSvgEditing";

export interface AlignOptions extends BakeOptions {
  /** 요소 id → 묶음 이름(사용자가 묶은 것). 같은 묶음은 한 덩어리로 움직인다. */
  groups?: ReadonlyMap<string, string>;
}
/** 왼쪽 · 가로 가운데 · 오른쪽 · 위 · 세로 가운데 · 아래. */
export type AlignKind =
  "left" | "centerX" | "right" | "top" | "middleY" | "bottom";
/** 고르게 벌릴 방향. */
export type SpreadAxis = "horizontal" | "vertical";

/** 단추를 끄는 이유 — 단추의 title 과 단추 밑 보조 글. */
export const ALIGN_BLOCKED = {
  few: "요소나 묶음을 둘 이상 고르면 서로 맞출 수 있습니다.",
  face: "면은 둘러싼 선을 따라갑니다. 선을 같이 고르세요.",
} as const;
export const SPREAD_BLOCKED = {
  few: "요소나 묶음을 셋 이상 고르면 고르게 벌릴 수 있습니다.",
  face: ALIGN_BLOCKED.face,
} as const;

const translation = (dx: number, dy: number): Affine => [1, 0, 0, 1, dx, dy];

/** 스스로 움직이는 요소 — 선을 따라가는 면은 세지 않는다(둘러싼 선이 데려간다). */
function moving(objects: readonly FigureObject[], ids: readonly string[]) {
  const wanted = new Set(ids);
  const chosen = objects.filter((o) => wanted.has(o.id));
  return { chosen, moving: chosen.filter((o) => !isTiedFace(o)) };
}

/** 움직이는 단위의 열쇠 — 묶음이면 그 묶음, 아니면 요소 하나. */
const unitKey = (id: string, groups?: ReadonlyMap<string, string>) => {
  const name = groups?.get(id);
  return name ? `묶음:${name}` : `요소:${id}`;
};

function block(
  objects: readonly FigureObject[],
  ids: readonly string[],
  least: number,
  reasons: { few: string; face: string },
  groups?: ReadonlyMap<string, string>,
): string | null {
  const found = moving(objects, ids);
  if (found.chosen.length && !found.moving.length) return reasons.face;
  const units = new Set(found.moving.map((o) => unitKey(o.id, groups)));
  return units.size < least ? reasons.few : null;
}

/** 정렬 단추를 끌 이유 — 없으면 null. 맞출 단위(요소·묶음)가 둘 미만이거나, 면만 골랐을 때. */
export const alignBlock = (
  objects: readonly FigureObject[],
  ids: readonly string[],
  groups?: ReadonlyMap<string, string>,
) => block(objects, ids, 2, ALIGN_BLOCKED, groups);

/** 고르게 벌리기 단추를 끌 이유 — 없으면 null. 셋은 있어야 사이가 둘이 되어 «고르게»가 뜻이 있다. */
export const spreadBlock = (
  objects: readonly FigureObject[],
  ids: readonly string[],
  groups?: ReadonlyMap<string, string>,
) => block(objects, ids, 3, SPREAD_BLOCKED, groups);

/** 움직이는 단위마다의 상자 — 묶음은 속 요소 상자를 합친 하나. 차례는 그림 차례를 지킨다. */
interface Unit {
  ids: string[];
  box: SelectionBounds;
}
function unitsOf(
  boxes: ReadonlyMap<string, SelectionBounds>,
  groups?: ReadonlyMap<string, string>,
): Unit[] {
  const units = new Map<string, Unit>();
  for (const [id, box] of boxes) {
    const key = unitKey(id, groups);
    const unit = units.get(key);
    if (!unit) {
      units.set(key, {
        ids: [id],
        box: { min: [...box.min], max: [...box.max], center: [...box.center] },
      });
      continue;
    }
    unit.ids.push(id);
    const { min, max } = unit.box;
    unit.box = {
      min: [Math.min(min[0], box.min[0]), Math.min(min[1], box.min[1])],
      max: [Math.max(max[0], box.max[0]), Math.max(max[1], box.max[1])],
      center: [0, 0],
    };
  }
  for (const unit of units.values())
    unit.box.center = [
      (unit.box.min[0] + unit.box.max[0]) / 2,
      (unit.box.min[1] + unit.box.max[1]) / 2,
    ];
  return [...units.values()];
}

/** 이 맞추기가 요소를 얼마나 옮기는가 — 바깥 상자 기준. */
function offsetFor(
  kind: AlignKind,
  each: SelectionBounds,
  whole: SelectionBounds,
): [number, number] {
  switch (kind) {
    case "left":
      return [whole.min[0] - each.min[0], 0];
    case "centerX":
      return [whole.center[0] - each.center[0], 0];
    case "right":
      return [whole.max[0] - each.max[0], 0];
    case "top":
      return [0, whole.min[1] - each.min[1]];
    case "middleY":
      return [0, whole.center[1] - each.center[1]];
    case "bottom":
      return [0, whole.max[1] - each.max[1]];
  }
}

/** 고른 요소를 서로 맞춘 새 원문. 맞출 수 없으면(`alignBlock`) 원문 그대로. */
export function alignFigureSelection(
  svg: string,
  ids: readonly string[],
  kind: AlignKind,
  options: AlignOptions = {},
): string {
  if (!ids.length || alignBlock(figureObjects(svg), ids, options.groups))
    return svg;
  return bakeFigureObjects(
    svg,
    ids,
    (boxes, whole) => {
      const motions = new Map<string, Affine>();
      for (const unit of unitsOf(boxes, options.groups)) {
        const [dx, dy] = offsetFor(kind, unit.box, whole);
        if (dx || dy)
          for (const id of unit.ids) motions.set(id, translation(dx, dy));
      }
      return motions;
    },
    options,
  );
}

/**
 * 고른 요소를 고르게 벌린 새 원문 — **사이 간격**이 같아진다(가운데끼리가 아니다. 크기가 다른 요소를
 * 가운데로 나누면 좁은 것과 넓은 것 사이가 눈에 띄게 달라 보인다).
 * 양 끝은 제자리에 두고 가운데 것만 옮긴다. 벌릴 수 없으면(`spreadBlock`) 원문 그대로.
 */
export function spreadFigureSelection(
  svg: string,
  ids: readonly string[],
  axis: SpreadAxis,
  options: AlignOptions = {},
): string {
  if (!ids.length || spreadBlock(figureObjects(svg), ids, options.groups))
    return svg;
  const i = axis === "horizontal" ? 0 : 1;
  return bakeFigureObjects(
    svg,
    ids,
    (boxes) => {
      // 차례는 앞쪽 끝 — 같으면 그림 차례(Map 이 든 차례)가 정한다. 자바스크립트의 sort 는 그 차례를 지킨다.
      const order = unitsOf(boxes, options.groups).sort(
        (a, b) => a.box.min[i] - b.box.min[i],
      );
      const last = order.length - 1;
      const span = order[last].box.min[i] - order[0].box.max[i];
      const inner = order
        .slice(1, last)
        .reduce((sum, { box }) => sum + (box.max[i] - box.min[i]), 0);
      const gap = (span - inner) / last;
      const motions = new Map<string, Affine>();
      let at = order[0].box.max[i];
      for (const { ids: members, box } of order.slice(1, last)) {
        const to = at + gap;
        const delta = to - box.min[i];
        if (delta)
          for (const id of members)
            motions.set(id, i ? translation(0, delta) : translation(delta, 0));
        at = to + (box.max[i] - box.min[i]);
      }
      return motions;
    },
    options,
  );
}
