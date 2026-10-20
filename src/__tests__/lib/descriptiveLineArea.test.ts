import { describe, expect, it } from "vitest";
import {
  LINE_AREA_HELPER_TYPE,
  lineAreaAuthor,
  lineAreaGateSuite,
} from "@/lib/engine/descriptiveAuthor/lineAreaDemo";
import { createNativeAuthoredTask } from "@/lib/engine/descriptiveAuthor/compose";
import { createNativeHelperAdapters } from "@/lib/engine/descriptiveAuthor/adapters";
import { verifyLineAreaDemo } from "@/lib/engine/descriptiveVerification/lineAreaDemo";
import {
  checkNativeGates,
  verifyNativePrinted,
} from "@/lib/engine/nativeDescriptiveGates";
import {
  serializeNativeSolution,
  type NativeDescriptiveProblemR2,
} from "@/contracts/nativeDescriptive.contract";
import { generateMiddleProblem } from "@/lib/middle/generate";

const adapters = () =>
  createNativeHelperAdapters(async () => ({ ok: true, svg: "<svg></svg>" }));
const make = (seed = 0, variant = 0) =>
  createNativeAuthoredTask(lineAreaAuthor, seed, variant, adapters());

/** Enumerate line coefficients, independently of the generator's chosen intersection. */
function allLinePairs() {
  const pairs = new Set<string>();
  for (let a = -3; a <= 3; a++)
    for (let c = -3; c <= 3; c++) {
      if (!a || !c || a === c) continue;
      for (let b = -5; b <= 5; b++)
        for (let d = -5; d <= 5; d++) {
          if (!b || !d) continue;
          const x = (d - b) / (a - c),
            y = a * x + b;
          if (
            !Number.isInteger(x) ||
            !x ||
            Math.abs(x) > 3 ||
            !Number.isInteger(y) ||
            Math.abs(y) > 3 ||
            Math.abs((b - d) * x) % 2
          )
            continue;
          pairs.add(`${a},${b},${c},${d}`);
        }
    }
  return pairs;
}

