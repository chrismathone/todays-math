/**
 * 초등 `family_key` 를 **난이도 이름 → 문형 id** 로 옮긴다.
 *
 *   elem:초5|1-2-6 최소공배수 구하는 방법|기본  →  elem:초5|1-2-6 …|02
 *
 * ## 왜 UPDATE 인가 — 지우면 안 된다
 *
 * 이 행들 가운데 **8행이 시험지 3장에 실제로 쓰이고 있다**(`test_problem` 전량).
 * 「지우고 새로 적재」로 가면 그 시험지가 깨진다. 적재기의 `--revert` 는 DELETE 라
 * 이 일에 못 쓴다. 그래서 키만 제자리에서 바꾸고, **되돌리기를 따로 만든다.**
 *
 * ## 매핑 근거
 *
 * 문형 01–04 는 기존 4단 핸들러를 **감싸기만** 한 것이라 난이도와 1:1 이다.
 * `scripts/qa/probe-elem-forms.ts` 가 세운 230곳 전량에서 성립하는 것을 확인했고,
 * 이 스크립트도 **돌기 전에 다시 확인**한다 — 엔진이 바뀌면 여기서 멈춘다.
 *
 * ## 원장 규약 (이 저장소가 두 번 데인 자리)
 *
 * - **추가만** 한다. 회차가 늘어도 앞 회차 행이 사라지면 안 된다.
 * - 같은 행이 두 회차에 걸치면 **처음 before · 마지막 after**.
 * - 누적 행이 **줄면 멈춘다.**
 * - 되돌릴 때는 **지금 값이 자기가 쓴 값일 때만** 되돌린다.
 *
 * 쓰기:
 *   npx tsx scripts/import/migrate-elem-family-keys.ts                 # 계획만
 *   ALLOW_SHARED_IMPORT=1 npx tsx … --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx … --revert scripts/import/ledgers/elem-family-keys.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  elementaryUnits,
  listedForms,
  supportedTiers,
} from "../../src/lib/elementary/generate";

const prisma = new PrismaClient();
const LEDGER = "scripts/import/ledgers/elem-family-keys.json";

/** 난이도 → 문형 id. 이 표는 **엔진에서 확인한 뒤에만** 쓴다. */
const TIER_TO_FORM: Record<string, string> = {
  연산: "01",
  기본: "02",
  응용: "03",
  심화: "04",
};

type Row = { id: string; before: string; after: string };
type Ledger = { runs: string[]; rows: Row[] };

function readLedger(): Ledger {
  if (!existsSync(LEDGER)) return { runs: [], rows: [] };
  return JSON.parse(readFileSync(LEDGER, "utf8")) as Ledger;
}

/**
 * 원장은 **덮어쓰지 않고 합친다.** 같은 행이 두 회차에 걸치면 처음 before 를
 * 남겨야 한다 — 마지막 before 를 쓰면 「되돌렸다」면서 앞 회차 값으로 안 간다.
 */
