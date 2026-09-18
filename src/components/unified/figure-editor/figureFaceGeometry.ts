/**
 * 면 찾기의 평면 기하 — 선들이 가른 평면에서 «누른 점을 둘러싼 가장 작은 닫힌 영역»과 «선 묶음이 두른 바깥 테두리».
 * 원장님 2026-09-19 «면을 쉽게 만들 수 있어야 색칠을 할 수가 있음» — 채우기 통·묶음 안쪽 채우기·다각형 도구의 달라붙기가 쓴다.
 * 화면·DOM 과 무관한 순수 계산이다. 곡선(원·타원·호·곡선·함수 그래프)은 부르는 쪽이 꺾은선으로 펴서 넘긴다(figureFaceSources).
 *
 * 차례
 *  ① 열린 선의 끝점을 허용 오차 안의 다른 선의 꼭짓점(먼저)·선 위(다음)로 옮긴다 — 조금 안 맞는 끝점, T 자로 모자란 선.
 *     열린 끝점만 옮긴다. 모든 점을 오차로 합치면 촘촘한 곡선(함수 그래프 1200점)이 사슬처럼 한 점으로 뭉친다.
 *  ② 선분끼리 만나거나 닿는 곳에서 자른다 — 겹친 선은 서로의 끝점에서 잘려 같은 변이 된다.
 *  ③ 같은 자리(아주 작은 오차)의 점을 하나로, 같은 두 점을 잇는 변을 하나로(어느 선들이 냈는지는 모아 둔다).
 *  ④ 매달린 가지(끝점이 하나뿐인 변)를 걷는다 — 삐져나온 꼬리·닫히지 않은 선.
 *  ⑤ 꼭짓점마다 나가는 변을 각도로 늘어놓고, 들어온 변의 바로 앞(각도가 작은 쪽) 변으로 돌아 고리를 모은다.
 *     이렇게 돌면 갇힌 면은 넓이(신발끈 공식)가 양수, 한 덩어리의 바깥 테두리는 음수로 나온다(y 가 아래로 자라도 같다).
 */

export interface Point {
  x: number;
  y: number;
}

/** 경계가 되는 선 하나 — 꺾은선(닫히면 다각형). id 는 그 선을 낸 요소. */
export interface FaceCurve {
  id: string;
  points: readonly Point[];
  closed: boolean;
  /**
   * 진짜 꼭짓점(명령 끝점·다각형 꼭짓점)의 차례 — 없으면 모든 점. 원·곡선의 표본점은 꼭짓점이 아니다:
   * 끝점 붙이기가 꼭짓점을 먼저 찾을 때 표본점으로 끌려가면 선이 허용 오차만큼 기운다(현이 원의 표본점에 붙어 활꼴이 4% 어긋났다).
   */
  corners?: readonly number[];
}

