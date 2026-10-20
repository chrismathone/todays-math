import { describe, expect, it } from "vitest";
import {
  createNativeAuthoredTask,
  toExamStudyDraft,
} from "@/lib/engine/descriptiveAuthor/compose";
import { createNativeHelperAdapters } from "@/lib/engine/descriptiveAuthor/adapters";
import {
  rectangleAuthor,
  rectangleGateSuite,
} from "@/lib/engine/descriptiveAuthor/rectangleDemo";
import {
  checkNativeGates,
  verifyNativePrinted,
} from "@/lib/engine/nativeDescriptiveGates";
import { verifyRectangleDemo } from "@/lib/engine/descriptiveVerification/rectangleDemo";
import { generateMiddleProblem } from "@/lib/middle/generate";
import { examStudyFamilies } from "@/lib/examStudy/registry";

const adapters = () =>
  createNativeHelperAdapters(async () => ({ ok: true, svg: "<svg></svg>" }));

describe("서술형 주 저자와 보조 엔진 — 등록하지 않는 세로 한 줄", () => {
  it("주 저자가 목표·상황·소문항·채점표를 소유하고 계산·그림은 보조한다", async () => {
    const task = await createNativeAuthoredTask(
      rectangleAuthor,
      20261020,
      0,
      adapters(),
    );
    expect(task.authorId).toBe(rectangleAuthor.definition.definitionId);
    expect(task.helpers.map((h) => h.kind)).toEqual(["calculation", "figure"]);
    expect(task.problem.requirements).toHaveLength(3);
    expect(task.problem.rubric.criteria.map((c) => c.points)).toEqual([
      3, 3, 2,
    ]);
    expect(
      verifyNativePrinted(task.problem, verifyRectangleDemo).issues,
    ).toEqual([]);
    const draft = toExamStudyDraft(task);
    expect(draft.questionType).toBe("서술형");
    expect(draft.rubric).toEqual(task.problem.rubric);
    expect(examStudyFamilies().some((f) => f.id.includes(task.authorId))).toBe(
      false,
    );
  });

  it("계산 보조를 같은 씨앗의 기존 중등 유형으로 호출한다", async () => {
    const task = await createNativeAuthoredTask(
      rectangleAuthor,
      7,
      1,
      adapters(),
    );
    const helper = task.helpers[0]!;
    expect(helper.kind).toBe("calculation");
    if (helper.kind !== "calculation") throw new Error("계산 보조 없음");
    expect(helper.problem).toEqual(generateMiddleProblem(helper.typeKey, 7, 1));
    expect(task.problem.content).not.toBe(helper.problem.content);
    expect(task.problem.answer).not.toBe(helper.problem.answer);
  });

  it.each(["calculation", "figure", "graph"] as const)(
    "%s 실패 시 대체 문항 없이 실패한다",
    async (kind) => {
      const author =
        kind === "graph"
          ? {
              ...rectangleAuthor,
              helpers: [
                ...rectangleAuthor.helpers,
                {
                  id: "graph",
                  kind: "graph" as const,
                  request: () => ({
                    id: "graph",
                    kind: "graph" as const,
                    spec: { version: "graph-1" },
                  }),
                },
              ],
            }
          : rectangleAuthor;
      const helpers = adapters();
      helpers[kind] = async () => ({ ok: false, error: "의도한 보조 실패" });
      await expect(
        createNativeAuthoredTask(author, 1, 0, helpers),
      ).rejects.toThrow(`${kind}: 의도한 보조 실패`);
    },
  );

  it("보조 0개도 허용하지만 ID 중복·다른 결과·주 저자 정체 변경은 거부한다", async () => {
    const task = await createNativeAuthoredTask(
      rectangleAuthor,
      1,
      0,
      adapters(),
    );
    const noHelpers = {
      ...rectangleAuthor,
      helpers: [],
      compose: () => ({ ...task.problem, figureSpec: null }),
    };
    expect(
      (await createNativeAuthoredTask(noHelpers, 1, 0, adapters())).helpers,
    ).toEqual([]);
    await expect(
      createNativeAuthoredTask(
        {
          ...rectangleAuthor,
          helpers: [rectangleAuthor.helpers[0]!, rectangleAuthor.helpers[0]!],
        },
        1,
        0,
        adapters(),
      ),
    ).rejects.toThrow(/중복/);
    const helpers = adapters();
    const calculate = helpers.calculation;
    helpers.calculation = async (req) => {
      const result = await calculate(req);
      return result.ok
        ? { ok: true, output: { ...result.output, id: "다른 보조" } }
        : result;
    };
    await expect(
      createNativeAuthoredTask(rectangleAuthor, 1, 0, helpers),
    ).rejects.toThrow(/보조 결과/);
    await expect(
      createNativeAuthoredTask(
        { ...noHelpers, compose: () => ({ ...task.problem, seed: 2 }) },
        1,
        0,
        adapters(),
      ),
    ).rejects.toThrow();
  });

  it("실제 수치 범위·두 상황 갈래·네 훼손 부류를 모두 검사한다", async () => {
    const suite = await rectangleGateSuite(adapters());
    const result = checkNativeGates(suite);
    expect(result.gates.map((g) => [g.id, g.issues])).toEqual(
      ["G1", "G2", "G3", "G4", "G5", "G6"].map((id) => [id, []]),
    );
    expect(result.samplesChecked).toBeGreaterThanOrEqual(500);
    expect(result.coverage.every((c) => c.missing.length === 0)).toBe(true);
    expect(
      result.coverage.find((c) => c.dimension === "pairContext")!.observed,
    ).toHaveLength(408);
    expect(result.mutations.every((m) => m.detected)).toBe(true);
  });

  it("보조의 치수 누락·빈 SVG·잘못된 그래프 스펙을 실패로 돌린다", async () => {
    for (const rendered of [
      { ok: true as const, svg: "<svg/>", droppedDimensions: ["width"] },
      { ok: true as const, svg: " " },
    ]) {
      const helpers = createNativeHelperAdapters(async () => rendered);
      await expect(
        createNativeAuthoredTask(rectangleAuthor, 0, 0, helpers),
      ).rejects.toThrow(/figure:/);
    }
    const helpers = adapters();
    expect(
      await helpers.graph({ id: "graph", kind: "graph", spec: { version: 2 } }),
    ).toMatchObject({ ok: false });
    expect(
      await helpers.graph({
        id: "graph",
        kind: "graph",
        spec: { version: "graph-1" },
      }),
    ).toMatchObject({ ok: true });
    expect(
      await helpers.calculation({
        id: "missing",
        kind: "calculation",
        engine: "middle",
        typeKey: "missing",
        seed: 0,
        variant: 0,
      }),
    ).toMatchObject({ ok: false });
  });

  it("조립 뒤 바뀐 그림·요구·배점은 거부하고 허용 밖 변형을 만들지 않는다", async () => {
    for (const change of [
      (p: Awaited<ReturnType<typeof createNativeAuthoredTask>>["problem"]) => {
        p.figureSpec = { version: 2 };
      },
      (p: Awaited<ReturnType<typeof createNativeAuthoredTask>>["problem"]) => {
        p.requirements[0]!.text = "다른 요구";
      },
    ]) {
      const author = {
        ...rectangleAuthor,
        compose: (...args: Parameters<typeof rectangleAuthor.compose>) => {
          const p = rectangleAuthor.compose(...args);
          change(p);
          return p;
        },
      };
      await expect(
        createNativeAuthoredTask(author, 0, 0, adapters()),
      ).rejects.toThrow(/불일치/);
    }
    await expect(
      createNativeAuthoredTask(rectangleAuthor, 0, 2, adapters()),
    ).rejects.toThrow(/변형/);
  });
});
