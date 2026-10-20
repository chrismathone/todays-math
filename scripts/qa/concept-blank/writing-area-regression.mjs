/**
 * Vite 하네스를 먼저 켠다:
 * npx vite --config e2e/concept-blank-paper/vite.config.mts
 * node scripts/qa/concept-blank/writing-area-regression.mjs before /absolute/evidence
 * (구현 후) 같은 명령의 before → after, 마지막으로 compare.
 * 큰 PDF/PNG는 반드시 저장소 밖에 둔다. 기준 파일을 자동 갱신하지 않는다.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

const [phase, destination] = process.argv.slice(2);
assert.ok(["before", "after", "compare"].includes(phase));
assert.ok(
  destination && path.isAbsolute(destination),
  "저장소 밖 절대 경로 필요",
);
const root = path.resolve(destination);
assert.ok(
  !root.startsWith(`${process.cwd()}${path.sep}`) && root !== process.cwd(),
  "큰 증거 파일은 저장소 밖에 둔다",
);

if (phase === "compare") {
  const before = JSON.parse(
    await readFile(path.join(root, "before/manifest.json")),
  );
  const after = JSON.parse(
    await readFile(path.join(root, "after/manifest.json")),
  );
  assert.deepEqual(
    after.records,
    before.records,
    "쪽 수·글꼴·기존 요소의 배치",
  );
  assert.deepEqual(after.images, before.images, "PNG 목록");
  const comparisons = [];
  for (const name of before.images) {
    const a = await sharp(path.join(root, "before", name))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const b = await sharp(path.join(root, "after", name))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(b.info, a.info, `${name} 크기`);
    let changedPixels = 0;
    let maxChannelDelta = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      let changed = false;
      for (let c = 0; c < 4; c++) {
        const delta = Math.abs(a.data[i + c] - b.data[i + c]);
        changed ||= delta > 0;
        maxChannelDelta = Math.max(maxChannelDelta, delta);
      }
      if (changed) changedPixels++;
    }
    comparisons.push({ name, changedPixels, maxChannelDelta });
  }
  await writeFile(
    path.join(root, "comparison.json"),
    JSON.stringify(
      {
        beforeSourceHashes: before.sourceHashes,
        afterSourceHashes: after.sourceHashes,
        documents: before.records.length,
        pages: before.records.reduce((sum, record) => sum + record.pages, 0),
        comparisons,
      },
      null,
      2,
    ),
  );
  assert.deepEqual(
    comparisons.filter((comparison) => comparison.changedPixels > 0),
    [],
    "허용 오차 0px",
  );
  console.log(`${comparisons.length} PNG: 바뀐 픽셀 0`);
} else {
  const out = path.join(root, phase);
  // 이미 확보한 변경 전 기준을 실수로 덮지 않는다.
  await mkdir(out);
  const sourcePaths = [
    "src/components/print/WritingArea.tsx",
    "src/components/print/WritingArea.module.css",
    "src/components/concept-blank/paper/StudentBody.tsx",
    "src/components/concept-blank/paper/paper.module.css",
    "src/components/concept-blank/paper/paginate.ts",
    "src/lib/concept-blank/sheetCode.ts",
    "src/__tests__/fixtures/conceptBlankWritingArea.ts",
    "e2e/concept-blank-paper/writing-area.tsx",
  ];
  const hashes = async () =>
    Object.fromEntries(
      await Promise.all(
        sourcePaths.map(async (file) => [
          file,
          createHash("sha256")
            .update(await readFile(file))
            .digest("hex"),
        ]),
      ),
    );
  const sourceHashes = await hashes();
  const browser = await chromium.launch({
    channel: process.env.CB_CHANNEL || "chrome",
  });
  const errors = [];
  const records = [];
  const rasterWarnings = [];
  try {
    const cases = [];
    for (const mode of ["legacy", "questions"])
      for (const form of ["recall", "term", "cloze", "map", "figure"])
        for (const view of ["student", "key"])
          cases.push({
            name: `${mode}-${form}-${view}`,
            params: { mode, form, view },
          });
    for (const view of ["student", "key"])
      for (const mono of ["0", "1"])
        cases.push({
          name: `descriptive-${view}-${mono}`,
          params: { descriptive: "1", view, mono },
        });
    for (const specimen of cases) {
      const page = await browser.newPage({
        viewport: { width: 1000, height: 1250 },
      });
      page.on("pageerror", (error) => errors.push(String(error)));
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (
          url.pathname.startsWith("/api/") ||
          !["127.0.0.1", "localhost"].includes(url.hostname)
        )
          errors.push(`예상 밖 요청: ${url}`);
      });
      await page.emulateMedia({ media: "print" });
      await page.goto(
        `${process.env.CB_URL || "http://127.0.0.1:4233"}/writing-area.html?${new URLSearchParams(specimen.params)}`,
        { waitUntil: "networkidle" },
      );
      await page.locator("[data-print-page]").first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const fonts = await page.evaluate(() =>
        [...document.fonts].map((font) => ({
          family: font.family,
          status: font.status,
        })),
      );
      if (!specimen.params.descriptive)
        assert.ok(
          fonts.some(
            (font) =>
              font.family.includes("cb-harness-noto-serif-kr") &&
              font.status === "loaded",
          ),
        );
      assert.ok(!fonts.some((font) => font.status === "error"));
      const pages = page.locator("[data-print-page]");
      const count = await pages.count();
      const geometry = await pages.evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return {
            width: r.width,
            height: r.height,
            text: node.textContent,
            areas: [
              ...node.querySelectorAll(
                "[data-cb-ruled], [data-cb-box], [data-cb-item], [data-cb-node], [data-cb-card]",
              ),
            ].map((area) => {
              const box = area.getBoundingClientRect();
              return {
                x: box.x - r.x,
                y: box.y - r.y,
                width: box.width,
                height: box.height,
              };
            }),
          };
        }),
      );
      for (let i = 0; i < count; i++)
        await pages
          .nth(i)
          .screenshot({
            path: path.join(out, `${specimen.name}-screen-${i + 1}.png`),
          });
      const pdfPath = path.join(out, `${specimen.name}.pdf`);
      await page.pdf({
        path: pdfPath,
        format: "A4",
        preferCSSPageSize: true,
        printBackground: true,
      });
      const pdf = await PDFDocument.load(await readFile(pdfPath));
      assert.equal(pdf.getPageCount(), count, `${specimen.name} PDF 쪽 수`);
      for (const sheet of pdf.getPages()) {
        assert.ok(Math.abs(sheet.getWidth() - 595.28) < 1);
        assert.ok(Math.abs(sheet.getHeight() - 841.89) < 1);
      }
      const raster = spawnSync(
        "pdftoppm",
        ["-r", "144", "-png", pdfPath, path.join(out, `${specimen.name}-pdf`)],
        { encoding: "utf8" },
      );
      assert.equal(raster.status, 0, raster.stderr);
      if (raster.stderr)
        rasterWarnings.push({ name: specimen.name, warning: raster.stderr });
      records.push({ name: specimen.name, pages: count, geometry, fonts });
      console.log(`${phase}: ${specimen.name} ${count}쪽`);
      await page.close();
    }
    assert.deepEqual(errors, [], "브라우저 오류 · API/외부 요청");
    assert.deepEqual(await hashes(), sourceHashes, "캡처 중 소스 변경");
    await writeFile(
      path.join(out, "manifest.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          browser: browser.version(),
          sourceHashes,
          records,
          rasterWarnings,
          images: (await readdir(out))
            .filter((file) => file.endsWith(".png"))
            .sort(),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}
