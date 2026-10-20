// @vitest-environment node
/**
 * «모두 쓰시오» list answers (plan §3.3, 2026-10-20). Grade-5 engine sessions ask
 * for several numbers in 239 of 629 self-check problems; a stored problem carries
 * its input mode and the reader recomputes it, so grading lists ships reader first:
 * this reader accepts a list problem stored as `self-check` (before) or `text`
 * (what the writer will store), and grades a `text` one by the stored mode.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { coursePublicProblemSchema } from "@/contracts/mathSrsCourse.contract";
import {
  courseAnswerIsList,
  courseInputModes,
  getCourseProblemInput,
  gradeCourseAnswer,
  validateCourseAnswer,
} from "@/lib/math-srs/elementary/answers";
import type { CourseProblem } from "@/lib/math-srs/elementary/types";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
  storedCourseSchema,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";

const DIVISORS =
  "다음 곱셈식에서 알 수 있는 $6$의 약수를 모두 쓰시오. $2\\times3=6$";
const MULTIPLES =
  "어떤 두 수의 최소공배수가 $8$입니다. 두 수의 공배수를 가장 작은 수부터 $3$개 쓰시오.";
/** The input the writer stores for a list problem. */
const LIST_INPUT: CourseProblem["input"] = {
  mode: "text",
  label: "나의 답",
  placeholder: "예: 1, 2, 3",
  help: "답을 모두 쓰고 쉼표(,)로 나눠 주세요.",
};
/** What a list problem was stored with before the writer. */
const SELF_CHECK_INPUT: CourseProblem["input"] = {
  mode: "self-check",
  label: "연습장에 풀어 주세요",
  placeholder: "",
  help: "풀이를 마친 뒤 스스로 확인해요. 정답과 풀이는 이번 학습을 마친 뒤 볼 수 있어요.",
};

function problem(
  answer: string,
  content: string,
  input: CourseProblem["input"] = getCourseProblemInput({ answer, content }),
): CourseProblem {
  return {
    id: "list-test",
    sectionId: "5-1-2-2",
    tier: "기본",
    seed: 1,
    answer,
    content,
    solution: "풀이",
    figureSpec: null,
    input,
  };
}

describe("목록 답을 알아보기", () => {
  it.each([
    ["$1,\\ 2,\\ 3,\\ 6$", DIVISORS],
    [
      "$5$, $40$",
      "다음 수 중에서 $20$과 약수와 배수의 관계인 수를 모두 찾아 쓰시오.",
    ],
    ["$8,\\ 16,\\ 24$", MULTIPLES],
  ])("%s 는 목록", (answer, content) => {
    expect(courseAnswerIsList({ answer, content })).toBe(true);
    expect(courseInputModes({ answer, content })).toEqual([
      "self-check",
      "text",
    ]);
  });

  it.each([
    ["$1,000$", "모두 더하면 얼마입니까?"],
    ["$3,\\ 5$", "㉠과 ㉡에 알맞은 수를 차례로 쓰시오."],
    ["$3,\\ 5$", "알맞은 수를 쓰시오."],
    ["㉠", "약수와 배수의 관계인 것을 모두 찾아 기호를 쓰시오."],
    [
      "$\\frac{1}{2},\\ \\frac{2}{4}$",
      "크기가 같은 분수를 모두 약분하여 쓰시오.",
    ],
  ])("%s · %s 는 목록이 아니다", (answer, content) => {
    expect(courseAnswerIsList({ answer, content })).toBe(false);
  });

  it("목록이 아닌 문제의 저장 모드는 하나뿐이다", () => {
    expect(courseInputModes({ answer: "$12$", content: "구하시오." })).toEqual([
      "number",
    ]);
  });
});

