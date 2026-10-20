import type { CSSProperties, ReactNode } from "react";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { inkOnColor, readablePaperColor } from "./readableColor";
import {
  PRINT_META_FIELDS,
  PRINTED_META_FIELDS,
  type PrintMetaField,
} from "./templateFields";
import type { PrintTemplateProps } from "./types";
import { ArithmeticRoundLabel } from "./templates/ProblemMeta";
import s from "./T2PrintHeader.module.css";
import legacy from "./PrintHeader.module.css";

type Props = Pick<
  PrintTemplateProps,
  "meta" | "options" | "round" | "totalProblems"
>;

/** First-page A/T2 composition; empty values retain the existing omission policy. */
export function T2PrintHeader({ meta, options, round, totalProblems }: Props) {
  const template = options.template,
    accent = options.color || "#1b2a4e";
  const active = PRINTED_META_FIELDS[template];
  const value = (key: PrintMetaField) => {
    if (!active.includes(key) || (key === "examDate" && !options.showDate))
      return undefined;
    const result =
      key === "totalScore" ? `${meta.totalScore ?? 100}점` : meta[key];
    return result === "" ? undefined : result;
  };
  const label = (key: PrintMetaField) =>
    PRINT_META_FIELDS.find(([name]) => name === key)![1];
  const field = (key: PrintMetaField, prominent = false) =>
    value(key) === undefined ? null : (
      <span
        key={key}
        data-meta-field={key}
        className={prominent ? undefined : s.field}
      >
        {!prominent && <span className={s.label}>{label(key)}</span>}
        <span>{value(key)}</span>
      </span>
    );
  const row = (keys: readonly PrintMetaField[]) => (
    <div className={s.info}>{keys.map((key) => field(key))}</div>
  );
  const student = (
    <div className={s.student}>
      <span>학년·반 ______</span>
      <span>번호 ______</span>
      <span>이름 __________</span>
      <span>날짜 __________</span>
    </div>
  );
  const tag = meta.sheetTag ? (
    <span className={legacy.examTag} data-exam-type>
      {meta.sheetTag}
    </span>
  ) : null;
  const tags = (
    <div className={legacy.examPeriod}>
      {template === "pyeongga" && <span>제 1 교시</span>}
      <ArithmeticRoundLabel round={round} />
      {template === "yuhyung" ? (
        <span>{String(totalProblems ?? 0).padStart(2, "0")} 문항</span>
      ) : (
        tag
      )}
    </div>
  );
  const heading = (content: ReactNode) => (
    <div className={s.top}>
      <h1 className={s.heading} data-t2-heading>
        {content}
      </h1>
      {template === "yuhyung" && tag}
      {tags}
    </div>
  );
  let head;
  switch (template) {
    case "pyeongga":
      head = (
        <>
          {heading(<>{field("subject", true)} 영역</>)}
          <div className={s.subTitle}>{field("title", true)}</div>
          {row(active.filter((key) => !["title", "subject"].includes(key)))}
          {student}
        </>
      );
      break;
    case "jeongtong": {
      const fields = active.filter(
        (key) => key !== "title" && value(key) !== undefined,
      );
      head = (
        <>
          {heading(field("title", true))}
          <table className={s.schoolTable} aria-label="학교 시험 정보">
            <tbody>
              {Array.from(
                { length: Math.ceil(fields.length / 2) },
                (_, index) => (
                  <tr key={index}>
                    {fields.slice(index * 2, index * 2 + 2).map((key, cell) => (
                      <td
                        key={key}
                        colSpan={
                          index * 2 + cell === fields.length - 1 &&
                          fields.length % 2
                            ? 2
                            : 1
                        }
                      >
                        {field(key)}
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {student}
        </>
      );
      break;
    }
    case "modern":
      head = (
        <>
          {heading(field("schoolName", true))}
          <div className={s.subTitle}>{field("title", true)}</div>
          {row(
            active.filter(
              (key) => !["title", "schoolName", "todayGoal"].includes(key),
            ),
          )}
          {student}
          {value("todayGoal") !== undefined && (
            <div className={s.note} data-t2-guide>
              {field("todayGoal")}
            </div>
          )}
        </>
      );
      break;
    case "workbook":
      head = (
        <>
          {heading(field("title", true))}
          {row(
            active.filter(
              (key) =>
                !["title", "patternName", "patternStrategy"].includes(key),
            ),
          )}
          {student}
          {(value("patternName") !== undefined ||
            value("patternStrategy") !== undefined) && (
            <div className={`${s.note} ${s.strategy}`}>
              {field("patternName")}
              {field("patternStrategy")}
            </div>
          )}
        </>
      );
      break;
    case "jaseup":
      head = (
        <>
          {heading(field("title", true))}
          {row(["subject", "examDate"])}
          {student}
          {row(["todayGoal"])}
          {meta.conceptNote && (
            <div
              className={s.note}
              data-meta-field="conceptNote"
              data-t2-concept
            >
              <strong>개념 정리</strong>
              <MarkdownRenderer content={meta.conceptNote} />
            </div>
          )}
        </>
      );
      break;
    case "yuhyung":
      head = (
        <>
          {heading(field("title", true))}
          {row(["grade", "subject"])}
          {student}
          <div className={`${s.note} ${s.strategy}`} data-t2-strategy>
            <strong>{field("patternName", true) || meta.title}</strong>
            {field("patternStrategy")}
          </div>
        </>
      );
      break;
  }
  return (
    <header
      data-print-header
      data-template={template}
      className={`${s.header} ${template === "pyeongga" ? s.exam : template === "jeongtong" ? s.school : template === "jaseup" ? s.concept : ""}`}
      style={
        {
          "--head-accent": accent,
          "--head-ink": inkOnColor(accent),
          "--head-info": readablePaperColor(accent),
        } as CSSProperties
      }
    >
      {head}
    </header>
  );
}
