import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { bash, slash } from "./shell.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLEANUP = slash(join(HERE, "..", "lib", "cleanup.sh"));

function tree() {
  const root = slash(mkdtempSync(join(tmpdir(), "native-recovery-tmp-")));
  const make = (...parts) => mkdirSync(join(root, ...parts), { recursive: true });
  return { root, make, has: (...parts) => existsSync(join(root, ...parts)) };
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
