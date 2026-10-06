"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { FadingAction, FadingState } from "@/contracts/fadingApi.contract";
import type { FadingPlacement } from "@/contracts/fading.contract";
import { FadingMath as ExplorerMath } from "./FadingMath";
import { chipTray } from "@/lib/fading/chips";
import { erasedTargets, erasureRate } from "@/lib/fading/erasure";
import { toPercent } from "@/lib/fading/numbers";
import { fadingDayOfDate } from "@/lib/fading/schedule";
import {
  allowedRatings,
  closeWithRating,
  finishReading,
  giveUpStep,
  placeChip,
  startFadingSession,
  type FadingSession,
  type FadingStepResult,
} from "@/lib/fading/session";
import {
  FadingSourceError,
  newFadingId,
  type FadingConceptDetail,
  type FadingSource,
} from "@/lib/fading/source";
import { ratingNames, stepNames } from "./labels";
import { FadingIcon } from "./FadingIcon";
import { FadingFigureView } from "./FadingFigureView";
import { FadingComparisonSheet } from "./FadingComparisonSheet";
import {
  FadingDraggedChip,
  useFadingChipDrag,
  useFadingKeyboard,
  useFadingBlankSize,
  useFadingPendingScroll,
  fadingChipChoices,
  fadingChipInputText,
} from "./FadingChipInput";
import s from "./fading.module.css";

function resumed(state: FadingState): FadingSession {
  const remote = state.session!;
  const local = startFadingSession(
    state.opened!.concept,
    remote.step,
    remote.seed,
  );
  return {
    ...local,
    startStep: remote.startStep,
    ...(remote.phase === "rating"
      ? {
          phase: "rating" as const,
          results: [
            {
              step: 4 as const,
              blanks: erasedTargets(state.opened!.concept, 4).length,
              missed: remote.missedAtFour,
            },
          ],
        }
      : { missed: remote.step === 4 ? remote.missedAtFour : [] }),
  };
}

function ExitDialog({
  onStay,
  onExit,
  practice,
  session,
  filled,
  blanks,
}: {
  onStay: () => void;
  onExit: () => void;
  practice: boolean;
  session: FadingSession;
  filled: number;
  blanks: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stay = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (node?.showModal) node.showModal();
    else node?.setAttribute("open", "");
    stay.current?.focus();
    return () => node?.close?.();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`${s.dialog} ${s.exitSheet}`}
      aria-labelledby="fading-exit-title"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
    >
      <div className={s.sheetHandle} />
      <span className={s.exitWarning}>학습 진행 중인 풀이</span>
      <h2 id="fading-exit-title" className={s.exitTitle}>
        잠시 나갈까요
      </h2>
      <p className={s.muted}>
        {practice
          ? "연습 기록은 남지 않습니다."
          : "마친 단계는 남아 있어요. 다음에 같은 단계부터 이어 할 수 있습니다. 지금 채우던 칩은 다시 골라요."}
      </p>
      <div className={s.exitProgress}>
        <div className={s.row}>
          <strong>
            {session.step}단계 · {stepNames[session.step]}
          </strong>
          <span className={s.code}>
            {filled} / {blanks} 채움
          </span>
        </div>
        <div className={s.sessionProgress}>
          <span
            style={{ width: `${toPercent(blanks ? filled / blanks : 0)}%` }}
          />
        </div>
        <p className={s.caps}>단계별 보존 상태</p>
        <div className={s.exitStageTiles}>
          {([1, 2, 3, 4] as const).map((step) => (
            <div key={step} data-current={session.step === step}>
              <strong>STEP {step}</strong>
              <span>
                {session.step === step
                  ? "진행 중"
                  : session.results.some((row) => row.step === step) ||
                      (step === 1 &&
                        session.startStep === 1 &&
                        session.step > 1)
                    ? "마침"
                    : "—"}
              </span>
            </div>
          ))}
        </div>
        <p className={s.exitNotice}>개념 소거 탭에서 이어 할 수 있습니다.</p>
      </div>
      <div className={s.actions}>
        <button ref={stay} className={s.primary} onClick={onStay}>
          계속 풀기
        </button>
        <button className={s.secondary} onClick={onExit}>
          나가기
        </button>
      </div>
    </dialog>
  );
}

