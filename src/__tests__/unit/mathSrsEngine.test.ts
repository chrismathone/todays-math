// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkAnswer, CONCEPTS, generateProblem, TEMPLATE_COUNT } from "../../lib/math-srs/generator";
import { applyAttempt, createMemories, dueConcepts, retention } from "../../lib/math-srs/memory";
import { createMission, localDateKey, recordAttempt, suggestedRating } from "../../lib/math-srs/mission";
import { CONCEPT_IDS } from "../../lib/math-srs/types";
import type { Attempt, Difficulty, GeneratedProblem, Learner, Mission } from "../../lib/math-srs/types";

const NOW = new Date("2026-09-23T09:00:00.000Z");
const DAY = 86_400_000;
const learner = (): Learner => ({ id: "learner-test", name: "테스트", memories: createMemories(), missions: [] });
const makeAttempt = (problem: GeneratedProblem, overrides: Partial<Attempt> = {}): Attempt => ({
  problemId: problem.id, conceptId: problem.conceptId, templateId: problem.templateId, kind: problem.kind,
  submittedAnswer: String(problem.answer), correct: true, rating: "good", usedHint: false,
  elapsedSeconds: 20, answeredAt: new Date(NOW.getTime() + 30_000).toISOString(), ...overrides,
});
const withMission = (): [Learner, Mission] => {
  const student = learner();
  const mission = createMission(student, NOW, 42);
  return [{ ...student, missions: [mission] }, mission];
};

// Independent affine parser checks the displayed equation, not generator internals.
type Affine = { a: number; b: number };
function parseLinear(text: string): Affine {
  const tokens = text.replaceAll("−", "-").match(/\d+(?:\.\d+)?|x|[()+\-*/]/g)!;
  let cursor = 0;
  const plus = (left: Affine, right: Affine, sign = 1): Affine => ({ a: left.a + sign * right.a, b: left.b + sign * right.b });
  const multiply = (left: Affine, right: Affine): Affine => {
    if (left.a !== 0 && right.a !== 0) throw new Error("Nonlinear generated equation");
    return { a: left.a * right.b + right.a * left.b, b: left.b * right.b };
  };
  function atom(): Affine {
    const token = tokens[cursor++];
    if (token === "-" || token === "+") return multiply({ a: 0, b: token === "-" ? -1 : 1 }, atom());
    if (token === "x") return { a: 1, b: 0 };
    if (token === "(") {
      const value = sum();
      expect(tokens[cursor++]).toBe(")");
      return value;
    }
    if (!/^\d+(?:\.\d+)?$/.test(token)) throw new Error(`Bad token: ${token}`);
    return { a: 0, b: Number(token) };
  }
  function product(): Affine {
    let value = atom();
    while (cursor < tokens.length) {
      const next = tokens[cursor];
      if (next === "/") {
        cursor++;
        const denominator = atom();
        expect(denominator.a).toBe(0);
        expect(denominator.b).not.toBe(0);
        value = { a: value.a / denominator.b, b: value.b / denominator.b };
      } else if (next === "*" || next === "(" || next === "x" || /^\d/.test(next)) {
        if (next === "*") cursor++;
        value = multiply(value, atom());
      } else break;
    }
    return value;
  }
  function sum(): Affine {
    let value = product();
    while (tokens[cursor] === "+" || tokens[cursor] === "-") {
      const sign = tokens[cursor++] === "+" ? 1 : -1;
      value = plus(value, product(), sign);
    }
    return value;
  }
  const value = sum();
  expect(cursor).toBe(tokens.length);
  return value;
}

