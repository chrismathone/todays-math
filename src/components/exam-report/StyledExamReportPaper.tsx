import { Fragment, type CSSProperties } from "react";
import type { StudentExamReport } from "@/contracts/examReport.contract";
import type { ExamReportStyle } from "@/contracts/examReportWorkspace.contract";
export type { ExamReportStyle } from "@/contracts/examReportWorkspace.contract";
import { A4Page } from "@/components/print/A4Page";
import { PAPER_COLORS } from "@/components/print/tokens";
import { ExamReportTrend } from "./ExamReportTrend";
import {
  planReportBlocks,
  reviewUnits,
  type BlockId,
  type BlockMeasure,
  type PlannedBlock,
  type ReportBlockOptions,
} from "@/lib/examReport/blocks";
import { originalScoreLabel, scoreTo100 } from "@/lib/examReport/score100";
import { recentExamHistory } from "@/lib/examReport/trend";
import {
  paginateWrongTableRows,
  wrongTableColumns,
  type WrongTableLayout,
} from "@/lib/examReport/wrongTable";

export const EXAM_REPORT_STYLES = [
  {
    id: "H1",
    name: "H1",
    description: "문장과 점수, 기록을 균형 있게 읽습니다.",
  },
  {
    id: "letter",
    name: "편지형",
    description: "원장님 문장을 편지 본문처럼 읽습니다.",
  },
  {
    id: "grid",
    name: "정오 격자형",
    description: "전체 문항의 정오와 틀린 문항의 설명을 따로 봅니다.",
  },
  {
    id: "ledger",
    name: "장부형",
    description: "항목 이름과 기록을 같은 자리에서 대조합니다.",
  },
] as const;
export type StyleReportOptions = ReportBlockOptions & {
  wrongTableLayout?: WrongTableLayout;
};
type Question = StudentExamReport["questions"][number];
const statusLabels = {
  absent: "결시",
  ungraded: "미채점",
  incomplete: "채점 중",
  graded: "채점 완료",
} as const;
const LABELS: Record<BlockId, string> = {
  score: "이번 시험",
  correctCount: "맞힌 문항",
  markGrid: "문항별 정오",
  wrongTable: "틀린 문항",
  trend: "월말평가 추이",
  classAverage: "반 평균",
  retries: "재시험 결과",
  reviewUnits: "다음에 다시 볼 단원",
  teacherNote: "원장님 문장",
  academyHeader: "학원",
  footer: "문의",
};
function textLines(text: string, widthMm: number, pt = 10) {
  return text
    .split("\n")
    .reduce(
      (sum, line) =>
        sum +
        Math.max(
          1,
          Math.ceil(
            ([...line].reduce(
              (n, c) => n + (c.codePointAt(0)! > 127 ? 1 : 0.65),
              0,
            ) *
              pt *
              25.4) /
              72 /
              widthMm,
          ),
        ),
      0,
    );
}
function markRows(questions: readonly Question[], columns: number) {
  return Array.from({ length: Math.ceil(questions.length / columns) }, (_, i) =>
    questions.slice(i * columns, (i + 1) * columns),
  );
}
/** 최초 HTML의 추정치. 화면과 PDF는 자체 글꼴을 적재한 DOM에서 행 높이를 다시 잰다. */
export function measureStyleBlock(
  id: ExamReportStyle,
  report: StudentExamReport,
  options: StyleReportOptions,
  block: BlockId,
): BlockMeasure {
  const ledger = id === "ledger";
  const width = ledger ? 176 : 180;
  const head = ledger ? 7 : 8;
  switch (block) {
    case "academyHeader":
      return {
        heightMm:
          (id === "letter" ? 29 : 30) +
          Math.max(0, textLines(report.student.name, 90, 23) - 1) * 11 +
          Math.max(0, textLines(report.publication.title, 70, 9) - 2) * 5,
      };
    case "teacherNote":
      return {
        heightMm:
          (ledger ? 4 : head + (id === "letter" ? 6 : 2)) +
          textLines(
            report.teacherNote,
            width - (ledger ? 34 : 0),
            id === "letter" ? 11 : 10,
          ) *
            (id === "letter" ? 7.4 : 6),
      };
    case "score":
      return { heightMm: id === "letter" ? 18 : ledger ? 20 : 25 };
    case "correctCount":
      return { heightMm: id === "letter" ? 18 : ledger ? 14 : 18 };
    case "markGrid":
      return {
        heightMm: head + 6 + Math.ceil(report.questions.length / 10) * 8,
      };
    case "wrongTable": {
      if (!report.wrongQuestions.length || report.status !== "graded")
        return { heightMm: head + 8 };
      const columns = wrongTableColumns(report.wrongQuestions.length);
      const cellWidth =
        columns === 2 ? (width - 24) / 4 - 4 : (width - 16) / 2 - 4;
      return {
        heightMm: head + (columns === 2 ? 12 : 7),
        rowsMm: markRows(report.wrongQuestions, columns).map(
          (row) =>
            2.8 +
            Math.max(
              ...row.map((q) =>
                Math.max(
                  textLines(q.unitName, cellWidth, 9),
                  textLines(q.typeLabel ?? "—", cellWidth, 9),
                ),
              ),
            ) *
              5.1,
        ),
      };
    }
    case "trend":
      return {
        heightMm:
          head +
          (width * 144) / 640 +
          Math.max(
            ...recentExamHistory(report.history).map((r) =>
              textLines(
                r.title,
                width / Math.max(2, recentExamHistory(report.history).length) -
                  2,
                9,
              ),
            ),
          ) *
            4.8 +
          2,
      };
    case "retries":
      return {
        heightMm:
          head +
          report.retries.reduce(
            (sum, r) =>
              sum +
              textLines(
                `${r.testDate} · 오답 복습 ${r.questionCount}문항 중 ${r.correctCount ?? "—"}문항 정답`,
                width - (ledger ? 34 : 0),
                9,
              ) *
                5.2,
            0,
          ) +
          2,
      };
    case "classAverage":
      return { heightMm: ledger ? 17 : 18 };
    case "reviewUnits":
      return {
        heightMm:
          head +
          reviewUnits(report).reduce(
            (sum, unit) => sum + textLines(unit, width - 10, 9) * 5.2,
            0,
          ) +
          2,
      };
    case "footer":
      return { heightMm: 4 + textLines(options.footer ?? "", width, 9) * 5 };
  }
}

