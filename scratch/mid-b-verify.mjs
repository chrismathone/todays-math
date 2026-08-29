/**
 * 전후 대조 — **바뀐 것이 이스케이프뿐인가**를 반증 가능한 형태로 묻는다. (내 파일)
 *
 * 「after 에 JS 가 먹던 그 규칙을 다시 먹이면 before 가 나와야 한다」.
 * 하나라도 안 맞으면 이 고침이 뜻을 바꾼 것이다.
 */
import { readFileSync } from "node:fs";

const JS_ESCAPE = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" };

/** JS 템플릿 리터럴이 홑 백슬래시를 먹는 규칙 그대로 */
function eat(s) {
  let out = "";
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] !== "\\") {
      out += s[i];
      continue;
    }
    const nx = s[i + 1];
    if (nx === undefined) {
      out += "\\";
      continue;
    }
    out += JS_ESCAPE[nx] ?? nx;
    i += 1;
  }
  return out;
}

const before = readFileSync("scratch/snap-before.jsonl", "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
const after = readFileSync("scratch/snap-after.jsonl", "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));

let changed = 0;
let mismatch = 0;
for (let i = 0; i < before.length; i += 1) {
  const b = before[i];
  const a = after[i];
  if (JSON.stringify(b) === JSON.stringify(a)) continue;
  changed += 1;
  for (const f of ["c", "a", "s", "d"]) {
    const bs = String(b[f] ?? "");
    const as = String(a[f] ?? "");
    // ⑴ **JS 가 먹은 뒤가 같은가** — 고침이 더한 것이 「JS 가 먹던 백슬래시」뿐이면
    //    양쪽에 같은 규칙을 먹였을 때 글자까지 같아야 한다.
    // ⑵ 백슬래시가 **줄지 않았는가** — ⑴ 만으로는 «옳던 `\\`를 홑으로 되돌리는»
    //    반대 방향 회귀를 못 본다(둘 다 먹으면 같아진다).
    const nb = (bs.match(/\\/g) ?? []).length;
    const na = (as.match(/\\/g) ?? []).length;
    if (eat(as) !== eat(bs) || na < nb) {
      mismatch += 1;
      if (mismatch <= 6) {
        console.log(`❌ ${a.k} v${a.v} ${f}  (백슬래시 ${nb} → ${na})`);
        console.log(`   before: ${JSON.stringify(bs)}`);
        console.log(`   after : ${JSON.stringify(as)}`);
      }
    }
  }
}
console.log(
  mismatch === 0
    ? `✅ 바뀐 ${changed}행 전부 «이스케이프만» 달라졌다 (뜻이 바뀐 곳 0)`
    : `🔴 ${mismatch}자리가 이스케이프 말고 다른 것도 바뀌었다`,
);
process.exit(mismatch === 0 ? 0 : 1);
