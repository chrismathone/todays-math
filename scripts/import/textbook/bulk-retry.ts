/** Offline pairs plus guarded insertion. Originals and user-edited variants are never updated. */
import { Prisma, PrismaClient, type Problem } from "@prisma/client";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  TEXTBOOK_VARIANT_VERSION,
  type TextbookVariantSource,
} from "../../../src/lib/import/schoolTextbook/variants";
import {
  generateReviewedTextbookPair,
  validateReviewedTextbookPair,
  type ReviewedTextbookCandidate,
} from "../../../src/lib/import/schoolTextbook/variantPairGenerators";
import {
  prepareTextbookRetryPair,
  textbookRetrySourceFingerprint,
  matchesTextbookRetryInsertion,
  type TextbookRetrySource,
} from "../../../src/lib/import/schoolTextbook/retryPairPlan";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const snapshotFile = option("--snapshot");
const out = resolve(option("--out") ?? ".qa-artifacts/textbook-retry-20261011");
const apply = args.includes("--apply");
const prisma = new PrismaClient();
const json = (name: string, value: unknown) =>
  writeFileSync(join(out, name), JSON.stringify(value, null, 2));

function sourceRecord(p: TextbookVariantSource): TextbookRetrySource {
  return {
    id: p.id,
    source: p.source as Problem["source"],
    unitId: p.unit_id!,
    familyKey: p.family_key ?? null,
    sourceMaterialId: p.source_material_id,
    difficulty: p.difficulty as Problem["difficulty"],
    problemType: p.problem_type as string,
    questionType: p.question_type,
    content: p.content,
    answer: p.answer,
    solution: p.solution,
    figureSvg: p.figure_svg ?? null,
    figureUrls: [...(p.figure_urls ?? [])],
    figureDims: (p.figure_dims ?? []) as number[],
    figureSourceMm: (p.figure_source_mm ?? []) as number[],
    choiceFigureIndex: (p.choice_figure_index ?? []) as number[],
    pool: p.pool as Problem["pool"],
    reviewStatus: p.review_status as Problem["reviewStatus"],
    directUseAllowed: p.direct_use_allowed,
  };
}
function insertionPair(
  source: TextbookVariantSource,
  candidates: ReviewedTextbookCandidate[],
) {
  const verified = validateReviewedTextbookPair(source, candidates);
  if (!verified.valid) throw new Error(verified.issues.join(" · "));
  const original = sourceRecord(source);
  return prepareTextbookRetryPair(
    original,
    textbookRetrySourceFingerprint(original),
    candidates.map((candidate) => ({
      slot: candidate.slot,
      content: candidate.content,
      answer: candidate.answer,
      solution: candidate.solution,
      figureSvg: candidate.figureSvg,
      figureUrls: candidate.figureUrls,
      figureDims: candidate.figureDims,
      figureSourceMm: candidate.figureSourceMm,
      choiceFigureIndex: candidate.choiceFigureIndex,
      recipe: candidate.recipe,
      mathEvidence: JSON.stringify(candidate.validation),
    })),
  ).rows;
}

