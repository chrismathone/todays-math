import "server-only";
import type { Prisma } from "@prisma/client";
import type {
  QuestionSelection,
  QuestionRepresentation,
} from "@/contracts/questionFormats.contract";
import { db } from "@/lib/db";
import { problemVisibleWhere } from "@/lib/problemPool";
import { questionIdOf } from "./questionIdentity";
import {
  QUESTION_REVISION_SELECT,
  matchesQuestionSelection,
  questionFormatMetadataOf,
  QuestionSelectionConflict,
} from "./questionSelection";

export type QuestionDb = Pick<Prisma.TransactionClient, "problem">;
/** Resolve old actual IDs to every currently visible sibling. Never expand a family. */
export async function expandQuestionProblemIds(
  ids: readonly string[],
  client: QuestionDb = db,
): Promise<string[]> {
  if (!ids.length) return [];
  const found = new Map<
    string,
    { id: string; questionGroupKey: string | null }
  >();
  for (let i = 0; i < ids.length; i += 5000) {
    const rows = await client.problem.findMany({
      where: {
        AND: [
          problemVisibleWhere(),
          { id: { in: [...ids.slice(i, i + 5000)] } },
        ],
      },
      select: { id: true, questionGroupKey: true },
    });
    for (const row of rows) found.set(row.id, row);
  }
  const keys = [
    ...new Set(
      [...found.values()].flatMap((r) =>
        r.questionGroupKey == null ? [] : [r.questionGroupKey],
      ),
    ),
  ];
  const expanded = new Set(ids);
  for (let i = 0; i < keys.length; i += 5000) {
    const rows = await client.problem.findMany({
      where: {
        AND: [
          problemVisibleWhere(),
          { questionGroupKey: { in: keys.slice(i, i + 5000) } },
        ],
      },
      select: { id: true },
    });
    for (const row of rows) expanded.add(row.id);
  }
  return [...expanded];
}

/** Small key exclusion avoids an unbounded IN predicate after recent expansion. */
export async function excludeQuestionsWhere(
  ids: readonly string[],
  client: QuestionDb = db,
): Promise<Prisma.ProblemWhereInput> {
  if (!ids.length) return {};
  const keys = new Set<string>();
  for (let i = 0; i < ids.length; i += 5000) {
    const rows = await client.problem.findMany({
      where: {
        AND: [
          problemVisibleWhere(),
          { id: { in: [...ids.slice(i, i + 5000)] } },
        ],
      },
      select: { questionGroupKey: true },
    });
    for (const row of rows)
      if (row.questionGroupKey != null) keys.add(row.questionGroupKey);
  }
  return {
    NOT: {
      OR: [
        ...Array.from({ length: Math.ceil(ids.length / 5000) }, (_, i) => ({
          id: { in: [...ids.slice(i * 5000, (i + 1) * 5000)] },
        })),
        ...(keys.size ? [{ questionGroupKey: { in: [...keys] } }] : []),
      ],
    },
  };
}

/** Annotate existing actual rows; metadata is derived separately for each representation.
 * Candidate siblings obey the same row filters; no private/locked state is borrowed.
 */
export async function withQuestionMetadata<
  T extends { id: string; questionGroupKey?: string | null },
>(
  rows: readonly T[],
  client: QuestionDb = db,
  where: Prisma.ProblemWhereInput = problemVisibleWhere(),
): Promise<
  (T & { questionId: string; questionFormats: QuestionRepresentation[] })[]
> {
  if (!rows.length) return [];
  const keys = [
    ...new Set(
      rows.flatMap((r) =>
        r.questionGroupKey == null ? [] : [r.questionGroupKey],
      ),
    ),
  ];
  const current = await client.problem.findMany({
    where: {
      AND: [
        problemVisibleWhere(),
        where,
        {
          OR: [
            { id: { in: rows.map((r) => r.id) } },
            ...(keys.length ? [{ questionGroupKey: { in: keys } }] : []),
          ],
        },
      ],
    },
    select: QUESTION_REVISION_SELECT,
    orderBy: { id: "asc" },
  });
  const loaded = new Set(current.map((r) => r.id));
  const discovered = [
    ...new Set(
      current.flatMap((r) =>
        r.questionGroupKey == null || keys.includes(r.questionGroupKey)
          ? []
          : [r.questionGroupKey],
      ),
    ),
  ];
  if (discovered.length) {
    const siblings = await client.problem.findMany({
      where: {
        AND: [
          problemVisibleWhere(),
          where,
          { questionGroupKey: { in: discovered } },
        ],
      },
      select: QUESTION_REVISION_SELECT,
      orderBy: { id: "asc" },
    });
    for (const row of siblings) if (!loaded.has(row.id)) current.push(row);
  }
  const currentById = new Map(current.map((r) => [r.id, r]));
  const groups = new Map<string, QuestionRepresentation[]>();
  for (const row of current) {
    const key = questionIdOf(row);
    const meta = questionFormatMetadataOf(row);
    groups.set(key, [...(groups.get(key) ?? []), meta]);
  }
  return rows.map((row) => ({
    ...row,
    questionId: questionIdOf(currentById.get(row.id) ?? row),
    questionFormats:
      groups.get(questionIdOf(currentById.get(row.id) ?? row)) ?? [],
  }));
}

/** Use the caller's transaction for issuance/basket writes. The caller retains input on 409. */
export async function validateQuestionSelections(
  selections: readonly QuestionSelection[],
  client: QuestionDb = db,
): Promise<void> {
  if (
    new Set(selections.map((s) => s.questionId)).size !== selections.length ||
    new Set(selections.map((s) => s.problemId)).size !== selections.length
  )
    throw new QuestionSelectionConflict(
      "같은 문항의 형식을 하나만 선택해 주세요.",
    );
  const rows = await client.problem.findMany({
    where: {
      AND: [
        problemVisibleWhere(),
        { id: { in: selections.map((s) => s.problemId) } },
      ],
    },
    select: QUESTION_REVISION_SELECT,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  if (
    selections.some((s) => {
      const row = byId.get(s.problemId);
      return !row || !matchesQuestionSelection(row, s);
    })
  )
    throw new QuestionSelectionConflict();
}
