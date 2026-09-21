/**
 * 도형 편집기 — 요소 **순서**(맨 앞으로 · 앞으로 · 뒤로 · 맨 뒤로). 원장님 2026-09-21:
 * «요소 순서 조절 할 수 있어야겠어. ppt나 다른 곳을 보면 맨 뒤로 맨 앞으로, 뒤로, 앞으로 같은 순서를 이용해서
 * 조절하는게 있는데, 우리 도형 편집기에는 그 기능이 없어서 지금 y축이 가려져버렸어.»
 *
 * SVG 는 **문서 차례가 곧 그리는 차례**다 — 뒤에 적힌 것이 위에 그려진다. 순서를 바꾸는 것은 요소를 원문 안에서
 * 옮기는 일이다. 모양·좌표·서식은 한 글자도 안 바꾼다.
 *
 * - **맨 앞으로 · 맨 뒤로** — 고른 것 전부가 제 차례를 지킨 채 붙어서 맨 위·맨 아래로 간다.
 * - **앞으로 · 뒤로** — **겹치는 것 사이의 한 칸**이다. 고른 것의 바깥 상자와 겹치는 요소 하나를 넘는다.
 *   안 겹치는 요소를 넘는 것은 눈에 아무 변화가 없고 번호만 바뀐다(원장님이 «안 된다»고 느끼신다). 그래서
 *   위(아래)에 겹치는 것이 없으면 원문 그대로 둔다. 상자를 못 잰 요소는 겹친다고 본다(그러면 문서 한 칸).
 *   여럿을 고르면 각자 한 칸 — 위(아래)에서부터 옮기고, 고른 것끼리는 서로 넘지 않는다(Inkscape 의 올리기·내리기와 같다).
 * - **묶음은 한 덩어리** — 묶음 전부를 고르면 속 차례는 그대로 두고 덩어리째 옮긴다(캔버스에서 누르면 묶음 전부가
 *   골라진다). 넘는 것이 남의 묶음이면 그 묶음의 붙은 줄을 **통째로** 넘는다 — 묶음 한가운데로 끼어들지 않는다.
 *   요소 목록에서 묶음 속 하나만 골랐으면 그것만 간다(ppt 의 «묶음 속 개체 고르기»와 같다).
 * - **겹겹이 싼 그림**(엔진의 층 `<g>` · 붙여넣기의 translate 묶음) — 다른 `<g>` 로 옮길 때는 원래 조상의
 *   얕은 복사본으로 싸서 옮긴다. 조상 변환·물려받는 서식(선 색 등)이 그대로라 모양이 안 바뀐다. 넣을 자리가 다른
 *   `<g>` 한가운데면 그 `<g>` 를 쪼갠다(앞뒤 요소의 조상도 그대로). 복사본에는 `id` 를 안 붙인다(같은 id 가 둘).
 *   속성이 똑같은 이웃 `<g>` 는 다시 합친다(번갈아 옮겨도 불어나지 않는다) · 빈 `<g>` 는 걷는다.
 *   묶음 효과(opacity·mask·clip-path·filter)가 걸린 `<g>` 는 합치지 않는다 — 합치면 겹친 곳의 색이 바뀐다.
 * - **따라가는 면**(채우기 통·안쪽 채우기)도 여느 요소와 같다 — **사용자가 고른 차례가 이긴다.** «면은 선 뒤에»는
 *   면을 **만들 때 놓는 자리**(`figureFaceEditing` 의 insertFace)이고, 만든 뒤에 지키는 규칙이 아니다(면 맞추기
 *   `syncFigureFaces` 는 경로·씨앗만 고치고 차례는 안 건드린다 — 둘이 다투지 않는다). 면이 따라가는 열쇠(선의 `id`)는
 *   옮겨도 그대로다.
 * - **번호**(요소 차례 + 1)는 바뀐다 — 번호가 곧 그리는 차례다. 편집기가 옮긴 번호를 알린다.
 */
import { editableFigureDoc, serializeFigureSvg } from "./figureSvgEditing";

/** 맨 앞으로 · 앞으로 · 뒤로 · 맨 뒤로. */
export type OrderMove = "front" | "forward" | "backward" | "back";

/** 요소가 그림에서 차지하는 상자 — 편집기는 화면 px 로 잰다(`measureOrderBoxes`). */
export interface OrderBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface OrderOptions {
  /** 요소 id → 묶음 이름(사용자가 묶은 것). 넘을 때 묶음의 붙은 줄을 통째로 넘는다. */
  groups?: ReadonlyMap<string, string>;
  /** 요소 id → 상자. 한 칸 옮기기가 겹치는 것만 센다. 없는 요소는 겹친다고 본다. */
  boxes?: ReadonlyMap<string, OrderBox>;
}

