"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  PaperStrip,
  type PaperStripPage,
} from "@/components/paper-strip/PaperStrip";
import { A4Page } from "@/components/print/A4Page";
import { PAPER_COLORS } from "@/components/print/tokens";
import {
  classExamReportPages,
  studentExamReportPages,
} from "@/components/exam-report/ExamReportPaper";
import { EXAM_REPORT_PAPER_CSS } from "@/components/exam-report/paperStyles";

import {
  fixture,
  reportFixture,
  isMarks,
  QUESTIONS,
  SCENARIOS,
  score,
  type Scenario,
} from "./fixtures";
import s from "./ExamReportHifi.module.css";

const VARIANTS = [
  {
    id: "H1",
    name: "시험지 얼굴",
    reason:
      "추천 · 얇은 머리선과 명조 제목, 숫자와 오답 표가 먼저 보입니다. 기존 시험지와 이어지고 흑백에서도 구분이 남습니다.",
  },
  {
    id: "H2",
    name: "또렷한 표",
    reason:
      "남색 머리글 · 테두리 있는 숫자판 · 격자 표 · 원장님 문장 왼쪽 선. 기록을 칸별로 읽습니다.",
  },
  {
    id: "H3",
    name: "문장 여백",
    reason:
      "가운데 머리글 · 점선으로 구분한 오답 표 · 원장님 문장에 넓은 여백.",
  },
  {
    id: "H4",
    name: "따뜻한 기록지",
    reason:
      "금갈색 머리선 · 작은 표제 · 오답 행에 옅은 바탕 · 원장님 문장은 가는 테두리 안에 둡니다.",
  },
] as const;
const MODES = {
  S1: "요약 한 장",
  M1: "요약 + 틀린 문항 풀이",
  C2: "반 정오 격자",
} as const;
type Mode = keyof typeof MODES;
type Options = {
  wrong: boolean;
  retry: boolean;
  note: boolean;
  average: boolean;
};
type Data = ReturnType<typeof fixture>;

