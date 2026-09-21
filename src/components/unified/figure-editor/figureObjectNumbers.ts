export interface FigureNumber {
  /** 번호를 매긴 요소 — 묶음이면 번호가 가장 작은 속 요소. */
  id: string;
  /** 이 번호표가 가리키는 요소 전부 — 묶음이면 속 요소 모두, 아니면 자기 하나. */
  ids: readonly string[];
  /** 묶음 이름 — 번호표 설명에 쓴다. 묶음이 아니면 없다. */
  group?: string;
  number: number;
  x: number;
  y: number;
  /** 지시선이 가리키는 곳 — 묶음이면 속 요소 가운데들의 한가운데. */
  targetX: number;
  targetY: number;
  /** 묶음일 때만 — 속 요소마다의 가운데(번호표 하나에서 지시선이 여럿 나간다). */
  targets?: readonly { x: number; y: number }[];
}

/** 요소 가운데(선이면 길이의 가운데) — 번호 지시선이 가리키는 곳. */
const numberTarget = (
  node: SVGGraphicsElement,
  bounds: DOMRect,
  scaleX: number,
  scaleY: number,
) => {
  const box = node.getBoundingClientRect();
  let targetX = box.x + box.width / 2 - bounds.x,
    targetY = box.y + box.height / 2 - bounds.y;
  if (node instanceof SVGGeometryElement) {
    try {
      const point = node
        .getPointAtLength(node.getTotalLength() / 2)
        .matrixTransform(node.getScreenCTM()!);
      targetX = point.x - bounds.x;
      targetY = point.y - bounds.y;
    } catch {
      /* 비어 있는 도형은 경계 상자를 기준으로 한다. */
    }
  }
  return { targetX: targetX * scaleX, targetY: targetY * scaleY };
};

// 모달 열림 애니메이션의 CSS scale을 제거한다. 화면 좌표를 그대로 쓰면
// 애니메이션 종료 후 오른쪽/아래 번호가 그림 안쪽으로 밀려 들어온다.
const unscale = (root: SVGSVGElement, bounds: DOMRect) => ({
  scaleX: root.clientWidth / bounds.width,
  scaleY: root.clientHeight / bounds.height,
});

/** 번호표 하나가 가리키는 곳 — 속 요소 가운데들의 한가운데(하나면 그 가운데). */
const merged = (targets: readonly { x: number; y: number }[]) => ({
  targetX:
    (Math.min(...targets.map((p) => p.x)) +
      Math.max(...targets.map((p) => p.x))) /
    2,
  targetY:
    (Math.min(...targets.map((p) => p.y)) +
      Math.max(...targets.map((p) => p.y))) /
    2,
});

/**
 * 도형 바깥 24px 여백에 번호를 배치한다. 번호끼리 겹치지 않는 가장 가까운 자리를 쓴다.
 *
 * 번호는 요소에 붙은 **고정 번호**(`numbers` — `figureNumbers`, 원장님 2026-09-21 «순서를 바꿔도 요소 번호가
 * 안바뀌게») — 그리는 차례가 아니다. 반드시 넘겨야 한다(빠뜨리면 차례 번호가 새어 AI 가 딴 요소를 고친다).
 * **묶어도 번호는 그대로다.** «요청대로 고치기»가 그 번호로 요소를 가리키고
 * (`figure-edit-contract.ts` 의 `target: n`, `describeFigureForEdit` 의 `n`), AI 에게 보내는 그림
 * (`figureEditSnapshot`)은 묶음을 주지 않고 이 함수를 불러 **요소마다** 번호를 그대로 단다.
 * `groups`(요소 id → 묶음 이름)를 주면 **화면에서만** 같은 묶음의 번호표를 하나로 합친다
 * (원장님 2026-09-21 «그룹화되면 번호를 하나로 합치게 할 것» — 사다리꼴 상자 하나에 ⑯ ⑰ 둘이 붙어 있었다).
 * 합친 번호표는 속 요소 중 **가장 작은 번호**를 쓰고, 지시선은 속 요소마다 하나씩 나간다.
 * 번호표 자리는 **번호 차례로** 잡는다 — 맨 앞으로·맨 뒤로를 해도 번호표가 제자리에 선다.
 */
