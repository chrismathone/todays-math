/**
 * 메뉴 CHECK 넓히기 마이그레이션(`20261016120000_menu_arithmetic`)을 적용한다 — «연산대장»을 관리 메뉴로(원장님 2026-10-16).
 *
 *   npx tsx scripts/qa/apply-menu-arithmetic-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-menu-arithmetic-migration.ts --apply
 *
 * 바꾸는 것은 CHECK 제약 둘(`user_disabled_menus_valid` · `branch_disabled_menus_valid`)의 허용 목록뿐이다 — 행은 안 만진다.
 * 둘 다 «꺼 둔 메뉴» 목록이라 새 값이 늘어도 기존 지점·계정의 메뉴는 그대로 켜져 있다.
 * 🔴 순서는 **DB 먼저 · 코드 나중** — 코드가 먼저 나가면 연산대장을 끄고 저장하는 순간 23514 로 500 이다(2026-10-01 교훈).
 *
 * 본뜬 것: `apply-app-setting-migration.ts` — `prisma migrate deploy` 를 안 쓴다(다른 트랙의 미적용 마이그레이션까지 적용한다).
 * **이 마이그레이션 하나만** 적용하고 `_prisma_migrations` 에 같은 방식(체크섬 = CR 제거 후 sha256)으로 기록한다.
 *
 * 확인(읽기만): ⑴ 앞 조건 — 두 제약이 지금 목록 그대로(arithmetic 없음) ⑵ 뒤 — 두 제약 모두 arithmetic 을 허용하고
 * 다른 값은 하나도 빠지지 않았다 ⑶ 기존 행이 새 제약을 전부 통과한다(ADD CONSTRAINT 가 검사한다).
 * 되돌리기: `--revert`(드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply` — 🔴 arithmetic 을 꺼 둔 행이 있으면 되돌리지 않는다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20261016120000_menu_arithmetic";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;

const BEFORE_USER = [
  "home",
  "bank",
  "studio",
  "export",
  "library",
  "textbook",
  "teaching",
  "concept",
  "conceptBlank",
  "srs",
  "english",
  "english-school",
  "english-maker",
  "english-library",
  "english-listening",
  "english-bank",
];
const BEFORE_BRANCH = BEFORE_USER.filter((menu) => menu !== "english");

const REVERT_SQL = `
ALTER TABLE "user" DROP CONSTRAINT "user_disabled_menus_valid";
ALTER TABLE "user" ADD CONSTRAINT "user_disabled_menus_valid"
  CHECK ("disabled_menus" <@ ARRAY[${BEFORE_USER.map((m) => `'${m}'`).join(",")}]::TEXT[]);
ALTER TABLE "branch" DROP CONSTRAINT "branch_disabled_menus_valid";
ALTER TABLE "branch" ADD CONSTRAINT "branch_disabled_menus_valid"
  CHECK (
    "disabled_menus" <@ ARRAY[${BEFORE_BRANCH.map((m) => `'${m}'`).join(",")}]::TEXT[]
    AND array_position("disabled_menus", NULL) IS NULL
  );
DELETE FROM "_prisma_migrations" WHERE migration_name = '${MIGRATION_NAME}';
`;

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");

if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
  console.error(
    "공유 DB 쓰기가 막혀 있다. ALLOW_SHARED_IMPORT=1 과 --apply 가 둘 다 필요하다.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
type Tx = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe">;

function prismaChecksum(text: string): string {
  return createHash("sha256").update(text.replaceAll("\r", "")).digest("hex");
}

function splitStatements(sql: string): string[] {
  if (sql.includes("$$"))
    throw new Error("$$ 본문이 있다 — 단순 분할로는 안 된다");
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

class DryRun extends Error {}

/** 제약 정의에서 허용 목록(ARRAY['a'::text, …])만 꺼낸다. */
async function allowed(tx: Tx, constraint: string): Promise<string[] | null> {
  const rows = (await tx.$queryRawUnsafe(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`,
    constraint,
  )) as Array<{ def: string }>;
  if (rows.length !== 1) return null;
  const list = /ARRAY\[([^\]]*)\]/.exec(rows[0].def)?.[1] ?? "";
  return [...list.matchAll(/'([^']+)'::text/g)].map((m) => m[1]);
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return (
    a.length === b.length &&
    [...a].sort().every((v, i) => v === [...b].sort()[i])
  );
}

async function before(tx: Tx): Promise<void> {
  const user = await allowed(tx, "user_disabled_menus_valid");
  const branch = await allowed(tx, "branch_disabled_menus_valid");
  console.log(
    `  ⑴ 앞 조건 — user ${user?.length ?? "없음"}개 · branch ${branch?.length ?? "없음"}개`,
  );
  if (!user || !branch) throw new Error("제약이 없다 — 손대지 않고 멈춘다.");
  if (!sameSet(user, BEFORE_USER) || !sameSet(branch, BEFORE_BRANCH))
    throw new Error(
      `제약의 목록이 기대와 다르다 — user [${user.join(",")}] branch [${branch.join(",")}]`,
    );
}

async function after(tx: Tx): Promise<void> {
  const user = await allowed(tx, "user_disabled_menus_valid");
  const branch = await allowed(tx, "branch_disabled_menus_valid");
  console.log(`  ⑵ 뒤 — user ${user?.length}개 · branch ${branch?.length}개`);
  if (
    !user ||
    !branch ||
    !sameSet(user, [...BEFORE_USER, "arithmetic"]) ||
    !sameSet(branch, [...BEFORE_BRANCH, "arithmetic"])
  )
    throw new Error("적용 뒤 목록이 기대와 다르다");
  const [{ users, branches }] = (await tx.$queryRawUnsafe(
    `SELECT (SELECT count(*)::int FROM "user") AS users, (SELECT count(*)::int FROM "branch") AS branches`,
  )) as Array<{ users: number; branches: number }>;
  console.log(
    `  ⑶ 기존 행 — 계정 ${users} · 지점 ${branches} (ADD CONSTRAINT 가 전부 검사했다)`,
  );
}

async function revert(): Promise<void> {
  const [{ users, branches }] = (await prisma.$queryRawUnsafe(
    `SELECT (SELECT count(*)::int FROM "user" WHERE 'arithmetic' = ANY("disabled_menus")) AS users,
            (SELECT count(*)::int FROM "branch" WHERE 'arithmetic' = ANY("disabled_menus")) AS branches`,
  )) as Array<{ users: number; branches: number }>;
  console.log(`  arithmetic 을 꺼 둔 행 — 계정 ${users} · 지점 ${branches}`);
  if (users > 0 || branches > 0)
    throw new Error(
      "연산대장을 꺼 둔 행이 있다 — 되돌리면 그 행이 제약에 걸린다. 멈춘다.",
    );
  const statements = splitStatements(REVERT_SQL);
  if (!APPLY) {
    console.log(`되돌리기 ${statements.length}문장 — 드라이런이다.`);
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
    for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
  });
  console.log("되돌렸다.");
}

async function main() {
  if (REVERT) return await revert();
  const raw = readFileSync(MIGRATION_PATH, "utf8");
  const checksum = prismaChecksum(raw);
  const statements = splitStatements(raw);
  console.log(
    `${MIGRATION_PATH}\n  문장 ${statements.length}개 · 체크섬 ${checksum}`,
  );
  if (statements.length !== 4)
    throw new Error(`문장이 넷(DROP·ADD ×2)이 아니다: ${statements.length}`);
  const already = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as unknown[];
  if (already.length > 0) {
    console.log("이미 적용돼 있다. 아무것도 하지 않는다.");
    return;
  }
  await before(prisma);

  await prisma
    .$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
        for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
          checksum,
          MIGRATION_NAME,
        );
        console.log("  적용됨. 확인:");
        await after(tx);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log(
          "\n드라이런이라 되돌렸다(ROLLBACK). 실제로 적용하려면:\n" +
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-menu-arithmetic-migration.ts --apply",
        );
        return;
      }
      throw error;
    });
  if (APPLY) console.log("\n적용 완료.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
