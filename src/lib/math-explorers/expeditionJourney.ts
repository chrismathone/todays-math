import type {
  MathExpeditionDay,
  MathExpeditionJourney,
  StoredExpedition,
} from "@/contracts/mathExpedition.contract";
import { kstDateOf } from "@/lib/kstDate";
import { dailyJourneyDto, journeyDayLabel } from "@/lib/math-srs/dailyJourney";
import {
  sectionForecast,
  sectionLabel,
  sectionPosition,
} from "@/lib/math-srs/elementary/sectionForecast";
import type { StoredSrsState } from "@/lib/math-srs/serverState";
import {
  definitionCards,
  definitionDue,
  definitionUnits,
} from "./definition-cards";
import {
  completedMiddleBankDays,
  conceptUnits,
  expeditionLearning,
  expeditionToday,
  initialOwnedExplorer,
} from "./expedition";
import {
  planSlots,
  unitForecast,
  unitPosition,
  type ForecastItem,
} from "./journeyForecast";

const gradeLabel = (grade: number) =>
  grade < 7 ? `초등 ${grade}학년` : `중학교 ${grade - 6}학년`;
type SourceDay = Omit<MathExpeditionDay, "reviews">;

/**
 * Read-only historical achievement projection, not a daily assignment planner.
 * A union proves that at least one complete source workload was finished on a
 * date. It does not certify an unfinished workload in another mode, freeze a
 * grade/goal, or grant permission to skip any source's required retries.
 */
export function legacyExpeditionJourney(
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
        (card) => card.unit === unit.id && !record?.cards[card.id],
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

/**
 * 진도판의 오늘 칸 · 예정 칸 · 가운데 «나의 진행» (D-142). 오늘 칸은 `planExpedition` 이 내는 것(열린 미션이면 그것),
 * 예정은 같은 학습 목표(`expeditionLearning`)에서 같은 넘김 규칙으로 뽑는다 — 오늘과 예정이 다른 규칙으로 갈리지 않게.
 * 지금 판(12칸)의 끝까지만 싣는다. 초등은 원장님 진도 계획이 있으면 소단원 칸.
 */
export function expeditionOutlook(
  state: StoredSrsState,
  studentId: string,
  now: Date,
  completedDays: number,
  todayComplete: boolean,
): { upcoming: ForecastItem[]; position: MathExpeditionJourney["position"] } {
  const explorer = initialOwnedExplorer(state, studentId, now);
  const units = conceptUnits(
    explorer.profile.definitions,
    completedMiddleBankDays(state, now),
  );
  const learning = expeditionLearning(state, studentId, now);
  const today = todayComplete ? null : expeditionToday(state, studentId, now);
  const slots = planSlots(completedDays) - (today ? 1 : 0);
  const todayItem = today
    ? today.plan.kind === "elementary" && today.sectionId
      ? sectionLabel(today.sectionId)
      : { title: today.plan.title, subtitle: today.plan.subtitle }
    : null;
  // Elementary bank units follow 원장님's course plan cursor, one lesson (소단원) per tile.
  const course = learning.sectionId ? state.course : undefined;
  const bySection = !!course?.plan;
  const forecast = bySection
    ? sectionForecast(
        learning.sectionId!,
        course!.completedSectionIds,
        slots,
        !(
          today?.plan.kind === "elementary" &&
          today.sectionId === learning.sectionId
        ),
      )
    : unitForecast(
        units,
        learning.unitId,
        // 오늘 칸이 그 단원의 개념 날 · 은행 날이면 한 칸을 이미 쓴 것(기억 복습 · 회복 날은 아님).
        !!today &&
          today.plan.unitId === learning.unitId &&
          today.plan.route !== "memory" &&
          today.plan.route !== "repair",
        slots,
      );
  const due = definitionDue(explorer.profile, kstDateOf(now)).length;
  const byUnit = unitPosition(units, learning.unitId, due);
  const section = bySection ? sectionPosition(learning.sectionId!) : null;
  const position = byUnit
    ? section
      ? { ...byUnit, ...section }
      : byUnit
    : undefined;
  return {
    upcoming: [...(todayItem ? [todayItem] : []), ...forecast],
    position,
  };
}

/** 초등 은행 날 칸은 그날 푼 소단원 이름으로 — 옛 full 판과 같은 이름(D-142). 저장된 기록은 바꾸지 않는다. */
function sectionNamedDay(
  award: StoredExpedition["awards"][number],
): MathExpeditionDay {
  const day = award.day;
  if (day.kind !== "elementary") return day;
  const sections = award.references.flatMap((reference) => reference.unitIds);
  if (!sections.length) return day;
  const label = journeyDayLabel("elementary", sections);
  return {
    ...day,
    ...label,
    reviews: day.reviews.map((review) =>
      review.kind === "elementary" ? { ...review, ...label } : review,
    ),
  };
}

/** Once migrated, only frozen, fully resolved missions can add a board tile. */
export function expeditionJourney(
  state: StoredSrsState,
  now: Date,
  studentId: string,
): MathExpeditionJourney {
  const ledger = state.expedition;
  if (!ledger) {
    const legacy = legacyExpeditionJourney(state, now);
    return {
      ...legacy,
      ...expeditionOutlook(
        state,
        studentId,
        now,
        legacy.completedDays,
        legacy.todayComplete,
      ),
    };
  }
  const days = [
    ...ledger.legacyDays,
    ...ledger.awards.map(sectionNamedDay),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const mission = ledger.mission;
  const todayComplete = days.some((day) => day.date === kstDateOf(now));
  return {
    activeKind: mission?.kind ?? "explorers",
    completedDays: days.length,
    todayComplete,
    todayAnswered: mission?.answered ?? 0,
    todayGoal: mission?.goal ?? 15,
    days,
    ...expeditionOutlook(state, studentId, now, days.length, todayComplete),
  };
}
