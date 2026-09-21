// @vitest-environment node
/**
 * 🔴 RED → 🟢 — **그래프(graph-1)의 축 생략 물결(∿) `axisBreaks`** (원장님 2026-09-21 «물결 기호는 넣어»).
 *
 * 원장님이 산점도(미술·음악 점수) 한 장을 주시며 «우리 엔진으로 구현 불가능해?» 하셨고, 리드가 graph-1 로
 * 실제로 그려 보니 **물결 하나만** 안 됐다 — 짧은 선분 둘로 「∧」 를 흉내 냈을 뿐이다(`curves` 는 다항식·반비례만).
 *
 * 무엇을 잠그나 — 키가 있나가 아니라 **그려진 path 의 좌표**를 본다.
 * - 물결은 **한 요소**(`<path>`)다: 검은 획이 물결을 긋고, 흰 채움이 그 자리의 축 선을 가린다.
 *   흰 바탕을 따로 두면 편집기가 보이지 않는 요소 하나를 더 센다(v2 바탕 rect 가 «사각형 1번»이던 함정).
 * - 곡선은 **매끄럽다**: 삼차 베지에(C)로, 이음매마다 접선이 이어진다 — 꺾인 「∧」 가 아니다.
 * - 축 **양쪽**으로 한 번씩 넘실댄다(∿). 축 방향 길이는 `size` 화면 픽셀 — 그래프 눈금과 무관하다
 *   (`points` 의 반지름과 같은 까닭: 데이터 단위면 가로·세로 눈금이 다른 그래프에서 찌그러진다).
 * - 흰 채움이 **끊긴 자리의 축 띠를 빈틈없이** 덮는다(띠 위 표본 점이 채움 안이거나 검은 획 위).
 * - 획 굵기는 밑의 축과 같다(자동 축 1.4 · 선분 축 1.7) — 다르면 이음매에 턱이 진다.
 * - 모르는 필드·모르는 축·범위 밖 크기는 조용히 그리지 않고 **거절**한다(다른 graph-1 칸과 같다).
 * - 배선: 모델이 받는 계약·지시문에 실리고, 경계(zod)가 칸을 통과시키고, 거절 반박이 «물결»을 안다.
 */
import { describe, expect, it, vi } from "vitest";
import catalog from "../../../scripts/figure/engine-catalog.json";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import { buildFigureSpecPrompt } from "@/lib/dev-ai/figure-prompt";
import { isEngineCapabilityRefusal } from "@/lib/dev-ai/figure-refusal";
import { parseFigureSpecResult } from "@/lib/dev-ai/figure-spec";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

vi.mock("server-only", () => ({}));

/** 원장님 산점도의 뼈대 — 원점이 (0,0) 이 아니라서 축을 선분으로 긋는다(자동 축은 0 에만 선다). */
const scatter = {
  version: "graph-1",
  xRange: [30, 110],
  yRange: [22, 112],
  width: 440,
  height: 400,
  axes: false,
  segments: [
    { from: [32, 32], to: [107, 32], arrow: true },
    { from: [32, 32], to: [32, 110], arrow: true },
  ],
  points: [{ at: [40, 40] }],
  labels: [{ at: [40, 32], text: "40", dy: 20 }],
};
// 화면 좌표 — graph_scene 의 pad 48: x = 48 + (x−30)·344/80, y = 352 − (y−22)·304/90
const sx = (x: number) => 48 + ((x - 30) * 344) / 80;
const sy = (y: number) => 352 - ((y - 22) * 304) / 90;

const render = (spec: object) =>
  renderFigureSpec(spec, { typeset: false, strict: true });

