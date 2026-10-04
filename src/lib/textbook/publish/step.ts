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
import {
  type TextbookIssue,
  textbookIssueSchema,
} from "@/contracts/textbookPrimitives.contract";

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
  artifactRenderSteps,
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

/**
 * 걸음을 임대로 잡는다 — 잡았으면 토큰, 못 잡았으면 null.
 * 잡을 수 있는가는 **이 문장 하나**가 정한다(앞의 사전 검사는 헛걸음을 줄일 뿐이다 — 두 요청이 같이 지나칠 수 있다):
 * 대기 · 실패한 걸음이거나 임대가 끝난 걸음만, 그리고 세 번까지만.
 */
export async function claimStep(
  sql: TextbookSql,
  step: { userId: string; requestId: string; idx: number },
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
      step.userId,
      step.requestId,
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
    bytes: Uint8Array;
    pageCount: number;
    firstPageIndex: number;
    result: StepResult;
  },
): Promise<void> {
  if (done.bytes.byteLength > BLOB_MAX_BYTES)
    throw new Error(
      "만든 파일이 64MB 를 넘습니다. 구획을 나누거나 그림을 줄여 주세요.",
    );
  const hash = sha256(done.bytes);
  await db.transaction(async (tx) => {
    await putBlob(tx, hash, done.bytes);
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
        JSON.stringify({
          ...(step.result?.referencePhase
            ? { referencePhase: step.result.referencePhase }
            : {}),
          ...done.result,
          byteSize: done.bytes.byteLength,
        }),
      ],
    );
  });
}

/**
 * 조판기가 **원고의 문제**로 멈췄을 때 그 사유들(시작 면 · 해설이 영역을 넘음 · 그림과 보기의 짝 …).
 * 조판기의 오류는 사유 목록(`issues`)을 들고 온다 — 화면이 어느 구획 · 블록인지 짚을 수 있게 그대로 남긴다.
 * 원고가 그대로면 다시 조판해도 같은 자리에서 멈춘다 — 사유가 남은 작업은 더 조판하지 않는다(`runNextStep`).
 */
