import Link from "next/link";
import ReviewShell from "@/components/review/ReviewShell";
import reviewShell from "@/components/review/ReviewShell.module.css";

import { Skeleton, SkeletonCircle, SkeletonText } from "../Skeleton";
import s from "../skeleton.module.css";
import { FormFieldSkeleton, MastheadSkeleton, TableRows } from "./shared";

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
    <MastheadSkeleton activeNav="main">
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <DailyReviewSkeleton />
          <div aria-hidden="true" className="px-5 py-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                className="mb-2 grid min-h-[70px] grid-cols-[42px_minmax(0,1fr)_minmax(72px,150px)_92px] items-center gap-3 border-2 border-transparent px-3 max-sm:grid-cols-[36px_minmax(0,1fr)_72px]"
                key={index}
              >
                <Skeleton className="h-7 w-7" />
                <span>
                  <Skeleton className="h-4 w-32 max-w-full" />
                  <Skeleton className="skeleton-quiet mt-2 h-2.5 w-52 max-w-[85%]" />
                </span>
                <span className="flex gap-1 max-sm:hidden">
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
    <div aria-hidden="true" className={s.filterBar}>
      <div className={s.filterWide}>
        <Skeleton className="mb-1 h-2.5 w-10" />
        <div className="flex h-11 items-center border border-control bg-white px-3">
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index}>
          <Skeleton className="mb-1 h-2.5 w-10" />
          <div className="flex h-11 items-center border border-control bg-white px-3">
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
      <div className={s.filterWide}>
        <Skeleton className="mb-1 h-2.5 w-10" />
        <div className="flex h-11 items-center gap-4 border border-control bg-white px-3">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
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
      className="grid grid-cols-[38px_minmax(0,1fr)_80px] gap-4 border-t border-divider px-8 py-5 max-sm:grid-cols-[32px_minmax(0,1fr)]"
      role="status"
    >
      <Skeleton className="h-6 w-6" />
      <SkeletonText lines={3} />
      <Skeleton className="h-9 w-20 max-sm:hidden" />
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
    <MastheadSkeleton activeNav="problems">
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
    <MastheadSkeleton activeNav="classes">
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
            className="grid min-h-[78px] grid-cols-[44px_minmax(0,1fr)_96px] items-start gap-4 border-b border-divider py-3.5 max-sm:grid-cols-[40px_minmax(0,1fr)]"
            key={index}
          >
            <Skeleton className="h-7 w-7" />
            <span>
              <Skeleton className="h-4 w-52 max-w-[80%]" />
              <Skeleton className="skeleton-quiet mt-2 h-3 w-64 max-w-full" />
            </span>
            <Skeleton className="ml-auto h-4 w-16 max-sm:hidden" />
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
          <Skeleton className="h-5 w-56 max-w-[60%]" />
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
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <FormFieldSkeleton wide key={index} />
        ))}
      </div>
      <Skeleton className="mt-2 h-11 w-full" />
    </div>
  );
}

export function TestSetupSkeleton() {
  return (
    <MastheadSkeleton activeNav="problems" currentLabel="시험지 만들기">
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
        <div className="px-8 py-4">
          <Skeleton className="h-5 w-48 max-w-[70%]" />
          <Skeleton className="skeleton-quiet mt-2 h-3 w-64 max-w-full" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <article
            aria-hidden="true"
            className="grid grid-cols-[38px_minmax(0,1fr)_80px] gap-4 border-t border-divider px-8 py-5 max-sm:grid-cols-[32px_minmax(0,1fr)]"
            key={index}
          >
            <Skeleton className="h-6 w-6" />
            <SkeletonText lines={index % 2 === 0 ? 3 : 2} />
            <Skeleton className="h-9 w-20 max-sm:hidden" />
          </article>
        ))}
      </main>
      <footer className="sticky bottom-0 flex items-center gap-4 border-t border-divider bg-side px-8 py-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto h-3 w-40 max-sm:hidden" />
        <Skeleton className="h-11 w-16" />
        <Skeleton className="h-11 w-16" />
      </footer>
    </div>
  );
}

