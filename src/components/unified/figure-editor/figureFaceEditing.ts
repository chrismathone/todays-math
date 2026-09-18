/**
 * «면 만들기»(트랙 4) — 편집기 원문(SVG)을 고치는 쪽. 계산은 figureFaceGeometry · figureFaceSources · figureShapeAdjust 가
 * 하고, 여기서는 원문 문자열을 읽어 고친 새 문자열을 돌려준다(되돌리기·저장이 다른 편집과 같은 길을 탄다).
 * 원장님 2026-09-19 «면을 쉽게 만들 수 있어야 색칠을 할 수가 있음» · «그룹화했을 때 내부에 색을 넣을 수 있는» ·
 * «사각형 자체를 각을 기울여서 평행사변형» · «삼각형도 추가해 주고».
 *
 * - 면은 선 **뒤**(문서 차례로 앞)에 넣는다 — 첫 잉크(선·글자)의 **루트 바로 아래 조상** 앞. 면 좌표는 문서 좌표라
 *   변환된 묶음(붙여넣기의 translate) 안에 넣지 않는다.
 * - 면이 선을 따라가려면 경계 요소를 가리킬 열쇠가 필요하다. `data-object-id` 는 열 때마다 새로 매기고 저장 때 지워지므로
 *   경계 요소에 저장되는 `id`(없으면 `e-` 로 새로)를 붙이고 면의 `data-face` 에 적는다.
 * - 허용 오차는 확대율이 아니라 그림 크기에 맞춘다(viewBox 긴 변의 0.4%) — 만들 때와 따라갈 때 같은 답을 내야 한다.
 */
import type { FigureHandle } from "./figureHandles";
import { interiorPoint, type Point } from "./figureFaceGeometry";
import {
  bucketAction,
  closedGroupFill,
  DEFAULT_FACE_FILL,
  drawsBoundary,
  FACE_ATTR,
  FACE_SEED_ATTR,
  faceArea,
  faceAttrs,
  faceInsertBefore,
  faceKeys,
  isFaceObject,
  multiplyMatrix,
  parseTransform,
  recomputeFace,
  snapCandidates,
  type FaceSourceObject,
  type Matrix,
} from "./figureFaceSources";
import {
  ADJUST_KEY,
  adjustableShape,
  adjustHandles,
  formatPoints,
  moveAdjustHandle,
  rectToPolygonAttrs,
  SHAPE_ATTR,
  triangleFromBox,
} from "./figureShapeAdjust";
import {
  editableFigureDoc,
  editFigureObject,
  figureObjects,
  readFigureSvg,
  removeFigureObject,
  serializeFigureSvg,
  SVG_NS,
} from "./figureSvgEditing";

const OBJECT = "data-object-id";
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
type FigureObject = ReturnType<typeof figureObjects>[number];

/** 허용 오차(문서 단위) — viewBox 긴 변의 0.4%. 480 폭이면 1.92. */
export function faceTolerance(svg: string) {
  const view =
    readFigureSvg(svg)
      .documentElement.getAttribute("viewBox")
      ?.trim()
      .split(/[\s,]+/)
      .map(Number) ?? [];
  return (Math.max(view[2] || 0, view[3] || 0) || 480) * 0.004;
}

const strokeOf = (el: Element) =>
  /(?:^|;)\s*stroke\s*:\s*([^;]+)/i
    .exec(el.getAttribute("style") ?? "")?.[1]
    ?.trim() ??
  el.getAttribute("stroke") ??
  undefined;

/** 요소 하나 — figureObjects 모양 + 조상 변환 · 물려받은 선 색. */
function sourceOf(el: Element, root: Element): FaceSourceObject {
  let parentMatrix: Matrix | undefined, inheritedStroke: string | undefined;
  for (let p = el.parentElement; p; p = p.parentElement) {
    inheritedStroke ??= strokeOf(p);
    if (p === root) break;
    const transform = p.getAttribute("transform");
    if (transform)
      parentMatrix = multiplyMatrix(
        parseTransform(transform),
        parentMatrix ?? IDENTITY,
      );
  }
  return {
    id: el.getAttribute(OBJECT) ?? "",
    type: el.localName,
    attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])),
    ...(parentMatrix ? { parentMatrix } : {}),
    ...(inheritedStroke ? { inheritedStroke } : {}),
  };
}

/** 원문의 요소들(문서 차례) — 면 계산이 읽는 모양. */
export function faceSourceObjects(svg: string): FaceSourceObject[] {
  const doc = readFigureSvg(svg),
    root = doc.documentElement;
  return [...doc.querySelectorAll(`[${OBJECT}]`)].map((el) =>
    sourceOf(el, root),
  );
}

