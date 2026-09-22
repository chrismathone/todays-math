"use client";

import { useId, useReducer } from "react";
import type { JourneyExperiment } from "@/lib/lab/cube31/explorationTypes";
import styles from "./NumberJourney.module.css";

type Props = { experiment: JourneyExperiment; disabled?: boolean };
type Move = { chunk: number; from: number; to: number; delta: number };
type Snapshot = {
  step: number;
  current: number;
  start: number;
  moves: Move[];
  finished: boolean;
};
type State = { present: Snapshot; history: Snapshot[] };
type Action =
  | { type: "move"; step: number; chunk: number }
  | { type: "next"; step: number }
  | { type: "undo" }
  | { type: "reset" };

const PLACES = [
  { unit: 100, name: "백", style: "hundreds" },
  { unit: 10, name: "십", style: "tens" },
  { unit: 1, name: "일", style: "ones" },
] as const;

function chunksFor(amount: number) {
  return PLACES.map((place, index) => ({
    ...place,
    // Keep the full hundreds portion, including journeys across 1,000.
    value:
      Math.floor(
        (index === 0 ? amount : amount % (place.unit * 10)) / place.unit,
      ) * place.unit,
  })).filter((chunk) => chunk.value > 0);
}

function initialState(start: number): State {
  return {
    present: { step: 0, current: start, start, moves: [], finished: false },
    history: [],
  };
}

function transition(
  state: State,
  action: Action,
  experiment: JourneyExperiment,
): State {
  if (action.type === "reset") return initialState(experiment.start);
  if (action.type === "undo") {
    const previous = state.history.at(-1);
    return previous
      ? { present: previous, history: state.history.slice(0, -1) }
      : state;
  }

  const current = state.present;
  // A queued click from a previous step cannot consume a new step's chip.
  if (current.finished || action.step !== current.step) return state;
  const step = experiment.steps[current.step];
  const chunks = chunksFor(step?.amount ?? 0);
  let next: Snapshot;
  if (action.type === "move") {
    const chunk = chunks[action.chunk];
    if (!chunk || current.moves.some((move) => move.chunk === action.chunk))
      return state;
    const delta = step.operation === "subtract" ? -chunk.value : chunk.value;
    const to = current.current + delta;
    next = {
      ...current,
      current: to,
      moves: [
        ...current.moves,
        { chunk: action.chunk, from: current.current, to, delta },
      ],
    };
  } else {
    if (current.moves.length !== chunks.length) return state;
    next =
      current.step + 1 < experiment.steps.length
        ? {
            step: current.step + 1,
            current: current.current,
            start: current.current,
            moves: [],
            finished: false,
          }
        : { ...current, finished: true };
  }
  return { present: next, history: [...state.history, current] };
}

function signed(value: number) {
  return `${value < 0 ? "−" : "+"}${Math.abs(value)}`;
}

