"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ExplorerAction,
  ExplorerFeedback,
  ExplorerRequest,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import {
  STUDENT_CHANGED_MESSAGE,
  STUDENT_MUST_CHANGE_MESSAGE,
} from "@/lib/studentRouteAccess";
import {
  StudentReviewPage,
  StudentReviewStatus,
  studentFailureText,
} from "@/components/math-srs/StudentReviewHome";
import ExplorerHome, {
  type ChestNotice,
  type ExplorerCard,
} from "./ExplorerHome";
import { ExplorerSheet } from "./ExplorerHome";
import type { DailyJourneyDay } from "@/components/math-srs/DailyJourneyBoard";
import type { MathExpeditionReview } from "@/contracts/mathExpedition.contract";
import type { JourneyThemeId } from "@/lib/math-explorers/journeyThemes";
import ExplorerBankActivity from "./ExplorerBankActivity";
import ExplorerPractice from "./ExplorerPractice";
import ExplorerSessionIntro from "./ExplorerSessionIntro";
import {
  markSessionIntroSeen,
  sessionIntroKind,
  sessionIntroSeen,
} from "./sessionIntro";
import ExplorerWorkshop from "./ExplorerWorkshop";
import { ChestRewardEffect, TileRewardEffect } from "./ExplorerPieces";
import {
  forgetRetryId,
  keepSaving,
  rememberRetryId,
  retryIdFor,
  saveGeneration,
  savingFor,
} from "./chestSaveLine";
import s from "./math-explorers.module.css";

const ExplorerCardDialog = dynamic(() => import("./ExplorerCardDialog"));
const ExplorerSupplementDialog = dynamic(
  () => import("./ExplorerSupplementDialog"),
);
const StudentReplayDialog = dynamic(
  () => import("@/components/math-srs/StudentReplayDialog"),
);
const EFFECT_MS = 1200;
type Failure = {
  status: number;
  message: string;
  request?: ExplorerRequest;
  /** Which action failed — a failed «기지 키우기» is said inside its sheet. */
  action?: ExplorerAction["type"];
};
type ChestClaim = {
  chestId: string;
  requestId: string;
  /** The student whose screen pressed it — a line never saves for anyone else. */
  studentId: string;
  generation: number;
};
type ClaimOutcome =
  | { kind: "saved"; data: ExplorerState }
  | { kind: "failed" }
  | { kind: "refused"; message: string | null }
  | { kind: "conflict" }
  | { kind: "left" };
