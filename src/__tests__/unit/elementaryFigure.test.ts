/**
 * 초등 그림 스펙(elem-1) + 기존 FigureSpec v2.
 * 엔진이 실제로 SVG 를 내는지 본다. 모킹하지 않는다 — 없는 축은 변이시킬 수 없다.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CUBE_SCRAPE_ITEMS } from "@/app/dev/cube-scrape/fixtures";
import { CUBE_RANDOM_20 } from "@/app/dev/cube-scrape/random20";
import {
  FIGURE_SVG_PAIR_MAX_PX,
  FIGURE_SVG_PAIR_MM,
  figureSvgFrameClass,
  figureSvgSize,
  figureSvgViewBoxWidth,
} from "@/lib/figure/figureSvgFrame";
import { mmToCssPx } from "@/lib/figurePrintSize";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import type { SvgLabel } from "@/lib/figure/svgLabels";
import { labelTexts, stripLabels, svgLabels } from "@/lib/figure/svgLabels";

/**
 * 라벨이 **프레임 밖으로 잘리지 않았는가** — 조판된 상자를 그대로 잰다.
 *
 * `_svg` 는 `<text>` 를 닻점 하나로 보고 viewBox 를 맞춘 뒤 글자 상자만큼 넓히는데,
 * 그 계산이 어긋나면 지면에서 숫자의 앞글자가 잘려 나간다(원장님 2026-08-25 실측).
 * halo 는 잉크를 더하지 않지만 밑의 선을 지우므로 **반폭만큼** 같이 본다.
 */
function expectInsideFrame(svg: string, l: SvgLabel): void {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  expect(vb, "viewBox 를 못 읽었다").toBeTruthy();
  const vw = Number(vb![1]);
  const vh = Number(vb![2]);
  expect(l.width, `«${l.text}» 는 조판되지 않아 폭을 모른다`).not.toBeNull();
  const halo = l.halo / 2;
  const w = l.width!;
  const x0 =
    (l.anchor === "middle" ? l.x - w / 2 : l.anchor === "end" ? l.x - w : l.x) -
    halo;
  const y0 = l.baseline - (l.ascent ?? 0) - halo;
  expect(x0, `«${l.text}» 왼쪽`).toBeGreaterThanOrEqual(-0.01);
  expect(y0, `«${l.text}» 위쪽`).toBeGreaterThanOrEqual(-0.01);
  expect(x0 + w + halo * 2, `«${l.text}» 오른쪽`).toBeLessThanOrEqual(
    vw + 0.01,
  );
  expect(
    l.baseline + (l.descent ?? 0) + halo,
    `«${l.text}» 아래쪽`,
  ).toBeLessThanOrEqual(vh + 0.01);
}

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const NUMBER_CARDS = {
  version: "elem-1",
  kind: "numberCards",
  cards: ["2", "9", "4"],
};

describe.skipIf(!hasEngine)("[초등 그림] elem-1", () => {
  it("수 카드 2·9·4 를 SVG 로 그린다", async () => {
    const r = await renderFigureSpec(NUMBER_CARDS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain("<svg");
    expect(r.svg).toContain("2");
    expect(r.svg).toContain("9");
    expect(r.svg).toContain("4");
  });

  it("연산 상자는 숫자만 감싼다 — 넓은 막대가 아니다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "opBox",
      input: "845",
      op: "−369",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const opBox = [
      ...r.svg.matchAll(
        /<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"[^>]*fill="#f3e6e4"/g,
      ),
    ][0];
    expect(opBox).toBeTruthy();
    expect(Number(opBox![3])).toBeLessThanOrEqual(64);
    expect(Number(opBox![4])).toBeLessThanOrEqual(24);
    expect(r.svg).toContain("845");
    expect(r.svg).toContain("−369");
  });

  it("합 상자는 표로 그린다 — 그림 오림이 아니다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "sumBox",
      left: "143",
      right: "532",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain("143");
    expect(r.svg).toContain("532");
  });

  it("모르는 종류는 실패한다 — 조용히 빈 SVG 를 만들지 않는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "사진",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/종류|kind|초등/);
  });

  it("상자 연쇄는 엑셀처럼 열이 맞고, 답 칸이 연산 바로 위에 온다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "boxChain",
      start: "219",
      steps: ["+462", "+138"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const boxes = svgRects(r.svg);
    const xs = [...new Set(boxes.map((b) => b.x))].sort((a, b) => a - b);
    const ys = [...new Set(boxes.map((b) => b.y))].sort((a, b) => a - b);
    expect(boxes).toHaveLength(5);
    expect(xs).toHaveLength(3);
    expect(ys).toHaveLength(3);
    expect(xs[1]! - xs[0]!).toBeCloseTo(xs[2]! - xs[1]!, 5);
    expect(ys[1]! - ys[0]!).toBeCloseTo(ys[2]! - ys[1]!, 5);

    const yOf = (label: string) => textPos(r.svg, label)?.y ?? NaN;
    const xOf = (label: string) => textPos(r.svg, label)?.x ?? NaN;
    expect(yOf("+138")).toBeLessThan(yOf("219"));
    expect(yOf("+462")).toBeGreaterThan(yOf("+138"));

    const colOf = (label: string) =>
      boxes.filter((b) => Math.abs(b.cx - xOf(label)) < 1);
    expect(colOf("+462")).toHaveLength(2);
    expect(colOf("+138")).toHaveLength(2);
  });

  it("연산 나무는 세 칸이 한 줄이고 타원이 칸 사이에 앉는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "opTree",
      start: "725",
      ops: ["-513", "+679"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const boxes = svgRects(r.svg);
    expect(boxes).toHaveLength(3);
    expect(boxes[0]!.y).toBe(boxes[1]!.y);
    expect(boxes[1]!.y).toBe(boxes[2]!.y);
    const xs = boxes.map((b) => b.x).sort((a, b) => a - b);
    expect(xs[1]! - xs[0]!).toBeCloseTo(xs[2]! - xs[1]!, 5);

    const ovals = [...r.svg.matchAll(/<ellipse cx="([0-9.]+)"/g)].map((m) =>
      Number(m[1]),
    );
    expect(ovals).toHaveLength(2);
    const centers = boxes.map((b) => b.cx).sort((a, b) => a - b);
    const mid = ovals.slice().sort((a, b) => a - b);
    expect(mid[0]).toBeCloseTo((centers[0]! + centers[1]!) / 2, 0);
    expect(mid[1]).toBeCloseTo((centers[1]! + centers[2]!) / 2, 0);
  });

  it("허용되지 않은 키는 실패한다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "sumBox",
      left: "1",
      right: "2",
      몰래: true,
    });
    expect(r.ok).toBe(false);
  });
});

describe.skipIf(!hasEngine)("[초등 그림] FigureSpec v2 — 각·도형수", () => {
  it("각 ㄱㄴㄷ 을 엔진 A 로 그린다", async () => {
    const item = CUBE_SCRAPE_ITEMS.find((it) => it.id === "eval-07");
    expect(item?.figureSpec).toBeTruthy();
    const r = await renderFigureSpec(item!.figureSpec);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain("ㄱ");
    expect(r.svg).toContain("ㄴ");
    expect(r.svg).toContain("ㄷ");
  });

  it("원·삼각형 안 수는 엔진 A 로 그린다", async () => {
    const item = CUBE_SCRAPE_ITEMS.find((it) => it.id === "drill-05");
    const r = await renderFigureSpec(item!.figureSpec);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const n of ["207", "385", "469", "437", "543", "118"]) {
      expect(r.svg).toContain(n);
    }
  });
});

describe.skipIf(!hasEngine)(
  "[초등 그림] 큐브 표본 스펙은 전부 그려진다",
  () => {
    it("삽화(오림)를 뺀 그림 스펙이 실패하면 안 된다", async () => {
      const specs = CUBE_SCRAPE_ITEMS.filter((it) => it.figureSpec);
      expect(specs.length).toBeGreaterThan(5);
      const failed: string[] = [];
      for (const it of specs) {
        const r = await renderFigureSpec(it.figureSpec);
        if (!r.ok) failed.push(`${it.id}: ${r.error}`);
      }
      expect(failed).toEqual([]);
    });
  },
);

describe.skipIf(!hasEngine)("[초등 그림] 무작위 20 스펙", () => {
  it("세로셈은 126 과 745 를 그린다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "columnOp",
      top: "126",
      op: "+",
      bottom: "745",
      result: "871",
      highlight: "t0",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(labelTexts(r.svg)).toContain("1");
    expect(labelTexts(r.svg)).toContain("2");
    expect(labelTexts(r.svg)).toContain("6");
    const hi = r.svg.match(
      /<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"[^>]*stroke="#b45a55"/,
    );
    expect(hi).toBeTruthy();
    const cx = Number(hi![1]) + Number(hi![3]) / 2;
    const cy = Number(hi![2]) + Number(hi![4]) / 2;
    // 강조 상자 한가운데에 그 숫자가 앉아 있는가. 조판되면 `<text>` 가 아니라
    // `<g data-label>` 이므로 라벨 읽개로 묻는다 — 상자와 숫자가 갈리면 강조가 헛돈다.
    const digit = svgLabels(r.svg).find(
      (l) =>
        l.text === "1" &&
        Math.abs(l.x - cx) < 1e-5 &&
        Math.abs(l.y - cy) < 1e-5,
    );
    expect(digit, `강조 상자 (${cx}, ${cy}) 에 «1» 이 없다`).toBeTruthy();
  });

  it("테이프 치수 곡선은 막대 바로 위에 붙는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "tape",
      length: 20,
      label: "20cm",
      segments: 5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toMatch(/stroke-dasharray="6 4"/);
    // ⚠️ halo 는 **성질**로 센다 — 그 낱말은 halo 를 이루는 «방법» 하나일 뿐이다.
    //    2026-08-28 에 방법이 바뀌자(글자끼리 서로 지워서 두 벌로 갈랐다) 이 줄이
    //    빨개졌는데, halo 는 멀쩡히 걸려 있었다. 낱말을 세면 그 낱말이 바뀔 때 운다.
    expect(
      svgLabels(r.svg).some((l) => l.halo > 0),
      "halo 가 없다",
    ).toBe(true);
    expect(r.svg).toContain("20cm");
    const bar = r.svg.match(/<rect x="[\d.]+" y="([\d.]+)"/);
    const start = r.svg.match(/<path d="M [\d.]+ ([\d.]+)/);
    expect(bar).toBeTruthy();
    expect(start).toBeTruthy();
    expect(Math.abs(Number(bar![1]) - Number(start![1]))).toBeLessThan(3);
  });

  it("시계는 두 원을 그린다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "clocks",
      items: [
        { hour: 8, minute: 50, second: 10, label: "시작" },
        { hour: 10, minute: 20, second: 30, label: "끝" },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.svg.match(/<circle /g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("점격자는 찍힌 점에만 점을 두고 격자 교점마다 찍지 않는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "pointGrid",
      cols: 6,
      rows: 4,
      dots: [
        { c: 1, r: 1, label: "ㄷ", side: "up" },
        { c: 2, r: 3, label: "ㄱ", side: "down" },
      ],
      lines: [
        [
          [2, 3],
          [4, 3],
        ],
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const dots = r.svg.match(/<circle /g) ?? [];
    expect(dots).toHaveLength(2);
    expect(r.svg).toContain("ㄷ");
    expect(r.svg).toContain("ㄱ");
    expect(r.svg).toMatch(/stroke-dasharray="4 3"/);
    expect(
      (r.svg.match(/stroke-dasharray="4 3"/g) ?? []).length,
    ).toBeGreaterThan(8);
    const dashed = [
      ...r.svg.matchAll(
        /stroke="(#[0-9a-fA-F]+)" stroke-width="([0-9.]+)" stroke-dasharray="4 3"/g,
      ),
    ];
    expect(dashed.length).toBeGreaterThan(8);
    for (const hit of dashed) {
      expect(hexMean(hit[1]!)).toBeGreaterThan(180);
      expect(Number(hit[2])).toBeLessThan(0.9);
    }
    expect(r.svg).toMatch(/stroke="#111111" stroke-width="1.6"/);
  });

  it("분수 원은 조각 수만큼 나누고 색이 있는 조각만 채운다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "fracPie",
      n: 8,
      filled: [4, 5, 6, 7],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.svg.match(/<path /g) ?? []).length).toBe(8);
    expect((r.svg.match(/fill="#e2b48a"/g) ?? []).length).toBe(4);
    expect((r.svg.match(/fill="#ffffff"/g) ?? []).length).toBe(4);
    expect(r.svg).not.toMatch(/fill="#(?:c5d4e8|d4d0e8|e8e4f0)/i);
    expect(r.svg).toMatch(/stroke-dasharray="5 4"/);
  });

  it("사다리꼴 네 삼각형은 넓이가 같다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "trapFour",
      filled: [0, 1, 3],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const tris = [
      ...r.svg.matchAll(/<polygon points="([^"]+)" fill="(#[0-9a-fA-F]+)"/g),
    ].map((m) => ({ pts: m[1]!, fill: m[2]! }));
    expect(tris).toHaveLength(4);
    const areas = tris.map((t) => shoelace(t.pts));
    expect(areas[0]).toBeGreaterThan(0);
    for (const area of areas) {
      expect(area).toBeCloseTo(areas[0]!, 5);
    }
    expect(tris.filter((t) => t.fill === "#d7c2e4")).toHaveLength(3);
    const verts = new Set(tris.flatMap((t) => t.pts.trim().split(/\s+/)));
    expect(verts.size).toBe(6);
    const yCounts = new Map<number, number>();
    for (const v of verts) {
      const y = Number(v.split(",")[1]);
      yCounts.set(y, (yCounts.get(y) ?? 0) + 1);
    }
    expect([...yCounts.values()].sort((a, b) => a - b)).toEqual([2, 4]);
    expect(r.svg, "내부 분할선은 measured 식별자가 아니다").not.toContain(
      "stroke-dasharray",
    );
    expect(
      (r.svg.match(/<line [^>]*stroke-width="1.15"/g) ?? []).length,
      "내부 점선의 짧은 실선 조각",
    ).toBeGreaterThanOrEqual(6);
    expect(figureSvgViewBoxWidth(r.svg)).toBe(124);
    expect(figureSvgSize(r.svg)).toBe("compact");
  });

  /**
   * 원장님 확정 2026-08-22 — 「원기둥의 반지름도 마찬가지. 문제에 굳이 있는데 라벨로
   * **이중표기**해서 너저분해질 필요가 없을듯」.
   *
   * 가르는 축은 「좁아서」가 아니라 **「발문이 이미 말했는가」**다. 값을 쓰는 갈래의 발문이
   * 「밑면의 반지름이 $2$ cm 인 원기둥의 밑면의 지름은?」이라 **반지름은 발문에 있고 높이는
   * 없다.** 그래서 반지름만 빼고 **높이는 남긴다** — 둘 다 빼면 설명 없는 점선만 남는다.
   */
  it("원기둥은 반지름을 안 적고 높이만 적는다 — 중심 점도 남기지 않는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "cylinder",
      r: 2,
      h: 15,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(labelTexts(r.svg), "높이는 적는다").toContain("15 cm");
    expect(
      labelTexts(r.svg),
      "반지름은 발문에 있으므로 안 적는다",
    ).not.toContain("2 cm");
    // 반지름 라벨이 없으면 중심 점은 **설명 없는 표시**다 — 같이 뺀다.
    expect(
      [...r.svg.matchAll(/<circle [^>]*r="1\.8"/g)],
      "중심 점",
    ).toHaveLength(0);
    // 높이 치수는 도형 왼쪽 바깥이다.
    const m = svgLabels(r.svg).find((l) => l.text === "15 cm");
    expect(m, "«15 cm» 라벨이 없다").toBeTruthy();
    const xs = [...r.svg.matchAll(/points="([^"]+)"/g)].flatMap((p) =>
      p[1].split(/\s+/).map((q) => Number(q.split(",")[0])),
    );
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    expect(m!.x).toBeLessThan(midX - 8);
    // ⚠️ 폭을 «0.3 × 글자크기 × 글자수» 로 **어림**하던 것을 버렸다. 그 식은 글자
    //    크기를 12 로 박고 있어서, 치수 글자를 10.5 로 내리자(원장님 확정 2026-08-28)
    //    **멀쩡한 그림에서 빨개졌다** — 실측하면 라벨은 프레임 안에 있었다.
    //    조판된 라벨은 폭·잉크 높이·halo 를 **정확히** 아니까 그걸 그대로 쓴다.
    //    어림이 아니라 실측이므로 가드도 더 세다(세로 잘림까지 본다).
    expectInsideFrame(r.svg, m!);
  });

  it("쌓기나무 겨냥도와 위 보기는 겹치지 않는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "stackCubes",
      voxels: [
        [0, 0, 0],
        [0, 0, 1],
        [0, 0, 2],
        [1, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
        [1, 1, 1],
        [1, 1, 2],
      ],
      views: ["iso", "top"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const polyXs = [...r.svg.matchAll(/points="([^"]+)"/g)].flatMap((m) =>
      m[1].split(/\s+/).map((p) => Number(p.split(",")[0])),
    );
    const cells = [
      ...r.svg.matchAll(
        /<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/g,
      ),
    ].filter((m) => Number(m[3]) === Number(m[4]) && Number(m[3]) >= 16);
    const minCellX = Math.min(...cells.map((m) => Number(m[1])));
    expect(Math.max(...polyXs)).toBeLessThan(minCellX - 4);
    const title = r.svg.match(/y="([0-9.-]+)"[^>]*>위</);
    expect(title).toBeTruthy();
    const minCellY = Math.min(...cells.map((m) => Number(m[2])));
    expect(Number(title![1])).toBeLessThan(minCellY - 4);
  });

  it("쌓기나무 위 보기 숫자는 칸 중앙, 위 글자는 격자 위에 있다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "stackCubes",
      voxels: [
        [0, 0, 0],
        [0, 0, 1],
        [1, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
      views: ["top"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const title = r.svg.match(/y="([0-9.-]+)"[^>]*>위</);
    expect(title).toBeTruthy();
    const cells = [
      ...r.svg.matchAll(
        /<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/g,
      ),
    ].filter((m) => Number(m[3]) === Number(m[4]) && Number(m[3]) >= 16);
    expect(cells.length).toBeGreaterThan(0);
    const minCellY = Math.min(...cells.map((m) => Number(m[2])));
    expect(Number(title![1])).toBeLessThan(minCellY - 4);
    const nums = svgLabels(r.svg).filter((l) => /^\d+$/.test(l.text));
    expect(nums.length).toBeGreaterThan(0);
    for (const n of nums) {
      const nx = n.x;
      const ny = n.y;
      const hit = cells.find((c) => {
        const x = Number(c[1]);
        const y = Number(c[2]);
        const s = Number(c[3]);
        return (
          Math.abs(nx - (x + s / 2)) < 0.6 && Math.abs(ny - (y + s / 2)) < 0.6
        );
      });
      expect(hit, `${n.text} at ${nx},${ny}`).toBeTruthy();
    }
  });

  it("각뿔은 옆면이 한 장으로 납작하지 않고 밑면 각형이 보인다", async () => {
    for (const sides of [3, 4, 5, 6]) {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "pyramid",
        sides,
        h: 3,
      });
      expect(r.ok, `sides=${sides}`).toBe(true);
      if (!r.ok) return;
      const polys = [...r.svg.matchAll(/<polygon points="([^"]+)"/g)].map(
        (m) => m[1].trim().split(/\s+/).length,
      );
      expect(
        polys.some((n) => n === sides),
        `밑면 ${sides}각형`,
      ).toBe(true);
      expect(polys.filter((n) => n === 3).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("원뿔은 밑면 타원 위에 삼각형을 얹지 않는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "cone",
      r: 2,
      h: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const polys = [...r.svg.matchAll(/<polygon points="([^"]+)"/g)].map((m) =>
      m[1]
        .trim()
        .split(/\s+/)
        .map((p) => p.split(",").map(Number) as [number, number]),
    );
    expect(polys.some((pts) => pts.length === 3)).toBe(false);
    const body = polys.reduce((a, b) => (a.length >= b.length ? a : b), []);
    expect(body.length).toBeGreaterThan(10);
    const ys = body.map((p) => p[1]);
    const minY = Math.min(...ys);
    expect(ys.filter((y) => y < minY + 6).length).toBe(1);
    expect(r.svg).toMatch(/stroke-dasharray="/);
    const vb = r.svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
    expect(vb).toBeTruthy();
    const boxW = Number(vb![1]);
    const boxH = Number(vb![2]);
    for (const [x, y] of body) {
      expect(x).toBeGreaterThanOrEqual(-0.5);
      expect(y).toBeGreaterThanOrEqual(-0.5);
      expect(x).toBeLessThanOrEqual(boxW + 0.5);
      expect(y).toBeLessThanOrEqual(boxH + 0.5);
    }
  });

  it("각기둥 겨냥도는 잘리지 않고 밑면 꼭짓점이 보인다", async () => {
    for (const sides of [3, 4, 5, 6]) {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "prism",
        sides,
        h: 3,
      });
      expect(r.ok, `sides=${sides}`).toBe(true);
      if (!r.ok) return;
      const vb = r.svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
      expect(vb).toBeTruthy();
      const boxW = Number(vb![1]);
      const boxH = Number(vb![2]);
      const pts = [...r.svg.matchAll(/points="([^"]+)"/g)].flatMap((m) =>
        m[1].split(/\s+/).map((p) => p.split(",").map(Number)),
      );
      expect(pts.length).toBeGreaterThan(sides);
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(-0.5);
        expect(y).toBeGreaterThanOrEqual(-0.5);
        expect(x).toBeLessThanOrEqual(boxW + 0.5);
        expect(y).toBeLessThanOrEqual(boxH + 0.5);
      }
      const polys = [...r.svg.matchAll(/<polygon points="([^"]+)"/g)];
      const top = polys[polys.length - 1]![1].trim().split(/\s+/);
      expect(top.length).toBe(sides);
    }
  });

  it("원기둥 전개도는 밑면 원이 옆면 직사각형 긴 변에 붙는다", async () => {
    const layouts = ["opp", "oppFlip", "oppMid", "sameTop", "sameBot", "ends"];
    const signatures = new Set<string>();
    for (const layout of layouts) {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "netCylinder",
        r: 2,
        h: 5,
        pi: 3,
        layout,
      });
      expect(r.ok, layout).toBe(true);
      if (!r.ok) return;
      const net = parseCylinderNet(r.svg);
      expect(net.rect, layout).toBeTruthy();
      expect(net.circles, layout).toHaveLength(2);
      const sides = net.circles.map((c) => attachLongSide(c, net.rect!));
      expect(sides.every(Boolean), `${layout} 원이 긴 변에 접해야 함`).toBe(
        true,
      );
      const [a, b] = net.circles;
      expect(Math.hypot(a!.cx - b!.cx, a!.cy - b!.cy)).toBeGreaterThanOrEqual(
        2 * a!.r - 0.8,
      );
      expect(net.rect!.w / (2 * a!.r)).toBeCloseTo(3, 1);
      signatures.add(
        net.circles
          .map((c) => `${c.cx.toFixed(1)},${c.cy.toFixed(1)}`)
          .sort()
          .join("|"),
      );
    }
    expect(signatures.size).toBe(layouts.length);
  });

  it("원기둥 전개도 모르는 배치는 실패한다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "netCylinder",
      r: 2,
      h: 5,
      pi: 3,
      layout: "float",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/layout|배치/);
  });

  it("전개도 면 안에 가로×세로 곱셈을 쓰지 않는다", async () => {
    const cube = await renderFigureSpec({
      version: "elem-1",
      kind: "netCuboid",
      w: 1,
      d: 1,
      h: 1,
    });
    const box = await renderFigureSpec({
      version: "elem-1",
      kind: "netCuboid",
      w: 7,
      d: 4,
      h: 5,
    });
    expect(cube.ok && box.ok).toBe(true);
    if (!cube.ok || !box.ok) return;
    expect(cube.svg).not.toMatch(/×|&times;/);
    expect(box.svg).not.toContain("7×4");
    expect(box.svg).toContain("7 cm");
    expect(box.svg).toContain("4 cm");
    expect(box.svg).toContain("5 cm");
  });

  it("직육면체 가로는 아래, 높이는 왼쪽, 세로는 아래-오른쪽에 둔다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "cuboid",
      w: 8,
      d: 2,
      h: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const pos = (label: string) => {
      const hit = svgLabels(r.svg).find((l) => l.text === label);
      expect(hit, label).toBeTruthy();
      return { x: hit!.x, y: hit!.y };
    };
    const width = pos("8 cm");
    const depth = pos("2 cm");
    const height = pos("4 cm");
    const dist = (p: { x: number; y: number }, q: { x: number; y: number }) =>
      Math.hypot(p.x - q.x, p.y - q.y);
    expect(dist(width, depth)).toBeGreaterThan(28);
    expect(dist(width, height)).toBeGreaterThan(28);
    expect(dist(depth, height)).toBeGreaterThan(28);
    expect(width.y).toBeGreaterThan(height.y);
    expect(height.x).toBeLessThan(width.x);
    expect(depth.x).toBeGreaterThan(width.x);
    expect(depth.y).toBeGreaterThan(height.y);
  });

  it("직육면체의 긴 높이 라벨 halo가 viewBox 왼쪽에서 잘리지 않는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "cuboid",
      w: 8,
      d: 2,
      h: 15,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const m = svgLabels(r.svg).find((l) => l.text === "15 cm");
    expect(m, "«15 cm» 라벨이 없다").toBeTruthy();
    // ⚠️ 폭을 «0.3 × 글자크기 × 글자수» 로 **어림**하던 것을 버렸다. 그 식은 글자
    //    크기를 12 로 박고 있어서, 치수 글자를 10.5 로 내리자(원장님 확정 2026-08-28)
    //    **멀쩡한 그림에서 빨개졌다** — 실측하면 라벨은 프레임 안에 있었다.
    //    조판된 라벨은 폭·잉크 높이·halo 를 **정확히** 아니까 그걸 그대로 쓴다.
    //    어림이 아니라 실측이므로 가드도 더 세다(세로 잘림까지 본다).
    expectInsideFrame(r.svg, m!);
  });

  it("대칭 윤곽 도형은 격자 칸이 아니라 다각형이다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "symmetry",
      axis: "v",
      motif: "kite",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain("<polygon");
    expect((r.svg.match(/<rect /g) ?? []).length).toBe(0);
  });

  it("직사각형 그림 비율은 가로·세로 길이를 따른다", async () => {
    const a = await renderFigureSpec({
      version: "elem-1",
      kind: "areaPoly",
      shape: "rect",
      base: 4,
      height: 5,
    });
    const b = await renderFigureSpec({
      version: "elem-1",
      kind: "areaPoly",
      shape: "rect",
      base: 9,
      height: 8,
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const box = (svg: string) => {
      const m = svg.match(
        /<rect x="[0-9.]+" y="[0-9.]+" width="([0-9.]+)" height="([0-9.]+)"/,
      );
      expect(m).toBeTruthy();
      return { w: Number(m![1]), h: Number(m![2]) };
    };
    const sa = box(a.svg);
    const sb = box(b.svg);
    expect(sa.w / sa.h).toBeCloseTo(4 / 5, 2);
    expect(sb.w / sb.h).toBeCloseTo(9 / 8, 2);
    expect(sb.w).toBeGreaterThan(sa.w);
  });

  /**
   * 원장님 확정 2026-08-22 — 「마름모는 … 내부에는 라벨 표기 안 하는 걸로 하자.
   * 표기하니까 오히려 너저분해지는듯」. 네 안을 다 그려 본 뒤 나온 결정이다.
   * **대각선 점선은 남기고 라벨만 뺀다** — 넓이 규칙이 그 선에서 보인다.
   */
  it("마름모는 대각선 점선만 그리고 길이 라벨은 적지 않는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "areaPoly",
      shape: "rhombus",
      base: 8,
      height: 4,
      d2: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg, "마름모는 라벨을 적지 않는다").not.toMatch(/\d\s*cm/);
    expect(r.svg, "구조용 점선은 measured 식별자를 쓰지 않는다").not.toContain(
      "stroke-dasharray",
    );
    expect(
      [...r.svg.matchAll(/<line [^>]*stroke-width="1.05"/g)].length,
      "대각선의 짧은 실선 조각",
    ).toBeGreaterThan(4);
  });

  it.each([
    { shape: "tri", base: 8, height: 5 },
    { shape: "para", base: 7, height: 4 },
    { shape: "trap", base: 8, height: 4, top: 5 },
  ])("areaPoly $shape 치수는 도형 바깥이고 폭은 mid 등급이다", async (spec) => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "areaPoly",
      ...spec,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const polygon = parsePoints(r.svg.match(/<polygon points="([^"]+)"/)![1]!);
    const controls = [
      ...r.svg.matchAll(
        /<path d="M [\d.-]+ [\d.-]+ Q ([\d.-]+) ([\d.-]+) [\d.-]+ [\d.-]+"[^>]*stroke-dasharray="6 4"/g,
      ),
    ].map((m) => [Number(m[1]), Number(m[2])] as Pt);
    expect(controls.length, `${spec.shape} 치수`).toBeGreaterThanOrEqual(2);
    for (const control of controls) {
      expect(
        pointInsidePolygon(control, polygon),
        `${spec.shape} 치수 곡선`,
      ).toBe(false);
    }
    const width = figureSvgViewBoxWidth(r.svg);
    expect(width).toBeGreaterThan(160);
    expect(width).toBeLessThanOrEqual(320);
    expect(figureSvgSize(r.svg)).toBe("mid");
  });

  it("정삼각형은 세 변의 길이가 같다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "namedShapes",
      items: [{ shape: "eqTri", label: "가" }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const raw = r.svg.match(/points="([^"]+)"/);
    expect(raw).toBeTruthy();
    const pts = raw![1].split(/\s+/).map((p) => p.split(",").map(Number));
    expect(pts).toHaveLength(3);
    const dist = (a: number[], b: number[]) =>
      Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);
    const ab = dist(pts[0]!, pts[1]!);
    const bc = dist(pts[1]!, pts[2]!);
    const ca = dist(pts[2]!, pts[0]!);
    expect(ab).toBeCloseTo(bc, 1);
    expect(bc).toBeCloseTo(ca, 1);
  });

  it("이름 붙인 도형의 라벨은 같은 행에서 높이가 같다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "namedShapes",
      items: [
        { shape: "square", label: "가" },
        { shape: "rightTri", label: "나" },
        { shape: "isoTri", label: "다" },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ys = ["가", "나", "다"].map((lab) => textPos(r.svg, lab)?.y);
    expect(ys[0]).toBeDefined();
    expect(ys[0]).toBe(ys[1]);
    expect(ys[0]).toBe(ys[2]);
  });

  it("열이 많은 표는 viewBox 를 키워 숫자를 줄이지 않는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "table",
      headers: ["×", "3", "4", "5", "6", "7", "8"],
      rows: [["4", "12", "16", "20", "24", "28", "32"]],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const vb = r.svg.match(/viewBox="0 0 ([0-9.]+)/);
    expect(vb).toBeTruthy();
    expect(Number(vb![1])).toBeLessThanOrEqual(240);
    // 글자를 줄여서 폭을 맞추지 않았는가 — 12pt 아래로 내려간 글자가 없어야 한다.
    const sizes = svgLabels(r.svg).map((l) => l.fontSize);
    expect(sizes.length).toBeGreaterThan(0);
    expect(
      Math.min(...sizes),
      `글자 크기 ${sizes.join(",")}`,
    ).toBeGreaterThanOrEqual(12);
  });

  it("소수 수직선은 빈칸 눈금에 상자를 둔다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "numberLine",
      min: 0,
      max: 1,
      step: 0.1,
      tick: 0.1,
      blanks: [0.1, 0.3],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(labelTexts(r.svg)).toContain("0.2");
    expect(labelTexts(r.svg)).not.toContain("0.1");
    expect(r.svg).toContain("<rect ");
  });

  // 수의 범위(초5 2-1) — 원장님 확정 2026-10-18 Hi-fi H1: 축 위 적갈색 3px · 포함 ● · 불포함 ○.
  describe("수직선 범위(ranges)", () => {
    const base = {
      version: "elem-1",
      kind: "numberLine",
      min: 24,
      max: 30,
      step: 1,
      tick: 0.5,
    } as const;
    const dots = (svg: string) =>
      [...svg.matchAll(/<circle [^>]*fill="(#[0-9a-f]+)"[^>]*>/g)].map(
        (m) => m[1],
      );

    it("포함은 채운 점 · 불포함은 속이 흰 점이다", async () => {
      const r = await renderFigureSpec({
        ...base,
        ranges: [{ from: 25, to: 28, fromIn: false, toIn: true }],
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(dots(r.svg)).toEqual(["#ffffff", "#a8432f"]);
      expect(r.svg).toMatch(/stroke="#a8432f" stroke-width="3"/);
    });

    it("끝이 없는 쪽은 점 없이 축 끝까지 긋는다(이상)", async () => {
      const r = await renderFigureSpec({
        ...base,
        ranges: [{ from: 27, to: null, fromIn: true }],
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(dots(r.svg)).toEqual(["#a8432f"]);
      const axis = r.svg.match(
        /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)"[^>]*stroke-width="1.4"/,
      )!;
      const bar = r.svg.match(
        /<line x1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*stroke="#a8432f"/,
      )!;
      expect(Number(bar[2])).toBeCloseTo(Number(axis[3]), 1);
    });

    it("포함 여부를 빠뜨리거나 끝이 축 밖이면 던진다 — ●/○ 가 곧 답이다", async () => {
      for (const ranges of [
        [{ from: 25, to: 28, toIn: true }],
        [{ from: 23, to: 28, fromIn: true, toIn: true }],
        [{ from: null, to: null }],
        [{ from: 28, to: 25, fromIn: true, toIn: true }],
      ]) {
        const r = await renderFigureSpec({ ...base, ranges });
        expect(r.ok, JSON.stringify(ranges)).toBe(false);
      }
    });
  });

  it("나누기 삼각형은 개수 상자와 점선이 있다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "divideTriangle",
      n: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(labelTexts(r.svg)).toContain("4");
    expect(r.svg).toMatch(/stroke-dasharray="5 4"/);
  });

  it("그림 스펙이 있는 무작위 문항은 전부 그려진다", async () => {
    const specs = CUBE_RANDOM_20.filter((it) => it.figureSpec);
    expect(specs.length).toBeGreaterThan(10);
    const failed: string[] = [];
    for (const it of specs) {
      const r = await renderFigureSpec(it.figureSpec);
      if (!r.ok) failed.push(`${it.id}: ${r.error}`);
    }
    expect(failed).toEqual([]);
  }, 60_000);
});

