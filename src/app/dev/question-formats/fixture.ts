import { solveQuestionSelection } from "@/lib/problem/questionSelectionSolver";
import type {
  QuestionFormat,
  QuestionFormatIntent,
} from "@/contracts/questionFormats.contract";
import type { Difficulty } from "@/contracts/difficulty";
import type { BankData, BankProblem } from "@/components/unified/types";
import type { UnitEntity } from "@/contracts/unit.contract";
import type { QuestionRepresentation } from "@/contracts/questionFormats.contract";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { selectedQuestionFormat } from "@/lib/problem/questionSelectionClient";

/** Authored arithmetic/proof examples only. Every request stays in this memory fixture. */
export const unit: UnitEntity = {
  id: "10000000-0000-4000-8000-000000000001",
  grade: "중1",
  chapter: "수와 연산",
  section: "덧셈과 짝수",
  orderIndex: 1,
};
const ids = Array.from(
  { length: 7 },
  (_, index) =>
    `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const question = (n: string) => `q:v1:${n.repeat(64)}`;
const representation = (
  problemId: string,
  format: QuestionRepresentation["format"],
  blocked = false,
): QuestionRepresentation => ({
  problemId,
  format,
  revision: `fixture:${problemId}:1`,
  state: blocked ? "blocked" : "available",
  reasonCode: blocked ? "locked" : null,
});
const pair1 = [
  representation(ids[0], "short_answer"),
  representation(ids[1], "multiple_choice"),
];
const pair2 = [
  representation(ids[2], "short_answer"),
  representation(ids[3], "multiple_choice"),
];
const native = [representation(ids[4], "descriptive")];
const blocked = [
  representation(ids[5], "short_answer"),
  representation(ids[6], "multiple_choice", true),
];
function row(
  index: number,
  content: string,
  answer: string,
  q: string,
  formats: QuestionRepresentation[],
  familyKey: string,
): BankProblem & { unitId: string } {
  const format = formats.find((item) => item.problemId === ids[index])!;
  return {
    id: ids[index],
    unitId: unit.id,
    questionId: q,
    questionFormats: formats,
    content,
    answer,
    solution:
      format.format === "descriptive"
        ? "두 짝수를 2a, 2b로 나타내면 합은 2(a+b)로 2의 배수입니다."
        : "같은 자리의 수를 더합니다.",
    grade: unit.grade,
    chapter: unit.chapter,
    section: unit.section,
    difficulty: "기본",
    problemCode: `검증-${index + 1}`,
    source: "manual",
    familyKey,
    originProblemId: null,
    questionTypeRaw:
      format.format === "multiple_choice"
        ? "객관식"
        : format.format === "descriptive"
          ? "서술형"
          : "단답형",
    questionType:
      format.format === "multiple_choice"
        ? "multiple-choice"
        : format.format === "descriptive"
          ? "descriptive"
          : "short-answer",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
    choiceFigureIndex: [],
    eligible: format.state === "available",
    reviewStatus: "approved",
    problemType: "계산",
    ineligibleReason:
      format.state === "blocked" ? "출제 잠금(사유 미기록)" : null,
  };
}
export const actualRows = [
  row(0, "$2+3$을 계산하세요.", "5", question("a"), pair1, "fixture:add"),
  row(
    1,
    "$2+3$을 계산하세요.\n① 3\n② 4\n③ 5\n④ 6\n⑤ 7",
    "③",
    question("a"),
    pair1,
    "fixture:add",
  ),
  row(2, "$4+6$을 계산하세요.", "10", question("b"), pair2, "fixture:add"),
  row(
    3,
    "$4+6$을 계산하세요.\n① 8\n② 9\n③ 10\n④ 11\n⑤ 12",
    "③",
    question("b"),
    pair2,
    "fixture:add",
  ),
  row(
    4,
    "짝수 두 수의 합이 항상 짝수인 이유를 문자를 사용하여 설명하세요.",
    "2a+2b=2(a+b)",
    question("c"),
    native,
    "fixture:proof",
  ),
  row(
    5,
    "$7+8$을 계산하세요.",
    "15",
    question("d"),
    blocked,
    "fixture:blocked",
  ),
  row(
    6,
    "$7+8$을 계산하세요.\n① 13\n② 14\n③ 15\n④ 16\n⑤ 17",
    "③",
    question("d"),
    blocked,
    "fixture:blocked",
  ),
];
export const cards = [
  actualRows[0],
  actualRows[2],
  actualRows[4],
  actualRows[5],
];
export const metadata = {
  version: 2 as const,
  countUnit: "question" as const,
  queryKey: "authored-local-fixture",
};
export const bankData: BankData = {
  ...metadata,
  problems: cards,
  total: 4,
  page: 1,
  pageSize: 20,
  units: [unit],
  unitCounts: { [unit.id]: 4 },
  grades: [{ grade: unit.grade, count: 4 }],
  chapters: [unit.chapter],
};

export function fixtureFetch({
  stale = false,
  failed = false,
}: { stale?: boolean; failed?: boolean } = {}): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://fixture.local");
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const params =
      init?.method === "POST" &&
      !url.pathname.endsWith("random") &&
      !url.pathname.endsWith("check")
        ? new URLSearchParams(body)
        : url.searchParams;
    const respond = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), {
        status,
        headers: { "content-type": "application/json" },
      });
    if (failed)
      return respond(
        { error: "문항 단위 조회에 실패했습니다. 입력은 유지됩니다." },
        503,
      );
    if (url.pathname.endsWith("/sources")) {
      const zero = { held: 0, available: 0 };
      const total = { held: 4, available: 4 };
      return respond({
        ...metadata,
        view: "available",
        held: 4,
        available: 4,
        formatAvailable: {
          multiple_choice: 2,
          short_answer: 3,
          descriptive: 1,
        },
        facets: {
          units: { [unit.id]: total },
          unitFamilies: { [unit.id]: 3 },
          difficulties: Object.fromEntries(
            DIFFICULTY_LADDER.map((tier) => [
              tier,
              tier === "기본" ? total : zero,
            ]),
          ),
          sources: {
            total,
            engine: zero,
            school_textbook: zero,
            past_exam: zero,
            other: total,
          },
          textbook: { held: 0, available: 0, books: [] },
        },
      });
    }
    if (url.pathname.endsWith("/check")) {
      if (stale)
        return respond(
          {
            error:
              "선택 후 내용이 변경되었습니다. 실제 표현을 다시 골라 주세요.",
          },
          409,
        );
      return respond({
        items: body.ids.map((id: string) => ({
          id,
          state: "eligible",
          code: null,
          reason: null,
          reviewStatus: "approved",
          unitId: unit.id,
          source: "manual",
        })),
        counts: {
          requested: body.ids.length,
          eligible: body.ids.length,
          ineligible: 0,
          missing: 0,
        },
      });
    }
    if (url.pathname.endsWith("/random")) {
      const excluded = new Set((body.excludeIds ?? []) as string[]);
      const result = solveQuestionSelection({
        candidates: actualRows.flatMap((row) => {
          const selected = selectedQuestionFormat(row);
          return row.eligible && selected && !excluded.has(row.id)
            ? [
                {
                  id: row.id,
                  questionId: row.questionId!,
                  familyId: `${row.unitId}:${row.familyKey}`,
                  unitId: row.unitId,
                  difficulty: row.difficulty,
                  format: selected.format as QuestionFormat,
                },
              ]
            : [];
        }),
        allocations: body.allocations,
        formats: body.formats as QuestionFormatIntent | undefined,
        difficulty: body.difficulty as
          Partial<Record<Difficulty, number>> | undefined,
        distinctFamilies: body.distinctFamilies !== false,
        excludeQuestionIds: actualRows
          .filter((row) => excluded.has(row.id))
          .map((row) => row.questionId!),
        random: () => 0.5,
      });
      const picked = result.selected.map((row) =>
        actualRows.find((item) => item.id === row.id)!,
      );
      return respond({
        ...metadata,
        problems: picked,
        formats: Object.entries(
          (body.formats ?? {}) as Record<string, number>,
        ).map(([format, requested]) => ({
          format,
          requested,
          actual: picked.filter((row) => row.questionTypeRaw === format).length,
        })),
        status: result.status,
        witness: result.witness,
      });
    }
    if (params.get("identity") !== "question")
      return respond({ error: "Fixture requires identity=question" }, 400);
    const ids = params.get("ids")?.split(",");
    let rows = ids ? actualRows.filter((item) => ids.includes(item.id)) : cards;
    if (stale && ids)
      rows = rows.map((item) => ({
        ...item,
        questionFormats: item.questionFormats?.map((option) => ({
          ...option,
          revision: `${option.revision}:changed`,
        })),
      }));
    const excluded = new Set(
      (params.get("excludeIds") ?? "")
        .split(",")
        .filter(Boolean)
        .flatMap((id) =>
          actualRows
            .filter((row) => row.id === id)
            .map((row) => row.questionId),
        ),
    );
    if (!ids) rows = rows.filter((row) => !excluded.has(row.questionId));
    const q = params.get("q");
    if (q)
      rows = rows.filter(
        (row) => row.content.includes(q) || row.problemCode.includes(q),
      );
    return respond({
      ...bankData,
      problems: rows,
      total: rows.length,
      page: Number(params.get("page") ?? 1),
    });
  }) as typeof fetch;
}
