import {
  generateElementaryProblem,
  supportedTiers,
} from "../../elementary/generate";
import type { ElemTier } from "../../elementary/difficulty";

import { getCourseProblemInput } from "./answers";
import { makeCourseAnswerChoices } from "./choiceAnswers";
import { getCourseSection } from "./catalog";
import type { CourseProblem, CourseSession } from "./types";
import type { BankCourseCandidate } from "../courseBank";

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
  bankCandidates: readonly BankCourseCandidate[] = [],
): CourseSession {
  const section = getCourseSection(sectionId);
  if (!section) throw new Error(`초등 소단원을 찾을 수 없습니다: ${sectionId}`);
  if (!Number.isSafeInteger(seed))
    throw new Error("출제 seed는 안전한 정수여야 합니다.");
  const startedAt = now.toISOString();
  const available = supportedTiers(section.unit);
  const usedBank = new Set<number>();
  const problems: CourseProblem[] = SESSION_TIERS.map((tier, index) => {
    if (!available.includes(tier)) {
      throw new Error(`등록되지 않은 초등 난이도입니다: ${sectionId} ${tier}`);
    }
    // Each item stores the exact engine seed so diagrams can be reproduced remotely.
    const problemSeed = ((seed >>> 0) + Math.imul(index + 1, 104729)) >>> 0;
    const eligibleBank = bankCandidates
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .filter(
        ({ candidate, candidateIndex }) =>
          candidate.tier === tier && !usedBank.has(candidateIndex),
      );
    const chosen = eligibleBank.length
      ? eligibleBank[problemSeed % eligibleBank.length]
      : null;
    if (chosen) usedBank.add(chosen.candidateIndex);
    const source = chosen
      ? { ...chosen.candidate, figureSpec: null }
      : generateElementaryProblem(section.unit, problemSeed, tier);
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
  const sourceAnswers = [
    ...bankCandidates.map((candidate) => candidate.answer),
    ...problems.map((problem) => problem.answer),
  ];
  for (const problem of problems)
    Object.assign(problem, makeCourseAnswerChoices(problem, sourceAnswers));
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
