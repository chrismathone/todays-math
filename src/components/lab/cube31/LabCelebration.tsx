import type { CSSProperties } from "react";
import type { LabCelebration as Celebration } from "@/lib/lab/cube31/momentum";
import styles from "./LabCelebration.module.css";

export default function LabCelebration({ result }: { result: Celebration }) {
  const title = result.review
    ? "한 번 더, 확실하게!"
    : result.milestone
      ? `${result.total}개 해결!`
      : result.streak >= 2
        ? `${result.streak}연속 정답!`
        : result.clean
          ? "한 번에 해결!"
          : "끝까지 해냈어!";
  return (
    <div
      className={styles.burst}
      data-milestone={result.milestone}
      aria-hidden="true"
    >
      <div className={styles.halo} />
      {Array.from({ length: 12 }, (_, index) => (
        <i
          key={index}
          className={styles.particle}
          style={
            {
              "--angle": `${index * 30}deg`,
              "--travel": `${86 + (index % 3) * 24}px`,
              "--delay": `${(index % 3) * 22}ms`,
              "--color": ["#4474ff", "#00b59c", "#ffc44d", "#9877ef"][
                index % 4
              ],
            } as CSSProperties
          }
        />
      ))}
      <div className={styles.medal}>
        <svg viewBox="0 0 48 48" fill="none">
          <path
            d="m12 25 8 8 17-19"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <strong>{title}</strong>
      <span>
        {result.review ? "생각이 더 단단해졌어요" : "좋아, 다음 발견으로!"}
      </span>
    </div>
  );
}
