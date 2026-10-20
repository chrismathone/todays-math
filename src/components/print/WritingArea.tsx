import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import styles from "./WritingArea.module.css";

export interface WritingAreaProps extends HTMLAttributes<HTMLDivElement> {
  pattern: "grid" | "lines" | "blank";
  /** Fixed-height paper budget; omit and use fill/minHeightMm for flexible forms. */
  heightMm?: number;
  minHeightMm?: number;
  fill?: boolean;
  gridSizeMm?: number;
  lineHeightMm?: number;
  /** CSS lengths override the mm pitches without unit conversion/rounding. */
  gridSize?: string;
  lineHeight?: string;
  gridColor?: string;
  lineColor?: string;
  linePosition?: "top" | "bottom";
  /** One div, no frame or layout rules. The caller owns size, flex and borders. */
  surface?: boolean;
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
  gridSize,
  lineHeight,
  gridColor,
  lineColor,
  linePosition = "top",
  surface = false,
  heading,
  sections,
  label,
  className,
  style,
  children,
  ...attributes
}: WritingAreaProps) {
  const areaStyle = {
    "--writing-height": heightMm === undefined ? "auto" : `${heightMm}mm`,
    "--writing-min-height": `${minHeightMm}mm`,
    "--writing-grid-size": gridSize ?? `${gridSizeMm}mm`,
    "--writing-line-height": lineHeight ?? `${lineHeightMm}mm`,
    ...(gridColor === undefined ? {} : { "--writing-grid": gridColor }),
    ...(lineColor === undefined ? {} : { "--writing-light": lineColor }),
    ...style,
  } as CSSProperties;
  const patternClass = [
    styles[pattern],
    pattern === "lines" && linePosition === "bottom" && styles.linesBottom,
  ]
    .filter(Boolean)
    .join(" ");
  if (surface) {
    return (
      <div
        {...attributes}
        className={[styles.surface, patternClass, className]
          .filter(Boolean)
          .join(" ")}
        style={areaStyle}
        aria-label={label}
        data-writing-area
        data-pattern={pattern}
      >
        {children}
      </div>
    );
  }
  return (
    <section
      {...attributes}
      className={[styles.root, className].filter(Boolean).join(" ")}
      aria-label={label ?? "답을 쓰는 공간"}
      style={areaStyle}
      data-fill={fill || undefined}
    >
      {heading !== undefined && <div className={styles.heading}>{heading}</div>}
      <div
        className={`${styles.area} ${sections?.length ? "" : patternClass}`}
        data-writing-area
        data-pattern={pattern}
        data-height-mm={heightMm}
      >
        {sections?.map((section, i) => (
          <div
            key={i}
            className={`${styles.section} ${patternClass}`}
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
