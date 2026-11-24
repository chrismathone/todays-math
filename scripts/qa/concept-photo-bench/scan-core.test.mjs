import test from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  validateRead,
  consensus,
  reconcile,
  scoreRead,
  tokenCost,
  rankRows,
  compareTranscription,
} from "./scan-core.mjs";

test("score-only typography does not change reference or twice normalization", () => {
  assert.notEqual(normalize("×4"), normalize("X 4"));
  assert.equal(
    compareTranscription("×4", "X 4", { numericMultiplier: true }).equal,
    true,
  );
  assert.equal(compareTranscription("×4", "X 4").equal, false);
  assert.equal(compareTranscription("사이이다.", "사이이다").equal, true);
  assert.equal(compareTranscription("1.2", "12").equal, false);
  assert.equal(
    compareTranscription("오른 구간 = 9시", "오른 구간:9시", {
      textLabels: ["오른구간"],
    }).equal,
    true,
  );
  assert.equal(compareTranscription("x=2", "x:2").equal, false);
  assert.deepEqual(
    compareTranscription("60°", "60", { handwrittenAngle: true }),
    { equal: false, unitOmission: true },
  );
  assert.equal(compareTranscription("8,5", "8,15").equal, false);
  assert.equal(compareTranscription("작다", "작아").equal, false);
});
import { childEnv } from "./scan-cli.mjs";

test("post-run degree glyph correction is opt-in and cannot erase a different angle or prime", () => {
  const angle = { handwrittenAngle: true };
  const late = { allowDegreeRing: true };
  assert.notEqual(normalize("60°"), normalize("60˚"));
  assert.equal(compareTranscription("60°", "60˚", angle).equal, false);
  assert.equal(compareTranscription("60°", "60˚", angle, late).equal, true);
  assert.equal(compareTranscription("60°", "61˚", angle, late).equal, false);
  assert.equal(compareTranscription("60°", "60'", angle, late).equal, false);
  assert.equal(compareTranscription("60°", "60˚", {}, late).equal, false);
});

test("equivalent typography only; meaning-changing differences stay different", () => {
  assert.equal(normalize("120 도"), normalize("$120^{\\circ}$"));
  assert.equal(normalize("나누어 떨어짐"), normalize("나누어떨어짐"));
  for (const [a, b] of [
    ["1.2", "12"],
    ["-3", "3"],
    ["1/2", "2/4"],
    ["약수", "배수"],
    ["3cm", "3"],
    ["1,2", "2,1"],
  ])
    assert.notEqual(normalize(a), normalize(b));
});
const entry = (id, text, status = "read") => ({
  id,
  text,
  status,
  tags: ["clear"],
});
test("duplicate/unknown ids and inconsistent blank values are schema failures", () => {
  assert.throws(() =>
    validateRead({ slots: [entry("q1.b1", "a"), entry("q1.b1", "b")] }),
  );
  assert.throws(() => validateRead({ slots: [entry("q1.b1", "a", "blank")] }));
  assert.throws(() =>
    validateRead({ slots: [entry("q1.b1", "a")] }, ["q2.b1"]),
  );
});
test("reference disagreements and missing slots never become guessed truth", () => {
  const a = {
    slots: [
      entry("q1.b1", "120°"),
      entry("q2.b1", "a"),
      entry("q3.b1", "", "unreadable"),
      entry("q4.b1", "4"),
    ],
  };
  const b = {
    slots: [
      entry("q1.b1", "120도"),
      entry("q2.b1", "b"),
      entry("q3.b1", "", "unreadable"),
    ],
  };
  const rows = consensus(a, b);
  assert.equal(rows.filter((x) => x.referenceStatus === "candidate").length, 1);
  assert.equal(
    rows.filter((x) => x.referenceStatus === "human-review").length,
    3,
  );
  assert.deepEqual(
    consensus({ slots: [] }, { slots: [] }, ["q1.b1"]).map(
      (x) => x.referenceStatus,
    ),
    ["human-review"],
  );
});
test("two reads preserve matching blanks and abstain on disagreement/missing", () => {
  const r = reconcile(
    { slots: [entry("q1.b1", "a"), entry("q2.b1", "", "blank")] },
    { slots: [entry("q1.b1", "b"), entry("q2.b1", "", "blank")] },
    ["q1.b1", "q2.b1", "q3.b1"],
  );
  assert.deepEqual(
    r.slots.map((x) => x.status),
    ["uncertain", "blank", "uncertain"],
  );
});
test("all cells remain counted; unknown references cannot inflate accuracy", () => {
  const truth = [1, 2, 3, 4, 5].map((i) => ({
    ...entry(`q${i}.b1`, `${i}`),
    referenceStatus: i === 5 ? "human-review" : "candidate",
  }));
  const got = {
    slots: [
      entry("q1.b1", "1"),
      entry("q2.b1", "9"),
      entry("q3.b1", "", "unreadable"),
    ],
  };
  const scored = scoreRead(truth, got);
  assert.deepEqual(
    [
      scored.correct,
      scored.wrong,
      scored.abstain,
      scored.missing,
      scored.unresolved,
    ],
    [1, 1, 1, 1, 1],
  );
  assert.equal(scored.errors.length, 1);
});
test("cache input counted once, output reasoning not added twice", () => {
  assert.equal(
    tokenCost("claude-opus-5-5", [
      {
        usage: {
          input_tokens: 10,
          cache_read_input_tokens: 20,
          cache_creation_input_tokens: 30,
          output_tokens: 40,
          reasoning_tokens: 25,
        },
      },
    ]).usd,
    0.00104,
  );
  assert.equal(tokenCost("claude-opus-5-5", [{}]).usd, null);
});
test("subscription child environment excludes API/provider overrides", () => {
  const env = childEnv({
    PATH: "p",
    CLAUDE_CONFIG_DIR: "oauth",
    ANTHROPIC_API_KEY: "secret",
    ANTHROPIC_BASE_URL: "override",
    CLAUDE_CODE_USE_BEDROCK: "1",
    OPENAI_API_KEY: "secret",
    ORCA_X: "x",
  });
  assert.deepEqual(env, { PATH: "p", CLAUDE_CONFIG_DIR: "oauth" });
});
test("ranking never recommends a failing or incomplete row", () => {
  const rows = [
    {
      id: "broken",
      wrong: 0,
      abstain: 0,
      missing: 10,
      failures: 1,
      complete: true,
    },
    { id: "ok", wrong: 1, abstain: 1, missing: 0, failures: 0, complete: true },
    {
      id: "unfinished",
      wrong: 0,
      abstain: 0,
      missing: 0,
      failures: 0,
      complete: false,
    },
  ];
  assert.equal(rankRows(rows)[0].id, "ok");
});
