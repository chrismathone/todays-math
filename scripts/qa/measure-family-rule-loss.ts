/**
 * **「같은 문항류 1개」 규칙을 켜면 무엇을 잃는가** — 파괴적 변경 앞의 손실 계량 (D-20).
 *
 *   npx tsx --env-file=.env scripts/qa/measure-family-rule-loss.ts
 *   npx tsx --env-file=.env scripts/qa/measure-family-rule-loss.ts --count 8 --json
 *
 * ## 무엇을 재나
 *
 * 일일테스트는 **한 소단원**에서 뽑는다. 그래서 소단원마다 이렇게 갈린다.
 *
 * | | 오늘 | 규칙을 켜면 |
 * |---|---|---|
 * | 낼 수 있는 최대 문항 수 | **행 수** | **갈래 수** |
 *
 * `generateDraftTest` 는 정원을 못 채우면 **422 `INSUFFICIENT_PROBLEMS`** 로 막는다
 * (짧은 시험지를 만들지 않는다). 그러므로 `행 >= 정원` 인데 `갈래 < 정원` 인 소단원은
 * **오늘 되던 출제가 내일 막힌다.** 그 건수가 이 자가 내는 값이다.
 *
 * ⚠️ **건수만 보면 그럴듯해 보인다.** 이 저장소가 2026-08-18 에 겪은 자리다 —
 *    「43건을 빼라」가 433건이 됐는데 건수만으로는 아무도 못 봤고, **무엇을 잃는지
 *    세어서야** 드러났다. 그래서 여기서는 학년별 분포까지 같이 찍는다.
 *
 * ## 이 자가 못 보는 것
 *
 * - **확인테스트**는 여러 단원을 묶으므로 갈래가 합쳐진다 — 여기서 세지 않는다.
 *   이 수는 **일일테스트 기준의 상한**이다.
 * - 난이도 배분을 만족하는지는 안 본다. 갈래가 8이어도 요청 배분(연산2·기본2·응용2·심화2)
 *   으로는 못 고를 수 있다. 즉 **실제 손실은 이 수보다 크거나 같다.**
 * - D-20(최근 14일)은 안 건다. 실측에서 갈래를 줄인 소단원이 0곳이었다.
 *
 * DB 는 **SELECT 만** 한다.
 */
import { PrismaClient } from "@prisma/client";

interface Row {
  unit_id: string;
  grade: string;
  section: string;
  eligible_rows: bigint;
  families: bigint;
}

function parseArgs(argv: string[]) {
  let count = 8;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--count") count = Number(argv[++i]);
    else if (argv[i] === "--json") json = true;
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("--count 는 1 이상의 정수여야 한다.");
  }
  return { count, json };
}

async function main() {
  const { count, json } = parseArgs(process.argv.slice(2));
  const db = new PrismaClient();
  try {
    // 출제 자격은 `eligibleProblemsWhere` 와 같은 조건이다. 갈래는 DB 복합키와 같이
    // (unit_id, family_key) 로 세고, 키가 없는 행은 **각자 혼자**(problem id)로 센다.
    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT u.id                                        AS unit_id,
             u.grade                                     AS grade,
             u.section                                   AS section,
             COUNT(p.id)                                 AS eligible_rows,
             COUNT(DISTINCT COALESCE(
               NULLIF(BTRIM(p.family_key), ''),
               'solo:' || p.id::text
             ))                                          AS families
        FROM "unit" u
        JOIN "problem" p
          ON p."unit_id" = u.id
         AND p."pool" = 'shared'
         AND p."review_status" = 'approved'
         AND p."direct_use_allowed" = true
         AND p."answer" <> '(정답 없음)'
       GROUP BY u.id, u.grade, u.section
    `);

    const withRows = rows.map((r) => ({
      unitId: r.unit_id,
      grade: r.grade,
      section: r.section,
      rows: Number(r.eligible_rows),
      families: Number(r.families),
    }));

    const okToday = withRows.filter((r) => r.rows >= count);
    const okAfter = withRows.filter((r) => r.families >= count);
    const lost = withRows.filter((r) => r.rows >= count && r.families < count);

    // 반의 정원 분포 — 이 수가 실제로 원장님이 겪는 값인지 확인한다.
    const classes = await db.$queryRawUnsafe<
      { default_problem_count: number; n: bigint }[]
    >(`SELECT "default_problem_count", COUNT(*) AS n
         FROM "class" GROUP BY "default_problem_count" ORDER BY 1`);

    const byGrade = new Map<string, number>();
    for (const r of lost) byGrade.set(r.grade, (byGrade.get(r.grade) ?? 0) + 1);

    const report = {
      count,
      unitsWithAnyEligible: withRows.length,
      okToday: okToday.length,
      okAfterRule: okAfter.length,
      lostUnits: lost.length,
      lostByGrade: Object.fromEntries(
        [...byGrade.entries()].sort((a, b) => b[1] - a[1]),
      ),
      classCounts: classes.map((c) => ({
        defaultProblemCount: c.default_problem_count,
        classes: Number(c.n),
      })),
      worst: [...lost]
        .sort((a, b) => a.families - b.families || b.rows - a.rows)
        .slice(0, 15)
        .map((r) => ({
          grade: r.grade,
          section: r.section,
          rows: r.rows,
          families: r.families,
        })),
    };

    if (json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(`정원 ${count}문항 기준 · 일일테스트(한 소단원)`);
    console.log(
      `  출제 가능 문항이 하나라도 있는 소단원 : ${report.unitsWithAnyEligible}`,
    );
    console.log(`  오늘 정원을 채울 수 있는 소단원        : ${report.okToday}`);
    console.log(
      `  규칙을 켜도 채울 수 있는 소단원        : ${report.okAfterRule}`,
    );
    console.log(
      `  🔴 오늘 되던 출제가 막히는 소단원      : ${report.lostUnits}`,
    );
    console.log("\n학년별 손실");
    for (const [g, n] of Object.entries(report.lostByGrade)) {
      console.log(`  ${g.padEnd(8)} ${n}`);
    }
    console.log("\n반 정원 분포");
    for (const c of report.classCounts) {
      console.log(`  ${c.defaultProblemCount}문항 : ${c.classes}개 반`);
    }
    console.log("\n가장 얇은 곳 (갈래 적은 순)");
    for (const w of report.worst) {
      console.log(
        `  ${w.grade.padEnd(6)} ${w.section.slice(0, 34).padEnd(36)} 행 ${String(w.rows).padStart(4)} · 갈래 ${w.families}`,
      );
    }
  } finally {
    await db.$disconnect();
  }
}

void main();
