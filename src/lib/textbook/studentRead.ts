import "server-only";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import {
  textbookConceptSchema,
  type TextbookConcept,
} from "@/contracts/textbookConcept.contract";
import {
  textbookConfigSchema,
  textbookProblemSnapshotSchema,
  type ProblemSnapshot,
} from "@/contracts/textbookExchange.contract";
import {
  textbookStudentQrSchema,
  textbookStudentVideoSchema,
} from "@/contracts/textbookStudent.contract";
import { conceptContentHash, contentHash, snapshotHash } from "./hash.server";
import { resolveStudentQr, type StudentQrTarget } from "./studentAccess";
import { studentConceptOf } from "./studentProjection";
import { studentConceptVideo } from "./studentConceptVideo";
import { textbookReviewAccess } from "./studentReview";
import { readSrsState } from "@/lib/math-srs/serverStore";
import { SrsUnavailable } from "@/lib/math-srs/serverState";
import { TextbookError, notFound } from "./server/errors";
import { isoColumn, type TextbookSql } from "./server/sql";
import { readConceptContent } from "./server/conceptRows";
import { renumberSnapshotSlots } from "./snapshotSlots";

/** Every student consumer (JSON, assets, submissions and review) enters through this same gate. */
export async function requireStudentQr(
  sql: TextbookSql,
  studentId: string,
  slug: string,
) {
  const access = await resolveStudentQr(sql, studentId, slug);
  if (access.ok) return access.target;
  if (access.reason === "closed")
    throw new TextbookError(
      410,
      "NOT_FOUND",
      "이 교재의 학습 제공이 종료되었습니다. 선생님께 확인해 주세요.",
    );
  if (access.reason === "not-assigned")
    throw new TextbookError(
      403,
      "FORBIDDEN",
      "지금 배정된 교재에서만 열 수 있습니다.",
    );
  throw notFound("교재 학습");
}

export async function requireStudentConcept(
  sql: TextbookSql,
  studentId: string,
  editionId: string,
  conceptKey: string,
) {
  const [row] = await sql.query<{ slug: string }>(
    `SELECT "slug" FROM "textbook_qr_target" WHERE "edition_id" = $1::uuid AND "concept_key" = $2::text AND "kind" = 'concept' AND "state" = 'active'`,
    [editionId, conceptKey],
  );
  if (!row) throw notFound("교재 개념");
  return requireStudentQr(sql, studentId, row.slug);
}

/** Caller has authorized this exact published concept. No live-bank substitution. */
export async function readFrozenConcept(
  sql: TextbookSql,
  target: StudentQrTarget,
): Promise<TextbookConcept> {
  if (target.kind !== "concept" || !target.conceptKey)
    throw notFound("교재 개념");
  const row = await readConceptContent(
    sql,
    target.editionId,
    target.conceptKey,
  );
  if (!row) throw notFound("교재 개념");
  const concept = textbookConceptSchema.parse(row);
  if (
    !concept.frozen ||
    conceptContentHash(concept) !== concept.frozen.contentHash
  )
    throw new Error("발행 개념의 내용 해시가 일치하지 않습니다.");
  return concept;
}

/** Caller has authorized the QR; read only the snapshot bound to that placement and owner. */
export async function readQrSnapshot(
  sql: TextbookSql,
  target: StudentQrTarget,
): Promise<ProblemSnapshot> {
  if (target.kind !== "item" || !target.snapshotId) throw notFound("교재 문제");
  const [row] = await sql.query<ProblemSnapshot>(
    `SELECT "id" AS "snapshotId", "source_ref" AS "source", ${isoColumn('"source_updated_at"')} AS "sourceUpdatedAt",
      ${isoColumn('"captured_at"')} AS "capturedAt", "unit_id" AS "unitId", "family_key" AS "familyKey", "difficulty", "problem_type" AS "problemType",
      "payload", "content_hash" AS "contentHash", "raw_source" AS "rawSource", "source_metadata" AS "sourceMetadata", "snapshot_hash" AS "snapshotHash"
      FROM "textbook_problem_snapshot" WHERE "id" = $1::uuid AND "user_id" = $2::uuid`,
    [target.snapshotId, target.ownerId],
  );
  if (!row) throw notFound("교재 문제");
  const snapshot = textbookProblemSnapshotSchema.parse(row);
  if (
    contentHash(snapshot.payload) !== snapshot.contentHash ||
    snapshotHash(snapshot) !== snapshot.snapshotHash
  )
    throw new Error("발행 문제의 내용 해시가 일치하지 않습니다.");
  return snapshot;
}

export async function studentQrVideo(
  sql: TextbookSql,
  target: StudentQrTarget,
  hash: string,
) {
  if (!target.snapshotId)
    return textbookStudentVideoSchema.parse({
      state: "preparing",
      providerVideoId: null,
      startSeconds: 0,
      endSeconds: null,
    });
  const rows = await sql.query<{
    status: string;
    provider: string;
    providerVideoId: string;
    startSeconds: number;
    endSeconds: number | null;
    reviewedAgainstHash: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
  }>(
    `SELECT b."status", v."provider", v."provider_video_id" AS "providerVideoId", b."start_seconds" AS "startSeconds", b."end_seconds" AS "endSeconds",
      b."reviewed_against_hash" AS "reviewedAgainstHash", b."reviewed_by" AS "reviewedBy", ${isoColumn('b."reviewed_at"')} AS "reviewedAt"
      FROM "textbook_video_binding" b JOIN "textbook_video" v ON v."id" = b."video_id" AND v."user_id" = b."user_id"
      WHERE b."snapshot_id" = $1::uuid AND b."user_id" = $2::uuid AND b."status" IN ('published', 'withdrawn')
      ORDER BY b."published_at" DESC NULLS LAST, b."created_at" DESC, b."id" DESC`,
    [target.snapshotId, target.ownerId],
  );
  const published = rows.find(
    (row) =>
      row.status === "published" &&
      row.provider === "youtube" &&
      row.reviewedAgainstHash === hash &&
      row.reviewedBy &&
      row.reviewedAt,
  );
  return textbookStudentVideoSchema.parse(
    published
      ? {
          state: "ready",
          providerVideoId: published.providerVideoId,
          startSeconds: published.startSeconds,
          endSeconds: published.endSeconds,
        }
      : {
          state: rows.some((row) => row.status === "withdrawn")
            ? "withdrawn"
            : "preparing",
          providerVideoId: null,
          startSeconds: 0,
          endSeconds: null,
        },
  );
}

