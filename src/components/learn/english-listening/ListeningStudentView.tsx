"use client";

import { useEffect, useRef, useState } from "react";
import type { EnglishListeningStudentView } from "@/contracts/englishListeningStudent.contract";
import styles from "./ListeningStudentView.module.css";
import {
  hasFullListeningQuestionImage,
  listeningChoiceBody,
} from "@/lib/listeningQuestionPresentation";

/** Adapter snapshots are server facts. Time is displayed, never enforced here. */
export interface ListeningStudentAttemptSnapshot {
  id: string;
  revision: number;
  status:
    | "ready"
    | "in_progress"
    | "submitted"
    | "interrupted"
    | "expired"
    | "cancelled";
  serverNow: string;
  startedAt: string | null;
  deadlineAt: string | null;
  submittedAt: string | null;
  answers: readonly { questionId: string; choiceId: string }[];
  reviewAnswers?: readonly { questionId: string; choiceId: string }[];
}

export interface ListeningStudentRequest {
  attemptId: string;
  expectedRevision: number;
  requestId: string;
}

export interface ListeningStudentAnswerRequest extends ListeningStudentRequest {
  questionId: string;
  choiceId: string;
  phase?: "initial" | "review";
}

export interface ListeningStudentMedia {
  /** Already authorized URLs; this component neither constructs nor resolves them. */
  urlsByAssetId: Readonly<Record<string, string | undefined>>;
  /** A separate sound-check clip, without unreleased test content. */
  soundCheckUrl: string;
  /** For exams, the adapter supplies current server-authorized playback capabilities. */
  playbackPolicy: {
    canPlay: boolean;
    canPause: boolean;
    canSeek: boolean;
    canRepeat: boolean;
  };
}

export interface ListeningStudentViewProps {
  view: EnglishListeningStudentView;
  mode: "practice" | "exam";
  attempt: ListeningStudentAttemptSnapshot;
  media?: ListeningStudentMedia;
  /** These callbacks belong to a client adapter, not a Server Component prop boundary.
   * Preserve requestId and payload across transport retries; return authoritative snapshots.
   * Refresh `view` separately to deliver server-authorized review content.
   */
  onStart: (
    request: ListeningStudentRequest,
  ) => Promise<ListeningStudentAttemptSnapshot>;
  onCommitAnswer: (
    request: ListeningStudentAnswerRequest,
  ) => Promise<ListeningStudentAttemptSnapshot>;
  onSubmit: (
    request: ListeningStudentRequest,
  ) => Promise<ListeningStudentAttemptSnapshot>;
}

type Operation = (
  | { kind: "answer"; request: ListeningStudentAnswerRequest }
  | { kind: "start" | "submit"; request: ListeningStudentRequest }
) & { pending: boolean };

const failureText = {
  answer: "답 저장을 확인하지 못했습니다. 같은 답으로 다시 시도해 주세요.",
  start: "시작을 확인하지 못했습니다. 다시 시도해 주세요.",
  submit: "제출을 확인하지 못했습니다. 다시 시도해 주세요.",
};
const retryText = {
  answer: "답 저장 다시 시도",
  start: "시작 다시 시도",
  submit: "제출 다시 시도",
};
const statusText = {
  ready: "시작 전",
  in_progress: "진행 중",
  submitted: "제출 완료",
  interrupted: "응시가 중단되었습니다. 선생님에게 확인해 주세요.",
  expired: "응시 시간이 종료되었습니다. 저장한 답은 유지됩니다.",
  cancelled: "배정이 취소되었습니다. 선생님에게 확인해 주세요.",
};

