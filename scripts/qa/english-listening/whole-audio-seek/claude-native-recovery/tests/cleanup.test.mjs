import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const slash = (path) => path.replace(/\\/g, "/");
const CLEANUP = slash(join(HERE, "..", "lib", "cleanup.sh"));

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
const SHELL = driverShell();

function tree() {
  const root = slash(mkdtempSync(join(tmpdir(), "native-recovery-tmp-")));
  const make = (...parts) => mkdirSync(join(root, ...parts), { recursive: true });
  return { root, make, has: (...parts) => existsSync(join(root, ...parts)) };
}

/** Runs a script in the drivers' shell; a shell that did not run it fails here, loudly. */
function bash(script, env) {
  const done = spawnSync(
    SHELL,
    // The coreutils the drivers use, whatever PATH this process was started with.
    ["-c", 'export PATH="/usr/bin:/bin:$PATH"; ' + script + '; echo "ran status=$?"'],
    { env: { ...process.env, ...env }, encoding: "utf8" },
  );
  assert.equal(done.error, undefined, String(done.error));
  assert.equal(done.status, 0, "shell exit " + done.status + ": " + done.stderr);
  assert.equal(done.stderr, "");
  assert.match(done.stdout, /ran status=0\s*$/);
  return done;
}

const cleanup = (root, round) =>
  bash('. "$CLEANUP"; cleanup_round "$ROOT" "$ROUND"', { CLEANUP, ROOT: root, ROUND: round });

test("the tests run in the drivers' own shell, which has the tools the drivers use", () => {
  const done = bash("command -v rmdir find >/dev/null && uname -s");
  assert.match(done.stdout, /^(MINGW|MSYS|Linux|Darwin)/);
});

test("a round's cleanup leaves another round's freshly made, still empty extraction folder alone", () => {
  const t = tree();
  // Round 020 is extracting: its source folder exists and holds nothing yet.
  t.make("tmp", "round-020", "ebs-middle-2-2006-1");
  // Round 044 has just finished and left its own folder empty.
  t.make("tmp", "round-044");
  cleanup(t.root, "044");
  assert.equal(t.has("tmp", "round-044"), false);
  assert.equal(t.has("tmp", "round-020", "ebs-middle-2-2006-1"), true);
  assert.equal(t.has("tmp"), true);
});

test("the sweep it replaces did remove that folder, and a marker file is what stops any such sweep", () => {
  const SWEEP = 'find "$ROOT/tmp" -type d -empty -delete';
  const bare = tree();
  bare.make("tmp", "round-020", "ebs-middle-2-2006-1");
  bash(SWEEP, { ROOT: bare.root });
  // The failure of 2026-10-06: the first clip then had no folder to be written into.
  assert.equal(bare.has("tmp", "round-020", "ebs-middle-2-2006-1"), false);
  const marked = tree();
  marked.make("tmp", "round-020", "ebs-middle-2-2006-1");
  writeFileSync(join(marked.root, "tmp", "round-020", "ebs-middle-2-2006-1", ".extracting"), "1");
  bash(SWEEP, { ROOT: marked.root });
  assert.equal(marked.has("tmp", "round-020", "ebs-middle-2-2006-1", ".extracting"), true);
});

test("a round that still holds a source's clips is kept, and an emptied one is then removed", () => {
  const t = tree();
  t.make("tmp", "round-021", "ebs-middle-1-2016-2");
  cleanup(t.root, "021");
  assert.equal(t.has("tmp", "round-021", "ebs-middle-1-2016-2"), true);
  // The same call does remove the folder once nothing is left in it.
  const emptied = tree();
  emptied.make("tmp", "round-021");
  cleanup(emptied.root, "021");
  assert.equal(emptied.has("tmp", "round-021"), false);
});

test("a round id that is not a plain id, a missing root or a missing folder removes nothing", () => {
  const t = tree();
  t.make("tmp", "round-020");
  t.make("other");
  for (const round of ["", "../other", "020/..", "0 20", "*"]) {
    cleanup(t.root, round);
    assert.equal(t.has("tmp", "round-020"), true);
    assert.equal(t.has("other"), true);
  }
  cleanup(t.root + "/nowhere", "020");
  cleanup(t.root, "099");
  assert.equal(t.has("tmp", "round-020"), true);
  // And the plain id of that very folder does remove it: the calls above ran.
  cleanup(t.root, "020");
  assert.equal(t.has("tmp", "round-020"), false);
});
