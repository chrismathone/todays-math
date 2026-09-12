/**
 * 고등 유형 출제 CLI — RPM 유형 단위로 자체 엔진이 문항을 만든다 (AI 아님).
 *
 * 사용:
 *   npx tsx scripts/high/gen-cli.ts --list
 *   npx tsx scripts/high/gen-cli.ts --type "공통수학1|항등식과 나머지정리|07" --count 4 \
 *       --seed 20260913 [--out set.json] [--html preview.html]
 *   npx tsx scripts/high/gen-cli.ts --section "나머지와 인수정리(1)" --count 6 --html preview.html
 *   npx tsx scripts/high/gen-cli.ts --minor "항등식과 나머지정리" --per-type 1 --html preview.html
 *
 * - DB 에는 아무것도 쓰지 않는다 (적재는 별도 절차 — D-22·D-31).
 * - HTML 은 «검수용 미리보기»다. 시험지 지면이 아니다 (D-07).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  generateHighProblem,
  generateHighSet,
  highTypesForSection,
  registeredHighTypes,
} from "../../src/lib/high/generate";
import type { HighProblem } from "../../src/lib/high/types";
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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function printList(filter: { minor?: string; section?: string }): void {
  let lastSection = "";
  const rows = registeredHighTypes().filter(
    (e) =>
      (!filter.minor || e.rpmMinor === filter.minor) &&
      (!filter.section || e.unitSection === filter.section),
  );
  for (const e of rows) {
    if (e.unitSection !== lastSection) {
      console.log(`\n[${e.grade}] ${e.unitSection}`);
      lastSection = e.unitSection;
    }
    console.log(`  ${e.key}  ${e.rpmTitle}`);
  }
  console.log(`\n${rows.length}개 (등록 ${registeredHighTypes().length}개 중)`);
}

function toHtml(items: HighProblem[], seed: number): string {
  const blocks = items
    .map((p, i) => {
      const choices = p.distractors
        ? `<div class="ds">오답: ${p.distractors
            .map((d) => renderMathHtml(d))
            .join(" · ")}</div>`
        : "";
      return `
<section class="item">
<div class="meta">#${i + 1} · ${esc(p.grade)} · ${esc(p.unitSection)} · RPM ${esc(p.rpmMinor)} ${esc(p.rpmType)} ${esc(p.rpmTitle)} · ${esc(p.difficulty)}</div>
<div class="content">${renderMathHtml(p.content)}</div>
<div class="ans">정답: ${renderMathHtml(p.answer)}</div>
${choices}
<div class="sol">${p.solution
        .split("\n")
        .map((line) => renderMathHtml(line))
        .join("<br/>")}</div>
</section>`;
    })
    .join("\n");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<title>고등 유형 미리보기 (seed ${seed})</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<style>
body{font-family:'Malgun Gothic',sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1a1a1a}
.item{border:1px solid #ddd;border-radius:8px;padding:14px 16px;margin:14px 0}
.meta{font-size:12px;color:#888;margin-bottom:8px}
.content{font-size:15px;line-height:1.8}
.ans{margin-top:8px;font-size:14px;color:#1a56db;font-weight:600}
.ds{margin-top:4px;font-size:13px;color:#7c3aed}
.sol{margin-top:6px;font-size:13px;color:#555;line-height:1.8;border-top:1px dashed #eee;padding-top:6px}
</style></head><body>
<h1 style="font-size:18px">고등 유형 미리보기 — ${items.length}문항 (seed ${seed})</h1>
${blocks}
</body></html>`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const minor = typeof args.minor === "string" ? args.minor : undefined;
  const section = typeof args.section === "string" ? args.section : undefined;

  if (args.list) {
    printList({ minor, section });
    return;
  }

  const seed = Number(args.seed ?? 20260913);
  const count = Number(args.count ?? 4);
  const perType = Number(args["per-type"] ?? 1);

  let items: HighProblem[] = [];
  if (typeof args.type === "string") {
    items = generateHighSet(args.type, seed, count);
  } else if (section) {
    const types = highTypesForSection(section);
    if (types.length === 0) {
      throw new Error(
        `이 단원에 등록된 유형이 없습니다: ${section} — --list 로 확인`,
      );
    }
    for (let i = 0; i < count; i += 1) {
      const t = types[i % types.length]!;
      items.push(
        generateHighProblem(t.key, seed + Math.floor(i / types.length), 0),
      );
    }
  } else if (minor) {
    const types = registeredHighTypes().filter((e) => e.rpmMinor === minor);
    if (types.length === 0) {
      throw new Error(`이 중단원에 등록된 유형이 없습니다: ${minor}`);
    }
    for (const t of types) items.push(...generateHighSet(t.key, seed, perType));
  } else {
    throw new Error("--list 또는 --type/--section/--minor 를 주십시오");
  }

  console.log(`${items.length}문항 생성 (seed ${seed})`);
  for (const p of items) {
    console.log(`  [${p.rpmType} ${p.rpmTitle}] ${p.difficulty} — ${p.answer}`);
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

main();
