/**
 * 6A-중1도형 — 그림을 붙인 5자리(기본 도형 10 · 위치 관계 11·12·13·10)를 실제로
 * 렌더해 **파일로** 남긴다(물결 6 계약 「끝내는 조건」: 미리보기를 눈으로 본
 * 근거를 파일로). `renderFigureSpec` 이 부르는 것과 같은 엔진(`render_spec.py`)이다.
 *
 *   npx tsx scripts/qa/render-m1-geo1-figures.ts
 *
 * 산출: docs/planning/tracks/wave6a-m1geo1-sheet/index.html
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";

const OUT_DIR = path.join(
  process.cwd(),
  "docs",
  "planning",
  "tracks",
  "wave6a-m1geo1-sheet",
);

const FIGURED_KEYS = [
  "1-2|기본 도형|10",
  "1-2|위치 관계|11",
  "1-2|위치 관계|12",
  "1-2|위치 관계|13",
  "1-2|위치 관계|10",
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main(): Promise<void> {
  const blocks: string[] = [];
  let drew = 0;
  let threw = 0;
  for (const key of FIGURED_KEYS) {
    const p = generateMiddleProblem(key, 20260824);
    const r = p.figureSpec
      ? await renderFigureSpec(p.figureSpec)
      : { ok: false as const, error: "figureSpec 없음" };
    const ok = r.ok;
    if (ok) drew += 1;
    else threw += 1;
    const body = ok
      ? r.svg
      : `<p class="err">던짐: ${esc("error" in r ? r.error : "")}</p>`;
    blocks.push(
      `<div class="card"><div class="t">${esc(key)} ${esc(p.rpmTitle)}</div>` +
        `<div class="q">${esc(p.content)}</div>` +
        `${body}</div>`,
    );
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<title>6A-중1도형 그림 렌더 확인</title><style>
body{font-family:'Malgun Gothic',sans-serif;max-width:900px;margin:24px auto;padding:0 16px}
h1{font-size:19px}
.card{display:inline-block;border:1px solid #ddd;border-radius:8px;padding:10px;
margin:8px;vertical-align:top;width:280px}
.t{font-size:12px;color:#555;margin-bottom:6px;font-weight:bold}
.q{font-size:12px;color:#333;margin-bottom:8px;white-space:pre-wrap}
.card svg{max-width:250px;height:auto}
.err{color:#b00020;font-size:12px;margin:0}
</style></head><body>
<h1>6A-중1도형 그림 렌더 확인 — 그림 ${drew} · 던짐 ${threw}</h1>
<p style="font-size:13px;color:#666">그림을 붙인 5자리(맞꼭지각 1 · 평행선 4)를 실제로
그려서 눈으로 본 근거다. 씨앗과 무관한 고정 스펙이라 발문만 문항마다 다르다.</p>
${blocks.join("")}
</body></html>`;
  writeFileSync(path.join(OUT_DIR, "index.html"), html, "utf-8");
  console.log(
    `→ ${path.join(OUT_DIR, "index.html")}  (그림 ${drew} · 던짐 ${threw})`,
  );
  if (threw) process.exit(1);
}

main();
