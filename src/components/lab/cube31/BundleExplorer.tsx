"use client";

import { useId, useRef, useState, type CSSProperties } from "react";

import type { BundleExperiment } from "@/lib/lab/cube31/explorationTypes";
import styles from "./BundleExplorer.module.css";

type Place = 0 | 1 | 2;
type Counts = [number, number, number];
type Snapshot = { counts: Counts; opened: boolean };
type Exchange = { from: Place; to: Place; kind: "split" | "merge" };
type BoardState = Snapshot & {
  history: Snapshot[];
  exchange: Exchange | null;
  revision: number;
  message: string;
};

const PLACES = [
  { name: "백", value: 100, shape: "hundred" },
  { name: "십", value: 10, shape: "ten" },
  { name: "일", value: 1, shape: "one" },
] as const;
const MAX_VISIBLE = 12;
const PARTICLES = Array.from({ length: 10 }, (_, index) => index);

function snapshot(state: Snapshot): Snapshot {
  return { counts: [...state.counts], opened: state.opened };
}

export default function BundleExplorer({
  experiment,
  disabled = false,
}: {
  experiment: BundleExperiment;
  disabled?: boolean;
}) {
  // A new problem starts fresh; ordinary parent renders preserve exploration.
  const identity = JSON.stringify([
    experiment.counts,
    experiment.startPacked ?? false,
    experiment.prompt,
  ]);
  return (
    <BundleBoard key={identity} experiment={experiment} disabled={disabled} />
  );
}

