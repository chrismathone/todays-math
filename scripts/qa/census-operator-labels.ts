/**
 * `\text{lcm}` · `\mathrm{tr}` — **라벨 명령 안에 손으로 적은 연산자 이름**을 센다.
 *
 *   npx tsx -r dotenv/config scripts/qa/census-operator-labels.ts
 *
 * 왜 따로 세나: `\lcm` 은 KaTeX 에 **없는 명령**이라(붉게 나간다) 사람이
 * `\text{lcm}`·`\mathrm{lcm}` 으로 피해 적는다. 백슬래시 명령만 세면 그 부류가
 * **구조적으로 0** 이다 — 실제로 `census-wordy-operators` 가 `\text{lcm}(a,b)`
 * 한 자리를 표본 안에서 보여 주고도 세지는 못했다.
 *
 * 무엇이 대상인지 미리 정하지 않는다 — 라벨 인자를 **전부** 세어 빈도순으로 낸다.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BS = String.fromCharCode(92);
// ⚠️ **`String.raw` 없이 백틱에 정규식을 쓰면 `\s` 가 `s` 로 죽는다.** 처음에 그렇게
//    썼고(heredoc 이 역슬래시를 한 겹 먹었다) `\mathrm {cm}` 처럼 **사이에 공백이 있는**
//    꼴을 통째로 못 봤다. `regexTemplateEscape.test.ts` 가 잡아 줬다.
const LABEL = new RegExp(
  BS +
    BS +
    String.raw`(text|mathrm|mathit|operatorname|mbox|rm)\s*\{([^{}]{1,24})\}`,
  "g",
);
const FIELDS = ["content", "answer", "solution"] as const;

async function main() {
  const total = await prisma.problem.count();
  const per = new Map<
    string,
    { n: number; rows: Set<string>; samples: string[] }
  >();
  const PAGE = 2000;
  for (let skip = 0; skip < total; skip += PAGE) {
    const rows = await prisma.problem.findMany({
      select: {
        id: true,
        content: true,
        answer: true,
        solution: true,
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
        for (const m of raw.matchAll(LABEL)) {
          const inner = (m[2] ?? "").trim();
          // 한글·숫자만인 인자는 단위·설명이다 — 연산자 이름 후보가 아니다.
          if (!/^[A-Za-z][A-Za-z0-9]*$/.test(inner)) continue;
          const key = inner;
          let b = per.get(key);
          if (!b) {
            b = { n: 0, rows: new Set(), samples: [] };
            per.set(key, b);
          }
          b.n += 1;
          b.rows.add(row.id);
          if (b.samples.length < 3) {
            const at = m.index ?? 0;
            b.samples.push(
              `${row.problemCode ?? row.id.slice(0, 8)} [${field}] …` +
                raw.slice(Math.max(0, at - 60), at + 90).replace(/\n/g, " ⏎ ") +
                "…",
            );
          }
        }
      }
    }
  }
  console.log(`라벨 인자 ${per.size}종\n`);
  for (const [k, b] of [...per]
    .sort((a, b2) => b2[1].n - a[1].n)
    .slice(0, 80)) {
    console.log(
      `  ${k.padEnd(16)} ${String(b.n).padStart(6)}  행 ${b.rows.size}`,
    );
  }
  console.log(`\n── 연산자처럼 보이는 것(소문자 2~6자) 표본 ──`);
  for (const [k, b] of [...per].sort((a, b2) => b2[1].n - a[1].n)) {
    if (!/^[a-z]{2,6}$/.test(k)) continue;
    console.log(`\n  \…{${k}}  ${b.n}자리 · 행 ${b.rows.size}`);
    for (const s of b.samples) console.log(`      ${s}`);
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
