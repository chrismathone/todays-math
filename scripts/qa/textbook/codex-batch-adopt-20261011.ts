/** Offline adoption planning; explicit apply orchestrates existing deterministic CLIs only. */
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { DbRetryCheckpoint } from "../../import/textbook/db-retry-20261011/checkpoint";
import type {
  DbRetryCandidate,
  DbRetryOrigin,
} from "../../../src/lib/import/schoolTextbook/dbRetry.types";
import type { CodexDbRetryBatchReview } from "../../../src/lib/import/schoolTextbook/codexRetryBatch.types";
import {
  CODEX_RETRY_BATCH_VERSION,
  verifyCodexBatchCommunication,
} from "../../../src/lib/import/schoolTextbook/codexRetryBatchReview";
import { validateCodexRetryCaseQualification } from "../../../src/lib/import/schoolTextbook/codexRetryCaseQualification";
import {
  reviewDigest,
  retryReviewPayloadDigest,
} from "../../../src/lib/import/schoolTextbook/qualification";
import { textbookVariantSourceDigest } from "../../../src/lib/import/schoolTextbook/variants";
import type { DbRetryProductionRender } from "../../../src/lib/import/schoolTextbook/dbRetryQualificationRows";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const VERSION = "codex-batch-adoption-v1";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown) => reviewDigest(a) === reviewDigest(b);
const requireThat: (condition: unknown, reason: string) => asserts condition = (
  condition,
  reason,
) => {
  if (!condition) throw new Error(reason);
};
const json = <T>(file: string): T =>
  JSON.parse(readFileSync(file, "utf8")) as T;
const hashFile = (file: string) => sha(readFileSync(file));
const bytes = (value: unknown) =>
  Buffer.from(JSON.stringify(value, null, 2) + "\n");

export interface CodexBatchAdoptOptions {
  snapshot: string;
  generationDir: string;
  reviewDir: string;
  out: string;
  apply: boolean;
}
export const CODEX_BATCH_ADOPT_USAGE =
  "tsx scripts/qa/textbook/codex-batch-adopt-20261011.ts --snapshot <local.json> --generation-dir <completed-generation> --review-dir <completed-review> --out <new-adoption-directory> [--apply]";
export function parseCodexBatchAdoptOptions(
  args: string[],
): CodexBatchAdoptOptions {
  const values = new Map<string, string>();
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === "--apply") {
      requireThat(!apply, "duplicate-option");
      apply = true;
    } else {
      requireThat(
        ["--snapshot", "--generation-dir", "--review-dir", "--out"].includes(
          key,
        ),
        "unknown-option",
      );
      requireThat(
        !values.has(key) && args[i + 1] && !args[i + 1].startsWith("--"),
        "missing-or-duplicate-option",
      );
      values.set(key, args[++i]);
    }
  }
  requireThat(values.size === 4, "required-option-missing");
  return {
    snapshot: resolve(values.get("--snapshot")!),
    generationDir: resolve(values.get("--generation-dir")!),
    reviewDir: resolve(values.get("--review-dir")!),
    out: resolve(values.get("--out")!),
    apply,
  };
}

export interface AdoptProcessRequest {
  executable: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  shell: false;
  windowsHide: true;
}
export interface AdoptProcessResult {
  exitCode: number | null;
  stdout?: string;
  stderr?: string;
}
export interface CodexBatchAdoptDependencies {
  runProcess: (request: AdoptProcessRequest) => Promise<AdoptProcessResult>;
  env: Readonly<Record<string, string | undefined>>;
  log?: (value: unknown) => void;
}

/** Allowlist: unknown provider keys/routes, NODE_OPTIONS, proxies and dotenv settings never survive. */
export function adoptionChildEnv(
  env: Readonly<Record<string, string | undefined>>,
): NodeJS.ProcessEnv {
  const allowed =
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|LANG|LC_ALL|TZ|NODE_ENV|DATABASE_URL|DIRECT_URL|DIRECT_DATABASE_URL|SHADOW_DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL|POSTGRES_URL_NON_POOLING|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE|PGSSLMODE|ALLOW_SHARED_IMPORT|SHARED_FIGURE_CDN_BASE_URL|PLAYWRIGHT_BROWSERS_PATH|CHROME_PATH|PUPPETEER_EXECUTABLE_PATH)$/i;
  return Object.fromEntries(
    Object.entries(env).filter(
      ([key, value]) => allowed.test(key) && value !== undefined,
    ),
  ) as NodeJS.ProcessEnv;
}

