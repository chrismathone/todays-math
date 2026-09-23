import Link from "next/link";

import TodayMathMark from "@/components/brand/TodayMathMark";

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

const NAV = [
  ["/", "오늘의 작업"],
  ["/classes", "수업·학생 관리"],
  ["/problems", "시험지 만들기"],
  ["/studio", "자료 제작"],
] as const;

export function MastheadSkeleton({
  children,
  tab = "math",
}: {
  children: React.ReactNode;
  tab?: "math" | "exam";
}) {
  return (
    <div aria-busy="true" className="min-h-full bg-canvas text-ink">
      <Status label="화면을 불러오는 중" />
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-divider bg-surface px-5 py-3">
        <span className="flex shrink-0 flex-wrap items-center gap-y-2 whitespace-nowrap">
          <Link
            aria-current={tab === "math" ? "page" : undefined}
            className={`inline-flex items-center gap-2 text-2xl font-bold tracking-tight ${tab === "math" ? "text-ink" : "text-text-3"}`}
            href="/"
          >
            <TodayMathMark size={32} />
            오늘의수학
          </Link>
          <span aria-hidden="true" className="mx-3 text-xl text-divider">
            │
          </span>
          <Link
            aria-current={tab === "exam" ? "page" : undefined}
            className={`text-2xl font-bold tracking-tight ${tab === "exam" ? "text-ink" : "text-text-3"}`}
            href="/exam"
          >
            오늘의시험
          </Link>
        </span>
        <Skeleton className="h-4 w-28 shrink-0" />
        <nav
          aria-label="화면을 불러오는 동안 사용할 수 있는 메뉴"
          className="ml-auto flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold"
        >
          {NAV.map(([href, label]) => (
            <Link
              href={href}
              key={href}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-text-2 hover:bg-side hover:text-ink"
            >
              {label}
            </Link>
          ))}
          <span aria-hidden="true" className="text-divider">
            ·
          </span>
          <Skeleton className="h-4 w-16" />
        </nav>
      </header>
      {children}
    </div>
  );
}

export { Skeleton, SkeletonText };
