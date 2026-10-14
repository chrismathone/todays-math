import type { CSSProperties } from "react";
import { A4Page } from "@/components/print/A4Page";
import { MathText } from "@/components/math/MathText";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Prompt,
} from "@/lib/arithmetic-v2/types";
import type { ArithmeticPaperMode } from "./ArithmeticPaper";
import s from "./ArithmeticPaper.module.css";
import g from "./GradeArithmeticPaper.module.css";

export function GradeArithmeticExpression({
  prompt,
}: {
  prompt: ArithmeticV2Prompt;
}) {
  return (
    <span className={g.expression}>
      {prompt.instruction && (
        <span className={g.instruction}>{prompt.instruction}</span>
      )}
      {prompt.layout === "vertical" ? (
        <span
          className={`${s.vertical} ${g.vertical}`}
          aria-label={`${prompt.left} ${prompt.operator} ${prompt.right}`}
        >
          <span>{prompt.left}</span>
          <span>
            <i>{prompt.operator === "-" ? "−" : prompt.operator}</i>
            {prompt.right}
          </span>
          <span className={s.verticalBlank} aria-label="답란" />
        </span>
      ) : (
        <span className={g.formula}>
          <MathText text={`$${prompt.latex}$`} />
          <span className={g.answerSpace} aria-label="답란" />
        </span>
      )}
    </span>
  );
}

export type GradeArithmeticPaperRound = {
  round: number;
  items: {
    number: number;
    prompt: ArithmeticV2Prompt;
    answer: ArithmeticV2Answer;
  }[];
};

/** Fractions, radicals and polynomial rows need room for the full expression and writing. */
export function gradeArithmeticDensity(
  rounds: GradeArithmeticPaperRound[],
  requested: 12 | 24,
): 12 | 24 {
  return requested === 24 &&
    rounds.some((round) =>
      round.items.some(
        (item) =>
          ["rational", "polynomial", "surd"].includes(item.answer.kind) ||
          (item.prompt.layout === "math" &&
            /\\(?:frac|sqrt)/.test(item.prompt.latex)),
      ),
    )
    ? 12
    : requested;
}

/** Same snapshots on screen and paper; questions never render the answer field. */
export function gradeArithmeticPaperPages({
  rounds,
  title,
  academyName = "오늘 수학",
  mode,
  density,
}: {
  rounds: GradeArithmeticPaperRound[];
  title: string;
  academyName?: string;
  mode: ArithmeticPaperMode;
  density: 12 | 24;
}) {
  density = gradeArithmeticDensity(rounds, density);
  const parts = (
    mode === "both" ? (["questions", "answers"] as const) : [mode]
  ).flatMap((kind) =>
    rounds.flatMap((round) => {
      const perPage = kind === "questions" ? density : 48;
      return Array.from(
        { length: Math.ceil(round.items.length / perPage) },
        (_, i) => ({
          kind,
          round: round.round,
          items: round.items.slice(i * perPage, (i + 1) * perPage),
        }),
      );
    }),
  );
  return parts.map((part, index) => {
    const key = `${part.kind}-${index}`;
    const label = part.kind === "questions" ? "문제지" : "정답지";
    return {
      key,
      caption: `${label} · ${part.round}회차 · ${index + 1}/${parts.length}쪽`,
      enlargeLabel: `${label} ${index + 1}쪽 확대`,
      node: (
        <div className={s.scaled} key={key}>
          <A4Page kind={part.kind} pageNumber={index + 1} className={s.page}>
            <header className={s.head}>
              <small>
                {academyName} · 연산 연습 · {part.round}회차
              </small>
              <h2 className={title.length > 80 ? s.longTitle : undefined}>
                {title}
                {part.kind === "answers" ? " · 정답" : ""}
              </h2>
              {part.kind === "questions" && (
                <p>이름 ____________________　날짜 ______________</p>
              )}
            </header>
            {part.kind === "questions" ? (
              <div
                className={`${s.questions} ${g.questions}`}
                data-density={density}
                style={
                  { "--columns": 2, "--rows": density / 2 } as CSSProperties
                }
              >
                {part.items.map((item) => (
                  <div className={s.item} key={item.number}>
                    <b>{item.number}</b>
                    <GradeArithmeticExpression prompt={item.prompt} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${s.answers} ${g.answers}`}>
                {part.items.map((item) => (
                  <div key={item.number}>
                    <b>{item.number}</b>
                    <MathText text={`$${item.answer.latex}$`} />
                  </div>
                ))}
              </div>
            )}
            <footer className={s.foot}>
              <span>{academyName}</span>
              <span>
                {label} · {index + 1} / {parts.length}
              </span>
            </footer>
          </A4Page>
        </div>
      ),
    };
  });
}
