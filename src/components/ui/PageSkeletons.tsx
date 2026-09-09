import Link from "next/link";

import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton";

function LoadingLabel({ label = "화면을 불러오는 중" }: { label?: string }) {
  return <span className="sr-only">{label}</span>;
}

function MastheadSkeleton({
  children,
  tab = "math",
}: {
  children: React.ReactNode;
  tab?: "math" | "exam";
}) {
  return (
    <div aria-busy="true" className="min-h-full bg-canvas text-ink">
      <span aria-label="화면을 불러오는 중" className="sr-only" role="status">
        화면을 불러오는 중
      </span>
      <header className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b-[3px] border-ink px-[26px] pt-[19px] pb-[15px]">
        <span className="flex shrink-0 items-baseline whitespace-nowrap">
          <Link
            aria-current={tab === "math" ? "page" : undefined}
            className={`text-[28.5px] font-black tracking-[-0.5px] ${tab === "math" ? "text-ink" : "text-text-3"}`}
            href="/"
          >
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
          <Link href="/">메인</Link>
          <Link href="/classes">반</Link>
          <Link href="/problems">문제은행</Link>
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

function TableRows({
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

export function DailyReviewSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="오늘의 확인테스트를 불러오는 중"
      className="border-b border-divider px-5 py-3"
      role="status"
    >
      <Skeleton className="h-2.5 w-28" />
      <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
      <Skeleton className="skeleton-accent mt-2 h-1.5 w-full" />
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <MastheadSkeleton>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <DailyReviewSkeleton />
          <div aria-hidden="true" className="px-5 py-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                className={`mb-2 grid min-h-[70px] grid-cols-[42px_minmax(0,1fr)_150px_92px] items-center gap-3 border-2 px-3 ${index === 0 ? "border-ink shadow-[inset_5px_0_0_var(--blue)]" : "border-transparent"}`}
                key={index}
              >
                <Skeleton className="h-7 w-7" />
                <span>
                  <Skeleton className="h-4 w-32 max-w-full" />
                  <Skeleton className="skeleton-quiet mt-2 h-2.5 w-52 max-w-[85%]" />
                </span>
                <span className="flex gap-1">
                  {Array.from({ length: 5 }, (_, dot) => (
                    <SkeletonCircle className="h-3" key={dot} />
                  ))}
                </span>
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
        <aside
          aria-hidden="true"
          className="hidden w-[250px] shrink-0 border-l-[3px] border-ink bg-surface px-5 py-4 sm:block"
        >
          <Skeleton className="h-2.5 w-20" />
          <SkeletonText className="mt-5" lines={4} />
          <div className="mt-4 flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-8 w-8" />
          </div>
          <Skeleton className="mt-3 h-11 w-full" />
          <div className="mt-7 border-t-[3px] border-ink pt-3">
            <div className="flex gap-7">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        </aside>
      </div>
    </MastheadSkeleton>
  );
}

function FilterSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div
          className={index === 0 || index === 7 ? "col-span-2" : ""}
          key={index}
        >
          <Skeleton className="mb-1 h-2.5 w-10" />
          <div className="flex h-11 items-center border border-control bg-white px-3">
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProblemCardSkeleton({ index }: { index: number }) {
  return (
    <article
      aria-hidden="true"
      className="min-h-[290px] border border-divider bg-surface p-5"
    >
      <div className="flex items-center gap-2 border-b border-divider pb-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="ml-auto h-3 w-12" />
      </div>
      <div className="mt-5 flex gap-4">
        <Skeleton className="h-7 w-7 shrink-0" />
        <SkeletonText className="flex-1" lines={index % 2 === 0 ? 4 : 3} />
      </div>
      {index % 2 === 0 ? (
        <div className="mx-auto mt-5 grid h-16 w-28 place-items-center border border-divider">
          <Skeleton className="h-px w-20 rotate-[-18deg]" />
        </div>
      ) : null}
      <div className="mt-6 flex gap-2 border-t border-divider pt-3">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="ml-auto h-9 w-20" />
      </div>
    </article>
  );
}

export function ProblemCardLoadingSkeleton() {
  return <ProblemCardSkeleton index={0} />;
}

export function ReviewProblemCardLoadingSkeleton() {
  return (
    <article
      aria-busy="true"
      aria-label="문항을 불러오는 중"
      className="grid grid-cols-[38px_minmax(0,1fr)_80px] gap-4 border-t border-divider px-8 py-5"
      role="status"
    >
      <Skeleton className="h-6 w-6" />
      <SkeletonText lines={3} />
      <Skeleton className="h-9 w-20" />
    </article>
  );
}

export function ProblemPanelLoadingSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="문제 입력 화면을 불러오는 중"
      className="mt-4 border border-divider bg-surface p-4"
      role="status"
    >
      <Skeleton className="h-4 w-24" />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <FormFieldSkeleton wide />
        <FormFieldSkeleton wide />
      </div>
      <Skeleton className="mt-3 h-24 w-full" />
      <Skeleton className="mt-3 ml-auto h-11 w-20" />
    </section>
  );
}

