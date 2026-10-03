/**
 * 교재 제작 마이그레이션 셋을 적용한다 (계획 60a508c0 · P1 계약 e94aedb8).
 *
 *   npx tsx scripts/qa/apply-textbook-studio-migration.ts                       # 드라이런 — 셋을 한 트랜잭션에서 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-textbook-studio-migration.ts --apply
 *   … --only 20261003120000_textbook_studio                                    # 하나만(앞 것이 적용돼 있어야 한다)
 *
 *   ① 20261003120000_textbook_studio                 전용 표 20개 · 트리거 · RLS
 *   ② 20261003120100_textbook_test_problem_snapshot  test_problem.snapshot_id (nullable) · FK · 부분 색인 · 트리거
 *   ③ 20261003120200_user_menus_check_textbook       메뉴 CHECK 넓히기(textbook · 영어 셋)
 *
 * 🔴 **이 워크트리는 공유 DB 에 닿지 않았다**(`.env` 가 없다). 여기서 잰 것은 PGlite(메모리 Postgres)뿐이다 —
 *    공유 DB 의 드라이런 · 적용은 리드가 병합 뒤에 한다. Supabase 와 PGlite 는 같은 판 · 설정이 아니다.
 * 🔴 순서: **DB 먼저 · 코드 나중**(24번 문서 §6.1). `schema.prisma` 의 `TestProblem.snapshotId` 가 ②의 칸을 읽는다 —
 *    칸 없는 DB 에 코드가 먼저 나가면 시험지를 읽는 모든 요청이 P2022 로 죽는다. ①②를 적용한 뒤에 코드를 낸다.
 *    ③은 코드보다 먼저여도 나중이어도 깨지지 않는다(넓히기만 한다) — 다만 늦으면 `textbook` 메뉴를 끄는 저장이 500 이다.
 *
 * 본뜬 것: `scripts/qa/apply-english-studio-migration.ts` — 같은 까닭으로 `prisma migrate deploy` 를 안 쓴다
 * (다른 트랙의 미적용 마이그레이션까지 같이 적용한다). 이 셋만 적용하고 `_prisma_migrations` 에 같은 방식
 * (체크섬 = CR 제거 후 sha256)으로 기록한다. 문장 분할은 `$$` 본문을 아는 `textbook-sql-statements.ts` 를 쓴다.
 *
 * 무엇을 확인하나(적용한 트랜잭션 안에서 읽기만 — 확인용 행을 넣지 않는다):
 *   ⑴ 앞 조건 — FK 가 설 표 · 외벽 함수가 있다 / 교재 표 · 칸이 아직 없다
 *   ⑵ 표 20개가 정확히 그 이름으로 생겼다 · 20개 전부 RLS 켜짐 · 정책 0 · anon/authenticated/PUBLIC 권한 0
 *   ⑶ 트리거 36개(교재 표에 35 + test_problem 에 1 — 이름까지) · 트리거 함수의 search_path 고정
 *   ⑷ 부분 유일 색인 다섯 · 주인/판본 복합 FK(이름과 가리키는 표)
 *   ⑸ CHECK 의 값 목록 = 계약의 enum(학습 단계 · 연결 상태 · 산출물 종류 · 배정 범위 · 영상 상태 · 백지 형식)
 *   ⑹ test_problem.snapshot_id — uuid · NULL 허용 · FK RESTRICT · 기존 행 전부 NULL
 *   ⑺ 메뉴 CHECK — 코드의 메뉴 전부 + 옛 `english`
 *   ⑻ 🔴 기존 표 무변경 — 적용 전후 user · problem · test · test_problem 행 수가 같다
 *
 * 되돌리기: `--revert`(드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply`. ①②를 걷는다(③의 넓힌 CHECK 는 둔다 — 해가 없다).
 * 🔴 발행본이 하나라도 있으면 되돌리지 않는다 — 인쇄된 QR 이 그 행에 달려 있다. 행이 있으면 `--drop-rows` 를 같이 줘야 한다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import {
  textbookArtifactSchema,
  textbookAssignmentScopeSchema,
} from "@/contracts/textbook.contract";
import {
  textbookLearningStageSchema,
  textbookLinkStatusSchema,
  textbookVideoBindingSchema,
} from "@/contracts/textbookExchange.contract";
import { textbookFormSchema } from "@/contracts/textbookPrimitives.contract";

import { splitSqlStatements } from "./textbook-sql-statements";

const MIGRATIONS = [
  "20261003120000_textbook_studio",
  "20261003120100_textbook_test_problem_snapshot",
  "20261003120200_user_menus_check_textbook",
] as const;
type MigrationName = (typeof MIGRATIONS)[number];

const TABLES = [
  "textbook",
  "textbook_edition",
  "textbook_section",
  "textbook_problem_snapshot",
  "textbook_item",
  "textbook_blob",
  "textbook_upload",
  "textbook_upload_chunk",
  "textbook_asset",
  "textbook_edition_asset",
  "textbook_concept",
  "textbook_qr_target",
  "textbook_video",
  "textbook_video_binding",
  "textbook_assignment",
  "textbook_request",
  "textbook_publish_step",
  "textbook_artifact",
  "textbook_concept_attempt",
  "textbook_archive",
];

const CHILD_TABLES = [
  "textbook_section",
  "textbook_item",
  "textbook_concept",
  "textbook_edition_asset",
  "textbook_artifact",
];
const EXPECTED_TRIGGERS = [
  "textbook_guard_book",
  "textbook_guard_edition",
  ...CHILD_TABLES.flatMap((table) => [
    `${table}_guard`,
    `${table}_bump_insert`,
    `${table}_bump_update`,
    `${table}_bump_delete`,
  ]),
  "textbook_item_link",
  "textbook_guard_snapshot",
  "textbook_problem_snapshot_outer_wall",
  "textbook_guard_blob",
  "textbook_guard_asset",
  "textbook_guard_qr_target",
  "textbook_guard_video",
  "textbook_guard_video_binding",
  "textbook_guard_assignment",
  "textbook_guard_request",
  "textbook_guard_publish_step",
  "textbook_guard_concept_attempt",
  "textbook_guard_archive",
].sort();

const PARTIAL_UNIQUE = [
  "textbook_edition_one_draft",
  "textbook_request_one_open_publish",
  "textbook_video_binding_one_published",
  "textbook_qr_target_item_key",
  "textbook_qr_target_concept_key",
];

/** 복합 FK — 이름 → [표, 가리키는 표]. «같은 주인 · 같은 판본»을 DB 가 보는 자리다 */
const COMPOSITE_FKS: Record<string, [string, string]> = {
  textbook_edition_textbook_id_user_id_fkey: ["textbook_edition", "textbook"],
  textbook_item_edition_id_user_id_fkey: ["textbook_item", "textbook_edition"],
  textbook_item_snapshot_id_user_id_fkey: [
    "textbook_item",
    "textbook_problem_snapshot",
  ],
  textbook_item_edition_id_section_id_fkey: [
    "textbook_item",
    "textbook_section",
  ],
  textbook_concept_edition_id_section_id_fkey: [
    "textbook_concept",
    "textbook_section",
  ],
  textbook_edition_asset_edition_id_user_id_fkey: [
    "textbook_edition_asset",
    "textbook_edition",
  ],
  textbook_edition_asset_user_id_asset_id_fkey: [
    "textbook_edition_asset",
    "textbook_asset",
  ],
  textbook_qr_target_edition_id_item_id_fkey: [
    "textbook_qr_target",
    "textbook_item",
  ],
  textbook_qr_target_edition_id_concept_key_fkey: [
    "textbook_qr_target",
    "textbook_concept",
  ],
  textbook_video_binding_snapshot_id_user_id_fkey: [
    "textbook_video_binding",
    "textbook_problem_snapshot",
  ],
  textbook_video_binding_video_id_user_id_fkey: [
    "textbook_video_binding",
    "textbook_video",
  ],
};

