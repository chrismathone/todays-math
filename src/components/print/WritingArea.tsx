import type { CSSProperties, ReactNode } from "react";
import styles from "./WritingArea.module.css";

export interface WritingAreaProps {
  pattern: "grid" | "lines" | "blank";
  /** Fixed-height paper budget; omit and use fill/minHeightMm for flexible forms. */
  heightMm?: number;
  minHeightMm?: number;
  fill?: boolean;
  gridSizeMm?: number;
  lineHeightMm?: number;
  heading?: ReactNode;
  sections?: readonly { label: string; heightMm: number }[];
  label?: string;
}

/** Physical writing surface. No question, rubric or concept-blank rules live here. */
export function WritingArea({
  pattern,
  heightMm,
  minHeightMm = 0,
  fill = false,
  gridSizeMm = 4,
  lineHeightMm = 8,
  heading,
  sections,
  label = "답을 쓰는 공간",
}: WritingAreaProps) {
  const areaStyle = {
    "--writing-height": heightMm === undefined ? "auto" : `${heightMm}mm`,
    "--writing-min-height": `${minHeightMm}mm`,
    "--writing-grid-size": `${gridSizeMm}mm`,
    "--writing-line-height": `${lineHeightMm}mm`,
  } as CSSProperties;
  return (
    <section
      className={styles.root}
      aria-label={label}
      style={areaStyle}
      data-fill={fill || undefined}
    >
      {heading !== undefined && <div className={styles.heading}>{heading}</div>}
      <div
        className={`${styles.area} ${sections?.length ? "" : styles[pattern]}`}
        data-writing-area
        data-pattern={pattern}
        data-height-mm={heightMm}
      >
        {sections?.map((section, i) => (
          <div
            key={i}
            className={`${styles.section} ${styles[pattern]}`}
            data-writing-section
            data-height-mm={section.heightMm}
            style={{ height: `${section.heightMm}mm` }}
          >
            <span className={styles.label}>{section.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
