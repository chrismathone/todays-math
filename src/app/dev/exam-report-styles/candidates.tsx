import { Fragment, type CSSProperties } from "react";
import {
  styleReportPages,
  measureStyleBlock,
  type ExamReportStyle,
  type StyleReportOptions,
} from "@/components/exam-report/StyledExamReportPaper";
import type { StudentExamReport } from "@/contracts/examReport.contract";
import { A4Page } from "@/components/print/A4Page";
import { PAPER_COLORS } from "@/components/print/tokens";
import { ExamReportTrend } from "@/components/exam-report/ExamReportTrend";
import {
  planReportBlocks,
  reviewUnits,
  type BlockId,
  type BlockMeasure,
  type PlannedBlock,
} from "@/lib/examReport/blocks";
import { originalScoreLabel, scoreTo100 } from "@/lib/examReport/score100";
import { recentExamHistory } from "@/lib/examReport/trend";
import { wrongTableColumns } from "@/lib/examReport/wrongTable";

export const STYLE_CANDIDATES = [
  {
    id: "H1",
    name: "시험지 얼굴",
    description:
      "얇은 머리선과 명조 이름, 요약 숫자와 표를 읽는 기존 지면입니다.",
    weakness: "항목이 늘면 표와 문장이 세로로 길어집니다.",
  },
  {
    id: "letter",
    name: "편지형",
    description:
      "원장님 문장을 편지 본문처럼 읽고 점수와 기록을 짧은 덧붙임으로 봅니다.",
    weakness: "긴 표가 붙으면 편지의 여백이 줄어듭니다.",
  },
  {
    id: "certificate",
    name: "증서형",
    description:
      "액자 안에 이름을 크게 두고 명조와 가운데 정렬로 기록을 모읍니다.",
    weakness: "테두리와 이름에 자리를 써서 추가 쪽이 빨리 생깁니다.",
  },
  {
    id: "newspaper",
    name: "신문형",
    description:
      "점수를 큰 제목으로, 문장과 기록을 여러 단의 기사처럼 읽습니다.",
    weakness: "짧은 내용에서는 단 사이에 여백이 많이 남습니다.",
  },
  {
    id: "grid",
    name: "정오 격자형",
    description:
      "번호별 ○·✕를 그림처럼 놓고 틀린 칸 아래에 단원·유형을 적습니다.",
    weakness: "틀린 칸의 설명이 길면 격자의 높이가 커집니다.",
  },
  {
    id: "numbers",
    name: "큰 숫자형",
    description:
      "점수와 맞힌 수가 지면을 차지하고 설명은 작은 기록 줄로 붙습니다.",
    weakness: "표와 문장이 길면 큰 숫자의 비중이 줄어듭니다.",
  },
  {
    id: "ledger",
    name: "장부형",
    description: "가는 선과 좁은 행에 제목·값·근거를 맞춰 적는 기록지입니다.",
    weakness: "정보가 적어도 표의 칸과 선이 먼저 보입니다.",
  },
] as const;
export type StyleCandidateId = (typeof STYLE_CANDIDATES)[number]["id"];
export type StyleCandidateOptions = StyleReportOptions;
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

/** CSS의 읽기 크기와 같은 단위. DOM 실측이 아닌 보수적인 조판 추정치다. */
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
function metrics(id: StyleCandidateId) {
  return {
    width: id === "certificate" ? 166 : 180,
    capacity: id === "certificate" ? 238 : 249,
    gap: id === "ledger" ? 0 : id === "letter" ? 3 : 2,
  };
}
function markRows(questions: readonly Question[], columns: number) {
  return Array.from({ length: Math.ceil(questions.length / columns) }, (_, i) =>
    questions.slice(i * columns, (i + 1) * columns),
  );
}
const gridCellHeight = (q: Question, width: number) =>
  11 +
  (q.isCorrect === false
    ? (textLines(q.unitName, width, 9) +
        textLines(q.typeLabel ?? "—", width, 9)) *
      4.8
    : 0);

