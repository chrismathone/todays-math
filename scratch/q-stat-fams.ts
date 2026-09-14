import { db } from "@/lib/db";
async function main() {
  for (const section of ["대푯값과 산포도"]) {
    const unit = await db.unit.findFirst({
      where: { grade: "중3", section },
      select: { id: true },
    });
    const fams = await db.problem.groupBy({
      by: ["familyKey"],
      where: { unitId: unit!.id, source: { not: "past_exam" } },
      orderBy: { familyKey: "asc" },
    });
    for (const f of fams) {
      const s = await db.problem.findMany({
        where: { unitId: unit!.id, familyKey: f.familyKey },
        select: { content: true, answer: true },
        take: 2,
      });
      console.log(`\n■ ${f.familyKey}`);
      for (const x of s)
        console.log(
          `  · ${x.content.replace(/\s+/g, " ").slice(0, 190)}  ⇒ ${x.answer.slice(0, 30)}`,
        );
    }
  }
  await db.$disconnect();
}
main();
