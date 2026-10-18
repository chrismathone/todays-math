import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { hydrateTestSnapshots } from "@/lib/tests/loadSnapshotAssets";

/** 호출자가 발행본·반·학생 권한을 검사한 뒤 쓴다. 낸 그대로의 글과 고정 자산은 기존 읽기 경로에서 얻는다. */
export async function loadExamReportProblems(
  testId: string,
  client: Prisma.TransactionClient = db,
) {
  const rows = await client.testProblem.findMany({
    where: { testId },
    include: { problem: { include: { unit: true } }, snapshot: true },
    orderBy: { orderIndex: "asc" },
  });
  return hydrateTestSnapshots(rows, client);
}
