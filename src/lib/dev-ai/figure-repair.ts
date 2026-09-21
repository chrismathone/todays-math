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
  // 트랙 45(2026-09-21) — 원장님 두 거절(canvasClips·labelKeyConflict)과, 엔진 거절 161곳 전수 조사에서
  // «사양의 뜻이 하나이고 그 뜻을 지면에서 지키는 고침도 하나뿐»으로 가른 것들. 표는 보고서(engine-spec-repair.md).
  canvasClips:
    /fixed canvas clips scene content: content=\((-?[\d.]+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\), canvas=\(0, 0, ([\d.]+), ([\d.]+)\)/,
  labelKeyConflict: /labels\.(.+)\.point conflicts with its key/,
  canvasInvalid:
    /\bcanvas(?: requires width and height| must be \{width, height\} or \[width, height\]|: unknown field\(s\)|(?:\.width|\.height|\[[01]\]) must be )/,
  unknownTheme: /unknown theme .*; expected 'exam-thin'/,
  rightWithArcs: /angles\.(.+): right:true replaces the arc — do not give arcs/,
  pointsAndEnds:
    /(segments|angles|dimensions|points)\.(.+?): use (?:points or p1\/p2|segments or segment1\/segment2), not both/,
  angleAndAngleDeg: /points\.(.+) provides both angle and angle_deg/,
  duplicateName:
    /duplicate geometry name (?:'([^']*)'|"([^"]*)")(?:: new (\w+) conflicts with (\w+)| across (\w+) and (\w+))/,
} as const;

/**
 * 원장님 화면에 나가는 엔진 거절 사유(D-08 — 간결·사무적 한국어 한 줄, 원장님 2026-09-21 «영어 엔진 오류가 그대로 나갔다»).
 * 운영 로그에 나온 거절만 뜻을 풀어 적는다. 나머지는 기본 한 줄 — 엔진 원문은 개발자용 `detail` 로 따로 간다.
 */
export const FIGURE_REDRAW_FAILED =
  "도형을 다시 그리지 못했습니다. 원본은 유지됩니다.";
const REASONS: Partial<Record<keyof typeof ENGINE_FAILURES, string>> = {
  offsetAndCurvature: "치수 표시 설정이 맞지 않아",
  offsetNotPositive: "치수 표시 설정이 맞지 않아",
  rightAngleOff: "직각 표시와 그린 각이 맞지 않아",
  dimensionNoRoom: "치수 표시를 놓을 자리가 없어",
  labelNoRoom: "점 이름을 놓을 자리가 없어",
  rayNotDrawn: "각 표시의 변이 그려지지 않아",
  canvasClips: "그림이 틀 밖으로 넘쳐",
  labelKeyConflict: "점 이름표가 가리키는 점이 맞지 않아",
  rightWithArcs: "직각 표시와 호 표시가 함께 있어",
};
export function engineRejectionReason(error: string) {
  for (const [key, pattern] of Object.entries(ENGINE_FAILURES)) {
    const cause = REASONS[key as keyof typeof ENGINE_FAILURES];
    if (cause && pattern.test(error))
      return `${cause} 도형을 다시 그리지 못했습니다. 원본은 유지됩니다.`;
  }
  return FIGURE_REDRAW_FAILED;
}

/** 직각 표시가 이만큼 안쪽이면 모델의 어림이 조금 빗나간 것 — 표시만 바꾼다(기하를 억지로 90° 로 만들지 않는다). */
export const NEAR_RIGHT_DEGREES = 15;
/** 한 번의 시도에서 뺄 수 있는 요소 수 — 그 이상이면 그림이 원본과 너무 달라진다. */
export const MAX_DROPPED = 3;

type Item = Record<string, unknown>;
export interface FigureFix {
  spec: DevAiFigureSpec;
  /**
   * 원장님 화면(경고)에는 빼거나 뜻이 바뀌는 교정만 적는다. 같은 뜻의 교정(별칭 정리·자리 풀기·이름 바꾸기)은 화면에 안 적는다.
   */
  warning?: string;
  /** 개발자용 — 무엇을 고쳤는지. 모든 교정에 붙고 서버 기록으로 남는다(조용히 고치면 다음 사람이 모른다). */
  note: string;
  dropped?: boolean;
}

const isItem = (value: unknown): value is Item =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** 이름 붙은 표(객체 또는 `name` 을 단 배열) → [이름, 값]. 엔진 `_named_records` 와 같은 읽기. */
function records(table: unknown): [string, unknown][] {
  if (Array.isArray(table))
    return table.flatMap((item): [string, unknown][] =>
      isItem(item) && item.name !== undefined
        ? [[String(item.name), item]]
        : [],
    );
  return isItem(table) ? Object.entries(table) : [];
}

