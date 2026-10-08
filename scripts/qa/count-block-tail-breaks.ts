/**
 * 수식 블록 바로 뒤의 홑 줄바꿈 — 지면이 바뀌는 행을 센다 (2026-10-08).
 *
 *   npx tsx --env-file=<.env> scripts/qa/count-block-tail-breaks.ts          # 수만
 *   npx tsx --env-file=<.env> scripts/qa/count-block-tail-breaks.ts --list   # 문항 번호까지
 *
 * `applyHardBreaks` 는 `$$…$$` 블록 뒤 조각이 줄바꿈으로 시작하면 하드 브레이크를 못 붙였다(행렬 · 연립식으로 끝나는 줄이
 * 다음 줄과 붙었다). 고친 뒤의 전처리 결과에서 «블록 닫는 `$$` + 공백 둘 + 줄바꿈»을 되돌린 글이 옛 결과다 —
 * 둘이 다르면 그 칸의 지면이 «줄이 갈리는 쪽»으로 움직인다. 읽기만 한다.
 *
 * 🔴 세는 것은 «전처리 결과가 달라지는 칸»이다. 저자가 직접 `$$` 뒤에 공백 둘을 쓴 줄은 같이 세인다(지금 0 — 아래 «원문에 이미»).
 */
import { PrismaClient } from "@prisma/client";

import { preprocessMarkdown } from "../../src/lib/math/markdownPreprocess";

const prisma = new PrismaClient();
const NEW_BREAK = /\$\$ {2}\n/g;

async function main(): Promise<void> {
  const rows = await prisma.problem.findMany({
    where: {
      OR: [{ content: { contains: "\n" } }, { solution: { contains: "\n" } }],
    },
    select: {
      problemCode: true,
      source: true,
      directUseAllowed: true,
      content: true,
      answer: true,
      solution: true,
      unit: { select: { grade: true } },
    },
  });
  let changedRows = 0;
  let already = 0;
  const byField: Record<string, number> = {};
  const byGrade: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const list: string[] = [];
  for (const row of rows) {
    const hit: string[] = [];
    for (const field of ["content", "answer", "solution"] as const) {
      const text = row[field];
      if (!text || !text.includes("\n")) continue;
      if (/\$\$ {2}\n/.test(text)) already += 1;
      if (NEW_BREAK.test(preprocessMarkdown(text))) hit.push(field);
      NEW_BREAK.lastIndex = 0;
    }
    if (hit.length === 0) continue;
    changedRows += 1;
    for (const field of hit) byField[field] = (byField[field] ?? 0) + 1;
    byGrade[row.unit.grade] = (byGrade[row.unit.grade] ?? 0) + 1;
    bySource[row.source] = (bySource[row.source] ?? 0) + 1;
    list.push(
      `${row.problemCode}\t${row.source}\t${row.directUseAllowed ? "출제 가능" : "잠금"}\t${hit.join(",")}`,
    );
  }
  console.log(
    JSON.stringify(
      {
        줄바꿈이_있는_행: rows.length,
        지면이_바뀌는_행: changedRows,
        칸: byField,
        과목: byGrade,
        출처: bySource,
        원문에_이미_공백_둘: already,
      },
      null,
      1,
    ),
  );
  if (process.argv.includes("--list")) console.log(list.sort().join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
