import { db } from "@/lib/db";
import { problemVisibleWhere } from "@/lib/problemPool";
// 라우트의 searchWhere 를 **그대로** 옮겨 돌린다(src/app/api/problems/route.ts — 코드가 아닌 검색어).
const searchWhere = (q: string) => ({
  OR: [
    { content: { contains: q, mode: "insensitive" as const } },
    { problemCode: { contains: q, mode: "insensitive" as const } },
    { answer: { contains: q, mode: "insensitive" as const } },
    { solution: { contains: q, mode: "insensitive" as const } },
    { school: { contains: q, mode: "insensitive" as const } },
  ],
});
async function main() {
  for (const q of ["정화중", "동도중", "강동중", "경산여중", "정화"]) {
    const where = { AND: [problemVisibleWhere(), searchWhere(q)] };
    const total = await db.problem.count({ where });
    const bySchool = await db.problem.count({
      where: { AND: [problemVisibleWhere(), { school: { contains: q } }] },
    });
    const others = await db.problem.findMany({
      where: { AND: [where, { NOT: { school: { contains: q } } }] },
      select: { problemCode: true, school: true },
      take: 3,
    });
    console.log(
      `「${q}」 검색 → ${total}건 (그중 학교 칸으로 걸린 것 ${bySchool}) · 학교 아닌 데서 걸린 것 ${total - bySchool}${others.length ? " 예: " + others.map((o) => o.problemCode).join(", ") : ""}`,
    );
  }
  await db.$disconnect();
}
main();
