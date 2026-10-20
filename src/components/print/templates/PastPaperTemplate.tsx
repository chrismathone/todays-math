import { memo } from "react";

import { A4Page } from "@/components/print/A4Page";
import type { TestPrintProblem } from "@/components/print/types";
import { isSubjective } from "@/lib/print/pastPaperLayout";
import { DescriptiveScore } from "@/components/print/DescriptiveScore";

import styles from "../PastPaper.module.css";
import { ProblemBody } from "./ProblemBody";

/**
 * **기출 시험지 2단 지면** — Wire C(머리띠형) · Hi-fi H2(금색 톤 띠).
 * 원장님이 2026-09-05 에 두 단계를 다 확정하셨다(D-07 · 절대 규칙 1).
 *
 * ## 🔴 이 컴포넌트는 **단을 나누지 않는다**
 *
 * 어느 문항이 어느 단에 앉는지는 `packColumns` 가 이미 정해서 넘긴다. 지면이 스스로
 * 흘리면(`column-count`) 브라우저가 셋째 단을 만들어 **문항이 조용히 사라진다** —
 * 시안에서 실제로 문6 이 그렇게 없어졌고, 지면은 반쯤 빈 것처럼 보였다.
 * 여기서는 받은 그대로 그린다. 그래서 「몇 문항이 지면에 있나」가 데이터로 셀 수 있다.
 *
 * ## 본문은 한 경로로만 그린다
 *
 * 발문·보기·그림은 `ProblemBody`(→ `PaperProblemView`) 하나를 거친다. 자습 지면과
 * **같은 컴포넌트**라, 렌더 규칙이 두 벌이 되지 않는다.
 */
export interface PastPaperMeta {
  academyName: string;
  /** 시험지 제목 — 「JH중 3학년 · 2학기 중간고사 대비」. */
  title: string;
  /** 머리말 둘째 줄 — 「삼각비 ~ 원주각 · 100점」. */
  subtitle: string;
}

interface PastPaperTemplateProps {
  meta: PastPaperMeta;
  page: number;
  /** 단마다의 문항. 길이가 곧 단 수다 — 지면이 스스로 나누지 않는다. */
  columns: TestPrintProblem[][];
  /** 문항 id → 지면에 찍을 번호(원본 시험지의 문항 번호). */
  numberOf: (problem: TestPrintProblem) => number;
  /** 문항 id → 배점. 기출·예측 지면은 배점을 찍는다(D-41). */
  scoreOf: (problem: TestPrintProblem) => number | null;
  /**
   * 한 단을 통째로 써도 안 들어가는 문항의 id. **화면에서만** 점선으로 표시한다 —
   * 종이에는 안 나간다. 「넘친다」를 알리는 것은 판정기의 몫이고, 여기서는
   * 검수하는 사람이 어느 문항인지 눈으로 찾게만 한다.
   */
  tooTallIds?: ReadonlySet<string>;
}

/*
 * 🔴 **서술형 답란을 안 그린다** — 원장님 확정 2026-09-05(답안지 별도).
 *    원본 문18 이 「단, **답안지에** 그림을 그려서 설명할 것」이라 적는다. 원본 시험이
 *    서술형 답을 별도 답안지로 받았으므로 문제지에 답란을 두면 다른 물건이 된다.
 *    소문항도 안 자른다 — 자를 이유(답란)가 사라졌고, 자르면 자와 지면이 **같은
 *    규칙을 두 벌** 들어야 한다.
 *
 * 🔴 `isSubjective` 는 `@/lib/print/pastPaperLayout` 에 있다. 이 파일은 CSS 모듈을
 *    물고 있어 node 에서 못 부르므로, 자가 그 판단을 **옮겨 적지 않게** 밖에 둔다.
 */

export const PastPaperTemplate = memo(function PastPaperTemplate({
  meta,
  page,
  columns,
  numberOf,
  scoreOf,
  tooTallIds,
}: PastPaperTemplateProps) {
  const isFirstPage = page === 1;

  return (
    <A4Page className={styles.page} kind="questions" pageNumber={page}>
      {isFirstPage ? (
        <header className={styles.masthead}>
          <div className={styles.mastLeft}>
            <div className={styles.academy}>{meta.academyName}</div>
            <div className={styles.mastEn}>PAST PAPER</div>
          </div>
          <div className={styles.mastMid}>
            <h1 className={styles.paperTitle}>{meta.title}</h1>
            <div className={styles.paperSub}>{meta.subtitle}</div>
          </div>
          <div className={styles.mastRight}>
            <div>이름 ____________</div>
            <div>반 ________</div>
          </div>
        </header>
      ) : (
        <header className={styles.contHead}>
          <span>
            {meta.academyName} · {meta.title}
          </span>
          <span>p. {page}</span>
        </header>
      )}

      <div className={styles.columns}>
        {columns.map((items, columnIndex) => (
          <div className={styles.column} key={columnIndex}>
            {items.map((problem) => {
              const descriptive =
                Boolean(problem.nativeDescriptive) ||
                problem.questionType === "서술형" ||
                problem.questionType === "descriptive";
              const score = descriptive
                ? (problem.nativeDescriptive?.rubric.totalPoints ??
                  scoreOf(problem))
                : null;
              const subjective = isSubjective(problem.questionType);
              return (
                <article
                  className={[
                    styles.item,
                    tooTallIds?.has(problem.id) ? styles.tooTall : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={problem.id}
                >
                  <div className={styles.bandRow}>
                    <span className={styles.num}>
                      <span className={styles.numWord}>문</span>{" "}
                      {numberOf(problem)}
                    </span>
                    {score === null ? null : (
                      <DescriptiveScore points={score} />
                    )}
                    {subjective ? (
                      <span className={styles.kind}>
                        {problem.questionType}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.body}>
                    <ProblemBody problem={problem} />
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </A4Page>
  );
});
