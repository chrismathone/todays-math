import type { ReactNode } from "react";

type SkeletonProps = {
  className?: string;
  tone?: "side" | "divider" | "ink";
};

const TONE_CLASS = {
  side: "bg-side",
  divider: "bg-divider",
  ink: "bg-ink",
} as const;

export function Skeleton({ className = "", tone = "side" }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse motion-reduce:animate-none ${TONE_CLASS[tone]} ${className}`}
    />
  );
}

type AppChromeSkeletonProps = {
  children: ReactNode;
  showRemaining?: boolean;
  showViewToggle?: boolean;
};

export function AppChromeSkeleton({
  children,
  showRemaining = false,
  showViewToggle = false,
}: AppChromeSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="min-h-full bg-canvas text-ink"
      role="status"
    >
      <span className="sr-only">페이지를 불러오는 중입니다.</span>
      <div aria-hidden="true">
        <header className="flex items-baseline gap-6 overflow-hidden border-b-[3px] border-ink px-[26px] pt-[19px] pb-[15px]">
          <span className="flex shrink-0 items-baseline gap-[7px]">
            <Skeleton className="h-8 w-[118px]" />
            <Skeleton className="h-7 w-3" tone="divider" />
            <Skeleton className="h-8 w-[118px]" />
          </span>
          <Skeleton className="h-4 w-[112px] shrink-0" />
          {showRemaining ? (
            <Skeleton className="h-5 w-[92px] shrink-0" />
          ) : null}
          <nav className="ml-auto flex shrink-0 items-center gap-5">
            {showViewToggle ? <Skeleton className="h-7 w-[86px]" /> : null}
            <Skeleton className="h-[17px] w-9" />
            <Skeleton className="h-[17px] w-7" />
            <Skeleton className="h-[17px] w-[58px]" />
            <Skeleton className="h-[17px] w-px" tone="divider" />
            <Skeleton className="h-[17px] w-[54px]" />
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