/** 선을 따라가는 면인가(채우기 통·안쪽 채우기) — 다각형 도구의 면(`data-face=""`)은 아니다. */
export const isTiedFace = (o: { attrs: Record<string, string> }) =>
  (o.attrs[FACE_ATTR] ?? "").trim() !== "";

/** 경계 요소의 열쇠 — 저장되는 `id`. 없으면 새로 붙인다(원문을 고친다). */
function keysFor(doc: Document, objectIds: readonly string[]) {
  return objectIds.map((objectId) => {
    const el = doc.querySelector(`[${OBJECT}="${objectId}"]`)!;
    let key = el.getAttribute("id");
    if (!key) {
      key = `e-${crypto.randomUUID().slice(0, 8)}`;
      el.setAttribute("id", key);
    }
    return key;
  });
}

/** 새 면을 첫 잉크의 루트 바로 아래 조상 앞에 넣는다(잉크가 없으면 맨 끝). */
function insertFace(
  doc: Document,
  tag: "path" | "polygon",
  attrs: Record<string, string>,
) {
  const root = doc.documentElement;
  const before = faceInsertBefore(
    [...doc.querySelectorAll(`[${OBJECT}]`)].map((el) => sourceOf(el, root)),
  );
  let anchor: Element | null = before
    ? doc.querySelector(`[${OBJECT}="${before}"]`)
    : null;
  while (anchor && anchor.parentElement !== root) anchor = anchor.parentElement;
  // 넓은 면이 뒤 — 새 면보다 좁은 기존 면이 있으면 그 앞에. 큰 면(△ABC)을 나중에 칠해도 작은 면(△ABD)을 덮지 않는다.
  const area = faceArea({ id: "", type: tag, attrs });
  for (const child of root.children) {
    if (child === anchor) break;
    if (
      child.hasAttribute(FACE_ATTR) &&
      faceArea(sourceOf(child, root)) < area
    ) {
      anchor = child;
      break;
    }
  }
  const face = doc.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs))
    face.setAttribute(key, value);
  const id = `obj-${crypto.randomUUID()}`;
  face.setAttribute(OBJECT, id);
  root.insertBefore(face, anchor);
  return id;
}

/**
 * 채우기 통 — 누른 칸에 면을 만들거나(선 뒤에), 같은 칸의 면이 있으면 그 색만 바꾼다. 칸이 없으면 안내만.
 * 경계 요소만으로 같은 칸을 다시 잡을 수 있을 때만 선을 따라가는 면으로 만든다(아니면 따라가지 않는 면).
 */
export function bucketFill(
  svg: string,
  point: Point,
  color = DEFAULT_FACE_FILL,
  tolerance = faceTolerance(svg),
): { svg: string; id?: string; notice?: string } {
  const objects = faceSourceObjects(svg);
  const action = bucketAction(objects, point, tolerance);
  if (action.kind === "none") return { svg, notice: action.reason };
  if (action.kind === "recolor")
    return {
      svg: editFigureObject(svg, action.id, { fill: color }),
      id: action.id,
    };
  const { region } = action;
  const members = objects.filter((o) => region.sourceIds.includes(o.id));
  const seed = interiorPoint(region.outer, region.holes);
  const tied = recomputeFace(
    {
      id: "",
      type: "path",
      attrs: {
        [FACE_ATTR]: region.sourceIds.join(" "),
        [FACE_SEED_ATTR]: `${seed.x} ${seed.y}`,
      },
    },
    members,
    tolerance,
  );
  const doc = editableFigureDoc(svg);
  const id = insertFace(
    doc,
    "path",
    tied
      ? {
          ...faceAttrs([region], {
            fill: color,
            edges: keysFor(doc, region.sourceIds),
          }),
          d: tied.d,
          [FACE_SEED_ATTR]: tied.seed!,
        }
      : faceAttrs([region], { fill: color }),
  );
  return { svg: serializeFigureSvg(doc), id };
}

/**
 * 면이 선을 따라간다 — 선을 옮기거나 끝점을 고친 원문에서 선을 따라가는 면의 경로(와 씨앗)를 다시 잰다.
 * `moved` 를 주면 그 요소가 경계인 면만(끄는 걸음마다 부른다). 고리가 끊겨 다시 잡을 수 없으면 그 면은 그대로 둔다.
 * 바뀐 것이 없으면 같은 문자열을 돌려준다.
 */
