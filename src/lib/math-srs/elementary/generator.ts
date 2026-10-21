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
import { courseFigureFingerprint } from "./figureFingerprint";

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

/** Same visible task and expected answer, independent of bank row/session IDs. */
export function courseProblemIdentity(
  problem: Pick<CourseProblem, "content" | "answer" | "figureSpec"> &
    Partial<Pick<CourseProblem, "input">>,
): string {
  return JSON.stringify([
    problem.content.replace(/\s+/g, " ").trim(),
    problem.answer.replace(/\s+/g, " ").trim(),
    problem.input?.mode ?? getCourseProblemInput(problem).mode,
    problem.figureSpec ? courseFigureFingerprint(problem.figureSpec) : null,
  ]);
}

/** Bounded supply fallback: a mandatory five-question session remains available if exhausted. */
export const COURSE_CONTENT_REDRAWS = 32;

export function generateCourseSession(
  sectionId: string,
  seed: number,
  now = new Date(),
  mode: CourseSession["mode"] = "learn",
  bankCandidates: readonly BankCourseCandidate[] = [],
  previousProblems: readonly CourseProblem[] = [],
): CourseSession {
  const section = getCourseSection(sectionId);
  if (!section) throw new Error(`초등 소단원을 찾을 수 없습니다: ${sectionId}`);
  if (!Number.isSafeInteger(seed))
    throw new Error("출제 seed는 안전한 정수여야 합니다.");
  const startedAt = now.toISOString();
  const available = supportedTiers(section.unit);
  const usedContent = new Set(previousProblems.map(courseProblemIdentity));
  const frames = new Set<string>();
  const problems: CourseProblem[] = SESSION_TIERS.map((tier, index) => {
    if (!available.includes(tier)) {
      throw new Error(`등록되지 않은 초등 난이도입니다: ${sectionId} ${tier}`);
    }
    // The student figure route regenerates candidates by seed and selects the saved spec's fingerprint.
    const slotSeed = ((seed >>> 0) + Math.imul(index + 1, 104729)) >>> 0;
    let problemSeed = slotSeed;
    const eligibleBank = bankCandidates.filter(
      (candidate) =>
        candidate.tier === tier &&
        !usedContent.has(
          courseProblemIdentity({ ...candidate, figureSpec: null }),
        ),
    );
    const distinctBank = eligibleBank.filter(
      (candidate, index) =>
        eligibleBank.findIndex(
          (other) =>
            courseProblemIdentity({ ...other, figureSpec: null }) ===
            courseProblemIdentity({ ...candidate, figureSpec: null }),
        ) === index,
    );
    const freshFrames = distinctBank.filter(
      (candidate) => !frames.has(courseProblemFrame(candidate.content)),
    );
    const pool = freshFrames.length ? freshFrames : distinctBank;
    const chosen = pool.length ? pool[slotSeed % pool.length] : null;
    let source = chosen
      ? { ...chosen, figureSpec: null }
      : generateElementaryProblem(section.unit, slotSeed, tier);
    // Plan §3.5: the same frame twice in five problems reads as one problem.
    for (
      let k = 1;
      !chosen &&
      k <= COURSE_CONTENT_REDRAWS &&
      (usedContent.has(courseProblemIdentity(source)) ||
        (k <= COURSE_FRAME_REDRAWS &&
          frames.has(courseProblemFrame(source.content))));
      k++
    ) {
      const next = (slotSeed + k * 7919) >>> 0;
      const other = generateCourseEngineRedraw(section.unit, next, tier);
      if (usedContent.has(courseProblemIdentity(other))) continue;
      if (
        !usedContent.has(courseProblemIdentity(source)) &&
        frames.has(courseProblemFrame(other.content))
      )
        continue;
      problemSeed = next;
      source = other;
    }
    frames.add(courseProblemFrame(source.content));
    usedContent.add(courseProblemIdentity(source));
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
