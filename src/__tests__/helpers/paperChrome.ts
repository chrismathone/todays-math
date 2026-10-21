/**
 * Chromium 에 **제품 지면 그대로**를 띄우는 시험 도우미 — 줄바꿈 · 높이를 jsdom 이 못 재는 시험이 쓴다.
 *
 * 싣는 것: 지면 명조(`public/fonts` — `src/app/fonts.ts` 가 `next/font/local` 로 싣는 그 파일) · KaTeX CSS 와 글꼴 ·
 * Tailwind 산출물(`paperProbe.buildTailwindCss` — 손으로 옮겨 적지 않는다) · `TestPrint.module.css` 원문.
 * 🔴 KaTeX CSS 를 `<style>` 로 붙이면 `fonts/…` 상대 경로가 안 풀린다 — 글꼴 주소를 절대 경로로 바꿔 싣는다.
 * 🔴 글꼴이 안 실리면 줄바꿈 · 높이가 통째로 딴 지면 것이다 — `assertPaperFonts` 로 적재를 확인한 뒤에만 잰다
 *    (2026-10-03 «글꼴 응답은 200 이었고 내용은 HTML 이었다»).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";
import { expect } from "vitest";

// 글꼴 · KaTeX 는 전수 탐침과 한 벌이다(2026-10-21 — 탐침이 따로 짓다가 글꼴을 못 실었다).
import {
  buildTailwindCss,
  katexCss,
  PAPER_FONT_CSS,
  PAPER_VARS_ATTR,
} from "../../../scripts/qa/paperProbe";

const ROOT = process.cwd();

/** 지면 변수(`PAPER_CSS_VARIABLES`)를 얹은 문서 하나 — `body` 는 제품 렌더 결과다. */
export async function paperDocument(
  body: string,
  extraCss = "",
): Promise<string> {
  const tailwind = await buildTailwindCss();
  const moduleCss = readFileSync(
    path.join(ROOT, "src/components/print/TestPrint.module.css"),
    "utf8",
  );
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<style>${PAPER_FONT_CSS}</style><style>${katexCss()}</style><style>${tailwind}</style><style>${moduleCss}</style>
<style>body{margin:0;background:#fff}${extraCss}</style></head>
<body><div style="${PAPER_VARS_ATTR}">${body}</div></body></html>`;
}

/**
 * 지면 명조 · KaTeX 글꼴이 실렸고, 본문이 지면 글꼴 · 줄 높이로 풀리는가.
 * `probe` 는 `.problemText` 안의 문단을 고르는 선택자다(Tailwind `leading-relaxed` 1.625 × 12.5px).
 */
export async function assertPaperFonts(
  page: Page,
  probe: string,
): Promise<void> {
  const fonts = (await page.evaluate(`(async () => {
    await document.fonts.load('12.5px "TM Noto Serif KR"', "가나다");
    await document.fonts.load('15px KaTeX_Main', "1");
    await document.fonts.load('italic 15px KaTeX_Math', "x");
    await document.fonts.ready;
    const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, ""));
    const p = document.querySelector(${JSON.stringify(probe)});
    return { loaded, family: getComputedStyle(p).fontFamily, lineHeight: getComputedStyle(p).lineHeight, size: getComputedStyle(p).fontSize };
  })()`)) as {
    loaded: string[];
    family: string;
    lineHeight: string;
    size: string;
  };
  expect(fonts.loaded, "지면 명조가 실렸다").toContain("TM Noto Serif KR");
  expect(fonts.loaded, "KaTeX 글꼴이 실렸다").toEqual(
    expect.arrayContaining(["KaTeX_Main", "KaTeX_Math"]),
  );
  expect(fonts.family, "본문이 지면 명조로 풀린다").toMatch(
    /^"?TM Noto Serif KR/,
  );
  // Tailwind 가 붙었는지(`leading-relaxed` 1.625 × 12.5px) — 안 붙으면 줄 높이가 지면과 다르다
  expect([fonts.size, fonts.lineHeight]).toEqual(["12.5px", "20.3125px"]);
}