function JourneyBoard({ experiment, disabled = false }: Props) {
  const [state, dispatch] = useReducer(
    (previous: State, action: Action) =>
      transition(previous, action, experiment),
    experiment.start,
    initialState,
  );
  const promptId = useId();
  const arrowId = useId();
  const { present } = state;
  const step = experiment.steps[present.step];
  const chunks = chunksFor(step?.amount ?? 0);
  const remaining = chunks.filter(
    (_, index) => !present.moves.some((move) => move.chunk === index),
  );
  const direction = step?.operation === "subtract" ? -1 : 1;
  const remainingAmount = remaining.reduce(
    (sum, chunk) => sum + chunk.value,
    0,
  );

  // Round the visible scale outwards: unused chips never display a destination answer.
  // The scale stays fixed during a step, so each move has a consistent distance.
  const extent = present.start + direction * (step?.amount ?? 0);
  const interval = Math.max(
    10,
    10 ** Math.floor(Math.log10(Math.max(10, step?.amount ?? 0))),
  );
  const minimum =
    Math.floor(Math.min(present.start, extent) / interval) * interval -
    interval;
  const maximum =
    Math.ceil(Math.max(present.start, extent) / interval) * interval + interval;
  const position = (value: number) =>
    5 + ((value - minimum) / (maximum - minimum)) * 90;
  const tickCount = Math.round((maximum - minimum) / interval);
  const equation = present.moves.length
    ? `${present.start} ${present.moves.map((move) => signed(move.delta)).join(" ")} = ${present.current}`
    : `${present.start}에서 출발`;
  const path = [present.start, ...present.moves.map((move) => move.to)].join(
    " → ",
  );

  function act(action: Action) {
    if (!disabled) dispatch(action);
  }

  return (
    <section className={styles.journey} aria-labelledby={promptId}>
      <div className={styles.heading}>
        <p id={promptId} className={styles.prompt} title={experiment.prompt}>
          {experiment.prompt}
        </p>
        <span className={styles.progress}>
          {Math.min(present.step + 1, experiment.steps.length)}/
          {experiment.steps.length} 단계
        </span>
      </div>
      <div className={styles.step}>
        <span className={styles.stepLabel} title={step?.label}>
          {present.step > 0
            ? `앞에서 만든 ${present.start}에서 계속`
            : `${present.start}에서 출발`}
          {step ? ` · ${signed(direction * step.amount)}` : ""}
          {step?.label ? ` · ${step.label}` : ""}
        </span>
        <span>{direction < 0 ? "← 빼기" : "더하기 →"}</span>
      </div>
      <div
        className={styles.numberLine}
        role="img"
        aria-label={`수직선: ${path}. 현재 수 ${present.current}`}
      >
        <svg viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker
              id={arrowId}
              markerWidth="5"
              markerHeight="5"
              refX="4"
              refY="2.5"
              orient="auto"
            >
              <path d="M0 0 L5 2.5 L0 5 Z" fill="currentColor" />
            </marker>
          </defs>
          <path
            className={styles.axis}
            d="M18 61 H582 M18 61 l5 -4 M18 61 l5 4 M582 61 l-5 -4 M582 61 l-5 4"
          />
          {Array.from({ length: tickCount + 1 }, (_, index) => {
            const value = minimum + index * interval;
            const x = position(value) * 6;
            return (
              <g key={value} className={styles.tick}>
                <path d={`M${x} 57 V65`} />
              </g>
            );
          })}
          {present.moves.map((move, index) => {
            const from = position(move.from) * 6;
            const to = position(move.to) * 6;
            return (
              <path
                key={move.chunk}
                className={styles.hop}
                d={`M${from} 59 Q${(from + to) / 2} ${12 + index * 9} ${to} 59`}
                markerEnd={`url(#${arrowId})`}
              />
            );
          })}
        </svg>
        {Array.from({ length: tickCount + 1 }, (_, index) => {
          const value = minimum + index * interval;
          return index % Math.max(1, Math.ceil(tickCount / 5)) === 0 ? (
            <span
              key={value}
              className={styles.tickLabel}
              style={{ left: `${position(value)}%` }}
              aria-hidden="true"
            >
              {value}
            </span>
          ) : null;
        })}
        <span
          className={styles.marker}
          style={{ left: `${position(present.current)}%` }}
          aria-hidden="true"
        >
          <strong>{present.current}</strong>
          <i />
        </span>
      </div>
      <div className={styles.readout} aria-live="polite" aria-atomic="true">
        <output aria-label="현재 수" className={styles.current}>
          현재 {present.current}
        </output>
        <span
          className={styles.equation}
          aria-label="이동한 식"
          title={equation}
        >
          {equation}
        </span>
      </div>
      <div className={styles.tray}>
        <div className={styles.trayCaption}>
          <span>
            {present.finished
              ? `도착한 수 ${present.current}`
              : "칩을 골라 움직여 보세요"}
          </span>
          <span aria-label="남은 이동">
            남은 이동 {remainingAmount} · {remaining.length}개
          </span>
        </div>
        <div className={styles.chips}>
          {chunks.map((chunk, index) => {
            const used = present.moves.some((move) => move.chunk === index);
            return (
              <button
                key={chunk.unit}
                type="button"
                className={`${styles.chip} ${styles[chunk.style]}`}
                disabled={disabled || used || present.finished}
                aria-label={`${signed(direction * chunk.value)} 이동${used ? " 완료" : ""}`}
                data-used={used}
                onClick={() =>
                  act({ type: "move", step: present.step, chunk: index })
                }
              >
                <span className={styles.block} aria-hidden="true" />
                <strong>{signed(direction * chunk.value)}</strong>
                <span className={styles.chipDetail}>
                  {used
                    ? "이동함 ✓"
                    : `${chunk.name} ${chunk.value / chunk.unit}개`}
                </span>
              </button>
            );
          })}
          {chunks.length === 0 ? (
            <p className={styles.zero}>
              움직일 칩이 없어요. 현재 수는 그대로예요.
            </p>
          ) : null}
        </div>
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          disabled={disabled || state.history.length === 0}
          onClick={() => act({ type: "undo" })}
        >
          되돌리기
        </button>
        <button
          type="button"
          disabled={disabled || state.history.length === 0}
          onClick={() => act({ type: "reset" })}
        >
          처음부터
        </button>
        <button
          type="button"
          className={styles.next}
          disabled={disabled || remaining.length > 0 || present.finished}
          onClick={() => act({ type: "next", step: present.step })}
        >
          {present.finished
            ? "도착"
            : present.step + 1 < experiment.steps.length
              ? "다음 단계 →"
              : "도착 확인"}
        </button>
      </div>
    </section>
  );
}

export default function NumberJourney({ experiment, disabled = false }: Props) {
  // Parent rerenders preserve moves; a changed experiment starts a fresh journey.
  return (
    <JourneyBoard
      key={JSON.stringify(experiment)}
      experiment={experiment}
      disabled={disabled}
    />
  );
}