/** The latest record, read without the loading screen so the sheet stays open. */
async function readLatest(): Promise<ExplorerState | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("/api/learn/math-explorers", {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = await response.json();
    const { explorerStateSchema } =
      await import("@/contracts/mathExplorers.contract");
    return explorerStateSchema.parse(json.data);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 05 §8.21 — 원장님 위임 3자 합의(Claude · codex · grok, 2026-09-28).
const CHEST_FAILED = "별을 받지 못했어요. 상자를 다시 눌러 주세요.";
const CHEST_RELOADED = "다른 화면에서 기록이 바뀌어 최신 기록을 불러왔어요.";

export default function StudentMathExplorers({
  initialView,
  journeyTheme,
}: { initialView?: "collection"; journeyTheme?: JourneyThemeId } = {}) {
  return (
    <ExplorerGame
      key={initialView ?? "expedition"}
      initialView={initialView}
      journeyTheme={journeyTheme}
    />
  );
}

function ExplorerGame({
  initialView,
  journeyTheme,
}: {
  initialView?: "collection";
  journeyTheme?: JourneyThemeId;
}) {
  const router = useRouter();
  const [state, setState] = useState<ExplorerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Failure | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [practicing, setPracticing] = useState(false);
  // «오늘 다시 만날 개념» 첫 장에서 시작을 누른 세션(저장소가 막혀도 이번 화면에서는 넘어가게).
  const [introStarted, setIntroStarted] = useState<string | null>(null);
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
  // A home sheet is a modal: an effect drawn on the page would play under it and be
  // spent unseen (the chest effect had that fault) — the tile effect waits for it.
  const sheetOpen = useRef(false);
  const waitingTile = useRef<number | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  // 보충 카드(D-147) — 한 장 풀이 중인가 · 열린 카드 창 · 끝나면 도감으로 돌아갈지.
  const [supPracticing, setSupPracticing] = useState(false);
  const [supDetailId, setSupDetailId] = useState<string | null>(null);
  const [supReturn, setSupReturn] = useState(false);
  const [solution, setSolution] = useState<ExplorerFeedback["solution"] | null>(
    null,
  );
  const [workshopSolution, setWorkshopSolution] = useState<
    ExplorerFeedback["workshopSolution"] | null
  >(null);
  const [claims, setClaims] = useState<string[]>([]);
  const [chestNotices, setChestNotices] = useState<
    Readonly<Record<string, ChestNotice>>
  >({});
  const claimQueue = useRef<ChestClaim[]>([]);
  const claimRunning = useRef(false);
  const chestEffects = useRef(0);
  const effectChest = useRef<string | null>(null);
  /** The last server state: queued chest saves send its revision. */
  const latest = useRef<ExplorerState | null>(null);
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

  const showTile = useCallback((stars: number) => {
    if (tileTimer.current) clearTimeout(tileTimer.current);
    setTileStars(stars);
    tileTimer.current = setTimeout(() => {
      if (alive.current) setTileStars(null);
    }, EFFECT_MS);
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
    if (sheetOpen.current) waitingTile.current = stars.cards + stars.bonus;
    else showTile(stars.cards + stars.bonus);
  }, [state, showTile]);
  function sheetChanged(open: boolean) {
    sheetOpen.current = open;
    const waiting = waitingTile.current;
    if (open || waiting === null) return;
    waitingTile.current = null;
    showTile(waiting);
  }

  useEffect(() => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let current = true;
    void (async () => {
      try {
        timeout = setTimeout(() => controller.abort(), 15000);
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
        let data = explorerStateSchema.parse(json.data);
        if (!current) return;
        // This student's chests pressed on a screen just left may still be saving
        // (05 §8.21) — read again after them; another student's line is not waited on.
        const waiting = savingFor(data.student.id);
        if (waiting) {
          await waiting;
          const again = await readLatest();
          if (!current) return;
          // The first read is from before those saves — never show it as the record.
          if (!again) {
            setError({
              status: 0,
              message:
                "학습 기록을 확인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
            });
            return;
          }
          data = again;
        }
        latest.current = data;
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
    if (!state || pending.current || claimQueue.current.length) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    const input = sameRequest ?? {
      requestId: crypto.randomUUID(),
      expectedRevision: state.revision,
      studentId: state.student.id,
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
          action: action.type,
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
      latest.current = data;
      lastRequest.current = null;
      if (
        (action.type === "answer" ||
          action.type === "supplement-answer" ||
          action.type.startsWith("lab-")) &&
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
          if (action.type === "supplement-answer") {
            // 한 장이 끝나면(모음 · 못 모음) 홈으로 — 도감에서 시작했으면 도감을 다시 연다.
            if (!data.supplements?.activity) {
              setSupPracticing(false);
              setLoading(true);
              setReload((value) => value + 1);
              window.scrollTo({ top: 0, behavior: "instant" });
            }
          } else if (data.session?.done || !data.currentActivity) {
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
        if (action.type === "supplement-start") {
          setDetailId(null);
          setSupDetailId(null);
          setSolution(null);
          setSupPracticing(!!data.supplements?.activity);
          window.scrollTo({ top: 0, behavior: "instant" });
        }
        if (
          (action.type === "solution" ||
            action.type === "supplement-solution") &&
          data.feedback?.solution
        )
          setSolution(data.feedback.solution);
        if (action.type === "lab-solution" && data.feedback?.workshopSolution)
          setWorkshopSolution(data.feedback.workshopSolution);
      }
    } catch {
      if (alive.current)
        setError({
          status: 0,
          action: action.type,
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

  // A chest press shows its reward at once (05 §8.21). Presses wait in line and
  // are saved one after another, so a second chest is never dropped; a failed
  // save takes that chest's star back and says so under its row. The line keeps
  // saving after the screen is left — those chests were already shown opened.
  function claimChest(chestId: string) {
    if (!state || pending.current) return;
    const chest = state.chests.find((item) => item.id === chestId);
    if (!chest?.ready || chest.claimed) return;
    if (claimQueue.current.some((claim) => claim.chestId === chestId)) return;
    claimQueue.current = [
      ...claimQueue.current,
      {
        chestId,
        requestId: retryIdFor(state.student.id, chestId) ?? crypto.randomUUID(),
        studentId: state.student.id,
        generation: saveGeneration(),
      },
    ];
    setClaims(claimQueue.current.map((claim) => claim.chestId));
    setChestNotices((notices) => {
      if (!notices[chestId]) return notices;
      const rest = { ...notices };
      delete rest[chestId];
      return rest;
    });
    if (timer.current) clearTimeout(timer.current);
    chestEffects.current += 1;
    effectChest.current = chestId;
    setEffectKey(`chest-${chestEffects.current}`);
    setChestStars(1);
    timer.current = setTimeout(() => {
      if (alive.current) setChestStars(null);
    }, EFFECT_MS);
    saveClaims();
  }

  function saveClaims() {
    if (claimRunning.current || !state) return;
    claimRunning.current = true;
    keepSaving(
      state.student.id,
      runClaims().finally(() => {
        claimRunning.current = false;
      }),
    );
  }

  async function runClaims() {
    // Stopping takes every chest left in the line back at once. When the student
    // changed (05 §8.21), the effect goes in the same frame and each chest says why.
    const stop = (why?: string) => {
      const stopped = claimQueue.current.map((claim) => claim.chestId);
      claimQueue.current = [];
      if (!alive.current) return;
      if (why) {
        setChestNotices((notices) => ({
          ...notices,
          ...Object.fromEntries(
            stopped.map((chestId) => [
              chestId,
              { chestId, tone: "alert" as const, text: why },
            ]),
          ),
        }));
        if (effectChest.current && stopped.includes(effectChest.current)) {
          if (timer.current) clearTimeout(timer.current);
          setChestStars(null);
        }
      }
      setClaims([]);
    };
    while (claimQueue.current.length) {
      const claim = claimQueue.current[0]!;
      // Signed out or another student signed in since the press: stop the line.
      if (claim.generation !== saveGeneration())
        return stop(STUDENT_CHANGED_MESSAGE);
      const outcome = await saveClaim(claim);
      if (outcome.kind === "left") return stop();
      let fresh: ExplorerState | null = null;
      let notice: ChestNotice | null = null;
      if (outcome.kind === "saved") {
        fresh = outcome.data;
        latest.current = fresh;
        forgetRetryId(claim.studentId, claim.chestId);
      } else {
        // Read the record before deciding: a lost response may have been saved
        // (then the chest simply stays opened), and the next chest in line must
        // go out with the current revision, not one a failed save left behind.
        fresh = await readLatest();
        // Another student's record (the cookie changed): this line is not theirs.
        if (fresh && fresh.student.id !== claim.studentId)
          return stop(STUDENT_CHANGED_MESSAGE);
        if (fresh) latest.current = fresh;
        const saved = !!fresh?.chests.find((item) => item.id === claim.chestId)
          ?.claimed;
        if (outcome.kind === "failed" && saved)
          forgetRetryId(claim.studentId, claim.chestId);
        else {
          if (outcome.kind === "failed")
            rememberRetryId(claim.studentId, claim.chestId, claim.requestId);
          const reloaded = outcome.kind === "conflict" && !!fresh;
          notice = {
            chestId: claim.chestId,
            tone: reloaded ? "status" : "alert",
            text:
              outcome.kind === "refused" && outcome.message
                ? outcome.message
                : reloaded
                  ? CHEST_RELOADED
                  : CHEST_FAILED,
          };
        }
      }
      claimQueue.current = claimQueue.current.slice(1);
      if (!alive.current) continue;
      // One commit: the record, the taken-back star, its notice and the effect.
      if (fresh) setState(fresh);
      if (notice) {
        const shown = notice;
        setChestNotices((notices) => ({
          ...notices,
          [shown.chestId]: shown,
        }));
        if (effectChest.current === claim.chestId) {
          if (timer.current) clearTimeout(timer.current);
          setChestStars(null);
        }
      }
      setClaims(claimQueue.current.map((item) => item.chestId));
    }
  }

  async function saveClaim(claim: ChestClaim): Promise<ClaimOutcome> {
    const revision = latest.current?.revision;
    if (revision === undefined) return { kind: "conflict" };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/learn/math-explorers", {
        method: "POST",
        cache: "no-store",
        // The line outlives the screen; keepalive lets the last save finish
        // even when the page itself is closed.
        keepalive: true,
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: claim.requestId,
          expectedRevision: revision,
          action: { type: "chest", chestId: claim.chestId },
          studentId: claim.studentId,
        } satisfies ExplorerRequest),
      });
      const json = await response.json().catch(() => null);
      if (response.status === 401) {
        if (alive.current) router.replace("/learn/login");
        return { kind: "left" };
      }
      if (
        response.status === 403 &&
        json?.error?.message === STUDENT_MUST_CHANGE_MESSAGE
      ) {
        if (alive.current) router.replace("/learn/password");
        return { kind: "left" };
      }
      if (response.status === 409) return { kind: "conflict" };
      if (response.status >= 400 && response.status < 500)
        return { kind: "refused", message: json?.error?.message ?? null };
      if (!response.ok) return { kind: "failed" };
      const { explorerStateSchema } =
        await import("@/contracts/mathExplorers.contract");
      return { kind: "saved", data: explorerStateSchema.parse(json.data) };
    } catch {
      return { kind: "failed" };
    } finally {
      clearTimeout(timeout);
    }
  }

  // While a chest is saving, every other study action waits too (05 §8.21).
  const saving = claims.length > 0;
  // The base sheet is a modal over the page status — a failed upgrade is said in it.
  const retryRequest = error?.request;
  const baseFailure =
    error?.action === "upgrade"
      ? {
          text: studentFailureText(error),
          retry:
            retryRequest && !busy
              ? () => void send(retryRequest.action, retryRequest)
              : undefined,
        }
      : null;
  const inPractice =
    practicing &&
    !!state?.currentActivity &&
    !!state.session &&
    !state.session.done;
  const supplement = state?.supplements;
  const inSupplement =
    supPracticing &&
    !inPractice &&
    !!supplement?.activity &&
    !!supplement.session;
  // 열린 탐험은 하나 — 오늘의 탐험(은행 날 포함)이나 본 카드 세션 · 남은 문제 다시 풀기가 열려 있으면 보충은 흐리게.
  const supplementLocked =
    (!!state?.expedition?.mission &&
      state.expedition.mission.status !== "complete") ||
    (!!state?.session &&
      (!state.session.done ||
        (!state.session.reviewOnly && state.session.unresolved.length > 0)));
  const introKind =
    inPractice && state?.session ? sessionIntroKind(state.session) : null;
  const showIntro =
    !!introKind &&
    introStarted !== state?.session?.id &&
    !sessionIntroSeen(state!.session!.id);
  function startAfterIntro() {
    const id = state?.session?.id;
    if (!id) return;
    markSessionIntroSeen(id);
    setIntroStarted(id);
  }
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
  function exitSupplement() {
    if (pending.current) return;
    setSupPracticing(false);
    refresh();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function startSupplement(cardId: string, fromCollection: boolean) {
    // send 가 막는 때(다른 요청 중 · 상자 저장 줄)는 요청이 나가지 않으니 도감 복귀 표시도 켜지 않는다(S1).
    if (!state || pending.current || claimQueue.current.length) return;
    setSupReturn(fromCollection);
    void send({ type: "supplement-start", cardId });
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
      practicing={inPractice || inSupplement || !state}
      boardReady={!!state}
      practiceTitle="수학 탐험"
      practicePageClassName={s.practicePage}
      practiceMainClassName={s.practiceMain}
    >
      {(inPractice || inSupplement) && error ? (
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
          busy={busy || saving}
          onReload={refresh}
          onRetry={
            error?.request
              ? () => void send(error.request!.action, error.request!)
              : undefined
          }
        />
      )}
      {state && !loading ? (
        inSupplement && supplement?.activity && supplement.session ? (
          // 보충 한 장 — 본 카드와 같은 풀이 틀(§8.19). 행동만 보충 행동으로 바꿔 보낸다.
          <ExplorerPractice
            activity={supplement.activity}
            session={{
              title: supplement.session.title,
              index: supplement.session.index,
              total: supplement.session.total,
              round: supplement.session.round,
              reviewOnly: false,
            }}
            progressLabel={supplement.session.title}
            units={state.units}
            busy={busy || !!error || loading}
            correct={correct}
            eventKey={effectKey}
            onAction={(action) =>
              void send(
                action.type === "read"
                  ? {
                      type: "supplement-read",
                      questionId: action.questionId,
                    }
                  : action.type === "answer"
                    ? {
                        type: "supplement-answer",
                        questionId: action.questionId,
                        choiceIds: action.choiceIds,
                      }
                    : action,
              )
            }
            onHome={exitSupplement}
          />
        ) : inPractice && state.currentActivity && state.session ? (
          introKind && showIntro ? (
            <ExplorerSessionIntro
              kind={introKind}
              session={state.session}
              units={state.units}
              busy={busy || !!error || loading}
              onStart={startAfterIntro}
              onHome={exitPractice}
            />
          ) : attachedWorkshop ? (
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
              units={state.units}
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
            journeyTheme={journeyTheme}
            busy={busy || !!error}
            claims={claims}
            chestNotices={chestNotices}
            chestEffect={
              <ChestRewardEffect key={effectKey} stars={chestStars} />
            }
            onCloseBase={() => setChestNotices({})}
            onSheetChange={sheetChanged}
            baseFailure={baseFailure}
            onAction={(action) =>
              action.type === "chest"
                ? claimChest(action.chestId)
                : void send(action)
            }
            onResume={resume}
            onStart={() => void send({ type: "expedition-start" })}
            onRetry={() => void send({ type: "retry-unresolved" })}
            onInspect={inspect}
            onReviewDay={reviewDay}
            initialView={supReturn ? "collection" : initialView}
            onCloseView={() => {
              setSupReturn(false);
              if (initialView) router.replace("/learn");
            }}
            onStartSupplement={(cardId) => startSupplement(cardId, false)}
            onInspectSupplement={(cardId) => {
              setSolution(null);
              setSupDetailId(cardId);
            }}
          />
        )
      ) : null}
      {state && detail ? (
        <ExplorerCardDialog
          card={detail}
          state={state}
          solution={solution}
          workshopSolution={workshopSolution}
          busy={busy || saving}
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
      {state && supDetailId ? (
        <ExplorerSupplementDialog
          cardId={supDetailId}
          state={state}
          solution={solution}
          busy={busy || saving}
          locked={supplementLocked}
          onStart={() => startSupplement(supDetailId, true)}
          onSolution={() =>
            void send({ type: "supplement-solution", cardId: supDetailId })
          }
          onClose={() => {
            setSupDetailId(null);
            setSolution(null);
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
                disabled={busy || saving}
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
      <TileRewardEffect stars={tileStars} />
    </StudentReviewPage>
  );
}
