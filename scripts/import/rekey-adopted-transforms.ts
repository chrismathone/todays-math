/**
 * **변형본의 문항류를 원본 것으로 되돌린다** (원장님 지시 2026-08-27).
 *
 *   npx tsx scripts/import/rekey-adopted-transforms.ts                        # 세기만
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/import/rekey-adopted-transforms.ts --apply
 *
 * ── 왜 ───────────────────────────────────────────────────────────────────────
 * `adopt` 가 `familyKey` 를 안 적어서 트리거가 `solo:<uuid>` 를 새로 만들었다.
 * 원본 하나를 다섯 번 변형했더니 `A14-001`~`A18-001` — **다섯이 전부 다른 문항류**.
 * 라우트는 고쳤고(같은 커밋), 이미 들어간 행을 여기서 되돌린다.
 *
 * ── ⚠️ 왜 UPDATE 가 아니라 «지우고 다시 넣기» 인가 ───────────────────────────
 * `problem_code_freeze` 트리거가 **한 번 붙은 코드의 변경을 막는다**(D-53:
 * 「코드는 파생이 아니라 저장이다」). 그 가드는 옳다 — 원장님이 종이·대화에 적어 둔
 * 코드가 다른 문항을 가리키면 안 된다. 그래서 UPDATE 로는 `A14-001` 을 `A07-002` 로
 * 못 바꾼다.
 *
 * 대신 지우고 **원본의 `familyKey` 를 달아 다시 넣는다.** 그러면 트리거가 원본과
 * 같은 `problem_family` 에서 번호를 떼어 `A07-002`… 가 된다.
 *
 * 안전한 이유(대상 조건에 박혀 있다): 이 행들을 **어떤 표도
 * 참조하지 않는다**. 기본은 `pending` 만 보고, 승인분은 `--include-approved` 로만 연다 —
 * 승인된 코드는 이미 밖에 나갔을 수 있기 때문이다.
 *
 * ── 안전 장치 ────────────────────────────────────────────────────────────────
 * ㉠ 대상은 «`source=transformed` · 원본 있음 · 원본에 `familyKey` 있음 ·
 *    자기 키가 `solo:` · `pending` · 참조 없음» 을 **모두** 만족하는 행뿐이다.
 * ㉡ 원장을 DB 보다 먼저 쓴다. 새 id·새 코드도 적어 두어 되짚을 수 있게 한다.
 * ㉢ 지운 만큼 넣었는지 세고, 다르면 멈춘다.
 * ㉣ 공유 DB 쓰기는 `ALLOW_SHARED_IMPORT=1` 없이는 막힌다 (D-31).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

const LEDGER = path.join(
  process.cwd(),
  "scripts",
  "import",
  "ledgers",
  "rekey-adopted-transforms.json",
);
const APPLY = process.argv.includes("--apply");
/**
 * 🔴 **승인된 행까지 손댄다.** 기본은 `pending` 뿐이다 — 승인된 문항의 코드는 이미
 *    종이·대화에 나갔을 수 있고, 코드가 다른 문항을 가리키면 안 된다(D-53).
 *    그래서 «지금 막 만든 것을 원장님이 바로 승인하신» 경우처럼 **사람이 사정을
 *    알고 있을 때만** 이 플래그로 연다. 진짜 안전 장치는 아래 «참조 없음» 셋이다.
 */
const INCLUDE_APPROVED = process.argv.includes("--include-approved");

type Row = Record<string, unknown>;
type Ledger = {
  rounds: { at: string; moved: { before: Row; after: Row }[] }[];
};

