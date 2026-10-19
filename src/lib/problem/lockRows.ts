import { Prisma } from "@prisma/client";

/** Keep selected actual payloads stable through validation and the corresponding write. */
export async function lockProblemRows(
  tx: Prisma.TransactionClient,
  ids: readonly string[],
): Promise<void> {
  const sorted = [...new Set(ids)].sort();
  if (!sorted.length) return;
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM public.problem WHERE id IN (${Prisma.join(sorted)}) ORDER BY id FOR SHARE`,
  );
}
