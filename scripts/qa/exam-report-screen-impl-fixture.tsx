import { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ExamReportWorkspace } from "@/components/exam-report/ExamReportWorkspace";
import type { ExamReportClient } from "@/components/exam-report/client";
import { studentExamReportPages } from "@/components/exam-report/ExamReportPaper";
import { EXAM_REPORT_PAPER_CSS } from "@/components/exam-report/paperStyles";
import { EXAM_REPORT_NOTE_LIMIT } from "@/lib/examReport/settings";
import {
  paginateWrongTableRows,
  type WrongTableLayout,
} from "@/lib/examReport/wrongTable";
import { examReportTableDom } from "@/lib/examReport/wrongTableDom";
import {
  screenFixture,
  classFixture,
  statusOf,
} from "@/app/dev/exam-report-screen-hifi/fixtures";
import type {
  ExamReportList,
  ExamReportStudent,
} from "@/contracts/examReportWorkspace.contract";
import type { StudentExamReport } from "@/contracts/examReport.contract";
import w from "@/components/unified/Workroom.module.css";

const fixture = screenFixture("normal").students;
let options: ExamReportList["options"] = {
  format: "S1",
  wrongQuestions: true,
  retries: true,
  teacherNote: true,
  classAverage: false,
};
const rows = fixture.map((student): ExamReportStudent => ({
  report: { ...student.report, teacherNote: student.savedNote },
  summary: {
    student: student.report.student,
    gradingStatus: student.report.status,
    score: student.report.score,
    wrongCount: student.report.wrongQuestions.length,
    teacherNote: student.savedNote,
    revision: 1,
    status: statusOf(student),
    confirmedAt: student.confirmedNote !== null ? "2026-10-24T05:00:00Z" : null,
  },
  options,
  classComparison: null,
}));
const list = (): ExamReportList => ({
  classReport: classFixture(fixture),
  options,
  optionsDigest: "a".repeat(64),
  students: rows.map((row) => row.summary),
});
const find = (id: string) => rows.find((row) => row.report.student.id === id)!;
const source: ExamReportClient = {
  async list() {
    return structuredClone(list());
  },
  async student(_id, id) {
    return structuredClone(find(id));
  },
  async note(_id, id, _revision, note) {
    const row = find(id);
    row.report.teacherNote = note;
    row.summary.teacherNote = note;
    row.summary.revision++;
    row.summary.status = row.summary.confirmedAt
      ? "stale"
      : note.trim()
        ? "draft"
        : "none";
    return structuredClone(row);
  },
  async confirm(id, sid, revision, note) {
    await source.note(id, sid, revision, note);
    const row = find(sid);
    row.summary.status = "confirmed";
    row.summary.confirmedAt = new Date().toISOString();
    return structuredClone(row);
  },
  async settings(_id, _digest, next) {
    options = next;
    for (const row of rows) {
      row.options = next;
      if (row.summary.confirmedAt) row.summary.status = "stale";
    }
    return structuredClone(list());
  },
  async print() {
    throw new Error("로컬 화면 검증에서는 인쇄 API를 호출하지 않습니다.");
  },
  async pdf() {
    throw new Error("로컬 화면 검증에서는 저장소를 읽지 않습니다.");
  },
};
const frame = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
const round = (value: number) => Math.round(value * 10) / 10;

