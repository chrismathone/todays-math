import { type CSSProperties, type ReactNode } from "react";
import type {
  ClassExamReport,
  StudentExamReport,
} from "@/contracts/examReport.contract";
import { A4Page } from "@/components/print/A4Page";
import { PAPER_COLORS } from "@/components/print/tokens";
import { originalScoreLabel, scoreTo100 } from "@/lib/examReport/score100";
import {
  styleReportPages,
  type ExamReportStyle,
} from "./StyledExamReportPaper";
import type { WrongTableLayout } from "@/lib/examReport/wrongTable";

export interface ExamReportOutputOptions {
  style?: ExamReportStyle;
  /** 저장된 M1도 S1 요약으로 출력한다. 기존 호출의 읽기 호환용이다. */
  mode?: "S1" | "M1";
  wrong?: boolean;
  retry?: boolean;
  note?: boolean;
  /** 선택 이력이 두 회 이상 있을 때만. 기본 켬. */
  trend?: boolean;
  /** 글꼴 적재 후 실측한 표의 행 수. */
  wrongTableLayout?: WrongTableLayout;
  /** 켜기로 선택한 경우에만, 반 집계에서 받은 값을 함께 넘긴다. */
  average?: Pick<
    ClassExamReport["rollup"],
    "averageScore" | "gradedCount"
  > | null;
}

const dateParts = (value: string) => value.split("-").map(Number);
const day = (value: string) => {
  const [y, m, d] = dateParts(value);
  return `${y}년 ${m}월 ${d}일`;
};
const scoreUnit = (score: StudentExamReport["score"]) =>
  score.unit === "points" ? "점" : "문항";

const statusLabels = {
  absent: "결시",
  ungraded: "미채점",
  incomplete: "채점 중",
  graded: "채점 완료",
} as const;

type ReportIdentity = Pick<StudentExamReport, "publication" | "className">;

function Head({
  report,
  name,
  title,
}: {
  report: ReportIdentity;
  name: string;
  title: string;
}) {
  return (
    <header className="er-paperHead">
      <p className="er-brand">
        오늘의수학 <span>월말평가 성적표</span>
      </p>
      <div className="er-titleRow">
        <div>
          <h2>{name}</h2>
          <p>
            {day(report.publication.testDate)} ·{" "}
            {title === "반 성적표" ? (
              title
            ) : (
              <>
                {report.className} · <span data-er-head-kind>{title}</span>
              </>
            )}
          </p>
        </div>
        <p className="er-examName">{report.publication.title}</p>
      </div>
    </header>
  );
}

const inkVariables = {
  "--paper-ink15": PAPER_COLORS.ink15,
  "--paper-ink30": PAPER_COLORS.ink30,
  "--paper-ink70": PAPER_COLORS.ink70,
} as CSSProperties;

function Page({
  children,
  index,
  total,
  landscape = false,
  summary = false,
  continuation = false,
}: {
  children: ReactNode;
  index: number;
  total: number;
  landscape?: boolean;
  summary?: boolean;
  continuation?: boolean;
}) {
  return (
    <div
      data-exam-report-page="H1"
      data-unified-paper="true"
      data-landscape={landscape}
      data-er-summary={summary || undefined}
      data-er-table-continuation={continuation || undefined}
      style={inkVariables}
    >
      <A4Page
        kind="questions"
        pageNumber={index + 1}
        className="er-sheet"
        ariaLabel={`${landscape ? "반 성적표" : "학생 성적표"} ${index + 1}쪽`}
      >
        {children}
        <footer className="er-footer">
          <span>오늘의수학</span>
          <span>
            {index + 1} / {total}쪽
          </span>
        </footer>
      </A4Page>
    </div>
  );
}

/** 개발 시안의 지면 띠와 서버 문서가 같은 쪽을 사용한다. */
export function studentExamReportPages(
  report: StudentExamReport,
  options: ExamReportOutputOptions = {},
) {
  return styleReportPages(options.style ?? "H1", report, {
    header: { name: "오늘의수학", line: "월말평가 성적표" },
    footer: "오늘의수학",
    wrong: options.wrong,
    retry: options.retry,
    note: options.note,
    trend: options.trend,
    average: options.average,
    wrongTableLayout: options.wrongTableLayout,
  });
}

export function StudentExamReportPaper({
  report,
  options,
}: {
  report: StudentExamReport;
  options?: ExamReportOutputOptions;
}) {
  return (
    <div
      data-mathgen-document="true"
      data-exam-report-document={options?.style ?? "H1"}
    >
      {studentExamReportPages(report, options)}
    </div>
  );
}

function ClassSheet({ report }: { report: ClassExamReport }) {
  const scored = report.students.find(
    (student) => student.score.maximum !== null,
  )?.score;
  return (
    <>
      <Head report={report} name={report.className} title="반 성적표" />
      <p className="er-classMeta">
        {report.questions.length}문항
        {scored ? ` · ${scored.maximum}${scoreUnit(scored)} 만점` : ""} · 응시{" "}
        {report.rollup.gradedCount}명 · 결시 {report.rollup.absentCount}명 ·
        미채점{" "}
        {
          report.students.filter((student) => student.status === "ungraded")
            .length
        }
        명
      </p>
      <table className="er-matrix">
        <caption>학생별 정오와 문항별 정답 수</caption>
        <thead>
          <tr>
            <th scope="col">학생</th>
            {report.questions.map((q) => (
              <th key={q.problemId} scope="col">
                {q.no}
              </th>
            ))}
            <th scope="col">
              점수
              <br />
              100점 만점
            </th>
          </tr>
        </thead>
        <tbody>
          {report.students.map((student) => (
            <tr key={student.student.id}>
              <th scope="row">{student.student.name}</th>
              {report.questions.map((q, i) => (
                <td key={q.problemId} data-wrong={student.marks[i] === false}>
                  {student.marks[i] === null || student.marks[i] === undefined
                    ? "—"
                    : student.marks[i]
                      ? "○"
                      : "×"}
                </td>
              ))}
              <td>
                {student.status === "graded"
                  ? `${scoreTo100(student.score.value, student.score.maximum) ?? "—"}점`
                  : statusLabels[student.status]}
                {student.status === "graded" &&
                  originalScoreLabel(student.score) && (
                    <span className="er-originalScore">
                      {originalScoreLabel(student.score)}
                    </span>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">정답 수</th>
            {report.questions.map((q) => (
              <td key={q.problemId}>{q.correctCount}</td>
            ))}
            <td>—</td>
          </tr>
        </tfoot>
      </table>
      <p className="er-method">
        ○ 정답 · × 오답 · — 결시 또는 미채점. 정답 수의 기준은 응시{" "}
        {report.rollup.gradedCount}명입니다. 학생 순서는 명단 순서입니다.
      </p>
    </>
  );
}

export function classExamReportPages(report: ClassExamReport) {
  return [
    <Page key="class" index={0} total={1} landscape>
      <ClassSheet report={report} />
    </Page>,
  ];
}

export function ClassExamReportPaper({ report }: { report: ClassExamReport }) {
  return (
    <div data-exam-report-document="H1">{classExamReportPages(report)}</div>
  );
}
