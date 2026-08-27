/**
 * 원본에서 **죽은 백슬래시**를 센다 — 산출물이 아니라 소스를 본다. (내 파일)
 *
 * 왜 소스인가: 산출물에서 「맨 LaTeX 이름」을 세려면 이름 목록을 손으로 적어야
 * 하고, 목록에 없는 부류는 구조적으로 0이 된다(CLAUDE.md 2026-08-18).
 * 소스에서는 규칙이 **하나**다 — 템플릿 리터럴 안의 홑 백슬래시는 JS 가 먹는다.
 * `\n`(줄바꿈)만 뜻이 살아 있고, 나머지는 전부 잃는다:
 *   `\overline`→`overline` · `\times`→<TAB>imes · `\frac`→<FF>rac · `\,`→`,`
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const files = globSync("src/lib/middle/*.ts");
let total = 0;
const perFile = new Map();

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    // 백틱이 없는 줄은 템플릿 리터럴이 아니다 — 여러 줄 리터럴 때문에 완벽하진
    // 않지만, 이 저장소의 유형 파일은 리터럴이 한 줄에 닫힌다(실측).
    if (!line.includes("`")) return;
    // 주석 줄은 뺀다 — 이 저장소 주석은 백틱으로 LaTeX 를 **인용**한다(거짓 경보).
    const t = line.trim();
    if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) return;
    // 홑 백슬래시 + 글자/기호. `\\` 는 건너뛴다.
    const hits = [];
    for (let j = 0; j < line.length; j += 1) {
      if (line[j] !== "\\") continue;
      if (line[j + 1] === "\\") {
        j += 1;
        continue;
      }
      const next = line[j + 1];
      if (next === "n") continue; // 줄바꿈 — 뜻이 산다
      if (next === "`" || next === "$") continue; // 백틱·달러 이스케이프
      hits.push(next);
    }
    if (hits.length === 0) return;
    total += hits.length;
    perFile.set(f, (perFile.get(f) ?? 0) + hits.length);
    if (process.argv.includes("--list"))
      console.log(`${f}:${i + 1}  [${hits.join("")}]  ${line.trim().slice(0, 120)}`);
  });
}

console.log(`죽은 백슬래시 ${total}자리`);
for (const [f, n] of [...perFile].sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(n).padStart(5)}  ${f}`);
