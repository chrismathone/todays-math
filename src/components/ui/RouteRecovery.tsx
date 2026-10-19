import Link from "next/link";
import TodayMathMark from "@/components/brand/TodayMathMark";
import { Button } from "./Button";

export default function RouteRecovery({
  title,
  description,
  retry,
  homeHref = "/",
}: {
  title: string;
  description: string;
  retry?: () => void;
  homeHref?: string;
}) {
  return (
    <main className="app-chrome flex min-h-dvh items-center justify-center bg-bg p-6 text-ink">
      <section
        className="w-full max-w-lg rounded-xl border border-divider bg-surface p-6 sm:p-8"
        aria-labelledby="recovery-title"
      >
        <Link
          href={homeHref}
          className="mb-8 inline-flex min-h-11 items-center gap-2 text-lg font-bold"
        >
          <TodayMathMark size={28} />
          오늘 수학
        </Link>
        <h1 id="recovery-title" className="text-2xl font-bold">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-2">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {retry ? <Button onClick={retry}>다시 시도</Button> : null}
          <Link
            href={homeHref}
            className="inline-flex min-h-11 items-center rounded-lg border border-control px-4 text-sm font-semibold hover:bg-side"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}
