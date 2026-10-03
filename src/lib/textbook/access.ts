/**
 * 교재의 범위 판정 — **한 곳**이다. 책 · 판본 · 구획 · 배치 · 확정본 · 자산 · 영상은 전부 주인 계정의 것이다.
 *
 * 🔴 지점 관리자도 남의 책을 넘겨다보지 않는다 — 여기에는 `isAdmin` 을 읽는 줄이 없다(학원 운영 데이터의
 *    `ownedRowsWhere` 와 다른 부류다. 개인 자료 D-130).
 * 🔴 지점 공유는 책 단위로 주인이 켠다. 동료가 읽는 것은 **발행본뿐**이고, 세 겹이 다 참이어야 한다:
 *    ⑴ 책이 그 지점에 공유돼 있다 ⑵ 보는 사람이 **지금** 그 지점이다 ⑶ 주인도 **지금** 그 지점의 살아 있는 승인 계정이다.
 *    주인이 지점을 떠나거나 정지되면 공유가 그 순간 닫힌다(칸을 고쳐 쓰지 않아도).
 * 없는 것과 남의 것은 같은 404 다 — 남의 책이 있는지를 id 로 떠 보지 못하게.
 *
 * 이 파일은 세션을 읽지 않는다(`server/authorize.ts` 가 읽는다). 받는 것은 이미 확인된 `TextbookActor` 다.
 */
import { notDraft, notFound } from "./server/errors";
import { type TextbookSql, isoColumn } from "./server/sql";

export interface TextbookActor {
  id: string;
  name: string;
  /** **지금** DB 에 적힌 지점 — 세션에 실려 온 값이 아니다 */
  branchId: string | null;
}

export interface EditionAccessRow {
  editionId: string;
  bookId: string;
  ownerId: string;
  ownerName: string;
  status: "draft" | "published" | "retired";
  revision: number;
  structureRevision: number;
  label: string;
  ordinal: number;
  publishedAt: string | null;
  manifestHash: string | null;
  visibility: "private" | "branch";
  sharedBranchId: string | null;
  ownerBranchId: string | null;
  ownerActive: boolean;
}

export type ReadScope = "owner" | "shared";

/** 이 사람이 이 판본을 읽을 수 있는가 — 읽을 수 없으면 null */
export function editionReadScope(
  actor: TextbookActor,
  row: Pick<
    EditionAccessRow,
    | "ownerId"
    | "status"
    | "visibility"
    | "sharedBranchId"
    | "ownerBranchId"
    | "ownerActive"
  >,
): ReadScope | null {
  if (row.ownerId === actor.id) return "owner";
  if (row.status !== "published") return null;
  if (row.visibility !== "branch" || row.sharedBranchId === null) return null;
  if (actor.branchId === null || actor.branchId !== row.sharedBranchId)
    return null;
  if (!row.ownerActive || row.ownerBranchId !== row.sharedBranchId) return null;
  return "shared";
}

const EDITION_ACCESS_SQL = `
  SELECT e."id" AS "editionId", e."textbook_id" AS "bookId", t."user_id" AS "ownerId", o."name" AS "ownerName",
         e."status", e."revision", e."structure_revision" AS "structureRevision", e."label", e."ordinal",
         ${isoColumn(`e."published_at"`)} AS "publishedAt", e."manifest_hash" AS "manifestHash",
         t."visibility", t."shared_branch_id" AS "sharedBranchId", o."branch_id" AS "ownerBranchId",
         (o."deleted_at" IS NULL AND o."suspended_at" IS NULL AND o."approval_status" = 'approved') AS "ownerActive"
    FROM "textbook_edition" e
    JOIN "textbook" t ON t."id" = e."textbook_id"
    JOIN "user" o ON o."id" = t."user_id"
   WHERE e."id" = $1::uuid`;

async function loadEdition(
  sql: TextbookSql,
  editionId: string,
  lock: boolean,
): Promise<EditionAccessRow | null> {
  // 잠글 때는 판본 행만 잠근다 — 책 · 계정 행까지 잡으면 서로 다른 판본의 저장이 줄을 선다
  const rows = await sql.query<EditionAccessRow>(
    `${EDITION_ACCESS_SQL}${lock ? ` FOR NO KEY UPDATE OF e` : ""}`,
    [editionId],
  );
  return rows[0] ?? null;
}

