import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { columnContentWidth } from "./geometry";
import { getFontPack } from "./fontPacks";
import { loadPrintFonts } from "./loadFonts";
import {
  AnswerPage,
  AnswerSolution,
  AnswerSolutionHeading,
  QuickAnswerCell,
} from "./AnswerPage";
import {
  ANSWER_SPANS,
  packAnswerRows,
  paginateAnswerPages,
  type AnswerMetrics,
  type AnswerPageLayout,
} from "./answerKeyLayout";
import type { PrintOptions, PrintMeta, ProblemReview } from "./types";
import paper from "./WorksheetPrint.module.css";
import answer from "./AnswerPage.module.css";

const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const EMPTY_LAYOUT: AnswerPageLayout = {
  keyRows: [],
  solutionIndices: [],
  indices: [],
  splitIndex: 0,
  scales: [],
  groupStart: 0,
};

/** Answer-only measuring/packing; question packing and all user spacing controls stay independent. */
export function useMeasuredAnswerPages(
  problems: ProblemReview[],
  options: PrintOptions,
  meta: PrintMeta,
) {
  const host = useRef<HTMLDivElement>(null);
  const key = useMemo(
    () => JSON.stringify([problems, options, meta]),
    [problems, options, meta],
  );
  const contentKey = useMemo(
    () => JSON.stringify([problems, options]),
    [problems, options],
  );
  const groups = useMemo(() => {
    const starts = problems.flatMap((problem, index) =>
      index === 0 ||
      problem.variant.arithmetic?.round !==
        problems[index - 1].variant.arithmetic?.round
        ? [index]
        : [],
    );
    return starts.map((start, index) => ({
      start,
      end: starts[index + 1] ?? problems.length,
      round: problems[start].variant.arithmetic?.round,
    }));
  }, [problems]);
  const font = getFontPack(options.fontPack);
  const fontStyle = useMemo(
    () =>
      ({
        "--paper-font-serif": font.serif,
        "--paper-font-sans":
          options.fontPack === "pretendard"
            ? `var(--font-pretendard), ${font.sans}`
            : font.sans,
        "--answer-accent": options.color,
      }) as CSSProperties,
    [font, options.fontPack, options.color],
  );
  const fullWidth = columnContentWidth(
    "jeongtong",
    1,
    options.marginPreset,
    "off",
  );
  const solutionWidth = columnContentWidth(
    "jeongtong",
    options.columns,
    options.marginPreset,
    "off",
  );
  const [measured, setMeasured] = useState<{
    key: string;
    contentKey: string;
    cells: AnswerMetrics[];
    solutions: number[];
    available: number[];
    heading: number;
    fontError: boolean;
  } | null>(null);

  useEffect(() => {
    if (!problems.length) return;
    let cancelled = false;
    let scheduled = 0;
    let observer: ResizeObserver | undefined;
    let fontError = false;
    const measure = () => {
      const root = host.current;
      if (cancelled || !root || !root.getClientRects().length) return;
      const cells = problems.map((_, index): AnswerMetrics => {
        const natural = root.querySelector<HTMLElement>(
          `[data-answer-candidate="${index}:natural"] [data-answer-value]`,
        )!;
        return {
          naturalHeight: natural.getBoundingClientRect().height,
          lineHeight: parseFloat(getComputedStyle(natural).lineHeight) || 21.6,
          candidates: ANSWER_SPANS.map((span) => {
            const cell = root.querySelector<HTMLElement>(
              `[data-answer-candidate="${index}:${span}"]`,
            )!;
            const value = cell.querySelector<HTMLElement>(
              "[data-answer-value]",
            )!;
            const rect = value.getBoundingClientRect();
            const overflow =
              value.scrollWidth > value.clientWidth + 1 ||
              Array.from(
                value.querySelectorAll<HTMLElement>(".katex-html"),
              ).some((ink) => {
                const bounds = ink.getBoundingClientRect();
                return (
                  bounds.left < rect.left - 1 || bounds.right > rect.right + 1
                );
              });
            return {
              span,
              height: cell.getBoundingClientRect().height,
              answerHeight: rect.height,
              overflow,
            };
          }),
        };
      });
      const solutions = options.quickAnswerOnly
        ? []
        : problems.map(
            (_, index) =>
              root
                .querySelector<HTMLElement>(
                  `[data-answer-solution-measure="${index}"]`,
                )!
                .getBoundingClientRect().height,
          );
      const available = groups.map(
        (_, index) =>
          root
            .querySelector<HTMLElement>(
              `[data-answer-probe="${index}"] [data-answer-body]`,
            )!
            .getBoundingClientRect().height - 3,
      );
      const headingNode = root.querySelector<HTMLElement>(
        "[data-answer-heading-measure] h3",
      )!;
      const headingStyle = getComputedStyle(headingNode);
      const heading =
        headingNode.getBoundingClientRect().height +
        (parseFloat(headingStyle.marginTop) || 0) +
        (parseFloat(headingStyle.marginBottom) || 0);
      const next = {
        key,
        contentKey,
        cells,
        solutions,
        available,
        heading,
        fontError,
      };
      setMeasured((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    void (async () => {
      try {
        await loadPrintFonts(options.fontPack);
      } catch {
        fontError = true;
      }
      if (cancelled) return;
      await Promise.all(
        Array.from(
          host.current?.querySelectorAll("img") ?? [],
          async (image) => {
            try {
              await image.decode?.();
            } catch {
              /* Preserve visible alt text. */
            }
          },
        ),
      );
      await frame();
      await frame();
      if (cancelled) return;
      measure();
      if (typeof ResizeObserver !== "undefined" && host.current) {
        observer = new ResizeObserver(() => {
          cancelAnimationFrame(scheduled);
          scheduled = requestAnimationFrame(measure);
        });
        host.current
          .querySelectorAll(
            "[data-answer-candidate], [data-answer-solution-measure], [data-answer-body], [data-answer-heading-measure]",
          )
          .forEach((node) => observer!.observe(node));
      }
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      cancelAnimationFrame(scheduled);
    };
  }, [
    key,
    contentKey,
    problems,
    groups,
    options.fontPack,
    options.quickAnswerOnly,
  ]);

  const ready = !problems.length || measured?.key === key;
  const result = useMemo(() => {
    if (!problems.length)
      return { pages: [] as AnswerPageLayout[], message: "" };
    if (measured?.contentKey !== contentKey) {
      // Preserve printable content for SSR and layout-less clients such as jsdom.
      // These are provisional rows, not measured geometry: ready stays false,
      // so export preflight still waits for the actual browser measurement.
      return {
        pages: groups.map(({ start, end }): AnswerPageLayout => {
          const indices = Array.from(
            { length: end - start },
            (_, i) => start + i,
          );
          const keyRows = Array.from(
            { length: Math.ceil(indices.length / 5) },
            (_, row) => ({
              height: 0,
              cells: indices
                .slice(row * 5, row * 5 + 5)
                .map((index) => ({ index, span: 1 as const })),
            }),
          );
          const solutionIndices = options.quickAnswerOnly ? [] : indices;
          return {
            keyRows,
            solutionIndices,
            indices,
            groupStart: start,
            scales: solutionIndices.map(() => 1),
            splitIndex: Math.ceil(solutionIndices.length / options.columns),
          };
        }),
        message: "",
      };
    }
    const numberOf = (index: number) =>
      problems[index].variant.arithmetic?.number ?? index + 1;
    try {
      return {
        pages: groups.flatMap((group, groupIndex) => {
          if (measured.available[groupIndex] < 40)
            throw new Error("정답지 머리가 한 쪽보다 깁니다.");
          const rows = packAnswerRows(
            measured.cells.slice(group.start, group.end),
            group.start,
            numberOf,
          );
          const solutions = options.quickAnswerOnly
            ? []
            : measured.solutions
                .slice(group.start, group.end)
                .map((height, index) => ({
                  index: group.start + index,
                  height,
                }));
          return paginateAnswerPages(rows, solutions, {
            available: measured.available[groupIndex],
            headingHeight: measured.heading,
            gap: Math.max(0, options.spacing),
            columns: options.columns,
            groupStart: group.start,
            numberOf,
          });
        }),
        message: "",
      };
    } catch (error) {
      return {
        pages: [] as AnswerPageLayout[],
        message:
          error instanceof Error
            ? error.message
            : "정답지 구성을 확인해 주세요.",
      };
    }
  }, [
    problems,
    measured,
    contentKey,
    groups,
    options.quickAnswerOnly,
    options.spacing,
    options.columns,
  ]);

  const measureNode = problems.length ? (
    <div
      ref={host}
      aria-hidden="true"
      className={`${paper.measureHost} ${paper.document}`}
      style={fontStyle}
    >
      {problems.map(({ id, variant }, index) => (
        <div key={id}>
          <QuickAnswerCell
            problem={variant}
            number={variant.arithmetic?.number ?? index + 1}
            natural
            style={{ width: "max-content" }}
            measureKey={`${index}:natural`}
          />
          {ANSWER_SPANS.map((span) => (
            <QuickAnswerCell
              key={span}
              problem={variant}
              number={variant.arithmetic?.number ?? index + 1}
              span={span}
              style={{ width: ((fullWidth - 1) * span) / 5 }}
              measureKey={`${index}:${span}`}
            />
          ))}
          {!options.quickAnswerOnly ? (
            <div
              data-answer-solution-measure={index}
              style={{ width: solutionWidth }}
            >
              <AnswerSolution
                problem={variant}
                number={variant.arithmetic?.number ?? index + 1}
                options={options}
              />
            </div>
          ) : null}
        </div>
      ))}
      <div
        data-answer-heading-measure
        className={answer.content}
        style={{ width: fullWidth }}
      >
        <AnswerSolutionHeading />
      </div>
      {groups.map((group, index) => (
        <div key={group.start} data-answer-probe={index}>
          <AnswerPage
            page={1}
            totalPages={2}
            round={group.round}
            columns={options.columns}
            startingNumber={1}
            meta={meta}
            options={options}
            problems={[]}
            layout={EMPTY_LAYOUT}
          />
        </div>
      ))}
    </div>
  ) : null;

  return {
    pages: result.pages,
    ready,
    layoutError: ready && !!result.message,
    layoutMessage: result.message,
    fontError: ready && !!measured?.fontError,
    fontStyle,
    measureNode,
  };
}
