import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const filename = `ci-typecheck-negative-${randomUUID()}.ts`;
const fixture = path.join(root, "src", filename);

// This is a real source file in the application's existing TypeScript include set.
// Create exclusively so cleanup can never delete a pre-existing source file.
writeFileSync(
  fixture,
  'export const ciTypecheckMustFail: number = "invalid";\n',
  { flag: "wx" },
);
try {
  const result = spawnSync(process.execPath, ["scripts/ci/typecheck.mjs"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const diagnostic = output
    .split(/\r?\n/)
    .find((line) => line.includes(filename) && line.includes("error TS2322:"));
  assert.ok(
    result.status !== null && result.status > 0,
    `CI command accepted invalid TypeScript or did not exit normally:\n${output}`,
  );
  assert.ok(
    diagnostic,
    `CI command failed without reporting the injected type error:\n${output}`,
  );
  console.log(
    `[typecheck proof] CI command exited ${result.status}, as required.\n${diagnostic}`,
  );
} finally {
  unlinkSync(fixture);
}
