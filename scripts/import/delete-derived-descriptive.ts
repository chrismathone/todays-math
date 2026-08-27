/**
 * **파생 서술형을 지운다** — 발문 끝맺음만 바꿔 만든 서술형 (원장님 확정 2026-08-27).
 *
 *   npx tsx scripts/import/delete-derived-descriptive.ts            # 세기만 (기본)
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/import/delete-derived-descriptive.ts --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/import/delete-derived-descriptive.ts --revert
 *
 * ── 왜 지우나 ────────────────────────────────────────────────────────────────
 * `asDescriptive` 가 단답형 발문의 끝맺음만 바꿔(「구하시오」→「구하는 풀이 과정과
 * 답을 쓰시오」) 서술형을 냈다. 풀이·정답·그림은 단답형 그대로다. 전수 실측:
 *
 *   · 엔진 서술형 **9,476**건
 *   · 그중 **9,467건(99.9%)** 이 같은 문항류에 **풀이가 글자까지 같은 단답형** 짝 보유
 *   · 풀이를 단계로 쪼개면 **4,538건(47.9%)이 한 단계** — 쓸 과정이 없다
 *       「$13$은 두 수의 공배수가 아닙니다.」
 *   · 두 단계짜리도 대개 서술형이 아니다
 *       「최소공배수는 $24$입니다. 짝수인 공배수 중 가장 작은 수는 $24$입니다.」
 *   · 보기 나열형은 단계가 6~7로 잡히지만 그것도 과정이 아니다
 *       「ㄱ. 옳다 ㄴ. 옳다 ㄷ. 옳지 않다 …」
 *
 * **단계 수로는 못 가른다 — 파생 경로 자체가 틀렸다.** 그래서 문턱을 두지 않고
 * 파생분을 통째로 지운다. 서술형은 생성기가 처음부터 서술형으로 낸다
 * (`expandEngine.ts` 머리주석 · 시험이 파생 부활을 막는다).
 *
 * ── 안전 장치 ────────────────────────────────────────────────────────────────
 * ㉠ **엔진 것만 본다.** `family_key` 가 `elem:` / `mid:` 로 시작하는 행만.
 *    기출·변형·외벽은 절대 건드리지 않는다.
 * ㉡ **물린 행은 안 지운다.** 시험지·정답지·검수·신고가 참조하는 행이 하나라도
 *    있으면 그 행을 빼고, 몇 건을 뺐는지 찍는다. 조용히 지우지 않는다.
 * ㉢ **원장은 덧붙이기만 한다.** 회차가 늘어도 앞 회차가 사라지지 않는다
 *    (2026-08-20 「원장을 덮어쓰면 앞 회차는 되돌릴 수 없다」).
 * ㉣ **잃는 것을 센다** (D-20). 단원별로 서술형이 0이 되는 곳을 찍는다.
 * ㉤ 공유 DB 쓰기는 `ALLOW_SHARED_IMPORT=1` 없이는 막힌다 (D-31).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import { PrismaClient } from "@prisma/client";

/**
 * 🔴 **원장은 gzip 으로 적는다.** 지우는 9,476행에 그림 SVG 4.96MB 가 딸려 있어
 *    날 JSON 이면 9.1MB 다. 그걸 그대로 커밋하면 저장소를 무겁게 하는데,
 *    **커밋되지 않는 되돌리기 파일은 없는 것과 같다**(2026-08-18: 공유 DB 를 790건
 *    바꿔 놓고 원장이 `.gitignore` 에 걸려 이 컴퓨터에만 있었다).
 *    그래서 지우지도, 빼지도 않고 **줄여서 커밋한다**(실측 9.1MB → 약 1MB).
 */
const LEDGER = path.join(
  process.cwd(),
  "scripts",
  "import",
  "ledgers",
  "derived-descriptive-delete.json.gz",
);

/** 참조가 있으면 지우지 않는다 — 컬럼 이름은 DB 에 물어서 얻는다(손 목록은 샌다). */
const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");

type Row = Record<string, unknown>;
type Ledger = { rounds: { at: string; deleted: Row[] }[] };

function readLedger(): Ledger {
  if (!existsSync(LEDGER)) return { rounds: [] };
  return JSON.parse(
    gunzipSync(readFileSync(LEDGER)).toString("utf-8"),
  ) as Ledger;
}

