import { db } from "@/lib/db";
const SECTIONS = [
  "삼각비의 뜻",
  "삼각비의 값",
  "삼각비의 활용",
  "원과 현",
  "원의 접선",
  "원주각",
  "원주각의 활용",
  "대푯값과 산포도",
  "산점도와 상관관계",
  "상자그림",
];
async function main() {
  for (const section of SECTIONS) {
    const unit = await db.unit.findFirst({
      where: { grade: "중3", section },
      select: { id: true },
    });
    const keys = await db.problem.findMany({
      where: { unitId: unit!.id },
      select: { familyKey: true, source: true },
      distinct: ["familyKey"],
    });
    const prefixes = [
      ...new Set(
        keys.map((k) => k.familyKey!.split("|").slice(0, 2).join("|")),
      ),
    ];
    const e = keys
      .filter((k) => /\|E\d{2}$/.test(k.familyKey!))
      .map((k) => `${k.familyKey}(${k.source})`);
    console.log(
      `${section}: 접두 ${prefixes.join(" · ")} · E류 ${e.join(", ") || "없음"}`,
    );
  }
  await db.$disconnect();
}
main();
