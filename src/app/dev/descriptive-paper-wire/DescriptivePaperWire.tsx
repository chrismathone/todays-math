"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  DESCRIPTIVE,
  OPTIONS,
  PAPER_LABELS,
  PATTERN_LABELS,
  PROBLEMS,
  ROW_HEIGHT_MM,
  ROWS_PER_CRITERION,
  SCORE_LABELS,
  TOTAL_SCORE,
  pageCounts,
  pagesFor,
  rowsOf,
  scoreOf,
  type OptionId,
  type PageSpec,
  type PaperKind,
  type WireOption,
  type WireProblem,
} from "./fixtures";
import s from "./DescriptivePaperWire.module.css";

const A4_WIDTH = (210 / 25.4) * 96;
const A4_HEIGHT = (297 / 25.4) * 96;
const PAPER_KINDS: readonly PaperKind[] = ["daily", "review", "past"];

function Triangle() {
  return (
    <svg
      className={s.triangle}
      viewBox="0 0 240 155"
      role="img"
      aria-label="직각삼각형 ABC. AB는 8cm, AC는 6cm. D는 AB의 중점이며 C와 D를 이었다."
    >
      <path
        d="M 38 20 L 38 112 L 204 112 Z M 38 101 L 49 101 L 49 112"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M 38 20 L 121 112"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="4 3"
      />
      <path
        d="M 77 108 L 82 116 M 160 108 L 165 116"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <text x="24" y="130">
        A
      </text>
      <text x="207" y="124">
        B
      </text>
      <text x="22" y="18">
        C
      </text>
      <text x="116" y="130">
        D
      </text>
      <text x="0" y="72">
        6cm
      </text>
      <text x="109" y="145">
        8cm
      </text>
      <path
        d="M 38 133 L 38 147 M 204 133 L 204 147 M 38 141 L 101 141 M 141 141 L 204 141"
        stroke="currentColor"
        strokeWidth="0.7"
      />
    </svg>
  );
}

function Score({ problem }: { problem: WireProblem }) {
  if (problem.kind !== "descriptive") return null;
  return (
    <span className={s.score} data-score-for={problem.number}>
      [{scoreOf(problem)}점]
    </span>
  );
}

function AnswerSpace({
  problem,
  option,
  split,
  standalone = false,
}: {
  problem: WireProblem;
  option: WireOption;
  split: boolean;
  standalone?: boolean;
}) {
  const divided = option.id === "E" && split && Boolean(problem.parts);
  const rows = rowsOf(problem);
  const bodyStyle = {
    "--answer-height": `${rows * ROW_HEIGHT_MM}mm`,
    "--line-height": `${ROW_HEIGHT_MM}mm`,
  } as CSSProperties;
  const showScore = option.score === "answer";

  return (
    <section
      className={s.answerSpace}
      data-answer-space={problem.number}
      data-answer-rows={rows}
      data-answer-split={divided}
      aria-label={`문 ${problem.number} 서술형 답란, ${rows}줄, ${rows * ROW_HEIGHT_MM}mm`}
    >
      <div className={s.answerHeading}>
        <span>
          {standalone ? `문 ${problem.number} · 서술형` : "풀이와 답"}{" "}
          {showScore && <Score problem={problem} />}
        </span>
        <span className={s.spaceMeasure}>
          {divided ? `⑴⑵⑶ 각 ${ROWS_PER_CRITERION}줄` : `${rows}줄`} ·{" "}
          {rows * ROW_HEIGHT_MM}mm
        </span>
      </div>
      <div
        className={`${s.writingArea} ${s[option.pattern]}`}
        style={bodyStyle}
        data-writing-area
      >
        {divided &&
          problem.parts?.map((_, i) => (
            <div
              key={i}
              className={s.subSpace}
              data-sub-space
              style={{ height: `${ROWS_PER_CRITERION * ROW_HEIGHT_MM}mm` }}
            >
              <span>{["⑴", "⑵", "⑶"][i]}</span>
            </div>
          ))}
      </div>
    </section>
  );
}