export function ProblemTransformLoadingSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="변형 도구를 불러오는 중"
      className="mt-4 border-t border-divider pt-4"
      role="status"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="h-9 w-16" />
      </div>
    </section>
  );
}

export function ProblemGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="문제 목록을 불러오는 중" role="status">
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-14" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-14" />
        </div>
      </div>
      <section className="mt-4 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <ProblemCardSkeleton index={index} key={index} />
        ))}
      </section>
    </div>
  );
}

export function ProblemBankSkeleton() {
  return (
    <MastheadSkeleton>
      <main className="px-[26px] py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-16" />
            <Skeleton className="h-11 w-16" />
          </div>
        </div>
        <FilterSkeleton />
        <ProblemGridSkeleton />
      </main>
    </MastheadSkeleton>
  );
}

export function ClassManageSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="반 정보를 불러오는 중"
      className="px-[26px] py-5"
      role="status"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <section>
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_120px] gap-5 px-2.5">
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-10" />
          </div>
          <TableRows columns={2} rows={5} />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-20" />
          </div>
        </section>
        <aside aria-hidden="true">
          <div className="border-t-[3px] border-ink pt-2">
            <Skeleton className="h-2.5 w-14" />
          </div>
          {Array.from({ length: 6 }, (_, index) => (
            <div className="border-b border-divider py-3" key={index}>
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-16" />
          </div>
        </aside>
      </div>
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-3">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-px border border-divider bg-divider md:grid-cols-4">
          {Array.from({ length: 16 }, (_, index) => (
            <div className="h-12 bg-white p-3" key={index}>
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ClassesSkeleton() {
  return (
    <MastheadSkeleton>
      <ClassManageSkeleton />
    </MastheadSkeleton>
  );
}

export function ExamListSkeleton() {
  return (
    <MastheadSkeleton tab="exam">
      <main className="px-5 pt-4 pb-6">
        <div className="border-b border-divider pb-2">
          <Skeleton className="h-2.5 w-32" />
        </div>
        {Array.from({ length: 6 }, (_, index) => (
          <div
            aria-hidden="true"
            className="relative grid min-h-[78px] grid-cols-[44px_minmax(0,1fr)_96px] items-start gap-4 border-b border-divider py-3.5"
            key={index}
          >
            <span className="absolute inset-y-0 left-0 w-[5px] bg-[#d8e3ef]" />
            <Skeleton className="ml-[17px] h-7 w-7" />
            <span>
              <Skeleton className="h-4 w-52 max-w-[80%]" />
              <Skeleton className="skeleton-quiet mt-2 h-3 w-64 max-w-full" />
            </span>
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </main>
    </MastheadSkeleton>
  );
}

export function ExamDetailSkeleton() {
  return (
    <MastheadSkeleton tab="exam">
      <main className="px-5 pt-4 pb-8">
        <div className="flex items-baseline gap-4 border-b border-divider pb-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex items-center gap-3 py-4">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="flex flex-1 items-center gap-3" key={index}>
              <SkeletonCircle className="h-4" />
              {index < 3 ? <Skeleton className="h-px flex-1" /> : null}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-8 border-t border-divider pt-4 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, panel) => (
            <section key={panel}>
              <Skeleton className="h-3 w-14" />
              <div className="mt-2 border-t-2 border-ink">
                <TableRows columns={2} rows={4} />
              </div>
            </section>
          ))}
        </div>
        <section className="mt-7">
          <Skeleton className="mb-2 h-3 w-40" />
          <TableRows columns={5} rows={5} />
        </section>
      </main>
    </MastheadSkeleton>
  );
}

function FormFieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-1 h-2.5 w-12" />
      <Skeleton className={`h-11 ${wide ? "w-full" : "w-64 max-w-full"}`} />
    </div>
  );
}

export function TestSetupFieldsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="출제 설정을 불러오는 중"
      className="mt-6 grid gap-4"
      role="status"
    >
      <FormFieldSkeleton wide />
      <FormFieldSkeleton wide />
      <div className="flex gap-4 py-2">
        <SkeletonCircle className="h-4" />
        <Skeleton className="h-3 w-20" />
        <SkeletonCircle className="h-4" />
        <Skeleton className="h-3 w-24" />
      </div>
      <FormFieldSkeleton wide />
      <FormFieldSkeleton wide />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <FormFieldSkeleton wide key={index} />
        ))}
      </div>
      <Skeleton className="mt-2 h-11 w-full" />
    </div>
  );
}

export function TestSetupSkeleton() {
  return (
    <MastheadSkeleton>
      <main className="px-8 py-6">
        <Skeleton className="h-4 w-20" />
        <TestSetupFieldsSkeleton />
      </main>
    </MastheadSkeleton>
  );
}