/** CHECK 의 값 목록 = 계약의 enum — [표, 제약, 값들] */
const VALUE_CHECKS: Array<[string, string, readonly string[]]> = [
  [
    "textbook_item",
    "textbook_item_learning_stage_check",
    textbookLearningStageSchema.options,
  ],
  [
    "textbook_item",
    "textbook_item_link_status_check",
    textbookLinkStatusSchema.options,
  ],
  [
    "textbook_artifact",
    "textbook_artifact_kind_check",
    textbookArtifactSchema.shape.kind.options,
  ],
  [
    "textbook_assignment",
    "textbook_assignment_scope_kind_check",
    textbookAssignmentScopeSchema.options.map(
      (option) => option.shape.kind.value,
    ),
  ],
  [
    "textbook_video_binding",
    "textbook_video_binding_status_check",
    textbookVideoBindingSchema.shape.status.options,
  ],
  [
    "textbook_concept_attempt",
    "textbook_concept_attempt_form_check",
    textbookFormSchema.options,
  ],
];

const UNCHANGED_TABLES = ["user", "problem", "test", "test_problem"];

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const DROP_ROWS = process.argv.includes("--drop-rows");
const onlyIndex = process.argv.indexOf("--only");
const ONLY = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];
if (ONLY !== null && !MIGRATIONS.includes(ONLY as MigrationName)) {
  console.error(`모르는 마이그레이션: ${ONLY}\n  ${MIGRATIONS.join("\n  ")}`);
  process.exit(1);
}
if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
  console.error(
    "공유 DB 쓰기가 막혀 있다. ALLOW_SHARED_IMPORT=1 과 --apply 가 둘 다 필요하다.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
type Tx = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe">;

/** Prisma 체크섬 = 마이그레이션 파일에서 CR 을 뺀 뒤 sha256 (apply-problem-code-migration.ts 에서 실측). */
const prismaChecksum = (text: string): string =>
  createHash("sha256").update(text.replaceAll("\r", "")).digest("hex");

class DryRun extends Error {}

async function rows<T>(
  tx: Tx,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  return (await tx.$queryRawUnsafe(sql, ...params)) as T[];
}

async function exists(tx: Tx, relation: string): Promise<boolean> {
  const [{ found }] = await rows<{ found: boolean }>(
    tx,
    `SELECT to_regclass($1) IS NOT NULL AS found`,
    `public.${relation}`,
  );
  return found;
}

async function hasColumn(
  tx: Tx,
  table: string,
  column: string,
): Promise<boolean> {
  const found = await rows(
    tx,
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    table,
    column,
  );
  return found.length > 0;
}

async function counts(tx: Tx): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const table of UNCHANGED_TABLES) {
    const [{ n }] = await rows<{ n: number }>(
      tx,
      `SELECT count(*)::int AS n FROM "${table}"`,
    );
    result[table] = n;
  }
  return result;
}

