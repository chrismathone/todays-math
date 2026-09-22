"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import type { RelationExperiment } from "@/lib/lab/cube31/explorationTypes";
import styles from "./RelationExplorer.module.css";
import { containsPoint, useRelationDrag } from "./useRelationDrag";

type Props = {
  experiment: RelationExperiment;
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
};

const colors = [styles.blue, styles.mint, styles.orange];
const percent = (value: number, scale: number) => `${(value / scale) * 100}%`;

function Board({
  experiment,
  disabled,
  title,
  hint,
  resetDisabled,
  onReset,
  children,
  equation,
  feedback,
}: {
  experiment: RelationExperiment;
  disabled: boolean;
  title: string;
  hint: string;
  resetDisabled: boolean;
  onReset: () => void;
  children: ReactNode;
  equation: ReactNode;
  feedback: string;
}) {
  const titleId = useId();
  const hintId = useId();
  return (
    <section
      className={styles.board}
      aria-labelledby={titleId}
      aria-describedby={hintId}
      data-disabled={disabled}
      data-mode={experiment.mode}
    >
      <header className={styles.header}>
        <h3 id={titleId}>{title}</h3>
        <button
          type="button"
          className={styles.reset}
          disabled={disabled || resetDisabled}
          onClick={() => {
            if (!disabled) onReset();
          }}
        >
          처음으로
        </button>
      </header>
      <p className={styles.prompt}>{experiment.prompt}</p>
      <p className={styles.hint} id={hintId}>
        {hint}
      </p>
      <div className={styles.workspace}>{children}</div>
      <div
        className={styles.readout}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <strong className={styles.equation}>{equation}</strong>
        <span className={styles.feedback}>{feedback}</span>
      </div>
    </section>
  );
}

