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
import { generateCourseEngineRedraw } from "./engineFrames";

const SESSION_TIERS: readonly ElemTier[] = [
  "연산",
  "기본",
  "기본",
  "응용",
  "응용",
];

/** Engine seeds tried for a slot whose frame an earlier slot already asked. */
export const COURSE_FRAME_REDRAWS = 8;

/** The question with its numbers removed: two of these equal means the same frame. */
export function courseProblemFrame(content: string): string {
  return content
    .replace(/\$[^$]*\$/g, "#")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

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
  const frames = new Set<string>();
  const problems: CourseProblem[] = SESSION_TIERS.map((tier, index) => {
    if (!available.includes(tier)) {
      throw new Error(`등록되지 않은 초등 난이도입니다: ${sectionId} ${tier}`);
    }
    // The stored figureSpec is authoritative for diagrams, including explicit redraw forms.
    const slotSeed = ((seed >>> 0) + Math.imul(index + 1, 104729)) >>> 0;
    let problemSeed = slotSeed;
    const eligibleBank = bankCandidates
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .filter(
        ({ candidate, candidateIndex }) =>
          candidate.tier === tier && !usedBank.has(candidateIndex),
      );
    const chosen = eligibleBank.length
      ? eligibleBank[slotSeed % eligibleBank.length]
      : null;
    if (chosen) usedBank.add(chosen.candidateIndex);
    let source = chosen
      ? { ...chosen.candidate, figureSpec: null }
      : generateElementaryProblem(section.unit, slotSeed, tier);
    // Plan §3.5: the same frame twice in five problems reads as one problem.
    for (
      let k = 1;
      !chosen &&
      k <= COURSE_FRAME_REDRAWS &&
      frames.has(courseProblemFrame(source.content));
      k++
    ) {
      const next = (slotSeed + k * 7919) >>> 0;
      const other = generateCourseEngineRedraw(section.unit, next, tier);
      if (frames.has(courseProblemFrame(other.content))) continue;
      problemSeed = next;
      source = other;
    }
    frames.add(courseProblemFrame(source.content));
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
