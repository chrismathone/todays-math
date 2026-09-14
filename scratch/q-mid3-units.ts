import { db } from "@/lib/db";
async function main() {
  const units = await db.unit.findMany({
    where: { grade: "중3" },
    orderBy: { orderIndex: "asc" },
    select: { id: true, chapter: true, section: true, orderIndex: true },
  });
  console.log(`중3 소단원 ${units.length}개`);
  for (const u of units)
    console.log(`  ${u.orderIndex} · ${u.chapter} › ${u.section}`);
  await db.$disconnect();
}
main().catch((e) => {
  console.error(String(e).slice(0, 300));
  process.exit(1);
});
