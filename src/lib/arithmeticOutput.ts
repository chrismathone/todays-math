import type { StudioProblem } from "@/components/unified/types";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import type { ArithmeticV2SheetPayload } from "@/contracts/arithmeticV2.contract";
import type { ArithmeticSkillSelection } from "@/contracts/arithmetic.contract";
import { listArithmeticSkills } from "@/lib/arithmetic/catalog";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2";
import { arithmeticFeatureLabels } from "@/lib/arithmeticPresentation";
import {
  arithmeticAngleSvg,
  arithmeticAngleWidthMm,
} from "@/lib/arithmetic-v2/geometry";

export type ArithmeticOutputSheet =
  ArithmeticSheetPayload | ArithmeticV2SheetPayload;

const operatorLatex = (operator: string) =>
  operator === "×" ? "\\times" : operator === "÷" ? "\\div" : operator;

/** An array preserves place-value alignment through the shared math renderer and exports. */
function vertical(left: number, right: number, operator: string) {
  return `\\begin{array}{r} ${left} \\\\ ${operatorLatex(operator)}\\;${right} \\\\ \\hline \\phantom{${Math.max(Math.abs(left), Math.abs(right))}} \\end{array}`;
}

/** Output is a deterministic projection of the saved snapshot, never a generation request. */
export function arithmeticToStudioProblems(
  sheet: ArithmeticOutputSheet,
): StudioProblem[] {
  let number = 0;
  const types = new Map(listArithmeticV2Types().map((type) => [type.id, type]));
  const skills = new Map(
    listArithmeticSkills().map((skill) => [skill.skillId, skill]),
  );
  const base = {
    questionType: "short-answer" as const,
    solution: "",
    difficulty: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
  };
  if (sheet.payloadVersion === 2) {
    return sheet.rounds.flatMap((round) =>
      round.items.map((item) => {
        const type = types.get(item.typeId);
        const groupTitle = type?.title ?? item.typeId;
        const figureId =
          item.prompt.layout === "math" ? item.prompt.figureId : undefined;
        if (figureId && !sheet.figures)
          throw new Error("저장된 각도 도형이 없습니다");
        const svg = figureId
          ? arithmeticAngleSvg(figureId, sheet.figures!)
          : undefined;
        const dimensions = svg
          ? /viewBox="([^"]+)"/.exec(svg)![1].split(/\s+/).map(Number).slice(2)
          : undefined;
        const formula =
          item.prompt.layout === "vertical"
            ? vertical(
                item.prompt.left,
                item.prompt.right,
                item.prompt.operator,
              )
            : `${item.prompt.latex} \\quad \\underline{\\hspace{2em}}`;
        return {
          ...base,
          id: `arithmetic-v2:${sheet.seed}:${round.round}:${item.order}`,
          content: svg
            ? `${item.prompt.instruction}\n\n[그림1]\n\n답: $\\underline{\\hspace{2em}}^{\\circ}$`
            : `${item.prompt.instruction ? `${item.prompt.instruction}\n\n` : ""}$$${formula}$$`,
          ...(svg
            ? {
                figureSvg: svg,
                figureUrls: [
                  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
                ],
                figureDims: dimensions!,
                figureSourceMm: [arithmeticAngleWidthMm(svg)],
              }
            : {}),
          answer: `$${item.answer.latex}$`,
          grade: type?.grade ?? "",
          chapter: groupTitle,
          section: groupTitle,
          problemCode: `AR2-R${round.round}-Q${item.order}`,
          sourceLabel: groupTitle,
          arithmetic: {
            round: round.round,
            number: ++number,
            groupKey: item.typeId,
            groupTitle,
          },
          source: {
            kind: "arithmeticSheet",
            payloadVersion: 2,
            seed: sheet.seed,
            round: round.round,
            item: structuredClone(item),
          },
        };
      }),
    );
  }
  return sheet.rounds.flatMap((round) =>
    round.items.map((item) => {
      const skill = skills.get(item.spec.skillId);
      const groupTitle = [
        skill?.label ?? item.spec.skillId,
        // Saved specs have already validated the skill/constraint pairing.
        ...arithmeticFeatureLabels(item.spec as ArithmeticSkillSelection),
      ].join(" · ");
      const [left, right] = item.prompt.operands;
      const formula =
        item.prompt.notation === "vertical"
          ? vertical(left, right, item.prompt.operator)
          : `${left} ${operatorLatex(item.prompt.operator)} ${right} = \\underline{\\hspace{2em}}`;
      return {
        ...base,
        id: `arithmetic-v1:${sheet.seed}:${round.round}:${item.order}`,
        content: `$$${formula}$$`,
        answer: item.answer,
        grade: "",
        chapter: skill?.label ?? item.spec.skillId,
        section: groupTitle,
        problemCode: `AR1-R${round.round}-Q${item.order}`,
        sourceLabel: groupTitle,
        arithmetic: {
          round: round.round,
          number: ++number,
          groupKey: JSON.stringify([item.spec.skillId, item.spec.constraints]),
          groupTitle,
        },
        source: {
          kind: "arithmeticSheet",
          payloadVersion: 1,
          seed: sheet.seed,
          round: round.round,
          item: structuredClone(item),
        },
      };
    }),
  );
}

/** Regeneration from review preserves EACH saved round, including heterogeneous rounds. */
export function arithmeticV2ReviewRounds(sheet: ArithmeticV2SheetPayload) {
  return sheet.rounds.map((round) => {
    const counts = new Map<string, number>();
    for (const item of round.items)
      counts.set(item.typeId, (counts.get(item.typeId) ?? 0) + 1);
    return {
      allocations: [...counts].map(([typeId, count]) => ({ typeId, count })),
    };
  });
}

export function arithmeticReviewRounds(sheet: ArithmeticSheetPayload) {
  return sheet.rounds.map((round) => {
    const groups = new Map<
      string,
      {
        skillId: (typeof round.items)[number]["spec"]["skillId"];
        constraints: (typeof round.items)[number]["spec"]["constraints"];
        count: number;
      }
    >();
    for (const { spec } of round.items) {
      const key = JSON.stringify([spec.skillId, spec.constraints]);
      const previous = groups.get(key);
      if (previous) previous.count++;
      else
        groups.set(key, {
          skillId: spec.skillId,
          constraints: structuredClone(spec.constraints),
          count: 1,
        });
    }
    return { skills: [...groups.values()] };
  });
}
