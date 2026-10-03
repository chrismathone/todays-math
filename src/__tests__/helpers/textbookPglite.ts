/**
 * 교재 표의 DDL 불변식을 **실제 Postgres 엔진**(PGlite — WASM)에서 재는 하네스.
 *
 * 저장소의 마이그레이션을 **처음부터 전부** 차례로 적용한다 — 교재 마이그레이션이 진짜 사슬 위에 올라가는지,
 * 기존 표(`user` · `problem` · `test_problem` …)의 실제 꼴과 트리거 옆에서 도는지를 같이 본다.
 * 대역 표를 손으로 세우지 않는다(세우면 «내가 지은 꼴»에서만 초록이다).
 *
 * 🔴 PGlite 는 연결이 하나다 — 두 트랜잭션이 같은 줄의 잠금을 다투는 것은 여기서 못 잰다.
 *    여기서 재는 것은 문장이 지나는 **차례**(저장이 끼어든 뒤의 확정 · 확정 뒤의 저장)다.
 *    잠금 경합은 `scripts/qa/textbook-concurrency-check.ts` 가 진짜 Postgres 에서 잰다.
 * 🔴 Supabase 와 같은 판 · 설정이 아니다. «공유 DB 드라이런을 했다»는 뜻이 아니다.
 */
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = path.join(process.cwd(), "prisma", "migrations");

export const TEXTBOOK_TABLES = [
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
] as const;

export const SCHEMA_VERSION = "injaewon.textbook.exchange.v1";
export const C14N_VERSION = "injaewon.textbook.c14n.v1";

export type Db = PGlite;
export const uuid = () => randomUUID();
export const sha256Hex = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
/** 시험마다 다른 64자 해시가 필요할 때 */
export const fakeHash = (seed: string) => sha256Hex(Buffer.from(seed));

/**
 * 변이 하네스(`scripts/qa/textbook-ddl-mutations.ts`)가 여는 문 — 평소에는 닫혀 있다.
 * `replace` 는 교재 마이그레이션의 글을 바꿔 적용하고(가드 한 줄 빼기), `sql` 은 다 적용한 뒤에 돌린다(트리거 떼기).
 * 바꿀 글이 **정확히 한 번** 나오지 않으면 던진다 — 죽은 줄에 건 변이가 «안 물었다»로 읽히지 않게.
 */
interface DdlMutation {
  replace?: Array<[find: string, replacement: string]>;
  sql?: string;
}
function ddlMutation(): DdlMutation | null {
  const raw = process.env.TEXTBOOK_DDL_MUTATION;
  return raw ? (JSON.parse(raw) as DdlMutation) : null;
}

export function migrationDirs(): string[] {
  return readdirSync(MIGRATIONS)
    .filter((name) => !name.endsWith(".toml"))
    .sort();
}

/**
 * 모든 마이그레이션을 차례로 적용한 새 DB.
 * Supabase 처럼 `anon` · `authenticated` 역할을 먼저 만들고 «새 표는 기본으로 다 준다»를 걸어 둔다 —
 * 그래야 마이그레이션의 REVOKE 가 실제로 무엇을 걷는지 보인다(역할이 없으면 REVOKE 가 안 돌아 늘 초록이다).
 */
