/**
 * 중단원 이름 안의 **얇은 공백(U+2009)** 을 ` ` escape 로 바꾼다. (내 파일)
 * 눈에 안 보이는 글자를 소스에 그대로 두면 다음 사람이 보통 공백으로 고쳐 놓고
 * 아무 데서도 안 걸린다 — `middleTypeCoverage.test.ts` 머리말의 실제 사고다.
 */
import { readFileSync, writeFileSync } from "node:fs";

const p = "src/lib/middle/midSupB.ts";
const s = readFileSync(p, "utf8");
const THIN = String.fromCharCode(0x2009);
const bad = `"일차함수와 그 그래프${THIN} ⑵"`;
const good = '"일차함수와 그 그래프\\u2009 ⑵"';
if (!s.includes(bad)) {
  console.error("🔴 얇은 공백이 든 문자열을 못 찾았다 — 이미 바꿨거나 이름이 다르다");
  process.exit(1);
}
writeFileSync(p, s.replace(bad, good), "utf8");
console.log("✅ `\\u2009` escape 로 바꿨다");
