import type { StudioAiPageJob } from "./useStudioAi";
import styles from "./StudioView.module.css";

export default function StudioPageEmpty({
  job,
  page,
  onAdd,
  onRetry,
  canRetry,
}: {
  job?: StudioAiPageJob;
  page: number;
  onAdd: () => void;
  onRetry: () => void;
  canRetry: boolean;
}) {
  const busy = job && ["queued", "rendering", "running"].includes(job.state);
  return (
    <div className={styles.pageEmpty} role="status">
      <strong>
        {page}쪽 ·{" "}
        {busy ? "문제를 인식하고 있습니다" : "인식된 문제가 없습니다"}
      </strong>
      <p>
        {job?.state === "error"
          ? "AI 인식에 실패했습니다. 이 페이지를 다시 시도하거나 문제 영역을 직접 추가해 주세요."
          : job?.state === "empty"
            ? "자동 인식에서 문제를 찾지 못했습니다. 원본에 문제가 있다면 영역을 직접 추가해 주세요."
            : job?.state === "queued"
              ? "대기열에 등록됐습니다. 앞선 작업이 끝나면 자동으로 시작합니다."
              : busy
                ? "다른 페이지를 확인해도 인식은 계속 진행됩니다."
                : job?.state === "cancelled"
                  ? "인식이 취소됐습니다. 다시 인식하거나 영역을 직접 추가할 수 있습니다."
                  : "페이지 자동 인식을 실행하거나 문제 영역을 직접 추가해 주세요."}
      </p>
      {!busy && (
        <div>
          {job?.state === "error" && (
            <button type="button" onClick={onRetry} disabled={!canRetry}>
              이 페이지 재시도
            </button>
          )}
          <button type="button" onClick={onAdd}>
            문제 직접 추가
          </button>
        </div>
      )}
    </div>
  );
}
