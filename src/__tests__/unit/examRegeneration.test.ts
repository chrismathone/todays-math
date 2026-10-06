// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  candidateFingerprint,
  collectRegeneration,
  prepareRegeneration,
  readVerifiedRegeneration,
  prepareVerificationPack,
} from "../../../scripts/import/exam-paper/regenerateExam";

const temporary: string[] = [];
afterEach(async () => {
  for (const dir of temporary.splice(0))
    await rm(dir, { recursive: true, force: true });
});

function fixture(grade = "중3") {
  const root = mkdtempSync(join(tmpdir(), "exam-regeneration-"));
  temporary.push(root);
  const exam = join(root, "exam");
  const blind = join(root, "blind");
  mkdirSync(join(exam, "figures"), { recursive: true });
  const save = (name: string, value: unknown) =>
    writeFileSync(join(exam, name), JSON.stringify(value));
  save("exam.json", {
    examId: "2025-test-3-2-mid",
    school: "시험중",
    grade,
    subject: "수학",
    units: {},
  });
  save("drafts.json", [
    {
      questionNumber: 1,
      questionType: "객관식",
      content: "$1+1$은?\n1. $2$\n2. $3$",
      answer: "ORIGINAL_ANSWER",
      solution: "ORIGINAL_SOLUTION",
      hasFigure: true,
    },
    {
      questionNumber: 2,
      questionType: "서술형",
      content: "$2+2$를 구하고 과정을 쓰시오.",
      answer: "ORIGINAL_ESSAY_ANSWER",
      solution: "ORIGINAL_ESSAY_SOLUTION",
    },
    {
      questionNumber: 3,
      questionType: "단답형",
      content: "$3+3$을 구하시오.",
      answer: "ORIGINAL_SHORT_ANSWER",
      solution: null,
    },
  ]);
  save("figures/index.json", {
    figures: [{ number: 1, file: "q01.png", widthMm: 30, px: [100, 80] }],
  });
  writeFileSync(join(exam, "figures/q01.png"), "original figure bytes");
  const manifest = prepareRegeneration(exam, blind);
  return { exam, blind, manifest, save };
}

function submit(
  f: ReturnType<typeof fixture>,
  n: number,
  solution = "계산하면 $2$이다. 따라서 답은 $2$이다.",
) {
  const answer = n === 1 ? "①" : n === 2 ? "$4$" : "$6$";
  const candidate = { answer, solution, solverId: "solver-session" };
  writeFileSync(
    join(f.blind, "out", `q${String(n).padStart(2, "0")}.json`),
    JSON.stringify(candidate),
  );
  const verification = {
    status: "verified",
    sourceDigest: f.manifest.sourceDigest,
    candidateDigest: candidateFingerprint(candidate),
    method: "independent-solve",
    verifierId: "independent-verifier-session",
    independentAnswer: answer,
    checks: {
      answerCorrect: true,
      solutionCorrect: true,
      sourceFaithful: true,
      curriculumAppropriate: true,
    },
    evidence:
      "문제와 원본 그림을 보고 별도로 계산하고 각 풀이 단계를 확인했다.",
  };
  writeFileSync(
    join(f.blind, "verify", `q${String(n).padStart(2, "0")}.json`),
    JSON.stringify(verification),
  );
  return { candidate, verification };
}