export function syncFigureFaces(svg: string, moved?: readonly string[]) {
  const same = { svg, changed: [] as string[] };
  if (!svg.includes(FACE_ATTR)) return same;
  const doc = readFigureSvg(svg),
    root = doc.documentElement;
  const tied = [...doc.querySelectorAll(`[${FACE_ATTR}][${OBJECT}]`)].filter(
    (el) => (el.getAttribute(FACE_ATTR) ?? "").trim(),
  );
  if (!tied.length) return same;
  const byKey = new Map<string, Element>();
  for (const el of doc.querySelectorAll(`[id][${OBJECT}]`))
    byKey.set(el.getAttribute("id")!, el);
  const movedSet = moved ? new Set(moved) : null;
  const tolerance = faceTolerance(svg);
  const updates: { id: string; attrs: Record<string, string> }[] = [];
  for (const face of tied) {
    const keys = face.getAttribute(FACE_ATTR)!.split(/\s+/).filter(Boolean);
    const elements = keys.map((key) => byKey.get(key));
    if (
      movedSet &&
      !elements.some((el) => el && movedSet.has(el.getAttribute(OBJECT)!))
    )
      continue;
    const members = elements.flatMap((el, i) =>
      el ? [{ ...sourceOf(el, root), id: keys[i] }] : [],
    );
    const next = recomputeFace(sourceOf(face, root), members, tolerance);
    if (!next) continue;
    const attrs: Record<string, string> = {};
    if (next.d !== face.getAttribute("d")) attrs.d = next.d;
    if (
      next.seed !== undefined &&
      next.seed !== face.getAttribute(FACE_SEED_ATTR)
    )
      attrs[FACE_SEED_ATTR] = next.seed;
    // 면 스스로의 변환은 두지 않는다 — 경로가 늘 면이 든 좌표계로 적힌다.
    if (face.hasAttribute("transform")) attrs.transform = "";
    if (Object.keys(attrs).length)
      updates.push({ id: face.getAttribute(OBJECT)!, attrs });
  }
  if (!updates.length) return same;
  const edited = editableFigureDoc(svg);
  for (const { id, attrs } of updates) {
    const el = edited.querySelector(`[${OBJECT}="${id}"]`)!;
    for (const [key, value] of Object.entries(attrs))
      if (value === "") el.removeAttribute(key);
      else el.setAttribute(key, value);
  }
  return { svg: serializeFigureSvg(edited), changed: updates.map((u) => u.id) };
}

/** 고른 요소가 이미 가진 안쪽 채우기 면 — 씨앗 없는 면 중 열쇠가 고른 경계 요소의 id 와 꼭 같은 것(위의 것). */
function innerFace(svg: string, selected: readonly FaceSourceObject[]) {
  const keys = selected.filter(drawsBoundary).map((o) => o.attrs.id);
  if (!keys.length || keys.some((key) => !key)) return undefined;
  const wanted = new Set(keys);
  return faceSourceObjects(svg)
    .filter((o) => {
      const own = faceKeys(o);
      return (
        isFaceObject(o) &&
        o.attrs[FACE_SEED_ATTR] === undefined &&
        own.length === wanted.size &&
        own.every((key) => wanted.has(key))
      );
    })
    .at(-1);
}

const selectedObjects = (svg: string, ids: readonly string[]) =>
  faceSourceObjects(svg).filter((o) => ids.includes(o.id));

/** 묶음 안쪽 채우기 칸의 상태 — 닫혔나(아니면 이유) · 이미 있는 면과 그 색. */
export function innerFillState(
  svg: string,
  ids: readonly string[],
): { ok: boolean; reason?: string; faceId?: string; color?: string } {
  const selected = selectedObjects(svg, ids);
  const fill = closedGroupFill(selected, faceTolerance(svg));
  const face = innerFace(svg, selected);
  const found = face ? { faceId: face.id, color: face.attrs.fill } : {};
  return fill.ok
    ? { ok: true, ...found }
    : { ok: false, reason: fill.reason, ...found };
}

/** 묶음 안쪽 채우기 켜기·색 바꾸기 — 면이 있으면 색만, 없으면 닫혔을 때만 선 뒤에 만든다(선을 따라간다). */
export function setInnerFill(
  svg: string,
  ids: readonly string[],
  color: string,
) {
  const selected = selectedObjects(svg, ids);
  const face = innerFace(svg, selected);
  if (face) return editFigureObject(svg, face.id, { fill: color });
  const fill = closedGroupFill(selected, faceTolerance(svg));
  if (!fill.ok) return svg;
  const doc = editableFigureDoc(svg);
  const edges = keysFor(
    doc,
    selected.filter(drawsBoundary).map((o) => o.id),
  );
  insertFace(doc, "path", faceAttrs(fill.regions, { fill: color, edges }));
  return serializeFigureSvg(doc);
}