/**
 * 원장님 육안 검수 2026-08-22 (`docs/planning/tracks/elem-engine-review-20260822.md`).
 * 판정의 «참» 은 **화면 좌표**에서 온다 — 제품이 3D 법선으로 정한 것을 여기서 다시
 * 법선으로 재면 동어반복이다(CLAUDE.md 2026-08-18). 실루엣과 앞·뒤 사슬로 따로 센다.
 */
describe.skipIf(!hasEngine)(
  "[초등 그림] 겨냥도 — 숨은 모서리는 점선 (원장님 2026-08-22 ⑪)",
  () => {
    for (const sides of [3, 4, 5, 6, 7, 8]) {
      it(`${sides}각기둥은 숨은 모서리를 면 위에 점선으로 그린다`, async () => {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "prism",
          sides,
          h: 3,
        });
        expect(r.ok, `sides=${sides}`).toBe(true);
        if (!r.ok) return;
        const polys = svgPolygons(r.svg);
        const hidden = dashedLinesAfterPolygons(r.svg);
        // ⑴ 점선이 면 **뒤**에 깔리면 칠에 덮여 막힌 덩어리가 된다.
        expect(hidden.length, "숨은 모서리가 면 뒤에 깔렸다").toBeGreaterThan(
          0,
        );
        // ⑵ 꼭짓점은 밑면 n + 윗면 n. 마지막 폴리곤이 윗면이다.
        const verts = uniquePoints(polys.flat());
        expect(verts).toHaveLength(sides * 2);
        const top = uniquePoints(polys[polys.length - 1]!);
        expect(top).toHaveLength(sides);
        const bottom = verts.filter((p) => !top.some((q) => samePoint(p, q)));
        expect(bottom).toHaveLength(sides);
        // ⑶ 숨은 모서리 수는 화면에서 따로 셀 수 있다 — 옆면 법선이 수평이므로 밑면
        //    고리를 좌·우 끝에서 가르면 위쪽(뒤) 사슬의 변 c 개와 그 안쪽 세로 모서리
        //    c−1 개가 숨는다. 제품은 3D 법선으로 정하니 서로 다른 길로 같은 수에 닿는다.
        const c = backChainEdgeCount(bottom);
        expect(hidden).toHaveLength(2 * c - 1);
        for (const [a, b] of hidden) {
          expect(
            verts.some((p) => samePoint(p, a)),
            `끝점 ${a}`,
          ).toBe(true);
          expect(
            verts.some((p) => samePoint(p, b)),
            `끝점 ${b}`,
          ).toBe(true);
        }
        // ⑷ 세로 모서리가 하나는 점선이어야 «막힌 덩어리»가 아니다.
        const vertical = hidden.filter(([a, b]) => Math.abs(a[0] - b[0]) < 0.6);
        expect(vertical.length, "숨은 세로 모서리").toBe(c - 1);
        const baseHidden = hidden.filter(
          ([a, b]) => Math.abs(a[0] - b[0]) >= 0.6,
        );
        expect(baseHidden).toHaveLength(c);
        expect(isContiguousChain(bottom, baseHidden)).toBe(true);
      });

      it(`${sides}각뿔은 밑면뿐 아니라 **모선**도 점선으로 그린다`, async () => {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "pyramid",
          sides,
          h: 3,
        });
        expect(r.ok, `sides=${sides}`).toBe(true);
        if (!r.ok) return;
        const polys = svgPolygons(r.svg);
        const hidden = dashedLinesAfterPolygons(r.svg);
        const base = uniquePoints(polys[0]!);
        expect(base).toHaveLength(sides);
        const verts = uniquePoints(polys.flat());
        expect(verts).toHaveLength(sides + 1);
        const apex = verts.find((p) => !base.some((q) => samePoint(p, q)))!;
        expect(apex).toBeTruthy();
        const lateral = hidden.filter(
          ([a, b]) => samePoint(a, apex) || samePoint(b, apex),
        );
        const baseHidden = hidden.filter(
          ([a, b]) => !samePoint(a, apex) && !samePoint(b, apex),
        );
        // ⚠️ 각기둥 규칙(뒤쪽 사슬 = 숨은 면)을 각뿔에 그대로 대면 안 된다 — 꼭대기가
        //    옆면 법선을 위로 눕혀 **보이는 옆면이 더 많다**(칠각뿔에서 실제로 갈렸다).
        //    그래서 개수 대신 **구조**를 잰다: 뒤를 보는 옆면이 k 장이면 밑면 점선 k 개와
        //    그 사이 모선 k−1 개가 숨는다. 모선을 빼먹으면 이 등식이 깨진다.
        expect(baseHidden.length, "숨은 밑면 모서리").toBeGreaterThan(0);
        expect(lateral, "숨은 모선").toHaveLength(baseHidden.length - 1);
        // 숨은 밑면 모서리는 고리에서 **이어진 한 토막**이다.
        expect(isContiguousChain(base, baseHidden)).toBe(true);
        const visibleBase = ringEdges(base).filter(
          (e) => !baseHidden.some((h) => sameEdge(h, e)),
        );
        expect(visibleBase.length).toBe(sides - baseHidden.length);
        // 그리고 실루엣 위에 있을 수 없다 — 실루엣 모서리는 앞뒤 면을 하나씩 낀다.
        // ⚠️ 「보이는 모서리보다 화면에서 위」로 재면 안 된다. 뒤를 보는지는 모서리의
        //    **법선 방향**이 정하지 깊이가 정하지 않아, 돌린 오각뿔에서 순서가 뒤집힌다.
        for (const e of hidden) {
          expect(
            insideHull(verts, midPoint(e)),
            `실루엣 위의 숨은 모서리 ${e}`,
          ).toBe(true);
        }
      });
    }

    it("각기둥 세로 모서리는 화면에서 겹치지 않는다 — 점선이 실선에 붙으면 못 센다", async () => {
      for (const sides of [3, 4, 5, 6, 7, 8]) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "prism",
          sides,
          h: 3,
        });
        expect(r.ok, `sides=${sides}`).toBe(true);
        if (!r.ok) return;
        const xs = uniquePoints(svgPolygons(r.svg).flat())
          .map((p) => p[0])
          .sort((a, b) => a - b);
        const gaps = xs
          .slice(1)
          .map((x, i) => x - xs[i]!)
          .filter((g) => g > 0.15);
        expect(
          Math.min(...gaps),
          `${sides}각기둥 세로 모서리 간격`,
        ).toBeGreaterThan(6);
      }
    });

    it("각뿔 모선은 꼭대기에서 부챗살로 갈라진다 — 극각이 붙으면 겹쳐 그려진다", async () => {
      for (const sides of [3, 4, 5, 6, 7, 8]) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "pyramid",
          sides,
          h: 3,
        });
        expect(r.ok, `sides=${sides}`).toBe(true);
        if (!r.ok) return;
        const polys = svgPolygons(r.svg);
        const base = uniquePoints(polys[0]!);
        const apex = uniquePoints(polys.flat()).find(
          (p) => !base.some((q) => samePoint(p, q)),
        )!;
        const polar = base
          .map(
            (p) => (Math.atan2(p[1] - apex[1], p[0] - apex[0]) * 180) / Math.PI,
          )
          .sort((a, b) => a - b);
        const gaps = polar.slice(1).map((v, i) => v - polar[i]!);
        expect(
          Math.min(...gaps),
          `${sides}각뿔 모선 극각 간격`,
        ).toBeGreaterThan(2.5);
      }
    });

    it("직육면체도 같은 기준 — 뒤 꼭짓점에 닿는 모서리 셋이 점선", async () => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "cuboid",
        w: 8,
        d: 2,
        h: 4,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const hidden = dashedLinesAfterPolygons(r.svg);
      expect(hidden).toHaveLength(3);
      const ends = hidden.flat();
      const shared = ends.filter(
        (p) => ends.filter((q) => samePoint(p, q)).length === 3,
      );
      expect(shared.length, "세 점선이 한 꼭짓점에서 만나야 한다").toBe(3);
    });
  },
);

