import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import config from "../../../next.config";
const require = createRequire(import.meta.url);
const picomatch = require("next/dist/compiled/picomatch") as (
  pattern: string[],
  options?: { contains: boolean },
) => (path: string) => boolean;
it("only new ontology routes exclude foreign-provider WASM while retaining native PostgreSQL engines and sources", () => {
  expect(Object.keys(config.outputFileTracingExcludes!)).toEqual([
    "/api/math-ontology/**",
    "/api/students/*/math-ontology/**",
  ]);
  const exclusions = config.outputFileTracingExcludes!["/api/math-ontology/**"];
  const match = picomatch(
    exclusions.map((p) => p.replace(/^\.\//, "")),
    { contains: true },
  );
  for (const provider of ["cockroachdb", "mysql", "sqlserver", "sqlite"])
    for (const kind of ["query_engine", "query_compiler"])
      for (const ext of ["js", "mjs"])
        expect(
          match(
            `node_modules/@prisma/client/runtime/${kind}_bg.${provider}.wasm-base64.${ext}`,
          ),
        ).toBe(true);
  for (const path of [
    "node_modules/@prisma/client/runtime/query_engine_bg.postgresql.wasm-base64.js",
    "node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.mjs",
    "node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node",
    "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
    "src/lib/concept-blank/bank/index.ts",
    "prisma/seed-data/units.ts",
    "ontology/model/releases/catalog.json",
  ])
    expect(match(path), path).toBe(false);
  expect(
    config.outputFileTracingIncludes!["/api/math-ontology/**"],
  ).not.toContain("./requirements.txt");
  expect(config.outputFileTracingIncludes!["/api/exam-reports/**"]).toContain(
    "./node_modules/katex/dist/katex.min.css",
  );
});
it("pins the exclusion rationale to the actual PostgreSQL native-library generator configuration", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  expect(schema).toMatch(/datasource db\s*\{\s*provider\s*=\s*"postgresql"/);
  const generated = readFileSync(
    "node_modules/.prisma/client/index.js",
    "utf8",
  );
  expect(generated).toContain('"activeProvider": "postgresql"');
  expect(generated).toContain('"engineType": "library"');
  expect(generated).toContain("config.engineWasm = undefined");
  expect(generated).toContain("config.compilerWasm = undefined");
});
