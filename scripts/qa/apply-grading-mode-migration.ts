/**
 * 채점 기록의 **세 상태** 마이그레이션(`20260917001000_test_result_grading_mode`)을 적용한다 (D-134 트랙 1).
 *
 *   npx tsx scripts/qa/apply-grading-mode-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-grading-mode-migration.ts --apply
 *
 * 🔴 **이 워크트리(grading-input)는 드라이런조차 돌리지 않았다** — 브리프 «공유 DB 에 아무것도 쓰지 마라»,
 *    `.env` 도 없다. 드라이런·적용은 **리드가 원장님 확인을 받고** main 에서 한다.
 * 🔴 **배포보다 먼저** 적용한다. Prisma 는 `test_result` 를 읽고 쓸 때마다 `grading_mode`·`absent` 를
 *    부른다 — 칸 없이 배포되면 채점·결과 조회가 전부 500 이다.
 * 🔴 **지금이 유일하게 싼 시점이다** — 공유 DB `test_result` 는 **0행**(23 §1.1). NOT NULL 을 푸는 일은
 *    행이 쌓인 뒤에는 잠금도 되돌리기도 비싸진다.
 *
 * 본뜬 것: `scripts/qa/apply-test-auto-draft-migration.ts` — 같은 까닭으로 `prisma migrate deploy` 를 안 쓴다
 * (다른 트랙이 남긴 미적용 마이그레이션까지 같이 적용한다). **이 마이그레이션 하나만** 적용하고
 * `_prisma_migrations` 에 같은 방식(체크섬 = CR 제거 후 sha256)으로 기록한다.
 *
 * 무엇을 확인하나(읽기만 — 확인용 행을 넣지 않는다):
 *   ⑴ 앞 조건 — `test_result` 표가 있고, 적용 전에 `grading_mode` 타입이 **아직 없다**
 *   ⑵ 타입 — `grading_mode` 가 enum 이고 값이 정확히 `marks`·`answers` 둘
 *   ⑶ 칸 — `test_result.grading_mode`(NOT NULL · 기본값 `answers`) · `absent`(NOT NULL · 기본값 false)
 *   ⑷ 🔴 **NULL 허용** — `score` · `predicted_score` 가 둘 다 `is_nullable = YES`
 *   ⑸ 🔴 기존 행 무변경 — 적용 전후 `test_result` 행 수가 같고,
 *      **기존 행이 전부** `grading_mode='answers'` · `absent=false` 다(기본값이 제 뜻대로 채웠나)
 *
 * 되돌리기: `--revert` (드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply`.
 * 🔴 `score` 나 `predicted_score` 에 **NULL 이 하나라도 있으면 되돌리지 않는다** — 되돌리면 그 결시 행이
 *    NOT NULL 을 어겨 ALTER 가 실패하고, 억지로 0 을 채우면 **결시가 진짜 0점이 된다**(23 §4 ③).
 *    그때는 그 행들을 어떻게 할지 먼저 정한다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20260917001000_test_result_grading_mode";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;

const ENUM_NAME = "grading_mode";
const ENUM_VALUES = ["marks", "answers"];
const TABLE = "test_result";

const REVERT_SQL = `
ALTER TABLE "${TABLE}" ALTER COLUMN "predicted_score" SET NOT NULL;
ALTER TABLE "${TABLE}" ALTER COLUMN "score" SET NOT NULL;
ALTER TABLE "${TABLE}" DROP COLUMN IF EXISTS "grading_mode";
ALTER TABLE "${TABLE}" DROP COLUMN IF EXISTS "absent";
DROP TYPE IF EXISTS "${ENUM_NAME}";
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

/** Prisma 체크섬 = 마이그레이션 파일에서 CR 을 뺀 뒤 sha256 (apply-problem-code-migration.ts 에서 실측). */
function prismaChecksum(text: string): string {
  return createHash("sha256").update(text.replaceAll("\r", "")).digest("hex");
}

/** 주석을 걷고 `;` 로 나눈다. 이 파일에는 함수 본문($$)이 없어 단순 분할로 충분하다. */
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

