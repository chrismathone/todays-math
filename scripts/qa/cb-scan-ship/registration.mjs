import { createServer } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import png from "pngjs";
import jsQR from "jsqr";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const out = process.env.CB_SCAN_QA_OUTPUT ?? "/tmp/cb-scan-ship-20261125";
const warped = path.join(out, "registration");
await mkdir(warped, { recursive: true });
const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { "@": path.join(root, "src") } },
  server: { middlewareMode: true },
  appType: "custom",
});
// Known transforms chosen before registration. Truth is independent of detected marker/QR positions.
const cases = [
  {
    name: "perspective-right",
    width: 1200,
    height: 1650,
    h: [4.3, 0.2, 90, -0.1, 4.6, 80, 0.0003, 0.00008, 1],
  },
  {
    name: "perspective-left",
    width: 1350,
    height: 1550,
    h: [4.6, -0.15, 160, 0.1, 4.3, 80, -0.0002, 0.00035, 1],
  },
  {
    name: "rotated",
    width: 1600,
    height: 1200,
    h: [0, -4.5, 1430, 4.5, 0.05, 70, 0.0001, 0, 1],
  },
];
function inverse([a, b, c, d, e, f, g, h, i]) {
  const cof = [
    e * i - f * h,
    c * h - b * i,
    b * f - c * e,
    f * g - d * i,
    a * i - c * g,
    c * d - a * f,
    d * h - e * g,
    b * g - a * h,
    a * e - b * d,
  ];
  const det = a * cof[0] + b * cof[3] + c * cof[6];
  return cof.map((v) => v / det);
}
function project(h, x, y) {
  const d = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d];
}
function warp(source, test) {
  const result = new png.PNG({ width: test.width, height: test.height });
  result.data.fill(255);
  const inv = inverse(test.h);
  for (let y = 0; y < test.height; y++)
    for (let x = 0; x < test.width; x++) {
      const [mx, my] = project(inv, x + 0.5, y + 0.5);
      const sx = (mx * source.width) / 210 - 0.5,
        sy = (my * source.height) / 297 - 0.5;
      if (sx < 0 || sy < 0 || sx >= source.width - 1 || sy >= source.height - 1)
        continue;
      const x0 = Math.floor(sx),
        y0 = Math.floor(sy),
        dx = sx - x0,
        dy = sy - y0;
      const offsets = [
        (y0 * source.width + x0) * 4,
        (y0 * source.width + x0 + 1) * 4,
        ((y0 + 1) * source.width + x0) * 4,
        ((y0 + 1) * source.width + x0 + 1) * 4,
      ];
      const weights = [
        (1 - dx) * (1 - dy),
        dx * (1 - dy),
        (1 - dx) * dy,
        dx * dy,
      ];
      for (let c = 0; c < 3; c++)
        result.data[(y * test.width + x) * 4 + c] = Math.round(
          offsets.reduce(
            (sum, o, j) => sum + source.data[o + c] * weights[j],
            0,
          ),
        );
    }
  return result;
}
try {
  const {
    registerScanPhoto,
    scanMarkerCandidates,
    fitScanHomography,
    scanQrDataCorners,
  } = await server.ssrLoadModule("/src/lib/concept-blank/scan/registration.ts");
  const pages = JSON.parse(
    await readFile(path.join(out, "issued-raster-evidence.json"), "utf8"),
  ).filter((p) => p.part === "student");
  const evidence = [];
  for (const page of pages) {
    const built = JSON.parse(
      await readFile(path.join(out, `issued-${page.sample}.json`), "utf8"),
    );
    const layout = built.layout.pages.find(
      (p) => p.part === "student" && p.number === page.page,
    );
    const source = png.PNG.sync.read(await readFile(page.file));
    for (const test of cases) {
      const rendered = warp(source, test),
        data = new Uint8ClampedArray(rendered.data);
      const qr = jsQR(data, rendered.width, rendered.height, {
        inversionAttempts: "dontInvert",
      });
      if (qr?.data !== page.url)
        throw new Error(
          `${page.sample}/${page.page}/${test.name}: QR mismatch`,
        );
      const result = registerScanPhoto(
        { data, width: rendered.width, height: rendered.height },
        layout,
        {
          version: qr.version,
          corners: [
            qr.location.topLeftCorner,
            qr.location.topRightCorner,
            qr.location.bottomRightCorner,
            qr.location.bottomLeftCorner,
          ],
        },
      );
      if (result.status !== "matched") {
        await writeFile(
          path.join(warped, "failed.png"),
          png.PNG.sync.write(rendered),
        );
        const tl = qr.location.topLeftCorner,
          tr = qr.location.topRightCorner,
          bl = qr.location.bottomLeftCorner;
        const estimate = fitScanHomography(
          scanQrDataCorners(layout.qr, qr.version),
          [tl, tr, { x: tr.x + bl.x - tl.x, y: tr.y + bl.y - tl.y }, bl],
        );
        console.log(
          JSON.stringify({
            layout: layout.markers,
            predictions: layout.markers.map((m) => {
              const p = project(estimate, m.x, m.y),
                px = project(estimate, m.x + 1, m.y),
                py = project(estimate, m.x, m.y + 1);
              const scale = Math.min(
                Math.hypot(px[0] - p[0], px[1] - p[1]),
                Math.hypot(py[0] - p[0], py[1] - p[1]),
              );
              return {
                predicted: p,
                truth: project(test.h, m.x, m.y),
                scale,
                candidates: scanMarkerCandidates(
                  { data, width: rendered.width, height: rendered.height },
                  { x: p[0], y: p[1] },
                  scale,
                ),
              };
            }),
          }),
        );
        throw new Error(
          `${page.sample}/${page.page}/${test.name}: ${result.reason}`,
        );
      }
      const errors = [];
      for (const slot of layout.slots) {
        const b = slot.box;
        for (const [x, y] of [
          [b.x, b.y],
          [b.x + b.width, b.y],
          [b.x + b.width, b.y + b.height],
          [b.x, b.y + b.height],
          [b.x + b.width / 2, b.y + b.height / 2],
        ]) {
          const actual = project(result.transform, x, y),
            truth = project(test.h, x, y),
            inv = inverse(test.h);
          const recovered = project(inv, ...actual);
          errors.push({
            px: Math.hypot(actual[0] - truth[0], actual[1] - truth[1]),
            mm: Math.hypot(recovered[0] - x, recovered[1] - y),
          });
        }
      }
      const file = path.join(
        warped,
        `${page.sample}-${page.page}-${test.name}.png`,
      );
      await writeFile(file, png.PNG.sync.write(rendered));
      const row = {
        sample: page.sample,
        page: page.page,
        case: test.name,
        file,
        slots: layout.slots.length,
        points: errors.length,
        maxErrorPx: Math.max(...errors.map((e) => e.px)),
        maxErrorMm: Math.max(...errors.map((e) => e.mm)),
        qrErrorMm: result.qrErrorMm,
      };
      if (row.maxErrorMm > 1.25)
        throw new Error(`QA limit exceeded: ${JSON.stringify(row)}`);
      evidence.push(row);
      console.log(JSON.stringify(row));
    }
  }
  await writeFile(
    path.join(out, "registration-evidence.json"),
    JSON.stringify(
      { kind: "synthetic-perspective-not-phone-accuracy", cases, evidence },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
