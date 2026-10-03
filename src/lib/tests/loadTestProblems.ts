import { db } from "@/lib/db";
import { serializeFrozenTestProblemItem } from "./testProblemContent";
import { hydrateTestSnapshots } from "./loadSnapshotAssets";

export async function loadTestProblemItems(testId: string) {
  const rows = await db.testProblem.findMany({
    where: { testId },
    include: { problem: true, snapshot: true },
    orderBy: { orderIndex: "asc" },
  });
  return (await hydrateTestSnapshots(rows)).map(serializeFrozenTestProblemItem);
}
