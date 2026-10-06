/**
 * 판정용 오려 내기 — 원본 해상도 그대로(줄여 보지 않게).
 *   node crop.mjs <사진> <x> <y> <w> <h> <out.png> [배율]
 * 좌표는 원본 픽셀.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const [, , photo, x, y, w, h, out, scale = "1"] = process.argv;
const meta = await sharp(photo).metadata();
const left = Math.max(0, Number(x));
const top = Math.max(0, Number(y));
const width = Math.min(Number(w), meta.width - left);
const height = Math.min(Number(h), meta.height - top);
let image = sharp(photo).extract({ left, top, width, height });
if (Number(scale) !== 1)
  image = image.resize({ width: Math.round(width * Number(scale)) });
await image.png().toFile(out);
console.log(
  `${meta.width}x${meta.height} → ${width}x${height} @${scale} ${out}`,
);