/** 읽기 — 주인은 어느 상태든, 동료는 공유된 발행본만 */
export async function requireReadableEdition(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
): Promise<EditionAccessRow & { scope: ReadScope }> {
  const row = await loadEdition(sql, editionId, false);
  const scope = row ? editionReadScope(actor, row) : null;
  if (!row || !scope) throw notFound("판본");
  return { ...row, scope };
}

/** 주인만 — 상태는 묻지 않는다(발행본의 배정 · 내보내기 · 재출제 준비) */
export async function requireOwnedEdition(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  options: { lock?: boolean } = {},
): Promise<EditionAccessRow> {
  const row = await loadEdition(sql, editionId, options.lock === true);
  if (!row || row.ownerId !== actor.id) throw notFound("판본");
  return row;
}

/**
 * 쓰기 — 주인이고 초안이어야 한다. 트랜잭션 안에서 부르면 판본 행을 잠근다:
 * 같은 판본의 저장과 발행 확정이 한 줄로 선다(트리거도 같은 잠금을 잡는다).
 */
export async function requireOwnedDraft(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
): Promise<EditionAccessRow> {
  const row = await requireOwnedEdition(sql, actor, editionId, { lock: true });
  if (row.status !== "draft") throw notDraft();
  return row;
}

/** 통합 쪽이 부르는 이름 — 같은 함수다 */
export const loadReadableEdition = requireReadableEdition;
export const loadOwnedDraftEdition = requireOwnedDraft;

export interface BookAccessRow {
  bookId: string;
  ownerId: string;
  visibility: "private" | "branch";
  sharedBranchId: string | null;
  archivedAt: string | null;
}

/** 책 — 주인만 고친다 */
export async function requireOwnedBook(
  sql: TextbookSql,
  actor: TextbookActor,
  bookId: string,
  options: { lock?: boolean } = {},
): Promise<BookAccessRow> {
  const rows = await sql.query<BookAccessRow>(
    `SELECT t."id" AS "bookId", t."user_id" AS "ownerId", t."visibility", t."shared_branch_id" AS "sharedBranchId",
            ${isoColumn(`t."archived_at"`)} AS "archivedAt"
       FROM "textbook" t WHERE t."id" = $1::uuid${options.lock ? " FOR UPDATE" : ""}`,
    [bookId],
  );
  const row = rows[0];
  if (!row || row.ownerId !== actor.id) throw notFound("교재");
  return row;
}

/**
 * 판본 한 줄을 이 사람이 읽을 수 있는가 — `editionReadScope` 와 **같은 판정**의 SQL 꼴이다
 * (여러 판본을 한 번에 거르는 조회가 줄마다 묻지 않게). 둘을 따로 고치지 않는다 — 한쪽을 고치면 다른 쪽도 고친다.
 * 별칭: `e` 판본 · `t` 책 · `o` 주인 계정. 인자: 보는 사람 · 그 사람의 **지금** 지점(없으면 NULL — 뒤 갈래가 통째로 거짓이다).
 */
export const readableEditionSql = (actor: string, branch: string): string => `(
  t."user_id" = ${actor}::uuid
  OR (
    e."status" = 'published'
    AND t."visibility" = 'branch' AND t."shared_branch_id" IS NOT NULL
    AND t."shared_branch_id" = ${branch}::uuid
    AND t."shared_branch_id" = o."branch_id"
    AND o."approval_status" = 'approved' AND o."deleted_at" IS NULL AND o."suspended_at" IS NULL
  )
)`;

/**
 * 목록의 범위 — 내 책 전부 + 지금 내 지점에 공유된 남의 책(발행본이 있는 것만).
 * `$1` 은 보는 사람, `$2` 는 그 사람의 지금 지점(없으면 NULL — 그러면 뒤 갈래가 통째로 거짓이다).
 */
export const READABLE_BOOKS_WHERE = `(
  t."user_id" = $1::uuid
  OR (
    t."visibility" = 'branch'
    AND t."shared_branch_id" = $2::uuid
    AND o."branch_id" = t."shared_branch_id"
    AND o."deleted_at" IS NULL AND o."suspended_at" IS NULL AND o."approval_status" = 'approved'
    AND EXISTS (SELECT 1 FROM "textbook_edition" p WHERE p."textbook_id" = t."id" AND p."status" = 'published')
  )
)`;
