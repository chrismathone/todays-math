/**
 * 발행 확정 — 입력은 `requestId` 하나다. 쪽 · 해시 · «통과» 표지를 본문으로 받지 않는다.
 * 서버가 끝낸 걸음들만 모아 확인하고, 집계 revision 이 예약 때 그대로인지 다시 본 뒤, 부모를 **마지막에** 발행으로 바꾼다.
 *
 * 확인하는 것(전부 서버가 가진 값):
 *   · 걸음이 전부 끝났고 진단에 막는 사유가 없다
 *   · 놓인 배치 전부가 쪽 계획에 정확히 한 번씩 나온다
 *   · 합친 PDF 에서 **다시 읽은** QR 이 예약한 QR 과 하나씩 맞는다(개수와 주소까지) — 학생용 · 펼침면은 전부,
 *     해설판은 찍힌 것마다
 *   · 교환 형식 전체의 참조 · 해시 · 자산 바이트(검증기) — 영상 필수 범위의 게시 영상도 여기서 본다
 * 확정 트랜잭션: 놓이지 않은 배치 정리 → 쪽 칸 채우기 → QR 켜기(남은 예약은 무효) → 산출물 → manifest 해시 →
 *   판본을 발행으로(트리거가 위의 것들이 실제로 있는지 다시 본다) → 요청을 끝으로.
 * 산출물: 학생용 · 해설 PDF, (조판기가 만들었으면) 펼침면 PDF · 단일 HTML, 검수 보고, 교환 JSON, 대응표 CSV,
 *   (꾸리는 함수가 있고 64MB 안이면) 교환 패키지 ZIP. **만들지 않은 것은 줄도 없다.**
 * 같은 `requestId` 로 다시 오면 그때의 결과를 그대로 돌려준다.
 */
import { randomUUID } from "node:crypto";

import type {
  TextbookArtifact,
  TextbookPublishJob,
} from "@/contracts/textbook.contract";
import {
  type PagePlacement,
  type TextbookExchange,
  textbookExchangeSchema,
} from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";

import { type TextbookActor, requireOwnedEdition } from "../access";
import { mappingCsv } from "../archive/mappingCsv";
import { canonicalBytes } from "../canonical";
import { manifestHash, sha256 } from "../hash.server";
import { BLOB_MAX_BYTES, putBlob } from "../server/blobs";
import {
  TextbookError,
  conflict,
  issue,
  revisionMismatch,
} from "../server/errors";
import { assembleExchange } from "../server/exchange";
import { type TextbookDb, type TextbookSql, SQL_NOW } from "../server/sql";
import {
  type StepRow,
  artifactMime,
  jobStatus,
  loadPublishRequest,
  loadSteps,
  publishJob,
  stepIssues,
  artifactRenderSteps,
} from "./job";
import type { PublishDeps, QrReadback } from "./rendererAdapter";
import { editionAssetReader } from "./step";

const blocked = (issues: TextbookIssue[]) =>
  new TextbookError(422, "VALIDATION_ERROR", "발행을 막는 사유가 있습니다.", {
    issues,
  });

/** 학생용 조각들의 쪽 계획을 잇는다 — 놓인 배치마다 정확히 한 번 */
export function collectPageMap(
  steps: readonly StepRow[],
  exchange: TextbookExchange,
): { pageMap: PagePlacement[]; issues: TextbookIssue[] } {
  const pageMap = artifactRenderSteps(steps, "student").flatMap(
    (step) => step.result?.pageMap ?? [],
  );
  const issues: TextbookIssue[] = [];
  const seen = new Map<string, number>();
  for (const placement of pageMap)
    seen.set(placement.itemId, (seen.get(placement.itemId) ?? 0) + 1);
  for (const item of exchange.items) {
    const count = seen.get(item.itemId) ?? 0;
    if (count !== 1)
      issues.push(
        issue(
          count === 0 ? "item-not-paged" : "item-paged-twice",
          count === 0
            ? "조판된 지면에 없는 문항이 있습니다."
            : "한 문항이 지면에 두 번 나옵니다.",
          { itemId: item.itemId, path: ["pageMap"] },
        ),
      );
    seen.delete(item.itemId);
  }
  for (const itemId of seen.keys())
    issues.push(
      issue("unknown-paged-item", "판본에 없는 문항이 지면에 있습니다.", {
        itemId,
        path: ["pageMap"],
      }),
    );
  return { pageMap, issues };
}