function readLedger(): Ledger {
  if (!existsSync(LEDGER)) return { rounds: [] };
  return JSON.parse(readFileSync(LEDGER, "utf-8")) as Ledger;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  // ㉠ 대상 — 조건을 SQL 에 박아 둔다. 화면에서 고른 목록을 물려받지 않는다
  //    (2026-08-18 「반증하려고 넓힌 모집단을 처리 대상으로 물려받았다」).
  const statusFilter = INCLUDE_APPROVED
    ? Prisma.sql`p.review_status IN ('pending', 'approved')`
    : Prisma.sql`p.review_status = 'pending'`;
  const targets = await prisma.$queryRaw<
    { id: string; problem_code: string; origin_family: string }[]
  >(Prisma.sql`
    SELECT p.id, p.problem_code, o.family_key AS origin_family
    FROM "problem" p
    JOIN "problem" o ON o.id = p.origin_problem_id
    WHERE p.source = 'transformed'
      AND ${statusFilter}
      AND p.family_key LIKE 'solo:%'
      AND o.family_key IS NOT NULL
      AND btrim(o.family_key) <> ''
      AND o.family_key <> p.family_key
      AND NOT EXISTS (SELECT 1 FROM "exam_question"  x WHERE x.problem_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM "test_problem"   x WHERE x.problem_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM "problem_answer" x WHERE x.problem_id = p.id)
    ORDER BY p.problem_code`);

  console.log(`문항류를 되돌릴 변형본: ${targets.length}건`);
  for (const t of targets) {
    console.log(
      `  ${t.problem_code}  →  원본 문항류 ${t.origin_family.slice(0, 34)}`,
    );
  }
  if (targets.length === 0) {
    await prisma.$disconnect();
    return;
  }
  if (!APPLY) {
    console.log(
      "\n(세기만 했다. 실제로 고치려면 ALLOW_SHARED_IMPORT=1 … --apply)",
    );
    await prisma.$disconnect();
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    console.error(
      "🔴 공유 DB 쓰기가 막혀 있다 (D-31). ALLOW_SHARED_IMPORT=1 이 필요하다.",
    );
    await prisma.$disconnect();
    return;
  }

  const moved: { before: Row; after: Row }[] = [];
  for (const t of targets) {
    const before = await prisma.problem.findUniqueOrThrow({
      where: { id: t.id },
    });
    const {
      id: _id,
      problemCode: _code,
      createdAt: _c,
      updatedAt: _u,
      ...rest
    } = before;
    void _id;
    void _code;
    void _c;
    void _u;
    // 지우고 → 넣는다. 한 문항씩 트랜잭션으로 묶어 반쯤 남지 않게 한다.
    const after = await prisma.$transaction(async (tx) => {
      await tx.problem.delete({ where: { id: t.id } });
      // exam-wiring: 기출아님 — AI 변형본만 옮긴다(대상 조건에 `source=transformed`).
      //   같은 행을 문항류만 바꿔 다시 넣는 것이고, 대상은 **어떤 표도 참조하지
      //   않는 행**뿐이라 시험지 배선이 걸릴 수 없다.
      return tx.problem.create({
        data: { ...rest, familyKey: t.origin_family } as never,
      });
    });
    moved.push({
      before: JSON.parse(JSON.stringify(before)) as Row,
      after: JSON.parse(JSON.stringify(after)) as Row,
    });
    console.log(`  ${before.problemCode} → ${after.problemCode}`);
  }

  // ㉢ 지운 만큼 넣었나
  if (moved.length !== targets.length) {
    throw new Error(
      `대상 ${targets.length} 인데 ${moved.length} 만 옮겼습니다`,
    );
  }

  // ㉡ 원장 — 덧붙이기만.
  const ledger = readLedger();
  const prev = ledger.rounds.length;
  ledger.rounds.push({ at: new Date().toISOString(), moved });
  if (ledger.rounds.length < prev) throw new Error("원장 회차가 줄었습니다");
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2), "utf-8");
  console.log(
    `\n원장 회차 ${ledger.rounds.length} · ${moved.length}건 → ${LEDGER}`,
  );

  // 남은 빈 문항류 — 이 행들이 쓰던 `solo:` 키의 problem_family 는 이제 아무도 안 쓴다.
  const orphan = await prisma.$executeRaw`
    DELETE FROM "problem_family" f
    WHERE f.family_key LIKE 'solo:%'
      AND NOT EXISTS (SELECT 1 FROM "problem" p
                      WHERE p.unit_id = f.unit_id AND p.family_key = f.family_key)`;
  console.log(`아무도 안 쓰는 solo 문항류 ${orphan}개 정리`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
