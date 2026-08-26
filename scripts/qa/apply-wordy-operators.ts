/**
 * 이미 나간 행의 「말 대신 기호」를 **말로** 바꾼다 — 원장을 DB 보다 **먼저** 쓴다.
 *
 *   npx tsx -r dotenv/config scripts/qa/apply-wordy-operators.ts            # 드라이런
 *   npx tsx -r dotenv/config scripts/qa/apply-wordy-operators.ts --apply
 *   npx tsx -r dotenv/config scripts/qa/apply-wordy-operators.ts --revert
 *
 * 원장님 지시(2026-08-26): 「이런 해설 멘트 **전수 검사**해서 교체」.
 *
 * ## 이 스크립트가 지키는 것
 *
 * ⑴ **원장을 DB 보다 먼저 쓴다.** 그리고 **누적**한다(`revertLedger.mergeLedgerRows`)
 *    — 덮어쓰면 앞 회차를 되돌릴 수 없다(2026-08-20). 같은 자리를 두 번 바꾸면
 *    **처음 `before`** 를 남긴다. 마지막 것을 남기면 「되돌렸다고 하면서 아무것도
 *    안 되돌린 것」이 된다.
 * ⑵ **값을 지어내지도 잃지도 않는다** — `preservesValues` 가 수·한글·`$` 를 본다.
 * ⑶ **지면이 더 나빠지지 않는다** — 화면과 같은 방식으로 실제 렌더해서 붉은 span 이
 *    늘지 않는지 본다. (`\lcm` 은 KaTeX 에 없는 명령이라 지금 **붉게 나가고 있다** —
 *    이 교체가 그것도 같이 고친다. 그 수를 따로 찍는다.)
 * ⑷ **분모가 맞는지 센다.** 「바꾼 자리 + 남긴 자리 == 찾은 자리」가 아니면 멈춘다.
 *    조용히 버리면 표가 「전부 했다」로 읽힌다.
 * ⑸ 되돌리기는 **지금 값이 우리가 쓴 값일 때만** 한다 — 그 사이 남이 고쳤으면
 *    손대지 않고 보고한다(2026-08-18 「같은 컬럼을 두 스크립트가 잠근다」).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { tokenizeMath } from "../../src/lib/math/segments";
import {
  decodeHtmlEntities,
  preprocessMathText,
} from "../../src/lib/math/textPreprocess";
import { isRedHtml, renderLikeUi } from "./mathTokenCensus";
import { mergeLedgerRows, stillApplied } from "./revertLedger";
import {
  preservesValues,
  rewriteWordyOperators,
  wordyOperatorHits,
} from "./wordyOperator";

const prisma = new PrismaClient();

const FIELDS = ["content", "answer", "solution"] as const;
type Field = (typeof FIELDS)[number];

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const LEDGER = path.join(
  process.cwd(),
  "scripts",
  "qa",
  "reports",
  "wordy-operator-ledger.json",
);

interface LedgerRow {
  /** `<문항id>|<컬럼>` — 되돌리기가 이 값으로 행을 찾는다. */
  id: string;
  problemId: string;
  field: Field;
  code: string | null;
  before: string;
  after: string;
  /** 바꾼 자리 수. */
  changed: number;
  /** 무엇을 바꿨나 — 사람이 표를 읽을 수 있게. */
  names: string[];
  /** 되돌린 시각. 없으면 아직 적용 상태다. */
  되돌림?: string;
}

interface Ledger {
  적음: string;
  적용됨: boolean;
  rows: LedgerRow[];
}

function readLedger(): Ledger | null {
  if (!existsSync(LEDGER)) return null;
  try {
    const j = JSON.parse(readFileSync(LEDGER, "utf8")) as Partial<Ledger>;
    return {
      적음: j.적음 ?? "",
      적용됨: j.적용됨 ?? false,
      rows: j.rows ?? [],
    };
  } catch {
    return null;
  }
}

/** 화면과 같은 방식으로 그려서 **붉은 span** 을 센다. 명령 목록에 안 기댄다. */
function redSpans(text: string): number {
  let pre: string;
  try {
    pre = preprocessMathText(decodeHtmlEntities(text));
  } catch {
    return Number.POSITIVE_INFINITY; // 전처리가 던지면 화면도 못 그린다
  }
  let n = 0;
  for (const seg of tokenizeMath(pre)) {
    if (seg.type === "text") continue;
    if (isRedHtml(renderLikeUi(seg.value, seg.type === "display"))) n += 1;
  }
  return n;
}

interface Blocked {
  id: string;
  code: string | null;
  field: Field;
  why: string;
  around: string;
}