export function manuscriptIssuesOf(error: unknown): TextbookIssue[] {
  const raw = (error as { issues?: unknown } | null)?.issues;
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((entry) => {
      const parsed = textbookIssueSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, 200);
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
  const issues = manuscriptIssuesOf(error);
  await sql.execute(
    `UPDATE "textbook_publish_step" SET "state" = 'failed', "result" = $5::jsonb, "updated_at" = ${SQL_NOW}
      WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid AND "idx" = $3::int
        AND "state" = 'running' AND "lease_token" = $4::uuid`,
    [
      request.userId,
      request.requestId,
      step.idx,
      token,
      JSON.stringify({
        ...(step.result?.referencePhase
          ? { referencePhase: step.result.referencePhase }
          : {}),
        error: message,
        ...(issues.length ? { issues } : {}),
      }),
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
  const token = await claimStep(db, {
    userId: request.userId,
    requestId: request.requestId,
    idx: step.idx,
  });
  if (!token) return report();

  /** 서버가 넣어 둔 걸음의 바이트 — 해시가 그때와 같을 때만 */
  const storedBytes = async (part: StepRow): Promise<Uint8Array> => {
    const bytes = await readBlobRange(
      db,
      part.sha256!,
      0,
      part.result!.byteSize!,
    );
    if (!bytes || sha256(bytes) !== part.sha256)
      throw new Error("보관한 조각이 조판 때의 바이트와 다릅니다.");
    return bytes;
  };
  const rendersOf = (view: StepRow["view"]) => artifactRenderSteps(steps, view);

  try {
    const sameView = rendersOf(step.view);
    if (step.kind === "render") {
      const exchange = await assembleExchange(db, editionId, {
        exportedAt: deps.now().toISOString(),
        qrStates: ["reserved", "active"],
      });
      const order = await orderedSectionIds(db, editionId);
      const sectionIndices = step.sectionIds.map((id) => order.indexOf(id));
      if (sectionIndices.some((index) => index < 0))
        throw new Error("예약한 구획이 판본에 없습니다.");
      const phaseRenders = steps.filter(
        (entry) =>
          entry.view === step.view &&
          entry.kind === "render" &&
          entry.result?.referencePhase === step.result?.referencePhase,
      );
      const previous = phaseRenders
        .filter((entry) => entry.idx < step.idx)
        .at(-1);
      const firstPageIndex =
        previous?.result?.nextPhysicalPageIndex ??
        exchange.config.print.firstPhysicalPageIndex;
      // 해설판은 같은 구획 묶음의 학생용 걸음이 남긴 쪽 자리를 그대로 쓴다
      const twin =
        step.view === "answers"
          ? rendersOf("student").find(
              (entry) =>
                JSON.stringify(entry.sectionIds) ===
                JSON.stringify(step.sectionIds),
            )
          : undefined;
      if (step.view === "answers" && twin?.state !== "done")
        throw new Error(
          "학생용 조판이 끝나지 않아 해설판을 조판할 수 없습니다.",
        );
      const reserved =
        step.result?.referencePhase === "final"
          ? steps.filter(
              (entry) =>
                entry.view === step.view &&
                entry.kind === "render" &&
                entry.result?.referencePhase === "reserve",
            )
          : [];
      if (reserved.some((entry) => entry.state !== "done"))
        throw new Error("전체 쪽수 예약이 끝나지 않았습니다.");
      const ownReserve = reserved.find(
        (entry) =>
          JSON.stringify(entry.sectionIds) === JSON.stringify(step.sectionIds),
      );
      if (step.result?.referencePhase === "final" && !ownReserve)
        throw new Error("이 조각의 예약 배치를 찾을 수 없습니다.");
      const rendered = await deps.renderer.renderChunk({
        exchange,
        readAsset: editionAssetReader(db, editionId),
        officialOrigin: deps.officialOrigin!,
        sectionIndices,
        firstPhysicalPageIndex: firstPageIndex,
        variant: step.view,
        ...(twin ? { studentCarry: twin.result?.carry } : {}),
        ...(ownReserve
          ? {
              referenceCarries: reserved.map((entry) => entry.result?.carry),
              reservedCarry: ownReserve.result?.carry,
            }
          : {}),
      });
      await finish(db, request, step, token, {
        bytes: rendered.pdf,
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
    } else if (step.kind === "merge") {
      // 합치기 — 그 판의 조각들을 차례로. 조각 바이트는 서버가 넣어 둔 것만 읽는다
      const chunks = [];
      for (const part of sameView)
        chunks.push({
          pdf: await storedBytes(part),
          pageCount: part.pageCount!,
          carry: part.result!.carry,
        });
      const merged = await deps.renderer.mergeChunks(chunks, BLOB_MAX_BYTES);
      const expectedPages = sameView.reduce(
        (sum, part) => sum + part.pageCount!,
        0,
      );
      if (merged.pageCount !== expectedPages)
        throw new Error("합친 파일의 쪽 수가 조각의 합과 다릅니다.");
      await finish(db, request, step, token, {
        bytes: merged.pdf,
        pageCount: merged.pageCount,
        firstPageIndex: sameView[0]!.firstPageIndex!,
        result: { qrChecks: merged.qrChecks, carry: merged.carry },
      });
    } else if (step.kind === "spread") {
      // 펼침면 — 합친 학생용을 두 쪽씩 한 장에. QR 은 **이 파일에서** 다시 읽는다
      if (!deps.renderer.spread)
        throw new Error("이 조판기는 펼침면을 만들지 못합니다.");
      const source = steps.find(
        (entry) => entry.kind === "merge" && entry.view === "student",
      );
      if (source?.state !== "done")
        throw new Error("학생용을 합치기 전에는 펼침면을 만들 수 없습니다.");
      const spread = await deps.renderer.spread(
        {
          pdf: await storedBytes(source),
          pageCount: source.pageCount!,
          carry: source.result!.carry,
        },
        source.firstPageIndex!,
      );
      await finish(db, request, step, token, {
        bytes: spread.pdf,
        pageCount: spread.pageCount,
        firstPageIndex: source.firstPageIndex!,
        result: { qrChecks: spread.qrChecks },
      });
    } else {
      // 단일 HTML — 조판한 학생용 쪽들을 그대로. 정답 · 해설은 조판기가 싣지 않는다
      if (!deps.renderer.offlineHtml)
        throw new Error("이 조판기는 단일 HTML 을 만들지 못합니다.");
      const student = rendersOf("student");
      if (student.some((entry) => entry.state !== "done"))
        throw new Error("학생용 조판이 끝나지 않았습니다.");
      const html = await deps.renderer.offlineHtml({
        exchange: await assembleExchange(db, editionId, {
          exportedAt: deps.now().toISOString(),
          qrStates: ["reserved", "active"],
        }),
        readAsset: editionAssetReader(db, editionId),
        officialOrigin: deps.officialOrigin!,
        chunkCarries: student.map((entry) => entry.result!.carry),
      });
      await finish(db, request, step, token, {
        bytes: html,
        pageCount: student.reduce((sum, entry) => sum + entry.pageCount!, 0),
        firstPageIndex: student[0]!.firstPageIndex!,
        result: {},
      });
    }
  } catch (error) {
    await fail(db, request, step, token, error);
  }
  return report();
}
