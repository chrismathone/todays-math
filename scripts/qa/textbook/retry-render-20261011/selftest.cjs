/** Meaningful fixture gates for fields absent from the current 1656 packet. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { run, normalizePacket } = require("./run.cjs");
const { runBrowser } = require("./browser_qa.cjs");
const svg = (label, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 100"><path d="M20 80 L90 20 L160 80 Z" fill="none" stroke="black"/><text x="80" y="18" font-size="12">${label}</text>${extra}</svg>`;
const image = (label) =>
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="white"/><text x="15" y="40" font-size="18">${label}</text></svg>`,
  ).toString("base64");
const row = (sourceId, extra = {}) => ({
  sourceId,
  externalId: `fixture:${sourceId}:1`,
  slot: 1,
  content: "값 $2+3$을 구하시오.",
  answer: "$5$",
  solution: "$2+3=5$이다.",
  figureSvg: null,
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  choiceFigureIndex: [],
  ...extra,
});

async function main() {
  const [
    repoRoot = process.cwd(),
    evidence = "docs/planning/tracks/reports/textbook-retry-render-20261011/selftest",
  ] = process.argv.slice(2);
  const runtime = path.resolve(evidence, "runtime");
  fs.mkdirSync(runtime, { recursive: true });
  const good = [
    row("svg", {
      content: "그림의 점 $A$를 확인하시오. [그림]",
      figureSvg: svg("A"),
    }),
    row("choice-grid", {
      content: "알맞은 그림을 고르시오.\n① [그림]\n② [그림]",
      answer: "①",
      figureUrls: [image("first"), image("second")],
      figureDims: [120, 80, 120, 80],
      figureSourceMm: [20, 20],
      choiceFigureIndex: [1, 2],
    }),
    row("choice-loose", {
      content: "자료를 보고 고르시오. [그림]\n① $1$\n② $2$",
      answer: "②",
      figureUrls: [image("stem"), image("choice two")],
      figureDims: [120, 80, 120, 80],
      figureSourceMm: [20, 30],
      choiceFigureIndex: [0, 2],
    }),
  ];
  const goodInput = path.join(runtime, "good.json"),
    badInput = path.join(runtime, "bad.json");
  fs.writeFileSync(goodInput, JSON.stringify({ candidates: good }));
  assert.deepEqual(
    normalizePacket(
      good.map((candidate) => ({
        sourceId: candidate.sourceId,
        candidates: [candidate],
      })),
    ),
    normalizePacket({ candidates: good }),
  );
  assert.throws(
    () => normalizePacket([{ sourceId: "wrong", candidates: [good[0]] }]),
    /Source ID mismatch/,
  );
  assert.throws(() => normalizePacket({ candidates: [] }), /Empty packet/);
  const pass = await run({
    repoRoot,
    input: goodInput,
    out: path.resolve(evidence, "good"),
    chunkSize: 2,
  });
  assert.equal(pass.passed, true, JSON.stringify(pass.browser?.failures));
  assert.equal(pass.browser.inspectedCandidates, 3);
  assert.equal(pass.browser.candidateViewportChecks, 12);
  assert.equal(pass.browser.entries[0].checks[0].svgCount, 1);
  assert.deepEqual(pass.browser.entries[0].checks[0].labels, ["A"]);
  const looseHtml = fs.readFileSync(
    path.resolve(evidence, "good/runtime/chunks/chunk-002.html"),
    "utf8",
  );
  assert(
    looseHtml.includes("width:20.00mm") && looseHtml.includes("width:30.00mm"),
    "Physical figure sizes must reach production HTML",
  );
  assert(!looseHtml.includes('loading="lazy"'));
  const bad = [
    row("missing-figure", { content: "[그림]에서 각을 구하시오." }),
    row("math-error", { content: "$\\notARealCommand{x}$" }),
    row("unresolved-svg-id", { figureSvg: svg("B", '<use href="#missing"/>') }),
    row("bad-choice", {
      content: "고르시오.\n① [그림]\n② [그림]",
      figureUrls: [image("wrong")],
      choiceFigureIndex: [3],
    }),
    row("hidden-label", {
      figureSvg: svg(
        "C",
        '<text x="10" y="10" style="display:none">hidden</text>',
      ),
    }),
    row("broken-image", { figureUrls: ["/figures/qa-does-not-exist.png"] }),
    row("overflow-last", {
      answer: "$51537752073201133103646112976562127270210752200100x^{99}$",
    }),
  ];
  fs.writeFileSync(badInput, JSON.stringify({ candidates: bad }));
  const fail = await run({
    repoRoot,
    input: badInput,
    out: path.resolve(evidence, "bad"),
    chunkSize: 2,
    screenshot: false,
  });
  assert.equal(fail.passed, false);
  const observed = new Set(
    [...fail.component.failures, ...fail.browser.failures].map(
      (issue) => issue.code,
    ),
  );
  for (const code of [
    "raw_marker",
    "math_render_error",
    "unresolved_svg_id",
    "choice_figure_index",
    "invisible_svg_label",
    "broken_or_hidden_asset",
    "paper_content_overflow",
  ])
    assert(observed.has(code), `Missed intentional failure ${code}`);
  assert.equal(
    fail.browser.entries.at(-1).checks.length,
    4,
    "Final chunk/candidate must be inspected",
  );
  assert(
    fail.browser.entries
      .at(-1)
      .checks.every((check) =>
        check.issues.some((issue) => issue.code === "paper_content_overflow"),
      ),
  );
  const tamperPath = path.resolve(
    evidence,
    "good",
    pass.component.chunks[0].file,
  );
  const original = fs.readFileSync(tamperPath);
  fs.appendFileSync(tamperPath, "<!-- tamper -->");
  await assert.rejects(
    runBrowser({ out: path.resolve(evidence, "good"), repoRoot }),
    /Chunk hash mismatch/,
  );
  fs.writeFileSync(tamperPath, original);
  const report = {
    passed: true,
    productionCandidates: false,
    positiveFixtures: good.length,
    negativeFixtures: bad.length,
    checks: [
      "pair/flat normalization equivalence",
      "source ID mismatch rejected",
      "empty packet rejected",
      "SVG actually drawn with visible labels",
      "grid and loose choice association",
      "dimensions and sourceMm forwarded",
      "eager images",
      "all four viewport/media checks including final chunk",
      "each seeded failure detected",
      "HTML tamper rejected",
    ],
    observedFailureCodes: [...observed].sort(),
  };
  fs.writeFileSync(
    path.resolve(evidence, "selftest.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