describe("수학 SRS 문제 생성", () => {
  it("independently verifies every template over 3,000 equations, all levels, zero and negative solutions", () => {
    const templates = new Set<string>();
    const answers = new Set<number>();
    for (const conceptId of CONCEPT_IDS) for (const difficulty of [1, 2, 3, 4, 5] as Difficulty[]) for (let seed = 0; seed < 100; seed++) {
      const problem = generateProblem({ conceptId, difficulty, seed });
      templates.add(problem.templateId);
      answers.add(problem.answer);
      const [left, right] = problem.equation.split("=").map(parseLinear);
      expect(Math.abs(left.a - right.a)).toBeGreaterThan(0.00001);
      expect((right.b - left.b) / (left.a - right.a)).toBeCloseTo(problem.answer, 8);
      expect(Number.isInteger(problem.answer)).toBe(true);
      expect(problem.solution.join(" ")).toContain(`x = ${problem.answer}`);
      expect(problem.hint.length).toBeGreaterThan(15);
      expect(problem.conceptWeights[0]).toEqual({ conceptId, weight: 1 });
    }
    expect(CONCEPTS).toHaveLength(6);
    expect(templates.size).toBe(TEMPLATE_COUNT);
    expect(TEMPLATE_COUNT).toBeGreaterThanOrEqual(12);
    expect(answers.has(0)).toBe(true);
    expect([...answers].some((answer) => answer < 0)).toBe(true);
  });

  it("is deterministic and scales numeric range and expected time with difficulty", () => {
    const options = { conceptId: "two-step" as const, difficulty: 3 as const, seed: 848 };
    expect(generateProblem(options)).toEqual(generateProblem(options));
    const easy = generateProblem({ ...options, difficulty: 1 });
    const hard = generateProblem({ ...options, difficulty: 5 });
    expect(hard.expectedSeconds).toBeGreaterThan(easy.expectedSeconds);
    expect(hard.equation).not.toBe(easy.equation);
  });

  it.each([
    ["  x = -3  ", -3], ["−3", -3], ["+3.0", 3], ["6/2", 3], ["-.5 / -0.5", 1],
    ["0", 0], ["-0", 0], [".5", 0.5], ["3.", 3], [" X= +6 / 2 ", 3],
  ])("accepts complete numeric answer %s", (input, expected) => expect(checkAnswer(input, expected)).toBe(true));

  it.each(["", " ", "x =", "0/0", "3/0", "3/-0", "Infinity", "NaN", "3abc", "3개", "0x10", "1e2", "1/2/3", "1+2", "--3", "3=3", "3\n4"])(
    "rejects malformed numeric answer %s", (input) => expect(checkAnswer(input, 0)).toBe(false),
  );
});

