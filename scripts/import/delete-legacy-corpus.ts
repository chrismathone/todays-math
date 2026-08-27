/**
 * **격리된 옛 말뭉치를 지운다** — 기출·RPM·옛 자작 (원장님 확정 2026-08-27).
 *
 *   npx tsx scripts/import/delete-legacy-corpus.ts                       # 세기만 (기본)
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/import/delete-legacy-corpus.ts --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/import/delete-legacy-corpus.ts --revert
 *
 * ── 왜 지우나 ────────────────────────────────────────────────────────────────
 * 원장님: 「격리된 문제들(AI 생성 안 한 RPM 및 기출)도 전부 삭제하자. 어차피 다시
 * 추출하면 된다. 지금 엔진 정비 중인데 괜히 그것 때문에 걸리적거려.」
 *
 * 격리 45,374건은 `owner_requested_legacy_corpus_quarantine` 한 사유로 묶인 옛
 * 말뭉치다 — 기출 41,084 · RPM(transformed) 3,526 · 옛 자작(manual) 764.
 * 이미 출제에서 빠져 있으나 질의·검사·화면에 계속 섞인다.
 *
 * ── ⚠️ 시험지까지 지운다 (원장님 확정) ───────────────────────────────────────
 * 격리 문항 중 **37,800건이 기출 시험지 2,584편에 실려 있다** — DB 의 기출 시험지
 * **전부**다. 그런데 `exam_question.problem_id` 에는 **외래키가 없다.** 문항만
 * 지우면 **에러 하나 없이** 시험지가 빈 껍데기로 남는다(끊어진 참조 37,800).
 * 「다시 추출하면 된다」는 맞지만 새로 뽑으면 **새 id** 라 연결은 안 돌아온다.
 *
 * 그래서 시험지(`exam`)와 실린 문항 연결(`exam_question`)까지 **같이** 지운다.
 * 「끊어진 껍데기를 남기지 않는다」가 이 스크립트의 계약이다.
 *
 * ⚠️ 이러면 `11-score-predictor.md`(기출 예상 점수 판독기)의 근거 자료가 사라진다.
 *    원장님이 이 결과를 보고 고르셨다. 되살리려면 `--revert` 를 쓰거나 다시 추출해야
 *    하는데, 다시 추출하면 그림 회수 이력(문서 16)은 자동으로 안 돌아온다.
 *
 * ── 안전 장치 ────────────────────────────────────────────────────────────────
 * ㉠ **격리된 것만 본다.** 대상은 `problem_outer_wall_quarantine` 에 실린 id 뿐이다.
 *    엔진 문항(`elem:`/`mid:`)과 `ai_generated` 는 **격리에 없으므로 손대지 않는다** —
 *    그래도 지우기 직전에 «남을 수»가 17,508 인지 **확인하고, 아니면 멈춘다.**
 * ㉡ **원장을 DB 보다 먼저 쓴다.** 지울 다섯 표를 통째로 담는다
 *    (2026-08-18 「되돌리기 파일이 이 컴퓨터에만 있었다」).
 * ㉢ **원장은 덧붙이기만 한다.** 회차가 줄면 멈춘다
 *    (2026-08-20 「원장을 덮어쓰면 앞 회차는 되돌릴 수 없다」).
 * ㉣ **잃는 것을 센다** (D-20) — 표별 건수와, 살아남는 문항 중 `origin_problem_id`
 *    가 NULL 로 바뀌는 수까지.
 * ㉤ 공유 DB 쓰기는 `ALLOW_SHARED_IMPORT=1` 없이는 막힌다 (D-31).
 *
 * ── 지우는 차례 (외래키가 정한다) ────────────────────────────────────────────
 *   1. `problem_outer_wall_quarantine`  — problem 에 ON DELETE RESTRICT 라 먼저
 *   2. `exam`                            — `exam_question` 이 CASCADE 로 딸려 간다
 *   3. `problem`                         — report·review_log 는 CASCADE,
 *                                          살아남는 행의 origin_problem_id 는 SET NULL
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import { PrismaClient } from "@prisma/client";

const LEDGER = path.join(
  process.cwd(),
  "scripts",
  "import",
  "ledgers",
  "legacy-corpus-delete.json.gz",
);

/** 지운 뒤 남아야 하는 문항 수 — 원장님이 화면에서 확인한 값. 다르면 멈춘다. */
const EXPECT_SURVIVORS = 17508;

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");

type Row = Record<string, unknown>;
type Round = {
  at: string;
  problem: Row[];
  exam: Row[];
  examQuestion: Row[];
  quarantine: Row[];
  problemReport: Row[];
  problemReviewLog: Row[];
};
type Ledger = { rounds: Round[] };

function readLedger(): Ledger {
  if (!existsSync(LEDGER)) return { rounds: [] };
  return JSON.parse(
    gunzipSync(readFileSync(LEDGER)).toString("utf-8"),
  ) as Ledger;
}

function writeLedger(next: Ledger, prevRounds: number): void {
  if (next.rounds.length < prevRounds) {
    throw new Error(
      `원장 회차가 줄었습니다 (${prevRounds} → ${next.rounds.length})`,
    );
  }
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(
    LEDGER,
    gzipSync(Buffer.from(JSON.stringify(next), "utf-8"), { level: 9 }),
  );
}

function allowed(): boolean {
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    console.error(
      "🔴 공유 DB 쓰기가 막혀 있다 (D-31). ALLOW_SHARED_IMPORT=1 이 필요하다.",
    );
    return false;
  }
  return true;
}

