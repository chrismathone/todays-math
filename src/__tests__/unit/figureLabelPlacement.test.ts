/**
 * 라벨 자리 — **글자가 선·표시를 덮지 않는다** (원장님 지적 2026-08-25).
 *
 * 엔진을 모킹하지 않는다(없는 축은 변이시킬 수 없다) — `renderFigureSpec` 로 실제
 * 파이썬 엔진을 띄워 **그려진 SVG 를 재서** 판정한다(`figureMarks.test.ts` 무늬).
 *
 * 지키는 불변식 넷:
 *  1) **점 이름이 각 표시 위에 안 앉는다.** 직각기호는 `marks` 층 path 라
 *     `_candidate_cost` 가 못 보던 잉크였다 — `J30503-A06/A07-002` 의 `H` 가 그 위에
 *     그대로 앉아 있었다.
 *  2) **좁은 각의 값이 두 변을 안 덮는다.** 이등분선 거리가 25 에 박혀 있어
 *     $30^\circ$ 에서 `d·sin 15° = 6.5` 로 글자 반높이와 같아졌다 — halo 가 실선을 지웠다.
 *  3) **삼각형에 치수 둘을 달면 그려진다.** 종전에는 점 이름이 먼저 자리를 잡아
 *     `dimension … has no collision-free layout` 으로 던졌고, 그래서 부르는 쪽이
 *     치수를 통째로 포기하고 날 `<text>` 를 얹고 있었다(= 원장님의 「치수선이
 *     렌더링 안 된다」).
 *  4) **치수 라벨은 KaTeX 가 아니다**(09 §4-26) — 남은 LaTeX 는 던진다.
 *
 * ⚠️ 글자 상자는 여기서 **따로** 잰다(엔진의 `_text_box` 를 안 부른다). 엔진 함수를
 *    쓰면 그 함수가 틀렸을 때 시험도 같이 틀린다 — 재는 자가 제품에서 오면 안 된다
 *    (CLAUDE.md 2026-08-18). 폭은 실제보다 **좁게** 잡아 거짓 빨강을 피한다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

type Box = { x0: number; y0: number; x1: number; y1: number };
type Seg = { x1: number; y1: number; x2: number; y2: number };

/** 그려진 `<text>` 하나 — 닻점·글꼴·내용. */
type Text = { x: number; y: number; size: number; text: string; halo: boolean };

function texts(svg: string): Text[] {
  const out: Text[] = [];
  const re = /<text\b([^>]*)>([^<]*)<\/text>/g;
  for (let m = re.exec(svg); m; m = re.exec(svg)) {
    const attrs = m[1]!;
    const get = (k: string) => new RegExp(`${k}="([^"]*)"`).exec(attrs)?.[1];
    out.push({
      x: Number(get("x")),
      y: Number(get("y")),
      size: Number(get("font-size") ?? 13),
      text: m[2]!,
      halo: /paint-order="stroke/.test(attrs),
    });
  }
  return out;
}

/** 글자 상자 — 엔진과 **다른 자**로, 실제보다 좁게 잡는다(거짓 빨강 방지). */
function textBox(t: Text): Box {
  const width = t.text.length * t.size * 0.5;
  return {
    x0: t.x - width / 2,
    y0: t.y - t.size * 0.75,
    x1: t.x + width / 2,
    y1: t.y + t.size * 0.2,
  };
}

/** `<line>` 과 `<path>` 의 `M/L` 토막을 선분으로 편다. */
function strokes(svg: string, layer?: "marks"): Seg[] {
  let body = svg;
  if (layer === "marks") {
    const groups = [...svg.matchAll(/<g>([\s\S]*?)<\/g>/g)].map((m) => m[1]!);
    body = groups[1] ?? "";
  }
  const out: Seg[] = [];
  const lineRe = /<line\b([^>]*)\/>/g;
  for (let m = lineRe.exec(body); m; m = lineRe.exec(body)) {
    const a = m[1]!;
    const n = (k: string) => Number(new RegExp(`${k}="([^"]*)"`).exec(a)?.[1]);
    out.push({ x1: n("x1"), y1: n("y1"), x2: n("x2"), y2: n("y2") });
  }
  const pathRe = /<path\b[^>]*\sd="([^"]*)"/g;
  for (let m = pathRe.exec(body); m; m = pathRe.exec(body)) {
    const pts: [number, number][] = [];
    const tokenRe = /([ML])\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g;
    for (let t = tokenRe.exec(m[1]!); t; t = tokenRe.exec(m[1]!)) {
      pts.push([Number(t[2]), Number(t[3])]);
    }
    for (let i = 1; i < pts.length; i += 1) {
      out.push({
        x1: pts[i - 1]![0],
        y1: pts[i - 1]![1],
        x2: pts[i]![0],
        y2: pts[i]![1],
      });
    }
  }
  return out;
}