type P = [number, number];
type Seg = { kind: "L" | "C"; pts: P[] }; // pts[0] 은 시작점
/** path d → 하위 경로별 조각(M·L·C 만 — 물결은 그 셋으로만 그린다). */
function parse(d: string): Seg[][] {
  const tokens = d.match(
    /[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g,
  )!;
  const subs: Seg[][] = [];
  let at: P = [0, 0];
  let command = "";
  for (let i = 0; i < tokens.length;) {
    if (/[A-Za-z]/.test(tokens[i])) command = tokens[i++];
    const read = (): P => [Number(tokens[i++]), Number(tokens[i++])];
    if (command === "M") {
      at = read();
      subs.push([]);
    } else if (command === "L") {
      const to = read();
      subs.at(-1)!.push({ kind: "L", pts: [at, to] });
      at = to;
    } else if (command === "C") {
      const c1 = read(),
        c2 = read(),
        to = read();
      subs.at(-1)!.push({ kind: "C", pts: [at, c1, c2, to] });
      at = to;
    } else throw new Error(`물결 path 에 뜻밖의 명령: ${command}`);
  }
  return subs;
}
const cubic = ([p0, p1, p2, p3]: P[], t: number): P => {
  const m = 1 - t;
  const f = (k: 0 | 1) =>
    m ** 3 * p0[k] +
    3 * m * m * t * p1[k] +
    3 * m * t * t * p2[k] +
    t ** 3 * p3[k];
  return [f(0), f(1)];
};
/** 하위 경로 하나를 촘촘한 점열로(채움 판정·획 거리 판정에 같이 쓴다). */
const sample = (sub: Seg[], n = 64): P[] =>
  sub.flatMap((seg, index) =>
    Array.from({ length: n + 1 }, (_, k) => k / n)
      .filter((t) => index === 0 || t > 0)
      .map((t) =>
        seg.kind === "L"
          ? ([
              seg.pts[0][0] + (seg.pts[1][0] - seg.pts[0][0]) * t,
              seg.pts[0][1] + (seg.pts[1][1] - seg.pts[0][1]) * t,
            ] as P)
          : cubic(seg.pts, t),
      ),
  );
/** 채움 규칙 nonzero — 열린 하위 경로는 끝→시작으로 닫힌 것으로 센다(SVG 규칙). */
function winding(polys: P[][], [x, y]: P) {
  let w = 0;
  for (const poly of polys)
    poly.forEach(([x1, y1], i) => {
      const [x2, y2] = poly[(i + 1) % poly.length];
      const cross = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
      if (y1 <= y && y < y2 && cross > 0) w += 1;
      else if (y2 <= y && y < y1 && cross < 0) w -= 1;
    });
  return w;
}
function distanceToStroke(polys: P[][], [x, y]: P) {
  let best = Infinity;
  for (const poly of polys)
    for (let i = 0; i + 1 < poly.length; i++) {
      const [x1, y1] = poly[i],
        [x2, y2] = poly[i + 1];
      const dx = x2 - x1,
        dy = y2 - y1;
      const t = Math.max(
        0,
        Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)),
      );
      best = Math.min(best, Math.hypot(x - x1 - t * dx, y - y1 - t * dy));
    }
  return best;
}
const paths = (svg: string) =>
  [...svg.matchAll(/<path\b[^>]*>/g)].map(([tag]) => tag);
const attr = (tag: string, name: string) =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
/** 물결 한 장 — 흰 채움 path 는 정확히 하나여야 한다. */
async function breakOf(spec: object) {
  const result = await render(spec);
  expect(result.ok, result.ok ? "" : result.error).toBe(true);
  if (!result.ok) throw new Error(result.error);
  const waves = paths(result.svg).filter((tag) => attr(tag, "fill") === "#fff");
  expect(waves).toHaveLength(1);
  const [tag] = waves;
  const subs = parse(attr(tag, "d")!);
  const polys = subs.map((sub) => sample(sub));
  return { svg: result.svg, tag, subs, polys, points: polys.flat() };
}
const box = (points: P[]) => ({
  x1: Math.min(...points.map((p) => p[0])),
  x2: Math.max(...points.map((p) => p[0])),
  y1: Math.min(...points.map((p) => p[1])),
  y2: Math.max(...points.map((p) => p[1])),
});
/**
 * 가운데 기준 180° 돌린 자리에도 획이 있는가 — ∿ 는 점대칭이다. 한쪽으로만 솟는 「∧」·「∨」나 마루까지만 그은
 * 반쪽 물결은 여기서 떨어진다(돌린 자리가 비어 가장 먼 표본이 크게 벗어난다). 돌아온 가장 먼 거리(픽셀).
 */
function asymmetry(points: P[], [cx, cy]: P) {
  let worst = 0;
  for (const [x, y] of points) {
    const [rx, ry] = [2 * cx - x, 2 * cy - y];
    worst = Math.max(
      worst,
      Math.min(...points.map(([px, py]) => Math.hypot(px - rx, py - ry))),
    );
  }
  return worst;
}
/** 이음매마다 앞 조각의 나가는 접선과 뒷 조각의 들어오는 접선이 나란한가(도). */
function joinAngles(subs: Seg[][]) {
  const angles: number[] = [];
  const dir = (a: P, b: P) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  for (const sub of subs)
    for (let i = 0; i + 1 < sub.length; i++) {
      const prev = sub[i].pts,
        next = sub[i + 1].pts;
      const out = dir(prev[prev.length - 2], prev[prev.length - 1]);
      const into = dir(next[0], next[1]);
      let diff = Math.abs(out - into) % (2 * Math.PI);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      angles.push((diff * 180) / Math.PI);
    }
  return angles;
}

