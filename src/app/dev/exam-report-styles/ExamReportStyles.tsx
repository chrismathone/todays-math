"use client";

import { useEffect, useRef, useState } from "react";
import {
  paginateWrongTableRows,
  type WrongTableLayout,
} from "@/lib/examReport/wrongTable";
import { styledReportTableDom } from "@/lib/examReport/styledReportDom";
import {
  PaperStrip,
  type PaperStripPage,
} from "@/components/paper-strip/PaperStrip";
import { REPORT_BLOCK_PRESETS } from "@/lib/examReport/blocks";
import { STYLE_CANDIDATES, styleCandidatePages } from "./candidates";
import {
  STYLE_SCENARIOS,
  styleFixture,
  PREVIEW_HEADER,
  PREVIEW_FOOTER,
  type StyleScenario,
} from "./fixtures";
import { STYLE_CANDIDATE_CSS } from "./paperStyles";
import s from "./ExamReportStyles.module.css";

const COMPOSITIONS = {
  summary: "요약 한 장",
  numbers: "숫자만",
} as const;
type Composition = keyof typeof COMPOSITIONS;
const OPTION_LABELS = {
  wrong: "틀린 문항 표",
  retry: "재시험",
  note: "원장님 문장",
  average: "반 평균",
  trend: "월말평가 추이",
} as const;
const ACTIVE_CANDIDATES = STYLE_CANDIDATES.filter((candidate) =>
  ["H1", "letter", "grid", "ledger"].includes(candidate.id),
);

/** 조작 상태는 미리보기에만 있다. 지면은 후보별 순수 함수로 그린다. */
export function ExamReportStyles() {
  const [scenario, setScenario] = useState<StyleScenario>("normal");
  const [composition, setComposition] = useState<Composition>("summary");
  const [options, setOptions] = useState({
    wrong: true,
    retry: true,
    note: true,
    average: false,
    trend: true,
  });
  const { report, average } = styleFixture(scenario);
  const preview = useRef<HTMLDivElement>(null);
  const fitKey = JSON.stringify([scenario, composition, options]);
  const [fit, setFit] = useState<{
    key: string;
    layouts: Record<string, WrongTableLayout>;
  }>({ key: "", layouts: {} });
  const layouts = fit.key === fitKey ? fit.layouts : {};
  const layoutKey = JSON.stringify(layouts);
  useEffect(() => {
    let active = true;
    const measure = () => {
      if (!active || !preview.current) return;
      const next: Record<string, WrongTableLayout> = {};
      for (const candidate of ACTIVE_CANDIDATES) {
        const metrics = styledReportTableDom(
          preview.current,
          undefined,
          candidate.id,
        );
        if (metrics)
          next[candidate.id] = paginateWrongTableRows(
            metrics.heights,
            metrics.first,
            metrics.continuation,
          );
      }
      setFit((old) =>
        old.key === fitKey &&
        JSON.stringify(old.layouts) === JSON.stringify(next)
          ? old
          : { key: fitKey, layouts: next },
      );
    };
    void (document.fonts?.ready ?? Promise.resolve()).then(measure);
    return () => {
      active = false;
    };
  }, [fitKey, layoutKey]);
  const candidates = ACTIVE_CANDIDATES.map((candidate) => ({
    ...candidate,
    pages: styleCandidatePages(candidate.id, report, {
      ...options,
      blocks: REPORT_BLOCK_PRESETS[composition],
      header: PREVIEW_HEADER,
      footer: PREVIEW_FOOTER,
      average: options.average ? average : null,
      wrongTableLayout: layouts[candidate.id],
    }),
  }));
  const pageOf = (
    candidate: (typeof candidates)[number],
    index: number,
  ): PaperStripPage => ({
    key: `${candidate.id}-${scenario}-${composition}-${index}`,
    node: <div className={s.pageSlot}>{candidate.pages[index]}</div>,
    caption: (
      <div className={s.caption}>
        <strong>
          {candidate.id === "H1" ? "H1 · " : ""}
          {candidate.name} · {index + 1}/{candidate.pages.length}쪽
        </strong>
        <p>{candidate.description}</p>
        <p>약점 · {candidate.weakness}</p>
      </div>
    ),
    enlargeLabel: `${candidate.name} ${index + 1}쪽 확대`,
  });
  // 첫 쪽 일곱 장을 먼저 나란히 놓아 같은 구성을 비교한다. 이어지는 쪽도 모두 남긴다.
  const pages = [
    ...candidates.map((candidate) => pageOf(candidate, 0)),
    ...candidates.flatMap((candidate) =>
      candidate.pages.slice(1).map((_, i) => pageOf(candidate, i + 1)),
    ),
  ];
  return (
    <main className={s.shell}>
      <style>{STYLE_CANDIDATE_CSS}</style>
      <header className={s.header}>
        <h1>월말평가 성적표 · 지면 스타일</h1>
        <p>
          합의한 네 양식입니다. 같은 내용·구성을 비교합니다.
          학생·시험·이력·연락처는 모두 지어낸 예시입니다.
        </p>
        <p>제외: 증서형 · 신문형 · 큰 숫자형</p>
      </header>
      <div className={s.controls}>
        <fieldset className={s.compositions}>
          <legend>블록 구성 예</legend>
          {(Object.entries(COMPOSITIONS) as [Composition, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={composition === key}
                onClick={() => setComposition(key)}
              >
                {label}
              </button>
            ),
          )}
        </fieldset>
        <div className={s.settings}>
          <label className={s.scenario}>
            예시 상황
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as StyleScenario)}
            >
              {(
                Object.entries(STYLE_SCENARIOS) as [StyleScenario, string][]
              ).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={s.outputs}>
            <legend>출력 선택</legend>
            {(
              Object.entries(OPTION_LABELS) as [
                keyof typeof OPTION_LABELS,
                string,
              ][]
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) =>
                    setOptions((old) => ({ ...old, [key]: e.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
        <p className={s.compositionNote}>
          블록 순서 ·{" "}
          {REPORT_BLOCK_PRESETS[composition]
            .map(
              (id) =>
                ({
                  academyHeader: "학원 머리",
                  score: "점수",
                  correctCount: "맞힌 수",
                  markGrid: "정오 격자",
                  wrongTable: "오답 표",
                  trend: "추이",
                  classAverage: "반 평균",
                  retries: "재시험",
                  reviewUnits: "다시 볼 단원",
                  teacherNote: "원장님 문장",
                  footer: "연락처",
                })[id],
            )
            .join(" → ")}
        </p>
        <p className={s.notice}>
          넘치는 오답 행만 다음 쪽으로 이어집니다. «요약 한 장»에도 추가 쪽이
          생길 수 있습니다. 이력이 한 회면 추이 칸을 뺍니다.
        </p>
      </div>
      <div ref={preview}>
        <PaperStrip
          pages={pages}
          label="성적표 스타일 네 가지 비교"
          hint="첫 쪽 네 장 → 양식별 이어지는 오답 표 · 쪽을 누르면 확대"
          maxScale={0.72}
        />
      </div>
    </main>
  );
}