async function main() {
  if (!snapshotFile)
    throw new Error(
      "--snapshot <읽기 전용 교과서 source-snapshot.json>이 필요하다",
    );
  if (apply && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("ALLOW_SHARED_IMPORT=1이 필요하다");
  mkdirSync(out, { recursive: true });
  if (
    apply &&
    existsSync(join(out, "receipt.json")) &&
    !args.includes("--resume")
  )
    throw new Error("기존 적용 기록이 있다. --resume 또는 새 --out을 사용한다");
  const snapshot = JSON.parse(readFileSync(snapshotFile, "utf8")) as {
    rows: { problem: TextbookVariantSource }[];
  };
  if (!Array.isArray(snapshot.rows))
    throw new Error("교과서 스냅샷의 rows가 없다");
  const seen = new Set<string>();
  const matched: {
    source: TextbookVariantSource;
    candidates: ReviewedTextbookCandidate[];
  }[] = [];
  const unresolved: {
    sourceId: string;
    problemCode?: string;
    reason: string;
    detail: string;
  }[] = [];
  for (const { problem: source } of snapshot.rows) {
    if (seen.has(source.id))
      throw new Error("스냅샷에 같은 원문 ID가 반복된다");
    seen.add(source.id);
    const result = generateReviewedTextbookPair(source);
    if (result.status === "unresolved") {
      unresolved.push({
        sourceId: source.id,
        problemCode: source.problem_code,
        reason: result.reason,
        detail: result.detail,
      });
      continue;
    }
    try {
      insertionPair(source, result.candidates);
      matched.push({ source, candidates: result.candidates });
    } catch (error) {
      unresolved.push({
        sourceId: source.id,
        problemCode: source.problem_code,
        reason: "pair-render-or-metadata",
        detail: error instanceof Error ? error.message : "invalid-pair",
      });
    }
  }
  const summary = {
    version: TEXTBOOK_VARIANT_VERSION,
    checkedAt: new Date().toISOString(),
    totalOriginals: seen.size,
    matchedOriginals: matched.length,
    candidateRows: matched.length * 2,
    unresolvedOriginals: unresolved.length,
    missingCandidateRows: unresolved.length * 2,
    stagedReviewStatus: "pending",
    directUseAllowed: false,
  };
  json("summary.json", summary);
  json("unresolved.json", unresolved);
  json(
    "pairs.json",
    matched.map(({ source, candidates }) => ({
      sourceId: source.id,
      candidates,
    })),
  );
  console.log(JSON.stringify(summary));
  if (!apply) {
    console.log("드라이런: DB 변경 없음");
    return;
  }

  const receiptPath = join(out, "receipt.json");
  type Outcome = {
    sourceId: string;
    state: "inserted" | "already-present" | "conflict";
    ids?: string[];
    reason?: string;
  };
  const receipt: {
    startedAt: string;
    completedAt?: string;
    outcomes: Outcome[];
  } = existsSync(receiptPath)
    ? JSON.parse(readFileSync(receiptPath, "utf8"))
    : { startedAt: new Date().toISOString(), outcomes: [] };
  // A pair transaction is all-or-nothing. Sharing locks prevent concurrent source edits while inserting.
  for (const packet of matched) {
    try {
      const outcome = await prisma.$transaction(
        async (tx) => {
          const captured = await tx.$queryRaw<
            { row: TextbookVariantSource }[]
          >(Prisma.sql`
          SELECT to_jsonb(p) AS row FROM problem p WHERE p.id=${packet.source.id}::uuid FOR SHARE`);
          const live = captured[0]?.row;
          if (!live) throw new Error("원문이 삭제되었다");
          const planned = insertionPair(live, packet.candidates);
          const externalIds = planned.map((row) => row.externalId!);
          const existing = await tx.problem.findMany({
            where: { externalId: { in: externalIds } },
          });
          for (const row of existing) {
            const expected = planned.find(
              (candidate) => candidate.externalId === row.externalId,
            )!;
            if (!matchesTextbookRetryInsertion(row, expected))
              throw new Error(
                "기존 변형이 수정되었거나 원문과 연결이 다르다. 덮어쓰지 않는다",
              );
          }
          const missing = planned.filter(
            (row) =>
              !existing.some(
                (previous) => previous.externalId === row.externalId,
              ),
          );
          const created = missing.length
            ? await tx.problem.createManyAndReturn({
                data: missing,
                select: { id: true, externalId: true },
              })
            : [];
          const readback = await tx.problem.findMany({
            where: { externalId: { in: externalIds } },
          });
          if (
            readback.length !== 2 ||
            readback.some(
              (row) =>
                !matchesTextbookRetryInsertion(
                  row,
                  planned.find(
                    (candidate) => candidate.externalId === row.externalId,
                  )!,
                ),
            )
          )
            throw new Error(
              "저장 후 두 변형의 내용 또는 연결이 일치하지 않는다",
            );
          return {
            sourceId: live.id,
            state: created.length ? "inserted" : "already-present",
            ids: readback.map((row) => row.id),
          } as Outcome;
        },
        { timeout: 30000 },
      );
      receipt.outcomes.push(outcome);
    } catch (error) {
      receipt.outcomes.push({
        sourceId: packet.source.id,
        state: "conflict",
        reason:
          error instanceof Error &&
          /원문|변형|source|candidate|requires/.test(error.message)
            ? error.message
            : "저장 트랜잭션 실패(원본과 이전 변형 무변경)",
      });
    }
    json("receipt.json", receipt);
  }
  receipt.completedAt = new Date().toISOString();
  json("receipt.json", receipt);
  const states = receipt.outcomes.reduce<Record<string, number>>(
    (counts, row) => {
      counts[row.state] = (counts[row.state] ?? 0) + 1;
      return counts;
    },
    {},
  );
  console.log(
    JSON.stringify({
      outcomes: states,
      reviewStatus: "pending",
      directUseAllowed: false,
    }),
  );
  if (states.conflict) process.exitCode = 1;
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]")
        : "복습 변형 작업 실패",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
