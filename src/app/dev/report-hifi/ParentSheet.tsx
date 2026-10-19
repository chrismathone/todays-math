"use client";

import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { PAPER_CSS_VARIABLES } from "@/components/print/tokens";
import {
  AREA_TITLE,
  type AreaKey,
  areaSummary,
  foldUnits,
  groupUnits,
  parentAreas,
  type ReportSource,
} from "@/lib/achievement/reportAreas";
import {
  absentSentence,
  bandCell,
  bandMethodNote,
  coverageLine,
  dateText,
  FOLD_NOTE,
  HOMEWORK_METHOD_NOTE,
  lectureMethodNote,
  outOfPhrase,
  periodRange,
  periodTitle,
  pointsText,
  underSampledSentence,
} from "@/lib/achievement/sentences";
import {
  ACHIEVEMENT_BANDS,
  type AchievementBand,
  type BandAccuracy,
  MIN_UNIT_PROBLEMS,
  type ScoredRound,
} from "@/lib/achievement/types";

import styles from "./ReportHifi.module.css";
import type { HifiVariant } from "./variants";

/**
 * **학부모 A4 한 장** — Hi-fi 5안이 같이 쓰는 지면 (D-134 ⑻ · Hi-fi 브리프 §2·§3).
 *
 * 🔴 **있는 영역만**(`parentAreas`) · 영역마다 **요약 문장 → 그 밑에 근거 숫자·내역** · 맨 아래 한 줄은
 *    **리포트를 설명한다**(`coverageLine`). 빈 사유·개발 사정은 이 지면에 **0글자** — 원장 화면에만 있다.
 * 🔴 문장은 전부 `sentences.ts` 에서 — 여기서 새로 짓지 않는다(원장 화면과 한 원천).
 * 🔴 **문장이 없어도 기록은 그린다** — 전부 결시인 달에도 결시 날짜가 남는다.
 *
 * ## 넘치면 접는다 — 재서 정한다 (§2 규칙 1)
 *
 * 처음엔 소단원 이름을 전부 적고 **실제로 그린 높이**를 잰다. A4(297mm) 한 장을 넘으면 «대단원 +
 * 소단원 수»로 접고 `FOLD_NOTE` 로 **줄였다는 사실을 밝힌다.** 짐작한 글자 수로 정하지 않는다 —
 * 이 저장소의 «자»는 여러 번 지면과 갈렸다. 접어도 넘치면 그대로 둔다(PDF 쪽수가 그 사실을 말한다).
 */

export type FoldState = "measuring" | "full" | "folded";

/**
 * 지면 내용의 **제 키** — 🔴 내용 틀(`inner`)의 높이를 재면 안 된다. 틀은 A4 높이까지 늘어나고
 * 하단 한 줄은 맨 아래로 밀려 있어서, 재면 늘 «A4 와 같다»가 나온다(첫 실측에서 실데이터가 넘치지
 * 않는데 «접힘»으로 잡혔다). 그래서 **마지막 영역의 밑단 + 틈 + 하단 한 줄의 키**로 잰다.
 * `scratch/shot-report-hifi.mjs` 가 같은 식으로 잰다.
 */
function naturalHeight(sheet: HTMLElement, inner: HTMLElement): number {
  const cs = getComputedStyle(sheet);
  const footer = inner.lastElementChild as HTMLElement | null;
  const last = footer?.previousElementSibling ?? null;
  if (!footer || !last) return 0;
  const gap = parseFloat(getComputedStyle(inner).rowGap) || 0;
  const content =
    last.getBoundingClientRect().bottom -
    inner.getBoundingClientRect().top +
    gap +
    footer.getBoundingClientRect().height;
  return content + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
}

/** A4 297mm 를 CSS px 로(96dpi) — 인쇄도 같은 px 로 깐다. */
const A4_HEIGHT_PX = (297 * 96) / 25.4;

type Props = {
  source: ReportSource;
  variant: HifiVariant;
  example: boolean;
  /** 시험용 — 재지 않고 그 상태로 그린다. 기본은 `auto`(재서 정한다). */
  fold?: "auto" | "full" | "folded";
};

