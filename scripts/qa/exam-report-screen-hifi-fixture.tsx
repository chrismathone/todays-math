/** 서버 없는 실측 자. 제품·개발 라우트에는 넣지 않는다. */
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ExamReportScreenHifi } from "@/app/dev/exam-report-screen-hifi/ExamReportScreenHifi";
import {
  NOTE_LIMIT,
  screenFixture,
} from "@/app/dev/exam-report-screen-hifi/fixtures";
import { StudentExamReportPaper } from "@/components/exam-report/ExamReportPaper";
import type { StudentExamReport } from "@/contracts/examReport.contract";

const round = (value: number) => Math.round(value * 10) / 10;
function dimensions(sheet: HTMLElement) {
  const note = sheet.querySelector<HTMLElement>(".er-note p");
  const coverage = sheet.querySelector<HTMLElement>(".er-coverage")!;
  const elements = [...sheet.children] as HTMLElement[];
  const overlaps = elements.flatMap((element, i) => {
    const next = elements[i + 1];
    return next &&
      element.getBoundingClientRect().bottom >
        next.getBoundingClientRect().top + 1
      ? [element.className]
      : [];
  });
  return {
    width: sheet.clientWidth,
    height: sheet.clientHeight,
    scrollWidth: sheet.scrollWidth,
    scrollHeight: sheet.scrollHeight,
    noteLines: note
      ? round(
          note.getBoundingClientRect().height /
            parseFloat(getComputedStyle(note).lineHeight),
        )
      : 0,
    noteToCoverage: note
      ? round(
          coverage.getBoundingClientRect().top -
            note.getBoundingClientRect().bottom,
        )
      : null,
    overlaps,
    clippedChildren: elements
      .filter((element) => element.scrollHeight > element.clientHeight + 2)
      .map((element) => element.className),
  };
}

function Fixture() {
  const [width, setWidth] = useState(1280);
  const [probe, setProbe] = useState<StudentExamReport | null>(null);
  const [result, setResult] = useState("측정 전");
  const view = useRef<HTMLDivElement>(null);
  const ruler = useRef<HTMLDivElement>(null);
  async function measurePaper() {
    const base = screenFixture("normal").students[1].report;
    const measurements = [];
    for (const count of [4, 7, 8, 12, 20]) {
      for (const [kind, text] of [
        ["한글 180", "한".repeat(NOTE_LIMIT)],
        ["넓은 영문 180", "W".repeat(NOTE_LIMIT)],
        ["한글 240", "한".repeat(240)],
        ["줄바꿈 180", "가\n".repeat(NOTE_LIMIT / 2)],
      ]) {
        const questions = base.questions.map((question, i) => ({
          ...question,
          isCorrect: i >= count,
        }));
        flushSync(() =>
          setProbe({
            ...base,
            questions,
            wrongQuestions: questions.filter((question) => !question.isCorrect),
            teacherNote: text,
          }),
        );
        await document.fonts.ready;
        const sheet = ruler.current!.querySelector<HTMLElement>(".er-sheet")!;
        measurements.push({ wrong: count, kind, ...dimensions(sheet) });
      }
    }
    setResult(
      JSON.stringify(
        {
          browser: navigator.userAgent,
          limit: NOTE_LIMIT,
          fonts: {
            sans: document.fonts.check("14px Pretendard"),
            serif: document.fonts.check('10pt "Noto Serif KR"'),
          },
          measurements,
        },
        null,
        2,
      ),
    );
  }
  function measureScreen() {
    const root = view.current!.firstElementChild as HTMLElement;
    const fields = [
      ...root.querySelectorAll<HTMLElement>("button, input, select, textarea"),
    ].filter(
      (node) =>
        node.getBoundingClientRect().width &&
        !node.closest("[data-exam-report-page]"),
    );
    setResult(
      JSON.stringify(
        {
          width: root.clientWidth,
          scrollWidth: root.scrollWidth,
          overflow: root.scrollWidth - root.clientWidth,
          h1: root.querySelectorAll("h1").length,
          minControlHeight: round(
            Math.min(
              ...fields.map((node) => node.getBoundingClientRect().height),
            ),
          ),
          noteHeight: root.querySelector("textarea")?.getBoundingClientRect()
            .height,
          alerts: [...root.querySelectorAll('[role="alert"]')].map(
            (node) => node.textContent,
          ),
        },
        null,
        2,
      ),
    );
  }
  return (
    <>
      <div
        style={{
          padding: 12,
          background: "#fff",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <label>
          검증 가용 폭{" "}
          <select
            aria-label="검증 가용 폭"
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          >
            {[1920, 1280, 1050, 768, 760, 390, 320].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={measureScreen}>
          화면 수치 확인
        </button>
        <button type="button" onClick={() => void measurePaper()}>
          H1 문장 상한 실측
        </button>
      </div>
      <div ref={view} style={{ width }}>
        <ExamReportScreenHifi />
      </div>
      <pre
        role="region"
        aria-label="실측 결과"
        style={{ whiteSpace: "pre-wrap", padding: 16 }}
      >
        {result}
      </pre>
      <div ref={ruler} aria-label="H1 원본 크기 실측 지면">
        {probe && (
          <StudentExamReportPaper
            report={probe}
            options={{ mode: "S1", wrong: true, retry: true, note: true }}
          />
        )}
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
