import type { CSSProperties } from "react";
import type { ArithmeticPrompt } from "@/contracts/arithmetic.contract";
import { A4Page } from "@/components/print/A4Page";
import {
  listArithmeticAnswerViews,
  listArithmeticProblemViews,
} from "@/lib/arithmetic/sheet";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import s from "./ArithmeticPaper.module.css";

export type ArithmeticPaperMode = "questions" | "answers" | "both";
export type ArithmeticDensity = 12 | 24 | 40;

export function ArithmeticExpression({ prompt }: { prompt: ArithmeticPrompt }) {
  if (prompt.notation === "horizontal")
    return (
      <span className={s.horizontal}>
        {prompt.operands[0]} {prompt.operator === "-" ? "−" : prompt.operator}{" "}
        {prompt.operands[1]} = <span className={s.blank} aria-label="답란" />
      </span>
    );
  return (
    <span
      className={s.vertical}
      aria-label={`${prompt.operands[0]} ${prompt.operator} ${prompt.operands[1]}`}
    >
      <span>{prompt.operands[0]}</span>
      <span>
        <i>{prompt.operator === "-" ? "−" : prompt.operator}</i>
        {prompt.operands[1]}
      </span>
      <span className={s.verticalBlank} aria-label="답란" />
    </span>
  );
}

function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

/** A4 boundaries and numbering are shared by the screen preview and print portal. */
export function arithmeticPaperPages({
  sheet,
  title,
  academyName = "오늘 수학",
  mode,
  density,
}: {
  sheet: ArithmeticSheetPayload;
  title: string;
  academyName?: string;
  mode: ArithmeticPaperMode;
  density: ArithmeticDensity;
}) {
  const problems = listArithmeticProblemViews(sheet);
  const answers = listArithmeticAnswerViews(sheet);
  const parts = [
    ...(mode === "answers"
      ? []
      : sheet.rounds.flatMap((round) =>
          chunks(
            problems.filter((item) => item.round === round.round),
            density,
          ).map((items) => ({
            kind: "questions" as const,
            round: round.round,
            items,
          })),
        )),
    ...(mode === "questions"
      ? []
      : sheet.rounds.flatMap((round) =>
          chunks(
            answers.filter((item) => item.round === round.round),
            100,
          ).map((items) => ({
            kind: "answers" as const,
            round: round.round,
            items,
          })),
        )),
  ];
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
                className={s.questions}
                style={
                  {
                    "--columns": density === 12 ? 2 : density === 24 ? 3 : 4,
                    "--rows": density === 12 ? 6 : density === 24 ? 8 : 10,
                  } as CSSProperties
                }
                data-density={density}
              >
                {part.items.map((item) => (
                  <div className={s.item} key={item.number}>
                    <b>{item.number}</b>
                    <ArithmeticExpression prompt={item.prompt} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={s.answers}>
                {part.items.map((item) => (
                  <div key={item.number}>
                    <b>{item.number}</b>
                    <span>{item.answer}</span>
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
