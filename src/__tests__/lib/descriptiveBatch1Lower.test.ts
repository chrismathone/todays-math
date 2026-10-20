import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createNativeAuthoredTask } from "@/lib/engine/descriptiveAuthor/compose";
import { createNativeHelperAdapters } from "@/lib/engine/descriptiveAuthor/adapters";
import { batch1LowerAuthors } from "@/lib/engine/descriptiveAuthor/batch1Lower";
import {
  checkNativeGates,
  verifyNativePrinted,
} from "@/lib/engine/nativeDescriptiveGates";
import { serializeNativeSolution } from "@/contracts/nativeDescriptive.contract";
import { generateMiddleProblem } from "@/lib/middle/generate";

const adapters = createNativeHelperAdapters();

describe("C01~C04 주 저자·인쇄 전용 독립 검산", () => {
  it("C01은 분해를 채점하기 전에 소인수분해된 정답 단서를 발문에 주지 않는다", async () => {
    const entry = batch1LowerAuthors[0]!;
    // These seeds include both helper.kind branches: the author always prints ordinary integers.
    const helperKinds = new Set<number>();
    for (let seed = 0; seed < 16; seed++) {
      for (const variant of entry.variants) {
        const task = await createNativeAuthoredTask(
          entry.author,
          seed,
          variant,
          adapters,
        );
        const helper = task.helpers[0]!;
        if (helper.kind !== "calculation") throw new Error("계산 보조 아님");
        helperKinds.add(helper.problem.facts.kind!);
        expect(task.problem.content.split("\n")[0]).toMatch(
          /두 자연수 \$A=\d+\$, \$B=\d+\$가 적혀 있다\.$/,
        );
        expect(entry.verify(task.problem).coverage.presentation).toBe("number");
        expect(task.problem.rubric.criteria[0]!.expected).toContain("$A=");
        expect(task.problem.rubric.criteria[0]!.expected).toContain("$B=");
      }
    }
    expect([...helperKinds].sort()).toEqual([0, 1]);
  });

  it("후보표의 네 보조 키를 그대로 사용하고 정의를 등록하지 않는다", () => {
    expect(batch1LowerAuthors.map((e) => e.candidateId)).toEqual([
      "C01",
      "C02",
      "C03",
      "C04",
    ]);
    expect(
      batch1LowerAuthors.map((e) =>
        e.author.helpers[0]!.request({ seed: 7, variant: 1 }, new Map()),
      ),
    ).toEqual(
      [
        "1-1|최대공약수와 최소공배수|07",
        "1-1|정수와 유리수의 계산|08",
        "1-1|일차방정식의 활용|34",
        "2-1|일차부등식의 활용|04",
      ].map((typeKey) => ({
        id: "numbers",
        kind: "calculation",
        engine: "middle",
        seed: 7,
        variant: 1,
        typeKey,
      })),
    );
  });

  for (const entry of batch1LowerAuthors) {
    it(`${entry.candidateId}: 5씨앗×변형, 독립 검산·배점·요구 연결`, async () => {
      for (const seed of [0, 1, 7, 42, 20261020]) {
        for (const variant of entry.variants) {
          const task = await createNativeAuthoredTask(
            entry.author,
            seed,
            variant,
            adapters,
          );
          const p = task.problem;
          expect(task.helpers).toHaveLength(1);
          const helper = task.helpers[0]!;
          if (helper.kind !== "calculation") throw new Error("계산 보조 아님");
          expect(helper.problem).toEqual(
            generateMiddleProblem(helper.typeKey, seed, variant),
          );
          expect(entry.author.definition.unitSection).toBe(
            helper.problem.unitSection,
          );
          expect(p.content).not.toBe(helper.problem.content);
          expect(p.figureSpec).toBeNull();
          expect(verifyNativePrinted(p, entry.verify).issues).toEqual([]);
          expect(p.rubric.criteria.reduce((n, c) => n + c.points, 0)).toBe(
            p.rubric.totalPoints,
          );
          expect(
            new Set(p.rubric.criteria.map((c) => c.points)).size,
          ).toBeGreaterThan(1);
          expect(p.requirements.map((r) => r.criterionIds).flat()).toEqual(
            p.rubric.criteria.map((c) => c.criterionId),
          );
        }
      }
      await expect(
        createNativeAuthoredTask(entry.author, 0, 2, adapters),
      ).rejects.toThrow(/변형/);
    });

    it(`${entry.candidateId}: G1~G6, 경계·갈래·훼손 탐지`, async () => {
      const suite = await entry.gateSuite(adapters);
      const result = checkNativeGates(suite);
      expect(result.gates.map((g) => [g.id, g.issues])).toEqual(
        ["G1", "G2", "G3", "G4", "G5", "G6"].map((id) => [id, []]),
      );
      expect(result.mutations.every((m) => m.detected)).toBe(true);
      expect(result.figureMutationApplicable).toBe(false);
      expect(result.samplesChecked).toBeGreaterThanOrEqual(500);
      const unique = new Set(
        suite.samples.map(
          ({ seed, variant }) =>
            entry.verify(suite.generate(seed, variant)).coverage.combination,
        ),
      );
      if (entry.candidateId === "C01") {
        expect(unique.size).toBe(2986);
        expect(
          result.coverage.find((c) => c.dimension === "A-boundary")!.observed,
        ).toEqual(["interior", "max", "min"]);
        expect(
          result.coverage.find((c) => c.dimension === "B-boundary")!.observed,
        ).toEqual(["interior", "max", "min"]);
        expect(
          result.coverage.find((c) => c.dimension === "lcm-boundary")!.observed,
        ).toEqual(["interior", "max", "min"]);
      }
      if (entry.candidateId === "C02") {
        expect(
          result.coverage.find((c) => c.dimension === "sign-pattern")!.observed,
        ).toHaveLength(16);
        expect(
          result.coverage.find(
            (c) => c.dimension === "denominator-pair-operation",
          )!.observed,
        ).toHaveLength(144);
      }
      if (entry.candidateId === "C03") expect(unique.size).toBe(68);
      if (entry.candidateId === "C04") expect(unique.size).toBe(1485);
      expect(result.coverage.every((c) => c.missing.length === 0)).toBe(true);
      console.info(
        JSON.stringify({
          candidateId: entry.candidateId,
          samples: suite.samples.length,
          seeds: new Set(suite.samples.map((s) => s.seed)).size,
          uniqueCombinations: unique.size,
          gates: result.gates,
          coverage: result.coverage.map((c) => ({
            dimension: c.dimension,
            count: c.observed.length,
          })),
          mutations: result.mutations.map((m) => ({
            kind: m.kind,
            detected: m.detected,
          })),
        }),
      );
    }, 120000);

    it(`${entry.candidateId}: 모든 배점 중간값·모범답·채점표 훼손을 별도로 잡는다`, async () => {
      const { problem } = await createNativeAuthoredTask(
        entry.author,
        42,
        0,
        adapters,
      );
      for (const criterion of problem.rubric.criteria) {
        const damaged = structuredClone(problem);
        damaged.facts.find((f) => f.factKey === criterion.factKey)!.value =
          "999999";
        expect(
          verifyNativePrinted(damaged, entry.verify).oracleIssues.length,
        ).toBeGreaterThan(0);
        const rubricDamage = structuredClone(problem);
        rubricDamage.rubric.criteria.find(
          (c) => c.criterionId === criterion.criterionId,
        )!.expected = "근거 없는 999999";
        rubricDamage.solution = serializeNativeSolution(
          rubricDamage.modelAnswer,
          rubricDamage.rubric,
        );
        expect(
          verifyNativePrinted(rubricDamage, entry.verify).oracleIssues.length,
        ).toBeGreaterThan(0);
      }
      const modelDamage = structuredClone(problem);
      modelDamage.modelAnswer = modelDamage.answer;
      modelDamage.solution = serializeNativeSolution(
        modelDamage.modelAnswer,
        modelDamage.rubric,
      );
      expect(
        verifyNativePrinted(modelDamage, entry.verify).oracleIssues.length,
      ).toBeGreaterThan(0);
      const printed = { content: problem.content, figureSpec: null };
      expect(entry.verify(printed)).toEqual(
        entry.verify({
          ...printed,
          get facts(): never {
            throw new Error("facts를 읽음");
          },
          get answer(): never {
            throw new Error("answer를 읽음");
          },
        }),
      );
      expect(() =>
        entry.verify({ ...printed, figureSpec: { version: 2 } }),
      ).toThrow();
    });
  }

  it("생성기 없이 직접 쓴 인쇄 조건에서도 손계산 중간값을 재구성한다", () => {
    const introductions = [
      "연습 카드에 두 자연수 $A=12$, $B=18$가 적혀 있다.",
      "민서는 어떤 유리수에 대해 다음 기록을 남겼다. 원래는 $-\\frac{2}{3}$를 빼야 하는데, 잘못하여 더했더니 결과가 $-\\frac{13}{6}$이었다.",
      "문구 용품 한 개를 정가에서 $25\\%$ 할인하여 $9000$원에 판매했다.",
      "준비물 물품은 한 개에 $1200$원이다. 물품을 한 상자에 담을 때 상자값 $2500$원을 한 번 내야 한다. 전체 비용을 $10000$원 이하로 하며 물품은 쪼개어 살 수 없다.",
    ];
    const expected = [
      ["2:2:1;3:1:2", "2:2;3:2", "36"],
      [
        "x+(-\\frac{2}{3})=-\\frac{13}{6}",
        "-3/2",
        "x-(-\\frac{2}{3});delta=4/3",
        "-5/6",
      ],
      ["25x/100", "x-25x/100=9000;75x=900000;x=12000", "12000"],
      [
        "1200x+2500<=10000",
        "1200x<=7500;x<=25/4",
        "n=6;cost=9700;next=10900",
        "6",
      ],
    ];
    batch1LowerAuthors.forEach((entry, i) => {
      const result = entry.verify({
        content: `${introductions[i]}\n${entry.author.definition.subquestions.map((s) => s.text).join("\n")}`,
        figureSpec: null,
      });
      expect(
        result.derived.filter((f) => f.kind !== "given").map((f) => f.value),
      ).toEqual(expected[i]);
    });
  });

  it("보조 실패를 전파하고 다른 수치나 단답으로 대체하지 않는다", async () => {
    const failed = {
      ...adapters,
      calculation: async () => ({
        ok: false as const,
        error: "의도한 계산 실패",
      }),
    };
    for (const { author } of batch1LowerAuthors) {
      await expect(
        createNativeAuthoredTask(author, 0, 0, failed),
      ).rejects.toThrow("의도한 계산 실패");
    }
  });

  it("B 검토 C02: 틀린 이유·차이만 맞힌 증거의 부분점수와 역연산 요구를 명시한다", async () => {
    const { problem } = await createNativeAuthoredTask(
      batch1LowerAuthors[1]!.author,
      0,
      0,
      adapters,
    );
    const criterion = (id: string) =>
      problem.rubric.criteria.find((c) => c.criterionId === id)!;
    expect(criterion("wrong-relation").scoring.partial[0]).toEqual({
      points: 1,
      condition: "식은 옳으나 부호 이유가 빠지거나 틀림",
    });
    expect(criterion("repair-gap").scoring.partial[0]!.condition).toContain(
      "차이와 그 근거는 옳지만 바르게 할 식을 쓰지 않음",
    );
    expect(criterion("original").alternatives).toEqual([
      "이항하여 원 수를 구하되 부호 변경 과정을 보임",
    ]);
    expect(criterion("original").scoring.zero).toContain("역연산");
  });

  it("B 검토 C02: 분수는 분자를 읽는 끝소리에 맞춰 을·를을 고른다", async () => {
    const observed = new Set<string>();
    for (let seed = 0; seed < 24; seed++) {
      const task = await createNativeAuthoredTask(
        batch1LowerAuthors[1]!.author,
        seed,
        0,
        adapters,
      );
      const helper = task.helpers[0]!;
      if (helper.kind !== "calculation") throw new Error("계산 보조 아님");
      const last = Math.abs(helper.problem.facts.an!) % 10;
      const particle = [2, 4, 5, 9].includes(last) ? "를" : "을";
      observed.add(particle);
      expect(task.problem.content).toContain(`$${particle} `);
    }
    expect([...observed].sort()).toEqual(["를", "을"]);
  });

  it("B 검토 C03: 남은 비율의 방정식·검산 대안은 발문에서도 허용한다", async () => {
    const { problem } = await createNativeAuthoredTask(
      batch1LowerAuthors[2]!.author,
      0,
      0,
      adapters,
    );
    expect(problem.requirements[1]!.text).toContain("남은 비율을 곱하는 방법");
    expect(problem.requirements[2]!.text).toContain("할인 조건을 적용하면");
    expect(problem.rubric.criteria[1]!.scoring.zero).toContain(
      "할인 조건에 맞는 정가와 판매가의 관계식",
    );
  });

  it("B 검토 C04: 소수·잔액 대안과 발문의 요구를 맞추고 경계 부분점수를 대칭으로 둔다", async () => {
    const { problem } = await createNativeAuthoredTask(
      batch1LowerAuthors[3]!.author,
      0,
      0,
      adapters,
    );
    expect(problem.requirements[1]!.text).toContain("정확한 소수");
    expect(problem.rubric.criteria[0]!.alternatives.join(" ")).toContain(
      "전체 비용의 식과 각 항의 뜻",
    );
    expect(problem.rubric.criteria[2]!.alternatives.join(" ")).toContain(
      "두 경우의 비용과 예산 비교를 함께",
    );
    expect(problem.rubric.criteria[2]!.scoring.partial[0]!.condition).toContain(
      "가능성·다음 정수의 불가능성 중 하나만",
    );
  });

  it("B 검토: 최종답 기준에는 선행 오류로 틀린 답의 점수를 주지 않는다", async () => {
    for (const entry of batch1LowerAuthors) {
      const { problem } = await createNativeAuthoredTask(
        entry.author,
        0,
        0,
        adapters,
      );
      for (const criterion of problem.rubric.criteria.filter(
        (c) => c.role === "answer",
      )) {
        expect(criterion.carryForward.condition).toContain(
          "틀린 최종답에는 점수를 주지 않는다",
        );
      }
    }
  });

  it("검산기는 생성기·저자·공용 계산함수를 import하지 않는다", () => {
    const source = readFileSync(
      "src/lib/engine/descriptiveVerification/batch1Lower.ts",
      "utf8",
    );
    const imports =
      source.match(/^import[\s\S]*?from\s+["'][^"']+["'];/gm) ?? [];
    expect(imports.length).toBe(2);
    expect(imports.every((s) => s.startsWith("import type "))).toBe(true);
    expect(source).not.toMatch(
      /generateMiddleProblem|descriptiveAuthor|problem\.facts|problem\.answer/,
    );
  });
});