async function plan() {
  const total = await prisma.problem.count();
  const rows: LedgerRow[] = [];
  const blocked: Blocked[] = [];
  const skipReasons = new Map<string, number>();
  const skipSamples = new Map<string, string[]>();
  let foundHits = 0;
  let changedHits = 0;
  let skippedHits = 0;
  let redFixed = 0;
  const candidateRows = new Set<string>();

  const PAGE = 2000;
  for (let skip = 0; skip < total; skip += PAGE) {
    const page = await prisma.problem.findMany({
      select: {
        id: true,
        content: true,
        answer: true,
        solution: true,
        problemCode: true,
      },
      orderBy: { id: "asc" },
      skip,
      take: PAGE,
    });
    if (page.length === 0) break;

    for (const row of page) {
      for (const field of FIELDS) {
        const before = (row[field] ?? "") as string;
        if (!before) continue;
        const hits = wordyOperatorHits(before);
        if (hits.length === 0) continue;
        candidateRows.add(row.id);
        foundHits += hits.length;

        const r = rewriteWordyOperators(before);
        changedHits += r.changed;
        skippedHits += r.skipped.length;
        for (const s of r.skipped) {
          const key = `${s.name} ${s.reason}`;
          skipReasons.set(key, (skipReasons.get(key) ?? 0) + 1);
          const arr = skipSamples.get(key) ?? [];
          if (arr.length < 4)
            arr.push(`${row.problemCode ?? row.id.slice(0, 8)} …${s.around}…`);
          skipSamples.set(key, arr);
        }
        if (r.changed === 0) continue;

        // ⑵ 값을 지어내지도 잃지도 않았나
        const keep = preservesValues(before, r.out);
        if (!keep.ok) {
          blocked.push({
            id: row.id,
            code: row.problemCode,
            field,
            why: keep.why ?? "값 검사 실패",
            around: before.slice(0, 120),
          });
          continue;
        }
        // ⑶ 지면이 더 나빠지지 않았나
        const redBefore = redSpans(before);
        const redAfter = redSpans(r.out);
        if (redAfter > redBefore) {
          blocked.push({
            id: row.id,
            code: row.problemCode,
            field,
            why: `붉은 span 이 ${redBefore} → ${redAfter} 로 늘었다`,
            around: before.slice(0, 120),
          });
          continue;
        }
        if (redAfter < redBefore) redFixed += redBefore - redAfter;

        rows.push({
          id: `${row.id}|${field}`,
          problemId: row.id,
          field,
          code: row.problemCode,
          before,
          after: r.out,
          changed: r.changed,
          names: [...new Set(hits.map((h) => h.name))],
        });
      }
    }
  }

  return {
    total,
    rows,
    blocked,
    skipReasons,
    skipSamples,
    foundHits,
    changedHits,
    skippedHits,
    redFixed,
    candidateRows: candidateRows.size,
  };
}

