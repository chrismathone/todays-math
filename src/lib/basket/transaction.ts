import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** All basket writers share this account lock, including clear and issue-and-empty. */
export function basketTransaction<T>(
  userId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`question-basket:${userId}`},0))`,
    );
    return work(tx);
  });
}

export { lockProblemRows as lockQuestionRows } from "@/lib/problem/lockRows";