describe.skipIf(!hasEngine)(
  "[초등 그림] 원기둥·원뿔 밑면은 타원기둥이 아니다 (원장님 2026-08-22 ②)",
  () => {
    // ⚠️ 납작한 **정도**는 여기서 안 잰다 — 「밑면 타원의 납작한 정도」 검사가
    //    눈금을 맞춰 **정확히** 잡는다(0.15). 두 곳이 같은 것을 재면 값을 바꿀 때
    //    한쪽만 고치고 다른 쪽이 낡는다. 여기 몫은 **기울기**뿐이다 —
    //    사방투영(45°)은 납작한 정도가 범위 안이어도 **기울어** 있다(09 §4-15).

    it("원기둥 윗면 타원은 **축에 나란**하다 — 사방투영처럼 기울지 않는다", async () => {
      for (const [rr, hh] of [
        [2, 3],
        [3, 8],
        [5, 2],
      ]) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "cylinder",
          r: rr,
          h: hh,
        });
        expect(r.ok, `${rr}/${hh}`).toBe(true);
        if (!r.ok) return;
        const top = polygonsByFill(r.svg, "#f2e6d4")[0]!;
        expect(top, `r=${rr} h=${hh} 윗면`).toBeTruthy();
        expect(axisTilt(top), `r=${rr} h=${hh} 기울기`).toBeLessThan(1.0);
      }
    });

    it("원기둥 밑면 뒤쪽 호는 점선이고, 옆면을 곧은 선으로 가로막지 않는다", async () => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "cylinder",
        r: 2,
        h: 3,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const far = [
        ...r.svg.matchAll(/<polyline points="([^"]+)"[^>]*stroke-dasharray/g),
      ].map((m) => parsePoints(m[1]!));
      expect(far, "밑면 숨은 호").toHaveLength(1);
      expect(far[0]!.length).toBeGreaterThan(10);
      // 옆면은 위·아래 앞쪽 호를 그대로 잇는다 — 네 점 사각형이면 밑면을 가로지르는
      // 실선이 남아 「밑면이 잘린 배」처럼 보인다.
      const body = polygonsByFill(r.svg, "#e4d3b8")[0];
      expect(body).toBeTruthy();
      expect(body!.length).toBeGreaterThan(20);
    });

    /**
     * **구도 같은 자로 잰다.** 이 검사에 구가 빠져 있어서 구만 `0.32` 인 것을 아무도
     * 못 봤다 — 그때는 `ROUND_RATIO` 를 원기둥·원뿔만 쓰고 구는 **날 리터럴**이라
     * 상수를 조여도 구는 그대로 남았다(2026-08-18 「배선이 한쪽만」).
     * 지금은 **셋이 한 상수를 쓴다.** 이 검사가 그 배선을 지킨다 — 누가 다시 갈라놓으면
     * 구 칸이 혼자 빨개진다.
     *
     * ⚠️ 셋이 서로 다른 «요소»로 그려진다 — 원기둥·원뿔은 **폴리곤**, 구만 `<ellipse>` 다.
     *    `<ellipse>` 만 찾는 자를 쓰면 앞의 둘은 **구조적으로 0**이 된다(못 재는 것이
     *    깨끗한 것으로 보인다). 그래서 kind 마다 재는 자리를 따로 적는다.
     */
    /**
     * **밑면 타원의 납작한 정도를 «눈금 맞춘» 자로 잰다.**
     *
     * ⚠️ 「수가 나오나」도 「값이 변하나」도 자를 지켜 주지 못한다 — 엉뚱한 요소를 재도
     *    **값이 같이 움직인다.** 실측(elem_advanced 기준): 비율을 0.30 → 0.15 로 바꾸면
     *    원기둥 **몸통**이 0.900 → 0.825 로 따라 움직이고, 원뿔 **실루엣**도 그렇다.
     *    그걸 재면 비율을 잠가 놓고 몸통을 지키는 **동어반복**이 된다.
     *
     * 그래서 눈금은 **「그 수가 비율과 같은가」**로 맞춘다. 그리고 **`r·h` 가 다른 두 점**을
     *    쓴다 — 밑면 타원의 비는 `r·h` 와 무관하게 일정하지만(0.300 · 0.300),
     *    몸통·실루엣은 `r·h` 에 따라 **0.900 / 0.550** 으로 갈린다. 엉뚱한 요소를 재면
     *    두 점에서 같은 값이 나올 수 없다.
     *
     * ⚠️ 셋이 서로 다른 «요소»로 그려진다 — 원기둥·원뿔은 **폴리곤**, 구만 `<ellipse>` 다.
     *    `<ellipse>` 만 찾는 자를 쓰면 앞의 둘은 **구조적으로 0**이 된다.
     *
     * ⚠️ 기대값은 **여기 적힌 리터럴**이다. 제품 상수를 읽으면 상수를 바꿀 때 기대값이
     *    따라가서 영원히 초록이다. 상수를 바꾸면 이 줄도 **일부러** 같이 고쳐야 한다.
     */
    it("밑면 타원의 납작한 정도 — 자가 «비율 그 자체»를 재는지 눈금까지 맞춘다", async () => {
      // 원장님 확정 2026-08-22 — 「절대 … 타원이 그려지지 않도록」. **셋이 한 숫자를 쓴다.**
      // 예전엔 구만 `0.32` 라 상수를 조여도 안 따라왔다(배선이 한쪽만).
      // 눈금 실측 12/12: p ∈ {0.30, 0.20, 0.15, 0.12} × r2h3·r5h4 에서 잰 값 = p (오차 <0.002).
      const RATIO = 0.15;

      for (const [rr, hh] of [
        [2, 3],
        [5, 4],
      ]) {
        const cyl = await renderFigureSpec({
          version: "elem-1",
          kind: "cylinder",
          r: rr,
          h: hh,
        });
        expect(cyl.ok, `원기둥 r${rr}h${hh}`).toBe(true);
        if (!cyl.ok) return;
        const top = polygonsByFill(cyl.svg, "#f2e6d4")[0]!;
        expect(top, "원기둥 윗면").toBeTruthy();
        expect(ellipseFlatness(top), `원기둥 r${rr}h${hh} 밑면 비`).toBeCloseTo(
          RATIO,
          3,
        );

        const cone = await renderFigureSpec({
          version: "elem-1",
          kind: "cone",
          r: rr,
          h: hh,
        });
        expect(cone.ok, `원뿔 r${rr}h${hh}`).toBe(true);
        if (!cone.ok) return;
        // 원뿔은 밑면 다각형이 따로 없다 — 실루엣에서 꼭대기를 뺀 앞쪽 호 + 뒤쪽 점선 호.
        const body = polygonsByFill(cone.svg, "#e4d3b8")[0]!;
        const far = parsePoints(
          cone.svg.match(
            /<polyline points="([^"]+)"[^>]*stroke-dasharray/,
          )![1]!,
        );
        expect(
          ellipseFlatness([...body.slice(1), ...far]),
          `원뿔 r${rr}h${hh} 밑면 비`,
        ).toBeCloseTo(RATIO, 3);
      }

      const ball = await renderFigureSpec({
        version: "elem-1",
        kind: "sphere",
        r: 3,
      });
      expect(ball.ok).toBe(true);
      if (!ball.ok) return;
      const m = ball.svg.match(/<ellipse[^>]*rx="([\d.]+)" ry="([\d.]+)"/);
      expect(m, "구 적도 타원").toBeTruthy();
      expect(Number(m![2]) / Number(m![1]), "구 적도 비").toBeCloseTo(RATIO, 3);
    });

    it("원뿔 밑면 타원도 **축에 나란**하다", async () => {
      for (const [rr, hh] of [
        [2, 4],
        [4, 3],
      ]) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "cone",
          r: rr,
          h: hh,
        });
        expect(r.ok, `${rr}/${hh}`).toBe(true);
        if (!r.ok) return;
        const near = polygonsByFill(r.svg, "#e4d3b8")[0]!;
        expect(near, `r=${rr} h=${hh} 옆면`).toBeTruthy();
        const far = parsePoints(
          r.svg.match(/<polyline points="([^"]+)"[^>]*stroke-dasharray/)![1]!,
        );
        expect(axisTilt(far), `r=${rr} h=${hh} 기울기`).toBeLessThan(1.0);
      }
    });
  },
);

describe.skipIf(!hasEngine)(
  "[초등 그림] 치수 라벨은 measured() 하나로 (원장님 2026-08-22 ⑧)",
  () => {
    const WITH_DIMS = [
      {
        version: "elem-1",
        kind: "areaPoly",
        shape: "rect",
        base: 4,
        height: 5,
      },
      { version: "elem-1", kind: "areaPoly", shape: "tri", base: 8, height: 5 },
      {
        version: "elem-1",
        kind: "areaPoly",
        shape: "para",
        base: 7,
        height: 4,
      },
      {
        version: "elem-1",
        kind: "areaPoly",
        shape: "trap",
        base: 8,
        height: 4,
        top: 5,
      },
      // ⚠️ `rhombus`·`sphere` 는 일부러 뺐다 — 원장님이 라벨을 안 적기로 확정하셨다
      //    (2026-08-22, 이중표기). 「라벨이 있으면 halo 여야 한다」는 규칙은 그대로다.
      { version: "elem-1", kind: "cuboid", w: 8, d: 2, h: 4 },
      { version: "elem-1", kind: "cylinder", r: 2, h: 3 },
      { version: "elem-1", kind: "netCuboid", w: 7, d: 4, h: 5 },
      { version: "elem-1", kind: "tape", length: 20, label: "20cm" },
    ];

    /**
     * 「받은 치수를 전부 적는가」는 「라벨이 measured() 인가」와 **다른 축**이다.
     * 사다리꼴은 뒤 검사가 초록인 채로 높이 점선에 값이 없었다 — 지면에 설명 없는
     * 점선 하나가 남는다. 원장님 ⑭「어디를 가리키는지 모르겠다」와 같은 부류다.
     */
    it("areaPoly 는 스펙이 준 치수를 하나도 빠뜨리지 않는다", async () => {
      const cases: { spec: Record<string, unknown>; want: number[] }[] = [
        { spec: { shape: "rect", base: 9, height: 5 }, want: [9, 5] },
        { spec: { shape: "tri", base: 10, height: 6 }, want: [10, 6] },
        { spec: { shape: "para", base: 11, height: 7 }, want: [11, 7] },
        {
          spec: { shape: "trap", base: 10, height: 6, top: 4 },
          want: [10, 6, 4],
        },
        // 마름모는 `want: []` 다 — 원장님 확정으로 **라벨을 안 적는다**(2026-08-22).
        // 「하나도 빠뜨리지 않는다」와 「안 적는다」가 부딪히므로 여기서 빼고,
        // 대신 「비율대로 그려지는가」로 잰다. 다만 **설명 없는 점선** 검사(아래)는
        // 마름모에도 그대로 대야 한다 — 대각선 둘이 라벨 없이 남기 때문이다.
        { spec: { shape: "rhombus", base: 12, height: 8, d2: 8 }, want: [] },
      ];
      const missing: string[] = [];
      for (const c of cases) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "areaPoly",
          ...c.spec,
        });
        expect(r.ok, String(c.spec.shape)).toBe(true);
        if (!r.ok) return;
        const shown = new Set(
          svgLabels(r.svg)
            .map((l) => /^([0-9.]+) cm$/.exec(l.text))
            .filter((m): m is RegExpExecArray => m !== null)
            .map((m) => Number(m[1])),
        );
        for (const v of c.want) {
          if (!shown.has(v))
            missing.push(`${c.spec.shape}: ${v} cm 가 지면에 없다`);
        }
        // 설명 없는 점선이 남지 않는가 — 안내선은 치수 곡선과 **짝**이어야 한다.
        //
        // ⚠️ 마름모는 **일부러 예외**다. 원장님이 라벨을 안 적기로 확정하셔서(2026-08-22)
        //    대각선 점선 둘이 설명 없이 남는다 — 그건 결함이 아니라 결정이다. 규칙을
        //    조용히 약하게 만들지 않고 **예외라고 적는다.** 대신 마름모가 잃은 조명은
        //    「비율대로 그려지는가」가 대신 켠다(바로 위 시험).
        if (c.want.length > 0) {
          const guides = (r.svg.match(/stroke-dasharray="5 4"/g) ?? []).length;
          const dims = (r.svg.match(/stroke-dasharray="6 4"/g) ?? []).length;
          expect(dims, `${c.spec.shape} 치수 곡선`).toBeGreaterThanOrEqual(
            guides,
          );
        } else {
          expect(shown.size, `${c.spec.shape} 는 라벨이 없어야 한다`).toBe(0);
        }
      }
      expect(missing).toEqual([]);
    });

    /**
     * **지면에서 끈 조명을 여기로 옮긴 것이다.**
     *
     * 원장님이 마름모 라벨을 빼기로 하셨으므로(2026-08-22) §4-20 의 「값이 곧 조명」이
     * 지면에서 사라진다 — 그리고 §4-21(`height` 로 그리고 `d2` 로 적던 자리)을 지면에서
     * 잡아 줄 근거가 **그 라벨이었다.** 원장님 결정은 **지면**에 대한 것이지 **검사**에
     * 대한 것이 아니다. 그래서 라벨이 하던 일을 시험이 대신 한다 —
     * 「그린 가로:세로가 스펙의 `d1:d2` 와 맞는가」를 SVG 에서 **직접** 잰다.
     *
     * ⚠️ `height != d2` 인 입력이 이 검사의 핵심이다. 같은 값만 넣으면 무엇으로 그리든
     *    비가 같아서 §4-21 자리가 구조적으로 안 갈린다.
     */
    it("마름모는 라벨이 없어도 스펙의 대각선 비율대로 그려진다", async () => {
      for (const [d1, d2, height] of [
        [12, 8, 4], // height != d2 — §4-21 자리. height 로 그리면 비가 3.0 이 된다
        [18, 6, 6],
        [6, 11, 11],
      ]) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "areaPoly",
          shape: "rhombus",
          base: d1,
          height,
          d2,
        });
        expect(r.ok, `${d1}x${d2}`).toBe(true);
        if (!r.ok) return;
        const pts = parsePoints(r.svg.match(/<polygon points="([^"]+)"/)![1]!);
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const w = Math.max(...xs) - Math.min(...xs);
        const h = Math.max(...ys) - Math.min(...ys);
        expect(w / h, `가로:세로 = ${d1}:${d2}`).toBeCloseTo(d1 / d2, 1);
      }
    });

    /**
     * **전 kind 를 훑는다.** 예전엔 `WITH_DIMS` 라는 손 목록만 봤고, 거기 `sphere` 가
     * 없어서 「반지름 3 cm」 **날 텍스트**를 구조적으로 못 봤다 — 09 §4-22 에 「손 목록은
     * 샌다」를 적어 놓고 **내 시험이 바로 그 모양**이었다. 라벨이 있어야 한다고 요구하지
     * 않고, **있으면 halo 여야 한다**만 본다. 그래야 라벨을 뺀 kind 도 같이 훑을 수 있다.
     */
    /**
     * 원기둥도 마름모와 같다 — 반지름 라벨을 뺐으니(원장님 확정 2026-08-22, 이중표기)
     * **그린 비가 스펙과 맞는지 아무도 안 본다.** 그 조명을 여기로 옮긴다.
     *
     * 절대 크기는 원래 안 지킨다(`scale = 70/max(2r,h)` 라 `2r ≥ h` 면 반지름이 늘 35px).
     * 지키는 것은 **`r:h` 비**뿐이고, 그것만은 정확하다 — 둘 다 같은 `scale` 을 곱하니까.
     */
    it("원기둥은 라벨이 없어도 스펙의 r:h 비율대로 그려진다", async () => {
      for (const [rr, hh] of [
        [2, 3],
        [5, 4],
        [3, 8],
      ]) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "cylinder",
          r: rr,
          h: hh,
        });
        expect(r.ok, `r=${rr} h=${hh}`).toBe(true);
        if (!r.ok) return;
        const top = polygonsByFill(r.svg, "#f2e6d4")[0]!;
        const body = polygonsByFill(r.svg, "#e4d3b8")[0]!;
        const rpx =
          (Math.max(...top.map((p) => p[0])) -
            Math.min(...top.map((p) => p[0]))) /
          2;
        // 높이 = 왼쪽 모선. 옆면 폴리곤의 최좌점 둘(위·아래)의 y 차이다.
        const xmin = Math.min(...body.map((p) => p[0]));
        const leftYs = body.filter((p) => p[0] - xmin < 0.3).map((p) => p[1]);
        const hpx = Math.max(...leftYs) - Math.min(...leftYs);
        expect(rpx / hpx, `r:h = ${rr}:${hh}`).toBeCloseTo(rr / hh, 1);
      }
    });

    /**
     * **구는 `r` 을 그림에 안 담는다** — `pr = 36.0` 리터럴이라 `r=1` 과 `r=20` 이 같은 원이다.
     * 지금 구 문항은 길이를 그림에서 읽지 않으므로(전부 「어떤 도형인가」류) 성립하지만,
     * 「그림을 보고 반지름을 구하시오」가 생기면 **그 순간 못 쓴다.**
     *
     * 이 시험은 고치라는 것이 아니라 **지금이 어떤 상태인지 적어 두는 것**이다 —
     * 어디에도 안 적혀 있어서 의도인지 결함인지 다음 사람이 알 수 없었다.
     * 누가 `r` 을 반영하게 고치면 여기가 빨개지고, 그때 이 주석을 지우면 된다.
     */
    it("구는 반지름을 그림 크기에 반영하지 않는다 (알려진 상태)", async () => {
      const sizes: number[] = [];
      for (const rr of [1, 3, 20]) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "sphere",
          r: rr,
        });
        expect(r.ok, `r=${rr}`).toBe(true);
        if (!r.ok) return;
        sizes.push(
          Number(
            r.svg.match(/<circle cx="[\d.]+" cy="[\d.]+" r="([\d.]+)"/)![1],
          ),
        );
      }
      expect(new Set(sizes).size, "r 이 달라도 원 크기는 같다").toBe(1);
    });

    /**
     * ⚠️ **이 목록은 손 목록이고, 그래서 샌다.** 09 §4-22 가 적은 그대로다 —
     * `sphere` 를 놓쳤던 자리이고, 2026-08-23 에 `markedShape` 를 새로 넣었을 때
     * **또 놓쳤다**(변이 「변 라벨을 날 텍스트로」가 초록이었다).
     *
     * 표본(`probe-elem-figure.py --specs`)을 정본으로 읽게 고쳐 봤으나, **vitest 안에서만**
     * 변이가 반영되지 않는 현상을 못 밝혔다(커맨드라인에서는 날 텍스트가 확실히 나오고,
     * `drawn` 98→84 로 vitest 가 변이 자체는 본다). 원인 불명인 채로 두면 「검사된다」고
     * 읽히므로 **손 목록으로 되돌리고 새 kind 를 직접 추가**했다.
     * 새 kind 를 넣는 사람은 **여기에도 넣어야 한다** — 그리고 그 사실이 문제다.
     * (미해결 자리: `docs/planning/tracks/elem-figure-demand-20260823.md` §10)
     */
    it("어느 kind 든 cm 라벨은 halo 치수 글자다 — 날 텍스트가 없다", async () => {
      const bare: string[] = [];
      for (const spec of [
        ...WITH_DIMS,
        { version: "elem-1", kind: "sphere", r: 3 },
        { version: "elem-1", kind: "cone", r: 4, h: 3 },
        {
          version: "elem-1",
          kind: "areaPoly",
          shape: "rhombus",
          base: 8,
          height: 4,
          d2: 4,
        },
        { version: "elem-1", kind: "prism", sides: 5, h: 3 },
        { version: "elem-1", kind: "pyramid", sides: 5, h: 3 },
        {
          version: "elem-1",
          kind: "netCylinder",
          r: 2,
          h: 5,
          pi: 3,
          layout: "opp",
        },
        {
          version: "elem-1",
          kind: "stackCubes",
          voxels: [[0, 0, 0]],
          views: ["iso"],
        },
        // ② markedShape (2026-08-23) — 변 길이를 적는 kind 라 반드시 여기 있어야 한다.
        {
          version: "elem-1",
          kind: "markedShape",
          shape: "isoTri",
          sides: ["7 cm", "7 cm", "5 cm"],
          equal: [[0, 1]],
        },
      ]) {
        const r = await renderFigureSpec(spec);
        expect(r.ok, String(spec.kind)).toBe(true);
        if (!r.ok) return;
        for (const l of svgLabels(r.svg)) {
          if (!/\d\s*cm/.test(l.text)) continue;
          // halo 가 없으면 치수 글자를 도형 선이 관통한다.
          if (l.halo <= 0) bare.push(`${spec.kind}: ${l.text}`);
        }
      }
      expect(bare, "날 텍스트 치수").toEqual([]);
    }, 60_000);

    it("치수를 적기로 한 kind 는 실제로 적는다 — 검사가 빈 껍데기가 아니다", async () => {
      const bare: string[] = [];
      for (const spec of WITH_DIMS) {
        const r = await renderFigureSpec(spec);
        expect(r.ok, `${spec.kind}/${spec.shape ?? ""}`).toBe(true);
        if (!r.ok) return;
        const labels = svgLabels(r.svg).filter((l) => l.text.includes("cm"));
        expect(
          labels.length,
          `${spec.kind}/${spec.shape ?? ""} cm 라벨`,
        ).toBeGreaterThan(0);
        for (const l of labels) {
          if (l.halo <= 0)
            bare.push(`${spec.kind}/${spec.shape ?? ""}: ${l.text}`);
        }
        const curves = (r.svg.match(/stroke-dasharray="6 4"/g) ?? []).length;
        expect(
          curves,
          `${spec.kind}/${spec.shape ?? ""} 치수 점선`,
        ).toBeGreaterThanOrEqual(labels.length);
      }
      expect(bare).toEqual([]);
    });
  },
);