function Question({
  problem,
  paper,
  option,
  inline,
  split,
  answerPageNumber,
  separate,
}: {
  problem: WireProblem;
  paper: PaperKind;
  option: WireOption;
  inline: boolean;
  split: boolean;
  answerPageNumber: number;
  separate: boolean;
}) {
  const descriptive = problem.kind === "descriptive";
  return (
    <article
      className={`${s.problem} ${descriptive ? s.descriptiveProblem : s.normalProblem}`}
      data-question={problem.number}
      data-question-type={problem.kind}
    >
      <div className={s.questionText}>
        <div className={s.problemHeading}>
          <strong>문 {problem.number}</strong>
          {descriptive && <span className={s.problemType}>서술형</span>}
          {descriptive && option.score === "number" && (
            <Score problem={problem} />
          )}
        </div>
        <p>{problem.text}</p>
        {problem.parts && (
          <div className={s.parts}>
            {problem.parts.map((part) => (
              <p key={part}>{part}</p>
            ))}
          </div>
        )}
        {problem.diagram && <Triangle />}
        {problem.choices && (
          <div className={s.choices}>
            {problem.choices.map((choice) => (
              <span key={choice}>{choice}</span>
            ))}
          </div>
        )}
        {!descriptive && paper !== "past" && (
          <div className={s.shortAnswer} data-normal-answer={problem.number}>
            내 정답 <span /> 채점 □
          </div>
        )}
        {descriptive && option.score === "end" && (
          <div className={s.endScore}>
            <Score problem={problem} />
          </div>
        )}
        {descriptive && !inline && (
          <p className={s.answerPointer}>
            {separate ? "별도 답안지" : `${answerPageNumber}쪽 답란`}의 문{" "}
            {problem.number}에 쓰시오.
          </p>
        )}
      </div>
      {!descriptive && paper !== "past" && (
        <div
          className={s.scratch}
          aria-label={`문 ${problem.number} 풀이 공간`}
        >
          <span>풀이 공간</span>
        </div>
      )}
      {descriptive && inline && (
        <AnswerSpace problem={problem} option={option} split={split} />
      )}
    </article>
  );
}

function PaperHeader({
  paper,
  page,
  title,
  separate,
  teacher,
}: {
  paper: PaperKind;
  page: number;
  title: string;
  separate?: boolean;
  teacher?: boolean;
}) {
  return (
    <header
      className={`${s.paperHeader} ${page > 0 ? s.continuationHeader : ""}`}
    >
      <div>
        <p className={s.academy}>오늘의수학 · 지면 시안</p>
        <h3>{title}</h3>
        <p className={s.paperMeta}>
          {PAPER_LABELS[paper]} · 같은 7문항 · 서술형 3문항{" "}
          {teacher ? `· ${TOTAL_SCORE}점` : ""}
        </p>
      </div>
      <div className={s.nameField}>
        <span>2026.10.20</span>
        {separate && <strong>별도 배부 · 1장</strong>}
        <span>이름 __________ · 반 ______</span>
      </div>
    </header>
  );
}

function PaperFrame({
  children,
  label,
  scale,
  paper,
  layout,
  pageKind,
  option,
}: {
  children: ReactNode;
  label: string;
  scale: number;
  paper: PaperKind;
  layout: string;
  pageKind: string;
  option: OptionId;
}) {
  return (
    <figure className={s.paperFigure}>
      <figcaption className={s.paperCaption}>
        {label} <span>A4 · 210 × 297mm</span>
      </figcaption>
      <div className={s.paperFrame} style={{ height: A4_HEIGHT * scale }}>
        <div
          className={s.paper}
          style={{ transform: `scale(${scale})` }}
          data-paper
          data-paper-kind={paper}
          data-layout={layout}
          data-page-kind={pageKind}
          data-option={option}
        >
          {children}
        </div>
      </div>
    </figure>
  );
}

