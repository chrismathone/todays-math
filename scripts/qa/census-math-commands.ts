/**
 * 수식 안의 **영문 명령을 전부** 훑어 빈도순으로 늘어놓는다.
 *
 *   npx tsx -r dotenv/config scripts/qa/census-math-commands.ts
 *   npx tsx -r dotenv/config scripts/qa/census-math-commands.ts --samples --limit=200
 *   npx tsx -r dotenv/config scripts/qa/census-math-commands.ts --json=out.json
 *
 * ## 왜 또 하나 만드나
 *
 * 원장님이 짚은 것은 해설의 `\min(a,3)=2` 다. 이것은
 *   · KaTeX 가 **초록**이고(정상 LaTeX),
 *   · 값도 **맞고**(수학적으로 옳다),
 *   · 우리 잔재 계량기는 백슬래시 명령을 **일부러 뺀다**.
 * 그래서 「지면이 옳게 보이나」를 셀 축이 이 저장소에 없었다. 이 계량기가 그 축이다.
 *
 * **무엇이 대상인지 미리 정하지 않는다.** 손 목록을 쓰면 세는 쪽과 고치는 쪽이
 * 같이 눈이 먼다(2026-08-18). 전부 세어 놓고 목록을 보고 고른다.
 *
 * 수식 **밖**의 `\min` 도 따로 센다 — 거기서는 렌더도 안 되므로 더 나쁘다.
 */
import { writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import { tokenizeMath } from "../../src/lib/math/segments";
import {
  decodeHtmlEntities,
  preprocessMathText,
} from "../../src/lib/math/textPreprocess";
import { mathCommands } from "./mathCommandCensus";

const prisma = new PrismaClient();

const FIELDS = ["content", "answer", "solution"] as const;
type Field = (typeof FIELDS)[number];

interface Bucket {
  count: number;
  rows: Set<string>;
  byField: Record<Field, number>;
  samples: string[];
}

const emptyByField = (): Record<Field, number> => ({
  content: 0,
  answer: 0,
  solution: 0,
});

function bump(
  map: Map<string, Bucket>,
  key: string,
  id: string,
  field: Field,
  sample: string,
) {
  let b = map.get(key);
  if (!b) {
    b = { count: 0, rows: new Set(), byField: emptyByField(), samples: [] };
    map.set(key, b);
  }
  b.count += 1;
  b.rows.add(id);
  b.byField[field] += 1;
  if (b.samples.length < 6)
    b.samples.push(`${id.slice(0, 8)} ${field}  ${sample}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const wantSamples = argv.includes("--samples");
  const jsonOut = argv.find((a) => a.startsWith("--json="))?.slice(7);
  const limit = Number(
    argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? "250",
  );

  const total = await prisma.problem.count();
  console.log(`문항 ${total.toLocaleString()}건 — 수식 안 명령 전수\n`);

  const inMath = new Map<string, Bucket>();
  const outMath = new Map<string, Bucket>();

  let spans = 0;
  let scanned = 0;
  let preprocessFailures = 0;

  const PAGE = 2000;
  for (let skip = 0; skip < total; skip += PAGE) {
    const rows = await prisma.problem.findMany({
      select: { id: true, content: true, answer: true, solution: true },
      orderBy: { id: "asc" },
      skip,
      take: PAGE,
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      for (const field of FIELDS) {
        const raw = (row[field] ?? "") as string;
        if (!raw) continue;
        let pre: string;
        try {
          pre = preprocessMathText(decodeHtmlEntities(raw));
        } catch {
          preprocessFailures += 1;
          continue;
        }
        for (const seg of tokenizeMath(pre)) {
          const target = seg.type === "text" ? outMath : inMath;
          if (seg.type !== "text") spans += 1;
          const expr = seg.value;
          const cut = expr.trim().slice(0, 130);
          for (const { name } of mathCommands(expr)) {
            bump(target, name, row.id, field, cut);
          }
        }
      }
    }
    if (skip % 10000 === 0 && skip > 0)
      console.log(`  … ${skip.toLocaleString()}건`);
  }

  console.log(
    `\n스캔 ${scanned.toLocaleString()}건 · 수식 span ${spans.toLocaleString()}`,
  );
  if (preprocessFailures)
    console.log(`⚠️ 전처리 예외 ${preprocessFailures}건 — 화면도 못 그린다`);

  const table = (map: Map<string, Bucket>, n: number) =>
    [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, n)
      .map(([key, b]) => ({
        key,
        count: b.count,
        rows: b.rows.size,
        byField: b.byField,
        samples: b.samples,
      }));

  const dump = (title: string, map: Map<string, Bucket>, n: number) => {
    console.log(`\n── ${title} — 서로 다른 이름 ${map.size}종 (상위 ${n}) ──`);
    for (const r of table(map, n)) {
      console.log(
        `  ${r.key.padEnd(26)} ${String(r.count).padStart(7)}  행 ${String(r.rows).padStart(6)}` +
          `   본문 ${r.byField.content} · 정답 ${r.byField.answer} · 해설 ${r.byField.solution}`,
      );
      if (wantSamples) for (const s of r.samples) console.log(`        ${s}`);
    }
  };

  dump("수식 안 명령", inMath, limit);
  dump("수식 **밖** 명령 — 렌더도 안 된다", outMath, 60);

  if (jsonOut) {
    writeFileSync(
      jsonOut,
      JSON.stringify(
        {
          scanned,
          spans,
          inMath: table(inMath, 100000),
          outMath: table(outMath, 100000),
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\n→ ${jsonOut}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