export function TestReviewContentSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="시험 문항을 불러오는 중"
      className="flex min-h-[calc(100vh-70px)] flex-col"
      role="status"
    >
      <main className="flex-1 pb-20">
        <div className="flex items-center justify-between px-8 py-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <article
            aria-hidden="true"
            className="grid grid-cols-[38px_minmax(0,1fr)_80px] gap-4 border-t border-divider px-8 py-5"
            key={index}
          >
            <Skeleton className="h-6 w-6" />
            <SkeletonText lines={index % 2 === 0 ? 3 : 2} />
            <Skeleton className="h-9 w-20" />
          </article>
        ))}
      </main>
      <footer className="sticky bottom-0 flex items-center gap-4 border-t border-divider bg-side px-8 py-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto h-11 w-16" />
        <Skeleton className="h-11 w-16" />
      </footer>
    </div>
  );
}

export function TestReviewSkeleton() {
  return (
    <MastheadSkeleton>
      <TestReviewContentSkeleton />
    </MastheadSkeleton>
  );
}

/**
 * 계정 화면 — 로그인 2칸(이메일·비밀번호), 가입 3칸(+이름).
 *
 * ⚠️ 칸 수를 못 박지 않으면 **가입에서 한 칸이 튄다.** 스켈레톤의 값어치는
 *    「자리를 미리 잡아 둔다」는 것 하나뿐이라, 자리가 틀리면 오히려 흔들린다.
 *    `(auth)/loading.tsx` 는 무리 전체(로그인·가입)에 걸리므로 가입 쪽은
 *    `(auth)/signup/loading.tsx` 가 이 값을 3으로 덮는다.
 *    실제 칸은 `src/components/auth/AuthForm.tsx` 가 정한다 —
 *    거기에 칸을 더하면 여기도 같이 고쳐야 한다.
 */
export function AuthFormSkeleton({ fields = 2 }: { fields?: number } = {}) {
  return (
    <div
      aria-busy="true"
      aria-label="계정 화면을 불러오는 중"
      className="flex w-[360px] max-w-full flex-col gap-4"
      role="status"
    >
      <Skeleton className="h-4 w-20" />
      {Array.from({ length: fields }, (_, index) => (
        <FormFieldSkeleton key={index} wide />
      ))}
      <Skeleton className="h-11 w-full" />
      <Skeleton className="mx-auto h-3 w-32" />
    </div>
  );
}

export function OnboardingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="초기 설정 화면을 불러오는 중"
      className="w-full max-w-[960px]"
      role="status"
    >
      <LoadingLabel label="초기 설정 화면을 불러오는 중" />
      <Skeleton className="mb-8 h-4 w-44" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <section className={index > 0 ? "opacity-60" : ""} key={index}>
            <SkeletonCircle className="h-7" />
            <Skeleton className="mt-3 h-4 w-28" />
            <div className="mt-5 grid gap-3">
              <FormFieldSkeleton wide />
              <FormFieldSkeleton wide />
              <Skeleton className="h-11 w-full" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ReviewConsoleSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="검수 대기열을 불러오는 중"
      className="min-h-screen bg-bg text-ink"
      role="status"
    >
      <LoadingLabel label="검수 대기열을 불러오는 중" />
      <header className="border-b border-divider px-6 py-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      </header>
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <main className="mx-auto w-full max-w-2xl">
          <div className="flex gap-3">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-4 w-44" />
          </div>
          <article className="mt-3 rounded-lg border border-divider bg-surface p-6">
            <div className="flex gap-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
            <SkeletonText className="mt-6" lines={5} />
            <div className="mt-6 border-t border-divider pt-4">
              <Skeleton className="h-4 w-48" />
              <SkeletonText className="mt-4" lines={3} />
            </div>
          </article>
        </main>
        <aside>
          <div className="grid gap-2">
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <div className="mt-5 border-t border-divider pt-4">
            <Skeleton className="h-4 w-16" />
            <SkeletonText className="mt-3" lines={5} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export function PrintPreviewSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="인쇄 미리보기를 만드는 중"
      className="min-h-screen bg-[#ececec] p-6"
      role="status"
    >
      <LoadingLabel label="인쇄 미리보기를 만드는 중" />
      <header className="mx-auto flex max-w-[1120px] items-center justify-between border-b border-control pb-4">
        <span>
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="mt-2 h-6 w-52" />
          <Skeleton className="mt-2 h-3 w-28" />
        </span>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-24" />
        </div>
      </header>
      <main className="mx-auto mt-7 aspect-[210/297] w-full max-w-[794px] bg-white px-[7%] py-[6%] shadow-sm">
        <div className="border-b-2 border-ink pb-4 text-center">
          <Skeleton className="mx-auto h-5 w-56" />
          <Skeleton className="mx-auto mt-3 h-3 w-36" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-7">
          {Array.from({ length: 10 }, (_, index) => (
            <div className="flex min-h-20 gap-3" key={index}>
              <SkeletonCircle className="h-5" />
              <SkeletonText
                className="flex-1"
                lines={index % 3 === 0 ? 3 : 2}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
