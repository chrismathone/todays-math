import { useEffect, useMemo, useRef, useState } from "react";
import { A4_DIM } from "./tokens";
import type { StudioProblem } from "../types";
import { AnswerPage } from "./AnswerPage";
import { TEMPLATE_COMPONENTS } from "./templateComponents";
import { useMeasuredPages } from "./useMeasuredPages";
import type { PrintMeta, PrintOptions, ProblemReview } from "./types";
import s from "./WorksheetPrint.module.css";
import editor from "../WorksheetEditor.module.css";

const EMPTY: ProblemReview[] = [];

export function WorksheetPrint({
  selected,
  title,
  options,
  printMeta,
  onReady,
}: {
  selected: StudioProblem[];
  title: string;
  options: PrintOptions;
  printMeta: PrintMeta;
  onReady: (ready: boolean) => void;
}) {
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [fitScale, setFitScale] = useState(0.85);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = () =>
      setFitScale(
        Math.min(1, Math.max(0.1, (element.clientWidth - 2) / A4_DIM.width)),
      );
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const problems = useMemo(
    () =>
      selected.map((p) => ({
        id: p.id,
        variant: { ...p, topic: p.section || p.chapter },
      })),
    [selected],
  );
  const meta = useMemo(() => {
    const result = Object.fromEntries(
      Object.entries(printMeta).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() || undefined : value,
      ]),
    ) as PrintMeta;
    const today = new Date();
    return {
      ...result,
      title: title || "오늘의 수학 학습지",
      subject: result.subject || "수학",
      grade:
        result.grade ||
        [...new Set(selected.map((p) => p.grade).filter(Boolean))].join(" · "),
      examDate:
        result.examDate ||
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    };
  }, [printMeta, title, selected]);
  const Template = TEMPLATE_COMPONENTS[options.template];
  const questions = useMeasuredPages(Template, problems, options, meta);
  const answers = useMeasuredPages(
    AnswerPage,
    options.showAnswers ? problems : EMPTY,
    options,
    meta,
    true,
  );
  const ready =
    questions.ready &&
    !questions.layoutError &&
    (!options.showAnswers || (answers.ready && !answers.layoutError));
  useEffect(() => {
    onReady(ready);
    return () => onReady(false);
  }, [ready, onReady]);
  const total = questions.pages.length + answers.pages.length;
  const scaled =
    questions.pages.some((page) => page.scales.some((scale) => scale < 1)) ||
    answers.pages.some((page) => page.scales.some((scale) => scale < 1));

  return (
    <div className={editor.paperCanvas}>
      <div className={editor.paperToolbar}>
        <span>
          미리보기 · A4 · {options.columns}단 · {selected.length}문항 · {total}
          쪽
        </span>
        <label>
          확대{" "}
          <select
            aria-label="미리보기 확대"
            value={zoom}
            onChange={(e) =>
              setZoom(e.target.value === "fit" ? "fit" : Number(e.target.value))
            }
          >
            <option value="fit">너비 맞춤</option>
            {[0.5, 0.65, 0.85, 1, 1.25].map((n) => (
              <option key={n} value={n}>
                {Math.round(n * 100)}%
              </option>
            ))}
          </select>
        </label>
      </div>
      {!ready && (
        <p className={editor.subtle} role="status">
          {questions.layoutError || answers.layoutError
            ? "시험지 정보가 한 쪽보다 깁니다. 개념 정리나 제목을 줄여 주세요."
            : "글꼴과 그림을 불러오고 페이지를 구성하고 있습니다…"}
        </p>
      )}
      {(questions.fontError || answers.fontError) && (
        <p className={editor.subtle} role="status">
          선택한 웹 글꼴을 불러오지 못해 대체 글꼴로 표시합니다. 네트워크를
          확인하거나 시스템 글꼴을 선택해 주세요.
        </p>
      )}
      {scaled && (
        <p className={editor.subtle} role="status">
          한 쪽보다 긴 문제는 내용이 잘리지 않도록 해당 문제만 축소했습니다.
        </p>
      )}
      <div
        className={editor.paperViewport}
        id="worksheet-preview"
        ref={viewport}
        role="region"
        aria-label="시험지 미리보기"
        tabIndex={0}
      >
        <div
          className={s.document}
          style={
            {
              ...questions.fontStyle,
              "--preview-scale": zoom === "fit" ? fitScale : zoom,
            } as React.CSSProperties
          }
          data-mathgen-document
          data-template={options.template}
        >
          {questions.pages.map((page, i) => (
            <article
              className={s.page}
              data-unified-paper
              data-page-kind="questions"
              key={`question-${i}`}
            >
              <Template
                page={i + 1}
                totalPages={total}
                totalProblems={problems.length}
                columns={options.columns}
                meta={meta}
                options={options}
                problems={page.indices.map((index) => problems[index])}
                startingNumber={page.indices[0] + 1}
                splitIndex={page.splitIndex}
                itemScales={page.scales}
              />
            </article>
          ))}
          {answers.pages.map((page, i) => (
            <article
              className={s.page}
              data-unified-paper
              data-page-kind="answers"
              key={`answer-${i}`}
            >
              <AnswerPage
                page={questions.pages.length + i + 1}
                totalPages={total}
                totalProblems={problems.length}
                columns={options.columns}
                meta={meta}
                options={options}
                problems={page.indices.map((index) => problems[index])}
                startingNumber={page.indices[0] + 1}
                splitIndex={page.splitIndex}
                itemScales={page.scales}
              />
            </article>
          ))}
        </div>
      </div>
      {questions.measureNode}
      {options.showAnswers && answers.measureNode}
    </div>
  );
}