export async function openTextbookDb(
  options: { until?: string } = {},
): Promise<Db> {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  `);
  const mutation = ddlMutation();
  const pending = new Map(
    (mutation?.replace ?? []).map(([find]) => [find, 0] as [string, number]),
  );
  for (const dir of migrationDirs()) {
    if (options.until && dir > options.until) break;
    let sql = readFileSync(path.join(MIGRATIONS, dir, "migration.sql"), "utf8");
    if (dir.includes("textbook"))
      for (const [find, replacement] of mutation?.replace ?? []) {
        // 줄끝이 CRLF 로 풀린 작업 폴더에서도 같은 글을 찾는다
        sql = sql.replaceAll("\r\n", "\n");
        const hits = sql.split(find).length - 1;
        pending.set(find, pending.get(find)! + hits);
        sql = sql.replaceAll(find, replacement);
      }
    await db.exec(sql);
  }
  for (const [find, hits] of pending)
    if (hits !== 1)
      throw new Error(`변이가 ${hits}곳에 걸렸다(한 곳이어야 한다): ${find}`);
  if (mutation?.sql) await db.exec(mutation.sql);
  return db;
}

/** 거절을 기다린다 — 통과하면 시험이 빨개진다. 돌려주는 것은 오류 글과 SQLSTATE */
export async function rejected(
  run: Promise<unknown>,
): Promise<{ message: string; code: string | undefined }> {
  try {
    await run;
  } catch (error) {
    const e = error as { message?: string; code?: string };
    return { message: String(e.message ?? error), code: e.code };
  }
  throw new Error("거절돼야 하는 문장이 통과했다");
}

const now = () => new Date().toISOString().replace("T", " ").replace("Z", "");

/** 문항 코드 형식(`J2` + 숫자 넷)을 지키는 단원 접두 — 한 DB 안에서 겹치지 않게 센다 */
let unitPrefixCounter = 1000;
const nextUnitPrefix = () => `J2${unitPrefixCounter++}`;

export interface World {
  branchId: string;
  /** 책의 주인 */
  userA: string;
  /** 같은 지점의 다른 교사 */
  userB: string;
  classA: string;
  studentA: string;
  unitId: string;
  /** 출제 자격이 있는 은행 문항 둘 */
  problem1: { id: string; code: string };
  problem2: { id: string; code: string };
}

export async function seedWorld(db: Db): Promise<World> {
  const branchId = uuid();
  const userA = uuid();
  const userB = uuid();
  const classA = uuid();
  const studentA = uuid();
  const unitId = uuid();
  const tag = userA.slice(0, 8);
  await db.query(`INSERT INTO "branch" ("id", "name") VALUES ($1, $2)`, [
    branchId,
    `지점-${tag}`,
  ]);
  for (const [id, name] of [
    [userA, "가"],
    [userB, "나"],
  ] as const)
    await db.query(
      `INSERT INTO "user" ("id", "email", "name", "updated_at") VALUES ($1, $2, $3, $4)`,
      [id, `${id}@example.test`, name, now()],
    );
  await db.query(
    `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "updated_at")
     VALUES ($1, $2, '중2A', '중2', '{}'::jsonb, $3)`,
    [classA, userA, now()],
  );
  await db.query(
    `INSERT INTO "student" ("id", "class_id", "name", "updated_at") VALUES ($1, $2, '학생', $3)`,
    [studentA, classA, now()],
  );
  await db.query(
    `INSERT INTO "unit" ("id", "grade", "chapter", "section", "order_index", "problem_code_prefix")
     VALUES ($1, '중2', '유리수와 순환소수', $2, 1, $3)`,
    [unitId, `순환소수-${tag}`, nextUnitPrefix()],
  );
  const problem1 = await insertProblem(db, unitId);
  const problem2 = await insertProblem(db, unitId);
  return {
    branchId,
    userA,
    userB,
    classA,
    studentA,
    unitId,
    problem1,
    problem2,
  };
}

export async function insertProblem(
  db: Db,
  unitId: string,
): Promise<{ id: string; code: string }> {
  const id = uuid();
  const { rows } = await db.query<{ problem_code: string }>(
    `INSERT INTO "problem" ("id", "unit_id", "source", "difficulty", "problem_type", "content", "answer", "updated_at")
     VALUES ($1, $2, 'manual', '기본', '단답형', '$\\frac{1}{3}$ 을 소수로 나타내시오.', '$0.\\dot{3}$', $3)
     RETURNING "problem_code"`,
    [id, unitId, now()],
  );
  return { id, code: rows[0]!.problem_code };
}

export interface Draft {
  bookId: string;
  editionId: string;
  userId: string;
}

export async function insertBook(
  db: Db,
  userId: string,
  overrides: { editionUserId?: string } = {},
): Promise<Draft> {
  const bookId = uuid();
  const editionId = uuid();
  await db.query(
    `INSERT INTO "textbook" ("id", "user_id", "school_level", "grade", "semester", "volume", "volume_count",
                             "display_code", "title", "updated_at")
     VALUES ($1, $2, 'middle', 2, 1, 1, 2, '2-1-1', '중2-1 개념과 유형', $3)`,
    [bookId, userId, now()],
  );
  await insertEdition(db, {
    bookId,
    editionId,
    userId: overrides.editionUserId ?? userId,
    ordinal: 1,
  });
  return { bookId, editionId, userId };
}

export async function insertEdition(
  db: Db,
  input: { bookId: string; editionId: string; userId: string; ordinal: number },
): Promise<void> {
  await db.query(
    `INSERT INTO "textbook_edition" ("id", "textbook_id", "user_id", "ordinal", "label", "schema_version", "c14n_version",
                                     "config", "outline", "renderer_version", "template_version", "updated_at")
     VALUES ($1, $2, $3, $4, $5, $6, $7, '{}'::jsonb, '{"units": []}'::jsonb, 'r1', 't1', $8)`,
    [
      input.editionId,
      input.bookId,
      input.userId,
      input.ordinal,
      `${input.ordinal}판`,
      SCHEMA_VERSION,
      C14N_VERSION,
      now(),
    ],
  );
}

export async function insertSection(
  db: Db,
  editionId: string,
  keys: { unitKey?: string; sectionKey?: string } = {},
): Promise<string> {
  const id = uuid();
  await db.query(
    `INSERT INTO "textbook_section" ("id", "edition_id", "unit_key", "section_key", "title", "template_key",
                                     "start_policy", "content", "updated_at")
     VALUES ($1, $2, $3, $4, '준비 학습', 'basic', 'even-left', '{"blocks": []}'::jsonb, $5)`,
    [
      id,
      editionId,
      keys.unitKey ?? "u1",
      keys.sectionKey ?? `s-${id.slice(0, 8)}`,
      now(),
    ],
  );
  return id;
}

export interface SnapshotInput {
  userId: string;
  problem: { id: string; code: string } | null;
  /** 은행 문항이 아닌 출처(교재 안에서 쓴 문항) */
  localId?: string;
  payload?: Record<string, unknown>;
  /** 출처 · 메타데이터가 다른 새 캡처를 흉내 낼 때 */
  snapshotSeed?: string;
  sourceRef?: Record<string, unknown>;
  /** `source_system` 칸 — 안 주면 sourceRef 의 system 을 따른다 */
  sourceSystem?: string;
  sourceKey?: string;
  problemId?: string | null;
}

export async function insertSnapshot(
  db: Db,
  input: SnapshotInput,
): Promise<{ id: string; contentHash: string; snapshotHash: string }> {
  const id = uuid();
  const payload = input.payload ?? {
    format: "markdown-latex",
    content: "문제",
    answer: "답",
    solution: null,
    questionType: null,
    figures: [],
  };
  const contentHash = fakeHash(JSON.stringify(payload));
  const system = input.problem ? "todays-math" : "studio-authored";
  const localId = input.localId ?? `local-${id.slice(0, 8)}`;
  const sourceRef =
    input.sourceRef ??
    (input.problem
      ? {
          system,
          problemId: input.problem.id,
          problemCode: input.problem.code,
        }
      : { system, localId });
  const sourceKey =
    input.sourceKey ??
    (input.problem ? `tm:${input.problem.id}` : `studio:${localId}`);
  const snapshotHash = fakeHash(
    `${JSON.stringify(sourceRef)}|${contentHash}|${input.snapshotSeed ?? ""}`,
  );
  const problemId =
    input.problemId === undefined
      ? (input.problem?.id ?? null)
      : input.problemId;
  await db.query(
    `INSERT INTO "textbook_problem_snapshot" ("id", "user_id", "source_system", "source_key", "source_ref", "problem_id",
        "payload", "raw_source", "source_metadata", "content_hash", "snapshot_hash", "c14n_version")
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, '{}'::jsonb, '{}'::jsonb, $8, $9, $10)`,
    [
      id,
      input.userId,
      String(input.sourceSystem ?? sourceRef.system ?? system),
      sourceKey,
      JSON.stringify(sourceRef),
      problemId,
      JSON.stringify(payload),
      contentHash,
      snapshotHash,
      C14N_VERSION,
    ],
  );
  return { id, contentHash, snapshotHash };
}

export async function insertItem(
  db: Db,
  input: {
    editionId: string;
    userId: string;
    snapshotId: string;
    sectionId: string | null;
    linkStatus?: string;
  },
): Promise<string> {
  const id = uuid();
  await db.query(
    `INSERT INTO "textbook_item" ("id", "edition_id", "user_id", "snapshot_id", "link_status", "unit_key", "section_id",
                                  "learning_stage", "layout", "updated_at")
     VALUES ($1, $2, $3, $4, $5, 'u1', $6, 'basic', '{}'::jsonb, $7)`,
    [
      id,
      input.editionId,
      input.userId,
      input.snapshotId,
      input.linkStatus ?? "linked",
      input.sectionId,
      now(),
    ],
  );
  return id;
}

export async function insertConcept(
  db: Db,
  editionId: string,
  input: { conceptKey?: string; sectionId?: string | null } = {},
): Promise<string> {
  const key = input.conceptKey ?? `c-${uuid().slice(0, 8)}`;
  await db.query(
    `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "section_id", "title", "kind", "body",
                                     "mapping_version", "updated_at")
     VALUES ($1, $2, 'u1', $3, '순환소수', '정의', '{}'::jsonb, 'm1', $4)`,
    [editionId, key, input.sectionId ?? null, now()],
  );
  return key;
}

export async function insertBlob(db: Db, bytes: Uint8Array): Promise<string> {
  const sha = sha256Hex(bytes);
  await db.query(
    `INSERT INTO "textbook_blob" ("sha256", "size", "bytes") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [sha, bytes.byteLength, bytes],
  );
  return sha;
}