/**
 * 합친 PDF 에서 다시 읽은 QR 이 예약한 QR 과 하나씩 맞는가.
 * `requireAll` 이 false 면(해설판) 안 찍힌 QR 은 봐주고, 찍힌 것이 예약한 주소로 읽히는지만 본다.
 */
export function qrReadbackIssues(
  readback: readonly QrReadback[],
  exchange: TextbookExchange,
  options: { requireAll?: boolean } = {},
): TextbookIssue[] {
  const requireAll = options.requireAll ?? true;
  const issues: TextbookIssue[] = [];
  const expected = new Map(
    [...exchange.qrTargets, ...(exchange.conceptQrTargets ?? [])].map((qr) => [
      qr.qrTargetId,
      qr.url,
    ]),
  );
  const read = new Map<string, QrReadback[]>();
  for (const check of readback)
    read.set(check.qrTargetId, [...(read.get(check.qrTargetId) ?? []), check]);
  for (const [qrTargetId, url] of expected) {
    const checks = read.get(qrTargetId) ?? [];
    if (checks.length === 0 && !requireAll) continue;
    if (checks.length !== 1)
      issues.push(
        issue("qr-not-printed", "지면에서 읽히지 않는 QR 이 있습니다.", {
          path: ["qrTargets", qrTargetId],
        }),
      );
    else if (checks[0]!.url !== url || checks[0]!.decodedUrl !== url)
      issues.push(
        issue(
          "qr-decode-mismatch",
          "지면의 QR 이 예약한 주소와 다르게 읽힙니다.",
          {
            path: ["qrTargets", qrTargetId],
            physicalPageIndex: checks[0]!.physicalPageIndex,
          },
        ),
      );
    read.delete(qrTargetId);
  }
  for (const qrTargetId of read.keys())
    issues.push(
      issue("qr-unexpected", "예약하지 않은 QR 이 지면에 있습니다.", {
        path: ["qrTargets", qrTargetId],
      }),
    );
  return issues;
}

async function insertArtifact(
  tx: TextbookSql,
  editionId: string,
  artifact: {
    kind: TextbookArtifact["kind"];
    sha256: string;
    byteSize: number;
    pageCount: number | null;
    parts?: unknown[];
  },
): Promise<void> {
  await tx.execute(
    `INSERT INTO "textbook_artifact" ("id", "edition_id", "kind", "mime_type", "sha256", "byte_size", "page_count", "parts")
     VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::int, $7::int, $8::jsonb)`,
    [
      randomUUID(),
      editionId,
      artifact.kind,
      artifactMime(artifact.kind),
      artifact.sha256,
      artifact.byteSize,
      artifact.pageCount,
      JSON.stringify(artifact.parts ?? []),
    ],
  );
}

