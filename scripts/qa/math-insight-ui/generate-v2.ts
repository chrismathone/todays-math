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
    policy,
    integration,
    contracts,
  ] = await Promise.all([
    load("src/__tests__/helpers/mathPrerequisiteCourse.ts"),
    load("src/lib/math-srs/courseAutomation.ts"),
    load("src/lib/math-insight/v2Snapshot.ts"),
    load("src/lib/math-insight/v2Inference.ts"),
    load("src/lib/math-prerequisite/policy.ts"),
    load("src/lib/math-prerequisite/courseIntegration.ts"),
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
  const project = (state: unknown, context = scopes[0]) =>
    contracts.mathInsightV2SnapshotSchema.parse(
      snapshotApi.buildInsightV2Snapshot(
        state,
        3,
        now,
        context,
        policy.prerequisiteCheckCandidates(
          state,
          now,
          true,
          integration.coursePrerequisiteBudget(state, now),
        ),
      ),
    );
  const scenarios: Record<string, ReturnType<typeof project>[]> = {};
  const pair = (state: unknown) => scopes.map((scope) => project(state, scope));
  scenarios.ready = pair(course);
  scenarios.outside = pair(plannedCourse("3-1-1-1", earlier(1), 20, course));
  scenarios.empty = pair(courseApi.emptyCourseState());
  scenarios.paused = pair(
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
  );
  scenarios.future = pair(
    plannedCourse("5-2-2-1", new Date(now.getTime() + DAY), 20, course),
  );
  scenarios.stale = pair(plannedCourse("5-2-2-1", earlier(1), 20, course));
  for (const [grade, section] of [
    [3, "3-1-1-1"],
    [4, "4-1-1-1"],
    [5, "5-2-2-1"],
    [6, "6-1-1-1"],
  ] as const) {
    const state = rightCourse(section, earlier(2));
    scenarios[`grade-${grade}`] = pair(state);
  }
  // Deliberately malformed-source fixtures are derived from a real synthetic
  // transition and change only retained-source availability, never real records.
  const missing = structuredClone(course);
  missing.history = [];
  missing.learner.session = null;
  scenarios["missing-source"] = pair(missing);
  const incomplete = courseApi.startRecommendedCourse(
    plannedCourse("3-1-1-1", earlier(1), 20),
    { sectionId: "3-1-1-1", mode: "learn", reason: "fixture" },
    earlier(1),
    4411,
    helpers.uuid,
    [],
  );
  scenarios.unfinished = pair(incomplete);
  let mixed = courseApi.emptyCourseState();
  for (const [index, section] of [
    "3-1-1-1",
    "4-1-1-1",
    "5-2-2-1",
    "6-1-1-1",
  ].entries()) {
    mixed = rightCourse(section, earlier(8 - index * 2), mixed);
  }
  scenarios["multiple-grades"] = pair(mixed);
  const inquiries = scenarios.ready.map((snapshot) => {
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
  });
  await writeFile(
    output,
    JSON.stringify(
      {
        backendFreeze: freeze,
        sourceHashes: hashes,
        generatedAt: now.toISOString(),
        scopes,
        scenarios,
        inquiries,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      scenarios: Object.keys(scenarios),
      backendFreeze: freeze,
      modelCalls: 0,
    }),
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