async function runApply() {
  const p = await plan();

  console.log(
    `문항 ${p.total.toLocaleString()}건 — 후보 ${p.candidateRows}행 · 찾은 자리 ${p.foundHits}`,
  );
  console.log(
    `  바꿀 자리 ${p.changedHits} · 남길 자리 ${p.skippedHits} · 가드에 막힌 칸 ${p.blocked.length}`,
  );
  console.log(
    `  바꿀 칸 ${p.rows.length} (문항 ${new Set(p.rows.map((r) => r.problemId)).size}행)`,
  );
  if (p.redFixed)
    console.log(
      `  🟢 덤 — 지금 **붉게 나가던** span ${p.redFixed}개가 같이 고쳐진다 (\\lcm 은 KaTeX 에 없는 명령이다)`,
    );

  // ⑷ 분모가 맞나 — 조용히 버리면 표가 「전부 했다」로 읽힌다.
  if (p.changedHits + p.skippedHits !== p.foundHits) {
    console.error(
      `🔴 분모가 안 맞는다: 바꿈 ${p.changedHits} + 남김 ${p.skippedHits} ≠ 찾음 ${p.foundHits} — 멈춘다`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\n── 손대지 않고 남기는 자리 (까닭별) ──`);
  for (const [key, n] of [...p.skipReasons].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key.padEnd(20)} ${n}자리`);
    for (const s of p.skipSamples.get(key) ?? []) console.log(`      ${s}`);
  }

  if (p.blocked.length) {
    console.log(`\n── 🔴 가드가 막은 칸 ${p.blocked.length} ──`);
    for (const b of p.blocked)
      console.log(
        `  ${b.code ?? b.id.slice(0, 8)} [${b.field}] ${b.why}\n      ${b.around}`,
      );
  }

  console.log(`\n── 바꾸는 표본 6 ──`);
  for (const r of p.rows.slice(0, 6)) {
    console.log(
      `  ${r.code ?? r.problemId.slice(0, 8)} [${r.field}] ${r.names.join(" ")}`,
    );
    console.log(`    - ${r.before.replace(/\n/g, " ⏎ ").slice(0, 150)}`);
    console.log(`    + ${r.after.replace(/\n/g, " ⏎ ").slice(0, 150)}`);
  }

  if (!APPLY) {
    console.log(`\n드라이런이다. 실제로 쓰려면 --apply`);
    return;
  }

  // ⑴ 원장을 **먼저**, 그리고 **누적**해서 쓴다.
  const previous = readLedger();
  const merged = mergeLedgerRows<LedgerRow>(previous?.rows, p.rows);
  // 같은 자리를 두 번 바꿨으면 **처음 `before`** 를 남긴다 — 마지막 것을 남기면
  // 「되돌렸다고 하면서 아무것도 안 되돌린 것」이 된다(2026-08-20).
  const firstBefore = new Map((previous?.rows ?? []).map((r) => [r.id, r]));
  const finalRows = merged.rows.map((r) => {
    const old = firstBefore.get(r.id);
    return old && !old.되돌림 ? { ...r, before: old.before } : r;
  });
  if (finalRows.length < (previous?.rows.length ?? 0)) {
    console.error("🔴 원장 행이 줄었다 — 멈춘다(되돌릴 수 없게 된다)");
    process.exitCode = 1;
    return;
  }
  writeFileSync(
    LEDGER,
    JSON.stringify(
      {
        적음: new Date().toISOString(),
        적용됨: stillApplied(previous?.적용됨, true),
        rows: finalRows,
      } satisfies Ledger,
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    `\n원장 먼저 씀 — ${finalRows.length}행 (이어받음 ${merged.carried}) → ${path.relative(process.cwd(), LEDGER)}`,
  );

  let wrote = 0;
  for (const r of p.rows) {
    await prisma.problem.update({
      where: { id: r.problemId },
      data: { [r.field]: r.after },
    });
    wrote += 1;
  }
  console.log(`DB 갱신 ${wrote}칸`);
}

async function runRevert() {
  const led = readLedger();
  if (!led || led.rows.length === 0) {
    console.log("원장이 비었다 — 되돌릴 것이 없다");
    return;
  }
  const live = led.rows.filter((r) => !r.되돌림);
  console.log(`원장 ${led.rows.length}행 (되돌릴 것 ${live.length})`);

  let reverted = 0;
  let already = 0;
  const foreign: string[] = [];
  const now = new Date().toISOString();

  for (const r of live) {
    const row = await prisma.problem.findUnique({
      where: { id: r.problemId },
      select: { content: true, answer: true, solution: true },
    });
    if (!row) {
      foreign.push(
        `${r.code ?? r.problemId.slice(0, 8)} [${r.field}] 행이 없다`,
      );
      continue;
    }
    const current = (row[r.field] ?? "") as string;
    if (current === r.before) {
      already += 1;
      r.되돌림 = now;
      continue;
    }
    // ⑸ **지금 값이 우리가 쓴 값일 때만** 되돌린다.
    if (current !== r.after) {
      foreign.push(
        `${r.code ?? r.problemId.slice(0, 8)} [${r.field}] 그 사이 남이 바꿨다 — 손대지 않는다`,
      );
      continue;
    }
    if (APPLY) {
      await prisma.problem.update({
        where: { id: r.problemId },
        data: { [r.field]: r.before },
      });
      r.되돌림 = now;
    }
    reverted += 1;
  }

  console.log(
    `되돌림 ${reverted}칸 · 이미 원래 값 ${already} · 남이 바꿈 ${foreign.length}`,
  );
  for (const f of foreign) console.log(`  ⚠️ ${f}`);
  if (!APPLY) {
    console.log("드라이런이다. 실제로 되돌리려면 --revert --apply");
    return;
  }
  // 행을 **지우지 않는다** — 「무엇을 바꿨었나」가 사라지면 감사를 못 한다.
  writeFileSync(
    LEDGER,
    JSON.stringify({ ...led, 적음: now } satisfies Ledger, null, 2),
    "utf8",
  );
  console.log(`원장에 되돌림 표시 — ${path.relative(process.cwd(), LEDGER)}`);
}

async function main() {
  if (REVERT) return runRevert();
  return runApply();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
