import type { CSSProperties, HTMLAttributes } from "react";

type SkeletonProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  style?: CSSProperties;
};

function classes(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

/** A quiet, layout-preserving placeholder. Keep meaningful loading copy outside it. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={classes("skeleton", className)}
      {...props}
    />
  );
}

export function SkeletonCircle({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={classes("aspect-square shrink-0 rounded-full", className)}
      {...props}
    />
  );
}

export function SkeletonText({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  const widths = ["100%", "92%", "74%", "86%", "63%"];

  return (
    <span aria-hidden="true" className={classes("grid gap-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          className="h-3"
          key={index}
          style={{ width: widths[index % widths.length] }}
        />
      ))}
    </span>
  );
}