function fail(message: string): never {
  throw new Error(message);
}

/** `IN ('a', 'b')` 는 PG 가 `= ANY (ARRAY['a'::character varying, …])` 로 다시 적는다 — 따옴표 값만 뽑는다 */
const quotedValues = (def: string): string[] => [
  ...new Set(
    [
      ...def.matchAll(/'((?:[^']|'')*)'::(?:character varying|text|bpchar)/g),
    ].map((m) => m[1]!.replaceAll("''", "'")),
  ),
];

async function checkPrecondition(tx: Tx, name: MigrationName): Promise<void> {
  if (name === MIGRATIONS[0]) {
    for (const table of [
      "user",
      "branch",
      "class",
      "student",
      "unit",
      "problem",
    ])
      if (!(await exists(tx, `"${table}"`)))
        fail(`${table} 표가 없다 — FK 가 설 곳이 없다`);
    const wall = await rows(
      tx,
      `SELECT 1 FROM pg_proc WHERE proname = 'block_problem_relation_behind_outer_wall'`,
    );
    if (!wall.length)
      fail("외벽 함수가 없다 — 확정본에 걸 트리거가 설 곳이 없다");
    const present: string[] = [];
    for (const table of TABLES)
      if (await exists(tx, table)) present.push(table);
    if (present.length)
      fail(
        `교재 표가 이미 있다(${present.join(", ")}) — 기록 없이 누가 만들었는지 먼저 확인할 것`,
      );
    console.log("  ⑴ 앞 조건 — 기존 표 · 외벽 함수 있음 · 교재 표 없음");
  } else if (name === MIGRATIONS[1]) {
    if (!(await exists(tx, "textbook_problem_snapshot")))
      fail("textbook_problem_snapshot 이 없다 — ①을 먼저 적용한다");
    if (await hasColumn(tx, "test_problem", "snapshot_id"))
      fail("test_problem.snapshot_id 가 이미 있다 — 먼저 확인할 것");
    console.log("  ⑴ 앞 조건 — 확정본 표 있음 · snapshot_id 칸 없음");
  } else {
    const found = await rows(
      tx,
      `SELECT 1 FROM pg_constraint WHERE conname = 'user_disabled_menus_valid'`,
    );
    if (!found.length) fail("user_disabled_menus_valid 제약이 없다");
    console.log("  ⑴ 앞 조건 — 메뉴 CHECK 있음");
  }
}

