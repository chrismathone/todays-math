import { describe, expect, it } from "vitest";
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
import {
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
} from "@/contracts/arithmetic.contract";
import { listArithmeticPresets } from "@/lib/arithmeticPresets";

describe("arithmetic shared output adapter", () => {
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
      const markup = renderToStaticMarkup(
        createElement(NativeProblem, { problem, print: true }),
      );
      expect(markup).toContain("katex");
      expect(markup).not.toContain("katex-error");
      expect(problem.content).toContain("1회차 · 1번");
      if (item.prompt.layout === "math")
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
  });
  it("keeps legacy vertical/horizontal prompts and distinct round order IDs without regenerating", () => {
    const presets = listArithmeticPresets();
    const rounds = [
      presets.find((item) => item.example.notation === "vertical")!,
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
    expect(problems.map((item) => item.section)).toEqual([
      "1회차",
      "1회차",
      "2회차",
      "2회차",
    ]);
    expect(problems.map((item) => item.answer)).toEqual(
      sheet.rounds.flatMap((round) => round.items.map((item) => item.answer)),
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
});
