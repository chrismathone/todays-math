import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["public/figures", "public/figures-svg"];
const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

// Only these deliberately constructed errors are safe to print. Never surface
// raw Git, filesystem, fetch, HTTP response bodies, or credential-bearing URLs.
export class MigrationError extends Error {}
export function ensure(condition, message) {
  if (!condition) throw new MigrationError(message);
}
export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function git(repo, args) {
  try {
    return execFileSync("git", ["--no-optional-locks", "-C", repo, ...args], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new MigrationError(
      "Git identity check failed; use a committed, clean tracked figure set.",
    );
  }
}
export function validateOriginalPath(originalPath) {
  ensure(
    typeof originalPath === "string" &&
      /^\/(figures|figures-svg)\/[A-Za-z0-9_./-]+$/.test(originalPath),
    "Unsupported original figure path.",
  );
  ensure(
    originalPath
      .split("/")
      .slice(1)
      .every((segment) => segment && segment !== "." && segment !== ".."),
    "Figure path contains traversal or empty segments.",
  );
  const mimeType = MIME_TYPES[path.posix.extname(originalPath).toLowerCase()];
  ensure(mimeType, "Unsupported figure MIME type.");
  return mimeType;
}
export function objectPathFor(originalPath, hash) {
  validateOriginalPath(originalPath);
  ensure(SHA256.test(hash), "Invalid figure SHA256.");
  return `v1/${hash}${originalPath}`;
}
function exactKeys(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...keys].sort().join(",")
  );
}
export function validateManifest(manifest) {
  ensure(
    exactKeys(manifest, ["schemaVersion", "sourceCommit", "entries"]) &&
      manifest.schemaVersion === 1 &&
      COMMIT.test(manifest.sourceCommit),
    "Invalid manifest header.",
  );
  ensure(
    manifest.entries &&
      typeof manifest.entries === "object" &&
      !Array.isArray(manifest.entries),
    "Invalid manifest entries.",
  );
  ensure(
    Object.keys(manifest.entries).length > 0,
    "Empty figure manifests are not allowed.",
  );
  for (const [originalPath, entry] of Object.entries(manifest.entries)) {
    const mimeType = validateOriginalPath(originalPath);
    ensure(
      exactKeys(entry, ["objectPath", "mimeType", "size", "sha256"]),
      "Invalid manifest entry fields.",
    );
    ensure(
      typeof entry.sha256 === "string" && SHA256.test(entry.sha256),
      "Invalid manifest SHA256.",
    );
    ensure(
      Number.isSafeInteger(entry.size) && entry.size >= 0,
      "Invalid manifest size.",
    );
    ensure(
      entry.mimeType === mimeType &&
        entry.objectPath === objectPathFor(originalPath, entry.sha256),
      "Manifest object key or MIME type mismatch.",
    );
  }
  return manifest;
}
export function canonicalManifest(manifest) {
  validateManifest(manifest);
  const entries = Object.fromEntries(
    Object.keys(manifest.entries)
      .sort()
      .map((originalPath) => {
        const {
          objectPath,
          mimeType,
          size,
          sha256: hash,
        } = manifest.entries[originalPath];
        return [originalPath, { objectPath, mimeType, size, sha256: hash }];
      }),
  );
  return `${JSON.stringify({ schemaVersion: 1, sourceCommit: manifest.sourceCommit, entries }, null, 2)}\n`;
}
export function manifestSha256(manifest) {
  return sha256(canonicalManifest(manifest));
}
function snapshot(repo) {
  const commit = git(repo, ["rev-parse", "--verify", "HEAD"]).trim();
  ensure(COMMIT.test(commit), "Invalid current Git revision.");
  git(repo, ["diff", "--quiet", "--no-ext-diff", "HEAD", "--", ...ROOTS]);
  git(repo, [
    "diff",
    "--cached",
    "--quiet",
    "--no-ext-diff",
    "HEAD",
    "--",
    ...ROOTS,
  ]);
  const tree = git(repo, [
    "ls-tree",
    "-r",
    "-z",
    "--full-tree",
    commit,
    "--",
    ...ROOTS,
  ]);
  const records = tree
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const match =
        /^(100644|100755) blob ([a-f0-9]+)\t(public\/(?:figures|figures-svg)\/.+)$/.exec(
          record,
        );
      ensure(
        match,
        "Only regular Git-tracked figure files are allowed (no symlinks or submodules).",
      );
      const originalPath = match[3].slice("public".length);
      validateOriginalPath(originalPath);
      return { originalPath, gitHash: match[2] };
    });
  ensure(records.length, "No Git-tracked public figures found.");
  return {
    commit,
    tree,
    records,
    objectFormat: git(repo, ["rev-parse", "--show-object-format"]).trim(),
  };
}
export async function readFigure(repo, originalPath) {
  validateOriginalPath(originalPath);
  const root = await realpath(repo);
  const segments = ["public", ...originalPath.slice(1).split("/")];
  let current = root;
  for (let index = 0; index < segments.length; index++) {
    current = path.join(current, segments[index]);
    const stat = await lstat(current);
    ensure(
      !stat.isSymbolicLink() &&
        (index === segments.length - 1 ? stat.isFile() : stat.isDirectory()),
      "Figure path must contain only regular files and directories.",
    );
  }
  ensure(
    (await realpath(current)) === current,
    "Figure path resolves through a filesystem link.",
  );
  const handle = await open(
    current,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    ensure((await handle.stat()).isFile(), "Figure is not a regular file.");
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}
function svgLf(bytes, originalPath) {
  // Git's Windows checkout conversion may change SVG line endings. Only use
  // the normalized bytes if they exactly reproduce the committed hash below.
  return path.posix.extname(originalPath).toLowerCase() === ".svg"
    ? Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"))
    : bytes;
}
export async function buildManifest(repo = process.cwd(), sourceCommit) {
  const initial = snapshot(repo);
  const source = sourceCommit ?? initial.commit;
  ensure(COMMIT.test(source), "Invalid source Git revision.");
  if (source !== initial.commit) {
    git(repo, ["merge-base", "--is-ancestor", source, initial.commit]);
    ensure(
      git(repo, [
        "ls-tree",
        "-r",
        "-z",
        "--full-tree",
        source,
        "--",
        ...ROOTS,
      ]) === initial.tree,
      "Tracked figure set differs from the manifest source revision.",
    );
  }
  const entries = {};
  // Local reads are deliberately sequential; memory remains bounded to one image.
  for (const { originalPath, gitHash } of initial.records) {
    let bytes = await readFigure(repo, originalPath);
    const blobHash = (value) =>
      createHash(initial.objectFormat)
        .update(`blob ${value.length}\0`)
        .update(value)
        .digest("hex");
    if (blobHash(bytes) !== gitHash) bytes = svgLf(bytes, originalPath);
    ensure(
      blobHash(bytes) === gitHash,
      "Working figure bytes differ from the committed Git content.",
    );
    const hash = sha256(bytes);
    entries[originalPath] = {
      objectPath: objectPathFor(originalPath, hash),
      mimeType: validateOriginalPath(originalPath),
      size: bytes.length,
      sha256: hash,
    };
  }
  const final = snapshot(repo);
  ensure(
    final.commit === initial.commit && final.tree === initial.tree,
    "Git revision changed during the figure scan.",
  );
  return { schemaVersion: 1, sourceCommit: source, entries };
}
export async function assertManifestSource(repo, manifest) {
  validateManifest(manifest);
  const rebuilt = await buildManifest(repo, manifest.sourceCommit);
  ensure(
    canonicalManifest(rebuilt) === canonicalManifest(manifest),
    "Manifest does not exactly cover the committed figure set and bytes.",
  );
  return git(repo, ["rev-parse", "HEAD"]).trim();
}
export function validateTarget(supabaseUrl, bucket) {
  let url;
  try {
    url = new URL(supabaseUrl);
  } catch {
    throw new MigrationError("Invalid SUPABASE_URL.");
  }
  ensure(
    url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/",
    "SUPABASE_URL must be a credential-free HTTPS origin.",
  );
  ensure(
    typeof bucket === "string" && /^[a-z0-9][a-z0-9_-]{0,62}$/.test(bucket),
    "Invalid storage bucket name.",
  );
  return { supabaseUrl: url.origin, bucket };
}
export function publicObjectUrl(target, objectPath) {
  const normalized = validateTarget(target.supabaseUrl, target.bucket);
  ensure(
    typeof objectPath === "string" && /^v1\/[a-f0-9]{64}\//.test(objectPath),
    "Invalid immutable object key.",
  );
  const originalPath = objectPath.slice(67);
  ensure(
    objectPath === objectPathFor(originalPath, objectPath.slice(3, 67)),
    "Invalid immutable object key.",
  );
  return `${normalized.supabaseUrl}/storage/v1/object/public/${normalized.bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
}
export async function readVerifiedFigure(repo, originalPath, entry) {
  let bytes = await readFigure(repo, originalPath);
  if (bytes.length !== entry.size || sha256(bytes) !== entry.sha256)
    bytes = svgLf(bytes, originalPath);
  ensure(
    bytes.length === entry.size && sha256(bytes) === entry.sha256,
    "Local figure bytes do not match the manifest.",
  );
  return bytes;
}
