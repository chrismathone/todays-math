import "server-only";

import { db } from "@/lib/db";

import type { SqlParam, TextbookDb, TextbookSql } from "./sql";

type RawClient = {
  $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<number>;
};

/** Uint8Array 는 Buffer 로 — Prisma 는 Buffer 만 bytea 로 보낸다 */
const toDriver = (value: SqlParam): unknown =>
  value instanceof Uint8Array && !Buffer.isBuffer(value)
    ? Buffer.from(value.buffer, value.byteOffset, value.byteLength)
    : value;

function wrap(client: RawClient): TextbookSql {
  return {
    query: async <T>(text: string, params: readonly SqlParam[] = []) =>
      (await client.$queryRawUnsafe(text, ...params.map(toDriver))) as T[],
    execute: (text, params = []) =>
      client.$executeRawUnsafe(text, ...params.map(toDriver)),
  };
}

/**
 * 제품이 쓰는 문 — 앱의 Prisma 연결 풀을 그대로 쓴다.
 * 트랜잭션 한도: 담기 · 발행 확정이 여러 문장을 한 번에 쓴다(기본 5초로는 모자란다). 바이트를 넣는 문장이 있어
 * 넉넉히 잡되, 한도를 넘으면 Prisma 가 되돌린다 — 반쯤 쓴 상태가 남지 않는다.
 */
export const textbookDb: TextbookDb = {
  ...wrap(db as unknown as RawClient),
  transaction: (run) =>
    db.$transaction((tx) => run(wrap(tx as unknown as RawClient)), {
      timeout: 60_000,
      maxWait: 10_000,
    }),
};
