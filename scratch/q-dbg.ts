import { PrismaClient } from "@prisma/client";
async function main() {
  const p = new PrismaClient();
  const r = await p.$queryRaw<Record<string, unknown>[]>`
    SELECT p.problem_code, p.source, p.review_status, p.family_key AS 내키,
           o.problem_code AS 원본, o.family_key AS 원본키
    FROM "problem" p LEFT JOIN "problem" o ON o.id = p.origin_problem_id
    WHERE p.source = 'transformed' ORDER BY p.problem_code LIMIT 10`;
  for (const x of r)
    console.log(
      `${x.problem_code} ${x.review_status} 내키=${String(x.내키).slice(0, 20)} 원본=${x.원본} 원본키=${String(x.원본키).slice(0, 26)}`,
    );
  await p.$disconnect();
}
main();