/** 찾은 면 — 바깥 고리와 구멍들. 넓이는 구멍을 뺀 값, sourceIds 는 경계를 이루는 요소(바깥·구멍 모두). */
export interface FaceRegion {
  outer: Point[];
  holes: Point[][];
  area: number;
  sourceIds: string[];
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface FaceCycle {
  ring: Point[];
  /** 부호 있는 넓이 — 양수면 갇힌 면, 음수면 덩어리의 바깥 테두리. */
  area: number;
  component: number;
  box: Box;
  sources: string[];
}

export interface FaceArrangement {
  /** 둘 이상의 선이 만나거나 선이 끝나는 곳 — 매달린 가지를 걷기 전에 모은다(다각형 도구의 달라붙기 후보). */
  junctions: Point[];
  cycles: FaceCycle[];
  /** 덩어리마다의 바깥 테두리 고리 */
  outers: Map<number, FaceCycle>;
}

interface Segment {
  a: Point;
  b: Point;
  id: string;
  cuts: number[];
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** 신발끈 공식 — 부호 있는 넓이. */
export function ringArea(ring: readonly Point[]) {
  let sum = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i],
      b = ring[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

const boxOf = (ring: readonly Point[]): Box => {
  const box = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  for (const p of ring) {
    box.minX = Math.min(box.minX, p.x);
    box.minY = Math.min(box.minY, p.y);
    box.maxX = Math.max(box.maxX, p.x);
    box.maxY = Math.max(box.maxY, p.y);
  }
  return box;
};
const inBox = (p: Point, box: Box) =>
  p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;

/** 반직선 홀짝 판정 — 경계 위의 점은 어느 쪽이든 된다. */
function inRing(p: Point, ring: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

/** 바깥 고리 안이고 구멍 밖인가(홀짝 규칙 — 면 요소의 fill-rule 과 같다). */
export function pointInRegion(
  p: Point,
  outer: readonly Point[],
  holes: readonly (readonly Point[])[] = [],
) {
  let inside = inRing(p, outer);
  for (const hole of holes) if (inRing(p, hole)) inside = !inside;
  return inside;
}

function closestOnSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length2 = dx * dx + dy * dy;
  const t = length2
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2))
    : 0;
  return { x: a.x + t * dx, y: a.y + t * dy, t };
}

/** 반직선 p + s·u (0 ≤ s ≤ max) 가 선분 a–b 에 닿는 s — 안 닿으면 null. */
function rayHit(p: Point, u: Point, a: Point, b: Point, max: number) {
  const ex = b.x - a.x,
    ey = b.y - a.y,
    wx = a.x - p.x,
    wy = a.y - p.y;
  const denominator = u.x * ey - u.y * ex;
  if (Math.abs(denominator) < 1e-12) return null;
  const s = (wx * ey - wy * ex) / denominator,
    t = (wx * u.y - wy * u.x) / denominator;
  return s >= 0 && s <= max && t >= 0 && t <= 1 ? s : null;
}

/**
 * ① 열린 선의 끝점 붙이기. 서로 허용 오차 안의 열린 끝점은 한 무리로 묶어 함께 옮긴다. 옮길 곳은 차례대로
 *   ⓐ 가던 방향으로 늘여 허용 오차 안에서 닿는 **다른 선** — 끝 선분이 긴 선부터(그 선은 곧게 남아 면 가장자리가 그은 선 밑에 숨는다)
 *   ⓑ 무리 가운데에서 가장 가까운 다른 선의 진짜 꼭짓점 ⓒ 다른 선 위의 가장 가까운 점 ⓓ (둘 이상이면) 무리의 가운데.
 * - 제 선에는 붙지 않는다 — 촘촘한 곡선(표본 간격 < 허용 오차)의 끝점이 제 이웃 표본점으로 끌려가 x축에서 떨어졌다.
 *   제 선의 양 끝이 가까우면(거의 닫힌 꺾은선) 두 끝이 한 무리가 되어 닫힌다.
 * - 끝점끼리만 붙고 멈추지 않는다 — 현과 반지름이 원에 조금 못 미친 한 점에서 만나면 둘이 함께 원 위로 간다.
 */
function snapOpenEnds(
  curves: { points: Point[]; closed: boolean; corners?: readonly number[] }[],
  tolerance: number,
) {
  const ends = curves.flatMap((curve, c) =>
    curve.closed
      ? []
      : [
          { c, i: 0 },
          { c, i: curve.points.length - 1 },
        ],
  );
  const at = (end: { c: number; i: number }) => curves[end.c].points[end.i];
  const parent = ends.map((_, k) => k);
  const find = (k: number): number =>
    parent[k] === k ? k : (parent[k] = find(parent[k]));
  for (let a = 0; a < ends.length; a++)
    for (let b = a + 1; b < ends.length; b++)
      if (distance(at(ends[a]), at(ends[b])) <= tolerance)
        parent[find(a)] = find(b);
  const groups = new Map<number, { c: number; i: number }[]>();
  ends.forEach((end, k) =>
    groups.set(find(k), [...(groups.get(find(k)) ?? []), end]),
  );
  for (const members of groups.values()) {
    const center = {
      x: members.reduce((sum, m) => sum + at(m).x, 0) / members.length,
      y: members.reduce((sum, m) => sum + at(m).y, 0) / members.length,
    };
    const own = new Set(members.map((m) => m.c));
    let target: Point | null = null,
      best = tolerance;
    const segmentsOf = (visit: (a: Point, b: Point) => void) =>
      curves.forEach((other, k) => {
        if (own.has(k)) return;
        const n = other.points.length,
          count = other.closed ? n : n - 1;
        for (let i = 0; i < count; i++)
          visit(other.points[i], other.points[(i + 1) % n]);
      });
    const directions = members
      .map((m) => {
        const p = at(m),
          previous = curves[m.c].points[m.i === 0 ? 1 : m.i - 1];
        const length = distance(p, previous);
        return {
          p,
          length,
          u: {
            x: (p.x - previous.x) / length,
            y: (p.y - previous.y) / length,
          },
        };
      })
      .filter((d) => d.length > 0)
      .sort((a, b) => b.length - a.length);
    for (const { p, u } of directions) {
      let hit = Infinity;
      segmentsOf((a, b) => {
        const s = rayHit(p, u, a, b, tolerance);
        if (s !== null && s < hit) hit = s;
      });
      if (hit <= tolerance) {
        target = { x: p.x + u.x * hit, y: p.y + u.y * hit };
        break;
      }
    }
    if (!target)
      curves.forEach((other, k) => {
        if (own.has(k)) return;
        for (const q of other.corners?.map((i) => other.points[i]) ??
          other.points) {
          const d = distance(center, q);
          if (d <= best) {
            target = q;
            best = d;
          }
        }
      });
    if (!target)
      segmentsOf((a, b) => {
        const q = closestOnSegment(center, a, b);
        const d = distance(center, q);
        if (d <= best) {
          target = { x: q.x, y: q.y };
          best = d;
        }
      });
    const to: Point | null = target ?? (members.length > 1 ? center : null);
    if (to)
      for (const m of members) curves[m.c].points[m.i] = { x: to.x, y: to.y };
  }
}

/** ② 두 선분이 닿거나 엇갈리는 자리를 양쪽에 자를 자리(0~1)로 적는다. 평행하게 겹치면 서로의 끝점이 닿음으로 잡힌다. */
function cutAtCrossing(p: Segment, q: Segment, epsilon: number) {
  const touch = (s: Segment, point: Point) => {
    const c = closestOnSegment(point, s.a, s.b);
    if (distance(c, point) <= epsilon) s.cuts.push(c.t);
  };
  touch(p, q.a);
  touch(p, q.b);
  touch(q, p.a);
  touch(q, p.b);
  const side = (s: Segment, point: Point) => {
    const dx = s.b.x - s.a.x,
      dy = s.b.y - s.a.y;
    return (
      (dx * (point.y - s.a.y) - dy * (point.x - s.a.x)) / Math.hypot(dx, dy)
    );
  };
  const q1 = side(p, q.a),
    q2 = side(p, q.b),
    p1 = side(q, p.a),
    p2 = side(q, p.b);
  if (
    Math.min(Math.abs(q1), Math.abs(q2), Math.abs(p1), Math.abs(p2)) >
      epsilon &&
    q1 * q2 < 0 &&
    p1 * p2 < 0
  ) {
    p.cuts.push(p1 / (p1 - p2));
    q.cuts.push(q1 / (q1 - q2));
  }
}

/**
 * 선들을 평면 그래프로 짜고 면 고리를 모은다.
 * @param tolerance 열린 끝점을 붙일 거리(문서 단위). 0 이면 붙이지 않는다.
 */
export function arrangeFaceCurves(
  curves: readonly FaceCurve[],
  tolerance = 0,
): FaceArrangement {
  const lines = curves
    .map((curve) => {
      const points = curve.points
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        .map((p) => ({ x: p.x, y: p.y }));
      return {
        id: curve.id,
        closed: curve.closed,
        points,
        // 걸러 낸 점이 있으면 차례가 어긋나므로 모든 점을 꼭짓점으로 본다.
        corners:
          points.length === curve.points.length ? curve.corners : undefined,
      };
    })
    .filter((curve) => curve.points.length >= 2);
  let extent = 1;
  for (const curve of lines)
    for (const p of curve.points)
      extent = Math.max(extent, Math.abs(p.x), Math.abs(p.y));
  // 같은 자리로 칠 거리 — 교점 계산의 부동소수 오차만 삼킨다(허용 오차가 아니다).
  const epsilon = extent * 1e-7;
  if (tolerance > 0) snapOpenEnds(lines, tolerance);

  const segments: Segment[] = [];
  for (const curve of lines) {
    const n = curve.points.length,
      count = curve.closed ? n : n - 1;
    for (let i = 0; i < count; i++) {
      const a = curve.points[i],
        b = curve.points[(i + 1) % n];
      if (distance(a, b) > epsilon)
        segments.push({ a, b, id: curve.id, cuts: [0, 1] });
    }
  }

  // ② x 로 늘어놓고 쓸어 가며 겹칠 수 있는 짝만 잰다.
  const low = (s: Segment) => Math.min(s.a.x, s.b.x);
  const high = (s: Segment) => Math.max(s.a.x, s.b.x);
  let active: Segment[] = [];
  for (const s of [...segments].sort((a, b) => low(a) - low(b))) {
    const left = low(s) - epsilon;
    active = active.filter((q) => high(q) >= left);
    const top = Math.min(s.a.y, s.b.y) - epsilon,
      bottom = Math.max(s.a.y, s.b.y) + epsilon;
    for (const q of active)
      if (Math.max(q.a.y, q.b.y) >= top && Math.min(q.a.y, q.b.y) <= bottom)
        cutAtCrossing(s, q, epsilon);
    active.push(s);
  }

  // ③ 점과 변
  const vertices: Point[] = [];
  const grid = new Map<string, number[]>();
  const cell = epsilon * 2;
  const vertexAt = (p: Point) => {
    const gx = Math.floor(p.x / cell),
      gy = Math.floor(p.y / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const k of grid.get(`${gx + dx},${gy + dy}`) ?? [])
          if (distance(vertices[k], p) <= epsilon) return k;
    vertices.push(p);
    const key = `${gx},${gy}`;
    grid.set(key, [...(grid.get(key) ?? []), vertices.length - 1]);
    return vertices.length - 1;
  };
  const edges = new Map<
    string,
    { u: number; v: number; sources: Set<string> }
  >();
  for (const s of segments) {
    const cuts = [...new Set(s.cuts)].sort((a, b) => a - b);
    let previous = vertexAt(s.a);
    for (const t of cuts) {
      if (t <= 0) continue;
      const next = vertexAt(
        t >= 1
          ? s.b
          : { x: s.a.x + t * (s.b.x - s.a.x), y: s.a.y + t * (s.b.y - s.a.y) },
      );
      if (next !== previous) {
        const key =
          previous < next ? `${previous},${next}` : `${next},${previous}`;
        const edge = edges.get(key);
        if (edge) edge.sources.add(s.id);
        else edges.set(key, { u: previous, v: next, sources: new Set([s.id]) });
      }
      previous = next;
    }
  }
  const edgeList = [...edges.values()];

  // 달라붙기 후보 — 걷기 전에: 선이 끝나거나(차수 ≠ 2) 서로 다른 선이 만나는 점.
  const degree = vertices.map(() => 0);
  const touching = vertices.map(() => new Set<string>());
  for (const edge of edgeList)
    for (const k of [edge.u, edge.v]) {
      degree[k]++;
      for (const id of edge.sources) touching[k].add(id);
    }
  const junctions = vertices.filter(
    (_, k) => degree[k] > 0 && (degree[k] !== 2 || touching[k].size > 1),
  );

  // ④ 매달린 가지 걷기
  const incident = vertices.map(() => [] as number[]);
  edgeList.forEach((edge, e) => {
    incident[edge.u].push(e);
    incident[edge.v].push(e);
  });
  const alive = edgeList.map(() => true);
  const queue = vertices.flatMap((_, k) => (degree[k] === 1 ? [k] : []));
  while (queue.length) {
    const k = queue.pop()!;
    if (degree[k] !== 1) continue;
    const e = incident[k].find((index) => alive[index]);
    if (e === undefined) continue;
    alive[e] = false;
    const other = edgeList[e].u === k ? edgeList[e].v : edgeList[e].u;
    degree[k]--;
    degree[other]--;
    if (degree[other] === 1) queue.push(other);
  }
  const live = edgeList.filter((_, e) => alive[e]);

  // ⑤ 반변(half-edge) 2e: u→v, 2e+1: v→u
  const origin = (h: number) => (h % 2 ? live[h >> 1].v : live[h >> 1].u);
  const out = new Map<number, number[]>();
  live.forEach((_, e) => {
    for (const h of [2 * e, 2 * e + 1])
      out.set(origin(h), [...(out.get(origin(h)) ?? []), h]);
  });
  const angle = (h: number) => {
    const from = vertices[origin(h)],
      to = vertices[origin(h ^ 1)];
    return Math.atan2(to.y - from.y, to.x - from.x);
  };
  const position = new Map<number, number>();
  for (const list of out.values()) {
    list.sort((a, b) => angle(a) - angle(b));
    list.forEach((h, i) => position.set(h, i));
  }
  const nextOf = (h: number) => {
    const list = out.get(origin(h ^ 1))!;
    return list[(position.get(h ^ 1)! - 1 + list.length) % list.length];
  };

  // 덩어리(서로 이어진 변들)
  const parent = vertices.map((_, k) => k);
  const find = (k: number): number =>
    parent[k] === k ? k : (parent[k] = find(parent[k]));
  for (const edge of live) parent[find(edge.u)] = find(edge.v);

  const cycles: FaceCycle[] = [];
  const seen = new Set<number>();
  for (let start = 0; start < live.length * 2; start++) {
    if (seen.has(start)) continue;
    const ring: Point[] = [],
      sources = new Set<string>();
    let h = start;
    do {
      seen.add(h);
      ring.push(vertices[origin(h)]);
      for (const id of live[h >> 1].sources) sources.add(id);
      h = nextOf(h);
    } while (h !== start);
    cycles.push({
      ring,
      area: ringArea(ring),
      component: find(origin(start)),
      box: boxOf(ring),
      sources: [...sources],
    });
  }
  const outers = new Map<number, FaceCycle>();
  for (const cycle of cycles)
    if (cycle.area <= 0) {
      const known = outers.get(cycle.component);
      if (!known || cycle.area < known.area) outers.set(cycle.component, cycle);
    }
  return { junctions, cycles, outers };
}

/** p 를 품는 갇힌 고리 중 가장 작은 것(다른 덩어리를 빼고 볼 수 있다). */
function smallestAround(
  arrangement: FaceArrangement,
  p: Point,
  except?: number,
): FaceCycle | null {
  let best: FaceCycle | null = null;
  for (const cycle of arrangement.cycles)
    if (
      cycle.area > 0 &&
      cycle.component !== except &&
      inBox(p, cycle.box) &&
      inRing(p, cycle.ring) &&
      (!best || cycle.area < best.area)
    )
      best = cycle;
  return best;
}

/** 갇힌 고리 하나를 면으로 — 그 안에 바로 든(다른 덩어리의 면 속이 아닌) 덩어리의 바깥 테두리가 구멍이다. */
function regionOf(arrangement: FaceArrangement, cycle: FaceCycle): FaceRegion {
  const holes: Point[][] = [];
  const sources = new Set(cycle.sources);
  let area = cycle.area;
  for (const [component, outer] of arrangement.outers) {
    if (component === cycle.component) continue;
    const probe = outer.ring[0];
    if (!inBox(probe, cycle.box) || !inRing(probe, cycle.ring)) continue;
    if (smallestAround(arrangement, probe, component) !== cycle) continue;
    holes.push([...outer.ring].reverse());
    for (const id of outer.sources) sources.add(id);
    area += outer.area;
  }
  return { outer: [...cycle.ring], holes, area, sourceIds: [...sources] };
}

/** 누른 점을 둘러싼 가장 작은 닫힌 영역. 없으면(바깥·열린 선 안) null. */
export function faceAt(
  arrangement: FaceArrangement,
  p: Point,
): FaceRegion | null {
  const cycle = smallestAround(arrangement, p);
  return cycle ? regionOf(arrangement, cycle) : null;
}

/** 갇힌 면 전부(구멍 포함) — 면이 선을 따라갈 때 같은 칸을 다시 고른다. */
export function boundedFaces(arrangement: FaceArrangement): FaceRegion[] {
  return arrangement.cycles
    .filter((cycle) => cycle.area > 0)
    .map((cycle) => regionOf(arrangement, cycle));
}

/**
 * 묶음이 두른 닫힌 영역의 바깥 테두리 — 칸이 여럿이어도(삼각형 + 안쪽 선) 합친 바깥 하나.
 * 다른 덩어리의 면 속에 든 덩어리는 그 면에 포함되므로 따로 세지 않는다. 닫힌 영역이 없으면 [].
 */
export function closedOutlines(arrangement: FaceArrangement): FaceRegion[] {
  const regions: FaceRegion[] = [];
  for (const [component, outer] of arrangement.outers) {
    if (
      !arrangement.cycles.some((c) => c.component === component && c.area > 0)
    )
      continue;
    if (smallestAround(arrangement, outer.ring[0], component)) continue;
    regions.push({
      outer: [...outer.ring].reverse(),
      holes: [],
      area: -outer.area,
      sourceIds: [...outer.sources],
    });
  }
  return regions;
}

/** 면 안쪽의 한 점 — 가로줄 몇 개를 그어 안쪽 구간이 가장 넓은 곳의 가운데. 무게중심이 밖인 오목한 면·고리에서도 안이다. */
export function interiorPoint(
  outer: readonly Point[],
  holes: readonly (readonly Point[])[] = [],
): Point {
  const box = boxOf(outer);
  let best = {
    width: -1,
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
  };
  for (const f of [0.5, 0.35, 0.65, 0.2, 0.8, 0.43, 0.57, 0.1, 0.9]) {
    const y = box.minY + f * (box.maxY - box.minY);
    const xs: number[] = [];
    for (const ring of [outer, ...holes])
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i],
          b = ring[j];
        if (a.y > y !== b.y > y)
          xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2)
      if (xs[i + 1] - xs[i] > best.width)
        best = { width: xs[i + 1] - xs[i], x: (xs[i] + xs[i + 1]) / 2, y };
  }
  return { x: best.x, y: best.y };
}
