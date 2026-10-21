/** SELECT only, in a verified READ ONLY snapshot — today's error_log rows (no user ids, no images). */
import { PrismaClient } from "@prisma/client";
import { readOnly, safeCode } from "../db/problem-actual-format";

const since = process.argv[2] ?? "2026-10-20T15:00:00Z"; // 2026-10-21 00:00 KST

async function main() {
  const db = new PrismaClient({ log: [] });
  try {
    const rows = await readOnly(
      db,
      (tx) =>
        tx.$queryRaw<Record<string, unknown>[]>`
        SELECT created_at AS "createdAt", source, kind, route, method, status, action,
               left(message, 300) AS message, left(detail, 1500) AS detail,
               left(context::text, 1500) AS context, release, request_id AS "requestId", duration_ms AS "durationMs"
        FROM public.error_log
        WHERE created_at >= ${since}::timestamptz
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
