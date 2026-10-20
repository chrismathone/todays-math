import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createNativeAuthoredTask } from "@/lib/engine/descriptiveAuthor/compose";
import { createNativeHelperAdapters } from "@/lib/engine/descriptiveAuthor/adapters";
import {
  batch1UpperAuthors,
  quadraticAreaAuthor,
} from "@/lib/engine/descriptiveAuthor/batch1Upper";
import {
  verifyRootSign,
  verifyFactorRepair,
  verifyQuadraticArea,
  verifyParabolaTranslation,
} from "@/lib/engine/descriptiveVerification/batch1Upper";
import {
  checkNativeGates,
  verifyNativePrinted,
} from "@/lib/engine/nativeDescriptiveGates";
import { serializeNativeSolution } from "@/contracts/nativeDescriptive.contract";
import { generateMiddleProblem } from "@/lib/middle/generate";

const verifiers = [
  verifyRootSign,
  verifyFactorRepair,
  verifyQuadraticArea,
  verifyParabolaTranslation,
];
const typeKeys = [
  "3-1|제곱근의 뜻과 성질|16",
  "3-1|다항식의 인수분해|12",
  "3-1|이차방정식의 활용|19",
  "3-1|이차함수의 그래프 ⑵|07",
];

describe("서술형 첫 묶음 C07~C10", () => {
  it("모든 채점 행은 높은 점수 우선과 나머지 0점 경계를 명시한다", async () => {
    for (const { author } of batch1UpperAuthors) {
      const p = (await createNativeAuthoredTask(author, 0, 0)).problem;
      for (const criterion of p.rubric.criteria) {
        expect(criterion.scoring.zero).toContain("높은 점수부터");
        expect(criterion.scoring.zero).toContain("어느 조건에도");
      }
    }
  });

  it("독립 검산기는 인쇄 계약 외 런타임 import 없이 작동한다", () => {
    const source = readFileSync(
      "src/lib/engine/descriptiveVerification/batch1Upper.ts",
      "utf8",
    );
    expect(source.match(/^import(?! type )/gm)).toBeNull();
    expect(source).not.toMatch(
      /generateMiddleProblem|descriptiveAuthor|\.facts|\.answer/,
    );
  });

  it("생성기와 무관한 손계산 표본으로 부호·복원·세 도형·이동을 검산한다", () => {
    const printed = (index: number, stem: string) => ({
      content:
        stem +
        "\n" +
        batch1UpperAuthors[index]!.author.definition.subquestions.map(
          (q, i) => `(${i + 1}) ${q.text}`,
        ).join("\n"),
      figureSpec: null,
    });
    for (const [a, b, result] of [
      [2, 7, "\\sqrt{7}-2"],
      [8, 2, "8-\\sqrt{2}"],
    ] as const) {
      const check = verifyRootSign(
        printed(
          0,
          `식 $\\sqrt{(${a}-\\sqrt{${b}})^2}$에 대하여 다음 물음에 답하시오.`,
        ),
      );
      expect(check.derived.find((f) => f.factKey === "simplified")!.value).toBe(
        result,
      );
    }
    const repair = verifyFactorRepair(
      printed(
        1,
        "최고차항이 $x^2$인 이차식을 인수분해하였다. 지호는 x의 계수만 잘못 읽고 나머지 항은 바르게 읽어 $(x+1)(x+6)$를 얻었다. 은수는 상수항만 잘못 읽고 나머지 항은 바르게 읽어 $(x-1)(x+6)$를 얻었다. 두 학생은 읽은 식의 인수분해 계산은 바르게 하였다.",
      ),
    );
    expect(repair.derived.map((f) => f.value)).toEqual([
      "1,6;-1,6",
      "7,6;5,-6",
      "5,6;2,3",
      "(x+2)(x+3)",
    ]);
    for (const [shape, length, side, other, area, roots] of [
      ["직사각형", "세로의 길이", "가로", "x+3", 40, "-8,5"],
      ["삼각형", "높이", "밑변", "x+3", 20, "-8,5"],
      ["평행사변형", "높이", "밑변", "3x", 75, "-5,5"],
    ] as const) {
      const check = verifyQuadraticArea(
        printed(
          2,
          `${shape}의 ${length}는 $x$ cm이고 ${side}의 길이는 $${other}$ cm이다. 두 길이는 모두 양수이고 넓이는 $${area}$ cm²이다.`,
        ),
      );
      expect(check.derived.find((f) => f.factKey === "roots")!.value).toBe(
        roots,
      );
      expect(check.derived.find((f) => f.factKey === "length")).toMatchObject({
        value: "5",
        unit: "cm",
      });
    }
    const translated = verifyParabolaTranslation(
      printed(
        3,
        "이차함수 $y=2x^2-8x+5$의 그래프를 x축 방향으로 $-3$만큼, y축 방향으로 $4$만큼 평행이동하였다. 이동 후 식을 $y=ax^2+bx+c$라 한다.",
      ),
    );
    expect(translated.derived.map((f) => f.value)).toEqual([
      "2,-8,5;-3,4",
      "2,-3",
      "-1,1;2,4,3",
      "3",
    ]);
  });

  it.each([0, 1, 2, 3])(
    "C0%s 주 저자의 요구·보조·채점표·검산",
    async (index) => {
      const entry = batch1UpperAuthors[index]!;
      expect(entry.candidateId).toBe(`C${String(index + 7).padStart(2, "0")}`);
      expect(entry.variants).toEqual([0, 1]);
      for (const seed of [0, 1, 2, 3, 4, 20261020]) {
        for (const variant of entry.variants) {
          const task = await createNativeAuthoredTask(
            entry.author,
            seed,
            variant,
          );
          expect(task.helpers).toHaveLength(1);
          const helper = task.helpers[0]!;
          if (helper.kind !== "calculation") throw new Error("계산 보조 누락");
          expect(helper.typeKey).toBe(typeKeys[index]);
          expect(helper.problem).toEqual(
            generateMiddleProblem(typeKeys[index]!, seed, variant),
          );
          expect(task.problem.content).not.toBe(helper.problem.content);
          expect(task.problem.figureSpec).toBeNull();
          expect(task.problem.rubric.totalPoints).toBe(index === 0 ? 6 : 8);
          expect(task.problem.rubric.criteria.map((c) => c.points)).toEqual(
            index === 0 ? [2, 3, 1] : [3, 3, 2],
          );
          expect(
            verifyNativePrinted(task.problem, verifiers[index]!).issues,
          ).toEqual([]);
        }
      }
    },
  );

  it.each([0, 1, 2, 3])(
    "C0%s G1~G6·경계·갈래·훼손",
    async (index) => {
      const suite = await batch1UpperAuthors[index]!.gateSuite(
        createNativeHelperAdapters(),
      );
      const report = checkNativeGates(suite);
      expect(report.gates.map((g) => [g.id, g.issues])).toEqual(
        ["G1", "G2", "G3", "G4", "G5", "G6"].map((id) => [id, []]),
      );
      expect(report.samplesChecked).toBeGreaterThanOrEqual(512);
      expect(report.mutations.every((m) => m.detected)).toBe(true);
      expect(report.coverage.every((c) => c.missing.length === 0)).toBe(true);
      if (index === 2) {
        expect(
          report.coverage.find((c) => c.dimension === "shape")!.observed,
        ).toEqual(["삼각형", "직사각형", "평행사변형"].sort());
      }
      const distinct = new Set(
        suite.samples.map(
          ({ seed, variant }) =>
            suite.generate(seed, variant).content.split("\n(1)")[0],
        ),
      ).size;
      console.info(
        JSON.stringify({
          candidate: batch1UpperAuthors[index]!.candidateId,
          seeds: new Set(suite.samples.map((s) => s.seed)).size,
          samples: report.samplesChecked,
          uniqueCombinations: distinct,
          coverage: report.coverage.map((c) => ({
            dimension: c.dimension,
            count: c.observed.length,
          })),
          mutations: report.mutations.length,
          passed: report.passed,
        }),
      );
    },
    120000,
  );

  it.each([0, 1, 2, 3])(
    "C0%s 모든 배점 중간값·답·교사용 수치 훼손을 거부한다",
    async (index) => {
      const p = (
        await createNativeAuthoredTask(batch1UpperAuthors[index]!.author, 7, 0)
      ).problem;
      for (const fact of p.facts.filter((f) => f.kind !== "given")) {
        const damaged = structuredClone(p);
        damaged.facts.find((f) => f.factKey === fact.factKey)!.value = "999999";
        expect(
          verifyNativePrinted(damaged, verifiers[index]!).oracleIssues.length,
        ).toBeGreaterThan(0);
      }
      for (const criterion of p.rubric.criteria) {
        const damaged = structuredClone(p);
        damaged.rubric.criteria.find(
          (c) => c.criterionId === criterion.criterionId,
        )!.expected = "999999";
        damaged.solution = serializeNativeSolution(
          damaged.modelAnswer,
          damaged.rubric,
        );
        expect(
          verifyNativePrinted(damaged, verifiers[index]!).oracleIssues.length,
        ).toBeGreaterThan(0);
      }
      const badAnswer = { ...p, answer: "999999" };
      expect(
        verifyNativePrinted(badAnswer, verifiers[index]!).oracleIssues.length,
      ).toBeGreaterThan(0);
      const badModel = { ...p, modelAnswer: "999999" };
      badModel.solution = serializeNativeSolution(
        badModel.modelAnswer,
        badModel.rubric,
      );
      expect(
        verifyNativePrinted(badModel, verifiers[index]!).oracleIssues.length,
      ).toBeGreaterThan(0);
    },
  );

  it("C09 세 도형에서 양수인 두 길이와 음수 해 배제의 증거를 요구한다", async () => {
    const found = new Set<string>();
    for (let seed = 0; seed < 50 && found.size < 3; seed++) {
      const p = (await createNativeAuthoredTask(quadraticAreaAuthor, seed, 0))
        .problem;
      const result = verifyQuadraticArea({
        content: p.content,
        figureSpec: null,
      });
      found.add(result.coverage.shape!);
      expect(p.content).toContain("두 길이는 모두 양수");
      expect(p.modelAnswer).toContain("음수");
      expect(p.modelAnswer).toContain("cm²");
      expect(() =>
        verifyQuadraticArea({
          content: p.content.replace(
            "두 길이는 모두 양수",
            "두 길이는 음수도 가능",
          ),
          figureSpec: null,
        }),
      ).toThrow();
      expect(() =>
        verifyQuadraticArea({
          content: p.content.replace(/넓이는 \$\d+\$/, "넓이는 $0$"),
          figureSpec: null,
        }),
      ).toThrow();
    }
    expect(found.size).toBe(3);
  });

  it.each([0, 1, 2, 3])(
    "C0%s 실패한 보조·잘못된 수치·변형은 대체 없이 거부한다",
    async (index) => {
      const author = batch1UpperAuthors[index]!.author;
      const adapters = createNativeHelperAdapters();
      adapters.calculation = async () => ({ ok: false, error: "의도한 실패" });
      await expect(
        createNativeAuthoredTask(author, 0, 0, adapters),
      ).rejects.toThrow("의도한 실패");
      const corrupt = createNativeHelperAdapters();
      const calculate = corrupt.calculation;
      corrupt.calculation = async (request) => {
        const result = await calculate(request);
        if (result.ok) result.output.problem.facts = {};
        return result;
      };
      await expect(
        createNativeAuthoredTask(author, 0, 0, corrupt),
      ).rejects.toThrow();
      await expect(createNativeAuthoredTask(author, 0, 2)).rejects.toThrow(
        /변형/,
      );
    },
  );
});