describe("exam answer and solution regeneration", () => {
  it("requires a disjoint blind folder so the source answers are outside the solver's allowed folder", () => {
    const f = fixture();
    expect(() => prepareRegeneration(f.exam, join(f.exam, "blind"))).toThrow(
      /outside/,
    );
    expect(() => prepareRegeneration(f.exam, dirname(f.exam))).toThrow(
      /outside/,
    );
    expect(() => prepareRegeneration(f.exam, process.cwd())).toThrow(/outside/);
  });
  it("creates a blind payload for every question type, including questions with original solutions and figures", () => {
    const f = fixture();
    const text = readFileSync(join(f.blind, "problems.json"), "utf8");
    const payload = JSON.parse(text);
    expect(
      payload.problems.map((p: { questionType: string }) => p.questionType),
    ).toEqual(["객관식", "서술형", "단답형"]);
    expect(text).not.toContain("ORIGINAL_");
    expect(payload.problems[0].figures[0].path).toBe(
      join(f.blind, "fig", "q01.png"),
    );
    expect(readFileSync(payload.problems[0].figures[0].path, "utf8")).toBe(
      "original figure bytes",
    );
  });

  it("holds missing or unverified results and never falls back to original answers or solutions", () => {
    const f = fixture();
    submit(f, 1);
    const result = collectRegeneration(f.exam);
    expect(result.status).toBe("pending");
    expect(
      result.questions.filter((q) => q.status === "verified"),
    ).toHaveLength(1);
    expect(() => readVerifiedRegeneration(f.exam)).toThrow(/pending/);
  });

  it("uses independently verified regenerated answers even when they differ from the original answer", () => {
    const f = fixture();
    for (const n of [1, 2, 3]) submit(f, n);
    expect(collectRegeneration(f.exam).status).toBe("verified");
    const regenerated = readVerifiedRegeneration(f.exam);
    expect(regenerated.size).toBe(3);
    expect(regenerated.get(1)?.answer).toBe("①");
    expect(regenerated.get(2)?.answer).toBe("$4$");
    expect(regenerated.get(2)?.solution).not.toContain("ORIGINAL_");
  });

  it("rejects self verification and stale verification of a different candidate", () => {
    const f = fixture();
    const { candidate, verification } = submit(f, 1);
    verification.verifierId = candidate.solverId;
    writeFileSync(
      join(f.blind, "verify/q01.json"),
      JSON.stringify(verification),
    );
    expect(collectRegeneration(f.exam).questions[0].reason).toMatch(
      /independent/,
    );
    verification.verifierId = "independent";
    writeFileSync(
      join(f.blind, "verify/q01.json"),
      JSON.stringify(verification),
    );
    candidate.solution = "후보 풀이가 수정되었다.";
    writeFileSync(join(f.blind, "out/q01.json"), JSON.stringify(candidate));
    expect(collectRegeneration(f.exam).questions[0].reason).toMatch(
      /candidate/,
    );
  });

  it("requires all external correctness checks rather than treating a well formed result as verified", () => {
    const f = fixture();
    const { verification } = submit(f, 1);
    verification.checks.solutionCorrect = false;
    writeFileSync(
      join(f.blind, "verify/q01.json"),
      JSON.stringify(verification),
    );
    expect(collectRegeneration(f.exam).questions[0].status).toBe("rejected");
  });

  it.each(["pending", "rejected", "wrong-source", "wrong-answer"])(
    "holds an external %s report even when all check flags are true",
    (fault) => {
      const f = fixture();
      const { verification } = submit(f, 1);
      if (fault === "pending" || fault === "rejected")
        verification.status = fault;
      if (fault === "wrong-source") verification.sourceDigest = "0".repeat(64);
      if (fault === "wrong-answer") verification.independentAnswer = "②";
      writeFileSync(
        join(f.blind, "verify/q01.json"),
        JSON.stringify(verification),
      );
      expect(collectRegeneration(f.exam).questions[0].status).not.toBe(
        "verified",
      );
    },
  );

  it("requires complete exact coverage rather than trusting a complete status label", () => {
    const f = fixture();
    for (const n of [1, 2, 3]) submit(f, n);
    collectRegeneration(f.exam);
    const file = join(f.exam, "regeneration-results.json");
    const result = JSON.parse(readFileSync(file, "utf8"));
    result.questions.push({ ...result.questions[0] });
    writeFileSync(file, JSON.stringify(result));
    expect(() => readVerifiedRegeneration(f.exam)).toThrow(/coverage/);
    result.questions.pop();
    result.status = "pending";
    writeFileSync(file, JSON.stringify(result));
    expect(() => readVerifiedRegeneration(f.exam)).toThrow(/pending/);
  });

  it("allows current unit/family assignment after solving without invalidating independently verified answers", () => {
    const f = fixture();
    for (const n of [1, 2, 3]) submit(f, n);
    collectRegeneration(f.exam);
    const config = JSON.parse(readFileSync(join(f.exam, "exam.json"), "utf8"));
    config.units = Object.fromEntries(
      [1, 2, 3].map((n) => [
        n,
        {
          section: "검토한 소단원",
          family: "existing-family",
          why: "별도로 검토한 개념 축",
        },
      ]),
    );
    f.save("exam.json", config);
    expect(readVerifiedRegeneration(f.exam).size).toBe(3);
    expect(collectRegeneration(f.exam).status).toBe("verified");
    expect(() => prepareVerificationPack(f.exam)).not.toThrow();
  });

  it.each(["examId", "school", "grade", "subject", "graphChoices", "hand"])(
    "still binds %s when only the units assignment table is excluded",
    (field) => {
      const f = fixture();
      for (const n of [1, 2, 3]) submit(f, n);
      collectRegeneration(f.exam);
      const config = JSON.parse(
        readFileSync(join(f.exam, "exam.json"), "utf8"),
      );
      config[field] =
        field === "graphChoices" || field === "hand"
          ? { changed: true }
          : "changed";
      f.save("exam.json", config);
      expect(() => readVerifiedRegeneration(f.exam)).toThrow(/source/);
    },
  );

  it("preserves verified multiple choice answer conventions for multiple correct choices", () => {
    const f = fixture();
    const { candidate, verification } = submit(f, 1);
    candidate.answer = "①③";
    verification.independentAnswer = "①③";
    verification.candidateDigest = candidateFingerprint(candidate);
    writeFileSync(join(f.blind, "out/q01.json"), JSON.stringify(candidate));
    writeFileSync(
      join(f.blind, "verify/q01.json"),
      JSON.stringify(verification),
    );
    expect(collectRegeneration(f.exam).questions[0].status).toBe("verified");
  });

  it("holds results when the source figure or source drafts change", () => {
    const f = fixture();
    for (const n of [1, 2, 3]) submit(f, n);
    collectRegeneration(f.exam);
    writeFileSync(join(f.exam, "figures/q01.png"), "changed figure");
    expect(() => readVerifiedRegeneration(f.exam)).toThrow(/source/);
    expect(() => collectRegeneration(f.exam)).toThrow(/source/);
  });

  it("holds copied figure and blind problem mutations before sending an independent verifier pack", () => {
    const f = fixture();
    writeFileSync(join(f.blind, "fig/q01.png"), "changed copied figure");
    expect(() => prepareVerificationPack(f.exam)).toThrow(
      /blind source figure/,
    );
    expect(() => collectRegeneration(f.exam)).toThrow(/blind source figure/);
    writeFileSync(join(f.blind, "fig/q01.png"), "original figure bytes");
    const file = join(f.blind, "problems.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));
    payload.problems[0].content = "different problem";
    writeFileSync(file, JSON.stringify(payload));
    expect(() => prepareVerificationPack(f.exam)).toThrow(
      /blind source problem/,
    );
  });

  it("prepares a separate verifier pack without original answer fields and with the exact candidate digest", () => {
    const f = fixture();
    const { candidate } = submit(f, 1);
    const file = prepareVerificationPack(f.exam);
    const text = readFileSync(file, "utf8");
    const payload = JSON.parse(text);
    expect(text).not.toContain("ORIGINAL_");
    expect(payload.problems[0].candidateDigest).toBe(
      candidateFingerprint(candidate),
    );
    expect(payload.problems[1].candidate).toBeNull();
  });

  it("applies middle school method restrictions only to middle school questions", () => {
    const middle = fixture();
    submit(middle, 1, "미분하면 $2$이다. 따라서 답은 ①이다.");
    expect(collectRegeneration(middle.exam).questions[0].status).toBe(
      "rejected",
    );
    const high = fixture("미적분");
    for (const n of [1, 2, 3])
      submit(high, n, "미분하면 $2$이다. 따라서 답은 $2$이다.");
    expect(collectRegeneration(high.exam).status).toBe("verified");
  });

  it("rejects rendered math defects even if the external verifier marks the candidate verified", () => {
    const f = fixture();
    submit(f, 1, "수식 $\\invalidcommandxyz{2}$이다. 따라서 답은 ①이다.");
    expect(collectRegeneration(f.exam).questions[0].status).toBe("rejected");
  });

  it("detects tampered result artifacts when loading, without consulting solver output again", () => {
    const f = fixture();
    for (const n of [1, 2, 3]) submit(f, n);
    collectRegeneration(f.exam);
    const file = join(f.exam, "regeneration-results.json");
    const result = JSON.parse(readFileSync(file, "utf8"));
    result.questions[0].candidate.answer = "②";
    writeFileSync(file, JSON.stringify(result));
    expect(() => readVerifiedRegeneration(f.exam)).toThrow(/candidate/);
  });

  it("rejects plain LaTeX that the loader would reject even without a KaTeX error class", () => {
    const f = fixture();
    submit(f, 1, "수식 \\unrecognizedcommands{1}이다. 따라서 답은 ①이다.");
    expect(collectRegeneration(f.exam).questions[0].status).toBe("rejected");
  });
});
