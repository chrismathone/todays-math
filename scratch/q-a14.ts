import { PrismaClient } from "@prisma/client";
async function main() {
  const p = new PrismaClient();
  const r = await p.$queryRaw<Record<string, unknown>[]>`
    SELECT problem_code, source, family_key, origin_problem_id, review_status
    FROM "problem" WHERE problem_code LIKE 'J10101-A1%' ORDER BY problem_code`;
  for (const x of r)
    console.log(
      `${x.problem_code}  source=${x.source}  origin=${x.origin_problem_id ? "있음" : "없음"}  family=${String(x.family_key).slice(0, 24)}  ${x.review_status}`,
    );
  await p.$disconnect();
}
main();