function segmentHitsBox(s: Seg, b: Box): boolean {
  // 두 끝점이 상자 밖 같은 쪽이면 안 만난다(분리축) — 아니면 매개변수로 잘라 본다.
  const inside = (x: number, y: number) =>
    x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
  if (inside(s.x1, s.y1) || inside(s.x2, s.y2)) return true;
  let t0 = 0;
  let t1 = 1;
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  return (
    clip(-dx, s.x1 - b.x0) &&
    clip(dx, b.x1 - s.x1) &&
    clip(-dy, s.y1 - b.y0) &&
    clip(dy, b.y1 - s.y1)
  );
}

async function render(spec: unknown): Promise<string> {
  const result = await renderFigureSpec(spec);
  if (!result.ok) throw new Error(result.error);
  return result.svg;
}

/** 밑변 위 수선의 발 $H$ — `J30503-A06-002` 와 같은 배치. */
const FOOT_SPEC = {
  version: 2,
  points: {
    B: [22, 96.89],
    C: [203.68, 96.89],
    H: [139.26, 96.89],
    A: [139.26, 32.47],
  },
  segments: {
    AB: ["A", "B"],
    BC: ["B", "C"],
    CA: ["C", "A"],
    AH: { points: ["A", "H"], dash: "5 4" },
  },
  angles: {
    r_H: { vertex: "H", points: ["A", "C"], right: true },
    a_B: { vertex: "B", points: ["A", "C"], label: "30°" },
    a_C: { vertex: "C", points: ["A", "B"], label: "45°" },
  },
  labels: { A: "A", B: "B", C: "C", H: "H" },
};

/** $30^\circ$ 인 직각삼각형 — `삼각비의 활용 01` 과 같은 배치. */
const NARROW_SPEC = {
  version: 2,
  points: { B: [22, 168], A: [22, 22], C: [106.3, 168] },
  segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
  angles: {
    r_B: { vertex: "B", points: ["A", "C"], right: true },
    a_A: { vertex: "A", points: ["B", "C"], label: "30°" },
  },
  labels: { A: "A", B: "B", C: "C" },
};

/** 두 변과 끼인각 + 치수 둘 — `J30503-A04-002` 와 같은 배치. */
const TWO_DIMS_SPEC = {
  version: 2,
  points: { B: [96.03, 171.03], C: [192.03, 171.03], A: [16.03, 32.47] },
  segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
  angles: { a_B: { vertex: "B", points: ["A", "C"], label: "120°" } },
  dimensions: {
    d_AB: { points: ["A", "B"], label: "10 cm", side: "auto" },
    d_BC: { points: ["B", "C"], label: "6 cm", side: "auto" },
  },
  labels: { A: "A", B: "B", C: "C" },
};

describe.runIf(hasEngine)("그림 라벨 자리", () => {
  it("점 이름이 각 표시(직각기호) 위에 앉지 않는다", async () => {
    const svg = await render(FOOT_SPEC);
    const h = texts(svg).find((t) => t.text === "H");
    expect(h).toBeDefined();
    const box = textBox(h!);
    // 직각기호는 marks 층의 두 토막 path 다.
    const marks = strokes(svg, "marks");
    expect(marks.length).toBeGreaterThan(0);
    const hit = marks.filter((s) => segmentHitsBox(s, box));
    expect(hit).toEqual([]);
  });

  it("좁은 각의 값이 두 변을 덮지 않는다", async () => {
    const svg = await render(NARROW_SPEC);
    const angle = texts(svg).find((t) => t.text === "30°");
    expect(angle?.halo).toBe(true);
    const box = textBox(angle!);
    // 흰 halo 는 밑의 실선을 지운다 — 그래서 «닿기만 해도» 위반이다.
    const sides = strokes(svg).filter(
      (s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 30,
    );
    expect(sides.filter((s) => segmentHitsBox(s, box))).toEqual([]);
  });

  it("삼각형에 치수 둘을 달아도 그려지고, 둘 다 점선 치수선을 얻는다", async () => {
    const svg = await render(TWO_DIMS_SPEC);
    const dashed = [...svg.matchAll(/stroke-dasharray="6 4"/g)];
    expect(dashed.length).toBe(2);
    const labels = texts(svg).filter((t) => /cm$/.test(t.text));
    expect(labels.map((t) => t.text).sort()).toEqual(["10 cm", "6 cm"]);
    // 치수 값은 halo 를 쓴다(제 점선 위에 앉는 것이 정상 — lint_svg 규칙 4·7).
    expect(labels.every((t) => t.halo)).toBe(true);
  });

  it("치수 값은 제 점선 **가까이** 있다 — 떠 있는 맨 길이 표기가 아니다", async () => {
    const svg = await render(TWO_DIMS_SPEC);
    const curves = strokes(svg, "marks");
    for (const label of texts(svg).filter((t) => /cm$/.test(t.text))) {
      const near = curves.some((s) => {
        const cx = (s.x1 + s.x2) / 2;
        const cy = (s.y1 + s.y2) / 2;
        return Math.hypot(cx - label.x, cy - label.y) < 40;
      });
      expect(near, `${label.text} 가 제 치수선에서 멀다`).toBe(true);
    }
  });
});
