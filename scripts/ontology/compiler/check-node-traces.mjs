/** Read-only post-build preflight: real unique file bytes, required immutable
 * ontology assets, unexpected broad source trees, and missing regular files.
 * Does not build, start a server, load env files, call models or touch a DB. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
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
  "requirements.txt",
  "scripts/ontology/compiler/requirements.lock",
  "scripts/ontology/compiler/compiler.py",
  "scripts/ontology/compiler/packaged.py",
]);
for (const entry of readJson("ontology/model/releases/catalog.json").bases) {
  required.add(entry.path);
  const base = readJson(entry.path);
  required.add(base.catalog.path);
  required.add(base.signature.path);
  required.add(base.sourceManifestPath);
  for (const part of base.partitions) required.add(part.artifact.path);
  const source = readJson(base.sourceManifestPath);
  for (const part of source.partitions) {
    required.add(part.nquads.path);
    required.add(part.projection.path);
  }
  for (const index of source.assertionIndexes) required.add(index.path);
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
  results.every(
    (r) =>
      r.underBudget &&
      !r.missing.length &&
      !r.missingRequired.length &&
      !r.unexpected.length,
  );
console.log(
  JSON.stringify(
    { root, budgetBytes, requiredAssets: [...required].sort(), results, ok },
    null,
    2,
  ),
);
process.exitCode = ok ? 0 : 1;
