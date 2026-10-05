import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run, slash } from "./shell.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUNDS = slash(join(HERE, "..", "lib", "rounds.sh"));
const DRIVER = slash(join(HERE, "..", "run-rounds.sh"));
const CONVERTED = slash(join(HERE, "..", "run-converted.sh"));

/** An output root as the drivers find it, with what earlier rounds left behind. */
function tree() {
  const root = slash(mkdtempSync(join(tmpdir(), "native-recovery-rounds-")));
  const at = (...parts) => join(root, ...parts);
  const t = {
    root,
    request(id, text = "request " + id) {
      mkdirSync(at("probe-requests"), { recursive: true });
      writeFileSync(at("probe-requests", "round-" + id + ".json"), text);
      return t;
    },
    raw(id, ...sources) {
      mkdirSync(at("probes", "round-" + id), { recursive: true });
      for (const source of sources)
        writeFileSync(at("probes", "round-" + id, source + ".json"), "raw " + id + " " + source);
      return t;
    },
    temporary(id) {
      mkdirSync(at("tmp", "round-" + id), { recursive: true });
      return t;
    },
    has: (...parts) => existsSync(at(...parts)),
    read: (...parts) => readFileSync(at(...parts), "utf8"),
    requests: () => (t.has("probe-requests") ? readdirSync(at("probe-requests")).sort() : []),
    stages: () =>
      t.has("logs", "stages.jsonl")
        ? t
            .read("logs", "stages.jsonl")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line))
        : [],
  };
  return t;
}

const next = (root, from) =>
  run('. "$ROUNDS"; next_round "$ROOT" "$FROM"', { ROUNDS, ROOT: root, FROM: from });

test("a free round number is given as it is, in three digits", () => {
  const t = tree();
  for (const [from, id] of [["21", "021"], ["021", "021"], ["7", "007"], ["999", "999"]]) {
    const done = next(t.root, from);
    assert.equal(done.status, 0, done.stderr);
    assert.equal(done.stdout, id + "\n");
  }
});

test("a finished round, an interrupted one, raw containers without a request and a temporary folder are each passed over", () => {
  const t = tree()
    .request("021")
    .raw("021", "a", "b") // finished: every source has its container
    .request("022")
    .raw("022", "a") // interrupted: one of several
    .raw("023", "a") // its request is gone, the containers are not
    .temporary("024"); // something may be extracting there
  assert.equal(next(t.root, "21").stdout, "025\n");
  assert.equal(next(t.root, "22").stdout, "025\n");
  assert.equal(next(t.root, "24").stdout, "025\n");
  assert.equal(next(t.root, "20").stdout, "020\n");
});

test("a number that is not 001..999 is refused, and so is a root with no free number left", () => {
  const t = tree().request("998").raw("999");
  for (const from of ["", "0", "000", "1000", "0021", "2x", "-1", "2 1", "../21"]) {
    const done = next(t.root, from);
    assert.equal(done.status, 2, JSON.stringify(from));
    assert.equal(done.stdout, "");
    assert.match(done.stderr, /next_round: /);
  }
  const full = next(t.root, "998");
  assert.equal(full.status, 3);
  assert.equal(full.stdout, "");
  assert.match(full.stderr, /no free round id/);
  assert.equal(next(t.root, "997").stdout, "997\n");
});

// Stand-ins for the planner and the recognizer. The planner writes the request
// it reports, as plan.mjs does, and writes none for a stage that plans nothing.
function standIns(t) {
  const planner = join(t.root, "planner.sh");
  writeFileSync(
    planner,
    [
      "#!/usr/bin/env bash",
      "# <out root> <stage> <round id> [flags]",
      'if [ -n "${SILENT_PLANNER:-}" ]; then echo "planned something"; exit 0; fi',
      "n=3",
      'case " ${ZERO_STAGES:-} " in *" $2 "*) n=0 ;; esac',
      'if [ "$n" -gt 0 ]; then',
      '  mkdir -p "$1/probe-requests"',
      '  [ ! -e "$1/probe-requests/round-$3.json" ] || { echo "Round exists: $3" >&2; exit 9; }',
      '  echo "request $3 $2 ${*:4}" >"$1/probe-requests/round-$3.json"',
      "fi",
      'echo "{\\"stage\\":\\"$2\\",\\"sources\\":1,\\"probes\\":$n}"',
      "",
    ].join("\n"),
  );
  const recognizer = join(t.root, "recognizer.sh");
  writeFileSync(
    recognizer,
    [
      "#!/usr/bin/env bash",
      "# <out root> <round id>",
      'mkdir -p "$1/probes/round-$2"',
      'echo "raw $2" >"$1/probes/round-$2/a.json"',
      'echo "{\\"stage\\":\\"probe-queue-complete\\",\\"round\\":\\"$2\\"}"',
      '[ "$2" != "${FAIL_ROUND:-none}" ] || exit 7',
      "",
    ].join("\n"),
  );
  return {
    NATIVE_RECOVERY_OUT: t.root,
    NATIVE_RECOVERY_TEST_PLANNER: slash(planner),
    NATIVE_RECOVERY_TEST_RECOGNIZER: slash(recognizer),
  };
}

const drive = (t, driver, args, env = {}) =>
  run('bash "$@"', { ...standIns(t), ...env }, [driver, ...args]);

