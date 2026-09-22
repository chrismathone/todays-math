export type LabCelebration = {
  activity: string;
  total: number;
  streak: number;
  clean: boolean;
  review: boolean;
  milestone: boolean;
};

export type LabMomentum = {
  solved: string[];
  streak: number;
  best: number;
  celebration: LabCelebration | null;
};

export const emptyMomentum: LabMomentum = {
  solved: [],
  streak: 0,
  best: 0,
  celebration: null,
};

export function recordLabSuccess(
  state: LabMomentum,
  activity: string,
  clean: boolean,
): LabMomentum {
  const review = state.solved.includes(activity);
  const solved = review ? state.solved : [...state.solved, activity];
  const streak = review ? state.streak : clean ? state.streak + 1 : 0;
  return {
    solved,
    streak,
    best: Math.max(state.best, streak),
    celebration: {
      activity,
      total: solved.length,
      streak,
      clean,
      review,
      milestone: !review && solved.length % 5 === 0,
    },
  };
}
