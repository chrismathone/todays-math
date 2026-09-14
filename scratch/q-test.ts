import { db } from "@/lib/db";
async function main() {
  const tests = await db.test.findMany({
    where: { status: { in: ["confirmed", "printed"] } },
    include: {
      class: { include: { students: true } },
      _count: { select: { testProblems: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  for (const t of tests) {
    console.log(
      `${t.id.slice(0, 8)} · ${t.testType} · ${t.testDate.toISOString().slice(0, 10)} · ${t.class?.name ?? "(반없음)"} · 학생 ${t.class?.students.length ?? 0} · 문항 ${t._count.testProblems} · ${t.status}`,
    );
  }
  await db.$disconnect();
}
main();
