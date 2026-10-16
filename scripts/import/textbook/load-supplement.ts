/** Load source-witnessed, independently recalculated originals without overwriting any row. */
import { PrismaClient, type Prisma, type Problem } from "@prisma/client";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { DIFFICULTY_LADDER } from "../../../src/contracts/difficulty";
import {
  sourceBookSchema,
  sourceMaterialSchema,
} from "../../../src/contracts/sourceMaterial.contract";
import {
  parseSourceBook,
  parseSourceMaterial,
} from "../../../src/lib/import/schoolTextbook/sourceMeta";
import { recoveryDraftIssues } from "../../../src/lib/import/schoolTextbook/recovery";

const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const packetPath = option("--packet"),
  proofPath = option("--proof");
const out = resolve(
  option("--out") ?? ".qa-artifacts/textbook-supplement-load-20261011",
);
const apply = args.includes("--apply"),
  resume = args.includes("--resume");
const prisma = new PrismaClient();
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const entrySchema = z.object({
  id: z.string(),
  key: z.string().regex(/^[a-f0-9]{16}$/),
  path: z.string(),
  grade: z.string(),
  book: z.string(),
  section: z.number().int().min(0),
  number: z.number().int().positive(),
  content: z.string().min(1),
  answer: z.string().min(1),
  solution: z.string().min(1),
  answerFrom: z.enum([
    "solution-last",
    "solution-short",
    "solution-choice",
    "key",
    "picture",
  ]),
  bad: z.array(z.unknown()).length(0),
  solutionFigure: z.literal(false),
  unit: z.object({
    id: z.string().uuid(),
    grade: z.string(),
    chapter: z.string(),
    section: z.string(),
  }),
  difficulty: z.enum(DIFFICULTY_LADDER),
  problemType: z.enum(["계산", "개념", "활용", "서술형"]),
  questionType: z.enum(["단답형", "객관식", "서술형"]),
  sourceBook: sourceBookSchema,
  sourceMaterial: sourceMaterialSchema,
  calculation: z.object({
    contentSha256: sha,
    publisherAnswerMatches: z.literal(true),
    calculation: z.string().min(1),
  }),
  sourceEvidence: z.object({
    id: z.string(),
    sourcePath: z.string(),
    sourceSha256: sha,
    figureRoute: z.literal("text").nullable(),
    afterAnswer: z.string(),
    rawExtractedWitness: z.object({
      path: z.string(),
      key: z.string(),
      section: z.number().int(),
      number: z.number().int(),
      answer: z.string(),
      answerFrom: z.string(),
      isQuestion: z.literal(true),
      pictures: z.array(z.unknown()),
      shapes: z.number().int(),
      tables: z.number().int(),
      figureMention: z.boolean(),
    }),
  }),
  directUseAllowed: z.literal(false),
  reviewStatus: z.literal("pending"),
  humanReviewLogs: z.array(z.unknown()).length(0),
});
type Entry = z.infer<typeof entrySchema>;
const stable = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, x]) => [k, stable(x)]),
        )
      : v;
const same = (a: unknown, b: unknown) =>
  JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const save = (name: string, v: unknown) =>
  writeFileSync(join(out, name), JSON.stringify(v, null, 2) + "\n");
