import type { PrintOptions } from "../types";

/** Print-safe vector rules and board fill, shared by preview and exported pages. */
export function SolvingArea({
  style,
}: {
  style: Exclude<PrintOptions["solvingArea"], "off">;
}) {
  return (
    <div
      data-solving-area={style}
      aria-label="오른쪽 풀이 공간"
      style={{
        minWidth: 0,
        minHeight: 0,
        position: "relative",
        border: "1px solid #b8c1bc",
        boxSizing: "border-box",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <svg
        aria-hidden="true"
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
      >
        <rect
          width="100%"
          height="100%"
          fill={style === "chalkboard" ? "#254c40" : "#ffffff"}
        />
        {style === "ruled" &&
          Array.from({ length: 48 }, (_, i) => (
            <line
              key={i}
              x1="10"
              x2="100%"
              y1={(i + 1) * 24}
              y2={(i + 1) * 24}
              stroke="#c2ceda"
              strokeWidth="0.7"
            />
          ))}
        {style === "chalkboard" && (
          <rect
            x="7"
            y="7"
            width="calc(100% - 14px)"
            height="calc(100% - 14px)"
            rx="2"
            fill="none"
            stroke="#c6d8cf"
            strokeOpacity="0.6"
          />
        )}
      </svg>
    </div>
  );
}
