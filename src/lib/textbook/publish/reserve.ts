/**
 * 발행 예약 — 한 트랜잭션. 판본을 잠그지 않는다: 여기서 적어 두는 것은 «이 집계 revision 을 조판한다»는 약속이고,
 * 확정이 그 값이 그대로인지를 본다. 중간에 죽어도 판본은 초안 그대로다.
 *
 * 차례: 집계 revision 확인 → 사전 검사(막는 사유가 있으면 422) → 안 쓰는 개념 정리 · 개념 굳히기 →
 *       조판기 판 적기 → QR 예약(놓인 배치 · 놓인 개념마다 하나, 있던 예약은 그대로 쓴다) → 조판 걸음 만들기.
 * 🔴 QR 의 slug · 주소는 서버만 짓는다. 예약 상태의 QR 은 학생에게 «없는 것»이다.
 * 🔴 같은 `requestId` 로 다시 오면 있던 작업을 돌려준다. 다른 `requestId` 로 오면 열려 있던 작업은 그만둔다
 *    (판본마다 열린 발행 작업은 하나다 — DB 의 부분 유일 색인).
 */
import { randomBytes, randomUUID } from "node:crypto";

import type { TextbookPublishJob } from "@/contracts/textbook.contract";
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";

import { type TextbookActor, requireOwnedDraft } from "../access";
import { aggregateRevision } from "../server/editions";
import {
  TextbookError,
  conflict,
  issue,
  revisionMismatch,
} from "../server/errors";
import { orderedSectionIds } from "../server/exchange";
import { type TextbookDb, type TextbookSql, SQL_NOW } from "../server/sql";
import { PUBLISH_OPERATION, loadPublishRequest, publishJob } from "./job";
import { collectPreflight } from "./preflight";
import type { PublishDeps, PublishVariant } from "./rendererAdapter";
import { hasTextbookPageReferences } from "../render/pageReferences";

/** 조판 걸음 하나에 넣는 구획 수 · 블록 수 — 조판기의 한도(8구획 · 600블록 · 32쪽)보다 넉넉히 작게 */
export const STEP_MAX_SECTIONS = 4;
export const STEP_MAX_BLOCKS = 300;

const SLUG_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
/** 20글자 · 글자마다 5비트 = 100비트 — 맞혀 볼 수 없다. 헷갈리는 글자(i · l · o · u)는 뺐다 */
export function newQrSlug(): string {
  return [...randomBytes(20)].map((byte) => SLUG_ALPHABET[byte & 31]).join("");
}

