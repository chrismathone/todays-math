import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const slash = (path) => path.replace(/\\/g, "/");

/**
 * The shell the drivers run in. On Windows a bare `bash` on PATH can be the WSL
 * launcher (System32), which runs nothing of this and prints nothing — the
 * tests would then pass or fail for no reason. Git for Windows' bash is named
 * explicitly, or given by NATIVE_RECOVERY_BASH; elsewhere it is plain `bash`.
 */
function driverShell() {
  if (process.env.NATIVE_RECOVERY_BASH) return process.env.NATIVE_RECOVERY_BASH;
  if (process.platform !== "win32") return "bash";
  const candidates = [
    process.env.ProgramFiles && join(process.env.ProgramFiles, "Git", "bin", "bash.exe"),
    process.env["ProgramFiles(x86)"] &&
      join(process.env["ProgramFiles(x86)"], "Git", "bin", "bash.exe"),
    process.env.LOCALAPPDATA &&
      join(process.env.LOCALAPPDATA, "Programs", "Git", "bin", "bash.exe"),
  ].filter(Boolean);
  const found = candidates.find((path) => existsSync(path));
  assert.ok(
    found,
    "Git for Windows bash.exe not found; set NATIVE_RECOVERY_BASH to its path",
  );
  return found;
}
export const SHELL = driverShell();

// The coreutils the drivers use, whatever PATH this process was started with.
const PATH = 'export PATH="/usr/bin:/bin:$PATH"; ';

/**
 * Runs a script in the drivers' shell and returns what it did. The trailing
 * line proves the shell ran the script at all and carries the script's status.
 */
export function run(script, env, args = []) {
  const done = spawnSync(
    SHELL,
    ["-c", PATH + script + '; echo "ran status=$?"', "_", ...args],
    { env: { ...process.env, ...env }, encoding: "utf8" },
  );
  assert.equal(done.error, undefined, String(done.error));
  assert.equal(done.status, 0, "shell exit " + done.status + ": " + done.stderr);
  const ran = /ran status=(\d+)\s*$/.exec(done.stdout);
  assert.ok(ran, "the shell ran nothing: " + JSON.stringify(done.stdout));
  return {
    status: Number(ran[1]),
    stdout: done.stdout.slice(0, ran.index),
    stderr: done.stderr,
  };
}

/** Runs a script that must succeed and say nothing on stderr. */
export function bash(script, env) {
  const done = run(script, env);
  assert.equal(done.stderr, "");
  assert.equal(done.status, 0, done.stdout);
  return done;
}
