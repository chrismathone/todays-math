import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  parseNativeDescriptiveProblem,
  serializeNativeSolution,
  type NativeDescriptiveProblemR2,
} from "@/contracts/nativeDescriptive.contract";
import {
  generateNativeDescriptive,
  nativeDescriptiveDefinitions,
} from "@/lib/engine/nativeDescriptive20261018";
import { checkNativeGates } from "@/lib/engine/nativeDescriptiveGates";
import {
  coreFixtureSuite,
  fixtureProblem,
} from "../helpers/descriptiveCoreFixture";

describe("native descriptive r2 — legacy reader and rubric evidence", () => {
  it("reads the frozen six definitions without changing any exported byte", () => {
    const snapshot = JSON.parse(
      readFileSync(
        "docs/planning/tracks/reports/math-bank-reinforcement-20261018/native-candidates-r5.json",
        "utf8",
      ),
    );
    expect(nativeDescriptiveDefinitions()).toHaveLength(6);
    for (const frozen of snapshot.candidates) {
      const p = generateNativeDescriptive(
        frozen.definitionId,
        frozen.seed,
        frozen.variant,
      );
      expect(parseNativeDescriptiveProblem(frozen)).toMatchObject(p);
      expect(parseNativeDescriptiveProblem(frozen)).toBe(frozen);
      expect(serializeNativeSolution(p.modelAnswer, p.rubric)).toBe(
        frozen.solution,
      );
    }
  });
  it.each(["초4", "중1", "중2", "중3"] as const)(
    "accepts %s with a FigureSpec and explicit r2 criteria",
    (grade) => {
      const p = fixtureProblem(0, 0);
      p.curriculum.grade = grade;
      expect(parseNativeDescriptiveProblem(p)).toEqual(p);
      expect(p.figureSpec).not.toBeNull();
      expect(p.solution).toContain("부분");
      expect(p.solution).toContain("다시 감점하지");
    },
  );
  it.each([
    (p: NativeDescriptiveProblemR2) => {
      p.rubric.criteria[0]!.evidence = "";
    },
    (p: NativeDescriptiveProblemR2) => {
      p.rubric.criteria[0]!.scoring.partial[0]!.points = 3;
    },
    (p: NativeDescriptiveProblemR2) => {
      p.rubric.criteria[0]!.scoring.zero = "";
    },
    (p: NativeDescriptiveProblemR2) => {
      p.rubric.criteria[0]!.requirementId = "";
    },
    (p: NativeDescriptiveProblemR2) => {
      p.rubric.criteria[0]!.factKey = "";
    },
    (p: NativeDescriptiveProblemR2) => {
      p.rubric.criteria[1]!.carryForward.condition = "";
    },
  ])(
    "rejects incomplete r2 authorship rather than treating it as legacy",
    (mutate) => {
      const p = fixtureProblem(0, 0);
      mutate(p);
      expect(() => parseNativeDescriptiveProblem(p)).toThrow();
      expect(() => serializeNativeSolution(p.modelAnswer, p.rubric)).toThrow();
    },
  );
  it("requires curriculum evidence in r2", () => {
    const p = fixtureProblem(0, 0);
    p.curriculum.achievementStandards = [];
    expect(() => parseNativeDescriptiveProblem(p)).toThrow();
  });
  it("allows independent subquestions without inventing an earlier dependency", () => {
    const p = fixtureProblem(0, 0);
    p.steps[1]!.inputFactKeys = ["points"];
    p.rubric.criteria[1]!.carryForward.fromFactKeys = [];
    expect(() => parseNativeDescriptiveProblem(p)).not.toThrow();
    expect(() => serializeNativeSolution(p.modelAnswer, p.rubric)).not.toThrow();
  });
  it("does not change the registered definition source", () => {
    const sha = createHash("sha256")
      .update(readFileSync("src/lib/engine/nativeDescriptive20261018.ts"))
      .digest("hex");
    expect(sha).toBe(
      "ab312bcf46eaddc2b934feb88f370f6e83969b774e1e03e7dc48d98ba19d1483",
    );
  });
});