describe.skipIf(!hasEngine)(
  "[초등 그림] 그린 것은 viewBox 안에 있다 (원장님 2026-08-22 ⑫)",
  () => {
    const ALL = [
      { version: "elem-1", kind: "prism", sides: 3, h: 3, net: true },
      { version: "elem-1", kind: "prism", sides: 5, h: 3, net: true },
      { version: "elem-1", kind: "prism", sides: 6, h: 3, net: true },
      { version: "elem-1", kind: "prism", sides: 8, h: 3, net: true },
      { version: "elem-1", kind: "prism", sides: 5, h: 3 },
      { version: "elem-1", kind: "pyramid", sides: 6, h: 3 },
      { version: "elem-1", kind: "cuboid", w: 8, d: 2, h: 4 },
      { version: "elem-1", kind: "cylinder", r: 2, h: 3 },
      { version: "elem-1", kind: "cone", r: 4, h: 3 },
      { version: "elem-1", kind: "netCuboid", w: 7, d: 4, h: 5 },
      {
        version: "elem-1",
        kind: "netCylinder",
        r: 2,
        h: 5,
        pi: 3,
        layout: "opp",
      },
      {
        version: "elem-1",
        kind: "areaPoly",
        shape: "rhombus",
        base: 8,
        height: 4,
        d2: 4,
      },
      { version: "elem-1", kind: "fracPie", n: 8, filled: 3 },
      {
        version: "elem-1",
        kind: "pieChart",
        slices: [
          { label: "가", pct: 60 },
          { label: "나", pct: 40 },
        ],
      },
      { version: "elem-1", kind: "protractor", deg: 55 },
      { version: "elem-1", kind: "trapFour", filled: [0, 2] },
    ];

    it("각 전개도·겨냥도의 모든 점이 viewBox 안이다", async () => {
      const out: string[] = [];
      for (const spec of ALL) {
        const r = await renderFigureSpec(spec);
        expect(r.ok, `${spec.kind}`).toBe(true);
        if (!r.ok) return;
        const vb = r.svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
        expect(vb, `${spec.kind} viewBox`).toBeTruthy();
        const w = Number(vb![1]);
        const h = Number(vb![2]);
        for (const [x, y] of drawnPoints(r.svg)) {
          if (x < -0.01 || y < -0.01 || x > w + 0.01 || y > h + 0.01) {
            out.push(
              `${spec.kind}${spec.sides ?? ""}${spec.net ? "-전개도" : ""}: (${x}, ${y}) ∉ ${w}×${h}`,
            );
          }
        }
      }
      expect(out).toEqual([]);
    }, 60_000);

    it("표는 그래도 viewBox 240 을 넘지 않는다 — 맞춤이 이 불변식을 깨면 안 된다", async () => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "table",
        headers: ["×", "3", "4", "5", "6", "7", "8"],
        rows: [["4", "12", "16", "20", "24", "28", "32"]],
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(
        Number(r.svg.match(/viewBox="0 0 ([0-9.]+)/)![1]),
      ).toBeLessThanOrEqual(240);
    });
  },
);

describe.skipIf(!hasEngine)(
  "[초등 그림] 묻는 것을 그림이 답하지 않는다 (원장님 2026-08-22 ⑤)",
  () => {
    it("정삼각형 등변 tick 은 기본으로 그리지 않는다", async () => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "namedShapes",
        items: [{ shape: "eqTri", label: "가" }],
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.svg.match(/<line /g) ?? []).toHaveLength(0);
    });

    it("marks 를 켜면 등변 tick 셋이 나온다", async () => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "namedShapes",
        items: [{ shape: "eqTri", label: "가", marks: true }],
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.svg.match(/<line /g) ?? []).toHaveLength(3);
    });

    it("직각 기호도 같은 옵션으로 켜고 끈다", async () => {
      const off = await renderFigureSpec({
        version: "elem-1",
        kind: "namedShapes",
        items: [{ shape: "rightTri", label: "가" }],
      });
      const on = await renderFigureSpec({
        version: "elem-1",
        kind: "namedShapes",
        items: [{ shape: "rightTri", label: "가", marks: true }],
      });
      expect(off.ok && on.ok).toBe(true);
      if (!off.ok || !on.ok) return;
      expect(off.svg.match(/<polyline /g) ?? []).toHaveLength(0);
      expect(on.svg.match(/<polyline /g) ?? []).toHaveLength(1);
    });

    /**
     * 등변 tick 을 옵트인으로 돌리자 **세 세션이 같은 자리에서 막혔다** — g3 은 `rightTri` 를
     * 피해 점격자를 쓰고, g4 는 「가·나를 눈으로 가를 수 있나」를 물었고, g5 는 합동 풀에서
     * `eqTri` 를 뺐다(실측 3.93px). 표시가 사라지면 **도형 자체가 갈라야** 한다.
     *
     * 「이 중에서 고르시오」가 성립하려면 서로 다른 kind 의 윤곽이 눈에 띄게 달라야 한다.
     * 실측 바닥은 `para↔rect` 7.92px 이고 결함이던 `eqTri↔isoTri` 는 3.93px 이었다 —
     * 두 무리 사이가 훤히 비어 있어 6px 문턱은 그 틈에 놓인다.
     */
    it("서로 다른 도형은 표시 없이도 윤곽으로 갈린다", async () => {
      // 🔴 **훑을 목록을 손으로 적지 않는다.** 손 목록이면 ⑧ 에 도형을 더해도 이 검사가
      //    자동으로 안 늘어난다 — 09 §4-22 「손 목록은 샌다」. 엔진의 `_SHAPE_KINDS`
      //    (⑧ 이 실제로 받는 목록)를 소스에서 읽는다.
      //
      //    ⚠️ `_MARKED_KINDS`(② 목록)가 아니라 `_SHAPE_KINDS` 다. 정n각형은 ② 전용이고
      //       **윤곽으로 안 갈린다**(heptagon↔octagon 2.18px, 실측) — ⑧ 에 넣으면 안 된다.
      //       그 사실은 아래 「정n각형은 고르기 목록에 없다」가 따로 잠근다.
      const kinds = shapeKindsFromEngine();
      expect(kinds.length, "⑧ 도형 종류").toBeGreaterThanOrEqual(11);
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "namedShapes",
        items: kinds.map((shape) => ({ shape })),
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const outlines = shapeOutlines(r.svg);
      expect(outlines, "도형 하나에 윤곽 하나").toHaveLength(kinds.length);
      const close: string[] = [];
      let floor = Infinity;
      for (let i = 0; i < kinds.length; i++) {
        for (let j = i + 1; j < kinds.length; j++) {
          const d = hausdorff(outlines[i]!, outlines[j]!);
          floor = Math.min(floor, d);
          if (d < 6) close.push(`${kinds[i]} ↔ ${kinds[j]} ${d.toFixed(2)}px`);
        }
      }
      // 음성 대조군 겸 자가 검사 — 재는 자가 죽어 있으면 「0건」이 아무것도 증명하지
      // 않는다. 실측 바닥은 `para↔rect` 7.92px(눈으로는 갈리는 짝)이라 6~10px 사이여야
      // 「문턱이 멀쩡한 짝을 안 죽이면서 실제 px 를 읽고 있다」가 같이 잠긴다.
      expect(floor, "가장 닮은 짝을 재지 못했다").toBeGreaterThan(6);
      expect(floor, "재는 자가 실제 px 를 읽고 있지 않다").toBeLessThan(10);
      expect(close).toEqual([]);
    });

    /**
     * ⑧(고르기)에 정n각형을 넣으면 **문제가 성립하지 않는다.**
     * 실측(`measure-shape-distance.py --all`, 슬롯 44): 넣으면 7쌍이 문턱 아래로 떨어지고
     * 바닥이 7.92px → **2.18px**(`heptagon↔octagon`)이 된다. 기존 짝까지 좁아진다
     * (`diamond↔hexagon` 5.72px).
     *
     * 위 검사는 `_SHAPE_KINDS` 를 읽으므로 **누가 정n각형을 거기 넣으면 저절로 빨개진다.**
     * 이 검사는 그 이유를 **말로 남기는** 자리다 — 빨강만 보면 「문턱을 내리면 되잖아」가 된다.
     */
    it("정n각형은 ⑧ 고르기 목록에 **없다** — 윤곽으로 안 갈린다", () => {
      const kinds = shapeKindsFromEngine();
      for (const ngon of ["pentagon", "hexagon", "heptagon", "octagon"]) {
        expect(kinds, `${ngon} 은 ② 전용이다`).not.toContain(ngon);
      }
    });

    /**
     * elem-g5 가 짚은 **두 번째 축**. 위 검사(하우스도르프)는 그려진 자세에서 재므로
     * 「멀리 떨어져 보이지만 **돌리면 포개지는**」 짝을 구조적으로 못 본다. 합동 문항
     * (초5 `2-3-1`)은 그 짝이 생기면 **정답이 둘**이 되는데 거리 가드는 초록이다.
     * 하나가 다른 하나를 갈음하지 못한다 — 「없는 축은 변이시킬 수 없다」 그 자리다.
     */
    it("돌리거나 뒤집어도 포개지는 두 도형은 없다", async () => {
      const kinds = [
        "square",
        "rect",
        "rightTri",
        "isoTri",
        "wideTri",
        "eqTri",
        "diamond",
        "tallDiamond",
        "trap",
        "para",
        "irregQuad",
      ];
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "namedShapes",
        items: kinds.map((shape) => ({ shape })),
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const sigs = shapeCorners(r.svg).map(rigidSignature);
      expect(sigs).toHaveLength(kinds.length);

      // 음성 대조군 — `eqTri`(44·44·44)와 `square`(44·44·44·44)는 **변 길이 값이 같다.**
      // 변만 보면 같아 보이므로, 이 둘이 안 걸려야 「꼭짓점 수까지 본다」가 잠긴다.
      const tri = sigs[kinds.indexOf("eqTri")]!;
      const sq = sigs[kinds.indexOf("square")]!;
      expect(tri.sides[0]).toBeCloseTo(sq.sides[0]!, 1);
      expect(rigidlySame(tri, sq), "변 길이만 보고 같다고 하면 안 된다").toBe(
        false,
      );

      const same: string[] = [];
      for (let i = 0; i < kinds.length; i++) {
        for (let j = i + 1; j < kinds.length; j++) {
          if (rigidlySame(sigs[i]!, sigs[j]!))
            same.push(`${kinds[i]} ↔ ${kinds[j]}`);
        }
      }
      expect(same).toEqual([]);
    });

    it("도형 항목의 오타 키는 조용히 무시되지 않는다", async () => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "namedShapes",
        items: [{ shape: "eqTri", label: "가", mark: true }],
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toMatch(/허용|키/);
    });
  },
);

/* ── 그래프 세로축 ───────────────────────────────────────────────────────────
 * 「눈금이 231줄」과 「제일 높은 점이 맨 위 눈금선 위로 떴다」는 **한 뿌리**다 —
 * `yMax` 는 TS 가 정하고 걸음은 파이썬이 정하는데, 서로 상대가 무엇을 할지 모른다.
 * 아래 검사는 전부 **그려진 SVG 의 눈금 글자와 도형 좌표**만 본다. 파이썬 상수를
 * 읽지 않는다 — 참이 제품에서 오면 제품이 틀릴수록 좋은 점수가 나온다.
 * (09 §4-23)
 */
const NICE_STEPS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
];
const TICK_CAP = 9;

/** 세로 눈금 글자 — 14pt·오른쪽 정렬. 단위(13pt)·막대 숫자(16pt·가운데)와 갈린다. */
function yTicks(svg: string): { v: number; y: number }[] {
  return svgLabels(svg)
    .filter(
      (l) =>
        l.fontSize === 14 && l.anchor === "end" && /^-?[0-9.]+$/.test(l.text),
    )
    .map((l) => ({ v: Number(l.text), y: l.y }))
    .sort((a, b) => a.v - b.v);
}

/** 그려진 데이터의 «맨 위» — 막대는 rect 의 윗변, 꺾은선은 점의 중심. */
function dataTopY(svg: string): number {
  const rects = [...svg.matchAll(/<rect x="[0-9.]+" y="([0-9.]+)"/g)].map((m) =>
    Number(m[1]),
  );
  const dots = [
    ...svg.matchAll(/<circle cx="[0-9.]+" cy="([0-9.]+)" r="2.4"/g),
  ].map((m) => Number(m[1]));
  return Math.min(...[...rects, ...dots]);
}

/**
 * 그려진 마크의 y — 막대는 rect 윗변, 꺾은선은 점 중심. **스펙에 준 순서 그대로**다.
 * `dataTopY` 와 달리 «제일 위» 하나가 아니라 전부 돌려준다.
 */
function markYs(svg: string): number[] {
  const rects = [...svg.matchAll(/<rect x="[0-9.]+" y="([0-9.]+)"/g)].map((m) =>
    Number(m[1]),
  );
  const dots = [
    ...svg.matchAll(/<circle cx="[0-9.]+" cy="([0-9.]+)" r="2.4"/g),
  ].map((m) => Number(m[1]));
  return rects.length ? rects : dots;
}

/**
 * **눈금이 말하는 자리**에 그 값이 있는가 — 눈금 둘로 선형보간해 y 를 구한다.
 *
 * ⚠️ 이것이 「데이터가 맨 위 눈금선보다 아래인가」를 **대신**한다. 그 검사로는
 * 「눈금은 새 축, 막대는 옛 `yMax`」인 배선을 **못 잡는다** — 축을 올리면 맨 위
 * 눈금 아래로 여유가 생기고, 그 여유 안에서는 틀린 자로 그려도 여전히 «아래»다.
 * 실측(변이 ㉕, `yMax 19` · 값 16): 막대 윗변 54.63 · 맨 위 눈금 36 → 옛 검사 통과.
 * 그런데 눈금이 말하는 자리는 59.60 이라 **5.0px 어긋나 있었다**(막대가 16이 아니라
 * 16.8쯤을 가리킨다). 변이 시험이 이 문장을 반증해서 알았다 (09 §4-23).
 */
function scaleMismatch(svg: string, values: number[]): number {
  const ticks = yTicks(svg);
  const [lo, hi] = [ticks[0]!, ticks[ticks.length - 1]!];
  const marks = markYs(svg);
  let worst = 0;
  for (const [i, v] of values.entries()) {
    const want = lo.y + ((v - lo.v) * (hi.y - lo.y)) / (hi.v - lo.v);
    worst = Math.max(worst, Math.abs(want - marks[i]!));
  }
  return worst;
}

/**
 * 가로형의 값 눈금 — 아래로 누웠으므로 **가운데 정렬**이고 x 를 읽는다.
 * 제목도 14pt·가운데라 **숫자인 것만** 고른다(제목은 숫자가 아니다).
 */
function xTicks(svg: string): { v: number; x: number }[] {
  return svgLabels(svg)
    .filter(
      (l) =>
        l.fontSize === 14 &&
        l.anchor === "middle" &&
        /^-?[0-9.]+$/.test(l.text),
    )
    .map((l) => ({ v: Number(l.text), x: l.x }))
    .sort((a, b) => a.v - b.v);
}

/** 가로 막대의 오른쪽 끝 x — 스펙에 준 순서 그대로. */
function barRightXs(svg: string): number[] {
  return [
    ...svg.matchAll(/<rect x="([0-9.]+)" y="[0-9.]+" width="([0-9.]+)"/g),
  ].map((m) => Number(m[1]) + Number(m[2]));
}

/**
 * 가로형 픽셀 결합 — 막대 끝이 **눈금이 말하는 x** 에 있는가.
 * 세로형 `scaleMismatch` 와 같은 질문이고 축만 눕는다.
 */
function scaleMismatchX(svg: string, values: number[]): number {
  const ticks = xTicks(svg);
  const [lo, hi] = [ticks[0]!, ticks[ticks.length - 1]!];
  const ends = barRightXs(svg);
  let worst = 0;
  for (const [i, v] of values.entries()) {
    const want = lo.x + ((v - lo.v) * (hi.x - lo.x)) / (hi.v - lo.v);
    worst = Math.max(worst, Math.abs(want - ends[i]!));
  }
  return worst;
}

/** 눈금 간격 — 고르지 않으면 그 자체가 결함이라 «서로 다른 간격»을 다 돌려준다. */
function tickGaps(svg: string): number[] {
  const vs = yTicks(svg).map((t) => t.v);
  return [...new Set(vs.slice(1).map((v, i) => v - vs[i]!))];
}

function chartSpec(
  kind: "barChart" | "lineChart",
  yMax: number,
  values: number[],
  yStep?: number,
) {
  return {
    version: "elem-1",
    kind,
    values: values.map((v, i) => ({ label: `${i + 1}월`, value: v })),
    yMax,
    ...(yStep === undefined ? {} : { yStep }),
    yLabel: "명",
  };
}

/** 「지금 잘 나오는 장」의 눈금 — 고치기 **전에** 실제로 그려 본 값을 그대로 못 박는다. */
const KEEP_AS_IS: [number, number[], number[]][] = [
  [8, [3, 7, 5, 6], [0, 1, 2, 3, 4, 5, 6, 7, 8]],
  [11, [4, 10, 7, 9], [0, 2, 4, 6, 8, 10]],
  [12, [5, 12, 8, 9], [0, 2, 4, 6, 8, 10, 12]],
  [15, [9, 12, 10, 11], [0, 5, 10, 15]],
  [37, [30, 34, 31, 33], [0, 5, 10, 15, 20, 25, 30, 35]],
  [41, [33, 38, 35, 36], [0, 5, 10, 15, 20, 25, 30, 35, 40]],
  [43, [34, 40, 37, 38], [0, 5, 10, 15, 20, 25, 30, 35, 40]],
];

