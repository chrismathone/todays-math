import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import sharp from "sharp";
import { createServer } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = fileURLToPath(new URL("../../../..", import.meta.url));
const out = path.resolve(
  process.env.CB_SYNTH_OUTPUT ?? "/tmp/cb-synth-photo-20261127",
);
const [fontDir, referenceDir] = process.argv.slice(2);
if (
  !fontDir ||
  !referenceDir ||
  out === root ||
  out.startsWith(root + path.sep)
) {
  throw new Error(
    "Usage: node run.mjs FONT_DIR REFERENCE_DIR (CB_SYNTH_OUTPUT must be outside the checkout)",
  );
}
await mkdir(out, { recursive: true });
const started = performance.now();
const writeJson = (name, data) =>
  writeFile(path.join(out, name), JSON.stringify(data, null, 2) + "\n");
const server = await createServer({
  root,
  configFile: false,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "server-only": fileURLToPath(
        new URL("../../cb-scan-ship/server-only.mjs", import.meta.url),
      ),
    },
    preserveSymlinks: true,
  },
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { loadGradeBank } = await server.ssrLoadModule(
    "/src/lib/concept-blank/bank/loadAuthored.ts",
  );
  const { renderScanPaper, scanPaperPdf } = await server.ssrLoadModule(
    "/src/lib/concept-blank/scan/paper.server.ts",
  );
  const {
    registerScanPhoto,
    scanQrDataCorners,
    projectScanPoint,
    fitScanHomography,
  } = await server.ssrLoadModule("/src/lib/concept-blank/scan/registration.ts");
  const bank = await loadGradeBank("초5");
  const forms = { B: "term", C: "cloze", D: "map", E: "figure" };
  const sections = ["도형의 합동 알아보기", "합동인 도형의 성질 알아보기"];
  const counts = { 하: 2, 중: 1, 상: 1 };
  const sources = [];
  for (const [i, title] of sections.entries()) {
    const section = `2-3-${i + 1}`;
    const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const built = await renderScanPaper({
      id,
      selection: {
        sections: [`초5::2-3 합동과 대칭::${section} ${title}`],
        title,
        date: "2026-11-26",
        forms: Object.values(forms).map((form) => ({
          form,
          counts,
          extras: {
            하: Number(form === "term" || form === "cloze"),
            중: 0,
            상: 0,
          },
        })),
      },
      bank,
      origin: "https://today.aywa.co.kr",
    });
    const pdf = `issued-${section}.pdf`;
    await writeFile(path.join(out, pdf), await scanPaperPdf(built.artifact));
    for (const [pdfIndex, layout] of built.layout.pages.entries()) {
      if (layout.part !== "student") continue;
      const page = built.snapshot.pages.find(
        ({ number }) => number === layout.number,
      );
      const form = Object.keys(forms).find((key) => forms[key] === page.form);
      const url = `https://today.aywa.co.kr/concept-blank/scan?p=${id}&page=${page.number}&part=student`;
      const qrVersion = QRCode.create(url, {
        errorCorrectionLevel: "M",
      }).version;
      sources.push({
        section,
        form,
        pdf,
        pdfIndex,
        layout,
        page,
        url,
        qrVersion,
        qrDataCorners: scanQrDataCorners(layout.qr, qrVersion),
        bankFingerprint: built.snapshot.bankFingerprint,
      });
    }
  }
  await writeJson("sources.json", sources);
  const generated = spawnSync(
    process.env.CB_SYNTH_PYTHON ?? "python3",
    [
      path.join(here, "synthesize.py"),
      out,
      path.resolve(fontDir),
      path.resolve(referenceDir),
    ],
    { stdio: "inherit" },
  );
  if (generated.error) throw generated.error;
  if (generated.status !== 0)
    throw new Error(
      `Synthesis exited with ${generated.status ?? generated.signal}`,
    );

  const readJson = async (name) =>
    JSON.parse(await readFile(path.join(out, name), "utf8"));
  const photos = await readJson("photos.json");
  const results = [];
  for (const name of photos) {
    const truth = await readJson(`${name}.json`);
    const source = sources[truth.sourceIndex];
    const {
      data,
      info: { width, height },
    } = await sharp(path.join(out, `${name}.jpg`))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = {
      data: new Uint8ClampedArray(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      ),
      width,
      height,
    };
    const qr = jsQR(pixels.data, width, height, {
      inversionAttempts: "dontInvert",
    });
    const geometry =
      qr?.data === source.url && qr.version === source.qrVersion
        ? {
            version: qr.version,
            corners: [
              "topLeftCorner",
              "topRightCorner",
              "bottomRightCorner",
              "bottomLeftCorner",
            ].map((key) => qr.location[key]),
          }
        : null;
    const result = geometry
      ? registerScanPhoto(pixels, source.layout, geometry)
      : {
          status: "failed",
          reason: qr ? "QR payload/version mismatch" : "QR not decoded",
        };
    // Diagnostics only. Ground truth cannot enter the registration call above.
    const asPoints = (pairs) => pairs.map(([x, y]) => ({ x, y }));
    const projectedQr = asPoints(truth.qr.data.px);
    const markerFit = fitScanHomography(
      source.layout.markers,
      asPoints(truth.markers.px),
    );
    const fittedQr = source.qrDataCorners.map((p) =>
      projectScanPoint(markerFit, p),
    );
    const qrOffsets = geometry && {
      decodedVsProjectedPx: geometry.corners.map((p, i) =>
        Math.hypot(p.x - projectedQr[i].x, p.y - projectedQr[i].y),
      ),
      decodedVsTrueMarkerFitPx: geometry.corners.map((p, i) =>
        Math.hypot(p.x - fittedQr[i].x, p.y - fittedQr[i].y),
      ),
    };
    const errors = [];
    if (result.status === "matched") {
      for (const slot of truth.slots) {
        for (const [corner, [x, y]] of slot.corners.mm.entries()) {
          const estimated = projectScanPoint(result.transform, { x, y });
          const flat = projectScanPoint(truth.inverseHomography, estimated);
          const { angle, widthMm } = truth;
          const radius = angle ? widthMm / (2 * angle) : null;
          const recoveredX = radius
            ? widthMm / 2 + radius * Math.asin((flat.x - widthMm / 2) / radius)
            : flat.x;
          const [px, py] = slot.corners.px[corner];
          errors.push({
            slotId: slot.id,
            corner,
            mm: Math.hypot(recoveredX - x, flat.y - y),
            px: Math.hypot(estimated.x - px, estimated.y - py),
          });
        }
      }
    }
    results.push({
      name,
      form: source.form,
      profile: truth.profile,
      result,
      qrOffsets,
      errors,
    });
    console.log(name, result.status, result.reason ?? "");
  }
  const errors = results
    .flatMap((row) => row.errors.map((error) => error.mm))
    .sort((a, b) => a - b);
  const mid = Math.floor(errors.length / 2);
  const countsByStatus = Object.fromEntries(
    ["matched", "uncertain", "failed"].map((status) => [
      status,
      results.filter((row) => row.result.status === status).length,
    ]),
  );
  const summary = {
    photos: photos.length,
    countsByStatus,
    matchedRate: countsByStatus.matched / photos.length,
    corners: errors.length,
    medianMm: errors.length
      ? (errors[mid] + errors[Math.floor((errors.length - 1) / 2)]) / 2
      : null,
    maxMm: errors.at(-1) ?? null,
    seconds: (performance.now() - started) / 1000,
  };
  await writeJson("registration.json", { summary, results });
  console.log(summary);
} finally {
  await server.close();
}