describe("G1–G6 executable rejection cases", () => {
  const failures = (suite = coreFixtureSuite()) =>
    checkNativeGates(suite)
      .gates.filter((g) => !g.passed)
      .map((g) => g.id);
  it("passes an unregistered, independently verified fixture with four mutation classes", () => {
    const result = checkNativeGates(coreFixtureSuite());
    expect(result.gates.map((g) => [g.id, g.issues])).toEqual(
      ["G1", "G2", "G3", "G4", "G5", "G6"].map((id) => [id, []]),
    );
    expect(result.passed).toBe(true);
    expect(result.mutations.every((m) => m.detected)).toBe(true);
  });
  it("G1 rejects a renamed twin with the same evidence or model answer", () => {
    const suite = coreFixtureSuite();
    suite.twin = (seed, variant) => {
      const p = fixtureProblem(seed, variant);
      return {
        seed,
        variant,
        content: p.content + " 쓰시오.",
        modelAnswer: p.modelAnswer,
        requiredFactKeys: p.facts
          .filter((f) => f.kind !== "given")
          .map((f) => f.factKey),
      };
    };
    expect(failures(suite)).toContain("G1");
  });
  it("G2 rejects an absent intermediate, orphan criterion, and unit-only step", () => {
    for (const mutate of [
      (p: NativeDescriptiveProblemR2) => {
        p.facts = p.facts.filter((f) => f.kind !== "intermediate");
      },
      (p: NativeDescriptiveProblemR2) => {
        p.rubric.criteria[0]!.factKey = "missing";
      },
      (p: NativeDescriptiveProblemR2) => {
        p.steps[0]!.kind = "unit-only";
      },
      (p: NativeDescriptiveProblemR2) => {
        p.steps[0]!.inputFactKeys = [p.steps[0]!.outputFactKey];
      },
    ]) {
      const suite = coreFixtureSuite();
      suite.generate = (s, v) => {
        const p = fixtureProblem(s, v);
        mutate(p);
        return p;
      };
      expect(failures(suite)).toContain("G2");
    }
  });
  it("G3 receives only printed content and a detached frozen FigureSpec", () => {
    const suite = coreFixtureSuite();
    const verify = suite.verify;
    suite.verify = (printed) => {
      expect(Object.keys(printed).sort()).toEqual(["content", "figureSpec"]);
      expect(Object.isFrozen(printed)).toBe(true);
      expect(Object.isFrozen(printed.figureSpec)).toBe(true);
      expect("answer" in printed).toBe(false);
      expect("facts" in printed).toBe(false);
      return verify(printed);
    };
    expect(failures(suite)).toEqual([]);
  });
  it("G3 checks all scored intermediate values, not only the final answer", () => {
    const suite = coreFixtureSuite();
    suite.generate = (s, v) => {
      const p = fixtureProblem(s, v);
      p.facts.find((f) => f.factKey === "base")!.value = "999";
      return p;
    };
    expect(failures(suite)).toContain("G3");
  });
  it("G4 rejects an unasked criterion and equal answer-only/full scores", () => {
    const suite = coreFixtureSuite();
    suite.generate = (s, v) => {
      const p = fixtureProblem(s, v);
      p.requirements[0]!.text = "발문에 없는 요구";
      return p;
    };
    expect(failures(suite)).toContain("G4");
    const equal = coreFixtureSuite();
    const probe = equal.scoringExamples!;
    equal.scoringExamples = (p) => {
      const examples = probe(p);
      examples.answerOnly.awards = examples.reasoned.awards;
      return examples;
    };
    expect(failures(equal)).toContain("G4");
  });
  it("G5 rejects omitted boundaries, invariant seeded criteria, and a surviving corruption", () => {
    const boundary = coreFixtureSuite();
    boundary.coverage.push({ dimension: "width", values: ["missing"] });
    expect(failures(boundary)).toContain("G5");
    const same = coreFixtureSuite();
    same.generate = (_, v) => fixtureProblem(0, v);
    expect(failures(same)).toContain("G5");
    const survives = coreFixtureSuite();
    survives.mutations[0]!.mutate = (p) => p;
    expect(failures(survives)).toContain("G5");
  });
  it.each(["sum", "zero", "answer-share"])("G6 rejects %s", (fault) => {
    const suite = coreFixtureSuite();
    suite.generate = (s, v) => {
      const p = fixtureProblem(s, v);
      if (fault === "sum") p.rubric.totalPoints++;
      if (fault === "zero") p.rubric.criteria[0]!.points = 0;
      if (fault === "answer-share") p.rubric.criteria[0]!.role = "answer";
      return p;
    };
    expect(failures(suite)).toContain("G6");
  });
});
