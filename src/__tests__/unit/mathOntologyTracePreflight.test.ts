import { it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
const script = resolve("scripts/ontology/compiler/check-node-traces.mjs");
const required = [
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
];
it("rejects a required compiler path replaced by a directory but permits nonrequired dependency directories", () => {
  const root = mkdtempSync(join(tmpdir(), "ontology-preflight-"));
  try {
    for (const path of required) {
      const file = join(root, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(
        file,
        path.endsWith("catalog.json") ? '{"bases":[]}' : "synthetic-only",
      );
    }
    const dependency = "node_modules/@prisma/client";
    mkdirSync(join(root, dependency), { recursive: true });
    const trace = join(
      root,
      ".next/server/app/api/math-ontology/assist/route.js.nft.json",
    );
    mkdirSync(dirname(trace), { recursive: true });
    writeFileSync(
      trace,
      JSON.stringify({
        files: [...required, dependency].map((p) =>
          relative(dirname(trace), join(root, p)),
        ),
      }),
    );
    const run = () =>
      spawnSync(process.execPath, [script, root], {
        encoding: "utf8",
        timeout: 5000,
      });
    const good = run();
    expect(good.status).toBe(0);
    expect(JSON.parse(good.stdout).ok).toBe(true);
    const compiler = join(root, "scripts/ontology/compiler/compiler.py");
    rmSync(compiler);
    mkdirSync(compiler);
    const bad = run();
    expect(bad.status).toBe(1);
    expect(JSON.parse(bad.stdout).ok).toBe(false);
    expect(JSON.parse(bad.stdout).invalidRequired).toContainEqual({
      path: "scripts/ontology/compiler/compiler.py",
      reason: "not-regular-file",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

import { createHash } from "node:crypto";
it("rejects changed pinned artifact bytes even when every traced required path remains present", () => {
  const root = mkdtempSync(join(tmpdir(), "ontology-preflight-hash-"));
  const hash = (s: string) =>
    "sha256:" + createHash("sha256").update(s).digest("hex");
  const put = (p: string, s: string) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), s);
  };
  try {
    for (const path of required) put(path, "synthetic-only");
    const basePath = "ontology/model/releases/" + "a".repeat(64) + "/base.json";
    const artifactPath =
      "ontology/model/releases/" + "a".repeat(64) + "/catalog.json.gz";
    const sourcePath =
      "ontology/source-manifests/public-v1/" +
      "a".repeat(64) +
      "/manifest.json";
    const source = JSON.stringify({ partitions: [], assertionIndexes: [] });
    put(sourcePath, source);
    const artifact = "synthetic-only";
    put(artifactPath, artifact);
    const descriptor = {
      path: artifactPath,
      byteHash: hash(artifact),
      bytes: Buffer.byteLength(artifact),
    };
    const base = JSON.stringify({
      catalog: descriptor,
      signature: descriptor,
      partitions: [],
      sourceManifestPath: sourcePath,
      sourceManifestHash: hash(source),
    });
    put(basePath, base);
    put(
      "ontology/model/releases/catalog.json",
      JSON.stringify({ bases: [{ path: basePath, baseHash: hash(base) }] }),
    );
    const trace = ".next/server/app/api/math-ontology/assist/route.js.nft.json";
    put(
      trace,
      JSON.stringify({
        files: [...required, basePath, artifactPath, sourcePath].map((p) =>
          relative(dirname(join(root, trace)), join(root, p)),
        ),
      }),
    );
    const run = () =>
      spawnSync(process.execPath, [script, root], {
        encoding: "utf8",
        timeout: 5000,
      });
    expect(run().status).toBe(0);
    put(artifactPath, "synthetic-onlz");
    const bad = run();
    expect(bad.status).toBe(1);
    expect(JSON.parse(bad.stdout).invalidRequired).toContainEqual({
      path: artifactPath,
      reason: "byte-hash-mismatch",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
