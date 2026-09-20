/**
 * 고른 요소를 **대칭(거울에 비추기)** — 원장님 2026-09-20 «대칭(편집기 단추도)».
 *
 * 축은 셋이다.
 * - `"vertical"` — 세로 축(고른 것 가운데를 지나는 세로선)에 비춘다 = **좌우 대칭**.
 * - `"horizontal"` — 가로 축에 비춘다 = **상하 대칭**.
 * - `[P, P]` — **두 점이 정하는 직선**에 비춘다. 그 직선이 그림에 그려져 있지 않아도 된다.
 *
 * 좌표를 그대로 적기 · 글자는 똑바로 선 채 자리만 · 면·노란 점·임자 꼭짓점 따라가기 · 크기 고정이면 막기 ·
 * 넘치면 틀 넓히기는 **회전(figureRotate.ts)과 같은 한 엔진**(figureBake.ts)이 한다 — 규칙은 거기 적혀 있다.
 * 거울이라 방향이 뒤집히는 것(호의 sweep)도 그 엔진이 함께 뒤집는다.
 *
 * 편집기 단추(«좌우 대칭»·«상하 대칭»)와 AI 수정 명령(`mirror`)이 **이 한 함수**를 부른다.
 *
 * ⚠️ 이름이 닮은 다른 기능 — «반대쪽으로 뒤집기»(`figureFlip.ts` 의 `flipFigureCurve`)는 **곡선 하나를 제 두 끝을
 * 잇는 현에 대해** 비추는 것이다(치수 호를 선분 반대쪽으로). 여기 «대칭»은 **고른 것 전체**를 축·직선에 비춘다.
 * 화면 문구도 갈라 두었다: 뒤집기 = «반대쪽으로 뒤집기», 대칭 = «좌우 대칭»·«상하 대칭».
 */
import type { Affine, Point } from "./figureEditGeometry";
import {
  bakeFigureSelection,
  selectionBlockKind,
  type BakeOptions,
  type FigureObject,
} from "./figureBake";
import { figureObjects } from "./figureSvgEditing";

export type MirrorOptions = BakeOptions;
/** 세로 축(좌우 대칭) · 가로 축(상하 대칭) · 두 점이 정하는 직선. */
export type MirrorAxis =
  "vertical" | "horizontal" | readonly [Point, Point] | [Point, Point];

/** 단추를 끄는 이유 — 단추의 title 과 단추 밑 보조 글. */
export const MIRROR_BLOCKED = {
  locked: "크기 고정한 요소가 있어 대칭할 수 없습니다.",
  text: "글자는 뒤집히지 않습니다. 함께 옮길 요소를 같이 고르세요.",
  face: "면은 둘러싼 선을 따라갑니다. 선을 같이 고르세요.",
  axis: "대칭축의 두 점이 같습니다.",
} as const;

/** 두 점이 정하는 직선에 대한 거울 대칭(그림 좌표). 두 점이 같으면 null. */
function reflectionAcross(axis: readonly [Point, Point]): Affine | null {
  const [a, b] = axis;
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const span = Math.hypot(dx, dy);
  if (!(span > 1e-9)) return null;
  const ux = dx / span,
    uy = dy / span;
  // 직선 방향 u 에 대한 반사 — 직선 위의 점 a 는 제자리
  const m: [number, number, number, number] = [
    2 * ux * ux - 1,
    2 * ux * uy,
    2 * ux * uy,
    2 * uy * uy - 1,
  ];
  return [
    ...m,
    a[0] - (m[0] * a[0] + m[2] * a[1]),
    a[1] - (m[1] * a[0] + m[3] * a[1]),
  ];
}

/**
 * 대칭 단추를 끌 이유 — 없으면 null.
 * 크기 고정 요소가 섞임 · 선을 따라가는 면만 고름 · 축의 두 점이 같음 ·
 * 세로·가로 축에 글자 하나만 고름(축이 그 글자 가운데를 지나 옮길 것이 없다 — 직선 축은 옮겨지니 막지 않는다).
 */
export function mirrorBlock(
  objects: readonly FigureObject[],
  ids: readonly string[],
  axis: MirrorAxis,
): string | null {
  if (typeof axis !== "string" && !reflectionAcross(axis))
    return MIRROR_BLOCKED.axis;
  const kind = selectionBlockKind(objects, ids);
  if (kind === "text" && typeof axis !== "string") return null;
  return kind ? MIRROR_BLOCKED[kind] : null;
}

/** 고른 요소를 한 덩어리로 축에 비춘 새 원문. 비출 수 없으면(`mirrorBlock`) 원문 그대로. */
export function mirrorFigureSelection(
  svg: string,
  ids: readonly string[],
  axis: MirrorAxis,
  options: MirrorOptions = {},
): string {
  if (!ids.length || mirrorBlock(figureObjects(svg), ids, axis)) return svg;
  return bakeFigureSelection(
    svg,
    ids,
    ({ center }) =>
      axis === "vertical"
        ? [-1, 0, 0, 1, 2 * center[0], 0]
        : axis === "horizontal"
          ? [1, 0, 0, -1, 0, 2 * center[1]]
          : reflectionAcross(axis),
    options,
  );
}
