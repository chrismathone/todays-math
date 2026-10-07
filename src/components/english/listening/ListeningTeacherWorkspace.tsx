"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { EnglishListeningDocument } from "@/contracts/englishListening.contract";
import { ListeningTeacherAudio } from "./ListeningTeacherAudio";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import { usesWholeSourceAssessmentAudio } from "@/lib/english/listening/wholeSource";
import styles from "./ListeningTeacherWorkspace.module.css";
import {
  hasFullListeningQuestionImage,
  hasListeningChoiceText,
  listeningChoiceBody,
} from "@/lib/listeningQuestionPresentation";

export type ListeningTeacherMaterial = Pick<
  EnglishListeningDocument,
  "id" | "title" | "level"
> & { questionCount?: number };

export type ListeningTeacherActionContext = { signal: AbortSignal };

export type ListeningTeacherWorkspaceProps = {
  materials: readonly ListeningTeacherMaterial[];
  selectedDocument: EnglishListeningDocument | null;
  /** Caller-authorized URLs only. Asset IDs are never converted into routes. */
  mediaUrlsByAssetId: Readonly<Record<string, string | undefined>>;
  /** Connected controller may render an incomplete draft in the same A workbench. */
  selectedContent?: ReactNode;
  selectedMaterialId?: string;
  embedded?: boolean;
  onSelectMaterial: (
    materialId: string,
    context: ListeningTeacherActionContext,
  ) => void | Promise<void>;
  onCreate?: (context: ListeningTeacherActionContext) => void | Promise<void>;
  onEdit?: (
    document: EnglishListeningDocument,
    context: ListeningTeacherActionContext,
  ) => void | Promise<void>;
  onPublish?: (
    document: EnglishListeningDocument,
    context: ListeningTeacherActionContext,
  ) => void | Promise<void>;
};

type TeacherAction = {
  pending: string;
  error: string;
  run: (context: ListeningTeacherActionContext) => void | Promise<void>;
};

/**
 * Use inside a client controller. Callbacks own authorization and persistence and
 * must check signal.aborted before applying their results to parent state.
 * Changing document identity/revision discards all local work and review state.
 */
export function ListeningTeacherWorkspace(
  props: ListeningTeacherWorkspaceProps,
) {
  const document = props.selectedDocument;
  return (
    <TeacherSession
      key={document ? `${document.id}:${document.revision}` : "unselected"}
      {...props}
    />
  );
}

