import { AppChromeSkeleton, Skeleton } from "./_loading/SkeletonPrimitives";

const ROWS = [0, 1, 2, 3];

export default function MainLoading() {
  return (
    <AppChromeSkeleton showRemaining showViewToggle>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <section className="border-b border-divider px-5 py-3">
            <Skeleton className="h-2.5 w-36" />
            <div className="mt-1.5 flex flex-wrap items-end gap-x-6 gap-y-1">
              <Skeleton className="h-[26px] w-32" />
              <Skeleton className="h-[26px] w-28" />
              <Skeleton className="ml-auto h-8 w-24" />
            </div>
            <Skeleton className="mt-2 h-1.5 w-full" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </section>

          {ROWS.map((row) => (
            <article
              className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-4 border-2 border-transparent border-b-divider px-6 py-3"
              key={row}
            >
              <div className="grid min-h-11 grid-cols-[44px_minmax(0,1fr)_232px] items-center gap-4">
                <Skeleton className="h-6 w-5" />
                <span className="min-w-0">
                  <Skeleton className="h-[15px] w-28" />
                  <Skeleton className="mt-2 h-3 w-44 max-w-full" />
                </span>
                <span className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((stage) => (
                    <Skeleton className="h-2 flex-1" key={stage} />
                  ))}
                </span>
              </div>
              <Skeleton className="h-11 w-full" />
            </article>
          ))}
        </div>

        <aside className="w-[250px] shrink-0 border-l-[3px] border-ink bg-surface px-5 py-4">
          <Skeleton className="h-[3px] w-full" tone="ink" />
          <Skeleton className="mt-1.5 h-2.5 w-20" />
          <Skeleton className="mt-4 h-3 w-24" />
          <Skeleton className="mt-2 h-4 w-40" />
          <div className="mt-3 flex items-center gap-1">
            <Skeleton className="h-11 min-w-11" />
            <Skeleton className="h-2.5 flex-1" />
            <Skeleton className="h-11 min-w-11" />
          </div>
          <Skeleton className="mt-2 h-11 w-full" />
          <Skeleton className="mt-5 h-[3px] w-full" tone="ink" />
          <Skeleton className="mt-1.5 h-2.5 w-16" />
          <div className="mt-3 flex gap-[18px]">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-20" />
          </div>
        </aside>
      </div>
    </AppChromeSkeleton>
  );
}