function BundleBoard({
  experiment,
  disabled,
}: {
  experiment: BundleExperiment;
  disabled: boolean;
}) {
  const headingId = useId();
  const boardId = useId();
  const dragSource = useRef<Place | null>(null);
  const [state, setState] = useState<BoardState>(() => ({
    counts: [...experiment.counts],
    opened: !experiment.startPacked,
    history: [],
    exchange: null,
    revision: 0,
    message: "",
  }));
  const total =
    experiment.counts[0] * 100 +
    experiment.counts[1] * 10 +
    experiment.counts[2];
  const previous = state.history.at(-1);

  function exchange(from: Place, to: Place) {
    if (disabled || Math.abs(from - to) !== 1) return;
    setState((current) => {
      const kind = from < to ? "split" : "merge";
      const take = kind === "split" ? 1 : 10;
      const give = kind === "split" ? 10 : 1;
      if (!current.opened || current.counts[from] < take) return current;
      const counts: Counts = [...current.counts];
      counts[from] -= take;
      counts[to] += give;
      return {
        ...current,
        counts,
        history: [...current.history, snapshot(current)],
        exchange: { from, to, kind },
        revision: current.revision + 1,
        message: `${PLACES[from].name} ${take}개를 ${PLACES[to].name} ${give}개로 ${kind === "split" ? "풀었어요" : "묶었어요"}. 전체는 ${total} 그대로예요.`,
      };
    });
  }

  function open() {
    if (disabled) return;
    setState((current) =>
      current.opened
        ? current
        : {
            ...current,
            opened: true,
            history: [...current.history, snapshot(current)],
            revision: current.revision + 1,
            message: "블록을 펼쳤어요. 묶음을 눌러 풀어 보세요.",
          },
    );
  }

  function undo() {
    if (disabled) return;
    dragSource.current = null;
    setState((current) => {
      const last = current.history.at(-1);
      if (!last) return current;
      return {
        ...last,
        history: current.history.slice(0, -1),
        exchange: null,
        revision: current.revision + 1,
        message: "한 단계 되돌렸어요.",
      };
    });
  }

  function reset() {
    if (disabled) return;
    dragSource.current = null;
    setState((current) => ({
      counts: [...experiment.counts],
      opened: !experiment.startPacked,
      history: [],
      exchange: null,
      revision: current.revision + 1,
      message: "처음 블록으로 돌아왔어요.",
    }));
  }

  const hint = !state.opened
    ? "큰 수 안에는 어떤 묶음이 숨어 있을까요?"
    : state.counts[2] >= 10
      ? "낱개가 10개 이상이에요. 십 묶음을 만들어 볼까요?"
      : state.counts[1] >= 10
        ? "십이 10개 이상이에요. 백 묶음을 만들어 볼까요?"
        : state.counts[0] + state.counts[1] > 0
          ? "백이나 십 블록을 눌러 더 작은 블록으로 풀어 보세요."
          : "10개가 모이면 다음 자리의 묶음이 돼요.";

  return (
    <section
      className={styles.explorer}
      aria-labelledby={headingId}
      data-disabled={disabled}
    >
      <div className={styles.toolbar}>
        <h3 id={headingId} className={styles.heading}>
          묶음 놀이터 <span>모두 {total}</span>
        </h3>
        <div className={styles.tools}>
          <button
            type="button"
            onClick={undo}
            disabled={disabled || state.history.length === 0}
          >
            <span aria-hidden="true">↶</span> 되돌리기
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={disabled || state.history.length === 0}
          >
            처음으로
          </button>
        </div>
      </div>
      <p className={styles.prompt}>{experiment.prompt}</p>

      {state.opened ? (
        <div id={boardId} className={styles.board}>
          {PLACES.map((place, index) => {
            const position = index as Place;
            const count = state.counts[position];
            const delta =
              state.exchange && previous
                ? count - previous.counts[position]
                : 0;
            const actionable = position === 2 ? count >= 10 : count > 0;
            const blockLabel =
              position === 2
                ? "일 블록 10개 묶기"
                : `${place.name} 블록 1개 풀기`;
            const changed =
              state.exchange?.from === position ||
              state.exchange?.to === position;
            const blocks = (
              <span
                key={changed ? state.revision : "rest"}
                className={`${styles.blocks} ${styles[place.shape]}`}
                aria-hidden="true"
              >
                {Array.from(
                  { length: Math.min(count, MAX_VISIBLE) },
                  (_, block) => (
                    <span className={styles.block} key={block} />
                  ),
                )}
              </span>
            );
            return (
              <div
                key={place.name}
                className={styles.column}
                data-place={position}
                data-changed={changed || undefined}
                role="group"
                aria-label={`${place.name}의 자리`}
                onDragOver={(event) => {
                  const from = dragSource.current;
                  if (
                    !disabled &&
                    from !== null &&
                    Math.abs(from - position) === 1
                  )
                    event.preventDefault();
                }}
                onDrop={(event) => {
                  if (disabled) return;
                  event.preventDefault();
                  const from = dragSource.current;
                  dragSource.current = null;
                  if (from !== null) exchange(from, position);
                }}
              >
                <div className={styles.placeTitle}>
                  <span>
                    {place.name} <small>{place.value}</small>
                  </span>
                  <strong
                    key={state.revision}
                    className={delta ? styles.countChanged : undefined}
                    aria-label={`${place.name} 블록 ${count}개`}
                  >
                    {count}
                    <small>개</small>
                    {delta ? (
                      <em aria-hidden="true">
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </em>
                    ) : null}
                  </strong>
                </div>
                {actionable ? (
                  <button
                    type="button"
                    className={styles.blockButton}
                    aria-label={blockLabel}
                    disabled={disabled}
                    draggable={!disabled}
                    onClick={() =>
                      exchange(
                        position,
                        position === 2 ? 1 : ((position + 1) as Place),
                      )
                    }
                    onDragStart={(event) => {
                      if (disabled) {
                        dragSource.current = null;
                        event.preventDefault();
                        return;
                      }
                      dragSource.current = position;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", place.name);
                    }}
                    onDragEnd={() => {
                      dragSource.current = null;
                    }}
                  >
                    {blocks}
                    {count > MAX_VISIBLE ? (
                      <span className={styles.overflow}>
                        외 {count - MAX_VISIBLE}개
                      </span>
                    ) : null}
                    <span className={styles.tapHint}>
                      {position === 2 ? "눌러서 10개 묶기" : "눌러서 1개 풀기"}
                    </span>
                  </button>
                ) : (
                  <div className={styles.restingBlocks}>
                    {count ? (
                      blocks
                    ) : (
                      <span className={styles.empty}>비어 있어요</span>
                    )}
                    {count ? (
                      <span className={styles.tapHint}>
                        10개가 모이면 묶어요
                      </span>
                    ) : null}
                  </div>
                )}
                {position > 0 ? (
                  <button
                    type="button"
                    className={styles.mergeButton}
                    disabled={disabled || count < 10}
                    aria-label={`${place.name} 블록 10개를 ${PLACES[position - 1].name} 블록 1개로 묶기`}
                    onClick={() => exchange(position, (position - 1) as Place)}
                  >
                    <span aria-hidden="true">← </span>10개 묶기
                  </button>
                ) : (
                  <p className={styles.equivalence}>백 1개 = 십 10개</p>
                )}
              </div>
            );
          })}
          {state.exchange ? (
            <div
              key={state.revision}
              className={styles.flight}
              data-kind={state.exchange.kind}
              aria-hidden="true"
              style={
                {
                  "--from": `${((state.exchange.from + 0.5) * 100) / 3}%`,
                  "--to": `${((state.exchange.to + 0.5) * 100) / 3}%`,
                } as CSSProperties
              }
            >
              {PARTICLES.map((particle) => (
                <span
                  key={particle}
                  style={
                    {
                      "--fan": `${(particle - 4.5) * 6}px`,
                      "--delay": `${particle * 12}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div id={boardId} className={styles.packed}>
          <button
            type="button"
            className={styles.packedButton}
            onClick={open}
            disabled={disabled}
            aria-label={`${total} 펼쳐 보기`}
            aria-expanded={false}
            aria-controls={boardId}
          >
            <strong>{total}</strong>
            <span>
              펼쳐 보기 <span aria-hidden="true">↗</span>
            </span>
          </button>
          <p>
            펼치고, 풀고, 다시 묶어도
            <br />
            전체 수는 같아요.
          </p>
        </div>
      )}

      {state.opened ? (
        <div
          className={styles.equation}
          role="math"
          aria-label={`현재 블록의 식: ${state.counts[0] * 100} + ${state.counts[1] * 10} + ${state.counts[2]} = ${total}`}
        >
          {PLACES.map((place, index) => (
            <span key={place.name} className={styles.term}>
              {index > 0 ? <span className={styles.operator}>+</span> : null}
              <strong
                key={state.revision}
                data-place={index}
                className={
                  state.exchange &&
                  (state.exchange.from === index || state.exchange.to === index)
                    ? styles.countChanged
                    : undefined
                }
              >
                {state.counts[index] * place.value}
              </strong>
            </span>
          ))}
          <span className={styles.operator}>=</span>
          <strong>{total}</strong>
          <span className={styles.same}>전체는 그대로!</span>
        </div>
      ) : null}
      <p
        className={styles.status}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {state.message || hint}
      </p>
    </section>
  );
}