export function FadingSessionScreen({
  source,
  state,
  practice,
  onState,
  onReconcile,
  onExit,
}: {
  source: FadingSource;
  state: FadingState;
  practice?: FadingConceptDetail;
  onState: (state: FadingState) => void;
  onReconcile: (state: FadingState, message: string) => void;
  onExit: () => void;
}) {
  const content = practice?.content ?? state.opened!;
  const concept = content.concept;
  const [local, setLocal] = useState(() =>
    practice
      ? startFadingSession(concept, practice.status?.step ?? 1, 42)
      : resumed(state),
  );
  const [compare, setCompare] = useState<FadingStepResult | null>(null);
  const [canonical, setCanonical] = useState(false);
  const [comparisonPlacements, setComparisonPlacements] = useState<
    FadingPlacement[]
  >([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const chipInputId = useId();
  const chipInput = useRef<HTMLInputElement>(null);
  const nativeTab = useRef(false);
  const [activeBlank, setActiveBlank] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [wrong, setWrong] = useState<{ targetId: string; text: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [exit, setExit] = useState(false);
  const [done, setDone] = useState(false);
  const [stageReady, setStageReady] = useState<FadingSession | null>(null);
  const placements = useRef<FadingPlacement[]>([]);
  const pending = useRef<{
    action: FadingAction;
    after: (next: FadingState) => void;
  } | null>(null);
  const locked = useRef(false);
  const exitButton = useRef<HTMLButtonElement>(null);
  const sessionRoot = useRef<HTMLDivElement>(null);
  const ref = { conceptId: concept.id, sessionId: state.session?.id ?? "" };
  const tray = chipTray(concept, local.step, {
    seed: local.seed,
    traps: content.traps,
  });
  const blanks = erasedTargets(concept, local.step);
  const missedCounts = concept.propositions.map(
    (proposition) =>
      proposition.pieces.filter(
        (piece) =>
          piece.kind === "target" && local.missed.includes(piece.target.id),
      ).length,
  );
  const erased = new Set(blanks.map((t) => t.id));
  const used = new Set(Object.values(local.filled));
  const choices = fadingChipChoices(tray, used);
  const pendingBlank =
    activeBlank ??
    wrong?.targetId ??
    blanks.find((blank) => !local.filled[blank.id])?.id ??
    null;
  useFadingBlankSize({
    root: sessionRoot,
    targets: blanks,
    tray,
    step: local.step,
  });
  useFadingPendingScroll(
    sessionRoot,
    pendingBlank,
    local.phase === "filling" && !compare && !done && !exit,
  );

  async function send(
    action: FadingAction,
    after: (next: FadingState) => void = () => {},
  ) {
    if (locked.current) return;
    locked.current = true;
    setSaving(true);
    setFailure(null);
    pending.current = { action, after };
    try {
      const next = await source.act(action);
      pending.current = null;
      onState(next);
      after(next);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "처리하지 못했습니다. 다시 시도하세요.";
      if (error instanceof FadingSourceError && error.code === "CONFLICT") {
        try {
          const next = await source.state();
          pending.current = null;
          onReconcile(next, message);
        } catch (readError) {
          setFailure(readError instanceof Error ? readError.message : message);
        }
      } else setFailure(message);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  function complete(next: FadingSession, gaveUp = false) {
    setStageReady(null);
    setComparisonPlacements([...placements.current]);
    const result = next.results.at(-1)!;
    setLocal(next);
    setCompare(result);
    setCanonical(false);
    setSelected(null);
    setActiveBlank(null);
    setFeedback("");
    if (practice) placements.current = [];
    else
      void send(
        {
          action: "step",
          ...ref,
          step: result.step as 2 | 3 | 4,
          placements: [...placements.current],
          ...(gaveUp ? { gaveUp: true } : {}),
        },
        () => {
          placements.current = [];
        },
      );
  }
  function place(targetId: string, chipId: string) {
    if (
      locked.current ||
      failure ||
      local.phase !== "filling" ||
      stageReady ||
      compare ||
      done ||
      used.has(chipId) ||
      local.filled[targetId] ||
      !erased.has(targetId) ||
      !tray.some((chip) => chip.id === chipId)
    )
      return;
    const result = placeChip(local, concept, targetId, chipId, content.traps);
    placements.current.push({ targetId, chipId });
    setSelected(null);
    setActiveBlank(null);
    if (!result.correct) {
      setWrong({
        targetId,
        text: tray.find((chip) => chip.id === chipId)!.text,
      });
      setLocal(result.session);
      setFeedback(
        "맞지 않는 칩이에요. 다른 칩을 골라 주세요. 이 빈칸의 틀림 기록은 남습니다.",
      );
      if (local.step === 4 && !practice)
        void send({ action: "miss", ...ref, placement: { targetId, chipId } });
    } else if (result.session.results.length > local.results.length) {
      setWrong(null);
      setStageReady(result.session);
      setLocal({ ...local, filled: { ...local.filled, [targetId]: chipId } });
      setFeedback("빈칸을 모두 채웠어요. 아래 단추를 눌러 단계를 마쳐 주세요.");
    } else {
      setLocal(result.session);
      setWrong(null);
      setFeedback("");
    }
  }
  function chooseChip(chipId: string) {
    if (activeBlank) place(activeBlank, chipId);
    else setSelected((current) => (current === chipId ? null : chipId));
  }
  function chooseBlank(targetId: string) {
    if (selected) place(targetId, selected);
    else setActiveBlank((current) => (current === targetId ? null : targetId));
  }
  function clearSelection() {
    setActiveBlank(null);
    setSelected(null);
    setWrong(null);
    setFeedback("");
  }
  function cycleChip(event: KeyboardEvent<HTMLElement>, focusedChip?: string) {
    if (
      event.key !== "Tab" ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.nativeEvent.isComposing ||
      nativeTab.current ||
      disabled ||
      stageReady ||
      !pendingBlank
    )
      return false;
    const available = choices.filter((choice) => choice.chipId);
    if (!available.length) return false;
    event.preventDefault();
    if (event.repeat) return true;
    const current = available.findIndex(
      (choice) => choice.chipId === (selected ?? focusedChip),
    );
    const direction = event.shiftKey ? -1 : 1;
    const index =
      current < 0
        ? event.shiftKey
          ? available.length - 1
          : 0
        : (current + direction + available.length) % available.length;
    setSelected(available[index]!.chipId);
    setFeedback("");
    return true;
  }
  function cancelChipKeyboard() {
    clearSelection();
    chipInput.current?.focus();
    // Escape restores normal Tab traversal so the chip selector cannot trap focus.
    nativeTab.current = true;
  }
  function submitTypedChip() {
    if (disabled || stageReady || !pendingBlank) return;
    if (selected && !used.has(selected)) {
      place(pendingBlank, selected);
      setTyped("");
      return;
    }
    const text = fadingChipInputText(typed);
    const matching = choices.filter(
      (choice) => choice.chipId && fadingChipInputText(choice.text) === text,
    );
    if (!text || matching.length !== 1) {
      setFeedback("지금 고를 수 있는 칩의 글을 입력해 주세요.");
      return;
    }
    place(pendingBlank, matching[0]!.chipId!);
    setTyped("");
  }
  function nextStep() {
    setCompare(null);
    setCanonical(false);
    setFeedback("");
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }
  const termTitle = concept.propositions.map((p) => p.term).join(" · ");
  const chapter = concept.section.split("::");
  const disabled = saving || !!failure;
  function chooseNumber(index: number) {
    if (disabled || compare || done) return;
    if (local.phase === "rating") {
      sessionRoot.current
        ?.querySelector<HTMLButtonElement>(
          `[data-fading-rating-key="${index + 1}"]`,
        )
        ?.click();
      return;
    }
    const chip = choices[index];
    const target = pendingBlank;
    if (chip?.chipId && target) place(target, chip.chipId);
  }
  useFadingKeyboard({
    disabled: disabled || exit,
    onChoose: chooseNumber,
    onAdvance: () => {
      if (selected && pendingBlank && local.phase === "filling")
        place(pendingBlank, selected);
      else
        sessionRoot.current
          ?.querySelector<HTMLButtonElement>('[data-fading-action="true"]')
          ?.click();
    },
    onMove: (direction) => {
      if (local.phase !== "filling" || compare || done || stageReady) return;
      const remaining = blanks.filter((blank) => !local.filled[blank.id]);
      if (!remaining.length) return;
      const current = remaining.findIndex((blank) => blank.id === pendingBlank);
      const index =
        current < 0
          ? direction > 0
            ? 0
            : remaining.length - 1
          : (current + direction + remaining.length) % remaining.length;
      setActiveBlank(remaining[index]!.id);
      setSelected(null);
    },
    onClear: clearSelection,
  });
  const dragging = useFadingChipDrag({
    disabled:
      disabled ||
      !!stageReady ||
      !!compare ||
      done ||
      exit ||
      local.phase !== "filling",
    onPlace: place,
  });

  return (
    <div
      ref={sessionRoot}
      className={s.session}
      data-fading-session="true"
      data-step={local.step}
    >
      <header className={s.sessionHeader}>
        <div className={s.sessionTop}>
          <button
            ref={exitButton}
            className={s.quiet}
            onClick={() => setExit(true)}
            disabled={saving}
            aria-label="풀이 나가기"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M20 12H4m6-6-6 6 6 6" />
            </svg>
          </button>
          <div className={s.sessionBrand}>
            <span className={s.brandMark}>
              <FadingIcon name="erase" />
            </span>
            <strong>오늘의 기억</strong>
          </div>
        </div>
        <div className={s.sessionStatus}>
          <div className={s.left}>
            <span className={s.stepPill}>
              STEP {String(local.step).padStart(2, "0")} ·{" "}
              {stepNames[local.step]}
            </span>
            <span className={s.erasurePill}>
              소거율 {toPercent(erasureRate(concept, local.step))}%
            </span>
          </div>
          {local.step !== 1 && (
            <span className={s.code}>
              {Object.keys(local.filled).length} / {blanks.length} 완료
            </span>
          )}
          <div className={s.sessionProgress}>
            <span
              style={{
                width: `${toPercent(blanks.length ? Object.keys(local.filled).length / blanks.length : 0)}%`,
              }}
            />
          </div>
        </div>
      </header>
      {practice && <p className={s.notice}>연습 · 기록되지 않음</p>}
      {!done && !compare && local.phase !== "rating" && (
        <div className={s.pcStageStrip} aria-label="네 단계 흐름">
          {([1, 2, 3, 4] as const).map((step) => (
            <div
              className={s.pcStage}
              data-current={step === local.step}
              key={step}
            >
              <span className={s.code}>{String(step).padStart(2, "0")}</span>
              <strong>{stepNames[step]}</strong>
            </div>
          ))}
        </div>
      )}
      {failure && (
        <div role="alert" className={s.alert}>
          <span>{failure}</span>
          <button
            className={s.danger}
            disabled={saving}
            onClick={() => {
              const retry = pending.current;
              if (retry) void send(retry.action, retry.after);
            }}
          >
            저장 다시 시도
          </button>
        </div>
      )}
      {done ? (
        <div className={s.summaryScreen}>
          <div className={s.summaryBadge}>풀이 완료 · 칩으로 문장 채우기</div>
          <section className={s.summaryHero}>
            <span className={s.heroBadge}>
              {local.rating
                ? ratingNames[local.rating] + " · 자가 평가"
                : "기록 없는 연습"}
            </span>
            <h1>{practice ? "연습을 마쳤어요" : "풀이를 마쳤어요"}</h1>
            <div>
              <ExplorerMath text={termTitle} />
            </div>
            <div className={s.summaryMetrics}>
              <div>
                <span>첫 시도에 맞힌 빈칸</span>
                <strong>
                  {local.results.reduce(
                    (n, r) => n + r.blanks - r.missed.length,
                    0,
                  )}{" "}
                  / {local.results.reduce((n, r) => n + r.blanks, 0)}
                </strong>
              </div>
              <div>
                <span>고른 평가</span>
                <strong>
                  {local.rating ? ratingNames[local.rating] : "연습"}
                </strong>
              </div>
              <div>
                <span>다음 복습</span>
                <strong>
                  {!practice && state.receipt
                    ? fadingDayOfDate(state.receipt.dueOn) -
                      fadingDayOfDate(state.today) +
                      "일 뒤"
                    : "기록 안 함"}
                </strong>
              </div>
            </div>
          </section>
          <section className={s.card}>
            <div className={s.sectionTitle}>
              <h2>단계별 풀이 기록</h2>
              <span className={s.code}>틀린 빈칸 수</span>
            </div>
            <div className={s.summarySteps}>
              {([1, 2, 3, 4] as const).map((step) => {
                const result = local.results.find((row) => row.step === step);
                return (
                  <div key={step} className={s.summaryStep}>
                    <span className={s.roundNumber}>{step}</span>
                    <div>
                      <strong>{stepNames[step]}</strong>
                      <p>
                        {step === 1
                          ? local.startStep === 1
                            ? "정독을 마쳤어요"
                            : "이번 풀이에서 건너뜀"
                          : result
                            ? result.blanks + "개 빈칸"
                            : "이번 풀이에서 건너뜀"}
                      </p>
                    </div>
                    <span
                      className={s.propositionState}
                      data-state={result?.missed.length ? "waiting" : "filled"}
                    >
                      {step === 1
                        ? "정독"
                        : result
                          ? "틀림 " + result.missed.length + "개"
                          : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className={s.nextReviewCard}>
            <div className={s.sectionTitle}>
              <h2>다음 복습</h2>
              <span className={s.code}>
                {!practice && state.receipt
                  ? state.receipt.dueOn
                  : "일정 변경 없음"}
              </span>
            </div>
            <p>
              {practice
                ? "연습은 기록과 일정을 바꾸지 않습니다."
                : "칩을 보고 문장을 채웠어요. 직접 설명해 보는 연습으로 이어 갈 수 있습니다."}
            </p>
          </section>
          <button
            className={s.primary}
            data-fading-action="true"
            onClick={onExit}
          >
            오늘의 복습으로
            <FadingIcon name="arrow" />
          </button>
        </div>
      ) : compare ? (
        <div className={`${s.card} ${s.compare} ${s.compareWide} ${s.stack}`}>
          <p className={s.caps}>
            STEP {String(compare.step).padStart(2, "0")} · 대조
          </p>
          <h1 className={s.heading}>{compare.step}단계를 마쳤어요</h1>
          <p className={s.muted}>
            {compare.blanks}개 빈칸 가운데 {compare.missed.length}개에 틀림이
            남았어요.
          </p>
          <div className={`${s.list} ${s.compareResults}`}>
            {concept.propositions.map((p, i) => {
              const targets = erasedTargets(concept, compare.step).filter((t) =>
                p.pieces.some(
                  (piece) =>
                    piece.kind === "target" && piece.target.id === t.id,
                ),
              );
              const missed = targets.filter((t) =>
                compare.missed.includes(t.id),
              ).length;
              return (
                <div className={s.listItem} key={p.id}>
                  <span className={s.listTitle}>
                    명제 {i + 1} · <ExplorerMath text={p.term} />
                  </span>
                  <span className={s.small}>
                    {targets.length}개 빈칸 · 틀림 {missed}개
                  </span>
                </div>
              );
            })}
          </div>
          <button
            className={s.secondary}
            onClick={() => setCanonical((v) => !v)}
          >
            {canonical ? "기준안 접기" : "기준안 보기"}
          </button>
          {canonical && (
            <FadingComparisonSheet
              concept={concept}
              result={compare}
              placements={comparisonPlacements}
              seed={local.seed}
              traps={content.traps}
              figure={content.figure}
              onClose={() => setCanonical(false)}
              onNext={() => {
                setCanonical(false);
                if (practice && local.phase === "rating") setDone(true);
                else nextStep();
              }}
            />
          )}
          <button
            className={s.primary}
            disabled={disabled}
            data-fading-action="true"
            onClick={() => {
              if (practice && local.phase === "rating") setDone(true);
              else nextStep();
            }}
          >
            {local.phase === "rating"
              ? practice
                ? "연습 마치기"
                : "자가 평가하기"
              : "다음 단계"}
          </button>
        </div>
      ) : local.phase === "rating" ? (
        <div className={`${s.card} ${s.compare} ${s.stack}`}>
          <p className={s.caps}>자가 평가</p>
          <h1 className={s.heading}>어느 정도 떠올랐나요</h1>
          <p className={s.muted}>
            칩을 고를 때의 느낌을 평가해 주세요. 다음 복습일을 정하는 데
            쓰입니다.
          </p>
          {state.session?.missedAtFour.length ? (
            <p className={s.notice}>
              4단계에 틀림이 있어 이번 평가는 «다시»입니다.
            </p>
          ) : null}
          <div className={s.ratingGrid}>
            {state.session?.ratings.map((choice) => (
              <button
                className={s.rating}
                key={choice.rating}
                disabled={disabled}
                aria-label={`${ratingNames[choice.rating]} · ${choice.intervalDays}일 뒤`}
                data-fading-rating-key={
                  (["again", "hard", "good", "easy"] as const).indexOf(
                    choice.rating,
                  ) + 1
                }
                onClick={() => {
                  if (!allowedRatings(local).includes(choice.rating)) return;
                  void send(
                    {
                      action: "rate",
                      ...ref,
                      rating: choice.rating,
                      requestId: newFadingId(),
                    },
                    () => {
                      setLocal(closeWithRating(local, choice.rating));
                      setDone(true);
                    },
                  );
                }}
              >
                <span className={s.chipNumber} aria-hidden="true">
                  {(["again", "hard", "good", "easy"] as const).indexOf(
                    choice.rating,
                  ) + 1}
                </span>
                <strong>{ratingNames[choice.rating]}</strong>
                <span>{choice.intervalDays}일 뒤</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <header className={s.sessionHeading}>
            <p className={s.caps}>
              {chapter[0]} · {chapter[1]} · {concept.level} · {concept.ordinal}/
              {concept.siblings}
            </p>
            <h1 className={s.heading}>{chapter.at(-1)}</h1>
            <p className={s.muted}>
              {local.step === 1
                ? "문장을 읽고 핵심어의 뜻을 살펴보세요."
                : local.step === 4
                  ? "모든 표적을 비웠어요. 칩을 보고 문장을 채워 보세요."
                  : "칩과 빈칸을 차례로 눌러 문장을 채워 보세요."}
            </p>
          </header>
          {local.phase === "reading" && (
            <p className={s.readingIntro}>
              문장과 그림을 살펴보고 핵심어의 뜻을 읽어 주세요. 다음 단계에서
              단서를 조금씩 비웁니다.
            </p>
          )}
          <div className={s.sessionGrid}>
            <FadingFigureView
              figure={content.figure}
              answers={local.phase === "reading"}
            />
            <section className={s.propositions} aria-label="개념 문장">
              <div className={s.propositionSectionTitle}>
                <h2>개념 문장</h2>
                {local.step !== 1 && (
                  <span className={s.code}>
                    빈칸 {blanks.length - Object.keys(local.filled).length}개
                    남음
                  </span>
                )}
              </div>
              {concept.propositions.map((p, i) => (
                <article
                  className={s.proposition}
                  key={p.id}
                  data-missed={missedCounts[i]! > 0}
                >
                  <h2 className={s.propositionHeading}>
                    <span className={s.propositionLabel}>
                      명제 {String(i + 1).padStart(2, "0")}
                      {local.phase === "reading" && (
                        <>
                          {" "}
                          · <ExplorerMath text={p.term} />
                        </>
                      )}
                    </span>
                    {local.step === 1 ? (
                      <svg
                        className={s.readingCheck}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                    ) : (
                      <span
                        className={s.propositionState}
                        data-state={
                          p.pieces.some(
                            (piece) =>
                              piece.kind === "target" &&
                              erased.has(piece.target.id),
                          )
                            ? p.pieces.some(
                                (piece) =>
                                  piece.kind === "target" &&
                                  erased.has(piece.target.id) &&
                                  !local.filled[piece.target.id],
                              )
                              ? "waiting"
                              : "filled"
                            : "reading"
                        }
                      >
                        {p.pieces.some(
                          (piece) =>
                            piece.kind === "target" &&
                            erased.has(piece.target.id),
                        )
                          ? p.pieces.some(
                              (piece) =>
                                piece.kind === "target" &&
                                erased.has(piece.target.id) &&
                                !local.filled[piece.target.id],
                            )
                            ? "미입력"
                            : "채워짐"
                          : "이 단계에서는 안 비는 문장"}
                      </span>
                    )}
                  </h2>
                  <div className={s.sentence}>
                    {p.pieces.map((piece, index) => {
                      if (piece.kind === "text")
                        return (
                          <span key={index}>
                            <ExplorerMath text={piece.text} />
                          </span>
                        );
                      const target = piece.target;
                      if (!erased.has(target.id))
                        return (
                          <span
                            key={target.id}
                            className={
                              local.phase === "reading"
                                ? target.tier === "math"
                                  ? s.readingMathTarget
                                  : s.readingTextTarget
                                : undefined
                            }
                          >
                            <ExplorerMath text={target.text} />
                          </span>
                        );
                      const blankIndex =
                        blanks.findIndex((t) => t.id === target.id) + 1;
                      const filled = local.filled[target.id];
                      const missed = local.missed.includes(target.id);
                      if (filled)
                        return (
                          <span
                            key={target.id}
                            className={`${s.filled} ${s.stableSlot} ${missed ? s.missed : ""}`}
                            role={missed ? "group" : undefined}
                            aria-label={
                              missed
                                ? `빈칸 ${blankIndex} · 틀린 기록이 있는 빈칸`
                                : undefined
                            }
                            data-fading-slot={target.id}
                          >
                            <ExplorerMath
                              text={tray.find((c) => c.id === filled)!.text}
                            />
                            {missed && (
                              <span
                                className={s.missedMarker}
                                aria-hidden="true"
                              />
                            )}
                          </span>
                        );
                      return (
                        <button
                          key={target.id}
                          className={`${s.blank} ${s.stableSlot} ${missed ? s.missed : ""}`}
                          aria-label={`빈칸 ${blankIndex}${missed ? " · 틀린 기록이 있는 빈칸" : ""}`}
                          aria-pressed={pendingBlank === target.id}
                          data-pending={pendingBlank === target.id}
                          data-fading-slot={target.id}
                          data-fading-blank={target.id}
                          data-drag-available={!!dragging.drag}
                          data-drag-over={dragging.over === target.id}
                          disabled={disabled}
                          onClick={() => chooseBlank(target.id)}
                        >
                          {wrong?.targetId === target.id ? (
                            <span className={s.wrongPlaced}>
                              <ExplorerMath text={wrong.text} />
                            </span>
                          ) : (
                            <>
                              <FadingIcon name="erase" />
                              <span className={s.blankCaption}>빈칸 터치</span>
                            </>
                          )}
                          {missed && (
                            <span
                              className={s.missedMarker}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {missedCounts[i]! > 0 && (
                    <p className={s.missedNote} data-fading-missed-note>
                      틀린 기록이 있는 빈칸 {missedCounts[i]}개 · 다시 채워도
                      기록은 남습니다
                    </p>
                  )}
                  {wrong &&
                    p.pieces.some(
                      (piece) =>
                        piece.kind === "target" &&
                        piece.target.id === wrong.targetId,
                    ) && (
                      <div className={s.wrongBanner}>
                        <span className={s.wrongChip}>
                          <ExplorerMath text={wrong.text} />
                        </span>
                        <strong>맞지 않는 칩</strong>
                        <button
                          disabled={disabled}
                          onClick={() => {
                            setWrong(null);
                            setActiveBlank(wrong.targetId);
                          }}
                          className={s.danger}
                        >
                          다시 고르기
                        </button>
                      </div>
                    )}
                </article>
              ))}
            </section>
            {local.phase === "filling" && (
              <aside className={`${s.card} ${s.tray}`} aria-label="칩 고르기">
                <div className={s.row}>
                  <h2 className={s.subheading}>문장을 채우는 칩</h2>
                  <span className={s.code}>
                    {pendingBlank
                      ? `빈칸 [${blanks.findIndex((t) => t.id === pendingBlank) + 1}] 입력 대기 중`
                      : "빈칸을 골라 주세요"}
                  </span>
                </div>
                <p className={s.muted} style={{ marginTop: 10 }}>
                  칩과 빈칸을 눌러 고르거나 칩을 빈칸으로 끌어 넣으세요.
                </p>
                <form
                  className={s.chipInput}
                  aria-label="칩 글로 입력"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitTypedChip();
                  }}
                >
                  <label htmlFor={chipInputId} className={s.small}>
                    칩 글 입력
                  </label>
                  <div>
                    <input
                      ref={chipInput}
                      id={chipInputId}
                      className={s.input}
                      value={typed}
                      disabled={disabled || !!stageReady}
                      autoComplete="off"
                      placeholder="칩 글을 입력하고 Enter"
                      onFocus={() => {
                        nativeTab.current = false;
                      }}
                      onChange={(event) => {
                        setTyped(event.target.value);
                        setSelected(null);
                        nativeTab.current = false;
                      }}
                      onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) {
                          if (event.key === "Enter") event.preventDefault();
                          return;
                        }
                        if (cycleChip(event)) return;
                        if (
                          event.key === "Escape" ||
                          (event.key === "Backspace" && !typed)
                        ) {
                          event.preventDefault();
                          setTyped("");
                          if (event.key === "Escape") cancelChipKeyboard();
                          else clearSelection();
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className={s.secondary}
                      disabled={
                        disabled || !!stageReady || (!typed.trim() && !selected)
                      }
                    >
                      넣기
                    </button>
                  </div>
                </form>
                <div className={s.chips}>
                  {choices.map((choice, index) =>
                    choice.chipId ? (
                      <button
                        key={choice.id}
                        className={s.chip}
                        data-fading-chip="true"
                        data-dragging={dragging.drag?.chipId === choice.chipId}
                        disabled={disabled || !!stageReady}
                        aria-pressed={selected === choice.chipId}
                        aria-label={`칩 ${choice.text}`}
                        onKeyDown={(event) => {
                          if (cycleChip(event, choice.chipId!)) return;
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelChipKeyboard();
                            return;
                          }
                          if (
                            event.nativeEvent.isComposing ||
                            (event.key !== "Enter" && event.key !== " ") ||
                            !pendingBlank
                          )
                            return;
                          event.preventDefault();
                          if (event.repeat) return;
                          const button = event.currentTarget;
                          const index = Array.from(
                            sessionRoot.current!.querySelectorAll(
                              "[data-fading-chip]",
                            ),
                          ).indexOf(button);
                          place(pendingBlank, selected ?? choice.chipId!);
                          requestAnimationFrame(() => {
                            if (button.isConnected && !button.disabled) return;
                            const remaining =
                              sessionRoot.current?.querySelectorAll<HTMLButtonElement>(
                                "[data-fading-chip]:not(:disabled)",
                              );
                            const next =
                              remaining?.[
                                Math.min(index, remaining.length - 1)
                              ];
                            (
                              next ??
                              sessionRoot.current?.querySelector<HTMLButtonElement>(
                                '[data-fading-action="true"]:not(:disabled)',
                              )
                            )?.focus();
                          });
                        }}
                        {...dragging.handlers(
                          choice.chipId,
                          choice.text,
                          false,
                        )}
                        onClick={() => {
                          nativeTab.current = false;
                          if (!dragging.consumeClick())
                            chooseChip(choice.chipId!);
                        }}
                      >
                        <span className={s.chipDot} />
                        <span className={s.chipNumber} aria-hidden="true">
                          {index + 1}
                        </span>
                        <span
                          className={s.chipText}
                          data-fading-chip-text={choice.id}
                        >
                          <ExplorerMath text={choice.text} />
                        </span>
                      </button>
                    ) : null,
                  )}
                </div>
                <p className={`${s.small} ${s.keyboardHint}`}>
                  Tab·Shift+Tab 칩 선택 이동 · Enter로 선택한 칩 넣기 · 칩에서
                  Enter·Space로 넣기 · 입력란 밖 ← → 빈칸 이동 · 숫자키로 넣기
                  {choices.length > 9 && " · 0은 10번, Shift+숫자는 11번부터"}
                  {" · Backspace 선택 취소 · Esc 선택 취소 후 일반 Tab 이동"}
                </p>
                <div
                  role="status"
                  aria-live="polite"
                  className={s.feedback}
                  data-error={!!wrong || (!!feedback && !stageReady)}
                >
                  {feedback ||
                    (saving ? (
                      "저장 중…"
                    ) : selected ? (
                      <ExplorerMath
                        text={`선택한 칩: ${choices.find((choice) => choice.chipId === selected)?.text} · Enter로 현재 빈칸에 넣으세요.`}
                      />
                    ) : activeBlank ? (
                      "넣을 칩을 골라 주세요."
                    ) : (
                      ""
                    ))}
                </div>
              </aside>
            )}
          </div>
          <div className={s.actions}>
            {local.phase === "reading" ? (
              <button
                className={s.primary}
                disabled={disabled}
                data-fading-action="true"
                onClick={() => {
                  const next = finishReading(local);
                  if (practice) setLocal(next);
                  else
                    void send({ action: "read", ...ref }, () => setLocal(next));
                }}
              >
                읽었어요 · 다음 단계
              </button>
            ) : (
              <>
                <button
                  className={`${s.primary} ${s.full}`}
                  disabled={disabled || !stageReady}
                  data-fading-action="true"
                  onClick={() => {
                    if (stageReady) complete(stageReady);
                  }}
                >
                  단계 마치기 · {Object.keys(local.filled).length}/
                  {blanks.length} 완료
                  <FadingIcon name="arrow" />
                </button>
                <button
                  className={s.secondary}
                  disabled={disabled || !!stageReady}
                  data-fading-action="true"
                  onClick={() => complete(giveUpStep(local, concept), true)}
                >
                  아직 모르겠어요
                </button>
              </>
            )}
          </div>
        </>
      )}
      {exit && (
        <ExitDialog
          session={local}
          filled={Object.keys(local.filled).length}
          blanks={blanks.length}
          practice={!!practice}
          onStay={() => {
            setExit(false);
            exitButton.current?.focus();
          }}
          onExit={onExit}
        />
      )}
      <FadingDraggedChip drag={dragging.drag} />
    </div>
  );
}
