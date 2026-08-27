/**
 * **살아남은 문제은행이 성한가** — 옛 말뭉치 삭제 전후를 대조한다.
 *
 *   npx tsx scripts/qa/check-surviving-bank.ts --save scratch/bank-before.json
 *   npx tsx scripts/qa/check-surviving-bank.ts --against scratch/bank-before.json
 *
 * 원장님(2026-08-27): 「삭제 끝나고 기존 17508문제 이상없는지 체크.」
 *
 * ⚠️ **「몇 건인가」만 세면 안 된다.** 45,374행을 지우는 동안 살아남는 행이
 *    조용히 바뀌는 길이 셋 있다:
 *      ㉠ `problem.origin_problem_id` 가 **ON DELETE SET NULL** — 지운 행을
 *         가리키던 살아남은 행의 값이 말없이 NULL 이 된다.
 *      ㉡ `problem_report`·`problem_review_log` 가 **CASCADE** — 살아남은 행에
 *         붙은 신고·검수 기록이 함께 사라질 수 있다(딸린 행이 지운 문항을
 *         가리킬 때).
 *      ㉢ 그림 파일은 DB 가 아니라 디스크에 있다 — 행이 지워져도 파일은 남고,
 *         반대로 파일이 없어도 DB 는 모른다.
 *    그래서 **전후로 같은 지문을 찍어 맞대는** 방식으로 본다.
 *
 * 지문에 담는 것: 건수 · 형식/난이도/출처 분포 · 그림이 가리키는 파일의 존재 ·
 * 본문/정답이 빈 행 · `origin_problem_id` 가 살아 있는 행 · 문항류 수 ·
 * 그리고 **행 단위 지문**(내용 md5)까지 — 「수는 같은데 내용이 바뀐」 경우를 잡는다.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

type Snapshot = {
  at: string;
  total: number;
  byQuestionType: Record<string, number>;
  byDifficulty: Record<string, number>;
  bySource: Record<string, number>;
  families: number;
  emptyContent: number;
  emptyAnswer: number;
  withOrigin: number;
  figureRows: number;
  figurePathsMissing: string[];
  reportRows: number;
  reviewLogRows: number;
  /** 행 하나하나의 지문 — 「수는 같은데 내용이 바뀐」 것을 잡는다. */
  rowsDigest: string;
};

const PUBLIC = path.join(process.cwd(), "public");

function tally(
  rows: { k: string | null; n: number }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.k ?? "(없음)"] = r.n;
  return out;
}

async function snapshot(prisma: PrismaClient): Promise<Snapshot> {
  const engine = `(family_key LIKE 'elem:%' OR family_key LIKE 'mid:%' OR source = 'ai_generated')`;

  const total = Number(
    (
      await prisma.$queryRawUnsafe<{ n: bigint }[]>(
        `SELECT COUNT(*) AS n FROM "problem" WHERE ${engine}`,
      )
    )[0]!.n,
  );
  const qt = await prisma.$queryRawUnsafe<{ k: string; n: number }[]>(
    `SELECT question_type AS k, COUNT(*)::int AS n FROM "problem" WHERE ${engine} GROUP BY 1`,
  );
  const df = await prisma.$queryRawUnsafe<{ k: string; n: number }[]>(
    `SELECT difficulty AS k, COUNT(*)::int AS n FROM "problem" WHERE ${engine} GROUP BY 1`,
  );
  const sc = await prisma.$queryRawUnsafe<{ k: string; n: number }[]>(
    `SELECT source AS k, COUNT(*)::int AS n FROM "problem" WHERE ${engine} GROUP BY 1`,
  );
  const fam = Number(
    (
      await prisma.$queryRawUnsafe<{ n: bigint }[]>(
        `SELECT COUNT(DISTINCT family_key) AS n FROM "problem" WHERE ${engine}`,
      )
    )[0]!.n,
  );
  const misc = (
    await prisma.$queryRawUnsafe<
      {
        empty_content: number;
        empty_answer: number;
        with_origin: number;
        figure_rows: number;
        report_rows: number;
        log_rows: number;
      }[]
    >(`
    SELECT
      COUNT(*) FILTER (WHERE content IS NULL OR btrim(content) = '')::int AS empty_content,
      COUNT(*) FILTER (WHERE answer IS NULL OR btrim(answer) = '')::int AS empty_answer,
      COUNT(*) FILTER (WHERE origin_problem_id IS NOT NULL)::int AS with_origin,
      COUNT(*) FILTER (WHERE array_length(figure_urls, 1) > 0 OR figure_svg IS NOT NULL)::int AS figure_rows,
      (SELECT COUNT(*)::int FROM "problem_report" r JOIN "problem" p ON p.id = r.problem_id WHERE ${engine.replace(/family_key|source/g, (m) => "p." + m)}) AS report_rows,
      (SELECT COUNT(*)::int FROM "problem_review_log" l JOIN "problem" p ON p.id = l.problem_id WHERE ${engine.replace(/family_key|source/g, (m) => "p." + m)}) AS log_rows
    FROM "problem" WHERE ${engine}`)
  )[0]!;

  // ㉢ 그림이 가리키는 파일이 **디스크에 있나** — DB 는 이걸 모른다.
  const figs = await prisma.$queryRawUnsafe<{ figure_urls: string[] }[]>(
    `SELECT figure_urls FROM "problem" WHERE ${engine} AND array_length(figure_urls, 1) > 0`,
  );
  const missing = new Set<string>();
  for (const f of figs) {
    for (const u of f.figure_urls ?? []) {
      if (!u.startsWith("/")) continue;
      if (!existsSync(path.join(PUBLIC, u.slice(1)))) missing.add(u);
    }
  }

  // 행 지문 — id 순으로 내용을 이어 붙여 한 번에 해싱.
  const rows = await prisma.$queryRawUnsafe<{ d: string }[]>(`
    SELECT md5(string_agg(t, '' ORDER BY t)) AS d FROM (
      SELECT id::text || '|' || coalesce(content,'') || '|' || coalesce(answer,'') || '|'
             || coalesce(solution,'') || '|' || coalesce(question_type,'') || '|'
             -- ⚠️ difficulty 는 enum 이라 coalesce(…, '') 가 «빈 문자열은 그 enum 값이
             --    아니다»로 터진다. 반드시 ::text 로 내린 뒤 채운다.
             || coalesce(difficulty::text,'') || '|'
             || coalesce(array_to_string(figure_urls, ','), '') AS t
      FROM "problem" WHERE ${engine}) s`);

  return {
    at: new Date().toISOString(),
    total,
    byQuestionType: tally(qt),
    byDifficulty: tally(df),
    bySource: tally(sc),
    families: fam,
    emptyContent: misc.empty_content,
    emptyAnswer: misc.empty_answer,
    withOrigin: misc.with_origin,
    figureRows: misc.figure_rows,
    figurePathsMissing: [...missing].sort().slice(0, 40),
    reportRows: misc.report_rows,
    reviewLogRows: misc.log_rows,
    rowsDigest: rows[0]?.d ?? "",
  };
}