function validate(
  entry: Entry,
  proof: { questionSha256: string; answerSha256: string; matched: boolean },
) {
  if (
    !proof?.matched ||
    proof.questionSha256 !== hash(entry.content) ||
    proof.answerSha256 !== hash(entry.answer)
  )
    throw new Error(
      `${entry.id}: 독립 계산 증거가 현재 문항과 일치하지 않는다`,
    );
  if (hash(entry.content) !== entry.calculation.contentSha256)
    throw new Error(`${entry.id}: 계산한 본문이 다르다`);
  if (
    createHash("sha1").update(entry.path).digest("hex").slice(0, 16) !==
      entry.key ||
    entry.id !== `tb-${entry.key}-${entry.section}-${entry.number}`
  )
    throw new Error(`${entry.id}: 원본 경로/문항 식별자가 어긋났다`);
  const witness = entry.sourceEvidence.rawExtractedWitness;
  if (
    entry.sourceEvidence.figureRoute === null &&
    (witness.pictures.length ||
      witness.shapes ||
      witness.tables ||
      witness.figureMention)
  )
    throw new Error(`${entry.id}: 그림 의존 여부가 확인되지 않았다`);
  if (
    entry.sourceEvidence.id !== entry.id ||
    entry.sourceEvidence.sourcePath !== entry.path ||
    witness.path !== entry.path ||
    witness.key !== entry.key ||
    witness.section !== entry.section ||
    witness.number !== entry.number ||
    entry.sourceEvidence.afterAnswer !== witness.answer
  )
    throw new Error(`${entry.id}: 원문/정답 대응이 어긋났다`);
  if (
    !same(
      entry.sourceBook,
      parseSourceBook({ bookFolder: entry.book, grade: entry.grade }),
    ) ||
    !same(
      entry.sourceMaterial,
      parseSourceMaterial({
        path: entry.path,
        bookFolder: entry.book,
        key: entry.key,
      }),
    )
  )
    throw new Error(`${entry.id}: 출처 메타데이터가 원본 경로와 다르다`);
  const issues = recoveryDraftIssues({
    problemCode: entry.id,
    kind: "correction",
    content: entry.content,
    answer: entry.answer,
    solution: entry.solution,
    figureUrls: [],
    figureSvg: null,
    notes: "원문 보존 표기 변환",
    validation: {
      math: entry.calculation.calculation,
      visual: "운영 지면 검사",
    },
    remainingIssues: [],
  });
  if (issues.length) throw new Error(`${entry.id}: ${issues.join(" · ")}`);
}
function rowData(
  entry: Entry,
  materialId: string,
): Prisma.ProblemCreateManyInput {
  return {
    userId: null,
    unitId: entry.unit.id,
    source: "school_textbook",
    originProblemId: null,
    difficulty: entry.difficulty,
    problemType: entry.problemType,
    questionType: entry.questionType,
    content: entry.content,
    answer: entry.answer,
    solution: entry.solution,
    solutionSource: "original",
    figureSvg: null,
    figureSource: null,
    figureUrls: [],
    figureDims: [],
    figureSourceMm: [],
    choiceFigureIndex: [],
    externalId: entry.id,
    sourceFile: entry.path,
    examId: entry.sourceMaterial.externalKey,
    questionNumber: entry.number,
    sourceMaterialId: materialId,
    reviewStatus: "pending",
    directUseAllowed: false,
    pool: "shared",
  };
}
function matches(row: Problem, expected: Prisma.ProblemCreateManyInput) {
  return Object.entries(expected)
    .filter(
      ([field]) => field !== "reviewStatus" && field !== "directUseAllowed",
    )
    .every(([field, value]) => same(row[field as keyof Problem], value));
}
async function main() {
  if (!packetPath || !proofPath)
    throw new Error("--packet과 --proof가 필요하다");
  if (apply && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("ALLOW_SHARED_IMPORT=1이 필요하다");
  mkdirSync(out, { recursive: true });
  if (apply && existsSync(join(out, "receipt.json")) && !resume)
    throw new Error("기존 영수증을 보존한다. --resume 또는 새 --out 사용");
  const packetBytes = readFileSync(packetPath),
    proofBytes = readFileSync(proofPath);
  const packet = z
    .object({
      schemaVersion: z.literal(1),
      entries: z.array(entrySchema).min(1),
    })
    .parse(JSON.parse(packetBytes.toString("utf8")));
  const proof = z
    .object({
      checked: z.number().int(),
      failures: z.array(z.unknown()).length(0),
      entries: z.array(
        z.object({
          externalId: z.string(),
          questionSha256: sha,
          answerSha256: sha,
          matched: z.literal(true),
        }),
      ),
    })
    .parse(JSON.parse(proofBytes.toString("utf8")));
  const proofById = new Map(proof.entries.map((row) => [row.externalId, row]));
  if (
    new Set(packet.entries.map((row) => row.id)).size !== packet.entries.length
  )
    throw new Error("중복 원문 식별자");
  for (const entry of packet.entries) validate(entry, proofById.get(entry.id)!);
  const units = await prisma.unit.findMany({
    where: { id: { in: packet.entries.map((row) => row.unit.id) } },
  });
  for (const entry of packet.entries) {
    const unit = units.find((u) => u.id === entry.unit.id);
    if (
      !unit ||
      unit.grade !== entry.unit.grade ||
      unit.chapter !== entry.unit.chapter ||
      unit.section !== entry.unit.section ||
      entry.grade !== unit.grade
    )
      throw new Error(`${entry.id}: 실제 차시가 제안된 차시와 다르다`);
  }
  const existing = await prisma.problem.findMany({
    where: { externalId: { in: packet.entries.map((row) => row.id) } },
  });
  const plan = {
    checkedAt: new Date().toISOString(),
    packetSha256: hash(packetBytes),
    proofSha256: hash(proofBytes),
    entries: packet.entries,
    alreadyPresent: existing.map((row) => row.externalId),
    fresh: packet.entries.filter(
      (row) => !existing.some((old) => old.externalId === row.id),
    ).length,
    reviewStatus: "pending",
    directUseAllowed: false,
  };
  save("plan.json", plan);
  console.log(
    JSON.stringify({
      sourceQuestions: packet.entries.length,
      fresh: plan.fresh,
      alreadyPresent: existing.length,
      reviewStatus: "pending",
      directUseAllowed: false,
    }),
  );
  if (!apply) {
    console.log("드라이런: DB 변경 없음");
    return;
  }
  const result = await prisma.$transaction(
    async (tx) => {
      const outcomes = [];
      for (const entry of packet.entries) {
        let book = await tx.sourceBook.findUnique({
          where: { externalKey: entry.sourceBook.externalKey },
        });
        if (
          book &&
          !Object.entries(entry.sourceBook).every(([field, value]) =>
            same(book![field as keyof typeof book], value),
          )
        )
          throw new Error(`${entry.id}: 기존 출처 책이 다르다`);
        if (!book)
          book = await tx.sourceBook.create({ data: entry.sourceBook });
        let material = await tx.sourceMaterial.findUnique({
          where: { externalKey: entry.sourceMaterial.externalKey },
        });
        if (
          material &&
          (material.bookId !== book.id ||
            !Object.entries(entry.sourceMaterial).every(([field, value]) =>
              same(material![field as keyof typeof material], value),
            ))
        )
          throw new Error(`${entry.id}: 기존 자료가 다르다`);
        if (!material)
          material = await tx.sourceMaterial.create({
            data: { ...entry.sourceMaterial, bookId: book.id },
          });
        const data = rowData(entry, material.id);
        const previous = await tx.problem.findUnique({
          where: { externalId: entry.id },
        });
        if (previous) {
          if (!matches(previous, data))
            throw new Error(`${entry.id}: 기존 문항을 덮어쓰지 않는다`);
          outcomes.push({
            externalId: entry.id,
            state: "already-present",
            ids: [previous.id],
            problemCode: previous.problemCode,
          });
          continue;
        }
        // exam-wiring: 기출아님 — 교과서 문항(source=school_textbook, D-161)을 보충한다. 학교 시험지 편이 없다.
        const row = await tx.problem.create({ data });
        if (!matches(row, data))
          throw new Error(`${entry.id}: 저장 후 내용/출처 불일치`);
        outcomes.push({
          externalId: entry.id,
          state: "inserted",
          ids: [row.id],
          problemCode: row.problemCode,
        });
      }
      return outcomes;
    },
    { timeout: 120000 },
  );
  save("receipt.json", {
    appliedAt: new Date().toISOString(),
    packetSha256: plan.packetSha256,
    proofSha256: plan.proofSha256,
    outcomes: result,
  });
  console.log(
    JSON.stringify({
      inserted: result.filter((row) => row.state === "inserted").length,
      alreadyPresent: result.filter((row) => row.state === "already-present")
        .length,
      originalRowsUpdated: 0,
    }),
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]")
        : "원문 보강 적재 실패",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
