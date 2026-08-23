/**
 * 통계 kind(`table`·`histogram`·`freqPolygon`) 실증 렌더 — **지면과 같은 크기로** 찍는다.
 *
 *   node scripts/qa/probe-stat-kinds.mjs [--out=C:/tmp] [--only=hist]
 *
 * 왜 이 도구가 따로 있나: 「SVG 가 나온다」와 「지면에서 읽힌다」는 다른 질문이다.
 * viewBox 폭 하나로 지면 등급(140/240/360px)이 갈리므로, **그 등급을 실제로 적용해**
 * 본문 글자(12.5px) 옆에 놓고 봐야 이름표가 발문보다 작아지는 것을 알 수 있다
 * (CLAUDE.md 2026-08-23). 그래서 `figureSvgFrame.ts` 와 **같은 문턱**을 여기서 쓰고,
 * 두 곳이 갈라지지 않도록 그 파일에서 숫자를 **읽어 온다** — 손으로 옮겨 적으면
 * 한쪽만 고쳐진다.
 *
 * 각 그림 아래에 실제 viewBox·등급·이름표 실측 px 을 적는다. 눈으로 보는 판정이
 * 목적이므로 아무것도 안 바꾸고 PNG 만 남긴다.
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const arg = (k, d) =>
  process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const OUT = arg("out", "C:/tmp");
const ONLY = arg("only", "");

// 문턱은 제품 파일이 정본이다 — 여기서 다시 적지 않는다.
const frameSrc = readFileSync("src/lib/figure/figureSvgFrame.ts", "utf-8");
const num = (name) => {
  const m = new RegExp(`export const ${name} = (\\d+);`).exec(frameSrc);
  if (!m) throw new Error(`figureSvgFrame.ts 에서 ${name} 을 못 읽었다`);
  return Number(m[1]);
};
const GRADE = [
  { vb: num("FIGURE_SVG_COMPACT_VIEWBOX"), px: num("FIGURE_SVG_COMPACT_MAX_PX"), name: "compact" },
  { vb: num("FIGURE_SVG_MID_VIEWBOX"), px: num("FIGURE_SVG_MID_MAX_PX"), name: "mid" },
  { vb: num("FIGURE_SVG_PAIR_VIEWBOX"), px: num("FIGURE_SVG_WIDE_MAX_PX"), name: "wide" },
  { vb: Infinity, px: num("FIGURE_SVG_PAIR_MAX_PX"), name: "pair" },
];
const gradeOf = (w) => GRADE.find((g) => w <= g.vb);

const py = (spec) =>
  new Promise((resolve) => {
    const child = spawn(process.env.PYTHON_BIN ?? "python", ["scripts/figure/render_spec.py"], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    let out = "";
    child.stdout.setEncoding("utf-8");
    child.stdout.on("data", (c) => (out += c));
    child.on("close", () => resolve(JSON.parse(out)));
    child.stdin.end(JSON.stringify(spec));
  });

/** 실증 표본 — 시트마다 한 장. RPM 1-2 원본 지면의 **구조만** 따랐다(수치는 새로 만든 것). */
const SHEETS = {
  table: [
    ["도수분포표 (8자 계급 라벨)", {
      version: "elem-1", kind: "table",
      headers: ["기록(m)", "도수(명)"],
      rows: [["10이상~20미만", "5"], ["20 ~ 30", "9"], ["30 ~ 40", "6"], ["40 ~ 50", "2"], ["합계", "22"]],
    }],
    ["상대도수 분포표 (3열)", {
      version: "elem-1", kind: "table",
      headers: ["나이(세)", "도수", "상대도수"],
      rows: [["15 ~ 20", "12", "0.06"], ["20 ~ 25", "32", "0.16"], ["25 ~ 30", "68", "0.34"], ["합계", "200", "1"]],
    }],
    ["줄기와 잎 (잎 왼쪽 정렬)", {
      version: "elem-1", kind: "table",
      headers: ["줄기", "잎"],
      rows: [["1", "2 5 7"], ["2", "0 1 3 6 8"], ["3", "4 4 9"], ["4", "1"]],
      align: ["center", "left"],
    }],
    ["옛 규칙 그대로인 표 (폭 불변 확인)", {
      version: "elem-1", kind: "table",
      headers: ["요일", "횟수"], rows: [["월", "3"], ["화", "5"], ["수", "4"]],
    }],
  ],
  hist: [
    ["히스토그램 — 틈 없음·경계값이 눈금", {
      version: "elem-1", kind: "histogram",
      classes: [10, 15, 20, 25, 30, 35, 40], values: [2, 3, 6, 11, 7, 3],
      yLabel: "(명)", xLabel: "(m)", total: 32,
    }],
    ["일부가 보이지 않는 히스토그램 (막대 숨김)", {
      version: "elem-1", kind: "histogram",
      classes: [5, 13, 21, 29, 37, 45], values: [3, 10, 8, 6, 3],
      yLabel: "(명)", xLabel: "(m)", total: 30, hidden: [3],
    }],
    ["두 집단 히스토그램 (2계열)", {
      version: "elem-1", kind: "histogram",
      classes: [0, 2, 4, 6, 8, 10], values: [2, 5, 9, 6, 3], label: "A반",
      series2: { values: [4, 7, 5, 4, 5], label: "B반" },
      yLabel: "(명)", xLabel: "(회)",
    }],
    ["상대도수 히스토그램 (소수 눈금)", {
      version: "elem-1", kind: "histogram",
      classes: [15, 20, 25, 30, 35, 40], values: [0.06, 0.16, 0.34, 0.26, 0.18],
      yLabel: "(비율)", xLabel: "(세)", total: 1,
    }],
  ],
  poly: [
    ["도수분포다각형 — 양끝 0 으로 닫힌다", {
      version: "elem-1", kind: "freqPolygon",
      classes: [2, 4, 6, 8, 10, 12, 14], values: [4, 6, 12, 10, 4, 4],
      yLabel: "(명)", xLabel: "(권)", total: 40,
    }],
    ["히스토그램 위에 겹쳐 그리기 (넓이가 같다)", {
      version: "elem-1", kind: "freqPolygon", bars: true,
      classes: [50, 55, 60, 65, 70], values: [3, 10, 8, 6],
      yLabel: "(개)", xLabel: "(g)", total: 27,
    }],
    ["두 집단 비교 (2계열)", {
      version: "elem-1", kind: "freqPolygon",
      classes: [2, 4, 6, 8, 10, 12], values: [2, 5, 9, 6, 3], label: "A반",
      series2: { values: [4, 7, 5, 4, 5], label: "B반" },
      yLabel: "(명)", xLabel: "(회)",
    }],
    ["눈금 한 칸이 발문에 있는 유형 (yStep)", {
      version: "elem-1", kind: "freqPolygon",
      classes: [40, 50, 60, 70, 80, 90], values: [10, 25, 40, 20, 5],
      yStep: 10, yMax: 40, yLabel: "(명)", xLabel: "(점)", total: 100,
    }],
  ],
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
const report = [];

for (const [key, items] of Object.entries(SHEETS)) {
  if (ONLY && key !== ONLY) continue;
  const cards = [];
  for (const [title, spec] of items) {
    const r = await py(spec);
    if (!r.svg) {
      cards.push(`<div class="card"><h3>${title}</h3><p class="err">${r.error}</p></div>`);
      report.push({ 시트: key, 제목: title, 결과: `던짐: ${r.error}` });
      continue;
    }
    const w = Number(/viewBox="0 0 ([\d.]+)/.exec(r.svg)[1]);
    const g = gradeOf(w);
    cards.push(
      `<div class="card"><h3>${title}</h3>` +
        `<div class="row"><div class="fig" style="max-width:${g.px}px" data-w="${w}">${r.svg}</div>` +
        `<p class="body">본문 글자는 이 크기다. 그림 속 이름표가 이보다 작으면 지면에서 안 읽힌다. ` +
        `오른쪽은 문항 열 폭(364px)과 같은 자리다.</p></div>` +
        `<p class="meta">viewBox ${w} · 등급 ${g.name} · 화면 ${g.px}px</p></div>`,
    );
    report.push({ 시트: key, 제목: title, viewBox: w, 등급: g.name, 화면px: g.px });
  }
  const html =
    `<style>body{margin:0;padding:20px;background:#fff;font-family:Batang,serif;width:900px}` +
    `.card{margin:0 0 26px;padding:14px 16px;border:1px solid #ddd;border-radius:6px}` +
    `h3{font-size:15px;margin:0 0 10px;font-weight:700}` +
    `.row{display:flex;gap:16px;align-items:flex-start}` +
    `.fig svg{width:100%;height:auto;display:block}` +
    `.body{font-size:12.5px;line-height:1.625;margin:0;width:364px}` +
    `.meta{font-size:11px;color:#666;margin:8px 0 0}.err{color:#b00;font-size:12px}` +
    `</style>${cards.join("")}`;
  await page.setContent(html);
  const file = path.join(OUT, `wave3-stat-${key}.png`);
  await page.locator("body").screenshot({ path: file });
  console.log(`남김: ${file}`);
}

await browser.close();
writeFileSync(path.join(OUT, "wave3-stat-report.json"), JSON.stringify(report, null, 2), "utf-8");
console.log(`남김: ${path.join(OUT, "wave3-stat-report.json")}`);