/** Prisma's generated client loads .env even without a CLI --env-file. Installed before any imports. */
export const ADOPTION_CHILD_PRELOAD = String.raw`"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath } = require("node:url");
const blocked = value => {
  if (typeof value === "number") return false;
  const name = path.basename(value instanceof URL ? fileURLToPath(value) : String(value));
  return /^\.env(?:\.|$)/i.test(name);
};
const denied = () => Object.assign(new Error("dotenv-read-disabled"), { code: "ENOENT" });
const exists = fs.existsSync;
fs.existsSync = function(file) { return blocked(file) ? false : exists.apply(this, arguments); };
for (const key of ["readFileSync", "openSync", "statSync", "accessSync", "createReadStream"]) {
  const original = fs[key];
  fs[key] = function(file) { if (blocked(file)) throw denied(); return original.apply(this, arguments); };
}
for (const key of ["readFile", "open", "stat", "access"]) {
  const original = fs[key];
  fs[key] = function(file, ...args) {
    if (blocked(file)) { const callback = args[args.length - 1]; if (typeof callback === "function") return queueMicrotask(() => callback(denied())); throw denied(); }
    return original.call(this, file, ...args);
  };
  const promiseOriginal = fs.promises[key];
  fs.promises[key] = async function(file, ...args) { if (blocked(file)) throw denied(); return promiseOriginal.call(this, file, ...args); };
}
if (process.loadEnvFile) process.loadEnvFile = () => { throw denied(); };
require("node:module").syncBuiltinESMExports();
`;

