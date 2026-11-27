import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import sharp from "sharp";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const productRoot = path.resolve(process.env.CB_INK_PRODUCT_ROOT ?? root);
const [
  input = "/tmp/cb-synth-photo-20261127",
  output = "/tmp/cb-ink-lines-bench",
  blankCheck,
] = process.argv.slice(2);
await mkdir(output, { recursive: true });
const relativeOutput = path.relative(
  await realpath(root),
  await realpath(output),
);
if (
  !relativeOutput ||
  (!relativeOutput.startsWith(".." + path.sep) && relativeOutput !== "..")
) {
  throw new Error("Benchmark output must be outside the checkout");
}
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const server = await createServer({
  root,
  configFile: false,
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "server-only": path.join(root, "scripts/qa/cb-scan-ship/server-only.mjs"),
    },
    preserveSymlinks: true,
  },
  server: { middlewareMode: true, ws: false },
  appType: "custom",
});

async function pixels(encoded) {
  const {
    data,
    info: { width, height },
  } = await sharp(encoded)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width,
    height,
  };
}
const corners = [
  "topLeftCorner",
  "topRightCorner",
  "bottomRightCorner",
  "bottomLeftCorner",
];
function center(box) {
  return box.y + box.height / 2;
}
function fromCorners([left, top, right, bottom]) {
  return { x: left, y: top, width: right - left, height: bottom - top };
}
function intersection(a, b, axis, size) {
  return Math.max(
    0,
    Math.min(a[axis] + a[size], b[axis] + b[size]) - Math.max(a[axis], b[axis]),
  );
}
function matchLines(found, expected) {
  const candidates = found
    .flatMap((line, i) =>
      expected.map((truth, j) => {
        const x = intersection(line, truth, "x", "width");
        const y = intersection(line, truth, "y", "height");
        return {
          i,
          j,
          overlap: x * y,
          centerErrorMm: Math.abs(center(line) - center(truth)),
          xIoU: x / (line.width + truth.width - x),
        };
      }),
    )
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => a.centerErrorMm - b.centerErrorMm || b.overlap - a.overlap);
  const usedFound = new Set();
  const usedTruth = new Set();
  return candidates.filter(({ i, j }) => {
    if (usedFound.has(i) || usedTruth.has(j)) return false;
    usedFound.add(i);
    usedTruth.add(j);
    return true;
  });
}
function stats(values) {
  const sorted = values.toSorted((a, b) => a - b);
  const n = sorted.length;
  return n
    ? {
        n,
        min: sorted[0],
        median: (sorted[(n - 1) >> 1] + sorted[n >> 1]) / 2,
        max: sorted.at(-1),
      }
    : null;
}
function totals(slots) {
  const equal = slots.filter(({ equal }) => equal).length;
  return {
    slots: slots.length,
    equal,
    equalRate: slots.length ? equal / slots.length : null,
    unreliable: slots.filter(({ status }) => status === "unreliable").length,
  };
}
function overlay(box, color) {
  return (
    '<rect x="' +
    box.x +
    '" y="' +
    box.y +
    '" width="' +
    box.width +
    '" height="' +
    box.height +
    '" fill="none" stroke="' +
    color +
    '" stroke-width=".30"/>'
  );
}
async function diagnostic(photo, name, slots) {
  const marks = slots
    .flatMap(({ box, expected, found, ghosts, status }) => [
      overlay(box, status === "unreliable" ? "#df4804" : "#6458f5"),
      ...expected.map((line) => overlay(line, "#00a045")),
      ...found.map((line) => overlay(line, "#e30064")),
      ...ghosts.map((line) => overlay(line, "#f59d00")),
    ])
    .join("");
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    photo.width +
    '" height="' +
    photo.height +
    '" viewBox="0 0 210 297">' +
    marks +
    "</svg>";
  await sharp(photo.bytes)
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 88 })
    .toFile(path.join(output, name + ".jpg"));
}

