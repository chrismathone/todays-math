import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
const dir = path.resolve(process.argv[2]);
assert(!fs.existsSync(path.join(dir, 'preview-70mm.png')));
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 500, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(dir, 'preview.html')).href);
  const result = await page.evaluate(async () => {
    const images = await Promise.all([...document.querySelectorAll('svg image')].map(async (node) => {
      const img = new Image(); img.src = node.getAttribute('href'); await img.decode();
      return { width: img.naturalWidth, height: img.naturalHeight };
    }));
    return { images, widthsPx: [...document.querySelectorAll('figure')].map((node) => node.getBoundingClientRect().width), unresolvedMathLabels: document.querySelectorAll('[data-tex]').length };
  });
  assert.equal(result.images.length, 2);
  assert(result.images.every((x) => x.width === 1536 && x.height === 1024));
  assert.equal(result.widthsPx.length, 4);
  assert(result.widthsPx.every((x) => Math.abs(x - 70 * 96 / 25.4) < 1));
  await page.screenshot({ path: path.join(dir, 'preview-70mm.png'), fullPage: true });
  fs.writeFileSync(path.join(dir, 'visual-check.json'), JSON.stringify({ capturedAt: new Date().toISOString(), browser: 'installed Edge headless', ...result, widthMm: 70, approval: false, dbWrites: 0 }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
