import { useState } from "react";
import {
  FADING_VIEW_DAYS,
  type FadingState,
} from "@/contracts/fadingApi.contract";
import { fadingDateOf, fadingDayOfDate } from "@/lib/fading/schedule";
import { toPercent } from "@/lib/fading/numbers";
import { FadingIcon } from "./FadingIcon";
import { stepNames } from "./labels";
import s from "./FadingStats.module.css";

const periods = [
  { days: 7, label: "최근 7일" },
  { days: 28, label: "최근 28일" },
  { days: FADING_VIEW_DAYS, label: "8주" },
] as const;
const steps = [1, 2, 3, 4] as const;
function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}

export function FadingStats({
  state,
  onCatalog,
}: {
  state: FadingState;
  onCatalog: () => void;
}) {
  const [period, setPeriod] = useState<number>(7);
  const { summary } = state;
  const today = fadingDayOfDate(state.today);
  const start = fadingDateOf(today - period + 1);
  const records = state.days.filter(
    (row) => row.date >= start && row.date <= state.today,
  );
  const empty = !state.days.some((row) => row.reviews > 0);
  const totals = records.reduce(
    (total, row) => ({
      reviews: total.reviews + row.reviews,
      passed: total.passed + row.passed,
      fresh: total.fresh + row.fresh,
      active: total.active + (row.reviews > 0 ? 1 : 0),
    }),
    { reviews: 0, passed: 0, fresh: 0, active: 0 },
  );
  const days = new Map(state.days.map((row) => [row.date, row]));
  const dates = Array.from({ length: period }, (_, index) =>
    fadingDateOf(today - period + index + 1),
  );
  const maxReviews = Math.max(1, ...records.map((row) => row.reviews));
  const picked = steps.reduce(
    (count, step) => count + summary.stepCounts[step],
    0,
  );
  const metrics = [
    {
      title: "평가로 닫은 풀이",
      value: totals.reviews,
      unit: "개",
      note: "자가 평가까지 마친 풀이",
      label: `평가로 닫은 풀이 ${totals.reviews}개`,
      icon: "book",
    },
    {
      title: "다시가 아닌 평가",
      value: totals.passed,
      unit: "개",
      note: "스스로 고른 평가의 수",
      label: `다시가 아닌 평가 ${totals.passed}개`,
      icon: "erase",
    },
    {
      title: "처음 배운 개념",
      value: totals.fresh,
      unit: "개",
      note: "첫 평가를 마친 개념",
      label: `처음 배운 개념 ${totals.fresh}개`,
      icon: "list",
    },
    {
      title: "학습한 날",
      value: totals.active,
      unit: "일",
      note: "풀이를 하나 이상 마친 날",
      label: `학습한 날 ${totals.active}일`,
      icon: "stats",
    },
  ] as const;
  return (
    <div className={s.screen} data-fading-stats="true" data-empty={empty}>
      <section className={s.banner}>
        <div className={s.bannerText}>
          <span className={s.kicker}>오늘의 기억 · 학습 기록</span>
          <h1 className={s.title}>
            {empty ? "아직 학습 기록이 없어요" : "학습 통계"}
          </h1>
          <p className={s.small}>
            {empty
              ? "개념을 고르고 첫 풀이를 마치면, 날마다의 기록을 여기서 확인할 수 있어요."
              : "평가로 마친 풀이와 개념별 단계를 확인하세요."}
          </p>
        </div>
        <div className={s.streak}>
          <strong>{summary.streak.current}일 연속</strong>
          <span>가장 긴 연속 {summary.streak.best}일</span>
        </div>
      </section>
      <div className={s.period} aria-label="학습 기록 기간">
        {periods.map((option) => (
          <button
            key={option.days}
            aria-pressed={period === option.days}
            onClick={() => setPeriod(option.days)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {empty ? (
        <div className={s.metricHeading}>
          <h2 className={s.sectionTitle}>
            <FadingIcon name="stats" /> 학습 기록
          </h2>
          <span className={s.tag}>기록 전</span>
        </div>
      ) : null}
      <section className={s.metricGrid} aria-label="기간 안 학습 집계">
        {metrics.map((metric) => (
          <div className={s.metric} key={metric.title} data-locked={empty}>
            <div className={s.metricLabel}>
              <span>{metric.title}</span>
              {empty ? <LockIcon /> : <FadingIcon name={metric.icon} />}
            </div>
            <div
              className={s.metricNumber}
              aria-label={empty ? "기록 없음" : metric.label}
            >
              <strong>{metric.value}</strong>
              <span>{metric.unit}</span>
            </div>
            <p className={s.metricNote}>
              {empty ? "첫 평가를 기다리는 중" : metric.note}
            </p>
          </div>
        ))}
      </section>
      <div className={s.bodyGrid}>
        <div className={s.leftColumn}>
          <section className={s.chartCard}>
            <div className={s.cardHeading}>
              <div>
                <h2 className={s.sectionTitle}>
                  <FadingIcon name="stats" /> 날마다 마친 풀이
                </h2>
                <p className={s.small}>평가로 닫은 풀이 수 · {period}일</p>
              </div>
              <span className={s.tag}>{totals.reviews}개</span>
            </div>
            <div className={s.chartArea}>
              <div className={s.chartGrid} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div
                className={s.dailyBars}
                role="img"
                aria-label={`${start}부터 ${state.today}까지 날마다 마친 풀이`}
                data-fading-daily-bars="true"
                data-days={period}
              >
                {dates.map((date) => {
                  const row = days.get(date);
                  const reviews = row?.reviews ?? 0;
                  const passed = row?.passed ?? 0;
                  return (
                    <div
                      className={s.barColumn}
                      key={date}
                      title={`${date} · 평가로 닫은 풀이 ${reviews}개 · 다시가 아닌 평가 ${passed}개`}
                    >
                      {period === 7 ? (
                        <span className={s.barCount}>{reviews}</span>
                      ) : null}
                      <div
                        className={s.barTrack}
                        style={{
                          height: `${toPercent(reviews / maxReviews)}%`,
                        }}
                      >
                        <span
                          className={s.againBar}
                          style={{
                            height: `${toPercent(reviews ? (reviews - passed) / reviews : 0)}%`,
                          }}
                        />
                        <span
                          className={s.passedBar}
                          style={{
                            height: `${toPercent(reviews ? passed / reviews : 0)}%`,
                          }}
                        />
                      </div>
                      {period === 7 ? (
                        <span className={s.barDate}>
                          {date.slice(5).replace("-", "/")}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {empty ? (
                <div className={s.emptyChart}>
                  <span>
                    <FadingIcon name="book" /> 첫 풀이를 평가로 마치면 기록이
                    쌓여요
                  </span>
                </div>
              ) : null}
            </div>
            <div className={s.chartDates}>
              <span>{start}</span>
              <span>{state.today}</span>
            </div>
            <div className={s.chartLegend}>
              <span>
                <i className={s.passedKey} />
                다시가 아닌 평가
              </span>
              <span>
                <i className={s.againKey} />
                다시 평가
              </span>
            </div>
            {!empty && totals.reviews === 0 ? (
              <p className={s.periodEmpty}>이 기간에는 마친 풀이가 없습니다</p>
            ) : null}
            <div className={s.calendarHeading}>
              <h3>최근 28일</h3>
              <span className={s.small}>칸 안 숫자 = 마친 풀이 수</span>
            </div>
            <div
              className={s.calendar}
              role="img"
              aria-label="최근 28일 학습 기록"
            >
              {Array.from({ length: 28 }, (_, index) => {
                const date = fadingDateOf(today - 27 + index);
                const count = days.get(date)?.reviews ?? 0;
                return (
                  <span
                    key={date}
                    data-active={count > 0}
                    title={`${date} · ${count}개`}
                    aria-label={`${date} · ${count}개`}
                  >
                    {count || "·"}
                  </span>
                );
              })}
            </div>
            <p className={s.chartExplanation}>
              자가 평가까지 마친 풀이만 기록됩니다. 칩을 보고 문장을 채운
              기록이며, 스스로 떠올려 쓴 결과를 뜻하지 않습니다.
            </p>
          </section>
          <section className={s.funnel} aria-label="전체 개념 단계">
            <div className={s.cardHeading}>
              <div>
                <h2 className={s.sectionTitle}>개념이 서 있는 단계</h2>
                <p className={s.small}>다음 풀이를 시작하는 단계입니다.</p>
              </div>
              <span className={s.tag}>고른 개념 {picked}개</span>
            </div>
            <div className={s.stepBars}>
              {steps.map((step) => (
                <div className={s.stepRow} key={step} data-step={step}>
                  <div className={s.stepRowLabel}>
                    <span>
                      <b>{step}</b>
                      {stepNames[step]}
                    </span>
                    <strong>{summary.stepCounts[step]}개</strong>
                  </div>
                  <div className={s.stepTrack}>
                    <span
                      style={{
                        width: `${toPercent(picked ? summary.stepCounts[step] / picked : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <section className={s.units} aria-label="단원별 개념 단계">
          <div className={s.cardHeading}>
            <h2 className={s.sectionTitle}>
              <FadingIcon name="list" /> 단원별 개념 단계
            </h2>
            <span className={s.tag}>{summary.sections.length}개 단원</span>
          </div>
          {summary.sections.length ? (
            <div className={s.unitList}>
              {summary.sections.map((unit, index) => {
                const [grade, chapter, name] = unit.key.split("::");
                return (
                  <article className={s.unitCard} key={unit.key}>
                    <div className={s.unitHeader}>
                      <span className={s.ordinal}>{index + 1}</span>
                      <h3>{name}</h3>
                      <strong>고른 개념 {unit.picked}개</strong>
                    </div>
                    <div className={s.small}>
                      {grade} · {chapter}
                    </div>
                    <div
                      className={s.unitTrack}
                      role="img"
                      aria-label={steps
                        .map((step) => `${step}단계 ${unit.stepCounts[step]}개`)
                        .join(" · ")}
                    >
                      {steps.map((step) => (
                        <span
                          key={step}
                          data-step={step}
                          style={{
                            width: `${toPercent(unit.picked ? unit.stepCounts[step] / unit.picked : 0)}%`,
                          }}
                        />
                      ))}
                    </div>
                    <div className={s.unitLegend}>
                      {steps.map((step) => (
                        <span key={step} data-step={step}>
                          {step}단계 {unit.stepCounts[step]}개
                        </span>
                      ))}
                    </div>
                    <p className={s.small}>
                      첫 평가를 마친 개념 {unit.learned}개
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={s.emptyUnits}>
              <span className={s.emptyIcon}>
                <FadingIcon name="list" />
              </span>
              <h3>아직 고른 단원이 없습니다</h3>
              <p className={s.small}>
                개념 목록에서 단원을 고르면 이곳에 표시됩니다.
              </p>
            </div>
          )}
        </section>
      </div>
      <div className={s.bottomAction}>
        <span className={s.small}>
          배운 개념 {summary.learned}개 · 밀린 복습 {summary.overdue}개
        </span>
        <button className={s.primary} onClick={onCatalog}>
          <FadingIcon name="book" />
          {empty ? "첫 개념 시작" : "개념 더 고르기"}
          <FadingIcon name="arrow" />
        </button>
      </div>
    </div>
  );
}
