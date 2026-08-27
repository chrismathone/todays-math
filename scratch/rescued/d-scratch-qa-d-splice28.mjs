import { readFileSync, writeFileSync } from "node:fs";

const LF = "\n";
const CR = "\r\n";
const toLf = (s) => s.split(CR).join(LF);

const target = "src/lib/middle/m2GeoQuad.ts";
const raw = readFileSync(target, "utf8");
const wasCrlf = raw.includes(CR);
let src = toLf(raw);
const fig = toLf(readFileSync("scratch/qa-d/fig28.txt", "utf8"));
const types = toLf(readFileSync("scratch/qa-d/types28.txt", "utf8"));

function must(cond, why) {
  if (!cond) {
    console.error("MELT:", why);
    process.exit(1);
  }
}

const figAnchor = "// ── 유형 ────";
must(src.includes(figAnchor), "유형 구획 앵커 없음");
src = src.replace(figAnchor, () => `${fig}${figAnchor}`);

const tailAnchor = "\n  ),\n];\n";
must(src.endsWith(tailAnchor), "배열 끝 앵커가 파일 끝이 아니다");
src = src.slice(0, -tailAnchor.length) + "\n  ),\n\n" + types;

writeFileSync(target, wasCrlf ? src.split(LF).join(CR) : src);
console.log("ok", src.length);
