import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { A4_DIM } from "./tokens";
import type { StudioProblem } from "../types";
import { AnswerPage } from "./AnswerPage";
import WorkProgress from "../WorkProgress";
import { TEMPLATE_COMPONENTS } from "./templateComponents";
import { useMeasuredPages } from "./useMeasuredPages";
import type { PrintMeta, PrintOptions, ProblemReview } from "./types";
import s from "./WorksheetPrint.module.css";
import { kstDateOf } from "@/lib/kstDate";
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
  const [viewportWidth, setViewportWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [dismissedNotice, setDismissedNotice] = useState("");
  const visiblePage = useRef(0);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = () => {
      setViewportWidth(element.clientWidth);
      setFitScale(
        Math.min(1, Math.max(0.1, (element.clientWidth - 2) / A4_DIM.width)),
      );
    };
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
      examDate: result.examDate || kstDateOf(today),
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
  const scaled =
    questions.pages.some((page) => page.scales.some((scale) => scale < 1)) ||
    answers.pages.some((page) => page.scales.some((scale) => scale < 1));
  // EnglishBankPrint blocked oversized blocks. Keep that guard for native English
  // output instead of silently shrinking a complete passage into unreadable type.
  const oversizedEnglish =
    scaled && selected.some((problem) => problem.english);
  const ready =
    questions.ready &&
    !oversizedEnglish &&
    !questions.layoutError &&
    (!options.showAnswers || (answers.ready && !answers.layoutError));
  useEffect(() => {
    onReady(ready);
    return () => onReady(false);
  }, [ready, onReady]);
  const total = questions.pages.length + answers.pages.length;
  const scale = zoom === "fit" ? fitScale : zoom;
  const currentPage = Math.min(pageIndex, Math.max(0, total - 1));
  function scrollToPage(index: number) {
    const element = viewport.current;
    const page = element?.querySelectorAll<HTMLElement>("[data-unified-paper]")[
      index
    ];
    if (!element || !page) return;
    element.scrollTo({
      left:
        element.scrollLeft +
        page.getBoundingClientRect().left -
        element.getBoundingClientRect().left,
      top: 0,
      behavior: "instant",
    });
  }
  function goToPage(index: number) {
    const next = Math.max(0, Math.min(index, total - 1));
    visiblePage.current = next;
    setPageIndex(next);
    scrollToPage(next);
  }
  // Keep the same sheet in view when zoom, available width or pagination changes.
  // Native scrolling updates the ref without forcing scroll position on every render.
  useLayoutEffect(() => {
    if (!ready) return;
    scrollToPage(Math.min(visiblePage.current, Math.max(0, total - 1)));
  }, [scale, viewportWidth, total, ready]);
  const notice = [
    questions.fontError || answers.fontError
      ? "선택한 웹 글꼴을 불러오지 못해 대체 글꼴로 표시합니다. 네트워크를 확인하거나 시스템 글꼴을 선택해 주세요."
      : "",
    oversizedEnglish
      ? "한 쪽에 들어가지 않는 영어 지문 또는 문항이 있어 출력을 멈췄습니다. 1단·좁은 여백으로 바꾸거나 원본 세트의 분량을 조정해 주세요."
      : scaled
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
        <nav
          className={editor.pageNavigation}
          aria-label="미리보기 페이지 이동"
        >
          <button
            type="button"
            aria-label="이전 페이지"
            aria-controls="worksheet-preview"
            disabled={currentPage === 0 || !total}
            onClick={() => goToPage(currentPage - 1)}
          >
            ← 이전
          </button>
          <span role="status" aria-live="polite" aria-atomic="true">
            {total ? currentPage + 1 : 0} / {total}쪽
          </span>
          <button
            type="button"
            aria-label="다음 페이지"
            aria-controls="worksheet-preview"
            disabled={!total || currentPage >= total - 1}
            onClick={() => goToPage(currentPage + 1)}
          >
            다음 →
          </button>
        </nav>
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
      {!ready &&
      (!questions.pages.length ||
        questions.layoutError ||
        answers.layoutError) ? (
        questions.layoutError || answers.layoutError ? (
          <p className={editor.subtle} role="alert">
            시험지 정보가 한 쪽보다 깁니다. 개념 정리나 제목을 줄여 주세요.
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
      <div
        className={editor.paperViewport}
        id="worksheet-preview"
        ref={viewport}
        role="region"
        aria-label="시험지 미리보기"
        aria-busy={!ready}
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.target !== event.currentTarget ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
          )
            return;
          const index =
            event.key === "ArrowLeft"
              ? currentPage - 1
              : event.key === "ArrowRight"
                ? currentPage + 1
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? total - 1
                    : null;
          if (index === null) return;
          event.preventDefault();
          goToPage(index);
        }}
        onScroll={(event) => {
          if (!ready || !total) return;
          const element = event.currentTarget;
          const left = element.getBoundingClientRect().left;
          const pages = [
            ...element.querySelectorAll<HTMLElement>("[data-unified-paper]"),
          ];
          let closest = 0;
          let distance = Infinity;
          pages.forEach((page, index) => {
            const next = Math.abs(page.getBoundingClientRect().left - left);
            if (next < distance) {
              closest = index;
              distance = next;
            }
          });
          visiblePage.current = closest;
          setPageIndex(closest);
        }}
      >
        <div
          className={s.document}
          style={
            {
              ...questions.fontStyle,
              "--preview-scale": scale,
              "--preview-trailing-space": `${Math.max(0, viewportWidth - A4_DIM.width * scale)}px`,
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
                options={{ ...options, solvingArea: "off" }}
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