export async function studentConceptDto(
  sql: TextbookSql,
  studentId: string,
  target: StudentQrTarget,
  now: Date,
) {
  const concept = await readFrozenConcept(sql, target);
  return projectStudentConcept(target.editionId, studentId, concept, now);
}

async function projectStudentConcept(
  editionId: string,
  studentId: string,
  concept: TextbookConcept,
  now: Date,
) {
  try {
    const saved = await readSrsState(studentId);
    return studentConceptOf(
      editionId,
      concept,
      textbookReviewAccess(saved.state, studentId, concept, now),
    );
  } catch (error) {
    if (!(error instanceof SrsUnavailable)) throw error;
    return studentConceptOf(editionId, concept, {
      available: false,
      reasonCode: "learning-records-unavailable",
    });
  }
}

export async function readStudentQr(
  sql: TextbookSql,
  studentId: string,
  slug: string,
  now: Date,
) {
  const target = await requireStudentQr(sql, studentId, slug);
  if (target.kind === "concept") {
    const frozen = await readFrozenConcept(sql, target);
    const [concept, video] = await Promise.all([
      projectStudentConcept(target.editionId, studentId, frozen, now),
      studentConceptVideo(sql, target, frozen),
    ]);
    return textbookStudentQrSchema.parse({
      kind: "concept",
      concept,
      video,
    });
  }
  const snapshot = await readQrSnapshot(sql, target);
  const [item] = await sql.query<{
    displayNumber: string;
    conceptKeys: string[];
    config: unknown;
  }>(
    `SELECT i."display_number" AS "displayNumber", i."concept_keys" AS "conceptKeys", e."config" FROM "textbook_item" i JOIN "textbook_edition" e ON e."id" = i."edition_id" WHERE i."id" = $1::uuid AND i."edition_id" = $2::uuid`,
    [target.itemId, target.editionId],
  );
  if (!item) throw notFound("교재 문제");
  const config = textbookConfigSchema.parse(item.config);
  const concepts: { conceptKey: string; title: string }[] = [];
  for (const key of item.conceptKeys) {
    const [concept] = await sql.query<{ conceptKey: string; title: string }>(
      `SELECT "concept_key" AS "conceptKey", "title" FROM "textbook_concept" WHERE "edition_id" = $1::uuid AND "concept_key" = $2::text AND "frozen" IS NOT NULL`,
      [target.editionId, key],
    );
    if (concept) {
      try {
        await requireStudentConcept(sql, studentId, target.editionId, key);
        concepts.push(concept);
      } catch (error) {
        if (
          !(error instanceof TextbookError) ||
          ![403, 404, 410].includes(error.status)
        )
          throw error;
      }
    }
  }
  const assetRows = snapshot.payload.figures.length
    ? await sql.query<{
        assetId: string;
        widthPx: number | null;
        heightPx: number | null;
      }>(
        `SELECT "id" AS "assetId", "width_px" AS "widthPx", "height_px" AS "heightPx" FROM "textbook_asset" WHERE "user_id" = $1::uuid AND "id" IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))`,
        [
          target.ownerId,
          JSON.stringify(
            snapshot.payload.figures.map((figure) => figure.assetId),
          ),
        ],
      )
    : [];
  const assets = new Map(assetRows.map((asset) => [asset.assetId, asset]));
  const available = config.studentSolutionPolicy === "assigned";
  const shown = fractionViewFor({
    grade: snapshot.sourceMetadata?.grade ?? "",
    ...snapshot.payload,
  });
  return textbookStudentQrSchema.parse({
    kind: "problem",
    editionId: target.editionId,
    itemId: target.itemId,
    title: config.title,
    displayNumber: item.displayNumber,
    // 학생 화면은 스냅샷 그림을 전부 그 차례로 받는다(엔진 SVG 가 맨 앞) — 그림 자리 번호를 그 차례로(`snapshotSlots.ts`).
    content: shown(
      renumberSnapshotSlots(
        snapshot.payload.content,
        snapshot.payload.figures,
        snapshot.rawSource?.figureSvgAssetId,
        snapshot.payload.figures.map((_, index) => index),
      ),
    ),
    textSolutionAvailable: available,
    answer: available ? shown(snapshot.payload.answer) : null,
    solution:
      available && snapshot.payload.solution !== null
        ? shown(snapshot.payload.solution)
        : null,
    figures: snapshot.payload.figures.map((figure) => {
      const asset = assets.get(figure.assetId);
      if (!asset || figure.assetId !== figure.sha256)
        throw new Error("발행 문항의 그림 정보를 찾을 수 없습니다.");
      return {
        assetId: asset.assetId,
        widthPx: asset.widthPx,
        heightPx: asset.heightPx,
        choiceIndex: figure.choiceIndex,
        sourceWidthMm: figure.sourceWidthMm,
        altText: figure.altText,
        url: `/api/learn/textbook/q/${target.slug}/assets/${asset.assetId}`,
      };
    }),
    video: await studentQrVideo(sql, target, snapshot.contentHash),
    concepts,
  });
}