export function ParentSheet({
  source,
  variant,
  example,
  fold = "auto",
}: Props) {
  const sheetRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<FoldState>("measuring");
  const state: FoldState = fold === "auto" ? measured : fold;

  useLayoutEffect(() => {
    if (fold !== "auto" || measured !== "measuring") return;
    let cancelled = false;
    // 글꼴이 다 실린 뒤에 잰다 — 명조가 늦게 실리면 줄바꿈이 달라진다.
    // jsdom 에는 `document.fonts` 가 없다 — 그때는 바로 잰다(높이 0 → «full»).
    const fontsReady: Promise<unknown> =
      typeof document.fonts === "undefined"
        ? Promise.resolve()
        : document.fonts.ready;
    void fontsReady.then(() => {
      if (cancelled) return;
      const sheet = sheetRef.current;
      const inner = innerRef.current;
      if (!sheet || !inner) return;
      setMeasured(
        naturalHeight(sheet, inner) > A4_HEIGHT_PX ? "folded" : "full",
      );
    });
    return () => {
      cancelled = true;
    };
  }, [fold, measured]);

  const { factors } = source;
  const areas = parentAreas(source);

  return (
    <article
      ref={sheetRef}
      className={styles.sheet}
      data-testid="parent-sheet"
      data-face={variant.face}
      data-layout={variant.layout}
      data-fold={state}
      style={PAPER_CSS_VARIABLES as CSSProperties}
    >
      <div ref={innerRef} className={styles.inner}>
        <header className={styles.head}>
          <div>
            <p className={styles.brand}>
              오늘 수학{" "}
              <span className={styles.docTitle}>월간 학습 리포트</span>
            </p>
            <h1 className={styles.studentName}>{factors.student.name}</h1>
            <p className={styles.headMeta}>
              {factors.student.className} · {factors.student.classGrade}
            </p>
          </div>
          <div className={styles.headRight}>
            {example ? <p className={styles.exampleStamp}>예시 자료</p> : null}
            <p className={styles.periodTitle}>{periodTitle(factors.period)}</p>
            <p className={styles.headMeta}>{periodRange(factors.period)}</p>
          </div>
        </header>

        {areas.map((area) => (
          <section
            key={area}
            className={styles.area}
            aria-label={AREA_TITLE[area]}
          >
            <h2 className={styles.areaTitle}>{AREA_TITLE[area]}</h2>
            <Summary lines={areaSummary(source, area)} />
            <Evidence
              area={area}
              source={source}
              variant={variant}
              folded={state === "folded"}
            />
          </section>
        ))}

        <footer className={styles.coverage}>{coverageLine(factors)}</footer>
      </div>
      <div className={styles.a4Edge} aria-hidden="true">
        <span>A4 한 장 끝</span>
      </div>
    </article>
  );
}

