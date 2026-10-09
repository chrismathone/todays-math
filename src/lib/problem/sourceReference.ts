import "server-only";
import type { Prisma } from "@prisma/client";
import type { ProblemSourceReference } from "@/contracts/problemSourceReference.contract";
import { db } from "@/lib/db";
import { problemVisibleWhere } from "@/lib/problemPool";

const sourceSelect = {
  id: true,
  problemCode: true,
  source: true,
  originProblemId: true,
  school: true,
  subject: true,
  examId: true,
  questionNumber: true,
  sourceMaterial: {
    select: {
      kind: true,
      title: true,
      unitRaw: true,
      book: {
        select: {
          publisher: true,
          author: true,
          title: true,
          curriculum: true,
        },
      },
    },
  },
} satisfies Prisma.ProblemSelect;
type SourceRow = Prisma.ProblemGetPayload<{ select: typeof sourceSelect }>;
const examSelect = {
  externalExamId: true,
  school: true,
  year: true,
  semester: true,
  round: true,
  subject: true,
} as const;

/**
 * Resolve only recorded origin links, batching each generation. No family/unit matching:
 * those establish similarity, not provenance. Bound old chains and hide inaccessible,
 * missing, or cyclic origins instead of inventing an attribution.
 * No source links means no extra database queries (the usual bank page).
 */
export async function withProblemSourceReferences<
  T extends { originProblemId: string | null },
>(
  rows: readonly T[],
): Promise<(T & { sourceReference?: ProblemSourceReference | null })[]> {
  let frontier = [
    ...new Set(
      rows.flatMap((row) => (row.originProblemId ? [row.originProblemId] : [])),
    ),
  ];
  if (!frontier.length) return [...rows];
  const sources = new Map<string, SourceRow>();
  const requested = new Set<string>();
  for (let depth = 0; frontier.length && depth < 8; depth += 1) {
    frontier.forEach((id) => requested.add(id));
    const found = await db.problem.findMany({
      where: { AND: [problemVisibleWhere(), { id: { in: frontier } }] },
      select: sourceSelect,
    });
    for (const source of found) sources.set(source.id, source);
    frontier = [
      ...new Set(
        found.flatMap((source) =>
          source.originProblemId && !requested.has(source.originProblemId)
            ? [source.originProblemId]
            : [],
        ),
      ),
    ];
  }
  const roots = new Map<string, SourceRow>();
  for (const row of rows) {
    if (!row.originProblemId) continue;
    let source = sources.get(row.originProblemId);
    const visited = new Set<string>();
    while (source?.originProblemId && !visited.has(source.id)) {
      visited.add(source.id);
      source = sources.get(source.originProblemId);
    }
    if (source && !source.originProblemId)
      roots.set(row.originProblemId, source);
  }
  const pastExams = [
    ...new Map(
      [...roots.values()]
        .filter((source) => source.source === "past_exam")
        .map((source) => [source.id, source]),
    ).values(),
  ];
  // Normalized exam keys can differ from the legacy Problem.examId. The explicit
  // ExamQuestion.problemId link is authoritative; never parse a year from a key.
  const questions = pastExams.length
    ? await db.examQuestion.findMany({
        where: { problemId: { in: pastExams.map((source) => source.id) } },
        select: { problemId: true, number: true, exam: { select: examSelect } },
      })
    : [];
  const examByProblem = new Map<string, ProblemSourceReference["exam"]>();
  for (const source of pastExams) {
    const linked = questions.filter(
      (question) => question.problemId === source.id,
    );
    const exact =
      linked.length > 1
        ? linked.filter(
            (question) =>
              question.exam.externalExamId === source.examId &&
              question.number === source.questionNumber,
          )
        : linked;
    if (exact.length === 1) {
      const { externalExamId: _key, ...exam } = exact[0].exam;
      examByProblem.set(source.id, { ...exam, number: exact[0].number });
    } else if (linked.length > 1) {
      // Several recorded exams, none uniquely identified: preserve the source
      // code rather than silently picking a school's exam from the first row.
      examByProblem.set(source.id, null);
    }
  }
  const examIds = [
    ...new Set(
      pastExams.flatMap((source) =>
        !examByProblem.has(source.id) && source.examId ? [source.examId] : [],
      ),
    ),
  ];
  const exams = examIds.length
    ? await db.exam.findMany({
        where: { externalExamId: { in: examIds } },
        select: examSelect,
      })
    : [];
  const examById = new Map(exams.map((exam) => [exam.externalExamId, exam]));
  return rows.map((row) => {
    if (!row.originProblemId) return row;
    const source = roots.get(row.originProblemId);
    if (!source) return { ...row, sourceReference: null };
    const exam =
      source.source === "past_exam" && source.examId
        ? examById.get(source.examId)
        : undefined;
    const material = source.sourceMaterial;
    const reference: ProblemSourceReference = {
      problemId: source.id,
      problemCode: source.problemCode,
      source: source.source,
      questionNumber: source.questionNumber ?? null,
      school: source.school ?? null,
      subject: source.subject ?? null,
      exam: examByProblem.has(source.id)
        ? examByProblem.get(source.id)!
        : exam
          ? {
              school: exam.school,
              year: exam.year,
              semester: exam.semester,
              round: exam.round,
              subject: exam.subject,
              number: source.questionNumber ?? null,
            }
          : null,
      material: material
        ? {
            ...material.book,
            kind: material.kind,
            materialTitle: material.title,
            unitRaw: material.unitRaw,
          }
        : null,
    };
    return { ...row, sourceReference: reference };
  });
}
