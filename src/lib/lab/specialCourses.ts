import { CUBE_TASK_IDS } from "./cube31/lessons";

/** Dedicated manipulative courses have their own player and progress model. */
export const SPECIAL_COURSES = [
  {
    id: "cube-3-1",
    title: "덧셈과 뺄셈 실험실",
    href: "/lab/cube-3-1",
    unitIds: ["3-1-1"],
    activities: CUBE_TASK_IDS.length,
  },
];
