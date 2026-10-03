/**
 * 요청 멱등 — 같은 `requestId` 는 한 번만 만든다.
 *
 * 한 트랜잭션 안의 차례:
 *   ⑴ 요청 줄을 넣는다(`ON CONFLICT DO NOTHING`). 같은 id 로 지금 돌고 있는 다른 요청이 있으면 여기서 그 끝을 기다린다.
 *   ⑵ 못 넣었으면 있던 줄을 읽는다 — 연산이나 본문 해시가 다르면 409(같은 id 를 다른 내용에 다시 썼다),
 *      끝난 요청이면 **그때의 결과를 그대로** 돌려준다(`replayed: true`). 일을 다시 하지 않는다.
 *   ⑶ 넣었으면 일을 하고, 결과를 같은 줄에 적는다.
 * 일이 던지면 줄까지 같이 되돌아간다 — 실패한 요청은 같은 id 로 다시 보낼 수 있다.
 *
 * 본문 해시는 **검증을 통과한 본문**의 정규 JSON 해시다(`canonicalHash`). 키 순서가 달라도 같은 요청이다.
 * 열쇠는 (계정, requestId) — 남의 id 를 맞혀도 남의 결과를 받지 못한다.
 */
import { conflict } from "./errors";
import { type TextbookSql, SQL_NOW } from "./sql";

export interface RequestKey {
  userId: string;
  requestId: string;
  operation: string;
  /** 검증된 본문(과 경로 인자)의 정규 해시 */
  bodyHash: string;
  editionId?: string | null;
}

export type Idempotent<T> = { result: T; replayed: boolean };

export async function runOnce<T>(
  tx: TextbookSql,
  key: RequestKey,
  work: () => Promise<T>,
): Promise<Idempotent<T>> {
  const inserted = await tx.execute(
    `INSERT INTO "textbook_request" ("user_id", "request_id", "operation", "edition_id", "state", "body_hash", "updated_at")
     VALUES ($1::uuid, $2::uuid, $3::text, $4::uuid, 'open', $5::text, ${SQL_NOW})
     ON CONFLICT ("user_id", "request_id") DO NOTHING`,
    [
      key.userId,
      key.requestId,
      key.operation,
      key.editionId ?? null,
      key.bodyHash,
    ],
  );
  if (inserted === 0) {
    const [existing] = await tx.query<{
      operation: string;
      bodyHash: string;
      state: string;
      result: T | null;
    }>(
      `SELECT "operation", "body_hash" AS "bodyHash", "state", "result" FROM "textbook_request"
        WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid`,
      [key.userId, key.requestId],
    );
    if (
      !existing ||
      existing.operation !== key.operation ||
      existing.bodyHash !== key.bodyHash
    )
      throw conflict(
        "같은 요청 번호가 다른 내용에 쓰였습니다. 새로 고친 뒤 다시 시도해 주세요.",
      );
    if (existing.state !== "done" || existing.result === null)
      throw conflict(
        "같은 요청이 아직 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.",
      );
    return { result: existing.result, replayed: true };
  }
  const result = await work();
  await tx.execute(
    `UPDATE "textbook_request" SET "state" = 'done', "result" = $3::jsonb, "updated_at" = ${SQL_NOW}
      WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid`,
    [key.userId, key.requestId, JSON.stringify(result)],
  );
  return { result, replayed: false };
}
