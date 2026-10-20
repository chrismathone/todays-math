import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright';

const reportDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(reportDir, '../../../../..');
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'descriptive-unified-'));
await writeFile(path.join(temporaryRoot, 'index.html'), '<!doctype html><html lang="ko"><head><meta charset="UTF-8"><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
await writeFile(path.join(temporaryRoot, 'main.tsx'), await readFile(path.join(reportDir, 'harness.tsx.txt')));
const modules = await realpath(path.join(repoRoot, 'node_modules'));
const server = await createServer({
  configFile: false,
  root: temporaryRoot,
  plugins: [react()],
  resolve: { alias: {
    '@': path.join(repoRoot, 'src'),
    react: path.join(modules, 'react'),
    'react-dom': path.join(modules, 'react-dom'),
  } },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [temporaryRoot, repoRoot, modules] } },
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const errors = [];
const diagnostics = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) diagnostics.push({ type: message.type(), text: message.text(), location: message.location() }); });
const cases = [];
try {
  for (const template of ['jeongtong', 'modern', 'workbook', 'jaseup', 'yuhyung', 'pyeongga']) {
    for (const [columns, solving] of [[1, 'off'], [2, 'off'], [1, 'ruled']]) {
      for (const teacher of [false, true]) {
        await page.goto(`http://127.0.0.1:${port}/?template=${template}&teacher=${teacher}&columns=${columns}&solving=${solving}`);
        await page.waitForFunction(() => window.__ready || document.querySelector('[role="alert"]'), {}, { timeout: 12000 });
        const result = await page.evaluate(({ template, teacher, columns, solving }) => {
          const source = document.querySelector('[data-mathgen-document]');
          return {
            template, teacher, columns, solving, ready: window.__ready,
            alert: document.querySelector('[role="alert"]')?.textContent ?? null,
            pages: [...source.querySelectorAll('[data-unified-paper]')].map(p => p.dataset.pageKind),
            writing: [...source.querySelectorAll('[data-writing-area]')].map(p => ({ height: p.getBoundingClientRect().height, heightMm: p.dataset.heightMm })),
            leak: !teacher && source.textContent.includes('교사용'),
            ordinaryNumbers: [...source.querySelectorAll('[data-answer-number]')].map(p => p.dataset.answerNumber),
          };
        }, { template, teacher, columns, solving });
        cases.push(result);
        assert.deepEqual(diagnostics, [], 'Browser console must be clean');
        assert.equal(result.ready, true, JSON.stringify(result));
        assert.equal(result.leak, false);
        assert.equal(result.writing.length, 1);
        assert.ok(Math.abs(result.writing[0].height - 72 * 96 / 25.4) < 1);
        assert.deepEqual(result.ordinaryNumbers, teacher ? ['1'] : []);
        assert.equal(result.pages.filter(kind => kind === 'descriptive-rubric').length, teacher ? 1 : 0);
        assert.equal(result.pages.filter(kind => kind === 'descriptive-answers').length, template === 'pyeongga' ? 1 : 0);
      }
    }
  }
  await page.goto(`http://127.0.0.1:${port}/?teacher=true&oversize=rubric`);
  await page.waitForSelector('[role="alert"]');
  const oversizedRubric = await page.evaluate(() => ({ ready: window.__ready, alert: document.querySelector('[role="alert"]').textContent }));
  assert.equal(oversizedRubric.ready, false);
  await page.goto(`http://127.0.0.1:${port}/?template=workbook&teacher=true&solving=ruled`);
  await page.waitForFunction(() => window.__ready);
  await page.emulateMedia({ media: 'print' });
  await page.locator('[data-unified-paper]').first().screenshot({ path: path.join(reportDir, 'workbook-mixed.png') });
  assert.deepEqual(errors, []);
  await writeFile(path.join(reportDir, 'browser-results.json'), JSON.stringify({ capturedAt: new Date().toISOString(), browser: await browser.version(), fixture: 'Synthetic r2 three-part task; no API, DB or registration', cases, oversizedRubric, errors, diagnostics }, null, 2) + '\n');
  console.log(`PASS: ${cases.length} measured template variants, 72mm writing heights, teacher separation and oversized-rubric export block`);
} finally {
  await browser.close();
  await server.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}
