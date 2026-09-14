import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const shared = { pool: "shared" as const };
  const [total, approved, pending, rejected, locked, lockedApproved, noAnswer] =
    await Promise.all([
      db.problem.count({ where: shared }),
      db.problem.count({ where: { ...shared, reviewStatus: "approved" } }),
      db.problem.count({ where: { ...shared, reviewStatus: "pending" } }),
      db.problem.count({ where: { ...shared, reviewStatus: "rejected" } }),
      db.problem.count({ where: { ...shared, directUseAllowed: false } }),
      db.problem.count({
        where: { ...shared, directUseAllowed: false, reviewStatus: "approved" },
      }),
      db.problem.count({ where: { ...shared, answer: "(정답 없음)" } }),
    ]);
  console.log(
    JSON.stringify({
      total,
      approved,
      pending,
      rejected,
      locked,
      lockedApproved,
      noAnswer,
    }),
  );
  const units = await db.unit.count();
  const grades = await db.unit.findMany({
    distinct: ["grade"],
    select: { grade: true },
    orderBy: { orderIndex: "asc" },
  });
  console.log(JSON.stringify({ units, grades: grades.map((g) => g.grade) }));
}
main().finally(() => db.$disconnect());