/** 엔진이 한 이름 공간에 두는 표 — 점·원·선분·호·칠한 영역·각·치수(figure_scene.py `validate`). */
const NAMED_TABLES = [
  "points",
  "circles",
  "segments",
  "arcs",
  "regions",
  "angles",
  "dimensions",
] as const;
/** 다른 요소가 이름으로 가리키지 않는 것 — 이름이 손잡이일 뿐이라 바꿔도 뜻이 같다. 점·원·선분은 가리켜진다. */
const HANDLE_TABLES: Record<string, (typeof NAMED_TABLES)[number]> = {
  angle: "angles",
  dimension: "dimensions",
  arc: "arcs",
  region: "regions",
};

/** `table` 의 `from` 이름을 `to` 로 바꾼다. 배열이면 같은 이름 중 **나중** 것(엔진이 «새» 것으로 읽는 쪽). */
function renameRecord(
  spec: DevAiFigureSpec,
  table: string,
  from: string,
  to: string,
): DevAiFigureSpec | undefined {
  const value = spec[table];
  if (Array.isArray(value)) {
    let index = -1;
    value.forEach((item, i) => {
      if (isItem(item) && String(item.name) === from) index = i;
    });
    if (index < 0) return undefined;
    const copy = [...value];
    copy[index] = { ...(copy[index] as Item), name: to };
    return { ...spec, [table]: copy };
  }
  if (!isItem(value) || !(from in value)) return undefined;
  return {
    ...spec,
    [table]: Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key === from ? to : key,
        item,
      ]),
    ),
  };
}

/**
 * 모델이 **스스로 정한 좌표**(날 점과 원)가 캔버스 안인가. 그렇다면 넘친 것은 엔진이 놓은 이름표·각 표시·치수뿐이다 —
 * 모델은 엔진이 이름표를 어디 둘지 모르니 되물어도 못 고친다(원장님 2026-09-21 ㄱ: 세 번 다 실패).
 * 좌표 자체가 제 틀 밖이면 좌표와 틀이 서로 어긋난 사양이라 모델에 되묻는다(넘친 양과 무관).
 * 원은 그리지 않는 보조원도 센다 — 그 위의 점이 틀 밖일 수 있고, 모자라게 세면 되묻는 쪽(옛 동작)으로 간다.
 */
function ownGeometryInside(
  spec: DevAiFigureSpec,
  width: number,
  height: number,
) {
  const at = new Map<string, [number, number]>();
  for (const [name, item] of records(spec.points)) {
    const pair = Array.isArray(item)
      ? item
      : isItem(item) &&
          String(item.type ?? item.kind ?? "raw").toLowerCase() === "raw"
        ? [item.x, item.y]
        : undefined;
    if (pair?.length !== 2) continue;
    const [x, y] = pair.map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) at.set(name, [x!, y!]);
  }
  const boxes = [...at.values()].map(([x, y]) => [x, y, x, y]);
  for (const [, item] of records(spec.circles)) {
    const center = isItem(item) ? at.get(String(item.center)) : undefined;
    const r = isItem(item) ? Number(item.radius) : NaN;
    if (center && Number.isFinite(r))
      boxes.push([center[0] - r, center[1] - r, center[0] + r, center[1] + r]);
  }
  const tolerance = Math.max(width, height, 1) * 1e-9; // 엔진과 같은 허용치
  return boxes.every(
    ([x0, y0, x1, y1]) =>
      x0! >= -tolerance &&
      y0! >= -tolerance &&
      x1! <= width + tolerance &&
      y1! <= height + tolerance,
  );
}

/**
 * 캔버스를 뺀다 — 엔진이 내용 상자에 여백을 두고 스스로 맞춘다(figure_scene.py `resolve`).
 * 캔버스 크기는 저장본에 닿지 않는다: 작업실이 받은 SVG 를 저장 직전 `fitFigureViewport` 로 다시 잰다
 * (useStudioFigureAi.ts). 캔버스에 실린 바탕색만은 뜻이 있으니 바깥으로 옮긴다.
 */
function withoutCanvas(spec: DevAiFigureSpec): DevAiFigureSpec {
  const { canvas, ...rest } = spec;
  return isItem(canvas) &&
    canvas.background !== undefined &&
    rest.background === undefined
    ? { ...rest, background: canvas.background }
    : rest;
}

/**
 * `key` 표(이름 붙은 객체 또는 `name`/`point` 를 단 배열)에서 `name` 항목을 고친다.
 * `edit` 이 `null` 이면 뺀다, `undefined` 면 못 고친 것이다.
 */
