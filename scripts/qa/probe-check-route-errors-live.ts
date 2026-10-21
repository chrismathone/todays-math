/** SELECT only, in a verified READ ONLY snapshot — every error_log row of the output re-check route (no user ids). */
import { PrismaClient } from "@prisma/client";
import { readOnly, safeCode } from "../db/problem-actual-format";

async function main() {
  const db = new PrismaClient({ log: [] });
  try {
    const rows = await readOnly(
      db,
      (tx) =>
        tx.$queryRaw<Record<string, unknown>[]>`
        SELECT created_at AS "createdAt", kind, status, left(message, 120) AS message,
               (context->'request'->>'contentLength')::int AS "contentLength", release
        FROM public.error_log
        WHERE route IN ('/api/studio/problems/check', '/api/dev/unified/problems/check')
        ORDER BY created_at ASC`,
    );
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(`PROBE_FAILED ${safeCode(error)}`);
  process.exitCode = 1;
});
