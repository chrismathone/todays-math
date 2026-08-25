/**
 * 그림 잉크 판정기 — **라벨이 선을 덮는가 · 그림이 잘리는가**를 픽셀로 잰다.
 *
 *     node scripts/qa/probe-figure-ink.mjs <svg 디렉터리|파일> [--json=<경로>] [--scale=2]
 *     node scripts/qa/probe-figure-ink.mjs --selftest
 *
 * 🔴 **규칙을 새로 짓지 않았다.** 아래 다섯은 엔진
 *    (`vendor/figure-engine/core/figure_svg.py` 의 `lint_svg`)이 이미 적어 둔 것이고,
 *    그 근거가 **원장님 지시**다(2026-08-12·13, 그 docstring 이 인용한다):
 *
 *      「이걸 왜 완성되었다고 하나」 · 「아주 철저히 쪼으란 말야」
 *      「선위에 겹쳐서 배경처리해버리면 도형 읽는데 애로사항 있음」
 *
 *    그런데 `lint_svg` 는 **우리 저장소에서 돌 수가 없다** — `core.figure_generator`
 *    (resvg 래스터화)를 부르는데 vendor 에는 네 모듈만 들어와 있다(09 §0).
 *    그래서 규칙은 그대로 두고 **래스터화만 크로미엄으로** 옮겼다.
 *    ⚠️ 덤으로 「지금 화면에 나가는 그 렌더러」로 재게 됐다 — resvg 보다 이쪽이 옳다.
 *
 * | 규칙 | 무엇을 세나 | lint_svg |
 * |---|---|---|
 * | `clip`     | viewBox **밖** 잉크 | 1 |
 * | `onLine`   | halo 없는 글자가 선 잉크와 겹침 | 2·5 |
 * | `onLabel`  | 글자끼리 겹침 | 3 |
 * | `erased`   | 흰 halo 가 **실선**을 지움 — 점선은 제 치수선이라 뺀다 | 7 |
 * | `floating` | 선에서 8px 넘게 떨어진 맨 길이 라벨 | 4 |
 *
 * 「참」은 **그린 픽셀**에서 온다 — 스펙·상수를 안 본다(제품 상수로 정답을 정하면
 * 제품이 틀릴수록 점수가 오른다, CLAUDE.md 2026-08-18).
 *
 * `--selftest` 는 양성 5 · 음성 4 를 자기 안에서 만들어 대 본다. 양성만 대면
 * 재현율만 재고 **지어냄이 구조적으로 0**이 된다(CLAUDE.md 2026-08-20).
 */
import { chromium } from "playwright";
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";

/** 안티앨리어싱 허용 픽셀 (scale=2 기준, lint_svg 와 같은 값). */
export const TOL = 6;
/** viewBox 밖을 보려고 두르는 여백(svg 단위). */
const PAD = 14;
/** 「맨 길이 라벨이 선 근처인가」의 근처 (svg 단위, lint_svg 4 와 같은 값). */
const NEAR_LINE = 8;

const TEXT_RE = /<text\b[^>]*>[\s\S]*?<\/text>/g;
const VIEWBOX_RE = /viewBox="0\s+0\s+([\d.]+)\s+([\d.]+)"/;
/** 길이 표기 — 단위가 붙은 글자만 「치수」로 센다. */
const LENGTH_RE = /\d\s*(cm|mm|m|km)\b/;

/** 진짜 halo 인가 — lint_svg 의 `has_real_halo` 를 그대로 옮겼다. */
export function hasRealHalo(element) {
  const paint = /paint-order="([^"]+)"/.exec(element);
  const stroke = /stroke="([^"]+)"/.exec(element);
  const width = /stroke-width="([\d.]+)"/.exec(element);
  const font = /font-size="([\d.]+)"/.exec(element);
  if (!paint || !stroke || !width || !font) return false;
  const order = paint[1].trim().toLowerCase().split(/\s+/);
  const color = stroke[1].trim().toLowerCase();
  const w = Number(width[1]);
  const fs = Number(font[1]);
  if (!Number.isFinite(w) || !Number.isFinite(fs)) return false;
  return (
    order[0] === "stroke" &&
    ["white", "#fff", "#ffffff", "#ffffffff"].includes(color) &&
    w >= 3 &&
    w <= Math.min(12, 0.8 * fs)
  );
}

