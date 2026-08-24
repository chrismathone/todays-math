/**
 * 5B 그림 여덟 유형을 **실제 엔진으로 그려** 한 장에 늘어놓는다.
 *
 *   npx tsx scripts/qa/figures-m1-prop.ts            # → qa/m1-prop-figures.html
 *   node scripts/qa/shot-m3-angle-apply.mjs \
 *        --html qa/m1-prop-figures.html --out qa/m1-prop-sheet --per 12
 *
 * 렌더가 **성공한 것**과 지면에서 **읽히는 것**은 다른 질문이다(라벨 겹침·안내선
 * 뭉침·가지가 축에 붙는 것은 전부 「렌더 성공」으로 남는다). 그래서 눈으로 볼
 * 물건을 파일로 남긴다 — 스크롤백은 창이 닫히면 사라진다.
 *
 * 찍는 틀(`<figure>` 하나에 그림 하나)은 4D 의 접촉 시트 스크립트가 읽는 그대로다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_PROP } from "../../src/lib/middle/m1Prop";

const SEEDS = [20260824, 7, 4242];
const OUT = path.resolve(process.cwd(), "qa", "m1-prop-figures.html");

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * **왜 「좌표와 그래프」 07·08·09·11 에는 그림을 안 붙였나** — 근거를 같이 찍는다.
 *
 * 「안 된다」를 글로만 적으면 다음 사람이 다시 시도한다. 그래서 실제로 그려서
 * 무엇이 나오는지 남긴다: ㉠ 이동거리 그래프를 `linearGraph` 로 그리면 **시각이
 * 음수인 자리까지 직선이 뻗는다**(렌더는 성공한다 — 그게 위험한 점이다),
 * ㉡ 꺾은선(선분 둘)을 담을 문법이 아예 없어 `lines` 로는 못 적는다.
 */
const REJECTED: { why: string; spec: Record<string, unknown> }[] = [
  {
    why:
      "㉠ 이동거리 그래프를 linearGraph 로 — 렌더는 **성공**하지만 " +
      "$x<0$(시각이 음수)인 자리까지 직선이 그려진다",
    spec: {
      version: "elem-1",
      kind: "linearGraph",
      lines: [{ slope: 1.5, yIntercept: 0 }],
      xRange: [-1, 6],
      yRange: [-1, 8],
      marks: [[4, 6]],
    },
  },
  {
    why: "㉡ 꺾은선을 담을 문법이 없다 — `segments` 는 허용 키가 아니라 **던진다**",
    spec: {
      version: "elem-1",
      kind: "linearGraph",
      segments: [
        [
          [0, 0],
          [3, 4],
        ],
        [
          [3, 4],
          [6, 4],
        ],
      ],
      xRange: [-1, 7],
      yRange: [-1, 7],
    },
  },
];

async function main(): Promise<void> {
  const parts: string[] = [];
  let drawn = 0;
  let failed = 0;
  for (const e of M1_PROP) {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      if (!p.figureSpec) continue;
      const r = await renderFigureSpec(p.figureSpec);
      const cap = `${e.rpmMinor.slice(0, 2)} ${e.rpmType} · seed ${seed}`;
      if (r.ok) {
        drawn += 1;
        parts.push(
          `<figure><div class="fig">${r.svg}</div>` +
            `<figcaption>${esc(cap)}<br>${esc(p.answer)}</figcaption></figure>`,
        );
      } else {
        failed += 1;
        parts.push(
          `<figure><div class="fig"><b>THROW</b></div>` +
            `<figcaption>${esc(cap)}<br>${esc(r.error)}</figcaption></figure>`,
        );
      }
    }
  }
  for (const r of REJECTED) {
    const out = await renderFigureSpec(r.spec);
    parts.push(
      `<figure><div class="fig">${out.ok ? out.svg : "<b>THROW</b>"}</div>` +
        `<figcaption><b>안 쓴 까닭</b><br>${esc(r.why)}` +
        `${out.ok ? "" : `<br>${esc(out.error)}`}</figcaption></figure>`,
    );
  }
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    `<!doctype html><meta charset="utf-8"><title>5B 그림</title>` +
      `<style>body{font-family:system-ui;margin:12px;background:#fff}` +
      `figure{display:inline-block;width:300px;margin:0 8px 16px 0;vertical-align:top}` +
      `figcaption{font-size:11px;color:#555}.fig svg{width:250px;height:auto;` +
      `border:1px solid #eee}</style>${parts.join("\n")}`,
    "utf8",
  );
  console.log(`그림 ${drawn}장 · 던짐 ${failed}건 → ${OUT}`);
  if (failed > 0) process.exitCode = 1;
}

void main();
