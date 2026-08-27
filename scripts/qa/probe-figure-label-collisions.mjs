/**
 * **라벨이 실선을 밟는가 — 실제 렌더러(브라우저)에게 묻는다.**
 *
 *   node scripts/qa/probe-figure-label-collisions.mjs <svg파일...>
 *   node scripts/qa/probe-figure-label-collisions.mjs --selftest
 *
 * ## 왜 브라우저인가
 *
 * 지면은 브라우저가 그린다. 엔진의 `_text_box` 는 **어림**이고(문자당 0.61em 한 값),
 * 그 어림이 좁으면 라벨이 선을 덮는데 **엔진 스스로는 그것을 못 본다** — 자기 어림으로
 * 「안 겹친다」고 판정했기 때문이다. 동어반복이다.
 *
 * ⚠️ **PyMuPDF 로 재면 안 된다.** 글꼴을 대체해서 `40°` 를 36.6단위로 그린다(실측
 *    2026-08-28). 브라우저는 18.0 이다. 그 값으로 눈금을 맞추면 **엉뚱한 렌더러**에
 *    맞추는 것이다. `scripts/qa/svg_to_png.py` 는 모양을 눈으로 볼 때만 쓰고,
 *    겹침 판정에는 쓰지 않는다.
 *
 * 재는 것: 각 `<text>` 의 **실제 글자 잉크**와 도형 잉크(`line`·`path`)의 교차.
 * 글자 상자는 halo(흰 테두리)만큼 넓혀서 본다 — halo 는 잉크를 더하지 않지만
 * **밑의 실선을 지운다.**
 *
 * 🔴 **`getBBox()` 는 잉크가 아니라 «em 상자»다** (실측 2026-08-28).
 *    fs=12 에서 `x`·`A`·`25°`·`g` 가 **전부 높이 14**, 윗변이 전부 기준선−11 이다
 *    (= fontBoundingBoxAscent 11 + descent 3). 그 상자로 재면 숫자 라벨이
 *    위로 2·아래로 3 단위씩 **부풀어** 거짓 겹침이 난다 — 실측으로
 *    `m3-diameter-cross` 의 `25°` 가 그렇게 걸렸고(실제 여유 1.7단위),
 *    하마터면 멀쩡한 자리를 고치러 갔다. **거짓 경보는 가드를 끈다.**
 *    그래서 높이는 canvas `actualBoundingBoxAscent/Descent` 로 재고(글자마다
 *    다르다 — `25°` 는 asc 9·desc 0), 폭만 getBBox 를 쓴다(옆여백 포함 — 넘치는 쪽).
 *
 *    `--selftest` 가 이 눈금을 **양성·음성 둘로** 확인한다.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { chromium } from "playwright";

/**
 * halo 가 실선을 지우는 폭. **SVG 가 적은 값만 쓴다 — 없으면 0.**
 *
 * ⚠️ 여기 기본값을 두면 halo 가 **없는** 꼭짓점 라벨에도 여백이 붙어 **거짓 겹침**이
 *    난다(실측: 첫 판에서 `B`·`E`·`C`·`F` 가 그렇게 걸렸다). 거짓 경보는 가드를 끈다.
 */
const DEFAULT_HALO = 0;

