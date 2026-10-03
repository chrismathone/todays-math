"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  listeningStudentDetailSchema,
  type ListeningStudentDetail,
} from "@/contracts/englishListeningStudentHttp.contract";
import {
  ListeningStudentView,
  type ListeningStudentRequest,
  type ListeningStudentAnswerRequest,
} from "./ListeningStudentView";
import {
  ListeningRequestError,
  requestListeningData,
  studentAttemptSnapshot,
  studentMedia,
  newerListeningDetail,
} from "./runtime";
import s from "./ListeningPages.module.css";

export function ListeningAssignment({
  assignmentId,
}: {
  assignmentId: string;
}) {
  return <AssignmentSession key={assignmentId} assignmentId={assignmentId} />;
}

function AssignmentSession({ assignmentId }: { assignmentId: string }) {
  const [detail, setDetail] = useState<ListeningStudentDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [connectionLost, setConnectionLost] = useState(false);
  const latestDetail = useRef<ListeningStudentDetail | null>(null);
  const interruptedAttempt = useRef<string | null>(null);
  const pending = useRef(false);
  const stopped = useRef(false);
  const controllers = useRef(new Set<AbortController>());
  const base = `/api/english/learn/listening/${assignmentId}`;
  const receive = useCallback((next: ListeningStudentDetail) => {
    if (stopped.current) return;
    latestDetail.current = newerListeningDetail(latestDetail.current, next);
    setDetail(latestDetail.current);
    setNotice("");
  }, []);
  useEffect(() => {
    stopped.current = false;
    const controller = new AbortController();
    const activeControllers = controllers.current;
    activeControllers.add(controller);
    const interruptionKey = `english-listening-interrupted:${assignmentId}`;
    try {
      interruptedAttempt.current = sessionStorage.getItem(interruptionKey);
    } catch {
      /* Storage can be unavailable; the live tab still records an interruption. */
    }
    let loading = false;
    async function load(prepare: boolean) {
      if (pending.current || stopped.current || loading) return;
      loading = true;
      try {
        let next = await requestListeningData(
          base,
          listeningStudentDetailSchema,
          { signal: controller.signal },
        );
        if (!next.attempt)
          next = await requestListeningData(
            `${base}/prepare`,
            listeningStudentDetailSchema,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
              signal: controller.signal,
            },
          );
        if (interruptedAttempt.current && next.attempt) {
          if (
            interruptedAttempt.current === next.attempt.id &&
            next.attempt.status === "in_progress"
          ) {
            next = await requestListeningData(
              `${base}/commands`,
              listeningStudentDetailSchema,
              {
                method: "POST",
                signal: controller.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  attemptId: next.attempt.id,
                  command: {
                    kind: "interrupt",
                    reason: "student_connection",
                    expectedRevision: next.attempt.revision,
                    idempotencyKey: crypto.randomUUID(),
                  },
                }),
              },
            );
          }
          interruptedAttempt.current = null;
          try {
            sessionStorage.removeItem(interruptionKey);
          } catch {
            /* The acknowledged server state is authoritative. */
          }
        }
        if (!controller.signal.aborted) {
          setConnectionLost(false);
          receive(next);
        }
      } catch (reason) {
        if (controller.signal.aborted) return;
        const message =
          reason instanceof Error
            ? reason.message
            : "듣기를 불러오지 못했습니다.";
        if (
          prepare ||
          (reason instanceof ListeningRequestError &&
            [401, 403, 404, 410].includes(reason.status))
        ) {
          stopped.current = true;
          for (const request of activeControllers) request.abort();
          setDetail(null);
          setError(message);
        } else setNotice("연결을 확인하고 있습니다. 저장된 답은 유지됩니다.");
      } finally {
        loading = false;
      }
    }
    void load(true);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(false);
    }, 10000);
    const refresh = () => {
      if (document.visibilityState === "visible") void load(false);
    };
    const offline = () => {
      const current = latestDetail.current;
      if (current?.mode !== "exam" || current.attempt?.status !== "in_progress")
        return;
      interruptedAttempt.current = current.attempt.id;
      try {
        sessionStorage.setItem(interruptionKey, current.attempt.id);
      } catch {
        /* Keep the live interruption flag. */
      }
      setConnectionLost(true);
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", offline);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", offline);
      for (const request of activeControllers) request.abort();
      activeControllers.clear();
    };
  }, [assignmentId, base, receive, reload]);

  async function command(
    kind: "start" | "answer" | "submit",
    request: ListeningStudentRequest | ListeningStudentAnswerRequest,
  ) {
    const controller = new AbortController();
    controllers.current.add(controller);
    pending.current = true;
    try {
      const answer = request as ListeningStudentAnswerRequest;
      const next = await requestListeningData(
        `${base}/commands`,
        listeningStudentDetailSchema,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: request.attemptId,
            command: {
              kind,
              expectedRevision: request.expectedRevision,
              idempotencyKey: request.requestId,
              ...(kind === "answer"
                ? {
                    phase: answer.phase ?? "initial",
                    questionId: answer.questionId,
                    choiceId: answer.choiceId,
                  }
                : {}),
            },
            ...(kind === "start" ? { soundChecked: true } : {}),
          }),
        },
      );
      if (!controller.signal.aborted) receive(next);
      return studentAttemptSnapshot(next);
    } catch (reason) {
      if (
        !controller.signal.aborted &&
        reason instanceof ListeningRequestError &&
        [401, 403, 404, 409, 410].includes(reason.status)
      ) {
        stopped.current = true;
        for (const request of controllers.current) request.abort();
        setDetail(null);
        setError(
          reason.status === 409
            ? "응시 상태가 변경되었습니다. 최신 저장 내용을 다시 불러와 주세요."
            : reason.message,
        );
      }
      throw reason;
    } finally {
      pending.current = false;
      controllers.current.delete(controller);
    }
  }

  return (
    <main className={s.assignment}>
      <nav className={s.back}>
        <Link href="/learn/english-listening" prefetch={false}>
          듣기 목록
        </Link>
        <Link href="/learn" prefetch={false}>
          학습 홈
        </Link>
      </nav>
      {notice ? (
        <p className={s.notice} role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <div className={s.notice} role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setDetail(null);
              setReload((n) => n + 1);
            }}
          >
            다시 불러오기
          </button>
        </div>
      ) : connectionLost ? (
        <p className={s.notice} role="alert">
          연결이 끊겨 평가 재생을 멈췄습니다. 연결이 돌아오면 중단 상태를
          저장합니다. 저장된 답은 유지되며, 재응시는 선생님이 열어 줍니다.
        </p>
      ) : detail?.attempt ? (
        <ListeningStudentView
          view={detail.view}
          mode={detail.mode}
          attempt={studentAttemptSnapshot(detail)}
          media={studentMedia(detail)}
          onStart={(request) => command("start", request)}
          onCommitAnswer={(request) => command("answer", request)}
          onSubmit={(request) => command("submit", request)}
        />
      ) : (
        <p className={s.notice} role="status">
          듣기를 준비하는 중입니다…
        </p>
      )}
    </main>
  );
}
