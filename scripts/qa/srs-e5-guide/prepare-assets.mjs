// Deterministic delivery conversion: outside-connected white only; preserve enclosed whites.
// node scripts/qa/srs-e5-guide/prepare-assets.mjs D:/tmp/guide/candidates
import sharp from "sharp";
import { readdir, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const source = process.argv[2];
if (!source) throw Error("Pass the original candidates directory");
const ids = [
  "peer-recorder",
  "marten",
  "paper-swallow",
  "bookmark-spirit",
  "wood-friend",
];
const poses = ["guide", "correct", "again", "done", "reward"];
const directories = (await readdir(source, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const manifest = [];
for (let n = 0; n < ids.length; n++)
  for (let j = 0; j < poses.length; j++) {
    const input = path.join(source, directories[n], `${j + 1}-${poses[j]}.png`);
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const background = new Uint8Array(w * h),
      queue = new Int32Array(w * h);
    let head = 0,
      tail = 0;
    function enqueue(p) {
      if (background[p]) return;
      const k = p * 4,
        low = Math.min(data[k], data[k + 1], data[k + 2]),
        high = Math.max(data[k], data[k + 1], data[k + 2]);
      if (low <= 242 || high - low >= 16) return;
      background[p] = 1;
      queue[tail++] = p;
    }
    for (let x = 0; x < w; x++) {
      enqueue(x);
      enqueue((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      enqueue(y * w);
      enqueue(y * w + w - 1);
    }
    while (head < tail) {
      const p = queue[head++],
        x = p % w,
        y = Math.floor(p / w);
      if (x) enqueue(p - 1);
      if (x < w - 1) enqueue(p + 1);
      if (y) enqueue(p - w);
      if (y < h - 1) enqueue(p + w);
    }
    for (let p = 0; p < background.length; p++) {
      const k = p * 4;
      if (background[p]) {
        data[k + 3] = 0;
        continue;
      }
      const x = p % w,
        y = Math.floor(p / w);
      const edge =
        (x > 0 && background[p - 1]) ||
        (x < w - 1 && background[p + 1]) ||
        (y > 0 && background[p - w]) ||
        (y < h - 1 && background[p + w]);
      if (!edge) continue;
      const alpha = Math.min(
        1,
        (255 - Math.min(data[k], data[k + 1], data[k + 2])) / 85,
      );
      if (alpha <= 0) {
        data[k + 3] = 0;
        continue;
      }
      for (let c = 0; c < 3; c++)
        data[k + c] = Math.max(
          0,
          Math.round((data[k + c] - 255 * (1 - alpha)) / alpha),
        );
      data[k + 3] = Math.round(alpha * 255);
    }
    // Same place as `guideAssetPath` (src/lib/math-srs/guideAssets.ts) — the student gate opens it.
    const out = path.join("public/images/guides", ids[n], `${poses[j]}.webp`);
    await mkdir(path.dirname(out), { recursive: true });
    await sharp(data, { raw: { width: w, height: h, channels: 4 } })
      .resize(
        poses[j] === "reward" ? 252 : 200,
        poses[j] === "reward" ? 252 : 152,
        { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } },
      )
      .webp({ quality: 88, alphaQuality: 100, effort: 6 })
      .toFile(out);
    manifest.push({
      id: ids[n],
      pose: poses[j],
      source: path.join(directories[n], `${j + 1}-${poses[j]}.png`),
      sourceSha256: createHash("sha256")
        .update(await readFile(input))
        .digest("hex"),
      output: out.replaceAll("\\", "/"),
      bytes: (await stat(out)).size,
    });
  }
await mkdir("docs/planning/tracks/reports/srs-e5-guide-screens-20261020", {
  recursive: true,
});
await writeFile(
  "docs/planning/tracks/reports/srs-e5-guide-screens-20261020/assets.json",
  JSON.stringify(
    {
      totalBytes: manifest.reduce((sum, item) => sum + item.bytes, 0),
      files: manifest,
    },
    null,
    2,
  ),
);
console.log(
  `${manifest.length} files, ${manifest.reduce((sum, item) => sum + item.bytes, 0)} bytes`,
);