describe("C06 두 직선과 y축의 넓이를 설명하는 주 저자", () => {
  it("같은 typeKey·씨앗의 계산과 linearGraph를 쓰고 좌표 답 라벨은 인쇄하지 않는다", async () => {
    expect(LINE_AREA_HELPER_TYPE).toBe("2-1|일차함수와 일차방정식의 관계|12");
    const task = await make(20261020, 1);
    const helper = task.helpers[0]!;
    expect(helper.kind).toBe("calculation");
    if (helper.kind !== "calculation") throw new Error("계산 보조 없음");
    expect(helper.problem).toEqual(
      generateMiddleProblem(LINE_AREA_HELPER_TYPE, 20261020, 1),
    );
    expect(task.problem.figureSpec).toMatchObject({
      version: "elem-1",
      kind: "linearGraph",
      marks: [],
      lines: [{ label: "l" }, { label: "m" }],
    });
    expect(task.problem.content).not.toBe(helper.problem.content);
    expect(task.problem.rubric.criteria.map((c) => c.points)).toEqual([
      2, 2, 3, 1,
    ]);
    expect(task.problem.requirements).toHaveLength(3);
    expect(
      verifyNativePrinted(task.problem, verifyLineAreaDemo).issues,
    ).toEqual([]);
  });

  it("생성기 답·facts 없이 인쇄 발문과 그림에서 중간값까지 독립 계산한다", async () => {
    const { problem } = await make();
    const printed = {
      content: problem.content,
      figureSpec: problem.figureSpec,
    };
    const before = structuredClone(printed);
    const result = verifyLineAreaDemo(printed);
    expect(printed).toEqual(before);
    expect(result.derived).toEqual(problem.facts);
    expect(result.criterionChecks.map((c) => c.criterionId)).toEqual([
      "axis",
      "intersection",
      "lengths",
      "area",
    ]);
    expect(
      result.derived.filter((f) => f.kind === "intermediate"),
    ).toHaveLength(3);
    const poisoned = {
      ...printed,
      get facts(): never {
        throw new Error("생성기 facts 접근 금지");
      },
      get answer(): never {
        throw new Error("생성기 answer 접근 금지");
      },
    };
    expect(verifyLineAreaDemo(poisoned)).toEqual(result);
  });

  it("320 수치 조합 전수·부호·경계·두 variant와 G1~G6를 모두 통과한다", async () => {
    const suite = await lineAreaGateSuite(adapters());
    const result = checkNativeGates(suite);
    expect(result.gates.map((g) => [g.id, g.issues])).toEqual(
      ["G1", "G2", "G3", "G4", "G5", "G6"].map((id) => [id, []]),
    );
    expect(allLinePairs().size).toBe(320);
    for (const variant of [0, 1]) {
      const seen = new Set(
        suite.samples
          .filter((s) => s.variant === variant)
          .map(
            (s) =>
              verifyLineAreaDemo(suite.generate(s.seed, s.variant)).coverage
                .linePair,
          ),
      );
      expect(seen).toEqual(allLinePairs());
    }
    expect(result.coverage.every((c) => c.missing.length === 0)).toBe(true);
    expect(result.mutations.every((m) => m.detected)).toBe(true);
    expect(new Set(suite.mutations.map((m) => m.kind))).toEqual(
      new Set(["sign", "unit", "intermediate", "figure-label"]),
    );
    const p = suite.generate(0, 0);
    if (p.revision !== 2) throw new Error("r2 필요");
    const scores = suite.scoringExamples!(p);
    // The printed area question explicitly asks for its calculation, so a bare value earns 0.
    expect(scores.answerOnly.awards.reduce((n, a) => n + a.points, 0)).toBe(0);
    expect(scores.reasoned.awards.reduce((n, a) => n + a.points, 0)).toBe(8);
  });

  it.each(["axis", "intersection", "lengths", "area"])(
    "%s facts·채점표·모범답 훼손을 교사용 solution까지 다시 직렬화해도 잡는다",
    async (key) => {
      const { problem } = await make();
      for (const location of ["facts", "rubric", "modelAnswer"] as const) {
        const p = structuredClone(problem);
        if (location === "facts")
          p.facts.find((f) => f.factKey === key)!.value = "999";
        if (location === "rubric")
          p.rubric.criteria.find((c) => c.criterionId === key)!.expected =
            "999";
        if (location === "modelAnswer") p.modelAnswer = "999";
        p.solution = serializeNativeSolution(p.modelAnswer, p.rubric);
        expect(
          verifyNativePrinted(p, verifyLineAreaDemo).oracleIssues.length,
        ).toBeGreaterThan(0);
      }
    },
  );

  it("그림의 직선·범위·이름·좌표답 노출을 거부하고 정상 그림은 허용한다", async () => {
    const { problem } = await make();
    const mutations: ((p: NativeDescriptiveProblemR2) => void)[] = [
      (p) => {
        (p.figureSpec!.lines as { slope: number }[])[0]!.slope *= -1;
      },
      (p) => {
        (p.figureSpec!.lines as { label: string }[])[0]!.label = "m";
      },
      (p) => {
        p.figureSpec!.xRange = [-1, 1];
      },
      (p) => {
        p.figureSpec!.marks = [[0, 1]];
      },
      (p) => {
        p.figureSpec!.caption = "넓이는 999";
      },
      (p) => {
        p.figureSpec = null;
      },
    ];
    expect(verifyNativePrinted(problem, verifyLineAreaDemo).issues).toEqual([]);
    for (const mutate of mutations) {
      const p = structuredClone(problem);
      mutate(p);
      expect(
        verifyNativePrinted(p, verifyLineAreaDemo).oracleIssues.length,
      ).toBeGreaterThan(0);
    }
  });

  it("단위·축 해석·최종답 부호의 변화도 거부한다", async () => {
    const { problem } = await make();
    for (const change of [
      (p: NativeDescriptiveProblemR2) => {
        p.content = p.content.replace("1 cm", "1 m");
      },
      (p: NativeDescriptiveProblemR2) => {
        p.content = p.content.replace("y축", "x축");
      },
      (p: NativeDescriptiveProblemR2) => {
        p.answer = `-${p.answer}`;
      },
      (p: NativeDescriptiveProblemR2) => {
        p.answer = p.answer.replace("cm²", "cm");
      },
      (p: NativeDescriptiveProblemR2) => {
        p.facts.find((f) => f.factKey === "lengths")!.unit = "cm²";
      },
    ]) {
      const p = structuredClone(problem);
      change(p);
      p.solution = serializeNativeSolution(p.modelAnswer, p.rubric);
      expect(
        verifyNativePrinted(p, verifyLineAreaDemo).oracleIssues.length,
      ).toBeGreaterThan(0);
    }
  });

  it("범위 밖 변형·잘못된 계산·실패한 그림은 대체 없이 중단한다", async () => {
    await expect(make(0, 2)).rejects.toThrow(/변형/);
    const helpers = adapters();
    helpers.figure = async () => ({ ok: false, error: "의도한 렌더 실패" });
    await expect(
      createNativeAuthoredTask(lineAreaAuthor, 0, 0, helpers),
    ).rejects.toThrow(/렌더 실패/);
    const bad = adapters(),
      calculate = bad.calculation;
    bad.calculation = async (request) => {
      const result = await calculate(request);
      if (result.ok) result.output.problem.facts.p = 0;
      return result;
    };
    await expect(
      createNativeAuthoredTask(lineAreaAuthor, 0, 0, bad),
    ).rejects.toThrow(/보조/);
  });
});
