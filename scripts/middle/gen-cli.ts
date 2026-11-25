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
  generateMiddleComboSet,
  middleComboDefinitions,
} from "../../src/lib/middle/combo";
import {
  generateMiddleSet,
  registeredTypes,
  typesForSection,
} from "../../src/lib/middle/generate";
import { filterEntries, sectionSummary } from "./listing";
import type { MidProblem } from "../../src/lib/middle/types";
import { middlePreviewHtml } from "./preview";

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

function printList(f: { grade?: string; book?: string; q?: string }): void {
  const picked = filterEntries(registeredTypes(), f);
  let lastSection = "";
  for (const e of picked) {
    if (e.unitSection !== lastSection) {
      console.log(`\n${e.grade} ${e.unitSection}`);
      lastSection = e.unitSection;
    }
    console.log(
      `  ${e.key}  ${e.rpmTitle}  [출처 ${e.rpmBook} · 유형 ${e.rpmType}]`,
    );
  }
  const total = registeredTypes().length;
  console.log(
    picked.length === total
      ? `\n등록 유형 ${total}개`
      : `\n${picked.length}개 (등록 ${total}개 중)`,
  );
}

/**
 * 단원 목록 — 「어느 단원을 낼까요」를 묻기 전에 **고를 수 있는 크기**로 줄인다.
 * 찍는 이름은 `--section` 에 그대로 넣을 수 있는 값이다.
 */
/**
 * 승인된 결합형 목록. 「무엇이 승인됐나」와 **왜 중등 범위인가**를 같이 보여 준다 —
 * 근거를 안 보여 주면 다음 사람이 여기에 손으로 하나 더 넣는다(D-07 위반).
 */
function printCombos(): void {
  const defs = middleComboDefinitions();
  console.log(
    `승인된 결합형 ${defs.length}개 (원장님 승인분만 — 조합기가 아니다)\n`,
  );
  for (const d of defs) {
    console.log(`  ${d.id}`);
    console.log(`    앵커      ${d.anchorGrade} · ${d.anchorSection}`);
    console.log(`    원천 유형  ${d.conceptKeys.join("  +  ")}`);
    console.log(`    문형      ${d.familyIds.join(", ")}`);
    console.log(`    학년 경계  ${d.gradeBoundary}`);
    console.log(`    교과 근거  ${d.curriculumBasis}`);
    console.log(`    상위 침범  ${d.laterConceptReview}\n`);
  }
  console.log(
    `  뽑기: npx tsx scripts/middle/gen-cli.ts --combo "${defs[0]?.id}" --count 3 --seed 20260824`,
  );
}

function printSections(f: { grade?: string; book?: string; q?: string }): void {
  const rows = sectionSummary(filterEntries(registeredTypes(), f));
  let lastGrade = "";
  for (const r of rows) {
    if (r.grade !== lastGrade) {
      console.log(`\n[${r.grade}]`);
      lastGrade = r.grade;
    }
    console.log(
      `  ${String(r.count).padStart(3)}유형  ${r.unitSection}   (${r.books.join(",")})`,
    );
  }
  console.log(
    `\n단원 ${rows.length}개 · 유형 ${rows.reduce((a, r) => a + r.count, 0)}개`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const pick = {
    grade: typeof args.grade === "string" ? args.grade : undefined,
    book: typeof args.book === "string" ? args.book : undefined,
    q: typeof args.q === "string" ? args.q : undefined,
  };

  if (args.sections) {
    printSections(pick);
    return;
  }
  if (args.list) {
    printList(pick);
    return;
  }
  if (args["list-combos"]) {
    printCombos();
    return;
  }

  const seed = Number(args.seed ?? 20260823);
  const count = Number(args.count ?? 4);

  // 결합형은 RPM 유형이 아니라 **승인 등록부**에서 나온다 (D-100). 그래서 경로가 다르다.
  if (typeof args.combo === "string") {
    if (typeof args.type === "string" || typeof args.section === "string") {
      throw new Error("--combo 는 --type/--section 과 같이 못 씁니다");
    }
    const set = generateMiddleComboSet(args.combo, seed, count);
    console.log(`결합형 ${set.length}문항 (seed ${seed}) — ${args.combo}`);
    for (const p of set) {
      console.log(`\n  ${p.content}`);
      console.log(`  정답: ${p.answer}`);
      console.log(`  풀이: ${p.solution.replace(/\n/g, "\n        ")}`);
    }
    return;
  }

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
    const { html, figureErrors } = await middlePreviewHtml(items, seed);
    mkdirSync(dirname(htmlPath), { recursive: true });
    writeFileSync(htmlPath, html, "utf-8");
    console.log(`HTML → ${htmlPath}`);
    if (figureErrors.length) {
      console.error(
        `그림 실패 ${figureErrors.length}건:\n  ${figureErrors.join("\n  ")}`,
      );
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
