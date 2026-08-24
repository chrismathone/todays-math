/**
 * 문항 소유자 비우기 — D-101 (원장님 확정 2026-08-24: 「소유자 필요없고 전체 공유」).
 *
 *   npx tsx scripts/admin/clear-problem-owner.ts                  # 드라이런
 *   ALLOW_CLEAR_PROBLEM_OWNER=1 npx tsx scripts/admin/clear-problem-owner.ts --apply
 *   ALLOW_CLEAR_PROBLEM_OWNER=1 npx tsx scripts/admin/clear-problem-owner.ts --revert
 *
 * 선행 조건: 마이그레이션 `20260824200000_problem_owner_optional` (컬럼 nullable + FK SET NULL).
 * 그 전에 돌리면 NOT NULL 제약에 걸려 실패한다 — **아래에서 실제로 확인하고 멈춘다.**
 *
 * ⚠️ 되돌리기 원장은 **문항 id → 옛 소유자**를 전량 담는다(gzip). 「소유자가 둘뿐이니
 *    규칙으로 되돌리면 된다」로 줄이지 않는다 — 그 규칙이 틀리면 되돌린 값이 조용히
 *    틀린다. 이 저장소가 여러 번 겪은 자리다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.env.ALLOW_CLEAR_PROBLEM_OWNER === "1";
const MODE = process.argv.includes("--revert")
  ? "revert"
  : process.argv.includes("--apply")
    ? "apply"
    : "dryrun";

const LEDGER = join(
  process.cwd(),
  "scripts/admin/ledgers/problem-owner-cleared-2026-08-24.json.gz",
);

type Ledger = { at: string; reason: string; before: Record<string, string[]> };

async function assertMigrated() {
  const [col] = (await prisma.$queryRawUnsafe(
    `select is_nullable from information_schema.columns
     where table_name='problem' and column_name='user_id'`,
  )) as { is_nullable: string }[];
  if (col?.is_nullable !== "YES")
    throw new Error(
      "problem.user_id 가 아직 NOT NULL 이다 — 마이그레이션 20260824200000 을 먼저 적용하라",
    );
  const [fk] = (await prisma.$queryRawUnsafe(
    `select rc.delete_rule from information_schema.referential_constraints rc
     where rc.constraint_name='problem_user_id_fkey'`,
  )) as { delete_rule: string }[];
  if (fk?.delete_rule !== "SET NULL")
    throw new Error(
      `problem_user_id_fkey 가 ${fk?.delete_rule} 다 — SET NULL 이어야 한다(CASCADE 면 계정 삭제가 문항을 지운다)`,
    );
}

async function main() {
  await assertMigrated();
  console.log(
    `문항 소유자 비우기 — 모드: ${MODE}${APPLY ? "" : " (가드 미설정)"}\n`,
  );

  if (MODE === "revert") {
    if (!existsSync(LEDGER)) throw new Error("되돌릴 원장이 없다");
    const led = JSON.parse(
      gunzipSync(readFileSync(LEDGER)).toString("utf8"),
    ) as Ledger;
    let restored = 0;
    for (const [userId, ids] of Object.entries(led.before)) {
      // 지금 값이 **NULL 일 때만** 되돌린다 — 그 사이 누가 채웠으면 건드리지 않는다.
      if (APPLY) {
        for (let i = 0; i < ids.length; i += 500) {
          const chunk = ids.slice(i, i + 500);
          const r = await prisma.problem.updateMany({
            where: { id: { in: chunk }, userId: null },
            data: { userId },
          });
          restored += r.count;
        }
      }
      console.log(`  ${userId} ← ${ids.length}건`);
    }
    console.log(APPLY ? `\n되돌림 ${restored}건` : "\n드라이런입니다.");
    return;
  }

  const total = await prisma.problem.count();
  const already = await prisma.problem.count({ where: { userId: null } });
  const grouped = await prisma.problem.groupBy({
    by: ["userId"],
    _count: { _all: true },
  });
  console.log(`문항 ${total}건 · 이미 소유자 없음 ${already}건`);
  console.log("현재 소유자 분포:");
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const label = Object.fromEntries(users.map((u) => [u.id, u.email]));
  for (const g of grouped)
    console.log(
      `  ${g.userId ? (label[g.userId] ?? g.userId) : "(없음)"}: ${g._count._all}`,
    );

  if (!APPLY || MODE !== "apply") {
    console.log(
      "\n드라이런입니다. 실제 적용에는 ALLOW_CLEAR_PROBLEM_OWNER=1 ... --apply 가 필요합니다.",
    );
    return;
  }

  // ── 원장 먼저, DB 는 그 다음 ────────────────────────────────
  // (2026-08-18 교훈: 원장을 DB 보다 **먼저** 쓴다. 중간에 죽으면 되돌릴 것이 남아야 한다.)
  const before: Record<string, string[]> = {};
  const owned = await prisma.problem.findMany({
    where: { userId: { not: null } },
    select: { id: true, userId: true },
  });
  for (const row of owned) {
    if (!row.userId) continue;
    (before[row.userId] ??= []).push(row.id);
  }
  const ledger: Ledger = {
    at: new Date().toISOString(),
    reason:
      "원장님 확정 2026-08-24 — 문항 소유자 제거(D-101). 되돌리려면 --revert.",
    before,
  };
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, gzipSync(JSON.stringify(ledger)));
  const sum = Object.values(before).reduce((a, b) => a + b.length, 0);
  console.log(`\n되돌리기 원장 → ${LEDGER} (${sum}건 기록)`);
  if (sum !== total - already)
    throw new Error(
      `원장 건수(${sum})와 소유자 있는 문항 수(${total - already})가 다르다 — 중단`,
    );

  const res = await prisma.problem.updateMany({
    where: { userId: { not: null } },
    data: { userId: null },
  });
  console.log(`소유자 비움 ${res.count}건`);

  const left = await prisma.problem.count({ where: { userId: { not: null } } });
  console.log(
    left === 0
      ? `✅ 문항 ${total}건 전량 소유자 없음`
      : `🔴 아직 ${left}건에 소유자가 남았다`,
  );
}

main()
  .catch((e) => {
    console.error("🔴", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
