import styles from "./DescriptivePaper.module.css";

export function DescriptiveScore({ points }: { points: number }) {
  return (
    <span className={styles.score} data-descriptive-score>
      [{points}점]
    </span>
  );
}
