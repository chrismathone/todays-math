import { PrismaClient } from "@prisma/client";
async function main() {
  const p = new PrismaClient();
  const r = await p.$queryRaw<Record<string, unknown>[]>`
    SELECT problem_code, family_key, source, origin_problem_id IS NOT NULL AS origin있음,
           review_status, question_type, left(content, 60) AS 발문
    FROM "problem" WHERE source='ai_generated' ORDER BY problem_code`;
  console.log(`AI 변형본 ${r.length}건:`);
  for (const x of r)
    console.log(
      `  ${x.problem_code}  family=${x.family_key}  origin=${x.origin있음}  ${x.review_status}  ${x.question_type}`,
    );
  // 코드 중복이 있나 (전량)
  const dup = await p.$queryRaw<Record<string, unknown>[]>`
    SELECT problem_code, COUNT(*)::int AS n FROM "problem"
    GROUP BY 1 HAVING COUNT(*) > 1 ORDER BY 2 DESC LIMIT 5`;
  console.log("\n중복된 문항 번호:", dup.length === 0 ? "없음 ✓" : dup);
  const nullc = await p.$queryRaw<
    Record<string, unknown>[]
  >`SELECT COUNT(*)::int AS n FROM "problem" WHERE problem_code IS NULL`;
  console.log("번호 없는 문항:", nullc[0].n);
  await p.$disconnect();
}
main();
