import { buildFadingDailyPlan } from "@/lib/fading/explorerDaily";
import { emptyFading } from "@/lib/fading/state";
import type { FadingConcept } from "@/lib/fading/concepts";
import type { FadingDailyWorkload } from "@/lib/fading/explorerDaily";

export const today = "2026-10-21";
export const concepts: FadingConcept[] = ["이상과 이하", "초과와 미만"].map(
  (title, i) => ({
    id: `home-concept-${i}`,
    section: `초5::수의 범위와 어림하기::${title}`,
    level: "하",
    ordinal: 1,
    siblings: 1,
    propositions: [
      {
        id: `home-proposition-${i}`,
        term: title,
        kind: "정의",
        pieces: [{ kind: "text", text: title }],
      },
    ],
  }),
);
export const completedWorkload: FadingDailyWorkload = {
  kind: "elementary",
  route: "bank",
  unitId: "e5-range",
  title: "수의 범위와 어림하기",
  subtitle: "초등 5학년 · 이상과 이하",
  goal: 10,
  answered: 10,
  retryRemaining: 0,
  status: "complete",
  canStart: false,
};
export function homePlan({
  target = "초과와 미만",
  date = today,
  recalls = 0,
  workload = completedWorkload,
  quota = 10,
}: {
  target?: string;
  date?: string;
  recalls?: number;
  workload?: FadingDailyWorkload | null;
  quota?: number;
} = {}) {
  const fading = emptyFading();
  for (const concept of concepts.slice(0, recalls)) {
    fading.concepts[concept.id] = {
      step: 4,
      stability: 5,
      difficulty: 5,
      reviewedOn: today,
      dueOn: "2026-10-25",
      digest: null,
      reviews: 1,
      lapses: 0,
      addedOn: today,
    };
  }
  return buildFadingDailyPlan({
    today: date,
    fading,
    concepts: new Map(concepts.map((c) => [c.id, c])),
    quota,
    workload,
    prerequisite: {
      target: {
        title: target,
        courseSectionId: "5-2-1-2",
        explorerUnitId: null,
        sectionKey: null,
        graphUnitId: null,
        cardIds: [],
      },
      coverage: { status: "unknown", cardLinks: 0, graphEdges: 0 },
      links: [],
    },
  });
}