describe("기억 모델", () => {
  it("starts unassessed and keeps retention separate from mastery", () => {
    for (const memory of createMemories()) {
      expect(memory).toMatchObject({ attempts: 0, successes: 0, mastery: 0, stabilityDays: 1, lastReviewedAt: null, nextReviewAt: null });
      expect(retention(memory, NOW)).toBe(50);
    }
    const memory = { ...createMemories()[0], attempts: 1, mastery: 23, stabilityDays: 5, lastReviewedAt: NOW.toISOString() };
    expect(retention(memory, NOW)).toBe(100);
    expect(retention(memory, new Date(NOW.getTime() + 5 * DAY))).toBeCloseTo(90, 10);
    expect(retention(memory, new Date(NOW.getTime() + 10 * DAY))).toBeCloseTo(81, 10);
    expect(retention(memory, new Date(NOW.getTime() - DAY))).toBe(100);
    expect(retention(memory, new Date(NOW.getTime() + 10_000 * DAY))).toBeGreaterThanOrEqual(0);
    expect(memory.mastery).toBe(23);
  });

  it("penalizes wrong and hinted answers, including false easy ratings, without mutating memory", () => {
    const memories = createMemories();
    const problem = generateProblem({ conceptId: "both-sides", difficulty: 3, seed: 9 });
    const good = applyAttempt(memories, problem, makeAttempt(problem));
    const hinted = applyAttempt(memories, problem, makeAttempt(problem, { usedHint: true, rating: "easy", elapsedSeconds: 3 }));
    const wrong = applyAttempt(memories, problem, makeAttempt(problem, { correct: false, submittedAnswer: "wrong", rating: "easy", elapsedSeconds: 3 }));
    const get = (items: typeof memories) => items.find((item) => item.conceptId === problem.conceptId)!;
    expect(get(hinted).stabilityDays).toBeLessThan(get(good).stabilityDays);
    expect(get(wrong).stabilityDays).toBeLessThan(1);
    expect(get(wrong).mastery).toBeLessThan(get(hinted).mastery);
    expect(get(hinted).successes).toBe(0);
    expect(get(good).successes).toBe(1);
    expect(memories.every((item) => item.attempts === 0)).toBe(true);
    const primaryDelta = get(good).mastery - 50;
    const prerequisiteDelta = good.find((item) => item.conceptId === "balance")!.mastery - 50;
    expect(prerequisiteDelta).toBeGreaterThan(0);
    expect(prerequisiteDelta).toBeLessThan(primaryDelta * 0.21);
    expect(good.find((item) => item.conceptId === "word")!.attempts).toBe(0);
    const weakMemory = { ...get(good), mastery: 5 };
    expect(applyAttempt([weakMemory], problem, makeAttempt(problem, { correct: false, submittedAnswer: "999", rating: "again" }))[0].mastery).toBeLessThan(5);
  });

  it("prioritizes overdue weak concepts and does not reset a prerequisite clock fully", () => {
    const old = new Date(NOW.getTime() - 10 * DAY).toISOString();
    const future = new Date(NOW.getTime() + 5 * DAY).toISOString();
    const memories = createMemories().map((memory) => ({ ...memory, attempts: 1, mastery: 80, lastReviewedAt: NOW.toISOString(), nextReviewAt: future }));
    memories[3] = { ...memories[3], mastery: 20, lastReviewedAt: old, nextReviewAt: old };
    expect(dueConcepts(memories, NOW)[0].conceptId).toBe("both-sides");
    const balance = { ...memories[0], lastReviewedAt: old };
    const problem = generateProblem({ conceptId: "two-step", difficulty: 3, seed: 8 });
    const updated = applyAttempt([balance], problem, makeAttempt(problem))[0];
    expect(Date.parse(updated.lastReviewedAt!)).toBeLessThan(NOW.getTime() - 8 * DAY);
  });
});