describe.skipIf(!hasEngine)(
  "[초등 그림] 그래프 세로축 (원장님 2026-08-22)",
  () => {
    it.each(KEEP_AS_IS)(
      "yMax %i — 지금 맞게 나오는 장은 눈금이 한 줄도 안 바뀐다",
      async (yMax, values, ticks) => {
        for (const kind of ["barChart", "lineChart"] as const) {
          const r = await renderFigureSpec(chartSpec(kind, yMax, values));
          expect(r.ok).toBe(true);
          if (!r.ok) return;
          expect(yTicks(r.svg).map((t) => t.v)).toEqual(ticks);
        }
      },
    );

    // 사다리를 못 올라가면 `yMax` 가 커질수록 눈금이 무한정 늘어난다 —
    // 실측으로 「박물관 관람객」 소재에서 231줄이 나왔다.
    it.each([45, 60, 63, 150, 400, 1153, 1600, 9999])(
      "yMax %i — 눈금은 아홉 줄을 넘지 않는다",
      async (yMax) => {
        const r = await renderFigureSpec(
          chartSpec("lineChart", yMax, [
            Math.round(yMax * 0.4),
            yMax - 3,
            Math.round(yMax * 0.6),
          ]),
        );
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const ticks = yTicks(r.svg);
        expect(ticks.length).toBeGreaterThanOrEqual(2);
        expect(ticks.length).toBeLessThanOrEqual(TICK_CAP);
      },
    );

    it("눈금 한 칸은 1·2·5 를 열 배씩 한 것뿐이다 — 3칸·7칸은 암산이 안 된다", async () => {
      for (const yMax of [8, 12, 19, 41, 45, 63, 150, 400, 1153, 9999]) {
        const r = await renderFigureSpec(
          chartSpec("lineChart", yMax, [1, yMax - 3, 2]),
        );
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const vs = yTicks(r.svg).map((t) => t.v);
        const gaps = new Set(vs.slice(1).map((v, i) => v - vs[i]!));
        expect([...gaps]).toHaveLength(1);
        expect(NICE_STEPS).toContain([...gaps][0]);
      }
    });

    // ⚠️ 이것이 이 묶음의 핵심이다. 「몇 줄인가」만 재면 **눈금이 데이터보다 낮은 장**은
    //    구조적으로 안 보인다 — 실측 2,400장 중 214장이 그랬고, 하필 그 점이
    //    「가장 많은 때는 언제인가」의 답이다.
    it.each([
      [13, [12, 5, 9]],
      [19, [16, 7, 12]],
      [24, [21, 9, 15]],
      [39, [36, 20, 28]],
      [44, [44, 20, 30]],
      [49, [46, 21, 33]],
      [59, [56, 25, 40]],
    ])("yMax %i — 제일 높은 값 위에 눈금선이 있다", async (yMax, values) => {
      for (const kind of ["barChart", "lineChart"] as const) {
        const r = await renderFigureSpec(
          chartSpec(kind, yMax, values as number[]),
        );
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const ticks = yTicks(r.svg);
        const top = ticks[ticks.length - 1]!;
        // ⑴ 값으로 — 맨 위 눈금 값이 데이터 최댓값 이상
        expect(top.v).toBeGreaterThanOrEqual(Math.max(...(values as number[])));
        // ⑵ 픽셀로 — 그려진 것 중 제일 위가 맨 위 눈금선보다 아래(y 가 큼)
        expect(dataTopY(r.svg)).toBeGreaterThanOrEqual(top.y - 0.5);
        // ⑶ **눈금이 말하는 자리에 있는가.** ⑴·⑵ 로는 「눈금은 새 축, 막대는 옛 yMax」
        //    배선을 못 잡는다 — 축을 올리면 생기는 여유 안에 숨는다(변이 ㉕·㉖).
        expect(scaleMismatch(r.svg, values as number[])).toBeLessThan(0.5);
      }
    });

    // 이 셋은 **축이 올라가는** 장이다 — 여유가 커서 ⑵ 가 가장 무력해지는 자리다.
    it.each([
      ["barChart", 19, [16, 7, 12]],
      ["lineChart", 49, [46, 21, 33]],
      ["barChart", 44, [44, 20, 30]],
      ["lineChart", 1153, [1150, 400, 880]],
    ] as ["barChart" | "lineChart", number, number[]][])(
      "%s yMax %i — 막대·점은 **눈금이 말하는 자리**에 그려진다 (눈금과 같은 자)",
      async (kind, yMax, values) => {
        const r = await renderFigureSpec(chartSpec(kind, yMax, values));
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(markYs(r.svg)).toHaveLength(values.length);
        expect(scaleMismatch(r.svg, values)).toBeLessThan(0.5);
      },
    );

    /* ── yStep — 「눈금 한 칸은 몇」 (D-70) ───────────────────────────────────
     * 발문이 걸음을 말하는 유형이라, 파이썬이 걸음을 **다시 고르면 발문이 그림과 다른
     * 말을 한다.** D-67 이 이 유형을 통째로 뺐던 이유가 그것이었다.
     *
     * ⚠️ 여기 쓰는 `yStep 3` 은 **사다리(1·2·5×10ⁿ)에 없는 수**다. 기본값 계산은
     * 3을 절대 못 고르므로, 간격이 3으로 나오면 **스펙 값이 실제로 쓰였다는 증거**가
     * 된다 — 「우연히 같은 값」으로는 통과할 수 없다.
     */
    it.each([
      ["barChart", 15, [14, 6, 9], 3, 3],
      ["lineChart", 15, [14, 6, 9], 3, 3],
      ["barChart", 41, [38, 20, 30], 5, 5],
      ["lineChart", 63, [60, 30, 40], 10, 10],
      // 축이 올라가는 자리 — 걸음은 그대로 두고 **눈금 수만** 는다 (19 → 20)
      ["barChart", 19, [16, 7, 12], 5, 5],
      ["lineChart", 49, [46, 21, 33], 10, 10],
    ] as ["barChart" | "lineChart", number, number[], number, number][])(
      "%s yMax %i yStep %i — 스펙이 실어 온 걸음 그대로 긋는다",
      async (kind, yMax, values, yStep, want) => {
        const r = await renderFigureSpec(chartSpec(kind, yMax, values, yStep));
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(tickGaps(r.svg)).toEqual([want]);
        // 걸음만 맞고 데이터가 딴 자로 그려지면 발문은 여전히 거짓말이 된다.
        expect(scaleMismatch(r.svg, values)).toBeLessThan(0.5);
        const ticks = yTicks(r.svg);
        expect(ticks[ticks.length - 1]!.v).toBeGreaterThanOrEqual(
          Math.max(...values),
        );
        expect(ticks.length).toBeLessThanOrEqual(TICK_CAP);
      },
    );

    it("yStep 은 기본값을 **이긴다** — 같은 스펙에서 뺐다 넣으면 간격이 달라진다", async () => {
      const off = await renderFigureSpec(chartSpec("barChart", 15, [14, 6, 9]));
      const on = await renderFigureSpec(
        chartSpec("barChart", 15, [14, 6, 9], 3),
      );
      expect(off.ok && on.ok).toBe(true);
      if (!off.ok || !on.ok) return;
      expect(tickGaps(off.svg)).toEqual([5]); // 기본값(사다리)
      expect(tickGaps(on.svg)).toEqual([3]); // 스펙 값
    });

    it("yStep 을 안 주면 지금 지면이 **한 픽셀도 안 바뀐다**", async () => {
      // 전수(2,400장)는 `scripts/qa/measure-elem-charts.py` 가 본다. 여기서는
      // 「yStep 필드를 넣은 것만으로 없던 장이 달라지지 않는가」를 못 박는다.
      for (const [yMax, values, ticks] of KEEP_AS_IS) {
        const r = await renderFigureSpec(chartSpec("barChart", yMax, values));
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(yTicks(r.svg).map((t) => t.v)).toEqual(ticks);
      }
    });

    // 조용히 다른 걸음으로 그리면 「한 칸 5명」 발문 옆에 10명 간격이 나간다 —
    // 에러도 안 나고 학생만 틀린다. **방어는 침묵이 아니라 던짐이다.**
    it.each([
      [41, [38, 20, 30], 1, /눈금이 .*줄/],
      [19, [16, 7, 12], 2, /눈금이 .*줄/],
      [8, [7, 3, 5], 100, /yMax/],
    ] as [number, number[], number, RegExp][])(
      "yMax %i 에 yStep %i — 그 걸음으로 못 그리면 **던진다**",
      async (yMax, values, yStep, why) => {
        const r = await renderFigureSpec(
          chartSpec("barChart", yMax, values, yStep),
        );
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.error).toMatch(why);
      },
    );

    it.each([
      ["소문자 오타", { ystep: 1 }, /허용|키/],
      ["0", { yStep: 0 }, /1 이상/],
      ["정수 아님", { yStep: 2.5 }, /정수/],
    ] as [string, Record<string, number>, RegExp][])(
      "yStep %s 은 조용히 무시되지 않는다",
      async (_why, extra, want) => {
        const r = await renderFigureSpec({
          ...chartSpec("barChart", 8, [7, 3, 5]),
          ...extra,
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.error).toMatch(want);
      },
    );

    /* ── 가로 막대 (orient) ──────────────────────────────────────────────────
     * 값 축이 아래로 눕을 뿐, **축 규칙은 한 벌**이다. 방향마다 규칙이 갈리면
     * 한쪽만 고쳐진다(2026-08-18). 그래서 눈금 «값»은 두 방향이 같아야 한다.
     */
    const ICE = [30, 40, 20, 35];

    it("가로형은 값 축이 아래로 눕는다 — 막대 끝이 **눈금이 말하는 x** 에 있다", async () => {
      const r = await renderFigureSpec({
        ...chartSpec("barChart", 45, ICE, 20),
        orient: "horizontal",
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(xTicks(r.svg).map((t) => t.v)).toEqual([0, 20, 40]);
      expect(barRightXs(r.svg)).toHaveLength(ICE.length);
      // 세로 눈금(오른쪽 정렬 14pt)은 하나도 없어야 한다 — 축이 누웠으므로.
      expect(yTicks(r.svg)).toHaveLength(0);
      expect(scaleMismatchX(r.svg, ICE)).toBeLessThan(0.5);
    });

    // ⚠️ 여기 값은 **가로형이 실제로 그릴 수 있는 것**이어야 한다. 값 눈금이 옆으로
    // 늘어서는 가로형은 숫자가 겹치면 던지므로, 촘촘한 조합(yMax 41·yStep 5 = 9눈금,
    // yMax 1153 = 네 자리 7눈금)은 아래 「겹칠 수밖에 없는 눈금 수」 시험의 몫이다.
    it("축 규칙은 **방향과 무관하게 한 벌**이다 — 눈금 값이 두 방향에서 같다", async () => {
      for (const [yMax, values, yStep] of [
        [45, ICE, 20],
        [40, [40, 20, 30], 10],
        [800, [800, 500, 600], 200],
        [19, [16, 7, 12], undefined],
      ] as [number, number[], number | undefined][]) {
        const v = await renderFigureSpec(
          chartSpec("barChart", yMax, values, yStep),
        );
        const h = await renderFigureSpec({
          ...chartSpec("barChart", yMax, values, yStep),
          orient: "horizontal",
        });
        expect(v.ok && h.ok).toBe(true);
        if (!v.ok || !h.ok) return;
        expect(xTicks(h.svg).map((t) => t.v)).toEqual(
          yTicks(v.svg).map((t) => t.v),
        );
      }
    });

    /* ── 글자가 겹치지 않는다 (가로형) ─────────────────────────────────────────
     * 값 눈금이 **옆으로 늘어서는** 것은 가로형뿐이라 여기만 겹칠 수 있다.
     * 세로형은 눈금이 위아래로 쌓이고 `MAX_Y_TICKS`(9)가 줄 수를 막는다.
     *
     * ⚠️ 글자 폭은 **실측 리터럴**이다 — 파이썬에도 여기에도 글꼴 계측이 없다.
     * 지면과 같은 렌더러(헤드리스 Chromium)의 `getComputedTextLength()` 로 쟀다:
     *   14pt Batang bold 숫자 `0`8.62 · `20`17.21 · `500`25.83 · `1000`34.42
     *   → 숫자는 고정폭이라 **8.605/자**. 글꼴을 바꾸면 다시 재야 한다.
     */
    const TICK_DIGIT_W = 8.605;

    it("가로형 값 눈금 숫자는 **서로 겹치지 않는다**", async () => {
      for (const [yMax, yStep, values] of [
        [40, 10, [40, 20, 30]],
        [800, 200, [800, 500, 600]],
        [1200, 400, [1200, 400, 800]],
        [25, 5, [25, 10, 15]],
      ] as [number, number, number[]][]) {
        const r = await renderFigureSpec({
          ...chartSpec("barChart", yMax, values, yStep),
          orient: "horizontal",
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const ticks = xTicks(r.svg);
        for (let i = 1; i < ticks.length; i++) {
          const gap =
            ticks[i]!.x -
            ticks[i - 1]!.x -
            (TICK_DIGIT_W * String(ticks[i]!.v).length) / 2 -
            (TICK_DIGIT_W * String(ticks[i - 1]!.v).length) / 2;
          expect(
            gap,
            `«${ticks[i - 1]!.v}»와 «${ticks[i]!.v}» 사이`,
          ).toBeGreaterThan(0);
        }
      }
    });

    // 커밋 7d3edc42 에 있던 결함: 마지막 눈금은 축 끝에 **가운데** 정렬이라 오른쪽으로
    // 절반을 더 뻗는데 단위를 축 끝 +6 에 놓아 겹쳤다(2자리 −2.60 · 3자리 −6.91).
    // `yStep` 을 실으면 맨 위 눈금이 축 끝에 딱 떨어져 **거의 항상** 걸렸다.
    it("가로형 단위 라벨은 마지막 눈금 숫자와 겹치지 않고, 잘리지도 않는다", async () => {
      for (const [yMax, yStep, values, unit] of [
        [40, 10, [40, 20, 30], "(개)"],
        [800, 200, [800, 500, 600], "(원)"],
        [1200, 400, [1200, 400, 800], "(원)"],
      ] as [number, number, number[], string][]) {
        const r = await renderFigureSpec({
          ...chartSpec("barChart", yMax, values, yStep),
          orient: "horizontal",
          yLabel: unit,
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const ticks = xTicks(r.svg);
        const last = ticks[ticks.length - 1]!;
        const lastRight = last.x + (TICK_DIGIT_W * String(last.v).length) / 2;
        const unitX = Number(
          r.svg.match(
            /<text x="([0-9.]+)" y="[0-9.]+"[^>]*font-size="13"[^>]*text-anchor="start"/,
          )![1],
        );
        expect(
          unitX,
          `«${last.v}» 오른쪽 끝 ${lastRight}`,
        ).toBeGreaterThanOrEqual(lastRight);
        // 잘림 — 단위가 viewBox 밖으로 나가면 닫는 괄호가 사라진다(실측 3자리 2.4단위).
        // 폭은 **실측값**이다(「(개)」·「(원)」 둘 다 13pt 에서 23.54). 어림 상한을 쓰면
        // 렌더러의 상한과 어긋나 거짓 빨강이 난다 — 실제로 한 번 그렇게 났다.
        const UNIT_W: Record<string, number> = { "(개)": 23.54, "(원)": 23.54 };
        const vbWidth = Number(r.svg.match(/viewBox="0 0 ([0-9.]+)/)![1]);
        expect(unitX + UNIT_W[unit]!).toBeLessThanOrEqual(vbWidth);
      }
    });

    it("겹칠 수밖에 없는 눈금 수는 **던진다** — 조용히 뭉개 그리지 않는다", async () => {
      // 값 축 140단위에 9개는 못 그린다. 예전에는 「0100200300…」 덩어리로 나갔다.
      for (const [yMax, yStep] of [
        [40, 5],
        [800, 100],
      ] as [number, number][]) {
        const r = await renderFigureSpec({
          ...chartSpec("barChart", yMax, [yMax, yMax / 2], yStep),
          orient: "horizontal",
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.error).toMatch(/겹칩니다/);
      }
    });

    it("가로형도 못 그리는 yStep 은 던진다 — 방향이 규칙을 비켜 가지 않는다", async () => {
      const r = await renderFigureSpec({
        ...chartSpec("barChart", 41, [38, 20, 30], 1),
        orient: "horizontal",
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toMatch(/눈금이 .*줄/);
    });

    it("orient 를 안 주면 세로형이고, 모르는 값은 조용히 무시되지 않는다", async () => {
      const plain = await renderFigureSpec(chartSpec("barChart", 45, ICE, 20));
      const explicit = await renderFigureSpec({
        ...chartSpec("barChart", 45, ICE, 20),
        orient: "vertical",
      });
      expect(plain.ok && explicit.ok).toBe(true);
      if (!plain.ok || !explicit.ok) return;
      expect(explicit.svg).toBe(plain.svg); // 기본값을 적어 내도 지면이 같다
      const bad = await renderFigureSpec({
        ...chartSpec("barChart", 45, ICE, 20),
        orient: "가로",
      });
      expect(bad.ok).toBe(false);
      if (bad.ok) return;
      expect(bad.error).toMatch(/orient/);
    });

    // 제목과 단위 라벨이 같은 줄에 앉으면 긴 제목에서 겹친다 — 실측으로 둘 사이가
    // 30px 뿐이었다. 제목이 **없을 때는** 지면이 한 픽셀도 안 바뀌어야 한다.
    it("제목은 단위 라벨과 **다른 줄**에 앉고, 없으면 지면이 안 바뀐다", async () => {
      // 제목 폭 가드가 막지 않는 길이여야 한다(세로형 plot 186단위 · 실측 156.6).
      const TITLE = "아이스크림 한 개의 가격";
      const none = await renderFigureSpec(chartSpec("barChart", 45, ICE, 20));
      const titled = await renderFigureSpec({
        ...chartSpec("barChart", 45, ICE, 20),
        title: TITLE,
      });
      expect(none.ok && titled.ok).toBe(true);
      if (!none.ok || !titled.ok) return;

      expect(none.svg).not.toContain(TITLE);
      // 제목 없는 장은 KEEP_AS_IS 와 같은 눈금 — 제목 필드를 더한 것만으로 안 바뀐다.
      expect(yTicks(none.svg).map((t) => t.v)).toEqual([0, 20, 40]);

      const titleY = Number(
        titled.svg.match(
          new RegExp(`<text x="[0-9.]+" y="([0-9.]+)"[^>]*>${TITLE}<`),
        )![1],
      );
      // 단위 라벨 — 13pt·오른쪽 정렬
      const unitY = Number(
        titled.svg.match(
          /<text x="[0-9.]+" y="([0-9.]+)"[^>]*font-size="13"[^>]*text-anchor="end"/,
        )![1],
      );
      expect(Math.abs(titleY - unitY)).toBeGreaterThanOrEqual(14);
    });

    it("막대와 꺾은선은 **같은 자**를 쓴다 — 한쪽만 배선하면 그쪽 지표만 좋아진다", async () => {
      for (const [yMax, values] of [
        [19, [16, 7, 12]],
        [49, [46, 21, 33]],
        [1153, [1150, 400, 800]],
      ] as [number, number[]][]) {
        const bar = await renderFigureSpec(chartSpec("barChart", yMax, values));
        const line = await renderFigureSpec(
          chartSpec("lineChart", yMax, values),
        );
        expect(bar.ok && line.ok).toBe(true);
        if (!bar.ok || !line.ok) return;
        expect(yTicks(bar.svg).map((t) => t.v)).toEqual(
          yTicks(line.svg).map((t) => t.v),
        );
      }
    });
  },
);

/* ── 그래프 짝 (chartPair, D-70 계열 · 원장님 확정 2026-08-23) ─────────────── */
const PAIR_SOLD = {
  kind: "barChart",
  orient: "horizontal",
  title: "팔린 수",
  yMax: 40,
  yStep: 10,
  yLabel: "(개)",
  values: [
    { label: "딸기", value: 10 },
    { label: "멜론", value: 40 },
    { label: "초코", value: 20 },
    { label: "바닐라", value: 30 },
  ],
};
const PAIR_PRICE = {
  kind: "barChart",
  title: "한 개의 가격",
  yMax: 800,
  yStep: 100,
  yLabel: "(원)",
  values: [
    { label: "딸기", value: 500 },
    { label: "멜론", value: 800 },
    { label: "초코", value: 600 },
    { label: "바닐라", value: 700 },
  ],
};
const pairSpec = (a: unknown = PAIR_SOLD, b: unknown = PAIR_PRICE) => ({
  version: "elem-1",
  kind: "chartPair",
  charts: [a, b],
});

describe.skipIf(!hasEngine)("[초등 그림] 그래프 짝 (chartPair)", () => {
  it("두 그래프를 나란히 그리고, 눈금 글자가 본문보다 크다", async () => {
    const r = await renderFigureSpec(pairSpec());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const width = Number(r.svg.match(/viewBox="0 0 ([0-9.]+)/)![1]);
    // 파이썬이 판정에 쓰는 폭과 **같은 상수**로 다시 잰다 — 두 파일이 갈리면 아래
    // 「한 숫자를 쓴다」 시험이 빨개진다.
    expect((14 * FIGURE_SVG_PAIR_MAX_PX) / width).toBeGreaterThanOrEqual(12.5);
    expect(figureSvgSize(r.svg)).toBe("pair");
    // 두 그래프가 다 들어 있다
    expect(r.svg).toContain("팔린 수");
    expect(r.svg).toContain("한 개의 가격");
    // 합성은 좌표를 옮겨서 한다 — 그림 잉크에 `transform` 이 없어야 한다.
    // ⚠️ 조판된 라벨은 **제 자리로 옮기는 transform 을 쓴다**(그게 조판의 방식이다).
    //    그러니 걷어내고 본다 — 안 걷어내면 이 검사는 늘 빨갛고, 늘 우는 가드는 꺼진다.
    expect(stripLabels(r.svg)).not.toContain("transform");
  });

  it("**한 숫자를 두 곳이 쓴다** — 파이썬 판정 폭과 화면 폭 등급이 같다", () => {
    // 파이썬이 「눈금 글자가 본문 이상인가」를 PAIR_FRAME_PX 로 판정하고, 실제로
    // 그려지는 폭은 figureSvgFrame 이 정한다. 한쪽만 고치면 **가드가 통과시킨 그림이
    // 지면에서 작아진다** — 그래서 파일을 직접 읽어 대조한다.
    const py = readFileSync(
      path.join(process.cwd(), "scripts", "figure", "elem_advanced.py"),
      "utf8",
    );
    expect(py).toMatch(
      new RegExp(`PAIR_FRAME_PX = ${FIGURE_SVG_PAIR_MAX_PX}\\.0`),
    );
    expect(py).toMatch(new RegExp(`PAIR_FRAME_MM = ${FIGURE_SVG_PAIR_MM}\\.0`));
    // 프레임 클래스도 같은 수여야 한다(문자열이라 따로 샌다).
    // ⚠️ 등급은 이제 **폭이 아니라 표식**으로 정한다(2026-08-23) — 종전에는 여기에
    //    `viewBox 405` 를 넣었는데, 그 폭이 380 을 넘는 짝만 걸려서 **실제 짝 53장 중
    //    17장(32%)이 mid 로 떨어지고 있었다.** 폭을 넣으면 그 결함이 되살아난다.
    const pairSvg = '<svg viewBox="0 0 405 206"><desc>chartPair</desc>';
    // 폭은 **화면·인쇄가 같은 mm** 다(2026-09-20) — 화면 전용 px 값은 없앴다.
    // `FIGURE_SVG_PAIR_MAX_PX`(364px) 는 파이썬 `PAIR_FRAME_PX` 와 맞추는 값으로 남는다.
    expect(figureSvgFrameClass(pairSvg)).toContain(
      `max-w-[${FIGURE_SVG_PAIR_MM}mm]`,
    );
    // 🔴 파이썬이 「눈금 글자가 본문 이상인가」를 판정하는 폭(364px)보다 **실제로
    //    그려지는 폭(97mm = 366.61px)이 작으면 안 된다** — 작으면 가드가 통과시킨
    //    그림이 지면에서 작아진다(2026-08-23 이 파일이 겪은 바로 그 결함).
    //    두 수는 1% 안이고, 그려지는 쪽이 넉넉한 방향이라야 한다.
    const drawn = mmToCssPx(FIGURE_SVG_PAIR_MM);
    expect(drawn).toBeGreaterThanOrEqual(FIGURE_SVG_PAIR_MAX_PX);
    expect(drawn / FIGURE_SVG_PAIR_MAX_PX).toBeLessThan(1.01);
  });

  it("짝 등급 띠는 **오늘 비어 있다** — 짝 말고는 폭이 안 바뀐다", async () => {
    // 380 을 넘는 그림이 이미 있으면 그 그림의 지면 폭이 조용히 바뀐다.
    const wide: string[] = [];
    for (const spec of [
      { version: "elem-1", kind: "pills", items: ["아침", "점심", "저녁"] },
      {
        version: "elem-1",
        kind: "opTree",
        start: "725",
        ops: ["-513", "+679"],
      },
      { version: "elem-1", kind: "cuboid", w: 8, d: 2, h: 4 },
      chartSpec("barChart", 45, [30, 40, 20, 35], 20),
      chartSpec("lineChart", 1153, [1150, 400, 880]),
    ]) {
      const r = await renderFigureSpec(spec);
      if (!r.ok) continue;
      if (figureSvgSize(r.svg) === "pair") wide.push(String(spec.kind));
    }
    expect(wide).toEqual([]);
  });

  it("안쪽 스펙은 단독 barChart 와 **같은 검증**을 탄다", async () => {
    const typo = await renderFigureSpec(
      pairSpec({ ...PAIR_SOLD, ystep: 10 }, PAIR_PRICE),
    );
    expect(typo.ok).toBe(false);
    if (typo.ok) return;
    expect(typo.error).toMatch(/허용|키/);
  });

  it("안쪽이 던지면 **그대로 올라온다** — 삼키고 한쪽만 그리지 않는다", async () => {
    // ⚠️ 겹침 가드로는 이걸 못 본다 — 짝은 축을 «내용에 맞춰» 넓히므로 눈금이 겹치는
    // 대신 폭이 늘고, 그러면 짝의 px 가드가 먼저 잡는다. 축 자체가 못 서는 것을 써야
    // **안쪽 예외가 전파되는지**를 본다(걸음 1로는 눈금이 42줄).
    const r = await renderFigureSpec(
      pairSpec({ ...PAIR_SOLD, yMax: 40, yStep: 1 }, PAIR_PRICE),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/눈금이 .*줄/);
  });

  it("제목이 제 그래프보다 넓으면 던진다 — 긴 정보는 발문 몫", async () => {
    const r = await renderFigureSpec(
      pairSpec(
        { ...PAIR_SOLD, title: "종류별 팔린 아이스크림의 수" },
        PAIR_PRICE,
      ),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/제목/);
  });

  it("짝이 너무 넓어 눈금 글자가 본문 아래로 내려가면 던진다", async () => {
    // 항목 라벨이 길면 폭이 늘어난다 — 값이 아니라 **글자**가 폭을 정한다.
    const long = {
      ...PAIR_PRICE,
      values: PAIR_PRICE.values.map((v) => ({
        ...v,
        label: `${v.label}맛아이스크림`,
      })),
    };
    const r = await renderFigureSpec(pairSpec(PAIR_SOLD, long));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/본문|px/);
  });

  it("charts 는 정확히 둘이어야 한다", async () => {
    for (const charts of [
      [PAIR_SOLD],
      [PAIR_SOLD, PAIR_PRICE, PAIR_SOLD],
      [],
    ]) {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "chartPair",
        charts,
      });
      expect(r.ok).toBe(false);
    }
  });
});

/* ── 지워진 막대(unknown)와 값 0 (D-72 자료형 심화) ─────────────────────────── */
const UNKNOWN_DASH = "4 3";
/** 점선 상자 = fill 없는 rect. 값 막대(색 채움)와 갈린다. */
function dashedBoxes(svg: string): string[] {
  return [...svg.matchAll(/<rect [^>]*>/g)]
    .map((m) => m[0])
    .filter((r) => r.includes(`stroke-dasharray="${UNKNOWN_DASH}"`));
}

describe.skipIf(!hasEngine)("[초등 그림] 지워진 막대 · 값 0", () => {
  const withUnknown = (orient?: string, values?: unknown[]) => ({
    version: "elem-1",
    kind: "barChart",
    ...(orient ? { orient } : {}),
    yMax: 30,
    yStep: 5,
    yLabel: "(명)",
    values: values ?? [
      { label: "가", value: 25 },
      { label: "나", unknown: true },
      { label: "다", value: 10 },
      { label: "라", value: 20 },
    ],
  });

  it.each(["vertical", "horizontal"])(
    "%s — 지워진 막대는 점선 상자 + ? 로 그린다",
    async (orient) => {
      const r = await renderFigureSpec(
        withUnknown(orient === "horizontal" ? "horizontal" : undefined),
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(dashedBoxes(r.svg)).toHaveLength(1);
      const box = dashedBoxes(r.svg)[0]!;
      expect(box).toContain('fill="none"');
      expect(labelTexts(r.svg)).toContain("?");

      // ⚠️ **상자는 값 축 «전체»를 덮어야 한다.** 절반이면 「이 정도 값」으로 읽혀
      //    그림이 없는 답을 암시한다. 「기하가 서로 같다」만 잠그면 둘 다 똑같이
      //    틀린 높이여도 초록이라, 축에 대고 **자리까지** 재야 한다.
      const at = (a: string) =>
        Number(box.match(new RegExp(`${a}="([0-9.]+)"`))![1]);
      if (orient === "horizontal") {
        const xs = xTicks(r.svg);
        expect(at("x")).toBeCloseTo(xs[0]!.x, 1);
        expect(at("x") + at("width")).toBeCloseTo(xs[xs.length - 1]!.x, 1);
      } else {
        const ys = yTicks(r.svg);
        const top = Math.min(...ys.map((t) => t.y));
        const zero = Math.max(...ys.map((t) => t.y));
        expect(at("y")).toBeCloseTo(top, 1);
        expect(at("y") + at("height")).toBeCloseTo(zero, 1);
      }
    },
  );

  // ⚠️ 이 시험이 **계약을 잠근다.** 스펙에 참값이 없으니 기하가 같은 것은 «자동»이지만,
  // 나중에 누가 value 를 「편의로」 되살리면 그림이 답을 흘린다(D-66 ⑺).
  it("숨긴 값이 달라도 **점선 상자 기하가 같다** — 다른 값이 바뀌어도", async () => {
    const a = await renderFigureSpec(withUnknown());
    const b = await renderFigureSpec(
      withUnknown(undefined, [
        { label: "가", value: 5 },
        { label: "나", unknown: true },
        { label: "다", value: 30 },
        { label: "라", value: 15 },
      ]),
    );
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(dashedBoxes(a.svg)).toEqual(dashedBoxes(b.svg));
  });

  it("unknown 에 value 를 같이 실으면 **던진다** — 참값이 스펙에 있으면 답이 샌다", async () => {
    const r = await renderFigureSpec(
      withUnknown(undefined, [
        { label: "가", value: 25 },
        { label: "나", unknown: true, value: 15 },
      ]),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/unknown|참값/);
  });

  it.each([
    ["전부 unknown — 축 맨 위를 못 정한다", [{ label: "가", unknown: true }]],
    [
      "전부 0 — 막대가 하나도 안 그려진다",
      [
        { label: "가", value: 0 },
        { label: "나", value: 0 },
      ],
    ],
    [
      "unknown: false 는 못 쓴다",
      [
        { label: "가", value: 5 },
        { label: "나", unknown: false },
      ],
    ],
    [
      "항목 오타 키는 조용히 무시되지 않는다",
      [
        { label: "가", value: 5 },
        { label: "나", valeu: 3 },
      ],
    ],
  ])("%s", async (_why, values) => {
    const r = await renderFigureSpec(withUnknown(undefined, values));
    expect(r.ok).toBe(false);
  });

  it("꺾은선은 지워진 막대를 못 그린다 — 조용히 건너뛰지 않고 던진다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "lineChart",
      yMax: 30,
      yLabel: "(명)",
      values: [
        { label: "가", value: 25 },
        { label: "나", unknown: true },
      ],
    });
    expect(r.ok).toBe(false);
  });

  // `value: 0` 은 정당한 자료인데 크기 0 rect 를 그리면 정제기가 던진다
  // (`figure_quality`: 「height must be positive」). `r.ok` 가 곧 sanitize 통과다.
  it.each(["vertical", "horizontal"])(
    "%s — 값 0 은 막대를 안 그리고 이름표만 남긴다 (정제기가 던지지 않는다)",
    async (orient) => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "barChart",
        ...(orient === "horizontal" ? { orient: "horizontal" } : {}),
        yMax: 10,
        yStep: 2,
        yLabel: "(명)",
        values: [
          { label: "가", value: 0 },
          { label: "나", value: 7 },
          { label: "다", value: 3 },
        ],
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.svg).not.toMatch(/<rect[^>]*width="0"/);
      expect(r.svg).not.toMatch(/<rect[^>]*height="0"/);
      expect(labelTexts(r.svg)).toContain("0");
    },
  );

  it("짝(chartPair) 안에서도 지워진 막대가 그려진다", async () => {
    const r = await renderFigureSpec(
      pairSpec(
        {
          ...PAIR_SOLD,
          values: [
            { label: "딸기", value: 10 },
            { label: "멜론", unknown: true },
            { label: "초코", value: 20 },
            { label: "바닐라", value: 30 },
          ],
        },
        PAIR_PRICE,
      ),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(dashedBoxes(r.svg)).toHaveLength(1);
  });
});

describe("[초등 그림] 무작위 20 스펙 계약", () => {
  it("이름 붙은 도형·분수 사다리꼴·곱셈표는 초등 kind 다", () => {
    const byId = new Map(
      CUBE_RANDOM_20.map((it) => [
        it.id,
        it.figureSpec as Record<string, unknown>,
      ]),
    );
    expect(byId.get("cube-concept-3-1-p049-q1")).toMatchObject({
      version: "elem-1",
      kind: "namedShapes",
    });
    expect(byId.get("cube-concept-3-1-p050-q07")).toMatchObject({
      version: "elem-1",
      kind: "namedShapes",
    });
    expect(byId.get("cube-concept-3-1-p145-q08")).toMatchObject({
      version: "elem-1",
      kind: "trapFour",
      filled: [0, 1, 3],
    });
    expect(byId.get("cube-concept-3-1-p069-q49")).toMatchObject({
      version: "elem-1",
      kind: "table",
    });
  });
});

type Pt = [number, number];

function parsePoints(raw: string): Pt[] {
  return [...raw.matchAll(/(-?[0-9.]+),(-?[0-9.]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as Pt,
  );
}

function pointInsidePolygon([x, y]: Pt, polygon: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    if (
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function svgPolygons(svg: string): Pt[][] {
  return [...svg.matchAll(/<polygon points="([^"]+)"/g)].map((m) =>
    parsePoints(m[1]!),
  );
}

/** 칠 색으로 면을 고른다 — 점 개수로 고르면 옆면과 윗면이 뒤바뀐다. */
function polygonsByFill(svg: string, fill: string): Pt[][] {
  return [...svg.matchAll(/<polygon points="([^"]+)"[^>]*fill="([^"]+)"/g)]
    .filter((m) => m[2] === fill)
    .map((m) => parsePoints(m[1]!));
}

function samePoint(a: Pt, b: Pt) {
  return Math.abs(a[0] - b[0]) < 0.15 && Math.abs(a[1] - b[1]) < 0.15;
}

function uniquePoints(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) if (!out.some((q) => samePoint(p, q))) out.push(p);
  return out;
}

/** 폴리곤을 모두 그린 **뒤에** 오는 점선 `<line>` — 겨냥도의 숨은 모서리다. */
function dashedLinesAfterPolygons(svg: string): [Pt, Pt][] {
  const lastPoly = svg.lastIndexOf("<polygon");
  const out: [Pt, Pt][] = [];
  for (const m of svg.matchAll(
    /<line x1="(-?[0-9.]+)" y1="(-?[0-9.]+)" x2="(-?[0-9.]+)" y2="(-?[0-9.]+)"([^>]*)>/g,
  )) {
    if (!m[5]!.includes("stroke-dasharray")) continue;
    if (m.index! < lastPoly) continue;
    out.push([
      [Number(m[1]), Number(m[2])],
      [Number(m[3]), Number(m[4])],
    ]);
  }
  return out;
}

/**
 * 밑면 고리를 화면 좌·우 끝에서 갈라 **뒤쪽(위) 사슬의 변 수**를 센다.
 * 볼록 입체에서 숨은 모서리는 이 사슬이 정한다 — 제품의 법선 판정과 **다른 길**로
 * 같은 수에 닿아야 판정이 서로를 베끼지 않는다.
 */
function backChainEdgeCount(ring: Pt[]): number {
  const ordered = [...ring].sort(
    (a, b) =>
      Math.atan2(a[1] - mean(ring, 1), a[0] - mean(ring, 0)) -
      Math.atan2(b[1] - mean(ring, 1), b[0] - mean(ring, 0)),
  );
  const n = ordered.length;
  let iL = 0;
  let iR = 0;
  for (let i = 1; i < n; i++) {
    if (ordered[i]![0] < ordered[iL]![0]) iL = i;
    if (ordered[i]![0] > ordered[iR]![0]) iR = i;
  }
  const walk = (from: number, to: number) => {
    const out = [ordered[from]!];
    for (let i = from; i !== to;) {
      i = (i + 1) % n;
      out.push(ordered[i]!);
    }
    return out;
  };
  const a = walk(iL, iR);
  const b = walk(iR, iL);
  const meanY = (c: Pt[]) => c.reduce((s, p) => s + p[1], 0) / c.length;
  const back = meanY(a) < meanY(b) ? a : b;
  return back.length - 1;
}

function mean(pts: Pt[], axis: 0 | 1) {
  return pts.reduce((s, p) => s + p[axis], 0) / pts.length;
}

/**
 * `namedShapes` 가 그린 도형들의 윤곽을 **그린 순서대로**. 표시가 꺼져 있으면 항목마다
 * `<rect>` 또는 `<polygon>` 이 정확히 하나다. 무게중심을 맞추고 변을 따라 촘촘히 뿌린다 —
 * 꼭짓점만 보면 「변 하나가 통째로 다른」 짝을 못 본다.
 */
/** `namedShapes` 도형들의 **꼭짓점**을 그린 순서대로. */
function shapeCorners(svg: string): Pt[][] {
  const out: Pt[][] = [];
  for (const m of svg.matchAll(
    /<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"|<polygon points="([^"]+)"/g,
  )) {
    if (m[5] !== undefined) {
      out.push(parsePoints(m[5]));
    } else {
      const x = Number(m[1]);
      const y = Number(m[2]);
      const w = Number(m[3]);
      const h = Number(m[4]);
      out.push([
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ]);
    }
  }
  return out;
}

/**
 * **회전에 안 흔들리는 지문** — 꼭짓점 수 · 정렬한 변 길이 · 정렬한 내각.
 *
 * 하우스도르프는 «그려진 자세»에서 재므로 **돌리면 포개지는 두 도형을 구조적으로
 * 못 본다.** 합동 문항이 묻는 것은 「**포개었을 때** 겹치는가」이고 학생은 종이를
 * 돌리고 뒤집어도 된다 — 그런 짝이 생기면 정답이 둘이 되는데 거리 가드는 초록이다.
 * 실제로 `diamond` 는 이미 **45° 돌린 정사각형**이고, `square` 와 갈리는 이유는
 * 모양이 아니라 **크기뿐**이다(변 31.1 vs 44.0). 다른 축이라 서로를 갈음하지 못한다.
 */
function rigidSignature(corners: Pt[]) {
  const n = corners.length;
  const at = (i: number) => corners[((i % n) + n) % n]!;
  const sides = corners
    .map((_p, i) =>
      Math.hypot(at(i)[0] - at(i + 1)[0], at(i)[1] - at(i + 1)[1]),
    )
    .sort((a, b) => a - b);
  const angles = corners
    .map((_p, i) => {
      const [ax, ay] = at(i - 1);
      const [bx, by] = at(i);
      const [cx, cy] = at(i + 1);
      const u: Pt = [ax - bx, ay - by];
      const v: Pt = [cx - bx, cy - by];
      const cos =
        (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
      return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    })
    .sort((a, b) => a - b);
  return { n, sides, angles };
}

function rigidlySame(
  a: ReturnType<typeof rigidSignature>,
  b: ReturnType<typeof rigidSignature>,
) {
  return (
    a.n === b.n &&
    a.sides.every((v, i) => Math.abs(v - b.sides[i]!) < 0.5) &&
    a.angles.every((v, i) => Math.abs(v - b.angles[i]!) < 1)
  );
}

function shapeOutlines(svg: string): Pt[][] {
  const out: Pt[][] = [];
  for (const corners of shapeCorners(svg)) {
    const dense: Pt[] = [];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % corners.length]!;
      for (let t = 0; t < 24; t++) {
        const u = t / 24;
        dense.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
      }
    }
    const cx = mean(dense, 0);
    const cy = mean(dense, 1);
    out.push(dense.map(([x, y]) => [x - cx, y - cy] as Pt));
  }
  return out;
}

function hausdorff(a: Pt[], b: Pt[]): number {
  const oneWay = (p: Pt[], q: Pt[]) =>
    Math.max(
      ...p.map(([x0, y0]) =>
        Math.min(...q.map(([x1, y1]) => Math.hypot(x0 - x1, y0 - y1))),
      ),
    );
  return Math.max(oneWay(a, b), oneWay(b, a));
}

function midPoint([a, b]: [Pt, Pt]): Pt {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function convexHull(pts: Pt[]): Pt[] {
  const s = [...pts].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (src: Pt[]) => {
    const out: Pt[] = [];
    for (const p of src) {
      while (
        out.length >= 2 &&
        cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0
      ) {
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(s), ...half(s.reverse())];
}

/** 실루엣(볼록 껍질) 안쪽인가 — 껍질 위에 놓이면 거짓. 숨은 모서리는 안쪽에만 있다. */
function insideHull(pts: Pt[], p: Pt, eps = 0.5): boolean {
  const hull = convexHull(pts);
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]!;
    const b = hull[(i + 1) % hull.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const d =
      ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / len;
    if (d <= eps) return false;
  }
  return true;
}

function ringEdges(ring: Pt[]): [Pt, Pt][] {
  const o = ringOrder(ring);
  return o.map((p, i) => [p, o[(i + 1) % o.length]!] as [Pt, Pt]);
}

function sameEdge(a: [Pt, Pt], b: [Pt, Pt]) {
  return (
    (samePoint(a[0], b[0]) && samePoint(a[1], b[1])) ||
    (samePoint(a[0], b[1]) && samePoint(a[1], b[0]))
  );
}

function ringOrder(ring: Pt[]): Pt[] {
  const cx = mean(ring, 0);
  const cy = mean(ring, 1);
  return [...ring].sort(
    (a, b) =>
      Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx),
  );
}

/** 숨은 밑면 모서리는 고리에서 **끊기지 않은 한 토막**이어야 한다 — 볼록 입체이므로. */
function isContiguousChain(ring: Pt[], edges: [Pt, Pt][]): boolean {
  const ordered = ringOrder(ring);
  const n = ordered.length;
  const at = (p: Pt) => ordered.findIndex((q) => samePoint(p, q));
  const idx = new Set<number>();
  for (const [a, b] of edges) {
    const i = at(a);
    const j = at(b);
    if (i < 0 || j < 0) return false;
    if ((i + 1) % n === j) idx.add(i);
    else if ((j + 1) % n === i) idx.add(j);
    else return false;
  }
  if (idx.size !== edges.length) return false;
  const sorted = [...idx].sort((x, y) => x - y);
  return sorted.some((start) =>
    sorted.every((_v, k) => idx.has((start + k) % n)),
  );
}

/** 타원의 납작한 정도(짧은 지름 / 긴 지름). 축에 나란하면 그냥 높이/너비다. */
function ellipseFlatness(pts: Pt[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return (
    (Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs))
  );
}

/** 좌·우 끝점의 높이 차 — 축에 나란한 타원이면 0 이다(사방투영은 크게 벌어진다). */
function axisTilt(pts: Pt[]) {
  const left = pts.reduce((a, b) => (a[0] <= b[0] ? a : b));
  const right = pts.reduce((a, b) => (a[0] >= b[0] ? a : b));
  return Math.abs(left[1] - right[1]);
}

/**
 * 그려진 점 — 폴리곤·선·상자·원·글자 닻점·경로의 끝점. 잘림 검사의 표본이다.
 *
 * ⚠️ **조판된 라벨은 걷어내고 본다.** 그 안의 `<path>` 좌표는 그림 좌표가 아니라
 *    **em 단위(1em = 1000)** 라, 같이 세면 viewBox 밖 점이 수백 개 쏟아진다
 *    (실측 525개, 전부 글자 외곽선). 라벨 닻점은 `svgLabels()` 로 따로 넣는다.
 */
function drawnPoints(full: string): Pt[] {
  const svg = stripLabels(full);
  const out: Pt[] = svgLabels(full).map((l) => [l.x, l.y] as Pt);
  for (const m of svg.matchAll(/<(?:polygon|polyline) points="([^"]+)"/g)) {
    out.push(...parsePoints(m[1]!));
  }
  for (const m of svg.matchAll(
    /<line x1="(-?[0-9.]+)" y1="(-?[0-9.]+)" x2="(-?[0-9.]+)" y2="(-?[0-9.]+)"/g,
  )) {
    out.push([Number(m[1]), Number(m[2])], [Number(m[3]), Number(m[4])]);
  }
  for (const m of svg.matchAll(
    /<rect x="(-?[0-9.]+)" y="(-?[0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/g,
  )) {
    const x = Number(m[1]);
    const y = Number(m[2]);
    out.push([x, y], [x + Number(m[3]), y + Number(m[4])]);
  }
  for (const m of svg.matchAll(
    /<circle cx="(-?[0-9.]+)" cy="(-?[0-9.]+)" r="([0-9.]+)"/g,
  )) {
    const cx = Number(m[1]);
    const cy = Number(m[2]);
    const rr = Number(m[3]);
    out.push([cx - rr, cy - rr], [cx + rr, cy + rr]);
  }
  for (const m of svg.matchAll(/ d="([^"]+)"/g)) {
    // 경로는 **끝점만** 본다. 제어점은 곡선이 닿지 않는 자리라 세면 헛되이 부푼다.
    const tokens = m[1]!.match(/[A-Za-z]|-?[0-9.]+/g) ?? [];
    let i = 0;
    let cmd = "";
    const argc: Record<string, number> = {
      M: 2,
      L: 2,
      T: 2,
      H: 1,
      V: 1,
      C: 6,
      S: 4,
      Q: 4,
      A: 7,
      Z: 0,
    };
    while (i < tokens.length) {
      const before = i;
      if (/[A-Za-z]/.test(tokens[i]!)) cmd = tokens[i++]!;
      const n = argc[cmd] ?? 0;
      const args = tokens.slice(i, i + n).map(Number);
      i += n;
      if (n >= 2) out.push([args[n - 2]!, args[n - 1]!]);
      if (cmd === "M") cmd = "L";
      if (i === before) break; // 모르는 토큰에서 멈춘다 — 무한 고리 방지
    }
  }
  return out;
}

function parseCylinderNet(svg: string) {
  const rects = svgRects(svg);
  const circles = [
    ...svg.matchAll(/<circle cx="([0-9.-]+)" cy="([0-9.-]+)" r="([0-9.]+)"/g),
  ].map((m) => ({ cx: Number(m[1]), cy: Number(m[2]), r: Number(m[3]) }));
  const rect = [...rects].sort((a, b) => b.w * b.h - a.w * a.h)[0] ?? null;
  return { rect, circles };
}

function attachLongSide(
  c: { cx: number; cy: number; r: number },
  rect: { x: number; y: number; w: number; h: number },
) {
  const tol = 1.2;
  const onLong = c.cx >= rect.x - tol && c.cx <= rect.x + rect.w + tol;
  if (onLong && Math.abs(c.cy + c.r - rect.y) < tol) return "top";
  if (onLong && Math.abs(c.cy - c.r - (rect.y + rect.h)) < tol) return "bot";
  return null;
}

function svgRects(svg: string) {
  return [
    ...svg.matchAll(
      /<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/g,
    ),
  ].map((m) => {
    const x = Number(m[1]);
    const y = Number(m[2]);
    const w = Number(m[3]);
    const h = Number(m[4]);
    return { x, y, w, h, cx: x + w / 2 };
  });
}

/**
 * 그 글이 앉은 자리. **조판됐든 아니든** 같은 값을 낸다 — `<text>` 만 보면
 * MathJax 로 조판된 라벨이 구조적으로 «없는 것»이 된다(2026-08-28).
 */
function textPos(svg: string, label: string) {
  const hit = svgLabels(svg).find((l) => l.text === label);
  return hit ? { x: hit.x, y: hit.y } : null;
}

function hexMean(hex: string) {
  const n = hex.replace("#", "");
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return (r + g + b) / 3;
}

function shoelace(pts: string) {
  const pairs = [...pts.matchAll(/([0-9.]+),([0-9.]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
  let area = 0;
  for (let i = 0; i < pairs.length; i++) {
    const [x1, y1] = pairs[i]!;
    const [x2, y2] = pairs[(i + 1) % pairs.length]!;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

/* ── ② markedShape — 도형 «위»의 표시 (2026-08-23, elem-figures) ─────────────
 *
 * 왜 `namedShapes` 와 다른 kind 인가: `namedShapes` 는 「가·나·다 중 고르시오」용이고
 * 그 불변식은 **도형 쌍의 윤곽 거리**(`SHAPE_MIN_DISTANCE` 6px, 09 §4-19)다.
 * 성질 문항은 도형이 **하나뿐**이라 잴 쌍이 없다 — 한 kind 에 두 규칙이 살면
 * 가드 절반이 늘 헛돌고, 그게 「배선이 한쪽만」 자리다(CLAUDE.md 2026-08-18).
 *
 * 도형 **모양**은 두 kind 가 `_shape_points` 하나를 쓴다. 목록이 두 벌이 되면
 * 「한쪽만 늘어난다」가 그 자리에서 열린다.
 *
 * 참은 **그려진 SVG** 에서 온다 — 스펙을 되읽지 않는다. 기대값은 리터럴이다
 * (제품 상수에서 만들면 상수를 바꿀 때 기대값이 따라가 영원히 초록이다, 09 §4-20-d).
 */
const MARKED_ISO = {
  version: "elem-1",
  kind: "markedShape",
  shape: "isoTri",

  // ⚠️ `isoTri` 의 점은 [밑변왼, 꼭대기, 밑변오] 라 **같은 두 변은 0·1**(다리)이고
  // 변 2 가 밑변이다. 처음에 [0,2] 로 썼다가 빨개졌다 — 시험이 도형 구조를 잡아 줬다.
  sides: ["7 cm", "7 cm", null],
  angles: [null, "63°", null],
  equal: [[0, 1]],
};

describe.skipIf(!hasEngine)("[초등 그림] markedShape — 도형 위 표시", () => {
  it("그린다 — 변 라벨과 각 라벨이 지면에 나온다", async () => {
    const r = await renderFigureSpec(MARKED_ISO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain("7 cm");
    expect(r.svg).toContain("63°");
  });

  it("**같다고 표시한 변은 그린 길이도 같다** — tick 이 거짓말하지 않는다", async () => {
    const r = await renderFigureSpec(MARKED_ISO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [corners] = shapeCorners(r.svg);
    expect(corners).toBeDefined();
    const at = (i: number) => corners![i % corners!.length]!;
    const len = (i: number) =>
      Math.hypot(at(i)[0] - at(i + 1)[0], at(i)[1] - at(i + 1)[1]);
    // equal:[[0,1]] 이 주장하는 두 변. **음성 대조**: 밑변(2)은 이들과 달라야 한다 —
    // 「전부 같다」로 통과하면 이 가드는 아무것도 안 지킨다.
    expect(Math.abs(len(0) - len(1))).toBeLessThan(0.5);
    expect(Math.abs(len(0) - len(2))).toBeGreaterThan(5);
  });

  it("**적힌 각의 합이 성립한다** — 삼각형 180°", async () => {
    const r = await renderFigureSpec({
      ...MARKED_ISO,
      angles: ["63°", "54°", "63°"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const nums = [...r.svg.matchAll(/(\d+)°/g)].map((m) => Number(m[1]));
    expect(nums.length).toBe(3);
    expect(nums.reduce((a, b) => a + b, 0)).toBe(180);
  });

  it("**직각 기호 자리는 실제로 90°** — 호가 아니라 꺾인 선이다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "rightTri",
      // 점이 [왼아래, 왼위, 오아래] 라 직각은 **0**. 처음에 1 로 썼다가 빨개졌다.
      right: [0],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [corners] = shapeCorners(r.svg);
    expect(corners).toBeDefined();
    const at = (i: number) => corners![((i % 3) + 3) % 3]!;
    const u = [at(1)[0] - at(0)[0], at(1)[1] - at(0)[1]];
    const v = [at(2)[0] - at(0)[0], at(2)[1] - at(0)[1]];
    expect(Math.abs(u[0]! * v[0]! + u[1]! * v[1]!)).toBeLessThan(1);
    // 초등 직각은 **작은 정사각형**이다. 엔진 A 는 이 자리를 호로 그린다(09 §2.1 주).
    expect(r.svg).toContain("<polyline");
  });

  it("**스펙이 준 치수를 하나도 안 빠뜨린다** (09 §4-20)", async () => {
    const r = await renderFigureSpec(MARKED_ISO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // sides 2개 + angles 1개 = 3
    expect([...r.svg.matchAll(/7 cm/g)].length).toBe(2);
    expect([...r.svg.matchAll(/63°/g)].length).toBe(1);
  });

  it("**변 라벨은 `measured()` 다** — 치수 점선이 라벨 수만큼 있다 (09 §4-16)", async () => {
    const r = await renderFigureSpec(MARKED_ISO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // `_length_mark` 는 점선 `6 4` 를 낸다. 날 `<text>` 로 적으면 이 선이 사라진다.
    // ⚠️ 「cm 라벨은 halo」 전 kind 검사가 이 kind 에서 왜 안 무는지 못 밝혔다
    //    (문서 §10). 그래서 **같은 것을 다른 특징으로** 한 번 더 잰다.
    const dashes = (r.svg.match(/stroke-dasharray="6 4"/g) ?? []).length;
    expect(dashes, "치수 점선").toBeGreaterThanOrEqual(2);
  });

  it("치수 점선의 볼록한 가운데는 도형 바깥이고 폭 등급은 mid로 고정된다", async () => {
    for (const spec of [
      MARKED_ISO,
      {
        version: "elem-1",
        kind: "markedShape",
        shape: "para",
        sides: ["4 cm", "6 cm", null, null],
      },
      {
        version: "elem-1",
        kind: "markedShape",
        shape: "pentagon",
        sides: ["12 cm"],
      },
    ]) {
      const r = await renderFigureSpec(spec);
      expect(r.ok, String(spec.shape)).toBe(true);
      if (!r.ok) return;
      const corners = shapeCorners(r.svg)[0]!;
      const center = corners.reduce(
        (sum, [x, y]) => [
          sum[0] + x / corners.length,
          sum[1] + y / corners.length,
        ],
        [0, 0] as Pt,
      );
      const dims = [
        ...r.svg.matchAll(
          /<path d="M ([\d.-]+) ([\d.-]+) Q ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"[^>]*stroke-dasharray="6 4"/g,
        ),
      ];
      expect(dims.length, `${spec.shape} 치수`).toBeGreaterThan(0);
      for (const dim of dims) {
        const sx = Number(dim[1]);
        const sy = Number(dim[2]);
        const cx = Number(dim[3]);
        const cy = Number(dim[4]);
        const ex = Number(dim[5]);
        const ey = Number(dim[6]);
        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;
        const outwardDot =
          (cx - mx) * (mx - center[0]) + (cy - my) * (my - center[1]);
        expect(outwardDot, `${spec.shape} 치수 곡선`).toBeGreaterThan(0);
      }
      expect(figureSvgViewBoxWidth(r.svg), `${spec.shape} 폭`).toBe(184);
      expect(figureSvgSize(r.svg), `${spec.shape} 지면 등급`).toBe("mid");
    }
  });

  it.each([
    ["square", 4, 2],
    ["pentagon", 5, 5],
    ["hexagon", 6, 9],
    ["octagon", 8, 20],
  ])(
    "**대각선 개수가 n(n-3)/2 다** — %s (꼭짓점 %i개 → %i개)",
    async (shape, n, want) => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "markedShape",
        shape,
        diagonals: true,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      // 그은 개수가 **발문의 답**이다 — 「팔각형에 그을 수 있는 대각선은 몇 개?」
      // 좌표에서 자동으로 나오게 두고(손으로 세지 않는다) 여기서 그 값을 확인한다.
      const drawn = (r.svg.match(/stroke-dasharray="4 3"/g) ?? []).length;
      expect(drawn, `${shape} 대각선`).toBe(want);
      expect(want).toBe((n * (n - 3)) / 2); // 기대값 자체가 공식과 맞는지 (자가 검사)
      // 꼭짓점 수도 맞아야 한다 — 정n각형을 엉뚱한 n 으로 그리면 개수만 우연히 맞을 수 있다.
      expect(shapeCorners(r.svg)[0]!, `${shape} 꼭짓점`).toHaveLength(n);
    },
  );

  it("**정n각형은 변 길이·내각이 모두 같다** — 정의가 좌표에서 참이어야 한다", async () => {
    for (const [shape, n] of [
      ["pentagon", 5],
      ["hexagon", 6],
      ["octagon", 8],
    ] as const) {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "markedShape",
        shape,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const c = shapeCorners(r.svg)[0]!;
      expect(c, `${shape} 꼭짓점`).toHaveLength(n);
      const sides = c.map((_p, i) =>
        Math.hypot(
          c[i]![0] - c[(i + 1) % n]![0],
          c[i]![1] - c[(i + 1) % n]![1],
        ),
      );
      const spread = Math.max(...sides) - Math.min(...sides);
      // 🔴 문턱 0.5px 은 **양쪽에서** 정했다 (2026-08-23 실측, 슬롯 104):
      //      정상            변 편차 0.003px   (부동소수 오차뿐)
      //      반지름 6% 흔듦   변 편차 2.36~2.96px
      //    두 무리 사이가 훤히 비어 있어 0.5 는 그 틈이다 — **지금 값에서 유도한 것이
      //    아니다.** 정상값(0.003)을 문턱으로 쓰면 제품이 정답을 정하는 그 함정이 된다.
      //    변이 「정n각형을 찌그러뜨린다」가 이 단언 하나로 빨개지는 것을 확인했다.
      expect(spread, `${shape} 변 길이 편차`).toBeLessThan(0.5);
      // ⚠️ **중심각 편차 검사를 넣었다가 지웠다** — `_ngon_points` 는 늘 **원에 내접**하게
      //    그리므로 변 = 2r·sin(중심각/2) 다. 반지름이 같으면 「변 길이 편차」와
      //    「중심각 편차」는 **대수적으로 같은 말**이라 아무것도 더 안 갈라낸다.
      //    실측으로 확인했다: 각을 흔드는 변이에서도 **변 길이 편차가 먼저** 걸린다
      //    (10.09px). 죽은 검사를 남기면 「두 축이 지킨다」는 착시를 준다
      //    (CLAUDE.md 2026-08-18 「대수적으로 같은 말이라 지웠다」와 같은 자리).
      //    ⑴ `_ngon_points` 가 내접을 그만두거나 ⑵ 꼭짓점을 개별로 받게 되면
      //    그때는 두 축이 갈라지므로 다시 넣어야 한다.
    }
  });

  /* ⓪ 임시 차단(2026-08-23)은 **걷어냈다** — 비율 수리가 그 자리를 대신한다.
   * 그 차단은 「값을 적으면 던진다」였고, 시험이 **「비율 수리 전」이라는 낱말을
   * 붙들고** 있었다. 수리하며 엔진에서 그 문구를 지우자 **그 시험이 정확히 빨개져**
   * 이 블록을 같이 지우게 됐다 — 임시 조치가 스스로를 청소한 것이다(리드 제안).
   * 지금 그 자리를 지키는 것은 위쪽 「그린 변의 비가 sides 와 같다」 셋과
   * 「3·4·5 는 정말 직각이다」·「모순·불가능한 값은 던진다」다.
   */

  it("**음성 대조군** — 표시를 안 주면 tick·직각이 나오지 않는다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "isoTri",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).not.toContain("<polyline");
    expect(r.svg).not.toContain("cm");
    expect(r.svg).not.toContain("°");
  });

  /* ── 비율 수리 (2026-08-23) ────────────────────────────────────────────────
   * **적힌 값은 반드시 그림에 반영한다.** ⓪ 임시 차단을 이 검사들이 대신한다.
   * ⚠️ 「5,5,9」(밑변이 가장 긴)와 「7,7,4」(다리가 긴)를 **둘 다** 넣는다 —
   *    한쪽만이면 고정 도형과 구분이 안 돼 구조적으로 0이다.
   */
  it.each([
    ["7,7,4 다리가 김", [7, 7, 4]],
    ["5,5,9 밑변이 가장 김", [5, 5, 9]],
    ["4,6,8 셋이 다름", [4, 6, 8]],
  ])("**그린 변의 비가 sides 와 같다** — %s", async (_w, want) => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "isoTri",
      sides: want.map((v) => `${v} cm`),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = shapeCorners(r.svg)[0]!;
    const drawn = c.map((_p, i) =>
      Math.hypot(c[i]![0] - c[(i + 1) % 3]![0], c[i]![1] - c[(i + 1) % 3]![1]),
    );
    // 비로 견준다 — 절대 크기는 슬롯에 맞추므로 자유다.
    const k = drawn[0]! / want[0]!;
    for (let i = 0; i < 3; i += 1) {
      expect(drawn[i]! / k, `변 ${i}`).toBeCloseTo(want[i]!, 1);
    }
  });

  it("**적힌 각이 그림에 반영된다** — 3·4·5 는 정말 직각이다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "isoTri",
      sides: ["3 cm", "4 cm", "5 cm"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = shapeCorners(r.svg)[0]!;
    // 변 0(=3)과 변 1(=4) 사이 꼭짓점 1 이 직각이어야 한다 — **내적으로** 잰다.
    const u = [c[0]![0] - c[1]![0], c[0]![1] - c[1]![1]];
    const v = [c[2]![0] - c[1]![0], c[2]![1] - c[1]![1]];
    const cos =
      (u[0]! * v[0]! + u[1]! * v[1]!) /
      (Math.hypot(u[0]!, u[1]!) * Math.hypot(v[0]!, v[1]!));
    expect(Math.abs(cos), "3·4·5 의 직각").toBeLessThan(0.02);
  });

  it.each([
    ["삼각부등식 위반", { sides: ["3 cm", "4 cm", "9 cm"] }, /삼각형/],
    ["각의 합이 180°가 아님", { angles: ["70°", "70°", "70°"] }, /180/],
  ])("**모순·불가능한 값은 던진다** — %s", async (_w, extra, why) => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "isoTri",
      ...extra,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(why);
  });

  it("**관례값이 지면에서 읽히는 범위 안이다** — 납작한 평행사변형 금지", async () => {
    // ⚠️ 각이 안 적힌 판(「이웃한 두 변이 4·6」)에서 관례 각을 쓴다. 그 각이 너무
    //    납작하면 지면에서 **「이게 정말 4:6인가」가 안 읽힌다**(리드 지적).
    //    적힌 값을 반영하는 것만으로는 부족하고, **안 적힌 것의 범위**도 지켜야 한다.
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "para",
      sides: ["4 cm", "6 cm", null, null],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = shapeCorners(r.svg)[0]!;
    const u = [c[1]![0] - c[0]![0], c[1]![1] - c[0]![1]];
    const v = [c[3]![0] - c[0]![0], c[3]![1] - c[0]![1]];
    const cos =
      (u[0]! * v[0]! + u[1]! * v[1]!) /
      (Math.hypot(u[0]!, u[1]!) * Math.hypot(v[0]!, v[1]!));
    const deg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    // 너무 납작하지도(<40°) 직사각형에 가깝지도(>80°) 않아야 한다 —
    // 직사각형처럼 보이면 「평행사변형」임이 안 읽힌다.
    expect(deg, "관례 각").toBeGreaterThan(40);
    expect(deg, "관례 각").toBeLessThan(80);
    // 그리고 적힌 비는 그대로 지켜야 한다.
    const a = Math.hypot(u[0]!, u[1]!);
    const b = Math.hypot(v[0]!, v[1]!);
    expect(Math.max(a, b) / Math.min(a, b), "4:6 비").toBeCloseTo(1.5, 1);
  });

  it("**«모든 변이 같은 도형» 목록이 거짓말하지 않는다** — 좌표로 검산", async () => {
    // 🔴 **목록을 여기 손으로 적지 않는다.** 처음에 다섯을 하드코딩했더니
    //    「`_EQUILATERAL` 에 `trap` 을 넣는」 변이가 **초록**이었다 — 시험이 그 목록을
    //    안 읽으니 무엇을 넣든 안 보였다. 09 §4-22 「손 목록은 샌다」가 **이 검사에**
    //    또 걸린 것이다(오늘 세 번째 자리: sphere · markedShape · 여기).
    //
    //    엔진의 `_EQUILATERAL` 을 읽어 **그 안의 모든 도형**을 좌표로 잰다. 목록에
    //    넣기만 하고 실제로 변이 다르면 「한 변만 줘도 된다」가 곧 배반이 된다.
    const kinds = equilateralFromEngine();
    expect(kinds.length, "등변 도형 수").toBeGreaterThanOrEqual(7);
    for (const shape of kinds) {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "markedShape",
        shape,
        sides: ["5 cm"],
      });
      expect(r.ok, `${shape} 는 한 변만 줘도 그려져야 한다`).toBe(true);
      if (!r.ok) return;
      const c = shapeCorners(r.svg)[0]!;
      const n = c.length;
      const sides = c.map((_p, i) =>
        Math.hypot(
          c[i]![0] - c[(i + 1) % n]![0],
          c[i]![1] - c[(i + 1) % n]![1],
        ),
      );
      expect(
        Math.max(...sides) - Math.min(...sides),
        `${shape} 변 편차 — 이 도형은 «모든 변이 같다»로 등록돼 있다`,
      ).toBeLessThan(0.5);
    }
  }, 60_000);

  it("**직사각형은 이웃한 두 변의 비를 지킨다** — 4:7", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "rect",
      sides: ["4 cm", "7 cm", null, null],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const m = /<rect[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/.exec(r.svg);
    expect(m, "rect 태그").not.toBeNull();
    const w = Number(m![1]);
    const h = Number(m![2]);
    expect(Math.max(w, h) / Math.min(w, h), "4:7").toBeCloseTo(1.75, 2);
  });

  it.each([
    [
      "같은 변 도형에 서로 다른 값",
      { shape: "square", sides: ["8 cm", "5 cm"] },
      /모든 변이 같은/,
    ],
    ["직사각형에 90°가 아닌 각", { shape: "rect", angles: ["70°"] }, /90/],
  ])("**모순은 던진다** — %s", async (_w, extra, why) => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      ...extra,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(why);
  });

  it("`rhombus` 는 `diamond` 의 별칭이다 — 이름이 두 벌이라 받아 준다", async () => {
    const a = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "rhombus",
    });
    const b = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "diamond",
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.svg).toBe(b.svg);
  });

  it("**음성 대조군** — 값을 안 주면 지금 모양 그대로다 (회귀 방지)", async () => {
    const a = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "isoTri",
    });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const c = shapeCorners(a.svg)[0]!;
    const drawn = c.map((_p, i) =>
      Math.hypot(c[i]![0] - c[(i + 1) % 3]![0], c[i]![1] - c[(i + 1) % 3]![1]),
    );
    // `ISO_TRI_BASE` 0.58 — 다리 둘이 같고 밑변이 좁다(09 §4-19).
    expect(drawn[0]).toBeCloseTo(drawn[1]!, 1);
    expect(drawn[2]! / drawn[0]!, "밑변/다리").toBeLessThan(0.7);
  });

  it("**모르는 키·모르는 도형은 예외** — 오타가 조용히 무시되지 않는다", async () => {
    const bad = await renderFigureSpec({ ...MARKED_ISO, sidez: ["1"] });
    expect(bad.ok).toBe(false);
    const badShape = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "노형",
    });
    expect(badShape.ok).toBe(false);
  });

  it("**⑧과 같은 도형 함수를 쓴다** — 목록이 두 벌이 아니다", async () => {
    const a = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "eqTri",
    });
    const b = await renderFigureSpec({
      version: "elem-1",
      kind: "namedShapes",
      items: [{ shape: "eqTri", label: "가" }],
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const ra = rigidSignature(shapeCorners(a.svg)[0]!);
    const rb = rigidSignature(shapeCorners(b.svg)[0]!);
    // 자세·크기가 아니라 **모양**이 같아야 한다 — 변 길이 비로 견준다.
    const norm = (s: number[]) => s.map((v) => v / s[s.length - 1]!);
    expect(norm(ra.sides).map((v) => v.toFixed(3))).toEqual(
      norm(rb.sides).map((v) => v.toFixed(3)),
    );
  });
});

/* ── 짝의 화면 폭 등급 — 파이썬과 TS 를 **잇는** 확인 (2026-08-23, elem-figures) ──
 *
 * `figureSvgFrame.test.ts` 는 순수 함수만 본다(문자열을 손으로 만든다). 그것만으로는
 * **「엔진이 실제로 그 표식을 심는가」**를 못 본다 — 한쪽만 고쳐도 초록이다.
 * 여기서는 진짜로 렌더해서 잇는다.
 */
describe.skipIf(!hasEngine)(
  "[초등 그림] 그래프 짝은 지면에서 pair 등급이다",
  () => {
    const pair = (labels: string[]) => ({
      version: "elem-1",
      kind: "chartPair",
      charts: [
        {
          kind: "barChart",
          orient: "horizontal",
          title: "팔린 수",
          yMax: 40,
          yStep: 10,
          yLabel: "(개)",
          values: labels.map((l, i) => ({ label: l, value: (i + 1) * 10 })),
        },
        {
          kind: "barChart",
          title: "값",
          yMax: 800,
          yStep: 100,
          yLabel: "(원)",
          values: labels.map((l, i) => ({ label: l, value: (i + 1) * 100 })),
        },
      ],
    });

    it("엔진이 표식을 심고, 지면이 그것을 보고 pair 로 보낸다", async () => {
      const r = await renderFigureSpec(
        pair(["딸기", "멜론", "초코", "바닐라"]),
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      // 파이썬이 심는다 (`sanitize_svg` 가 desc 를 통과시키되 속성은 안 받는다)
      expect(r.svg).toContain("<desc>chartPair</desc>");
      // TS 가 그것을 본다
      expect(figureSvgSize(r.svg)).toBe("pair");
      expect(figureSvgFrameClass(r.svg)).toContain(
        `max-w-[${FIGURE_SVG_PAIR_MM}mm]`,
      );
    });

    it("**좁은 짝**도 pair 다 — 폭으로 가르면 놓치는 자리", async () => {
      // 항목이 둘뿐이라 좁다. 종전 규칙(viewBox > 380)이면 mid/wide 로 떨어진다.
      const r = await renderFigureSpec(pair(["딸기", "멜론"]));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const width = figureSvgViewBoxWidth(r.svg)!;
      expect(width, "좁은 짝의 viewBox").toBeLessThan(380);
      expect(figureSvgSize(r.svg), `viewBox ${width}`).toBe("pair");
    });

    it("**음성 대조군** — 단독 그래프는 표식이 없고 pair 도 아니다", async () => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "barChart",
        yMax: 40,
        yStep: 10,
        yLabel: "(개)",
        values: [
          { label: "딸기", value: 10 },
          { label: "멜론", value: 40 },
        ],
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.svg).not.toContain("<desc>");
      expect(figureSvgSize(r.svg)).not.toBe("pair");
    });
  },
);

/* ── 차트의 «가려진 값» — **선언이 한 곳인가** (2026-08-23, elem-figures) ────────
 *
 * 값만 보는 시험은 이 축을 **구조적으로 못 본다.** 「막대는 받고 꺾은선은 막는다」는
 * 호출부가 각자 `allow_unknown` 을 손으로 정해도 똑같이 나온다 — 갈라지는 것은
 * 「`CHART_ACCEPTS_UNKNOWN` 을 뒤집었을 때 두 호출부가 같이 뒤집히는가」뿐이다.
 *
 * 그 뒤집기는 파이썬 안에서만 할 수 있어 `probe-chart-unknown.py`(g4 작성)가 맡는다.
 * 여기서는 **그 판정기를 실제로 돌려** 통과하는지 본다 — 판정기가 저장소에 있는데
 * 아무도 안 부르면 그것은 가드가 아니라 문서다.
 */
describe.skipIf(!hasEngine)("[초등 그림] 가려진 값 선언은 한 곳이다", () => {
  it("`probe-chart-unknown.py` 가 통과한다 — 표를 뒤집으면 두 호출부가 따라온다", () => {
    const out = spawnSync("python", ["scripts/qa/probe-chart-unknown.py"], {
      encoding: "utf-8",
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    // 판정기가 **죽어도** 0 이 아니다 — 「깨끗함」과 「판정 못 함」이 안 갈리면 안 된다.
    expect(out.status, out.stdout + out.stderr).toBe(0);
    expect(out.stdout).toContain("선언 한 곳을 두 호출부가 읽는다");
    // 눈금 건수가 줄면 판정기가 조용히 약해진 것이다.
    expect(out.stdout).toMatch(/눈금 (\d+)건/);
    const n = Number(/눈금 (\d+)건/.exec(out.stdout)![1]);
    expect(n, "판정기 눈금 건수").toBeGreaterThanOrEqual(8);
  }, 60_000);
});

/**
 * ⑧ `namedShapes` 가 실제로 받는 도형 목록을 **엔진 소스에서** 읽는다.
 * 시험이 자기 손 목록을 두면 도형을 더해도 검사가 안 늘어난다(09 §4-22).
 */
/**
 * 엔진의 `_EQUILATERAL`(모든 변이 같다고 **선언된** 도형)을 읽는다.
 * `frozenset({...}) | _NGON_KINDS` 라 두 조각을 합친다 — 정n각형은 `_NGON_SIDES` 에서.
 */
function equilateralFromEngine(): string[] {
  const src = readFileSync(
    path.join(process.cwd(), "scripts", "figure", "elementary.py"),
    "utf8",
  );
  const m = /_EQUILATERAL = frozenset\(\s*\{([^}]*)\}/.exec(src);
  if (!m) throw new Error("_EQUILATERAL 을 못 읽었다");
  const base = [...m[1]!.matchAll(/"([a-zA-Z]+)"/g)].map((x) => x[1]!);
  const g = /_NGON_SIDES: dict\[str, int\] = \{([^}]*)\}/.exec(src);
  if (!g) throw new Error("_NGON_SIDES 를 못 읽었다");
  const ngon = [...g[1]!.matchAll(/"([a-zA-Z]+)"/g)].map((x) => x[1]!);
  return [...base, ...ngon];
}

function shapeKindsFromEngine(): string[] {
  const src = readFileSync(
    path.join(process.cwd(), "scripts", "figure", "elementary.py"),
    "utf8",
  );
  // ⚠️ **한 겹만 본다** — 소스의 **첫** `frozenset({...})` 만 읽는다. 뒤에 재할당
  //    (`_SHAPE_KINDS = _SHAPE_KINDS | ...`)이 붙으면 그건 **안 보인다.**
  //    2026-08-23 변이에서 실제로 그렇게 초록이 났다. 「목록을 손으로 안 적는다」는
  //    지켰지만 **유도가 한 겹**이라 생긴 구멍이다. 엔진에 직접 물으려면 python 을
  //    띄워야 하는데, 그 경로는 이 파일에서 다른 결함을 겪어(§10) 지금은 소스를 읽는다.
  //    → 도형을 더할 때는 **`frozenset` 안에** 적어라. 밖에서 합치면 이 검사가 못 본다.
  const m = /_SHAPE_KINDS = frozenset\(\s*\{([^}]*)\}/.exec(src);
  if (!m) throw new Error("_SHAPE_KINDS 를 못 읽었다");
  const kinds = [...m[1]!.matchAll(/"([a-zA-Z]+)"/g)].map((x) => x[1]!);
  if (kinds.length < 5) throw new Error(`도형이 너무 적다: ${kinds.length}`);
  return kinds;
}

/* ── ③ lineRelation — 두 직선의 관계 (2026-08-24, elem-figures) ───────────────
 *
 * 초4 2-4-1(수직과 수선) · 2-4-2(평행과 평행선) · 2-4-3(평행선 사이의 거리).
 *
 * 🔴 **「표시가 있다」가 아니라 「정말 그러한가」를 잰다** — 리드가 ②에서 묶어 준 축이다.
 *    ②에서 「대각선 개수」는 참인데 도형이 찌그러져도 개수는 그대로였다.
 *    **셀 수 있는 것만 재면 모양은 샌다.** 그래서 수직은 **내적**, 평행은 **외적**으로 잰다.
 *
 * ⚠️ 엔진 A(FigureSpec v2)로 가면 안 된다 — 직각을 **호**로 그린다(09 §2.1 주).
 *    초등 교과서의 직각은 **작은 정사각형**이다.
 */
describe.skipIf(!hasEngine)("[초등 그림] lineRelation — 두 직선의 관계", () => {
  /** SVG 의 `<line>` 을 방향 벡터로. */
  function segs(svg: string): { p: number[]; q: number[]; len: number }[] {
    return [
      ...svg.matchAll(
        /<line x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/g,
      ),
    ].map((m) => {
      const p = [Number(m[1]), Number(m[2])];
      const q = [Number(m[3]), Number(m[4])];
      return { p, q, len: Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!) };
    });
  }
  const dir = (s: { p: number[]; q: number[]; len: number }) => [
    (s.q[0]! - s.p[0]!) / s.len,
    (s.q[1]! - s.p[1]!) / s.len,
  ];

  it("**평행은 정말 평행하다** — 외적이 0", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "lineRelation",
      relation: "parallel",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const main = segs(r.svg)
      .filter((x) => x.len > 40)
      .slice(0, 2);
    expect(main, "긴 직선 둘").toHaveLength(2);
    const [u, v] = [dir(main[0]!), dir(main[1]!)];
    expect(Math.abs(u[0]! * v[1]! - u[1]! * v[0]!), "외적").toBeLessThan(0.02);
  });

  it("**평행선 사이 거리는 수선으로 잰다** — 그 선이 두 직선에 수직", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "lineRelation",
      relation: "parallel",
      distance: "10 cm",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain("10 cm");
    // 치수는 `measured()` 가 낸다 — halo + 점선 `6 4` (09 §4-16)
    // ⚠️ halo 는 **성질**로 센다 — 그 낱말은 halo 를 이루는 «방법» 하나일 뿐이다.
    //    2026-08-28 에 방법이 바뀌자(글자끼리 서로 지워서 두 벌로 갈랐다) 이 줄이
    //    빨개졌는데, halo 는 멀쩡히 걸려 있었다. 낱말을 세면 그 낱말이 바뀔 때 운다.
    expect(
      svgLabels(r.svg).some((l) => l.halo > 0),
      "halo 가 없다",
    ).toBe(true);
    expect(r.svg).toContain('stroke-dasharray="6 4"');
  });

  it("**음성 대조군** — 평행 표시는 두 직선에 «같은 수»로 찍힌다", async () => {
    // 한쪽에만 찍으면 「이 둘이 평행」이라는 뜻이 안 된다.
    const one = await renderFigureSpec({
      version: "elem-1",
      kind: "lineRelation",
      relation: "parallel",
    });
    const two = await renderFigureSpec({
      version: "elem-1",
      kind: "lineRelation",
      relation: "parallel",
      marks: 2,
    });
    expect(one.ok && two.ok).toBe(true);
    if (!one.ok || !two.ok) return;
    expect((one.svg.match(/<polyline/g) ?? []).length, "1개씩 두 줄").toBe(2);
    expect((two.svg.match(/<polyline/g) ?? []).length, "2개씩 두 줄").toBe(4);
  });

  it("**수선 여러 개는 길이가 정말 같다** — 그게 발문의 답이다", async () => {
    // 「수선을 5개 그었습니다. 이 수선들의 길이는 서로 어떠한가?」(초4 2-4-3)
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "lineRelation",
      relation: "parallel",
      perpCount: 5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const all = segs(r.svg);
    const rails = all.filter(
      (x) => x.len > 40 && Math.abs(x.p[1]! - x.q[1]!) < 0.5,
    );
    expect(rails, "평행선 둘").toHaveLength(2);
    const perps = all.filter(
      (x) => Math.abs(x.p[0]! - x.q[0]!) < 0.5 && x.len > 10,
    );
    expect(perps, "수선 다섯").toHaveLength(5);
    const lens = perps.map((x) => x.len);
    expect(
      Math.max(...lens) - Math.min(...lens),
      "수선 길이 편차",
    ).toBeLessThan(0.5);
  });

  /**
   * 🔴 **모양을 쟀는데 «이름»이 샜다** (리드가 좌표로 잡았다, 2026-08-24).
   *
   * 위 검사 여섯은 전부 **기하**를 잰다 — 내적·외적·직각 기호·수선 길이·관계·음성 대조.
   * 그런데 **「이 이름이 어느 선에 붙었나」는 잴 자리가 아예 없었다.** 실제로
   * `parallel` 은 **한 직선의 양 끝**에 「가」·「나」가 붙어 있었고
   * (「직선 가와 나는 서로 평행합니다」와 **정면으로 어긋난다**),
   * `bothPerpendicular` 은 세로선 하나와 **밑선**에 붙어 발문이 가리키는 둘 중
   * 하나를 놓쳤다. 기하 축은 이것을 **구조적으로 못 본다** — 선은 멀쩡하니까.
   *
   * 「셀 수 있는 것만 재면 모양이 샌다」의 **다음 겹**이다: 모양이 맞아도 이름이 샌다.
   */
  it.each([["parallel", false]])(
    "**두 이름이 서로 다른 직선에 붙는다** — %s",
    async (relation, bothVertical) => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "lineRelation",
        relation,
        labels: ["가", "나"],
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const lines = segs(r.svg).filter((x) => x.len > 40);
      const texts = [
        ...r.svg.matchAll(
          /<text x="(-?[\d.]+)" y="(-?[\d.]+)"[^>]*>([^<]+)<\/text>/g,
        ),
      ].map((m) => ({ x: Number(m[1]), y: Number(m[2]), t: m[3]! }));
      expect(texts, "이름 둘").toHaveLength(2);
      // 라벨에서 가장 가까운 선분을 임자로 삼는다.
      const owner = (tx: number, ty: number) => {
        let best = Infinity;
        let bi = -1;
        lines.forEach((L, i) => {
          const dx = L.q[0]! - L.p[0]!;
          const dy = L.q[1]! - L.p[1]!;
          const t = Math.max(
            0,
            Math.min(
              1,
              ((tx - L.p[0]!) * dx + (ty - L.p[1]!) * dy) / (dx * dx + dy * dy),
            ),
          );
          const d = Math.hypot(
            tx - (L.p[0]! + t * dx),
            ty - (L.p[1]! + t * dy),
          );
          if (d < best) {
            best = d;
            bi = i;
          }
        });
        return bi;
      };
      const owners = texts.map((x) => owner(x.x, x.y));
      expect(
        new Set(owners).size,
        `${relation}: 두 이름이 같은 선에 붙었다`,
      ).toBe(2);
      if (bothVertical) {
        // 「한 직선에 수직인 **두** 직선」이 가리키는 것은 그 둘이지 밑선이 아니다.
        for (const i of owners) {
          const L = lines[i]!;
          expect(
            Math.abs(L.p[0]! - L.q[0]!),
            "이름은 세로선에 붙어야 한다",
          ).toBeLessThan(0.5);
        }
      }
    },
  );

  it("**모르는 관계·키는 던진다**", async () => {
    const bad = await renderFigureSpec({
      version: "elem-1",
      kind: "lineRelation",
      relation: "skew",
    });
    expect(bad.ok).toBe(false);
    const badKey = await renderFigureSpec({
      version: "elem-1",
      kind: "lineRelation",
      relation: "parallel",
      distanc: "10 cm",
    });
    expect(badKey.ok).toBe(false);
  });
});

/* ── ⑥ tiling — 조각과 목표 (2026-08-24, elem-figures) ────────────────────────
 *
 * 초4 2-6-4 「모양 만들기와 채우기」. 발문 셋이 전부 「조각이 **몇 개** 필요한가」다.
 *
 * 🔴 **채운 모습을 그리면 답이 샌다**(D-66 ⑺) — 세면 나온다. ③ 에서 `perpendicular` 을
 *    지운 것과 같은 자리다. 그래서 **조각 하나와 목표 하나만** 나란히 놓고 **크기 비**를
 *    발문의 값대로 그린다. 그림은 **견줄 것을 주지 답을 주지 않는다.**
 */
describe.skipIf(!hasEngine)("[초등 그림] tiling — 조각과 목표", () => {
  const polys = (svg: string) =>
    [...svg.matchAll(/<polygon points="([^"]+)"/g)].map((m) =>
      m[1]!.split(" ").map((q) => q.split(",").map(Number) as [number, number]),
    );
  const side1 = (p: [number, number][]) =>
    Math.hypot(p[0]![0] - p[1]![0], p[0]![1] - p[1]![1]);

  it.each([
    ["5 → 10", 5, 10, 0.5],
    ["6 → 18", 6, 18, 1 / 3],
    ["3 → 12", 3, 12, 0.25],
  ])("**크기 비가 발문의 값과 같다** — %s", async (_w, ps, ts, want) => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "tiling",
      piece: "eqTri",
      target: "eqTri",
      pieceSide: ps,
      targetSide: ts,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [a, b] = polys(r.svg);
    expect(a && b, "조각과 목표 둘").toBeTruthy();
    expect(side1(a!) / side1(b!), "조각/목표").toBeCloseTo(want, 2);
  });

  it("**채운 모습을 그리지 않는다** — 도형이 «둘»뿐이다 (답이 새면 안 된다)", async () => {
    // 조각 4개를 그리면 세면 답이다. 조각 하나 + 목표 하나 = **폴리곤 둘**이어야 한다.
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "tiling",
      piece: "eqTri",
      target: "eqTri",
      pieceSide: 5,
      targetSide: 10,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(polys(r.svg), "조각 하나 + 목표 하나").toHaveLength(2);
    // 내부 분할선도 없어야 한다 — 그것도 세면 답이다.
    expect((r.svg.match(/<line/g) ?? []).length, "분할선 없음").toBe(0);
  });

  it("**조각이 목표보다 크면 던진다** — 채울 수 없다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "tiling",
      piece: "eqTri",
      target: "eqTri",
      pieceSide: 10,
      targetSide: 5,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/채울 수 없/);
  });

  it("**서로 다른 도형도 된다** — 정삼각형으로 정육각형", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "tiling",
      piece: "eqTri",
      target: "hexagon",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p = polys(r.svg);
    expect(p, "둘").toHaveLength(2);
    expect(p[0]!.length, "조각은 삼각형").toBe(3);
    expect(p[1]!.length, "목표는 육각형").toBe(6);
  });
});