describe("graph-1 축 생략 물결 — 모양", () => {
  it("x축 물결은 축 위에서 양쪽으로 한 번씩 넘실대는 매끄러운 한 획이다", async () => {
    const { tag, subs, points } = await breakOf({
      ...scatter,
      axisBreaks: [{ at: [35, 32] }],
    });
    const [cx, cy] = [sx(35), sy(32)];
    expect(attr(tag, "d")).toMatch(/C/);
    expect(attr(tag, "stroke")).toMatch(/^#(?:000|111)$/);
    // 가운데를 지난다
    expect(
      Math.min(...points.map(([x, y]) => Math.hypot(x - cx, y - cy))),
    ).toBeLessThan(0.05);
    // 축 위(화면 y 작다)와 아래 양쪽으로 — 한쪽만이면 「∧」 다
    const b = box(points);
    expect(b.y1).toBeLessThan(cy - 2);
    expect(b.y2).toBeGreaterThan(cy + 2);
    expect(b.y2 - b.y1).toBeLessThan(12);
    // 물결 구간(기본 12px) 밖은 축 위의 곧은 꼬리뿐이다
    for (const [x, y] of points)
      if (Math.abs(x - cx) > 6.01) expect(Math.abs(y - cy)).toBeLessThan(0.01);
    expect(b.x2 - b.x1).toBeLessThanOrEqual(12 * 1.5);
    // 양 끝까지 이어진 ∿ — 가운데 기준 점대칭
    expect(asymmetry(points, [cx, cy])).toBeLessThan(0.2);
    // 매끄럽다 — 이음매마다 접선이 이어진다
    const angles = joinAngles(subs);
    expect(angles.length).toBeGreaterThan(0);
    for (const angle of angles) expect(angle).toBeLessThan(1);
  });

  it("흰 채움이 끊긴 자리의 축 띠를 빈틈없이 덮는다", async () => {
    const { polys, tag } = await breakOf({
      ...scatter,
      axisBreaks: [{ at: [35, 32] }],
    });
    const [cx, cy] = [sx(35), sy(32)];
    const half = Number(attr(tag, "stroke-width")) / 2;
    const band = 0.85; // 선분 축(1.7)의 반 굵기
    const holes: P[] = [];
    for (let i = 0; i <= 120; i++)
      for (let j = 0; j <= 20; j++) {
        const p: P = [cx - 6 + (12 * i) / 120, cy - band + (2 * band * j) / 20];
        if (winding(polys, p) !== 0) continue;
        if (distanceToStroke(polys, p) <= half + 0.02) continue;
        holes.push(p);
      }
    expect(holes).toEqual([]);
  });

  it("축을 긋는 선보다 뒤에, 점·글자보다 앞에 그린다 — 축을 가리고 점·글자는 안 가린다", async () => {
    const { svg, tag } = await breakOf({
      ...scatter,
      axisBreaks: [{ at: [35, 32] }],
    });
    const at = svg.indexOf(tag);
    expect(svg.lastIndexOf("<line", at)).toBeGreaterThan(-1);
    expect(svg.indexOf("<line", at)).toBe(-1);
    expect(svg.indexOf("<circle")).toBeGreaterThan(at);
    expect(svg.indexOf("<text")).toBeGreaterThan(at);
  });

  it("y축 물결은 같은 모양을 세운 것이다", async () => {
    const { subs, points } = await breakOf({
      ...scatter,
      axisBreaks: [{ at: [32, 36], axis: "y" }],
    });
    const [cx, cy] = [sx(32), sy(36)];
    const b = box(points);
    expect(b.x1).toBeLessThan(cx - 2);
    expect(b.x2).toBeGreaterThan(cx + 2);
    for (const [x, y] of points)
      if (Math.abs(y - cy) > 6.01) expect(Math.abs(x - cx)).toBeLessThan(0.01);
    expect(asymmetry(points, [cx, cy])).toBeLessThan(0.2);
    for (const angle of joinAngles(subs)) expect(angle).toBeLessThan(1);
  });

  it("크기는 화면 픽셀이다 — 가로·세로 눈금이 수백 배 달라도 같은 크기로 선다", async () => {
    const small = await breakOf({ ...scatter, axisBreaks: [{ at: [35, 32] }] });
    const stretched = await breakOf({
      version: "graph-1",
      xRange: [0, 2000],
      yRange: [0, 5],
      width: 440,
      height: 400,
      axes: false,
      segments: [{ from: [50, 1], to: [1900, 1] }],
      axisBreaks: [{ at: [300, 1] }],
    });
    const a = box(small.points),
      b = box(stretched.points);
    expect(b.x2 - b.x1).toBeCloseTo(a.x2 - a.x1, 1);
    expect(b.y2 - b.y1).toBeCloseTo(a.y2 - a.y1, 1);
  });

  it("size 는 물결의 축 방향 길이(픽셀)다", async () => {
    const base = await breakOf({ ...scatter, axisBreaks: [{ at: [35, 32] }] });
    const wide = await breakOf({
      ...scatter,
      axisBreaks: [{ at: [35, 32], size: 24 }],
    });
    const cy = sy(32);
    const span = (points: P[]) => {
      const wave = points.filter(([, y]) => Math.abs(y - cy) > 0.01);
      return box(wave).x2 - box(wave).x1;
    };
    expect(span(base.points)).toBeLessThanOrEqual(12);
    expect(span(base.points)).toBeGreaterThan(9);
    expect(span(wide.points) / span(base.points)).toBeCloseTo(2, 1);
  });

  it("획 굵기는 밑의 축과 같다 — 자동 축 위는 1.4, 선분 축 위는 1.7", async () => {
    const onSegment = await breakOf({
      ...scatter,
      axisBreaks: [{ at: [35, 32] }],
    });
    expect(attr(onSegment.tag, "stroke-width")).toBe("1.7");
    const auto = { version: "graph-1", xRange: [-2, 10], yRange: [-2, 10] };
    const onAutoX = await breakOf({ ...auto, axisBreaks: [{ at: [1, 0] }] });
    expect(attr(onAutoX.tag, "stroke-width")).toBe("1.4");
    const onAutoY = await breakOf({
      ...auto,
      axisBreaks: [{ at: [0, 1], axis: "y" }],
    });
    expect(attr(onAutoY.tag, "stroke-width")).toBe("1.4");
    // 자동 축을 껐으면 0 위라도 선분 축이다
    const off = await breakOf({
      ...auto,
      axes: false,
      axisBreaks: [{ at: [1, 0] }],
    });
    expect(attr(off.tag, "stroke-width")).toBe("1.7");
  });
});

describe("graph-1 축 생략 물결 — 거절", () => {
  it.each([
    [{ at: [35, 32], size: 5 }],
    [{ at: [35, 32], size: 25 }],
    [{ at: [35, 32], size: "12" }],
    [{ at: [35, 32], size: true }],
    [{ at: [35, 32], axis: "z" }],
    [{ at: [35, 32], axis: 1 }],
    [{ at: [35, 32], url: "https://example.com" }],
    [{ axis: "x" }],
    [{ at: [35] }],
  ])("모르는 필드·범위 밖 값은 거절한다 %#", async (item) => {
    const result = await render({ ...scatter, axisBreaks: [item] });
    expect(result.ok).toBe(false);
    // «칸을 모른다»가 아니라 물결 칸의 그 값 때문에 거절해야 한다 — 사유가 물결을 짚는다
    if (!result.ok) expect(result.error).toMatch(/물결|axisBreaks/);
  });

  it("목록이 아니면 거절한다", async () => {
    const result = await render({ ...scatter, axisBreaks: { at: [35, 32] } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/axisBreaks/);
  });
});

describe("graph-1 축 생략 물결 — 배선", () => {
  it("모델이 받는 계약에 물결 칸이 실린다 — 픽셀 크기·축·흉내 금지까지", () => {
    const fields = catalog["graph-1"].fields as Record<string, string>;
    expect(fields.axisBreaks).toMatch(/size/);
    expect(fields.axisBreaks).toMatch(/pixel/i);
    expect(fields.axisBreaks).toMatch(/axis/);
    expect(fields.axisBreaks).toMatch(/segments/);
  });

  it("다시 그리기 지시문이 계약 밖 산문에서도 물결을 알린다", () => {
    const prompt = buildFigureSpecPrompt({} as DevAiRequest);
    expect(prompt).toContain('"axisBreaks"');
    const prose = prompt.slice(0, prompt.indexOf("ENGINE CONTRACT:"));
    expect(prose).toMatch(/axisBreaks/);
  });

  it("경계(zod)는 물결 칸을 그대로 엔진에 넘긴다", () => {
    const parsed = parseFigureSpecResult(
      JSON.stringify({
        spec: {
          ...scatter,
          axisBreaks: [{ at: [35, 32], axis: "x", size: 12 }],
        },
      }),
    );
    expect(parsed.spec?.axisBreaks).toEqual([
      { at: [35, 32], axis: "x", size: 12 },
    ]);
  });

  it("«엔진이 물결을 못 그린다»는 거절은 지어낸 것으로 읽는다", () => {
    expect(
      isEngineCapabilityRefusal(
        "graph-1 엔진이 축 생략 물결선을 지원하지 않아 재현할 수 없습니다.",
      ),
    ).toBe(true);
    // 진짜 사유는 그대로 둔다
    expect(
      isEngineCapabilityRefusal("사진이라 물결선을 판독할 수 없습니다."),
    ).toBe(false);
  });
});
