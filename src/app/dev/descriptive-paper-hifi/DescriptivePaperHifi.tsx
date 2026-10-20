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
  SUB_ROWS,
  TOTAL_SCORE,
  pageCounts,
  pagesFor,
  rowsOf,
  scoreOf,
  type OptionId,
  type PageSpec,
  type PaperKind,
  type HifiOption,
  type WireProblem,
} from "./fixtures";
import s from "./DescriptivePaperHifi.module.css";
import pastStyles from "@/components/print/PastPaper.module.css";
import headerStyles from "@/components/unified/print/PrintHeader.module.css";
import dailyStyles from "@/components/print/TestPrint.module.css";
import { QuestionNumber } from "@/components/unified/print/templates/ProblemMeta";
import { PAPER_COLORS, A4_DIM } from "@/components/unified/print/tokens";
import { readablePaperColor } from "@/components/unified/print/readableColor";

const A4_WIDTH = A4_DIM.width;
const A4_HEIGHT = A4_DIM.height;
const paperTokens = {
  "--paper-ink": PAPER_COLORS.ink,
  "--paper-muted": PAPER_COLORS.mutedText,
  "--paper-rule": PAPER_COLORS.ink30,
  "--paper-light": PAPER_COLORS.ink15,
  "--paper-grid": PAPER_COLORS.ink08,
  "--paper-fill": PAPER_COLORS.ink04,
  "--paper-white": PAPER_COLORS.paper,
  "--paper-warm": PAPER_COLORS.paperWarm,
  "--paper-accent": PAPER_COLORS.accentGold,
  "--paper-info": readablePaperColor(PAPER_COLORS.accentGold),
} as CSSProperties;
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

function Ruling({
  // A normal problem's space stretches with the page. Clip an A4's worth of
  // the same physical rules instead of resizing their spacing to fit the box.
  rows = Math.ceil(A4_HEIGHT / (ROW_HEIGHT_MM * (96 / 25.4))),
  option,
}: {
  rows?: number;
  option: HifiOption;
}) {
  if (option.pattern !== "lines" && option.pattern !== "dotted") return null;
  return (
    <div className={s.ruling} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span
          key={i}
          className={s.ruleLine}
          style={{ top: `calc(${(i + 1) * ROW_HEIGHT_MM}mm - 1px)` }}
        />
      ))}
    </div>
  );
}

