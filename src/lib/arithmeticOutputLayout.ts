import type { StudioProblem } from "@/components/unified/types";
import { arithmeticGeometryNotation } from "@/lib/arithmetic-v2/presentation/notation";

export interface ArithmeticOutputGroup {
  key: string;
  title: string;
  problems: StudioProblem[];
}

/** "[11~20] question" for a contiguous group whose type shares one question. */
export function arithmeticGroupInstruction(
  problems: readonly StudioProblem[],
): string | undefined {
  const instruction = problems[0]?.arithmetic?.groupInstruction;
  if (!instruction) return undefined;
  const first = problems[0].arithmetic!.number,
    last = problems.at(-1)!.arithmetic?.number ?? first;
  return `[${first === last ? first : `${first}~${last}`}] ${instruction}`;
}

/** MathText markup: the "[11~20]" range stays plain text. */
export function arithmeticGroupInstructionMarkup(line: string): string {
  const range = /^\[[\d~]+\] /.exec(line)?.[0] ?? "";
  return range + arithmeticGeometryNotation(line.slice(range.length));
}

/** The contiguous group that starts at `index`, in the given order. */
export function arithmeticGroupFrom(
  problems: readonly StudioProblem[],
  index: number,
): StudioProblem[] {
  const start = problems[index]?.arithmetic;
  if (!start) return [];
  let end = index + 1;
  while (
    end < problems.length &&
    problems[end].arithmetic?.round === start.round &&
    problems[end].arithmetic?.groupKey === start.groupKey
  )
    end++;
  return problems.slice(index, end);
}

export interface ArithmeticOutputRound {
  round: number;
  groups: ArithmeticOutputGroup[];
  count: number;
}

/** Contiguous groups preserve the exact saved order, even in heterogeneous rounds. */
export function arithmeticOutputGroups(
  problems: StudioProblem[],
): ArithmeticOutputRound[] {
  const rounds: ArithmeticOutputRound[] = [];
  for (const problem of problems) {
    const item = problem.arithmetic;
    if (!item) continue;
    let round = rounds.at(-1);
    if (round?.round !== item.round) {
      round = { round: item.round, groups: [], count: 0 };
      rounds.push(round);
    }
    let group = round.groups.at(-1);
    if (group?.key !== item.groupKey) {
      group = { key: item.groupKey, title: item.groupTitle, problems: [] };
      round.groups.push(group);
    }
    group.problems.push(problem);
    round.count++;
  }
  return rounds;
}

export function arithmeticGroupStarts(
  problem: StudioProblem,
  previous?: StudioProblem,
): boolean {
  return Boolean(
    problem.arithmetic &&
    (problem.arithmetic.round !== previous?.arithmetic?.round ||
      problem.arithmetic.groupKey !== previous?.arithmetic?.groupKey),
  );
}
