// Offline: production pure course transitions and core-owned v2 projection only.
// No database, environment files, credentials, model calls, or network.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function main() {
  const [backendRoot, output, freeze] = process.argv.slice(2);
  assert.ok(
    backendRoot && output && /^[a-f0-9]{40}$/.test(freeze),
    "Pass core checkout, output JSON, and exact frozen SHA.",
  );
  const files = [
    "src/lib/math-insight/v2Snapshot.ts",
    "src/lib/math-insight/v2Inference.ts",
    "src/lib/math-insight/v2Validation.ts",
    "src/lib/math-insight/snapshot.ts",
    "src/lib/math-prerequisite/evidence.ts",
    "src/lib/math-prerequisite/policy.ts",
    "src/lib/math-srs/courseAutomation.ts",
    "src/lib/math-explorers/expedition.ts",
    "src/lib/math-srs/serverState.ts",
    "src/lib/math-prerequisite/enabled.ts",
    "src/lib/math-prerequisite/courseIntegration.ts",
    "src/contracts/mathInsightV2.contract.ts",
    "src/__tests__/helpers/mathPrerequisiteCourse.ts",
  ];
  const hashes: Record<string, string> = {};
  for (const file of files) {
    const expected = execFileSync("git", ["show", `${freeze}:${file}`], {
      cwd: backendRoot,
    });
    const actual = await readFile(path.join(backendRoot, file));
    assert.ok(
      expected.equals(actual),
      `${file} differs from the announced core freeze`,
    );
    hashes[file] = createHash("sha256").update(actual).digest("hex");
  }
  const load = (file: string) =>
    import(pathToFileURL(path.join(backendRoot, file)).href);
  const [
    helpers,
    courseApi,
    snapshotApi,
    inference,
    expedition,
    serverState,
    contracts,
  ] = await Promise.all([
    load("src/__tests__/helpers/mathPrerequisiteCourse.ts"),
    load("src/lib/math-srs/courseAutomation.ts"),
    load("src/lib/math-insight/v2Snapshot.ts"),
    load("src/lib/math-insight/v2Inference.ts"),
    load("src/lib/math-explorers/expedition.ts"),
    load("src/lib/math-srs/serverState.ts"),
    load("src/contracts/mathInsightV2.contract.ts"),
  ]);
  const { plannedCourse, practise, FAIL, PASS, DAY } = helpers;
  const rightCourse = (
    section: string,
    started: Date,
    base = courseApi.emptyCourseState(),
  ) => {
    let state = courseApi.startRecommendedCourse(
      plannedCourse(section, started, 20, base),
      { sectionId: section, mode: "learn", reason: "fixture" },
      started,
      3729,
      helpers.uuid,
      [],
    );
    const session = state.learner.session;
    for (const [index, problem] of session.problems.entries()) {
      state = courseApi.submitCourseAttempt(
        state,
        {
          sessionId: session.id,
          problemId: problem.id,
          submittedAnswer:
            problem.input.mode === "self-check" ? "" : problem.answer,
          ...(problem.input.mode === "self-check" ? { selfCorrect: true } : {}),
        },
        new Date(started.getTime() + (index + 1) * 60_000),
      );
    }
    return courseApi.storedCourseSchema.parse(state);
  };
  const now = new Date("2026-10-22T08:00:00.000Z");
  const earlier = (days: number) => new Date(now.getTime() - days * DAY);
  const scopes = [
    {
      studentId: "11111111-1111-4111-8111-111111111111",
      classId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      branchId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    },
    {
      studentId: "22222222-2222-4222-8222-222222222222",
      classId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      branchId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    },
  ];
  let course = practise(
    plannedCourse("5-1-5-4", earlier(50), 20),
    "5-1-5-4",
    "learn",
    earlier(49),
    PASS,
  );
  course = plannedCourse("5-2-2-1", earlier(7), 20, course);
  course = practise(course, "5-2-2-1", "learn", earlier(5), FAIL);
  course = practise(course, "5-2-2-1", "review", earlier(2), FAIL);
  type FeatureSetting = "on" | "off";
  const featureOffText = "현재 선수 확인 기능이 꺼져 있습니다.";
  const inheritedFeature = process.env.MATH_PREREQ_CHECK;
  const project = (
    state: unknown,
    context: (typeof scopes)[number],
    feature: FeatureSetting,
  ) => {
    const previous = process.env.MATH_PREREQ_CHECK;
    // Only this offline CLI process is changed, synchronously, for one projection.
    // The real wrapper and canonical snapshot prose read the same synthetic flag.
    process.env.MATH_PREREQ_CHECK = feature;
    try {
      const snapshot = contracts.mathInsightV2SnapshotSchema.parse(
        snapshotApi.buildInsightV2Snapshot(
          state,
          3,
          now,
          context,
          expedition.expeditionCourseCheckCandidates(
            { ...serverState.emptySrsState(), course: state },
            now,
          ),
        ),
      );
      const candidateFacts = snapshot.facts.filter((fact: { id: string }) =>
        fact.id.startsWith("fact:candidate:"),
      );
      assert.ok(
        candidateFacts.length,
        "Canonical candidate facts remain available.",
      );
      assert.ok(
        candidateFacts.every(
          (fact: { text: string }) =>
            fact.text.includes(featureOffText) === (feature === "off"),
        ),
        "Candidate text must agree with the explicit synthetic feature setting.",
      );
      if (feature === "off")
        assert.ok(
          snapshot.pilot.nextChecks.every(
            (candidate: { eligible: boolean }) => !candidate.eligible,
          ),
          "Feature-off candidates must all be ineligible through the production wrapper.",
        );
      assert.ok(
        !snapshot.pilot.nextChecks.some(
          (candidate: { eligible: boolean }) => candidate.eligible,
        ) ||
          !candidateFacts.some((fact: { text: string }) =>
            fact.text.includes(featureOffText),
          ),
        "An eligible candidate cannot coexist with feature-off text.",
      );
      return snapshot;
    } finally {
      if (previous === undefined) delete process.env.MATH_PREREQ_CHECK;
      else process.env.MATH_PREREQ_CHECK = previous;
    }
  };
  const scenarios: Record<string, ReturnType<typeof project>[]> = {};
  const scenarioFlags: Record<string, { MATH_PREREQ_CHECK: FeatureSetting }> =
    {};
  const pair = (name: string, state: unknown, feature: FeatureSetting) => {
    scenarioFlags[name] = { MATH_PREREQ_CHECK: feature };
    scenarios[name] = scopes.map((scope) => project(state, scope, feature));
    assert.equal(
      process.env.MATH_PREREQ_CHECK,
      inheritedFeature,
      "Restore the caller's flag after every scenario.",
    );
  };
  pair("ready", course, "on");
  pair("feature-off", course, "off");
  assert.ok(
    scenarios.ready.every((snapshot) =>
      snapshot.pilot.nextChecks.some(
        (candidate: { eligible: boolean }) => candidate.eligible,
      ),
    ),
    "The original transitioned ready course must remain eligible through the production wrapper.",
  );
  assert.deepEqual(
    scenarios["feature-off"].map((snapshot) => snapshot.observations),
    scenarios.ready.map((snapshot) => snapshot.observations),
    "Feature-off keeps factual retained observations usable and unchanged.",
  );
  pair("outside", plannedCourse("3-1-1-1", earlier(1), 20, course), "on");
  pair("empty", courseApi.emptyCourseState(), "on");
  pair(
    "paused",
    courseApi.setCoursePlan(
      course,
      {
        startSectionId: course.plan.startSectionId,
        dailyQuestionCount: 20,
        enabled: false,
        expectedRevision: 3,
      },
      earlier(1),
    ),
    "on",
  );
  pair(
    "future",
    plannedCourse("5-2-2-1", new Date(now.getTime() + DAY), 20, course),
    "on",
  );
  pair("stale", plannedCourse("5-2-2-1", earlier(1), 20, course), "on");
  for (const [grade, section] of [
    [3, "3-1-1-1"],
    [4, "4-1-1-1"],
    [5, "5-2-2-1"],
    [6, "6-1-1-1"],
  ] as const) {
    const state = rightCourse(section, earlier(2));
    pair(`grade-${grade}`, state, "on");
  }
  // Deliberately malformed-source fixtures are derived from a real synthetic
  // transition and change only retained-source availability, never real records.
  const missing = structuredClone(course);
  missing.history = [];
  missing.learner.session = null;
  pair("missing-source", missing, "on");
  const incomplete = courseApi.startRecommendedCourse(
    plannedCourse("3-1-1-1", earlier(1), 20),
    { sectionId: "3-1-1-1", mode: "learn", reason: "fixture" },
    earlier(1),
    4411,
    helpers.uuid,
    [],
  );
  pair("unfinished", incomplete, "on");
  let mixed = courseApi.emptyCourseState();
  for (const [index, section] of [
    "3-1-1-1",
    "4-1-1-1",
    "5-2-2-1",
    "6-1-1-1",
  ].entries()) {
    mixed = rightCourse(section, earlier(8 - index * 2), mixed);
  }
  pair("multiple-grades", mixed, "on");
  const composeInquiry = (snapshot: ReturnType<typeof project>) => {
    // Read aliases from the exact core prompt catalog. No model is called.
    const catalog = JSON.parse(
      inference
        .buildInsightV2Prompt(snapshot, "보존된 사실과 계획 맥락은?")
        .split("\n")
        .at(-1),
    );
    const chosen = catalog.facts
      .filter(
        (fact: {
          kind: string;
          evidenceIds: string[];
          candidateIds: string[];
        }) =>
          ["plan-context", "course-goal"].includes(fact.kind) ||
          (fact.kind === "observation" &&
            !fact.candidateIds.length &&
            fact.evidenceIds.some((id: string) =>
              catalog.evidence.some(
                (e: { id: string; domain: string; included: boolean }) =>
                  e.id === id &&
                  e.domain === "general-observation" &&
                  e.included,
              ),
            )),
      )
      .slice(0, 4);
    const inquiry = inference.composeInsightV2Result(
      snapshot,
      {
        snapshotId: inference.insightV2SnapshotId(snapshot),
        intent: "overview",
        factIds: chosen.map((fact: { id: string }) => fact.id),
        evidenceIds: [
          ...new Set(
            chosen.flatMap(
              (fact: { evidenceIds: string[] }) => fact.evidenceIds,
            ),
          ),
        ],
        candidateIds: [],
      },
      {
        provider: "gemini",
        model: "synthetic-no-model-call",
        role: "selection-only",
      },
    );
    contracts.mathInsightV2InquiryResultSchema.parse(inquiry);
    assert.ok(
      inquiry.facts.length,
      "Core composer must return canonical facts.",
    );
    return inquiry;
  };
  const inquiries = scenarios.ready.map(composeInquiry);
  const featureOffInquiries = scenarios["feature-off"].map(composeInquiry);
  assert.ok(
    featureOffInquiries.every((inquiry) =>
      inquiry.facts.some(
        (fact: { kind: string }) => fact.kind === "observation",
      ),
    ),
    "Feature-off factual inquiries remain usable through the canonical composer.",
  );
  await writeFile(
    output,
    JSON.stringify(
      {
        backendFreeze: freeze,
        sourceHashes: hashes,
        scenarioFlags,
        candidateWrapper:
          "expeditionCourseCheckCandidates({ ...emptySrsState(), course }, now)",
        generatedAt: now.toISOString(),
        scopes,
        scenarios,
        inquiries,
        featureOffInquiries,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      scenarios: Object.keys(scenarios),
      backendFreeze: freeze,
      scenarioFlags,
      restoredCallerFlag: process.env.MATH_PREREQ_CHECK === inheritedFeature,
      modelCalls: 0,
    }),
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
