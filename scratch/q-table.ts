import { db } from "@/lib/db";
async function main() {
  const n = await db.problem.count({
    where: { content: { contains: "|---" } },
  });
  const m = await db.problem.count({
    where: { content: { contains: "| --- |" } },
  });
  console.log(`본문에 마크다운 표 구분줄: ${n + m}행`);
  const s = await db.problem.findFirst({
    where: {
      OR: [
        { content: { contains: "|---" } },
        { content: { contains: "| --- |" } },
      ],
    },
    select: { problemCode: true, content: true },
  });
  if (s)
    console.log(s.problemCode, s.content.slice(0, 200).replace(/\n/g, "⏎"));
  await db.$disconnect();
}
main();
