"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MathSrsReplay,
  MathSrsReplayKind,
} from "@/contracts/mathSrsReplay.contract";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import { solutionForDisplay } from "@/lib/solutionSteps";
import AnswerFeedbackEffect from "./AnswerFeedbackEffect";
import pageTurn from "./question-page-turn.module.css";
import { useQuestionPageTurn } from "./useQuestionPageTurn";
import { EnterKey, NumberKey } from "./AnswerKeyCaps";
import { answerKey, useAnswerKeys } from "./useAnswerKeys";
import s from "./student-replay.module.css";
import { useLearningSounds } from "./LearningSounds";
import { learningSoundCue } from "./learningSoundCue";

const ProblemContent = dynamic(() =>
  import("@/components/math/ProblemContent").then((m) => m.ProblemContent),
);
const MathText = dynamic(() =>
  import("@/components/math/MathText").then((m) => m.MathText),
);

export default function StudentReplayDialog({
  kind,
  step,
  dayId,
  dayTitle,
  total = 1,
  onClose,
}: {
  kind: MathSrsReplayKind;
  step: number;
  dayId?: string;
  dayTitle?: string;
  total?: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const { gesture, play } = useLearningSounds();
  const feedbackEventRef = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const solutionDialog = useRef<HTMLDialogElement>(null);
  const solutionOpener = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // 대화상자 자신이 키의 범위다 — 뒤 화면은 대화상자에 가려 키를 먹지 않고, 풀이 대화상자가 열리면 이것도 멈춘다.
  useAnswerKeys(dialog);
  const request = useRef<AbortController | null>(null);
  const [data, setData] = useState<MathSrsReplay | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [parts, setParts] = useState<number[]>([]);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [feedbackEvent, setFeedbackEvent] = useState(0);
  const [currentStep, setCurrentStep] = useState(step);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const turnPage = useQuestionPageTurn(
    data ? `${currentStep}:${data.problemId}` : null,
  );

  const perform = useCallback(
    async (input?: {
      problemId: string;
      submittedAnswer: string;
      revealSolution?: boolean;
    }) => {
      if (request.current) return;
      if (input && !input.revealSolution) gesture();
      const controller = new AbortController();
      request.current = controller;
      const timeout = setTimeout(() => controller.abort(), 15_000);
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(
          input
            ? "/api/learn/math-srs/replay"
            : `/api/learn/math-srs/replay?kind=${kind}&step=${currentStep}${dayId ? `&dayId=${encodeURIComponent(dayId)}` : ""}`,
          {
            cache: "no-store",
            signal: controller.signal,
            ...(input
              ? {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    kind,
                    step: currentStep,
                    ...(dayId ? { dayId } : {}),
                    ...input,
                  }),
                }
              : {}),
          },
        );
        const json = await response.json().catch(() => null);
        if (request.current !== controller) return;
        if (controller.signal.aborted) throw new Error("late-response");
        if (response.status === 401) {
          router.replace("/learn/login");
          return;
        }
        if (
          response.status === 403 &&
          json?.error?.message === STUDENT_MUST_CHANGE_MESSAGE
        ) {
          router.replace("/learn/password");
          return;
        }
        if (!response.ok)
          throw new Error(
            json?.error?.message ??
              "문제를 불러오지 못했어요. 다시 시도해 주세요.",
          );
        const { mathSrsReplayResponseSchema } =
          await import("@/contracts/mathSrsReplay.contract");
        const parsed = mathSrsReplayResponseSchema.safeParse(json);
        if (!parsed.success)
          throw new Error(
            "복습 문제를 확인하지 못했어요. 진도판에서 다시 열어 주세요.",
          );
        const replay = parsed.data.data;
        if (request.current !== controller) return;
        if (controller.signal.aborted) throw new Error("late-response");
        setData(replay);
        if (input && !input.revealSolution && replay.correct !== null) {
          const event = ++feedbackEventRef.current;
          setFeedbackEvent(event);
          setFeedbackCorrect(replay.correct);
          if (
            replay.problemId === input.problemId &&
            replay.kind === kind &&
            replay.step === currentStep
          ) {
            const cue = learningSoundCue(
              { type: "replay", submittedAnswer: input.submittedAnswer },
              replay.correct,
            );
            if (cue)
              play(
                cue,
                `replay:${kind}:${dayId ?? "today"}:${currentStep}:${input.problemId}:${event}`,
              );
          }
        }
        if (input?.revealSolution && replay.solution) setSolutionOpen(true);
      } catch (failure) {
        if (request.current === controller)
          setError(
            controller.signal.aborted
              ? "응답이 늦어지고 있어요. 다시 시도해 주세요."
              : failure instanceof TypeError
                ? "연결을 확인하고 다시 시도해 주세요."
                : failure instanceof Error
                  ? failure.message
                  : "연결을 확인하고 다시 시도해 주세요.",
          );
      } finally {
        clearTimeout(timeout);
        if (request.current === controller) {
          request.current = null;
          setBusy(false);
        }
      }
    },
    [kind, currentStep, dayId, router, gesture, play],
  );

  useEffect(() => {
    const modal = dialog.current;
    if (modal && !modal.open) {
      if (modal.showModal) modal.showModal();
      else modal.setAttribute("open", "");
    }
    let mounted = true;
    void Promise.resolve().then(() => {
      if (mounted) void perform();
    });
    return () => {
      mounted = false;
      const pending = request.current;
      request.current = null;
      pending?.abort();
    };
  }, [perform]);

  // 대화상자를 열면 브라우저는 첫 단추(«복습 닫기 ×»)에 포커스를 둔다. 숫자키로 풀면 포커스가 거기 남아, 채점을 기다리거나
  // 맞힌 뒤 친 엔터가 ×를 눌러 그날 진행과 진행 중 요청을 잃었다(리드 검토 2026-09-28). 다른 풀이 화면처럼 문항이 뜰 때마다
  // 문제 머리로 포커스를 옮긴다 — 머리는 누르는 것이 아니라 엔터가 아무것도 누르지 않는다.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [data?.problemId]);

  useEffect(() => {
    const documentOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = documentOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  useEffect(() => {
    const modal = solutionDialog.current;
    if (!modal) return;
    if (solutionOpen && !modal.open) {
      if (modal.showModal) modal.showModal();
      else modal.setAttribute("open", "");
    } else if (!solutionOpen && modal.open) {
      if (modal.close) modal.close();
      else modal.removeAttribute("open");
      solutionOpener.current?.focus({ preventScroll: true });
    }
  }, [solutionOpen]);

  const submittedAnswer = data?.interactive
    ? `${parts.length}/${data.interactive.denominator}`
    : answer;
  const correct = data?.correct ?? null;
  useEffect(() => {
    if (correct !== false) return;
    const retry = setTimeout(() => {
      setAnswer(null);
      setParts([]);
      setFeedbackCorrect(null);
      setData((previous) =>
        previous ? { ...previous, correct: null, solution: null } : null,
      );
    }, 1200);
    return () => clearTimeout(retry);
  }, [correct, feedbackEvent]);

  const closeReplay = () => {
    const pending = request.current;
    request.current = null;
    pending?.abort();
    const modal = dialog.current;
    if (modal?.open) {
      if (modal.close) modal.close();
      else modal.removeAttribute("open");
    }
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-label={`${currentStep}번 문제 다시 풀기`}
      onCancel={closeReplay}
    >
      <header className={s.header}>
        <div>
          <p>
            완료한 칸 복습 ·{" "}
            {dayId ? `${currentStep} / ${total}` : `${currentStep}번 문제`}
          </p>
          <h2 ref={heading} tabIndex={-1}>
            {data?.title ?? "다시 풀기"}
          </h2>
        </div>
        <button
          type="button"
          className={s.close}
          aria-label="복습 닫기"
          onClick={closeReplay}
        >
          ×
        </button>
      </header>
      {data ? (
        <div className={s.body} aria-busy={busy}>
          <p className={s.subtitle}>
            {dayTitle ? `${dayTitle} · ` : ""}
            {data.subtitle}
            {data.regenerated ? " · 같은 단원 새 문제" : ""}
          </p>
          <div
            key={data.problemId}
            className={`${s.question} ${pageTurn.page}`}
            data-page-turn="true"
            data-question-transition={turnPage}
            role="region"
            aria-label="복습 문제 내용"
            tabIndex={0}
          >
            <ProblemContent
              content={data.content}
              practiceLayout
              figureUrls={data.figureUrl ? [data.figureUrl] : undefined}
              deferFigures={false}
            />
          </div>
          <div className={s.answers}>
            {feedbackCorrect !== null ? (
              <AnswerFeedbackEffect
                correct={feedbackCorrect}
                eventKey={feedbackEvent}
                message={
                  feedbackCorrect ? "정확하게 풀었어요" : "다시 생각해 보세요"
                }
              />
            ) : (
              <p className={s.answerPrompt}>
                {data.interactive
                  ? "조각을 눌러 답을 만드세요"
                  : "답 하나를 눌러 주세요"}
              </p>
            )}
            {data.interactive ? (
              <div
                className={s.fraction}
                role="group"
                aria-label={`${data.interactive.denominator}칸 중 칠할 칸 선택`}
              >
                <div
                  className={s.parts}
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(6, data.interactive.denominator)}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from(
                    { length: data.interactive.denominator },
                    (_, index) => (
                      <button
                        key={index}
                        type="button"
                        aria-label={`${index + 1}번째 조각`}
                        aria-pressed={parts.includes(index)}
                        data-answer-control=""
                        disabled={busy || correct !== null}
                        onClick={() =>
                          setParts((current) =>
                            current.includes(index)
                              ? current.filter((item) => item !== index)
                              : [...current, index],
                          )
                        }
                      />
                    ),
                  )}
                </div>
                <span>
                  {parts.length} / {data.interactive.denominator} 조각
                </span>
              </div>
            ) : (
              <div
                className={s.choices}
                role="group"
                aria-label="복습 답 고르기"
              >
                {data.answerChoices.map((choice, index) => (
                  <button
                    key={`${index}:${choice}`}
                    type="button"
                    aria-keyshortcuts={answerKey(index)}
                    aria-pressed={answer === choice}
                    data-answer-control=""
                    disabled={busy || correct !== null}
                    onClick={() => {
                      if (request.current || correct !== null) return;
                      setAnswer(choice);
                      void perform({
                        problemId: data.problemId,
                        submittedAnswer: choice,
                      });
                    }}
                  >
                    <NumberKey
                      index={index}
                      className={s.index}
                      aria-hidden="true"
                    />
                    <MathText text={choice} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <footer className={s.actions}>
            {correct === true ? (
              <>
                {data.canRevealSolution ? (
                  <button
                    ref={solutionOpener}
                    type="button"
                    className={s.secondary}
                    disabled={busy}
                    onClick={() =>
                      void perform({
                        problemId: data.problemId,
                        submittedAnswer: submittedAnswer!,
                        revealSolution: true,
                      })
                    }
                  >
                    {busy ? "불러오는 중…" : "풀이 보기"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={s.primary}
                  onClick={() => {
                    if (!dayId || currentStep >= total) {
                      closeReplay();
                      return;
                    }
                    setData(null);
                    setFeedbackCorrect(null);
                    setAnswer(null);
                    setParts([]);
                    setSolutionOpen(false);
                    setCurrentStep((value) => value + 1);
                  }}
                >
                  {dayId && currentStep < total
                    ? "다음 복습 문제"
                    : "진도판으로"}
                </button>
              </>
            ) : data.interactive ? (
              <button
                type="button"
                className={s.primary}
                aria-keyshortcuts="Enter"
                disabled={busy || correct !== null || submittedAnswer === null}
                onClick={() =>
                  void perform({
                    problemId: data.problemId,
                    submittedAnswer: submittedAnswer!,
                  })
                }
              >
                {busy ? "확인 중…" : "완성했어요"}
                <EnterKey />
              </button>
            ) : busy ? (
              <span className={s.pending} role="status">
                확인 중…
              </span>
            ) : null}
          </footer>
          {error ? (
            <p className={s.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className={s.empty}>
          <p role={error ? "alert" : "status"}>
            {error ?? "풀었던 문제를 불러오는 중…"}
          </p>
          {error ? (
            <button
              type="button"
              className={s.secondary}
              disabled={busy}
              onClick={() => void perform()}
            >
              다시 불러오기
            </button>
          ) : null}
        </div>
      )}
      <dialog
        ref={solutionDialog}
        className={`${s.dialog} ${s.solutionDialog}`}
        aria-label="복습 풀이"
        onCancel={() => setSolutionOpen(false)}
      >
        <header className={s.header}>
          <h2>풀이</h2>
          <button
            type="button"
            className={s.close}
            aria-label="풀이 닫기"
            onClick={() => setSolutionOpen(false)}
          >
            ×
          </button>
        </header>
        <div className={s.solution}>
          {data?.solution ? (
            <>
              <p>정답</p>
              <MathText text={data.solution.answer} as="div" />
              <MathText
                text={solutionForDisplay(data.solution.solution) ?? ""}
                as="div"
              />
            </>
          ) : null}
        </div>
      </dialog>
    </dialog>
  );
}
