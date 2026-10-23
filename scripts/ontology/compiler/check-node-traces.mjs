/** Read-only post-build preflight: real unique file bytes, required immutable
 * ontology assets, unexpected broad source trees, and missing regular files.
 * Does not build, start a server, load env files, call models or touch a DB. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { createHash } from "node:crypto";
const root = resolve(process.argv[2] ?? process.cwd());
const budgetBytes = 250_000_000; // conservative decimal-byte gate, not a deployment claim
const readJson = (path) =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));
const required = new Set([
  "ontology/model/releases/catalog.json",
  "ontology/model/tm-owlrl-1.ttl",
  "ontology/model/source-kinds.json",
  "ontology/shapes/runtime-core.ttl",
  "ontology/shapes/full.ttl",
  "ontology/rules/profile.json",
  "scripts/ontology/compiler/requirements.lock",
  "scripts/ontology/compiler/compiler.py",
  "scripts/ontology/compiler/packaged.py",
]);
const integrity = new Map();
const requireAsset = (path, byteHash, bytes) => {
  required.add(path);
  if (byteHash) integrity.set(path, { byteHash, bytes });
};
for (const entry of readJson("ontology/model/releases/catalog.json").bases) {
  requireAsset(entry.path, entry.baseHash);
  const base = readJson(entry.path);
  requireAsset(base.catalog.path, base.catalog.byteHash, base.catalog.bytes);
  requireAsset(
    base.signature.path,
    base.signature.byteHash,
    base.signature.bytes,
  );
  requireAsset(base.sourceManifestPath, base.sourceManifestHash);
  for (const part of base.partitions)
    requireAsset(
      part.artifact.path,
      part.artifact.byteHash,
      part.artifact.bytes,
    );
  const source = readJson(base.sourceManifestPath);
  for (const part of source.partitions) {
    requireAsset(part.nquads.path, part.nquads.byteHash, part.nquads.bytes);
    requireAsset(
      part.projection.path,
      part.projection.byteHash,
      part.projection.bytes,
    );
  }
  for (const index of source.assertionIndexes)
    requireAsset(index.path, index.byteHash, index.bytes);
}
// A path in the trace is not proof that the required readable file exists.
// Directory entries are allowed for dependencies, never for required assets.
const invalidRequired = [];
for (const path of required) {
  try {
    const file = resolve(root, path);
    if (!statSync(file).isFile()) {
      invalidRequired.push({ path, reason: "not-regular-file" });
      continue;
    }
    const content = readFileSync(file),
      expected = integrity.get(path);
    if (
      expected &&
      "sha256:" + createHash("sha256").update(content).digest("hex") !==
        expected.byteHash
    )
      invalidRequired.push({ path, reason: "byte-hash-mismatch" });
    else if (expected?.bytes !== undefined && content.length !== expected.bytes)
      invalidRequired.push({ path, reason: "byte-size-mismatch" });
  } catch {
    invalidRequired.push({ path, reason: "missing-or-unreadable-file" });
  }
}
const app = resolve(root, ".next/server/app");
const traces = readdirSync(app, { recursive: true }).filter(
  (path) =>
    typeof path === "string" &&
    /\.nft\.json$/.test(path) &&
    (/^api\/math-ontology\//.test(path) ||
      /^api\/students\/[^/]+\/math-ontology\//.test(path)),
);
const results = [];
for (const name of traces.sort()) {
  const trace = resolve(app, name),
    entries = readJson(relative(root, trace)).files;
  const paths = new Set(entries.map((file) => resolve(dirname(trace), file)));
  let bytes = 0,
    regularFiles = 0;
  const directories = [],
    missing = [],
    unexpected = [];
  for (const path of paths) {
    const local = relative(root, path);
    try {
      const st = statSync(path);
      if (st.isDirectory()) {
        directories.push(local);
        continue;
      }
      if (!st.isFile()) {
        missing.push(local);
        continue;
      }
      bytes += st.size;
      regularFiles++;
      if (
        /^(?:docs\/|scratch\/|scripts\/qa\/|src\/__tests__\/|public\/(?:figures|figures-svg)\/)/.test(
          local,
        )
      )
        unexpected.push(local);
    } catch {
      missing.push(local);
    }
  }
  const missingRequired = [...required].filter(
    (path) => !paths.has(resolve(root, path)),
  );
  results.push({
    route: name,
    rawEntries: entries.length,
    uniqueEntries: paths.size,
    regularFiles,
    bytes,
    directories,
    missing,
    missingRequired,
    unexpected,
    underBudget: bytes <= budgetBytes,
  });
}
const ok =
  results.length > 0 &&
  invalidRequired.length === 0 &&
  results.every(
    (r) =>
      r.underBudget &&
      !r.missing.length &&
      !r.missingRequired.length &&
      !r.unexpected.length,
  );
console.log(
  JSON.stringify(
    {
      root,
      budgetBytes,
      requiredAssets: [...required].sort(),
      invalidRequired,
      results,
      ok,
    },
    null,
    2,
  ),
);
process.exitCode = ok ? 0 : 1;
