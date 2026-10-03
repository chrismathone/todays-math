import WorkProgress from "@/components/unified/WorkProgress";
import w from "@/components/unified/Workroom.module.css";
import s from "../EnglishStudio.module.css";
import b from "./EnglishResourceBank.module.css";

export function BankLoading() {
  return <WorkProgress label="자료를 불러오는 중입니다…" />;
}

export function BankError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className={s.formError}>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className={w.outlineButton} onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function BankPagination({
  page,
  hasNext,
  onPrevious,
  onNext,
}: {
  page: number;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav aria-label="자료 목록 페이지" className={b.pagination}>
      <button
        type="button"
        className={w.outlineButton}
        disabled={page <= 1}
        onClick={onPrevious}
      >
        이전
      </button>
      <span className={b.meta}>{page}쪽</span>
      <button
        type="button"
        className={w.outlineButton}
        disabled={!hasNext}
        onClick={onNext}
      >
        다음
      </button>
    </nav>
  );
}
