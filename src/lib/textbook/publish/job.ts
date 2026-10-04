/**
 * 발행 작업의 상태 — 요청 기록 한 줄과 조판 걸음들을 읽어 화면이 보는 모양으로 낸다.
 * 상태는 **서버가 가진 줄**에서만 나온다. 화면이 «다 됐다»고 알려 올 자리가 없다.
 */
import type {
  TextbookArtifact,
  TextbookPublishJob,
} from "@/contracts/textbook.contract";
import type { PagePlacement } from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";

import { notFound } from "../server/errors";
import type { TextbookSql } from "../server/sql";
import type { PublishVariant, QrReadback } from "./rendererAdapter";

export const PUBLISH_OPERATION = "publish";
export const STEP_MAX_ATTEMPTS = 3;
/** 걸음 하나의 임대 — 조판 한도(300초)보다 조금 길게. 이 안에는 같은 걸음을 또 잡지 못한다 */
export const STEP_LEASE_SECONDS = 330;

export interface StepResult {
  referencePhase?: "reserve" | "final";
  pageMap?: PagePlacement[];
  issues?: TextbookIssue[];
  qrChecks?: QrReadback[];
  nextPhysicalPageIndex?: number;
  carry?: unknown;
  byteSize?: number;
  /** 실패한 걸음의 사유 */
  error?: string;
}

/** Initial reference measurements are not deliverable pages or final pageMap entries. */
export function artifactRenderSteps(
  steps: readonly StepRow[],
  view: PublishVariant,
): StepRow[] {
  return steps.filter(
    (step) =>
      step.kind === "render" &&
      step.view === view &&
      step.result?.referencePhase !== "reserve",
  );
}

export interface StepRow {
  idx: number;
  kind: "render" | "merge" | "spread" | "offline";
  view: PublishVariant;
  sectionIds: string[];
  state: "queued" | "running" | "done" | "failed";
  attempts: number;
  leaseExpired: boolean;
  firstPageIndex: number | null;
  pageCount: number | null;
  sha256: string | null;
  result: StepResult | null;
}

export interface PublishRequestRow {
  requestId: string;
  userId: string;
  editionId: string;
  state: "open" | "done" | "abandoned";
  baseRevision: number;
  bodyHash: string;
  result: {
    manifestHash?: string;
    failure?: string;
  } | null;
}

export async function loadPublishRequest(
  sql: TextbookSql,
  userId: string,
  editionId: string,
  requestId: string,
  options: { lock?: boolean } = {},
): Promise<PublishRequestRow> {
  const [row] = await sql.query<PublishRequestRow>(
    `SELECT "request_id" AS "requestId", "user_id" AS "userId", "edition_id" AS "editionId", "state",
            "base_revision" AS "baseRevision", "body_hash" AS "bodyHash", "result"
       FROM "textbook_request"
      WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid AND "operation" = 'publish' AND "edition_id" = $3::uuid
      ${options.lock ? "FOR UPDATE" : ""}`,
    [userId, requestId, editionId],
  );
  if (!row) throw notFound("발행 작업");
  return row;
}

export async function loadSteps(
  sql: TextbookSql,
  userId: string,
  requestId: string,
): Promise<StepRow[]> {
  return sql.query<StepRow>(
    `SELECT "idx", "kind", "view", "section_ids" AS "sectionIds", "state", "attempts",
            ("lease_until" IS NOT NULL AND "lease_until" < (now() AT TIME ZONE 'UTC')) AS "leaseExpired",
            "first_page_index" AS "firstPageIndex", "page_count" AS "pageCount", "sha256", "result"
       FROM "textbook_publish_step" WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid ORDER BY "idx"`,
    [userId, requestId],
  );
}

const MIME: Record<TextbookArtifact["kind"], string> = {
  "student-pdf": "application/pdf",
  "answer-pdf": "application/pdf",
  "spread-pdf": "application/pdf",
  "offline-html": "text/html; charset=utf-8",
  "exchange-json": "application/json",
  "exchange-zip": "application/zip",
  "mapping-csv": "text/csv; charset=utf-8",
  "validation-json": "application/json",
};
export const artifactMime = (kind: TextbookArtifact["kind"]): string =>
  MIME[kind];

export async function loadArtifacts(
  sql: TextbookSql,
  editionId: string,
): Promise<TextbookArtifact[]> {
  return sql.query<TextbookArtifact>(
    `SELECT "id", "kind", "mime_type" AS "mimeType", "sha256", "byte_size" AS "byteLength", "page_count" AS "pageCount"
       FROM "textbook_artifact" WHERE "edition_id" = $1::uuid ORDER BY "kind"`,
    [editionId],
  );
}

/** 걸음들이 남긴 막는 사유 — 조판 진단과 실패 사유를 한 목록으로 */
export function stepIssues(steps: readonly StepRow[]): TextbookIssue[] {
  const issues: TextbookIssue[] = [];
  for (const step of steps) {
    for (const entry of step.result?.issues ?? []) issues.push(entry);
    // 조판기가 원고의 사유를 남겼으면 그것이 실패의 까닭이다 — 같은 글을 한 줄로 또 싣지 않는다
    if (
      step.state === "failed" &&
      step.result?.error &&
      !step.result.issues?.length
    )
      issues.push({
        code: "render-failed",
        severity: "error",
        message: step.result.error,
        path: ["steps", step.idx],
      });
  }
  return issues;
}

export function jobStatus(
  request: Pick<PublishRequestRow, "state">,
  steps: readonly StepRow[],
): TextbookPublishJob["status"] {
  if (request.state === "done") return "published";
  if (request.state === "abandoned") return "failed";
  if (
    steps.some(
      (step) => step.state === "failed" && step.attempts >= STEP_MAX_ATTEMPTS,
    ) ||
    stepIssues(steps).some((entry) => entry.severity === "error")
  )
    return "failed";
  if (steps.length && steps.every((step) => step.state === "done"))
    return "ready";
  const renders = steps.filter((step) => step.kind === "render");
  if (renders.length && renders.every((step) => step.state === "done"))
    return "verifying";
  if (steps.some((step) => step.state !== "queued")) return "rendering";
  return "reserved";
}

export async function publishJob(
  sql: TextbookSql,
  request: PublishRequestRow,
  replayed: boolean,
): Promise<TextbookPublishJob> {
  const steps = await loadSteps(sql, request.userId, request.requestId);
  const status = jobStatus(request, steps);
  const issues = stepIssues(steps);
  if (request.state === "abandoned" && request.result?.failure)
    issues.push({
      code: "publish-abandoned",
      severity: "error",
      message: request.result.failure,
      path: [],
    });
  return {
    requestId: request.requestId,
    editionId: request.editionId,
    expectedRevision: request.baseRevision,
    status,
    completedSteps: steps.filter((step) => step.state === "done").length,
    totalSteps: steps.length,
    issues,
    artifacts:
      status === "published" ? await loadArtifacts(sql, request.editionId) : [],
    manifestHash: request.result?.manifestHash ?? null,
    replayed,
  };
}
