import {
  generateElementaryProblem,
  supportedTiers,
} from "../../elementary/generate";
import type { ElemTier } from "../../elementary/difficulty";

import { getCourseProblemInput } from "./answers";
import { getCourseSection } from "./catalog";
import type { CourseProblem, CourseSession } from "./types";

const SESSION_TIERS: readonly ElemTier[] = [
  "연산",
  "기본",
  "기본",
  "응용",
  "응용",
];

export function generateCourseSession(
  sectionId: string,
  seed: number,
  now = new Date(),
  mode: CourseSession["mode"] = "learn",
): CourseSession {
  const section = getCourseSection(sectionId);
  if (!section) throw new Error(`초등 소단원을 찾을 수 없습니다: ${sectionId}`);
  if (!Number.isSafeInteger(seed))
    throw new Error("출제 seed는 안전한 정수여야 합니다.");
  const startedAt = now.toISOString();
  const available = supportedTiers(section.unit);
  const problems: CourseProblem[] = SESSION_TIERS.map((tier, index) => {
    if (!available.includes(tier)) {
      throw new Error(`등록되지 않은 초등 난이도입니다: ${sectionId} ${tier}`);
    }
    // Each item stores the exact engine seed so diagrams can be reproduced remotely.
    const problemSeed = ((seed >>> 0) + Math.imul(index + 1, 104729)) >>> 0;
    const source = generateElementaryProblem(section.unit, problemSeed, tier);
    return {
      id: `${sectionId}:${problemSeed}:${tier}`,
      sectionId,
      tier,
      seed: problemSeed,
      content: source.content,
      answer: source.answer,
      solution: source.solution,
      figureSpec: source.figureSpec,
      input: getCourseProblemInput(source),
    };
  });
  return {
    id: `${sectionId}:${seed}:${startedAt}:${mode}`,
    sectionId,
    mode,
    problems,
    attempts: [],
    startedAt,
    completedAt: null,
  };
}
