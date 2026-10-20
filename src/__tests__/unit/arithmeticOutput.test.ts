import { describe, expect, it, vi } from "vitest";
import { getArithmeticV2Definition } from "@/lib/arithmetic-v2/registry";
import {
  figureFirstGroupInstruction,
  isFigureFirstType,
} from "@/lib/arithmetic-v2/presentation/figureFirst";
import katex from "katex";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NativeProblem from "@/components/unified/NativeProblem";
import {
  arithmeticToStudioProblems,
  arithmeticReviewRounds,
  arithmeticV2ReviewRounds,
} from "@/lib/arithmeticOutput";
import {
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
} from "@/contracts/arithmeticV2.contract";
import { buildArithmeticSheet } from "@/lib/arithmetic/sheet";
import { reopenArithmeticSheet } from "@/lib/arithmetic/reopen";
import {
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
} from "@/contracts/arithmetic.contract";
import { listArithmeticPresets } from "@/lib/arithmeticPresets";
import { arithmeticOutputGroups } from "@/lib/arithmeticOutputLayout";
import { arithmeticFigurePresentation } from "@/lib/arithmetic-v2/presentation/figurePolicy";
import {
  arithmeticGeometryNotation,
  arithmeticProseNotation,
} from "@/lib/arithmetic-v2/presentation/notation";

