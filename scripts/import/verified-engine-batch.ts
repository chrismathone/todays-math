/**
 * Opt-in R2 §6.1 batch utility. No env loader, connection, CLI side effect, or network call.
 * Root supplies a configured client only after final approval. Legacy imports keep their path.
 * prepare -> commit manifest/preledger -> final Claude approval -> regenerate -> apply.
 * The complete <=138 row batch is serialized and inserted in one transaction.
 */
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { PrismaClient, Prisma } from "@prisma/client";
import {
  DIFFICULTY_LADDER,
  type Difficulty,
} from "../../src/contracts/difficulty";
import {
  nativeFamilyKey,
  parseNativeExternalId,
} from "../../src/contracts/nativeDescriptive.contract";
import { nativeDescriptiveDefinition } from "../../src/lib/engine/nativeDescriptive20261018";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { deadBackslashHits } from "../qa/probe-middle-raw-latex";
import { figurelessPointer } from "../../src/lib/engine/figurelessRow";
import { buildTargetRows, type Plan } from "./load-engine-problems";

export const VERIFIED_BATCH_ROW_CAP = 138;
export const APPROVED_REINFORCEMENT_PLAN_SHA256 =
  "15ecaf3edcea3e018f1e5b20e6e2108654122bb249b4e38e3a5713b7f84211a3";
