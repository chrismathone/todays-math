import type { FadingState } from "@/contracts/fadingApi.contract";
import { fadingDateOf, fadingDayOfDate } from "@/lib/fading/schedule";
import { studentDateLabel } from "./labels";
import s from "./fading.module.css";
export function FadingHomeHistory({
  state,
  student = false,
}: {
  state: FadingState;
  student?: boolean;
}) {
  const today = fadingDayOfDate(state.today);
  const byDate = new Map(state.days.map((row) => [row.date, row.reviews]));
  return (
    <section className={s.homeHistory}>
      <div className={s.sectionTitle}>
        <h2>주간 복습과 최근 기록</h2>
        <span className={s.small}>평가로 닫은 풀이</span>
      </div>
      <div className={s.weekCards}>
        {Array.from({ length: 7 }, (_, i) => {
          const date = fadingDateOf(today - 6 + i);
          return (
            <div key={date} data-today={date === state.today}>
              <span>
                {student
                  ? studentDateLabel(date, state.today)
                  : date.slice(5).replace("-", "/")}
              </span>
              <strong>{byDate.get(date) ?? 0}개</strong>
            </div>
          );
        })}
      </div>
      <p className={s.small}>최근 28일</p>
      <div className={s.homeHeatmap}>
        {Array.from({ length: 28 }, (_, i) => {
          const date = fadingDateOf(today - 27 + i);
          return (
            <div
              key={date}
              data-active={!!byDate.get(date)}
              title={
                (student ? studentDateLabel(date, state.today) : date) +
                " · " +
                (byDate.get(date) ?? 0) +
                "개"
              }
            >
              {byDate.get(date) ?? "·"}
            </div>
          );
        })}
      </div>
    </section>
  );
}