try {
  const { prepareScanPhoto } = await server.ssrLoadModule(
    "/@fs" +
      path.join(productRoot, "src/lib/concept-blank/scan/flatten.server.ts"),
  );
  const { findInkLines } = await server.ssrLoadModule(
    "/src/lib/concept-blank/scan/inkLines.ts",
  );
  const sources = await readJson(path.join(input, "sources.json"));
  const photos = await readJson(path.join(input, "photos.json"));
  const registrations = { matched: 0, uncertain: 0, failed: 0 };
  const slots = [];
  for (const name of photos) {
    const truth = await readJson(path.join(input, name + ".json"));
    const source = sources[truth.sourceIndex];
    const bytes = await readFile(path.join(input, name + ".jpg"));
    const raster = await pixels(bytes);
    const qr = jsQR(raster.data, raster.width, raster.height, {
      inversionAttempts: "dontInvert",
    });
    if (qr?.data !== source.url || qr.version !== source.qrVersion) {
      registrations.failed++;
      continue;
    }
    // The product preparation runs registration, warps only matched pages and encodes storage JPEG.
    const photo = await prepareScanPhoto(
      {
        bytes,
        mime: "image/jpeg",
        pixels: raster,
        width: raster.width,
        height: raster.height,
        hash: "",
        geometry: {
          version: qr.version,
          corners: corners.map((key) => qr.location[key]),
        },
      },
      source.layout,
    );
    const { status } = photo.registration;
    registrations[status]++;
    if (status !== "matched") continue;

    const flat = await pixels(photo.bytes);
    const reference = await pixels(path.join(input, truth.blank));
    const pageSlots = truth.slots.map((slot) => {
      const { box } = source.layout.slots.find(
        ({ slotId }) => slotId === slot.id,
      );
      const result = findInkLines(flat, box, reference);
      const found = result.lines.map((line) => line.box);
      const expected = slot.lines.map((line) => fromCorners(line.fullInk.mm));
      const ghosts = slot.erasures
        .filter(({ kind }) => kind === "ghost")
        .map(({ ink }) => fromCorners(ink.mm));
      const pairs = matchLines(found, expected);
      const unmatched = found.filter(
        (_, i) => !pairs.some((pair) => pair.i === i),
      );
      const ghostHits = matchLines(unmatched, ghosts).length;
      return {
        photo: name,
        id: slot.id,
        kind: slot.kind,
        box,
        status: result.status,
        reason: result.reason,
        expected,
        found,
        inkRatios: result.lines.map(({ inkRatio }) => inkRatio),
        ghosts,
        pairs,
        ghostHits,
        equal: result.status === "ok" && found.length === expected.length,
      };
    });
    slots.push(...pageSlots);
    if (
      pageSlots.some(
        ({ equal, pairs }) => !equal || pairs.some(({ xIoU }) => xIoU < 0.8),
      )
    ) {
      await diagnostic(photo, name, pageSlots);
    }
  }

  let blankSample = null;
  if (blankCheck) {
    // Optional manifest for a local, already flattened blank photograph and independently rendered reference.
    const manifestDir = path.dirname(path.resolve(blankCheck));
    const { photo, reference, boxes } = await readJson(blankCheck);
    if (!Array.isArray(boxes) || !boxes.length) {
      throw new Error("Blank-photo manifest must contain at least one slot");
    }
    const encoded = await readFile(path.resolve(manifestDir, photo));
    const actual = await pixels(encoded);
    const blank = await pixels(path.resolve(manifestDir, reference));
    const checks = boxes.map((box) => findInkLines(actual, box, blank));
    blankSample = {
      slots: checks.length,
      unreliable: checks.filter(({ status }) => status === "unreliable").length,
      checks,
      falseLines: checks.reduce((n, item) => n + item.lines.length, 0),
    };
  }
  const pairs = slots.flatMap((slot) => slot.pairs);
  const empty = slots.filter(({ expected }) => !expected.length);
  const summary = {
    photos: photos.length,
    productRoot,
    registrations,
    all: totals(slots),
    multiple: totals(slots.filter(({ expected }) => expected.length > 1)),
    empty: {
      ...totals(empty),
      falseLines: empty.reduce((n, slot) => n + slot.found.length, 0),
    },
    truthLines: slots.reduce((n, slot) => n + slot.expected.length, 0),
    foundLines: slots.reduce((n, slot) => n + slot.found.length, 0),
    centerErrorMm: stats(pairs.map(({ centerErrorMm }) => centerErrorMm)),
    xIoU: stats(pairs.map(({ xIoU }) => xIoU)),
    ghostHits: slots.reduce((n, slot) => n + slot.ghostHits, 0),
    ghosts: slots.reduce((n, slot) => n + slot.ghosts.length, 0),
    blankSample,
  };
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify({ summary, slots }, null, 2) + "\n",
  );
  console.log(JSON.stringify(summary, null, 2));
  if (summary.empty.falseLines || blankSample?.falseLines) process.exitCode = 1;
} finally {
  await server.close();
}