async function rowCount(tx: Tx): Promise<number> {
  const [{ n }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "${TABLE}"`,
  )) as Array<{ n: number }>;
  return n;
}

/** ⑴ 앞 조건 — 표가 있고 타입이 아직 없다. 하나라도 어긋나면 손대지 않고 멈춘다. */
async function checkPrecondition(): Promise<void> {
  const [{ table }] = (await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.${TABLE}') IS NOT NULL AS table`,
  )) as Array<{ table: boolean }>;
  const types = (await prisma.$queryRawUnsafe(
    `SELECT 1 FROM pg_type WHERE typname = $1`,
    ENUM_NAME,
  )) as unknown[];
  console.log(
    `  앞 조건 — ${TABLE} 표 ${table ? "있음" : "없음"} · ${ENUM_NAME} 타입 ${types.length ? "🔴 이미 있음" : "없음(정상)"}`,
  );
  if (!table) throw new Error(`${TABLE} 표가 없다`);
  if (types.length > 0)
    throw new Error(
      `${ENUM_NAME} 타입이 이미 있다 — 다른 마이그레이션이 만들었을 수 있다. 손대지 않고 멈춘다.`,
    );
}

/** ⑵~⑸ — 적용한 트랜잭션 안에서 읽기만 한다. */
async function check(tx: Tx, rowsBefore: number): Promise<void> {
  const values = (await tx.$queryRawUnsafe(
    `SELECT e.enumlabel::text AS label
       FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = $1 ORDER BY e.enumsortorder`,
    ENUM_NAME,
  )) as Array<{ label: string }>;
  const labels = values.map((v) => v.label);
  console.log(`  ⑵ 타입 ${ENUM_NAME} — [${labels.join(", ")}]`);
  if (
    labels.length !== ENUM_VALUES.length ||
    labels.some((l, i) => l !== ENUM_VALUES[i])
  )
    throw new Error(`enum 값이 다르다: [${labels.join(", ")}]`);

  const columns = (await tx.$queryRawUnsafe(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
        AND column_name IN ('grading_mode', 'absent', 'score', 'predicted_score')`,
    TABLE,
  )) as Array<{
    column_name: string;
    data_type: string;
    udt_name: string;
    is_nullable: string;
    column_default: string | null;
  }>;
  const col = (name: string) => columns.find((c) => c.column_name === name);

  const mode = col("grading_mode");
  const absent = col("absent");
  console.log(
    `  ⑶ 새 칸 — grading_mode ${mode ? `${mode.udt_name} · NULL ${mode.is_nullable} · 기본값 ${mode.column_default ?? "없음"}` : "없다"}` +
      ` · absent ${absent ? `${absent.data_type} · NULL ${absent.is_nullable} · 기본값 ${absent.column_default ?? "없음"}` : "없다"}`,
  );
  if (!mode) throw new Error("grading_mode 칸이 없다");
  if (mode.udt_name !== ENUM_NAME)
    throw new Error(`grading_mode 의 형이 다르다: ${mode.udt_name}`);
  if (mode.is_nullable !== "NO")
    throw new Error("grading_mode 가 NULL 을 허용한다");
  // 🔴 기본값이 `answers` 여야 기존 행과 옛 코드 경로의 뜻이 그대로다.
  if (!(mode.column_default ?? "").includes("'answers'"))
    throw new Error(
      `grading_mode 기본값이 answers 가 아니다: ${mode.column_default}`,
    );
  if (!absent) throw new Error("absent 칸이 없다");
  if (absent.is_nullable !== "NO")
    throw new Error("absent 가 NULL 을 허용한다");
  if (!(absent.column_default ?? "").includes("false"))
    throw new Error(
      `absent 기본값이 false 가 아니다: ${absent.column_default}`,
    );

  const score = col("score");
  const predicted = col("predicted_score");
  console.log(
    `  ⑷ NULL 허용 — score ${score?.is_nullable ?? "없다"} · predicted_score ${predicted?.is_nullable ?? "없다"}`,
  );
  // 🔴 여기가 이 마이그레이션의 **본론**이다 — 결시를 0 으로 적지 않으려면 NULL 이 들어가야 한다.
  if (score?.is_nullable !== "YES")
    throw new Error("score 가 아직 NOT NULL 이다");
  if (predicted?.is_nullable !== "YES")
    throw new Error("predicted_score 가 아직 NOT NULL 이다");

  const rowsAfter = await rowCount(tx);
  const [{ oddMode, oddAbsent }] = (await tx.$queryRawUnsafe(
    `SELECT count(*) FILTER (WHERE "grading_mode" <> 'answers')::int AS "oddMode",
            count(*) FILTER (WHERE "absent")::int              AS "oddAbsent"
       FROM "${TABLE}"`,
  )) as Array<{ oddMode: number; oddAbsent: number }>;
  console.log(
    `  ⑸ 기존 채점 기록 ${rowsBefore}행 → ${rowsAfter}행 · answers 가 아닌 행 ${oddMode} · 결시로 채워진 행 ${oddAbsent} (둘 다 0 이어야 한다)`,
  );
  if (rowsAfter !== rowsBefore) throw new Error(`${TABLE} 행 수가 바뀌었다`);
  if (oddMode !== 0) throw new Error("기존 행의 채점 방식이 answers 가 아니다");
  if (oddAbsent !== 0) throw new Error("기존 행이 결시로 채워졌다");
}

async function revert(): Promise<void> {
  const exists = (await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'grading_mode'`,
    TABLE,
  )) as unknown[];
  if (exists.length === 0) {
    console.log("  칸이 없다(이미 되돌렸거나 적용 전)");
  } else {
    const [{ nullScores, absents }] = (await prisma.$queryRawUnsafe(
      `SELECT count(*) FILTER (WHERE "score" IS NULL OR "predicted_score" IS NULL)::int AS "nullScores",
              count(*) FILTER (WHERE "absent")::int AS "absents"
         FROM "${TABLE}"`,
    )) as Array<{ nullScores: number; absents: number }>;
    console.log(
      `  점수가 비어 있는 행 ${nullScores} · 결시로 적힌 행 ${absents}`,
    );
    // 🔴 되돌리면 이 행들은 NOT NULL 을 어긴다. 0 으로 채우는 «해결»은 결시를 0점으로 만든다.
    if (nullScores > 0)
      throw new Error(
        "점수가 비어 있는 채점 기록이 있다(결시) — 되돌리면 0점이 되거나 ALTER 가 실패한다. 멈춘다.",
      );
    if (absents > 0)
      throw new Error(
        "결시로 적힌 기록이 있다 — 칸을 지우면 그 사실이 영영 사라진다. 멈춘다.",
      );
  }
  const statements = splitStatements(REVERT_SQL);
  console.log(`되돌리기: ${statements.length}문장`);
  if (!APPLY) {
    console.log(
      "드라이런이다. 실제로 되돌리려면 ALLOW_SHARED_IMPORT=1 … --revert --apply.",
    );
    return;
  }
  await prisma.$transaction(async (tx) => {
    for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
  });
  console.log("되돌렸다.");
}

async function main() {
  if (REVERT) return await revert();

  const raw = readFileSync(MIGRATION_PATH, "utf8");
  const checksum = prismaChecksum(raw);
  const statements = splitStatements(raw);
  console.log(MIGRATION_PATH);
  console.log(`  문장 ${statements.length}개 · 체크섬 ${checksum}`);
  if (statements.length !== 2)
    throw new Error(`문장이 둘(타입·칸)이 아니다: ${statements.length}`);

  const already = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as unknown[];
  if (already.length > 0) {
    console.log("이미 적용돼 있다. 아무것도 하지 않는다.");
    return;
  }
  await checkPrecondition();

  await prisma
    .$transaction(
      async (tx) => {
        // 앱이 `test_result` 를 쓰는 중이면 ALTER 가 뒤에서 한없이 기다리며 앱 쿼리까지 줄 세운다 — 10초면 포기한다
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
        const rowsBefore = await rowCount(tx);
        for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
          checksum,
          MIGRATION_NAME,
        );
        console.log("  적용됨. 확인:");
        await check(tx, rowsBefore);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log(
          "\n드라이런이라 **되돌렸다**(ROLLBACK). 실제로 적용하려면:\n" +
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-grading-mode-migration.ts --apply",
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
