import { afterAll, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const probe = vi.hoisted(() => ({ snapshots: [], launches: 0, externalRequests: [] }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/export/pdfServer', async (original) => {
  const actual = await original();
  return { ...actual, launchExportBrowser: async () => {
    probe.launches++;
    const browser = await actual.launchExportBrowser();
    const newPage = browser.newPage.bind(browser);
    browser.newPage = async () => {
      const page = await newPage();
      page.on('request', request => {
        if (!request.url().startsWith('data:image/')) probe.externalRequests.push(request.url());
      });
      const screenshot = page.screenshot.bind(page);
      page.screenshot = async options => {
        const state = await page.evaluate(() => ({
          images: Array.from(document.images, image => image.src),
          legends: Array.from(document.querySelectorAll('.grid-legend'), e => e.textContent),
          frames: Array.from(document.querySelectorAll('.frame'), frame => {
            const r = frame.getBoundingClientRect();
            return { count: frame.querySelectorAll('.grid-index').length,
              ticksFit: Array.from(frame.querySelectorAll('.grid-index'), e => {
                const b = e.getBoundingClientRect();
                return b.left >= r.left && b.right <= r.right && b.top >= r.top && b.bottom <= r.bottom;
              }).every(Boolean),
              legendDoesNotCoverIndices: Array.from(frame.querySelectorAll('.grid-index'), e => {
                const b = e.getBoundingClientRect(), legend = frame.querySelector('.grid-legend')?.getBoundingClientRect();
                return !legend || b.bottom <= legend.top || b.top >= legend.bottom || b.right <= legend.left || b.left >= legend.right;
              }).every(Boolean) };
          }),
        }));
        probe.snapshots.push({ ...state, scriptsDisabled: !page.isJavaScriptEnabled() });
        return screenshot(options);
      };
      return page;
    };
    return browser;
  } };
});
import { buildFigureComparisonImage, closeFigureComparisonBrowser } from '@/lib/dev-ai/figure-comparison';

const out = path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/grid-advisory-integration-20261021-r1');
const sha = value => createHash('sha256').update(value).digest('hex');
const fixtures = JSON.parse(readFileSync(path.join(out, 'native-fixtures-r1.json'), 'utf8'));
function grid(cols = 8, rows = 8) {
  const lines = [];
  for (let i = 0; i <= cols; i++) lines.push(`<path d="M${10 + i * 10} 10V${10 + rows * 10}"/>`);
  for (let i = 0; i <= rows; i++) lines.push(`<path d="M10 ${10 + i * 10}H${10 + cols * 10}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${20 + cols * 10}" height="${20 + rows * 10}" viewBox="0 0 ${20 + cols * 10} ${20 + rows * 10}"><g stroke="#888" stroke-width="1" fill="none">${lines.join('')}</g><path d="M30 60L70 30" fill="none" stroke="black" stroke-width="2"/></svg>`;
}
const triangle = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><path d="M10 90L80 10L170 90Z" fill="none" stroke="black"/></svg>';
const records = [];
afterAll(async () => {
  await closeFigureComparisonBrowser();
  writeFileSync(path.join(out, 'actual-browser-results-r1.json'), JSON.stringify({
    records, launches: probe.launches, externalRequests: probe.externalRequests,
    modelOrDBCalls: 0, technicalFixturesNotQuestions: true,
  }, null, 2));
}, 60000);
it.each([
  ['transparent-grid', grid(), grid(), ['8×8', '8×8']],
  ['count-mismatch-visible', grid(), grid(9, 8), ['8×8', '9×8']],
  ['one-side-unknown', triangle, grid(), ['실측 불명', '8×8']],
  ['no-grid', triangle, triangle, []],
])('actual comparison %s keeps original pixels and honest derived labels', async (id, originalSvg, svg, legends) => {
  const fixture = fixtures[originalSvg === triangle ? 'triangle' : 'grid'];
  expect(sha(originalSvg)).toBe(fixture.svgSHA256);
  const original = fixture.dataUrl;
  const before = sha(original), svgBefore = sha(svg);
  const start = performance.now();
  const result = await buildFigureComparisonImage(original, svg);
  const state = probe.snapshots.at(-1);
  const png = Buffer.from(result.split(',')[1], 'base64');
  writeFileSync(path.join(out, `comparison-${id}-r1.png`), png);
  records.push({ id, elapsedMs: performance.now() - start, sourceSHA256: before, svgSHA256: svgBefore,
    screenshotSHA256: sha(png), state, noSourceMutation: before === sha(original) && svgBefore === sha(svg) });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1840, 960]);
  expect(state.images[0]).toBe(original);
  expect(state.scriptsDisabled).toBe(true);
  expect(state.legends).toHaveLength(legends.length);
  for (const [i, text] of legends.entries()) expect(state.legends[i]).toContain(text);
  expect(state.frames.every(f => f.ticksFit && f.legendDoesNotCoverIndices)).toBe(true);
  expect(probe.externalRequests).toEqual([]);
  expect(before).toBe(sha(original)); expect(svgBefore).toBe(sha(svg));
}, 60000);