function StudentPaper({
  spec,
  index,
  pages,
  paper,
  option,
  split,
  scale,
}: {
  spec: PageSpec;
  index: number;
  pages: readonly PageSpec[];
  paper: PaperKind;
  option: WireOption;
  split: boolean;
  scale: number;
}) {
  const answers = spec.kind === "answers";
  const title = answers
    ? `수학 ${PAPER_LABELS[paper]} · 서술형 답안지`
    : paper === "past"
      ? "수학 기출형 연습"
      : `수학 ${PAPER_LABELS[paper]}테스트`;
  const pageLabel = spec.separate
    ? "별도 답안지 · 1 / 1"
    : `${index + 1} / ${pages.length}쪽`;
  const answerIndex = pages.findIndex((p) => p.kind === "answers");
  const separate = pages.some((p) => p.separate);
  return (
    <PaperFrame
      label={`${option.id}안 · ${pageLabel}${answers && !spec.separate ? " · 답란 모음" : ""}`}
      scale={scale}
      paper={paper}
      layout={spec.layout}
      pageKind={spec.kind}
      option={option.id}
    >
      <PaperHeader
        paper={paper}
        page={spec.separate ? 0 : index}
        title={title}
        separate={spec.separate}
      />
      {paper !== "past" && index === 0 && (
        <div className={s.conceptNote}>
          <strong>핵심 개념</strong>
          <span>등식의 양변에 같은 수를 더하거나 빼어도 등식은 성립한다.</span>
        </div>
      )}
      {answers && (
        <p className={s.answerInstruction}>
          문제지의 번호를 확인하고 풀이와 답을 쓰시오.
        </p>
      )}
      <div className={`${s.paperBody} ${s[spec.layout]}`} data-paper-body>
        {spec.groups.map((group, groupIndex) => (
          <div
            className={s.problemGroup}
            key={groupIndex}
            data-column={spec.layout === "columns" ? groupIndex : undefined}
          >
            {group.map((number) => {
              const problem = PROBLEMS[number - 1];
              return answers ? (
                <AnswerSpace
                  key={number}
                  problem={problem}
                  option={option}
                  split={split}
                  standalone
                />
              ) : (
                <Question
                  key={number}
                  problem={problem}
                  paper={paper}
                  option={option}
                  inline={Boolean(spec.inlineAnswers)}
                  split={split}
                  answerPageNumber={answerIndex + 1}
                  separate={separate}
                />
              );
            })}
          </div>
        ))}
      </div>
      <footer className={s.paperFooter} data-paper-footer>
        <span>
          {option.id}안 · {PAPER_LABELS[paper]} · 학생용
        </span>
        <span>{pageLabel}</span>
      </footer>
    </PaperFrame>
  );
}

