import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type {
  QuestionFormat,
  QuestionReadMetadata,
} from "@/contracts/questionFormats.contract";
import { db } from "@/lib/db";
import { problemIneligibleCode } from "@/lib/problemEligibility";
import { classifyFormat } from "./provenance";
import { questionFormatWithoutContent } from "./questionFormat";
import { questionIdOf, groupQuestionRows } from "./questionIdentity";
import type { QuestionDb } from "./questionQueries";

/** No SVG, solution or full payload in a corpus scan. Only ambiguous formats read content. */
export const QUESTION_CANDIDATE_SELECT = {
  id: true,
  questionGroupKey: true,
  unitId: true,
  familyKey: true,
  difficulty: true,
  source: true,
  sourceMaterialId: true,
  questionType: true,
  problemType: true,
  answer: true,
  pool: true,
  reviewStatus: true,
  directUseAllowed: true,
} as const satisfies Prisma.ProblemSelect;
type CandidateRow = Prisma.ProblemGetPayload<{
  select: typeof QUESTION_CANDIDATE_SELECT;
}>;
export type QuestionCandidate = CandidateRow & {
  questionId: string;
  actualFormat: QuestionFormat | null;
  available: boolean;
};

export function questionReadMetadata(
  params: URLSearchParams,
): QuestionReadMetadata {
  const entries = [...params]
    .filter(([key]) => !["page", "pageSize"].includes(key))
    .sort(([a], [b]) => a.localeCompare(b));
  return {
    version: 2,
    countUnit: "question",
    queryKey: createHash("sha256")
      .update(JSON.stringify(entries))
      .digest("hex"),
  };
}
export async function loadQuestionCandidates(
  where: Prisma.ProblemWhereInput,
  orderBy?: Prisma.ProblemOrderByWithRelationInput[],
  client: QuestionDb = db,
  formatCache: Map<string, ReturnType<typeof classifyFormat>> = new Map(),
): Promise<QuestionCandidate[]> {
  const rows = await client.problem.findMany({
    where,
    ...(orderBy ? { orderBy } : {}),
    select: QUESTION_CANDIDATE_SELECT,
  });
  const undecided = rows.filter(
    (row) =>
      questionFormatWithoutContent(row) === null && !formatCache.has(row.id),
  );
  const formats = formatCache;
  for (let i = 0; i < undecided.length; i += 5000) {
    const contents = await client.problem.findMany({
      where: {
        AND: [
          where,
          { id: { in: undecided.slice(i, i + 5000).map((r) => r.id) } },
        ],
      },
      select: { id: true, content: true },
    });
    const byId = new Map(contents.map((r) => [r.id, r.content]));
    for (const row of undecided.slice(i, i + 5000)) {
      const content = byId.get(row.id);
      if (content !== undefined)
        formats.set(row.id, classifyFormat({ ...row, content }));
    }
  }
  return rows.map((row) => {
    const classified =
      questionFormatWithoutContent(row) ?? formats.get(row.id) ?? "unknown";
    const actualFormat = classified === "unknown" ? null : classified;
    return {
      ...row,
      questionId: questionIdOf(row),
      actualFormat,
      available: actualFormat !== null && problemIneligibleCode(row) === null,
    };
  });
}
/** Format is an existence filter on an actual row, then grouping precedes slicing. */
export function projectQuestionCandidates(
  rows: readonly QuestionCandidate[],
  options: { format?: QuestionFormat; availableOnly?: boolean } = {},
) {
  return [...groupQuestionRows(rows).entries()].flatMap(
    ([questionId, members]) => {
      const fits = members.filter(
        (row) =>
          (!options.availableOnly || row.available) &&
          (!options.format || row.actualFormat === options.format),
      );
      if (!fits.length) return [];
      return [{ questionId, representative: fits[0], members }];
    },
  );
}
export function countProjectedQuestions(
  rows: readonly QuestionCandidate[],
  availableOnly = false,
  format?: QuestionFormat,
): number {
  return projectQuestionCandidates(rows, { availableOnly, format }).length;
}
