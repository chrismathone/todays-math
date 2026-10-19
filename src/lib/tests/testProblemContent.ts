import "server-only";
import type { FrozenProblem } from "@/lib/examPublication/freeze";
import type { Problem, TestProblem } from "@prisma/client";
import { serializeTestProblemItem } from "@/lib/serializers";
import { difficultySchema, uuidSchema } from "@/contracts/common.contract";
import { problemTypeSchema } from "@/contracts/problem.contract";
import type { TestProblemFigureFields } from "@/contracts/test.contract";
import {
  textbookProblemSnapshotSchema,
  type ProblemSnapshot,
} from "@/contracts/textbookExchange.contract";
import { contentHash, snapshotHash } from "@/lib/textbook/hash.server";
import {
  snapshotToPrintable,
  type PrintableSnapshotAsset,
} from "@/lib/textbook/snapshotToPrintable";

/** Structural DB row type keeps the reader independent of a particular Prisma select. */
export interface TestSnapshotRow {
  id: string;
  userId: string;
  sourceRef: unknown;
  sourceUpdatedAt: Date | null;
  capturedAt: Date;
  unitId: string | null;
  familyKey: string | null;
  difficulty: string | null;
  problemType: string | null;
  payload: unknown;
  contentHash: string;
  rawSource: unknown;
  sourceMetadata: unknown;
  snapshotHash: string;
}

export interface TestContentLink {
  problemId: string;
  snapshotId?: string | null;
  snapshot?: TestSnapshotRow | null;
  snapshotAssets?: ReadonlyMap<string, PrintableSnapshotAsset>;
  /**
   * 월말평가 M1 — 반에 낸 시험이면 그 문항의 **낸 그대로**(발행본 · `hydrateTestSnapshots` 가 붙인다).
   * 있으면 글 · 정답 · 해설 · 형식 · 그림은 은행이 아니라 이것이다(은행 문항을 고쳐도 낸 시험은 그대로).
   */
  publicationProblem?: FrozenProblem | null;
}

/** Authorization precedes this read. A dangling snapshot never silently falls back to today's bank. */
export function snapshotOf(row: TestContentLink): ProblemSnapshot | null {
  if (row.snapshotId == null) return null;
  const stored = row.snapshot;
  if (!stored || stored.id !== row.snapshotId)
    throw new Error("시험지의 고정 문항을 불러오지 못했습니다.");
  // Test access is already authorized, including a reissue across owners. Its assets
  // remain scoped to the snapshot's persisted owner, never to the viewer or live bank.
  uuidSchema.parse(stored.userId);
  const snapshot = textbookProblemSnapshotSchema.parse({
    snapshotId: stored.id,
    source: stored.sourceRef,
    sourceUpdatedAt: stored.sourceUpdatedAt?.toISOString() ?? null,
    capturedAt: stored.capturedAt.toISOString(),
    unitId: stored.unitId,
    familyKey: stored.familyKey,
    difficulty: stored.difficulty,
    problemType: stored.problemType,
    payload: stored.payload,
    contentHash: stored.contentHash,
    rawSource: stored.rawSource,
    sourceMetadata: stored.sourceMetadata,
    snapshotHash: stored.snapshotHash,
  });
  if (
    snapshot.source.system !== "todays-math" ||
    snapshot.source.problemId !== row.problemId
  )
    throw new Error("시험지와 고정 문항의 원본 ID가 다릅니다.");
  if (
    contentHash(snapshot.payload) !== snapshot.contentHash ||
    snapshotHash(snapshot) !== snapshot.snapshotHash
  )
    throw new Error("시험지의 고정 문항 내용 해시가 일치하지 않습니다.");
  const svgId = snapshot.rawSource?.figureSvgAssetId;
  if (
    svgId &&
    !snapshot.payload.figures.some((figure) => figure.assetId === svgId)
  )
    throw new Error("고정 SVG 자산이 문항의 그림 목록에 없습니다.");
  return snapshot;
}

/** Frozen learning metadata is also used by score/achievement readers without loading image bytes. */
export function metadataOf<
  T extends { unitId: string; difficulty: string; score?: number | null },
>(row: TestContentLink & { problem: T }) {
  const snapshot = snapshotOf(row);
  if (!snapshot)
    return {
      unitId: row.problem.unitId,
      difficulty: difficultySchema.parse(row.problem.difficulty),
      score: row.problem.score ?? null,
      unitLabel: null,
    };
  const metadata = snapshot.sourceMetadata;
  if (!metadata) throw new Error("고정 문항의 학년·단원 정보가 없습니다.");
  return {
    unitId: uuidSchema.parse(metadata.unitId),
    difficulty: difficultySchema.parse(metadata.difficulty),
    score: metadata.originalScore,
    unitLabel: {
      grade: metadata.grade,
      chapter: metadata.chapter,
      section: metadata.section,
    },
  };
}

/**
 * One content source for display, printing and grading. Live eligibility fields remain operational;
 * every content field (including intentional null/empty values) comes from the frozen payload.
 */
export function contentOf<
  T extends {
    id: string;
    unitId: string;
    difficulty: string;
    score?: number | null;
    unit?: object | null;
  },
>(
  row: TestContentLink & { problem: T },
): Omit<T, keyof TestProblemFigureFields> & TestProblemFigureFields {
  const frozen = row.publicationProblem;
  if (frozen)
    return {
      ...row.problem,
      content: frozen.content,
      answer: frozen.answer,
      solution: frozen.solution,
      questionType: frozen.questionType,
      figureUrls: frozen.figureUrls,
      figureDims: frozen.figureDims,
      figureSourceMm: frozen.figureSourceMm,
      figureSvg: frozen.figureSvg,
      choiceFigureIndex: frozen.choiceFigureIndex,
    };
  const snapshot = snapshotOf(row);
  if (!snapshot) return row.problem;
  const metadata = metadataOf(row);
  const printable = snapshotToPrintable(snapshot, 0, (id) => {
    const asset = row.snapshotAssets?.get(id);
    if (!asset) throw new Error(`고정 문항 자산을 불러오지 못했습니다: ${id}`);
    if (snapshot.rawSource?.figureSvgAssetId === id && !asset.svg)
      throw new Error(`고정 SVG 자산의 원문을 불러오지 못했습니다: ${id}`);
    return asset;
  });
  return {
    ...row.problem,
    id: row.problemId,
    problemCode:
      snapshot.source.system === "todays-math"
        ? snapshot.source.problemCode
        : null,
    unitId: metadata.unitId,
    difficulty: metadata.difficulty,
    score: metadata.score,
    familyKey: snapshot.familyKey,
    problemType: problemTypeSchema.parse(snapshot.problemType),
    content: snapshot.payload.content,
    answer: snapshot.payload.answer,
    solution: snapshot.payload.solution,
    questionType: snapshot.payload.questionType,
    figureUrls: printable.figureUrls ?? [],
    figureDims: printable.figureDims ?? [],
    figureSourceMm: printable.figureSourceMm ?? [],
    figureSvg: printable.figureSvg ?? null,
    choiceFigureIndex: printable.choiceFigureIndex,
    unit: { ...row.problem.unit, id: metadata.unitId, ...metadata.unitLabel },
    createdAt: new Date(snapshot.capturedAt),
    updatedAt: new Date(snapshot.sourceUpdatedAt ?? snapshot.capturedAt),
  };
}

/** Keep server-only snapshot verification out of shared serialization helpers. */
export function serializeFrozenTestProblemItem(
  row: TestProblem & TestContentLink & { problem: Problem },
) {
  return serializeTestProblemItem({ ...row, problem: contentOf(row) });
}