export async function insertAsset(
  db: Db,
  userId: string,
  bytes: Uint8Array,
): Promise<string> {
  const sha = await insertBlob(db, bytes);
  await db.query(
    `INSERT INTO "textbook_asset" ("user_id", "id", "kind", "mime_type", "name", "width_px", "height_px")
     VALUES ($1, $2, 'figure', 'image/png', '그림.png', 10, 10) ON CONFLICT DO NOTHING`,
    [userId, sha],
  );
  return sha;
}

export async function insertQr(
  db: Db,
  input: { editionId: string; itemId?: string; conceptKey?: string },
  overrides: { state?: string; url?: string; slug?: string } = {},
): Promise<{ id: string; slug: string }> {
  const id = uuid();
  const slug = overrides.slug ?? uuid().replaceAll("-", "").slice(0, 20);
  await db.query(
    `INSERT INTO "textbook_qr_target" ("id", "slug", "url", "kind", "edition_id", "item_id", "concept_key", "state")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      slug,
      overrides.url ?? `https://today.example.test/q/${slug}`,
      input.itemId ? "item" : "concept",
      input.editionId,
      input.itemId ?? null,
      input.conceptKey ?? null,
      overrides.state ?? "reserved",
    ],
  );
  return { id, slug };
}

export async function revisionOf(db: Db, editionId: string): Promise<number> {
  const { rows } = await db.query<{ revision: number }>(
    `SELECT "revision" FROM "textbook_edition" WHERE "id" = $1`,
    [editionId],
  );
  return rows[0]!.revision;
}

