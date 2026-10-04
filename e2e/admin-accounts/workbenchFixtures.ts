import type { ClassEntity } from "../../src/contracts/class.contract";
import { DEFAULT_DIFFICULTY_RATIO } from "../../src/contracts/common.contract";

export const classes: ClassEntity[] = [
  {
    name: "중등M 중2 JJPS",
    grade: "중2",
    owner: { name: "강예시", mine: true },
  },
  {
    name: "초등M 초5 JJ1A",
    grade: "초5",
    owner: { name: "김예시", mine: false },
  },
].map((row, i) => ({
  ...row,
  id: `30000000-0000-4000-8000-00000000000${i + 1}`,
  userId: "30000000-0000-4000-8000-000000000010",
  defaultProblemCount: 8,
  difficultyRatio: DEFAULT_DIFFICULTY_RATIO,
  createdAt: "2026-10-04T00:00:00.000Z",
  updatedAt: "2026-10-04T00:00:00.000Z",
}));