/** 단추를 끄는 이유 — 단추의 title. */
export const ORDER_BLOCKED = {
  none: "요소를 고르면 순서를 바꿀 수 있습니다.",
  front: "이미 맨 앞입니다.",
  back: "이미 맨 뒤입니다.",
} as const;

const OBJECT = "data-object-id";
/** 합치면 겹친 곳의 색이 바뀌는 묶음 효과 */
const GROUP_EFFECT = /(?:^|[\s;])(?:opacity|mask|clip-path|filter)\s*:/i;
const GROUP_EFFECT_ATTRS = ["opacity", "mask", "clip-path", "filter"];

const upward = (move: OrderMove) => move === "front" || move === "forward";
const idOf = (el: Element) => el.getAttribute(OBJECT)!;

/** 앞(위)으로 가는 단추 둘 · 뒤(아래)로 가는 단추 둘을 끌 이유 — 고른 것이 이미 맨 위(맨 아래)에 붙어 있을 때. */
export function orderBlock(
  objects: readonly { id: string }[],
  ids: readonly string[],
  move: OrderMove,
): string | null {
  const wanted = new Set(ids);
  const chosen = objects.filter((o) => wanted.has(o.id)).length;
  if (!chosen) return ORDER_BLOCKED.none;
  const edge = upward(move)
    ? objects.slice(objects.length - chosen)
    : objects.slice(0, chosen);
  if (!edge.every((o) => wanted.has(o.id))) return null;
  return upward(move) ? ORDER_BLOCKED.front : ORDER_BLOCKED.back;
}

/** 고른 요소의 순서를 바꾼 새 원문. 바꿀 것이 없으면 원문 그대로(되돌리기 자리가 안 생긴다). */
export function orderFigureSelection(
  svg: string,
  ids: readonly string[],
  move: OrderMove,
  options: OrderOptions = {},
): string {
  const doc = editableFigureDoc(svg);
  const painted = () => [...doc.querySelectorAll(`[${OBJECT}]`)];
  const wanted = new Set(ids);
  const chosen = painted().filter((el) => wanted.has(idOf(el)));
  if (!chosen.length) return svg;

  if (move === "front" || move === "back") {
    const all = painted();
    if (
      orderBlock(
        all.map((el) => ({ id: idOf(el) })),
        ids,
        move,
      )
    )
      return svg;
    const rest = all.filter((el) => !wanted.has(idOf(el)));
    if (move === "front") {
      let anchor = rest.at(-1)!;
      for (const el of chosen) {
        place(el, anchor, "after");
        anchor = el;
      }
    } else for (const el of chosen) place(el, rest[0], "before");
    return serializeFigureSvg(doc);
  }

  const overlaps = overlapTest(chosen.map(idOf), options.boxes);
  const groupOf = (el: Element) => options.groups?.get(idOf(el));
  const up = move === "forward";
  let changed = false;
  // 위로 갈 때는 위의 것부터(아래로 갈 때는 아래 것부터) — 고른 것끼리 서로 넘지 않는다
  for (const el of up ? [...chosen].reverse() : chosen) {
    const list = painted();
    const step = up ? 1 : -1;
    for (
      let j = list.indexOf(el) + step;
      j >= 0 && j < list.length;
      j += step
    ) {
      const other = list[j];
      if (!overlaps(idOf(other))) continue;
      if (wanted.has(idOf(other))) break;
      // 남의 묶음이면 붙은 줄을 통째로 넘는다
      const name = groupOf(other);
      let k = j;
      while (name) {
        const beyond = list[k + step];
        if (!beyond || wanted.has(idOf(beyond)) || groupOf(beyond) !== name)
          break;
        k += step;
      }
      place(el, list[k], up ? "after" : "before");
      changed = true;
      break;
    }
  }
  return changed ? serializeFigureSvg(doc) : svg;
}

/** 고른 것의 바깥 상자와 겹치는가. 상자가 하나라도 없으면 늘 겹친다. */
function overlapTest(
  ids: readonly string[],
  boxes?: ReadonlyMap<string, OrderBox>,
) {
  const own = ids.map((id) => boxes?.get(id));
  if (!boxes || own.some((b) => !b)) return () => true;
  const found = own as OrderBox[];
  const union: OrderBox = {
    minX: Math.min(...found.map((b) => b.minX)),
    minY: Math.min(...found.map((b) => b.minY)),
    maxX: Math.max(...found.map((b) => b.maxX)),
    maxY: Math.max(...found.map((b) => b.maxY)),
  };
  return (id: string) => {
    const b = boxes.get(id);
    return (
      !b ||
      (b.minX <= union.maxX &&
        union.minX <= b.maxX &&
        b.minY <= union.maxY &&
        union.minY <= b.maxY)
    );
  };
}

