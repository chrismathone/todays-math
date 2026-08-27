/**
 * 후보 글꼴로 같은 글자들을 그려 PNG 로 남긴다 — `rpm_font_match.py` 가 오려낸
 * 원본 글자와 겹쳐 재기 위한 것이다.
 *
 *   node scripts/qa/rpm_font_render_candidates.mjs
 *
 * 브라우저로 그린다 — 지면을 그리는 것이 브라우저이기 때문이다.
 */
import { mkdirSync, writeFileSync } from "node:fs";

import { chromium } from "playwright";

const CHARS = "0123456789ABCDEFGRSacm";
const FONTS = [
  "HancomEQN",
  "HyhwpEQ",
  "Times New Roman",
  "Cambria",
  "Georgia",
  "Batang",
  "Book Antiqua",
  "Constantia",
  "Palatino Linotype",
  "Bookman Old Style",
  "Century Schoolbook",
  "Garamond",
];

mkdirSync(".tmp-orca/glyphs", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}
 #g{display:inline-block;padding:20px;line-height:1;color:#000}</style>
<div id="g"></div>`);

// 이 컴퓨터에 정말 있는 글꼴만 견준다 — 없으면 대체 글꼴이 그려져 거짓 답이 된다.
const present = await page.evaluate(
  (fonts) => fonts.filter((f) => document.fonts.check(`120px "${f}"`)),
  FONTS,
);
console.log("설치된 후보:", present.join(" · "));

for (const font of present) {
  for (const ch of CHARS) {
    await page.evaluate(
      ({ font, ch }) => {
        const g = document.getElementById("g");
        g.style.fontFamily = `"${font}"`;
        g.style.fontSize = "180px";
        g.textContent = ch;
      },
      { font, ch },
    );
    const box = await page.locator("#g").boundingBox();
    const shot = await page.screenshot({ clip: box });
    const safe = font.replace(/[^A-Za-z0-9]/g, "_");
    writeFileSync(
      `.tmp-orca/glyphs/cand-${safe}-${ch.codePointAt(0).toString(16).padStart(2, "0")}.png`,
      shot,
    );
  }
  console.log(`  ${font} 그렸다`);
}
await browser.close();
