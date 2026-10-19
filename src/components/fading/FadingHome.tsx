import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import type { FadingState } from "@/contracts/fadingApi.contract";
import { FadingMath as ExplorerMath } from "./FadingMath";
import { toPercent } from "@/lib/fading/numbers";
import type { FadingSource } from "@/lib/fading/source";
import type { FadingCatalog } from "@/contracts/fadingApi.contract";
import { FadingIcon } from "./FadingIcon";
import { FadingHomeHistory } from "./FadingHomeHistory";
import {
  curriculumName as defaultCurriculumName,
  dueLabel as defaultDueLabel,
  stepNames as defaultStepNames,
  studentCurriculumName,
  studentDueLabel,
  studentStepNames,
  studentDateLabel,
} from "./labels";
import { fadingRiskTone } from "./riskAppearance";
import { FadingTerms } from "./FadingTerms";
import s from "./fading.module.css";

export function FadingHome({
  student = false,
  state,
  busy,
  onCatalog,
  onOpen,
  onMode,
  source,
}: {
  student?: boolean;
  state: FadingState;
  busy: boolean;
  onCatalog: () => void;
  onOpen: (id: string) => void;
  onMode: (on: boolean) => void;
  source: FadingSource;
}) {
  const curriculumName = student
    ? studentCurriculumName
    : defaultCurriculumName;
  const stepNames = student ? studentStepNames : defaultStepNames;
  const dueLabel = student ? studentDueLabel : defaultDueLabel;
  const [all, setAll] = useState(false);
  const [recommendations, setRecommendations] = useState<FadingCatalog | null>(
    null,
  );
  const { summary } = state;
  const firstDay = !summary.learned && !summary.queue.unrated.length;
  // 홈의 목록 — 속(`fadingQueue` 의 명제 칸 · 결정 4)이 오늘 분량에 든 것만 낸다(평가 전 개념도 남은 칸에서만).
  const ids = [...summary.queue.due, ...summary.queue.unrated];
  const done = !firstDay && !ids.length && !summary.queue.held.length;
  const showDailyDetails = !firstDay && !done;
  useEffect(() => {
    let live = true;
    if (firstDay)
      void source
        .catalog()
        .then((value) => {
          if (live) setRecommendations(value);
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [firstDay, source]);
  const progress = summary.plan.total
    ? summary.plan.done / summary.plan.total
    : 0;
  const metrics = [
    {
      name: "오늘 한 복습",
      value: summary.plan.done,
      unit: "개",
      note: "처음 배운 개념은 따로 셈",
      icon: "home" as const,
    },
    {
      name: "배운 개념",
      value: summary.learned,
      unit: "개",
      note: "첫 평가를 마친 개념",
      icon: "book" as const,
    },
    {
      name: "밀린 복습",
      value: summary.overdue,
      unit: "개",
      note: "복습일이 지난 개념",
      icon: "erase" as const,
    },
    {
      name: "가장 긴 연속",
      value: summary.streak.best,
      unit: "일",
      note: "평가까지 마친 날의 연속",
      icon: "stats" as const,
    },
  ];
  return (
    <div className={s.home}>
      <h1 className={s.homePageTitle}>오늘의 복습</h1>
      {done ? (
        <section className={s.completedHome}>
          <span className={s.completedBadge}>오늘의 복습 완료</span>
          <span className={s.largeCheck}>
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden="true"
            >
              <circle cx="24" cy="24" r="18" />
              <path d="m14 24 7 7 15-17" />
            </svg>
          </span>
          <h2>오늘 할 복습을 마쳤어요</h2>
          <p>
            {student
              ? "공부를 마치고 고른 느낌도 함께 기록했어요."
              : "자가 평가까지 마친 풀이가 오늘의 기록으로 남았어요."}
          </p>
          <div className={s.completedMetrics}>
            <div>
              <span>오늘 한 복습</span>
              <strong>{summary.plan.done}개</strong>
            </div>
            <div>
              <span>{student ? "다시 말고 고른 것" : "다시 아닌 평가"}</span>
              <strong>{summary.todayCount.passed}개</strong>
            </div>
            <div>
              <span>연속 학습</span>
              <strong>{summary.streak.current}일</strong>
            </div>
          </div>
        </section>
      ) : summary.longBreak ? (
        <section className={s.returnHome}>
          <div className={s.left}>
            <span className={s.returnBadge}>
              {summary.idleDays}일 만의 복귀
            </span>
            <span className={s.queueCount}>{summary.overdue}개 밀림</span>
          </div>
          <h2>쉬었던 개념을 다시 만나요</h2>
          <p>
            {summary.idleDays}일 쉬었어요. 오늘 할 만큼부터 다시 시작하세요.
          </p>
          <div className={s.returnCounts}>
            <div>
              <span>오늘 할 복습</span>
              <strong>{summary.queue.due.length}개</strong>
            </div>
            <div>
              <span>나중에 할 복습</span>
              <strong>{summary.queue.held.length}개</strong>
            </div>
          </div>
        </section>
      ) : (
        <section className={s.homeHero}>
          <div className={s.heroCopy}>
            <span className={s.heroBadge}>
              <FadingIcon name="erase" />
              {firstDay
                ? "첫날 · 개념 기억 학습"
                : done
                  ? "오늘의 복습 완료"
                  : "단서를 지우며 개념 복습"}
            </span>
            <h2>
              {firstDay ? (
                "첫 개념부터 시작해요"
              ) : done ? (
                "오늘 할 복습을 마쳤어요"
              ) : summary.longBreak ? (
                "쉬었던 개념을 다시 만나요"
              ) : (
                <>
                  오늘 복습할 개념 <em>{summary.queue.due.length}개</em>가
                  기다립니다
                </>
              )}
            </h2>
            <p>
              {firstDay
                ? "문장을 읽고 단서를 조금씩 지워 보세요. 목록에서 첫 개념을 고를 수 있어요."
                : done
                  ? "오늘의 평가를 마쳤어요. 개념 목록에서 기록 없는 연습으로 이어 갈 수 있습니다."
                  : summary.longBreak
                    ? `${summary.idleDays}일 쉬었어요. 오늘 할 만큼부터 다시 시작하세요.`
                    : "복습일이 된 개념부터 다시 살펴보세요. 칩을 보고 문장을 채우며 뜻을 확인합니다."}
            </p>
          </div>
          <div className={s.heroAction}>
            {!firstDay && (
              <div className={s.heroMeter}>
                <div className={s.row}>
                  <span>오늘의 복습</span>
                  <strong>
                    {summary.plan.done} / {summary.plan.total}
                  </strong>
                </div>
                <div
                  className={s.progress}
                  role="progressbar"
                  aria-label="오늘의 복습"
                  aria-valuenow={summary.plan.done}
                  aria-valuemax={summary.plan.total || 1}
                  aria-valuemin={0}
                >
                  <div
                    className={s.progressFill}
                    style={{ width: `${toPercent(progress)}%` }}
                  />
                </div>
                <div className={s.row}>
                  <span>완료 {summary.plan.done}개</span>
                  <span>오늘 목표 {summary.plan.total}개</span>
                </div>
              </div>
            )}
            <button
              className={s.heroStart}
              disabled={busy}
              onClick={() =>
                state.session
                  ? onOpen(state.session.conceptId)
                  : ids[0]
                    ? onOpen(ids[0])
                    : onCatalog()
              }
            >
              <FadingIcon name="arrow" />
              {state.session
                ? "풀이 이어 하기"
                : firstDay
                  ? "첫 개념 시작"
                  : done
                    ? "개념 목록 보기"
                    : `오늘 복습 시작 (${summary.queue.due.length}개)`}
              <span className={s.liveDot} />
            </button>
          </div>
        </section>
      )}
      {done && (
        <>
          <section className={s.nextReviewCard}>
            <div className={s.sectionTitle}>
              <h2>다음 복습</h2>
              <FadingIcon name="stats" />
            </div>
            <strong>
              {summary.nextReview
                ? (student
                    ? studentDueLabel(summary.nextReview.daysUntil) + " "
                    : summary.nextReview.daysUntil === 1
                      ? "내일 "
                      : summary.nextReview.daysUntil + "일 뒤 ") +
                  summary.nextReview.count +
                  "개"
                : "예약된 복습이 없습니다"}
            </strong>
            {summary.nextReview && (
              <p>
                {student
                  ? studentDateLabel(summary.nextReview.dueOn, state.today)
                  : summary.nextReview.dueOn}
              </p>
            )}
          </section>
          <section>
            <div className={s.sectionTitle}>
              <h2>자율 학습</h2>
            </div>
            <div className={s.list}>
              <button className={s.listButton} onClick={onCatalog}>
                <span>
                  <strong>개념 더 고르기</strong>
                  <p className={s.small}>목록에서 다음 개념을 골라요</p>
                </span>
                <FadingIcon name="arrow" />
              </button>
              <button className={s.listButton} onClick={onCatalog}>
                <span>
                  <strong>복습일 전 연습</strong>
                  <p className={s.small}>기록과 일정은 바뀌지 않아요</p>
                </span>
                <FadingIcon name="arrow" />
              </button>
            </div>
          </section>
        </>
      )}
      {firstDay && (
        <>
          <section className={s.firstGuide}>
            <div className={s.sectionTitle}>
              <h2>첫 개념을 시작하는 길</h2>
              <span className={s.erasurePill}>세 가지 순서</span>
            </div>
            <div className={s.guideTrack}>
              <span />
            </div>
            <div className={s.guideSteps}>
              {[
                "개념 목록에서 고르기",
                "문장을 읽고 뜻 살펴보기",
                "단서를 지우며 칩 채우기",
              ].map((label, i) => (
                <div key={label}>
                  <span className={s.roundNumber}>{i + 1}</span>
                  <div>
                    <strong>{label}</strong>
                    <p>
                      {i === 0
                        ? "그 학년의 첫 단원부터 살펴보세요"
                        : i === 1
                          ? "핵심어와 수식을 함께 읽어요"
                          : student
                            ? "네 단계를 마치면 느낌을 골라요"
                            : "네 단계 뒤에 자가 평가로 마쳐요"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className={s.sectionTitle}>
              <h2>처음 시작할 개념</h2>
              <button className={s.textButton} onClick={onCatalog}>
                전체보기
              </button>
            </div>
            <div className={s.list}>
              {recommendations?.sections[0]?.concepts
                .slice(0, 2)
                .map((item) => (
                  <article className={s.recommendCard} key={item.id}>
                    <span className={s.sectionTag}>
                      {!student && <>{recommendations.grade} · </>}
                      {curriculumName(recommendations.sections[0]!.chapter)}
                    </span>
                    <h3>
                      {curriculumName(recommendations.sections[0]!.unit)}
                      {!student && <> · {item.level}</>}
                    </h3>
                    <FadingTerms student={student} terms={item.terms} />
                    <div className={s.formulaPreview}>
                      <span className={s.caps}>개념 미리 보기</span>
                      <ExplorerMath text={item.terms[0]!} />
                    </div>
                    <div className={s.queueAction}>
                      <span>개념 문장 {item.propositions}개</span>
                      <button className={s.primary} onClick={onCatalog}>
                        개념 보기
                        <FadingIcon name="arrow" />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        </>
      )}
      <div className={showDailyDetails ? s.homeColumns : s.stack}>
        {showDailyDetails && (
          <div className={s.homeMain}>
            <section className={s.homeMetrics}>
              <div className={s.sectionTitle}>
                <h2>개념 학습 기록</h2>
                <span className={s.small}>평가로 남긴 기록</span>
              </div>
              <div className={s.metricTiles}>
                {metrics.map((metric) => (
                  <div className={s.metricTile} key={metric.name}>
                    <div className={s.row}>
                      <span>{metric.name}</span>
                      <FadingIcon name={metric.icon} />
                    </div>
                    <p>
                      <strong>{metric.value}</strong>
                      <span>{metric.unit}</span>
                    </p>
                    <small>{metric.note}</small>
                  </div>
                ))}
              </div>
            </section>
            <section className={s.homeQueue}>
              <div className={s.sectionTitle}>
                <h2>
                  {student ? "오늘 복습할 개념" : "오늘의 복습 대기열"}{" "}
                  <span className={s.queueCount}>{ids.length}개</span>
                </h2>
                <button
                  className={s.textButton}
                  onClick={() => setAll((v) => !v)}
                >
                  {all ? "접기" : "전체보기"}
                </button>
              </div>
              {ids.length ? (
                <div className={s.list}>
                  {(all ? ids : ids.slice(0, 3)).map((id) => {
                    const item = state.concepts[id];
                    if (!item) return null;
                    const section = item.section.split("::");
                    return (
                      <article
                        className={s.queueCard}
                        data-risk-tone={fadingRiskTone(item.risk)}
                        key={id}
                        style={{ "--risk": item.risk ?? 0 } as CSSProperties}
                      >
                        <span className={s.riskRail} />
                        <div className={s.queueMeta}>
                          <span className={s.sectionTag}>
                            {!student && <>{section[0]} · </>}
                            {curriculumName(section[1] ?? "")}
                          </span>
                          <span className={s.code}>
                            {dueLabel(item.daysUntil)}
                          </span>
                          {!student && item.risk !== null && (
                            <span className={s.riskTag}>
                              망각 위험 {toPercent(item.risk)}% · 추정
                            </span>
                          )}
                        </div>
                        <h3>
                          {curriculumName(section.at(-1) ?? "")}
                          {!student && (
                            <>
                              {" "}
                              · {item.level} · {item.ordinal}/{item.siblings}
                            </>
                          )}
                        </h3>
                        <FadingTerms student={student} terms={item.terms} />
                        <div className={s.queueAction}>
                          <span>
                            <FadingIcon name="erase" /> {item.step}단계 ·{" "}
                            {stepNames[item.step]}
                          </span>
                          <button
                            className={
                              item.risk === null ? s.secondary : s.primary
                            }
                            disabled={busy}
                            onClick={() => onOpen(id)}
                          >
                            복습하기
                            <FadingIcon name="arrow" />
                          </button>
                        </div>
                        {item.changed && (
                          <p className={s.small}>
                            지난 평가 뒤 문장이 바뀌었어요.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={s.queueEmpty}>
                  <FadingIcon name="book" />
                  <p>
                    {firstDay
                      ? "아직 고른 개념이 없습니다."
                      : "오늘 남은 개념이 없습니다."}
                  </p>
                  <button className={s.secondary} onClick={onCatalog}>
                    개념 더 고르기
                  </button>
                </div>
              )}
            </section>
            <section className={s.pipeline}>
              <div className={s.sectionTitle}>
                <div>
                  <h2>
                    {student ? "단서를 지우며 연습해요" : "점진적 개념 소거"}
                  </h2>
                  <p className={s.small}>문장에서 단서를 조금씩 지워요</p>
                </div>
                <FadingIcon name="erase" />
              </div>
              <div className={s.stageTiles}>
                {([1, 2, 3, 4] as const).map((step) => (
                  <div
                    className={s.stageTile}
                    data-final={step === 4}
                    key={step}
                  >
                    <span className={s.caps}>STEP {step}</span>
                    <strong>{stepNames[step]}</strong>
                    <span>{summary.stepCounts[step]}개</span>
                  </div>
                ))}
              </div>
            </section>
            <FadingHomeHistory student={student} state={state} />
          </div>
        )}
        <aside className={s.homeAside}>
          {showDailyDetails && (
            <section className={s.todayRingCard}>
              <div className={s.sectionTitle}>
                <h2>오늘의 복습</h2>
                <span className={s.completedBadge}>한 것 / 할 것</span>
              </div>
              <div className={s.todayRing}>
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#e5eeff"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#006c4a"
                    strokeWidth="10"
                    pathLength="100"
                    strokeDasharray={`${toPercent(progress)} 100`}
                    transform="rotate(-90 60 60)"
                    strokeLinecap="round"
                  />
                </svg>
                <div>
                  <strong>
                    {summary.plan.done} / {summary.plan.total}
                  </strong>
                  <span>오늘의 복습</span>
                </div>
              </div>
              <p className={s.small}>처음 배운 개념은 따로 셉니다.</p>
            </section>
          )}
          {showDailyDetails &&
            (summary.queue.held.length > 0 || summary.mode === "all") && (
              <section className={`${s.card} ${s.stack}`}>
                <h2 className={s.subheading}>
                  {student ? "어떻게 복습할까요?" : "복습 분량을 정해요"}
                </h2>
                <p className={s.muted}>
                  {student ? (
                    <>
                      나눠서 하면 오늘 문장 {state.cap}개까지 연습해요. 처음
                      배우는 개념도 함께 세요.
                    </>
                  ) : (
                    <>
                      나눠서 하면 하루 분량은 문장 {state.cap}개까지입니다. 처음
                      배우는 개념도 함께 셉니다.
                    </>
                  )}
                </p>
                <div className={s.left}>
                  <button
                    className={
                      summary.mode === "split" ? s.primary : s.secondary
                    }
                    aria-pressed={summary.mode === "split"}
                    disabled={busy}
                    onClick={() => onMode(false)}
                  >
                    나눠서
                  </button>
                  <button
                    className={summary.mode === "all" ? s.primary : s.secondary}
                    aria-pressed={summary.mode === "all"}
                    disabled={busy}
                    onClick={() => onMode(true)}
                  >
                    오늘 전부
                  </button>
                </div>
                <p className={s.small}>
                  나중에 할 복습 {summary.queue.held.length}개
                </p>
              </section>
            )}
          <div className={s.transfers}>
            <Link
              prefetch={false}
              className={s.transfer}
              href="/learn/lectures"
            >
              <FadingIcon name="book" />
              <span>
                <strong>개념 강의</strong>
                <small>강의 목록으로</small>
              </span>
              <FadingIcon name="arrow" />
            </Link>
            <Link
              prefetch={false}
              className={s.transfer}
              href="/learn/english-listening"
            >
              <FadingIcon name="book" />
              <span>
                <strong>영어듣기</strong>
                <small>듣기 학습으로</small>
              </span>
              <FadingIcon name="arrow" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
