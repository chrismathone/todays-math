import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import png from "pngjs";
import jsQR from "jsqr";

const out = process.env.CB_SCAN_QA_OUTPUT ?? "/tmp/cb-scan-ship-20261125";
const raster = path.join(out, `raster-${Date.now()}`);
await mkdir(raster, { recursive: true });
const runs = JSON.parse(
  await readFile(path.join(out, "issued-render-evidence.json"), "utf8"),
);
const evidence = [];
for (const run of runs) {
  execFileSync(
    "pdftoppm",
    [
      "-r",
      "300",
      "-png",
      path.join(out, `issued-${run.sample}.pdf`),
      path.join(raster, run.sample),
    ],
    { stdio: "pipe" },
  );
  const files = (await readdir(raster))
    .filter(
      (file) => file.startsWith(`${run.sample}-`) && file.endsWith(".png"),
    )
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const built = JSON.parse(
    await readFile(path.join(out, `issued-${run.sample}.json`), "utf8"),
  );
  if (files.length !== built.layout.pages.length)
    throw new Error(`${run.sample}: PDF page count mismatch`);
  for (const [i, file] of files.entries()) {
    const decoded = png.PNG.sync.read(await readFile(path.join(raster, file)));
    const qr = jsQR(
      new Uint8ClampedArray(decoded.data),
      decoded.width,
      decoded.height,
      { inversionAttempts: "dontInvert" },
    );
    const page = built.layout.pages[i];
    const expected = `https://today.aywa.co.kr/concept-blank/scan?p=${run.id}&page=${page.number}&part=${page.part}`;
    if (qr?.data !== expected)
      throw new Error(`${file}: QR does not decode to exact issue/page/part`);
    const row = {
      sample: run.sample,
      file: path.join(raster, file),
      dpi: 300,
      width: decoded.width,
      height: decoded.height,
      part: page.part,
      page: page.number,
      url: qr.data,
      qrVersion: qr.version,
      location: qr.location,
    };
    evidence.push(row);
    console.log(
      JSON.stringify({
        sample: run.sample,
        part: page.part,
        page: page.number,
        decoded: true,
      }),
    );
  }
}
await writeFile(
  path.join(out, "issued-raster-evidence.json"),
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify({ pages: evidence.length, raster, failures: 0 }));
