/** Trusted operator maintenance; never exposes media bytes or runs with an implicit URL.
 * LISTENING_DATABASE_URL=<explicit URL> npx tsx scripts/qa/english-listening/cleanup-media.ts
 * Add --apply to expire bounded abandoned uploads and reclaim their staged blobs.
 * Non-local writes require approved ALLOW_SHARED_IMPORT=1. Ready assets are immutable.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaListeningMediaStore } from "@/lib/english/listening/media/prismaStore";
import { createListeningMediaService } from "@/lib/english/listening/media/service";

async function main() {
  const url = process.env.LISTENING_DATABASE_URL;
  if (!url)
    throw new Error("LISTENING_DATABASE_URL must explicitly select a database");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(url).hostname,
  );
  const apply = process.argv.includes("--apply");
  if (apply && !local && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("Shared cleanup requires approved ALLOW_SHARED_IMPORT=1");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const store = new PrismaListeningMediaStore(prisma);
    if (!apply) {
      const rows = await store.listExpired(Date.now(), 25);
      console.log(
        JSON.stringify({
          mode: "read-only",
          expiredCandidates: rows.length,
          limit: 25,
        }),
      );
      return;
    }
    const service = createListeningMediaService({
      store,
      authorize: async () => false,
      resolveScope: async () => null,
    });
    const result = await service.cleanupExpiredUploads(25);
    console.log(JSON.stringify({ mode: "applied", result, limit: 25 }));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Cleanup failed");
  process.exitCode = 1;
});