function show(s: Snapshot): void {
  console.log(`  문항 ${s.total} · 문항류 ${s.families}`);
  console.log(`  형식 ${JSON.stringify(s.byQuestionType, null, 0)}`);
  console.log(`  난이도 ${JSON.stringify(s.byDifficulty, null, 0)}`);
  console.log(`  출처 ${JSON.stringify(s.bySource, null, 0)}`);
  console.log(
    `  그림 있는 행 ${s.figureRows} · **없는 그림 파일 ${s.figurePathsMissing.length}**`,
  );
  console.log(
    `  본문 빈 행 ${s.emptyContent} · 정답 빈 행 ${s.emptyAnswer} · origin 있는 행 ${s.withOrigin}`,
  );
  console.log(`  신고 ${s.reportRows} · 검수기록 ${s.reviewLogRows}`);
  console.log(`  행 지문 ${s.rowsDigest}`);
}

function diff(before: Snapshot, after: Snapshot): number {
  let bad = 0;
  const cmp = (name: string, a: unknown, b: unknown): void => {
    const same = JSON.stringify(a) === JSON.stringify(b);
    if (!same) bad += 1;
    console.log(`  ${same ? "✅" : "🔴"} ${name}`);
    if (!same)
      console.log(
        `       전 ${JSON.stringify(a)}\n       후 ${JSON.stringify(b)}`,
      );
  };
  cmp("문항 수", before.total, after.total);
  cmp("문항류 수", before.families, after.families);
  cmp("형식 분포", before.byQuestionType, after.byQuestionType);
  cmp("난이도 분포", before.byDifficulty, after.byDifficulty);
  cmp("출처 분포", before.bySource, after.bySource);
  cmp("그림 있는 행", before.figureRows, after.figureRows);
  cmp("없는 그림 파일", before.figurePathsMissing, after.figurePathsMissing);
  cmp("본문 빈 행", before.emptyContent, after.emptyContent);
  cmp("정답 빈 행", before.emptyAnswer, after.emptyAnswer);
  cmp("origin_problem_id 있는 행", before.withOrigin, after.withOrigin);
  cmp("신고", before.reportRows, after.reportRows);
  cmp("검수 기록", before.reviewLogRows, after.reviewLogRows);
  // 🔴 마지막이 가장 세다 — 수가 다 같아도 한 글자가 바뀌면 걸린다.
  cmp("행 지문(내용 md5)", before.rowsDigest, after.rowsDigest);
  return bad;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const snap = await snapshot(prisma);
  const saveAt = process.argv.indexOf("--save");
  const againstAt = process.argv.indexOf("--against");

  console.log("── 지금 살아 있는 은행 ──");
  show(snap);

  if (saveAt >= 0) {
    const p = process.argv[saveAt + 1]!;
    writeFileSync(p, JSON.stringify(snap, null, 2), "utf-8");
    console.log(`\n지문을 적었다 → ${p}`);
  }
  if (againstAt >= 0) {
    const before = JSON.parse(
      readFileSync(process.argv[againstAt + 1]!, "utf-8"),
    ) as Snapshot;
    console.log(`\n── 삭제 전(${before.at})과 대조 ──`);
    const bad = diff(before, snap);
    console.log(
      bad === 0
        ? "\n✅ 살아남은 은행에 변화 없다"
        : `\n🔴 ${bad}가지가 달라졌다`,
    );
    await prisma.$disconnect();
    process.exit(bad === 0 ? 0 : 1);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
