"use client";

import type { ExplorerFeedback } from "@/contracts/mathExplorers.contract";
import { ExplorerMath } from "./ExplorerMath";
import s from "./math-explorers.module.css";

/**
 * 뜻과 해설 — 본 카드 창과 보충 카드 창(D-147)이 같은 하나를 쓴다(«모든 화면 일치»).
 * `MathText` 는 div 를 내므로 카드 글은 p 가 아니라 `solutionLine` div 에 담는다
 * (`.solutionContent p` 와 같은 규칙이 이 클래스에도 걸린다).
 */
export function ExplorerSolution({
  solution,
}: {
  solution: NonNullable<ExplorerFeedback["solution"]>;
}) {
  return (
    <div className={s.solutionContent} data-explorer-solution="true">
      <h3>뜻 다시 보기</h3>
      <div className={`${s.readingDefinition} ${s.solutionLine}`}>
        <ExplorerMath text={solution.definition} />
      </div>
      <div className={s.solutionLine}>
        <ExplorerMath text={solution.note} />
      </div>
      <h3>해설</h3>
      <div className={s.solutionLine}>
        <ExplorerMath text={solution.explanation} />
      </div>
      <div className={s.solutionExamples}>
        {[true, false].map((correct) => (
          <div key={String(correct)}>
            <strong>{correct ? "해당하는 예" : "해당하지 않는 예"}</strong>
            {solution.examples
              .filter((example) => example.correct === correct)
              .map((example, index) => (
                <div key={index} className={s.solutionLine}>
                  <ExplorerMath text={example.label} />
                </div>
              ))}
          </div>
        ))}
      </div>
      <div className={`${s.statement} ${s.solutionLine}`}>
        <ExplorerMath text={solution.statement} />
        <strong>
          {solution.truth ? "맞는 설명이에요." : "맞지 않는 설명이에요."}
        </strong>
      </div>
    </div>
  );
}
