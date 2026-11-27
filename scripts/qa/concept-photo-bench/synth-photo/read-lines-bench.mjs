/**
 * 읽기 판 v4(물리 글줄) 측정 — 가상 폰 사진 32장, 제품 경로 그대로:
 * QR → registerScanPhoto → (맞으면) 편 A4 JPEG, 아니면 원래 사진 → readScanPageWithName({ lines: true }) — CB_READ_LINES=0 이면 v3 비교군.
 * 모델만 구독 CLI 로 바꾼다. 출력은 저장소 밖.
 *
 *   node scripts/qa/concept-photo-bench/synth-photo/read-lines-bench.mjs <사진 폴더> <출력 폴더> [model] [effort] [동시 수]
 */
import { createServer } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import sharp from "sharp";
import {
  callClaude,
  requireSubscription,
  externalDirectory,
} from "../scan-cli.mjs";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const [
  photosDir,
  outArg,
  model = "claude-opus-5-5",
  effort = "high",
  par = "3",
] = process.argv.slice(2);
const out = externalDirectory(outArg);
await mkdir(out, { recursive: true });
const auth = await requireSubscription(out);
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
  server: { middlewareMode: true },
  appType: "custom",
});
const norm = (s) =>
  String(s ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
try {
  const R = await server.ssrLoadModule(
    "/src/lib/concept-blank/scan/registration.ts",
  );
  const F = await server.ssrLoadModule(
    "/src/lib/concept-blank/scan/flatten.ts",
  );
  const { readScanPageWithName } = await server.ssrLoadModule(
    "/src/lib/concept-blank/scan/read.ts",
  );
  const sources = JSON.parse(
    await readFile(path.join(photosDir, "sources.json"), "utf8"),
  );
  const photos = JSON.parse(
    await readFile(path.join(photosDir, "photos.json"), "utf8"),
  );
  const queue = [...photos];
  const rows = [];
  const work = async () => {
    for (let name; (name = queue.shift());) {
      const file = path.join(out, `${name}.json`);
      if (existsSync(file)) {
        rows.push(JSON.parse(await readFile(file, "utf8")));
        continue;
      }
      const truth = JSON.parse(
        await readFile(path.join(photosDir, `${name}.json`), "utf8"),
      );
      const source = sources[truth.sourceIndex];
      const jpg = path.join(photosDir, `${name}.jpg`);
      const { data, info } = await sharp(jpg)
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
      const reg = qr
        ? R.registerScanPhoto(px, source.layout, {
            version: qr.version,
            corners: [
              "topLeftCorner",
              "topRightCorner",
              "bottomRightCorner",
              "bottomLeftCorner",
            ].map((k) => qr.location[k]),
          })
        : { status: "failed" };
      let bytes;
      if (reg.status === "matched") {
        const size = F.flattenedScanSize(reg.transform, source.layout);
        const flat = F.warpScanPage(
          px,
          reg.transform,
          size.width,
          size.height,
          source.layout,
        );
        bytes = await sharp(Buffer.from(flat.buffer), {
          raw: { width: size.width, height: size.height, channels: 4 },
        })
          .removeAlpha()
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
      } else bytes = await readFile(jpg);
      const sent = path.join(out, `${name}.sent.jpg`);
      await writeFile(sent, bytes);
      let raw = "";
      const started = Date.now();
      const result = await readScanPageWithName(
        {
          page: { ...source.page },
          imageDataUrl: `data:image/jpeg;base64,${bytes.toString("base64")}`,
          lines: process.env.CB_READ_LINES !== "0",
        },
        async (request) => {
          const c = await callClaude({
            model,
            effort,
            prompt: request.prompt,
            images: [{ file: sent, label: "학생지 사진" }],
            cwd: out,
            logFile: path.join(out, `${name}.call.json`),
            timeoutMs: 900_000,
          });
          raw = c.text;
          return c.text;
        },
      );
      const slots = truth.slots.map((t) => {
        const reading = result.readings.find((r) => r.id === t.id);
        const want = t.lines.map((l) => norm(l.text));
        const got = result.lines?.[t.id] ?? null;
        return {
          id: t.id,
          intent: t.intent,
          truthLines: want,
          truthStruck: t.lines.map((l) => l.struckBefore).filter(Boolean),
          status: reading?.status,
          text: reading?.text,
          lines: got,
          textExact: want.length
            ? norm(reading?.text) === norm(want.join(" "))
            : reading?.status === "blank",
          lineCountMatch: want.length
            ? got?.length === want.length
            : got === null,
          linesExact: want.length
            ? JSON.stringify(got) === JSON.stringify(want)
            : got === null,
        };
      });
      const row = {
        name,
        registration: reg.status,
        seconds: Math.round((Date.now() - started) / 1000),
        slots,
        raw,
      };
      await writeFile(file, JSON.stringify(row, null, 1));
      rows.push(row);
      console.log(
        `${name}: ${reg.status} lines ${slots.filter((s) => s.lineCountMatch).length}/${slots.length} text ${slots.filter((s) => s.textExact).length}/${slots.length}`,
      );
    }
  };
  await Promise.all(Array.from({ length: Number(par) }, work));
  await writeFile(
    path.join(out, "summary-input.json"),
    JSON.stringify({ auth, model, effort, rows }, null, 1),
  );
} finally {
  await server.close();
}