describe("arithmetic shared output adapter", () => {
  it("projects saved items without generating fresh catalog examples", () => {
    const type = listArithmeticV2Types()[0];
    const sheet = buildArithmeticV2Sheet({
      engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
      seed: "render-without-regeneration",
      rounds: [{ allocations: [{ typeId: type.id, count: 1 }] }],
    });
    const expected = arithmeticToStudioProblems(sheet);
    const generation = vi
      .spyOn(getArithmeticV2Definition(type.id), "problemAt")
      .mockImplementation(() => {
        throw new Error("Rendering must not generate examples");
      });
    try {
      expect(arithmeticToStudioProblems(sheet)).toEqual(expected);
      expect(generation).not.toHaveBeenCalled();
    } finally {
      generation.mockRestore();
    }
  });

  it("preserves every supported grade prompt, exact answer and snapshot with valid math markup", () => {
    const kinds = new Set<string>();
    for (const type of listArithmeticV2Types()) {
      const sheet = buildArithmeticV2Sheet({
        engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
        seed: "adapter-all-types",
        rounds: [{ allocations: [{ typeId: type.id, count: 1 }] }],
      });
      const before = structuredClone(sheet);
      const [problem] = arithmeticToStudioProblems(sheet);
      const item = sheet.rounds[0].items[0];
      kinds.add(item.answer.kind);
      expect(problem.answer).toBe(`$${item.answer.latex}$`);
      expect(problem.source).toMatchObject({
        payloadVersion: 2,
        round: 1,
        item,
      });
      expect(problem.solution).toBe("");
      expect(problem.content).not.toContain("겨냥도");
      const markup = renderToStaticMarkup(
        createElement(NativeProblem, { problem, print: true }),
      );
      expect(markup).toContain("katex");
      expect(markup).not.toContain("katex-error");
      expect(problem.content).not.toMatch(/회차|\d+번/);
      expect(problem.arithmetic).toEqual({
        round: 1,
        number: 1,
        groupKey: type.id,
        groupTitle: type.title,
        // Figure-first families (2026-10-15/16) carry one group question.
        ...(isFigureFirstType(type.id)
          ? { groupInstruction: figureFirstGroupInstruction(type.id) }
          : {}),
      });
      expect(problem.section).toBe(type.title);
      if (arithmeticFigurePresentation(item.prompt, type.id).showFigure)
        expect(problem.figureSvg).toContain("<svg");
      else if (
        item.prompt.layout === "math" &&
        (item.prompt.figureId ||
          (type.strand === "도형" && item.prompt.answerUnit !== undefined) ||
          type.promptPresentation === "prose" ||
          item.prompt.latex === `\\text{${item.prompt.text}}`)
      ) {
        expect(problem.content).toContain(
          (item.prompt.figureId || type.strand === "도형"
            ? arithmeticGeometryNotation
            : arithmeticProseNotation)(
            arithmeticFigurePresentation(item.prompt, type.id).lines[0],
          ),
        );
        expect(problem.content).not.toContain("[그림1]");
      } else if (item.prompt.layout === "math")
        expect(problem.content).toContain(item.prompt.latex);
      else expect(problem.content).toContain("\\begin{array}{r}");
      for (const match of problem.content.matchAll(/\$\$([\s\S]+?)\$\$/g))
        expect(() =>
          katex.renderToString(match[1], { throwOnError: true }),
        ).not.toThrow();
      expect(() =>
        katex.renderToString(item.answer.latex, { throwOnError: true }),
      ).not.toThrow();
      expect(arithmeticToStudioProblems(sheet)).toEqual([problem]);
      expect(sheet).toEqual(before);
    }
    expect(kinds).toEqual(
      new Set([
        "integer",
        "rational",
        "decimal",
        "remainder",
        "polynomial",
        "surd",
      ]),
    );
  }, 60000);
  it("keeps legacy vertical/horizontal prompts and distinct round order IDs without regenerating", () => {
    const presets = listArithmeticPresets();
    const vertical = presets.find(
      (item) => item.example.notation === "vertical",
    )!;
    const rounds = [
      vertical,
      presets.find((item) => item.group === "나눗셈")!,
    ].map((preset) => ({ skills: [{ ...preset.selection, count: 2 }] }));
    const sheet = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "legacy-output",
      rounds,
    });
    const problems = arithmeticToStudioProblems(sheet);
    expect(new Set(problems.map((item) => item.id)).size).toBe(4);
    expect(problems.map((item) => item.arithmetic?.round)).toEqual([
      1, 1, 2, 2,
    ]);
    expect(problems.map((item) => item.arithmetic?.number)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(problems.every((item) => !item.content.includes("회차"))).toBe(true);
    // The section names the picked card; the chapter stays the skill family.
    expect(problems[0].section).toContain(vertical.title);
    expect(problems[0].section).toContain("세로셈");
    expect(problems[0].chapter).not.toBe(problems[0].section);
    expect(problems.map((item) => item.answer)).toEqual(
      sheet.rounds.flatMap((round) =>
        round.items.map((item) => arithmeticProseNotation(item.answer)),
      ),
    );
    expect(problems[0].content).toContain("\\begin{array}{r}");
    expect(problems[2].content).toContain("\\div");
    expect(arithmeticReviewRounds(sheet)).toEqual(rounds);
  });
  it("regenerates heterogeneous grade rounds using their own saved allocations", () => {
    const types = listArithmeticV2Types();
    const rounds = [
      { allocations: [{ typeId: types[0].id, count: 3 }] },
      { allocations: [{ typeId: types.at(-1)!.id, count: 2 }] },
    ];
    const sheet = buildArithmeticV2Sheet({
      engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
      seed: "different-rounds",
      rounds,
    });
    expect(arithmeticV2ReviewRounds(sheet)).toEqual(rounds);
    expect(
      arithmeticToStudioProblems(sheet).map((item) => item.problemCode),
    ).toEqual([
      "AR2-R1-Q1",
      "AR2-R1-Q2",
      "AR2-R1-Q3",
      "AR2-R2-Q1",
      "AR2-R2-Q2",
    ]);
  });
  it("groups legacy conditions separately and keeps every saved item in its original position", () => {
    const presets = listArithmeticPresets().filter((preset) =>
      ["add-one-small-0-4", "add-one-small-5-9-carry"].includes(preset.id),
    );
    const sheet = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "group-conditions",
      rounds: [
        {
          skills: presets.map((preset) => ({ ...preset.selection, count: 2 })),
        },
      ],
    });
    const before = structuredClone(sheet);
    const problems = arithmeticToStudioProblems(sheet);
    const [round] = arithmeticOutputGroups(problems);
    expect(round.groups).toHaveLength(presets.length);
    expect(new Set(round.groups.map((group) => group.title)).size).toBe(
      presets.length,
    );
    expect(round.groups.flatMap((group) => group.problems)).toEqual(problems);
    expect(round.count).toBe(problems.length);
    expect(sheet).toEqual(before);
  });
  it("titles a legacy group by the picked preset, or by its conditions including a fixed operand", () => {
    // Owner (2026-10-16): «3 더하기» came out as «한 자리 덧셈 · 받아올림 있음 · 가로셈».
    const fixedThree = listArithmeticPresets().find(
      (preset) => preset.id === "add-one-fixed-3-carry",
    )!;
    const sheet = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "preset-title",
      rounds: [
        {
          skills: [
            { ...fixedThree.selection, count: 3 },
            {
              skillId: "one-digit-add",
              constraints: {
                carry: "some",
                left: { min: 5, max: 9 },
                right: { min: 4, max: 4 },
              },
              count: 2,
            },
            {
              skillId: "one-digit-sub",
              constraints: {
                minuend: { min: 5, max: 9 },
                subtrahend: { min: 4, max: 4 },
              },
              count: 2,
            },
          ],
        },
      ],
    });
    const before = structuredClone(sheet);
    const problems = arithmeticToStudioProblems(sheet);
    // The preset is honoured by the engine: the right operand stays 3.
    expect(problems.slice(0, 3).map((problem) => problem.source)).toSatisfy(
      (sources: { item: { prompt: { operands: number[] } } }[]) =>
        sources.every((source) => source.item.prompt.operands[1] === 3),
    );
    const [round] = arithmeticOutputGroups(problems);
    expect(round.groups.map((group) => group.title)).toEqual([
      "3 더하기 · 받아올림 있음 · 가로셈",
      "한 자리 덧셈 · 받아올림 있음 · 더하는 수 4 · 가로셈",
      "한 자리 뺄셈 · 음이 아닌 답 · 빼는 수 4 · 가로셈",
    ]);
    expect(problems[0].section).toBe("3 더하기 · 받아올림 있음 · 가로셈");
    expect(problems[0].sourceLabel).toBe(problems[0].section);
    expect(problems[0].chapter).toBe("한 자리 덧셈");
    // The title is a projection: the snapshot, its reopen and the review
    // allocations never see it.
    expect(sheet).toEqual(before);
    expect(reopenArithmeticSheet(sheet)).toEqual(before);
    expect(arithmeticReviewRounds(sheet)[0].skills.map((s) => s.count)).toEqual(
      [3, 2, 2],
    );
  });
});