function JoinExplorer({ experiment, disabled = false }: Props) {
  const [placed, setPlaced] = useState<number[]>([]);
  const tray = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const scale =
    Math.max(
      1,
      experiment.parts.reduce((sum, part) => sum + part.value, 0),
    ) * 1.08;
  const sum = placed.reduce(
    (result, index) => result + experiment.parts[index].value,
    0,
  );

  function place(index: number) {
    if (disabled || !experiment.parts[index]) return;
    setPlaced((previous) =>
      previous.includes(index) ? previous : [...previous, index],
    );
  }

  function remove(index: number) {
    if (disabled) return;
    setPlaced((previous) => previous.filter((part) => part !== index));
  }

  const movement = useRelationDrag({
    disabled,
    hitTest: (drag) => {
      if (
        drag.source === "tray" &&
        containsPoint(track.current, drag.x, drag.y)
      )
        return "join";
      if (drag.source === "join" && containsPoint(tray.current, drag.x, drag.y))
        return "tray";
      return null;
    },
    onDrop: (drag) => {
      if (drag.target === "join") place(drag.index);
      if (drag.target === "tray") remove(drag.index);
    },
  });
  const drag = movement.drag;

  return (
    <Board
      experiment={experiment}
      disabled={disabled}
      title="막대를 이어 전체 만들기"
      hint="아래로 끌어 잇고, 위로 끌어 빼요. 누르거나 Enter로도 옮길 수 있어요."
      resetDisabled={placed.length === 0}
      onReset={() => {
        movement.cancel();
        setPlaced([]);
      }}
      equation={
        placed.length
          ? `${placed.map((index) => experiment.parts[index].value).join(" + ")} = ${sum}`
          : "놓은 막대의 합 0"
      }
      feedback={
        placed.length === experiment.parts.length
          ? "모든 부분이 하나로 이어졌어요."
          : `전체 칸에 ${placed.length}개를 놓았어요.`
      }
    >
      <div className={styles.rowLabel}>
        주어진 부분
        <span>
          {drag?.source === "join"
            ? "여기에 놓으면 다시 빠져요 ↑"
            : "끌어서 옮겨요 ↕"}
        </span>
      </div>
      <div
        ref={tray}
        className={styles.tray}
        aria-label="주어진 수 막대"
        data-drop-active={drag?.source === "join"}
        data-drop-ready={drag?.target === "tray"}
      >
        {experiment.parts.map((part, index) => (
          <div
            key={index}
            className={styles.traySlot}
            style={{ width: percent(part.value, scale) }}
          >
            <button
              type="button"
              className={`${styles.strip} ${colors[index % colors.length]} ${placed.includes(index) ? styles.parked : ""}`}
              aria-label={`${part.label} ${part.value} 놓기`}
              disabled={disabled || placed.includes(index)}
              {...movement.bind(index, "tray", placed.includes(index))}
              style={movement.style(index, "tray")}
              onClick={() => place(index)}
            >
              <span>{part.label}</span>
              <b>{part.value}</b>
            </button>
            {drag?.target === "tray" && drag.index === index ? (
              <div
                className={`${styles.strip} ${styles.snapPreview} ${colors[index % colors.length]}`}
                aria-hidden="true"
              >
                <b>{part.value}</b>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className={styles.rowLabel}>
        이어 만든 전체
        <span>
          {drag?.source === "tray"
            ? "이 칸에 놓으면 이어져요 ↓"
            : `${placed.length}/${experiment.parts.length}`}
        </span>
      </div>
      <div
        ref={track}
        className={styles.joinTrack}
        aria-label="전체를 만드는 칸"
        data-drop-active={drag?.source === "tray"}
        data-drop-ready={drag?.target === "join"}
      >
        {placed.length === 0 && drag?.target !== "join" ? (
          <span className={styles.placeholder}>여기에 부분을 이어 보세요</span>
        ) : null}
        {placed.map((index) => (
          <button
            type="button"
            key={index}
            className={`${styles.strip} ${styles.joined} ${colors[index % colors.length]}`}
            {...movement.bind(index, "join")}
            style={{
              width: percent(experiment.parts[index].value, scale),
              ...movement.style(index, "join"),
            }}
            disabled={disabled}
            aria-label={`${experiment.parts[index].label} ${experiment.parts[index].value} 빼기`}
            onClick={() => remove(index)}
          >
            <span>{experiment.parts[index].label}</span>
            <b>{experiment.parts[index].value}</b>
          </button>
        ))}
        {drag?.target === "join" ? (
          <div
            className={`${styles.strip} ${styles.snapPreview} ${colors[drag.index % colors.length]}`}
            style={{
              left: percent(sum, scale),
              width: percent(experiment.parts[drag.index].value, scale),
            }}
            aria-hidden="true"
          >
            <b>{experiment.parts[drag.index].value}</b>
          </div>
        ) : null}
      </div>
    </Board>
  );
}

function CompareExplorer({ experiment, disabled = false }: Props) {
  const initialSelection = () => (experiment.parts.length === 2 ? [0, 1] : []);
  const [comparison, setComparison] = useState(() => ({
    selected: initialSelection(),
    aligned: [] as number[],
  }));
  const lanes = useRef<(HTMLDivElement | null)[]>([]);
  const { selected, aligned } = comparison;
  const scale =
    Math.max(1, ...experiment.parts.map((part) => part.value)) / 0.84;
  const pair = selected.map((index) => experiment.parts[index].value);
  const larger = Math.max(...pair);
  const smaller = Math.min(...pair);
  const ready = selected.length === 2;
  const complete = ready && selected.every((index) => aligned.includes(index));

  function select(index: number) {
    if (disabled) return;
    setComparison((previous) => {
      const next = previous.selected.includes(index)
        ? previous.selected.filter((item) => item !== index)
        : [...previous.selected.slice(-1), index];
      return {
        selected: next,
        aligned: previous.aligned.filter((item) => next.includes(item)),
      };
    });
  }

  function alignOne(index: number) {
    if (disabled) return;
    setComparison((previous) => {
      const next = previous.selected.includes(index)
        ? previous.selected
        : [...previous.selected.slice(-1), index];
      return {
        selected: next,
        aligned: [
          ...new Set([
            ...previous.aligned.filter((item) => next.includes(item)),
            index,
          ]),
        ],
      };
    });
  }

  const movement = useRelationDrag({
    disabled,
    hitTest: (drag) => {
      const lane = lanes.current[drag.index];
      if (!lane) return null;
      const rect = lane.getBoundingClientRect();
      const tolerance = Math.max(24, Math.min(48, rect.width * 0.16));
      // Accept either the strip's leading edge or the hand near the start line.
      // Both are viewport coordinates, including any zoom / ancestor scaling.
      const nearStart =
        Math.abs(drag.left - rect.left) <= tolerance ||
        Math.abs(drag.x - rect.left) <= tolerance;
      const nearRow = drag.y >= rect.top - 24 && drag.y <= rect.bottom + 24;
      return nearStart && nearRow ? "align" : null;
    },
    onDrop: (drag) => alignOne(drag.index),
  });
  const drag = movement.drag;

  return (
    <Board
      experiment={experiment}
      disabled={disabled}
      title="같은 시작점에서 비교하기"
      hint="막대를 왼쪽 시작선으로 끌어요. 막대를 누르면 하나씩, 아래 버튼은 둘 다 맞춰요."
      resetDisabled={
        aligned.length === 0 &&
        (experiment.parts.length === 2
          ? selected.length === 2
          : selected.length === 0)
      }
      onReset={() => {
        movement.cancel();
        setComparison({ selected: initialSelection(), aligned: [] });
      }}
      equation={
        ready
          ? `${larger} − ${smaller} = ${complete ? larger - smaller : "?"}`
          : "비교할 두 수를 골라요"
      }
      feedback={
        complete
          ? `겹치지 않는 길이가 두 수의 차이 ${larger - smaller}예요.`
          : ready
            ? aligned.length > 0
              ? "하나를 맞췄어요. 다른 막대도 시작선으로 끌어요."
              : "시작점이 달라요. 같은 선에 맞춰 보세요."
            : `${selected.length}/2개 선택 · 비교할 막대를 고르거나 시작선으로 끌어요.`
      }
    >
      <div className={styles.compareRows} data-drag-active={!!drag}>
        <div
          className={styles.startLine}
          aria-label="막대 시작선"
          data-drop-active={!!drag}
          data-drop-ready={drag?.target === "align"}
        >
          <span aria-hidden="true">
            {drag?.target === "align" ? "놓아요" : "시작"}
          </span>
        </div>
        {experiment.parts.map((part, index) => {
          const chosen = selected.includes(index);
          const isAligned = aligned.includes(index);
          const offset = isAligned ? 0 : [3, 13, 8][index % 3];
          return (
            <div className={styles.compareRow} key={index}>
              <button
                type="button"
                className={styles.choice}
                aria-pressed={chosen}
                aria-label={`${part.label} ${part.value} 비교 선택`}
                disabled={disabled}
                onClick={() => select(index)}
              >
                <span aria-hidden="true">{chosen ? "✓" : "+"}</span>
                <span>{part.label}</span>
              </button>
              <div
                className={styles.barLane}
                ref={(element) => {
                  lanes.current[index] = element;
                }}
              >
                {drag?.index === index && drag.target === "align" ? (
                  <div
                    className={`${styles.compareBar} ${styles.snapPreview} ${colors[index % colors.length]}`}
                    style={{ width: percent(part.value, scale) }}
                    aria-hidden="true"
                  >
                    <b>{part.value}</b>
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`${styles.compareBar} ${colors[index % colors.length]} ${chosen ? styles.chosen : ""}`}
                  {...movement.bind(index, "compare")}
                  style={{
                    width: percent(part.value, scale),
                    marginLeft: `${offset}%`,
                    ...movement.style(index, "compare"),
                  }}
                  disabled={disabled}
                  data-aligned={isAligned}
                  aria-label={`${part.label} 막대 ${part.value}`}
                  onClick={() => alignOne(index)}
                >
                  <b>{part.value}</b>
                  {complete && chosen && part.value > smaller ? (
                    <span
                      className={styles.difference}
                      aria-hidden="true"
                      style={{ left: percent(smaller, part.value) }}
                    />
                  ) : null}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.align}
        disabled={disabled || !ready || complete}
        onClick={() => {
          if (!disabled && ready) {
            movement.cancel();
            setComparison((previous) => ({
              ...previous,
              aligned: [...previous.selected],
            }));
          }
        }}
      >
        {complete ? "시작선을 맞췄어요" : "시작선 맞추기 ←"}
      </button>
    </Board>
  );
}

function PartExplorer({
  experiment,
  disabled = false,
  value,
  onValueChange,
}: Props) {
  const [localValue, setLocalValue] = useState("");
  const rangeId = useId();
  const raw = value ?? localValue;
  const numeric = /^\d+$/.test(raw.trim()) ? Number(raw) : null;
  const guess =
    numeric !== null && Number.isSafeInteger(numeric) ? numeric : null;
  const known = experiment.parts.reduce((sum, part) => sum + part.value, 0);
  const total = experiment.total ?? 0;
  // Bounds and scale use only the givens, never the missing part's answer.
  const maximum = Math.max(total, known, 10);
  const scale = Math.max(1, known + maximum);
  const combined = known + (guess ?? 0);
  const relation = combined === total ? "=" : combined < total ? "<" : ">";

  function change(next: string) {
    if (disabled) return;
    if (value === undefined) setLocalValue(next);
    onValueChange?.(next);
  }

  function adjust(amount: number) {
    if (disabled) return;
    change(String(Math.max(0, Math.min(maximum, (guess ?? 0) + amount))));
  }

  return (
    <Board
      experiment={experiment}
      disabled={disabled}
      title="빈 부분을 직접 채우기"
      hint="손잡이를 끌거나 방향키·아래 버튼으로 수를 바꿔 전체와 맞춰요."
      resetDisabled={raw === ""}
      onReset={() => change("")}
      equation={
        guess === null
          ? `${known} + ? → 전체 ${total}`
          : combined === total
            ? `${known} + ${guess} = ${total}`
            : `${known} + ${guess} = ${combined} ${relation} ${total}`
      }
      feedback={
        guess === null
          ? "모르는 부분을 직접 만들어 보세요."
          : combined === total
            ? "내가 만든 두 부분이 전체와 같아요."
            : combined < total
              ? "아직 전체보다 짧아요. 빈 곳을 더 채워 보세요."
              : "전체 선을 넘었어요. 길이를 줄여 보세요."
      }
    >
      <div className={styles.partRows}>
        <div className={styles.partRow}>
          <span className={styles.partLabel}>전체</span>
          <div className={styles.partLane}>
            <div
              className={`${styles.wholeBar} ${styles.blue}`}
              style={{ width: percent(total, scale) }}
            >
              {total}
            </div>
          </div>
        </div>
        <div className={styles.partRow}>
          <span className={styles.partLabel}>두 부분</span>
          <div className={styles.partLane}>
            <div
              className={styles.totalGuide}
              style={{ width: percent(total, scale) }}
              aria-hidden="true"
            />
            <div
              className={`${styles.knownBar} ${styles.mint}`}
              style={{ width: percent(known, scale) }}
              aria-label={`${experiment.parts.map((part) => part.label).join(" + ")} ${known}`}
            >
              {known}
            </div>
            <div
              className={`${styles.guessBar} ${styles.orange}`}
              style={{ width: percent(Math.min(guess ?? 0, maximum), scale) }}
              aria-label={`내가 만든 부분 ${guess ?? "아직 정하지 않음"}`}
            >
              <span>{guess ?? "?"}</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.rangeRow}>
        <label htmlFor={rangeId}>
          내가 만든 부분 <b>{guess ?? "?"}</b>
        </label>
        <input
          id={rangeId}
          type="range"
          min={0}
          max={maximum}
          step={1}
          value={Math.min(guess ?? 0, maximum)}
          aria-label="모르는 부분의 크기"
          aria-valuetext={guess === null ? "아직 정하지 않음" : String(guess)}
          disabled={disabled}
          onChange={(event) => change(event.target.value)}
        />
      </div>
      <div className={styles.adjustments}>
        {[-10, -1, 1, 10].map((amount) => (
          <button
            type="button"
            key={amount}
            disabled={
              disabled ||
              (amount < 0 ? (guess ?? 0) === 0 : (guess ?? 0) >= maximum)
            }
            aria-label={`모르는 부분 ${Math.abs(amount)} ${amount < 0 ? "줄이기" : "늘리기"}`}
            onClick={() => adjust(amount)}
          >
            {amount < 0 ? "−" : "+"}
            {Math.abs(amount)}
          </button>
        ))}
      </div>
    </Board>
  );
}

export default function RelationExplorer(props: Props) {
  // A new set of givens starts a fresh exploration; answer-field edits do not.
  const key = JSON.stringify(props.experiment);
  if (props.experiment.mode === "join")
    return <JoinExplorer key={key} {...props} />;
  if (props.experiment.mode === "compare")
    return <CompareExplorer key={key} {...props} />;
  return <PartExplorer key={key} {...props} />;
}
