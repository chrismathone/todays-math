// @vitest-environment node
/**
 * 🔴 RED → 🟢 — **그래프(graph-1)의 꺾인점 점과 한글 섞인 라벨** (2026-09-18 운영 재작도).
 *
 * 원장님이 운영에서 속력 그래프(x 0~180 · y 0~4)를 다시 그렸더니 꺾인점마다 **세로로 긴 타원**이
 * 섰고, 가로축 라벨이 `$x$(초)` 로 **달러 기호째** 찍혔다(원본은 작은 검은 점 · `x(초)`).
 *
 * 원인은 둘 다 엔진이다 — 모델 탓이 아니다(같은 그림을 Opus·Codex astra 로도 재 봤다).
 * 1. graph-1 에 **점을 찍는 칸이 없었다.** 있는 것은 `circles`(데이터 단위 반지름)뿐이라,
 *    가로·세로 눈금이 45배 다른 그래프에서 원이 타원으로 늘어난다. Gemini 는 그것으로 점을
 *    흉내 냈고, Opus·astra 는 점을 **빼먹어** 셋 다 원본 대조에서 떨어졌다.
 * 2. 한글이 든 라벨은 TeX 글꼴에 글리프가 없어 조판을 건너뛰고(`typesetLabel` 의 CJK 거름)
 *    엔진 `<text>` 가 **원문 그대로** 나간다 — `$` 까지.
 *
 * 무엇을 잠그나
 * - `points` 는 **화면 픽셀 반지름의 진짜 원**이다 — 축 눈금이 달라도 늘어나지 않는다.
 * - 속 빈 점(`open`)은 흰 속 + 검은 테두리.
 * - 모르는 필드·범위 밖 반지름은 조용히 그리지 않고 **거절**한다(다른 graph-1 칸과 같다).
 * - 한글이 섞인 라벨의 `$…$` 는 벗겨 글자만 남긴다. 한글 없는 수식 라벨은 그대로 조판에 간다.
 * - 모델이 받는 계약에 `points` 가 실린다(없으면 또 원으로 흉내 낸다).
 */
import { describe, expect, it, vi } from "vitest";
import catalog from "../../../scripts/figure/engine-catalog.json";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

vi.mock("server-only", () => ({}));

const speed = {
  version: "graph-1",
  xRange: [-20, 210],
  yRange: [-1, 5],
  width: 600,
  height: 300,
  axes: false,
  segments: [
    { from: [0, 0], to: [30, 1] },
    { from: [30, 1], to: [60, 4] },
  ],
};
const render = (spec: object) =>
  renderFigureSpec(spec, { typeset: false, strict: true });
const circles = (svg: string) =>
  [...svg.matchAll(/<circle\b[^>]*>/g)].map(([tag]) => tag);
const num = (tag: string, name: string) =>
  Number(new RegExp(`\\b${name}="([-\\d.]+)"`).exec(tag)?.[1]);

describe("graph-1 꺾인점 점", () => {
  it("축 눈금이 달라도 점은 늘어나지 않는 원이다", async () => {
    const result = await render({
      ...speed,
      points: [{ at: [0, 0] }, { at: [30, 1] }, { at: [60, 4], radius: 4 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.svg).not.toContain("<ellipse");
    const dots = circles(result.svg);
    expect(dots).toHaveLength(3);
    expect(dots.map((tag) => num(tag, "r"))).toEqual([3, 3, 4]);
    // 자리는 선분 끝과 같은 화면 좌표 — (30,1) 은 (0,0) 보다 오른쪽·위
    expect(num(dots[1], "cx")).toBeGreaterThan(num(dots[0], "cx"));
    expect(num(dots[1], "cy")).toBeLessThan(num(dots[0], "cy"));
    for (const tag of dots) expect(tag).toMatch(/fill="#(?:000|111)"/);
  });

  it("속 빈 점은 흰 속에 검은 테두리", async () => {
    const result = await render({
      ...speed,
      points: [{ at: [30, 1], open: true }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [dot] = circles(result.svg);
    expect(dot).toMatch(/fill="#fff(?:fff)?"/);
    expect(dot).toMatch(/stroke="#111"/);
  });

  it.each([
    [{ at: [30, 1], url: "https://example.com" }],
    [{ at: [30, 1], radius: 40 }],
    [{ at: [30, 1], radius: 0 }],
    [{ at: [30, 1], open: "yes" }],
    [{ at: [30] }],
  ])("모르는 필드·범위 밖 값은 거절한다 %#", async (point) => {
    const result = await render({ ...speed, points: [point] });
    expect(result.ok).toBe(false);
  });

  it("모델이 받는 계약에 점 칸이 실리고, 원은 점 대용이 아니라고 적혀 있다", () => {
    const fields = catalog["graph-1"].fields as Record<string, string>;
    expect(fields.points).toMatch(/radius/);
    expect(fields.circles).toMatch(/points/);
  });
});

describe("graph-1 한글 섞인 라벨", () => {
  it("`$x$(초)` 는 달러 없이 `x(초)` 로 찍힌다", async () => {
    const result = await render({
      ...speed,
      labels: [{ at: [200, 0], text: "$x$(초)", dy: 22 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.svg).toContain("x(초)");
    expect(result.svg).not.toContain("$");
  });

  it("한글 없는 수식 라벨은 그대로 조판에 넘긴다", async () => {
    const result = await render({
      ...speed,
      labels: [{ at: [0, 5], text: "$y(\\mathrm{m/sec})$" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.svg).toContain("$y(\\mathrm{m/sec})$");
  });
});
