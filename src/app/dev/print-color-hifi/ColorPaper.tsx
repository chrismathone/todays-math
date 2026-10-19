import type { ReactNode } from "react";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { PyeonggaTemplate } from "./previous/PyeonggaTemplate";
import { JeongtongTemplate } from "./previous/JeongtongTemplate";
import { ModernTemplate } from "./previous/ModernTemplate";
import { WorkbookTemplate } from "./previous/WorkbookTemplate";
import { JaseupTemplate } from "./previous/JaseupTemplate";
import { YuhyungTemplate } from "./previous/YuhyungTemplate";
import { ProblemBody } from "@/components/unified/print/templates/ProblemBody";
import type {
  PrintMeta,
  PrintTemplate,
} from "@/components/unified/print/types";
import printStyles from "@/components/unified/print/WorksheetPrint.module.css";
import {
  displayValue,
  FIELDS,
  optionsFor,
  paletteStyle,
  PROBLEMS,
  PROPOSED_FIELDS,
  type Field,
  type VariantId,
} from "./fixtures";
import s from "./PrintColorHifi.module.css";

export function ColorPaper({
  template,
  variant,
  color,
  meta,
  showDate = true,
  examType = "일일TEST",
}: {
  template: PrintTemplate;
  variant: VariantId;
  color: string;
  meta: PrintMeta;
  showDate?: boolean;
  examType?: string;
}) {
  const options = { ...optionsFor(template, color), showDate };
  if (variant === "C5") {
    const Template = {
      pyeongga: PyeonggaTemplate,
      jeongtong: JeongtongTemplate,
      modern: ModernTemplate,
      workbook: WorkbookTemplate,
      jaseup: JaseupTemplate,
      yuhyung: YuhyungTemplate,
    }[template];
    return (
      <div
        className={`${s.currentPaper} ${printStyles.document}`}
        data-demo-sheet
        data-variant={variant}
        data-template={template}
      >
        <Template
          page={1}
          totalPages={1}
          totalProblems={PROBLEMS.length}
          columns={1}
          meta={meta}
          options={options}
          problems={PROBLEMS}
          startingNumber={1}
        />
      </div>
    );
  }
  const fields = PROPOSED_FIELDS[template].filter(
    (key) => key !== "examDate" || showDate,
  );
  const field = (key: Field, prominent = false): ReactNode => {
    if (!fields.includes(key)) return null;
    const label = FIELDS.find(([value]) => value === key)![1];
    return (
      <span
        className={prominent ? s.prominentField : s.infoField}
        key={key}
        data-meta-field={key}
      >
        {!prominent && <span className={s.fieldLabel}>{label}</span>}
        <span>{displayValue(meta, key)}</span>
      </span>
    );
  };
  const row = (...keys: Field[]) => (
    <div className={s.paperInfo}>{keys.map((key) => field(key))}</div>
  );
  const title = <div className={s.paperTitle}>{field("title", true)}</div>;
  const tag =
    examType && examType !== "없음" ? (
      <span className={s.examTag} data-exam-type>
        {examType}
      </span>
    ) : null;
  const header = (() => {
    switch (template) {
      case "pyeongga":
        return (
          <>
            <div className={s.examBand}>
              <strong>{field("subject", true)} 영역</strong>
              <div className={s.examPeriod}>
                <span>제 1 교시</span>
                {tag}
              </div>
            </div>
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
        );
      case "jeongtong":
        return (
          <>
            <div className={s.schoolTable}>
              <div className={s.examBand}>
                {title}
                {tag}
              </div>
              <div className={s.tableFields}>
                {fields
                  .filter((key) => key !== "title")
                  .map((key) => field(key))}
              </div>
            </div>
            <div className={s.studentLine}>
              학년 ______　반 ______　번호 ______　이름 ______________　점수
              ______
            </div>
          </>
        );
      case "modern":
        return (
          <>
            <div className={s.modernHead}>
              <div className={s.modernTop}>
                <div className={s.schoolTitle}>{field("schoolName", true)}</div>
                {tag}
              </div>
              {row("grade", "subject", "semester")}
            </div>
            {title}
            {row("examDate", "totalScore")}
            <div className={s.studentLine}>
              반 ______　번호 ______　이름 ______________　점수 ______
            </div>
          </>
        );
      case "workbook":
        return (
          <>
            <div className={s.academyHead}>
              <div className={s.academyName}>{field("academyName", true)}</div>
              {row("instructorName", "examDate")}
            </div>
            <div className={s.examBand}>
              {title}
              {tag}
            </div>
            {row("grade", "subject")}
            <div className={s.noteBox}>
              {field("patternName")}
              {field("patternStrategy")}
            </div>
            <div className={s.studentLine}>이름 ____________________</div>
          </>
        );
      case "jaseup":
        return (
          <>
            <div className={s.selfHead}>
              <div className={s.selfKicker}>
                <span>자습 학습지</span>
                {tag}
              </div>
              {title}
              {row("subject", "examDate")}
            </div>
            <div className={s.goal}>{field("todayGoal")}</div>
            <div className={s.noteBox} data-meta-field="conceptNote">
              <div className={s.noteLabel}>개념 정리</div>
              <MarkdownRenderer content={meta.conceptNote || " "} />
            </div>
          </>
        );
      case "yuhyung":
        return (
          <>
            <div className={s.patternTop}>
              {title}
              {tag}
              {row("grade", "subject")}
            </div>
            <div className={s.examBand}>
              <div className={s.patternName}>{field("patternName", true)}</div>
              <span>04 문항</span>
            </div>
            <div className={s.strategy}>{field("patternStrategy")}</div>
            <div className={s.studentLine}>이름 ____________________</div>
          </>
        );
    }
  })();
  return (
    <article
      className={`${s.paper} ${printStyles.document}`}
      data-demo-sheet
      data-template={template}
      data-variant={variant}
      style={paletteStyle(variant, color)}
    >
      <header className={s.paperHeader}>{header}</header>
      <div
        className={s.questionArea}
        data-workspace={template === "workbook" || template === "jaseup"}
      >
        {PROBLEMS.map((problem, index) => (
          <section className={s.question} key={problem.id}>
            <div className={s.questionText}>
              <div className={s.number}>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <ProblemBody
                problem={problem.variant}
                options={options}
                fontSize={14}
              />
              {template === "jaseup" && (
                <div className={s.answerLine}>내 정답 __________________</div>
              )}
            </div>
            {(template === "workbook" || template === "jaseup") && (
              <div className={s.scratch} data-grid={template === "jaseup"}>
                <span>풀이</span>
              </div>
            )}
          </section>
        ))}
      </div>
      <footer className={s.paperFooter}>
        <span>
          {template === "jaseup"
            ? "오늘의 메모 ____________________"
            : "이름 ____________________"}
        </span>
        <span>1 / 1</span>
      </footer>
    </article>
  );
}