function mergeLedger(prev: Ledger, runId: string, rows: Row[]): Ledger {
  const byId = new Map(prev.rows.map((r) => [r.id, r]));
  for (const r of rows) {
    const old = byId.get(r.id);
    byId.set(r.id, old ? { ...old, after: r.after } : r);
  }
  const merged = { runs: [...prev.runs, runId], rows: [...byId.values()] };
  // 🔴 줄면 멈춘다 — 덮어쓰기 사고를 코드가 막는다.
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

/** 엔진이 아직 「01=연산 … 04=심화」인가. 아니면 이 이관은 틀린다. */
function assertMapping() {
  let checked = 0;
  for (const unit of elementaryUnits()) {
    if (supportedTiers(unit).length === 0) continue;
    const forms = listedForms(unit);
    for (const [tier, id] of Object.entries(TIER_TO_FORM)) {
      const f = forms.find((x) => x.id === id);
      if (!f)
        throw new Error(`${unit.grade} ${unit.section}: 문형 ${id} 이 없다`);
      if (f.tier !== tier)
        throw new Error(
          `${unit.grade} ${unit.section}: 문형 ${id} 이 «${f.tier}» 다 — «${tier}» 여야 한다`,
        );
    }
    checked += 1;
  }
  console.log(
    `✅ 매핑 확인 ${checked}곳 — 01=연산 · 02=기본 · 03=응용 · 04=심화`,
  );
}

/** `elem:초5|소단원|기본` → `elem:초5|소단원|02`. 못 옮기면 null. */
function newKey(key: string): string | null {
  const at = key.lastIndexOf("|");
  if (at < 0) return null;
  const tier = key.slice(at + 1);
  const id = TIER_TO_FORM[tier];
  if (!id) return null;
  return `${key.slice(0, at)}|${id}`;
}

async function plan() {
  const rows = await prisma.problem.findMany({
    where: { familyKey: { startsWith: "elem:" } },
    select: { id: true, familyKey: true },
  });
  const move: Row[] = [];
  const skip: string[] = [];
  for (const r of rows) {
    const before = r.familyKey as string;
    const after = newKey(before);
    if (!after) {
      skip.push(before);
      continue;
    }
    move.push({ id: r.id, before, after });
  }
  const usedInPapers = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int AS n FROM problem p
      WHERE p.family_key LIKE 'elem:%'
        AND EXISTS (SELECT 1 FROM test_problem tp WHERE tp.problem_id = p.id)`,
  );
  console.log(
    `elem 행 ${rows.length} · 옮길 것 ${move.length} · 건너뛸 것 ${skip.length}`,
  );
  console.log(
    `갈래 ${new Set(move.map((m) => m.before)).size} → ${new Set(move.map((m) => m.after)).size}`,
  );
  console.log(
    `시험지에 쓰이는 행 ${usedInPapers[0]?.n ?? 0} — **한 행도 안 지운다**`,
  );
  if (skip.length > 0) {
    // 🔴 조용히 건너뛰면 「전부 옮겼다」가 거짓말이 된다.
    const uniq = [...new Set(skip)];
    console.log(`\n⚠️ 못 옮긴 키 ${uniq.length}종:`);
    for (const k of uniq.slice(0, 10)) console.log(`   ${k}`);
  }
  return move;
}

async function apply(move: Row[]) {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );
  // 원장을 **DB 보다 먼저** 쓴다 — 되돌릴 근거가 없는 변경을 만들지 않는다.
  const runId = new Date().toISOString();
  writeLedger(mergeLedger(readLedger(), runId, move));
  console.log(`원장 기록 ${move.length}행 → ${LEDGER}`);

  let done = 0;
  for (const r of move) {
    const res = await prisma.problem.updateMany({
      where: { id: r.id, familyKey: r.before },
      data: { familyKey: r.after },
    });
    done += res.count;
  }
  console.log(`✅ ${done}행 이관`);
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
  console.log(`원장 ${led.rows.length}행 · 회차 ${led.runs.length}`);
  let done = 0;
  for (const r of led.rows) {
    // 🔴 **지금 값이 자기가 쓴 값일 때만** 되돌린다 — 남이 바꾼 것을 덮지 않는다.
    const res = await prisma.problem.updateMany({
      where: { id: r.id, familyKey: r.after },
      data: { familyKey: r.before },
    });
    done += res.count;
  }
  console.log(`✅ ${done}행 되돌림 (원장 ${led.rows.length}행)`);
  if (done !== led.rows.length)
    console.log(
      `   ${led.rows.length - done}행은 이미 다른 값이라 건드리지 않았다`,
    );
}

async function main() {
  assertMapping();
  if (process.argv.includes("--revert")) {
    await revert();
  } else {
    const move = await plan();
    if (process.argv.includes("--apply")) await apply(move);
    else console.log("\n실제로 옮기려면: ALLOW_SHARED_IMPORT=1 … --apply");
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
