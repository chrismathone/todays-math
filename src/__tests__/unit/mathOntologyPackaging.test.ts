import { it, expect } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const { nodeFileTrace } = require("next/dist/compiled/@vercel/nft") as {
  nodeFileTrace: (
    entries: string[],
    options: { base: string; processCwd: string },
  ) => Promise<{ fileList: Set<string> }>;
};
it("actual installed NFT traces only literal approved ontology roots, never repository canaries", async () => {
  const root = mkdtempSync(join(tmpdir(), "ontology-nft-boundary-"));
  try {
    const hash = "a".repeat(64);
    const assets = [
      `ontology/model/releases/${hash}/base.json`,
      `ontology/model/releases/${hash}/catalog.json.gz`,
      `ontology/source-manifests/public-v1/${hash}/manifest.json`,
      `ontology/source-manifests/public-v1/${hash}/bank-definition/a.projection.gz`,
    ];
    const canaries = [
      "docs/planning/unrelated.txt",
      "public/figures/unrelated.svg",
      "scripts/qa/unrelated.json",
      "private-canary.txt",
    ];
    for (const path of [...assets, ...canaries]) {
      const file = join(root, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, "synthetic-only");
    }
    const source = ts.createSourceFile(
      "base.ts",
      readFileSync(resolve("src/lib/math-ontology/runtime/base.ts"), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const fn = source.statements.find(
      (n) =>
        ts.isFunctionDeclaration(n) && n.name?.text === "readOntologyAsset",
    );
    if (!fn) throw new Error("MISSING_ASSET_READER");
    const code = ts.transpileModule(
      'import {readFileSync} from "node:fs"; import {resolve} from "node:path";\n' +
        fn.getText(source),
      {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    const entry = join(root, "entry.mjs");
    writeFileSync(entry, code);
    const traced = await nodeFileTrace([entry], {
      base: root,
      processCwd: root,
    });
    for (const asset of assets)
      expect(traced.fileList.has(asset), asset).toBe(true);
    for (const canary of canaries)
      expect(traced.fileList.has(canary), canary).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 30000);
