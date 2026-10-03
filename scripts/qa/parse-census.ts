/**
 * 은행 **전수**의 본문 파싱 지문 — 읽기만 한다. 파서(`parseProblemContent`)를 고치기 전후에 한 번씩 떠서 견준다.
 *
 *   npx tsx --env-file=<.env> scripts/qa/parse-census.ts dump <out.json>
 *   npx tsx scripts/qa/parse-census.ts compare <앞.json> <뒤.json>
 *
 * ## 왜 있나 (2026-10-03 3자 합의 B3)
 *
 * 파서는 은행 10만 행의 모든 렌더 경로가 지난다. 규칙 하나를 더하면 «성한 문항의 발문이 보기로 잘리는»
 * 반대쪽 개악이 날 수 있다(2026-08 R2 를 넣을 때 세 번 고쳤다). 단위 시험은 **내가 떠올린 꼴**만 본다 —
 * 그래서 고치기 전의 지문을 전수로 떠 두고, 고친 뒤 **바뀐 행이 0** 인지 본다.
 * 0 이 아니면 적용하지 않고 달라진 행을 읽는다.
 *
 * 작업트리마다 제 파서를 쓴다(이 파일이 있는 작업트리의 `src/lib/problem/parseProblemContent.ts`).
 * «앞»은 고치기 전 작업트리에서, «뒤»는 고친 작업트리에서 뜬다.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { parseProblemContentLabeled } from "../../src/lib/problem/parseProblemContent";

type Census = Record<string, { hash: string; choices: number }>;

async function dump(out: string): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const result: Census = {};
  let cursor: string | undefined;
  for (;;) {
    const rows = await db.problem.findMany({
      select: { id: true, content: true },
      orderBy: { id: "asc" },
      take: 5000,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (rows.length === 0) break;
    for (const row of rows) {
      const parsed = parseProblemContentLabeled(row.content);
      result[row.id] = {
        hash: createHash("sha1")
          .update(
            JSON.stringify([parsed.question, parsed.choices, parsed.labels]),
          )
          .digest("hex")
          .slice(0, 16),
        choices: parsed.choices.length,
      };
    }
    cursor = rows[rows.length - 1]!.id;
  }
  writeFileSync(out, JSON.stringify(result));
  console.log(`행 ${Object.keys(result).length} → ${out}`);
  await db.$disconnect();
}

function compare(beforePath: string, afterPath: string): void {
  const before = JSON.parse(readFileSync(beforePath, "utf8")) as Census;
  const after = JSON.parse(readFileSync(afterPath, "utf8")) as Census;
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  const onlyOne: string[] = [];
  const spread = (census: Census): string => {
    const counts = new Map<number, number>();
    for (const v of Object.values(census))
      counts.set(v.choices, (counts.get(v.choices) ?? 0) + 1);
    return [...counts]
      .sort((a, b) => a[0] - b[0])
      .map(([n, c]) => `${n}개 ${c}`)
      .join(" · ");
  };
  for (const id of ids) {
    const b = before[id];
    const a = after[id];
    if (!b || !a) onlyOne.push(id);
    else if (b.hash !== a.hash) changed.push(id);
  }
  console.log(
    `앞 ${Object.keys(before).length}행 · 뒤 ${Object.keys(after).length}행`,
  );
  console.log(`보기 개수 분포 — 앞: ${spread(before)}`);
  console.log(`보기 개수 분포 — 뒤: ${spread(after)}`);
  console.log(
    `한쪽에만 있는 행 ${onlyOne.length} · 파싱이 바뀐 행 ${changed.length}`,
  );
  for (const id of changed.slice(0, 40)) console.log(`   ${id}`);
  if (changed.length > 0 || onlyOne.length > 0) process.exitCode = 1;
}

const [mode, a, b] = process.argv.slice(2);
if (mode === "dump" && a) void dump(a);
else if (mode === "compare" && a && b) compare(a, b);
else throw new Error("사용: dump <out.json> | compare <앞.json> <뒤.json>");
