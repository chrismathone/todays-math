import { it, expect } from "vitest";
import { emptySrsState } from "@/lib/math-srs/serverState";
import { projectRetainedMathOntologyLearning } from "@/lib/math-ontology/sources/retainedLearning";
import {
  plannedCourse,
  practise,
  PASS,
  at,
  DAY,
  later,
} from "../helpers/mathPrerequisiteCourse";
it("retains exact source paths for all course sections and excludes hints/self-check/giveup/retry from independent observations", () => {
  const start = at("2026-10-01T01:00:00.000Z"),
    section = "5-2-2-1";
  const course = practise(
    plannedCourse(section, start),
    section,
    "learn",
    start,
    PASS,
  );
  const s = course.learner.session!;
  s.hintedProblemIds = [s.problems[0].id];
  s.attempts[0].usedHint = true;
  s.problems[1].input = { ...s.problems[1].input, mode: "self-check" };
  s.attempts[1].selfAssessed = true;
  s.attempts[2].submittedAnswer = "";
  s.attempts[2].correct = false;
  const state = { ...emptySrsState(), course };
  const p = projectRetainedMathOntologyLearning(state, later(start, DAY));
  expect(p.firstAttempts).toHaveLength(5);
  expect(
    p.firstAttempts.filter((a) => a.eligibleForPlanObservation),
  ).toHaveLength(2);
  expect(p.firstAttempts[0].sourceBinding).toMatchObject({
    namespace: "course-section",
    nativeId: section,
    resolution: "exact-native-id-requires-approved-release-version",
  });
  expect(p.firstAttempts[0].sourceBinding).toHaveProperty("stableIri");
  expect(p.firstAttempts[0].exclusions).toContain("hint");
  expect(p.firstAttempts[1].exclusions).toContain("self-check");
  expect(p.firstAttempts[2].exclusions).toContain("give-up");
  expect(JSON.stringify(p)).not.toContain("submittedAnswer");
  expect(JSON.stringify(p)).not.toContain(s.problems[0].content);
  expect(
    projectRetainedMathOntologyLearning(
      state,
      later(start, DAY),
      later(start, DAY).toISOString(),
    ).firstAttempts,
  ).toHaveLength(0);
  expect(() =>
    projectRetainedMathOntologyLearning(
      state,
      start,
      later(start, DAY).toISOString(),
    ),
  ).toThrow(/window/);
});
