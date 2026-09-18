import type { ReactNode } from "react";

import {
  AREA_ORDER,
  AREA_TITLE,
  type AreaKey,
  areaHasRecords,
  areaSummary,
  directorGaps,
  groupUnits,
  type ReportSource,
} from "@/lib/achievement/reportAreas";
import {
  bandCell,
  coverageLine,
  dateText,
  driftSentence,
  outOfPhrase,
  periodRange,
  periodTitle,
  pointsText,
} from "@/lib/achievement/sentences";
import { ACHIEVEMENT_BANDS, MIN_UNIT_PROBLEMS } from "@/lib/achievement/types";

/**
 * **원장 화면 — 한 벌** (D-134 ⑻ · Hi-fi 브리프 §3). Hi-fi 안마다 갈리지 않는다.
 *
 * 작업실의 확정 문법(05 §2 «계기판» · §5)을 따른다 — 먹 3px 머리띠 · 흰 표면 · 1px 구분선 ·
 * 기능색은 뜻으로만(«입력 대기» = 노랑 글자). 네 영역을 **늘 같은 순서·같은 자리**에 두고,
 * 빈 영역은 **무엇이 · 왜 · 어떻게 채우나**를 여기에만 적는다(학부모 지면에는 0글자).
 *
 * 🔴 문장은 학부모 지면과 **같은 함수**(`areaSummary` → `sentences.ts`)에서 온다 — 화면별로 따로 쓰지 않는다.
 * 원장 화면은 문장 밑에 **학부모에게 안 가는 숫자**(문턱 «5문항 / 기준 12문항» · 지금 기준 시청률 ·
 * 복습 권함 단원)를 더 적는다.
 *
 * ⚠️ 읽기 전용 — 누르는 것이 없다(D-30: 손가락 커서·hover 없음).
 */

const NUM = ["①", "②", "③", "④"] as const;
const LABEL = "text-[12px] font-bold tracking-[0.12em] text-text-2";
const ROW = "text-[13px] leading-relaxed";
const META = "text-[12px] leading-relaxed text-text-2";

export function DirectorScreen({ source }: { source: ReportSource }) {
  const { factors } = source;
  const gaps = directorGaps(source);
  return (
    <section
      aria-label="원장 화면"
      data-testid="director-screen"
      className="flex min-w-0 flex-col gap-4 border border-divider bg-white px-4 py-4 text-ink sm:px-5"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-[3px] border-ink pb-3">
        <h2 className="text-[18px] font-black">{factors.student.name}</h2>
        <span className="text-[12.5px] text-text-2">
          {factors.student.className} · {factors.student.classGrade}
        </span>
        <span className="ml-auto text-[12.5px] text-text-2 tabular-nums">
          {periodTitle(factors.period)} · {periodRange(factors.period)}
        </span>
      </header>

      {AREA_ORDER.map((area, i) => (
        <DirectorArea
          key={area}
          area={area}
          num={NUM[i]!}
          source={source}
          gaps={gaps.filter((g) => g.area === area)}
        />
      ))}

      <div className="flex flex-col gap-1 border-t border-divider pt-3">
        <p className={LABEL}>학부모 지면 맨 아래 한 줄</p>
        <p className={ROW}>{coverageLine(factors)}</p>
      </div>
    </section>
  );
}

