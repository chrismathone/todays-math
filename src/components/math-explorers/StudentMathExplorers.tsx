"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type {
  ExplorerAction,
  ExplorerFeedback,
  ExplorerRequest,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import {
  StudentReviewPage,
  StudentReviewStatus,
} from "@/components/math-srs/StudentReviewHome";
import ExplorerHome, { type ExplorerCard } from "./ExplorerHome";
import ExplorerPractice from "./ExplorerPractice";
import { ChestRewardEffect } from "./ExplorerPieces";
import s from "./math-explorers.module.css";

const ExplorerCardDialog = dynamic(() => import("./ExplorerCardDialog"));
const EFFECT_MS = 1200;
type Failure = { status: number; message: string; request?: ExplorerRequest };

export default function StudentMathExplorers() {
  const router = useRouter();
  const [state, setState] = useState<ExplorerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Failure | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [effectKey, setEffectKey] = useState("");
  const [chestStars, setChestStars] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [solution, setSolution] = useState<ExplorerFeedback["solution"] | null>(
    null,
  );
  const inFlight = useRef<AbortController | null>(null);
  const lastRequest = useRef<ExplorerRequest | null>(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      inFlight.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let current = true;
    void (async () => {
      try {
        const response = await fetch("/api/learn/math-explorers", {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await response.json().catch(() => null);
        if (!current) return;
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
        if (!response.ok) {
          setError({
            status: response.status,
            message: json?.error?.message ?? "학습 기록을 불러오지 못했어요.",
          });
          return;
        }
        const { explorerStateSchema } =
          await import("@/contracts/mathExplorers.contract");
        const data = explorerStateSchema.parse(json.data);
        if (!current) return;
        setState(data);
        setError(null);
        setCorrect(null);
        lastRequest.current = null;
      } catch {
        if (current)
          setError({
            status: 0,
            message: controller.signal.aborted
              ? "응답이 늦어지고 있어요. 다시 불러와 주세요."
              : "학습 기록을 확인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
          });
      } finally {
        clearTimeout(timeout);
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [reload, router]);

  async function send(action: ExplorerAction, sameRequest?: ExplorerRequest) {
    if (!state || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    const input = sameRequest ?? {
      requestId: crypto.randomUUID(),
      expectedRevision: state.revision,
      action,
    };
    lastRequest.current = input;
    const controller = new AbortController();
    inFlight.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    let held = false;
    try {
      const response = await fetch("/api/learn/math-explorers", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await response.json().catch(() => null);
      if (!alive.current) return;
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
      if (!response.ok) {
        if (response.status === 409) lastRequest.current = null;
        setError({
          status: response.status,
          request: response.status >= 500 ? input : undefined,
          message:
            json?.error?.message ??
            "학습 기록을 저장하지 못했어요. 다시 시도해 주세요.",
        });
        return;
      }
      const { explorerStateSchema } =
        await import("@/contracts/mathExplorers.contract");
      const data = explorerStateSchema.parse(json.data);
      if (!alive.current) return;
      lastRequest.current = null;
      if (
        action.type === "answer" &&
        typeof data.feedback?.correct === "boolean"
      ) {
        held = true;
        setCorrect(data.feedback.correct);
        setEffectKey(input.requestId);
        timer.current = setTimeout(() => {
          if (!alive.current) return;
          setState(data);
          setCorrect(null);
          setBusy(false);
          pending.current = false;
          if (data.session?.done || !data.currentActivity) {
            setPracticing(false);
            window.scrollTo({ top: 0, behavior: "instant" });
          }
        }, EFFECT_MS);
      } else {
        setState(data);
        if (action.type === "start") {
          setDetailId(null);
          setSolution(null);
          setPracticing(!!data.currentActivity);
          window.scrollTo({ top: 0, behavior: "instant" });
        }
        if (action.type === "solution" && data.feedback?.solution)
          setSolution(data.feedback.solution);
        if (action.type === "chest" && data.feedback?.chestId) {
          setChestStars(data.feedback.stars ?? 1);
          timer.current = setTimeout(() => {
            if (alive.current) setChestStars(null);
          }, EFFECT_MS);
        }
      }
    } catch {
      if (alive.current)
        setError({
          status: 0,
          request: input,
          message: controller.signal.aborted
            ? "응답이 늦어지고 있어요. 같은 요청으로 다시 시도해 주세요."
            : "연결을 확인하고 같은 요청으로 다시 시도해 주세요.",
        });
    } finally {
      clearTimeout(timeout);
      inFlight.current = null;
      if (!held) {
        pending.current = false;
        if (alive.current) setBusy(false);
      }
    }
  }

  const inPractice =
    practicing &&
    !!state?.currentActivity &&
    !!state.session &&
    !state.session.done;
  const detail = detailId
    ? state?.units
        .flatMap((unit) => unit.cards)
        .find((card) => card.id === detailId)
    : null;
  function inspect(card: ExplorerCard) {
    setSolution(null);
    setDetailId(card.id);
  }
  function refresh() {
    if (busy) return;
    setLoading(true);
    setReload((value) => value + 1);
  }
  function resume() {
    if (busy) return;
    setPracticing(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <StudentReviewPage
      kind="explorers"
      student={state?.student ?? null}
      practicing={inPractice}
      boardReady={!!state}
      practiceTitle="개념 탐험"
      practicePageClassName={s.practicePage}
      practiceMainClassName={s.practiceMain}
    >
      {inPractice && error ? (
        <div className={s.practiceError} role="alert">
          <p>
            {error.status === 409
              ? "기록이 바뀌었어요. 최신 기록을 불러와 주세요."
              : error.message}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              error.request
                ? void send(error.request.action, error.request)
                : refresh()
            }
          >
            {error.request ? "같은 요청 다시 시도" : "최신 기록 불러오기"}
          </button>
        </div>
      ) : (
        <StudentReviewStatus
          loading={loading}
          error={error}
          busy={busy}
          onReload={refresh}
          onRetry={
            error?.request
              ? () => void send(error.request!.action, error.request!)
              : undefined
          }
        />
      )}
      {state && !loading ? (
        inPractice && state.currentActivity && state.session ? (
          <ExplorerPractice
            activity={state.currentActivity}
            session={state.session}
            busy={busy}
            correct={correct}
            eventKey={effectKey}
            onAction={(action) => void send(action)}
            onHome={() => {
              setPracticing(false);
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          />
        ) : (
          <ExplorerHome
            state={state}
            busy={busy}
            onAction={(action) => void send(action)}
            onResume={resume}
            onInspect={inspect}
          />
        )
      ) : null}
      {state && detail ? (
        <ExplorerCardDialog
          card={detail}
          state={state}
          solution={solution}
          busy={busy}
          onInspect={inspect}
          onSolution={() => void send({ type: "solution", cardId: detail.id })}
          onRepair={() =>
            void send({ type: "start", route: "repair", cardId: detail.id })
          }
          onClose={() => {
            setDetailId(null);
            setSolution(null);
          }}
        />
      ) : null}
      <ChestRewardEffect stars={chestStars} />
    </StudentReviewPage>
  );
}