/** 구획을 차례대로 묶는다 — 이어진 구획끼리만, 한도 안에서 */
export function planChunks(
  sections: ReadonlyArray<{ id: string; blocks: number }>,
): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let blocks = 0;
  for (const section of sections) {
    if (
      current.length &&
      (current.length >= STEP_MAX_SECTIONS ||
        blocks + section.blocks > STEP_MAX_BLOCKS)
    ) {
      chunks.push(current);
      current = [];
      blocks = 0;
    }
    current.push(section.id);
    blocks += section.blocks;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * 조판기가 낸 묶음(목차 순 자리)을 구획 id 묶음으로 — 모든 구획이 차례대로 정확히 한 번 나와야 한다.
 * 어긋난 계획으로는 걸음을 만들지 않는다(빠진 구획이 조판되지 않은 채 발행되지 않게).
 */
export function chunksFromPlan(
  plan: readonly (readonly number[])[],
  orderedIds: readonly string[],
): string[][] {
  const flat = plan.flat();
  if (
    plan.some((chunk) => chunk.length === 0) ||
    flat.length !== orderedIds.length ||
    flat.some((index, at) => index !== at)
  )
    throw new TextbookError(
      500,
      "INTERNAL_ERROR",
      "조판 계획이 판본의 구획과 맞지 않습니다.",
    );
  return plan.map((chunk) => chunk.map((index) => orderedIds[index]!));
}

function referencedConcepts(exchange: TextbookExchange): Set<string> {
  const keys = new Set<string>();
  for (const unit of exchange.units) {
    for (const ref of unit.conceptLectureRefs) keys.add(ref.conceptKey);
    for (const section of unit.sections)
      for (const block of section.blocks)
        if (block.kind === "concept") keys.add(block.conceptKey);
        else if (block.kind === "concept-recall" && block.conceptKey)
          keys.add(block.conceptKey);
  }
  for (const item of exchange.items)
    for (const key of item.conceptKeys ?? []) keys.add(key);
  return keys;
}

async function reserveQrTargets(
  tx: TextbookSql,
  editionId: string,
  origin: string,
): Promise<void> {
  const missing = await tx.query<{
    itemId: string | null;
    conceptKey: string | null;
  }>(
    `SELECT i."id" AS "itemId", NULL::text AS "conceptKey" FROM "textbook_item" i
      WHERE i."edition_id" = $1::uuid AND i."section_id" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "textbook_qr_target" q
                         WHERE q."edition_id" = i."edition_id" AND q."item_id" = i."id" AND q."kind" = 'item')
     UNION ALL
     SELECT NULL::uuid, c."concept_key" FROM "textbook_concept" c
      WHERE c."edition_id" = $1::uuid AND c."section_id" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "textbook_qr_target" q
                         WHERE q."edition_id" = c."edition_id" AND q."concept_key" = c."concept_key" AND q."kind" = 'concept')`,
    [editionId],
  );
  if (!missing.length) return;
  const base = origin.replace(/\/$/, "");
  const rows = missing.map((target) => {
    const slug = newQrSlug();
    return {
      id: randomUUID(),
      slug,
      url: `${base}/q/${slug}`,
      kind: target.itemId ? "item" : "concept",
      itemId: target.itemId,
      conceptKey: target.conceptKey,
    };
  });
  await tx.execute(
    `INSERT INTO "textbook_qr_target" ("id", "slug", "url", "kind", "edition_id", "item_id", "concept_key")
     SELECT r."id", r."slug", r."url", r."kind", $1::uuid, r."itemId", r."conceptKey"
       FROM jsonb_to_recordset($2::jsonb) AS r("id" uuid, "slug" text, "url" text, "kind" text, "itemId" uuid, "conceptKey" text)`,
    [editionId, JSON.stringify(rows)],
  );
}

export async function reservePublish(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  input: { requestId: string; expectedRevision: number },
  bodyHash: string,
  deps: PublishDeps,
): Promise<TextbookPublishJob> {
  if (deps.renderer.unavailableReason)
    throw new TextbookError(
      503,
      "INTERNAL_ERROR",
      deps.renderer.unavailableReason,
    );
  return db.transaction(async (tx) => {
    const [existing] = await tx.query<{
      operation: string;
      editionId: string | null;
      bodyHash: string;
    }>(
      `SELECT "operation", "edition_id" AS "editionId", "body_hash" AS "bodyHash" FROM "textbook_request"
        WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid`,
      [actor.id, input.requestId],
    );
    if (existing) {
      if (
        existing.operation !== PUBLISH_OPERATION ||
        existing.editionId !== editionId ||
        existing.bodyHash !== bodyHash
      )
        throw conflict(
          "같은 요청 번호가 다른 내용에 쓰였습니다. 새로 고친 뒤 다시 시도해 주세요.",
        );
      return publishJob(
        tx,
        await loadPublishRequest(tx, actor.id, editionId, input.requestId),
        true,
      );
    }

    const access = await requireOwnedDraft(tx, actor, editionId);
    if (access.revision !== input.expectedRevision)
      throw revisionMismatch("판본", access.revision);

    const exportedAt = deps.now().toISOString();
    const { issues, exchange } = await collectPreflight(
      tx,
      editionId,
      deps,
      exportedAt,
    );
    const sections = await tx.query<{ id: string; blocks: number }>(
      `SELECT "id", jsonb_array_length("content" -> 'blocks') AS "blocks" FROM "textbook_section" WHERE "edition_id" = $1::uuid`,
      [editionId],
    );
    const blocksById = new Map(
      sections.map((section) => [section.id, section.blocks]),
    );
    for (const section of sections)
      if (section.blocks > STEP_MAX_BLOCKS)
        issues.push(
          issue(
            "section-too-long",
            "구획 하나가 너무 깁니다. 구획을 나눠 주세요.",
            {
              sectionId: section.id,
              path: ["sections"],
            },
          ),
        );
    if (issues.some((entry) => entry.severity === "error"))
      throw new TextbookError(
        422,
        "VALIDATION_ERROR",
        "발행을 막는 사유가 있습니다.",
        { issues },
      );

    // 열려 있던 발행 작업은 그만둔다 — 그 작업이 예약한 QR 은 남고, 이번 예약이 그대로 쓴다
    await tx.execute(
      `UPDATE "textbook_request" SET "state" = 'abandoned', "result" = $2::jsonb, "updated_at" = ${SQL_NOW}
        WHERE "edition_id" = $1::uuid AND "operation" = 'publish' AND "state" = 'open'`,
      [
        editionId,
        JSON.stringify({
          failure: "새 발행 작업을 시작해 앞의 작업을 그만두었습니다.",
        }),
      ],
    );

    // 아무도 가리키지 않는 개념은 판본에서 뺀다(QR 을 예약한 개념은 못 뺀다 — 굳혀야 한다)
    const referenced = [...referencedConcepts(exchange)];
    await tx.execute(
      `DELETE FROM "textbook_concept" c
        WHERE c."edition_id" = $1::uuid AND c."section_id" IS NULL
          AND c."concept_key" NOT IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))
          AND NOT EXISTS (SELECT 1 FROM "textbook_qr_target" q
                           WHERE q."edition_id" = c."edition_id" AND q."concept_key" = c."concept_key")`,
      [editionId, JSON.stringify(referenced)],
    );
    const kept = await tx.query<{ conceptKey: string }>(
      `SELECT "concept_key" AS "conceptKey" FROM "textbook_concept" WHERE "edition_id" = $1::uuid`,
      [editionId],
    );
    const keptKeys = new Set(kept.map((row) => row.conceptKey));
    for (const concept of exchange.conceptIntegration?.concepts ?? []) {
      if (!keptKeys.has(concept.conceptKey)) continue;
      const frozen = deps.freezeConcept({ ...concept, frozen: null }).frozen;
      await tx.execute(
        `UPDATE "textbook_concept" SET "frozen" = $3::jsonb, "updated_at" = ${SQL_NOW}
          WHERE "edition_id" = $1::uuid AND "concept_key" = $2::text AND "frozen" IS DISTINCT FROM $3::jsonb`,
        [editionId, concept.conceptKey, JSON.stringify(frozen)],
      );
    }

    // 조판기의 판은 manifest 에 들어간다 — 예약 때 적어 두어야 조판한 것과 발행된 것이 같은 판이다
    await tx.execute(
      `UPDATE "textbook_edition" SET "renderer_version" = $2::text, "template_version" = $3::text,
              "revision" = "revision" + 1, "updated_at" = ${SQL_NOW}
        WHERE "id" = $1::uuid AND ("renderer_version" <> $2::text OR "template_version" <> $3::text)`,
      [editionId, deps.renderer.rendererVersion, deps.renderer.templateVersion],
    );

    await reserveQrTargets(tx, editionId, deps.officialOrigin!);

    const ordered = (await orderedSectionIds(tx, editionId)).map((id) => ({
      id,
      blocks: blocksById.get(id) ?? 0,
    }));
    // 묶는 규칙은 조판기가 안다(«이어서» 시작하는 구획은 앞 구획과 한 조각). 조판기가 안 내면 기본 묶음
    let chunks: string[][];
    try {
      chunks = deps.renderer.planChunks
        ? chunksFromPlan(
            deps.renderer.planChunks(exchange),
            ordered.map((section) => section.id),
          )
        : planChunks(ordered);
    } catch (error) {
      if (error instanceof TextbookError) throw error;
      // 조판기가 묶지 못하는 원고다(«이어서» 시작하는 구획이 길게 이어져 한 묶음이 너무 커진다) — 원고를 고쳐야 한다
      throw new TextbookError(
        422,
        "VALIDATION_ERROR",
        "발행을 막는 사유가 있습니다.",
        {
          issues: [
            issue(
              "chunk-plan-failed",
              "조판 묶음 하나가 너무 큽니다. 앞 구획에 이어서 시작하는 구획을 줄이거나 구획을 나눠 주세요.",
              { path: ["sections"] },
            ),
          ],
        },
      );
    }
    const steps: Array<{
      idx: number;
      kind: string;
      view: PublishVariant;
      sectionIds: string[];
      result?: { referencePhase: "reserve" | "final" };
    }> = [];
    const references = hasTextbookPageReferences(exchange);
    for (const view of ["student", "answers"] as const) {
      for (const phase of references
        ? (["reserve", "final"] as const)
        : [undefined]) {
        for (const chunk of chunks)
          steps.push({
            idx: steps.length,
            kind: "render",
            view,
            sectionIds: chunk,
            ...(phase ? { result: { referencePhase: phase } } : {}),
          });
      }
      steps.push({ idx: steps.length, kind: "merge", view, sectionIds: [] });
    }
    // 펼침면 · 단일 HTML 은 학생용에서 만든다 — 조판기가 할 줄 알 때만 걸음을 만든다(없는 산출물을 있다고 적지 않는다)
    if (deps.renderer.spread)
      steps.push({
        idx: steps.length,
        kind: "spread",
        view: "student",
        sectionIds: [],
      });
    if (deps.renderer.offlineHtml)
      steps.push({
        idx: steps.length,
        kind: "offline",
        view: "student",
        sectionIds: [],
      });

    // 굳히기 · 판 적기까지 끝난 뒤의 값이 «조판할 판본»이다
    const baseRevision = await aggregateRevision(tx, editionId);
    await tx.execute(
      `INSERT INTO "textbook_request" ("user_id", "request_id", "operation", "edition_id", "state", "base_revision", "body_hash", "updated_at")
       VALUES ($1::uuid, $2::uuid, 'publish', $3::uuid, 'open', $4::int, $5::text, ${SQL_NOW})`,
      [actor.id, input.requestId, editionId, baseRevision, bodyHash],
    );
    await tx.execute(
      `INSERT INTO "textbook_publish_step" ("user_id", "request_id", "idx", "kind", "view", "section_ids", "result", "updated_at")
       SELECT $1::uuid, $2::uuid, r."idx", r."kind", r."view", r."sectionIds", r."result", ${SQL_NOW}
         FROM jsonb_to_recordset($3::jsonb) AS r("idx" int, "kind" text, "view" text, "sectionIds" jsonb, "result" jsonb)`,
      [actor.id, input.requestId, JSON.stringify(steps)],
    );
    return publishJob(
      tx,
      await loadPublishRequest(tx, actor.id, editionId, input.requestId),
      false,
    );
  });
}