/** 몸통을 조각내어 «글자 i 만» · «글자 없음» · «점선까지 없음» 을 만든다. */
export function splitBody(svg) {
  const open = svg.indexOf(">", svg.indexOf("<svg")) + 1;
  const body = svg.slice(open, svg.lastIndexOf("</svg>"));
  const texts = body.match(TEXT_RE) ?? [];
  const geometry = body.replace(TEXT_RE, "");
  // 점선(치수선·숨은 모서리)을 뺀 «실선만» — halo 가 지워도 되는 것은 점선뿐이다.
  const solidOnly = geometry.replace(
    /<(line|path|circle|ellipse|rect|polyline|polygon)\b[^>]*stroke-dasharray[^>]*?\/?>/g,
    "",
  );
  return { body, texts, geometry, solidOnly };
}

/**
 * 브라우저 안에서 조각들을 각각 래스터화해 «잉크 마스크» 를 돌려준다.
 * 잉크 = 불투명하고 흰색이 아닌 픽셀 (lint_svg 의 `_ink` 와 같은 문턱).
 */
const rasterInPage = async (job) => {
  const { variants, w, h, scale, pad } = job;
  const W = Math.max(1, Math.round((w + 2 * pad) * scale));
  const H = Math.max(1, Math.round((h + 2 * pad) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const head =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
    -pad +
    " " +
    -pad +
    " " +
    (w + 2 * pad) +
    " " +
    (h + 2 * pad) +
    '" width="' +
    W +
    '" height="' +
    H +
    '">';
  const masks = [];
  for (let vi = 0; vi < variants.length; vi += 1) {
    const content = variants[vi];
    ctx.clearRect(0, 0, W, H);
    const src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(head + content + "</svg>");
    const img = new Image();
    // 못 읽으면 «깨끗»으로 흘리지 않는다 — 어느 조각인지 이름을 달아 던진다.
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () =>
        rej(new Error("조각 " + vi + " 을 못 그림: " + content.slice(0, 160)));
      img.src = src;
    });
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const bits = [];
    for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
      if (d[i + 3] > 60 && Math.min(d[i], d[i + 1], d[i + 2]) < 235) bits.push(p);
    }
    masks.push(bits);
  }
  return { W, H, masks };
};

/** 정렬된 픽셀 색인 목록 둘의 교집합 크기. */
function andCount(a, b) {
  let i = 0;
  let j = 0;
  let n = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      n += 1;
      i += 1;
      j += 1;
    } else if (a[i] < b[j]) i += 1;
    else j += 1;
  }
  return n;
}
/** a 에는 있고 b 에는 없는 픽셀 수. */
function minusCount(a, b) {
  let i = 0;
  let j = 0;
  let n = 0;
  while (i < a.length) {
    while (j < b.length && b[j] < a[i]) j += 1;
    if (j >= b.length || b[j] !== a[i]) n += 1;
    i += 1;
  }
  return n;
}

/** 픽셀 색인 → svg 좌표. 표본이 크면 성기게 훑는다(거리 판정용). */
function inkPoints(mask, W, scale, pad, stride = 1) {
  const out = [];
  for (let i = 0; i < mask.length; i += stride) {
    const p = mask[i];
    out.push([(p % W) / scale - pad, Math.floor(p / W) / scale - pad]);
  }
  return out;
}

