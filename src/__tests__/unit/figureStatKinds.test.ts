/**
 * 통계 kind — `table`(열 폭)·`histogram`·`freqPolygon` (elem-1, 물결 3A, 2026-08-23).
 *
 * 실제 엔진(`render_spec.py` → `sanitize_svg`)을 태운다. 모킹하지 않는다 —
 * **없는 축은 변이시킬 수 없다**(CLAUDE.md 2026-08-19). 정본은 RPM 중학 1-2
 * p152(개념)·p153(09-3·09-4)·p157(유형06)·p164(두 집단)의 원본 지면이고,
 * 렌더해서 모양을 대조했다.
 *
 * ## 검산은 **생성기와 다른 식**으로 한다
 *
 * 기대값을 제품 상수(`STAT_VIEWBOX`·`HIST_FILL`·축 사다리)에서 만들어 오면, 상수를
 * 바꿀 때 기대값이 따라가서 **영원히 초록**이다(2026-08-18 「지표의 «참»이 제품
 * 상수에서 나오면 성적이 오른다」). 그래서
 *  · 폭·색은 **실측 리터럴**로 못 박고,
 *  · 높이는 「도수의 비 = 막대 높이의 비」라는 **다른 식**으로 재고,
 *  · 도수분포다각형은 「꺾은선 아래 넓이 = 직사각형 넓이의 합」이라는 **교과서의
 *    근거 그 자체**로 잰다 — 양끝을 0 으로 안 닫으면 이 등식이 깨진다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

/** 히스토그램 직사각형의 색 — **실측 리터럴**. 제품에서 읽어 오면 가드가 죽는다. */
const HIST_FILL = "#c5d4e8";
/** 찢긴 가장자리의 물결선 색 — 실측 리터럴. */
const TEAR_INK = "#8a8a8a";
/** 지면 폭. viewBox 폭 하나로 등급(140/240/360px)이 갈린다 — 박혀 있어야 한다. */
const PINNED_VIEWBOX = 240;

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  dash: boolean;
};
type Txt = { x: number; y: number; t: string; anchor: string };
type Poly = { pts: [number, number][]; dash: boolean };

function rects(svg: string): Rect[] {
  return [...svg.matchAll(/<rect ([^>]*?)\/>/g)].map((m) => {
    const a = m[1]!;
    const get = (k: string) =>
      Number(new RegExp(`\\b${k}="([-\\d.]+)"`).exec(a)?.[1] ?? NaN);
    return {
      x: get("x"),
      y: get("y"),
      w: get("width"),
      h: get("height"),
      fill: /fill="([^"]*)"/.exec(a)?.[1] ?? "",
      dash: /stroke-dasharray=/.test(a),
    };
  });
}

function texts(svg: string): Txt[] {
  return [...svg.matchAll(/<text ([^>]*?)>([^<]*)<\/text>/g)].map((m) => ({
    x: Number(/\bx="([-\d.]+)"/.exec(m[1]!)?.[1] ?? NaN),
    y: Number(/\by="([-\d.]+)"/.exec(m[1]!)?.[1] ?? NaN),
    anchor: /text-anchor="([^"]*)"/.exec(m[1]!)?.[1] ?? "",
    t: m[2]!,
  }));
}

function polylines(svg: string): Poly[] {
  return [...svg.matchAll(/<polyline points="([^"]+)"([^>]*?)\/>/g)].map(
    (m) => ({
      pts: m[1]!.split(" ").map((p) => {
        const [x, y] = p.split(",");
        return [Number(x), Number(y)] as [number, number];
      }),
      dash: /stroke-dasharray=/.test(m[2]!),
    }),
  );
}

