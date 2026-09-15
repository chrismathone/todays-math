import { lstat, readFile, readdir, realpath, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensure,
  manifestSha256,
  readVerifiedFigure,
  validateManifest,
  validateTarget,
} from "../storage/shared-figures.mjs";

const ROOTS = ["figures", "figures-svg"];

// Kept separate from validation so fixture tests can exercise all fail-closed
// paths without ever touching the checkout's real public assets.
export async function prepareSharedFigures({
  repo = process.cwd(),
  env = process.env,
} = {}) {
  if (env.SHARED_FIGURE_ASSETS_EXTERNALIZED !== "1") return { status: "local" };
  // vercel build can also run on a developer's machine. Restrict source pruning
  // to Vercel's Linux build checkout, not just the easily inherited VERCEL flag.
  const root = await realpath(repo);
  ensure(
    env.VERCEL === "1" && /^\/vercel\/path\d+(?:\/|$)/.test(root),
    "External figure exclusion is only supported in the Vercel cloud build checkout. Unset SHARED_FIGURE_ASSETS_EXTERNALIZED for local builds.",
  );
  return excludeVerifiedFigures(root, env.SHARED_FIGURE_CDN_BASE_URL);
}

export async function excludeVerifiedFigures(repo, cdnBaseUrl) {
  const root = await realpath(repo);
  const config = path.join(root, "src/config");
  const manifest = validateManifest(
    JSON.parse(
      await readFile(path.join(config, "shared-figures.manifest.json"), "utf8"),
    ),
  );
  const receipt = JSON.parse(
    await readFile(path.join(config, "shared-figures.receipt.json"), "utf8"),
  );
  const target = validateTarget(
    receipt.target?.supabaseUrl,
    receipt.target?.bucket,
  );
  const expectedBase = `${target.supabaseUrl}/storage/v1/object/public/${target.bucket}`;
  const entries = Object.entries(manifest.entries);
  const totalBytes = entries.reduce((sum, [, entry]) => sum + entry.size, 0);
  ensure(
    receipt.schemaVersion === 1 &&
      receipt.status === "verified" &&
      receipt.manifestSha256 === manifestSha256(manifest) &&
      receipt.sourceCommit === manifest.sourceCommit &&
      receipt.count === entries.length &&
      receipt.totalBytes === totalBytes &&
      receipt.publicBaseUrl === expectedBase &&
      cdnBaseUrl === expectedBase &&
      Number.isFinite(Date.parse(receipt.verifiedAt)),
    "A complete matching CDN verification receipt is required before excluding shared figures.",
  );

  const originals = [];
  const publicRoot = path.join(root, "public");
  ensure(
    !(await lstat(publicRoot)).isSymbolicLink(),
    "Public root must not be a link.",
  );
  async function inventory(directory, prefix) {
    const info = await lstat(directory);
    ensure(
      info.isDirectory() && !info.isSymbolicLink(),
      "Shared figure directories must not be links.",
    );
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, item.name);
      const original = `${prefix}/${item.name}`;
      ensure(!item.isSymbolicLink(), "Shared figure files must not be links.");
      if (item.isDirectory()) await inventory(absolute, original);
      else {
        ensure(
          item.isFile(),
          "Only regular shared figure files can be excluded.",
        );
        originals.push(original);
      }
    }
  }
  for (const kind of ROOTS)
    await inventory(path.join(publicRoot, kind), `/${kind}`);
  ensure(
    JSON.stringify(originals.sort()) ===
      JSON.stringify(Object.keys(manifest.entries).sort()),
    "The complete local figure inventory must match the verified manifest.",
  );
  // Validate every byte and resolved path before deleting even the first file.
  // No ancestry dependency: cloud Git clones may be shallow long after migration.
  for (const [original, entry] of entries)
    await readVerifiedFigure(root, original, entry);
  for (const original of originals) {
    const absolute = path.resolve(publicRoot, `.${original}`);
    ensure(
      ROOTS.some((kind) =>
        absolute.startsWith(`${path.join(publicRoot, kind)}${path.sep}`),
      ),
      "Figure exclusion escaped its managed directory.",
    );
    await unlink(absolute);
  }
  return { status: "external", count: entries.length, totalBytes };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = await prepareSharedFigures();
    console.log(`[shared figures] ${JSON.stringify(result)}`);
  } catch {
    console.error(
      "Shared figure build preparation failed. Check the CDN configuration, verification receipt, and local asset inventory. No deployment should proceed.",
    );
    process.exitCode = 1;
  }
}
