/**
 * 조판 한 걸음 — 요청 하나가 걸음 하나를 한다. 받는 것은 `requestId` 뿐이다.
 *
 * 차례: 다음 걸음을 **임대**로 잡는다(CAS — 같은 걸음을 두 요청이 잡지 못한다) → 서버가 DB 정본에서 교환 형식을
 * 조립해 조판기에 넘긴다 → 조판기가 만든 PDF 를 바이트 표에 넣고(해시는 DB 가 다시 계산한다) 걸음에 결과를 적는다.
 * 걸음은 차례대로만 돈다(쪽 번호가 앞 걸음의 쪽 수에 달려 있다). 브라우저를 닫아도 상태는 걸음 줄에 남는다.
 *
 * 🔴 조판 사이에 판본이 바뀌었으면(집계 revision ≠ 예약 때 값) 조판하지 않고 작업을 그만둔다 —
 *    바뀐 원고로 만든 조각이 예약 때의 조각과 섞이지 않게.
 * 🔴 느린 일(조판)은 트랜잭션 밖에서 한다. 임대 토큰이 맞을 때만 결과를 적는다 — 임대를 잃은 조판의 결과는 버린다.
 */
import { randomUUID } from "node:crypto";

import type { TextbookPublishJob } from "@/contracts/textbook.contract";

import { type TextbookActor, requireOwnedEdition } from "../access";
import { BLOB_MAX_BYTES, putBlob, readBlobRange } from "../server/blobs";
import { notFound } from "../server/errors";
import { assembleExchange, orderedSectionIds } from "../server/exchange";
import { sha256 } from "../hash.server";
import { type TextbookDb, type TextbookSql, SQL_NOW } from "../server/sql";
import {
  type PublishRequestRow,
  type StepResult,
  type StepRow,
  STEP_LEASE_SECONDS,
  STEP_MAX_ATTEMPTS,
  loadPublishRequest,
  loadSteps,
  publishJob,
  stepIssues,
} from "./job";
import type { PublishDeps, ReadEditionAsset } from "./rendererAdapter";

/** 판본의 색인에 있는 자산만 — 해시를 안다고 읽히지 않는다 */
export function editionAssetReader(
  sql: TextbookSql,
  editionId: string,
): ReadEditionAsset {
  return async (assetId) => {
    const [row] = await sql.query<{ bytes: Uint8Array }>(
      `SELECT b."bytes" FROM "textbook_edition_asset" ea JOIN "textbook_blob" b ON b."sha256" = ea."asset_id"
        WHERE ea."edition_id" = $1::uuid AND ea."asset_id" = $2::text`,
      [editionId, assetId],
    );
    if (!row) throw notFound("자산");
    return new Uint8Array(row.bytes);
  };
}

async function abandon(
  sql: TextbookSql,
  request: PublishRequestRow,
  failure: string,
): Promise<void> {
  await sql.execute(
    `UPDATE "textbook_request" SET "state" = 'abandoned', "result" = $3::jsonb, "updated_at" = ${SQL_NOW}
      WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid AND "state" = 'open'`,
    [request.userId, request.requestId, JSON.stringify({ failure })],
  );
}

/** 걸음을 임대로 잡는다 — 잡았으면 토큰, 못 잡았으면 null */
async function claim(
  sql: TextbookSql,
  request: PublishRequestRow,
  step: StepRow,
): Promise<string | null> {
  const token = randomUUID();
  const claimed = await sql.execute(
    `UPDATE "textbook_publish_step"
        SET "state" = 'running', "attempts" = "attempts" + 1, "lease_token" = $4::uuid,
            "lease_until" = (now() AT TIME ZONE 'UTC') + make_interval(secs => $5::int), "updated_at" = ${SQL_NOW}
      WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid AND "idx" = $3::int AND "attempts" < $6::int
        AND ("state" IN ('queued', 'failed')
             OR ("state" = 'running' AND "lease_until" < (now() AT TIME ZONE 'UTC')))`,
    [
      request.userId,
      request.requestId,
      step.idx,
      token,
      STEP_LEASE_SECONDS,
      STEP_MAX_ATTEMPTS,
    ],
  );
  return claimed === 1 ? token : null;
}

async function finish(
  db: TextbookDb,
  request: PublishRequestRow,
  step: StepRow,
  token: string,
  done: {
    pdf: Uint8Array;
    pageCount: number;
    firstPageIndex: number;
    result: StepResult;
  },
): Promise<void> {
  const hash = sha256(done.pdf);
  await db.transaction(async (tx) => {
    await putBlob(tx, hash, done.pdf);
    // 임대 토큰이 맞을 때만 — 임대를 잃은 조판의 결과는 적히지 않는다
    await tx.execute(
      `UPDATE "textbook_publish_step"
          SET "state" = 'done', "sha256" = $5::text, "page_count" = $6::int, "first_page_index" = $7::int,
              "result" = $8::jsonb, "updated_at" = ${SQL_NOW}
        WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid AND "idx" = $3::int
          AND "state" = 'running' AND "lease_token" = $4::uuid`,
      [
        request.userId,
        request.requestId,
        step.idx,
        token,
        hash,
        done.pageCount,
        done.firstPageIndex,
        JSON.stringify({ ...done.result, byteSize: done.pdf.byteLength }),
      ],
    );
  });
}