export function layoutFigureNumbers(
  root: SVGSVGElement,
  numbers: ReadonlyMap<string, number>,
  groups?: ReadonlyMap<string, string>,
): FigureNumber[] {
  const bounds = root.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return [];
  const width = root.clientWidth,
    height = root.clientHeight;
  const { scaleX, scaleY } = unscale(root, bounds);
  const slots: { x: number; y: number }[] = [];
  const margin = 12,
    gap = 28;
  for (let x = 14; x < width - 8; x += gap)
    slots.push({ x, y: -margin }, { x, y: height + margin });
  for (let y = 14; y < height - 8; y += gap)
    slots.push({ x: -margin, y }, { x: width + margin, y });

  // 번호표 단위 — 같은 묶음은 하나로(번호는 가장 작은 번호, 지시선은 속 요소마다)
  type Unit = {
    id: string;
    ids: string[];
    group?: string;
    number: number;
    targets: { x: number; y: number }[];
  };
  const units: Unit[] = [];
  const byGroup = new Map<string, Unit>();
  root
    .querySelectorAll<SVGGraphicsElement>("[data-object-id]")
    .forEach((node) => {
      const id = node.getAttribute("data-object-id")!;
      const number = numbers.get(id);
      if (number === undefined) return;
      const { targetX, targetY } = numberTarget(node, bounds, scaleX, scaleY);
      const at = { x: targetX, y: targetY };
      const name = groups?.get(id);
      const unit = name ? byGroup.get(name) : undefined;
      if (unit) {
        unit.ids.push(id);
        unit.targets.push(at);
        if (number < unit.number) {
          unit.number = number;
          unit.id = id;
        }
        return;
      }
      const made: Unit = {
        id,
        ids: [id],
        group: name,
        number,
        targets: [at],
      };
      if (name) byGroup.set(name, made);
      units.push(made);
    });
  units.sort((a, b) => a.number - b.number);

  const placed: FigureNumber[] = [];
  units.forEach((unit, index) => {
    const { targetX, targetY } = merged(unit.targets);
    let best = 0,
      score = Infinity;
    slots.forEach((slot, slotIndex) => {
      const distance = Math.hypot(slot.x - targetX, slot.y - targetY);
      if (distance < score) {
        best = slotIndex;
        score = distance;
      }
    });
    // 매우 많은 요소도 추가 바깥 줄을 써서 번호가 중복되지 않게 한다.
    const slot = slots.splice(best, 1)[0] ?? {
      x: 14 + (index % 10) * gap,
      y: -margin - gap * (1 + Math.floor(index / 10)),
    };
    placed.push({
      ...slot,
      id: unit.id,
      ids: unit.ids,
      ...(unit.group ? { group: unit.group } : {}),
      number: unit.number,
      targetX,
      targetY,
      ...(unit.targets.length > 1 ? { targets: unit.targets } : {}),
    });
  });
  return placed;
}

/**
 * 끄는 동안 — 번호 자리는 그대로 두고 끄는 요소의 지시선 끝만 옮긴다. 걸음마다 요소 전부를 다시 재면
 * (요소마다 getBoundingClientRect·getTotalLength·getScreenCTM — 요소 38개면 걸음당 22번의 getTotalLength)
 * 느린 PC 에서 한 걸음이 한참 걸린다(2026-09-18). 놓으면 layoutFigureNumbers 로 다시 배치한다.
 * 바뀐 것이 없으면 같은 배열을 돌려준다 — 번호 층이 다시 그려지지 않는다.
 * 묶음 번호표는 속 요소 하나만 끌어도 지시선 전부를 다시 잰다(한가운데가 따라 움직인다).
 */
export function retargetFigureNumbers(
  root: SVGSVGElement,
  numbers: FigureNumber[],
  ids: readonly string[],
): FigureNumber[] {
  const bounds = root.getBoundingClientRect();
  if (!bounds.width || !bounds.height || !ids.length) return numbers;
  const { scaleX, scaleY } = unscale(root, bounds);
  let changed = false;
  const next = numbers.map((item) => {
    if (!item.ids.some((id) => ids.includes(id))) return item;
    const targets = item.ids.map((id) => {
      const node = root.querySelector<SVGGraphicsElement>(
        `[data-object-id="${id}"]`,
      );
      const at = node && numberTarget(node, bounds, scaleX, scaleY);
      return at ? { x: at.targetX, y: at.targetY } : null;
    });
    if (targets.some((at) => !at)) return item;
    const found = targets as { x: number; y: number }[];
    const { targetX, targetY } = merged(found);
    if (targetX === item.targetX && targetY === item.targetY) return item;
    changed = true;
    return {
      ...item,
      targetX,
      targetY,
      ...(found.length > 1 ? { targets: found } : {}),
    };
  });
  return changed ? next : numbers;
}