export function TestReviewSkeleton() {
  return (
    <MastheadSkeleton activeNav="problems" currentLabel="시험지 검토">
      <TestReviewContentSkeleton />
    </MastheadSkeleton>
  );
}

export function AuthFormSkeleton({ fields = 2 }: { fields?: number } = {}) {
  const signup = fields > 2;
  return (
    <div
      aria-busy="true"
      aria-label="계정 화면을 불러오는 중"
      className={s.authPanel}
      role="status"
    >
      <p className={s.authEyebrow}>
        {signup ? "YOUR FIRST PAGE" : "WELCOME BACK"}
      </p>
      <h1>{signup ? "선생님의 작업실을 열어요" : "다시 만나 반가워요"}</h1>
      <p className={s.authLead}>
        {signup
          ? "가입을 신청하면 관리자 승인 후 작업실을 사용할 수 있어요."
          : "오늘의 수업과 학습, 이어서 시작해 볼까요?"}
      </p>
      {Array.from({ length: fields }, (_, index) => (
        <div className={s.authField} key={index}>
          <Skeleton className="h-2.5 w-12" />
          <div className={`skeleton ${s.authInput}`} data-auth-field />
        </div>
      ))}
      <div aria-hidden="true" className={`skeleton ${s.authSubmit}`} />
      <p className={s.authSwitch}>
        <span>
          {signup ? "이미 계정이 있나요?" : "오늘 수학이 처음인가요?"}
        </span>
        <Link href={signup ? "/login" : "/signup"}>
          {signup ? "로그인" : "회원가입"}
        </Link>
      </p>
      <p className={s.authNote}>
        문제를 고르고, 다듬고, 한 장으로.
        <br />
        수업을 준비하는 선생님 곁에 오늘 수학.
      </p>
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
    <ReviewShell
      subtitle={<Skeleton className="h-3 w-36" />}
      account={
        <span className={reviewShell.accountButton}>
          <span aria-hidden="true">내</span>
          <span className={reviewShell.accountIdentity}>
            <strong>내정보</strong>
            <Skeleton className="mt-1 h-3 w-28" />
          </span>
        </span>
      }
    >
      <div
        aria-busy="true"
        aria-label="검수 대기열을 불러오는 중"
        className={reviewShell.board}
        role="status"
      >
        <div className={reviewShell.problemColumn}>
          <div className="flex gap-3">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-44" />
          </div>
          <article className="mt-3 border border-divider bg-surface p-6">
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
        </div>
        <aside aria-hidden="true" className={reviewShell.actions}>
          <div className="grid gap-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="mt-5 border-t border-divider pt-4">
            <Skeleton className="h-4 w-16" />
            <SkeletonText className="mt-3" lines={5} />
          </div>
        </aside>
      </div>
    </ReviewShell>
  );
}

export function PrintPreviewSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="인쇄 미리보기를 만드는 중"
      className="min-h-screen bg-[#c9c9c7] p-6"
      role="status"
    >
      <header className="mx-auto grid max-w-[1000px] grid-cols-1 items-center gap-4 border-t-[3px] border-ink border-b border-[#c2c2c0] bg-[#ececea] px-[18px] py-3.5 md:grid-cols-[minmax(0,1fr)_auto]">
        <span>
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="mt-2 h-5 w-52 max-w-full" />
          <Skeleton className="mt-2 h-3 w-28" />
        </span>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-20" />
          <Skeleton className="h-11 w-20" />
          <Skeleton className="h-11 w-24" />
        </div>
      </header>
      <main className="mx-auto mt-7 aspect-[210/297] w-full max-w-[794px] bg-white px-[7%] py-[6%] shadow-sm">
        <div className="border-b-2 border-ink pb-4 text-center">
          <Skeleton className="mx-auto h-5 w-56" />
          <Skeleton className="mx-auto mt-3 h-3 w-36" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
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
