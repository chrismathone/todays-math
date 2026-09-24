import { AppChrome } from "@/components/chrome/AppChrome";

import { Skeleton, SkeletonText } from "../Skeleton";

export function Status({ label }: { label: string }) {
  return (
    <span aria-label={label} className="sr-only" role="status">
      {label}
    </span>
  );
}

export function FormFieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-1 h-2.5 w-12" />
      <Skeleton className={`h-11 ${wide ? "w-full" : "w-64 max-w-full"}`} />
    </div>
  );
}

export function TableRows({
  columns = 4,
  rows = 5,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div aria-hidden="true" className="border-t-[2.5px] border-ink">
      {Array.from({ length: rows }, (_, row) => (
        <div
          className="grid min-h-14 items-center gap-5 border-b border-divider px-2.5"
          key={row}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton
              className={`h-3 ${column === 0 ? "w-3/4" : column === columns - 1 ? "w-1/2" : "w-2/3"}`}
              key={column}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MastheadSkeleton({
  children,
  tab = "math",
  activeNav,
  currentLabel,
}: {
  children: React.ReactNode;
  tab?: "math" | "exam";
  activeNav?: "main" | "classes" | "problems" | "studio";
  currentLabel?: string;
}) {
  return (
    <div aria-busy="true">
      <Status label="화면을 불러오는 중" />
      <AppChrome tab={tab} activeNav={activeNav} currentLabel={currentLabel}>
        {children}
      </AppChrome>
    </div>
  );
}

export { Skeleton, SkeletonText };