/* ── ① circleParts — 원과 그 부분 (2026-08-24, elem-figures) ─────────────────
 *
 * 초3 2-3-1(중심·지름·반지름) · 2-3-2(원의 성질) · 2-3-3(원 그리기).
 *
 * 🔴 **이 소단원은 「묻는 것」과 「그리는 것」이 같아지기 쉽다**(리드 경고).
 *    2-3-1 은 **용어 자체**를 묻고(「이은 선분을 무엇이라 하는가」 → 반지름),
 *    2-3-2·3 은 **묻는 값**을 적으면 답이다(「지름 10 인 원의 반지름은?」).
 *    그래서 엔진이 ㉠ 용어 라벨을 **아예 안 그리고** ㉡ 반지름·지름을 **둘 다 받으면 던진다**.
 */
describe.skipIf(!hasEngine)("[초등 그림] circleParts — 원과 그 부분", () => {
  const texts = (svg: string) => labelTexts(svg);

  it("**용어를 적지 않는다** — 그 용어가 2-3-1 의 답이다", async () => {
    for (const spec of [{ radius: "5 cm" }, { diameter: "10 cm" }, {}]) {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "circleParts",
        ...spec,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      for (const word of ["반지름", "지름", "원의 중심", "중심"]) {
        expect(
          r.svg,
          `«${word}» 이 지면에 있으면 2-3-1 의 답이다`,
        ).not.toContain(word);
      }
    }
  });

  it("**주어진 값만 적는다** — 둘 다 주면 던진다", async () => {
    const both = await renderFigureSpec({
      version: "elem-1",
      kind: "circleParts",
      radius: "5 cm",
      diameter: "10 cm",
    });
    expect(both.ok, "둘 다 적으면 답이 지면에 있다").toBe(false);
    // 하나씩은 된다 — 그리고 **적은 것만** 나온다.
    const onlyR = await renderFigureSpec({
      version: "elem-1",
      kind: "circleParts",
      radius: "5 cm",
    });
    expect(onlyR.ok).toBe(true);
    if (!onlyR.ok) return;
    expect(texts(onlyR.svg)).toEqual(["5 cm"]);
  });

  it("**지름은 중심을 지난다** — 좌표에서 잰다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "circleParts",
      diameter: "10 cm",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/.exec(r.svg)!;
    const [cx, cy, rad] = [Number(c[1]), Number(c[2]), Number(c[3])];
    const L =
      /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/.exec(
        r.svg,
      )!;
    const [x1, y1, x2, y2] = [1, 2, 3, 4].map((i) => Number(L[i]));
    // 지름의 중점이 원의 중심이어야 한다.
    expect(
      Math.hypot((x1! + x2!) / 2 - cx, (y1! + y2!) / 2 - cy),
      "중점=중심",
    ).toBeLessThan(0.5);
    // 그리고 그 길이가 반지름의 **두 배**여야 한다 — 그림이 값을 배반하지 않는다.
    expect(Math.hypot(x2! - x1!, y2! - y1!) / rad, "지름/반지름").toBeCloseTo(
      2,
      1,
    );
  });

  it("**중심에 점이 있다** — 무엇에서 잰 길이인지 보이게 (09 §4-16)", async () => {
    const on = await renderFigureSpec({
      version: "elem-1",
      kind: "circleParts",
      radius: "5 cm",
    });
    const off = await renderFigureSpec({
      version: "elem-1",
      kind: "circleParts",
      radius: "5 cm",
      center: false,
    });
    expect(on.ok && off.ok).toBe(true);
    if (!on.ok || !off.ok) return;
    expect((on.svg.match(/<circle/g) ?? []).length, "원 + 중심점").toBe(2);
    expect((off.svg.match(/<circle/g) ?? []).length, "원만").toBe(1);
  });

  /* 🔴 **`show` 는 「그린다」와 「적는다」를 갈랐다** (2026-08-24, 리드 지적).
   *
   * 그전에는 둘이 묶여 있어서 「용어·치수를 안 그린다」가 **공짜로** 지켜졌다 —
   * 선분을 그리는 유일한 길이 라벨을 주는 것이었기 때문이다. `show` 로 그것을 푼
   * 순간 **그 약속을 지킬 사람이 새로 필요해졌다.** 아래 셋이 그 사람이다.
   */
  it("**show 는 선분만 그린다** — 글자가 하나도 없어야 한다", async () => {
    for (const which of ["radius", "diameter"] as const) {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "circleParts",
        show: which,
      });
      expect(r.ok, which).toBe(true);
      if (!r.ok) return;
      // ㉠ 선분은 **그려진다** — 2-3-1 이 「이 선분」을 묻는다
      expect((r.svg.match(/<line/g) ?? []).length, `${which} 선분`).toBe(1);
      // ㉡ 그런데 글자는 **하나도 없다** — 용어도 치수도
      expect(texts(r.svg), `${which} — show 만 줬는데 글자가 있다`).toEqual([]);
    }
  });

  it("**show 와 라벨을 같이 주면 던진다** — 선분을 두 번 그릴 길이 없다", async () => {
    for (const [which, key] of [
      ["radius", "radius"],
      ["diameter", "diameter"],
    ] as const) {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "circleParts",
        show: which,
        [key]: "5 cm",
      });
      expect(r.ok, `${which} + ${key}`).toBe(false);
    }
  });

  it("**show 는 두 값만 받는다** — 모르는 값은 던진다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "circleParts",
      show: "chord",
    });
    expect(r.ok).toBe(false);
  });

  it("**치수는 measured() 다** — halo + 점선 (09 §4-16)", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "circleParts",
      radius: "5 cm",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // ⚠️ halo 는 **성질**로 센다 — 그 낱말은 halo 를 이루는 «방법» 하나일 뿐이다.
    //    2026-08-28 에 방법이 바뀌자(글자끼리 서로 지워서 두 벌로 갈랐다) 이 줄이
    //    빨개졌는데, halo 는 멀쩡히 걸려 있었다. 낱말을 세면 그 낱말이 바뀔 때 운다.
    expect(
      svgLabels(r.svg).some((l) => l.halo > 0),
      "halo 가 없다",
    ).toBe(true);
    expect(r.svg).toContain('stroke-dasharray="6 4"');
  });
});