export async function measureSvg(page, svg, { scale = 2 } = {}) {
  const vb = VIEWBOX_RE.exec(svg);
  if (!vb) return { error: "viewBox 파싱 실패", bad: true, findings: [] };
  const w = Number(vb[1]);
  const h = Number(vb[2]);
  const { body, texts, geometry, solidOnly } = splitBody(svg);
  const variants = [body, geometry, solidOnly, ...texts];
  const { W, masks } = await page.evaluate(rasterInPage, {
    variants,
    w,
    h,
    scale,
    pad: PAD,
  });
  const [full, geom, solid, ...glyphs] = masks;

  // ⑴ 잘림 — viewBox 밖 잉크
  const x0 = Math.round(PAD * scale);
  const y0 = Math.round(PAD * scale);
  const x1 = Math.round((PAD + w) * scale);
  const y1 = Math.round((PAD + h) * scale);
  let clip = 0;
  const clipAt = [];
  for (const p of full) {
    const x = p % W;
    const y = Math.floor(p / W);
    if (x >= x0 - 1 && x <= x1 + 1 && y >= y0 - 1 && y <= y1 + 1) continue;
    clip += 1;
    if (clipAt.length < 4)
      clipAt.push([
        Number((x / scale - PAD).toFixed(1)),
        Number((y / scale - PAD).toFixed(1)),
      ]);
  }

  // ⑷ halo 가 실선을 지웠나 — 실선만 그린 것과 최종을 견준다
  const erased = minusCount(solid, full);

  const findings = [];
  const geomPts = geom.length > 0 ? inkPoints(geom, W, scale, PAD, 3) : [];
  for (let i = 0; i < glyphs.length; i += 1) {
    const el = texts[i];
    const label = el.replace(/<[^>]+>/g, "").trim();
    const halo = hasRealHalo(el);
    // ⑵ 선 위 — halo 없는 글자만. halo 는 점선 위 배치가 정상이고,
    //    halo 가 «실선» 을 지우면 그것은 ⑷ 가 문다.
    const onLine = halo ? 0 : andCount(glyphs[i], geom);
    // ⑶ 글자끼리
    let onLabel = 0;
    for (let j = i + 1; j < glyphs.length; j += 1) {
      onLabel += andCount(glyphs[i], glyphs[j]);
    }
    // ⑸ 떠 있는 맨 길이 라벨
    let floating = false;
    if (!halo && LENGTH_RE.test(label) && geomPts.length > 0) {
      const pts = inkPoints(glyphs[i], W, scale, PAD, 3);
      let best = Infinity;
      outer: for (const [gx, gy] of pts) {
        for (const [hx, hy] of geomPts) {
          const d = Math.hypot(gx - hx, gy - hy);
          if (d < best) best = d;
          if (best <= NEAR_LINE) break outer;
        }
      }
      floating = best > NEAR_LINE;
    }
    if (onLine > TOL || onLabel > TOL || floating) {
      findings.push({ label, halo, onLine, onLabel, floating });
    }
  }
  return { viewBox: [w, h], clip, clipAt, erased, findings, texts: texts.length };
}

export function verdictKeys(m) {
  const keys = [];
  if (m.error) keys.push("error");
  if (m.clip > TOL) keys.push("clip");
  if (m.erased > TOL) keys.push("erased");
  for (const f of m.findings ?? []) {
    if (f.onLine > TOL) keys.push("onLine");
    if (f.onLabel > TOL) keys.push("onLabel");
    if (f.floating) keys.push("floating");
  }
  return [...new Set(keys)];
}

/* ── 눈금 — 양성 5 · 음성 4 ───────────────────────────────────────────── */
const F = 'font-family="Batang, serif" font-size="14"';
const MID = 'text-anchor="middle"';
const HALO =
  'paint-order="stroke" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round"';
const BG = '<rect width="100" height="60" fill="#ffffff" />';
const HEAD = '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">';
const LINE = '<line x1="10" y1="30" x2="90" y2="30" stroke="#111111" stroke-width="1.3" />';
const DASH =
  '<line x1="10" y1="30" x2="90" y2="30" stroke="#111111" stroke-width="1.3" stroke-dasharray="6 4" />';

