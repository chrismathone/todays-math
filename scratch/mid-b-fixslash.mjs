/**
 * 죽은 백슬래시를 되살린다 — 템플릿 리터럴의 홑 `\` 를 `\\` 로. (내 파일)
 *
 * 대상: 주석이 아닌 줄의 홑 백슬래시. `\\`·`\n`·`` \` ``·`\$` 는 그대로 둔다.
 * (`\n` 은 이 저장소에서 **줄바꿈**이라 뜻이 살아 있다.)
 *
 * 되돌리기: `git checkout HEAD -- <파일>` — 기준을 명시할 것(CLAUDE.md 2026-08-18).
 */
import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dry = process.argv.includes("--dry");
let grand = 0;

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const lines = src.split(/\r?\n/);
  let changed = 0;
  const out = lines.map((line) => {
    const t = line.trim();
    if (!line.includes("`")) return line;
    if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*"))
      return line;
    let res = "";
    for (let j = 0; j < line.length; j += 1) {
      const ch = line[j];
      if (ch !== "\\") {
        res += ch;
        continue;
      }
      const next = line[j + 1];
      if (next === "\\") {
        res += "\\\\";
        j += 1;
        continue;
      }
      if (next === "n" || next === "`" || next === "$") {
        res += ch;
        continue;
      }
      res += "\\\\";
      changed += 1;
    }
    return res;
  });
  grand += changed;
  console.log(`${changed.toString().padStart(4)}  ${f}`);
  if (!dry && changed > 0) writeFileSync(f, out.join(eol), "utf8");
}
console.log(`합계 ${grand}자리${dry ? " (건드리지 않음)" : " 고침"}`);