export async function statusOf(db: Db, editionId: string): Promise<string> {
  const { rows } = await db.query<{ status: string }>(
    `SELECT "status" FROM "textbook_edition" WHERE "id" = $1`,
    [editionId],
  );
  return rows[0]!.status;
}

export interface DraftWithContent extends Draft {
  sectionId: string;
  snapshotId: string;
  contentHash: string;
  itemId: string;
  conceptKey: string;
  assetId: string;
}

/** 구획 하나 · 연결된 배치 하나 · 개념 하나 · 자산 하나가 든 초안 */
export async function draftWithContent(
  db: Db,
  world: World,
  owner = world.userA,
): Promise<DraftWithContent> {
  const draft = await insertBook(db, owner);
  const sectionId = await insertSection(db, draft.editionId);
  const snapshot = await insertSnapshot(db, {
    userId: owner,
    problem: world.problem1,
    snapshotSeed: draft.editionId,
  });
  const itemId = await insertItem(db, {
    editionId: draft.editionId,
    userId: owner,
    snapshotId: snapshot.id,
    sectionId,
  });
  const conceptKey = await insertConcept(db, draft.editionId, { sectionId });
  const assetId = await insertAsset(
    db,
    owner,
    Buffer.from(`asset-${draft.editionId}`),
  );
  await db.query(
    `INSERT INTO "textbook_edition_asset" ("edition_id", "user_id", "asset_id") VALUES ($1, $2, $3)`,
    [draft.editionId, owner, assetId],
  );
  return {
    ...draft,
    sectionId,
    snapshotId: snapshot.id,
    contentHash: snapshot.contentHash,
    itemId,
    conceptKey,
    assetId,
  };
}