function editRecord(
  spec: DevAiFigureSpec,
  key: "dimensions" | "angles" | "labels" | "segments" | "points",
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
    const note = "치수의 offset·curvature 중 옛 이름 curvature 를 뺐습니다.";
    if (Array.isArray(table) && table.some(both))
      return { spec: { ...spec, dimensions: table.map(fix) }, note };
    if (isItem(table) && Object.values(table).some(both))
      return {
        spec: {
          ...spec,
          dimensions: Object.fromEntries(
            Object.entries(table).map(([name, item]) => [name, fix(item)]),
          ),
        },
        note,
      };
    return undefined;
  }
  let hit = ENGINE_FAILURES.offsetNotPositive.exec(error);
  if (hit) {
    // 음수 offset 은 «반대쪽»이라는 뜻일 수 있어 절댓값이 맞다는 보장이 없다 — 엔진 자동 배치(쪽·거리 탐색)에 맡긴다.
    const next = editRecord(spec, "dimensions", hit[1]!, (item) =>
      isItem(item) ? without(item, "offset", "curvature") : undefined,
    );
    return (
      next && {
        spec: next,
        note: `치수 ${hit[1]} 의 0 이하 offset 을 빼고 엔진 배치에 맡겼습니다.`,
      }
    );
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
    const warning = `∠${label} 의 직각 표시를 뺐습니다(그린 각 ${measured.toFixed(1)}°).`;
    return next && { spec: next, warning, note: warning, dropped: !near };
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
    if (released)
      return {
        spec: released,
        note: `치수 ${name} 의 자리 지정(offset·side)을 풀었습니다.`,
      };
    if (!allowDrop) return undefined;
    let shown = name;
    const next = editRecord(spec, "dimensions", name, (item) => {
      shown = ends(item, name);
      return null;
    });
    const warning = `치수 ${shown} 표시를 넣을 자리가 없어 뺐습니다.`;
    return next && { spec: next, warning, note: warning, dropped: true };
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
    if (released)
      return {
        spec: released,
        note: `이름표 ${name} 의 자리 지정(dx·dy·position)을 풀었습니다.`,
      };
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
    const warning = `이름표 ${text} 를 놓을 자리가 없어 뺐습니다. 그림 편집에서 넣어 주세요.`;
    return next && { spec: next, warning, note: warning, dropped: true };
  }
  hit = ENGINE_FAILURES.rayNotDrawn.exec(error);
  if (hit) {
    if (!allowDrop) return undefined;
    let label = hit[1]!;
    const next = editRecord(spec, "angles", hit[1]!, (item) => {
      label = vertex(item, hit![1]!);
      return null;
    });
    const warning = `∠${label} 표시를 그릴 변이 없어 뺐습니다.`;
    return next && { spec: next, warning, note: warning, dropped: true };
  }
  return repairOneMeaning(spec, error);
}

/**
 * 트랙 45 — 뜻이 하나라 AI 에 되묻지 않고 고치는 거절. 어느 시도에서든 바로 고친다(`allowDrop` 과 무관).
 * 지면이 바뀌지 않는 교정이라 원장님 화면 경고(`warning`)는 없고 개발자 기록(`note`)만 남긴다.
 * 조건이 안 맞으면(뜻이 둘일 수 있으면) `undefined` — 옛 동작대로 모델에 되묻는다.
 */
