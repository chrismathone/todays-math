import type { SqlParam, TextbookDb, TextbookSql } from "./sql";

/** Prisma 클라이언트(또는 그 트랜잭션)에서 이 문이 쓰는 것 — 원시 질의 둘 */
export interface RawSqlClient {
  $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<number>;
}
export interface RawSqlRoot extends RawSqlClient {
  $transaction: <T>(
    run: (tx: RawSqlClient) => Promise<T>,
    options?: { timeout?: number; maxWait?: number },
  ) => Promise<T>;
}

/** Uint8Array 는 Buffer 로 — Prisma 는 Buffer 만 bytea 로 보낸다 */
const toDriver = (value: SqlParam): unknown =>
  value instanceof Uint8Array && !Buffer.isBuffer(value)
    ? Buffer.from(value.buffer, value.byteOffset, value.byteLength)
    : value;

function wrap(client: RawSqlClient): TextbookSql {
  return {
    query: async <T>(text: string, params: readonly SqlParam[] = []) =>
      (await client.$queryRawUnsafe(text, ...params.map(toDriver))) as T[],
    execute: (text, params = []) =>
      client.$executeRawUnsafe(text, ...params.map(toDriver)),
  };
}

/**
 * Prisma 클라이언트를 교재의 SQL 문으로 감싼다.
 * 트랜잭션 한도: 담기 · 발행 확정이 여러 문장을 한 번에 쓰고 바이트를 넣는 문장도 있어 기본 5초로는 모자란다.
 * 한도를 넘으면 Prisma 가 되돌린다 — 반쯤 쓴 상태가 남지 않는다.
 *
 * 제품은 `prismaSql.ts` 가 앱의 연결 풀로 이것을 만든다. 격리된 Postgres 에서 경합을 재는 스크립트
 * (`scripts/qa/textbook-concurrency-check.ts`)도 같은 함수로 만든다 — 제품과 같은 길을 잰다.
 */
export function prismaTextbookDb(client: RawSqlRoot): TextbookDb {
  return {
    ...wrap(client),
    transaction: (run) =>
      client.$transaction((tx) => run(wrap(tx)), {
        timeout: 60_000,
        maxWait: 10_000,
      }),
  };
}
