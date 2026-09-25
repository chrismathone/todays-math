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
import s from "./student-replay.module.css";

const ProblemContent = dynamic(() =>
  import("@/components/math/ProblemContent").then((m) => m.ProblemContent),
);
const MathText = dynamic(() =>
  import("@/components/math/MathText").then((m) => m.MathText),
);

export default function StudentReplayDialog({
  kind,
  step,
  onClose,
}: {
  kind: MathSrsReplayKind;
  step: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const solutionDialog = useRef<HTMLDialogElement>(null);
  const solutionOpener = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null);
  const [data, setData] = useState<MathSrsReplay | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [parts, setParts] = useState<number[]>([]);
  const [solutionOpen, setSolutionOpen] = useState(false);

  const perform = useCallback(
    async (input?: {
      problemId: string;
      submittedAnswer: string;
      revealSolution?: boolean;
    }) => {
      if (request.current) return;
      const controller = new AbortController();
      request.current = controller;
      const timeout = setTimeout(() => controller.abort(), 15_000);
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(
          input
            ? "/api/learn/math-srs/replay"
            : `/api/learn/math-srs/replay?kind=${kind}&step=${step}`,
          {
            cache: "no-store",
            signal: controller.signal,
            ...(input
              ? {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ kind, step, ...input }),
                }
              : {}),
          },
        );
        const json = await response.json().catch(() => null);
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
        setData(replay);
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
    [kind, step, router],
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
  const closeReplay = () => {
    const modal = dialog.current;
    if (modal?.open) {
      if (modal.close) modal.close();
      else modal.removeAttribute("open");
    }
    onClose();
  };
  const reset = () => {
    setAnswer(null);
    setParts([]);
    setData((previous) =>
      previous ? { ...previous, correct: null, solution: null } : null,
    );
  };
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-label={`${step}번 문제 다시 풀기`}
      onCancel={closeReplay}
    >
      <header className={s.header}>
        <div>
          <p>완료한 칸 복습 · {step}번 문제</p>
          <h2>{data?.title ?? "다시 풀기"}</h2>
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
        <div className={s.body}>
          <p className={s.subtitle}>{data.subtitle}</p>
          <div
            className={s.question}
            role="region"
            aria-label="복습 문제 내용"
            tabIndex={0}
          >
            <ProblemContent
              content={data.content}
              figureUrls={data.figureUrl ? [data.figureUrl] : undefined}
              deferFigures={false}
            />
          </div>
          <div
            className={s.answers}
            data-result={correct === null ? undefined : correct}
          >
            <p className={s.result} role="status" aria-live="polite">
              {correct === true
                ? "✓ 정확하게 풀었어요!"
                : correct === false
                  ? "↻ 한 번 더 생각해 보세요"
                  : data.interactive
                    ? "조각을 눌러 답을 만드세요"
                    : "답 하나를 골라 주세요"}
            </p>
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
                    aria-pressed={answer === choice}
                    disabled={busy || correct !== null}
                    onClick={() => setAnswer(choice)}
                  >
                    <span className={s.index} aria-hidden="true">
                      {index + 1}
                    </span>
                    <MathText text={choice} />
                  </button>
                ))}
              </div>
            )}
          </div>
          {error ? (
            <p className={s.error} role="alert">
              {error}
            </p>
          ) : null}
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
                  onClick={closeReplay}
                >
                  진도판으로
                </button>
              </>
            ) : correct === false ? (
              <button type="button" className={s.primary} onClick={reset}>
                다시 풀기
              </button>
            ) : (
              <button
                type="button"
                className={s.primary}
                disabled={busy || submittedAnswer === null}
                onClick={() =>
                  void perform({
                    problemId: data.problemId,
                    submittedAnswer: submittedAnswer!,
                  })
                }
              >
                {busy ? "확인 중…" : "정답 확인"}
              </button>
            )}
          </footer>
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
