import {
  CourseInvalidInput,
  emptyCourseState,
  setCoursePlan,
  startRecommendedCourse,
  submitCourseAttempt,
  submitCourseFollowUp,
  revealCourseHint,
  publicCourseSession,
  courseSummary,
  storedCourseSchema,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import { getCourseProblemInput } from "@/lib/math-srs/elementary/answers";
import { makeCourseAnswerChoices } from "@/lib/math-srs/elementary/choiceAnswers";
import { PREVIEW_CARDS } from "@/lib/math-srs/preview/cards";
import { previewFigureSvg } from "@/lib/math-srs/preview";
import type {
  CourseAttemptInput,
  CourseFollowUpInput,
  CourseHintInput,
  CourseStudentState,
} from "@/contracts/mathSrsCourse.contract";

const now = new Date("2026-10-22T01:00:00.000Z");
const params = new URLSearchParams(location.search);
const kind = params.get("case") ?? "preview";
const sectionId = params.get("section") ?? "5-2-1-1";
const key = `remaining-course:${location.search}`;
let writes = 0;
let failures = 0;
let failNext = false;
let held = false;
let release: (() => void) | undefined;
function initial() {
  const planned = setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: sectionId,
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 0,
    },
    now,
  );
  const state = startRecommendedCourse(
    planned,
    {
      sectionId,
      mode: kind === "preview" || kind === "relearn" ? "learn" : "review",
      reason: "로컬 검수",
    },
    now,
    7,
    () => crypto.randomUUID(),
  );
  const p = state.learner.session!.problems[0];
  const cases: Record<string, { content: string; answer: string }> = {
    list: {
      content: "11, 12, 13 중에서 12 이상인 수를 모두 쓰시오.",
      answer: "$12,\\ 13$",
    },
    units: {
      content: "길이를 모두 쓰시오.",
      answer: "$3\\,\\mathrm{cm}$, $5\\,\\mathrm{cm}$",
    },
    fraction: { content: "$1\\div2$를 계산하시오.", answer: "$\\frac{1}{2}$" },
    mixed: { content: "$3\\div2$를 계산하시오.", answer: "$1\\frac{1}{2}$" },
    choice: {
      content:
        "$33,\\ 34,\\ 37,\\ 18,\\ 22$ 중에서 $22$ 이상인 수 중 가장 큰 수를 구하시오.",
      answer: "$37$",
    },
    self: {
      content: "분자가 분모보다 큰 분수를 대분수로 나타내는 방법을 설명하시오.",
      answer: "분자를 분모로 나눈 몫을 자연수 부분에, 나머지를 분자에 씁니다.",
    },
    legacy: {
      content: "$6$의 약수를 모두 쓰시오.",
      answer: "$1,\\ 2,\\ 3,\\ 6$",
    },
    long: {
      content:
        Array.from(
          { length: 12 },
          (_, i) =>
            `조건 ${i + 1}. 수직선에서 $20$ 이상 $25$ 미만인 수의 범위를 살펴봅니다. $20$은 포함하고 $25$는 포함하지 않습니다.`,
        ).join("\n\n") +
        "\n\n마지막 물음. 이 범위에 있는 자연수는 모두 몇 개입니까?",
      answer: "$5$",
    },
  };
  if (cases[kind]) {
    Object.assign(p, cases[kind]);
    p.solution =
      kind === "long"
        ? Array.from(
            { length: 16 },
            (_, i) =>
              `확인 ${i + 1}. 20, 21, 22, 23, 24는 모두 조건을 만족해요. 25는 포함하지 않으므로 자연수는 5개예요.`,
          ).join("\n\n") + "\n\n풀이의 마지막 줄입니다."
        : `주어진 조건을 계산하면 정답은 ${p.answer}입니다.`;
    p.figureSpec = null;
    p.input = getCourseProblemInput(p);
    if (kind === "legacy")
      p.input = {
        mode: "self-check",
        label: "연습장에 풀어 주세요",
        placeholder: "",
        help: "풀이 뒤 확인해요.",
      };
    p.answerChoices = null;
    p.interactive = null;
    if (kind === "choice") Object.assign(p, makeCourseAnswerChoices(p, []));
  }
  return state;
}
let stored: StoredCourse = sessionStorage.getItem(key)
  ? storedCourseSchema.parse(JSON.parse(sessionStorage.getItem(key)!))
  : initial();
const snapshot = () => ({ state: structuredClone(stored), writes, failures });
const student = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "로컬 검수",
  classId: "22222222-2222-4222-8222-222222222222",
  className: "로컬 초5",
};
function dto(): CourseStudentState {
  const session = publicCourseSession(stored.learner.session!, {
    followUp: true,
  });
  if (kind === "relearn") session.relearn = true;
  // Exercise the existing typed control with a valid public no-choice DTO.
  // Stored problems and all answer validation/grading still use the product rules.
  if (["fraction", "mixed", "long"].includes(kind)) {
    session.problems[0].answerChoices = null;
    session.problems[0].interactive = null;
  }
  for (const p of session.problems) p.figureUrl = null;
  if (kind === "long")
    session.problems[0].figureUrl = `data:image/svg+xml,${encodeURIComponent(previewFigureSvg(PREVIEW_CARDS[2]))}`;
  return {
    student,
    revision: writes,
    plan: stored.plan,
    summary: courseSummary(stored, now),
    session,
  };
}
async function change(fn: () => StoredCourse) {
  if (held)
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  if (failNext) {
    failNext = false;
    return {
      ok: false as const,
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "연결을 확인한 뒤 다시 시도해 주세요.",
    };
  }
  try {
    const next = fn();
    storedCourseSchema.parse(next);
    if (next !== stored) {
      writes++;
      stored = next;
      sessionStorage.setItem(key, JSON.stringify(stored));
    }
    return { ok: true as const, data: dto() };
  } catch (error) {
    failures++;
    if (!(error instanceof CourseInvalidInput)) throw error;
    return {
      ok: false as const,
      status: 400,
      code: "VALIDATION_ERROR",
      message: error.message,
    };
  }
}
export const getCourseState = async () => ({ ok: true as const, data: dto() });
export const startCourse = getCourseState;
export const answerCourse = (input: CourseAttemptInput) =>
  change(() => submitCourseAttempt(stored, input, now, { followUps: true }));
export const followUpCourse = (input: CourseFollowUpInput) =>
  change(() => submitCourseFollowUp(stored, input, now));
export const hintCourse = (input: CourseHintInput) =>
  change(() => revealCourseHint(stored, input));
Object.assign(window, {
  courseQa: {
    snapshot,
    cards: PREVIEW_CARDS,
    failOnce: () => {
      failNext = true;
    },
    hold: () => {
      held = true;
    },
    release: () => {
      held = false;
      release?.();
    },
  },
});
