import type { DescriptivePrintItem } from "@/lib/print/descriptive";
import { A4Page } from "./A4Page";
import { DescriptiveAnswerArea } from "./DescriptiveAnswerArea";
import styles from "./DescriptivePaper.module.css";

/** Caller paginates whole answer areas; a question is never divided across sheets. */
export function DescriptiveAnswerSheet({
  items,
  title,
  page = 1,
}: {
  items: DescriptivePrintItem[];
  title: string;
  page?: number;
}) {
  return (
    <A4Page
      kind="questions"
      pageNumber={page}
      className={styles.page}
      ariaLabel={`서술형 답안지 ${page}쪽`}
    >
      <header className={styles.header}>
        <div>
          <p>오늘 수학 · 서술형 답안지</p>
          <h2>{title}</h2>
        </div>
        <p>이름 __________ · 반 ______</p>
      </header>
      <div className={styles.answerAreas}>
        {items.map((item) => (
          <DescriptiveAnswerArea key={item.number} {...item} standalone />
        ))}
      </div>
      <footer className={styles.footer}>서술형 답안지 · p. {page}</footer>
    </A4Page>
  );
}
