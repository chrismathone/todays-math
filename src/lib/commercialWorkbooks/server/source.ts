import "server-only";
import { db } from "@/lib/db";
import { createCommercialWorkbookSource } from "../service";
import type { WorkbookRun } from "../store";
import { createWorkbookPolicy } from "./policy";
import { createSqlWorkbookStore } from "./store";

export function createServerCommercialWorkbookSource(actorId: string) {
  const run: WorkbookRun = (write, work) =>
    db.$transaction(
      async (tx) => {
        // Every mutation is actor-owned. Serialize conflicting saves and request receipts before reads.
        if (write)
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actorId}, 231023))::text`;
        return work({
          actorId,
          store: createSqlWorkbookStore(tx, actorId),
          policy: createWorkbookPolicy(tx, actorId),
          now: () => new Date().toISOString(),
          newId: () => crypto.randomUUID(),
        });
      },
      { maxWait: 10000, timeout: 30000 },
    );
  return createCommercialWorkbookSource(run);
}
