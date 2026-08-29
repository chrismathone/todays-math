import { AppChromeSkeleton, Skeleton } from "../_loading/SkeletonPrimitives";

const CLASS_ROWS = [0, 1, 2, 3];
const STUDENT_ROWS = [0, 1, 2, 3, 4];
const UNIT_ROWS = [0, 1, 2, 3, 4, 5];

export default function ClassesLoading() {
  return (
    <AppChromeSkeleton>
      <main className="px-[26px] py-5">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
          <section>
            <div className="grid grid-cols-[minmax(0,1fr)_120px] border-b-[2.5px] border-ink px-2.5 py-2">
              <Skeleton className="h-2.5 w-8" />
              <Skeleton className="h-2.5 w-8" />
            </div>
            {CLASS_ROWS.map((row) => (
              <div
                className="grid min-h-[61px] grid-cols-[minmax(0,1fr)_120px] items-center border-b border-divider px-2.5 py-2"
                key={row}
              >
                <Skeleton className="h-[15px] w-32 max-w-[80%]" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-11 min-w-0 flex-1" />
              <Skeleton className="h-11 w-24" />
              <Skeleton className="h-11 w-[68px]" />
            </div>
          </section>

          <div>
            <Skeleton className="h-[3px] w-full" tone="ink" />
            <Skeleton className="mt-1.5 mb-2 h-2.5 w-12" />
            {STUDENT_ROWS.map((row) => (
              <div className="border-b border-divider py-2.5" key={row}>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-11 min-w-0 flex-1" />
              <Skeleton className="h-11 w-16" />
            </div>
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="grid grid-cols-3 border border-divider">
            {[0, 1, 2].map((column) => (
              <section
                className="min-w-0 border-r border-divider last:border-r-0"
                key={column}
              >
                <div className="border-b border-divider px-2 py-2">
                  <Skeleton className="h-2.5 w-14" />
                </div>
                {UNIT_ROWS.map((row) => (
                  <div className="flex min-h-11 items-center px-2" key={row}>
                    <Skeleton
                      className={`h-3 ${column === 2 ? "w-4/5" : "w-1/2"}`}
                    />
                  </div>
                ))}
              </section>
            ))}
          </div>
        </section>
      </main>
    </AppChromeSkeleton>
  );
}