function viewBoxW(svg: string): number {
  return Number(/viewBox="0 0 ([\d.]+)/.exec(svg)![1]);
}

/** 그 색으로 칠한 직사각형만 — 모눈·이름표 견본과 섞이지 않게. */
function bars(svg: string): Rect[] {
  return rects(svg)
    .filter((r) => r.fill === HIST_FILL && r.h > 0)
    .sort((a, b) => a.x - b.x);
}

async function draw(spec: unknown): Promise<string> {
  const r = await renderFigureSpec(spec);
  if (!r.ok) throw new Error(r.error);
  return r.svg;
}

async function reason(spec: unknown): Promise<string> {
  const r = await renderFigureSpec(spec);
  if (r.ok) throw new Error("던져야 하는데 SVG 가 나왔다");
  return r.error;
}

// ── 표본. RPM 원본 지면의 **구조만** 따랐다 — 수치·소재는 새로 만든 것이다. ──────
const FREQ_TABLE = {
  version: "elem-1",
  kind: "table",
  headers: ["기록(m)", "도수(명)"],
  rows: [
    ["10이상~20미만", "5"],
    ["20 ~ 30", "9"],
    ["30 ~ 40", "6"],
    ["합계", "20"],
  ],
};
const HIST = {
  version: "elem-1",
  kind: "histogram",
  classes: [10, 15, 20, 25, 30, 35, 40],
  values: [2, 3, 6, 11, 7, 3],
  yLabel: "(명)",
  xLabel: "(m)",
  total: 32,
};
const POLY = {
  version: "elem-1",
  kind: "freqPolygon",
  classes: [2, 4, 6, 8, 10, 12, 14],
  values: [4, 6, 12, 10, 4, 4],
  yLabel: "(명)",
  xLabel: "(권)",
  total: 40,
};

describe.skipIf(!hasEngine)("[통계 kind] table 열 폭", () => {
  it("긴 계급 라벨이 든 열이 도수 열보다 넓다 — 균등이 아니다", async () => {
    const svg = await draw(FREQ_TABLE);
    // 열 경계는 머리행을 가로지르는 세로줄이다(열 사이에만 그린다).
    const divider = Number(/<line x1="([\d.]+)" y1="8"/.exec(svg)![1]);
    const box = rects(svg).find((r) => r.fill === "#d7e0e8")!;
    const col1 = divider - box.x;
    const col2 = box.x + box.w - divider;
    // 「10이상~20미만」(9자) 이 「도수(명)」(5자) 보다 길다 — 글자 수로 따진 것이라
    // 제품의 폭 계산식(한글/라틴 구분)과 **다른 식**이다.
    expect(col1).toBeGreaterThan(col2);
    // 옛 균등 규칙은 두 열이 정확히 56 씩이었다. 그 값이면 배분이 안 된 것이다.
    expect(Math.abs(col1 - 56)).toBeGreaterThan(1);
  });

  it("칸 글자가 제 열 안에 들어간다 — 첫 글자가 열 밖으로 안 나간다", async () => {
    const svg = await draw(FREQ_TABLE);
    const divider = Number(/<line x1="([\d.]+)" y1="8"/.exec(svg)![1]);
    const box = rects(svg).find((r) => r.fill === "#d7e0e8")!;
    const label = texts(svg).find((t) => t.t === "10이상~20미만")!;
    expect(label.anchor).toBe("middle");
    // 가운데 정렬이므로 닻이 제 열의 한가운데여야 한다(±0.5단위).
    expect(label.x).toBeCloseTo((box.x + divider) / 2, 1);
    // 9자 라벨의 절반이 왼쪽으로 뻗는다. 열의 왼쪽 끝을 안 넘어야 잘리지 않는다 —
    // 한 자를 **가장 좁은 숫자 폭(8단위)** 으로 잡아도 안 넘어야 한다(넉넉한 하한).
    expect(label.x - (9 * 8) / 2).toBeGreaterThanOrEqual(box.x);
  });

  it("옛 규칙으로 이미 담기던 표는 viewBox 폭이 안 바뀐다 (지면 등급 유지)", async () => {
    // 실측 리터럴이다 — 이 수가 바뀌면 그 표들의 화면 크기(140px/240px)가 뒤집힌다.
    expect(
      viewBoxW(
        await draw({
          version: "elem-1",
          kind: "table",
          headers: ["요일", "횟수"],
          rows: [
            ["월", "3"],
            ["화", "5"],
          ],
        }),
      ),
    ).toBe(128);
    expect(
      viewBoxW(
        await draw({
          version: "elem-1",
          kind: "table",
          headers: ["1", "2", "3", "4", "5", "6", "7"],
          rows: [["1", "2", "3", "4", "5", "6", "7"]],
        }),
      ),
    ).toBe(240);
  });

  it("못 담으면 던진다 — 조용히 자르지 않는다 (D-70)", async () => {
    const msg = await reason({
      version: "elem-1",
      kind: "table",
      headers: ["계급(점)", "도수(명)", "상대도수"],
      rows: [["10점이상~20점미만", "5", "0.25"]],
    });
    expect(msg).toContain("지면 폭을 넘습니다");
  });

  it("align:left 면 잎이 왼쪽으로 붙는다 — 자릿수가 세로로 맞는다", async () => {
    const svg = await draw({
      version: "elem-1",
      kind: "table",
      headers: ["줄기", "잎"],
      rows: [
        ["1", "2 5 7"],
        ["2", "0 1 3 6 8"],
      ],
      align: ["center", "left"],
    });
    const leaves = texts(svg).filter((t) => t.t.includes(" "));
    expect(leaves).toHaveLength(2);
    for (const leaf of leaves) expect(leaf.anchor).toBe("start");
    // 길이가 다른 두 잎의 **시작 x 가 같다** — 가운데 정렬이면 달라진다.
    expect(leaves[0]!.x).toBeCloseTo(leaves[1]!.x, 5);
    // 줄기는 그대로 가운데.
    expect(texts(svg).find((t) => t.t === "1")!.anchor).toBe("middle");
  });

  it("align 은 center·left 만 받는다", async () => {
    expect(await reason({ ...FREQ_TABLE, align: "right" })).toContain(
      '"center" 또는 "left"',
    );
  });
});

describe.skipIf(!hasEngine)("[통계 kind] histogram", () => {
  it("막대 사이에 틈이 없다 — barChart 는 틈이 있다 (반대쪽 표본)", async () => {
    const hist = bars(await draw(HIST));
    expect(hist).toHaveLength(6);
    for (let i = 0; i + 1 < hist.length; i += 1) {
      // 붙어 있다 = 넓이가 도수에 비례한다는 근거. 반올림 오차만 허용.
      expect(hist[i]!.x + hist[i]!.w).toBeCloseTo(hist[i + 1]!.x, 1);
    }
    // 같은 자료를 barChart 로 그리면 **붙지 않는다** — 그래서 kind 를 새로 판 것이다.
    const barSvg = await draw({
      version: "elem-1",
      kind: "barChart",
      values: HIST.values.map((v, i) => ({ label: `${i}`, value: v })),
    });
    const bs = rects(barSvg)
      .filter((r) => r.h > 0 && r.fill !== "#ffffff" && r.fill !== "none")
      .sort((a, b) => a.x - b.x);
    expect(bs.length).toBeGreaterThan(1);
    expect(bs[0]!.x + bs[0]!.w).toBeLessThan(bs[1]!.x - 1);
  });

  it("막대는 한 색이고 막대 위에 값 숫자를 안 적는다", async () => {
    const svg = await draw(HIST);
    expect(new Set(bars(svg).map((r) => r.fill)).size).toBe(1);
    // 도수 11 은 눈금(0·2·4…12)에 없다. 글자로 나오면 값을 적은 것이다.
    expect(texts(svg).map((t) => t.t)).not.toContain("11");
    // 눈금과 겹치는 값(6 등)까지 잡으려면 **자리**로 물어야 한다 — 막대 한가운데
    // 위쪽(그림 칸 안)에 글자가 있으면 그것이 「막대 위 값 숫자」다.
    const hist = bars(svg);
    const axisY = hist[0]!.y + hist[0]!.h;
    for (const r of hist) {
      const over = texts(svg).filter(
        (t) => t.y < axisY && Math.abs(t.x - (r.x + r.w / 2)) < r.w / 4,
      );
      expect(over, `막대 ${r.x} 위 글자`).toHaveLength(0);
    }
  });

  it("계급의 양 끝 값이 눈금이다 — 라벨이 막대 경계에 선다", async () => {
    const svg = await draw(HIST);
    const hist = bars(svg);
    const edges = [
      ...hist.map((r) => r.x),
      hist[hist.length - 1]!.x + hist[hist.length - 1]!.w,
    ];
    expect(edges).toHaveLength(HIST.classes.length);
    HIST.classes.forEach((c, i) => {
      const lab = texts(svg).find(
        (t) => t.t === String(c) && t.anchor === "middle",
      );
      expect(lab, `계급 ${c} 라벨`).toBeDefined();
      expect(lab!.x).toBeCloseTo(edges[i]!, 1);
    });
  });

  it("막대 높이의 비가 도수의 비와 같다 (생성기와 다른 식)", async () => {
    const hist = bars(await draw(HIST));
    const base = hist[0]!.h / HIST.values[0]!;
    hist.forEach((r, i) => {
      // 좌표는 소수 둘째 자리로 끊겨 나오므로(`_n`) 비에도 그만큼 오차가 있다.
      expect(r.h / HIST.values[i]!).toBeCloseTo(base, 2);
    });
    // 밑변이 x축 한 줄에 나란히 있다(=바닥에서 잰다).
    const bottoms = new Set(hist.map((r) => Math.round((r.y + r.h) * 10)));
    expect(bottoms.size).toBe(1);
  });

  it("계급의 크기가 다르면 던진다 — 넓이가 도수에 비례하지 않는다", async () => {
    expect(
      await reason({ ...HIST, classes: [10, 15, 20, 25, 30, 35, 42] }),
    ).toContain("계급의 크기가 다릅니다");
  });

  it("도수의 합이 total 과 다르면 던진다 — 그림과 발문이 다른 말을 한다", async () => {
    expect(await reason({ ...HIST, total: 31 })).toContain("total");
  });

  it("지면 폭이 240 에 박혀 있다", async () => {
    for (const spec of [HIST, POLY])
      expect(viewBoxW(await draw(spec))).toBe(PINNED_VIEWBOX);
  });

  it("라벨이 넓어 폭이 벌어지면 던진다 — 등급이 바뀌면 이 그림만 작아진다", async () => {
    const msg = await reason({
      ...HIST,
      yLabel: "(학생 수와 그 밖의 여러 가지)",
    });
    expect(msg).toMatch(/그림 칸이|폭이/);
  });

  it("눈금이 겹치면 던진다 — 계급을 늘려도 조용히 붙지 않는다", async () => {
    expect(
      await reason({
        ...HIST,
        classes: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
        values: [2, 3, 6, 11, 7, 3, 2, 1, 1],
        total: 36,
      }),
    ).toContain("겹칩니다");
  });
});

describe.skipIf(!hasEngine)(
  "[통계 kind] histogram — 일부가 보이지 않는 유형",
  () => {
    const TORN = {
      version: "elem-1",
      kind: "histogram",
      classes: [5, 13, 21, 29, 37, 45],
      values: [3, 10, 8, 6, 3],
      yLabel: "(명)",
      xLabel: "(m)",
      total: 30,
      hidden: [3],
    };

    it("가린 계급은 막대가 없고 그 자리에 찢긴 자국이 남는다", async () => {
      const svg = await draw(TORN);
      const hist = bars(svg);
      expect(hist).toHaveLength(TORN.values.length - 1);
      // 가려진 계급(29~37)의 자리에는 막대가 없다. 이웃 막대의 폭으로 그 자리를 잰다.
      const w = hist[0]!.w;
      const gapLeft = hist[2]!.x + w;
      expect(hist[3]!.x).toBeCloseTo(gapLeft + w, 1);
      // 찢긴 물결선 둘 — 가려진 계급의 양 끝. 「도수 0」과 구분되는 유일한 표시다.
      const tears = [...svg.matchAll(new RegExp(`stroke="${TEAR_INK}"`, "g"))];
      expect(tears).toHaveLength(2);
    });

    it("total 없이 가리면 던진다 — 아무도 못 푸는 문항이 조용히 나간다", async () => {
      const noTotal: Record<string, unknown> = { ...TORN };
      delete noTotal.total;
      expect(await reason(noTotal)).toContain("total");
    });

    it("모든 계급을 가리면 던진다", async () => {
      expect(await reason({ ...TORN, hidden: [0, 1, 2, 3, 4] })).toContain(
        "읽을 것이",
      );
    });

    it("가려도 도수의 합 검산은 그대로다", async () => {
      expect(await reason({ ...TORN, total: 29 })).toContain("total");
    });
  },
);

describe.skipIf(!hasEngine)("[통계 kind] freqPolygon", () => {
  it("양끝을 계급 하나 바깥의 도수 0 으로 내려 닫는다", async () => {
    const svg = await draw(POLY);
    const line = polylines(svg).find((p) => p.pts.length > 3)!;
    // 꼭짓점은 계급 수 + 양끝 둘.
    expect(line.pts).toHaveLength(POLY.values.length + 2);
    // 꼭짓점 사이 가로 간격이 일정하다(계급의 가운데 값이 등간격이므로).
    const gaps = line.pts.slice(1).map((p, i) => p[0] - line.pts[i]![0]);
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0]!, 1);
    // 양끝의 세로 위치가 같다 = 둘 다 도수 0.
    expect(line.pts[0]![1]).toBeCloseTo(line.pts[line.pts.length - 1]![1], 3);
    // 그 높이가 가로축(0 눈금) 줄이다. 축 줄은 x축 전체를 긋는 검은 line 이다.
    const axisY = Number(
      /<line x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="\1" stroke="#111111"/.exec(
        svg,
      )![1],
    );
    expect(line.pts[0]![1]).toBeCloseTo(axisY, 3);
    // 양끝은 첫·마지막 계급 라벨보다 **바깥**이다.
    const first = texts(svg).find((t) => t.t === "2" && t.anchor === "middle")!;
    const last = texts(svg).find((t) => t.t === "14" && t.anchor === "middle")!;
    expect(line.pts[0]![0]).toBeLessThan(first.x);
    expect(line.pts[line.pts.length - 1]![0]).toBeGreaterThan(last.x);
  });

  it("꺾은선 아래 넓이 = 직사각형 넓이의 합 (교과서의 근거 그 자체)", async () => {
    const svg = await draw({
      version: "elem-1",
      kind: "freqPolygon",
      bars: true,
      classes: [50, 55, 60, 65, 70],
      values: [3, 10, 8, 6],
      yLabel: "(개)",
      xLabel: "(g)",
      total: 27,
    });
    const hist = bars(svg);
    expect(hist).toHaveLength(4);
    const barArea = hist.reduce((s, r) => s + r.w * r.h, 0);
    const line = polylines(svg).find((p) => p.pts.length > 3)!;
    const axisY = hist[0]!.y + hist[0]!.h;
    let polyArea = 0;
    for (let i = 0; i + 1 < line.pts.length; i += 1) {
      const [x1, y1] = line.pts[i]!;
      const [x2, y2] = line.pts[i + 1]!;
      polyArea += ((x2 - x1) * (axisY - y1 + (axisY - y2))) / 2;
    }
    // 양끝을 0 으로 안 닫거나 가운데 값이 어긋나면 이 등식이 깨진다.
    expect(polyArea).toBeCloseTo(barArea, 0);
    expect(Math.abs(polyArea - barArea) / barArea).toBeLessThan(0.005);
  });

  it("lineChart 는 양끝 연장이 없다 (반대쪽 표본)", async () => {
    const svg = await draw({
      version: "elem-1",
      kind: "lineChart",
      values: POLY.values.map((v, i) => ({ label: `${i}`, value: v })),
    });
    // 꺾은선 그래프는 토막을 line 으로 긋는다 — 점이 자료 수만큼이고 0 으로 안 닫는다.
    const dots = [...svg.matchAll(/<circle /g)];
    expect(dots).toHaveLength(POLY.values.length);
  });

  it("두 집단을 겹쳐 그리면 둘째가 파선이고 이름표가 붙는다", async () => {
    const svg = await draw({
      version: "elem-1",
      kind: "freqPolygon",
      classes: [2, 4, 6, 8, 10, 12],
      values: [2, 5, 9, 6, 3],
      label: "A반",
      series2: { values: [4, 7, 5, 4, 5], label: "B반" },
      yLabel: "(명)",
      xLabel: "(회)",
    });
    const lines = polylines(svg).filter((p) => p.pts.length > 3);
    expect(lines).toHaveLength(2);
    expect(lines.filter((p) => p.dash)).toHaveLength(1);
    const shown = texts(svg).map((t) => t.t);
    expect(shown).toContain("A반");
    expect(shown).toContain("B반");
    expect(viewBoxW(svg)).toBe(PINNED_VIEWBOX);
  });

  it("이름 없이 두 집단을 겹치면 던진다", async () => {
    expect(
      await reason({ ...POLY, series2: { values: POLY.values } }),
    ).toContain("label");
  });

  it("둘째 계열 길이가 다르면 던진다", async () => {
    expect(
      await reason({
        ...POLY,
        label: "A반",
        series2: { values: [1, 2, 3], label: "B반" },
      }),
    ).toContain("계급 수");
  });
});