function writeLedger(next: Ledger, prevRounds: number): void {
  // 🔴 회차가 줄면 멈춘다 — 덮어쓰기를 구조로 막는다
  //    (2026-08-20 「원장을 덮어쓰면 앞 회차는 되돌릴 수 없다」).
  if (next.rounds.length < prevRounds) {
    throw new Error(
      `원장 회차가 줄었습니다 (${prevRounds} → ${next.rounds.length}) — 덮어쓸 뻔했습니다`,
    );
  }
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(
    LEDGER,
    gzipSync(Buffer.from(JSON.stringify(next), "utf-8"), { level: 9 }),
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  if (REVERT) {
    const ledger = readLedger();
    const rows = ledger.rounds.flatMap((r) => r.deleted);
    if (rows.length === 0)
      throw new Error("원장이 비었습니다 — 되돌릴 것이 없습니다");
    if (!APPLY_ALLOWED()) return void (await prisma.$disconnect());
    let back = 0;
    for (const row of rows) {
      const exists = await prisma.problem.findUnique({
        where: { id: String(row.id) },
      });
      if (exists) continue; // 이미 있으면 건드리지 않는다
      // exam-wiring: 기출아님 — 원장에 적힌 **그 행 그대로** 되살린다. 새 문항이
      //   아니라 되돌리기이므로 시험지 배선이 생기거나 사라지지 않는다.
      await prisma.problem.create({ data: row as never });
      back += 1;
    }
    console.log(`되살린 행 ${back} / 원장 ${rows.length}`);
    await prisma.$disconnect();
    return;
  }

  // ── 대상 ──────────────────────────────────────────────────────────────────
  const target = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "problem"
    WHERE question_type = '서술형'
      AND (family_key LIKE 'elem:%' OR family_key LIKE 'mid:%')`;
  console.log(`엔진 파생 서술형: ${target.length}건`);

  // ㉡ 물린 행 — 참조 테이블을 DB 에 물어서 찾는다.
  const refTables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'problem_id' AND table_schema = 'public'
    ORDER BY table_name`;
  const held = new Set<string>();
  for (const t of refTables) {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT DISTINCT p.id FROM "problem" p
       JOIN "${t.table_name}" x ON x.problem_id = p.id
       WHERE p.question_type = '서술형'
         AND (p.family_key LIKE 'elem:%' OR p.family_key LIKE 'mid:%')`,
    );
    for (const r of rows) held.add(r.id);
    if (rows.length > 0)
      console.log(
        `  ⚠️ ${t.table_name} 이 ${rows.length}건을 물고 있다 — 뺀다`,
      );
  }
  const ids = target.map((t) => t.id).filter((id) => !held.has(id));
  console.log(`  물려서 뺀 것 ${held.size} · **지울 것 ${ids.length}**`);

  // ㉣ 무엇을 잃나 — 단원별로 서술형이 0이 되는 곳.
  const loss = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(DISTINCT unit_id) AS n FROM "problem"
    WHERE question_type = '서술형'
      AND (family_key LIKE 'elem:%' OR family_key LIKE 'mid:%')`;
  console.log(
    `  서술형이 사라지는 소단원 ${loss[0]?.n ?? 0}곳 (엔진 서술형은 전량 파생분이다)`,
  );

  if (!APPLY) {
    console.log(
      "\n(세기만 했다. 실제로 지우려면 ALLOW_SHARED_IMPORT=1 … --apply)",
    );
    await prisma.$disconnect();
    return;
  }
  if (!APPLY_ALLOWED()) return void (await prisma.$disconnect());

  // ── 원장 먼저, DB 나중 ─────────────────────────────────────────────────────
  // 2026-08-18 「되돌리기 파일이 이 컴퓨터에만 있었다」 — 지우기 전에 적는다.
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const got = await prisma.problem.findMany({ where: { id: { in: chunk } } });
    for (const r of got) rows.push(JSON.parse(JSON.stringify(r)) as Row);
  }
  const ledger = readLedger();
  const prevRounds = ledger.rounds.length;
  ledger.rounds.push({ at: new Date().toISOString(), deleted: rows });
  writeLedger(ledger, prevRounds);
  console.log(
    `원장에 ${rows.length}행 적었다 (회차 ${ledger.rounds.length}) → ${LEDGER}`,
  );

  let gone = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const res = await prisma.problem.deleteMany({
      where: { id: { in: chunk } },
    });
    gone += res.count;
  }
  console.log(`지운 행 ${gone}`);
  const left = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "problem"
    WHERE question_type = '서술형'
      AND (family_key LIKE 'elem:%' OR family_key LIKE 'mid:%')`;
  console.log(
    `남은 엔진 서술형 ${left[0]?.n ?? 0} (물린 것만 남아야 한다: ${held.size})`,
  );
  await prisma.$disconnect();
}

function APPLY_ALLOWED(): boolean {
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    console.error(
      "🔴 공유 DB 쓰기가 막혀 있다 (D-31). ALLOW_SHARED_IMPORT=1 이 필요하다.",
    );
    return false;
  }
  return true;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
