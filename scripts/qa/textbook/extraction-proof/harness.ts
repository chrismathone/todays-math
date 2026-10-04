/**
 * Extraction proof — shared plumbing.
 *
 * The plan (`textbook-v15-recovery-plan-final-20261005.md` §6) requires a behaviour-preserving
 * split of `render/html.ts` and `server/quickCreate.ts`: "분리 전후 fixture의 HTML과 구획 JSON
 * 바이트가 같아야 한다". Every proof case produces named artifacts (HTML, SQL traces, stored rows,
 * returned JSON, error shapes). Their SHA-256 and byte length are frozen in `*.manifest.json`,
 * written from the PRE-extraction source and never edited by the extraction commit.
 *
 *   TEXTBOOK_EXTRACTION_PROOF=freeze    rewrite the manifest (baseline capture only)
 *   TEXTBOOK_EXTRACTION_PROOF_DUMP=dir  also write every artifact's bytes under `dir`
 *                                       (outside the repo) for a literal `diff -r`
 *
 * Only synthetic bank rows and the committed concept bank feed these fixtures. Hashes are committed;
 * artifact bytes are not.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(
  process.cwd(),
  "scripts",
  "qa",
  "textbook",
  "extraction-proof",
);

export interface ProofManifest {
  /** Commit whose unmodified source produced these digests. */
  baseline: string;
  artifacts: Record<string, { sha256: string; bytes: number }>;
}

export const sha256Hex = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

/** Named artifact bytes. Insertion order is irrelevant; the manifest is sorted by name. */
export class ProofArtifacts {
  readonly entries = new Map<string, string>();
  add(name: string, content: string): void {
    if (this.entries.has(name))
      throw new Error(`Duplicate proof artifact: ${name}`);
    this.entries.set(name, content);
  }
  /** Stable JSON with two-space indentation — readable in a dump, identical across runs. */
  addJson(name: string, value: unknown): void {
    this.add(name, `${JSON.stringify(value, null, 2)}\n`);
  }
}

/** Uniform, comparable shape for a thrown value (class, HTTP status, code and exact message). */
export function errorShape(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { thrown: String(error) };
  const extra = error as Error & {
    status?: unknown;
    code?: unknown;
    details?: unknown;
  };
  return {
    name: error.name,
    message: error.message,
    ...(extra.status === undefined ? {} : { status: extra.status }),
    ...(extra.code === undefined ? {} : { code: extra.code }),
    ...(extra.details === undefined ? {} : { details: extra.details }),
  };
}

export interface ProofDifference {
  missing: string[];
  unexpected: string[];
  changed: string[];
}

/**
 * Compares the artifacts with the frozen manifest (or rewrites it under `freeze`).
 * Returns the differences so the test can assert on an empty report.
 */
export function settleProof(
  name: "render" | "quickCreate",
  artifacts: ProofArtifacts,
  baseline: string,
): ProofDifference {
  const file = path.join(DIR, `${name}.manifest.json`);
  const actual: ProofManifest["artifacts"] = {};
  for (const key of [...artifacts.entries.keys()].sort()) {
    const bytes = Buffer.from(artifacts.entries.get(key)!, "utf8");
    actual[key] = { sha256: sha256Hex(bytes), bytes: bytes.byteLength };
  }
  const dump = process.env.TEXTBOOK_EXTRACTION_PROOF_DUMP;
  if (dump) {
    for (const [key, content] of artifacts.entries) {
      const target = path.join(dump, name, ...key.split("/"));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(content, "utf8"));
    }
  }
  if (process.env.TEXTBOOK_EXTRACTION_PROOF === "freeze") {
    const manifest: ProofManifest = { baseline, artifacts: actual };
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    return { missing: [], unexpected: [], changed: [] };
  }
  const frozen = (JSON.parse(readFileSync(file, "utf8")) as ProofManifest)
    .artifacts;
  return {
    missing: Object.keys(frozen).filter((key) => !(key in actual)),
    unexpected: Object.keys(actual).filter((key) => !(key in frozen)),
    changed: Object.keys(actual).filter(
      (key) =>
        key in frozen &&
        (frozen[key].sha256 !== actual[key].sha256 ||
          frozen[key].bytes !== actual[key].bytes),
    ),
  };
}