function MarkGrid({ questions }: { questions: readonly Question[] }) {
  return (
    <div className="sc-marks">
      {questions.map((q) => (
        <div
          key={q.problemId}
          className="sc-mark"
          data-wrong={q.isCorrect === false}
          data-mark-no={q.no}
        >
          <div>
            <span className="sc-no">{q.no}번</span>
            <strong
              aria-label={
                q.isCorrect === null
                  ? "기록 없음"
                  : q.isCorrect
                    ? "정답"
                    : "오답"
              }
            >
              {q.isCorrect === null ? "—" : q.isCorrect ? "○" : "✕"}
            </strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function WrongTable({
  report,
  from,
  to,
}: {
  report: StudentExamReport;
  from: number;
  to: number;
}) {
  if (report.status !== "graded")
    return (
      <p>
        {report.status === "absent"
          ? "결시하여 문항별 기록이 없습니다."
          : "채점 후 문항별 기록을 확인합니다."}
      </p>
    );
  if (!report.wrongQuestions.length) return <p>틀린 문항이 없습니다.</p>;
  const columns = wrongTableColumns(report.wrongQuestions.length);
  const rows = markRows(report.wrongQuestions, columns).slice(from, to);
  return (
    <table className="sc-wrongTable" data-er-wrong-columns={columns}>
      {columns === 2 && <caption>왼쪽 → 오른쪽, 위 → 아래 순서</caption>}
      <colgroup>
        {Array.from({ length: columns }, (_, i) => (
          <Fragment key={i}>
            <col style={{ width: columns === 1 ? "16mm" : "12mm" }} />
            <col />
            <col />
          </Fragment>
        ))}
      </colgroup>
      <thead>
        <tr>
          {Array.from({ length: columns }, (_, i) => (
            <Fragment key={i}>
              <th scope="col">번호</th>
              <th scope="col">단원</th>
              <th scope="col">유형</th>
            </Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0].problemId} data-er-wrong-row>
            {row.map((q) => (
              <Fragment key={q.problemId}>
                <td data-wrong-table-no={q.no} data-er-wrong-no={q.no}>
                  <strong>
                    <u>{q.no}번</u>
                  </strong>
                </td>
                <td>{q.unitName}</td>
                <td>{q.typeLabel ?? "—"}</td>
              </Fragment>
            ))}
            {row.length < columns && <td colSpan={3} />}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Block({
  report,
  options,
  block,
}: {
  report: StudentExamReport;
  options: StyleReportOptions;
  block: PlannedBlock;
}) {
  const graded = report.status === "graded";
  const original = originalScoreLabel(report.score);
  const score100 = graded
    ? scoreTo100(report.score.value, report.score.maximum)
    : null;
  const heading = (
    <h3>
      {LABELS[block.id]}
      {block.continued ? " (이어서)" : ""}
    </h3>
  );
  let content;
  switch (block.id) {
    case "academyHeader":
      content = (
        <header className="sc-academy">
          <p className="sc-academyName">{options.header?.name}</p>
          {options.header?.line && (
            <p className="sc-motto">{options.header.line}</p>
          )}
          <div className="sc-nameRow">
            <h2>{report.student.name}</h2>
            <p>
              {report.className}
              <br />
              {report.publication.testDate.replaceAll("-", ". ")}
            </p>
            <p className="sc-examTitle">{report.publication.title}</p>
          </div>
        </header>
      );
      break;
    case "score":
      content = (
        <>
          {heading}
          <div className="sc-scoreValue">
            <strong>
              {graded
                ? score100 === null
                  ? "점수 확인 필요"
                  : `${score100}점`
                : statusLabels[report.status]}
            </strong>
            {graded && score100 !== null && <span> / 100점 만점</span>}
          </div>
          {graded && original && <p className="sc-original">{original}</p>}
        </>
      );
      break;
    case "correctCount":
      content = (
        <>
          {heading}
          <p className="sc-correct">
            <strong>{graded ? report.correctCount : "—"}</strong>
            <span>
              {graded
                ? ` / ${report.questionCount}문항`
                : report.status === "absent"
                  ? "결시"
                  : "채점 완료 후 표시"}
            </span>
          </p>
        </>
      );
      break;
    case "teacherNote":
      content = (
        <>
          {heading}
          <p className="sc-noteText">{report.teacherNote}</p>
        </>
      );
      break;
    case "markGrid":
      content = (
        <>
          {heading}
          <MarkGrid questions={report.questions} />
          <p className="sc-legend">
            ○ 정답 · <strong>✕ 오답</strong> · — 기록 없음
          </p>
        </>
      );
      break;
    case "wrongTable":
      content = (
        <>
          {heading}
          <WrongTable report={report} from={block.from} to={block.to} />
        </>
      );
      break;
    case "trend":
      content = (
        <>
          {heading}
          <ExamReportTrend history={report.history} />
        </>
      );
      break;
    case "classAverage":
      content = (
        <>
          {heading}
          <p className="sc-average">
            <strong>
              {scoreTo100(
                options.average!.averageScore,
                report.score.maximum,
              ) ?? "—"}
              점
            </strong>{" "}
            / 100점 환산 · 응시 {options.average!.gradedCount}명 기준
          </p>
        </>
      );
      break;
    case "retries":
      content = (
        <>
          {heading}
          <div className="sc-retries">
            {report.retries.map((r) => (
              <p key={r.testId}>
                {r.testDate.replaceAll("-", ". ")} ·{" "}
                {r.status === "graded"
                  ? `오답 복습 ${r.questionCount}문항 중 ${r.correctCount}문항 정답`
                  : statusLabels[r.status]}
              </p>
            ))}
          </div>
        </>
      );
      break;
    case "reviewUnits":
      content = (
        <>
          {heading}
          <ol className="sc-units">
            {reviewUnits(report).map((unit) => (
              <li key={unit}>{unit}</li>
            ))}
          </ol>
        </>
      );
      break;
    case "footer":
      content = <p className="sc-contact">{options.footer}</p>;
      break;
  }
  return (
    <section
      className={`sc-block sc-${block.id}`}
      data-report-block={block.id}
      data-continued={block.continued || undefined}
    >
      {content}
    </section>
  );
}

/** 요약의 모든 고정 기록을 먼저 예약한다. 이어지는 쪽에는 오답 행만 간다. */
export function planStyleReport(
  id: ExamReportStyle,
  report: StudentExamReport,
  options: StyleReportOptions,
) {
  const blocks = [
    ...(options.blocks ?? [
      "academyHeader",
      "teacherNote",
      "score",
      "correctCount",
      "wrongTable",
      "trend",
      "classAverage",
      "retries",
      "footer",
    ]),
  ];
  if (
    id === "grid" &&
    options.wrong !== false &&
    blocks.includes("wrongTable") &&
    !blocks.includes("markGrid")
  )
    blocks.splice(blocks.indexOf("wrongTable"), 0, "markGrid");
  // 공용 블록의 표시 조건을 그대로 사용한다. 이 호출에서는 쪽을 나누지 않는다.
  const selected =
    planReportBlocks(
      report,
      { ...options, blocks },
      (block) => measureStyleBlock(id, report, options, block),
      { capacityMm: 1_000_000, gapMm: 0 },
    )[0]?.blocks ?? [];
  const gap = id === "ledger" ? 0 : 2;
  let reserved = 0;
  let groups = 0;
  for (let i = 0; i < selected.length; i++) {
    const block = selected[i];
    let height = measureStyleBlock(id, report, options, block.id).heightMm;
    if (
      id !== "ledger" &&
      block.id === "score" &&
      selected[i + 1]?.id === "correctCount"
    ) {
      height = Math.max(
        height,
        measureStyleBlock(id, report, options, "correctCount").heightMm,
      );
      i++;
    }
    reserved += height;
    groups++;
  }
  reserved += Math.max(0, groups - 1) * gap;
  const wrong = selected.find((block) => block.id === "wrongTable");
  const rows = wrong
    ? measureStyleBlock(id, report, options, "wrongTable").rowsMm
    : undefined;
  const measured = options.wrongTableLayout;
  const valid =
    measured?.length &&
    measured.every((n) => Number.isInteger(n) && n >= 0) &&
    measured.reduce((sum, n) => sum + n, 0) === rows?.length;
  const layout = rows?.length
    ? valid
      ? measured
      : paginateWrongTableRows(
          rows,
          249 - reserved,
          249 - measureStyleBlock(id, report, options, "wrongTable").heightMm,
        )
    : [0];
  let offset = layout[0];
  return [
    selected.map((block) =>
      block.id === "wrongTable" && rows?.length
        ? { ...block, from: 0, to: layout[0] }
        : block,
    ),
    ...layout.slice(1).map((count) => {
      const block = {
        ...wrong!,
        from: offset,
        to: offset + count,
        continued: true,
      };
      offset += count;
      return [block];
    }),
  ];
}

/** 시안·학생 미리보기·반 인쇄·서버 HTML의 공통 정본. */
export function styleReportPages(
  id: ExamReportStyle,
  report: StudentExamReport,
  options: StyleReportOptions = {},
) {
  const pages = planStyleReport(id, report, options);
  const variables = {
    "--paper-ink15": PAPER_COLORS.ink15,
    "--paper-ink30": PAPER_COLORS.ink30,
    "--paper-ink70": PAPER_COLORS.ink70,
    "--sc-gap": id === "ledger" ? "0mm" : "2mm",
  } as CSSProperties;
  return pages.map((blocks, index) => {
    const content = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const next = blocks[i + 1];
      const key = `${block.instance}-${block.from}`;
      if (
        id !== "ledger" &&
        block.id === "score" &&
        next?.id === "correctCount"
      ) {
        content.push(
          <div className="sc-numberRow" key={key}>
            <Block report={report} options={options} block={block} />
            <Block report={report} options={options} block={next} />
          </div>,
        );
        i++;
      } else
        content.push(
          <Block key={key} report={report} options={options} block={block} />,
        );
    }
    return (
      <div
        key={`${id}-${index}`}
        data-exam-report-page={id}
        data-report-style={id}
        data-unified-paper="true"
        data-er-summary={index === 0 || undefined}
        data-er-table-continuation={index > 0 || undefined}
        style={variables}
      >
        <A4Page
          kind="questions"
          pageNumber={index + 1}
          className="sc-sheet"
          ariaLabel={`${EXAM_REPORT_STYLES.find((style) => style.id === id)!.name} · ${index + 1}쪽`}
        >
          <div className="sc-running">
            <span>
              {report.student.name} · {report.className}
            </span>
            <span>
              {report.publication.testDate} ·{" "}
              <span data-sc-page-count>
                {index + 1} / {pages.length}쪽
              </span>
            </span>
          </div>
          <div className="sc-body">{content}</div>
          <p className="sc-pageEnd">
            {report.publication.title.replaceAll("\n", " · ")}
          </p>
        </A4Page>
      </div>
    );
  });
}