async function fail(
  sql: TextbookSql,
  request: PublishRequestRow,
  step: StepRow,
  token: string,
  error: unknown,
): Promise<void> {
  const message = (
    error instanceof Error ? error.message : String(error)
  ).slice(0, 2000);
  await sql.execute(
    `UPDATE "textbook_publish_step" SET "state" = 'failed', "result" = $5::jsonb, "updated_at" = ${SQL_NOW}
      WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid AND "idx" = $3::int
        AND "state" = 'running' AND "lease_token" = $4::uuid`,
    [
      request.userId,
      request.requestId,
      step.idx,
      token,
      JSON.stringify({ error: message }),
    ],
  );
}

export async function runNextStep(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  requestId: string,
  deps: PublishDeps,
): Promise<TextbookPublishJob> {
  const access = await requireOwnedEdition(db, actor, editionId);
  const request = await loadPublishRequest(db, actor.id, editionId, requestId);
  const report = async () =>
    publishJob(
      db,
      await loadPublishRequest(db, actor.id, editionId, requestId),
      false,
    );
  if (request.state !== "open") return report();

  if (access.status !== "draft" || access.revision !== request.baseRevision) {
    await abandon(
      db,
      request,
      "조판하는 사이 판본이 바뀌었습니다. 발행을 다시 시작해 주세요.",
    );
    return report();
  }

  const steps = await loadSteps(db, actor.id, requestId);
  // 진단에 막는 사유가 있으면 더 조판하지 않는다 — 원고를 고쳐 다시 예약한다
  if (
    stepIssues(steps).some(
      (entry) => entry.severity === "error" && entry.code !== "render-failed",
    )
  )
    return report();
  const step = steps.find((entry) => entry.state !== "done");
  if (!step) return report();
  if (step.state === "running" && !step.leaseExpired) return report();
  if (step.attempts >= STEP_MAX_ATTEMPTS) {
    await abandon(
      db,
      request,
      step.result?.error ?? "조판이 거듭 실패했습니다.",
    );
    return report();
  }
  const token = await claim(db, request, step);
  if (!token) return report();

  try {
    const sameView = steps.filter(
      (entry) => entry.view === step.view && entry.kind === "render",
    );
    if (step.kind === "render") {
      const exchange = await assembleExchange(db, editionId, {
        exportedAt: deps.now().toISOString(),
        qrStates: ["reserved", "active"],
      });
      const order = await orderedSectionIds(db, editionId);
      const sectionIndices = step.sectionIds.map((id) => order.indexOf(id));
      if (sectionIndices.some((index) => index < 0))
        throw new Error("예약한 구획이 판본에 없습니다.");
      const previous = sameView.filter((entry) => entry.idx < step.idx).at(-1);
      const firstPageIndex =
        previous?.result?.nextPhysicalPageIndex ??
        exchange.config.print.firstPhysicalPageIndex;
      const rendered = await deps.renderer.renderChunk({
        exchange,
        readAsset: editionAssetReader(db, editionId),
        officialOrigin: deps.officialOrigin!,
        sectionIndices,
        firstPhysicalPageIndex: firstPageIndex,
        variant: step.view,
      });
      if (rendered.pdf.byteLength > BLOB_MAX_BYTES)
        throw new Error("조판한 조각이 64MB 를 넘습니다. 구획을 나눠 주세요.");
      await finish(db, request, step, token, {
        pdf: rendered.pdf,
        pageCount: rendered.pageCount,
        firstPageIndex,
        result: {
          pageMap: rendered.pageMap,
          issues: rendered.issues,
          qrChecks: rendered.qrChecks,
          nextPhysicalPageIndex: rendered.nextPhysicalPageIndex,
          carry: rendered.carry,
        },
      });
    } else {
      // 합치기 — 그 판의 조각들을 차례로. 조각 바이트는 서버가 넣어 둔 것만 읽는다
      const chunks = [];
      for (const part of sameView) {
        const bytes = await readBlobRange(
          db,
          part.sha256!,
          0,
          part.result!.byteSize!,
        );
        if (!bytes || sha256(bytes) !== part.sha256)
          throw new Error("보관한 조각이 조판 때의 바이트와 다릅니다.");
        chunks.push({
          pdf: bytes,
          pageCount: part.pageCount!,
          carry: part.result!.carry,
        });
      }
      const merged = await deps.renderer.mergeChunks(chunks, BLOB_MAX_BYTES);
      const expectedPages = sameView.reduce(
        (sum, part) => sum + part.pageCount!,
        0,
      );
      if (merged.pageCount !== expectedPages)
        throw new Error("합친 파일의 쪽 수가 조각의 합과 다릅니다.");
      await finish(db, request, step, token, {
        pdf: merged.pdf,
        pageCount: merged.pageCount,
        firstPageIndex: sameView[0]!.firstPageIndex!,
        result: { qrChecks: merged.qrChecks },
      });
    }
  } catch (error) {
    await fail(db, request, step, token, error);
  }
  return report();
}