/**
 * 전개도의 **접는 선** — 원장님 2026-08-27 (`J10504-A05-005`)
 *
 * 초5 「직육면체의 전개도」 교과서: **실선 = 자르는 선**(바깥 윤곽) ·
 * **점선 = 접는 선**(면과 면이 맞닿는 안쪽 변). 종전에는 면마다 닫힌 실선
 * `_rect`/`_poly` 를 그려 둘이 **같은 획**이었다 — 그림이 전개도가 아니었다.
 *
 * ⚠️ 이 시험은 「몇 개인가」로 잠근다. 접는 선 수는 **면 수 - 1**(신장나무)이라
 *    좌표를 안 옮겨 적고도 갈린다 — 하나를 빠뜨리거나 윤곽을 점선으로 만들면 빨개진다.
 *    좌표 단위의 전량 판정은 `python scripts/qa/probe-elem-net-fold.py` 가 한다(양성 6·음성 5).
 */
describe.skipIf(!hasEngine)(
  "[초등 그림] 전개도의 접는 선 (원장님 2026-08-27)",
  () => {
    const FOLD = /<line\b[^>]*stroke-dasharray="5 4"[^>]*\/>/g;

    it("netCuboid — 여섯 면이 맞닿는 다섯 변만 점선이고 윤곽은 실선이다", async () => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "netCuboid",
        w: 7,
        d: 4,
        h: 5,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      // 면 6장이 이루는 신장나무 = 접는 선 5개.
      expect(r.svg.match(FOLD) ?? []).toHaveLength(5);
      // 면은 **칠만** 한다 — 면마다 획이 있으면 안쪽 변과 윤곽을 못 가른다.
      expect(r.svg).not.toMatch(/<rect\b[^>]*stroke="#111111"/);
      // 윤곽은 **한 폴리라인**이고 점선이 아니다(변마다 그으면 모서리에 톱니가 남는다).
      const outline = r.svg.match(/<polyline\b[^>]*\/>/g) ?? [];
      expect(outline).toHaveLength(1);
      expect(outline[0]).not.toContain("stroke-dasharray");
    });

    it("prism(net) — 접는 선은 옆면 사이 n-1 개 + 두 밑면이 붙는 2 개다", async () => {
      for (const sides of [3, 4, 5, 6, 8]) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "prism",
          sides,
          h: 4,
          net: true,
        });
        expect(r.ok, `sides=${sides}`).toBe(true);
        if (!r.ok) return;
        expect(r.svg.match(FOLD) ?? [], `sides=${sides}`).toHaveLength(
          sides + 1,
        );
      }
    });

    /**
     * 🔴 접는 선이 **치수 지문**(`#000` + `6 4`)을 쓰면
     *    `scripts/qa/probe-dim-outside.py` 가 그것을 「치수」로 세고, 전개도 안쪽이라
     *    「치수가 도형 안에 있다」로 **거짓 결함이 쏟아진다.** 두 지문을 갈라 둔다.
     */
    it("접는 선은 치수 지문(#000 + '6 4')을 쓰지 않는다", async () => {
      for (const spec of [
        { version: "elem-1", kind: "netCuboid", w: 7, d: 4, h: 5 },
        { version: "elem-1", kind: "prism", sides: 5, h: 4, net: true },
      ]) {
        const r = await renderFigureSpec(spec);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        for (const line of r.svg.match(FOLD) ?? []) {
          // ⚠️ 굵기 하나로 가르면 안 된다. 종전에는 `stroke-width="1.4"` 를 금지했는데,
          //    도형 실선이 1.4 가 되자(원장님 확정 2026-08-28) **접는 선이 제 굵기를
          //    쓴 것만으로 빨개졌다** — 색도 파선도 치수와 다른데도. 굵기는 치수를
          //    가르는 성질이 아니다. 치수 지문은 `#000` + `6 4` **둘이 같이** 있는 것이다.
          expect(line).toContain('stroke="#111111"');
          expect(line).not.toContain('stroke="#000"');
          expect(
            /stroke="#000"/.test(line) && /stroke-dasharray="6 4"/.test(line),
            "치수 지문(#000 + '6 4')",
          ).toBe(false);
        }
      }
    });

    /**
     * 맞닿아야 할 두 면이 어긋나면 그 변은 「공유하는 변」으로 안 읽혀 **접는 선이
     * 조용히 윤곽이 된다.** 실측 2026-08-27: `<rect>` 의 `x` 와 `width` 가 따로
     * 반올림되어 전개도 40장 중 4장이 0.01px 어긋나 있었다.
     */
    it("맞닿는 면끼리 좌표가 정확히 만난다 — 폭은 반올림한 꼭짓점에서 뺀다", async () => {
      for (const [w, d, h] of [
        [10, 6, 2],
        [12, 7, 2],
        [10, 2, 4],
        [6, 7, 4],
      ]) {
        const r = await renderFigureSpec({
          version: "elem-1",
          kind: "netCuboid",
          w,
          d,
          h,
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        // ⚠️ **찍힌 자리수(소수 둘째)로 견준다.** JS 부동소수 합(`x + width`)을
        //    날것으로 비교하면 148.92000000000002 ≠ 148.92 라 시험이 제 산술 때문에
        //    빨개진다 — 지면에 나가는 것은 반올림된 값이다.
        const r2 = (v: number) => Math.round(v * 100) / 100;
        const edges = new Set<string>();
        for (const m of r.svg.matchAll(
          /<rect\b[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*width="([-\d.]+)"[^>]*height="([-\d.]+)"/g,
        )) {
          const [x, y, ww, hh] = m.slice(1, 5).map(Number);
          edges.add(`${r2(x)},${r2(y)}`);
          edges.add(`${r2(x + ww)},${r2(y + hh)}`);
        }
        // 어긋나면 「거의 같지만 다른」 좌표 짝이 생긴다(실측: 0.01 차이).
        const pts = [...edges].map((s) => s.split(",").map(Number));
        for (const [ax, ay] of pts) {
          for (const [bx, by] of pts) {
            const near = Math.abs(ax - bx) < 0.06 && Math.abs(ay - by) < 0.06;
            if (near && (ax !== bx || ay !== by)) {
              expect.fail(
                `netCuboid ${w}/${d}/${h} — (${ax},${ay}) 와 (${bx},${by}) 가 어긋났다`,
              );
            }
          }
        }
      }
    });
  },
);