async function measure(page, svg) {
  return page.evaluate(
    ({ svg, defaultHalo }) => {
      document.body.innerHTML = svg;
      const root = document.querySelector("svg");
      if (!root) return { error: "svg 가 없다" };
      // 높이는 canvas 로 잰다 — getBBox 는 em 상자라 글자마다 안 갈린다(머리말 참조).
      const ctx = document.createElement("canvas").getContext("2d");
      const inkRows = (t, fs, family, style) => {
        ctx.font = `${style} ${fs}px ${family}`;
        const m = ctx.measureText(t);
        return [m.actualBoundingBoxAscent, m.actualBoundingBoxDescent];
      };
      // ── 라벨은 **두 모습**으로 온다 (2026-08-28) ────────────────────────────
      // ① 조판됨: `<g data-label="5 cm">` 안에 글리프 `<path>` 들. **글자가 없다.**
      // ② 그대로: `<text>` — TeX 글꼴에 글리프가 없는 글(한글·㎠).
      // ①을 안 보면 이 판정기는 중등 지면에서 구조적으로 0 이 된다.
      const texts = [];
      for (const g of root.querySelectorAll("[data-label]")) {
        // 조판된 것은 **잉크가 곧 상자**다 — `getBBox` 가 em 상자가 아니라 글리프
        // 외곽선의 실제 경계를 준다(글자가 아니라 path 이므로). 다만 그 값은 이
        // `<g>` 의 **자기 transform 이 걸리기 전** 좌표라, CTM 으로 옮겨야 한다.
        const b = g.getBBox();
        const m = g.getCTM();
        if (!m) continue;
        const px = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
        const [x0, y0] = px(b.x, b.y);
        const [x1, y1] = px(b.x + b.width, b.y + b.height);
        const halo = Number(g.getAttribute("data-halo")) || 0;
        const pad = halo / 2;
        texts.push({
          text: g.getAttribute("data-label") ?? "",
          box: [
            Math.min(x0, x1) - pad,
            Math.min(y0, y1) - pad,
            Math.max(x0, x1) + pad,
            Math.max(y0, y1) + pad,
          ],
          w: Math.abs(x1 - x0),
          h: Math.abs(y1 - y0),
        });
      }
      for (const t of root.querySelectorAll("text")) {
        const b = t.getBBox();
        const raw = t.getAttribute("stroke-width");
        const halo = raw === null ? defaultHalo : Number(raw) || 0;
        const pad = halo / 2;
        const cs = getComputedStyle(t);
        const fs = parseFloat(cs.fontSize) || 12;
        const str = t.textContent ?? "";
        const [asc, desc] = inkRows(str, fs, cs.fontFamily, cs.fontStyle);
        // `y` 는 기준선이다. 잉크는 기준선 위로 asc, 아래로 desc.
        const baseline = b.y + b.height - (parseFloat(cs.fontSize) || 12) * 0.25;
        const yAttr = Number(t.getAttribute("y"));
        const base = Number.isFinite(yAttr) ? yAttr : baseline;
        texts.push({
          text: str,
          box: [b.x - pad, base - asc - pad, b.x + b.width + pad, base + desc + pad],
          w: b.width,
          h: asc + desc,
        });
      }
      // 잉크: **모든 기하 요소**를 촘촘히 표본으로 편다.
      //
      // 🔴 종전에는 `line`·`path` 만 봤다. 그래서 **`circle` 이 통째로 안 보였고**
      //    (실측 `m3-chord-cross`: 원 위에 앉은 라벨을 «깨끗»이라 했다), 원이 도형의
      //    절반인 그림에서 이 판정기는 구조적으로 0 이었다. 손 목록은 샌다 —
      //    이제 `getTotalLength` 를 가진 것을 **전부** 훑는다(SVGGeometryElement:
      //    path·circle·ellipse·line·polyline·polygon·rect).
      const ink = [];
      for (const el of root.querySelectorAll("*")) {
        if (typeof el.getTotalLength !== "function") continue;
        // 🔴 **조판된 라벨의 글리프는 기하가 아니다.** 안 걸러 내면 모든 라벨이
        //    «제 글자와 겹친다»고 나온다 — 그러면 판정기가 통째로 쓸모없어진다.
        if (el.closest("[data-label]")) continue;
        let len = 0;
        try {
          len = el.getTotalLength();
        } catch {
          continue;
        }
        if (!Number.isFinite(len) || len === 0) continue;
        const n = Math.max(2, Math.min(4000, Math.ceil(len / 1.2)));
        const pts = [];
        for (let i = 0; i <= n; i += 1) {
          const p = el.getPointAtLength((len * i) / n);
          pts.push([p.x, p.y]);
        }
        ink.push({
          kind: el.tagName,
          d: (el.getAttribute("d") ?? "").slice(0, 46),
          pts,
        });
      }
      return { texts, ink };
    },
    { svg, defaultHalo: DEFAULT_HALO },
  );
}

