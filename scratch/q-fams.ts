import { db } from "@/lib/db";
const SECTIONS = ["대푯값과 산포도", "산점도와 상관관계", "상자그림"];
async function main() {
  for (const section of SECTIONS) {
    const unit = await db.unit.findFirst({
      where: { grade: "중3", section },
      select: { id: true },
    });
    if (!unit) {
      console.log(`🔴 ${section}: 트리에 없다`);
      continue;
    }
    const fams = await db.problem.groupBy({
      by: ["familyKey"],
      where: { unitId: unit.id, source: { not: "past_exam" } },
      _count: { _all: true },
      orderBy: { familyKey: "asc" },
    });
    console.log(`\n── ${section} · 문항류 ${fams.length}`);
    for (const f of fams) {
      const s = await db.problem.findFirst({
        where: { unitId: unit.id, familyKey: f.familyKey },
        select: { content: true },
      });
      console.log(
        `  ${f.familyKey?.split("|").slice(1).join("|")} (${f._count._all}) ${s?.content.replace(/\s+/g, " ").slice(0, 70)}`,
      );
    }
  }
  await db.$disconnect();
}
main();
