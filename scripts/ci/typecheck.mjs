import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  // Always override inherited credentials, including during local verification.
  DATABASE_URL: "postgresql://ci:ci@127.0.0.1:1/typecheck?schema=public",
  DIRECT_URL: "postgresql://ci:ci@127.0.0.1:1/typecheck?schema=public",
};

function run(label, entrypoint, args) {
  console.log(`\n[typecheck] ${label}`);
  const result = spawnSync(
    process.execPath,
    [require.resolve(entrypoint), ...args],
    {
      cwd: root,
      env,
      stdio: "inherit",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.signal) console.error(`${label} stopped by ${result.signal}`);
    process.exit(result.status ?? 1);
  }
}

// Both commands generate local files only; no migration, seed, or application build.
run("Generate Prisma client", "prisma/build/index.js", [
  "generate",
  "--schema",
  "prisma/schema.prisma",
]);
run("Generate Next.js route and ambient types", "next/dist/bin/next", [
  "typegen",
]);

// A missing generated glob must never turn this into a narrower, green check.
const ts = require("typescript");
const configPath = path.join(root, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
  );
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
if (parsed.errors.length) {
  throw new Error(
    parsed.errors
      .map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n"))
      .join("\n"),
  );
}
const included = new Set(parsed.fileNames.map((file) => path.resolve(file)));
for (const file of [
  "next-env.d.ts",
  ".next/types/routes.d.ts",
  ".next/types/validator.ts",
]) {
  const absolute = path.join(root, file);
  if (!ts.sys.fileExists(absolute) || !included.has(absolute)) {
    throw new Error(
      `Required generated type file is missing or excluded from tsconfig.json: ${file}`,
    );
  }
}

run("Check the complete tsconfig.json project", "typescript/bin/tsc", [
  "--project",
  "tsconfig.json",
  "--noEmit",
  "--incremental",
  "false",
  "--pretty",
  "false",
]);