function writeOnce(file: string, content: Buffer): void {
  if (existsSync(file)) {
    requireThat(readFileSync(file).equals(content), "existing-output-differs");
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  const fd = openSync(file, "wx", 0o600);
  try {
    writeFileSync(fd, content);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function canonicalPath(file: string): string {
  if (existsSync(file)) return realpathSync(file);
  return join(
    canonicalPath(dirname(file)),
    file.slice(dirname(file).length + 1),
  );
}
function contains(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return (
    !rel || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`))
  );
}
function rejectOutputLinks(directory: string): void {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    requireThat(
      !lstatSync(file).isSymbolicLink(),
      "adoption-output-link-forbidden",
    );
    if (entry.isDirectory()) rejectOutputLinks(file);
  }
}
type Captured = { file: string; content: Buffer; sha256: string };
function collect(options: CodexBatchAdoptOptions) {
  const captured = new Map<string, Captured>();
  const read = <T>(file: string): T => {
    const content = readFileSync(file);
    captured.set(file, { file, content, sha256: sha(content) });
    return JSON.parse(content.toString("utf8")) as T;
  };
  const summary = read<{
    version: string;
    reviewed: number;
    passed: number;
    held: number;
    batches: string[];
    databaseOperations: number;
  }>(join(options.reviewDir, "summary.json"));
  const manifest = read<{
    version: string;
    snapshotDigest: string;
    sourceIds: string[];
    checkpoints: { sourceId: string; sha256: string }[];
    batchSize: number;
  }>(join(options.reviewDir, "manifest.json"));
  const snapshot = read<{
    rows: {
      problem: DbRetryOrigin["problem"];
      unit?: { grade?: string; chapter?: string; section?: string };
      book?: { grade?: string };
    }[];
    children: unknown[];
  }>(options.snapshot);
  const generationManifest = read<{
    version: string;
    runId: string;
    snapshotDigest: string;
  }>(join(options.generationDir, "checkpoint.json"));
  const sourceIds = manifest.sourceIds;
  requireThat(
    summary.version === CODEX_RETRY_BATCH_VERSION &&
      manifest.version === CODEX_RETRY_BATCH_VERSION &&
      summary.databaseOperations === 0,
    "review-version-invalid",
  );
  requireThat(
    Array.isArray(sourceIds) &&
      sourceIds.length <= 256 &&
      sourceIds.every((id) => typeof id === "string" && UUID.test(id)) &&
      new Set(sourceIds.map((id) => id.toLowerCase())).size ===
        sourceIds.length,
    "review-source-ids-invalid",
  );
  requireThat(
    Array.isArray(summary.batches) &&
      summary.batches.every((d) => HASH.test(d)) &&
      new Set(summary.batches).size === summary.batches.length &&
      Number.isInteger(manifest.batchSize) &&
      manifest.batchSize >= 1 &&
      manifest.batchSize <= 16 &&
      summary.batches.length ===
        Math.ceil(sourceIds.length / manifest.batchSize),
    "review-batches-incomplete",
  );
  requireThat(
    Array.isArray(snapshot.rows) && Array.isArray(snapshot.children),
    "snapshot-shape",
  );
  const seen = new Set<string>();
  for (const row of snapshot.rows) {
    requireThat(
      row?.problem &&
        UUID.test(row.problem.id) &&
        !seen.has(row.problem.id.toLowerCase()),
      "snapshot-source-duplicate-or-invalid",
    );
    seen.add(row.problem.id.toLowerCase());
  }
  const snapshotHash = captured.get(options.snapshot)!.sha256;
  requireThat(
    manifest.snapshotDigest === snapshotHash &&
      generationManifest.snapshotDigest === snapshotHash &&
      generationManifest.version === "db-retry-generation-v1" &&
      UUID.test(generationManifest.runId),
    "snapshot-or-generation-manifest-changed",
  );
  requireThat(
    Array.isArray(manifest.checkpoints) &&
      same(
        manifest.checkpoints.map((c) => c.sourceId),
        sourceIds,
      ) &&
      manifest.checkpoints.every((c) => HASH.test(c.sha256)),
    "manifest-checkpoints-invalid",
  );
  const entries = new Map<string, DbRetryCheckpoint>();
  const origins = new Map<string, DbRetryOrigin>();
  for (const id of sourceIds) {
    const row = snapshot.rows.find((row) => row.problem.id === id);
    requireThat(row, "snapshot-source-missing");
    const origin: DbRetryOrigin = {
      problem: row.problem,
      grade: row.unit?.grade ?? row.book?.grade ?? "",
      chapter: row.unit?.chapter ?? "",
      section: row.unit?.section ?? "",
    };
    const file = join(options.generationDir, "sources", id + ".json");
    const entry = read<DbRetryCheckpoint>(file),
      pair = entry.pair;
    requireThat(
      ["generated", "inserting", "inserted"].includes(entry.state) &&
        entry.sourceId === id &&
        entry.sourceDigest === textbookVariantSourceDigest(origin.problem) &&
        entry.originDigest === reviewDigest(origin) &&
        pair &&
        pair.sourceId === id &&
        pair.sourceDigest === entry.sourceDigest &&
        pair.originDigest === entry.originDigest &&
        pair.mathematicalApproval === false &&
        Array.isArray(pair.candidates) &&
        pair.candidates.length === 2 &&
        pair.candidatePayloadDigest === reviewDigest(pair.candidates) &&
        HASH.test(pair.sourceFigureDigest),
      "checkpoint-binding-invalid",
    );
    requireThat(
      Array.isArray(entry.calls) &&
        Number.isInteger(entry.attempts) &&
        entry.attempts >= 0,
      "checkpoint-state-invalid",
    );
    if (entry.state === "generated")
      requireThat(
        captured.get(file)!.sha256 ===
          manifest.checkpoints.find((c) => c.sourceId === id)!.sha256,
        "reviewed-checkpoint-changed",
      );
    else validateOwnership(entry, entry.state === "inserted");
    for (const [index, c] of pair.candidates.entries()) {
      const p = origin.problem;
      requireThat(
        c.slot === index + 1 &&
          c.sourceId === id &&
          c.originProblemId === id &&
          c.sourceDigest === entry.sourceDigest &&
          c.externalId === `tb-retry-v1:${id}:${c.slot}` &&
          c.source === "transformed" &&
          c.unitId === p.unit_id &&
          c.familyKey === p.family_key &&
          c.sourceMaterialId === p.source_material_id &&
          c.questionType === p.question_type &&
          c.sourceExternalId === (p.external_id ?? null) &&
          c.sourceFile === (p.source_file ?? null),
        "candidate-source-or-slot-invalid",
      );
    }
    entries.set(id, entry);
    origins.set(id, origin);
  }
  const reviews: CodexDbRetryBatchReview[] = [],
    selected: string[] = [],
    threads = new Set<string>();
  const batchDir = join(options.reviewDir, "batches");
  requireThat(
    summary.batches.length ===
      (existsSync(batchDir)
        ? readdirSync(batchDir).filter((f) => f.endsWith(".json")).length
        : 0),
    "batch-files-incomplete",
  );
  for (let index = 0; index < summary.batches.length; index++) {
    const file = join(batchDir, `${index + 1}.json`);
    const saved = read<{
        reviewDigest: string;
        review: CodexDbRetryBatchReview;
      }>(file),
      r = saved.review;
    requireThat(
      r &&
        saved.reviewDigest === reviewDigest(r) &&
        r.version === CODEX_RETRY_BATCH_VERSION &&
        r.kind === "machine-codex-batch-blind-review" &&
        r.batchDigest === summary.batches[index] &&
        Array.isArray(r.inputBindings) &&
        Array.isArray(r.cases) &&
        Array.isArray(r.issues) &&
        Array.isArray(r.communications),
      "batch-proof-invalid",
    );
    const ids = sourceIds.slice(
      index * manifest.batchSize,
      (index + 1) * manifest.batchSize,
    );
    requireThat(
      same(
        r.inputBindings.map((b) => b.sourceId),
        ids,
      ) &&
        r.cases.length === ids.length &&
        r.batchDigest ===
          reviewDigest({ version: r.version, inputBindings: r.inputBindings }),
      "batch-binding-invalid",
    );
    for (const call of r.communications) {
      if (call.status !== "succeeded") continue;
      requireThat(
        call.auth === "chatgpt" &&
          call.threadId &&
          !threads.has(call.threadId.trim()),
        "review-session-invalid",
      );
      threads.add(call.threadId.trim());
      verifyCodexBatchCommunication(call, join(options.reviewDir, "artifacts"));
      for (const artifact of [
        call.receipt!.receiptPath,
        call.receipt!.outputPath,
        join(dirname(call.receipt!.receiptPath), "schema.json"),
      ])
        read<unknown>(artifact);
    }
    r.cases.forEach((item, position) => {
      const binding = r.inputBindings[position],
        entry = entries.get(ids[position])!;
      requireThat(
        binding &&
          same(
            Object.fromEntries(
              Object.keys(binding).map((key) => [
                key,
                item[key as keyof typeof item],
              ]),
            ),
            binding,
          ) &&
          binding.caseId === `case-${String(position + 1).padStart(4, "0")}` &&
          binding.questionIndex === position + 1 &&
          binding.sourceDigest === entry.sourceDigest &&
          binding.candidatePayloadDigest ===
            reviewDigest(entry.pair!.candidates) &&
          binding.sourceFigureDigest === entry.pair!.sourceFigureDigest &&
          HASH.test(binding.bindingDigest) &&
          HASH.test(binding.inputDigest) &&
          binding.candidateFigureDigests.length === 2 &&
          binding.candidateFigureDigests.every((d) => HASH.test(d)) &&
          typeof item.passed === "boolean",
        "case-binding-invalid",
      );
      const caseFile = read<Record<string, unknown>>(
        join(options.reviewDir, "cases", item.sourceId + ".json"),
      );
      requireThat(
        same(caseFile, {
          version: r.version,
          kind: r.kind,
          sourceId: item.sourceId,
          caseId: item.caseId,
          questionIndex: item.questionIndex,
          batchDigest: r.batchDigest,
          bindingDigest: item.bindingDigest,
          passed: item.passed,
          issues: item.issues,
          batchPath: file,
          reviewDigest: saved.reviewDigest,
        }),
        "case-file-invalid",
      );
      if (!item.passed) return;
      requireThat(
        !r.issues.length &&
          !item.issues.length &&
          r.communications.length === 3,
        "passed-case-incomplete",
      );
      const parent = origins.get(item.sourceId)!.problem;
      requireThat(
        parent.source === "school_textbook" &&
          parent.pool === "shared" &&
          parent.review_status === "approved" &&
          parent.direct_use_allowed === true &&
          parent.origin_problem_id === null,
        "passed-source-unusable",
      );
      validateCodexRetryCaseQualification(
        origins.get(item.sourceId)!.problem,
        entry.pair!.candidates,
        item,
      );
      const phases = ["blind-solve", "solution-review", "semantic-review"];
      const expected = [
        item.blindSolutions,
        item.solutionReviews,
        item.semanticReviews,
      ];
      r.communications.forEach((call, at) => {
        const raw = call.rawOutput as {
          cases: {
            caseId: string;
            solutions?: { id: string }[];
            reviews?: { id: string }[];
          }[];
        };
        requireThat(
          call.phase === phases[at] &&
            call.status === "succeeded" &&
            Array.isArray(call.caseIds) &&
            new Set(call.caseIds).size === call.caseIds.length &&
            call.caseIds.includes(item.caseId) &&
            call.caseIds.every((id) => r.cases.some((c) => c.caseId === id)) &&
            Array.isArray(raw?.cases) &&
            same(
              raw.cases.map((c) => c.caseId).sort(),
              [...call.caseIds].sort(),
            ),
          "passed-phase-incomplete",
        );
        const values = raw.cases.find((c) => c.caseId === item.caseId);
        const actual = at === 0 ? values?.solutions : values?.reviews;
        requireThat(
          Array.isArray(actual) &&
            same(
              [...actual].sort((a, b) => a.id.localeCompare(b.id)),
              [...expected[at]].sort((a, b) => a.id.localeCompare(b.id)),
            ),
          "passed-output-changed",
        );
      });
      selected.push(item.sourceId);
    });
    requireThat(
      r.passed === r.cases.every((c) => c.passed),
      "batch-verdict-invalid",
    );
    reviews.push(r);
  }
  requireThat(
    summary.reviewed === sourceIds.length &&
      summary.passed === selected.length &&
      summary.held === sourceIds.length - selected.length,
    "summary-incomplete",
  );
  const candidates = selected.flatMap(
    (id) => entries.get(id)!.pair!.candidates,
  );
  requireThat(
    new Set(candidates.map((c) => c.externalId)).size === candidates.length,
    "candidate-duplicate",
  );
  return { captured, reviews, selected, candidates, entries, summary };
}

function validateOwnership(
  entry: DbRetryCheckpoint,
  requireReceipt = true,
): string[] {
  requireThat(
    entry.insertionIds?.length === 2 &&
      entry.insertionIds.every((id) => UUID.test(id)) &&
      new Set(entry.insertionIds.map((id) => id.toLowerCase())).size === 2 &&
      entry.rowPayloadDigest &&
      HASH.test(entry.rowPayloadDigest),
    "ownership-intent-missing",
  );
  if (requireReceipt) {
    const r = entry.receipt;
    requireThat(
      entry.state === "inserted" &&
        r &&
        r.sourceId === entry.sourceId &&
        r.sourceDigest === entry.sourceDigest &&
        r.candidatePayloadDigest === entry.pair?.candidatePayloadDigest &&
        r.rowPayloadDigest === entry.rowPayloadDigest &&
        same(r.ownedIds, entry.insertionIds) &&
        same(
          r.externalIds,
          entry.pair?.candidates.map((c) => c.externalId),
        ) &&
        typeof r.committedAt === "string" &&
        Number.isFinite(Date.parse(r.committedAt)),
      "owned-receipt-invalid",
    );
  }
  return entry.insertionIds;
}

function validateRender(
  file: string,
  packet: string,
  candidates: DbRetryCandidate[],
) {
  const render = json<
    DbRetryProductionRender & {
      version: string;
      inputSha256: string;
      failures: unknown[];
    }
  >(file);
  requireThat(
    render.version === "textbook-production-browser-v1" &&
      render.inputSha256 === hashFile(packet) &&
      render.passed === true &&
      render.rows === candidates.length &&
      render.inspectedCandidates === candidates.length &&
      render.candidateViewportChecks === candidates.length * 4 &&
      render.candidatePayloadSha256 ===
        retryReviewPayloadDigest(candidates.map((c) => ({ ...c }))) &&
      Array.isArray(render.failures) &&
      !render.failures.length &&
      Array.isArray(render.checks) &&
      render.checks.length === 4,
    "renderer-payload-invalid",
  );
  const modes = new Set<string>();
  for (const check of render.checks) {
    const mode = `${check.width}:${check.media}`;
    requireThat(
      ["1440:screen", "390:screen", "1440:print", "390:print"].includes(mode) &&
        !modes.has(mode) &&
        check.rows === candidates.length &&
        check.mathErrors === 0 &&
        check.documentOverflow === false &&
        check.brokenImages === 0 &&
        Array.isArray(check.contentOverflow) &&
        !check.contentOverflow.length,
      "renderer-modes-invalid",
    );
    modes.add(mode);
  }
  return render;
}

type QualificationReceipt = {
  packetFileHash: string;
  reviewsFileHash: string;
  renderFileHash: string;
  ownerReceipts: { file: string; hash: string }[];
  ids: string[];
  pairs: number;
  candidatePayloadDigest: string;
  renderDigest: string;
  reviewDigest: string;
  proofKind: string;
  humanLogsCreated: number;
  appliedAt: string;
  after: {
    id: string;
    externalId: string;
    reviewStatus: string;
    directUseAllowed: boolean;
  }[];
};

export async function runCodexBatchAdopt(
  options: CodexBatchAdoptOptions,
  dependencies: CodexBatchAdoptDependencies,
) {
  const out = canonicalPath(resolve(options.out));
  for (const input of [options.generationDir, options.reviewDir]) {
    const path = canonicalPath(resolve(input));
    requireThat(
      !contains(path, out) && !contains(out, path),
      "output-overlaps-input",
    );
  }
  requireThat(
    !contains(out, canonicalPath(resolve(options.snapshot))),
    "output-overlaps-snapshot",
  );
  requireThat(
    !options.apply || dependencies.env.ALLOW_SHARED_IMPORT === "1",
    "allow-shared-import-required",
  );
  const quiet = () => {
    requireThat(
      !existsSync(join(options.generationDir, ".run.lock")),
      "generation-live-lock",
    );
    requireThat(
      !existsSync(join(options.reviewDir, ".review.lock")),
      "review-live-lock",
    );
  };
  if (options.apply) quiet();
  const cohort = collect(options);
  const { selected, candidates, reviews, entries, captured, summary } = cohort;
  // A wholly held batch may have stopped before phase three. Archive it, but only
  // submit batches containing selected cases to the existing qualification gate.
  // Each submitted batch remains whole, including all of its held siblings.
  const qualificationReviews = reviews.filter((review) =>
    review.cases.some((item) => item.passed),
  );
  const packet = join(out, "packet.json"),
    reviewFile = join(out, "full-reviews.json"),
    allReviewsFile = join(out, "cohort-reviews.json"),
    idsFile = join(out, "source-ids.json"),
    insertion = join(out, "insertion"),
    preload = join(out, "child-no-dotenv.cjs");
  const plan = {
    version: VERSION,
    pairs: selected.length,
    rows: candidates.length,
    held: summary.held,
    sourceIds: selected,
    modelCalls: 0,
    planDatabaseOperations: 0,
    inputs: [...captured.values()].map(({ file, sha256 }) => ({
      file,
      sha256,
    })),
  };
  const existing = existsSync(out) && readdirSync(out).length > 0;
  if (existing)
    requireThat(
      existsSync(join(out, "plan.json")) &&
        readFileSync(join(out, "plan.json")).equals(bytes(plan)),
      "existing-adoption-mismatch",
    );
  rejectOutputLinks(out);
  const qualificationDir = join(out, "qualification"),
    receiptFile = join(qualificationDir, "receipt.json");
  const completed = existsSync(receiptFile);
  const lockPath = join(out, ".adopt.lock");
  requireThat(!existsSync(lockPath), "adoption-live-lock");
  if (!completed) {
    mkdirSync(out, { recursive: true });
    const lock = openSync(lockPath, "wx", 0o600);
    closeSync(lock);
  }
  try {
    const preserve = (file: string, content: Buffer) => {
      if (existing)
        requireThat(
          existsSync(file) && readFileSync(file).equals(content),
          "existing-output-missing-or-changed",
        );
      else writeOnce(file, content);
    };
    preserve(join(out, "plan.json"), bytes(plan));
    preserve(packet, bytes({ candidates }));
    preserve(reviewFile, bytes({ batches: qualificationReviews }));
    preserve(allReviewsFile, bytes({ batches: reviews }));
    preserve(idsFile, bytes(selected));
    preserve(preload, Buffer.from(ADOPTION_CHILD_PRELOAD));
    for (const [index, input] of [...captured.values()].entries())
      preserve(
        join(out, "originals", `${String(index).padStart(4, "0")}.json`),
        input.content,
      );
    const verifyInputs = () => {
      for (const input of captured.values())
        requireThat(
          hashFile(input.file) === input.sha256,
          "input-changed-during-adoption",
        );
      requireThat(
        hashFile(packet) === sha(bytes({ candidates })) &&
          hashFile(reviewFile) ===
            sha(bytes({ batches: qualificationReviews })) &&
          hashFile(allReviewsFile) === sha(bytes({ batches: reviews })) &&
          hashFile(idsFile) === sha(bytes(selected)) &&
          hashFile(preload) === sha(ADOPTION_CHILD_PRELOAD),
        "adoption-payload-changed",
      );
    };
    dependencies.log?.({ ...plan, mode: options.apply ? "apply" : "plan" });
    if (!selected.length) return { status: "empty" as const, plan };
    const ownerFiles = selected.map((id) =>
      join(insertion, "sources", id + ".json"),
    );
    const ownership = () => {
      const mapping = new Map<string, string>();
      for (const [index, file] of ownerFiles.entries()) {
        const current = json<DbRetryCheckpoint>(file),
          original = entries.get(selected[index])!;
        requireThat(
          current.sourceId === original.sourceId &&
            current.sourceDigest === original.sourceDigest &&
            current.originDigest === original.originDigest &&
            same(current.pair, original.pair),
          "inserted-checkpoint-changed",
        );
        const ids = validateOwnership(current);
        current.pair!.candidates.forEach((candidate, slot) =>
          mapping.set(ids[slot], candidate.externalId),
        );
      }
      requireThat(mapping.size === candidates.length, "duplicate-owned-id");
      return mapping;
    };
    const renderPointer = join(out, "render-receipt.json");
    const renderPath = () => {
      const pointer = json<{ file: string; hash: string }>(renderPointer);
      requireThat(
        contains(out, canonicalPath(pointer.file)) &&
          pointer.hash === hashFile(pointer.file),
        "render-receipt-changed",
      );
      validateRender(pointer.file, packet, candidates);
      return pointer.file;
    };
    const verifyReceipt = () => {
      verifyInputs();
      const renderFile = renderPath(),
        render = json<unknown>(renderFile),
        owners = ownership(),
        receipt = json<QualificationReceipt>(receiptFile);
      requireThat(
        receipt.packetFileHash === hashFile(packet) &&
          receipt.reviewsFileHash === hashFile(reviewFile) &&
          receipt.renderFileHash === hashFile(renderFile) &&
          same(
            receipt.ownerReceipts,
            ownerFiles.map((file) => ({ file, hash: hashFile(file) })),
          ) &&
          receipt.proofKind === "machine-codex-batch-blind-review" &&
          receipt.humanLogsCreated === 0 &&
          receipt.pairs === selected.length &&
          receipt.candidatePayloadDigest === reviewDigest(candidates) &&
          receipt.renderDigest === reviewDigest(render) &&
          receipt.reviewDigest === reviewDigest(qualificationReviews) &&
          typeof receipt.appliedAt === "string" &&
          Number.isFinite(Date.parse(receipt.appliedAt)) &&
          Array.isArray(receipt.ids) &&
          same([...receipt.ids].sort(), [...owners.keys()].sort()) &&
          Array.isArray(receipt.after) &&
          receipt.after.length === owners.size &&
          new Set(receipt.after.map((row) => row.id)).size === owners.size &&
          receipt.after.every(
            (row) =>
              owners.get(row.id) === row.externalId &&
              row.reviewStatus === "approved" &&
              row.directUseAllowed === true,
          ),
        "qualification-receipt-invalid",
      );
      return receipt;
    };
    if (existsSync(receiptFile))
      return {
        status: "qualified" as const,
        plan,
        receipt: verifyReceipt(),
        receiptFile,
      };
    requireThat(
      !existsSync(join(out, "qualification-started.json")) &&
        !existsSync(qualificationDir),
      "qualification-receipt-missing-audit-required",
    );
    if (!options.apply) return { status: "planned" as const, plan };
    quiet();
    verifyInputs();
    const stage = async (name: string, args: string[]) => {
      quiet();
      verifyInputs();
      rejectOutputLinks(out);
      const dir = join(out, "stages");
      mkdirSync(dir, { recursive: true });
      const sequence =
        readdirSync(dir).filter((f) => f.endsWith(".started.json")).length + 1;
      const file = join(dir, String(sequence).padStart(4, "0") + "-" + name);
      writeOnce(
        file + ".started.json",
        bytes({
          stage: name,
          startedAt: new Date().toISOString(),
          modelCalls: 0,
        }),
      );
      let result: AdoptProcessResult;
      try {
        result = await dependencies.runProcess({
          executable: process.execPath,
          args: ["--require", preload, ...args],
          cwd: repoRoot,
          env: adoptionChildEnv(dependencies.env),
          shell: false,
          windowsHide: true,
        });
      } catch {
        writeOnce(
          file + ".result.json",
          bytes({ stage: name, status: "launch-failed", modelCalls: 0 }),
        );
        throw new Error(`${name}-failed`);
      }
      // Do not retain arbitrary child text, paths, URLs or error stacks: they can contain credentials.
      writeOnce(
        file + ".result.json",
        bytes({
          stage: name,
          status: result.exitCode === 0 ? "succeeded" : "failed",
          exitCode: result.exitCode,
          stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
          stderrBytes: Buffer.byteLength(result.stderr ?? ""),
          modelCalls: 0,
        }),
      );
      requireThat(result.exitCode === 0, `${name}-failed`);
      quiet();
      verifyInputs();
    };
    if (!existsSync(renderPointer)) {
      const renders = join(out, "renders");
      mkdirSync(renders, { recursive: true });
      const renderDir = join(
        renders,
        String(readdirSync(renders).length + 1).padStart(4, "0"),
      );
      requireThat(!existsSync(renderDir), "render-attempt-exists");
      await stage("renderer", [
        join(repoRoot, "scripts/qa/textbook/retry-render-20261011/run.cjs"),
        "--input",
        packet,
        "--out",
        renderDir,
        "--repo-root",
        repoRoot,
        "--expect-count",
        String(candidates.length),
      ]);
      const file = join(renderDir, "browser-qa.json");
      validateRender(file, packet, candidates);
      writeOnce(renderPointer, bytes({ file, hash: hashFile(file) }));
    }
    const renderFile = renderPath();
    const originalManifest = captured.get(
      join(options.generationDir, "checkpoint.json"),
    )!.content;
    writeOnce(join(insertion, "checkpoint.json"), originalManifest);
    for (const id of selected) {
      const file = join(insertion, "sources", id + ".json");
      if (!existsSync(file)) {
        requireThat(
          !existsSync(join(out, "insertion-started.json")),
          "insertion-checkpoint-lost-audit-required",
        );
        writeOnce(
          file,
          captured.get(join(options.generationDir, "sources", id + ".json"))!
            .content,
        );
      } else {
        const current = json<DbRetryCheckpoint>(file),
          original = entries.get(id)!;
        requireThat(
          current.sourceId === id &&
            current.sourceDigest === original.sourceDigest &&
            current.originDigest === original.originDigest &&
            same(current.pair, original.pair),
          "insertion-checkpoint-changed",
        );
        if (current.state === "inserted") validateOwnership(current);
        else if (current.state === "inserting")
          validateOwnership(current, false);
        else
          requireThat(
            current.state === "generated" && same(current, original),
            "insertion-state-audit-required",
          );
      }
    }
    const allInserted = ownerFiles.every(
      (file) => json<DbRetryCheckpoint>(file).state === "inserted",
    );
    if (!allInserted) {
      writeOnce(
        join(out, "insertion-started.json"),
        bytes({ sourceIds: selected }),
      );
      await stage("insertion", [
        "--import",
        "tsx",
        join(repoRoot, "scripts/import/textbook/db-retry-20261011/cli.ts"),
        "--snapshot",
        options.snapshot,
        "--out",
        insertion,
        "--source-ids",
        idsFile,
        "--limit",
        String(selected.length),
        "--concurrency",
        "1",
        "--apply",
        "--resume",
      ]);
    }
    ownership();
    renderPath();
    verifyInputs();
    quiet();
    // The marker survives process/receipt loss. Never infer success or retry an uncertain DB promotion.
    writeOnce(
      join(out, "qualification-started.json"),
      bytes({
        sourceIds: selected,
        ownerReceipts: ownerFiles.map((file) => ({
          file,
          hash: hashFile(file),
        })),
      }),
    );
    await stage("qualification", [
      "--import",
      "tsx",
      join(repoRoot, "scripts/qa/textbook/codex-batch-qualify-20261011.ts"),
      "--packet",
      packet,
      "--reviews",
      reviewFile,
      "--render",
      renderFile,
      "--out",
      qualificationDir,
      "--generation-dir",
      options.generationDir,
      "--receipt-root",
      join(options.reviewDir, "artifacts"),
      ...ownerFiles.flatMap((file) => ["--owner-receipt", file]),
      "--apply",
    ]);
    const receipt = verifyReceipt();
    return { status: "qualified" as const, plan, receipt, receiptFile };
  } finally {
    if (!completed) unlinkSync(lockPath);
  }
}

const runProcess: CodexBatchAdoptDependencies["runProcess"] = (request) =>
  new Promise((resolveResult, reject) => {
    const child = spawn(request.executable, request.args, {
      cwd: request.cwd,
      env: request.env,
      shell: request.shell,
      windowsHide: request.windowsHide,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = (stdout + chunk.toString("utf8")).slice(-65536);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-65536);
    });
    child.once("error", reject);
    child.once("close", (exitCode) =>
      resolveResult({ exitCode, stdout, stderr }),
    );
  });
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  Promise.resolve()
    .then(() =>
      runCodexBatchAdopt(parseCodexBatchAdoptOptions(process.argv.slice(2)), {
        runProcess,
        env: process.env,
        log: (value) => console.log(JSON.stringify(value)),
      }),
    )
    .then((result) =>
      console.log(
        JSON.stringify({
          status: result.status,
          pairs: result.plan.pairs,
          modelCalls: 0,
        }),
      ),
    )
    .catch((error: unknown) => {
      console.error(
        JSON.stringify({
          status: "adoption-failed",
          reason:
            error instanceof Error && /^[a-z][a-z-]+$/.test(error.message)
              ? error.message
              : "operation-failed",
          modelCalls: 0,
        }),
      );
      process.exitCode = 1;
    });
}