const plain = (v: unknown): Row => JSON.parse(JSON.stringify(v)) as Row;

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  if (REVERT) {
    if (!allowed()) return void (await prisma.$disconnect());
    const ledger = readLedger();
    if (ledger.rounds.length === 0) throw new Error("원장이 비었습니다");
    // 되살리는 차례는 지우는 차례의 **거꾸로**다.
    for (const r of ledger.rounds) {
      await prisma.problem.createMany({
        data: r.problem as never,
        skipDuplicates: true,
      });
      await prisma.exam.createMany({
        data: r.exam as never,
        skipDuplicates: true,
      });
      await prisma.examQuestion.createMany({
        data: r.examQuestion as never,
        skipDuplicates: true,
      });
      console.log(
        `회차 ${r.at}: 문항 ${r.problem.length} · 시험지 ${r.exam.length} 되살림`,
      );
    }
    await prisma.$disconnect();
    return;
  }

  // ── 대상 ──────────────────────────────────────────────────────────────────
  const quarantined = await prisma.$queryRaw<{ problem_id: string }[]>`
    SELECT problem_id FROM "problem_outer_wall_quarantine"`;
  const ids = quarantined.map((q) => q.problem_id);
  const totalProblems = await prisma.problem.count();
  const survivors = totalProblems - ids.length;
  console.log(
    `문항 전체 ${totalProblems} · 격리 ${ids.length} · **남을 것 ${survivors}**`,
  );

  // ㉠ 남을 수가 원장님이 확인한 값과 다르면 멈춘다.
  if (survivors !== EXPECT_SURVIVORS) {
    throw new Error(
      `남을 문항이 ${survivors} 인데 확인값은 ${EXPECT_SURVIVORS} 입니다 — 범위가 샜을 수 있어 멈춥니다`,
    );
  }
  const guard = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "problem_outer_wall_quarantine" x JOIN "problem" p ON p.id = x.problem_id
    WHERE p.family_key LIKE 'elem:%' OR p.family_key LIKE 'mid:%' OR p.source = 'ai_generated'`;
  if (Number(guard[0]?.n ?? 0) > 0) {
    throw new Error(
      `격리 목록에 엔진·AI 문항이 ${guard[0]!.n} 건 섞여 있습니다 — 멈춥니다`,
    );
  }

  const examIds = (
    await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "exam"`
  ).map((e) => e.id);
  const eqCount = await prisma.examQuestion.count();
  const orphaned = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "problem" p
    WHERE p.origin_problem_id IN (SELECT problem_id FROM "problem_outer_wall_quarantine")
      AND p.id NOT IN (SELECT problem_id FROM "problem_outer_wall_quarantine")`;

  console.log(`  시험지 ${examIds.length}편 · 실린 문항연결 ${eqCount}`);
  console.log(
    `  살아남지만 origin_problem_id 가 NULL 이 되는 문항 ${orphaned[0]?.n ?? 0}`,
  );

  if (!APPLY) {
    console.log("\n(세기만 했다. 지우려면 ALLOW_SHARED_IMPORT=1 … --apply)");
    await prisma.$disconnect();
    return;
  }
  if (!allowed()) return void (await prisma.$disconnect());

  // ── ㉡ 원장 먼저 ───────────────────────────────────────────────────────────
  console.log("원장을 적는 중…");
  const round: Round = {
    at: new Date().toISOString(),
    problem: [],
    exam: (await prisma.exam.findMany()).map(plain),
    examQuestion: (await prisma.examQuestion.findMany()).map(plain),
    quarantine: (
      await prisma.$queryRaw<
        Row[]
      >`SELECT * FROM "problem_outer_wall_quarantine"`
    ).map(plain),
    problemReport: [],
    problemReviewLog: [],
  };
  for (let i = 0; i < ids.length; i += 500) {
    const got = await prisma.problem.findMany({
      where: { id: { in: ids.slice(i, i + 500) } },
    });
    for (const r of got) round.problem.push(plain(r));
  }
  round.problemReport = (
    await prisma.$queryRaw<Row[]>`SELECT * FROM "problem_report"
      WHERE problem_id IN (SELECT problem_id FROM "problem_outer_wall_quarantine")`
  ).map(plain);
  round.problemReviewLog = (
    await prisma.$queryRaw<Row[]>`SELECT * FROM "problem_review_log"
      WHERE problem_id IN (SELECT problem_id FROM "problem_outer_wall_quarantine")`
  ).map(plain);

  const ledger = readLedger();
  const prev = ledger.rounds.length;
  ledger.rounds.push(round);
  writeLedger(ledger, prev);
  console.log(
    `원장 회차 ${ledger.rounds.length}: 문항 ${round.problem.length} · 시험지 ${round.exam.length}` +
      ` · 문항연결 ${round.examQuestion.length} · 격리 ${round.quarantine.length}` +
      ` · 신고 ${round.problemReport.length} · 검수 ${round.problemReviewLog.length}`,
  );

  // ── 지우기 (외래키가 정한 차례) ────────────────────────────────────────────
  const q =
    await prisma.$executeRaw`DELETE FROM "problem_outer_wall_quarantine"`;
  console.log(`1. 격리 표 ${q}행`);
  const e = await prisma.exam.deleteMany({});
  console.log(`2. 시험지 ${e.count}편 (실린 문항연결은 CASCADE)`);
  let gone = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const res = await prisma.problem.deleteMany({
      where: { id: { in: ids.slice(i, i + 500) } },
    });
    gone += res.count;
  }
  console.log(`3. 문항 ${gone}행`);

  const left = await prisma.problem.count();
  console.log(`\n남은 문항 ${left} (확인값 ${EXPECT_SURVIVORS})`);
  if (left !== EXPECT_SURVIVORS)
    throw new Error("남은 수가 확인값과 다릅니다 — 원장으로 되돌리십시오");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
