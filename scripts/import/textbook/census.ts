/**
 * 문제은행에 실린 교과서 문항을 센다 (D-161 · 2026-10-07).
 *
 *   npx tsx --env-file=.env scripts/import/textbook/census.ts            # 표를 찍는다
 *   npx tsx --env-file=.env scripts/import/textbook/census.ts --json     # JSON 으로
 *
 * 읽기만 한다. 적재(`load-school-textbook.ts`) 뒤에 «들어간 것»을 DB 에서 다시 세어 계획(`load/plan.json`)과 견주려고 있다 —
 * 계획은 «넣으려던 것»이고 이것은 «들어가 있는 것»이다.
 *
 * 끝의 «어긋남»은 0 이어야 한다:
 *   - 교과서 문항인데 자료(`source_material_id`)가 없는 행 — CHECK 가 막지 않는다(자료 없는 교과서 문항은 허용 꼴이다)
 *   - 정답이 빈 행 · 승인되지 않은 행 · 격리된 행
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = Record<string, string | number | bigint | null>;

async function rows(sql: string): Promise<Row[]> {
  return prisma.$queryRawUnsafe<Row[]>(sql);
}

const plain = (list: Row[]): Record<string, number> =>
  Object.fromEntries(
    list.map((row) => [String(row.k ?? "(없음)"), Number(row.n)]),
  );

const FROM = `
  FROM problem p
  JOIN unit u ON u.id = p.unit_id
  LEFT JOIN source_material m ON m.id = p.source_material_id
  LEFT JOIN source_book b ON b.id = m.book_id
  WHERE p.source = 'school_textbook'`;

async function main(): Promise<void> {
  const by = async (
    expr: string,
    order = "n DESC",
  ): Promise<Record<string, number>> =>
    plain(
      await rows(
        `SELECT ${expr} AS k, count(*) AS n ${FROM} GROUP BY 1 ORDER BY ${order}`,
      ),
    );

  const census = {
    출처별_전체: plain(
      await rows(
        `SELECT source::text AS k, count(*) AS n FROM problem GROUP BY 1 ORDER BY n DESC`,
      ),
    ),
    책: Number((await rows(`SELECT count(*) AS n FROM source_book`))[0].n),
    자료: Number(
      (await rows(`SELECT count(*) AS n FROM source_material`))[0].n,
    ),
    문항이_붙은_자료: Number(
      (
        await rows(`SELECT count(DISTINCT p.source_material_id) AS n ${FROM}`)
      )[0].n,
    ),
    출판사: await by("b.publisher"),
    과목: await by("u.grade"),
    학기: await by("coalesce(u.semester::text, '정해지지 않음')", "1"),
    자료_종류: await by("m.kind"),
    난이도: await by("p.difficulty::text"),
    문항_형식: await by("coalesce(p.question_type, '(없음)')"),
    유형: await by("p.problem_type"),
    해설의_출처: await by("p.solution_source::text"),
    출판사별_과목: plain(
      await rows(
        `SELECT b.publisher || ' · ' || u.grade AS k, count(*) AS n ${FROM} GROUP BY 1 ORDER BY 1`,
      ),
    ),
    어긋남: {
      자료_없음: Number(
        (
          await rows(
            `SELECT count(*) AS n ${FROM} AND p.source_material_id IS NULL`,
          )
        )[0].n,
      ),
      정답_빔: Number(
        (await rows(`SELECT count(*) AS n ${FROM} AND btrim(p.answer) = ''`))[0]
          .n,
      ),
      승인_아님: Number(
        (
          await rows(
            `SELECT count(*) AS n ${FROM} AND p.review_status::text <> 'approved'`,
          )
        )[0].n,
      ),
      공용_아님: Number(
        (
          await rows(
            `SELECT count(*) AS n ${FROM} AND p.pool::text <> 'shared'`,
          )
        )[0].n,
      ),
      바로_못_씀: Number(
        (
          await rows(
            `SELECT count(*) AS n ${FROM} AND NOT p.direct_use_allowed`,
          )
        )[0].n,
      ),
      그림이_붙음: Number(
        (
          await rows(
            `SELECT count(*) AS n ${FROM} AND (p.figure_svg IS NOT NULL OR cardinality(p.figure_urls) > 0)`,
          )
        )[0].n,
      ),
    },
  };

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(census, null, 1));
    return;
  }
  for (const [title, value] of Object.entries(census)) {
    if (typeof value === "number") {
      console.log(`${title}: ${value}`);
      continue;
    }
    console.log(`\n${title}`);
    for (const [key, count] of Object.entries(value))
      console.log(`  ${String(count).padStart(7)}  ${key}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
