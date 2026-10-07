import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const variants = [
  ['a', 'a-exam-desk.html'],
  ['b', 'b-source-editor.html'],
  ['c', 'c-workflow-board.html'],
  ['d', 'd-question-library.html'],
  ['e', 'e-class-packet.html'],
];
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).toLowerCase();
if (only && !variants.some(([id]) => id === only)) throw new Error('Unknown variant: ' + only);
const output = path.resolve('.qa-artifacts/english-hifi');
fs.mkdirSync(output, { recursive: true });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath = process.env.HIFI_BROWSER_EXECUTABLE || (fs.existsSync(edge) ? edge : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const report = [];
try {
  for (const [id, file] of variants) {
    if (only && id !== only) continue;
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve('docs/design/mockups/todayenglish-20261007', file)).href);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(output, `${id}-desktop.png`), fullPage: true });
    await page.screenshot({ path: path.join(output, `${id}-thumb.jpg`), type: 'jpeg', quality: 75 });
    const desktop = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, `${id}-phone.png`), fullPage: true });
    const phone = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    report.push({ id, file, desktop, phone, errors });
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(output, only ? `capture-${only}-report.json` : 'capture-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (report.some(item => item.errors.length || item.desktop.scrollWidth > item.desktop.width || item.phone.scrollWidth > item.phone.width)) {
  process.exitCode = 1;
}