const HASH = /^[a-f0-9]{64}$/;
const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const sha256 = (bytes: string | Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

export type VerifiedCandidate = {
  externalId: string;
  unitId: string;
  familyKey: string;
  questionType: string;
  difficulty: Difficulty;
  problemType: string;
  content: string;
  answer: string;
  solution: string;
  figureSvg: string | null;
};
export type ManifestEntry = Pick<
  VerifiedCandidate,
  | "externalId"
  | "unitId"
  | "familyKey"
  | "questionType"
  | "difficulty"
  | "problemType"
> & { payloadSha256: string };
export type StoredCandidate = Omit<
  VerifiedCandidate,
  "solution" | "figureSvg"
> & {
  id: string;
  solution: string | null;
  figureSvg: string | null;
  source: string;
  pool: string;
  originProblemId: string | null;
  reviewStatus: string;
  directUseAllowed: boolean;
};

/** This tuple, including actual SVG bytes, is the approved serialization. Never normalize text. */
export function payloadSha256(
  row: Pick<VerifiedCandidate, "content" | "answer"> & {
    solution: string | null;
    figureSvg?: string | null;
  },
): string {
  return sha256(
    JSON.stringify([
      row.content,
      row.answer,
      row.solution,
      row.figureSvg ?? null,
    ]),
  );
}
function entry(row: VerifiedCandidate | StoredCandidate): ManifestEntry {
  return {
    externalId: row.externalId,
    unitId: row.unitId,
    familyKey: row.familyKey,
    questionType: row.questionType,
    difficulty: row.difficulty,
    problemType: row.problemType,
    payloadSha256: payloadSha256(row),
  };
}
const byExternal = (a: { externalId: string }, b: { externalId: string }) =>
  a.externalId < b.externalId ? -1 : a.externalId > b.externalId ? 1 : 0;
export function assertBatchIdentity(row: VerifiedCandidate): void {
  if (
    !UUID.test(row.unitId) ||
    !DIFFICULTY_LADDER.includes(row.difficulty) ||
    !["단답형", "객관식", "서술형"].includes(row.questionType) ||
    !row.problemType ||
    !row.content ||
    !row.answer ||
    !row.solution ||
    !(row.figureSvg === null || typeof row.figureSvg === "string")
  )
    throw new Error(`Invalid candidate fields: ${row.externalId}`);
  const native = parseNativeExternalId(row.externalId);
  if (native) {
    const d = nativeDescriptiveDefinition(native.definitionId);
    if (
      row.familyKey !== nativeFamilyKey(d.definitionId) ||
      row.unitId !== d.unitId ||
      row.questionType !== "서술형" ||
      row.difficulty !== d.difficulty
    )
      throw new Error(`Native identity mismatch: ${row.externalId}`);
  } else {
    const elem =
      /^engine-elem:([^|]+)\|([^|]+)\|([^|]+)\|f([^|]+)\|(단답형|객관식)\|s(-?\d+)$/.exec(
        row.externalId,
      );
    const mid = /^engine-mid:(.+)\|s(-?\d+)\|v(\d+)\|(단답형|객관식)$/.exec(
      row.externalId,
    );
    if (
      elem
        ? row.familyKey !== `elem:${elem[1]}|${elem[3]}|${elem[4]}` ||
          row.questionType !== elem[5]
        : mid
          ? row.familyKey !== `mid:${mid[1]}` || row.questionType !== mid[4]
          : true
    )
      throw new Error(
        `Unsupported or mismatched verified batch namespace: ${row.externalId}`,
      );
  }
  if (
    [row.content, row.answer, row.solution].some(
      (s) => deadBackslashHits(s).length,
    ) ||
    figurelessPointer(row.figureSvg !== null, row.content)
  )
    throw new Error(`Unrenderable candidate: ${row.externalId}`);
}
export function manifestEntries(
  rows: readonly VerifiedCandidate[],
): ManifestEntry[] {
  if (rows.length === 0 || rows.length > VERIFIED_BATCH_ROW_CAP)
    throw new Error("Verified batch must contain 1..138 rows");
  const seen = new Set<string>();
  for (const row of rows) {
    assertBatchIdentity(row);
    if (seen.has(row.externalId))
      throw new Error(`Duplicate externalId: ${row.externalId}`);
    seen.add(row.externalId);
  }
  return rows.map(entry).sort(byExternal);
}
export function serializeManifest(rows: readonly VerifiedCandidate[]): string {
  return `${JSON.stringify(manifestEntries(rows), null, 2)}\n`;
}
export type UnitIdentity = {
  id: string;
  grade: string;
  chapter: string;
  section: string;
};

/** The same source functions feed loading and refresh. No DB lookup or hidden fallback here. */
export async function buildVerifiedCandidates(
  plan: Plan,
  units: readonly UnitIdentity[],
): Promise<VerifiedCandidate[]> {
  if (!plan.targets?.length || plan.sourceReferences?.length)
    throw new Error("Verified batch needs targets and no source references");
  const candidates: VerifiedCandidate[] = [];
  if (!Number.isSafeInteger(plan.seedBase ?? 20260825))
    throw new Error("Verified seed must be a safe integer");
  for (const t of plan.targets) {
    if (
      t.engine === "elem"
        ? !Object.prototype.hasOwnProperty.call(t, "formIds")
        : t.engine === "middle"
          ? !Object.prototype.hasOwnProperty.call(t, "typeKeys")
          : t.engine !== "native-descriptive"
    )
      throw new Error(
        "Verified batch requires explicit formIds/typeKeys/definitionIds; only A/B/C targets allowed",
      );
    const count =
      t.engine === "elem"
        ? (t.perTier ?? 3)
        : (t.variants ?? (t.engine === "native-descriptive" ? 2 : 3));
    if (
      !Number.isSafeInteger(count) ||
      count < 1 ||
      count > VERIFIED_BATCH_ROW_CAP
    )
      throw new Error("Verified variant count must be an integer in 1..138");
    for (const row of buildTargetRows(t, plan.seedBase ?? 20260825)) {
      const native = parseNativeExternalId(row.externalId);
      const matched = units.filter(
        (u) =>
          u.grade === row.grade &&
          u.section === row.section &&
          (t.engine === "middle" || u.chapter === row.chapter),
      );
      if (
        matched.length !== 1 ||
        (native &&
          matched[0]!.id !==
            nativeDescriptiveDefinition(native.definitionId).unitId)
      )
        throw new Error(`Missing/ambiguous/wrong unit: ${row.unitKey}`);
      let figureSvg: string | null = null;
      if (row.figureSpec) {
        const drawn = await renderFigureSpec(row.figureSpec);
        if (!drawn.ok || drawn.droppedDimensions?.length)
          throw new Error(`Incomplete figure: ${row.externalId}`);
        figureSvg = drawn.svg;
      }
      candidates.push({
        externalId: row.externalId,
        unitId: matched[0]!.id,
        familyKey: row.familyKey,
        questionType: row.questionType,
        difficulty: row.difficulty,
        problemType: row.problemType,
        content: row.content,
        answer: row.answer,
        solution: row.solution,
        figureSvg,
      });
    }
  }
  manifestEntries(candidates);
  return candidates;
}

export type BatchEvidence = { planSha256: string; sourceCommit: string };
export type PrewriteRow = ManifestEntry & {
  id: string;
  ownership: "new" | "existing";
};
export type PrewriteLedger = BatchEvidence & {
  version: 1;
  kind: "engine-verified-prewrite";
  batchSha256: string;
  rows: PrewriteRow[];
};
function validateEvidence(e: BatchEvidence): void {
  if (
    e.planSha256 !== APPROVED_REINFORCEMENT_PLAN_SHA256 ||
    !/^[a-f0-9]{40}$/.test(e.sourceCommit)
  )
    throw new Error("Unapproved plan hash or invalid source commit");
}
function sameEntry(a: ManifestEntry, b: ManifestEntry): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
/** No preexisting family can receive extra variants through this path. Reruns may match exactly. */
function validateScope(
  wanted: readonly ManifestEntry[],
  scope: readonly StoredCandidate[],
): void {
  const byId = new Map(wanted.map((e) => [e.externalId, e]));
  const families = new Set(wanted.map((e) => `${e.unitId}|${e.familyKey}`));
  const seen = new Set<string>();
  for (const row of scope) {
    const expected = byId.get(row.externalId);
    if (!expected) {
      if (families.has(`${row.unitId}|${row.familyKey}`))
        throw new Error(
          `Preexisting family outside frozen allowlist: ${row.familyKey}`,
        );
      continue;
    }
    if (
      seen.has(row.externalId) ||
      !sameEntry(expected, entry(row)) ||
      row.source !== "manual" ||
      row.pool !== "shared" ||
      row.originProblemId !== null
    )
      throw new Error(
        `Existing externalId content/metadata conflict: ${row.externalId}`,
      );
    seen.add(row.externalId);
  }
}
/** Root preallocates every UUID before committing this ledger. Existing rows are never owned. */
export function preparePrewriteLedger(
  rows: readonly VerifiedCandidate[],
  scope: readonly StoredCandidate[],
  evidence: BatchEvidence,
  uuid: () => string = randomUUID,
): PrewriteLedger {
  validateEvidence(evidence);
  const entries = manifestEntries(rows);
  validateScope(entries, scope);
  const existing = new Map(scope.map((s) => [s.externalId, s]));
  const ledger: PrewriteLedger = {
    version: 1,
    kind: "engine-verified-prewrite",
    ...evidence,
    batchSha256: sha256(serializeManifest(rows)),
    rows: entries.map((e) => ({
      ...e,
      id: existing.get(e.externalId)?.id ?? uuid(),
      ownership: existing.has(e.externalId) ? "existing" : "new",
    })),
  };
  validateLedger(ledger, entries);
  return ledger;
}
export function serializePrewriteLedger(ledger: PrewriteLedger): string {
  return `${JSON.stringify(ledger, null, 2)}\n`;
}
/** Unique immutable batch artifacts; never overwrite an earlier prepared run. Commit both next. */
export function writePreparedBatch(
  manifestPath: string,
  prewritePath: string,
  rows: readonly VerifiedCandidate[],
  ledger: PrewriteLedger,
): void {
  if (path.resolve(manifestPath) === path.resolve(prewritePath))
    throw new Error("Manifest and prewrite files must differ");
  const manifest = serializeManifest(rows);
  validateLedger(ledger, manifestEntries(rows));
  if (ledger.batchSha256 !== sha256(manifest))
    throw new Error("Prepared batch SHA mismatch");
  for (const [file, bytes] of [
    [manifestPath, manifest],
    [prewritePath, serializePrewriteLedger(ledger)],
  ]) {
    const fd = openSync(file!, "wx");
    try {
      writeFileSync(fd, bytes!);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
}
function validateLedger(
  ledger: PrewriteLedger,
  entries: readonly ManifestEntry[],
): void {
  validateEvidence(ledger);
  if (
    ledger.version !== 1 ||
    ledger.kind !== "engine-verified-prewrite" ||
    !HASH.test(ledger.batchSha256) ||
    !Array.isArray(ledger.rows) ||
    ledger.rows.length !== entries.length
  )
    throw new Error("Invalid prewrite ledger");
  const ids = new Set<string>();
  ledger.rows.forEach((r, i) => {
    if (
      !UUID.test(r.id) ||
      ids.has(r.id) ||
      !["new", "existing"].includes(r.ownership) ||
      !sameEntry(entries[i]!, {
        externalId: r.externalId,
        unitId: r.unitId,
        familyKey: r.familyKey,
        questionType: r.questionType,
        difficulty: r.difficulty,
        problemType: r.problemType,
        payloadSha256: r.payloadSha256,
      })
    )
      throw new Error("Prewrite UUID/allowlist mismatch");
    ids.add(r.id);
  });
}

export type FinalBatchApproval = BatchEvidence & {
  reviewer: "Claude";
  verdict: "approved";
  kind: "final-engine-batch";
  batchSha256: string;
  prewriteSha256: string;
};
export type BatchFiles = {
  repoDir: string;
  manifestPath: string;
  prewritePath: string;
  approvalPath: string;
  planPath: string;
  resultJournalPath: string;
};
function committedBytes(repoDir: string, file: string): Buffer {
  const rel = path.relative(path.resolve(repoDir), path.resolve(repoDir, file));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel))
    throw new Error("Artifact must be inside repository");
  const actual = readFileSync(path.resolve(repoDir, file));
  execFileSync("git", ["ls-files", "--error-unmatch", "--", rel], {
    cwd: repoDir,
    stdio: "pipe",
  });
  const committed = execFileSync("git", ["show", `HEAD:${rel}`], {
    cwd: repoDir,
  });
  if (!actual.equals(committed))
    throw new Error(`Artifact is not committed at HEAD: ${rel}`);
  return actual;
}
function readFrozen(files: BatchFiles): {
  manifest: Buffer;
  ledger: PrewriteLedger;
  approval: FinalBatchApproval;
} {
  const manifest = committedBytes(files.repoDir, files.manifestPath);
  const prewriteBytes = committedBytes(files.repoDir, files.prewritePath);
  const ledger = JSON.parse(prewriteBytes.toString("utf8")) as PrewriteLedger;
  const approval = JSON.parse(
    committedBytes(files.repoDir, files.approvalPath).toString("utf8"),
  ) as FinalBatchApproval;
  const planHash = sha256(committedBytes(files.repoDir, files.planPath));
  validateEvidence(ledger);
  if (
    planHash !== ledger.planSha256 ||
    approval.reviewer !== "Claude" ||
    approval.verdict !== "approved" ||
    approval.kind !== "final-engine-batch" ||
    approval.batchSha256 !== sha256(manifest) ||
    ledger.batchSha256 !== sha256(manifest) ||
    approval.prewriteSha256 !== sha256(prewriteBytes) ||
    approval.planSha256 !== ledger.planSha256 ||
    approval.sourceCommit !== ledger.sourceCommit
  )
    throw new Error("Final approval/plan/source/batch SHA mismatch");
  execFileSync(
    "git",
    ["merge-base", "--is-ancestor", ledger.sourceCommit, "HEAD"],
    { cwd: files.repoDir, stdio: "pipe" },
  );
  return { manifest, ledger, approval };
}

export type BatchTransaction = {
  /** Must include every matching externalId, UUID, and every row of each target unit/family. */
  readScope(
    entries: readonly ManifestEntry[],
    ids: readonly string[],
  ): Promise<StoredCandidate[]>;
  insert(row: VerifiedCandidate, id: string): Promise<void>;
  referenceCounts(id: string): Promise<Record<string, number>>;
  deleteOwned(row: StoredCandidate): Promise<void>;
  lockOwned(row: StoredCandidate): Promise<void>;
};
export type VerifiedBatchStore = {
  transaction<T>(work: (tx: BatchTransaction) => Promise<T>): Promise<T>;
};
export type BatchResult = {
  inserted: string[];
  matched: string[];
  deleted: string[];
  locked: { id: string; references: Record<string, number> }[];
  held: string[];
  absent: string[];
};
const emptyResult = (): BatchResult => ({
  inserted: [],
  matched: [],
  deleted: [],
  locked: [],
  held: [],
  absent: [],
});
function appendEvent(files: BatchFiles, event: Record<string, unknown>): void {
  const dest = path.resolve(files.repoDir, files.resultJournalPath);
  const immutable = [
    files.manifestPath,
    files.prewritePath,
    files.approvalPath,
    files.planPath,
  ].map((f) => path.resolve(files.repoDir, f));
  if (immutable.includes(dest))
    throw new Error("Result journal must not overwrite an approval artifact");
  const fd = openSync(dest, "a");
  try {
    appendFileSync(
      fd,
      `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`,
    );
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
type ExecuteOptions = {
  files: BatchFiles;
  regenerate: () => Promise<VerifiedCandidate[]>;
  apply: boolean;
  allowSharedImport: string | undefined;
};
export async function executeVerifiedBatch(
  options: ExecuteOptions,
  store: VerifiedBatchStore,
  mode: "apply" | "revert" = "apply",
): Promise<BatchResult> {
  // The caller passes just this one gate value; never load .env here.
  if (!options.apply || options.allowSharedImport !== "1")
    throw new Error("--apply and ALLOW_SHARED_IMPORT=1 are required");
  if (mode !== "apply" && mode !== "revert")
    throw new Error("Unknown verified batch operation");
  const { manifest, ledger } = readFrozen(options.files);
  const rows = await options.regenerate();
  const entries = manifestEntries(rows);
  if (serializeManifest(rows) !== manifest.toString("utf8"))
    throw new Error(
      "Regenerated candidates differ from frozen exact allowlist/digest",
    );
  validateLedger(ledger, entries);
  // Re-read immutable artifacts after generation as well (including committed approval bytes).
  const checked = readFrozen(options.files);
  if (
    JSON.stringify(checked.ledger) !== JSON.stringify(ledger) ||
    !checked.manifest.equals(manifest)
  )
    throw new Error("Artifacts changed during regeneration");
  const runId = randomUUID();
  appendEvent(options.files, {
    kind: "started",
    mode,
    runId,
    batchSha256: ledger.batchSha256,
  });
  let committed = false;
  try {
    const result = await store.transaction(async (tx) => {
      const out = emptyResult();
      const scope = await tx.readScope(
        entries,
        ledger.rows.map((r) => r.id),
      );
      if (mode === "apply") validateScope(entries, scope);
      const byExternal = new Map(scope.map((s) => [s.externalId, s]));
      const byId = new Map(scope.map((s) => [s.id, s]));
      // All conflicts are examined before any INSERT, UPDATE, or DELETE.
      for (const owned of ledger.rows) {
        const current = byExternal.get(owned.externalId);
        const idRow = byId.get(owned.id);
        if (
          mode === "apply" &&
          ((current && current.id !== owned.id) ||
            (idRow && idRow.externalId !== owned.externalId) ||
            (owned.ownership === "existing" && !current))
        )
          throw new Error(`Prewrite UUID CAS conflict: ${owned.externalId}`);
      }
      if (mode === "apply") {
        const candidates = new Map(rows.map((r) => [r.externalId, r]));
        for (const owned of ledger.rows) {
          if (byExternal.has(owned.externalId)) {
            out.matched.push(owned.id);
            continue;
          }
          await tx.insert(candidates.get(owned.externalId)!, owned.id);
          out.inserted.push(owned.id);
        }
        const back = await tx.readScope(
          entries,
          ledger.rows.map((r) => r.id),
        );
        validateScope(entries, back);
        for (const owned of ledger.rows) {
          const row = back.find((r) => r.id === owned.id);
          if (
            !row ||
            row.externalId !== owned.externalId ||
            (out.inserted.includes(owned.id) &&
              (!row.directUseAllowed || row.reviewStatus !== "approved"))
          )
            throw new Error(`Readback mismatch: ${owned.externalId}`);
        }
      } else {
        for (const owned of ledger.rows) {
          if (owned.ownership !== "new") continue; // Never delete a preexisting match.
          const row = byId.get(owned.id);
          if (!row) {
            out.absent.push(owned.id);
            continue;
          }
          if (
            !sameEntry(entry(row), {
              externalId: owned.externalId,
              unitId: owned.unitId,
              familyKey: owned.familyKey,
              questionType: owned.questionType,
              difficulty: owned.difficulty,
              problemType: owned.problemType,
              payloadSha256: owned.payloadSha256,
            }) ||
            row.source !== "manual" ||
            row.pool !== "shared" ||
            row.originProblemId !== null
          ) {
            out.held.push(owned.id);
            continue;
          }
          const refs = await tx.referenceCounts(row.id);
          if (
            Object.values(refs).some((n) => !Number.isSafeInteger(n) || n < 0)
          )
            throw new Error("Invalid reference counts");
          if (Object.values(refs).some((n) => n > 0)) {
            await tx.lockOwned(row);
            out.locked.push({ id: row.id, references: refs });
          } else {
            await tx.deleteOwned(row);
            out.deleted.push(row.id);
          }
        }
      }
      return out;
    });
    committed = true;
    appendEvent(options.files, {
      kind: "committed",
      mode,
      runId,
      batchSha256: ledger.batchSha256,
      result,
    });
    return result;
  } catch (error) {
    appendEvent(options.files, {
      kind: committed ? "committed-result-log-failed" : "rolled-back",
      mode,
      runId,
      batchSha256: ledger.batchSha256,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Explicit known references, including SQL-only/no-FK relations. Runtime discovery adds future ones.
export const REQUIRED_PROBLEM_REFERENCES = [
  "problem.origin_problem_id",
  "test_problem.problem_id",
  "problem_answer.problem_id",
  "problem_report.problem_id",
  "problem_review_log.problem_id",
  "basket_item.problem_id",
  "exam_question.problem_id",
  "textbook_problem_snapshot.problem_id",
  "textbook_problem_snapshot.source_ref",
  "textbook_problem_snapshot.source_key",
  "problem_outer_wall_quarantine.problem_id",
] as const;
export type ReferenceColumn = {
  schema: string;
  table: string;
  column: string;
  kind: "scalar" | "source-ref" | "source-key";
};
export function assertReferenceCoverage(
  refs: readonly ReferenceColumn[],
): void {
  const got = new Set(
    refs
      .filter((r) => r.schema === "public")
      .map((r) => `${r.table}.${r.column}`),
  );
  const missing = REQUIRED_PROBLEM_REFERENCES.filter((r) => !got.has(r));
  if (missing.length)
    throw new Error(`Reference discovery incomplete: ${missing.join(", ")}`);
}
const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;
const scalarWhere = (row: StoredCandidate) => ({
  id: row.id,
  externalId: row.externalId,
  unitId: row.unitId,
  familyKey: row.familyKey,
  questionType: row.questionType,
  difficulty: row.difficulty,
  problemType: row.problemType,
  content: row.content,
  answer: row.answer,
  solution: row.solution,
  figureSvg: row.figureSvg,
  source: "manual" as const,
  pool: "shared" as const,
  originProblemId: null,
});

/** Real adapter, not invoked by pure tests or by importing this file. No implicit retries. */
export function createPrismaVerifiedBatchStore(
  prisma: PrismaClient,
): VerifiedBatchStore {
  return {
    transaction: (work) =>
      prisma.$transaction(
        async (tx) => {
          // Prevent content/identity races. Lock references before reading the batch as well.
          await tx.$executeRawUnsafe(
            "LOCK TABLE public.problem IN SHARE ROW EXCLUSIVE MODE",
          );
          let references: ReferenceColumn[] | null = null;
          const discover = async () => {
            if (references) return references;
            const scalar = await tx.$queryRawUnsafe<
              {
                schema: string;
                table: string;
                column: string;
                targetColumn: string;
              }[]
            >(`
        SELECT DISTINCT n.nspname AS "schema", c.relname AS "table", a.attname AS "column", target.attname AS "targetColumn"
        FROM pg_constraint f JOIN pg_class c ON c.oid=f.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
        JOIN LATERAL unnest(f.conkey,f.confkey) AS k(attnum,targetnum) ON true
        JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
        JOIN pg_attribute target ON target.attrelid=f.confrelid AND target.attnum=k.targetnum
        WHERE f.contype='f' AND f.confrelid='public.problem'::regclass
        UNION SELECT c.table_schema,c.table_name,c.column_name,'id' FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
        WHERE c.table_schema='public' AND c.column_name IN ('problem_id','origin_problem_id')`);
            const jsonRefs = await tx.$queryRawUnsafe<
              { schema: string; table: string; column: string }[]
            >(`
        SELECT c.table_schema AS "schema",c.table_name AS "table",c.column_name AS "column" FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
        WHERE c.table_schema='public' AND ((c.column_name='source_ref' AND c.data_type='jsonb') OR (c.table_name='textbook_problem_snapshot' AND c.column_name='source_key'))`);
            if (scalar.some((r) => r.targetColumn !== "id"))
              throw new Error(
                "Unsupported non-id foreign key to problem; reference review required",
              );
            references = [
              ...scalar.map((r) => ({
                schema: r.schema,
                table: r.table,
                column: r.column,
                kind: "scalar" as const,
              })),
              ...jsonRefs.map((r) => ({
                ...r,
                kind:
                  r.column === "source_ref"
                    ? ("source-ref" as const)
                    : ("source-key" as const),
              })),
            ];
            assertReferenceCoverage(references);
            const tables = [
              ...new Set(
                references.map((r) => `${ident(r.schema)}.${ident(r.table)}`),
              ),
            ].sort();
            for (const table of tables)
              await tx.$executeRawUnsafe(
                `LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`,
              );
            return references;
          };
          const select = {
            id: true,
            externalId: true,
            unitId: true,
            familyKey: true,
            questionType: true,
            difficulty: true,
            problemType: true,
            content: true,
            answer: true,
            solution: true,
            figureSvg: true,
            source: true,
            pool: true,
            originProblemId: true,
            reviewStatus: true,
            directUseAllowed: true,
          };
          const adapter: BatchTransaction = {
            async readScope(entries, ids) {
              const got = await tx.problem.findMany({
                where: {
                  OR: [
                    { externalId: { in: entries.map((e) => e.externalId) } },
                    { id: { in: [...ids] } },
                    ...entries.map((e) => ({
                      unitId: e.unitId,
                      familyKey: e.familyKey,
                    })),
                  ],
                },
                select,
              });
              return got as StoredCandidate[];
            },
            async insert(row, id) {
              await tx.problem.create({
                data: {
                  ...row,
                  id,
                  source: "manual",
                  pool: "shared",
                  originProblemId: null,
                  reviewStatus: "approved",
                  directUseAllowed: true,
                  solutionSource: "none",
                  figureSource: row.figureSvg ? "engine" : null,
                },
              });
            },
            async referenceCounts(id) {
              const refs = await discover();
              const result: Record<string, number> = {};
              for (const r of refs) {
                const column = ident(r.column);
                const condition =
                  r.kind === "source-ref"
                    ? `${column}->>'problemId' = $1::text`
                    : r.kind === "source-key"
                      ? `${column} = 'tm:' || $1::text`
                      : `${column}::text = $1::text`;
                const rows = await tx.$queryRawUnsafe<{ count: bigint }[]>(
                  `SELECT count(*) AS count FROM ${ident(r.schema)}.${ident(r.table)} WHERE ${condition}`,
                  id,
                );
                result[`${r.schema}.${r.table}.${r.column}`] = Number(
                  rows[0]!.count,
                );
              }
              return result;
            },
            async deleteOwned(row) {
              const result = await tx.problem.deleteMany({
                where: scalarWhere(row) as Prisma.ProblemWhereInput,
              });
              if (result.count !== 1)
                throw new Error(`Delete CAS failed: ${row.id}`);
            },
            async lockOwned(row) {
              const result = await tx.problem.updateMany({
                where: scalarWhere(row) as Prisma.ProblemWhereInput,
                data: { directUseAllowed: false },
              });
              if (result.count !== 1)
                throw new Error(`Lock CAS failed: ${row.id}`);
            },
          };
          await discover();
          return work(adapter);
          // With table locks acquired first, READ COMMITTED sees reference inserts that finished while
          // discovery waited for a lock. A pre-lock serializable snapshot could omit those rows.
        },
        { isolationLevel: "ReadCommitted", maxWait: 30_000, timeout: 120_000 },
      ),
  };
}
