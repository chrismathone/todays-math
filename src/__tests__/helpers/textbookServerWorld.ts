/**
 * 교재 서버 코드를 PGlite(실제 Postgres 엔진 · 저장소의 마이그레이션 사슬 전부) 위에서 돌리는 하네스.
 *
 * 제품은 `TextbookDb` 를 Prisma 로 채우고(`server/prismaSql.ts`), 시험은 여기서 PGlite 로 채운다 —
 * **도는 SQL 은 글자까지 같다.** 손으로 지은 메모리 대역이 아니라서 트리거 · 복합 FK · 부분 유일 색인이 같이 돈다.
 * 🔴 PGlite 는 연결이 하나다. 두 요청이 잠금을 다투는 경합은 `scripts/qa/textbook-concurrency-check.ts` 가 잰다.
 */
import { randomUUID } from "node:crypto";

import type { TextbookConfig } from "@/contracts/textbookExchange.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import type { RequestKey } from "@/lib/textbook/server/requests";
import type {
  SqlParam,
  TextbookDb,
  TextbookSql,
} from "@/lib/textbook/server/sql";

import { type Db, fakeHash, sqlNow } from "./textbookPglite";

type Queryable = Pick<Db, "query">;

function wrap(target: Queryable): TextbookSql {
  return {
    query: async <T>(text: string, params: readonly SqlParam[] = []) =>
      (await target.query<T>(text, [...params])).rows,
    execute: async (text, params = []) =>
      (await target.query(text, [...params])).affectedRows ?? 0,
  };
}

export function pgliteTextbookDb(db: Db): TextbookDb {
  return {
    ...wrap(db),
    transaction: (run) => db.transaction((tx) => run(wrap(tx as Queryable))),
  };
}

/** 지점에 속한 승인된 교사 한 명 */
export async function insertTeacher(
  db: Db,
  input: { branchId?: string | null; name?: string } = {},
): Promise<TextbookActor> {
  const id = randomUUID();
  await db.query(
    `INSERT INTO "user" ("id", "email", "name", "branch_id", "approval_status", "updated_at")
     VALUES ($1, $2, $3, $4, 'approved', $5)`,
    [
      id,
      `${id}@example.test`,
      input.name ?? "교사",
      input.branchId ?? null,
      sqlNow(),
    ],
  );
  return { id, name: input.name ?? "교사", branchId: input.branchId ?? null };
}

export async function insertBranch(db: Db): Promise<string> {
  const id = randomUUID();
  await db.query(`INSERT INTO "branch" ("id", "name") VALUES ($1, $2)`, [
    id,
    `지점-${id.slice(0, 8)}`,
  ]);
  return id;
}

/** 요청 열쇠 — 시험마다 새 requestId. `body` 가 같으면 본문 해시도 같다 */
export function requestKey(
  actor: TextbookActor,
  operation: string,
  body: unknown = {},
  requestId: string = randomUUID(),
  editionId: string | null = null,
): RequestKey {
  return {
    userId: actor.id,
    requestId,
    operation,
    bodyHash: fakeHash(JSON.stringify(body)),
    editionId,
  };
}

export const sampleConfig = (
  overrides: Partial<TextbookConfig> = {},
): TextbookConfig => ({
  bookId: "placeholder",
  schoolLevel: "middle",
  grade: 2,
  semester: 1,
  volume: 1,
  volumeCount: 2,
  displayCode: "2-1-1",
  title: "중2-1 개념과 유형",
  curriculumVersion: "2022",
  mode: "integrated",
  pageBudget: { target: 260, tolerance: 8, strict: false },
  print: {
    paper: "A4",
    innerMarginMm: 20,
    outerMarginMm: 15,
    sectionStart: "even-left",
    coverMode: "separate",
    firstPhysicalPageIndex: 1,
  },
  videoPolicy: "optional",
  ...overrides,
});
