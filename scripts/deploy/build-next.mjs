import { spawnSync } from "node:child_process";
import { planBuild } from "./build-next-plan.mjs";

// tsc first, then next build — each in its own process, so the type checker and
// Turbopack are never in memory together (see build-next-plan.mjs).
for (const step of planBuild({
  env: process.env,
  argv: process.argv.slice(2),
  execPath: process.execPath,
  cwd: process.cwd(),
})) {
  const result = spawnSync(step.command, step.args, { stdio: "inherit", env: step.env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