export const SELFTEST = [
  // 양성 — 하나씩 일부러 어긴다
  [
    "양성 clip",
    `${HEAD}${BG}${LINE}<text x="99" y="10" ${F} text-anchor="start" fill="#111111">(점)</text></svg>`,
    "clip",
  ],
  [
    "양성 onLine",
    `${HEAD}${BG}${LINE}<text x="50" y="34" ${F} ${MID} fill="#111111">H</text></svg>`,
    "onLine",
  ],
  [
    "양성 onLabel",
    `${HEAD}${BG}<text x="50" y="30" ${F} ${MID} fill="#111111">AB</text><text x="52" y="31" ${F} ${MID} fill="#111111">CD</text></svg>`,
    "onLabel",
  ],
  [
    "양성 erased",
    `${HEAD}${BG}${LINE}<text x="50" y="34" ${F} ${MID} ${HALO} fill="#111111">30°</text></svg>`,
    "erased",
  ],
  [
    "양성 floating",
    `${HEAD}${BG}<line x1="10" y1="8" x2="90" y2="8" stroke="#111111" stroke-width="1.3" /><text x="50" y="55" ${F} ${MID} fill="#111111">6 cm</text></svg>`,
    "floating",
  ],
  // 음성 — 각 규칙이 「있는 것을 없다」고 하지 않는지
  [
    "음성 깨끗",
    `${HEAD}${BG}${LINE}<text x="50" y="18" ${F} ${MID} fill="#111111">H</text></svg>`,
    null,
  ],
  [
    "음성 halo 가 제 점선만 지움",
    `${HEAD}${BG}${DASH}<text x="50" y="34" ${F} ${MID} ${HALO} fill="#111111">6 cm</text></svg>`,
    null,
  ],
  [
    "음성 라벨 나란히",
    `${HEAD}${BG}<text x="25" y="30" ${F} ${MID} fill="#111111">AB</text><text x="75" y="30" ${F} ${MID} fill="#111111">CD</text></svg>`,
    null,
  ],
  [
    "음성 가장자리 안쪽",
    `${HEAD}${BG}${LINE}<text x="88" y="12" ${F} text-anchor="end" fill="#111111">(점)</text></svg>`,
    null,
  ],
];

async function main() {
  const args = process.argv.slice(2);
  const scale = Number(
    (args.find((a) => a.startsWith("--scale=")) ?? "--scale=2").split("=")[1],
  );
  const jsonOut = args.find((a) => a.startsWith("--json="))?.split("=")[1];
  const target = args.find((a) => !a.startsWith("--"));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");

  if (args.includes("--selftest")) {
    let fail = 0;
    for (const [name, svg, expect] of SELFTEST) {
      const m = await measureSvg(page, svg, { scale });
      const keys = verdictKeys(m);
      const ok = expect === null ? keys.length === 0 : keys.includes(expect);
      if (!ok) fail += 1;
      console.log(
        `${ok ? "🟢" : "🔴"} ${name} → [${keys.join(",") || "깨끗"}]` +
          (expect ? ` (기대 ${expect})` : " (기대 깨끗)"),
      );
    }
    await browser.close();
    console.log(
      fail === 0 ? `\n눈금 ${SELFTEST.length}/${SELFTEST.length}` : `\n눈금 실패 ${fail}`,
    );
    process.exit(fail === 0 ? 0 : 1);
  }

  if (!target) {
    console.error("사용법: node scripts/qa/probe-figure-ink.mjs <디렉터리|파일>");
    process.exit(2);
  }
  const files = statSync(target).isDirectory()
    ? readdirSync(target)
        .filter((f) => f.endsWith(".svg"))
        .map((f) => path.join(target, f))
    : [target];
  const rows = [];
  const totals = { clip: 0, onLine: 0, onLabel: 0, erased: 0, floating: 0, error: 0 };
  let bad = 0;
  for (const file of files) {
    const svg = readFileSync(file, "utf8");
    const m = await measureSvg(page, svg, { scale });
    const keys = verdictKeys(m);
    for (const k of keys) totals[k] += 1;
    if (keys.length) bad += 1;
    rows.push({ file: path.basename(file), keys, ...m });
  }
  await browser.close();
  console.log(`훑음 ${files.length}장 · 결함 ${bad}장`);
  console.log(
    `  잘림 ${totals.clip} · 선 위 ${totals.onLine} · 글자끼리 ${totals.onLabel} ` +
      `· 실선 지움 ${totals.erased} · 떠 있는 길이 ${totals.floating}` +
      (totals.error ? ` · 못 읽음 ${totals.error}` : ""),
  );
  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
    console.log(`  → ${jsonOut}`);
  }
}

const invoked = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.slice(1))
  : false;
if (invoked || process.argv[1]?.endsWith("probe-figure-ink.mjs")) {
  await main();
}
