/** Family first/last, thin-shape extremes and retained browser candidates.
 * Uses final production SVG bytes and records every pictured ID/hash. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import sharp from "sharp";
const out = "docs/planning/tracks/reports/arithmetic-figure-quality-20261112",
  m = JSON.parse(gunzipSync(readFileSync(`${out}/manifest.json.gz`)));
const canonicalMode = process.argv.includes("--canonical");
const chosen = new Map(),
  add = (r, why) => {
    if (r?.display) {
      const old = chosen.get(r.id);
      chosen.set(r.id, { ...r, reasons: [...(old?.reasons ?? []), why] });
    }
  };
for (const family of m.families) {
  const visible = m.rows.some((r) => r.family === family.id && r.display);
  const rows = m.rows
    .filter(
      (r) =>
        r.family === family.id && (canonicalMode ? r.canonical : r.display),
    )
    .map((r) =>
      canonicalMode
        ? { ...r, display: r.canonical, screen: r.sourceScreen }
        : r,
    );
  if (canonicalMode && visible) continue;
  add(
    rows[0],
    canonicalMode
      ? "hidden frozen source first"
      : "first displayed domain variant",
  );
  add(
    rows.at(-1),
    canonicalMode
      ? "hidden frozen source last"
      : "last displayed domain variant",
  );
}
for (const family of m.families.filter(
  (f) => !canonicalMode && f.id.startsWith("m3-trig-"),
)) {
  const rows = m.rows
    .filter((r) => r.family === family.id && r.display)
    .sort(
      (a, b) =>
        a.screen.height / a.screen.width - b.screen.height / b.screen.width,
    );
  add(rows[0], "widest/shortest display");
  add(rows.at(-1), "tallest/narrowest display");
}
for (const id of canonicalMode
  ? []
  : [
      "gt1-m2-trapezoid-diagonal-midpoints-4-6",
      "inline:m3-trig-side-from-area-sine:960",
      "inline:m3-trig-sine-from-area:1515",
      "inline:m3-trig-length-given-ratio:197",
      "inline:m3-trig-side-from-area-sine:12555",
      "inline:m3-trig-side-from-area-sine:12237",
    ])
  add(
    m.rows.find((r) => r.id === id),
    "reported or exact-geometry extreme",
  );
const flags = JSON.parse(
  readFileSync("/tmp/arithmetic-figure-quality/browser-flags.json"),
);
for (const f of canonicalMode ? [] : flags)
  add(
    m.rows.find((r) => r.id === f.id),
    "browser stroke-bounds candidate, requires interpretation",
  );
const prefix = canonicalMode ? "source-contacts" : "contacts";
const rows = [...chosen.values()],
  W = 1200,
  H = 1540;
mkdirSync(`${out}/${prefix}`, { recursive: true });
const pages = [];
for (let o = 0; o < rows.length; o += 16) {
  const batch = rows.slice(o, o + 16),
    layers = [];
  for (let i = 0; i < batch.length; i++) {
    const r = batch[i],
      x = (i % 4) * 300,
      y = Math.floor(i / 4) * 385;
    const response = await fetch(`http://127.0.0.1:3197/asset/${r.display}`);
    if (!response.ok) throw Error(`SVG cache unavailable: ${r.id}`);
    const img = await sharp(Buffer.from(await response.text()))
      .resize({ width: 280, height: 280, fit: "inside" })
      .png()
      .toBuffer();
    layers.push({ input: img, left: x + 10, top: y + 50 });
    const label = `<svg width="300" height="45"><rect width="300" height="45" fill="white"/><text x="8" y="14" font-family="Arial" font-size="10">${r.id.replace(/&/g, "&amp;")}</text><text x="8" y="30" font-family="Arial" font-size="10">${r.family}</text></svg>`;
    layers.push({ input: Buffer.from(label), left: x, top: y });
  }
  const file = `${prefix}/contact-${String(o / 16 + 1).padStart(2, "0")}.png`;
  await sharp({
    create: { width: W, height: H, channels: 3, background: "white" },
  })
    .composite(layers)
    .png()
    .toFile(`${out}/${file}`);
  pages.push({
    file,
    rows: batch.map(({ id, family, display, reasons }) => ({
      id,
      family,
      display,
      reasons,
    })),
  });
}
writeFileSync(
  `${out}/${canonicalMode ? "source-visual-manifest" : "visual-manifest"}.json`,
  JSON.stringify(
    {
      selectedIDs: rows.length,
      representedFamilies: new Set(rows.map((r) => r.family)).size,
      displayedFamilies: new Set(
        m.rows.filter((r) => r.display).map((r) => r.family),
      ).size,
      pages,
    },
    null,
    2,
  ),
);
console.log({ ids: rows.length, pages: pages.length });
