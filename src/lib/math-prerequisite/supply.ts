/**
 * 안전한 세션 공급 — plan-v03 §8. **기존 생성기(`generateCourseSession`)를 바꾸지 않고** 그대로 불러,
 * 상태에서 나온 결정적 씨앗 20개 가운데 다음을 모두 넘는 첫 세션을 고른다:
 *   - 다섯 문항 · 갈래 차례 [연산, 기본, 기본, 응용, 응용] · 같은 소단원 · 같은 모드
 *   - 모든 문항이 서버 채점(숫자 입력) · 그림 없음 · 보기 넷 중 정답 하나 · 채점 불가 보기 없음
 *   - 학생 화면이 저장된 보기를 그대로 쓴다(인쇄된 후보 · 내장 보기로 바뀌지 않음)
 *   - 다섯 본문이 서로 다르고, 이미 본 본문(`avoid`)이 없다
 *   - 저장 스키마가 받는다
 * 은행 후보는 넘기지 않는다(문항 ID · 문항류가 저장되지 않아 출처를 주장할 수 없다).
 * 못 찾으면 반복 문항으로 메우지 않고 `ok: false` 다. 문항류가 다르다고는 말하지 않는다 — 본문이 다를 뿐이다.
 */
import {
  getCourseProblemInput,
  gradeCourseAnswer,
} from "@/lib/math-srs/elementary/answers";
import {
  embeddedCourseAnswerChoices,
  hasPrintedFourNumberCandidates,
} from "@/lib/math-srs/elementary/choiceAnswers";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import { courseLearnerSchema } from "@/lib/math-srs/elementary/progress";
import type {
  CourseProblem,
  CourseSession,
} from "@/lib/math-srs/elementary/types";
import { normalizeContent } from "./evidence";
import { PREREQUISITE_POLICY } from "./versions";

/** 기존 코스 세션의 갈래 차례(`math-srs/elementary/generator.ts` 의 SESSION_TIERS). */
export const SESSION_TIER_PATTERN = Object.freeze([
  "연산",
  "기본",
  "기본",
  "응용",
  "응용",
] as const);

export type SessionGenerator = typeof generateCourseSession;

export interface SupplyInput {
  sectionId: string;
  mode: CourseSession["mode"];
  /** 상태에서 나온 열쇠 — 예: `check:<마지막 실패 세션 ID>:<P>` · `return:<P 세션 ID>:<T>` */
  key: string;
  /** 정규화한 본문 — 이미 본 것 */
  avoid: ReadonlySet<string>;
  /** 세션의 시작 시각 · ID 글자에만 쓰인다. 문항 본문은 씨앗만으로 정해진다 */
  now: Date;
}

export type SupplyResult =
  | {
      ok: true;
      seed: number;
      candidateIndex: number;
      problems: CourseProblem[];
    }
  | { ok: false; tried: number };

const sessionSchema = courseLearnerSchema.shape.session.unwrap();

/** FNV-1a 32비트 — 같은 열쇠는 언제나 같은 씨앗. */
export function stableSeed(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function safeProblem(problem: CourseProblem, sectionId: string): boolean {
  if (problem.sectionId !== sectionId || problem.figureSpec !== null)
    return false;
  if (
    problem.input.mode !== "number" ||
    getCourseProblemInput(problem).mode !== "number"
  )
    return false;
  // 학생 화면(`publicCourseSession`)이 저장된 보기를 바꾸지 않는 문항만.
  if (
    embeddedCourseAnswerChoices(problem) !== null ||
    hasPrintedFourNumberCandidates(problem.content)
  )
    return false;
  const choices = problem.answerChoices;
  if (!choices || choices.length !== 4 || new Set(choices).size !== 4)
    return false;
  const grades = choices.map((choice) => gradeCourseAnswer(problem, choice));
  return (
    grades.every((grade) => grade !== null) &&
    grades.filter((grade) => grade === true).length === 1
  );
}

function safeSession(
  session: CourseSession,
  input: SupplyInput,
): boolean {
  if (
    session.sectionId !== input.sectionId ||
    session.mode !== input.mode ||
    session.problems.length !== PREREQUISITE_POLICY.sessionSize ||
    session.problems.some(
      (problem, index) => problem.tier !== SESSION_TIER_PATTERN[index],
    ) ||
    !session.problems.every((problem) => safeProblem(problem, input.sectionId))
  )
    return false;
  const contents = session.problems.map((p) => normalizeContent(p.content));
  if (
    new Set(contents).size !== contents.length ||
    contents.some((content) => input.avoid.has(content))
  )
    return false;
  return sessionSchema.safeParse(session).success;
}

export function supplySafeSession(
  input: SupplyInput,
  deps: { generate?: SessionGenerator } = {},
): SupplyResult {
  const generate = deps.generate ?? generateCourseSession;
  const tried = PREREQUISITE_POLICY.supplyCandidates;
  for (let candidateIndex = 0; candidateIndex < tried; candidateIndex++) {
    const seed = stableSeed(`${input.key}#${candidateIndex}`);
    const session = generate(input.sectionId, seed, input.now, input.mode, []);
    if (safeSession(session, input))
      return {
        ok: true,
        seed,
        candidateIndex,
        problems: session.problems.map((problem) => ({ ...problem })),
      };
  }
  return { ok: false, tried };
}
