import type { ExamStudyGeneration } from "@/contracts/examStudy.contract";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import { MathText, SolutionText } from "@/components/math/MathText";
import { studyProblem } from "./examStudyClient";
import s from "./ExamPracticeWorkspace.module.css";

const coverageText = {
  full: "완결 과제 연습",
  component: "기초 요소 연습",
  unverified: "대응 확인 전",
  unavailable: "현재 제공 없음",
} as const;

export function ExamStudyResults({
  result,
  busy,
  onRegenerate,
  onOutput,
}: {
  result: ExamStudyGeneration;
  busy: boolean;
  onRegenerate: () => void;
  onOutput: () => void;
}) {
  const scope = result.schoolEvidence;
  const formats = result.questions.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.questionType] = (acc[item.questionType] ?? 0) + 1;
      return acc;
    },
    {},
  );
  return (
    <section
      className={s.results}
      aria-labelledby="study-result-title"
      aria-busy={busy}
    >
      <header className={s.resultHeader}>
        <div>
          <h2 id="study-result-title">만든 연습 {result.deliveredCount}문항</h2>
          <p className={s.muted}>
            {result.status === "complete"
              ? "선택한 연습 범위를 채웠습니다."
              : result.status === "partial"
                ? "현재 제공할 수 있는 범위의 연습입니다."
                : "선택한 조건으로 제공할 문항이 없습니다."}
          </p>
          {result.deliveredCount > 0 && (
            <p className={s.muted}>
              {Object.entries(formats)
                .map(([name, n]) => `${name} ${n}`)
                .join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          className={s.secondary}
          onClick={onRegenerate}
          disabled={busy}
        >
          다른 조건으로 다시 만들기
        </button>
      </header>
      {scope && (
        <p className={s.notice}>
          검토 자료: {scope.sourceYear}년 {scope.semester}학기 {scope.round} ·{" "}
          {scope.visibleCount}/{scope.totalCount}문항 확인
          {scope.unknownCount > 0
            ? ` · ${scope.unknownCount}문항은 확인 전`
            : ""}
          . 학교 전체의 출제 경향과 실측 난도는 확인 전입니다.
        </p>
      )}
      {result.warnings.length > 0 && (
        <ul className={s.notices}>
          {[...new Set(result.warnings)].map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {result.requirements.length > 0 && (
        <details className={s.coverage}>
          <summary>연습 범위와 부족한 부분 확인</summary>
          <ul>
            {result.requirements.map((row) => (
              <li key={row.id}>
                <strong>{row.title}</strong>
                <span>
                  {coverageText[row.status]} · {row.delivered}/{row.requested}
                  문항
                </span>
                {row.reason && <p>{row.reason}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
      <ol className={s.questions} key={result.digest}>
        {result.questions.map((item, index) => {
          const problem = studyProblem(item);
          return (
            <li className={s.question} key={item.logicalKey}>
              <header>
                <span className={s.questionNumber}>{index + 1}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.questionType} · {item.difficulty}
                  </p>
                </div>
              </header>
              <UnifiedProblem problem={problem} />
              <details className={s.answer}>
                <summary>정답·풀이 보기</summary>
                <p className={s.answerLabel}>정답</p>
                <MathText text={item.answer} as="div" />
                <p className={s.answerLabel}>
                  풀이{item.rubric ? "와 채점 기준" : ""}
                </p>
                <SolutionText text={problem.solution} />
              </details>
            </li>
          );
        })}
      </ol>
      {result.deliveredCount > 0 && (
        <div className={s.outputAction}>
          <button
            type="button"
            className={s.primary}
            disabled={busy}
            onClick={onOutput}
          >
            양식 구성·출력으로
          </button>
          {result.status !== "complete" && (
            <p className={s.muted}>
              제공된 {result.deliveredCount}문항을 범위 연습으로 출력합니다.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
