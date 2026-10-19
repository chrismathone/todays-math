import { Fragment, type CSSProperties, type ReactNode } from "react";
import type {
  ClassExamReport,
  StudentExamReport,
} from "@/contracts/examReport.contract";
import { MathText, SolutionText } from "@/components/math/MathText";
import { A4Page } from "@/components/print/A4Page";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { PAPER_COLORS } from "@/components/print/tokens";
import {
  paginateWrongQuestions,
  type ExamReportQuestion,
} from "@/lib/examReport/paginate";
import {
  estimateWrongTableLayout,
  wrongTableColumns,
  type WrongTableLayout,
} from "@/lib/examReport/wrongTable";

export interface ExamReportOutputOptions {
  mode?: "S1" | "M1";
  wrong?: boolean;
  retry?: boolean;
  note?: boolean;
  /** 글꼴 적재 후 실측한 표의 행 수. 문항/풀이 쪽과 독립적으로 배치한다. */
  wrongTableLayout?: WrongTableLayout;
  /** 켜기로 선택한 경우에만, 반 집계에서 받은 값을 함께 넘긴다. */
  average?: Pick<
    ClassExamReport["rollup"],
    "averageScore" | "gradedCount"
  > | null;
}

const statusLabels = {
  absent: "결시",
  ungraded: "미채점",
  incomplete: "채점 중",
  graded: "채점 완료",
} as const;
const dateParts = (value: string) => value.split("-").map(Number);
const day = (value: string) => {
  const [y, m, d] = dateParts(value);
  return `${y}년 ${m}월 ${d}일`;
};
const shortDay = (value: string) => {
  const [, m, d] = dateParts(value);
  return `${m}월 ${d}일`;
};
const scoreUnit = (score: StudentExamReport["score"]) =>
  score.unit === "points" ? "점" : "문항";

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

function Summary({
  report,
  options,
  questions,
}: {
  report: StudentExamReport;
  options: ExamReportOutputOptions;
  questions: readonly ExamReportQuestion[];
}) {
  const { wrong = true, retry = true, note = true, average } = options;
  const graded = report.status === "graded";
  const retries = retry ? report.retries : [];
  return (
    <>
      <Head report={report} name={report.student.name} title="요약" />
      <div className="er-numbers">
        <div>
          <p>이번 시험</p>
          <strong>
            {graded ? report.score.value : statusLabels[report.status]}
          </strong>
          <span>
            {graded
              ? `/ ${report.score.maximum ?? "—"}${scoreUnit(report.score)}`
              : report.publication.testDate.replaceAll("-", ". ") + "."}
          </span>
        </div>
        <div>
          <p>맞힌 문항</p>
          <strong>{graded ? report.correctCount : "—"}</strong>
          <span>
            {graded ? `/ ${report.questionCount}문항` : "점수에 포함하지 않음"}
          </span>
        </div>
        {average && average.averageScore !== null && (
          <div>
            <p>반 평균</p>
            <strong>{average.averageScore.toFixed(1)}</strong>
            <span>응시 {average.gradedCount}명 기준</span>
          </div>
        )}
      </div>
      {wrong && (
        <section className="er-area er-wrongArea">
          <h3>틀린 문항</h3>
          {!graded ? (
            <p>
              {report.status === "absent"
                ? "결시하여 문항별 기록이 없습니다."
                : "채점 후 문항별 기록을 확인합니다."}
            </p>
          ) : report.wrongQuestions.length === 0 ? (
            <p>틀린 문항이 없습니다.</p>
          ) : (
            <WrongTable
              questions={questions}
              columns={wrongTableColumns(report.wrongQuestions.length)}
            />
          )}
        </section>
      )}
      {retries.length > 0 && (
        <section className="er-area">
          <h3>재시험 결과</h3>
          {retries.map((item) => (
            <p key={item.resultId ?? item.testId}>
              {shortDay(item.testDate)} ·{" "}
              {item.status === "graded"
                ? `오답 복습 ${item.questionCount}문항 중 ${item.correctCount}문항 정답`
                : statusLabels[item.status]}
            </p>
          ))}
        </section>
      )}
      {note && report.teacherNote.trim() && (
        <section className="er-area er-note">
          <h3>원장님 문장</h3>
          <p>{report.teacherNote}</p>
        </section>
      )}
      <p className="er-coverage">
        담은 기록:{" "}
        {graded
          ? "월말평가 1회"
          : report.status === "absent"
            ? "시험일 · 결시 1회"
            : `시험일(${statusLabels[report.status]})`}
        {retries.length ? ` · 재시험 ${retries.length}회` : ""}
        {note && report.teacherNote.trim() ? " · 원장님 문장" : ""}.
      </p>
    </>
  );
}

