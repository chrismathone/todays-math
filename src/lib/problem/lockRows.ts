import { Prisma } from "@prisma/client";

/**
 * Keep selected actual payloads stable through validation and the corresponding write.
 * `problem.id` is uuid — text parameters fail with «operator does not exist: uuid = text»
 * (운영 2026-10-20: 시험지 저장 PUT 이 전부 500).
 */
export async function lockProblemRows(
  tx: Prisma.TransactionClient,
  ids: readonly string[],
): Promise<void> {
  const sorted = [...new Set(ids)].sort();
  if (!sorted.length) return;
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM public.problem WHERE id IN (${Prisma.join(
      sorted.map((id) => Prisma.sql`${id}::uuid`),
    )}) ORDER BY id FOR SHARE`,
  );
}
