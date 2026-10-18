import type { ComponentProps } from "react";
import type { BoxQuoteCard } from "./BoxQuoteCard";

/** 서버 HTML 전용 정적 선택. 원문 열 수를 쓰며 훅·DOM 측정은 실행하지 않는다. */
export function StaticBoxQuoteCard({
  className,
  label,
  columns,
  sideBySide,
  gridClassName,
  itemClassName,
  items,
}: ComponentProps<typeof BoxQuoteCard>) {
  return (
    <div
      data-box-card
      data-side-by-side={sideBySide ? "" : undefined}
      className={className}
    >
      {label === null ? null : (
        <div
          data-box-header
          className="mb-1 text-center font-normal leading-normal [&>p]:my-0"
        >
          {label}
        </div>
      )}
      {items.length ? (
        <div
          className={gridClassName}
          data-hwpx-grid={columns > 1 ? "" : undefined}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item, index) => (
            <div key={index} data-box-item className={itemClassName}>
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
