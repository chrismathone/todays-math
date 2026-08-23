/**
 * 중학 유형 출제 CLI — RPM 유형 단위로 자체 엔진이 문항을 만든다 (AI 아님).
 *
 * 사용:
 *   npx tsx scripts/middle/gen-cli.ts --list                       # 등록된 유형
 *   npx tsx scripts/middle/gen-cli.ts --type "1-1|일차방정식의 활용|15" --count 4 \
 *       --seed 20260823 [--out set.json] [--html preview.html]
 *   npx tsx scripts/middle/gen-cli.ts --section "일차방정식의 활용(도형, 농도, 일)" \
 *       --count 6 --seed 20260823 --html preview.html              # 단원의 유형들을 고루
 *
 * - DB 에는 아무것도 쓰지 않는다 (적재는 별도 절차 — D-22·D-31).
 * - HTML 은 «검수용 미리보기»다. 시험지 지면이 아니다 (D-07).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  generateMiddleSet,
  registeredTypes,
  typesForSection,
} from "../../src/lib/middle/generate";
import type { MidProblem } from "../../src/lib/middle/types";
import { renderMathHtml } from "../../src/lib/math/renderMathHtml";

type Args = Record<string, string | true>;

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (!a.startsWith("--")) throw new Error(`알 수 없는 인자: ${a}`);
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function printList(): void {
  let lastSection = "";
  for (const e of registeredTypes()) {
    if (e.unitSection !== lastSection) {
      console.log(`\n${e.grade} ${e.unitSection}`);
      lastSection = e.unitSection;
    }
    console.log(`  ${e.key}  ${e.rpmTitle}  [${e.rpmBook} p기준 ${e.rpmType}]`);
  }
  console.log(`\n등록 유형 ${registeredTypes().length}개`);
}

function toHtml(items: MidProblem[], seed: number): string {
  const rows = items
    .map(
      (p, i) => `
<section class="item">
<div class="meta">#${i + 1} · ${p.grade} · ${p.unitSection} · RPM ${p.rpmBook} ${p.rpmMinor} ${p.rpmType} ${p.rpmTitle} · ${p.difficulty}</div>
<div class="content">${renderMathHtml(p.content)}</div>
<div class="ans">정답: ${renderMathHtml(p.answer)}</div>
<div class="sol">${p.solution
        .split("\n")
        .map((line) => renderMathHtml(line))
        .join("<br/>")}</div>
</section>`,
    )
    .join("\n");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<title>중학 유형 미리보기 (seed ${seed})</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<style>
body{font-family:'Malgun Gothic',sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1a1a1a}
.item{border:1px solid #ddd;border-radius:8px;padding:14px 16px;margin:14px 0}
.meta{font-size:12px;color:#888;margin-bottom:8px}
.content{font-size:15px;line-height:1.7}
.ans{margin-top:8px;font-size:14px;color:#1a56db;font-weight:600}
.sol{margin-top:6px;font-size:13px;color:#555;line-height:1.7;border-top:1px dashed #eee;padding-top:6px}
</style></head><body>
<h1 style="font-size:18px">중학 유형 미리보기 — ${items.length}문항 (seed ${seed})</h1>
${rows}
</body></html>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    printList();
    return;
  }

  const seed = Number(args.seed ?? 20260823);
  const count = Number(args.count ?? 4);

  let items: MidProblem[] = [];
  if (typeof args.type === "string") {
    items = generateMiddleSet(args.type, seed, count);
  } else if (typeof args.section === "string") {
    const types = typesForSection(args.section);
    if (types.length === 0) {
      throw new Error(
        `이 단원에 등록된 유형이 없습니다: ${args.section} — --list 로 확인`,
      );
    }
    // 유형들을 돌아가며 고루 — 같은 유형 안에서는 variant 로 갈린다
    for (let i = 0; i < count; i += 1) {
      const t = types[i % types.length]!;
      items.push(
        ...generateMiddleSet(t.key, seed + Math.floor(i / types.length), 1),
      );
    }
  } else {
    throw new Error("--list 또는 --type/--section 을 주십시오");
  }

  console.log(`${items.length}문항 생성 (seed ${seed})`);
  for (const p of items) {
    console.log(`  [${p.rpmType} ${p.rpmTitle}] ${p.answer}`);
  }

  if (typeof args.out === "string") {
    const outPath = resolve(args.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(items, null, 1), "utf-8");
    console.log(`JSON → ${outPath}`);
  }
  if (typeof args.html === "string") {
    const htmlPath = resolve(args.html);
    mkdirSync(dirname(htmlPath), { recursive: true });
    writeFileSync(htmlPath, toHtml(items, seed), "utf-8");
    console.log(`HTML → ${htmlPath}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
