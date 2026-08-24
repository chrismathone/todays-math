/**
 * 6B 36유형 미리보기 — 지면에 무엇이 나가는지, 그리고 그림 다섯 유형이
 * **실제로 어떻게 그려지는지** 파일로 남긴다(스크롤백은 창이 닫히면
 * 사라진다 — 물결 계약 「끝내는 조건」).
 *
 *   npx tsx scripts/qa/preview-m1-geo2.ts
 *
 * 산출: docs/planning/tracks/wave6-6b-preview/index.html
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_GEO2 } from "../../src/lib/middle/m1Geo2";

const SEEDS = [20260824, 7, 4242];
const OUT_DIR = path.join(
  process.cwd(),
  "docs",
  "planning",
  "tracks",
  "wave6-6b-preview",
);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main(): Promise<void> {
  const blocks: string[] = [];
  let minor = "";
  let figCount = 0;
  let figOk = 0;

  for (const e of M1_GEO2) {
    if (e.rpmMinor !== minor) {
      minor = e.rpmMinor;
      blocks.push(`<h2>${esc(minor)}</h2>`);
    }
    blocks.push(
      `<h3>${e.rpmType} ${esc(e.rpmTitle)} <span class="sec">${esc(e.unitSection)}</span></h3>`,
    );
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      let svg = "";
      if (p.figureSpec) {
        figCount += 1;
        const r = await renderFigureSpec(p.figureSpec);
        if (r.ok) {
          figOk += 1;
          svg = `<div class="fig">${r.svg}</div>`;
        } else {
          svg = `<p class="err">그림 실패: ${esc(r.error)}</p>`;
        }
      }
      blocks.push(
        `<div class="item"><div class="txt">` +
          `<p><b>문제</b> (${p.difficulty}) ${esc(p.content).replace(/\n/g, "<br/>")}</p>` +
          `<p><b>답</b> ${esc(p.answer)}</p>` +
          `<p><b>풀이</b> ${esc(p.solution).replace(/\n/g, "<br/>")}</p>` +
          `</div>${svg}</div>`,
      );
    }
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<title>6B 미리보기 — 작도와 합동 14 + 다각형 22</title>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<style>
body{font-family:'Malgun Gothic',sans-serif;max-width:1000px;margin:24px auto;padding:0 16px}
h1{font-size:19px} h2{font-size:16px;margin-top:30px;color:#333;border-bottom:2px solid #ddd}
h3{font-size:13px;margin-top:16px;color:#555}
.sec{color:#999;font-weight:normal;margin-left:8px}
.item{display:flex;gap:14px;border:1px solid #eee;border-radius:8px;padding:10px;margin:6px 0}
.txt{flex:1 1 auto;min-width:0;font-size:12.5px;line-height:1.5}
.txt p{margin:4px 0}
.fig{flex:0 0 260px;width:260px}
.fig svg{width:260px;height:auto;display:block;border:1px solid #eee}
.err{color:#b00020;font-size:12px}
</style></head><body>
<h1>6B 미리보기 — 작도와 합동 14 + 다각형(남은 22) = 36유형</h1>
<p style="font-size:13px;color:#666">유형마다 씨앗 ${SEEDS.length}개. 그림 ${figCount}건 시도 ·
성공 ${figOk}건.</p>
${blocks.join("\n")}
<script>renderMathInElement(document.body, {delimiters:[{left:"$",right:"$",display:false}]});</script>
</body></html>`;
  await fs.writeFile(path.join(OUT_DIR, "index.html"), html, "utf8");
  console.log(
    `→ ${path.join(OUT_DIR, "index.html")}  (그림 시도 ${figCount} · 성공 ${figOk})`,
  );
  if (figCount > figOk) process.exitCode = 1;
}

main();