function TeacherPaper({
  option,
  paper,
  scale,
}: {
  option: WireOption;
  paper: PaperKind;
  scale: number;
}) {
  return (
    <PaperFrame
      label={`${option.id}안 · 교사용 채점표 · 1 / 1쪽`}
      scale={scale}
      paper={paper}
      layout="teacher"
      pageKind="teacher"
      option={option.id}
    >
      <PaperHeader paper={paper} page={0} title="서술형 채점표" teacher />
      <div className={s.teacherIntro}>
        <p>
          학원 자체 기준 · {option.id}안 {option.name} · 학생 답란{" "}
          {PATTERN_LABELS[option.pattern]}
        </p>
        <p>일반 문항 정답　문 1 ③　문 2 ②　문 3 5　문 4 1</p>
      </div>
      <div className={`${s.paperBody} ${s.teacherBody}`} data-paper-body>
        {DESCRIPTIVE.map((problem) => (
          <section
            className={s.rubric}
            key={problem.number}
            data-rubric={problem.number}
          >
            <h4>
              문 {problem.number} · 서술형 <span>{scoreOf(problem)}점</span>
            </h4>
            <p className={s.modelAnswer}>{problem.solution}</p>
            <table>
              <caption className={s.srOnly}>
                문 {problem.number}의 기준별 채점표
              </caption>
              <thead>
                <tr>
                  <th scope="col">볼 증거</th>
                  <th scope="col">배점</th>
                  <th scope="col">만점 · 부분 · 0점</th>
                  <th scope="col">기록</th>
                </tr>
              </thead>
              <tbody>
                {problem.criteria?.map((criterion) => (
                  <tr
                    key={criterion.evidence}
                    data-criterion-points={criterion.points}
                  >
                    <th scope="row">{criterion.evidence}</th>
                    <td>{criterion.points}점</td>
                    <td>{criterion.partial}</td>
                    <td className={s.markBoxes}>
                      {[criterion.points, ...criterion.partialPoints, 0].map(
                        (point) => (
                          <span key={point}>□ {point}</span>
                        ),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={s.subtotal}>
              문 {problem.number} 소계 ______ / {scoreOf(problem)}점
            </p>
          </section>
        ))}
        <div className={s.markingNotes} data-marking-notes>
          <p>
            앞 단계의 수치 오류를 올바르게 이어 썼다면 뒤 기준은 만점으로
            인정한다.
          </p>
          <p>예: 문 6에서 b = 4로 틀렸어도 y = 2 × 4 + 4 = 12는 ⑵ 3점.</p>
          <p>문 5의 검산은 총액이 다름을 정확히 확인해도 1점이다.</p>
          <p>동등한 식·역산·넓이 비교도 해당 근거가 드러나면 인정한다.</p>
          <strong>서술형 합계 ______ / {TOTAL_SCORE}점</strong>
        </div>
      </div>
      <footer className={s.paperFooter} data-paper-footer>
        <span>
          {option.id}안 · {PAPER_LABELS[paper]} · 교사용
        </span>
        <span>1 / 1쪽</span>
      </footer>
    </PaperFrame>
  );
}

function Count({ option, paper }: { option: OptionId; paper: PaperKind }) {
  const count = pageCounts(option, paper);
  return (
    <>
      {count.total}쪽{" "}
      <span className={s.delta}>
        ({count.delta > 0 ? "+" : ""}
        {count.delta})
      </span>
    </>
  );
}

export function DescriptivePaperWire() {
  const [optionId, setOptionId] = useState<OptionId>("A");
  const [paper, setPaper] = useState<PaperKind>("daily");
  const [teacher, setTeacher] = useState(false);
  const [split, setSplit] = useState(true);
  const [scale, setScale] = useState(0.35);
  const galleryRef = useRef<HTMLDivElement>(null);
  const option = OPTIONS.find((o) => o.id === optionId)!;
  const pages = pagesFor(optionId, paper);
  const count = pageCounts(optionId, paper);

  useEffect(() => {
    const element = galleryRef.current;
    if (!element) return;
    const resize = () =>
      setScale(Math.min(1, element.getBoundingClientRect().width / A4_WIDTH));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <main className={s.shell} data-descriptive-wire>
      <header className={s.head}>
        <p className={s.eyebrow}>D-07 · Wire · 2026.10.20</p>
        <h1>서술형 답란 · 5안 비교</h1>
        <p>
          같은 7문항: 객관식 2 · 단답 2 · 서술형 3. 새로 지은 예시이며
          서술형에만 배점을 표시합니다.
        </p>
      </header>

      <section className={s.overview} aria-labelledby="comparison-title">
        <div className={s.sectionHeading}>
          <h2 id="comparison-title">답을 쓰는 자리</h2>
          <span>숫자는 학생 배부 쪽 수 · 교사용은 각 1쪽 추가</span>
        </div>
        <div
          className={s.comparisonTable}
          role="table"
          aria-label="다섯 안의 쪽 수 비교"
        >
          <div className={s.comparisonHead} role="row">
            <span role="columnheader">시안</span>
            <span role="columnheader">일일</span>
            <span role="columnheader">확인</span>
            <span role="columnheader">기출형</span>
            <span role="columnheader">배점 · 답란</span>
          </div>
          {OPTIONS.map((o) => (
            <div
              className={s.comparisonRow}
              role="row"
              key={o.id}
              data-selected={o.id === optionId}
            >
              <div role="cell">
                <button
                  type="button"
                  className={s.optionButton}
                  aria-pressed={o.id === optionId}
                  onClick={() => setOptionId(o.id)}
                  data-option-button={o.id}
                >
                  <b>{o.id}</b>
                  <span>{o.name}</span>
                </button>
              </div>
              {PAPER_KINDS.map((kind) => (
                <span role="cell" className={s.countCell} key={kind}>
                  <span className={s.mobileLabel}>{PAPER_LABELS[kind]} </span>
                  <Count option={o.id} paper={kind} />
                </span>
              ))}
              <span role="cell" className={s.positionCell}>
                {SCORE_LABELS[o.score]} · {PATTERN_LABELS[o.pattern]}
              </span>
            </div>
          ))}
        </div>
        <p className={s.baseline}>
          괄호는 기준 대비 증감. 일일·확인 기준은 현재 두 문항씩 4쪽. 기출형
          기준은 문제지 1쪽 + 별도 답안지 시안 1쪽 = 2쪽이며, 별도 답안지는
          제품에 아직 없습니다.
        </p>
      </section>

      <section className={s.selection} aria-labelledby="selected-title">
        <div className={s.selectionTop}>
          <h2 id="selected-title">
            {option.id}안 · {option.name}
          </h2>
          <button
            type="button"
            className={s.printButton}
            onClick={() => window.print()}
          >
            현재 시안 인쇄
          </button>
        </div>
        <p>{option.description}</p>
        <p className={s.weakness}>약점 · {option.weakness}</p>
        <dl className={s.specs}>
          <div>
            <dt>배점</dt>
            <dd>
              {SCORE_LABELS[option.score]} · 서술형 {TOTAL_SCORE}점
            </dd>
          </div>
          <div>
            <dt>답란</dt>
            <dd>
              {PATTERN_LABELS[option.pattern]} · 3기준 × 2줄 × 8mm = 문항당 48mm
            </dd>
          </div>
        </dl>
        <div className={s.controls}>
          <div className={s.buttonGroup} role="group" aria-label="지면 종류">
            {PAPER_KINDS.map((kind) => (
              <button
                type="button"
                aria-pressed={paper === kind}
                key={kind}
                onClick={() => setPaper(kind)}
                data-paper-button={kind}
              >
                {PAPER_LABELS[kind]}
              </button>
            ))}
          </div>
          <div
            className={s.buttonGroup}
            role="group"
            aria-label="학생용 또는 교사용"
          >
            <button
              type="button"
              aria-pressed={!teacher}
              onClick={() => setTeacher(false)}
              data-audience="student"
            >
              학생용
            </button>
            <button
              type="button"
              aria-pressed={teacher}
              onClick={() => setTeacher(true)}
              data-audience="teacher"
            >
              교사용 · 채점표
            </button>
          </div>
          {option.id === "E" && (
            <div
              className={s.buttonGroup}
              role="group"
              aria-label="문 6 답란 모양"
            >
              <button
                type="button"
                aria-pressed={split}
                onClick={() => setSplit(true)}
                data-split="yes"
              >
                ⑴⑵⑶ 분할
              </button>
              <button
                type="button"
                aria-pressed={!split}
                onClick={() => setSplit(false)}
                data-split="no"
              >
                큰 칸 하나
              </button>
            </div>
          )}
        </div>
        <p
          className={s.pageSummary}
          role="status"
          aria-live="polite"
          data-page-summary
        >
          {teacher
            ? "교사용 1쪽 · 기준별 기록 □ · 서술형 합계 20점"
            : `${PAPER_LABELS[paper]} · 문제 ${count.questions}쪽${count.answers ? ` + ${pages.some((p) => p.separate) ? "별도 답안지" : "마지막 답란"} ${count.answers}쪽` : ""} = ${count.total}쪽 · 기준 대비 ${count.delta > 0 ? "+" : ""}${count.delta}쪽`}
        </p>
        {paper === "past" && (
          <p className={s.ruleNote}>
            {option.pastChangesRule
              ? "A·D의 기출형 답란 통합은 현행 D-119와 다른 비교 제안입니다. 제품 적용은 별도 결정이 필요합니다."
              : "문제지에 답란을 두지 않는 현행 D-119를 유지한 비교안입니다."}
          </p>
        )}
        {option.id === "B" && paper !== "past" && (
          <p className={s.ruleNote}>
            서술형 문제 3개를 한 쪽에 모아 문제지 한 쪽을 줄이고, 마지막 답란 한
            쪽을 더합니다.
          </p>
        )}
        {option.id === "D" && (
          <p className={s.ruleNote}>
            일반 문항 네 개는 두 단으로 한 쪽에 모읍니다. 다음 두 쪽의 서술형만
            전폭을 씁니다.
          </p>
        )}
      </section>

      <div
        className={s.gallery}
        ref={galleryRef}
        data-gallery
        data-scale={scale}
      >
        {teacher ? (
          <TeacherPaper option={option} paper={paper} scale={scale} />
        ) : (
          pages.map((spec, index) => (
            <StudentPaper
              key={`${optionId}-${paper}-${index}`}
              spec={spec}
              index={index}
              pages={pages}
              paper={paper}
              option={option}
              split={split}
              scale={scale}
            />
          ))
        )}
      </div>
      <aside className={s.scopeNote}>
        <p>
          높이와 쪽 수는 이 예시 묶음의 Wire 배치입니다. 실제 생성 문항의 자동
          쪽 나눔 규칙은 아닙니다.
        </p>
        <p>
          현재 일일·확인의 머리말·개념 상자·문항/풀이 구조와 기출의 두 단·문항
          띠를 흑백으로 옮겼습니다. 색·장식과 제품 반영은 이번 범위에 포함하지
          않습니다.
        </p>
      </aside>
    </main>
  );
}