describe("12문제 미션과 제출 경계", () => {
  it("creates deterministic, varied missions with every concept and no invented revenge", () => {
    const student = learner();
    const mission = createMission(student, NOW, 42);
    expect(createMission(student, NOW, 42)).toEqual(mission);
    expect(mission.problems).toHaveLength(12);
    expect(new Set(mission.problems.map((problem) => problem.id)).size).toBe(12);
    expect(new Set(mission.problems.map((problem) => problem.equation)).size).toBe(12);
    expect(new Set(mission.problems.map((problem) => problem.conceptId)).size).toBe(6);
    expect(new Set(mission.problems.map((problem) => problem.difficulty)).size).toBeGreaterThan(2);
    expect(mission.problems[0].kind).toBe("warmup");
    expect(mission.problems[11].kind).toBe("boss");
    expect(mission.problems.some((problem) => problem.kind === "revenge")).toBe(false);
    expect(mission.problems[11].difficulty).toBeGreaterThan(mission.problems[0].difficulty);
    expect(localDateKey(new Date(2026, 8, 3, 1))).toBe("2026-09-03");
  });

  it("uses a real previous miss for revenge and removes resolved template misses", () => {
    const [student, mission] = withMission();
    const missed = makeAttempt(mission.problems[0], { correct: false, submittedAnswer: "999", rating: "again" });
    const prior = { ...student, missions: [{ ...mission, attempts: [missed] }] };
    const next = createMission(prior, new Date(NOW.getTime() + DAY), 57);
    expect(next.problems.find((problem) => problem.kind === "revenge")?.conceptId).toBe(missed.conceptId);
    prior.missions[0].attempts.push({ ...missed, problemId: "later", correct: true, submittedAnswer: "1", answeredAt: new Date(NOW.getTime() + 60_000).toISOString() });
    expect(createMission(prior, new Date(NOW.getTime() + DAY), 57).problems.some((problem) => problem.kind === "revenge")).toBe(false);
  });

  it("records all 12 in order, idempotently, immutably, with completion only on the last answer", () => {
    const [initial, mission] = withMission();
    const snapshot = JSON.stringify(initial);
    let student = initial;
    for (let index = 0; index < 12; index++) {
      const attempt = makeAttempt(mission.problems[index], { answeredAt: new Date(NOW.getTime() + (index + 1) * 30_000).toISOString() });
      student = recordAttempt(student, mission.id, attempt);
      expect(student.missions[0].attempts).toHaveLength(index + 1);
      expect(student.missions[0].completedAt).toBe(index === 11 ? attempt.answeredAt : null);
      expect(recordAttempt(student, mission.id, attempt)).toBe(student);
    }
    expect(JSON.stringify(initial)).toBe(snapshot);
    expect(student.memories.some((memory) => memory.attempts > 0)).toBe(true);
    expect(() => recordAttempt(student, mission.id, makeAttempt({ ...mission.problems[0], id: "extra" }))).toThrow();
  });

  it("rejects currentless, out-of-order, mismatched, malformed and dishonest submissions", () => {
    const [student, mission] = withMission();
    const problem = mission.problems[0];
    const attempt = makeAttempt(problem);
    expect(() => recordAttempt(student, "missing", attempt)).toThrow();
    expect(() => recordAttempt(student, mission.id, makeAttempt(mission.problems[1]))).toThrow();
    const invalid: Partial<Attempt>[] = [
      { conceptId: "word" }, { templateId: "wrong" }, { kind: "boss" },
      { elapsedSeconds: NaN }, { elapsedSeconds: -1 }, { elapsedSeconds: Infinity },
      { answeredAt: "bad" }, { answeredAt: "2026-09-23T09:00:30Z" }, { answeredAt: new Date(NOW.getTime() - 1).toISOString() },
      { submittedAnswer: "" }, { submittedAnswer: "Infinity" }, { correct: false },
      { rating: "excellent" as Attempt["rating"] }, { usedHint: "yes" as unknown as boolean },
    ];
    for (const override of invalid) expect(() => recordAttempt(student, mission.id, { ...attempt, ...override })).toThrow();
    const updated = recordAttempt(student, mission.id, attempt);
    expect(() => recordAttempt(updated, mission.id, { ...attempt, elapsedSeconds: 25 })).toThrow();
    const older = makeAttempt(mission.problems[1], { answeredAt: new Date(NOW.getTime() + 10_000).toISOString() });
    expect(() => recordAttempt(updated, mission.id, older)).toThrow();
  });

  it("bounds easy scores to independent fast correct responses and gives conservative suggestions", () => {
    expect(suggestedRating(false, false, 3, 30)).toBe("again");
    expect(suggestedRating(true, true, 3, 30)).toBe("hard");
    expect(suggestedRating(true, false, 1, 30)).toBe("hard");
    expect(suggestedRating(true, false, 60, 30)).toBe("hard");
    expect(suggestedRating(true, false, 20, 30)).toBe("good");
    const [student, mission] = withMission();
    const problem = mission.problems[0];
    for (const [override, rating] of [
      [{ usedHint: true, elapsedSeconds: 3 }, "hard"], [{ elapsedSeconds: 1 }, "hard"],
      [{ elapsedSeconds: problem.expectedSeconds }, "good"], [{ elapsedSeconds: 3 }, "easy"],
      [{ correct: false, submittedAnswer: "999", elapsedSeconds: 3 }, "again"],
    ] as [Partial<Attempt>, Attempt["rating"]][]) {
      const attempt = makeAttempt(problem, { rating: "easy", ...override });
      const result = recordAttempt(student, mission.id, attempt);
      expect(result.missions[0].attempts[0].rating).toBe(rating);
      // A retry of the same original request must not count again, even after normalization.
      expect(recordAttempt(result, mission.id, attempt)).toBe(result);
    }
  });
});
