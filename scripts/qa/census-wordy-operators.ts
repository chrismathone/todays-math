/**
 * 「말 대신 기호」 후보 — **연산자 이름 명령**을 갈래별로 세고 표본을 보인다.
 *
 *   npx tsx -r dotenv/config scripts/qa/census-wordy-operators.ts
 *   npx tsx -r dotenv/config scripts/qa/census-wordy-operators.ts --json=…
 *
 * ⚠️ 이 목록은 **census-math-commands 의 174종을 보고** 고른 것이다.
 *    손으로 지은 목록이 아니라 **전수에서 추린** 목록이라는 뜻이다.
 *    새 명령이 들어오면 census 를 다시 돌려 이 목록을 갱신할 것.
 */
import { writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import { WORDY_OPERATOR_NAMES, wordyOperatorHits } from "./wordyOperator";

const prisma = new PrismaClient();
const FIELDS = ["content", "answer", "solution"] as const;

interface Hit {
  name: string;
  field: string;
  id: string;
  code: string | null;
  source: string;
  familyKey: string | null;
  around: string;
}

async function main() {
  const jsonOut = process.argv.find((a) => a.startsWith("--json="))?.slice(7);
  const total = await prisma.problem.count();
  console.log(
    `문항 ${total.toLocaleString()}건 — 연산자 이름 명령 ${WORDY_OPERATOR_NAMES.length}종 전수\n`,
  );

  const hits: Hit[] = [];
  const PAGE = 2000;
  for (let skip = 0; skip < total; skip += PAGE) {
    const rows = await prisma.problem.findMany({
      select: {
        id: true,
        content: true,
        answer: true,
        solution: true,
        source: true,
        familyKey: true,
        problemCode: true,
      },
      orderBy: { id: "asc" },
      skip,
      take: PAGE,
    });
    if (rows.length === 0) break;
    for (const row of rows) {
      for (const field of FIELDS) {
        const raw = (row[field] ?? "") as string;
        if (!raw) continue;
        for (const hit of wordyOperatorHits(raw)) {
          hits.push({
            name: hit.name,
            field,
            id: row.id,
            code: row.problemCode,
            source: row.source,
            familyKey: row.familyKey,
            around: raw
              .slice(Math.max(0, hit.index - 90), hit.index + 130)
              .replace(/\n/g, " ⏎ "),
          });
        }
      }
    }
  }

  const byName = new Map<string, Hit[]>();
  for (const h of hits) byName.set(h.name, [...(byName.get(h.name) ?? []), h]);

  for (const [name, arr] of [...byName].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    const rows = new Set(arr.map((h) => h.id));
    const bySource = new Map<string, number>();
    const byField = new Map<string, number>();
    for (const h of arr) {
      bySource.set(h.source, (bySource.get(h.source) ?? 0) + 1);
      byField.set(h.field, (byField.get(h.field) ?? 0) + 1);
    }
    console.log(
      `\n=== ${name}   ${arr.length}자리 · ${rows.size}행` +
        `   [${[...bySource].map(([k, v]) => `${k} ${v}`).join(" · ")}]` +
        `   {${[...byField].map(([k, v]) => `${k} ${v}`).join(" · ")}}`,
    );
    const seen = new Set<string>();
    let shown = 0;
    for (const h of arr) {
      const key = `${h.familyKey ?? h.id}|${h.field}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(
        `  [${h.field}] ${h.code ?? h.id.slice(0, 8)}  ${h.source}  fam=${h.familyKey ?? "-"}`,
      );
      console.log(`      …${h.around}…`);
      if (++shown >= 14) break;
    }
    if (seen.size > shown)
      console.log(`  … 서로 다른 무리 ${seen.size}종 중 ${shown}종만 표시`);
  }

  const totalRows = new Set(hits.map((h) => h.id)).size;
  console.log(
    `\n합계: ${hits.length}자리 · ${totalRows}행 (전체의 ${((totalRows * 100) / total).toFixed(3)}%)`,
  );

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify({ total, hits }, null, 2), "utf8");
    console.log(`→ ${jsonOut}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
