import type { CSSProperties } from "react";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { inkOnColor, readablePaperColor } from "./readableColor";
import { PAPER_COLORS } from "./tokens";
import {
  PRINT_META_FIELDS,
  PRINTED_META_FIELDS,
  type PrintMetaField,
} from "./templateFields";
import type { PrintTemplateProps } from "./types";
import { ArithmeticRoundLabel } from "./templates/ProblemMeta";
import s from "./PrintHeader.module.css";

/** The approved C2 heads, shared by real output and its measurement probes. */
export function LegacyPrintHeader({
  page,
  firstPage,
  round,
  totalProblems,
  meta,
  options,
}: Pick<
  PrintTemplateProps,
  "page" | "firstPage" | "round" | "totalProblems" | "meta" | "options"
>) {
  const first = firstPage ?? page === 1;
  const template = options.template;
  const accent = options.color || PAPER_COLORS.accentNavy;
  const style = {
    "--head-accent": accent,
    "--head-ink": inkOnColor(accent),
    "--head-info": readablePaperColor(accent),
    "--head-line": PAPER_COLORS.ink15,
    "--head-rule": PAPER_COLORS.ink15,
    "--head-paper": PAPER_COLORS.paper,
  } as CSSProperties;
  const field = (key: PrintMetaField, prominent = false) => {
    if (
      !PRINTED_META_FIELDS[template].includes(key) ||
      (key === "examDate" && !options.showDate)
    )
      return null;
    const value =
      key === "totalScore" ? `${meta.totalScore ?? 100}점` : meta[key];
    if (value === undefined || value === "") return null;
    return (
      <span
        className={prominent ? s.prominentField : s.infoField}
        key={key}
        data-meta-field={key}
      >
        {!prominent && (
          <span className={s.fieldLabel}>
            {PRINT_META_FIELDS.find(([name]) => name === key)![1]}
          </span>
        )}
        <span>{value}</span>
      </span>
    );
  };
  const row = (...keys: PrintMetaField[]) => (
    <div className={s.paperInfo}>{keys.map((key) => field(key))}</div>
  );
  const title = <div className={s.paperTitle}>{field("title", true)}</div>;
  const tag = meta.sheetTag ? (
    <span className={s.examTag} data-exam-type>
      {meta.sheetTag}
    </span>
  ) : null;
  const roundLabel = <ArithmeticRoundLabel round={round} />;
  const count = <span>{String(totalProblems ?? 0).padStart(2, "0")} 문항</span>;
  const period = (
    <div className={s.examPeriod}>
      <span>제 1 교시</span>
      {roundLabel}
      {tag}
    </div>
  );
  let head;
  switch (template) {
    case "pyeongga":
      head = (
        <>
          <div className={s.examBand}>
            <strong>{field("subject", true)} 영역</strong>
            {period}
          </div>
          {first && (
            <>
              {title}
              {row(
                "schoolName",
                "grade",
                "semester",
                "examDate",
                "examDuration",
                "totalScore",
              )}
            </>
          )}
        </>
      );
      break;
    case "jeongtong":
      head = (
        <>
          <div className={s.schoolTable}>
            <div className={s.examBand}>
              {title}
              <div className={s.examPeriod}>
                {roundLabel}
                {tag}
              </div>
            </div>
            {first && (
              <div className={s.tableFields}>
                {PRINTED_META_FIELDS[template]
                  .filter((key) => key !== "title")
                  .map((key) => field(key))}
              </div>
            )}
          </div>
          {first && (
            <div className={s.studentLine}>
              학년 ______　반 ______　번호 ______　이름 ______________　점수
              ______
            </div>
          )}
        </>
      );
      break;
    case "modern":
      head = (
        <>
          <div className={s.modernHead}>
            <div className={s.modernTop}>
              <div className={s.schoolTitle}>{field("schoolName", true)}</div>
              <div className={s.examPeriod}>
                {roundLabel}
                {tag}
              </div>
            </div>
            {first && row("grade", "subject", "semester")}
          </div>
          {first && (
            <>
              {title}
              {row("examDate", "totalScore")}
              <div className={s.studentLine}>
                반 ______　번호 ______　이름 ______________　점수 ______
              </div>
            </>
          )}
        </>
      );
      break;
    case "workbook":
      head = (
        <>
          {first && (
            <div className={s.academyHead}>
              <div className={s.academyName}>{field("academyName", true)}</div>
              {row("instructorName", "examDate")}
            </div>
          )}
          <div className={s.examBand}>
            {title}
            <div className={s.examPeriod}>
              {roundLabel}
              {tag}
            </div>
          </div>
          {first && (
            <>
              {row("grade", "subject")}
              <div className={s.noteBox}>
                {field("patternName")}
                {field("patternStrategy")}
              </div>
              <div className={s.studentLine}>이름 ____________________</div>
            </>
          )}
        </>
      );
      break;
    case "jaseup":
      head = (
        <>
          <div className={s.selfHead}>
            <div className={s.selfKicker}>
              <span>자습 학습지</span>
              <div className={s.examPeriod}>
                {roundLabel}
                {tag}
              </div>
            </div>
            {title}
            {first && row("subject", "examDate")}
          </div>
          {first && (
            <>
              <div className={s.goal}>{field("todayGoal")}</div>
              {meta.conceptNote && (
                <div className={s.noteBox} data-meta-field="conceptNote">
                  <div className={s.noteLabel}>개념 정리</div>
                  <MarkdownRenderer content={meta.conceptNote} />
                </div>
              )}
            </>
          )}
        </>
      );
      break;
    case "yuhyung":
      head = (
        <>
          {first && (
            <div className={s.patternTop}>
              {title}
              {tag}
              {row("grade", "subject")}
            </div>
          )}
          <div className={s.examBand}>
            <div className={s.patternName}>
              {field("patternName", true) || meta.title}
            </div>
            <div className={s.examPeriod}>
              {roundLabel}
              {count}
            </div>
          </div>
          {first && (
            <>
              <div className={s.strategy}>{field("patternStrategy")}</div>
              <div className={s.studentLine}>이름 ____________________</div>
            </>
          )}
        </>
      );
  }
  if (!first && round === undefined) return null;
  return (
    <header
      className={s.header}
      style={style}
      data-print-header
      data-template={template}
    >
      {head}
    </header>
  );
}
