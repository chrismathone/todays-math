import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";

import { AppChromeSkeleton, Skeleton } from "../_loading/SkeletonPrimitives";

const FILTERS = [1, 1, 0, 0, 0, 0, 0, 1] as const;
const CARDS = [0, 1, 2, 3, 4, 5];

export default function ProblemsLoading() {
  return (
    <AppChromeSkeleton>
      <main className="px-[26px] py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Skeleton className="h-[15px] w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-16" />
            <Skeleton className="h-11 w-16" />
          </div>
        </div>

        <div
          className="mt-4 grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, 12rem)" }}
        >
          {FILTERS.map((wide, index) => (
            <div
              className="flex min-w-0 flex-col gap-1"
              key={index}
              style={wide ? { gridColumn: "span 2" } : undefined}
            >
              <Skeleton className="h-2.5 w-12" />
              <div className="flex h-11 items-center border border-control bg-white px-3">
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-3 w-24" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-11 w-16" />
          </div>
        </div>

        <section
          className="mt-4 grid gap-6 print:block"
          style={{
            gridTemplateColumns: `repeat(auto-fill, min(100%, ${PROBLEM_CARD_WIDTH}))`,
          }}
        >
          {CARDS.map((card) => (
            <article
              className="flex min-h-[330px] flex-col overflow-hidden rounded-2xl border border-divider bg-surface"
              key={card}
            >
              <div className="flex items-center gap-2 border-b border-divider px-6 py-4">
                <Skeleton className="h-8 w-8 shrink-0" tone="ink" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="ml-auto h-2.5 w-28" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="mt-3 h-3 w-[92%]" />
                <Skeleton className="mt-3 h-3 w-4/5" />
                <Skeleton className="mt-7 h-24 w-3/5 self-center" />
                <div className="mt-auto flex gap-2 pt-6">
                  <Skeleton className="h-11 w-16" />
                  <Skeleton className="h-11 w-16" />
                  <Skeleton className="ml-auto h-11 w-28" />
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppChromeSkeleton>
  );
}