function clockText(seconds: number) {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

function newerSnapshot(
  a: ListeningStudentAttemptSnapshot,
  b: ListeningStudentAttemptSnapshot,
) {
  if (a.revision !== b.revision) return a.revision > b.revision ? a : b;
  return Date.parse(a.serverNow) >= Date.parse(b.serverNow) ? a : b;
}

function useMounted() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

/** A new identity unmounts all requests, drafts and media belonging to the old attempt. */
export function ListeningStudentView(props: ListeningStudentViewProps) {
  const { view, attempt, mode } = props;
  return (
    <StudentAttempt
      key={JSON.stringify([
        attempt.id,
        view.assignmentId,
        view.publicationId,
        view.audioSource,
        mode,
      ])}
      {...props}
    />
  );
}

function StudentAttempt({
  view,
  mode,
  attempt,
  media,
  onStart,
  onCommitAnswer,
  onSubmit,
}: ListeningStudentViewProps) {
  const mounted = useMounted();
  const [acknowledged, setAcknowledged] = useState(attempt);
  const current = newerSnapshot(attempt, acknowledged);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [operation, setOperation] = useState<Operation | null>(null);
  // The ref closes the double-click window before React commits disabled controls.
  const operationRef = useRef<Operation | null>(null);
  const [confirmedSoundUrl, setConfirmedSoundUrl] = useState<string | null>(
    null,
  );
  const [completedAudio, setCompletedAudio] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const questions = view.groups.flatMap((group) =>
    group.questions.map((question) => ({ group, question })),
  );
  const item = questions[Math.min(questionIndex, questions.length - 1)];
  const fullImage = hasFullListeningQuestionImage(item?.question.image);
  const savedCount = questions.filter(({ question }) =>
    current.answers.some((answer) => answer.questionId === question.id),
  ).length;
  const active = current.status === "in_progress";
  const ready = current.status === "ready";
  const studentAudio = view.audioSource === "student_device";
  // Do not even inspect media properties in teacher_device mode.
  const soundCheckUrl = studentAudio ? media?.soundCheckUrl : undefined;
  const soundConfirmed =
    !studentAudio ||
    Boolean(soundCheckUrl && confirmedSoundUrl === soundCheckUrl);

  function request(): ListeningStudentRequest {
    return {
      attemptId: current.id,
      expectedRevision: current.revision,
      requestId: crypto.randomUUID(),
    };
  }

  async function perform(next: Operation) {
    if (operationRef.current?.pending) return;
    operationRef.current = { ...next, pending: true };
    setOperation(operationRef.current);
    try {
      const result =
        next.kind === "answer"
          ? await onCommitAnswer(next.request)
          : next.kind === "start"
            ? await onStart(next.request)
            : await onSubmit(next.request);
      if (!mounted.current) return;
      // A resolved transport alone does not mean an answer was saved or submitted.
      const confirmed =
        result.id === next.request.attemptId &&
        result.revision >= next.request.expectedRevision &&
        (next.kind === "answer"
          ? (next.request.phase === "review"
              ? (result.reviewAnswers ?? [])
              : result.answers
            ).some(
              (answer) =>
                answer.questionId === next.request.questionId &&
                answer.choiceId === next.request.choiceId,
            )
          : next.kind === "submit"
            ? result.status === "submitted" && result.submittedAt !== null
            : result.status === "in_progress" && result.startedAt !== null);
      if (!confirmed) throw new Error("Unconfirmed server result");
      setAcknowledged((previous) => newerSnapshot(result, previous));
      if (
        mode === "exam" &&
        next.kind === "answer" &&
        next.request.phase !== "review"
      ) {
        setDrafts((previous) => {
          const clean = { ...previous };
          if (clean[next.request.questionId] === next.request.choiceId)
            delete clean[next.request.questionId];
          return clean;
        });
      }
      operationRef.current = null;
      setOperation(null);
    } catch {
      if (!mounted.current) return;
      // A timeout may follow a successful server write. Keep payload AND key frozen.
      operationRef.current = { ...next, pending: false };
      setOperation(operationRef.current);
    }
  }

  function commit() {
    if (
      !item ||
      !active ||
      operationRef.current ||
      (mode !== "exam" &&
        current.answers.some((a) => a.questionId === item.question.id))
    )
      return;
    const choiceId = drafts[item.question.id];
    if (!choiceId) return;
    void perform({
      kind: "answer",
      pending: true,
      request: { ...request(), questionId: item.question.id, choiceId },
    });
  }

  const savedAnswer =
    item &&
    current.answers.find((answer) => answer.questionId === item.question.id);
  const selected =
    mode === "exam" && active
      ? ((item ? drafts[item.question.id] : undefined) ?? savedAnswer?.choiceId)
      : (savedAnswer?.choiceId ??
        (item ? drafts[item.question.id] : undefined));
  const unsavedExamAnswer =
    mode === "exam" &&
    questions.some(
      ({ question }) =>
        drafts[question.id] !== undefined &&
        drafts[question.id] !==
          current.answers.find((answer) => answer.questionId === question.id)
            ?.choiceId,
    );
  const reviewQuestion =
    item?.group.state === "review"
      ? item.group.questions.find(
          (question) => question.id === item.question.id,
        )
      : undefined;
  const step = ready ? 1 : current.status === "submitted" ? 3 : 2;

  return (
    <section className={styles.view} aria-label="영어 듣기 학습">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            오늘 영어 · {mode === "exam" ? "짧은 평가" : "나의 듣기"}
          </p>
          <h1>{view.title}</h1>
          <p className={styles.muted}>대화를 듣고 한 문제씩 답을 확정하세요.</p>
        </div>
        {mode === "exam" && current.deadlineAt ? (
          <p className={styles.time}>
            남은 시간{" "}
            {clockText(
              (Date.parse(current.deadlineAt) - Date.parse(current.serverNow)) /
                1000,
            )}
            <small>서버 확인 기준</small>
          </p>
        ) : (
          <p className={styles.time}>
            문항 {item ? questionIndex + 1 : 0} / {questions.length}
          </p>
        )}
      </header>

      <div className={styles.focus}>
        <ol className={styles.steps} aria-label="학습 단계">
          <li aria-current={step === 1 ? "step" : undefined}>
            1 {studentAudio ? "소리 확인" : "방송 대기"}
          </li>
          <li aria-current={step === 2 ? "step" : undefined}>2 듣고 답하기</li>
          <li aria-current={step === 3 ? "step" : undefined}>
            3 {mode === "exam" ? "제출 확인" : "복습"}
          </li>
        </ol>

        {!studentAudio ? (
          <p className={styles.notice}>
            교실 스피커에서 선생님이 재생합니다. 내 기기에는 재생 버튼이
            없습니다.
          </p>
        ) : ready ? (
          soundCheckUrl ? (
            <SoundCheck
              key={soundCheckUrl}
              url={soundCheckUrl}
              confirmed={soundConfirmed}
              onConfirm={() => setConfirmedSoundUrl(soundCheckUrl)}
            />
          ) : (
            <p className={styles.notice}>소리 확인 음원을 준비하고 있습니다.</p>
          )
        ) : item && "audio" in item.group ? (
          <StudentPlayer
            key={JSON.stringify([
              item.group.id,
              media?.urlsByAssetId[item.group.audio.assetId],
            ])}
            url={media?.urlsByAssetId[item.group.audio.assetId]}
            durationMs={item.group.audio.durationMs}
            completed={completedAudio.has(item.group.id)}
            onComplete={() =>
              setCompletedAudio((previous) =>
                new Set(previous).add(item.group.id),
              )
            }
            disabled={
              !active &&
              !(current.status === "submitted" && item.group.state === "review")
            }
            policy={
              mode === "practice"
                ? {
                    canPlay: true,
                    canPause: true,
                    canSeek: true,
                    canRepeat: true,
                  }
                : media?.playbackPolicy
            }
          />
        ) : null}

        {ready ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={!soundConfirmed || operation !== null}
              onClick={() => {
                if (operationRef.current) return;
                void perform({
                  kind: "start",
                  pending: true,
                  request: request(),
                });
              }}
            >
              {mode === "exam" ? "평가 시작" : "학습 시작"}
            </button>
            {operation?.kind === "start" && operation.pending ? (
              <p role="status">시작 확인 중…</p>
            ) : null}
          </div>
        ) : null}

        <ol className={styles.progress} aria-label="문항 진행">
          {questions.map(({ question }, index) => (
            <li
              key={question.id}
              aria-current={questionIndex === index ? "step" : undefined}
              data-saved={current.answers.some(
                (a) => a.questionId === question.id,
              )}
            >
              <span
                aria-label={`${index + 1}번 ${current.answers.some((a) => a.questionId === question.id) ? "저장 완료" : "미저장"}`}
              >
                {index + 1}
              </span>
            </li>
          ))}
        </ol>

        {item ? (
          <section
            className={styles.question}
            aria-label={`${questionIndex + 1}번 문항`}
          >
            <fieldset
              className={styles.fieldset}
              disabled={
                !active ||
                (mode !== "exam" && Boolean(savedAnswer)) ||
                operation !== null
              }
            >
              <legend>
                <span className={styles.questionNumber}>
                  {questionIndex + 1}.
                </span>{" "}
                <span>{fullImage ? "원본 문항" : item.question.prompt}</span>
                {item.question.origin === "audio_reconstructed" && (
                  <span>원본 문제지 없음 · 음원 기반 재구성</span>
                )}
              </legend>
              {item.question.instruction &&
              (fullImage ||
                !item.question.prompt.includes(item.question.instruction)) ? (
                <p>{item.question.instruction}</p>
              ) : null}
              {item.question.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.question.image.dataUrl}
                  width={item.question.image.width}
                  height={item.question.image.height}
                  alt={
                    fullImage
                      ? item.question.prompt
                      : `${questionIndex + 1}번 시각 자료`
                  }
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              )}
              <div className={styles.choices}>
                {item.question.choices.map((choice, index) => (
                  <label className={styles.choice} key={choice.id}>
                    <input
                      type="radio"
                      name={`listening-${current.id}-${item.question.id}`}
                      value={choice.id}
                      aria-label={
                        fullImage || !listeningChoiceBody(choice.text, index)
                          ? `${index + 1}번 보기${listeningChoiceBody(choice.text, index) ? `: ${listeningChoiceBody(choice.text, index)}` : ""}`
                          : undefined
                      }
                      checked={selected === choice.id}
                      onChange={() =>
                        setDrafts((previous) => ({
                          ...previous,
                          [item.question.id]: choice.id,
                        }))
                      }
                    />
                    <span className={styles.choiceNumber}>{index + 1}</span>
                    {!fullImage && listeningChoiceBody(choice.text, index) ? (
                      <span>{listeningChoiceBody(choice.text, index)}</span>
                    ) : null}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={styles.answerActions}>
              <button
                type="button"
                className={styles.primary}
                disabled={
                  !active ||
                  !selected ||
                  (mode === "exam"
                    ? selected === savedAnswer?.choiceId
                    : Boolean(savedAnswer)) ||
                  operation !== null
                }
                onClick={commit}
              >
                {mode === "exam" ? "답 저장" : "답 확정"}
              </button>
              <p
                role="status"
                className={savedAnswer ? styles.saved : styles.muted}
              >
                {savedAnswer && selected === savedAnswer.choiceId
                  ? mode === "exam" && active
                    ? "저장 완료 · 제출 전까지 바꿀 수 있습니다."
                    : "저장 완료 · 확정한 답은 바꿀 수 없습니다."
                  : operation?.kind === "answer" && operation.pending
                    ? "답 저장 중…"
                    : operation?.kind === "answer"
                      ? "저장 확인이 필요합니다. 아래에서 다시 시도해 주세요."
                      : selected
                        ? "선택한 답을 확정해 주세요."
                        : "아직 답하지 않았습니다."}
              </p>
            </div>
          </section>
        ) : (
          <p className={styles.notice}>표시할 문항이 없습니다.</p>
        )}

        {operation && !operation.pending ? (
          <div className={styles.error} role="alert">
            <p>{failureText[operation.kind]}</p>
            <button
              type="button"
              disabled={
                operation.kind === "start"
                  ? !ready
                  : operation.kind === "answer" &&
                      operation.request.phase === "review"
                    ? !(active || current.status === "submitted")
                    : !active
              }
              onClick={() => void perform(operation)}
            >
              {retryText[operation.kind]}
            </button>
          </div>
        ) : null}

        <nav className={styles.navigation} aria-label="문항 이동">
          <button
            type="button"
            disabled={questionIndex === 0 || operation !== null}
            onClick={() => setQuestionIndex((index) => index - 1)}
          >
            이전 문항
          </button>
          <button
            type="button"
            disabled={
              questionIndex >= questions.length - 1 || operation !== null
            }
            onClick={() => setQuestionIndex((index) => index + 1)}
          >
            다음 문항
          </button>
        </nav>

        {item?.group.state === "review" &&
        reviewQuestion &&
        "answerChoiceId" in reviewQuestion ? (
          <section className={styles.review} aria-label="대본과 해설">
            <h2>대본과 해설</h2>
            <p className={styles.transcript}>{item.group.transcript.text}</p>
            {item.group.transcript.translation ? (
              <p className={styles.muted}>
                {item.group.transcript.translation}
              </p>
            ) : null}
            <p>
              <strong>
                정답{" "}
                {item.question.choices.findIndex(
                  (choice) => choice.id === reviewQuestion.answerChoiceId,
                ) + 1}
              </strong>{" "}
              ·{" "}
              {
                item.question.choices.find(
                  (choice) => choice.id === reviewQuestion.answerChoiceId,
                )?.text
              }
            </p>
            <p>{reviewQuestion.explanation}</p>
            {savedAnswer &&
            ((active && mode === "practice") ||
              current.status === "submitted") ? (
              <fieldset
                className={styles.choices}
                disabled={operation !== null}
              >
                <legend>대본 확인 후 복습</legend>
                {item.question.choices.map((choice, index) => (
                  <label key={choice.id}>
                    <input
                      type="radio"
                      name={`review-${item.question.id}`}
                      aria-label={`복습 ${index + 1} ${choice.text}`}
                      checked={
                        (drafts[`review:${item.question.id}`] ??
                          current.reviewAnswers?.find(
                            (a) => a.questionId === item.question.id,
                          )?.choiceId) === choice.id
                      }
                      onChange={() =>
                        setDrafts((previous) => ({
                          ...previous,
                          [`review:${item.question.id}`]: choice.id,
                        }))
                      }
                    />
                    <span>
                      {index + 1}{" "}
                      {!fullImage
                        ? listeningChoiceBody(choice.text, index)
                        : "번 보기"}
                    </span>
                  </label>
                ))}
                <button
                  type="button"
                  disabled={
                    !drafts[`review:${item.question.id}`] || operation !== null
                  }
                  onClick={() => {
                    const choiceId = drafts[`review:${item.question.id}`];
                    if (!choiceId || operationRef.current) return;
                    void perform({
                      kind: "answer",
                      pending: true,
                      request: {
                        ...request(),
                        questionId: item.question.id,
                        choiceId,
                        phase: "review",
                      },
                    });
                  }}
                >
                  복습 답 저장
                </button>
                {current.reviewAnswers?.some(
                  (a) => a.questionId === item.question.id,
                ) ? (
                  <p role="status">복습 답 저장 완료 · 최초 답은 유지됩니다.</p>
                ) : (
                  <p className={styles.muted}>
                    복습 답은 최초 답과 별도로 기록합니다.
                  </p>
                )}
              </fieldset>
            ) : null}
          </section>
        ) : (
          <p className={styles.notice}>
            정답과 대본은 공개가 확인되면 표시됩니다.
          </p>
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.meta}>
          <p role="status">
            {savedCount} / {questions.length} 답 저장
          </p>
          <p
            role="status"
            className={
              current.status === "submitted" ? styles.saved : undefined
            }
          >
            {statusText[current.status]}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={
              !active ||
              !questions.length ||
              savedCount !== questions.length ||
              unsavedExamAnswer ||
              operation !== null
            }
            onClick={() => {
              if (operationRef.current) return;
              void perform({
                kind: "submit",
                pending: true,
                request: request(),
              });
            }}
          >
            답안 제출
          </button>
          {operation?.kind === "submit" && operation.pending ? (
            <p role="status">제출 확인 중…</p>
          ) : null}
        </div>
      </footer>
    </section>
  );
}

function SoundCheck({
  url,
  confirmed,
  onConfirm,
}: {
  url: string;
  confirmed: boolean;
  onConfirm: () => void;
}) {
  const [played, setPlayed] = useState(false);
  return (
    <div>
      <StudentPlayer
        url={url}
        disabled={confirmed}
        label="소리 확인"
        policy={{
          canPlay: true,
          canPause: true,
          canSeek: false,
          canRepeat: false,
        }}
        onPlayed={() => setPlayed(true)}
      />
      {confirmed ? (
        <p className={styles.saved}>소리 확인 완료</p>
      ) : played ? (
        <button type="button" onClick={onConfirm}>
          소리가 들립니다
        </button>
      ) : (
        <p className={styles.muted}>소리를 재생한 뒤 들리는지 확인해 주세요.</p>
      )}
    </div>
  );
}

type StudentPlayerProps = {
  url?: string;
  durationMs?: number;
  disabled: boolean;
  policy?: ListeningStudentMedia["playbackPolicy"];
  label?: string;
  onPlayed?: () => void;
  completed?: boolean;
  onComplete?: () => void;
};

function StudentPlayer(props: StudentPlayerProps) {
  // Revoked or refreshed authorization retires the old element and play promise.
  return (
    <PlayerMedia
      key={JSON.stringify([props.url, props.disabled, props.policy?.canPlay])}
      {...props}
    />
  );
}

function PlayerMedia({
  url,
  durationMs = 0,
  disabled,
  policy,
  label = "재생",
  onPlayed,
  completed = false,
  onComplete,
}: StudentPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mounted = useMounted();
  const playSequence = useRef(0);
  const inFlight = useRef(false);
  const [phase, setPhase] = useState<
    "idle" | "pending" | "playing" | "paused" | "ended" | "error"
  >("idle");
  const [position, setPosition] = useState(0);
  const enabled = Boolean(url && !disabled && policy?.canPlay);
  const replayBlocked = completed && !policy?.canRepeat;
  const playing = phase === "playing";

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      playSequence.current += 1;
      audio?.pause();
    };
  }, []);

  async function play(restart = false) {
    const audio = audioRef.current;
    if (!audio || !enabled || replayBlocked || inFlight.current) return;
    inFlight.current = true;
    const sequence = ++playSequence.current;
    setPhase("pending");
    try {
      if (restart) audio.currentTime = 0;
      await audio.play();
      if (!mounted.current || sequence !== playSequence.current) {
        audio.pause();
        return;
      }
      inFlight.current = false;
      setPhase("playing");
      onPlayed?.();
    } catch {
      if (!mounted.current || sequence !== playSequence.current) return;
      inFlight.current = false;
      setPhase("error");
    }
  }
  function pause() {
    playSequence.current += 1;
    inFlight.current = false;
    audioRef.current?.pause();
    setPhase("paused");
  }

  return (
    <div
      className={styles.player}
      aria-label={label === "소리 확인" ? "소리 확인 음원" : "대화 음원"}
    >
      {url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
          onEnded={() => {
            playSequence.current += 1;
            inFlight.current = false;
            setPhase("ended");
            onComplete?.();
          }}
          onPause={() => {
            if (mounted.current)
              setPhase((previous) =>
                previous === "playing" ? "paused" : previous,
              );
          }}
          onError={() => {
            playSequence.current += 1;
            inFlight.current = false;
            setPhase("error");
          }}
        />
      ) : null}
      <div className={styles.playerMain}>
        <button
          type="button"
          disabled={
            !enabled ||
            replayBlocked ||
            phase === "pending" ||
            (playing && !policy?.canPause)
          }
          onClick={() => (playing ? pause() : void play())}
        >
          {replayBlocked
            ? "재생 완료"
            : playing
              ? policy?.canPause
                ? "일시정지"
                : "재생 중"
              : phase === "pending"
                ? "재생 시작 중…"
                : label}
        </button>
        <div className={styles.playerPosition}>
          {policy?.canSeek ? (
            <input
              type="range"
              min={0}
              max={durationMs / 1000}
              step={0.1}
              value={Math.min(position, durationMs / 1000)}
              disabled={!enabled || phase === "pending"}
              aria-label="재생 위치"
              onChange={(event) => {
                const seconds = Number(event.target.value);
                if (audioRef.current) audioRef.current.currentTime = seconds;
                setPosition(seconds);
              }}
            />
          ) : (
            <progress
              aria-label="재생 진행"
              value={position}
              max={durationMs / 1000 || 1}
            />
          )}
        </div>
        {durationMs > 0 ? (
          <span className={styles.time}>
            {clockText(position)} / {clockText(durationMs / 1000)}
          </span>
        ) : null}
      </div>
      {policy?.canRepeat ? (
        <button
          type="button"
          className={styles.repeat}
          disabled={!enabled || phase === "pending"}
          onClick={() => void play(true)}
        >
          처음부터 다시 듣기
        </button>
      ) : null}
      {phase === "error" ? (
        <p className={styles.playError} role="alert">
          소리를 재생하지 못했습니다. 연결과 소리 설정을 확인하고 다시 재생해
          주세요.
        </p>
      ) : (
        <p className={styles.muted} role="status">
          {!url
            ? "음원을 준비하고 있습니다."
            : !enabled
              ? "현재 재생할 수 없습니다."
              : playing
                ? "재생 중"
                : phase === "ended"
                  ? "재생 완료"
                  : phase === "pending"
                    ? "소리 재생을 확인하고 있습니다."
                    : "재생 버튼을 눌러 소리를 들으세요."}
        </p>
      )}
    </div>
  );
}