describe("저장된 모드로 채점", () => {
  const stored = problem("$1,\\ 2,\\ 3,\\ 6$", DIVISORS, LIST_INPUT);

  it.each(["1, 2, 3, 6", "6, 3, 2, 1", "1,2,3,6", "1, 2, 3, 6,", "1，2，3，6"])(
    "%s 는 맞음",
    (input) => {
      expect(validateCourseAnswer(stored, input)).toBeNull();
      expect(gradeCourseAnswer(stored, input)).toBe(true);
    },
  );

  it.each(["1, 2, 3", "1, 2, 3, 6, 6", "1, 2, 3, 7", "6"])(
    "%s 는 틀림(다시 묻지 않는다)",
    (input) => {
      expect(validateCourseAnswer(stored, input)).toBeNull();
      expect(gradeCourseAnswer(stored, input)).toBe(false);
    },
  );

  it("쉼표 없이 띄어 쓴 답은 다시 쓰게 한다", () => {
    expect(validateCourseAnswer(stored, "1 2 3 6")).toMatch(/쉼표/);
    expect(validateCourseAnswer(stored, "")).not.toBeNull();
    expect(gradeCourseAnswer(stored, "1 2 3 6")).toBe(false);
  });

  it("단위가 있는 목록은 낱개 답처럼 같은 종류의 단위끼리 견준다", () => {
    const lengths = problem(
      "$3\\,\\mathrm{cm}$, $5\\,\\mathrm{cm}$",
      "길이가 다른 것을 모두 쓰시오.",
      LIST_INPUT,
    );
    expect(courseAnswerIsList(lengths)).toBe(true);
    expect(gradeCourseAnswer(lengths, "50 mm, 3 cm")).toBe(true);
    // A bare number reads in the answer's unit, as for a single answer.
    expect(gradeCourseAnswer(lengths, "5, 3")).toBe(true);
    expect(gradeCourseAnswer(lengths, "3 mm, 5 mm")).toBe(false);
    expect(validateCourseAnswer(lengths, "3 g, 5 g")).not.toBeNull();
  });

  it("예전처럼 self-check 로 저장된 목록 문제는 그대로 스스로 확인", () => {
    const old = problem("$1,\\ 2,\\ 3,\\ 6$", DIVISORS, SELF_CHECK_INPUT);
    expect(gradeCourseAnswer(old, "1, 2, 3, 6")).toBeNull();
  });

  it("학생에게 보내는 문제 계약이 text 모드를 받는다", () => {
    expect(
      coursePublicProblemSchema.safeParse({
        id: randomUUID(),
        sectionId: stored.sectionId,
        tier: stored.tier,
        content: stored.content,
        figureUrl: null,
        answerChoices: null,
        interactive: null,
        input: LIST_INPUT,
        hint: null,
        feedback: null,
      }).success,
    ).toBe(true);
  });
});

const now = new Date("2026-10-20T01:00:00.000Z");
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

const values = (answer: string) =>
  answer
    .replace(/\$/g, "")
    .split(",")
    .map((part) => part.replace(/\\ /g, "").trim());

/** Answers the current problem correctly, whatever its mode. */
function answerRight(state: StoredCourse, minute: number): StoredCourse {
  const session = state.learner.session!;
  const p = session.problems[session.attempts.length];
  const base = { sessionId: session.id, problemId: p.id };
  if (p.input.mode === "self-check")
    return submitCourseAttempt(
      state,
      { ...base, submittedAnswer: "", selfCorrect: true },
      at(minute),
    );
  const submittedAnswer =
    p.input.mode === "text"
      ? values(p.answer).reverse().join(", ")
      : (p.answerChoices?.find((c) => gradeCourseAnswer(p, c) === true) ??
        p.answer);
  return submitCourseAttempt(state, { ...base, submittedAnswer }, at(minute));
}

/**
 * A real 5-1-2-2 session stored as the writer will (list problems as `text`),
 * answered up to its first list problem (engine order: 연산 · 기본 · 기본 · 응용 · 응용).
 */
function listSession(): StoredCourse {
  const planned = setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: "5-1-2-2",
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 0,
    },
    now,
  );
  const started = startAutomaticCourse(planned, now, 7, randomUUID);
  const session = started.learner.session!;
  let state: StoredCourse = {
    ...started,
    learner: {
      ...started.learner,
      session: {
        ...session,
        problems: session.problems.map((p) =>
          courseAnswerIsList(p) ? { ...p, input: LIST_INPUT } : p,
        ),
      },
    },
  };
  const first = state.learner.session!.problems.findIndex(
    (p) => p.input.mode === "text",
  );
  if (first < 0) throw new Error("no list problem in the 5-1-2-2 session");
  for (let i = 0; i < first; i++) state = answerRight(state, i + 1);
  return state;
}

