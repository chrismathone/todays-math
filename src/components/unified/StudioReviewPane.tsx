"use client";
/* Local source images must not go through a remote optimizer. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { ProblemContent } from "@/components/math/ProblemContent";
import { displayFractions } from "./fractionDisplay";
import {
  STUDIO_QUESTION_TYPES,
  type StudioCrop,
  type StudioFigure,
} from "./studioHelpers";
import StudioPageEmpty from "./StudioPageEmpty";
import type { StudioAiPageJob } from "./useStudioAi";
import WorkProgress from "./WorkProgress";
import styles from "./StudioReviewPane.module.css";

type Action = "ocr" | "figures" | "solution";
export interface ReviewCropJob {
  cropId: string;
  action: Action;
  state: string;
  startedAt?: number;
  error?: string;
}
interface Props {
  crops: StudioCrop[];
  allCrops: StudioCrop[];
  activeId: string;
  original?: string;
  page: number;
  pageJob?: StudioAiPageJob;
  jobs: ReviewCropJob[];
  available: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<StudioCrop>) => void;
  onRun: (action: Action, ids: string[]) => void;
  onCancel: (id: string, action: Action) => void;
  onRetry: (id: string, action: Action) => void;
  onCrop: (crop?: StudioCrop, figure?: StudioFigure) => void;
  onEditFigure: (crop: StudioCrop, figure: StudioFigure) => void;
  onRetryPage: () => void;
}

export default function StudioReviewPane(props: Props) {
  const resultPane = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pane = resultPane.current;
    const card = Array.from(
      pane?.querySelectorAll<HTMLElement>("[data-crop-id]") ?? [],
    ).find((card) => card.dataset.cropId === props.activeId);
    if (!pane || !card) return;
    const top = card.offsetTop - pane.offsetTop;
    if (
      top < pane.scrollTop ||
      top + card.offsetHeight > pane.scrollTop + pane.clientHeight
    )
      pane.scrollTop = top;
  }, [props.activeId]);
  return (
    <div className={styles.comparison} aria-label="원본과 인식 결과 비교">
      <section className={styles.original} aria-label="검수 원본">
        <header>
          <strong>원본 · {props.page}쪽</strong>
          <button type="button" onClick={() => props.onCrop()}>
            크롭 수정
          </button>
        </header>
        <div className={styles.originalScroll}>
          {props.original ? (
            <img src={props.original} alt={`${props.page}쪽 검수 원본`} />
          ) : (
            <WorkProgress label="원본 불러오는 중" variant="inline" />
          )}
        </div>
      </section>
      <section className={styles.results} aria-label="문자·도형 인식 결과">
        <header>
          <strong>문자·도형 인식 결과</strong>
          <span>
            {props.crops.length}문항 ·{" "}
            {props.crops.filter((c) => c.reviewed).length}문항 검수 완료
          </span>
        </header>
        <div ref={resultPane} className={styles.resultScroll}>
          {props.crops.length ? (
            props.crops.map((crop) => (
              <ReviewCard key={crop.id} {...props} crop={crop} />
            ))
          ) : (
            <StudioPageEmpty
              job={props.pageJob}
              page={props.page}
              onAdd={() => props.onCrop()}
              onRetry={props.onRetryPage}
              canRetry={props.available}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function ReviewCard({ crop, ...props }: Props & { crop: StudioCrop }) {
  const [editing, setEditing] = useState(false);
  const jobs = props.jobs.filter((job) => job.cropId === crop.id);
  const busy = jobs.some((job) => ["queued", "running"].includes(job.state));
  const activeJob = jobs.find((job) =>
    ["queued", "running"].includes(job.state),
  );
  const failed = jobs.find((job) => job.state === "error");
  const update = (patch: Partial<StudioCrop>) => {
    props.onSelect(crop.id);
    props.onUpdate(crop.id, patch);
  };
  const number = props.allCrops.findIndex((item) => item.id === crop.id) + 1;
  return (
    <article
      className={styles.card}
      data-crop-id={crop.id}
      data-selected={props.activeId === crop.id}
      aria-label={`문제 ${number} 인식 결과`}
    >
      <div className={styles.cardHeading}>
        <button
          type="button"
          className={styles.number}
          onClick={() => props.onSelect(crop.id)}
        >
          문제 {number}
        </button>
        <span>
          {crop.questionType
            ? STUDIO_QUESTION_TYPES[crop.questionType]
            : "유형 미확인"}
        </span>
        <span className={crop.reviewed ? styles.confirmed : styles.pending}>
          {crop.reviewed ? "검수 완료" : "검수 전"}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={!props.available || busy}
            onClick={() => props.onRun("ocr", [crop.id])}
          >
            {crop.content.trim() ? "다시 인식" : "문자 인식"}
          </button>
          <button
            type="button"
            aria-expanded={editing}
            onClick={() => {
              props.onSelect(crop.id);
              setEditing((value) => !value);
            }}
          >
            {editing ? "편집 닫기" : "내용 수정"}
          </button>
        </div>
      </div>
      {activeJob && (
        <WorkProgress
          label={`${activeJob.action === "solution" ? "해설 생성" : activeJob.action === "figures" ? "도형 인식" : "문자 인식"} ${activeJob.state === "queued" ? "대기 중" : "중"}`}
          variant="inline"
          startedAt={activeJob.startedAt}
          onCancel={() => props.onCancel(crop.id, activeJob.action)}
          cancelLabel="취소"
        />
      )}
      {failed && (
        <div className={styles.error} role="alert">
          {failed.error}
          <button
            type="button"
            disabled={!props.available || busy}
            onClick={() => props.onRetry(crop.id, failed.action)}
          >
            다시 시도
          </button>
        </div>
      )}
      {crop.content.trim() ? (
        <div className={styles.content}>
          <ProblemContent
            content={displayFractions(crop.content, crop.grade)}
          />
        </div>
      ) : (
        <p className={styles.muted}>
          아직 문자 인식 결과가 없습니다. 원본을 인식하거나 내용을 직접 입력해
          주세요.
        </p>
      )}
      <div className={styles.figures}>
        <div className={styles.figureHeading}>
          <strong>도형 {crop.figures?.length ?? 0}개</strong>
          <button
            type="button"
            disabled={!props.available || busy}
            onClick={() => props.onRun("figures", [crop.id])}
          >
            그림 다시 찾기
          </button>
        </div>
        {crop.figures?.length ? (
          crop.figures.map((figure, index) => (
            <figure key={figure.id}>
              <img
                src={figure.image}
                alt={`문제 ${number} 도형 ${index + 1}`}
              />
              <figcaption>
                <span>
                  도형 {index + 1} ·{" "}
                  {figure.svg ? "편집한 그림" : "원본에서 분리됨"}
                </span>
                <button
                  type="button"
                  onClick={() => props.onCrop(crop, figure)}
                >
                  영역 수정
                </button>
                <button
                  type="button"
                  onClick={() => props.onEditFigure(crop, figure)}
                >
                  그림 편집
                </button>
              </figcaption>
              {figure.originalImage && figure.svg && (
                <details>
                  <summary>원본 그림 비교</summary>
                  <img
                    src={figure.originalImage}
                    alt={`도형 ${index + 1} 원본`}
                  />
                </details>
              )}
            </figure>
          ))
        ) : (
          <p className={styles.muted}>
            분리된 도형이 없습니다. 원본에 그림이 있다면 다시 찾거나 크롭에서
            도형 영역을 추가해 주세요.
          </p>
        )}
      </div>
      {crop.aiWarnings?.map((warning, index) => (
        <p className={styles.warning} key={index}>
          {warning}
        </p>
      ))}
      {editing && (
        <div className={styles.editor}>
          <label>
            문제 유형
            <select
              value={crop.questionType ?? ""}
              onChange={(event) =>
                update({
                  questionType: (event.target.value ||
                    undefined) as StudioCrop["questionType"],
                })
              }
            >
              <option value="">유형 미확인</option>
              {Object.entries(STUDIO_QUESTION_TYPES).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            문제 내용
            <textarea
              rows={8}
              value={crop.content}
              onChange={(event) =>
                update({
                  content: event.target.value,
                  ...(!event.target.value.trim()
                    ? { mode: "image" as const }
                    : {}),
                })
              }
            />
          </label>
          <label>
            정답
            <input
              value={crop.answer}
              onChange={(event) => update({ answer: event.target.value })}
            />
          </label>
          <label>
            풀이
            <textarea
              rows={5}
              value={crop.solution}
              onChange={(event) => update({ solution: event.target.value })}
            />
          </label>
        </div>
      )}
      {crop.answer.trim() && (
        <div className={styles.answer}>
          <strong>정답</strong>
          <ProblemContent content={displayFractions(crop.answer, crop.grade)} />
        </div>
      )}
      {crop.solution.trim() && (
        <div className={styles.answer}>
          <strong>해설</strong>
          <ProblemContent
            content={displayFractions(crop.solution, crop.grade)}
          />
        </div>
      )}
      <div className={styles.cardFooter}>
        <label>
          출력
          <select
            aria-label={`문제 ${number} 출력 방식`}
            value={crop.mode}
            onChange={(event) =>
              update({ mode: event.target.value as StudioCrop["mode"] })
            }
          >
            <option value="image">원본 이미지</option>
            <option value="text" disabled={!crop.content.trim()}>
              인식한 텍스트 + 도형
            </option>
          </select>
        </label>
        <button
          type="button"
          disabled={!props.available || busy || !crop.content.trim()}
          onClick={() => props.onRun("solution", [crop.id])}
        >
          {crop.solution.trim() ? "해설 다시 생성" : "해설 생성"}
        </button>
        <button
          type="button"
          disabled={busy || crop.reviewed}
          onClick={() => props.onUpdate(crop.id, { reviewed: true })}
        >
          {crop.reviewed ? "검수 완료" : "이 문제 검수 완료"}
        </button>
      </div>
    </article>
  );
}
