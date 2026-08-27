/**
 * 이미 적재된 **서술형 발문**을 고친다 — 끝맺음 동사를 지워 깨진 문장.
 *
 *   「다음 식을 전개하시오.」  → 「다음 식을 전개**풀이 과정과** 답을 쓰시오.」  ❌
 *   「가장 큰 수를 구하시오.」 → 「가장 큰 수를 **풀이 과정과** 답을 쓰시오.」   ❌
 *
 * `toDescriptiveStem` 이 동사를 통째로 지우고 있었다. 실측으로 초등 2,300 문형 중
 * 494, 중등 873 유형 중 654 가 그렇게 됐고, 그 가운데 초등 몫이 **이미 공유 DB 에
 * 적재돼 있다**(2026-08-27).
 *
 * ## 어떻게 고치나 — 지금 값을 되짚지 않는다
 *
 * 깨진 문장에서 원문을 되살리려 하면 규칙이 두 벌이 된다. 대신 **같은 문항류의
 * 단답형 형제**에서 다시 만든다: `externalId` 가 형식만 다르고 나머지가 같으므로
 * 짝을 정확히 찾을 수 있고, 거기에 고쳐진 `toDescriptiveStem` 을 다시 댄다.
 *
 * ## 원장 규약
 *
 * 추가만 · 처음 before·마지막 after · 줄면 멈춤 · 되돌릴 때는 지금 값이 자기가 쓴
 * 값일 때만. 원장을 **DB 보다 먼저** 쓴다.
 *
 * 쓰기:
 *   npx tsx scripts/import/repair-descriptive-stems.ts                # 계획만
 *   ALLOW_SHARED_IMPORT=1 npx tsx … --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx … --revert
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { PrismaClient } from "@prisma/client";

import { toDescriptiveStem } from "../../src/lib/engine/deriveFormats";

const prisma = new PrismaClient();
const LEDGER = "scripts/import/ledgers/descriptive-stem-repair.json";

type Row = { id: string; before: string; after: string };
type Ledger = { runs: string[]; rows: Row[] };

function readLedger(): Ledger {
  if (!existsSync(LEDGER)) return { runs: [], rows: [] };
  return JSON.parse(readFileSync(LEDGER, "utf8")) as Ledger;
}

function mergeLedger(prev: Ledger, runId: string, rows: Row[]): Ledger {
  const byId = new Map(prev.rows.map((r) => [r.id, r]));
  for (const r of rows) {
    const old = byId.get(r.id);
    byId.set(r.id, old ? { ...old, after: r.after } : r);
  }
  const merged = { runs: [...prev.runs, runId], rows: [...byId.values()] };
  if (merged.rows.length < prev.rows.length)
    throw new Error(
      `원장이 줄었다: ${prev.rows.length} → ${merged.rows.length} — 멈춘다`,
    );
  return merged;
}

function writeLedger(led: Ledger) {
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, `${JSON.stringify(led, null, 2)}\n`, "utf8");
}

/** `…|단답형|s123` ↔ `…|서술형|s123` — 형식 칸만 다르다. */
function shortAnswerTwinId(externalId: string): string | null {
  if (!externalId.includes("|서술형")) return null;
  return externalId.replace("|서술형", "|단답형");
}

async function plan() {
  const rows = await prisma.problem.findMany({
    where: { questionType: "서술형", externalId: { contains: "|서술형" } },
    select: { id: true, externalId: true, content: true },
  });
  const byExternal = new Map<string, { id: string; content: string }>();
  const all = await prisma.problem.findMany({
    where: { externalId: { startsWith: "engine-" } },
    select: { externalId: true, id: true, content: true },
  });
  for (const r of all)
    if (r.externalId)
      byExternal.set(r.externalId, { id: r.id, content: r.content });

  const move: Row[] = [];
  let noTwin = 0;
  let already = 0;
  for (const r of rows) {
    const twinId = r.externalId ? shortAnswerTwinId(r.externalId) : null;
    const twin = twinId ? byExternal.get(twinId) : undefined;
    if (!twin) {
      noTwin += 1;
      continue;
    }
    const fixed = toDescriptiveStem(twin.content);
    if (fixed === r.content) {
      already += 1;
      continue;
    }
    move.push({ id: r.id, before: r.content, after: fixed });
  }
  console.log(`서술형 행 ${rows.length}`);
  console.log(`  고칠 것   ${move.length}`);
  console.log(`  이미 옳음 ${already}`);
  // 🔴 짝을 못 찾은 것은 **세어서 찍는다.** 조용히 빼면 「전부 고쳤다」로 읽힌다.
  console.log(`  단답 짝 없음 ${noTwin}`);
  if (move.length > 0) {
    console.log("\n표본:");
    for (const m of move.slice(0, 3)) {
      console.log(`   전: ${m.before.split("\n")[0]!.slice(0, 70)}`);
      console.log(`   후: ${m.after.split("\n")[0]!.slice(0, 70)}\n`);
    }
  }
  return move;
}

async function apply(move: Row[]) {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );
  const runId = new Date().toISOString();
  writeLedger(mergeLedger(readLedger(), runId, move));
  console.log(`원장 기록 ${move.length}행 → ${LEDGER}`);
  let done = 0;
  for (const r of move) {
    const res = await prisma.problem.updateMany({
      where: { id: r.id, content: r.before },
      data: { content: r.after },
    });
    done += res.count;
  }
  console.log(`✅ ${done}행 고침`);
  if (done !== move.length)
    console.error(
      `🔴 ${move.length - done}행이 안 바뀌었다 — 값이 그 사이 달라졌다`,
    );
}

async function revert() {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );
  const led = readLedger();
  let done = 0;
  for (const r of led.rows) {
    const res = await prisma.problem.updateMany({
      where: { id: r.id, content: r.after },
      data: { content: r.before },
    });
    done += res.count;
  }
  console.log(`✅ ${done}행 되돌림 (원장 ${led.rows.length}행)`);
}

async function main() {
  if (process.argv.includes("--revert")) await revert();
  else {
    const move = await plan();
    if (process.argv.includes("--apply")) await apply(move);
    else console.log("\n실제로 고치려면: ALLOW_SHARED_IMPORT=1 … --apply");
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
