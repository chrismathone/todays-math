"use client";

import { Fragment } from "react";
import WorkProgress from "./WorkProgress";
import { studioWorkName } from "./studioWorkNames";
import {
  COMMON_CROP_NOTICE,
  summarizePageWarnings,
} from "./pageWarningSummary";
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
  textLayerWarning?: {
    summary: string;
    detail: string;
    matched?: number;
    total?: number;
    missingSample?: string[];
  };
}

/** 빠진 낱말을 화면에 몇 개까지 적나 — 넘치면 «외 N개». 경고 칸 두 줄을 넘기지 않는 수. */
const MISSING_SHOWN = 8;

/**
 * «빠진 낱말: 경신중학교, 평행사변형 … 외 2개» — 원장님 2026-09-21 «이 경고가 어떤 문제인지
 * 알려주면 더 좋을듯». 판정기가 이미 뽑아 둔 누락 표본이 마우스 올림(title)에만 있었다.
 * 머리글 낱말(학교·학년·시험 이름)뿐이면 넘어가고, 문제 낱말이면 그 문제를 확인하시면 된다.
 */
function missingWordsLine(warning: NonNullable<PageJob["textLayerWarning"]>) {
  const sample = warning.missingSample ?? [];
  if (!sample.length) return null;
  const shown = sample.slice(0, MISSING_SHOWN);
  const missing =
    warning.total !== undefined && warning.matched !== undefined
      ? warning.total - warning.matched
      : sample.length;
  const rest = missing - shown.length;
  return `빠진 낱말: ${shown.join(", ")}${rest > 0 ? ` 외 ${rest}개` : ""}`;
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
          label={studioWorkName("pages").short}
          fullLabel={studioWorkName("pages").running}
          detail={`${completed}/${jobs.length}쪽 처리 중 · ${queued ? `대기 중 ${queued}쪽` : "대기 중 페이지 없음"}${failed ? ` · 실패 ${failed}쪽` : ""}`}
          completed={completed}
          total={jobs.length}
          unit="쪽"
          showCount={false}
          startedAt={startedAt}
          onCancel={onCancel}
          cancelLabel="취소"
          cancelName={`${studioWorkName("pages").long} 취소`}
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
      {jobs.some((job) => summarizePageWarnings(job.warnings ?? []).common) ? (
        <p className={styles.aiWarningsCommon}>{COMMON_CROP_NOTICE}</p>
      ) : null}
      {jobs
        .filter(
          (job) =>
            job.textLayerWarning ||
            summarizePageWarnings(job.warnings ?? []).details.length,
        )
        .map((job) => {
          const missing = job.textLayerWarning
            ? missingWordsLine(job.textLayerWarning)
            : null;
          const summary = summarizePageWarnings(job.warnings ?? []);
          return (
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
              {missing ? (
                <p className={styles.missingWords}>{missing}</p>
              ) : null}
              {/* 쪽당 한 줄 — 원문은 «자세히»에서(원장님 2026-11-11). */}
              {summary.details.length ? (
                <details className={styles.aiWarningsPage}>
                  <summary>
                    {job.page}쪽 · {summary.labels.join(" · ")}
                    <span className={styles.aiWarningsMore}>자세히</span>
                  </summary>
                  {summary.details.map((warning, index) => (
                    <p key={index}>{warning}</p>
                  ))}
                </details>
              ) : null}
            </div>
          );
        })}
      {/*
        원장님 2026-09-20 «쪽별 진행 우측에 쪽이 나열되면 더 좋겠네. 화살표 말고» —
        접는 칸(details)을 없애고 라벨 오른쪽에 쪽을 그대로 늘어놓는다. 쪽이 많으면
        줄바꿈 대신 목록 안에서 가로로 구른다(.queueChips). 파일이 여럿이면 파일이
        바뀌는 자리에 «N번 파일» 을 끼워 같은 쪽 번호를 가른다.
      */}
      <div className={styles.queueRow}>
        <span className={styles.queueRowLabel}>쪽별 진행</span>
        <div className={styles.queueChips} aria-label="쪽별 진행 목록">
          {jobs.map((job, index) => {
            const fileNumber =
              sources.findIndex((source) => source.id === job.sourceId) + 1;
            const manyFiles = sources.length > 1;
            return (
              <Fragment key={job.key}>
                {manyFiles &&
                (index === 0 || jobs[index - 1].sourceId !== job.sourceId) ? (
                  <span className={styles.queueChipGroup}>
                    {fileNumber}번 파일
                  </span>
                ) : null}
                <button
                  type="button"
                  data-state={job.state}
                  /* 이름을 못 박는다 — span·b 사이에 글자가 없어 읽는 쪽마다
                     «4쪽인식 중» 과 «4쪽 인식 중» 으로 갈린다(jsdom 은 CSS 를 안 돈다). */
                  aria-label={`${manyFiles ? `${fileNumber}번 파일 · ` : ""}${job.page}쪽 ${labels[job.state]}`}
                  title={
                    job.error ||
                    sources.find((source) => source.id === job.sourceId)?.name
                  }
                  onClick={() => onNavigate(job.sourceId, job.page)}
                >
                  <span>{job.page}쪽</span>
                  <b>{labels[job.state]}</b>
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
