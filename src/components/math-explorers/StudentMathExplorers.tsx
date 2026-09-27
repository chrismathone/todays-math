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
import { ExplorerSheet } from "./ExplorerHome";
import type { DailyJourneyDay } from "@/components/math-srs/DailyJourneyBoard";
import type { MathExpeditionReview } from "@/contracts/mathExpedition.contract";
import ExplorerBankActivity from "./ExplorerBankActivity";
import ExplorerPractice from "./ExplorerPractice";
import ExplorerWorkshop from "./ExplorerWorkshop";
import { ChestRewardEffect, TileRewardEffect } from "./ExplorerPieces";
import s from "./math-explorers.module.css";

const ExplorerCardDialog = dynamic(() => import("./ExplorerCardDialog"));
const StudentReplayDialog = dynamic(
  () => import("@/components/math-srs/StudentReplayDialog"),
);
const EFFECT_MS = 1200;
type Failure = { status: number; message: string; request?: ExplorerRequest };

export default function StudentMathExplorers({
  initialView,
}: { initialView?: "collection" } = {}) {
  return (
    <ExplorerGame key={initialView ?? "expedition"} initialView={initialView} />
  );
}

function ExplorerGame({ initialView }: { initialView?: "collection" }) {
  const router = useRouter();
  const [state, setState] = useState<ExplorerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Failure | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [bankKind, setBankKind] = useState<"elementary" | "middle" | null>(
    null,
  );
  const [replay, setReplay] = useState<MathExpeditionReview | null>(null);
  const [replayStep, setReplayStep] = useState(1);
  const [reviewChoices, setReviewChoices] = useState<
    MathExpeditionReview[] | null
  >(null);
  const reviewOpener = useRef<HTMLButtonElement | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [effectKey, setEffectKey] = useState("");
  const [chestStars, setChestStars] = useState<number | null>(null);
  const [tileStars, setTileStars] = useState<number | null>(null);
  const tileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownComplete = useRef<boolean | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [solution, setSolution] = useState<ExplorerFeedback["solution"] | null>(
    null,
  );
  const [workshopSolution, setWorkshopSolution] = useState<
    ExplorerFeedback["workshopSolution"] | null
  >(null);
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
      if (tileTimer.current) clearTimeout(tileTimer.current);
    };
  }, []);

  // D-144 칸 효과: 화면에 보이던 «오늘 칸 없음»이 «있음»으로 바뀐 순간 한 번(개념 날은 정답 연출 뒤, 은행 날은 돌아온 뒤).
  // 처음 불러온 화면 · 새로고침은 바뀐 것이 아니라 띄우지 않는다.
  useEffect(() => {
    const complete = state?.expedition?.completedToday;
    if (complete === undefined) return;
    const before = shownComplete.current;
    shownComplete.current = complete;
    const stars = state?.expedition?.todayStars;
    if (before !== false || !complete || !stars) return;
    if (tileTimer.current) clearTimeout(tileTimer.current);
    setTileStars(stars.cards + stars.bonus);
    tileTimer.current = setTimeout(() => {
      if (alive.current) setTileStars(null);
    }, EFFECT_MS);
  }, [state]);

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
        (action.type === "answer" || action.type.startsWith("lab-")) &&
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
            setLoading(true);
            setReload((value) => value + 1);
            window.scrollTo({ top: 0, behavior: "instant" });
          }
        }, EFFECT_MS);
      } else {
        setState(data);
        if (
          action.type === "start" ||
          action.type === "expedition-start" ||
          action.type === "retry-unresolved"
        ) {
          setDetailId(null);
          setSolution(null);
          const kind =
            action.type === "expedition-start"
              ? data.expedition?.mission?.kind
              : "explorers";
          if (kind === "elementary" || kind === "middle") {
            setBankKind(kind);
            setPracticing(false);
          } else setPracticing(!!data.currentActivity);
          window.scrollTo({ top: 0, behavior: "instant" });
        }
        if (action.type === "solution" && data.feedback?.solution)
          setSolution(data.feedback.solution);
        if (action.type === "lab-solution" && data.feedback?.workshopSolution)
          setWorkshopSolution(data.feedback.workshopSolution);
        if (action.type === "chest" && data.feedback?.chestId) {
          if (timer.current) clearTimeout(timer.current);
          setEffectKey(input.requestId);
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
  const workshop = state?.workshop?.session;
  const attachedWorkshop =
    workshop &&
    !workshop.done &&
    workshop.attachedTo.sessionId === state?.session?.id;
  const detail = detailId
    ? state?.units
        .flatMap((unit) => unit.cards)
        .find((card) => card.id === detailId)
    : null;
  function inspect(card: ExplorerCard) {
    setSolution(null);
    setWorkshopSolution(null);
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

  function openReview(review: MathExpeditionReview) {
    setReviewChoices(null);
    if (review.kind === "explorers") {
      void send({
        type: "start",
        route: "unit",
        dayId: review.dayId.replace(/^explorers:/, ""),
      });
    } else setReplay(review);
  }
  function reviewDay(day: DailyJourneyDay, opener: HTMLButtonElement) {
    reviewOpener.current = opener;
    setReplayStep(
      (state?.journey?.days.findIndex((item) => item.id === day.id) ?? 0) + 1,
    );
    const globalDay = state?.journey?.days.find((item) => item.id === day.id);
    if (globalDay?.reviews.length) {
      if (globalDay.reviews.length === 1) openReview(globalDay.reviews[0]);
      else setReviewChoices(globalDay.reviews);
    } else
      openReview({
        kind: "explorers",
        dayId: day.date,
        title: day.title,
        subtitle: day.subtitle,
        reviewCount: day.reviewCount,
      });
  }
  function closeReview() {
    setReplay(null);
    setReviewChoices(null);
    reviewOpener.current?.focus({ preventScroll: true });
  }
  function exitBank() {
    setBankKind(null);
    refresh();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function exitPractice() {
    if (pending.current) return;
    setPracticing(false);
    refresh();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  if (bankKind)
    return (
      <ExplorerBankActivity
        kind={bankKind}
        onExit={exitBank}
        onComplete={exitBank}
      />
    );

  return (
    <StudentReviewPage
      kind="explorers"
      student={state?.student ?? null}
      practicing={inPractice || !state}
      boardReady={!!state}
      practiceTitle="수학 탐험"
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
          attachedWorkshop ? (
            <ExplorerWorkshop
              workshop={workshop}
              session={state.session}
              busy={busy || !!error || loading}
              correct={correct}
              eventKey={effectKey}
              onAction={(action) => void send(action)}
              onHome={exitPractice}
            />
          ) : (
            <ExplorerPractice
              activity={state.currentActivity}
              session={state.session}
              busy={busy || !!error || loading}
              correct={correct}
              eventKey={effectKey}
              onAction={(action) => void send(action)}
              onHome={exitPractice}
            />
          )
        ) : (
          <ExplorerHome
            state={state}
            busy={busy || !!error}
            onAction={(action) => void send(action)}
            onResume={resume}
            onStart={() => void send({ type: "expedition-start" })}
            onRetry={() => void send({ type: "retry-unresolved" })}
            onInspect={inspect}
            onReviewDay={reviewDay}
            initialView={initialView}
            onCloseView={() => router.replace("/learn")}
          />
        )
      ) : null}
      {state && detail ? (
        <ExplorerCardDialog
          card={detail}
          state={state}
          solution={solution}
          workshopSolution={workshopSolution}
          busy={busy}
          onInspect={inspect}
          onSolution={() => void send({ type: "solution", cardId: detail.id })}
          onWorkshopSolution={() => void send({ type: "lab-solution" })}
          onSetGoal={() => void send({ type: "goal", unitId: detail.unitId })}
          onClose={() => {
            setDetailId(null);
            setSolution(null);
            setWorkshopSolution(null);
          }}
        />
      ) : null}
      {reviewChoices ? (
        <ExplorerSheet title="지난 학습 다시 풀기" onClose={closeReview}>
          <div className={s.settingUnits}>
            {reviewChoices.map((review) => (
              <button
                type="button"
                key={`${review.kind}:${review.dayId}`}
                onClick={() => openReview(review)}
                disabled={busy}
              >
                <span>{review.title}</span>
                <small>
                  {review.subtitle} · {review.reviewCount}문제
                </small>
              </button>
            ))}
          </div>
        </ExplorerSheet>
      ) : null}
      {replay && replay.kind !== "explorers" ? (
        <StudentReplayDialog
          kind={replay.kind}
          step={replayStep}
          dayId={replay.dayId}
          dayTitle={replay.title}
          total={replay.reviewCount}
          onClose={closeReview}
        />
      ) : null}
      <ChestRewardEffect key={effectKey} stars={chestStars} />
      <TileRewardEffect stars={tileStars} />
    </StudentReviewPage>
  );
}