function TeacherSession({
  materials,
  selectedDocument: document,
  mediaUrlsByAssetId,
  onSelectMaterial,
  onCreate,
  onEdit,
  onPublish,
  selectedContent,
  selectedMaterialId,
  embedded,
}: ListeningTeacherWorkspaceProps) {
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState<TeacherAction | null>(null);
  const [playbackEpoch, setPlaybackEpoch] = useState(0);

  useLayoutEffect(() => () => request.current?.abort(), []);

  async function perform(action: TeacherAction) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPlaybackEpoch((epoch) => epoch + 1);
    setPending(action.pending);
    setFailed(null);
    try {
      await action.run({ signal: controller.signal });
    } catch {
      if (!controller.signal.aborted && request.current === controller) {
        setFailed(action);
      }
    } finally {
      if (!controller.signal.aborted && request.current === controller) {
        setPending(null);
      }
    }
  }

  const questionCount = document?.groups.reduce(
    (total, group) => total + group.questions.length,
    0,
  );

  return (
    <section
      className={`${styles.workspace} ${embedded ? styles.embedded : styles.standalone}`}
      aria-label="교사 영어듣기 작업대"
    >
      {!embedded ? (
        <WorkspacePageHeader
          title="영어듣기"
          description="음원과 문항을 확인하고 수업에서 재생합니다."
        >
          {onCreate ? (
            <button
              type="button"
              className={styles.primary}
              disabled={pending !== null}
              onClick={() =>
                void perform({
                  pending: "자료 만들기를 여는 중입니다.",
                  error: "자료 만들기를 열지 못했습니다. 다시 시도해 주세요.",
                  run: onCreate,
                })
              }
            >
              자료 만들기
            </button>
          ) : null}
        </WorkspacePageHeader>
      ) : null}

      <div
        role="status"
        aria-live="polite"
        className={pending ? styles.notice : undefined}
      >
        {pending}
      </div>
      {failed ? (
        <div role="alert" className={styles.error}>
          <p>{failed.error}</p>
          <button type="button" onClick={() => void perform(failed)}>
            다시 시도
          </button>
        </div>
      ) : null}

      <div className={styles.split}>
        <aside className={styles.catalog} aria-label="듣기 자료 목록">
          <h2>
            듣기 자료 <span className={styles.count}>{materials.length}개</span>
          </h2>
          {materials.length === 0 ? (
            <p className={styles.empty}>등록된 듣기 자료가 없습니다.</p>
          ) : (
            <ul
              className={styles.materials}
              aria-label="듣기 자료 선택"
              tabIndex={0}
            >
              {materials.map((material) => (
                <li key={material.id}>
                  <button
                    type="button"
                    className={styles.material}
                    aria-pressed={
                      (selectedMaterialId ?? document?.id) === material.id
                    }
                    onClick={() =>
                      void perform({
                        pending: "자료를 불러오는 중입니다.",
                        error:
                          "자료를 불러오지 못했습니다. 다시 시도해 주세요.",
                        run: (context) =>
                          onSelectMaterial(material.id, context),
                      })
                    }
                  >
                    <strong>{material.title}</strong>
                    <span className={styles.muted}>
                      {material.level ?? "수준 미지정"}
                      {material.questionCount !== undefined
                        ? ` · ${material.questionCount}문항`
                        : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section
          className={styles.pane}
          aria-label="선택한 듣기 자료"
          aria-busy={pending !== null}
        >
          {selectedContent !== undefined ? (
            selectedContent
          ) : document ? (
            <>
              <div className={styles.documentHeading}>
                <h2>{document.title}</h2>
                <p className={styles.eyebrow}>
                  {document.level ?? "수준 미지정"} · {document.groups.length}
                  묶음 · {questionCount}문항 · 개정 {document.revision}
                </p>
              </div>
              <dl className={styles.metadata}>
                <dt>제작 출처</dt>
                <dd>{document.provenance.basis}</dd>
              </dl>
              <TeacherWorkbench
                document={document}
                mediaUrlsByAssetId={mediaUrlsByAssetId}
                playbackEpoch={playbackEpoch}
                busy={pending !== null}
              />
              {onEdit || onPublish ? (
                <div className={styles.actions}>
                  {onEdit ? (
                    <button
                      type="button"
                      disabled={pending !== null}
                      onClick={() =>
                        void perform({
                          pending: "수정을 여는 중입니다.",
                          error: "수정을 열지 못했습니다. 다시 시도해 주세요.",
                          run: (context) => onEdit(document, context),
                        })
                      }
                    >
                      수정
                    </button>
                  ) : null}
                  {onPublish ? (
                    <button
                      type="button"
                      className={styles.primary}
                      disabled={pending !== null}
                      onClick={() =>
                        void perform({
                          pending: "발행 중입니다.",
                          error: "발행하지 못했습니다. 다시 시도해 주세요.",
                          run: (context) => onPublish(document, context),
                        })
                      }
                    >
                      발행
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className={styles.empty}>듣기 자료를 선택하세요.</p>
          )}
        </section>
      </div>
    </section>
  );
}

export function TeacherWorkbench({
  document,
  mediaUrlsByAssetId,
  playbackEpoch,
  busy,
}: {
  document: EnglishListeningDocument;
  mediaUrlsByAssetId: ListeningTeacherWorkspaceProps["mediaUrlsByAssetId"];
  playbackEpoch: number;
  busy: boolean;
}) {
  const [groupIndex, setGroupIndex] = useState(0);
  const [review, setReview] = useState(false);
  const reviewId = useId();
  const group = document.groups[groupIndex] ?? document.groups[0];
  const url = mediaUrlsByAssetId[group.audio.assetId]?.trim();
  const questionOffset = document.groups
    .slice(0, groupIndex)
    .reduce((total, item) => total + item.questions.length, 0);

  return (
    <>
      {document.groups.length > 1 ? (
        <nav className={styles.groups} aria-label="문항 묶음">
          {document.groups.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={group.id === item.id}
              disabled={busy}
              onClick={() => setGroupIndex(index)}
            >
              묶음 {index + 1} · {item.questions.length}문항
            </button>
          ))}
        </nav>
      ) : null}
      {usesWholeSourceAssessmentAudio({
        source: document.source,
        groups: [group],
      }) ? (
        <p className={styles.muted}>회차 전체 원본 음원</p>
      ) : null}
      <ListeningTeacherAudio
        key={`${group.id}:${group.audio.sha256}:${url ?? ""}:${playbackEpoch}`}
        url={url}
        durationMs={group.audio.durationMs}
        disabled={busy}
      />
      <div className={styles.reviewHeading}>
        <p className={styles.muted}>
          묶음 {groupIndex + 1} · {questionOffset + 1}–
          {questionOffset + group.questions.length}번
        </p>
        <button
          type="button"
          aria-expanded={review}
          aria-controls={reviewId}
          onClick={() => setReview((value) => !value)}
        >
          {review ? "대본과 정답 닫기" : "대본과 정답 보기"}
        </button>
      </div>
      <div id={reviewId}>
        {review ? (
          <section className={styles.review} aria-label="교사용 대본">
            <h3>대본과 해석</h3>
            <p lang="en" className={styles.transcript}>
              {group.transcript.text}
            </p>
            {group.transcript.translation ? (
              <p className={styles.transcript}>
                {group.transcript.translation}
              </p>
            ) : null}
          </section>
        ) : null}
        <ol className={styles.questions} start={questionOffset + 1}>
          {group.questions.map((question, index) => {
            const answerIndex = question.choices.findIndex(
              (choice) => choice.id === question.answerChoiceId,
            );
            const fullImage = hasFullListeningQuestionImage(question.image);
            return (
              <li key={question.id} className={styles.question}>
                <h3>
                  {questionOffset + index + 1}.{" "}
                  {fullImage
                    ? `원본 ${question.sourceNumber ?? questionOffset + index + 1}번`
                    : question.prompt}
                </h3>
                {question.instruction &&
                (fullImage ||
                  !question.prompt.includes(question.instruction)) ? (
                  <p>{question.instruction}</p>
                ) : null}
                {question.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={question.image.dataUrl}
                    width={question.image.width}
                    height={question.image.height}
                    alt={
                      fullImage
                        ? question.prompt
                        : `${questionOffset + index + 1}번 시각 자료`
                    }
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                ) : null}
                {!fullImage &&
                (!question.image ||
                  hasListeningChoiceText(
                    question.choices.map((choice) => choice.text),
                  )) ? (
                  <ol className={styles.choices}>
                    {question.choices.map((choice, choiceIndex) => (
                      <li key={choice.id}>
                        {listeningChoiceBody(choice.text, choiceIndex)}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {review ? (
                  <div className={styles.answer}>
                    <strong>
                      정답 {answerIndex + 1} ·{" "}
                      {question.choices[answerIndex]?.text}
                    </strong>
                    <p>{question.explanation}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
