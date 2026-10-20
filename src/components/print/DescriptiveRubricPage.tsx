import { MathText } from "@/components/math/MathText";
import type { DescriptivePrintItem } from "@/lib/print/descriptive";
import { A4Page } from "./A4Page";
import { DescriptiveScore } from "./DescriptiveScore";
import styles from "./DescriptivePaper.module.css";

export function DescriptiveRubricPage({
  items,
  title,
  page = 1,
}: {
  items: DescriptivePrintItem[];
  title: string;
  page?: number;
}) {
  const total = items.reduce(
    (sum, item) => sum + item.data.rubric.totalPoints,
    0,
  );
  return (
    <A4Page
      kind="answers"
      pageNumber={page}
      className={styles.page}
      ariaLabel={`서술형 채점표 ${page}쪽`}
    >
      <header className={styles.header}>
        <div>
          <p>오늘 수학 · 교사용 서술형 채점표</p>
          <h2>{title}</h2>
        </div>
        <p>이름 __________ · 반 ______</p>
      </header>
      <div className={styles.rubrics} data-descriptive-rubrics>
        {items.map(({ number, data }) => (
          <section
            className={styles.rubric}
            key={number}
            data-dense-rubric={
              data.rubric.criteria.length > 3 ? "true" : undefined
            }
          >
            <h3>
              문 {number} · 서술형{" "}
              <DescriptiveScore points={data.rubric.totalPoints} />
            </h3>
            <div className={styles.modelAnswer}>
              <MathText as="div" text={data.modelAnswer} />
            </div>
            <table>
              <caption>문 {number}의 기준별 채점표</caption>
              <thead>
                <tr>
                  <th scope="col">볼 증거</th>
                  <th scope="col">배점</th>
                  <th scope="col">만점 · 부분 · 0점</th>
                  <th scope="col">기록</th>
                </tr>
              </thead>
              <tbody>
                {data.rubric.criteria.map((criterion) => (
                  <tr
                    key={criterion.criterionId}
                    data-criterion={criterion.criterionId}
                  >
                    <th scope="row">
                      <MathText text={criterion.evidence} />
                    </th>
                    <td>{criterion.points}점</td>
                    <td>
                      <div>
                        만점: <MathText text={criterion.scoring.full} />
                      </div>
                      {criterion.scoring.partial.map((part) => (
                        <div key={part.points}>
                          {part.points}점: <MathText text={part.condition} />
                        </div>
                      ))}
                      <div>
                        0점: <MathText text={criterion.scoring.zero} />
                      </div>
                    </td>
                    <td>
                      <div className={styles.marks}>
                        {[
                          criterion.points,
                          ...criterion.scoring.partial.map(
                            (part) => part.points,
                          ),
                          0,
                        ].map((points) => (
                          <span key={points}>□ {points}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.notes}>
              {data.rubric.criteria.map((criterion, i) => (
                <div key={criterion.criterionId}>
                  <div>
                    <strong>기준 {i + 1}</strong> ·{" "}
                    <MathText text={criterion.expected} />
                  </div>
                  <div>
                    허용 다른 풀이:{" "}
                    <MathText text={criterion.alternatives.join(" / ")} />
                  </div>
                  <div>
                    흔한 오류: <MathText text={criterion.errors.join(" / ")} />
                  </div>
                  {criterion.carryForward.fromFactKeys.length > 0 && (
                    <div>
                      선행 오류:{" "}
                      <MathText text={criterion.carryForward.condition} /> — 앞
                      수치 오류를 뒤 기준의 방법 점수에서 다시 감점하지 않는다.
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className={styles.subtotal}>
              문 {number} 소계 ______ / {data.rubric.totalPoints}점
            </p>
          </section>
        ))}
        <p className={styles.total}>
          <strong>서술형 합계 ______ / {total}점</strong>
        </p>
      </div>
      <footer className={styles.footer}>교사용 채점표 · p. {page}</footer>
    </A4Page>
  );
}
