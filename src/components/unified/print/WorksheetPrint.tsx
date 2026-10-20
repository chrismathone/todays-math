import { useEffect, useMemo, useState } from "react";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import { DescriptiveAnswerSheet } from "@/components/print/DescriptiveAnswerSheet";
import { DescriptiveRubricPage } from "@/components/print/DescriptiveRubricPage";
import type { StudioProblem } from "../types";
import { AnswerPage } from "./AnswerPage";
import { EnglishAnswerPage } from "./EnglishAnswerPage";
import { useMeasuredAnswerPages } from "./useMeasuredAnswerPages";
import { useDescriptivePageReadiness } from "./useDescriptivePageReadiness";
import WorkProgress from "../WorkProgress";
import { TEMPLATE_COMPONENTS } from "./templateComponents";
import { useMeasuredPages } from "./useMeasuredPages";
import type { PrintMeta, PrintOptions, ProblemReview } from "./types";
import s from "./WorksheetPrint.module.css";
import { kstDateOf } from "@/lib/kstDate";
import editor from "../WorksheetEditor.module.css";
import {
  arithmeticGroupFrom,
  arithmeticGroupInstruction,
  arithmeticGroupStarts,
  arithmeticOutputGroups,
} from "@/lib/arithmeticOutputLayout";

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
  const [dismissedNotice, setDismissedNotice] = useState("");
  const problems = useMemo(
    () =>
      selected.map((p, index) => ({
        id: p.id,
        number: p.arithmetic?.number ?? p.english?.displayNumber ?? index + 1,
        variant: { ...p, topic: p.section || p.chapter },
        sectionHeading: arithmeticGroupStarts(p, selected[index - 1])
          ? p.arithmetic?.groupTitle
          : undefined,
        sectionInstruction: arithmeticGroupStarts(p, selected[index - 1])
          ? arithmeticGroupInstruction(arithmeticGroupFrom(selected, index))
          : undefined,
      })),
    [selected],
  );
  const ordinaryProblems = useMemo(
    () => problems.filter((problem) => !problem.variant.nativeDescriptive),
    [problems],
  );
  const descriptiveItems = useMemo(
    () =>
      problems.flatMap((problem) =>
        problem.variant.nativeDescriptive
          ? [
              {
                number: problem.number,
                data: problem.variant.nativeDescriptive,
              },
            ]
          : [],
      ),
    [problems],
  );
  const rounds = useMemo(() => arithmeticOutputGroups(selected), [selected]);
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
      title: title || "오늘 수학 학습지",
      subject: result.subject || "수학",
      grade:
        result.grade ||
        [...new Set(selected.map((p) => p.grade).filter(Boolean))].join(" · "),
      examDate: result.examDate || kstDateOf(today),
    };
  }, [printMeta, title, selected]);
  const Template = TEMPLATE_COMPONENTS[options.template];
  const questions = useMeasuredPages(Template, problems, options, meta);
  const hasEnglish = problems.some((problem) => problem.variant.english);
  const englishAnswers = useMeasuredPages(
    EnglishAnswerPage,
    hasEnglish && options.showAnswers ? ordinaryProblems : EMPTY,
    options,
    meta,
    true,
  );
  const mathAnswers = useMeasuredAnswerPages(
    !hasEnglish && options.showAnswers ? ordinaryProblems : EMPTY,
    options,
    meta,
  );
  const answers = hasEnglish ? englishAnswers : mathAnswers;
  const {
    documentRef,
    ready: descriptiveReady,
    overflow: descriptiveOverflow,
  } = useDescriptivePageReadiness(
    JSON.stringify([
      descriptiveItems,
      meta,
      options,
      questions.pages.length,
      answers.pages.length,
    ]),
    descriptiveItems.length > 0 &&
      (options.template === "pyeongga" || options.showAnswers),
    questions.ready && (!options.showAnswers || answers.ready),
  );
  const scaled =
    questions.pages.some((page) => page.scales.some((scale) => scale < 1)) ||
    answers.pages.some((page) => page.scales.some((scale) => scale < 1));
  // EnglishBankPrint blocked oversized blocks. Keep that guard for native English
  // output instead of silently shrinking a complete passage into unreadable type.
  const oversizedEnglish =
    scaled && selected.some((problem) => problem.english);
  const oversizedDescriptive =
    options.template !== "pyeongga" &&
    questions.pages.some((page) =>
      page.indices.some(
        (index, offset) =>
          !!problems[index].variant.nativeDescriptive &&
          page.scales[offset] < 1,
      ),
    );
  const ready =
    questions.ready &&
    !oversizedEnglish &&
    !oversizedDescriptive &&
    descriptiveReady &&
    !descriptiveOverflow &&
    !questions.layoutError &&
    (!options.showAnswers || (answers.ready && !answers.layoutError));
  useEffect(() => {
    onReady(ready);
    return () => onReady(false);
  }, [ready, onReady]);
  const descriptiveAnswerItems =
    options.template === "pyeongga" ? descriptiveItems : [];
  const rubricItems = options.showAnswers ? descriptiveItems : [];
  const total =
    questions.pages.length +
    descriptiveAnswerItems.length +
    answers.pages.length +
    rubricItems.length;
  function roundPageProps(indices: number[], source = problems) {
    const first = source[indices[0]]?.variant.arithmetic;
    if (!first) return {};
    const round = rounds.find((item) => item.round === first.round);
    return {
      round: first.round,
      firstPage:
        first.number === round?.groups[0]?.problems[0].arithmetic?.number,
      totalProblems: round?.count,
    };
  }
  const pages = [
    ...questions.pages.map((page, i) => ({
      key: `question-${i}`,
      kind: "questions",
      content: (
        <Template
          page={i + 1}
          totalPages={total}
          totalProblems={problems.length}
          {...roundPageProps(page.indices)}
          columns={options.columns}
          meta={meta}
          options={options}
          problems={page.indices.map((index) => problems[index])}
          startingNumber={page.indices[0] + 1}
          splitIndex={page.splitIndex}
          itemScales={page.scales.map((scale, offset) =>
            problems[page.indices[offset]].variant.nativeDescriptive &&
            options.template !== "pyeongga"
              ? 1
              : scale,
          )}
          itemWhitespace={page.whitespace}
        />
      ),
    })),
    ...descriptiveAnswerItems.map((item, i) => ({
      key: `descriptive-answer-${i}`,
      kind: "descriptive-answers",
      content: (
        <DescriptiveAnswerSheet
          items={[item]}
          title={meta.title}
          page={questions.pages.length + i + 1}
        />
      ),
    })),
    ...answers.pages.map((page, i) => ({
      key: `answer-${i}`,
      kind: "answers",
      content: (
        <AnswerPage
          page={questions.pages.length + descriptiveAnswerItems.length + i + 1}
          totalPages={total}
          totalProblems={problems.length}
          {...roundPageProps(page.indices, ordinaryProblems)}
          columns={options.columns}
          meta={meta}
          options={{ ...options, solvingArea: "off" }}
          problems={
            "keyRows" in page
              ? ordinaryProblems
              : page.indices.map((index) => ordinaryProblems[index])
          }
          startingNumber={"keyRows" in page ? 1 : page.indices[0] + 1}
          layout={"keyRows" in page ? page : undefined}
          splitIndex={page.splitIndex}
          itemScales={page.scales}
        />
      ),
    })),
    ...rubricItems.map((item, i) => ({
      key: `descriptive-rubric-${i}`,
      kind: "descriptive-rubric",
      content: (
        <DescriptiveRubricPage
          items={[item]}
          title={meta.title}
          page={
            questions.pages.length +
            descriptiveAnswerItems.length +
            answers.pages.length +
            i +
            1
          }
        />
      ),
    })),
  ];
  const notice = [
    questions.fontError || answers.fontError
      ? "선택한 웹 글꼴을 불러오지 못해 대체 글꼴로 표시합니다. 네트워크를 확인하거나 시스템 글꼴을 선택해 주세요."
      : "",
    oversizedEnglish
      ? "한 쪽에 들어가지 않는 영어 지문 또는 문항이 있어 출력을 멈췄습니다. 1단·좁은 여백으로 바꾸거나 원본 세트의 분량을 조정해 주세요."
      : scaled && !oversizedDescriptive
        ? "한 쪽보다 긴 문제는 내용이 잘리지 않도록 해당 문제만 축소했습니다."
        : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className={`${editor.paperCanvas} ${s.previewContainer}`}>
      <div className={editor.paperToolbar}>
        <span>
          미리보기 · A4 · {options.columns}단 · {selected.length}문항 · {total}
          쪽
        </span>
      </div>
      {(oversizedDescriptive || descriptiveOverflow) && (
        <p className={editor.subtle} role="alert">
          서술형 문제·답란 또는 채점표가 한 쪽에 들어가지 않아 출력을
          멈췄습니다. 답란 높이를 유지하도록 1단·좁은 여백으로 바꾸거나 문항
          분량을 조정해 주세요.
        </p>
      )}
      {!ready &&
      (!questions.pages.length ||
        questions.layoutError ||
        answers.layoutError) ? (
        questions.layoutError || answers.layoutError ? (
          <p className={editor.subtle} role="alert">
            {mathAnswers.layoutError
              ? mathAnswers.layoutMessage
              : "시험지 정보가 한 쪽보다 깁니다. 개념 정리나 제목을 줄여 주세요."}
          </p>
        ) : (
          <WorkProgress
            className={editor.printProgress}
            label="시험지 미리보기를 준비하고 있어요"
            detail="글꼴과 그림을 불러오고 페이지를 구성하고 있습니다…"
          />
        )
      ) : null}
      {notice && notice !== dismissedNotice && (
        <div className={s.previewNotice}>
          <p role="status">{notice}</p>
          <button
            type="button"
            aria-label="미리보기 안내 닫기"
            onClick={() => setDismissedNotice(notice)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
      <div className={s.screenPreview}>
        <PaperStrip
          id="worksheet-preview"
          label="시험지 미리보기"
          busy={!ready}
          hint="옆으로 넘겨 보고, 쪽을 누르면 크게 볼 수 있어요."
          pages={pages.map((page, index) => ({
            key: page.key,
            node: (
              <div className={s.document} style={questions.fontStyle}>
                <article className={s.page}>{page.content}</article>
              </div>
            ),
            caption: (
              <>
                <strong>{index + 1}</strong> / {total}쪽 ·{" "}
                {page.kind === "answers"
                  ? "정답"
                  : page.kind === "descriptive-answers"
                    ? "서술형 답안지"
                    : page.kind === "descriptive-rubric"
                      ? "서술형 채점표"
                      : "문제"}
              </>
            ),
            ...(ready ? { enlargeLabel: `${index + 1}쪽 확대` } : {}),
          }))}
        />
      </div>
      {/* Export clients clone only this unscaled document, never the overview or dialog. */}
      <div className={s.printDocument} aria-hidden="true" inert>
        <div
          className={s.document}
          style={questions.fontStyle}
          data-mathgen-document
          data-template={options.template}
          ref={documentRef}
        >
          {pages.map((page) => (
            <article
              className={s.page}
              data-unified-paper
              data-page-kind={page.kind}
              key={page.key}
            >
              {page.content}
            </article>
          ))}
        </div>
      </div>
      {questions.measureNode}
      {options.showAnswers && answers.measureNode}
    </div>
  );
}
