import { db } from "../src/lib/db";
async function main() {
  const [p, r, a, locked] = await Promise.all([
    db.problem.count({ where: { reviewStatus: "pending" } }),
    db.problem.count({ where: { reviewStatus: "rejected" } }),
    db.problem.count({ where: { reviewStatus: "approved" } }),
    db.problem.count({ where: { directUseAllowed: false } }),
  ]);
  console.log(
    `pending ${p} · rejected ${r} · approved ${a} · 출제잠김 ${locked}`,
  );
  await db.$disconnect();
}
void main();
