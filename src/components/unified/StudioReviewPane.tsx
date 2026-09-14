"use client";
/* Local source images must not go through a remote optimizer. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { ProblemContent } from "@/components/math/ProblemContent";
import { displayFractions } from "./fractionDisplay";
import {
  STUDIO_QUESTION_TYPES,
  type StudioCrop,
  type StudioFigure,
} from "./studioHelpers";
import StudioPageEmpty from "./StudioPageEmpty";
import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import { repositionScore } from "./nativeProblemLayout";
import {
  editedScoreMetadata,
  studioReviewContent,
} from "./studioReviewContent";
import StudioDiagramCropEditor from "./StudioDiagramCropEditor";
import { MathTextEditor } from "@/components/math/editor/MathTextEditor";
import type { StudioAiPageJob } from "./useStudioAi";
import type { StudioFigureJob } from "./useStudioFigureAi";
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
  figureJobs: StudioFigureJob[];
  available: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<StudioCrop>) => void;
  onRun: (action: Action, ids: string[]) => void;
  onCancel: (id: string, action: Action) => void;
  onRetry: (id: string, action: Action) => void;
  onCrop: (crop?: StudioCrop, figure?: StudioFigure) => void;
  onEditFigure: (
    crop: StudioCrop,
    figure: StudioFigure,
    onApply?: (figure: StudioFigure) => void,
  ) => void;
  onRetryPage: () => void;
  onRenderFigure: (cropId: string, figureId: string) => void;
  onCancelFigure: (cropId: string, figureId: string) => void;
}

export default function StudioReviewPane(props: Props) {
  const resultPane = useRef<HTMLDivElement>(null);
  const [showScores, setShowScores] = useState(true);
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
          <strong>디지털화 결과 · 수식·도형 검수</strong>
          <span>
            {props.crops.length}문항 ·{" "}
            {props.crops.filter((c) => c.reviewed).length}문항 검수 완료
          </span>
          <label className={styles.scoreToggle}>
            <input
              type="checkbox"
              checked={showScores}
              onChange={(event) => setShowScores(event.target.checked)}
            />
            배점 표시
          </label>
        </header>
        <div ref={resultPane} className={styles.resultScroll}>
          {props.crops.length ? (
            props.crops.map((crop) => (
              <ReviewCard
                key={crop.id}
                {...props}
                crop={crop}
                showScores={showScores}
              />
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

function ReviewCard({
  crop,
  showScores,
  ...props
}: Props & { crop: StudioCrop; showScores: boolean }) {
  const number =
    crop.ocr?.number ??
    props.allCrops.findIndex((item) => item.id === crop.id) + 1;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    content: crop.content,
    answer: crop.answer,
    solution: crop.solution,
    questionType: crop.questionType,
  });
  const [draftNumber, setDraftNumber] = useState(String(number));
  const [draftTopic, setDraftTopic] = useState(crop.ocr?.topic ?? "");
  const editableContent = useMemo(
    () => studioReviewContent({ content: crop.content, ocr: crop.ocr }),
    [crop.content, crop.ocr],
  );
  const validNumber =
    Number.isInteger(Number(draftNumber)) &&
    Number(draftNumber) > 0 &&
    Number(draftNumber) <= 10000;
  const [draftFigures, setDraftFigures] = useState(crop.figures);
  const [cropEditorIndex, setCropEditorIndex] = useState<number | null>(null);
  const startEdit = () => {
    if (busy) return;
    props.onSelect(crop.id);
    setDraft({
      content: editableContent,
      answer: crop.answer,
      solution: crop.solution,
      questionType: crop.questionType,
    });
    setDraftFigures(crop.figures);
    setDraftNumber(String(number));
    setDraftTopic(crop.ocr?.topic ?? "");
    setEditing(true);
  };
  const saveEdit = () => {
    if (!validNumber) return;
    const contentChanged = draft.content !== editableContent;
    const metadata = crop.ocr ?? {
      number,
      blocks: [],
      choiceGroups: [],
      subQuestions: [],
      confidence: "high" as const,
      choicesLayout: "auto" as const,
      bodyMissing: false,
      choicesMissing: false,
      contentEdited: true,
    };
    update({
      ...(contentChanged ? { content: draft.content } : {}),
      answer: draft.answer,
      solution: draft.solution,
      questionType: draft.questionType,
      figures: draftFigures,
      ocr: {
        ...metadata,
        ...(contentChanged ? editedScoreMetadata(draft.content) : {}),
        number: Number(draftNumber),
        topic: draftTopic.trim() || undefined,
      },
      reviewed: true,
      ...(!draft.content.trim() ? { mode: "image" as const } : {}),
    });
    setEditing(false);
  };
  const displayedFigures = editing ? draftFigures : crop.figures;
  const openFigure = (index: number) => {
    const figure = displayedFigures?.[index];
    if (
      !figure ||
      figureJobs.some(
        (job) =>
          job.figureId === figure.id &&
          ["queued", "running"].includes(job.state),
      )
    )
      return;
    if (!editing) {
      props.onEditFigure(crop, figure);
      return;
    }
    props.onEditFigure({ ...crop, figures: draftFigures }, figure, (result) => {
      setDraftFigures((figures) =>
        figures?.map((item) => (item.id === figure.id ? result : item)),
      );
    });
  };
  const visualFigures = useMemo(
    () =>
      displayedFigures?.map((figure, index) => ({
        svg: figure.svg,
        imageData: figure.image,
        label: `문제 ${number} 도형 ${index + 1}`,
        box: [
          figure.rect.y * 1000,
          figure.rect.x * 1000,
          (figure.rect.y + figure.rect.height) * 1000,
          (figure.rect.x + figure.rect.width) * 1000,
        ] as [number, number, number, number],
      })),
    [displayedFigures, number],
  );
  const jobs = props.jobs.filter((job) => job.cropId === crop.id);
  const figureJobs = props.figureJobs.filter((job) => job.cropId === crop.id);
  const canEditFigure = (index: number) => {
    const figure = displayedFigures?.[index];
    return (
      Boolean(figure) &&
      !figureJobs.some(
        (job) =>
          job.figureId === figure?.id &&
          ["queued", "running"].includes(job.state),
      )
    );
  };
  const canEditRenderedFigure = (index: number) => {
    const figure = displayedFigures?.[index];
    return (
      canEditFigure(index) &&
      Boolean(
        figure?.svg ||
        /^data:image\/svg\+xml(?:;[^,]*)?,/i.test(figure?.image ?? ""),
      )
    );
  };
  const busy =
    jobs.some((job) => ["queued", "running"].includes(job.state)) ||
    figureJobs.some((job) => ["queued", "running"].includes(job.state));
  const activeJob = jobs.find((job) =>
    ["queued", "running"].includes(job.state),
  );
  const failed = jobs.find((job) => job.state === "error");
  const update = (patch: Partial<StudioCrop>) => {
    props.onSelect(crop.id);
    props.onUpdate(crop.id, patch);
  };
  const readContent = useMemo(
    () =>
      showScores
        ? editableContent
        : repositionScore(editableContent, undefined, false),
    [editableContent, showScores],
  );
  return (
    <article
      className={styles.card}
      data-crop-id={crop.id}
      data-selected={props.activeId === crop.id}
      aria-label={`문제 ${number} 인식 결과`}
    >
      <div className={styles.cardHeading}>
        {editing ? (
          <input
            type="number"
            className={styles.sourceNumber}
            aria-label="문제 번호"
            min={1}
            max={10000}
            value={draftNumber}
            onChange={(event) => setDraftNumber(event.target.value)}
          />
        ) : (
          <button
            type="button"
            className={styles.number}
            onClick={() => props.onSelect(crop.id)}
          >
            문제 {number}
          </button>
        )}
        {editing ? (
          <input
            className={styles.sourceTopic}
            aria-label="토픽"
            placeholder="토픽 (예: 이차함수)"
            maxLength={1000}
            value={draftTopic}
            onChange={(event) => setDraftTopic(event.target.value)}
          />
        ) : crop.ocr?.topic ? (
          <span>{crop.ocr.topic}</span>
        ) : null}
        {crop.ocr && (
          <span>
            {!crop.reviewed &&
            (crop.ocr.confidence === "low" ||
              crop.ocr.bodyMissing ||
              crop.ocr.choicesMissing)
              ? "인식 확인 필요"
              : "인식 완료"}
          </span>
        )}
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
            disabled={!props.available || busy || editing}
            onClick={() => props.onRun("ocr", [crop.id])}
          >
            {crop.content.trim() ? "다시 인식" : "문자 인식"}
          </button>
          {editing ? (
            <>
              <button type="button" onClick={() => setEditing(false)}>
                취소
              </button>
              <button
                type="button"
                className={styles.saveEdit}
                onClick={saveEdit}
                disabled={!validNumber}
              >
                저장
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-expanded={editing}
              disabled={busy}
              onClick={startEdit}
            >
              내용 수정
            </button>
          )}
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
            disabled={!props.available || busy || editing}
            onClick={() => props.onRetry(crop.id, failed.action)}
          >
            다시 시도
          </button>
        </div>
      )}
      {crop.ocr?.bodyMissing && (
        <p className={styles.warning}>
          본문 누락 · 원본을 확인하고 내용을 입력하거나 다시 인식해 주세요.
        </p>
      )}
      {crop.ocr?.choicesMissing && !crop.ocr.bodyMissing && (
        <p className={styles.warning}>
          보기 누락 · 원본을 확인하고 보기를 추가하거나 다시 인식해 주세요.
        </p>
      )}
      {crop.ocr?.confidence === "low" && !crop.reviewed && (
        <p className={styles.warning}>
          인식 신뢰도가 낮습니다. 내용을 확인해 주세요.
        </p>
      )}
      {editing ? (
        <div className={styles.visualEditor}>
          <MathTextEditor
            aria-label="문제 내용"
            value={draft.content}
            onChange={(content) =>
              setDraft((previous) => ({ ...previous, content }))
            }
            figures={visualFigures}
            onFigureClick={openFigure}
            isFigureEditable={canEditFigure}
            choicesLayout={crop.ocr?.choicesLayout}
          />
        </div>
      ) : crop.content.trim() || crop.figures?.length ? (
        <div className={styles.content}>
          <SourceEditorDisplay
            value={readContent}
            figures={visualFigures}
            choicesLayout={crop.ocr?.choicesLayout}
            onFigureClick={openFigure}
            isFigureEditable={canEditRenderedFigure}
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
            disabled={!props.available || busy || editing}
            onClick={() => props.onRun("figures", [crop.id])}
          >
            그림 다시 찾기
          </button>
        </div>
        {displayedFigures?.length ? (
          displayedFigures.map((figure, index) => {
            const job = figureJobs.find((job) => job.figureId === figure.id);
            const drawing = job && ["queued", "running"].includes(job.state);
            return (
              <figure key={figure.id}>
                {drawing && (
                  <WorkProgress
                    label={
                      job.state === "queued"
                        ? "SVG 생성 대기 중"
                        : (job.stage ?? "SVG 생성 중")
                    }
                    variant="inline"
                    startedAt={job.startedAt}
                    onCancel={() => props.onCancelFigure(crop.id, figure.id)}
                    cancelLabel="이 도형 취소"
                  />
                )}
                {job?.state === "error" && (
                  <p className={styles.warning} role="alert">
                    {job.error}
                  </p>
                )}
                <figcaption>
                  <span>
                    도형 {index + 1} ·{" "}
                    {figure.svg
                      ? "SVG 도형"
                      : drawing
                        ? "원본 · SVG 생성 중"
                        : "원본 크롭 · SVG 미생성"}
                  </span>
                  {!figure.svg && (
                    <button
                      type="button"
                      disabled={!props.available || busy || editing}
                      onClick={() => props.onRenderFigure(crop.id, figure.id)}
                    >
                      {job?.state === "error" ? "SVG 다시 시도" : "SVG 생성"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!props.original || Boolean(drawing)}
                    onClick={() => setCropEditorIndex(index)}
                  >
                    영역 수정
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(drawing)}
                    onClick={() => openFigure(index)}
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
            );
          })
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
              value={draft.questionType ?? ""}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  questionType: (event.target.value ||
                    undefined) as StudioCrop["questionType"],
                }))
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
          <div className={styles.visualField}>
            <strong>정답</strong>
            <MathTextEditor
              aria-label="정답"
              value={draft.answer}
              onChange={(answer) =>
                setDraft((previous) => ({ ...previous, answer }))
              }
            />
          </div>
          <div className={styles.visualField}>
            <strong>풀이</strong>
            <MathTextEditor
              aria-label="풀이"
              value={draft.solution}
              onChange={(solution) =>
                setDraft((previous) => ({ ...previous, solution }))
              }
            />
          </div>
        </div>
      )}
      {!editing && crop.answer.trim() && (
        <div className={styles.answer}>
          <strong>정답</strong>
          <ProblemContent content={displayFractions(crop.answer, crop.grade)} />
        </div>
      )}
      {!editing && crop.solution.trim() && (
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
            disabled={editing}
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
          disabled={!props.available || busy || editing || !crop.content.trim()}
          onClick={() => props.onRun("solution", [crop.id])}
        >
          {crop.solution.trim() ? "해설 다시 생성" : "해설 생성"}
        </button>
        <button
          type="button"
          disabled={busy || editing || crop.reviewed}
          onClick={() => props.onUpdate(crop.id, { reviewed: true })}
        >
          {crop.reviewed ? "검수 완료" : "이 문제 검수 완료"}
        </button>
      </div>
      {cropEditorIndex !== null &&
        displayedFigures?.[cropEditorIndex] &&
        props.original && (
          <StudioDiagramCropEditor
            key={displayedFigures[cropEditorIndex].id}
            original={props.original}
            figure={displayedFigures[cropEditorIndex]}
            index={cropEditorIndex}
            total={displayedFigures.length}
            bounds={crop.rect}
            onClose={() => setCropEditorIndex(null)}
            onSave={(next) => {
              const figures = displayedFigures.map((figure) =>
                figure.id === next.id ? next : figure,
              );
              if (editing) setDraftFigures(figures);
              else update({ figures });
            }}
          />
        )}
    </article>
  );
}
