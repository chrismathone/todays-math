import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { practiceProblemList } from "@/lib/math/practiceProblemLayout";
import styles from "./practice-problem-text.module.css";

/** One shared reading layout for elementary, middle and completed-stage replay. */
export function PracticeProblemText({ content }: { content: string }) {
  const list = practiceProblemList(content);
  return (
    <div className={styles.content} data-practice-problem-text>
      {list ? (
        <>
          {list.introduction ? (
            <MarkdownRenderer content={list.introduction} />
          ) : null}
          <ul
            className={`${styles.items} ${list.compact ? styles.compact : ""}`}
            aria-label="문제에 주어진 항목"
            data-problem-items
          >
            {list.items.map((item, index) => (
              <li key={index} className={styles.item}>
                <MarkdownRenderer content={item} inline />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <MarkdownRenderer content={content} />
      )}
    </div>
  );
}