function DirectorArea({
  area,
  num,
  source,
  gaps,
}: {
  area: AreaKey;
  num: string;
  source: ReportSource;
  gaps: ReturnType<typeof directorGaps>;
}) {
  const recorded = areaHasRecords(source, area);
  const summary = areaSummary(source, area);
  return (
    <div
      className="flex flex-col gap-2 border-t border-divider pt-3"
      data-area={area}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-[15px] font-black">
          {num} {AREA_TITLE[area]}
        </h3>
        <span
          className={`text-[12px] font-bold ${recorded ? "text-text-2" : "text-g-yellow-text"}`}
        >
          {recorded
            ? "학부모 지면에 나감"
            : "기록 없음 — 학부모 지면에 안 나감"}
        </span>
      </div>

      {summary.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {summary.map((line) => (
            <p key={line} className="text-[13.5px] leading-relaxed font-bold">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      {recorded ? <Records area={area} source={source} /> : null}

      {gaps.map((g) => (
        <div
          key={g.what}
          className="flex flex-col gap-0.5 border border-dashed border-control px-3 py-2"
        >
          <p className="text-[13px] font-bold">{g.what}</p>
          <p className={META}>왜 — {g.why}</p>
          <p className={META}>채우려면 — {g.how}</p>
        </div>
      ))}
    </div>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className={LABEL}>{label}</p>
      <div className={ROW}>{children}</div>
    </div>
  );
}

function Records({ area, source }: { area: AreaKey; source: ReportSource }) {
  const { factors } = source;

  if (area === "learned") {
    const drift = driftSentence(factors.learned.planDriftDays);
    return (
      <div className="flex flex-col gap-2">
        <Line label="소단원 (대단원별)">
          <ul className="flex flex-col gap-0.5">
            {groupUnits(factors.learned.units ?? []).map((g) => (
              <li key={g.chapter} className="break-words">
                <b>{g.chapter}</b> — {g.sections.join(" · ")}
              </li>
            ))}
          </ul>
        </Line>
        {drift ? <p className={META}>{drift}</p> : null}
      </div>
    );
  }

  if (area === "scored") {
    const { scored } = factors;
    const all = [
      ...(scored.rounds ?? []).map((r) => ({ r, absent: false })),
      ...(scored.absentRounds ?? []).map((r) => ({ r, absent: true })),
    ].sort((a, b) => a.r.testDate.localeCompare(b.r.testDate));
    return (
      <div className="flex flex-col gap-3">
        <Line label="회차">
          <ul className="flex flex-wrap gap-x-4 gap-y-0.5 tabular-nums">
            {all.map(({ r, absent }) => (
              <li key={r.testId}>
                {dateText(r.testDate)} —{" "}
                {absent
                  ? "결시(평균에서 뺌)"
                  : r.score === null
                    ? "점수 없음"
                    : `${pointsText(r.score)} / ${r.maxScore === null ? "만점 모름" : pointsText(r.maxScore)}`}
              </li>
            ))}
          </ul>
        </Line>
        {scored.problems ? (
          <p className={META}>
            문항 기록 {scored.problems.rounds}회 ·{" "}
            {outOfPhrase(scored.problems.correct, scored.problems.total)}
          </p>
        ) : null}
        {scored.bandAccuracy ? (
          <Line label={`난이도 — 기준 ${MIN_UNIT_PROBLEMS}문항`}>
            <ul className="flex flex-wrap gap-x-5 gap-y-0.5 tabular-nums">
              {ACHIEVEMENT_BANDS.map((band) => {
                const cell = bandCell(scored.bandAccuracy![band]);
                return (
                  <li key={band} className="whitespace-nowrap">
                    <b>{band}</b> {cell.count}
                    {cell.status ? (
                      <span className="text-text-2"> · {cell.status}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Line>
        ) : null}
        {scored.unitAccuracy ? (
          <Line label="단원">
            <ul className="flex flex-col gap-0.5">
              {scored.unitAccuracy.reported.map((u) => (
                <li key={u.unitId} className="break-words">
                  {u.section} — {outOfPhrase(u.correct, u.total)}
                </li>
              ))}
              {scored.unitAccuracy.underSampled.map((u) => (
                <li key={u.unitId} className="break-words text-text-2">
                  {u.section} — {u.total}문항 / 기준 {u.needed}문항 · 평가 보류
                </li>
              ))}
            </ul>
          </Line>
        ) : null}
        {scored.reviewUnits && scored.reviewUnits.length > 0 ? (
          <Line label="복습 권함 (분석 리포트가 꼽은 단원 — 학부모 지면에는 안 나감)">
            <ul className="flex flex-col gap-0.5">
              {scored.reviewUnits.map((u) => (
                <li key={u.unitId} className="break-words">
                  {u.section} — {u.flaggedRounds}회 꼽힘
                </li>
              ))}
            </ul>
          </Line>
        ) : null}
      </div>
    );
  }

  if (area === "selfStudy") {
    const { lectures, homework } = factors.selfStudy;
    return (
      <div className="flex flex-col gap-2">
        {lectures ? (
          <Line label="예습 영상">
            대상 {lectures.assigned}편 · 월말까지 완료 {lectures.completed}편 ·
            평균 시청 {pointsText(lectures.averagePercent)}%
            <span className="text-text-2">
              {" "}
              (시청률은 지금 기준 — 과거 달을 다시 뽑으면 바뀌어 학부모 지면에는
              안 나감)
            </span>
          </Line>
        ) : null}
        {homework ? (
          <Line label="숙제">
            확인 {homework.checked}번 · 안 해 옴 {homework.missed}번
            {homework.missedDates.length > 0
              ? ` (${homework.missedDates.map(dateText).join(" · ")})`
              : ""}
          </Line>
        ) : null}
      </div>
    );
  }

  return (
    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
      {source.teacherNote}
    </p>
  );
}