function Summary({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className={styles.summary}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function Evidence({
  area,
  source,
  variant,
  folded,
}: {
  area: AreaKey;
  source: ReportSource;
  variant: HifiVariant;
  folded: boolean;
}) {
  const { factors } = source;
  const cols = variant.layout === "twoCol" ? 2 : 1;

  if (area === "learned") {
    const units = factors.learned.units ?? [];
    return (
      <div className={styles.evidence}>
        {folded ? (
          <div className={styles.block}>
            <ul className={styles.chapters}>
              {foldUnits(units).map((c) => (
                <li key={c.chapter}>
                  <span className={styles.chapterName}>{c.chapter}</span> —
                  소단원 {c.units}개 · {c.lessons}차시
                </li>
              ))}
            </ul>
            <p className={styles.method}>{FOLD_NOTE}</p>
          </div>
        ) : (
          <ul className={styles.chapters}>
            {groupUnits(units).map((g) => (
              <li key={g.chapter}>
                <span className={styles.chapterName}>{g.chapter}</span> —{" "}
                {g.sections.join(" · ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (area === "scored") {
    const { scored } = factors;
    const rounds = (
      <Block key="rounds" label="회차별 점수">
        <Rounds
          taken={scored.rounds ?? []}
          absent={scored.absentRounds ?? []}
        />
      </Block>
    );
    const bands = scored.bandAccuracy ? (
      <Block key="bands" label="난이도별 맞힌 문제">
        {variant.bandStyle === "bars" ? (
          <BandBars bands={scored.bandAccuracy} />
        ) : (
          <BandBoard bands={scored.bandAccuracy} />
        )}
        <Method text={bandMethodNote(scored.bandAccuracy)} />
      </Block>
    ) : null;
    const ua = scored.unitAccuracy;
    const units =
      ua && (ua.reported.length > 0 || ua.underSampled.length > 0) ? (
        <Block key="units" label="단원별 맞힌 문제">
          {ua.reported.length > 0 ? (
            <ul className={styles.units}>
              {ua.reported.map((u) => (
                <li key={u.unitId}>
                  {u.section} —{" "}
                  <span className={styles.nowrap}>
                    {outOfPhrase(u.correct, u.total)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <Method text={underSampledSentence(ua.underSampled.length)} />
        </Block>
      ) : null;
    const ordered =
      variant.testOrder === "bandsFirst"
        ? [bands, rounds, units]
        : [rounds, bands, units];
    return (
      <div className={styles.evidence} data-cols={cols}>
        {ordered}
      </div>
    );
  }

  if (area === "selfStudy") {
    const { lectures, homework } = factors.selfStudy;
    return (
      <div className={styles.evidence} data-cols={cols}>
        {lectures ? (
          <p className={styles.plain}>
            <span className={styles.inlineLabel}>예습 영상</span> 대상{" "}
            {lectures.assigned}편 · 끝까지 본 영상 {lectures.completed}편{" "}
            <span className={styles.method}>
              — {lectureMethodNote(factors.period)}
            </span>
          </p>
        ) : null}
        {homework ? (
          <p className={styles.plain}>
            <span className={styles.inlineLabel}>숙제</span> 확인{" "}
            {homework.checked}번 · 안 해 옴 {homework.missed}번
            {homework.missedDates.length > 0
              ? ` (${homework.missedDates.map(dateText).join(" · ")})`
              : ""}{" "}
            <span className={styles.method}>— {HOMEWORK_METHOD_NOTE}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return <p className={styles.noteText}>{source.teacherNote}</p>;
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.block}>
      <p className={styles.blockLabel}>{label}</p>
      {children}
    </div>
  );
}

function Method({ text }: { text: string | null }) {
  return text ? <p className={styles.method}>{text}</p> : null;
}

/**
 * 회차 — 응시와 결시를 **날짜 순서로 한 줄에** 섞는다. 결시는 «결시» 두 글자(0점이 아니다).
 * 만점이 모두 같으면 칸에는 점수만 적고 만점은 한 번만 밝힌다.
 */
function Rounds({
  taken,
  absent,
}: {
  taken: ScoredRound[];
  absent: ScoredRound[];
}) {
  const all = [
    ...taken.map((r) => ({ r, absent: false })),
    ...absent.map((r) => ({ r, absent: true })),
  ].sort((a, b) => a.r.testDate.localeCompare(b.r.testDate));
  const maxes = new Set(
    taken.map((r) => r.maxScore).filter((m): m is number => m !== null),
  );
  const oneMax = maxes.size === 1 ? [...maxes][0]! : null;
  return (
    <>
      <ol className={styles.rounds}>
        {all.map(({ r, absent: isAbsent }) => (
          <li key={r.testId}>
            <span className={styles.roundDate}>{dateText(r.testDate)}</span>
            {isAbsent ? (
              <span className={styles.roundAbsent}>결시</span>
            ) : (
              <span className={styles.roundScore}>
                {r.score === null
                  ? "점수 없음"
                  : oneMax !== null
                    ? `${pointsText(r.score)}점`
                    : `${pointsText(r.score)} / ${r.maxScore === null ? "?" : pointsText(r.maxScore)}`}
              </span>
            )}
          </li>
        ))}
      </ol>
      <Method
        text={
          [
            oneMax !== null ? `각 회 ${pointsText(oneMax)}점 만점` : null,
            absentSentence(absent.length > 0 ? absent : null),
          ]
            .filter(Boolean)
            .join(" · ") || null
        }
      />
    </>
  );
}

/** 숫자판 — 네 칸이 같은 크기. 미측정은 «문제 없음», 문턱 미만은 «평가 보류». */
function BandBoard({
  bands,
}: {
  bands: Record<AchievementBand, BandAccuracy | null>;
}) {
  return (
    <div className={styles.board}>
      {ACHIEVEMENT_BANDS.map((band) => {
        const cell = bandCell(bands[band]);
        return (
          <div key={band} data-band={band}>
            <span className={styles.bandName}>{band}</span>
            <span className={styles.bandCount}>{cell.count}</span>
            {cell.status ? (
              <span className={styles.bandStatus}>{cell.status}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 같은 눈금 가로 막대(H4) — 🔴 **네 막대의 틀이 같은 길이**이고 채움은 «맞힌 수 / 푼 수»에 비례한다.
 * 채움은 **SVG `fill`** 이라 «배경 그래픽 꺼짐»에서도 남는다. 문턱 미만·미측정은 **채움 없이 점선 틀**
 * — 1문항 100% 가 굵은 막대로 서면 그림이 숫자보다 크게 말한다.
 */
function BandBars({
  bands,
}: {
  bands: Record<AchievementBand, BandAccuracy | null>;
}) {
  const W = 200;
  const H = 10;
  return (
    <ul className={styles.bars}>
      {ACHIEVEMENT_BANDS.map((band) => {
        const value = bands[band];
        const cell = bandCell(value);
        const drawn = value !== null && value.total >= MIN_UNIT_PROBLEMS;
        return (
          <li key={band} data-band={band}>
            <span className={styles.bandName}>{band}</span>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`${band} ${cell.count}`}
            >
              <rect
                data-part="track"
                x={0.5}
                y={0.5}
                width={W - 1}
                height={H - 1}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray={drawn ? undefined : "3 2"}
                vectorEffect="non-scaling-stroke"
              />
              {drawn ? (
                <rect
                  data-part="fill"
                  x={0.5}
                  y={0.5}
                  width={((W - 1) * value.correct) / value.total}
                  height={H - 1}
                  fill="currentColor"
                />
              ) : null}
            </svg>
            <span className={styles.barText}>
              {cell.count}
              {cell.status ? ` · ${cell.status}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