export function ExamReportHifi() {
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>(
    VARIANTS[0],
  );
  const [mode, setMode] = useState<Mode>("S1");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [options, setOptions] = useState<Options>({
    wrong: true,
    retry: true,
    note: true,
    average: false,
  });
  const data = fixture(scenario);
  const reports = reportFixture(scenario);
  const nodes: ReactNode[] =
    variant.id === "H1"
      ? mode === "C2"
        ? classExamReportPages(reports.classroom)
        : studentExamReportPages(reports.student, {
            ...options,
            mode,
            average: options.average ? reports.classroom.rollup : null,
          })
      : mode === "C2"
        ? [<ClassSheet key="class" data={data} />]
        : [
            <Summary key="summary" data={data} options={options} />,
            ...(mode === "M1" && options.wrong
              ? Array.from(
                  { length: Math.ceil(data.wrong.length / 2) },
                  (_, i) => (
                    <WrongSheet key={`wrong-${i}`} data={data} start={i * 2} />
                  ),
                )
              : []),
          ];
  const pageNode = (node: ReactNode, i: number) =>
    variant.id === "H1" ? (
      <div
        key={i}
        className={s.h1Slot}
        data-landscape={mode === "C2"}
        data-look="H1"
      >
        {node}
      </div>
    ) : (
      <div
        key={i}
        className={s.pageSlot}
        data-landscape={mode === "C2"}
        data-look={variant.id}
        style={
          {
            "--paper-ink15": PAPER_COLORS.ink15,
            "--paper-ink30": PAPER_COLORS.ink30,
            "--paper-ink70": PAPER_COLORS.ink70,
            "--paper-ink08": PAPER_COLORS.ink08,
          } as CSSProperties
        }
      >
        <A4Page
          kind="questions"
          pageNumber={i + 1}
          className={s.sheet}
          ariaLabel={`${mode === "C2" ? "반 성적표" : "학생 성적표"} ${i + 1}쪽`}
        >
          {node}
          <footer className={s.footer}>
            <span>오늘의수학 · 예시 자료</span>
            <span>
              {i + 1} / {nodes.length}쪽
            </span>
          </footer>
        </A4Page>
      </div>
    );
  const pages: PaperStripPage[] = nodes.map((node, i) => ({
    key: `${variant.id}-${mode}-${scenario}-${i}`,
    node: pageNode(node, i),
    caption: `${i + 1}쪽 · ${i === 0 ? MODES[mode] : "틀린 문항 풀이"}`,
    enlargeLabel: `${i + 1}쪽 확대`,
  }));
  return (
    <main className={s.shell}>
      <div className={s.controls}>
        <header className={s.header}>
          <div>
            <h1>월말평가 성적표 · Hi-fi</h1>
            <p>
              S1 · M1 · C2의 세부 모양 4안입니다. 지어낸 자료이며 저장하지
              않습니다.
            </p>
          </div>
          <button type="button" onClick={() => window.print()}>
            시안 인쇄
          </button>
        </header>
        <nav className={s.choices} aria-label="Hi-fi 안">
          {VARIANTS.map((v) => (
            <button
              type="button"
              key={v.id}
              aria-pressed={variant.id === v.id}
              onClick={() => setVariant(v)}
            >
              {v.id} · {v.name}
              {v.id === "H1" ? " · 추천" : ""}
            </button>
          ))}
        </nav>
        <p className={s.reason}>{variant.reason}</p>
        <nav className={s.choices} aria-label="성적표 구성">
          {Object.entries(MODES).map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={mode === key}
              onClick={() => setMode(key as Mode)}
            >
              {key} · {label}
            </button>
          ))}
        </nav>
        <div className={s.settings}>
          <label>
            예시 상황
            <select
              aria-label="예시 상황"
              value={scenario}
              onChange={(event) => setScenario(event.target.value as Scenario)}
            >
              {Object.entries(SCENARIOS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <fieldset disabled={mode === "C2"}>
            <legend>학생 성적표에 담을 내용</legend>
            {(
              [
                ["wrong", "틀린 문항"],
                ["retry", "재시험 결과"],
                ["note", "원장님 문장"],
                ["average", "반 평균"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(event) =>
                    setOptions({ ...options, [key]: event.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
        <p className={s.reason}>
          학생 성적표에는 점수·오답·재시험·원장님 문장을 담습니다. 반 성적표의
          정답 수는 응시한 학생만 셉니다.{" "}
          {variant.id === "H1"
            ? "H1 선택 · 새 부품을 사용합니다. 실물 검수는 대기 중입니다."
            : "Hi-fi 선택 뒤 실제 화면과 PDF 지면을 연결합니다."}
        </p>
      </div>
      {variant.id === "H1" && <style>{EXAM_REPORT_PAPER_CSS}</style>}
      <div className={s.preview}>
        <PaperStrip
          key={`${variant.id}-${mode}-${scenario}`}
          pages={pages}
          label={`${variant.id} · ${mode} 지면`}
          hint={
            variant.id === "H1"
              ? "쪽을 누르면 크게 볼 수 있습니다. M1은 문항·그림 크기에 따라 쪽을 나눕니다."
              : "쪽을 누르면 크게 볼 수 있습니다. M1은 틀린 문항 두 개마다 한 쪽을 덧붙입니다."
          }
        />
      </div>
      <div className={s.printOnly}>{nodes.map(pageNode)}</div>
      <style>{`@media print { @page { size: A4 ${mode === "C2" ? "landscape" : "portrait"}; margin: 0; } }`}</style>
    </main>
  );
}

function Head({ data, title }: { data: Data; title: string }) {
  return (
    <header className={s.paperHead}>
      <p className={s.brand}>
        오늘의수학 <span>월말평가 성적표</span>
      </p>
      <div className={s.titleRow}>
        <div>
          <h2>{title === "반 성적표" ? "중1 가람반" : data.me.name}</h2>
          <p>
            2026년 10월 24일 ·{" "}
            {title === "반 성적표" ? "반 성적표" : `중1 가람반 · ${title}`}
          </p>
        </div>
        <p className={s.examName}>
          10월 월말평가
          <br />
          일차방정식
        </p>
      </div>
    </header>
  );
}

function Summary({ data, options }: { data: Data; options: Options }) {
  const { me, wrong } = data;
  const marks = isMarks(me.marks) ? me.marks : null;
  return (
    <>
      <Head data={data} title="요약" />
      <div className={s.numbers}>
        <div>
          <p>이번 시험</p>
          <strong>
            {marks ? score(marks) : me.marks === "absent" ? "결시" : "미채점"}
          </strong>
          <span>{marks ? "/ 100점" : "2026. 10. 24."}</span>
        </div>
        <div>
          <p>맞힌 문항</p>
          <strong>{marks ? marks.filter(Boolean).length : "—"}</strong>
          <span>
            {marks ? `/ ${QUESTIONS.length}문항` : "점수에 포함하지 않음"}
          </span>
        </div>
        {options.average && data.average !== null && (
          <div>
            <p>반 평균</p>
            <strong>{data.average}</strong>
            <span>응시 {data.taken.length}명 기준</span>
          </div>
        )}
      </div>
      {options.wrong && (
        <section className={s.area}>
          <h3>틀린 문항</h3>
          {!marks ? (
            <p>
              {me.marks === "absent"
                ? "결시하여 문항별 기록이 없습니다."
                : "채점 후 문항별 기록을 확인합니다."}
            </p>
          ) : wrong.length === 0 ? (
            <p>틀린 문항이 없습니다.</p>
          ) : (
            <table className={s.wrongTable}>
              <thead>
                <tr>
                  <th scope="col">번호</th>
                  <th scope="col">단원</th>
                  <th scope="col">유형</th>
                </tr>
              </thead>
              <tbody>
                {wrong.map((q) => (
                  <tr key={q.no}>
                    <td>{q.no}번</td>
                    <td>{q.unit}</td>
                    <td>{q.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
      {options.retry && marks && wrong.length > 0 && (
        <section className={s.area}>
          <h3>재시험 결과</h3>
          <p>10월 26일 · 오답 복습 4문항 중 3문항 정답</p>
          <p className={s.method}>별도 재시험의 지어낸 기록입니다.</p>
        </section>
      )}
      {options.note && (
        <section className={`${s.area} ${s.note}`}>
          <h3>원장님 문장</h3>
          <p>{data.note}</p>
        </section>
      )}
      <p className={s.coverage}>
        담은 기록:{" "}
        {marks
          ? "월말평가 1회"
          : me.marks === "absent"
            ? "시험일 · 결시 1회"
            : "시험일(미채점)"}
        {options.retry && marks && wrong.length > 0 ? " · 재시험 1회" : ""}
        {options.note ? " · 원장님 문장" : ""}.
      </p>
    </>
  );
}

function WrongSheet({ data, start }: { data: Data; start: number }) {
  return (
    <>
      <Head data={data} title="틀린 문항 풀이" />
      <div className={s.problemList}>
        {data.wrong.slice(start, start + 2).map((q) => (
          <section key={q.no} className={s.problem}>
            <h3>
              {q.no}번{" "}
              <span>
                {q.unit} · {q.type}
              </span>
            </h3>
            <p className={s.stem}>{q.content}</p>
            <dl>
              <dt>정답</dt>
              <dd>{q.answer}</dd>
              <dt>해설</dt>
              <dd>{q.solution}</dd>
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}

function ClassSheet({ data }: { data: Data }) {
  return (
    <>
      <Head data={data} title="반 성적표" />
      <p className={s.classMeta}>
        20문항 · 100점 만점 · 응시 {data.taken.length}명 · 결시{" "}
        {data.pupils.filter((p) => p.marks === "absent").length}명 · 미채점{" "}
        {data.pupils.filter((p) => p.marks === "ungraded").length}명
      </p>
      <table className={s.matrix}>
        <caption>학생별 정오와 문항별 정답 수</caption>
        <thead>
          <tr>
            <th scope="col">학생</th>
            {QUESTIONS.map((q) => (
              <th key={q.no} scope="col">
                {q.no}
              </th>
            ))}
            <th scope="col">점수</th>
          </tr>
        </thead>
        <tbody>
          {data.pupils.map((p) => (
            <tr key={p.name}>
              <th scope="row">{p.name}</th>
              {QUESTIONS.map((q, i) => (
                <td key={q.no} data-wrong={isMarks(p.marks) && !p.marks[i]}>
                  {isMarks(p.marks) ? (p.marks[i] ? "○" : "×") : "—"}
                </td>
              ))}
              <td>
                {isMarks(p.marks)
                  ? score(p.marks)
                  : p.marks === "absent"
                    ? "결시"
                    : "미채점"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">정답 수</th>
            {QUESTIONS.map((q, i) => (
              <td key={q.no}>{data.taken.filter((p) => p.marks[i]).length}</td>
            ))}
            <td>—</td>
          </tr>
        </tfoot>
      </table>
      <p className={s.method}>
        ○ 정답 · × 오답 · — 결시 또는 미채점. 정답 수의 기준은 응시{" "}
        {data.taken.length}명입니다. 학생 순서는 명단 순서입니다.
      </p>
    </>
  );
}
