import { spawnSync } from "node:child_process";
import path from "node:path";

// Match the existing type-check budget. Next forwards NODE_OPTIONS to its
// TypeScript worker; a parent-only CLI flag can be overridden by inherited options.
// Keep other options, and scope this budget to the build process and its workers.
const nodeOptions = `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=8192`.trim();
const result = spawnSync(
  process.execPath,
  [path.resolve("node_modules/next/dist/bin/next"), "build", ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, NODE_OPTIONS: nodeOptions } },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
