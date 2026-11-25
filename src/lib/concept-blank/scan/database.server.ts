import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { scanDatabaseError, type ScanDatabase, type ScanSql } from "./database";

function bind(
  client: Pick<Prisma.TransactionClient, "$queryRawUnsafe">,
): ScanSql {
  return {
    query: <T extends object>(sql: string, values: readonly unknown[] = []) =>
      client.$queryRawUnsafe<T[]>(sql, ...values).catch(scanDatabaseError),
  };
}

/** Only the SQL text is owned by code; all IDs, JSON and user text use parameters.
 * Never hold a transaction open while rendering a PDF, uploading, or calling AI. */
export const scanDatabase: ScanDatabase = {
  ...bind(db),
  transaction: (run) =>
    db
      .$transaction((tx) => run(bind(tx)), {
        maxWait: 5_000,
        timeout: 10_000,
      })
      .catch(scanDatabaseError),
};