describe.skipIf(!hasEngine)("[통계 kind] 값 축 규칙을 한 벌로 쓴다", () => {
  it("yStep 을 실으면 그 걸음 그대로 긋는다 (D-70)", async () => {
    const svg = await draw({ ...HIST, yMax: 12, yStep: 4 });
    const nums = texts(svg)
      .filter((t) => t.anchor === "end" && /^\d+$/.test(t.t))
      .map((t) => Number(t.t))
      .sort((a, b) => a - b);
    expect(nums).toEqual([0, 4, 8, 12]);
  });

  it("yStep 으로 눈금이 9줄을 넘으면 던진다 (기존 상한과 같은 한 벌)", async () => {
    expect(await reason({ ...HIST, yMax: 12, yStep: 1 })).toContain(
      "줄이 됩니다",
    );
  });

  it("상대도수(소수)도 같은 사다리를 탄다 — 걸음이 자릿수를 정한다", async () => {
    const svg = await draw({
      version: "elem-1",
      kind: "histogram",
      classes: [15, 20, 25, 30, 35],
      values: [0.1, 0.2, 0.4, 0.3],
      yStep: 0.1,
      yMax: 0.4,
      yLabel: "(비율)",
      xLabel: "(세)",
      total: 1,
    });
    const nums = texts(svg)
      .filter((t) => t.anchor === "end")
      .map((t) => t.t);
    // 꼬리 0 을 안 붙인다 — 교과서는 「0.10」 이 아니라 「0.1」 로 쓴다.
    expect(nums).toEqual(
      expect.arrayContaining(["0", "0.1", "0.2", "0.3", "0.4"]),
    );
    expect(nums).not.toContain("0.10");
  });

  it("소수 세 자리는 던진다 — 교과 범위 밖이다", async () => {
    expect(
      await reason({
        version: "elem-1",
        kind: "histogram",
        classes: [15, 20, 25],
        values: [0.125, 0.875],
        yLabel: "(비율)",
      }),
    ).toContain("소수");
  });
});
