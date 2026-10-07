"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { FadingState } from "@/contracts/fadingApi.contract";
import type { FadingRelearnObservation } from "@/contracts/fadingRelearn.contract";
import { FADING_TYPED_MAX } from "@/contracts/fading.contract";
import { chipTray } from "@/lib/fading/chips";
import { erasedTargets, erasureRate } from "@/lib/fading/erasure";
import { toPercent } from "@/lib/fading/numbers";
import { typedKey } from "@/lib/fading/typed";
import {
  allowedRatings,
  closeWithRating,
  fadingAsksSure,
  fadingJudgingComplete,
  fadingStepInput,
  finishReading,
  giveUpCard,
  giveUpStep,
  placeAnswer,
  resumeFadingSession,
  startFadingSession,
  type FadingAnswer,
  type FadingJudged,
  type FadingSession,
  type FadingStepResult,
} from "@/lib/fading/session";
import {
  encodeFadingMarks,
  fadingCardBlanks,
  fadingComparison,
  fadingSafeLabel,
  type FadingMark,
} from "@/lib/fading/cards";
import {
  newFadingId,
  type FadingConceptDetail,
  type FadingSource,
} from "@/lib/fading/source";
import {
  FadingAnkiCard,
  FadingCardCheck,
  FadingTypedComparison,
  confidenceLabels,
} from "./FadingCardViews";
import { FadingFillCard } from "./FadingFillCard";
import { FadingCardExitDialog } from "./FadingCardExitDialog";
import { FadingComparisonSheet } from "./FadingComparisonSheet";
import { FadingFigureView } from "./FadingFigureView";
import { FadingSentencePager } from "./FadingSentencePager";
import { FadingIcon } from "./FadingIcon";
import { conceptSentenceLabel, curriculumName, ratingNames } from "./labels";
import {
  fadingChipChoices,
  useFadingKeyboard,
  useFadingPendingScroll,
} from "./FadingChipInput";
import { useFadingSessionActions } from "./useFadingSessionActions";
import s from "./fading.module.css";

export type FadingSessionScreenProps = {
  source: FadingSource;
  state: FadingState;
  practice?: FadingConceptDetail;
  onState: (state: FadingState) => void;
  onReconcile: (state: FadingState, message: string) => void;
  onExit: () => void;
  paused?: boolean;
  onEvidence?: (observation: FadingRelearnObservation) => void;
  onBoundary?: () => void;
};

const cardStepNames = {
  1: "떠올려 보기",
  2: "핵심어 빈칸",
  3: "더 많은 빈칸",
  4: "핵심 답 직접 쓰기",
} as const;