function repairOneMeaning(
  spec: DevAiFigureSpec,
  error: string,
): FigureFix | undefined {
  let hit = ENGINE_FAILURES.canvasClips.exec(error);
  if (hit) {
    if (!ownGeometryInside(spec, Number(hit[5]), Number(hit[6])))
      return undefined;
    return {
      spec: withoutCanvas(spec),
      note: `고정 캔버스 ${hit[5]}×${hit[6]} 를 빼고 엔진 자동 맞춤으로 그렸습니다(넘친 내용 상자 ${hit[1]}, ${hit[2]}, ${hit[3]}, ${hit[4]}).`,
    };
  }
  if (ENGINE_FAILURES.canvasInvalid.test(error)) {
    if (!("canvas" in spec)) return undefined;
    return {
      spec: withoutCanvas(spec),
      note: "크기를 읽을 수 없는 캔버스를 빼고 엔진 자동 맞춤으로 그렸습니다.",
    };
  }
  if (ENGINE_FAILURES.labelKeyConflict.test(error)) {
    // 엔진은 점 이름이 이름표의 열쇠다(figure_scene.py compile_figure_spec). 열쇠가 점이 아니고, 가리키는 점이 있고,
    // 그 점에 이름표가 아직 없을 때만 열쇠를 point 값으로 바꾼다 — 그 밖에는 어느 쪽이 맞는지 모른다.
    const labels = spec.labels;
    if (!isItem(labels)) return undefined;
    const points = new Set(records(spec.points).map(([name]) => name));
    const moves = new Map<string, string>();
    for (const [key, item] of Object.entries(labels))
      if (
        isItem(item) &&
        item.point !== undefined &&
        String(item.point) !== key
      )
        moves.set(key, String(item.point));
    const targets = [...moves.values()];
    for (const [key, to] of moves)
      if (
        points.has(key) ||
        !points.has(to) ||
        to in labels ||
        targets.indexOf(to) !== targets.lastIndexOf(to)
      )
        return undefined;
    if (!moves.size) return undefined;
    return {
      spec: {
        ...spec,
        labels: Object.fromEntries(
          Object.entries(labels).map(([key, item]) => [
            moves.get(key) ?? key,
            item,
          ]),
        ),
      },
      note: `이름표 열쇠를 점 이름으로 바꿨습니다(${[...moves]
        .map(([from, to]) => `${from}→${to}`)
        .join(", ")}).`,
    };
  }
  if (ENGINE_FAILURES.unknownTheme.test(error)) {
    // 엔진의 테마는 exam-thin 하나뿐이다 — 다른 값은 그 하나(기본값)로밖에 못 간다.
    if (!("theme" in spec)) return undefined;
    const { theme, ...rest } = spec;
    return {
      spec: rest,
      note: `없는 테마 ${String(theme)} 를 빼고 기본 테마로 그렸습니다.`,
    };
  }
  hit = ENGINE_FAILURES.rightWithArcs.exec(error);
  if (hit) {
    // 직각 표시는 호를 갈음한다 — arcs:1 은 기본값이라 뜻이 같다. arcs:2(같은 각 표시)는 직각과 부딪혀 되묻는다.
    const next = editRecord(spec, "angles", hit[1]!, (item) =>
      isItem(item) && item.right === true && item.arcs === 1
        ? without(item, "arcs")
        : undefined,
    );
    return (
      next && { spec: next, note: `직각 표시 ${hit[1]} 의 arcs:1 을 뺐습니다.` }
    );
  }
  hit = ENGINE_FAILURES.pointsAndEnds.exec(error);
  if (hit) {
    // 같은 끝을 두 가지로 적었다 — 둘이 같을 때만 한쪽을 지운다. 다르면 어느 쪽이 맞는지 모른다.
    const table = hit[1] as "segments" | "angles" | "dimensions" | "points";
    const name = hit[2]!;
    const [pair, first, second] =
      table === "points"
        ? ["segments", "segment1", "segment2"]
        : ["points", "p1", "p2"];
    const next = editRecord(spec, table, name, (item) => {
      if (!isItem(item)) return undefined;
      const both = item[pair];
      if (!Array.isArray(both) || both.length !== 2) return undefined;
      const agree =
        (!(first in item) || String(item[first]) === String(both[0])) &&
        (!(second in item) || String(item[second]) === String(both[1]));
      return agree ? without(item, first, second) : undefined;
    });
    return (
      next && {
        spec: next,
        note: `${table}.${name} 에 겹쳐 적은 ${first}/${second} 를 지웠습니다.`,
      }
    );
  }
  hit = ENGINE_FAILURES.angleAndAngleDeg.exec(error);
  if (hit) {
    const next = editRecord(spec, "points", hit[1]!, (item) => {
      if (!isItem(item)) return undefined;
      const angle = Number(item.angle);
      return Number.isFinite(angle) && angle === Number(item.angle_deg)
        ? without(item, "angle_deg")
        : undefined;
    });
    return (
      next && {
        spec: next,
        note: `점 ${hit[1]} 에 겹쳐 적은 angle_deg 를 지웠습니다.`,
      }
    );
  }
  hit = ENGINE_FAILURES.duplicateName.exec(error);
  if (hit) {
    // 각·치수·호·칠한 영역의 이름은 아무도 가리키지 않는 손잡이다 — 그쪽 이름만 바꾼다(새로 들어온 쪽 먼저).
    const name = (hit[1] ?? hit[2])!;
    const kinds = hit[3] ? [hit[3], hit[4]!] : [hit[6]!, hit[5]!];
    const kind = kinds.find((k) => k in HANDLE_TABLES);
    if (!kind) return undefined;
    const used = new Set(
      NAMED_TABLES.flatMap((table) => records(spec[table]).map(([key]) => key)),
    );
    let fresh = `${name}_${kind}`;
    for (let n = 2; used.has(fresh); n++) fresh = `${name}_${kind}${n}`;
    const next = renameRecord(spec, HANDLE_TABLES[kind]!, name, fresh);
    return (
      next && {
        spec: next,
        note: `이름이 겹친 ${kind} ${name} 을 ${fresh} 로 바꿨습니다.`,
      }
    );
  }
  return undefined;
}