async function checkStudio(tx: Tx): Promise<void> {
  const tables = await rows<{ relname: string; rls: boolean }>(
    tx,
    `SELECT relname, relrowsecurity AS rls FROM pg_class
      WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace AND relname LIKE 'textbook%' ORDER BY 1`,
  );
  const names = tables.map((t) => t.relname);
  console.log(
    `  ⑵ 표 ${names.length}개 · RLS ${tables.filter((t) => t.rls).length}개 켜짐`,
  );
  if (names.join("|") !== [...TABLES].sort().join("|"))
    fail(`교재 표 목록이 다르다: ${names.join(", ")}`);
  if (tables.some((t) => !t.rls)) fail("RLS 가 켜지지 않은 표가 있다");
  const policies = await rows(
    tx,
    `SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'textbook%'`,
  );
  if (policies.length) fail("정책이 있다 — 정책 없이 닫아 두어야 한다");
  const grants = await rows<{ grantee: string; table_name: string }>(
    tx,
    `SELECT grantee, table_name FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name LIKE 'textbook%' AND grantee IN ('anon', 'authenticated', 'PUBLIC')`,
  );
  console.log(
    `     anon · authenticated · PUBLIC 권한 ${grants.length}건(0 이어야 한다)`,
  );
  if (grants.length)
    fail(
      `Data API 로 새는 권한이 남았다: ${grants.map((g) => `${g.grantee}→${g.table_name}`).join(", ")}`,
    );

  const triggers = await rows<{ tgname: string }>(
    tx,
    `SELECT t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace AND c.relname LIKE 'textbook%' ORDER BY 1`,
  );
  const triggerNames = triggers.map((t) => t.tgname).sort();
  console.log(`  ⑶ 트리거 ${triggerNames.length}개`);
  if (triggerNames.join("|") !== EXPECTED_TRIGGERS.join("|"))
    fail(
      `트리거 목록이 다르다 — 빠짐: ${EXPECTED_TRIGGERS.filter((n) => !triggerNames.includes(n)).join(", ") || "없음"} · 남음: ${triggerNames.filter((n) => !EXPECTED_TRIGGERS.includes(n)).join(", ") || "없음"}`,
    );
  const loose = await rows<{ proname: string }>(
    tx,
    `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'textbook\\_%'
        AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(proconfig, '{}')) c WHERE c LIKE 'search_path=%')`,
  );
  if (loose.length)
    fail(
      `search_path 를 고정하지 않은 함수: ${loose.map((f) => f.proname).join(", ")}`,
    );

  const indexes = await rows<{ indexname: string; indexdef: string }>(
    tx,
    `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename LIKE 'textbook%'`,
  );
  for (const name of PARTIAL_UNIQUE) {
    const index = indexes.find((i) => i.indexname === name);
    if (
      !index ||
      !/UNIQUE/.test(index.indexdef) ||
      !/ WHERE /.test(index.indexdef)
    )
      fail(`부분 유일 색인 ${name} 가 없거나 모양이 다르다`);
  }
  console.log(`  ⑷ 부분 유일 색인 ${PARTIAL_UNIQUE.length}개`);
  for (const [name, [table, target]] of Object.entries(COMPOSITE_FKS)) {
    const [fk] = await rows<{ source: string; target: string; width: number }>(
      tx,
      `SELECT conrelid::regclass::text AS source, confrelid::regclass::text AS target, cardinality(conkey) AS width
         FROM pg_constraint WHERE conname = $1 AND contype = 'f'`,
      name,
    );
    if (!fk) fail(`복합 FK ${name} 가 없다`);
    if (
      fk.source.replaceAll('"', "") !== table ||
      fk.target.replaceAll('"', "") !== target ||
      fk.width !== 2
    )
      fail(
        `복합 FK ${name} 의 모양이 다르다: ${fk.source} → ${fk.target} (${fk.width}칸)`,
      );
  }
  console.log(`     복합 FK ${Object.keys(COMPOSITE_FKS).length}개`);

  for (const [table, constraint, values] of VALUE_CHECKS) {
    const [check] = await rows<{ def: string }>(
      tx,
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid = $1::regclass AND conname = $2 AND contype = 'c'`,
      `public.${table}`,
      constraint,
    );
    if (!check) fail(`CHECK ${constraint} 가 없다`);
    const found = quotedValues(check.def).sort().join("|");
    const want = [...values].sort().join("|");
    if (found !== want)
      fail(
        `CHECK ${constraint} 의 값 목록이 계약과 다르다: [${found}] ≠ [${want}]`,
      );
  }
  console.log(`  ⑸ CHECK 값 목록 ${VALUE_CHECKS.length}개가 계약과 같다`);
}

async function checkSnapshotColumn(tx: Tx): Promise<void> {
  const [column] = await rows<{ data_type: string; is_nullable: string }>(
    tx,
    `SELECT data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'test_problem' AND column_name = 'snapshot_id'`,
  );
  if (!column || column.data_type !== "uuid" || column.is_nullable !== "YES")
    fail("test_problem.snapshot_id 가 uuid · NULL 허용이 아니다");
  const [fk] = await rows<{ on_delete: string; target: string }>(
    tx,
    `SELECT confdeltype AS on_delete, confrelid::regclass::text AS target FROM pg_constraint
      WHERE conname = 'test_problem_snapshot_id_fkey' AND contype = 'f'`,
  );
  if (
    !fk ||
    fk.on_delete !== "r" ||
    fk.target.replaceAll('"', "") !== "textbook_problem_snapshot"
  )
    fail("test_problem_snapshot_id_fkey 가 없거나 RESTRICT 가 아니다");
  const trigger = await rows(
    tx,
    `SELECT 1 FROM pg_trigger WHERE tgname = 'test_problem_textbook_snapshot_identity' AND NOT tgisinternal`,
  );
  if (!trigger.length) fail("확정본 정체 트리거가 없다");
  const [{ filled }] = await rows<{ filled: number }>(
    tx,
    `SELECT count(*)::int AS filled FROM "test_problem" WHERE "snapshot_id" IS NOT NULL`,
  );
  console.log(
    `  ⑹ test_problem.snapshot_id — uuid · NULL 허용 · FK RESTRICT · 값이 있는 기존 행 ${filled}(0 이어야 한다)`,
  );
  if (filled !== 0) fail("기존 시험지 문항에 확정본이 달려 있다");
}

async function checkMenus(tx: Tx): Promise<void> {
  const [check] = await rows<{ def: string }>(
    tx,
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'user_disabled_menus_valid'`,
  );
  const found = quotedValues(check?.def ?? "").sort();
  // 코드의 메뉴 전부 + 옛 통합 키 english(이미 저장된 행이 가질 수 있다)
  const want = [...new Set([...ALL_WORKSPACE_MENUS, "english"])].sort();
  console.log(`  ⑺ 메뉴 CHECK — ${found.join(", ")}`);
  const missing = want.filter((menu) => !found.includes(menu));
  if (missing.length) fail(`메뉴 CHECK 에 빠진 메뉴: ${missing.join(", ")}`);
}

async function revert(): Promise<void> {
  const present = [];
  for (const table of TABLES)
    if (await exists(prisma, table)) present.push(table);
  if (
    !present.length &&
    !(await hasColumn(prisma, "test_problem", "snapshot_id"))
  ) {
    console.log("되돌릴 것이 없다(적용 전).");
    return;
  }
  let total = 0;
  for (const table of present) {
    const [{ n }] = await rows<{ n: number }>(
      prisma,
      `SELECT count(*)::int AS n FROM "${table}"`,
    );
    if (n) console.log(`  ${table} ${n}행`);
    total += n;
  }
  if (present.includes("textbook_edition")) {
    const [{ n }] = await rows<{ n: number }>(
      prisma,
      `SELECT count(*)::int AS n FROM "textbook_edition" WHERE "status" <> 'draft'`,
    );
    if (n > 0)
      fail(
        `발행본이 ${n}개 있다 — 인쇄된 QR 이 그 행에 달려 있다. 되돌리지 않는다.`,
      );
  }
  if (total > 0 && !DROP_ROWS)
    fail("행이 쌓여 있다 — 지워도 되면 --drop-rows 를 같이 준다. 멈춘다.");
  const statements = [
    `DROP TRIGGER IF EXISTS "test_problem_textbook_snapshot_identity" ON "test_problem"`,
    `DROP FUNCTION IF EXISTS "textbook_guard_test_problem_snapshot"()`,
    `ALTER TABLE "test_problem" DROP COLUMN IF EXISTS "snapshot_id"`,
    ...[...TABLES]
      .reverse()
      .map((table) => `DROP TABLE IF EXISTS "${table}" CASCADE`),
    ...(
      await rows<{ proname: string }>(
        prisma,
        `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'textbook\\_%'`,
      )
    ).map((f) => `DROP FUNCTION IF EXISTS "${f.proname}"()`),
    `DELETE FROM "_prisma_migrations" WHERE migration_name IN ('${MIGRATIONS[0]}', '${MIGRATIONS[1]}')`,
  ];
  console.log(
    `되돌리기: ${statements.length}문장 (메뉴 CHECK 는 넓힌 채로 둔다)`,
  );
  if (!APPLY) {
    console.log(
      "드라이런이다. 실제로 되돌리려면 ALLOW_SHARED_IMPORT=1 … --revert --apply.",
    );
    return;
  }
  await prisma.$transaction(
    async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
  console.log("되돌렸다.");
}

async function main() {
  if (REVERT) return await revert();
  const targets = MIGRATIONS.filter((name) => ONLY === null || name === ONLY);
  const pending: Array<{
    name: MigrationName;
    checksum: string;
    statements: string[];
  }> = [];
  for (const name of targets) {
    const raw = readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
    const applied = await rows(
      prisma,
      `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1`,
      name,
    );
    const statements = splitSqlStatements(raw.replaceAll("\r", ""));
    console.log(
      `${name}\n  문장 ${statements.length}개 · 체크섬 ${prismaChecksum(raw)}${applied.length ? " · 이미 적용됨" : ""}`,
    );
    if (!applied.length)
      pending.push({ name, checksum: prismaChecksum(raw), statements });
  }
  if (!pending.length) {
    console.log("적용할 것이 없다(전부 기록돼 있다).");
    return;
  }

  await prisma
    .$transaction(
      async (tx) => {
        // FK 를 걸 때 기존 표에 짧은 잠금이 선다 — 앱이 쓰는 중이면 10초에서 포기한다
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
        const before = await counts(tx);
        for (const migration of pending) {
          console.log(`\n▶ ${migration.name}`);
          await checkPrecondition(tx, migration.name);
          for (const statement of migration.statements)
            await tx.$executeRawUnsafe(statement);
          await tx.$executeRawUnsafe(
            `INSERT INTO "_prisma_migrations"
               (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
             VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
            migration.checksum,
            migration.name,
          );
          console.log("  적용됨. 확인:");
          if (migration.name === MIGRATIONS[0]) await checkStudio(tx);
          else if (migration.name === MIGRATIONS[1])
            await checkSnapshotColumn(tx);
          else await checkMenus(tx);
        }
        const after = await counts(tx);
        console.log(
          `\n  ⑻ 기존 표 행 수 — ${UNCHANGED_TABLES.map((t) => `${t} ${before[t]} → ${after[t]}`).join(" · ")} (같아야 한다)`,
        );
        if (UNCHANGED_TABLES.some((t) => before[t] !== after[t]))
          fail("기존 표의 행 수가 바뀌었다");
        if (!APPLY) throw new DryRun();
      },
      { timeout: 180_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log(
          "\n드라이런이라 **되돌렸다**(ROLLBACK). 실제로 적용하려면:\n" +
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-textbook-studio-migration.ts --apply",
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