/** 묶음 안쪽 채우기 없애기 */
export function clearInnerFill(svg: string, ids: readonly string[]) {
  const face = innerFace(svg, selectedObjects(svg, ids));
  return face ? removeFigureObject(svg, face.id) : svg;
}

/** 다각형 도구의 면 — 따라가지 않는 면(`data-face=""`), 선 뒤에. */
export function addPolygonFace(
  svg: string,
  points: readonly Point[],
  color = DEFAULT_FACE_FILL,
) {
  const doc = editableFigureDoc(svg);
  const id = insertFace(doc, "polygon", {
    points: formatPoints(points),
    fill: color,
    stroke: "none",
    [FACE_ATTR]: "",
  });
  return { svg: serializeFigureSvg(doc), id };
}

/** 삼각형 도구 — 끌어 그린 상자 안의 이등변삼각형(`<polygon data-shape="triangle">`). 선 모양은 다른 도구와 같다. */
export function addFigureTriangle(svg: string, from: Point, to: Point) {
  const doc = editableFigureDoc(svg);
  const el = doc.createElementNS(SVG_NS, "polygon");
  const id = `obj-${crypto.randomUUID()}`;
  for (const [key, value] of Object.entries({
    [OBJECT]: id,
    stroke: "#111111",
    "stroke-width": "1.8",
    fill: "none",
    points: formatPoints(triangleFromBox(from, to)),
    [SHAPE_ATTR]: "triangle",
  }))
    el.setAttribute(key, value);
  doc.documentElement.append(el);
  return { svg: serializeFigureSvg(doc), id };
}

/**
 * 노란 점이 있는 모양의 조절점 — 모서리 넷 + 노란 점. 노란 점으로 바꿀 수 없는 요소면 null(예전 조절점을 쓴다).
 * 사각형의 모서리 넷은 예전 사각형 모서리와 같은 자리·같은 열쇠다.
 */
export function shapeHandles(
  object: Pick<FigureObject, "type" | "attrs">,
): FigureHandle[] | null {
  if (isFaceObject({ id: "", ...object })) return null;
  const shape = adjustableShape(object);
  return shape
    ? adjustHandles(shape).map((h) => ({
        key: h.key,
        x: h.x,
        y: h.y,
        label: h.label,
        ...(h.adjust ? { adjust: true } : {}),
      }))
    : null;
}

/**
 * 모양 조절점을 끈 뒤의 원문 — 노란 점은 기울이기(사각형은 이때 같은 번호의 평행사변형 다각형으로 바뀐다)·꼭짓점 옮기기,
 * 평행사변형·삼각형의 모서리는 기울기·꼭짓점 비율을 지킨 채 크기만. 이 길이 아니면 null — 사각형의 모서리는 예전
 * 사각형 끌기(`moveFigureHandle`)를 그대로 쓴다.
 */
export function moveShapeHandle(
  svg: string,
  id: string,
  key: string,
  to: Point,
  snap = 0,
): string | null {
  const object = figureObjects(svg).find((o) => o.id === id);
  const shape = object && shapeHandles(object) && adjustableShape(object);
  if (!object || !shape) return null;
  if (shape.kind === "rect" && key !== ADJUST_KEY) return null;
  const points = moveAdjustHandle(shape, key, to, { snap });
  if (shape.kind !== "rect")
    return editFigureObject(svg, id, { points: formatPoints(points) });
  const doc = editableFigureDoc(svg);
  const polygon = doc.createElementNS(SVG_NS, "polygon");
  for (const [name, value] of Object.entries(
    rectToPolygonAttrs(object.attrs, points),
  ))
    polygon.setAttribute(name, value);
  doc.querySelector(`[${OBJECT}="${id}"]`)!.replaceWith(polygon);
  return serializeFigureSvg(doc);
}

/** 다각형 도구가 달라붙을 점 — 끝점 · 꼭짓점 · 교점. */
export const polygonSnapCandidates = (svg: string) =>
  snapCandidates(faceSourceObjects(svg));

/** 요소를 옮길 수 있나 — 선을 따라가는 면은 스스로 옮기지 않는다(선을 옮기면 따라온다). */
export const movableIds = (svg: string, ids: readonly string[]) => {
  const tied = new Set(
    figureObjects(svg)
      .filter(isTiedFace)
      .map((o) => o.id),
  );
  return ids.filter((id) => !tied.has(id));
};
