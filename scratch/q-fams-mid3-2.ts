// 중3-2 중간 범위 소단원마다 **살아 있는 문항류 키**를 그대로 본다 — 기출 분류(units) 를 적기 전에.
//   npx tsx scratch/q-fams-mid3-2.ts
//
// 🔴 `source: past_exam` 을 빼지 않는다. 적재기(load-exam-paper.ts assertFamilies)의 `live` 집합은
//    그 소단원의 **모든** 문항에서 familyKey 를 모은다(출처를 안 가린다). 여기서 기출을 빼면 내가 보는
//    집합이 적재기가 보는 집합보다 좁아져서, 이미 있는 키를 «새 류»로 착각하고 E 번호를 딴다.
// 읽기만 한다 — 공유 DB 에 한 줄도 안 쓴다.
import { db } from "@/lib/db";

const SECTIONS = [
  "삼각비의 뜻",
  "삼각비의 값",
  "삼각비의 활용",
  "원과 현",
  "원의 접선",
  "원주각",
  "원주각의 활용",
];

async function main() {
  for (const section of SECTIONS) {
    const unit = await db.unit.findFirst({
      where: { grade: "중3", section },
      select: { id: true, chapter: true },
    });
    if (!unit) {
      console.log(`🔴 ${section}: 단원 트리에 없다 — 이름이 틀렸다`);
      continue;
    }
    const fams = await db.problem.groupBy({
      by: ["familyKey"],
      where: { unitId: unit.id },
      _count: { _all: true },
      orderBy: { familyKey: "asc" },
    });
    console.log(`\n── ${section} (${unit.chapter}) · 문항류 ${fams.length}`);
    for (const f of fams) {
      if (!f.familyKey) continue;
      const s = await db.problem.findFirst({
        where: { unitId: unit.id, familyKey: f.familyKey },
        select: { content: true, source: true },
      });
      const key = f.familyKey.split("|").slice(1).join("|");
      console.log(
        `  ${key.padEnd(26)} ${String(f._count._all).padStart(3)}개 [${s?.source ?? "?"}] ` +
          `${s?.content.replace(/\s+/g, " ").slice(0, 58)}`,
      );
    }
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(String(e).slice(0, 300));
  process.exit(1);
});