/**
 * `el` 을 `anchor` 바로 뒤(위) 또는 바로 앞(아래)에 그리게 옮긴다 — 둘의 공통 조상 아래에서.
 * `el` 은 원래 조상의 얕은 복사본에 싸여 가고, `anchor` 쪽 조상은 넣을 자리에서 쪼갠다. 그래서 어느 요소도
 * 조상 변환·물려받는 서식이 안 바뀐다.
 */
function place(el: Element, anchor: Element, side: "before" | "after") {
  if (el === anchor) return;
  const up = (node: Element) => {
    const found: Element[] = [];
    for (let p = node.parentElement; p; p = p.parentElement) found.push(p);
    return found;
  };
  const mine = up(el),
    theirs = up(anchor);
  const common = mine.find((p) => theirs.includes(p))!;
  const carried = mine.slice(0, mine.indexOf(common));

  // ① 원래 조상의 복사본으로 싼다(공통 조상 아래까지) — 요소가 원래 자리에서 빠진다
  let top = el;
  for (const ancestor of carried) {
    const copy = ancestor.cloneNode(false) as Element;
    copy.removeAttribute("id");
    copy.append(top);
    top = copy;
  }
  // ② 비게 된 원래 조상은 걷고, 그 자리에서 이웃 층이 다시 만나면 합친다
  for (const ancestor of carried) {
    if (ancestor.children.length || ancestor.hasAttribute("id")) break;
    const before = ancestor.previousElementSibling,
      after = ancestor.nextElementSibling;
    ancestor.remove();
    if (before && after && mergeable(before, after)) join(before, after);
  }
  // ③ 넣을 자리 — anchor 의 조상을 공통 조상 아래까지 그 자리에서 쪼갠다
  let spot = anchor;
  while (spot.parentElement && spot.parentElement !== common) {
    const parent = spot.parentElement;
    const rest: ChildNode[] = [];
    for (
      let n = side === "after" ? spot.nextSibling : spot.previousSibling;
      n;
      n = side === "after" ? n.nextSibling : n.previousSibling
    )
      rest.push(n);
    if (rest.some((n) => n.nodeType === n.ELEMENT_NODE)) {
      const copy = parent.cloneNode(false) as Element;
      copy.removeAttribute("id");
      if (side === "after") {
        copy.append(...rest);
        parent.after(copy);
      } else {
        copy.append(...rest.reverse());
        parent.before(copy);
      }
    }
    spot = parent;
  }
  // ④ 넣고, 속성이 똑같은 이웃 층과 합친다
  if (side === "after") spot.after(top);
  else spot.before(top);
  let merged = top;
  const previous = merged.previousElementSibling;
  if (previous && mergeable(previous, merged)) merged = join(previous, merged);
  const next = merged.nextElementSibling;
  if (next && mergeable(merged, next)) join(merged, next);
}

/** 이웃한 두 `<g>` 를 하나로 합쳐도 그림이 같은가 — 속성이 똑같고 id·묶음 효과가 없을 때. */
function mergeable(a: Element, b: Element) {
  if (a.localName !== "g" || b.localName !== "g") return false;
  if (a.hasAttribute("id") || b.hasAttribute("id")) return false;
  if (GROUP_EFFECT_ATTRS.some((name) => a.hasAttribute(name))) return false;
  if (GROUP_EFFECT.test(a.getAttribute("style") ?? "")) return false;
  if (a.attributes.length !== b.attributes.length) return false;
  return [...a.attributes].every(
    (attr) => b.getAttribute(attr.name) === attr.value,
  );
}

/** 뒤 `<g>` 의 자식을 앞 `<g>` 끝으로 옮기고 뒤를 지운다. 이음매에서 다시 만난 층도 합친다. */
function join(first: Element, second: Element): Element {
  const seam = first.lastElementChild;
  while (second.firstChild) first.append(second.firstChild);
  second.remove();
  const after = seam?.nextElementSibling;
  if (seam && after && mergeable(seam, after)) join(seam, after);
  return first;
}

/**
 * 화면의 캔버스에서 요소마다 차지하는 상자(화면 px) — 한 칸 옮기기가 겹치는 것만 센다.
 * 선 굵기는 상자에 안 들어가므로 1px 씩 넉넉히 잡는다(굵은 선에 닿은 글자도 겹친 것으로).
 * 조판한 글자는 조판본의 묶음(`<g data-object-id>`)으로 잰다.
 */
export function measureOrderBoxes(root: SVGSVGElement): Map<string, OrderBox> {
  const boxes = new Map<string, OrderBox>();
  for (const node of root.querySelectorAll(`[${OBJECT}]`)) {
    const r = node.getBoundingClientRect();
    if (![r.left, r.top, r.right, r.bottom].every(Number.isFinite)) continue;
    boxes.set(idOf(node), {
      minX: r.left - 1,
      minY: r.top - 1,
      maxX: r.right + 1,
      maxY: r.bottom + 1,
    });
  }
  return boxes;
}
