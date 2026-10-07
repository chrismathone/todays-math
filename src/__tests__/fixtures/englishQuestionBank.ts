/** In-memory PostgreSQL fixture only. Never reads DATABASE_URL or runs repository migrations. */
import { PGlite } from "@electric-sql/pglite";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { EnglishQuestion } from "@/contracts/english.contract";

export const bankId = (n: number) =>
  `10000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const BANK_TEACHER = bankId(1);
export const BANK_OTHER_TEACHER = bankId(2);
export const BANK_BRANCH = bankId(3);
export const BANK_OTHER_BRANCH = bankId(4);
export const bankQuestion = (
  prompt = "What did the students build?",
  type: EnglishQuestion["type"] = "서술형",
): EnglishQuestion => ({
  type,
  prompt,
  options: [],
  answer: "A garden.",
  explanation: "They worked together.",
  evidence: "The students built a garden.",
});

export async function createQuestionBankFixture() {
  const pg = new PGlite();
  await pg.exec(`
    CREATE TABLE english_exam (
      id uuid PRIMARY KEY, user_id uuid NOT NULL, branch_id uuid,
      school text NOT NULL, grade text NOT NULL, title text NOT NULL
    );
    CREATE TABLE english_question_set (
      id uuid PRIMARY KEY, exam_id uuid NOT NULL REFERENCES english_exam(id),
      title text NOT NULL, status text NOT NULL, source text NOT NULL,
      passage text NOT NULL, questions jsonb NOT NULL, meta jsonb,
      revision integer NOT NULL, updated_at timestamp NOT NULL
    );
  `);
  const calls: Prisma.Sql[] = [];
  const db = {
    async $queryRaw<T>(query: Prisma.Sql): Promise<T> {
      calls.push(query);
      return (await pg.query(query.text, query.values)).rows as T;
    },
  } as Pick<PrismaClient, "$queryRaw">;
  async function exam(
    id: string,
    options: {
      userId?: string;
      branchId?: string | null;
      grade?: string;
      school?: string;
      title?: string;
    } = {},
  ) {
    await pg.query(`INSERT INTO english_exam VALUES ($1, $2, $3, $4, $5, $6)`, [
      id,
      options.userId ?? BANK_TEACHER,
      options.branchId === undefined ? BANK_BRANCH : options.branchId,
      options.school ?? "Fixture school",
      options.grade ?? "중2",
      options.title ?? "Fixture exam",
    ]);
  }
  async function set(
    id: string,
    examId: string,
    options: {
      title?: string;
      status?: string;
      passage?: string;
      questions?: unknown;
      meta?: unknown;
      revision?: number;
      updatedAt?: string;
    } = {},
  ) {
    await pg.query(
      `INSERT INTO english_question_set VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)`,
      [
        id,
        examId,
        options.title ?? "Fixture set",
        options.status ?? "초안",
        "manual",
        options.passage ?? "The students built a garden.",
        JSON.stringify(options.questions ?? [bankQuestion()]),
        options.meta === undefined ? null : JSON.stringify(options.meta),
        options.revision ?? 1,
        options.updatedAt ?? "2026-10-07T01:00:00.000Z",
      ],
    );
  }
  return {
    pg,
    db,
    calls,
    exam,
    set,
    async reset() {
      await pg.exec("TRUNCATE english_question_set, english_exam");
      calls.length = 0;
    },
  };
}
export type QuestionBankFixture = Awaited<
  ReturnType<typeof createQuestionBankFixture>
>;
