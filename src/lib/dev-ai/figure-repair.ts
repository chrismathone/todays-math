import type { DevAiFigureSpec } from "./contracts";

/**
 * 엔진 검증 실패 **한 요소** 때문에 그림 전체를 버리지 않는다(원장님 운영 로그 2026-09-19 00:19~00:27 — 전부 502).
 * 치수 하나·라벨 하나·직각 표시 하나 때문에 삼각형 전체가 원본 크롭으로 남았다.
 *
 * - `cheap`: 사유가 기계적으로 고쳐지는 것 — AI 를 다시 부르기 **전에**, 어느 시도에서든 고쳐 바로 다시 그린다.
 * - `drop`: 마지막 시도에서도 떨어질 때만 — 사유가 가리키는 요소 **하나만** 빼고 다시 그린다. 무엇을 뺐는지 경고에 적는다.
 *
 * 🔴 엔진 사유 문자열에 기대는 판정은 **이 표 한 곳**이다(`vendor/figure-engine/core/figure_scene.py` 의 문구).
 *    시험이 실제 엔진으로 사유마다 실패를 만들어 이 표에 대 본다 — 엔진 문구가 바뀌면 거기서 빨개진다
 *    (가드가 0 을 내면 «없다»가 아니라 «못 센다»일 수 있다).
 */
