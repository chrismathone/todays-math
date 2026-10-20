import { describe, expect, it } from "vitest";
import { createNativeAuthoredTask } from "@/lib/engine/descriptiveAuthor/compose";
import { createNativeHelperAdapters } from "@/lib/engine/descriptiveAuthor/adapters";
import { rectangleAuthor } from "@/lib/engine/descriptiveAuthor/rectangleDemo";
import { lineAreaAuthor } from "@/lib/engine/descriptiveAuthor/lineAreaDemo";
import {
  lcmExponentAuthor,
  rationalRepairAuthor,
  discountModelAuthor,
  integerBudgetAuthor,
} from "@/lib/engine/descriptiveAuthor/batch1Lower";
import {
  rootSignAuthor,
  quadraticAreaAuthor,
  parabolaTranslationAuthor,
} from "@/lib/engine/descriptiveAuthor/batch1Upper";

describe("첫 묶음 실제 검토 답안의 채점 경계", () => {
  it("식 하나만 옳은 답안·검산만 옳은 답안과 선행 오류의 방법 점수를 빠뜨리지 않는다", async () => {
    const task = await createNativeAuthoredTask(
      rectangleAuthor,
      20261020,
      0,
      createNativeHelperAdapters(async () => ({
        ok: true,
        svg: "<svg></svg>",
      })),
    );
    const [model, lengths, area] = task.problem.rubric.criteria;
    // x−y=16만 옳고 이유가 없는 답안도 1점 경계에 들어가야 한다.
    expect(
      model!.scoring.partial.find((p) => p.points === 1)!.condition,
    ).toContain("한 관계식");
    expect(
      model!.scoring.partial.find((p) => p.points === 1)!.condition,
    ).not.toContain("그 이유만");
    // 두 조건 검산은 맞으나 80 cm로 쓴 답안: 검토에 대한 1점.
    expect(area!.scoring.partial[0]!.condition).toContain("두 조건");
    expect(area!.scoring.partial[0]!.condition).toContain("또는");
    // 잘못 세운 식에서 32,16을 일관되게 구한 경우: 방법 2점을 보호.
    expect(lengths!.carryForward.condition).toContain("방법 2점");
    expect(
      lengths!.scoring.partial.find((p) => p.points === 2)!.condition,
    ).toContain("누락");
    // 512 cm²를 정답으로 승격하지 않고 검토 방법만 보호한다.
    expect(area!.carryForward.condition).toContain("정답");
    expect(area!.carryForward.condition).toContain("검토 1점");
    for (const c of task.problem.rubric.criteria)
      expect(c.scoring.zero).toContain("만점·부분점수");
  });
  it("C06 높이의 발이 밑변 밖에 있어도 참인 대안만 제시하고 명시한 계산 과정을 채점한다", async () => {
    const task = await createNativeAuthoredTask(
      lineAreaAuthor,
      20261020,
      0,
      createNativeHelperAdapters(async () => ({
        ok: true,
        svg: "<svg></svg>",
      })),
    );
    expect(task.problem.answer).toBe("2 cm²");
    const area = task.problem.rubric.criteria.find(
      (c) => c.criterionId === "area",
    )!;
    expect(area.alternatives.join(" ")).not.toContain("포함하는 직사각형");
    expect(area.scoring.full).toContain("계산 과정");
    expect(area.scoring.full).not.toContain("빠진 답안도");
    const lengths = task.problem.rubric.criteria.find(
      (c) => c.criterionId === "lengths",
    )!;
    expect(
      lengths.scoring.partial.find((p) => p.points === 1)!.condition,
    ).toContain("설명 없이");
    expect(
      lengths.scoring.partial.find((p) => p.points === 1)!.condition,
    ).toContain("하나 이상");
    expect(task.problem.rubric.criteria[0]!.scoring.full).toContain(
      "좌표 조건",
    );
    expect(
      task.problem.rubric.criteria[1]!.scoring.partial[0]!.condition,
    ).toContain("검산만");
    expect(task.problem.modelAnswer).not.toContain("$-1x=");
  });
  it("C07·C09·C10의 오류 승계는 방법 부분과 실제 정답 부분을 구별한다", async () => {
    const adapters = createNativeHelperAdapters(async () => ({
      ok: true,
      svg: "<svg></svg>",
    }));
    const root = (
      await createNativeAuthoredTask(rootSignAuthor, 20261024, 0, adapters)
    ).problem;
    expect(root.rubric.criteria[1]!.scoring.partial[0]!.condition).toContain(
      "기호 없이",
    );
    expect(root.rubric.criteria[1]!.carryForward.condition).toContain(
      "최대 2점",
    );
    expect(root.rubric.criteria[2]!.carryForward.condition).toContain(
      "적용하지 않는다",
    );
    const area = (
      await createNativeAuthoredTask(quadraticAreaAuthor, 20261020, 0, adapters)
    ).problem;
    expect(area.content).toContain("삼각형");
    expect(area.rubric.criteria[0]!.errors.join(" ")).not.toContain(
      "평행사변형",
    );
    expect(area.rubric.criteria[2]!.carryForward.condition).toContain(
      "검토 1점",
    );
    const translated = (
      await createNativeAuthoredTask(
        parabolaTranslationAuthor,
        20261020,
        0,
        adapters,
      )
    ).problem;
    expect(
      translated.rubric.criteria[1]!.scoring.partial[0]!.condition,
    ).toContain("다섯 요소 중 네");
    expect(translated.rubric.criteria[2]!.carryForward.condition).toContain(
      "검산 1점",
    );
  });
  it("C01의 두 분해식만 맞은 답과 C02의 올바른 역연산 뒤 계산 실수를 구별한다", async () => {
    const adapters = createNativeHelperAdapters(async () => ({
      ok: true,
      svg: "<svg></svg>",
    }));
    const lcm = (
      await createNativeAuthoredTask(lcmExponentAuthor, 20261020, 0, adapters)
    ).problem;
    expect(lcm.rubric.criteria[0]!.scoring.partial[0]!.condition).toContain(
      "한 수 이상",
    );
    expect(lcm.rubric.criteria[1]!.scoring.partial[1]!.condition).toContain(
      "하나 이상",
    );
    const repair = (
      await createNativeAuthoredTask(
        rationalRepairAuthor,
        20261022,
        0,
        adapters,
      )
    ).problem;
    const original = repair.rubric.criteria.find(
      (c) => c.criterionId === "original",
    )!;
    expect(original.scoring.full).toContain("단순 계산 실수");
    expect(original.carryForward.condition).toContain("부호");
    expect(original.expected).toContain("양변에서");
    const discount = (
      await createNativeAuthoredTask(discountModelAuthor, 20261020, 0, adapters)
    ).problem;
    expect(discount.rubric.criteria[1]!.carryForward.condition).toContain(
      "우선",
    );
    expect(discount.rubric.criteria[1]!.carryForward.condition).toContain(
      "만점 3점",
    );
    const budget = (
      await createNativeAuthoredTask(integerBudgetAuthor, 20261020, 0, adapters)
    ).problem;
    expect(budget.rubric.criteria[1]!.alternatives.join(" ")).toContain(
      "순환소수",
    );
  });
});
