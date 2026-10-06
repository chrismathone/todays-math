import type { FadingFigure } from "@/lib/fading/figures";
import { FadingIcon } from "./FadingIcon";
import { FadingMath } from "./FadingMath";
import s from "./fading.module.css";

/** 이름표의 답은 읽기·완료 뒤 대조에만 DOM으로 만든다. */
export function FadingFigureView({
  figure,
  answers = false,
}: {
  figure: FadingFigure | null;
  answers?: boolean;
}) {
  if (!figure) return null;
  return (
    <section className={s.figureCard} aria-label="개념 그림">
      <div className={s.sectionTitle}>
        <h2>
          <FadingIcon name="erase" />{" "}
          {answers ? "개념의 구조" : "이름표를 비운 개념 그림"}
        </h2>
        <span className={s.sectionTag}>
          {answers ? "정독 · 대조" : "이름표 빈칸"}
        </span>
      </div>
      <div className={s.figureCanvas}>
        <svg
          viewBox={figure.viewBox}
          role="img"
          aria-label={
            answers ? "이름표가 있는 개념 그림" : "이름표가 빈 개념 그림"
          }
        >
          <g dangerouslySetInnerHTML={{ __html: figure.svg }} />
          {figure.tags.map((tag, i) => (
            <g key={i}>
              <rect
                x={tag.x}
                y={tag.y}
                width={tag.w}
                height={18}
                rx={3}
                fill="#fff"
                stroke={answers ? "#006c4a" : "#8c9cb8"}
                strokeWidth={1}
                strokeDasharray={answers ? undefined : "3 2"}
              />
              {answers && (
                <foreignObject x={tag.x} y={tag.y} width={tag.w} height={18}>
                  <div className={s.figureAnswer}>
                    <FadingMath text={tag.answer} />
                  </div>
                </foreignObject>
              )}
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