describe("읽는 쪽 — 쓰는 쪽이 저장할 기록을 받는다", () => {
  it("text 로 저장된 목록 문제의 맞은 답 · 틀린 답을 읽는다", () => {
    const start = listSession();
    const session = start.learner.session!;
    const index = session.attempts.length;
    const list = session.problems[index];
    const right = answerRight(start, 10);
    expect(right.learner.session!.attempts[index].correct).toBe(true);
    expect(storedCourseSchema.safeParse(right).success).toBe(true);

    const wrong = submitCourseAttempt(
      start,
      {
        sessionId: session.id,
        problemId: list.id,
        submittedAnswer: values(list.answer).slice(1).join(", "),
      },
      at(10),
    );
    expect(wrong.learner.session!.attempts[index].correct).toBe(false);
    expect(storedCourseSchema.safeParse(wrong).success).toBe(true);
  });

  it("목록 문제 둘을 다 푼 회차(끝난 회차)를 읽는다", () => {
    let state = listSession();
    while (state.learner.session?.attempts.length !== 5)
      state = answerRight(state, 10 + state.learner.session!.attempts.length);
    const done = state.learner.session!;
    expect(done.completedAt).not.toBeNull();
    expect(done.attempts.every((a) => a.correct)).toBe(true);
    expect(storedCourseSchema.safeParse(state).success).toBe(true);
  });

  it("예전에 self-check 로 저장된 목록 문제도 그대로 읽는다", () => {
    const start = listSession();
    const session = start.learner.session!;
    const before = {
      ...start,
      learner: {
        ...start.learner,
        session: {
          ...session,
          problems: session.problems.map((p) =>
            p.input.mode === "text" ? { ...p, input: SELF_CHECK_INPUT } : p,
          ),
        },
      },
    };
    expect(
      before.learner.session.problems[session.attempts.length].input.mode,
    ).toBe("self-check");
    expect(storedCourseSchema.safeParse(before).success).toBe(true);
  });

  it("목록이 아닌 문제를 text 로 저장한 기록은 거절한다", () => {
    const start = listSession();
    const session = start.learner.session!;
    const index = session.problems.findIndex((p) => !courseAnswerIsList(p));
    const forged = {
      ...start,
      learner: {
        ...start.learner,
        session: {
          ...session,
          problems: session.problems.map((p, i) =>
            i === index ? { ...p, input: LIST_INPUT, answerChoices: null } : p,
          ),
        },
      },
    };
    expect(storedCourseSchema.safeParse(forged).success).toBe(false);
  });

  it("틀린 목록을 맞음으로 적은 기록은 거절한다", () => {
    const start = listSession();
    const session = start.learner.session!;
    const index = session.attempts.length;
    const wrong = submitCourseAttempt(
      start,
      {
        sessionId: session.id,
        problemId: session.problems[index].id,
        submittedAnswer: "1",
      },
      at(10),
    );
    const forged = structuredClone(wrong);
    forged.learner.session!.attempts[index].correct = true;
    expect(storedCourseSchema.safeParse(forged).success).toBe(false);
  });
});

describe("쓰는 쪽 — 읽는 쪽이 운영에 나간 뒤", () => {
  it("목록 문제는 text 로 묻는다", () => {
    expect(
      getCourseProblemInput({
        answer: "$1,\\ 2,\\ 3,\\ 6$",
        content: DIVISORS,
      }),
    ).toEqual(LIST_INPUT);
    expect(
      getCourseProblemInput({ answer: "$8,\\ 16,\\ 24$", content: MULTIPLES })
        .mode,
    ).toBe("text");
  });

  it("목록이 아닌 문제는 그대로", () => {
    expect(
      getCourseProblemInput({ answer: "㉠", content: "기호를 모두 쓰시오." })
        .mode,
    ).toBe("self-check");
    expect(
      getCourseProblemInput({ answer: "$12$", content: "구하시오." }).mode,
    ).toBe("number");
  });

  it("새 5-1-2-2 회차가 목록 문제를 text 로 저장하고, 보기를 붙이지 않는다", () => {
    const planned = setCoursePlan(
      emptyCourseState(),
      {
        startSectionId: "5-1-2-2",
        dailyQuestionCount: 10,
        enabled: true,
        expectedRevision: 0,
      },
      now,
    );
    const state = startAutomaticCourse(planned, now, 7, randomUUID);
    const lists = state.learner.session!.problems.filter(courseAnswerIsList);
    expect(lists.length).toBeGreaterThan(0);
    for (const p of lists) {
      expect(p.input.mode).toBe("text");
      expect(p.answerChoices ?? null).toBeNull();
    }
    expect(storedCourseSchema.safeParse(state).success).toBe(true);
  });
});
