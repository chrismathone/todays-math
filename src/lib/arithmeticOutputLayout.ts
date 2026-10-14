import type { StudioProblem } from "@/components/unified/types";

export interface ArithmeticOutputGroup {
  key: string;
  title: string;
  problems: StudioProblem[];
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
