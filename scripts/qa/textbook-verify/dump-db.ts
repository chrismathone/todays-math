/**
 * 교과서 문항을 원본과 대조하려고 DB 에서 그대로 읽어 낸다 (2026-10-21 · 읽기만).
 *
 *   npx tsx --env-file=<.env> scripts/qa/textbook-verify/dump-db.ts <출력 JSONL>
 *
 * 한 줄에 문항 하나 — 본문 · 정답 · 해설 · 원본 파일 · 문항 번호 · 자료 · 책 · 차시.
 * 🔴 출력에 교과서 글이 그대로 든다 — 저장소 안에 쓰지 않는다(`display-survey/textbook-verify/`).
 */
import { writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { PrismaClient } from "@prisma/client";

const out = process.argv[2];
if (!out) throw new Error("출력 파일을 주시오");
if (resolve(out).startsWith(resolve(process.cwd()) + sep))
  throw new Error(
    "교과서 글을 저장소 안에 쓰지 않는다 — 저장소 밖 경로를 주시오",
  );

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT p.id, p.problem_code AS "problemCode", p.external_id AS "externalId",
           p.source_file AS "sourceFile", p.question_number AS "questionNumber",
           p.content, p.answer, p.solution, p.solution_source::text AS "solutionSource",
           p.question_type AS "questionType", p.problem_type AS "problemType",
           p.difficulty::text AS difficulty, p.direct_use_allowed AS "directUseAllowed",
           p.review_status::text AS "reviewStatus", p.figure_urls AS "figureUrls",
           p.choice_figure_index AS "choiceFigureIndex", p.family_key AS "familyKey",
           p.updated_at AS "updatedAt",
           u.id AS "unitId", u.grade, u.semester, u.chapter, u.section,
           m.external_key AS "materialKey", m.kind AS "materialKind", m.kind_raw AS "materialKindRaw",
           m.title AS "materialTitle", m.unit_raw AS "unitRaw",
           b.external_key AS "bookKey", b.publisher, b.author, b.title AS "bookTitle"
      FROM problem p
      JOIN unit u ON u.id = p.unit_id
      LEFT JOIN source_material m ON m.id = p.source_material_id
      LEFT JOIN source_book b ON b.id = m.book_id
     WHERE p.source = 'school_textbook'
     ORDER BY p.external_id`);
  writeFileSync(
    out,
    rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
    "utf8",
  );
  console.log(`문항 ${rows.length} → ${out}`);
}

main().finally(() => prisma.$disconnect());
