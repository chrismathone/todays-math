/**
 * 4D 「원주각의 활용」 14유형의 그림을 **실제로 그려 본다** — 능력 목록이 아니라 렌더다.
 *
 *   npx tsx scripts/qa/render-m3-angle-apply.ts [--seeds 8] [--html out.html]
 *
 * 왜 필요한가: 스펙 검증의 정본은 **엔진**이다(09 §0.1). TypeScript 쪽 단위 시험은
 * 「스펙에 NaN 이 없다」까지만 볼 수 있고, 「엔진이 받아 주는가」라는 축은 시험에
 * 아예 없다 — 없는 축은 변이시킬 수도 없다(CLAUDE.md 2026-08-19).
 *
 * 실패는 세지 않고 **전부 찍는다**. 통과분은 viewBox 폭도 같이 적는다 — 지면 등급이
 * 폭 하나로 갈리기 때문이다(09 §4-24: ≤160 → 140px, ≤320 → 240px).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_ANGLE_APPLY } from "../../src/lib/middle/m3AngleApply";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const seeds = Number(arg("seeds") ?? 8);
  const htmlPath = arg("html");
  const cards: string[] = [];
  let ok = 0;
  let bad = 0;
  const widths: number[] = [];
  const perType = new Map<string, number[]>();

  for (const e of M3_ANGLE_APPLY) {
    for (let v = 0; v < seeds; v += 1) {
      const p = generateMiddleProblem(e.key, 20260824, v);
      const res = await renderFigureSpec(p.figureSpec);
      if (!res.ok) {
        bad += 1;
        console.log(`✗ ${e.key} v${v} mode=${p.facts.mode} — ${res.error}`);
        console.log(`   ${JSON.stringify(p.figureSpec)}`);
        continue;
      }
      ok += 1;
      const m = res.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      if (m) {
        widths.push(Number(m[1]));
        const list = perType.get(e.rpmType) ?? [];
        list.push(Number(m[1]));
        perType.set(e.rpmType, list);
      }
      if (htmlPath) {
        cards.push(
          `<figure><figcaption>${e.rpmType} ${e.rpmTitle} · v${v} · mode ${p.facts.mode}</figcaption>` +
            `<div class="fig">${res.svg}</div>` +
            `<p class="q">${p.content}</p><p class="a">답 ${p.answer}</p></figure>`,
        );
      }
    }
  }

  for (const [t, list] of [...perType].sort()) {
    list.sort((a, b) => a - b);
    console.log(
      `  ${t}  폭 ${list[0]!.toFixed(1)} ~ ${list[list.length - 1]!.toFixed(1)}`,
    );
  }
  widths.sort((a, b) => a - b);
  console.log(
    `\n렌더 성공 ${ok} · 실패 ${bad} · viewBox 폭 ${widths[0]}~${widths[widths.length - 1]}`,
  );
  // 지면 등급은 viewBox **폭 하나**로 갈린다(figureSvgFrame). 한 유형만 다른 등급으로
  // 떨어지면 그 그림만 화면·지면에서 작아진다 — 그 자체가 결함이다(09 §4-24).
  const grade = (w: number): string =>
    w <= 160 ? "140px" : w <= 320 ? "240px" : "360px";
  const grades = new Set(widths.map(grade));
  console.log(`지면 등급: ${[...grades].join(", ")}`);
  if (grades.size !== 1 || !grades.has("240px")) {
    console.log(
      "✗ 지면 등급이 갈렸다 — viewBox 폭을 160 초과 320 이하로 맞출 것",
    );
    bad += 1;
  }

  if (htmlPath) {
    const out = resolve(process.cwd(), htmlPath);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(
      out,
      `<!doctype html><meta charset="utf-8"><title>4D 원주각의 활용 그림 근거</title>` +
        `<style>body{font-family:system-ui;margin:24px;background:#fff}` +
        `figure{display:inline-block;width:300px;margin:0 12px 24px 0;vertical-align:top}` +
        `figcaption{font-size:12px;color:#555;margin-bottom:4px}` +
        `.fig svg{width:240px;height:auto;border:1px solid #eee}` +
        `.q{font-size:12px;line-height:1.5}.a{font-size:12px;color:#036}</style>` +
        cards.join("\n"),
      "utf8",
    );
    console.log(`미리보기: ${out}`);
  }
  process.exit(bad === 0 ? 0 : 1);
}

void main();