export const ENGINE_FAILURES = {
  offsetAndCurvature:
    /dimension provides both offset and curvature; use only one/,
  offsetNotPositive: /dimension '([^']+)' offset must be positive/,
  rightAngleOff: /angle '([^']+)' is marked right but measures (-?[\d.]+)°/,
  dimensionNoRoom: /dimension '([^']+)' has no collision-free layout/,
  labelNoRoom: /label '([^']+)' has no line\/circle\/label-free position/,
  rayNotDrawn:
    /angle '([^']+)' ray to '([^']+)' is not covered by a rendered segment/,
} as const;

/** 직각 표시가 이만큼 안쪽이면 모델의 어림이 조금 빗나간 것 — 표시만 바꾼다(기하를 억지로 90° 로 만들지 않는다). */
export const NEAR_RIGHT_DEGREES = 15;
/** 한 번의 시도에서 뺄 수 있는 요소 수 — 그 이상이면 그림이 원본과 너무 달라진다. */
export const MAX_DROPPED = 3;

type Item = Record<string, unknown>;
export interface FigureFix {
  spec: DevAiFigureSpec;
  /** 빼거나 뜻이 바뀌는 교정만 적는다. 같은 뜻의 교정(별칭 정리·자리 풀기)은 조용히 한다. */
  warning?: string;
  dropped?: boolean;
}

const isItem = (value: unknown): value is Item =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * `key` 표(이름 붙은 객체 또는 `name`/`point` 를 단 배열)에서 `name` 항목을 고친다.
 * `edit` 이 `null` 이면 뺀다, `undefined` 면 못 고친 것이다.
 */
function editRecord(
  spec: DevAiFigureSpec,
  key: "dimensions" | "angles" | "labels",
  name: string,
  edit: (item: unknown) => unknown | null | undefined,
): DevAiFigureSpec | undefined {
  const table = spec[key];
  if (Array.isArray(table)) {
    const field = key === "labels" ? "point" : "name";
    const index = table.findIndex(
      (item) => isItem(item) && String(item[field]) === name,
    );
    if (index < 0) return undefined;
    const next = edit(table[index]);
    if (next === undefined) return undefined;
    const copy = [...table];
    if (next === null) copy.splice(index, 1);
    else copy[index] = next;
    return { ...spec, [key]: copy };
  }
  if (!isItem(table) || !(name in table)) return undefined;
  const next = edit(table[name]);
  if (next === undefined) return undefined;
  const copy = { ...table };
  if (next === null) delete copy[name];
  else copy[name] = next;
  return { ...spec, [key]: copy };
}

function without(item: Item, ...keys: string[]) {
  const copy = { ...item };
  for (const key of keys) delete copy[key];
  return copy;
}

/** 경고에 쓸 이름 — 치수는 양 끝점(«치수 CA»), 각은 꼭짓점(«∠B»). */
function ends(item: unknown, fallback: string) {
  if (!isItem(item)) return fallback;
  const points = Array.isArray(item.points)
    ? item.points
    : [item.p1, item.p2].filter((p) => p !== undefined);
  return points.length === 2 ? points.join("") : fallback;
}
const vertex = (item: unknown, fallback: string) =>
  isItem(item) && typeof item.vertex === "string" ? item.vertex : fallback;

/**
 * 엔진 사유 하나를 보고 사양을 한 걸음 고친다. 못 고치면 `undefined`.
 * `allowDrop` 은 마지막 시도에서만 켠다 — 그 전에는 AI 가 원본을 보고 제대로 고칠 기회를 먼저 준다.
 */
export function repairFigureSpec(
  spec: DevAiFigureSpec,
  error: string,
  allowDrop: boolean,
): FigureFix | undefined {
  if (spec.version !== 2) return undefined;
  if (ENGINE_FAILURES.offsetAndCurvature.test(error)) {
    // 엔진에서 curvature 는 offset 의 옛 이름이다(figure_scene.py add_dimension) — 정식 이름을 남긴다.
    const table = spec.dimensions;
    const both = (item: unknown): item is Item =>
      isItem(item) && "offset" in item && "curvature" in item;
    const fix = (item: unknown) =>
      both(item) ? without(item, "curvature") : item;
    if (Array.isArray(table) && table.some(both))
      return { spec: { ...spec, dimensions: table.map(fix) } };
    if (isItem(table) && Object.values(table).some(both))
      return {
        spec: {
          ...spec,
          dimensions: Object.fromEntries(
            Object.entries(table).map(([name, item]) => [name, fix(item)]),
          ),
        },
      };
    return undefined;
  }
  let hit = ENGINE_FAILURES.offsetNotPositive.exec(error);
  if (hit) {
    // 음수 offset 은 «반대쪽»이라는 뜻일 수 있어 절댓값이 맞다는 보장이 없다 — 엔진 자동 배치(쪽·거리 탐색)에 맡긴다.
    const next = editRecord(spec, "dimensions", hit[1]!, (item) =>
      isItem(item) ? without(item, "offset", "curvature") : undefined,
    );
    return next && { spec: next };
  }
  hit = ENGINE_FAILURES.rightAngleOff.exec(error);
  if (hit) {
    const measured = Number(hit[2]);
    const near = Math.abs(measured - 90) <= NEAR_RIGHT_DEGREES;
    if (!near && !allowDrop) return undefined;
    let label = "";
    const next = editRecord(spec, "angles", hit[1]!, (item) => {
      if (!isItem(item)) return undefined;
      label = vertex(item, hit![1]!);
      // 이름표가 있으면 호와 이름표를 남기고, 없으면 표시째 뺀다(이름 없는 호는 «같은 각» 표시로 읽힌다).
      return typeof item.label === "string" && item.label.trim()
        ? without(item, "right")
        : null;
    });
    return (
      next && {
        spec: next,
        warning: `∠${label} 의 직각 표시를 뺐습니다(그린 각 ${measured.toFixed(1)}°).`,
        dropped: !near,
      }
    );
  }
  hit = ENGINE_FAILURES.dimensionNoRoom.exec(error);
  if (hit) {
    const name = hit[1]!;
    // 먼저 자리 찾기를 푼다 — 모델이 정한 거리·쪽이 있으면 걷어 엔진이 쪽·거리를 다 찾게 한다.
    const released = editRecord(spec, "dimensions", name, (item) =>
      isItem(item) &&
      ("offset" in item ||
        "curvature" in item ||
        (item.side !== undefined && item.side !== "auto"))
        ? without(item, "offset", "curvature", "side")
        : undefined,
    );
    if (released) return { spec: released };
    if (!allowDrop) return undefined;
    let shown = name;
    const next = editRecord(spec, "dimensions", name, (item) => {
      shown = ends(item, name);
      return null;
    });
    return (
      next && {
        spec: next,
        warning: `치수 ${shown} 표시를 넣을 자리가 없어 뺐습니다.`,
        dropped: true,
      }
    );
  }
  hit = ENGINE_FAILURES.labelNoRoom.exec(error);
  if (hit) {
    const name = hit[1]!;
    // 먼저 자리 찾기를 푼다 — dx·dy·position 을 걷으면 엔진이 여덟 방향 × 다섯 거리를 다 찾는다.
    const released = editRecord(spec, "labels", name, (item) =>
      isItem(item) && ("dx" in item || "dy" in item || "position" in item)
        ? without(item, "dx", "dy", "position")
        : undefined,
    );
    if (released) return { spec: released };
    if (!allowDrop) return undefined;
    let text = name;
    const next = editRecord(spec, "labels", name, (item) => {
      text =
        typeof item === "string"
          ? item
          : isItem(item) && typeof item.text === "string"
            ? item.text
            : name;
      return null;
    });
    return (
      next && {
        spec: next,
        warning: `이름표 ${text} 를 놓을 자리가 없어 뺐습니다. 그림 편집에서 넣어 주세요.`,
        dropped: true,
      }
    );
  }
  hit = ENGINE_FAILURES.rayNotDrawn.exec(error);
  if (hit && allowDrop) {
    let label = hit[1]!;
    const next = editRecord(spec, "angles", hit[1]!, (item) => {
      label = vertex(item, hit![1]!);
      return null;
    });
    return (
      next && {
        spec: next,
        warning: `∠${label} 표시를 그릴 변이 없어 뺐습니다.`,
        dropped: true,
      }
    );
  }
  return undefined;
}
