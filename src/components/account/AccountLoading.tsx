import TodayMathMark from "@/components/brand/TodayMathMark";
import { Skeleton } from "@/components/ui/Skeleton";
import s from "./accountLoading.module.css";

export default function AccountLoading({
  pending = false,
  detail = false,
}: {
  pending?: boolean;
  detail?: boolean;
}) {
  return (
    <div className={s.shell} aria-busy="true">
      <span role="status" className="sr-only">
        {pending
          ? "가입 상태를 확인하는 중입니다."
          : "관리자 화면을 불러오는 중입니다."}
      </span>
      <header className={s.header} aria-hidden="true">
        <span className={s.brand}>
          <TodayMathMark size={28} />
          오늘의수학
        </span>
        <Skeleton className="h-8 w-24" />
      </header>
      <div aria-hidden="true" className={pending ? s.pending : s.main}>
        <Skeleton className="mb-4 h-3 w-36" />
        <Skeleton className="mb-5 h-9 w-52" />
        <Skeleton className="mb-9 h-4 w-72 max-w-full" />
        <div className={pending ? s.single : s.columns}>
          <div className={s.card}>
            <Skeleton className="mb-6 h-7 w-32" />
            {!pending && <Skeleton className="mb-6 h-11 w-full" />}
            {Array.from(
              { length: pending ? 3 : detail ? 3 : 5 },
              (_, index) => (
                <div key={index} className={s.row}>
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="mt-3 h-3 w-3/5" />
                </div>
              ),
            )}
          </div>
          {!pending && (
            <div className={s.card}>
              <Skeleton className="mb-5 h-7 w-28" />
              <Skeleton className="mb-8 h-3 w-40" />
              {Array.from({ length: detail ? 3 : 6 }, (_, index) => (
                <Skeleton key={index} className="mb-3 h-11 w-full" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
