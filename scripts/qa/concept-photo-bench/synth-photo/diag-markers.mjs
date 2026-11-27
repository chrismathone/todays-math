// 진단: 사진마다 네 모서리 표식 후보를 찍어 본다 (제품 함수 그대로).
import { createServer } from "vite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import sharp from "sharp";
const root = fileURLToPath(new URL("../../../..", import.meta.url));
const out = process.argv[2];
const server = await createServer({
  root,
  configFile: false,
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
  const R = await server.ssrLoadModule(
    "/src/lib/concept-blank/scan/registration.ts",
  );
  const sources = JSON.parse(
    await readFile(path.join(out, "sources.json"), "utf8"),
  );
  const photos = JSON.parse(
    await readFile(path.join(out, "photos.json"), "utf8"),
  );
  for (const name of photos.filter(
    (n) => !process.argv[3] || n.includes(process.argv[3]),
  )) {
    const truth = JSON.parse(
      await readFile(path.join(out, `${name}.json`), "utf8"),
    );
    const source = sources[truth.sourceIndex];
    const { data, info } = await sharp(path.join(out, `${name}.jpg`))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = {
      data: new Uint8ClampedArray(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      ),
      width: info.width,
      height: info.height,
    };
    const qr = jsQR(px.data, px.width, px.height, {
      inversionAttempts: "dontInvert",
    });
    const geo = {
      version: qr.version,
      corners: [
        "topLeftCorner",
        "topRightCorner",
        "bottomRightCorner",
        "bottomLeftCorner",
      ].map((k) => qr.location[k]),
    };
    const reg = R.registerScanPhoto(px, source.layout, geo);
    const fit = R.fitScanHomography(
      source.layout.markers,
      truth.markers.px.map(([x, y]) => ({ x, y })),
    );
    const row = { name, status: reg.status, markers: {} };
    for (const [i, m] of source.layout.markers.entries()) {
      const p = R.projectScanPoint(fit, m);
      const c = R.scanMarkerCandidates(px, p, 10);
      row.markers[m.id] = c.map((q) => [
        Math.round(q.x - truth.markers.px[i][0]),
        Math.round(q.y - truth.markers.px[i][1]),
      ]);
    }
    console.log(JSON.stringify(row));
  }
} finally {
  await server.close();
}
