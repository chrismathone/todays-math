import { describe, expect, it } from "vitest";
import {
  nativeExternalId,
  parseNativeDescriptiveProblem,
  serializeNativeSolution,
} from "@/contracts/nativeDescriptive.contract";
import {
  checkNativeGates,
  verifyNativePrinted,
} from "@/lib/engine/nativeDescriptiveGates";
import { generateNativeDescriptive } from "@/lib/engine/nativeDescriptive20261018";
import { legacyNativeVerifiers } from "@/lib/engine/descriptiveVerification/legacy";
import {
  coreFixtureSuite,
  fixtureProblem,
} from "../helpers/descriptiveCoreFixture";

describe("independent gate review regressions", () => {
  it("G3 rejects a teacher solution that differs from the independently checked model/rubric", () => {
    const p = fixtureProblem(0, 0);
    p.solution = "잘못된 교사용 정답: 999 cm";
    expect(
      verifyNativePrinted(p, coreFixtureSuite().verify).issues.length,
    ).toBeGreaterThan(0);
  });

  it("G3 rejects a numeric prefix collision even after regenerating the teacher solution", () => {
    const p = fixtureProblem(0, 0);
    p.rubric.criteria[0]!.expected = "절편 20";
    p.modelAnswer = p.modelAnswer.replace("절편은 2", "절편은 20");
    p.solution = serializeNativeSolution(p.modelAnswer, p.rubric);
    expect(
      verifyNativePrinted(p, coreFixtureSuite().verify).issues.length,
    ).toBeGreaterThan(0);
  });

  it.each(["-5 cm", "15 cm", "5 cm^2"])(
    "G3 rejects the corrupted answer %s",
    (answer) => {
      const p = fixtureProblem(0, 0);
      p.answer = answer;
      expect(
        verifyNativePrinted(p, coreFixtureSuite().verify).issues.length,
      ).toBeGreaterThan(0);
    },
  );

  it("G3 rejects empty oracle witnesses instead of matching the empty substring", () => {
    const p = fixtureProblem(0, 0),
      original = coreFixtureSuite().verify;
    const result = verifyNativePrinted(p, (printed) => ({
      ...original(printed),
      criterionChecks: p.rubric.criteria.map((c) => ({
        criterionId: c.criterionId,
        expectedContains: [" $ "],
        modelContains: [""],
        answerContains: [" "],
      })),
    }));
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("returns a failed report for malformed oracle coverage without throwing", () => {
    const suite = coreFixtureSuite(),
      original = suite.verify;
    suite.verify = (printed) => ({
      ...original(printed),
      coverage: null as never,
    });
    const report = checkNativeGates(suite);
    expect(report.gates.find((g) => g.id === "G3")!.passed).toBe(false);
  });

  it("does not downgrade r2 evidence to a legacy problem when revision tags disappear", () => {
    const p = structuredClone(fixtureProblem(0, 0)) as unknown as Record<
      string,
      unknown
    >;
    delete p.revision;
    delete (p.rubric as Record<string, unknown>).revision;
    p.figureSpec = null;
    expect(() => parseNativeDescriptiveProblem(p)).toThrow();
  });

  it("G1 rejects twin evidence IDs that do not refer to this problem", () => {
    const suite = coreFixtureSuite(),
      original = suite.twin!;
    suite.twin = (s, v) => ({
      ...original(s, v),
      requiredFactKeys: ["nonexistent"],
    });
    expect(
      checkNativeGates(suite).gates.find((g) => g.id === "G1")!.passed,
    ).toBe(false);
  });

  it("G2 rejects carry-forward links to a prior fact that the step does not depend on", () => {
    const suite = coreFixtureSuite();
    suite.generate = (s, v) => {
      const p = fixtureProblem(s, v);
      p.steps[1]!.inputFactKeys = ["points"];
      return p;
    };
    expect(
      checkNativeGates(suite).gates.find((g) => g.id === "G2")!.passed,
    ).toBe(false);
  });

  it("G5 requires seed-driven numeric changes within the same variant", () => {
    const suite = coreFixtureSuite();
    suite.coverage[0]!.values = ["2"];
    suite.generate = (seed, variant) => {
      const p = fixtureProblem(0, variant);
      return {
        ...p,
        seed,
        externalId: nativeExternalId({
          definitionId: p.definitionId,
          seed,
          variant,
        }),
      };
    };
    expect(
      checkNativeGates(suite).gates.find((g) => g.id === "G5")!.passed,
    ).toBe(false);
  });

  it("G5 rejects undeclared observed coverage values", () => {
    const suite = coreFixtureSuite();
    suite.coverage[0]!.values = ["2"];
    expect(
      checkNativeGates(suite).gates.find((g) => g.id === "G5")!.passed,
    ).toBe(false);
  });

  it("G5 requires a figure-label mutation to change the figure", () => {
    const suite = coreFixtureSuite();
    suite.mutations.find((m) => m.kind === "figure-label")!.mutate =
      suite.mutations[0]!.mutate;
    expect(
      checkNativeGates(suite).gates.find((g) => g.id === "G5")!.passed,
    ).toBe(false);
  });

  it("G5 does not count a stale solution mismatch as independent mutation detection", () => {
    const suite = coreFixtureSuite();
    suite.mutations.find((m) => m.kind === "intermediate")!.mutate = (p) => ({
      ...p,
      modelAnswer: p.modelAnswer + " 추가 설명",
    });
    expect(
      checkNativeGates(suite).gates.find((g) => g.id === "G5")!.passed,
    ).toBe(false);
  });

  it("legacy statistics accepts zero/negative data", () => {
    const id = "m3-statistics-shift-spread-r1",
      verify = legacyNativeVerifiers[id]!;
    let foundNonpositive = false;
    for (let seed = 0; seed < 100; seed++) {
      const p = generateNativeDescriptive(id, seed, 1);
      if (/수정안 B는 \$-/.test(p.content) || /수정안 B는 \$0,/.test(p.content))
        foundNonpositive = true;
      expect(verifyNativePrinted(p, verify).issues, `seed=${seed}`).toEqual([]);
    }
    expect(foundNonpositive).toBe(true);
  });

  it("legacy statistics verifies the printed translation amount", () => {
    const id = "m3-statistics-shift-spread-r1",
      p = generateNativeDescriptive(id, 0, 0);
    p.content = p.content.replace(/각 값에 \$\d+\$/, "각 값에 $999$");
    expect(
      verifyNativePrinted(p, legacyNativeVerifiers[id]!).issues.length,
    ).toBeGreaterThan(0);
  });

  it("legacy statistics verifies the printed population-variance definition", () => {
    const id = "m3-statistics-shift-spread-r1",
      p = generateNativeDescriptive(id, 0, 0);
    p.content = p.content.replace("편차의 제곱의 평균", "편차의 제곱의 합");
    expect(
      verifyNativePrinted(p, legacyNativeVerifiers[id]!).issues.length,
    ).toBeGreaterThan(0);
  });
});
