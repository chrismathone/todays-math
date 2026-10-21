"use client";
/* Local source images must not go through a remote optimizer. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { ProblemContent } from "@/components/math/ProblemContent";
import { SolutionText } from "@/components/math/MathText";
import { fractionViewFor } from "./fractionDisplay";
import {
  STUDIO_QUESTION_TYPES,
  studioFigureLabel,
  visibleStudioWarnings,
  type StudioCrop,
  type StudioFigure,
} from "./studioHelpers";
import StudioPageEmpty from "./StudioPageEmpty";
import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import { MATH_TEXT_WRAP } from "@/components/math/mathTextWrap";
import { repositionScore } from "./nativeProblemLayout";
import {
  editedScoreMetadata,
  studioReviewContent,
} from "./studioReviewContent";
import { MathTextEditor } from "@/components/math/editor/MathTextEditor";
import type { StudioAiPageJob } from "./useStudioAi";
import type { StudioFigureJob } from "./useStudioFigureAi";
import WorkProgress from "./WorkProgress";
import { studioCropWorkKind, studioWorkName } from "./studioWorkNames";
import { studioCartLabel, type StudioCartState } from "./studioCart";
import { StudioCartChip } from "./StudioCartPanel";
import styles from "./StudioReviewPane.module.css";

type Action = "ocr" | "figures" | "solution";
/**
 * 원장님 2026-09-20 «검수 완료 버튼 누르면 모든 해당 문제 버튼 비활성화로 수정 불가능하게».
 * 잠긴 이유를 같은 말로 알린다 — 잠긴 단추의 `title` 과 카드 바닥 한 줄이 이 문구를 쓴다.
 */
