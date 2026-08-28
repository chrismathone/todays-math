/**
 * **라벨 거리 시안** — 같은 그림을 여러 거리로 그려 나란히 놓는다 (D-07).
 *
 *   npx tsx scripts/qa/build-label-distance-mockups.ts [나갈.html]
 *
 * RPM 정본은 꼭짓점에서 글자 중심까지 **글자 크기의 0.64배**인데 우리는 1.04배다
 * (`rpm-engine-gaps.md` ②). **1.6배 멀다.** 좁히면 지면 인상이 눈에 띄게 달라지므로
 * 원장님 확정 없이 못 바꾼다(절대 규칙 1 · D-07). 그래서 눈으로 고르시게 낸다.
 *
 * 거리는 스펙의 `style.label_offset` 으로 준다 — 엔진 상수를 건드리지 않는다.
 *
 * ⚠️ `.tmp-orca/` 에 둔다. 눈으로 보려는 물건이고 커밋 대상이 아니다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";

const outPath =
  process.argv[2] ?? path.join(".tmp-orca", "label-distance.html");

/**
 * 기본값 21 에서 글자 중심까지가 **1.04배**로 나온다(fs 24 실측).
 * RPM 의 0.64배가 되려면 대략 11 이다 — 그 사이를 나눠 낸다.
 */
const OFFSETS = [
  { px: 21, label: "지금 (1.04배)" },
  { px: 17, label: "가운데 (0.87배)" },
  { px: 14, label: "가까이 (0.75배)" },
  { px: 11, label: "RPM 만큼 (0.64배)" },
];

type XY = [number, number];

function regular(n: number, cx: number, cy: number, r: number): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = (Math.PI * 2 * i) / n - Math.PI / 2;
    out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return out;
}

const NAMES = "ABCDEFGHI";

function polygon(n: number, diagonals: boolean): Record<string, unknown> {
  const pts = regular(n, 110, 110, 88);
  const points: Record<string, XY> = {};
  const segments: Record<string, [string, string]> = {};
  const labels: Record<string, string> = {};
  for (let i = 0; i < n; i += 1) {
    points[NAMES[i]!] = pts[i]!;
    labels[NAMES[i]!] = NAMES[i]!;
    segments[`s${i}`] = [NAMES[i]!, NAMES[(i + 1) % n]!];
  }
  if (diagonals) {
    for (let i = 2; i < n - 1; i += 1)
      segments[`d${i}`] = [NAMES[0]!, NAMES[i]!];
  }
  return { version: 2, points, segments, labels };
}

const FIGURES: { name: string; spec: Record<string, unknown> }[] = [
  {
    name: "삼각형",
    spec: {
      version: 2,
      points: { A: [110, 30], B: [30, 180], C: [190, 180] },
      segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
      labels: { A: "A", B: "B", C: "C" },
    },
  },
  {
    name: "평행사변형 (RPM 이 이 모양을 어떻게 놓는지 실측했다)",
    spec: {
      version: 2,
      points: { A: [50, 30], D: [200, 30], B: [20, 170], C: [170, 170] },
      segments: {
        AB: ["A", "B"],
        BC: ["B", "C"],
        CD: ["C", "D"],
        DA: ["D", "A"],
      },
      labels: { A: "A", B: "B", C: "C", D: "D" },
    },
  },
  { name: "오각형과 대각선", spec: polygon(5, true) },
  { name: "구각형과 대각선", spec: polygon(9, true) },
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main(): Promise<void> {
  const blocks: string[] = [];
  for (const fig of FIGURES) {
    const cells: string[] = [];
    for (const o of OFFSETS) {
      const spec = {
        ...fig.spec,
        style: { ...(fig.spec.style ?? {}), label_offset: o.px },
      };
      const r = await renderFigureSpec(spec);
      cells.push(
        `<figure><figcaption>${esc(o.label)}<br><small>label_offset ${o.px}</small></figcaption>` +
          (r.ok ? r.svg : `<p class="bad">못 그렸다</p>`) +
          `</figure>`,
      );
    }
    blocks.push(
      `<section><h3>${esc(fig.name)}</h3><div class="row">${cells.join("")}</div></section>`,
    );
  }

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>라벨 거리 시안</title>
<style>
  body { font: 14px/1.7 system-ui, sans-serif; margin: 28px; color: #111; }
  h1 { font-size: 19px; }
  p.m { color: #555; max-width: 62em; }
  section { border-top: 1px solid #ddd; padding: 18px 0; }
  h3 { font-size: 14px; margin: 0 0 10px; }
  .row { display: flex; gap: 30px; flex-wrap: wrap; align-items: flex-start; }
  figure { margin: 0; }
  figcaption { font-size: 11px; color: #666; margin-bottom: 6px; }
  svg { border: 1px dashed #e8e8e8; width: 240px; height: auto; }
  .bad { color: #b00; }
</style></head><body>
<h1>꼭짓점 이름표를 얼마나 띄울까 — 시안 넷</h1>
<p class="m">RPM 정본은 꼭짓점에서 글자 중심까지 <b>글자 크기의 0.64배</b>(6권·라벨
13,591개 실측)인데 우리는 <b>1.04배</b>다 — <b>1.6배 멀다.</b> 방향은 이미 RPM 규칙을
따르게 고쳤고(바깥 + 수평 당김), 남은 것은 거리다. 지면 인상을 정하는 값이라
원장님 확정 없이 바꾸지 않는다.</p>
<p class="m">※ 그림은 인쇄 폭(240px)에 맞춰 보인다 — 종이에서 보이는 비율과 같다.</p>
${blocks.join("\n")}
</body></html>
`;
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");
  console.log(
    `시안 ${FIGURES.length}종 × 거리 ${OFFSETS.length}가지 → ${outPath}`,
  );
}

void main();
