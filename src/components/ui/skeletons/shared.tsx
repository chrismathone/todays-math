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
  ["/", "메인"],
  ["/classes", "반"],
  ["/problems", "문제은행"],
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
      <header className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b-[3px] border-ink px-[26px] pt-[19px] pb-[15px]">
        <span className="flex shrink-0 items-baseline whitespace-nowrap">
          <Link
            aria-current={tab === "math" ? "page" : undefined}
            className={`inline-flex items-center gap-2 text-[28.5px] font-black tracking-[-0.5px] ${tab === "math" ? "text-ink" : "text-text-3"}`}
            href="/"
          >
            <TodayMathMark size={32} />
            오늘의수학
          </Link>
          <span
            aria-hidden="true"
            className="mx-[7px] text-[28.5px] text-[#C2C2C0]"
          >
            │
          </span>
          <Link
            aria-current={tab === "exam" ? "page" : undefined}
            className={`text-[28.5px] font-black tracking-[-0.5px] ${tab === "exam" ? "text-ink" : "text-text-3"}`}
            href="/exam"
          >
            오늘의시험
          </Link>
        </span>
        <Skeleton className="h-4 w-28 shrink-0" />
        <nav
          aria-label="화면을 불러오는 동안 사용할 수 있는 메뉴"
          className="ml-auto flex shrink-0 items-center gap-5 whitespace-nowrap text-[17.25px] font-bold"
        >
          {NAV.map(([href, label]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
          <span aria-hidden="true" className="text-[#C2C2C0]">
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