export interface PublishPlan {
  requestId: string;
  baseRevision: number;
  qrId: string;
  stepBlobs: string[];
}

/** 발행 예약 — 요청 기록 · QR 예약 · 조판 걸음 둘(학생용 · 해설). 집계 revision 을 올리지 않는다 */
export async function reservePublish(
  db: Db,
  draft: DraftWithContent,
): Promise<PublishPlan> {
  const requestId = uuid();
  const baseRevision = await revisionOf(db, draft.editionId);
  await db.query(
    `INSERT INTO "textbook_request" ("user_id", "request_id", "operation", "edition_id", "state", "base_revision", "body_hash", "updated_at")
     VALUES ($1, $2, 'publish', $3, 'open', $4, $5, $6)`,
    [
      draft.userId,
      requestId,
      draft.editionId,
      baseRevision,
      fakeHash(requestId),
      now(),
    ],
  );
  const qr = await insertQr(db, {
    editionId: draft.editionId,
    itemId: draft.itemId,
  });
  for (const [idx, view] of ["student", "answers"].entries())
    await db.query(
      `INSERT INTO "textbook_publish_step" ("user_id", "request_id", "idx", "view", "section_ids", "updated_at")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        draft.userId,
        requestId,
        idx,
        view,
        JSON.stringify([draft.sectionId]),
        now(),
      ],
    );
  return { requestId, baseRevision, qrId: qr.id, stepBlobs: [] };
}

/** 서버가 조판 걸음을 끝낸다 — 임대를 잡고, 바이트를 넣고, 결과를 적는다 */
export async function runSteps(
  db: Db,
  draft: DraftWithContent,
  plan: PublishPlan,
): Promise<void> {
  for (const idx of [0, 1]) {
    const token = uuid();
    await db.query(
      `UPDATE "textbook_publish_step" SET "state" = 'running', "attempts" = "attempts" + 1,
              "lease_until" = $4, "lease_token" = $5, "updated_at" = $4
        WHERE "user_id" = $1 AND "request_id" = $2 AND "idx" = $3 AND "state" = 'queued'`,
      [draft.userId, plan.requestId, idx, now(), token],
    );
    const sha = await insertBlob(
      db,
      Buffer.from(`%PDF-step-${plan.requestId}-${idx}`),
    );
    plan.stepBlobs.push(sha);
    await db.query(
      `UPDATE "textbook_publish_step" SET "state" = 'done', "sha256" = $4, "page_count" = 2, "first_page_index" = $5,
              "result" = '{"diagnostics": []}'::jsonb, "updated_at" = $6
        WHERE "user_id" = $1 AND "request_id" = $2 AND "idx" = $3 AND "state" = 'running' AND "lease_token" = $7`,
      [draft.userId, plan.requestId, idx, sha, 1 + idx * 2, now(), token],
    );
  }
}

export type FinalizeSkip =
  "pages" | "qr" | "concept" | "artifacts" | "flip" | "request";

/**
 * 발행 확정의 문장들 — 자식을 먼저 쓰고 상태를 **마지막에** 바꾼다. 한 트랜잭션이다.
 * `skip` 으로 한 걸음을 빼면 «그 걸음 없이 발행됨으로 뒤집기»가 된다.
 */
export async function finalizePublish(
  db: Db,
  draft: DraftWithContent,
  plan: PublishPlan,
  skip: FinalizeSkip[] = [],
): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await tx.query<{ revision: number; status: string }>(
      `SELECT "revision", "status" FROM "textbook_edition" WHERE "id" = $1 FOR UPDATE`,
      [draft.editionId],
    );
    if (
      locked.rows[0]!.status !== "draft" ||
      locked.rows[0]!.revision !== plan.baseRevision
    )
      throw new Error("REVISION_MISMATCH");
    if (!skip.includes("pages"))
      await tx.query(
        `UPDATE "textbook_item" SET "display_number" = '1', "physical_page_index" = 3, "printed_page_label" = '3',
                "page_column" = 1, "updated_at" = $2 WHERE "edition_id" = $1 AND "section_id" IS NOT NULL`,
        [draft.editionId, now()],
      );
    if (!skip.includes("qr"))
      await tx.query(
        `UPDATE "textbook_qr_target" SET "state" = 'active', "activated_at" = $2 WHERE "id" = $1`,
        [plan.qrId, now()],
      );
    if (!skip.includes("concept"))
      await tx.query(
        `UPDATE "textbook_concept" SET "frozen" = $2::jsonb, "updated_at" = $3 WHERE "edition_id" = $1`,
        [
          draft.editionId,
          JSON.stringify({
            contentHash: fakeHash(`frozen-${draft.editionId}`),
          }),
          now(),
        ],
      );
    if (!skip.includes("artifacts")) {
      const kinds = [
        ["student-pdf", "application/pdf", plan.stepBlobs[0]!],
        ["answer-pdf", "application/pdf", plan.stepBlobs[1]!],
        [
          "exchange-json",
          "application/json",
          await insertBlobTx(
            tx,
            Buffer.from(`{"edition":"${draft.editionId}"}`),
          ),
        ],
      ] as const;
      for (const [kind, mime, sha] of kinds)
        await tx.query(
          `INSERT INTO "textbook_artifact" ("id", "edition_id", "kind", "mime_type", "sha256", "byte_size", "page_count")
           VALUES ($1, $2, $3, $4, $5, 10, 2)`,
          [uuid(), draft.editionId, kind, mime, sha],
        );
    }
    if (!skip.includes("flip"))
      await tx.query(
        `UPDATE "textbook_edition" SET "status" = 'published', "published_at" = $2, "manifest_hash" = $3, "updated_at" = $2
          WHERE "id" = $1 AND "status" = 'draft'`,
        [draft.editionId, now(), fakeHash(`manifest-${draft.editionId}`)],
      );
    if (!skip.includes("request") && !skip.includes("flip"))
      await tx.query(
        `UPDATE "textbook_request" SET "state" = 'done', "result" = '{"published": true}'::jsonb, "updated_at" = $3
          WHERE "user_id" = $1 AND "request_id" = $2`,
        [draft.userId, plan.requestId, now()],
      );
  });
}

async function insertBlobTx(
  tx: { query: Db["query"] },
  bytes: Uint8Array,
): Promise<string> {
  const sha = sha256Hex(bytes);
  await tx.query(
    `INSERT INTO "textbook_blob" ("sha256", "size", "bytes") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [sha, bytes.byteLength, bytes],
  );
  return sha;
}

/** 초안을 만들고 정식 절차로 발행한다 */
export async function publishedEdition(
  db: Db,
  world: World,
  owner = world.userA,
): Promise<DraftWithContent & { plan: PublishPlan }> {
  const draft = await draftWithContent(db, world, owner);
  const plan = await reservePublish(db, draft);
  await runSteps(db, draft, plan);
  await finalizePublish(db, draft, plan);
  return { ...draft, plan };
}

export { now as sqlNow };
