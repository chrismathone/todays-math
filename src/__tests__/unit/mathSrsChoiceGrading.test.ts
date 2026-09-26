// @vitest-environment node
// 폰 «한 걸음» 문항(보기형)이 기존 중등 복습의 채점·저장·전달·재풀이·다시 보기를
// 그대로 타는지, 그리고 이미 저장된 숫자형 미션이 한 글자도 다르게 읽히지 않는지.
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { mathSrsStateResponseSchema } from "@/contracts/mathSrs.contract";
import { mathSrsReplayResponseSchema } from "@/contracts/mathSrsReplay.contract";
import { recordAttempt } from "@/lib/math-srs/mission";
import { numericAnswerChoices } from "@/lib/math-srs/numericAnswerChoices";
import { replayProblem } from "@/lib/math-srs/replay";
import { publicSrsMission, srsStateDto } from "@/lib/math-srs/serverDto";
import {
  emptySrsState,
  parseSrsState,
  recordSrsRetry,
  SrsUnavailable,
  startSrsMission,
  submitSrsAttempt,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import {
  checkAnswer,
  correctSrsChoice,
  gradeSrsAnswer,
} from "@/lib/math-srs/sharedAnswers";

const studentId = randomUUID();
const now = new Date("2026-09-26T03:00:00.000Z");
const tomorrow = new Date("2026-09-27T03:00:00.000Z");
const later = (seconds: number) => new Date(now.getTime() + seconds * 1_000);
/** 원장님 예시: 4x − (x − 3) 을 간단히 하면? */
const STEP = ["$3x-3$", "$3x+3$", "$5x-3$", "$5x+3$"];
const CHOICE_AT = [0, 2, 5];

type StoredProblem = StoredSrsState["missions"][number]["problems"][number];

/** B1 의 출력 모양(보기 4개 + 정답 번호)을 저장 문항으로 옮긴 것. 숫자 정답 표기는 없다. */
function asChoice(problem: StoredProblem, answer: number): StoredProblem {
  const choice: StoredProblem = {
    ...problem,
    prompt: "$4x-(x-3)$ 을 간단히 하면?",
    answer,
    choices: [...STEP],
  };
  delete choice.answerText;
  delete choice.answerUnit;
  delete choice.source;
  return choice;
}
const numeric = () =>
  startSrsMission(emptySrsState(), studentId, now, 71, randomUUID);
/** 숫자형과 보기형이 섞인 새 미션. 보기형의 정답 번호는 칸마다 다르다. */
function mixed(indexes = CHOICE_AT): StoredSrsState {
  const state = numeric();
  state.missions[0].problems = state.missions[0].problems.map((p, i) =>
    indexes.includes(i) ? asChoice(p, (i + 1) % 4) : p,
  );
  return state;
}
const right = (p: StoredProblem) =>
  p.choices ? p.choices[p.answer] : String(p.answer);
const wrong = (p: StoredProblem) =>
  p.choices ? p.choices[(p.answer + 1) % 4] : String(p.answer + 999);
function answer(state: StoredSrsState, submittedAnswer: string) {
  const mission = state.missions[0];
  const index = mission.attempts.length;
  return submitSrsAttempt(
    state,
    studentId,
    {
      missionId: mission.id,
      problemId: mission.problems[index].id,
      submittedAnswer,
      elapsedSeconds: 10,
      rating: "good",
    },
    later(10 * (index + 1)),
  );
}
function finish(state: StoredSrsState, wrongAt: number[] = []) {
  while (state.missions[0].attempts.length < 12) {
    const index = state.missions[0].attempts.length;
    const p = state.missions[0].problems[index];
    state = answer(state, wrongAt.includes(index) ? wrong(p) : right(p));
  }
  return state;
}
const context = {
  student: {
    id: studentId,
    name: "서연",
    classId: randomUUID(),
    className: "중1",
  },
  currentProgress: null,
  lectures: [],
};

describe("gradeSrsAnswer — 중등 복습의 채점 함수 하나", () => {
  it("숫자형은 예전 checkAnswer 와 입력마다 같은 결과를 낸다", () => {
    for (const p of numeric().missions[0].problems)
      for (const input of [
        String(p.answer),
        String(p.answer + 1),
        `x = ${p.answer}`,
        `$${p.answer}$`,
        "",
        "abc",
        "0",
        "1",
      ])
        expect(gradeSrsAnswer(p, input)).toBe(checkAnswer(input, p.answer));
  });

  it("보기형은 저장된 정답 보기 글자와 똑같을 때만 정답이다 — 정답 번호를 숫자로 내도 오답", () => {
    const p = { answer: 1, choices: [...STEP] };
    expect(gradeSrsAnswer(p, "$3x+3$")).toBe(true);
    expect(correctSrsChoice(p)).toBe("$3x+3$");
    for (const other of [
      "$3x-3$",
      "$5x-3$",
      "$5x+3$",
      "",
      "1",
      "$1$",
      "0",
      "3x+3",
      "$3x + 3$",
      " $3x+3$",
      "$3x+3$ ",
    ])
      expect(gradeSrsAnswer(p, other)).toBe(false);
    expect(correctSrsChoice({ answer: 2 })).toBeNull();
    expect(gradeSrsAnswer({ answer: 7, choices: [...STEP] }, "$3x+3$")).toBe(
      false,
    );
  });
});

describe("저장 검증 — 옛 숫자형 기록 호환", () => {
  it("이미 저장된 숫자형 미션(답안·오답 포함)은 JSON 왕복 뒤에도 그대로 읽힌다", () => {
    const state = finish(numeric(), [0, 4]);
    const row = JSON.parse(JSON.stringify(state));
    expect(parseSrsState(row)).toEqual(state);
    expect(
      state.missions[0].attempts.map((a) => a.correct).filter((c) => !c),
    ).toHaveLength(2);
    expect(JSON.stringify(state)).not.toContain('"choices"');
  });

  it("숫자형 문제의 보기는 예전 계산과 한 글자도 다르지 않다", () => {
    const mission = finish(numeric(), [3]).missions[0];
    const dto = publicSrsMission(mission);
    mission.problems.forEach((p, i) => {
      expect(dto.problems[i].answerChoices).toEqual(
        numericAnswerChoices(p, mission.problems),
      );
      expect(dto.problems[i].feedback?.answer).toBe(p.answer);
    });
  });
});

describe("저장 검증 — 보기형", () => {
  it("보기형과 숫자형이 섞인 미션을 받고, 답을 다 낸 뒤에도 JSON 왕복이 같다", () => {
    const state = finish(mixed(), [2, 7]);
    expect(state.missions[0].completedAt).not.toBeNull();
    expect(parseSrsState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it.each<[string, (p: StoredProblem) => void]>([
    ["정답 번호가 보기 밖(4)", (p) => void (p.answer = 4)],
    ["정답 번호가 음수", (p) => void (p.answer = -1)],
    ["정답 번호가 정수가 아님", (p) => void (p.answer = 1.5)],
    ["보기 3개", (p) => void p.choices!.pop()],
    ["보기 5개", (p) => void p.choices!.push("$6x$")],
    ["보기 중복", (p) => void (p.choices![3] = p.choices![0])],
    ["띄어쓰기만 다른 보기", (p) => void (p.choices![3] = "$3x - 3$")],
    ["앞뒤 공백 보기", (p) => void (p.choices![0] = " $3x-3$")],
    ["빈 보기", (p) => void (p.choices![0] = "")],
    [
      "제출 칸(200자)보다 긴 보기",
      (p) => void (p.choices![0] = "x".repeat(201)),
    ],
    ["숫자 정답 표기가 같이 있음", (p) => void (p.answerText = "$3x+3$")],
    ["답의 단위가 같이 있음", (p) => void (p.answerUnit = "cm")],
  ])("%s 이면 거절한다", (_, corrupt) => {
    const state = mixed();
    corrupt(state.missions[0].problems[CHOICE_AT[0]]);
    expect(() => parseSrsState(state)).toThrow(SrsUnavailable);
  });

  it("저장된 정오가 보기 채점과 어긋나면 거절한다", () => {
    const state = answer(mixed(), STEP[1]);
    expect(state.missions[0].attempts[0].correct).toBe(true);
    const flipped = structuredClone(state);
    flipped.missions[0].attempts[0].correct = false;
    expect(() => parseSrsState(flipped)).toThrow(SrsUnavailable);
  });
});

describe("제출 · 기억 갱신 · 오답 재풀이", () => {
  it("고른 보기 글자를 서버에서 채점하고 숫자형과 같게 기억을 갱신한다", () => {
    const start = mixed();
    const p = start.missions[0].problems[0];
    const before = start.memories.find((m) => m.conceptId === p.conceptId)!;
    const ok = answer(start, right(p));
    expect(ok.missions[0].attempts[0]).toMatchObject({
      correct: true,
      submittedAnswer: right(p),
    });
    const after = ok.memories.find((m) => m.conceptId === p.conceptId)!;
    expect(after.attempts).toBe(before.attempts + 1);
    expect(after.successes).toBe(before.successes + 1);
    for (const submitted of [wrong(p), String(p.answer), "", "$9x$"]) {
      const miss = answer(start, submitted).missions[0].attempts[0];
      expect(miss.correct).toBe(false);
      expect(miss.rating).toBe("again");
    }
  });

  it("보기형 오답은 다른 보기로는 안 풀리고 정답 보기로만 풀린다 — 점수·기억은 그대로", () => {
    const done = finish(mixed(), [CHOICE_AT[1]]);
    const mission = done.missions[0];
    const missed = mission.problems[CHOICE_AT[1]];
    for (const submitted of [wrong(missed), String(missed.answer), "$9x$"])
      expect(
        recordSrsRetry(done, mission.id, missed.id, submitted, tomorrow),
      ).toBe(done);
    const retried = recordSrsRetry(
      done,
      mission.id,
      missed.id,
      right(missed),
      tomorrow,
    );
    expect(retried.missions[0].resolvedRetryProblemIds).toEqual([missed.id]);
    expect(retried.missions[0].retryCompletedAt).toBeDefined();
    expect(retried.memories).toEqual(done.memories);
    expect(retried.missions[0].attempts).toEqual(mission.attempts);
    expect(parseSrsState(retried)).toEqual(retried);
  });

  it("미션 기록 함수도 보기 채점과 어긋난 정오를 거절한다", () => {
    const state = mixed([0]);
    const learner = {
      id: studentId,
      name: "",
      memories: state.memories,
      missions: state.missions,
    };
    const p = state.missions[0].problems[0];
    const attempt = {
      problemId: p.id,
      conceptId: p.conceptId,
      templateId: p.templateId,
      kind: p.kind,
      submittedAnswer: wrong(p),
      correct: true,
      rating: "good" as const,
      usedHint: false,
      elapsedSeconds: 10,
      answeredAt: later(10).toISOString(),
    };
    expect(() =>
      recordAttempt(learner, state.missions[0].id, attempt),
    ).toThrow();
    expect(
      recordAttempt(learner, state.missions[0].id, {
        ...attempt,
        submittedAnswer: right(p),
      }).missions[0].attempts,
    ).toHaveLength(1);
  });
});

describe("학생에게 보내는 미션", () => {
  it("풀기 전에는 저장된 보기를 순서 그대로만 보내고 정답은 어디에도 없다", () => {
    const state = mixed();
    const dto = srsStateDto(context, { revision: 1, state }, now);
    expect(mathSrsStateResponseSchema.parse({ data: dto }).data).toEqual(dto);
    for (const index of CHOICE_AT) {
      const p = dto.mission!.problems[index];
      expect(p.answerChoices).toEqual(STEP);
      expect(p).not.toHaveProperty("answer");
      expect(p).not.toHaveProperty("choices");
      expect(p.feedback).toBeNull();
      expect(p).not.toHaveProperty("answerUnit");
    }
    // 저장된 보기 배열을 그대로 넘기지 않는다 — 응답을 고쳐도 기록은 안 바뀐다.
    dto.mission!.problems[0].answerChoices!.reverse();
    expect(state.missions[0].problems[0].choices).toEqual(STEP);
  });

  it("풀고 난 뒤 정답은 보기형이면 정답 보기 글자, 숫자형이면 예전처럼 숫자", () => {
    const state = finish(mixed(), [0]);
    const dto = srsStateDto(context, { revision: 13, state }, now);
    expect(mathSrsStateResponseSchema.parse({ data: dto }).data).toEqual(dto);
    state.missions[0].problems.forEach((p, i) => {
      const feedback = dto.mission!.problems[i].feedback!;
      expect(feedback.answer).toBe(p.choices ? p.choices[p.answer] : p.answer);
      if (p.choices) expect(feedback).not.toHaveProperty("answerText");
      expect(feedback.solution).toEqual(p.solution);
    });
  });

  it("섞인 미션의 숫자형 보기는 숫자형 문제에서만 오답 후보를 가져온다", () => {
    const mission = mixed().missions[0];
    const numericPool = mission.problems.filter((p) => !p.choices);
    const dto = publicSrsMission(mission);
    mission.problems.forEach((p, i) => {
      if (p.choices) return;
      const choices = dto.problems[i].answerChoices!;
      expect(choices).toEqual(numericAnswerChoices(p, numericPool));
      expect(choices.filter((c) => gradeSrsAnswer(p, c))).toHaveLength(1);
    });
  });
});

describe("다시 보기(replay)", () => {
  it("보기형 문제를 저장된 보기로 다시 보여 주고 보기 글자로 채점한다", () => {
    const step = CHOICE_AT[1] + 1;
    const done = finish(mixed(), [CHOICE_AT[1]]);
    const missionId = done.missions[0].id;
    const p = done.missions[0].problems[step - 1];
    const read = replayProblem(done, "middle", step, now, undefined);
    expect(mathSrsReplayResponseSchema.parse({ data: read }).data).toEqual(
      read,
    );
    expect(read.answerChoices).toEqual(STEP);
    expect(read.canRevealSolution).toBe(false);
    const submit = (submittedAnswer: string, state = done) =>
      replayProblem(state, "middle", step, now, {
        kind: "middle",
        step,
        problemId: p.id,
        missionId,
        submittedAnswer,
        revealSolution: true,
      });
    expect(submit(wrong(p)).correct).toBe(false);
    expect(submit(String(p.answer)).correct).toBe(false);
    expect(submit(right(p))).toMatchObject({ correct: true, solution: null });
    const resolved = recordSrsRetry(done, missionId, p.id, right(p), tomorrow);
    expect(submit(right(p), resolved).solution).toEqual({
      answer: right(p),
      solution: p.solution.join("\n"),
    });
  });

  it("지난 학습 일차에서 불러도 같은 저장 보기형 문제를 찾는다", () => {
    const step = CHOICE_AT[2] + 1;
    const done = finish(mixed());
    const p = done.missions[0].problems[step - 1];
    const archived = replayProblem(
      done,
      "middle",
      step,
      tomorrow,
      undefined,
      "middle:2026-09-26",
    );
    expect(archived.problemId).toBe(p.id);
    expect(archived.answerChoices).toEqual(STEP);
    expect(
      replayProblem(
        done,
        "middle",
        step,
        tomorrow,
        {
          kind: "middle",
          step,
          problemId: p.id,
          dayId: "middle:2026-09-26",
          submittedAnswer: right(p),
        },
        "middle:2026-09-26",
      ).correct,
    ).toBe(true);
  });

  it("기록이 잘려 새로 만든 문제(regenerated)도 같은 보기·채점 함수를 탄다", () => {
    const done = finish(mixed());
    const pruned = { ...done, missions: [] };
    const read = replayProblem(
      pruned,
      "middle",
      1,
      tomorrow,
      undefined,
      "middle:2026-09-26",
    );
    expect(read.regenerated).toBe(true);
    expect(read.answerChoices).toHaveLength(4);
    const graded = read.answerChoices.map(
      (choice) =>
        replayProblem(
          pruned,
          "middle",
          1,
          tomorrow,
          {
            kind: "middle",
            step: 1,
            problemId: read.problemId,
            dayId: "middle:2026-09-26",
            submittedAnswer: choice,
          },
          "middle:2026-09-26",
        ).correct,
    );
    expect(graded.filter(Boolean)).toHaveLength(1);
  });
});
