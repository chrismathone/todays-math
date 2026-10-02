/**
 * 오늘의 영어 세트의 «형식 판» SQL 초안(`prisma/drafts/english-set-schema-version/draft.sql`)을 잰다
 * (자료 개선 M0 · docs/planning/english-material-upgrade-20261002.md §C).
 *
 *   npx tsx scripts/qa/check-english-schema-version-draft.ts            # 정적 검사 — DB 에 닿지 않는다
 *   ALLOW_SHARED_DRYRUN=1 npx tsx scripts/qa/check-english-schema-version-draft.ts --dry-run
 *                                                                       # DB 에서 다 해 보고 **반드시 ROLLBACK**
 *
 * 🔴 **이 도구는 적용하지 않는다.** `--apply` 가 없다 — M0 는 초안과 드라이런 준비까지다. 적용은 M1 게이트 뒤에
 *    초안을 `prisma/migrations/` 로 옮기고 전용 적용 도구(본보기 `apply-english-set-meta-migration.ts`)를 따로 만든다.
 * 🔴 `--dry-run` 은 `DATABASE_URL` 이 가리키는 DB 에 붙는다. 그 DB 가 시험용이라고 **가정하지 않는다** — 공유 DB 라고 보고
 *    `ALLOW_SHARED_DRYRUN=1` 을 요구한다. 칸을 더하는 순간 표에 짧은 잠금이 선다(10초에서 포기). 원장님께 여쭌 뒤 돌린다.
 *    2026-10-02 현재 이 모드는 **공유 DB 에서 돌려 본 적이 없다** — 로컬 메모리 Postgres 서버에 대고만 끝까지 돌려 봤다(§C.4).
 *
 * 드라이런이 확인하는 것(전부 한 트랜잭션 안 · 끝에 되돌린다):
 *   ⑴ 앞 조건 — 표가 있다 · 새 칸은 아직 없다
 *   ⑵ 칸 — schema_version smallint NOT NULL DEFAULT 1 · payload_v2 jsonb NULL · 칸이 정확히 둘 늘었다
 *   ⑶ CHECK — 새 CHECK 의 정의문 · 옛 CHECK 다섯이 그대로
 *   ⑷ 🔴 기존 행 무변경 — 행 수 · 전부 1판 · 2판 본문 0 · meta NULL 인 행 수 · 내용 지문(md5)이 적용 전과 같다
 *   ⑸ CHECK 의 동작 — DB 에 들어간 제약의 식을 표본 값(받을 것 둘 · 거절할 것 아홉)에 대고 셈한다. 행을 넣지 않는다
 */
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import {
  DRAFT_PATH,
  checkPrecondition,
  lintAdditiveDraft,
  probeConstraints,
  verifyApplied,
  type SqlRunner,
} from "./english-schema-version/checks";

const DRY_RUN = process.argv.includes("--dry-run");

class RolledBack extends Error {}

function targetOf(url: string | undefined): string {
  if (!url) return "(DATABASE_URL 없음)";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "(읽을 수 없는 DATABASE_URL)";
  }
}

async function dryRun(statements: string[]): Promise<void> {
  if (process.env.ALLOW_SHARED_DRYRUN !== "1") {
    console.error(
      "드라이런도 DB 에 잠깐 잠금을 건다. 원장님께 여쭌 뒤 ALLOW_SHARED_DRYRUN=1 과 --dry-run 을 같이 준다.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(`대상 DB: ${targetOf(process.env.DATABASE_URL)}`);
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(
      async (tx) => {
        const runner: SqlRunner = {
          query: (sql, ...params) =>
            tx.$queryRawUnsafe(sql, ...params) as Promise<never[]>,
          execute: async (sql) => {
            await tx.$executeRawUnsafe(sql);
          },
        };
        await runner.execute(`SET LOCAL lock_timeout = '10s'`);
        const before = await checkPrecondition(runner);
        console.log(
          `  ⑴ 앞 조건 — ${before.columnsBefore}칸 · ${before.rowsBefore}행 · meta NULL ${before.nullMetaBefore}행`,
        );
        for (const statement of statements) await runner.execute(statement);
        console.log("  초안을 넣었다(이 트랜잭션 안에서만). 확인:");
        for (const line of await verifyApplied(runner, before))
          console.log(`  ⑵~⑷ ${line}`);
        for (const line of await probeConstraints(runner))
          console.log(`  ⑸ ${line}`);
        throw new RolledBack();
      },
      { timeout: 120_000, maxWait: 30_000 },
    );
  } catch (error) {
    if (!(error instanceof RolledBack)) throw error;
    console.log(
      "\n드라이런이라 **되돌렸다**(ROLLBACK). 이 도구는 적용하지 않는다.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--apply"))
    throw new Error(
      "이 도구는 적용하지 않는다(M0 — 초안과 드라이런 준비까지). 적용은 M1 게이트 뒤 전용 도구로.",
    );
  const lint = lintAdditiveDraft(readFileSync(DRAFT_PATH, "utf8"));
  console.log(DRAFT_PATH);
  console.log(`  문장 ${lint.statements.length}개`);
  for (const entry of lint.added)
    console.log(`  더한다 — ${entry.kind} ${entry.name}`);
  if (lint.problems.length) {
    for (const problem of lint.problems) console.error(`  🔴 ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log("  정적 검사 통과 — 더하기만 한다(칸 2 · CHECK 1).");
  if (DRY_RUN) await dryRun(lint.statements);
  else
    console.log(
      "DB 에는 닿지 않았다. 드라이런은 원장님께 여쭌 뒤 ALLOW_SHARED_DRYRUN=1 … --dry-run.",
    );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