export function measureCandidateBlock(
  id: StyleCandidateId,
  report: StudentExamReport,
  options: StyleCandidateOptions,
  block: BlockId,
): BlockMeasure {
  if (["H1", "letter", "grid", "ledger"].includes(id))
    return measureStyleBlock(id as ExamReportStyle, report, options, block);
  const { width } = metrics(id);
  const ledger = id === "ledger";
  const head = ledger ? 7 : 8;
  switch (block) {
    case "academyHeader":
      return {
        heightMm:
          (id === "certificate"
            ? 48
            : id === "letter"
              ? 44
              : id === "newspaper"
                ? 36
                : 30) +
          Math.max(
            0,
            textLines(
              report.student.name,
              width,
              id === "certificate" ? 30 : 23,
            ) - 1,
          ) *
            12 +
          Math.max(0, textLines(report.publication.title, width / 2, 9) - 2) *
            5 +
          Math.max(0, textLines(options.header?.name ?? "", width, 11) - 1) *
            6 +
          (options.header?.line
            ? textLines(options.header.line, width, 9) * 4.8
            : 0),
      };
    case "teacherNote": {
      const columns = id === "newspaper" ? 2 : 1;
      return {
        heightMm:
          head +
          Math.ceil(
            textLines(
              report.teacherNote,
              (width - (columns - 1) * 8) / columns - (ledger ? 34 : 0),
              id === "letter" ? 11 : 10,
            ) / columns,
          ) *
            (id === "letter" ? 7.4 : 6) +
          (id === "letter" ? 6 : 2),
      };
    }
    case "score":
      return {
        heightMm:
          id === "numbers"
            ? 58
            : id === "newspaper"
              ? 43
              : id === "certificate"
                ? 30
                : ledger
                  ? 17
                  : 25,
      };
    case "correctCount":
      return { heightMm: id === "numbers" ? 38 : ledger ? 10 : 15 };
    case "markGrid":
      return {
        heightMm:
          head +
          6 +
          markRows(report.questions, 5).reduce(
            (sum, row) =>
              sum +
              Math.max(
                ...row.map((q) =>
                  gridCellHeight(q, (width - (ledger ? 38 : 0) - 8) / 5 - 3),
                ),
              ) +
              2,
            0,
          ),
      };
    case "wrongTable": {
      if (!report.wrongQuestions.length || report.status !== "graded")
        return { heightMm: head + 8 };
      const columns =
        id === "grid"
          ? 5
          : id === "newspaper"
            ? 2
            : wrongTableColumns(report.wrongQuestions.length);
      const rows = markRows(report.wrongQuestions, columns);
      const tile = id === "grid";
      const tableWidth = width - (ledger ? 38 : 0);
      const cellWidth =
        columns === 2 ? (tableWidth - 24) / 4 - 4 : (tableWidth - 16) / 2 - 4;
      return {
        heightMm: head + (tile ? 1 : columns === 2 ? 12 : 7),
        rowsMm: rows.map((row) =>
          tile
            ? Math.max(
                ...row.map((q) => gridCellHeight(q, (width - 8) / 5 - 3)),
              ) + 3
            : 2.8 +
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
            (sum, retry) =>
              sum +
              textLines(
                `${retry.testDate} · ${retry.questionCount}문항 중 ${retry.correctCount ?? "—"}문항 정답`,
                width - (ledger ? 34 : 0),
                9,
              ) *
                5.2,
            0,
          ) +
          2,
      };
    case "classAverage":
      return { heightMm: ledger ? 13 : 18 };
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
          {q.isCorrect === false && (
            <p>
              {q.unitName}
              <br />
              {q.typeLabel ?? "—"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function WrongTable({
  report,
  from,
  to,
  id,
}: {
  report: StudentExamReport;
  from: number;
  to: number;
  id: StyleCandidateId;
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
  const columns =
    id === "grid"
      ? 5
      : id === "newspaper"
        ? 2
        : wrongTableColumns(report.wrongQuestions.length);
  const rows = markRows(report.wrongQuestions, columns).slice(from, to);
  if (id === "grid") return <MarkGrid questions={rows.flat()} />;
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
          <tr key={row[0].problemId}>
            {row.map((q) => (
              <Fragment key={q.problemId}>
                <td data-wrong-table-no={q.no}>
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
  id,
  report,
  options,
  block,
}: {
  id: StyleCandidateId;
  report: StudentExamReport;
  options: StyleCandidateOptions;
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
          <WrongTable id={id} report={report} from={block.from} to={block.to} />
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
      style={{ minHeight: `${block.heightMm}mm` }}
    >
      {content}
    </section>
  );
}

/** 개발 화면과 서버 HTML이 공유한다. 상태·effect·DOM 측정·브라우저 분기가 없다. */
export function styleCandidatePages(
  id: StyleCandidateId,
  report: StudentExamReport,
  options: StyleCandidateOptions = {},
) {
  if (["H1", "letter", "grid", "ledger"].includes(id))
    return styleReportPages(id as ExamReportStyle, report, options);
  const profile = metrics(id);
  const pages = planReportBlocks(
    report,
    options,
    (block) => measureCandidateBlock(id, report, options, block),
    { capacityMm: profile.capacity, gapMm: profile.gap },
  );
  // 빈 블록 목록도 학생 식별과 쪽 경계를 유지한다.
  const sheets = pages.length ? pages : [{ blocks: [], usedMm: 0 }];
  const variables = {
    "--paper-ink15": PAPER_COLORS.ink15,
    "--paper-ink30": PAPER_COLORS.ink30,
    "--paper-ink70": PAPER_COLORS.ink70,
    "--sc-gap": `${profile.gap}mm`,
  } as CSSProperties;
  return sheets.map((page, index) => (
    <div
      key={`${id}-${index}`}
      data-exam-report-page={id}
      data-report-style={id}
      data-unified-paper="true"
      style={variables}
    >
      <A4Page
        kind="questions"
        pageNumber={index + 1}
        className="sc-sheet"
        ariaLabel={`${STYLE_CANDIDATES.find((s) => s.id === id)!.name} · ${index + 1}쪽`}
      >
        <div className="sc-running">
          <span>
            {report.student.name} · {report.className}
          </span>
          <span>
            {report.publication.testDate} · {index + 1} / {sheets.length}쪽
          </span>
        </div>
        <div className="sc-body">
          {page.blocks.map((block) => (
            <Block
              key={`${block.instance}-${block.from}`}
              id={id}
              report={report}
              options={options}
              block={block}
            />
          ))}
        </div>
        <p className="sc-pageEnd">
          {report.publication.title.replaceAll("\n", " · ")}
        </p>
      </A4Page>
    </div>
  ));
}
