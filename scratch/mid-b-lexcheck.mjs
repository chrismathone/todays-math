import { execSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";

import { deadBackslashes } from "./mid-b-lexer.mjs";

let now = 0;
let was = 0;
const perNow = {};
const perWas = {};
for (const f of globSync("src/lib/middle/*.ts")) {
  const rel = f.replace(/\\/g, "/");
  const a = deadBackslashes(readFileSync(f, "utf8"));
  if (a.length) {
    perNow[rel] = a.length;
    now += a.length;
  }
  let old = "";
  try {
    old = execSync(`git show HEAD:${rel}`, {
      encoding: "utf8",
      maxBuffer: 1 << 28,
    });
  } catch {
    old = "";
  }
  if (old) {
    const b = deadBackslashes(old);
    if (b.length) {
      perWas[rel] = b.length;
      was += b.length;
    }
  }
}
console.log("지금(고친 뒤)  ", now, JSON.stringify(perNow));
console.log("HEAD(고치기 전)", was, JSON.stringify(perWas));
