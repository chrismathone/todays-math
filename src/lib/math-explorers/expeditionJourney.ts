import type {
  MathExpeditionDay,
  MathExpeditionJourney,
} from "@/contracts/mathExpedition.contract";
import { kstDateOf } from "@/lib/kstDate";
import { dailyJourneyDto } from "@/lib/math-srs/dailyJourney";
import type { StoredSrsState } from "@/lib/math-srs/serverState";
import { definitionCards, definitionUnits } from "./definition-cards";

const gradeLabel = (grade: number) =>
  grade < 7 ? `초등 ${grade}학년` : `중학교 ${grade - 6}학년`;
type SourceDay = Omit<MathExpeditionDay, "reviews">;

/**
 * Read-only historical achievement projection, not a daily assignment planner.
 * A union proves that at least one complete source workload was finished on a
 * date. It does not certify an unfinished workload in another mode, freeze a
 * grade/goal, or grant permission to skip any source's required retries.
 */
export function expeditionJourney(
  state: StoredSrsState,
  now: Date,
): MathExpeditionJourney {
  const today = kstDateOf(now);
  const elementary = dailyJourneyDto(state, "elementary", now);
  const middle = dailyJourneyDto(state, "middle", now);
  const explorer = state.explorers;
  const sources: SourceDay[] = [];
  for (const [kind, journey] of [
    ["elementary", elementary],
    ["middle", middle],
  ] as const) {
    for (const day of journey.days)
      sources.push({ ...day, kind, dayId: day.id });
  }
  for (const day of explorer?.completedDays ?? []) {
    const unit = definitionUnits.find((item) => item.id === day.unitId);
    sources.push({
      id: `explorers:${day.date}`,
      dayId: day.date,
      kind: "explorers",
      date: day.date,
      // Explorer history has date precision only. Normalize for the common
      // display contract; this boundary is not an observed completion time.
      completedAt: `${day.date}T00:00:00.000Z`,
      title:
        day.route === "memory"
          ? "기억 복습"
          : day.route === "repair"
            ? `${unit?.title ?? "개념"} 연결 복습`
            : (unit?.title ?? "개념 탐험"),
      subtitle: unit ? gradeLabel(unit.grade) : "개념 탐험",
      reviewCount: 15,
    });
  }
  const byDate = new Map<string, SourceDay[]>();
  for (const source of sources) {
    const group = byDate.get(source.date) ?? [];
    // One replay reference per mode/day; malformed duplicate legacy metadata
    // must not create another day or another indistinguishable menu item.
    if (
      !group.some(
        (item) => item.kind === source.kind && item.dayId === source.dayId,
      )
    )
      group.push(source);
    byDate.set(source.date, group);
  }
  const days: MathExpeditionDay[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, group]) => {
      const sorted = [...group].sort(
        (a, b) =>
          a.completedAt.localeCompare(b.completedAt) ||
          a.kind.localeCompare(b.kind),
      );
      const primary = sorted.at(-1)!;
      return {
        ...primary,
        id: `expedition:${date}`,
        reviews: sorted.map(
          ({ kind, dayId, title, subtitle, reviewCount }) => ({
            kind,
            dayId,
            title,
            subtitle,
            reviewCount,
          }),
        ),
      };
    });

  // This endpoint is the explorer screen. Preserve its existing workload;
  // selecting or composing another mode's mission requires a separate policy.
  const record = explorer?.profile.definitions;
  const active =
    record?.session && !record.session.done && !record.session.reviewOnly
      ? record.session
      : null;
  const todayAnswered = active
    ? active.round > 0
      ? 15
      : active.index
    : explorer?.completedDays.some((day) => day.date === today)
      ? 15
      : 0;
  const courseGrade = record?.courseGrade ?? explorer?.profile.grade ?? 3;
  const units = definitionUnits.filter((unit) => unit.grade === courseGrade);
  const target =
    active?.unit ??
    record?.goalUnitId ??
    units.find((unit) =>
      definitionCards.some(
        (card) => card.unit === unit.id && !record?.cards[card.id]?.level,
      ),
    )?.id ??
    units[0]?.id;
  const start = Math.max(
    0,
    units.findIndex((unit) => unit.id === target),
  );
  const upcoming = units
    .slice(start)
    .map((unit) => ({ title: unit.title, subtitle: gradeLabel(unit.grade) }));
  return {
    activeKind: "explorers",
    completedDays: days.length,
    todayComplete: sources.some(
      (day) =>
        day.date === today || kstDateOf(new Date(day.completedAt)) === today,
    ),
    todayAnswered,
    todayGoal: 15,
    days,
    upcoming,
  };
}