export async function finalizePublish(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  requestId: string,
  deps: PublishDeps,
): Promise<TextbookPublishJob> {
  await requireOwnedEdition(db, actor, editionId);
  const request = await loadPublishRequest(db, actor.id, editionId, requestId);
  if (request.state === "done") return publishJob(db, request, true);
  if (request.state !== "open")
    throw conflict("그만둔 발행 작업입니다. 발행을 다시 시작해 주세요.");

  // ── 트랜잭션 밖의 확인 — 느린 것(자산 바이트 검증)은 잠금 없이 한다. 확정 안에서 revision 을 다시 본다
  const steps = await loadSteps(db, actor.id, requestId);
  if (jobStatus(request, steps) !== "ready") {
    const issues = stepIssues(steps);
    if (issues.some((entry) => entry.severity === "error"))
      throw blocked(issues);
    throw conflict("조판이 아직 끝나지 않았습니다.");
  }
  const reserved = await assembleExchange(db, editionId, {
    exportedAt: deps.now().toISOString(),
    qrStates: ["reserved", "active"],
  });
  const paged = collectPageMap(steps, reserved);
  const merged = (view: "student" | "answers") =>
    steps.find((step) => step.kind === "merge" && step.view === view)!;
  const extra = (kind: "spread" | "offline") =>
    steps.find((step) => step.kind === kind);
  const spread = extra("spread");
  const issues = [
    ...paged.issues,
    ...qrReadbackIssues(merged("student").result?.qrChecks ?? [], reserved),
    ...qrReadbackIssues(merged("answers").result?.qrChecks ?? [], reserved, {
      requireAll: false,
    }),
    // 펼침면은 다른 파일이다 — 그 파일에서 다시 읽은 것을 따로 본다
    ...(spread
      ? qrReadbackIssues(spread.result?.qrChecks ?? [], reserved)
      : []),
    ...(await deps.validate(
      { ...reserved, pageMap: paged.pageMap },
      {
        stage: "publish",
        officialOrigin: deps.officialOrigin!,
        readAsset: editionAssetReader(db, editionId),
        requirePageMap: true,
      },
    )),
  ];
  if (issues.some((entry) => entry.severity === "error")) throw blocked(issues);

  return db.transaction(async (tx) => {
    const [edition] = await tx.query<{ status: string; revision: number }>(
      `SELECT "status", "revision" FROM "textbook_edition" WHERE "id" = $1::uuid FOR UPDATE`,
      [editionId],
    );
    const locked = await loadPublishRequest(
      tx,
      actor.id,
      editionId,
      requestId,
      { lock: true },
    );
    if (locked.state === "done") return publishJob(tx, locked, true);
    if (locked.state !== "open")
      throw conflict("그만둔 발행 작업입니다. 발행을 다시 시작해 주세요.");
    if (!edition || edition.status !== "draft")
      throw conflict("이미 발행한 판본입니다.");
    // 예약 뒤에 무엇이든 바뀌었으면 조판한 PDF 는 이 원고의 것이 아니다 — 다시 조판한다
    if (edition.revision !== locked.baseRevision)
      throw revisionMismatch("판본", edition.revision);

    // 구획 밖으로 나간 배치는 발행본에 남기지 않는다. QR 을 예약했던 것은 지울 수 없어 남고, 그 QR 은 무효가 된다
    await tx.execute(
      `DELETE FROM "textbook_item" i
        WHERE i."edition_id" = $1::uuid AND i."section_id" IS NULL
          AND NOT EXISTS (SELECT 1 FROM "textbook_qr_target" q WHERE q."edition_id" = i."edition_id" AND q."item_id" = i."id")`,
      [editionId],
    );
    await tx.execute(
      `UPDATE "textbook_item" i
          SET "physical_page_index" = r."physicalPageIndex", "printed_page_label" = r."printedPageLabel",
              "page_column" = r."column", "display_number" = COALESCE(i."display_number", (i."order_index" + 1)::text),
              "updated_at" = ${SQL_NOW}
         FROM jsonb_to_recordset($2::jsonb) AS r("itemId" uuid, "physicalPageIndex" int, "printedPageLabel" text, "column" int)
        WHERE i."id" = r."itemId" AND i."edition_id" = $1::uuid AND i."section_id" IS NOT NULL`,
      [editionId, JSON.stringify(paged.pageMap)],
    );
    await tx.execute(
      `UPDATE "textbook_qr_target" q SET "state" = 'active', "activated_at" = ${SQL_NOW}
        WHERE q."edition_id" = $1::uuid AND q."state" = 'reserved'
          AND ((q."kind" = 'item' AND EXISTS (SELECT 1 FROM "textbook_item" i
                  WHERE i."edition_id" = q."edition_id" AND i."id" = q."item_id" AND i."section_id" IS NOT NULL))
            OR (q."kind" = 'concept' AND EXISTS (SELECT 1 FROM "textbook_concept" c
                  WHERE c."edition_id" = q."edition_id" AND c."concept_key" = q."concept_key" AND c."section_id" IS NOT NULL)))`,
      [editionId],
    );
    await tx.execute(
      `UPDATE "textbook_qr_target" SET "state" = 'void' WHERE "edition_id" = $1::uuid AND "state" = 'reserved'`,
      [editionId],
    );

    for (const [view, kind] of [
      ["student", "student-pdf"],
      ["answers", "answer-pdf"],
    ] as const) {
      const step = merged(view);
      await insertArtifact(tx, editionId, {
        kind,
        sha256: step.sha256!,
        byteSize: step.result!.byteSize!,
        pageCount: step.pageCount,
        parts: artifactRenderSteps(steps, view).map((part) => ({
          sha256: part.sha256,
          firstPageIndex: part.firstPageIndex,
          pageCount: part.pageCount,
        })),
      });
    }
    for (const [step, kind] of [
      [spread, "spread-pdf"],
      [extra("offline"), "offline-html"],
    ] as const)
      if (step)
        await insertArtifact(tx, editionId, {
          kind,
          sha256: step.sha256!,
          byteSize: step.result!.byteSize!,
          pageCount: step.pageCount,
        });
    const validation = {
      requestId,
      baseRevision: locked.baseRevision,
      steps: steps.map((step) => ({
        idx: step.idx,
        kind: step.kind,
        view: step.view,
        sha256: step.sha256,
        pageCount: step.pageCount,
        issues: step.result?.issues ?? [],
        qrChecks: step.result?.qrChecks ?? [],
      })),
    };
    const report = canonicalBytes(validation);
    await putBlob(tx, sha256(report), report);
    await insertArtifact(tx, editionId, {
      kind: "validation-json",
      sha256: sha256(report),
      byteSize: report.byteLength,
      pageCount: null,
    });

    // manifest — 쪽과 켜진 QR 까지 적힌 **지금의 줄들**에서 다시 조립한다(조판에 쓴 값을 믿고 넘기지 않는다)
    const publishedAt = deps.now().toISOString();
    const assembled = textbookExchangeSchema.parse(
      await assembleExchange(tx, editionId, {
        exportedAt: publishedAt,
        qrStates: ["active"],
      }),
    );
    const hash = manifestHash(assembled);
    const published: TextbookExchange = {
      ...assembled,
      edition: {
        ...assembled.edition,
        status: "published",
        publishedAt,
        manifestHash: hash,
        // 조판한 판본의 값이다 — 산출물을 쓰는 문장들이 올린 값이 아니다
        revision: locked.baseRevision,
      },
    };
    const exchangeBytes = canonicalBytes(published);
    await putBlob(tx, sha256(exchangeBytes), exchangeBytes);
    await insertArtifact(tx, editionId, {
      kind: "exchange-json",
      sha256: sha256(exchangeBytes),
      byteSize: exchangeBytes.byteLength,
      pageCount: null,
    });
    // 대응표 — 쪽은 방금 적은 쪽 계획에서 온다. 학생의 정보는 한 칸도 없다
    const mapping = new TextEncoder().encode(mappingCsv(published));
    await putBlob(tx, sha256(mapping), mapping);
    await insertArtifact(tx, editionId, {
      kind: "mapping-csv",
      sha256: sha256(mapping),
      byteSize: mapping.byteLength,
      pageCount: null,
    });
    // 교환 패키지 — 방금 조립한 발행본과 판본의 자산 바이트로. 한 줄에 못 담는 크기면 줄을 만들지 않는다
    // (내보내기가 그때그때 같은 내용으로 만든다 — 없는 파일을 있다고 적지 않는다)
    if (deps.packageArchive) {
      const archive = await deps.packageArchive(
        published,
        editionAssetReader(tx, editionId),
        validation,
      );
      if (archive.byteLength <= BLOB_MAX_BYTES) {
        await putBlob(tx, sha256(archive), archive);
        await insertArtifact(tx, editionId, {
          kind: "exchange-zip",
          sha256: sha256(archive),
          byteSize: archive.byteLength,
          pageCount: null,
        });
      }
    }

    const flipped = await tx.execute(
      `UPDATE "textbook_edition" SET "status" = 'published', "published_at" = $2::timestamp, "manifest_hash" = $3::text,
              "updated_at" = ${SQL_NOW}
        WHERE "id" = $1::uuid AND "status" = 'draft'`,
      [editionId, publishedAt, hash],
    );
    if (flipped !== 1) throw conflict("이미 발행한 판본입니다.");
    await tx.execute(
      `UPDATE "textbook_request" SET "state" = 'done', "result" = $3::jsonb, "updated_at" = ${SQL_NOW}
        WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid`,
      [
        actor.id,
        requestId,
        JSON.stringify({ manifestHash: hash, publishedAt }),
      ],
    );
    return publishJob(
      tx,
      await loadPublishRequest(tx, actor.id, editionId, requestId),
      false,
    );
  });
}
