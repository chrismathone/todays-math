import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  BLANK_WIDTH,
  blankWidth,
} from "../../src/components/concept-blank/paper/text";
import { openSet } from "./measure";

/**
 * 빈칸 폭의 자 — 빈칸 길이는 핵심어의 **보이는 폭**(`inkEm`)에 비례한다. 은행 2차부터 핵심어 · 예의 답에 수식이 실려
 * (`{$1000\,\mathrm{m}$}` · `{$\frac{\sqrt{3}}{2}$}`) 마크업 글자 수로 재면 빈칸이 터무니없이 길어진다.
 * `inkEm` 은 DOM 을 재지 않는 어림이라, 은행의 수식 핵심어 · 예의 답 전부를 제품 수식 경로로 그려 실제 폭과 맞댄다.
 *
 * 넘침과는 상관없다(빈칸은 제 폭을 가진 상자이고 줄 어림도 그 폭으로 센다) — 여기서 보는 것은 «답이 들어갈 만큼인가 ·
 * 답보다 터무니없이 길지 않은가»다.
 */
const OUT = path.join(process.cwd(), "test-results", "concept-blank-paper");
const FONT = 14;

test("빈칸 폭 — 수식 핵심어 · 예의 답의 보이는 폭 어림이 그려진 폭을 따라간다", async ({
  page,
}) => {
  await openSet(page, "ink", "both", "[data-cb-ink]");
  const rows = await page.evaluate(
    (font) =>
      [...document.querySelectorAll<HTMLElement>("[data-cb-ink]")].map(
        (el) => ({
          raw: el.dataset.cbInkRaw ?? "",
          est: Number(el.dataset.cbInk),
          actual: el.getBoundingClientRect().width / font,
          // 수식 오류(붉은 글) · 새는 마크업
          broken:
            el.querySelector('.katex-error, .katex [style*="cc0000"]') !== null,
        }),
      ),
    FONT,
  );
  expect(rows.length).toBeGreaterThan(200);

  const table = rows
    .map((r) => ({
      raw: r.raw,
      est: Math.round(r.est * 100) / 100,
      actual: Math.round(r.actual * 100) / 100,
      diff: Math.round((r.est - r.actual) * 100) / 100,
      // 빈칸 길이 — 어림으로 정한 것 · 실제 폭으로 정했다면
      blank: blankWidth(r.raw),
      ideal: Math.round(
        Math.min(
          BLANK_WIDTH.max,
          Math.max(
            BLANK_WIDTH.min,
            r.actual * BLANK_WIDTH.perEm + BLANK_WIDTH.pad,
          ),
        ),
      ),
      markup: [...r.raw].length,
    }))
    .sort((a, b) => a.diff - b.diff);
  const diffs = table.map((r) => r.diff);
  const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  const summary = {
    count: table.length,
    meanDiffEm: Math.round(mean * 100) / 100,
    minDiffEm: diffs[0],
    maxDiffEm: diffs[diffs.length - 1],
    blankOffPx: {
      max: Math.max(...table.map((r) => Math.abs(r.blank - r.ideal))),
      mean:
        Math.round(
          (table.reduce((s, r) => s + Math.abs(r.blank - r.ideal), 0) /
            table.length) *
            10,
        ) / 10,
    },
    // 마크업 글자 수로 쟀다면(앞 판의 글자 핵심어 식) 최대 폭에 닿았을 빈칸 수
    wouldHitMaxByMarkup: table.filter(
      (r) =>
        r.markup * BLANK_WIDTH.perEm + BLANK_WIDTH.pad >= BLANK_WIDTH.max &&
        r.blank < BLANK_WIDTH.max,
    ).length,
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    path.join(OUT, "ink-widths.json"),
    JSON.stringify({ summary, rows: table }, null, 2),
  );

  expect(rows.filter((r) => r.broken).map((r) => r.raw)).toEqual([]);
  // 어림이 실제보다 0.8em 넘게 좁거나 1.2em 넘게 넓은 답이 없다 — 빈칸으로는 11 · 17px(잰 값 −0.53 ~ +0.84em)
  const off = table
    .filter((r) => r.diff < -0.8 || r.diff > 1.2)
    .map((r) => `${r.raw}: 어림 ${r.est}em · 실제 ${r.actual}em`);
  expect(off).toEqual([]);
  // 빈칸은 답이 그려진 폭보다 좁지 않다(손글씨 여유 24px 을 다 까먹지 않는다)
  const tight = table
    .filter((r) => r.blank < Math.min(BLANK_WIDTH.max, r.actual * FONT + 8))
    .map((r) => `${r.raw}: 빈칸 ${r.blank}px · 답 ${r.actual * FONT}px`);
  expect(tight).toEqual([]);
  // 치우치지 않았다 — 평균 차가 ±0.35em 안
  expect(Math.abs(mean)).toBeLessThan(0.35);
});
