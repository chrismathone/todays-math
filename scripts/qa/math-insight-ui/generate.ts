// Offline only: create synthetic first-pass records through production pure
// transitions, then freeze the actual backend DTO and teacher prose for UI QA.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function main() {
  const backendRoot = process.argv[2];
  const output = process.argv[3];
  assert.ok(
    backendRoot && output,
    "Pass backend checkout and output JSON path.",
  );
  const freeze = "6f78cfaa7";
  for (const file of [
    "src/lib/math-insight/snapshot.ts",
    "src/lib/math-insight/inference.ts",
    "src/lib/math-prerequisite/policy.ts",
    "src/contracts/mathInsight.contract.ts",
  ]) {
    const blob = (revision: string) =>
      execFileSync("git", ["rev-parse", `${revision}:${file}`], {
        cwd: backendRoot,
        encoding: "utf8",
      }).trim();
    assert.equal(
      blob("HEAD"),
      blob(freeze),
      `${file} must match frozen backend`,
    );
  }
  const load = (file: string) =>
    import(pathToFileURL(path.join(backendRoot, file)).href);
  const [
    { plannedCourse, practise, FAIL, PASS, DAY },
    { buildInsightSnapshot },
    { prerequisiteCheckCandidates },
    { coursePrerequisiteBudget },
    inference,
    { courseSummary },
    { retainedSessions },
  ] = await Promise.all([
    load("src/__tests__/helpers/mathPrerequisiteCourse.ts"),
    load("src/lib/math-insight/snapshot.ts"),
    load("src/lib/math-prerequisite/policy.ts"),
    load("src/lib/math-prerequisite/courseIntegration.ts"),
    load("src/lib/math-insight/inference.ts"),
    load("src/lib/math-srs/courseAutomation.ts"),
    load("src/lib/math-prerequisite/evidence.ts"),
  ]);
  const now = new Date("2026-10-22T08:00:00.000Z");
  const earlier = (days: number) => new Date(now.getTime() - days * DAY);
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
  const scenarios = scopes.map((context) => {
    const pool = prerequisiteCheckCandidates(
      course,
      now,
      true,
      coursePrerequisiteBudget(course, now),
    );
    assert.equal(pool.evidenceSessionIds.length, 2);
    const snapshot = buildInsightSnapshot(course, 3, now, context, pool);
    assert.equal(
      snapshot.nextChecks.filter((item: { eligible: boolean }) => item.eligible)
        .length,
      2,
    );
    const selected = {
      snapshotId: inference.insightSnapshotId(snapshot),
      intent: "next-checks",
      evidenceIds: snapshot.evidence.flatMap(
        (item: { included: boolean }, index: number) =>
          item.included ? [`e${index}`] : [],
      ),
      candidateIds: ["c0"],
    };
    const inquiry = inference.composeInsightResult(snapshot, selected, {
      provider: "gemini",
      model: "synthetic-no-model-call",
      role: "selection-only",
    });
    const outsideCourse = plannedCourse("3-1-1-1", earlier(1), 20, course);
    const outside = buildInsightSnapshot(
      outsideCourse,
      3,
      now,
      context,
      prerequisiteCheckCandidates(
        outsideCourse,
        now,
        true,
        coursePrerequisiteBudget(outsideCourse, now),
      ),
    );
    return { snapshot, inquiry, outside };
  });
  const recentSessions = retainedSessions(course).map(
    (session: {
      id: string;
      sectionId: string;
      mode: string;
      startedAt: string;
      completedAt: string | null;
      attempts: { correct: boolean; usedHint: boolean }[];
    }) => ({
      id: session.id,
      sectionId: session.sectionId,
      mode: session.mode,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      answered: session.attempts.length,
      correct: session.attempts.filter((attempt) => attempt.correct).length,
      hinted: session.attempts.filter((attempt) => attempt.usedHint).length,
    }),
  );
  await writeFile(
    output,
    JSON.stringify(
      {
        backendFreeze: freeze,
        generatedAt: now.toISOString(),
        scenarios,
        courseProjection: {
          plan: course.plan,
          summary: courseSummary(course, now),
          recentSessions,
        },
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      scenarios: scenarios.length,
      triggerSessions: 2,
      writes: "synthetic DTO JSON only",
      modelCalls: 0,
    }),
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
