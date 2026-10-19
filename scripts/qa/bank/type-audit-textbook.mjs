/** Local figure comparison sheets and bounded SVG box measurement; no remote reads. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import sharp from "sharp";
import puppeteer from "puppeteer-core";

const [input, project, output, browserExecutable] = process.argv.slice(2);
if (!input || !project || !output || !browserExecutable)
  throw new Error(
    "snapshot-directory project-directory private-output-directory browser-executable required",
  );
const meta = JSON.parse(
  fs.readFileSync(path.join(input, "snapshot-meta.json"), "utf8"),
);
if (!meta.readOnly) throw new Error("read-only snapshot required");
const sourceRows = [],
  children = [],
  snapshotHash = crypto.createHash("sha256");
const stream = fs.createReadStream(path.join(input, "snapshot.jsonl"));
stream.on("data", (bytes) => snapshotHash.update(bytes));
let count = 0;
for await (const line of readline.createInterface({
  input: stream,
  crlfDelay: Infinity,
})) {
  if (!line) continue;
  count++;
  const row = JSON.parse(line);
  if (!row.figureSvg && !row.figureUrls.length) continue;
  if (row.source === "school_textbook") sourceRows.push(row);
  if (
    row.source === "transformed" &&
    row.externalId?.startsWith("tb-retry-v1:")
  )
    children.push(row);
}
if (count !== meta.total || snapshotHash.digest("hex") !== meta.sha256)
  throw new Error("snapshot mismatch");
const parentIds = new Set(children.map((row) => row.originProblemId));
const sources = sourceRows
  .filter((row) => parentIds.has(row.id))
  .sort((a, b) => a.id.localeCompare(b.id));
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const evidence = [],
  sheets = [];
for (let idx = 0; idx < sources.length; idx++) {
  const source = sources[idx],
    cells = [];
  const pair = children
    .filter((row) => row.originProblemId === source.id)
    .sort((a, b) => a.externalId.localeCompare(b.externalId));
  for (const row of [source, ...pair]) {
    const bytes = row.figureSvg
      ? [Buffer.from(row.figureSvg)]
      : row.figureUrls.map((url) =>
          fs.readFileSync(path.join(project, "public", url)),
        );
    const composites = [];
    let top = 30;
    for (const asset of bytes) {
      const png = await sharp(asset)
        .resize({ width: 480, height: 370, fit: "inside" })
        .flatten({ background: "#ffffff" })
        .png()
        .toBuffer();
      composites.push({ input: png, top, left: 10 });
      top += (await sharp(png).metadata()).height + 10;
    }
    composites.push({
      input: Buffer.from(
        `<svg width="500" height="28"><text x="8" y="20" font-size="15">${row.problemCode} ${row.id.slice(0, 8)}</text></svg>`,
      ),
      top: 0,
      left: 0,
    });
    cells.push(
      await sharp({
        create: { width: 500, height: 810, channels: 3, background: "#ffffff" },
      })
        .composite(composites)
        .png()
        .toBuffer(),
    );
    evidence.push({
      id: row.id,
      parentId: row.originProblemId,
      assetSha256: bytes.map(hash),
      assetCount: bytes.length,
    });
  }
  const file = `comparison-${String(idx + 1).padStart(2, "0")}.png`;
  const png = await sharp({
    create: { width: 1500, height: 810, channels: 3, background: "#ffffff" },
  })
    .composite(
      cells.map((bytes, i) => ({ input: bytes, left: i * 500, top: 0 })),
    )
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(output, file), png, { mode: 0o600 });
  sheets.push({ file, sha256: hash(png), sourceId: source.id });
}
const browser = await puppeteer.launch({
  executablePath: browserExecutable,
  headless: true,
});
const boxCases = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 260 });
  for (const row of children.filter(
    (row) => row.originProblemId === "731e9030-515e-4eb9-90a8-edd392fe232c",
  )) {
    await page.setContent(
      `<!doctype html><meta charset="UTF-8"><body>${row.figureSvg}</body>`,
    );
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const box = document.querySelector("rect").getBBox();
      return {
        containerRight: box.x + box.width,
        labels: [...document.querySelectorAll("text")].map((label) => {
          const b = label.getBBox();
          return {
            x: b.x,
            width: b.width,
            right: b.x + b.width,
            outsideBorderBy: b.x + b.width - box.x - box.width,
          };
        }),
      };
    });
    const screenshot = await (await page.$("svg")).screenshot();
    const screenshotFile = `condition-box-${row.id}.png`;
    fs.writeFileSync(path.join(output, screenshotFile), screenshot, {
      mode: 0o600,
    });
    boxCases.push({
      id: row.id,
      code: row.problemCode,
      svgSha256: hash(row.figureSvg),
      screenshotFile,
      screenshotSha256: hash(screenshot),
      geometry,
    });
  }
  const report = {
    snapshotSha256: meta.sha256,
    sources: sources.length,
    children: children.length,
    assets: evidence.reduce((sum, row) => sum + row.assetCount, 0),
    evidence,
    sheets,
    boxCases,
    browserVersion: await browser.version(),
    limitation:
      "Intrinsic raster/DOM comparison using local font fallback; does not replay all product page or print layouts.",
  };
  fs.writeFileSync(
    path.join(output, "visual-evidence.json"),
    JSON.stringify(report, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      sources: report.sources,
      children: report.children,
      assets: report.assets,
      boxCases: report.boxCases,
    }),
  );
} finally {
  await browser.close();
}
