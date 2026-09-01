/**
 * prettier 가 g4.ts 를 다시 포맷한 뒤 **변이 앵커 열넷이 여전히 한 곳씩 무는지** 센다.
 * (메모리 «포맷이 변이 앵커를 죽인다» — 손 뗌은 포맷 → 앵커 재검증 → md5 순서다.)
 *
 * MUTATIONS 는 export 되어 있지 않으므로, 스크립트 원문에서 `from:` 다음의
 * **JS 문자열 리터럴**을 괄호 짝이 아니라 따옴표 상태기계로 떠낸다.
 */
import { readFileSync, readdirSync } from "node:fs";

/**
 * 🔴 **하네스 이름을 손으로 적지 않는다.** 처음에는 `mutate-elem-g4-w3.mjs` 하나를
 * 박아 두었는데, 물결 4 가 `mutate-elem-g4-w4.mjs` 를 더한 날 이 자는 **아무 말도
 * 안 했다** — 새 하네스의 앵커가 포맷에 죽어도 초록이다. 손 목록은 샌다(09 §4-22).
 */
const HARNESSES = readdirSync("scripts/qa")
  .filter((f) => /^mutate-elem-g4-w\d+\.mjs$/.test(f))
  .sort();
if (HARNESSES.length === 0) {
  console.log("🔴 g4 변이 하네스를 하나도 못 찾았다 — 이 자가 눈이 멀었다.");
  process.exit(2);
}
const src = HARNESSES.map((f) =>
  readFileSync(`scripts/qa/${f}`, "utf8"),
).join("\n");
const g4 = readFileSync("src/lib/elementary/g4.ts", "utf8")
  .split("\r\n")
  .join("\n");

const BS = String.fromCharCode(92); // 역슬래시 한 글자 — 리터럴로 안 적는다

/** i 에서 시작하는 문자열 리터럴을 끝까지 읽어 [값, 다음 위치] 를 준다. */
function readLiteral(s, i) {
  const q = s[i];
  let out = "";
  let j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === BS) {
      const nxt = s[j + 1];
      if (nxt === "n") out += "\n";
      else if (nxt === "t") out += "\t";
      else if (nxt === "r") out += "\r";
      else out += nxt;
      j += 2;
      continue;
    }
    if (c === q) return [out, j + 1];
    out += c;
    j += 1;
  }
  throw new Error("닫히지 않은 리터럴");
}

const anchors = [];
let k = 0;
for (;;) {
  const at = src.indexOf("from:", k);
  if (at < 0) break;
  let j = at + 5;
  while (j < src.length && (src[j] === " " || src[j] === "\n")) j += 1;
  const q = src[j];
  if (q === '"' || q === "'" || q === "`") {
    const [val] = readLiteral(src, j);
    anchors.push(val);
  }
  k = at + 5;
}

if (anchors.length === 0) {
  console.log("🔴 앵커를 하나도 못 떠냈다 — 이 자가 눈이 멀었다. 판정하지 않는다.");
  process.exit(2);
}

let bad = 0;
for (const a of anchors) {
  const n = g4.split(a).length - 1;
  if (n !== 1) {
    bad += 1;
    console.log(`🔴 ${n}곳  ${a.slice(0, 70).split("\n").join(" ⏎ ")}`);
  }
}
console.log(
  bad === 0
    ? `✅ 앵커 ${anchors.length}개 전부 **정확히 한 곳**을 문다 (포맷 뒤에도 살아 있다)`
    : `🔴 어긋난 앵커 ${bad}/${anchors.length}개 — 다음 회차의 변이 판정이 거짓이 된다`,
);
process.exit(bad === 0 ? 0 : 1);