const LOCKED_HINT = "수정하려면 검수 완료를 취소하세요.";
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
  /**
   * 담은 문항 — 카드 바닥 줄 끝의 «담음» 표시(읽기 전용, 안 D@foot · 원장님 2026-09-21 확정).
   * 바닥 줄 끝이라 1280px 에서도 카드 머리가 두 줄로 안 꺾인다. 안 넘기면 표시가 안 선다.
   */
  cartState?: (crop: StudioCrop) => StudioCartState;
  /** «반영 전» 표시 옆의 «반영» — 고친 판을 시험지의 같은 자리에 갈아 넣는다. */
  onReflect?: (id: string) => void;
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
  // 도형 번호는 문제 크롭 라벨과 같은 목록 차례를 쓴다 — 원본 인쇄 번호(ocr.number)와 다를 수 있다.
  const position = props.allCrops.findIndex((item) => item.id === crop.id) + 1;
  const number = crop.ocr?.number ?? position;
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
      // 저장은 «고쳤다» 이지 «검수를 마쳤다» 가 아니다 — 여기서 reviewed 를 세우면
      // 저장만 해도 카드가 잠겨 해설 생성·그림 다시 찾기가 막힌다(2026-09-20).
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
        label: studioFigureLabel(position, index),
        box: [
          figure.rect.y * 1000,
          figure.rect.x * 1000,
          (figure.rect.y + figure.rect.height) * 1000,
          (figure.rect.x + figure.rect.width) * 1000,
        ] as [number, number, number, number],
      })),
    [displayedFigures, position],
  );
  const jobs = props.jobs.filter((job) => job.cropId === crop.id);
  const figureJobs = props.figureJobs.filter((job) => job.cropId === crop.id);
  const canEditFigure = (index: number) => {
    const figure = displayedFigures?.[index];
    return (
      Boolean(figure) &&
      !crop.reviewed &&
      !figureJobs.some(
        (job) =>
          job.figureId === figure?.id &&
          ["queued", "running"].includes(job.state),
      )
    );
  };
  const busy =
    jobs.some((job) => ["queued", "running"].includes(job.state)) ||
    figureJobs.some((job) => ["queued", "running"].includes(job.state));
  /** 검수 완료 — 이 문항을 바꾸는 것은 전부 잠근다. 푸는 길은 카드 바닥의 «검수 완료 취소». */
  const locked = Boolean(crop.reviewed);
  const lockTitle = locked ? LOCKED_HINT : undefined;
  const activeJob = jobs.find((job) =>
    ["queued", "running"].includes(job.state),
  );
  const failed = jobs.find((job) => job.state === "error");
  const update = (patch: Partial<StudioCrop>) => {
    props.onSelect(crop.id);
    props.onUpdate(crop.id, patch);
  };
  // 미리보기는 인쇄(NativeProblem·AnswerPage)와 같은 결정으로 초등 가분수를 대분수로 보인다 —
  // 이 문항의 본문·정답·해설을 다 보고 한 번 정한다(바꾸기 문제·«가분수는 그대로 두고» 해설이면
  // 세 칸 모두 원문). 편집 칸·저장 원문은 가분수 그대로다.
  const preview = fractionViewFor(crop);
  const cart = props.cartState?.(crop);
  const readContent = useMemo(
    () =>
      preview(
        showScores
          ? editableContent
          : repositionScore(editableContent, undefined, false),
      ),
    [editableContent, showScores, preview],
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
            disabled={!props.available || busy || editing || locked}
            title={lockTitle}
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
              disabled={busy || locked}
              title={lockTitle}
              onClick={startEdit}
            >
              내용 수정
            </button>
          )}
        </div>
      </div>
      {activeJob && (
        <WorkProgress
          label={`${studioWorkName(studioCropWorkKind(activeJob.action)).long} ${activeJob.state === "queued" ? "대기 중" : "중"}`}
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
            disabled={!props.available || busy || editing || locked}
            title={lockTitle}
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
        // 원본 문항 미리보기도 한글은 어절 단위로(D-164 ② — `mathTextWrap.ts`). 고치는 칸(`MathTextEditor`)은 그대로다.
        <div className={`${styles.content} ${MATH_TEXT_WRAP}`}>
          <SourceEditorDisplay
            value={readContent}
            figures={visualFigures}
            choicesLayout={crop.ocr?.choicesLayout}
            onFigureClick={openFigure}
            isFigureEditable={canEditFigure}
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
            disabled={!props.available || busy || editing || locked}
            title={lockTitle}
            onClick={() => props.onRun("figures", [crop.id])}
          >
            그림 다시 찾기
          </button>
        </div>
        {displayedFigures?.length ? (
          displayedFigures.map((figure, index) => {
            const job = figureJobs.find((job) => job.figureId === figure.id);
            const drawing = job && ["queued", "running"].includes(job.state);
            // 원장님 2026-09-19: 편집은 본문 그림을 눌러서, 영역은 잘라내기 단계에서 고친다 —
            // 그래서 SVG 가 끝난 도형은 여기서 할 말이 없다. 빈 상자를 남기지 않는다.
            if (figure.svg && !drawing) return null;
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
                  // 엔진 원문은 개발자용 — 한 줄에 안 넣고 마우스를 올리면 보인다(트랙 45)
                  <p
                    className={styles.warning}
                    role="alert"
                    title={job.errorDetail}
                  >
                    {job.error}
                  </p>
                )}
                {!figure.svg && (
                  <figcaption>
                    <span>
                      {studioFigureLabel(position, index)} ·{" "}
                      {drawing
                        ? "원본 · SVG 생성 중"
                        : "원본 크롭 · SVG 미생성"}
                    </span>
                    <button
                      type="button"
                      disabled={!props.available || busy || editing || locked}
                      title={lockTitle}
                      onClick={() => props.onRenderFigure(crop.id, figure.id)}
                    >
                      {job?.state === "error" ? "SVG 다시 시도" : "SVG 생성"}
                    </button>
                  </figcaption>
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
      {visibleStudioWarnings(crop.aiWarnings).map((warning, index) => (
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
          <ProblemContent content={preview(crop.answer)} />
        </div>
      )}
      {!editing && crop.solution.trim() && (
        <div className={styles.answer}>
          <strong>해설</strong>
          {/* 해설은 본문 렌더러가 아니라 해설 조합으로 — 본문 렌더러는 해설 속 `1.`·`①` 줄을
              보기 격자로 자른다(2026-09-26 후보정 조사 L). */}
          <SolutionText text={preview(crop.solution)} />
        </div>
      )}
      <div className={styles.cardFooter}>
        <label>
          출력
          <select
            aria-label={`문제 ${number} 출력 방식`}
            value={crop.mode}
            disabled={editing || locked}
            title={lockTitle}
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
          disabled={
            !props.available ||
            busy ||
            editing ||
            locked ||
            !crop.content.trim()
          }
          title={lockTitle}
          onClick={() => props.onRun("solution", [crop.id])}
        >
          {crop.solution.trim() ? "해설 다시 생성" : "해설 생성"}
        </button>
        {locked && <span className={styles.lockNote}>{LOCKED_HINT}</span>}
        {/* 푸는 길은 잠근 자리에 둔다 — 없으면 한 번 잘못 눌러 영영 못 고친다. */}
        <button
          type="button"
          disabled={busy || editing}
          onClick={() => props.onUpdate(crop.id, { reviewed: !locked })}
        >
          {locked ? "검수 완료 취소" : "이 문제 검수 완료"}
        </button>
        {/* 표시와 «반영»은 한 덩어리로 줄 오른쪽 끝 — 모자라면 같이 둘째 줄 오른쪽(안 A, D-135 ⑼).
            «담음»·«뺌»도 같은 자리라 표시 자리가 상태마다 안 바뀐다. 안 담은 문항은 빈 칸을 안 둔다.
            오른쪽으로 모으는 것은 바닥 줄의 justify-content 다 — 덩어리에 auto 여백을 주면 «출력» 칸의
            auto 여백과 빈 자리를 나눠 단추가 가운데로 뜬다(D-135 ⑽). */}
        {cart && studioCartLabel(cart) && (
          <span className={styles.cartSlot} data-studio-cart-slot>
            <StudioCartChip state={cart} />
            {/* 반영은 내용이 아니라 시험지 소속을 바꾼다 — 검수 완료 잠금과 상관없이 눌린다. */}
            {cart === "stale" && props.onReflect && (
              <button
                type="button"
                aria-label={`문제 ${number} 고친 내용 반영`}
                disabled={busy || editing}
                onClick={() => props.onReflect?.(crop.id)}
              >
                반영
              </button>
            )}
          </span>
        )}
      </div>
    </article>
  );
}