test("stages after an unfinished round take new numbers and leave every earlier request and container as it was", () => {
  const t = tree()
    .request("021", "old finished request")
    .raw("021", "a", "b")
    .request("022", "old interrupted request")
    .raw("022", "a")
    .raw("023", "orphan");
  const done = drive(t, DRIVER, ["reconstructed", "21", "context", "variants", "quotes+controls"]);
  assert.equal(done.status, 0, done.stderr + done.stdout);
  assert.deepEqual(t.requests(), [
    "round-021.json",
    "round-022.json",
    "round-024.json",
    "round-025.json",
    "round-026.json",
  ]);
  assert.equal(t.read("probe-requests", "round-021.json"), "old finished request");
  assert.equal(t.read("probe-requests", "round-022.json"), "old interrupted request");
  assert.equal(t.read("probes", "round-021", "b.json"), "raw 021 b");
  assert.deepEqual(readdirSync(join(t.root, "probes", "round-022")), ["a.json"]);
  assert.deepEqual(readdirSync(join(t.root, "probes", "round-023")), ["orphan.json"]);
  // The planner was given the stage's own flags and the new number.
  assert.equal(t.read("probe-requests", "round-024.json"), "request 024 context \n");
  assert.equal(t.read("probe-requests", "round-026.json"), "request 026 quotes --controls\n");
  assert.deepEqual(
    t.stages().map((s) => [s.driver, s.scope, s.stage, s.round, s.plannedProbes, s.runnerExit]),
    [
      ["run-rounds", "reconstructed", "context", "024", 3, 0],
      ["run-rounds", "reconstructed", "variants", "025", 3, 0],
      ["run-rounds", "reconstructed", "quotes+controls", "026", 3, 0],
    ],
  );
  assert.match(done.stdout, /rounds-complete next=27\n$/);
});

test("a stage that plans nothing uses no round number and is recorded as such", () => {
  const t = tree().request("021").raw("021", "a");
  const done = drive(t, DRIVER, ["held", "21", "context", "gaps", "terminal", "variants"], {
    ZERO_STAGES: "gaps terminal",
  });
  assert.equal(done.status, 0, done.stderr + done.stdout);
  assert.deepEqual(t.requests(), ["round-021.json", "round-022.json", "round-023.json"]);
  assert.deepEqual(readdirSync(join(t.root, "probes")).sort(), [
    "round-021",
    "round-022",
    "round-023",
  ]);
  assert.deepEqual(
    t.stages().map((s) => [s.stage, s.round, s.plannedProbes, s.runnerExit]),
    [
      ["context", "022", 3, 0],
      ["gaps", null, 0, null],
      ["terminal", null, 0, null],
      ["variants", "023", 3, 0],
    ],
  );
});

test("a recognizer that fails stops the driver with its status, on record, before any later stage", () => {
  const t = tree();
  const done = drive(t, DRIVER, ["held", "5", "context", "variants", "gaps"], { FAIL_ROUND: "006" });
  assert.equal(done.status, 7);
  assert.deepEqual(t.requests(), ["round-005.json", "round-006.json"]);
  assert.deepEqual(
    t.stages().map((s) => [s.stage, s.round, s.runnerExit]),
    [
      ["context", "005", 0],
      ["variants", "006", 7],
    ],
  );
  assert.match(done.stdout, /stage-failed scope=held stage=variants round=006 exit=7/);
  assert.doesNotMatch(done.stdout, /rounds-complete/);
  // Run again, the stages are planned under new numbers: 006 is not touched.
  const again = drive(t, DRIVER, ["held", "6", "variants"]);
  assert.equal(again.status, 0, again.stderr + again.stdout);
  assert.equal(t.read("probe-requests", "round-006.json"), "request 006 variants \n");
  assert.equal(t.read("probe-requests", "round-007.json"), "request 007 variants \n");
});

test("a planner that reports no probe count, or a round number out of range, runs no recognizer", () => {
  const silent = tree();
  const done = drive(silent, DRIVER, ["held", "5", "context"], { SILENT_PLANNER: "1" });
  assert.notEqual(done.status, 0);
  assert.equal(silent.has("probes"), false);
  assert.deepEqual(silent.stages(), []);
  for (const from of ["0", "1000", "x"]) {
    const t = tree();
    const refused = drive(t, DRIVER, ["held", from, "context"]);
    assert.notEqual(refused.status, 0, from);
    assert.deepEqual(t.requests(), []);
    assert.equal(t.has("probes"), false);
  }
});

test("the converted source's driver takes new numbers the same way and asks the planner for that source", () => {
  const t = tree().request("050", "old converted request").raw("050", "a").raw("051", "orphan");
  const done = drive(t, CONVERTED, ["50", "quotes+controls", "gaps"], { ZERO_STAGES: "gaps" });
  assert.equal(done.status, 0, done.stderr + done.stdout);
  assert.equal(t.read("probe-requests", "round-050.json"), "old converted request");
  assert.equal(t.read("probe-requests", "round-052.json"), "request 052 quotes --converted --controls\n");
  assert.deepEqual(
    t.stages().map((s) => [s.driver, s.stage, s.round, s.plannedProbes, s.runnerExit]),
    [
      ["run-converted", "quotes+controls", "052", 3, 0],
      ["run-converted", "gaps", null, 0, null],
    ],
  );
  const failed = drive(t, CONVERTED, ["50", "context"], { FAIL_ROUND: "053" });
  assert.equal(failed.status, 7);
  assert.equal(t.stages().at(-1).runnerExit, 7);
});