function Fixture() {
  const [width, setWidth] = useState(1040);
  const [probe, setProbe] = useState<{
    report: StudentExamReport;
    mode: "S1" | "M1";
    layout?: WrongTableLayout;
  } | null>(null);
  const [result, setResult] = useState("실측 대기");
  async function fonts() {
    const faces = await Promise.all([
      document.fonts.load('400 16px "Noto Serif KR"', "수학"),
      document.fonts.load("400 16px Pretendard", "수학"),
    ]);
    await document.fonts.ready;
    if (faces.some((face) => !face.length))
      throw new Error("자체 글꼴이 준비되지 않았습니다.");
  }
  async function screenAt(next: number) {
    flushSync(() => setWidth(next));
    await fonts();
    await frame();
    const root = document.getElementById("screen")!;
    const editor = root
      .querySelector('[aria-label="학생별 문장 편집"]')!
      .getBoundingClientRect();
    const preview = root
      .querySelector('[aria-label="선택한 학생의 성적표"]')!
      .getBoundingClientRect();
    const confirm = [...root.querySelectorAll("button")]
      .find((button) =>
        ["이 학생 확정", "다시 확정", "확정됨"].includes(
          button.textContent ?? "",
        ),
      )!
      .getBoundingClientRect();
    return {
      width: next,
      scrollWidth: root.scrollWidth,
      sideBySide: editor.left >= preview.right - 1,
      editorWidth: round(editor.width),
      previewWidth: round(preview.width),
      confirmBottomFromScreenTop: round(
        confirm.bottom - root.getBoundingClientRect().top,
      ),
    };
  }
  async function measurePaper() {
    await fonts();
    const measurements = [];
    const base = structuredClone(fixture[0].report);
    const text = (pattern: string, n: number) =>
      (pattern === "wide"
        ? "W"
        : pattern === "newlines"
          ? "가\n"
          : "문장의 조건을 먼저 식으로 옮겨 보세요. "
      )
        .repeat(n + 1)
        .slice(0, n);
    for (const mode of ["S1", "M1"] as const)
      for (const wrong of [0, 4, 8, 12, 16, 20, 40])
        for (const names of ["normal", "long"])
          for (const pattern of ["hangul", "wide", "newlines"]) {
            const report = structuredClone(base);
            const count = Math.max(base.questions.length, wrong);
            report.questions = Array.from({ length: count }, (_, i) => ({
              ...base.questions[i % base.questions.length],
              problemId: `00000000-0000-4000-8000-${String(300 + i).padStart(12, "0")}`,
              no: i + 1,
              isCorrect: i >= wrong,
            }));
            report.wrongQuestions = report.questions.filter(
              (q) => !q.isCorrect,
            );
            report.correctCount = report.questions.length - wrong;
            report.questionCount = report.questions.length;
            report.score.value =
              report.score.unit === "questions"
                ? report.correctCount
                : ((report.score.maximum ?? 100) * report.correctCount) /
                  report.questions.length;
            if (names === "long") {
              report.student.name = "김하늘가람이슬별빛";
              report.publication.title =
                "10월 월말평가 · 일차방정식과 정수와 유리수";
              for (const question of report.questions) {
                question.unitName =
                  "문장의 조건을 식으로 나타내는 일차방정식의 활용";
                question.typeLabel =
                  "여러 조건을 비교하여 알맞은 일차방정식 세우기";
              }
            }
            const measure = async (length: number) => {
              flushSync(() =>
                setProbe({
                  mode,
                  report: { ...report, teacherNote: text(pattern, length) },
                }),
              );
              await frame();
              const ruler = document.getElementById("ruler")!;
              const metrics = examReportTableDom(ruler);
              if (metrics) {
                const layout = paginateWrongTableRows(
                  metrics.heights,
                  metrics.first,
                  metrics.continuation,
                );
                flushSync(() =>
                  setProbe({
                    mode,
                    report: { ...report, teacherNote: text(pattern, length) },
                    layout,
                  }),
                );
                await frame();
              }
              const sheets = [
                ...ruler.querySelectorAll<HTMLElement>(".er-sheet"),
              ];
              const measurements = sheets.map((sheet) => {
                const children = [...sheet.children] as HTMLElement[];
                const overlaps = children.some(
                  (child, i) =>
                    child.scrollHeight > child.clientHeight + 2 ||
                    (children[i + 1] &&
                      child.getBoundingClientRect().bottom >
                        children[i + 1].getBoundingClientRect().top + 1),
                );
                return {
                  fits:
                    sheet.scrollWidth <= sheet.clientWidth + 1 &&
                    sheet.scrollHeight <= sheet.clientHeight + 1 &&
                    !overlaps,
                  width: sheet.clientWidth,
                  height: sheet.clientHeight,
                  scrollHeight: sheet.scrollHeight,
                  overlaps,
                };
              });
              return {
                fits: measurements.every((sheet) => sheet.fits),
                pageCount: sheets.length,
                tablePageCount: ruler.querySelectorAll(".er-wrongTable").length,
                columns:
                  ruler
                    .querySelector(".er-wrongTable")
                    ?.getAttribute("data-er-wrong-columns") ?? null,
                rowsPerTable: [
                  ...ruler.querySelectorAll(".er-wrongTable tbody"),
                ].map((body) => body.children.length),
                sheets: measurements,
              };
            };
            const baseline = await measure(0),
              atStorageLimit = await measure(EXAM_REPORT_NOTE_LIMIT);
            let maximum = 0;
            if (baseline.fits) {
              let low = 0,
                high = EXAM_REPORT_NOTE_LIMIT + 1;
              while (high - low > 1) {
                const middle = Math.floor((low + high) / 2);
                if ((await measure(middle)).fits) low = middle;
                else high = middle;
              }
              maximum = low;
            }
            measurements.push({
              mode,
              wrong,
              names,
              pattern,
              maximum: baseline.fits ? maximum : null,
              baseline,
              atStorageLimit,
            });
          }
    const value = {
      storageLimit: EXAM_REPORT_NOTE_LIMIT,
      fonts: {
        serif: document.fonts.check('400 16px "Noto Serif KR"'),
        sans: document.fonts.check("400 16px Pretendard"),
      },
      allBaselinesFit: measurements.every((row) => row.baseline.fits),
      measurements,
    };
    setResult(JSON.stringify(value, null, 2));
    return value;
  }
  Object.assign(window, { examReportQA: { screenAt, measurePaper } });
  return (
    <>
      <style>{EXAM_REPORT_PAPER_CSS}</style>
      <div style={{ padding: 12 }}>
        <button type="button" onClick={() => void measurePaper()}>
          H1 S1·M1 문장 자리와 이어지는 쪽 실측
        </button>
        <pre style={{ whiteSpace: "pre-wrap" }}>{result}</pre>
      </div>
      <div
        id="screen"
        className={w.workspace}
        data-product="math"
        style={{ width, display: "block", minHeight: 0 }}
      >
        <ExamReportWorkspace testId={baseTestId} source={source} />
      </div>
      <div id="ruler">
        {probe &&
          studentExamReportPages(probe.report, {
            mode: probe.mode,
            wrong: true,
            retry: true,
            note: true,
            wrongTableLayout: probe.layout,
          })}
      </div>
    </>
  );
}
const baseTestId = fixture[0].report.testId;
createRoot(document.getElementById("root")!).render(<Fixture />);