function segHitsBox(a, b, box) {
  const [x0, y0, x1, y1] = box;
  const inside = (p) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
  if (inside(a) || inside(b)) return true;
  const cross = (p, q, r, s) => {
    const d = (u, v, w) =>
      (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
    const d1 = d(p, q, r);
    const d2 = d(p, q, s);
    const d3 = d(r, s, p);
    const d4 = d(r, s, q);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  };
  const c = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  for (let i = 0; i < 4; i += 1) {
    if (cross(a, b, c[i], c[(i + 1) % 4])) return true;
  }
  return false;
}

export function collisions(measured) {
  const out = [];
  for (const t of measured.texts) {
    for (const piece of measured.ink) {
      let hit = false;
      for (let i = 0; i + 1 < piece.pts.length; i += 1) {
        if (segHitsBox(piece.pts[i], piece.pts[i + 1], t.box)) {
          hit = true;
          break;
        }
      }
      if (hit) {
        out.push({ text: t.text, kind: piece.kind, d: piece.d ?? "", box: t.box });
        break;
      }
    }
  }
  return out;
}

/**
 * **이 판정기가 «예»와 «아니오»를 둘 다 낼 수 있는가.**
 *
 * 양성만 대면 재현율만 재고 지어냄은 구조적으로 0 이 된다(2026-08-20).
 * 그리고 ③ 은 **눈금 그 자체**다 — em 상자로 재던 옛 판은 여기서 «겹침»이라
 * 답한다(기준선 112 − em 위 11 − halo 2.2 = 98.8 < 100). 잉크로 재야 통과한다.
 */
const LINE = `<line x1="10" y1="100" x2="190" y2="100" stroke="#111" stroke-width="1.4"/>`;
const CIRCLE = `<circle cx="100" cy="100" r="50" fill="none" stroke="#111" stroke-width="1.4"/>`;

const SELFTEST = [
  ["① 선 위에 앉은 라벨", LINE, 104, true],
  ["② 선에서 멀리 떨어진 라벨", LINE, 130, false],
  ["③ 아슬아슬하게 비킨 라벨 — em 상자로 재면 거짓 겹침", LINE, 112, false],
  ["④ 아슬아슬하게 밟은 라벨", LINE, 108, true],
  ["⑤ **원** 위에 앉은 라벨 — line·path 만 보면 구조적으로 0", CIRCLE, 154, true],
  ["⑥ 원 안쪽 한복판 — 원과 안 닿는다", CIRCLE, 104, false],
];

function selftestSvg(shape, baselineY) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${shape}` +
    `<text x="100" y="${baselineY}" font-family="Times New Roman, Batang, serif" ` +
    `font-size="12" text-anchor="middle" fill="#111" paint-order="stroke" ` +
    `stroke="#fff" stroke-width="4.4">25°</text></svg>`
  );
}

/**
 * **조판된 라벨** 눈금 — 제품 코드(`placeLabel`)가 찍어 준다.
 *
 * ⚠️ 여기 글자로 박으면 안 된다. 속성 이름이 바뀌는 날 눈금만 옛 모양으로 남아
 *    **초록인 채로** 판정기가 눈이 먼다. 못 얻으면 «못 쟀다»고 말하고 실패한다 —
 *    조용히 건너뛰면 「눈금 6건 통과」가 「조판 라벨도 잰다」로 읽힌다.
 */
function typesetGauges() {
  // `npx.cmd` 는 Windows 에서 `spawnSync` 가 EINVAL 을 낸다(Node 24, shell 없이 .cmd).
  // tsx 를 **직접** 부른다 — 경로가 확실하고 셸을 안 거친다.
  const out = spawnSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "scripts/qa/emit-label-gauge.ts"],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  if (out.status !== 0) {
    throw new Error(`눈금 도형을 못 얻었다: ${out.stderr || out.error}`);
  }
  return JSON.parse(out.stdout);
}

async function selftest(page) {
  let bad = 0;
  const cases = [
    ...SELFTEST.map(([name, shape, baselineY, expected]) => ({
      name,
      svg: selftestSvg(shape, baselineY),
      expect: expected,
    })),
    ...typesetGauges(),
  ];
  for (const c of cases) {
    const measured = await measure(page, c.svg);
    const got = collisions(measured).length > 0;
    const ok = got === c.expect;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? "✅" : "🔴"} ${c.name} — 기대 ${c.expect ? "겹침" : "깨끗"} · ` +
        `실제 ${got ? "겹침" : "깨끗"} (잉크 높이 ${measured.texts[0].h.toFixed(1)})`,
    );
  }
  if (bad > 0) {
    console.log(`\n🔴 눈금 ${bad}건 어긋남 — 이 판정기의 답을 쓰지 마라.`);
  } else {
    const pos = cases.filter((c) => c.expect).length;
    console.log(
      `\n✅ 눈금 ${cases.length}건 — 양성 ${pos} · 음성 ${cases.length - pos} 을 갈라낸다` +
        " (날 `<text>` 와 **조판된 라벨** 둘 다).",
    );
  }
  return bad;
}

async function main() {
  const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (process.argv.includes("--selftest")) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent("<!doctype html><meta charset=utf-8><body></body>");
    const bad = await selftest(page);
    await browser.close();
    process.exit(bad === 0 ? 0 : 1);
  }
  if (files.length === 0) {
    console.log("사용법: probe-figure-label-collisions.mjs <svg...>");
    process.exit(2);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<!doctype html><meta charset=utf-8><body></body>");
  let bad = 0;
  for (const f of files) {
    const svg = readFileSync(f, "utf8");
    const measured = await measure(page, svg);
    if (measured.error) {
      console.log(`  ⚠️ ${f}: ${measured.error}`);
      continue;
    }
    const hits = collisions(measured);
    if (hits.length === 0) {
      console.log(`  ✅ ${f} — 라벨 ${measured.texts.length}개, 겹침 없음`);
    } else {
      bad += 1;
      console.log(`  ❌ ${f} — 겹침 ${hits.length}건`);
      for (const h of hits) {
        console.log(
          `       "${h.text}" 가 ${h.kind}${h.d ? " " + h.d : ""} 를 덮는다 · 상자 [${h.box
            .map((v) => v.toFixed(1))
            .join(", ")}]`,
        );
      }
    }
  }
  await browser.close();
  process.exit(bad === 0 ? 0 : 1);
}

await main();