export function FadingCardSessionScreen({
  source,
  state,
  practice,
  onState,
  onReconcile,
  onExit,
  paused = false,
  onEvidence,
  onBoundary,
}: FadingSessionScreenProps) {
  const content = practice?.content ?? state.opened!;
  const concept = content.concept;
  const [local, setLocal] = useState(() =>
    practice
      ? startFadingSession(concept, practice.status?.step ?? 1, 42, "cards")
      : resumeFadingSession(concept, state.session!),
  );
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState<FadingMark[]>(() =>
    concept.propositions.map(() => 0),
  );
  const [sure, setSure] = useState<FadingMark[]>(() =>
    concept.propositions.map(() => 0),
  );
  const [active, setActive] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<{ targetId: string; text: string } | null>(
    null,
  );
  const [feedback, setFeedback] = useState("");
  const [stageReady, setStageReady] = useState<FadingSession | null>(null);
  const [compare, setCompare] = useState<FadingStepResult | null>(() =>
    local.phase === "rating" ? local.results.at(-1)! : null,
  );
  const [comparisonPlacements, setComparisonPlacements] = useState<
    FadingAnswer[]
  >([]);
  const [canonical, setCanonical] = useState(false);
  const [judged, setJudged] = useState<FadingJudged>({});
  const [comparisonIndex, setComparisonIndex] = useState(0);
  const [comparisonFinished, setComparisonFinished] = useState(
    () => !!state.session?.stale && !practice,
  );
  const [exit, setExit] = useState(false);
  const [done, setDone] = useState(false);
  const attempts = useRef<FadingAnswer[]>([]);
  const gaveUp = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const nativeTab = useRef(false);
  const focusInput = useRef(false);
  const inputId = useId();
  const actions = useFadingSessionActions({ source, onState, onReconcile });
  const stale = !!state.session?.stale && !practice;
  const disabled = paused || actions.busy || !!actions.failure || !!stageReady;
  const visibleStep = compare?.step ?? local.step;
  const inputKind = fadingStepInput(local);
  const blanks = erasedTargets(concept, local.step);
  const tray =
    inputKind === "chips"
      ? chipTray(concept, local.step, {
          seed: local.seed,
          traps: content.traps,
        })
      : [];
  const used = new Set(Object.values(local.filled));
  // Resolve recalled text to source chip IDs without rendering answer choices.
  const choices = fadingChipChoices(tray, used);
  const proposition = concept.propositions[cardIndex]!;
  const cardBlanks = fadingCardBlanks(concept, local.step, proposition.id);
  const identityTargets = compare || done ? [] : blanks;
  const sectionParts = concept.section.split("::");
  const safeSections = sectionParts.flatMap((label) => {
    const numbered = label.match(/^(\d+(?:-\d+)+)\s+(.+)$/);
    // Unit numbers are identifiers; only the source decides whether the title is safe.
    return fadingSafeLabel(numbered?.[2] ?? label, identityTargets)
      ? [label]
      : numbered
        ? [numbered[1]!]
        : [];
  });
  const identity = [
    ...safeSections.map(curriculumName),
    ...(fadingSafeLabel(concept.level, identityTargets) ? [concept.level] : []),
    `개념 ${concept.ordinal}/${concept.siblings}`,
  ].join(" · ");
  const caption = [
    conceptSentenceLabel(cardIndex),
    ...(fadingSafeLabel(proposition.kind, identityTargets)
      ? [proposition.kind]
      : []),
    ...(fadingSafeLabel(proposition.term, identityTargets)
      ? [proposition.term]
      : []),
  ].join(" · ");
  const available = blanks.filter(
    (target) =>
      !(target.id in local.filled) && !local.skipped?.includes(target.id),
  );
  const pending =
    active && available.some((target) => target.id === active)
      ? active
      : (cardBlanks.find((target) =>
          available.some((blank) => blank.id === target.id),
        )?.id ?? null);
  const asksSure = inputKind === "typed" && fadingAsksSure(local);
  const needsSure = asksSure && sure[cardIndex] === 0 && pending !== null;
  const filling = local.phase === "filling" && !compare && !done;
  const ref = { conceptId: concept.id, sessionId: state.session?.id ?? "" };
  const progressDone =
    local.phase === "reading"
      ? seen.filter((mark) => mark !== 0).length
      : (compare?.blanks ??
        Object.keys(local.filled).length + (local.skipped?.length ?? 0));
  const progressTotal =
    local.phase === "reading"
      ? concept.propositions.length
      : erasedTargets(concept, visibleStep).length;
  const answers =
    inputKind === "typed"
      ? {
          ...local.filled,
          ...Object.fromEntries((local.skipped ?? []).map((id) => [id, ""])),
        }
      : Object.fromEntries(
          Object.entries(local.filled).map(([targetId, chipId]) => [
            targetId,
            tray.find((chip) => chip.id === chipId)?.text ?? "",
          ]),
        );

  useFadingPendingScroll(
    root,
    pending,
    filling && !needsSure && !exit && !paused,
  );
  useLayoutEffect(() => {
    if (!focusInput.current || disabled || compare || exit || done) return;
    focusInput.current = false;
    if (needsSure)
      root.current
        ?.querySelector<HTMLButtonElement>('[aria-keyshortcuts="1"]')
        ?.focus();
    else input.current?.focus({ preventScroll: true });
  }, [pending, needsSure, disabled, compare, exit, done, cardIndex, wrong]);
  useLayoutEffect(() => {
    if (
      paused ||
      !stageReady ||
      inputKind !== "chips" ||
      actions.busy ||
      actions.failure
    )
      return;
    root.current
      ?.querySelector<HTMLButtonElement>('[data-fading-action="true"]')
      ?.focus();
  }, [stageReady, inputKind, actions.busy, actions.failure, paused]);

  function position(targetId: string | null) {
    if (!targetId) return;
    const index = concept.propositions.findIndex((row) =>
      row.pieces.some(
        (piece) => piece.kind === "target" && piece.target.id === targetId,
      ),
    );
    if (index >= 0) setCardIndex(index);
    setActive(targetId);
    setTyped(drafts[targetId] ?? "");
    nativeTab.current = false;
    focusInput.current = true;
    input.current?.focus({ preventScroll: true });
  }

  function finish(next: FadingSession) {
    if (actions.locked.current || actions.failure) return;
    const result = next.results.at(-1)!;
    const placements = [...attempts.current];
    setStageReady(next);
    const showComparison = () => {
      setLocal(next);
      setCompare(result);
      setComparisonPlacements(placements);
      setComparisonIndex(0);
      setComparisonFinished(false);
      setActive(null);
      setTyped("");
      setWrong(null);
      setFeedback("");
      setStageReady(null);
      attempts.current = [];
      gaveUp.current = false;
      root.current?.focus({ preventScroll: true });
      if (!practice) onBoundary?.();
    };
    if (practice) showComparison();
    else
      actions.send(
        {
          action: "step",
          ...ref,
          step: result.step as 2 | 3 | 4,
          placements,
          ...(gaveUp.current ? { gaveUp: true } : {}),
          ...(result.step === 4 && fadingAsksSure(local)
            ? { sure: encodeFadingMarks(sure) }
            : {}),
        },
        showComparison,
      );
  }

  function apply(
    next: FadingSession,
    targetId: string,
    text: string,
    outcome: "correct" | "wrong" | "unknown",
  ) {
    setTyped("");
    setDrafts((current) => {
      const rest = { ...current };
      delete rest[targetId];
      return rest;
    });
    if (outcome === "wrong") {
      setLocal(next);
      setWrong({ targetId, text });
      setFeedback(
        "맞지 않는 답이에요. 다시 입력하거나 아직 모르겠어요를 눌러 주세요. 틀림 기록은 남습니다.",
      );
      focusInput.current = true;
      return;
    }
    setWrong(null);
    setFeedback(
      inputKind === "typed"
        ? "입력했어요. 기준안은 모든 문장을 마친 뒤에 확인해요."
        : "",
    );
    if (next.results.length > local.results.length) {
      // Keep the final card visible until its complete step write succeeds.
      setLocal({ ...local, filled: { ...local.filled, [targetId]: text } });
      if (inputKind === "typed") finish(next);
      else setStageReady(next);
      return;
    }
    setLocal(next);
    if (
      !practice &&
      cardBlanks.every(
        (target) =>
          target.id in next.filled || next.skipped?.includes(target.id),
      )
    )
      onBoundary?.();
    const remaining = blanks.find(
      (target) =>
        !(target.id in next.filled) && !next.skipped?.includes(target.id),
    );
    position(remaining?.id ?? null);
  }

  function place(placement: FadingAnswer) {
    if (
      disabled ||
      actions.locked.current ||
      !filling ||
      needsSure ||
      !cardBlanks.some((target) => target.id === placement.targetId) ||
      !available.some((target) => target.id === placement.targetId)
    )
      return;
    try {
      const placed = placeAnswer(local, concept, placement, content.traps);
      setActive(placement.targetId);
      attempts.current.push(placement);
      if (placed.outcome === "wrong" && !practice)
        onEvidence?.({
          kind: "step",
          ...ref,
          step: local.step as 2 | 3 | 4,
          placements: [...attempts.current],
        });
      const text = "text" in placement ? placement.text : placement.chipId;
      const display =
        "text" in placement
          ? placement.text
          : tray.find((chip) => chip.id === placement.chipId)!.text;
      if (placed.outcome === "wrong" && local.step === 4 && !practice) {
        actions.send({ action: "miss", ...ref, placement }, () =>
          apply(placed.session, placement.targetId, display, placed.outcome),
        );
      } else
        apply(
          placed.session,
          placement.targetId,
          placed.outcome === "wrong" ? display : text,
          placed.outcome,
        );
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "답을 입력해 주세요.",
      );
    }
  }

  function submit() {
    if (disabled || needsSure || !pending || !typed.trim()) return;
    if (inputKind === "typed") place({ targetId: pending, text: typed });
    else {
      const key = typedKey(typed);
      const matching = choices.filter(
        (choice) => choice.chipId && typedKey(choice.text) === key,
      );
      if (key && matching.length === 1)
        place({ targetId: pending, chipId: matching[0]!.chipId! });
      else
        setFeedback(
          "입력한 답을 확인해 주세요. 다시 입력하거나 아직 모르겠어요를 눌러 주세요.",
        );
    }
  }

  function seenCard(value: "1" | "2" | "3") {
    if (disabled || !revealed) return;
    const values = seen.map((current, index) =>
      index === cardIndex ? (Number(value) as FadingMark) : current,
    );
    setSeen(values);
    if (cardIndex < concept.propositions.length - 1) {
      setCardIndex(cardIndex + 1);
      setRevealed(false);
      if (!practice) onBoundary?.();
      return;
    }
    const next = finishReading(local);
    const advance = () => {
      setLocal(next);
      setCardIndex(0);
      setRevealed(false);
      setActive(null);
      focusInput.current = true;
      if (!practice) onBoundary?.();
    };
    if (practice) advance();
    else
      actions.send(
        { action: "read", ...ref, seen: encodeFadingMarks(values) },
        advance,
      );
  }

  function confidence(value: "1" | "2" | "3") {
    if (disabled || !needsSure) return;
    setSure((current) =>
      current.map((old, index) =>
        index === cardIndex ? (Number(value) as FadingMark) : old,
      ),
    );
    focusInput.current = true;
  }

  function skip() {
    if (disabled || !filling || needsSure) return;
    gaveUp.current = true;
    if (!practice)
      onEvidence?.({
        kind: "step",
        ...ref,
        step: local.step as 2 | 3 | 4,
        placements: [...attempts.current],
        ...(inputKind === "typed"
          ? { gaveUpCards: [proposition.id] }
          : { gaveUp: true }),
      });
    const next =
      inputKind === "typed"
        ? giveUpCard(local, concept, proposition.id)
        : giveUpStep(local, concept);
    if (next.results.length > local.results.length) finish(next);
    else {
      setLocal(next);
      position(
        blanks.find(
          (target) =>
            !(target.id in next.filled) && !next.skipped?.includes(target.id),
        )?.id ?? null,
      );
      setWrong(null);
      if (!practice) onBoundary?.();
    }
  }

  function nextStep() {
    setCompare(null);
    setCanonical(false);
    setCardIndex(0);
    setActive(null);
    setDrafts({});
    setFeedback("");
    focusInput.current = true;
  }

  function moveBlank(direction: -1 | 1) {
    if (disabled || !filling || !available.length) return;
    const current = available.findIndex((target) => target.id === pending);
    const index =
      current < 0
        ? direction > 0
          ? 0
          : available.length - 1
        : (current + direction + available.length) % available.length;
    if (pending) setDrafts((old) => ({ ...old, [pending]: typed }));
    position(available[index]!.id);
    setWrong(null);
  }

  function inputKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === "Escape") {
      event.preventDefault();
      nativeTab.current = true;
    } else if (
      event.key === "Tab" &&
      !nativeTab.current &&
      !disabled &&
      filling &&
      available.length > 0
    ) {
      event.preventDefault();
      if (!event.repeat) moveBlank(event.shiftKey ? -1 : 1);
      input.current?.focus({ preventScroll: true });
    }
  }

  const permitted = allowedRatings(local, judged);
  const result = compare ?? local.results.at(-1);
  // The source marks changed, pending solutions stale and excludes self-judgment.
  const unjudged = stale ? [] : (result?.unjudged ?? []);
  const judgingDone = fadingJudgingComplete(unjudged, judged);
  const comparisonCard = concept.propositions[comparisonIndex]!;
  const currentUnjudged = unjudged.filter((answer) =>
    comparisonCard.pieces.some(
      (piece) => piece.kind === "target" && piece.target.id === answer.targetId,
    ),
  );
  const currentJudged = Object.fromEntries(
    currentUnjudged.flatMap((answer) =>
      judged[answer.targetId]
        ? [[answer.targetId, judged[answer.targetId]]]
        : [],
    ),
  );
  const currentJudgingDone = fadingJudgingComplete(
    currentUnjudged,
    currentJudged,
  );
  const judgmentTarget = currentUnjudged.find(
    (answer) => !judged[answer.targetId],
  )?.targetId;
  useLayoutEffect(() => {
    if (compare?.step !== 4 || comparisonFinished || disabled) return;
    if (currentJudgingDone)
      root.current
        ?.querySelector<HTMLButtonElement>('[data-fading-compare-next="true"]')
        ?.focus({ preventScroll: true });
    else root.current?.focus({ preventScroll: true });
  }, [
    compare,
    comparisonIndex,
    currentJudgingDone,
    comparisonFinished,
    disabled,
  ]);
  function moveComparison(index: number) {
    if (disabled || (index > comparisonIndex && !currentJudgingDone)) return;
    setComparisonIndex(index);
    setComparisonFinished(false);
  }
  function advanceComparison() {
    if (disabled || !currentJudgingDone) return;
    if (comparisonIndex < concept.propositions.length - 1)
      moveComparison(comparisonIndex + 1);
    else if (judgingDone) setComparisonFinished(true);
  }
  const comparisonAnswers = Object.fromEntries(
    fadingComparison(concept, result ?? { missed: [] }).flatMap((card) =>
      card.blanks.map((blank) => [
        blank.target.id,
        blank.text ?? "[입력 원문 없음]",
      ]),
    ),
  );

  function rate(rating: NonNullable<FadingSession["rating"]>) {
    if (
      disabled ||
      actions.locked.current ||
      !judgingDone ||
      !comparisonFinished ||
      !permitted.includes(rating)
    )
      return;
    const after = () => {
      if (!stale) setLocal(closeWithRating(local, rating, judged));
      setDone(true);
      setCompare(null);
      if (!practice) onBoundary?.();
    };
    if (practice) after();
    else
      actions.send(
        {
          action: "rate",
          ...ref,
          rating,
          requestId: newFadingId(),
          ...(unjudged.length ? { judged } : {}),
        },
        after,
      );
  }

  useFadingKeyboard({
    disabled: paused || actions.busy || !!actions.failure || exit,
    onChoose: (index) => {
      if (index < 0) return;
      if (local.phase === "reading" && revealed && index < 3)
        seenCard(String(index + 1) as "1" | "2" | "3");
      else if (needsSure && index < 3)
        confidence(String(index + 1) as "1" | "2" | "3");
      else if (local.phase === "rating" && compare?.step === 4) {
        if (!comparisonFinished) {
          if (judgmentTarget && index < 2)
            setJudged((current) => ({
              ...current,
              [judgmentTarget]: index === 0 ? "same" : "different",
            }));
        } else {
          const choice = state.session?.ratings[index];
          if (choice) rate(choice.rating);
        }
      }
    },
    onAdvance: () => {
      if (local.phase === "reading" && !revealed) setRevealed(true);
      else if (stageReady && inputKind === "chips") finish(stageReady);
      else if (compare && compare.step !== 4) nextStep();
      else if (compare?.step === 4 && !comparisonFinished) advanceComparison();
    },
    onMove: (direction) => {
      if (compare?.step === 4 && !comparisonFinished) {
        const index = comparisonIndex + direction;
        if (index >= 0 && index < concept.propositions.length)
          moveComparison(index);
      } else moveBlank(direction);
    },
    onClear: () => {
      setWrong(null);
      setFeedback("");
    },
  });

  return (
    <div
      ref={root}
      className={s.session}
      tabIndex={-1}
      data-fading-session="true"
      data-fading-mode="cards"
      data-step={visibleStep}
      inert={paused}
      aria-hidden={paused || undefined}
    >
      <header className={s.sessionHeader}>
        <div className={s.sessionTop}>
          <button
            type="button"
            className={s.quiet}
            disabled={actions.busy}
            onClick={() => setExit(true)}
            aria-label="풀이 나가기"
          >
            ←
          </button>
          <div className={s.sessionBrand}>
            <span className={s.brandMark}>
              <FadingIcon name="erase" />
            </span>
            <strong>오늘의 기억</strong>
          </div>
        </div>
        <div className={s.sessionStatus}>
          <span className={s.stepPill}>
            STEP {String(visibleStep).padStart(2, "0")} ·{" "}
            {cardStepNames[visibleStep]}
          </span>
          <span className={s.erasurePill}>
            소거율 {toPercent(erasureRate(concept, visibleStep))}%
          </span>
          <span className={s.code}>
            {progressDone} / {progressTotal} 완료
          </span>
          <div className={s.sessionProgress}>
            <span
              style={{
                width: `${toPercent(progressTotal ? progressDone / progressTotal : 0)}%`,
              }}
            />
          </div>
        </div>
      </header>
      <div className={s.singleCardIdentity}>
        <p className={s.caps}>{identity}</p>
        <p className={s.small}>
          문장 {(compare?.step === 4 ? comparisonIndex : cardIndex) + 1} /{" "}
          {concept.propositions.length}
        </p>
      </div>
      {practice && <p className={s.notice}>연습 · 기록되지 않음</p>}
      {actions.failure && (
        <div role="alert" className={s.alert}>
          <span>{actions.failure}</span>
          <button
            type="button"
            className={s.danger}
            disabled={actions.busy}
            onClick={() => void actions.retry()}
          >
            저장 다시 시도
          </button>
        </div>
      )}
      {done ? (
        <section className={`${s.card} ${s.stack}`}>
          <h1 className={s.heading}>
            {practice ? "연습을 마쳤어요" : "풀이를 마쳤어요"}
          </h1>
          <p className={s.muted}>핵심 답을 직접 쓰고 기준안과 대조했어요.</p>
          {state.receipt && !practice && (
            <p>
              고른 평가 {ratingNames[state.receipt.rating]} · 다음 복습{" "}
              {state.receipt.dueOn}
            </p>
          )}
          <button type="button" className={s.primary} onClick={onExit}>
            오늘의 복습으로
          </button>
        </section>
      ) : compare ? (
        <section className={`${s.card} ${s.compareWide} ${s.stack}`}>
          <p className={s.caps}>
            STEP {String(compare.step).padStart(2, "0")} · 대조
          </p>
          <h1 className={s.heading}>{compare.step}단계를 마쳤어요</h1>
          {compare.step === 4 ? (
            <>
              <p className={s.muted}>
                내 답과 기준안의 핵심 뜻을 비교해 주세요.
              </p>
              {!stale && <FadingFigureView figure={content.figure} answers />}
              {stale ? (
                <div className={s.stack}>
                  <p className={s.notice}>
                    풀이 뒤에 기준안이 바뀌어 이전 답을 대조할 수 없어요.
                    이번에는 «다시»로 이어 갑니다.
                  </p>
                  {state.session?.unjudged?.map((answer) => (
                    <p key={answer.targetId} className={s.typedWritten}>
                      {answer.text}
                    </p>
                  ))}
                </div>
              ) : (
                <FadingTypedComparison
                  concept={concept}
                  answers={comparisonAnswers}
                  unjudged={unjudged}
                  judgments={judged}
                  disabled={disabled}
                  index={comparisonIndex}
                  onPage={moveComparison}
                  forwardDisabled={!currentJudgingDone}
                  keyboardTarget={judgmentTarget}
                  onJudge={(targetId, judgment) =>
                    setJudged((current) => ({
                      ...current,
                      [targetId]: judgment,
                    }))
                  }
                />
              )}
              {!comparisonFinished && (
                <button
                  type="button"
                  className={s.primary}
                  data-fading-compare-next="true"
                  disabled={
                    disabled ||
                    !currentJudgingDone ||
                    (comparisonIndex === concept.propositions.length - 1 &&
                      !judgingDone)
                  }
                  onClick={advanceComparison}
                >
                  {comparisonIndex < concept.propositions.length - 1
                    ? "다음 문장 대조"
                    : "대조 마치기"}
                </button>
              )}
              {!judgingDone && (
                <p className={s.notice}>
                  대조가 필요한 답마다 같은 뜻인지 골라 주세요.
                </p>
              )}
              {permitted.length === 1 && (
                <p className={s.notice}>
                  4단계에 틀림이나 넘긴 빈칸이 있어 이번 평가는 «다시»입니다.
                </p>
              )}
              {comparisonFinished &&
                (practice ? (
                  <button
                    type="button"
                    className={s.primary}
                    disabled={!judgingDone}
                    onClick={() => setDone(true)}
                  >
                    연습 마치기
                  </button>
                ) : (
                  <div className={s.ratingGrid}>
                    {state.session?.ratings
                      .filter((choice) => permitted.includes(choice.rating))
                      .map((choice, index) => (
                        <button
                          type="button"
                          className={s.rating}
                          key={choice.rating}
                          disabled={disabled || !judgingDone}
                          aria-keyshortcuts={String(index + 1)}
                          onClick={() => rate(choice.rating)}
                        >
                          <strong>{ratingNames[choice.rating]}</strong>
                          <span>{choice.intervalDays}일 뒤</span>
                        </button>
                      ))}
                  </div>
                ))}
            </>
          ) : (
            <>
              <p className={s.muted}>
                빈칸 {compare.blanks}개 · 틀림 {compare.missed.length}개
              </p>
              <button
                type="button"
                className={s.secondary}
                onClick={() => setCanonical(true)}
              >
                기준안 보기
              </button>
              {canonical && (
                <FadingComparisonSheet
                  concept={concept}
                  result={compare}
                  placements={comparisonPlacements.filter(
                    (
                      placement,
                    ): placement is Extract<FadingAnswer, { chipId: string }> =>
                      "chipId" in placement,
                  )}
                  seed={local.seed}
                  traps={content.traps}
                  figure={content.figure}
                  onClose={() => setCanonical(false)}
                  onNext={nextStep}
                />
              )}
              <button type="button" className={s.primary} onClick={nextStep}>
                다음 단계
              </button>
            </>
          )}
        </section>
      ) : (
        <>
          <div className={s.cardFlow} aria-label="네 단계 흐름">
            {([1, 2, 3, 4] as const).map((step) => (
              <span key={step} data-current={local.step === step}>
                0{step} · {cardStepNames[step]}
              </span>
            ))}
          </div>
          <h1 className={s.heading}>{cardStepNames[local.step]}</h1>
          <div className={s.sessionGrid}>
            <FadingFigureView
              figure={content.figure}
              answers={local.phase === "reading" && revealed}
            />
            <section className={s.propositions} aria-label="개념 문장">
              {local.phase === "reading" ? (
                <FadingAnkiCard
                  proposition={proposition}
                  revealed={revealed}
                  disabled={disabled || exit}
                  onReveal={() => setRevealed(true)}
                  onSeen={seenCard}
                />
              ) : (
                <FadingFillCard
                  proposition={proposition}
                  caption={caption}
                  erased={blanks}
                  answers={answers}
                  missed={local.missed}
                  active={pending}
                  wrong={wrong}
                  typed={inputKind === "typed"}
                  disabled={disabled || needsSure}
                  onBlank={position}
                />
              )}
              {local.phase !== "reading" && (
                <FadingSentencePager
                  index={cardIndex}
                  count={concept.propositions.length}
                  disabled={actions.busy}
                  onChange={(index) => {
                    setCardIndex(index);
                    setActive(null);
                    setTyped("");
                    setWrong(null);
                  }}
                />
              )}
              {needsSure ? (
                <section className={s.typedInput} aria-label="입력 전 확신">
                  <p className={s.small}>
                    답을 쓰기 전에 얼마나 떠오르는지 골라 주세요.
                  </p>
                  <FadingCardCheck
                    labels={confidenceLabels}
                    disabled={disabled}
                    onChoose={confidence}
                  />
                </section>
              ) : (
                filling && (
                  <form
                    className={s.typedInput}
                    onSubmit={(event) => {
                      event.preventDefault();
                      submit();
                    }}
                  >
                    <label htmlFor={inputId}>
                      빈칸 답 입력
                      {pending
                        ? ` · 빈칸 ${blanks.findIndex((target) => target.id === pending) + 1}`
                        : " · 이 문장에는 남은 빈칸이 없어요"}
                    </label>
                    <div>
                      <input
                        ref={input}
                        id={inputId}
                        className={s.input}
                        value={typed}
                        disabled={disabled || (!pending && !available.length)}
                        maxLength={
                          inputKind === "typed" ? FADING_TYPED_MAX : undefined
                        }
                        autoComplete="off"
                        onFocus={() => {
                          nativeTab.current = false;
                        }}
                        onChange={(event) => {
                          setTyped(event.target.value);
                          nativeTab.current = false;
                        }}
                        onKeyDown={inputKeys}
                        placeholder="빈칸 답을 쓰고 Enter"
                      />
                      <button
                        type="submit"
                        className={s.secondary}
                        disabled={disabled || !pending || !typed.trim()}
                      >
                        입력
                      </button>
                    </div>
                    <p className={s.small}>
                      Space 공백 · Enter 입력 · Tab 빈칸 이동 · Esc 다음 Tab은
                      초점 이동
                    </p>
                  </form>
                )
              )}
            </section>
          </div>
          <p className={s.feedback} role="status">
            {actions.busy ? "저장하고 있어요…" : feedback}
          </p>
          {filling && (
            <div className={s.actions}>
              {stageReady && inputKind === "chips" && (
                <button
                  type="button"
                  className={s.primary}
                  data-fading-action="true"
                  disabled={actions.busy || !!actions.failure}
                  onClick={() => finish(stageReady)}
                >
                  단계 마치기
                </button>
              )}
              {!stageReady && (
                <button
                  type="button"
                  className={s.secondary}
                  disabled={
                    disabled || needsSure || (inputKind === "typed" && !pending)
                  }
                  onClick={skip}
                >
                  아직 모르겠어요
                </button>
              )}
            </div>
          )}
        </>
      )}
      {exit && (
        <FadingCardExitDialog
          practice={!!practice}
          onStay={() => {
            setExit(false);
            root.current
              ?.querySelector<HTMLButtonElement>('[aria-label="풀이 나가기"]')
              ?.focus();
          }}
          onExit={onExit}
        />
      )}
    </div>
  );
}
