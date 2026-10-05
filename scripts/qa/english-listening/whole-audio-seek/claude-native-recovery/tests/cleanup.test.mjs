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

function tree() {
  const root = slash(mkdtempSync(join(tmpdir(), "native-recovery-tmp-")));
  const make = (...parts) => mkdirSync(join(root, ...parts), { recursive: true });
  return { root, make, has: (...parts) => existsSync(join(root, ...parts)) };
}

const bash = (script, env) =>
  spawnSync("bash", ["-c", script], { env: { ...process.env, ...env }, encoding: "utf8" });

const cleanup = (root, round) =>
  bash('. "$CLEANUP"; cleanup_round "$ROOT" "$ROUND"; echo "status=$?"', {
    CLEANUP,
    ROOT: root,
    ROUND: round,
  });

test("a round's cleanup leaves another round's freshly made, still empty extraction folder alone", () => {
  const t = tree();
  // Round 020 is extracting: its source folder exists and holds nothing yet.
  t.make("tmp", "round-020", "ebs-middle-2-2006-1");
  // Round 044 has just finished and left its own folder empty.
  t.make("tmp", "round-044");
  const done = cleanup(t.root, "044");
  assert.match(done.stdout, /status=0/);
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

test("a round that still holds a source's clips is kept for whoever resumes it", () => {
  const t = tree();
  t.make("tmp", "round-021", "ebs-middle-1-2016-2");
  cleanup(t.root, "021");
  assert.equal(t.has("tmp", "round-021", "ebs-middle-1-2016-2"), true);
});

test("a round id that is not a plain id, a missing root or a missing folder removes nothing", () => {
  const t = tree();
  t.make("tmp", "round-020");
  t.make("other");
  for (const round of ["", "../other", "020/..", "0 20", "*"]) {
    assert.match(cleanup(t.root, round).stdout, /status=0/);
    assert.equal(t.has("tmp", "round-020"), true);
    assert.equal(t.has("other"), true);
  }
  assert.match(cleanup(t.root + "/nowhere", "020").stdout, /status=0/);
  assert.match(cleanup(t.root, "099").stdout, /status=0/);
  assert.equal(t.has("tmp", "round-020"), true);
});
