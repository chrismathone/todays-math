"use client";

import WorkProgress from "./WorkProgress";
import styles from "./StudioView.module.css";

interface PageJob {
  key: string;
  sourceId: string;
  page: number;
  state:
    | "queued"
    | "rendering"
    | "running"
    | "complete"
    | "empty"
    | "error"
    | "cancelled";
  error?: string;
  warnings?: string[];
  textLayerWarning?: { summary: string; detail: string };
}

const labels: Record<PageJob["state"], string> = {
  queued: "대기",
  rendering: "지면 준비",
  running: "인식 중",
  complete: "완료",
  empty: "빈 페이지",
  error: "실패",
  cancelled: "취소",
};

export default function StudioQueueStatus({
  jobs,
  startedAt,
  sources,
  onCancel,
  onRetry,
  onNavigate,
}: {
  jobs: PageJob[];
  startedAt?: number;
  sources: { id: string; name: string }[];
  onCancel: () => void;
  onRetry: () => void;
  onNavigate: (sourceId: string, page: number) => void;
}) {
  if (!jobs.length) return null;
  const running = jobs.filter(
    (job) => job.state === "running" || job.state === "rendering",
  ).length;
  const queued = jobs.filter((job) => job.state === "queued").length;
  const completed = jobs.filter(
    (job) => job.state === "complete" || job.state === "empty",
  ).length;
  const failed = jobs.filter((job) => job.state === "error").length;
  const busy = running + queued > 0;
  return (
    <div className={styles.pageQueue} aria-label="페이지 인식 현황">
      {busy ? (
        <WorkProgress
          label="페이지 자동 인식"
          detail={`${completed}/${jobs.length}쪽 처리 중 · ${queued ? `대기 중 ${queued}쪽` : "대기 중 페이지 없음"}${failed ? ` · 실패 ${failed}쪽` : ""}`}
          completed={completed}
          total={jobs.length}
          unit="쪽"
          showCount={false}
          startedAt={startedAt}
          onCancel={onCancel}
          cancelLabel="AI 작업 취소"
        />
      ) : (
        <div className={styles.queueSummary} role="status">
          <strong>
            인식 {completed} / {jobs.length}쪽 완료
          </strong>
          {failed ? (
            <button type="button" onClick={onRetry}>
              실패 {failed}쪽 재시도
            </button>
          ) : null}
        </div>
      )}
      {jobs
        .filter((job) => job.textLayerWarning || job.warnings?.length)
        .map((job) => (
          <div
            key={`warning:${job.key}`}
            className={styles.aiWarnings}
            role="status"
          >
            {job.textLayerWarning && (
              <p title={job.textLayerWarning.detail}>
                {job.page}쪽 · {job.textLayerWarning.summary}
              </p>
            )}
            {job.warnings?.map((warning, index) => (
              <p key={index}>
                {job.page}쪽 · {warning}
              </p>
            ))}
          </div>
        ))}
      <details className={styles.queueDetails}>
        <summary>
          쪽별 진행 <span aria-hidden="true">⌄</span>
        </summary>
        <div>
          {jobs.map((job) => (
            <button
              type="button"
              key={job.key}
              data-state={job.state}
              title={
                job.error ||
                sources.find((source) => source.id === job.sourceId)?.name
              }
              onClick={(event) => {
                onNavigate(job.sourceId, job.page);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              <span>
                {sources.length > 1
                  ? `${sources.findIndex((source) => source.id === job.sourceId) + 1}번 파일 · `
                  : ""}
                {job.page}쪽
              </span>
              <b>{labels[job.state]}</b>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