function WrongTable({
  questions,
  columns,
}: {
  questions: readonly ExamReportQuestion[];
  columns: 1 | 2;
}) {
  const rows = [];
  for (let i = 0; i < questions.length; i += columns)
    rows.push(questions.slice(i, i + columns));
  return (
    <table className="er-wrongTable" data-er-wrong-columns={columns}>
      {columns === 2 && <caption>왼쪽 → 오른쪽, 위 → 아래 순서</caption>}
      <colgroup>
        {Array.from({ length: columns }, (_, i) => (
          <Fragment key={i}>
            <col style={{ width: columns === 2 ? "12mm" : "16mm" }} />
            <col style={{ width: columns === 2 ? "39mm" : "82mm" }} />
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
                <td data-er-wrong-no={q.no}>{q.no}번</td>
                <td>{q.unitName}</td>
                <td>{q.typeLabel ?? "—"}</td>
              </Fragment>
            ))}
            {row.length < columns && <td colSpan={3} aria-hidden="true" />}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WrongSheet({
  report,
  questions,
}: {
  report: StudentExamReport;
  questions: readonly ExamReportQuestion[];
}) {
  return (
    <>
      <Head report={report} name={report.student.name} title="틀린 문항 풀이" />
      <div className="er-problemList" data-question-count={questions.length}>
        {questions.map((q) => (
          <section
            key={q.problemId}
            className="er-problem"
            data-report-question={q.no}
          >
            <h3>
              {q.no}번{" "}
              <span>
                {q.unitName} · {q.typeLabel ?? "—"}
              </span>
            </h3>
            <div className="er-stem">
              <PaperProblemView {...q} framed={false} staticLayout />
            </div>
            <dl>
              <dt>정답</dt>
              <dd>
                <MathText text={q.answer} staticLayout />
              </dd>
              <dt>해설</dt>
              <dd>
                <SolutionText
                  text={q.solution}
                  fallback="해설이 등록되지 않았습니다."
                  staticLayout
                />
              </dd>
            </dl>
          </section>
        ))}
      </div>
    </>
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
  const columns = wrongTableColumns(report.wrongQuestions.length);
  const measured = options.wrongTableLayout;
  const rowCount = Math.ceil(report.wrongQuestions.length / columns);
  const measuredValid =
    measured?.length &&
    measured.every((count) => Number.isInteger(count) && count >= 0) &&
    measured.reduce((sum, count) => sum + count, 0) === rowCount;
  const layout =
    options.wrong !== false &&
    report.status === "graded" &&
    report.wrongQuestions.length
      ? measuredValid
        ? measured
        : estimateWrongTableLayout(report, options)
      : [0];
  let offset = 0;
  const tablePages = layout.map((count) => {
    const questions = report.wrongQuestions.slice(
      offset,
      offset + count * columns,
    );
    offset += count * columns;
    return questions;
  });
  const wrongPages =
    options.mode === "M1" &&
    options.wrong !== false &&
    report.status === "graded"
      ? paginateWrongQuestions(report.wrongQuestions)
      : [];
  const total = tablePages.length + wrongPages.length;
  return [
    <Page key="summary" index={0} total={total} summary>
      <Summary report={report} options={options} questions={tablePages[0]} />
    </Page>,
    ...tablePages.slice(1).map((questions, i) => (
      <Page key={`table-${i}`} index={i + 1} total={total} continuation>
        <Head
          report={report}
          name={report.student.name}
          title="틀린 문항 (이어서)"
        />
        <section className="er-area er-wrongArea">
          <h3>틀린 문항 (이어서)</h3>
          <WrongTable questions={questions} columns={columns} />
        </section>
      </Page>
    )),
    ...wrongPages.map((questions, i) => (
      <Page key={`wrong-${i}`} index={i + tablePages.length} total={total}>
        <WrongSheet report={report} questions={questions} />
      </Page>
    )),
  ];
}

export function StudentExamReportPaper({
  report,
  options,
}: {
  report: StudentExamReport;
  options?: ExamReportOutputOptions;
}) {
  return (
    <div data-mathgen-document="true" data-exam-report-document="H1">
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
            <th scope="col">점수</th>
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
                  ? student.score.value
                  : statusLabels[student.status]}
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