function AnswerSpace({
  problem,
  option,
  standalone = false,
}: {
  problem: WireProblem;
  option: HifiOption;
  standalone?: boolean;
}) {
  const divided = Boolean(problem.parts);
  const rows = rowsOf(problem);
  const bodyStyle = {
    "--answer-height": `${rows * ROW_HEIGHT_MM}mm`,
    "--line-height": `${ROW_HEIGHT_MM}mm`,
  } as CSSProperties;

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
          {standalone
            ? `문 ${problem.number} · 서술형`
            : option.label
              ? "풀이"
              : ""}
          {standalone && (
            <span className={s.score} data-answer-score-for={problem.number}>
              [{scoreOf(problem)}점]
            </span>
          )}
        </span>
      </div>
      <div
        className={`${s.writingArea} ${s[option.pattern]}`}
        style={bodyStyle}
        data-writing-area
      >
        {!divided && <Ruling rows={rows} option={option} />}
        {!divided && option.id === "E" && (
          <span className={s.subLabel} aria-hidden="true">
            {problem.number}
          </span>
        )}
        {divided &&
          problem.parts?.map((_, i) => (
            <div
              key={i}
              className={s.subSpace}
              data-sub-space
              style={{ height: `${SUB_ROWS[i] * ROW_HEIGHT_MM}mm` }}
            >
              <Ruling rows={SUB_ROWS[i]} option={option} />
              <span className={s.subLabel}>{["⑴", "⑵", "⑶"][i]}</span>
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
  answerPageNumber,
  separate,
}: {
  problem: WireProblem;
  paper: PaperKind;
  option: HifiOption;
  inline: boolean;
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
        <div
          className={`${s.problemHeading} ${paper === "past" ? pastStyles.bandRow : ""}`}
        >
          {paper === "past" ? (
            <strong className={pastStyles.num}>
              <span className={pastStyles.numWord}>문</span> {problem.number}
            </strong>
          ) : (
            <QuestionNumber
              template="jaseup"
              num={problem.number}
              accent={PAPER_COLORS.accentGold}
            />
          )}
          {descriptive && <span className={s.problemType}>서술형</span>}
          {descriptive && <Score problem={problem} />}
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
        {descriptive && !inline && (
          <p className={s.answerPointer}>
            {separate ? "별도 답안지" : `${answerPageNumber}쪽 답란`}의 문{" "}
            {problem.number}에 쓰시오.
          </p>
        )}
      </div>
      {!descriptive && paper !== "past" && (
        <div
          className={`${s.scratch} ${s[option.pattern]}`}
          data-scratch={problem.number}
          aria-label={`문 ${problem.number} 풀이 공간`}
        >
          <Ruling option={option} />
          {option.id === "E" && (
            <span className={s.subLabel} aria-hidden="true">
              {problem.number}
            </span>
          )}
          {option.label && <span className={s.scratchLabel}>풀이 공간</span>}
        </div>
      )}
      {descriptive && inline && (
        <AnswerSpace problem={problem} option={option} />
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
  if (paper !== "past" && !teacher && !separate) {
    if (page > 0)
      return (
        <header className={dailyStyles.continuationHeader}>
          <span>오늘의수학 · {title}</span>
          <span>p. {page + 1}</span>
        </header>
      );
    return (
      <div className={s.dailyHead}>
        <header
          className={`${dailyStyles.firstHeader} ${headerStyles.selfHead}`}
          data-c2-header
        >
          <div>
            <p className={dailyStyles.academyName}>오늘의수학</p>
            <p className={dailyStyles.englishLabel}>SELF-STUDY</p>
            <h3 className={headerStyles.paperTitle}>{title}</h3>
            <p className={dailyStyles.todayGoal}>
              오늘의 목표 · 식과 근거를 함께 쓰기
            </p>
          </div>
          <div className={dailyStyles.studentMeta}>
            <p className={dailyStyles.dateLabel}>학습일</p>
            <p className={dailyStyles.dateValue}>2026.10.20</p>
            <p className={dailyStyles.nameLine}>이름 ________ · 반 ______</p>
          </div>
        </header>
        <section className={headerStyles.noteBox}>
          <h4 className={headerStyles.noteLabel}>핵심 개념 정리</h4>
          <p>등식의 양변에 같은 수를 더하거나 빼어도 등식은 성립한다.</p>
        </section>
      </div>
    );
  }
  return (
    <header className={pastStyles.masthead}>
      <div className={pastStyles.mastLeft}>
        <div className={pastStyles.academy}>오늘의수학</div>
        <div className={pastStyles.mastEn}>
          {teacher ? "SCORING GUIDE" : "PAST PAPER"}
        </div>
      </div>
      <div className={pastStyles.mastMid}>
        <h3 className={pastStyles.paperTitle}>{title}</h3>
        <p className={pastStyles.paperSub}>
          {teacher
            ? "서술형 3문항 · 20점"
            : separate
              ? "문 5~7 · 별도 배부"
              : "일곱 문항 · 서술형 20점"}
        </p>
      </div>
      <div className={pastStyles.mastRight}>
        <span>이름 ____________</span>
        <span>반 ________</span>
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
  first = false,
}: {
  children: ReactNode;
  label: string;
  scale: number;
  paper: PaperKind;
  layout: string;
  pageKind: string;
  option: OptionId;
  first?: boolean;
}) {
  return (
    <figure className={s.paperFigure}>
      <figcaption className={s.paperCaption}>
        {label} <span>A4 · 210 × 297mm</span>
      </figcaption>
      <div className={s.paperFrame} style={{ height: A4_HEIGHT * scale }}>
        <div
          className={`${s.paper} ${paper === "past" ? pastStyles.page : ""}`}
          style={{ ...paperTokens, transform: `scale(${scale})` }}
          data-paper
          data-paper-kind={paper}
          data-layout={layout}
          data-page-kind={pageKind}
          data-option={option}
          data-first={first}
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
  scale,
}: {
  spec: PageSpec;
  index: number;
  pages: readonly PageSpec[];
  paper: PaperKind;
  option: HifiOption;
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
      first={index === 0}
    >
      <PaperHeader
        paper={paper}
        page={spec.separate ? 0 : index}
        title={title}
        separate={spec.separate}
      />
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

                  standalone
                />
              ) : (
                <Question
                  key={number}
                  problem={problem}
                  paper={paper}
                  option={option}
                  inline={Boolean(spec.inlineAnswers)}

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
  option: HifiOption;
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
                          <span key={point}>
                            {option.id === "D" ? `${point} □` : `□ ${point}`}
                          </span>
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

export function DescriptivePaperHifi() {
  const [optionId, setOptionId] = useState<OptionId>("A");
  const [paper, setPaper] = useState<PaperKind>("daily");
  const [teacher, setTeacher] = useState(false);
  const [mono, setMono] = useState(false);
  const [scale, setScale] = useState(0.35);
  const galleryRef = useRef<HTMLDivElement>(null);
  const option = OPTIONS.find((o) => o.id === optionId)!;
  const pages = pagesFor(paper);
  const count = pageCounts(paper);

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
    <main className={s.shell} data-descriptive-hifi data-mono={mono}>
      <header className={s.head}>
        <p className={s.eyebrow}>D-07 · HI-FI · 2026.10.20</p>
        <h1>서술형 지면</h1>
        <p>답란의 선과 머리표, 교사용 채점표를 비교합니다.</p>
        <div className={s.fixedPlan}>
          <strong>선택된 짜임</strong>
          <span>일일·확인: 문제 아래 답란</span>
          <span>기출형: 별도 답안지</span>
          <span>⑴⑵⑶ 분할 · 배점은 서술형 번호 옆</span>
        </div>
      </header>
      <section className={s.overview} aria-labelledby="comparison-title">
        <div className={s.sectionHeading}>
          <h2 id="comparison-title">모양 5안</h2>
          <span>
            모든 안 · 일일 4쪽 / 확인 4쪽 / 기출형 2쪽 · 교사용 별도 1쪽
          </span>
        </div>
        <div className={s.optionGrid}>
          {OPTIONS.map((o) => (
            <article
              className={s.optionCard}
              data-selected={o.id === optionId}
              key={o.id}
            >
              <button
                type="button"
                aria-pressed={o.id === optionId}
                onClick={() => setOptionId(o.id)}
                data-option-button={o.id}
              >
                <b>{o.id}</b>
                <span>{o.name}</span>
              </button>
              <div
                className={`${s.swatch} ${s[o.pattern]}`}
                data-swatch={o.id}
                aria-hidden="true"
              >
                <span>⑶</span>
              </div>
              <p>{o.description}</p>
              <p className={s.weakness}>약점 · {o.weakness}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={s.selection} aria-labelledby="selected-title">
        <div className={s.selectionTop}>
          <div>
            <h2 id="selected-title">
              {option.id}안 · {option.name}
            </h2>
            <p className={s.detail}>
              {PATTERN_LABELS[option.pattern]} · {option.detail}
            </p>
          </div>
          <button
            type="button"
            className={s.printButton}
            onClick={() => window.print()}
          >
            현재 지면 인쇄
          </button>
        </div>
        <div className={s.controls}>
          <div className={s.buttonGroup} role="group" aria-label="지면 종류">
            {PAPER_KINDS.map((kind) => (
              <button
                type="button"
                key={kind}
                aria-pressed={paper === kind}
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
              교사용 채점표
            </button>
          </div>
          <div className={s.buttonGroup} role="group" aria-label="인쇄 색상">
            <button
              type="button"
              aria-pressed={!mono}
              onClick={() => setMono(false)}
              data-color="color"
            >
              양식 C2 색
            </button>
            <button
              type="button"
              aria-pressed={mono}
              onClick={() => setMono(true)}
              data-color="mono"
            >
              흑백 미리보기
            </button>
          </div>
        </div>
        <p
          className={s.pageSummary}
          role="status"
          aria-live="polite"
          data-page-summary
        >
          {teacher
            ? "교사용 1쪽 · 기준 9개 · 서술형 합계 20점"
            : `${PAPER_LABELS[paper]} · 문제 ${count.questions}쪽${count.answers ? " + 별도 답안지 1쪽" : ""} = ${count.total}쪽 · 선택된 Wire 대비 증감 0쪽`}
        </p>
        <details className={s.heightNote}>
          <summary>답란 높이 기준 · 손글씨 실측 전</summary>
          <p>
            기준 수 × 기준당 줄 수 × 줄 높이. 문5·7은 3 × 2 × 8mm = 48mm, 문6은
            3 × 3 × 8mm = 72mm입니다.
          </p>
          <p>
            문6의 아홉 줄은 ⑴ 2줄 · ⑵ 3줄 · ⑶ 4줄(16·24·32mm)로 나눕니다. 가장
            긴 ⑶의 풀이를 위한 여유이며 배점 비례가 아닙니다. 실제 손글씨 측정
            근거는 없습니다.
          </p>
        </details>
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
              scale={scale}
            />
          ))
        )}
      </div>
      <aside className={s.scopeNote}>
        <p>
          Wire와 같은 자작 7문항입니다. 쪽 수는 이 예시의 고정 배치이며 실제
          생성 문항의 자동 쪽 나눔 결과가 아닙니다.
        </p>
        <p>
          일일·확인의 JaseupTemplate 배치에 C2 머리 면·번호 상자를 얹고, 기출형
          두 단을 기준으로 만든 시안입니다. 흑백은 회색조 미리보기이며 실물
          인쇄와 학생 손풀이는 확인 전입니다.
        </p>
        <p>
          서버 저장·DB 연결 없음 · 제품 코드 무변경 ·{" "}
          <a href="/dev/descriptive-paper-wire">이전 Wire 보기</a>
        </p>
      </aside>
    </main>
  );
}
