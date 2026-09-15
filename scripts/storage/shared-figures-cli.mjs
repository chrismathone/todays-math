#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import {
  MigrationError,
  ensure,
  buildManifest,
  canonicalManifest,
  validateManifest,
  validateTarget,
} from "./shared-figures.mjs";
import { transferFigures } from "./transfer.mjs";

const HELP = `Shared public figure migration (Node 20+, Git; no dependencies)

  node scripts/storage/shared-figures-cli.mjs [dry-run] [--manifest FILE]
  node scripts/storage/shared-figures-cli.mjs manifest --out NEW.json
  node scripts/storage/shared-figures-cli.mjs upload --manifest FILE --bucket NAME --receipt NEW.json
  node scripts/storage/shared-figures-cli.mjs verify --manifest FILE --bucket NAME --receipt NEW.json

Optional: --repo DIRECTORY --concurrency 1..16 --retries 0..8 --timeout-ms 1..120000
Defaults: dry-run, concurrency 4, retries 3, timeout 30000ms.
Upload/verify require SUPABASE_URL; upload requires SUPABASE_SECRET_KEY
(sb_secret_...) or legacy SUPABASE_SERVICE_ROLE_KEY (service_role JWT).
A nonempty SUPABASE_SECRET_KEY takes precedence. Public keys cannot upload.
The upload command is the sole remote write opt-in. Verify makes public GETs only.
No .env loading, bucket creation, overwrite, delete, or deployment actions.
Output files must be new .json files; existing manifests and receipts are preserved.
`;
function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  const args = [...argv];
  const command =
    args[0] && !args[0].startsWith("--") ? args.shift() : "dry-run";
  ensure(
    ["dry-run", "manifest", "upload", "verify"].includes(command),
    "Unknown command; see --help.",
  );
  const options = {};
  const names = [
    "repo",
    "manifest",
    "out",
    "bucket",
    "receipt",
    "concurrency",
    "retries",
    "timeout-ms",
  ];
  while (args.length) {
    const flag = args.shift();
    ensure(
      flag.startsWith("--") && names.includes(flag.slice(2)),
      "Unknown option; see --help.",
    );
    const name = flag.slice(2);
    ensure(!Object.hasOwn(options, name), "Duplicate option.");
    const value = args.shift();
    ensure(value && !value.startsWith("--"), "Missing option value.");
    options[name] = value;
  }
  ensure(
    (command === "manifest") === Boolean(options.out),
    "Only manifest accepts and requires --out.",
  );
  ensure(
    command !== "manifest" || !options.manifest,
    "Manifest generation does not accept --manifest.",
  );
  const remote = command === "upload" || command === "verify";
  ensure(
    !remote || (options.manifest && options.bucket && options.receipt),
    "Upload and verify require --manifest, --bucket, and --receipt.",
  );
  ensure(
    remote || (!options.receipt && !options.bucket),
    "Only upload and verify accept --receipt and --bucket.",
  );
  for (const name of ["concurrency", "retries", "timeout-ms"]) {
    if (options[name] !== undefined) {
      ensure(/^\d+$/.test(options[name]), "Expected an integer limit.");
      options[name] = Number(options[name]);
    }
  }
  return { command, options };
}
async function jsonPath(filename, repo) {
  ensure(
    path.extname(filename) === ".json",
    "Manifest and receipt paths must end in .json.",
  );
  const resolved = path.resolve(filename);
  const parent = await realpath(path.dirname(resolved));
  ensure(
    parent === path.dirname(resolved),
    "Output or manifest directory must not resolve through a link.",
  );
  const relative = path
    .relative(await realpath(repo), resolved)
    .split(path.sep)
    .join("/");
  ensure(
    !/^(?:public\/figures|public\/figures-svg)(?:\/|$)/.test(relative),
    "Outputs and manifests cannot be stored in the migrated asset roots.",
  );
  return resolved;
}
async function newOutput(filename, repo) {
  const resolved = await jsonPath(filename, repo);
  let exists = false;
  try {
    await lstat(resolved);
    exists = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  ensure(
    !exists,
    "Output already exists; choose a new manifest or receipt filename.",
  );
  return resolved;
}
export async function main(argv = process.argv.slice(2), env = process.env) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    process.stdout.write(HELP);
    return;
  }
  const { command, options } = parsed;
  const repo = path.resolve(options.repo ?? process.cwd());
  const output =
    options.out || options.receipt
      ? await newOutput(options.out ?? options.receipt, repo)
      : undefined;
  let manifest;
  if (options.manifest) {
    const filename = await jsonPath(options.manifest, repo);
    const stat = await lstat(filename);
    ensure(
      stat.isFile() && !stat.isSymbolicLink() && stat.size <= 32 * 1024 * 1024,
      "Manifest must be a regular JSON file under 32 MiB.",
    );
    manifest = validateManifest(JSON.parse(await readFile(filename, "utf8")));
  } else {
    manifest = await buildManifest(repo);
  }
  if (command === "manifest") {
    await writeFile(output, canonicalManifest(manifest), { flag: "wx" });
    process.stdout.write(
      `${JSON.stringify({ status: "manifest-created", count: Object.keys(manifest.entries).length, sourceCommit: manifest.sourceCommit })}\n`,
    );
    return;
  }
  const remote = command === "upload" || command === "verify";
  const result = await transferFigures({
    repo,
    manifest,
    mode: command,
    target: remote
      ? validateTarget(env.SUPABASE_URL, options.bucket)
      : undefined,
    secretKey: command === "upload" ? env.SUPABASE_SECRET_KEY : undefined,
    serviceRoleKey:
      command === "upload" ? env.SUPABASE_SERVICE_ROLE_KEY : undefined,
    concurrency: options.concurrency,
    retries: options.retries,
    timeoutMs: options["timeout-ms"],
    onProgress: (progress) => {
      if (
        progress.completed % 100 === 0 ||
        progress.completed === progress.total
      )
        process.stderr.write(`${JSON.stringify(progress)}\n`);
    },
  });
  if (output)
    await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, {
      flag: "wx",
    });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof MigrationError ? error.message : "Migration failed; no success receipt was issued. Check local paths and Git state."}\n`,
    );
    process.exitCode = 1;
  });
}
