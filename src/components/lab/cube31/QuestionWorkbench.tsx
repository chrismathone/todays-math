"use client";

import { useState } from "react";
import type {
  AlignmentExperiment,
  ComparisonExperiment,
  CubeExperiment,
  DigitExperiment,
} from "@/lib/lab/cube31/explorationTypes";
import BundleExplorer from "./BundleExplorer";
import NumberJourney from "./NumberJourney";
import RelationExplorer from "./RelationExplorer";
import styles from "./QuestionWorkbench.module.css";

type Props = {
  experiment: CubeExperiment;
  fields: readonly { id: string; label: string }[];
  values: Record<string, string>;
  choice: string | null;
  disabled: boolean;
  onChoice: (choice: string | null) => void;
  onValueChange: (id: string, value: string) => void;
};

const places = ["백", "십", "일"];

function Alignment({
  experiment,
  choice,
  onChoice,
  disabled,
}: Pick<Props, "choice" | "onChoice" | "disabled"> & {
  experiment: AlignmentExperiment;
}) {
  const digit = Number(String(experiment.moving)[0]);
  const position = choice === null ? -1 : Number(choice);
  const top = String(experiment.top).padStart(3, "0").split("");
  return (
    <section className={styles.board} aria-label="자릿값 배치 실험">
      <p className={styles.prompt}>{experiment.prompt}</p>
      <div className={styles.alignment}>
        <div className={styles.digitSource}>
          <span>{experiment.moving}의 숫자 조각</span>
          <button
            type="button"
            draggable={!disabled}
            disabled={disabled}
            className={styles.numberPiece}
            aria-label={`${digit} 조각 다시 들기`}
            onClick={() => {
              if (!disabled) onChoice(null);
            }}
            onDragStart={(event) => {
              if (disabled) return event.preventDefault();
              event.dataTransfer.setData("text/plain", "cube-alignment");
            }}
          >
            {digit}
          </button>
          <small>끌어 놓거나 아래 자리를 눌러요</small>
        </div>
        <div className={styles.placeGrid}>
          {places.map((name, index) => (
            <div key={name} className={styles.placeColumn}>
              <span>{name}의 자리</span>
              <strong>{top[index]}</strong>
              <button
                type="button"
                disabled={disabled}
                aria-label={`${name}의 자리에 ${digit} 놓기`}
                data-filled={position === index}
                aria-pressed={position === index}
                onClick={() => {
                  if (!disabled) onChoice(String(index));
                }}
                onDragOver={(event) => {
                  if (!disabled) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (
                    !disabled &&
                    event.dataTransfer.getData("text/plain") ===
                      "cube-alignment"
                  )
                    onChoice(String(index));
                }}
              >
                {position === index ? (
                  <b key={position}>{digit}</b>
                ) : (
                  <span aria-hidden="true">＋</span>
                )}
              </button>
              <small>{[100, 10, 1][index]}씩 세어요</small>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.liveEquation} role="status" aria-live="polite">
        {position < 0 ? (
          "같은 숫자도 놓는 자리에 따라 값이 달라져요."
        ) : (
          <>
            {places[position]}의 자리에 놓은 <b>{digit}</b> →{" "}
            <strong key={position}>{digit * [100, 10, 1][position]}</strong>
          </>
        )}
      </div>
    </section>
  );
}

function DigitBoard({
  experiment,
  fields,
  values,
  onValueChange,
  disabled,
}: Omit<Props, "experiment" | "choice" | "onChoice"> & {
  experiment: DigitExperiment;
}) {
  const slots = experiment.rows
    .flat()
    .filter((entry): entry is string => typeof entry === "string");
  const [selected, setSelected] = useState(slots[0]);
  const label = (id: string) =>
    fields.find((field) => field.id === id)?.label ?? id;
  const digitFor = (id: string) => {
    const raw = (values[id] ?? "").normalize("NFKC").trim();
    return /^\d+$/.test(raw) && Number(raw) <= 9 ? String(Number(raw)) : "";
  };
  const readRow = (row: readonly (string | number)[]) => {
    const digits = row.map((entry) =>
      typeof entry === "number" ? String(entry) : digitFor(entry),
    );
    return digits.every((digit) => /^\d$/.test(digit))
      ? Number(digits.join(""))
      : null;
  };
  const [a, b, result] = experiment.rows.map(readRow);
  const actual =
    a !== null && b !== null
      ? experiment.operation === "add"
        ? a + b
        : a - b
      : null;
  const ready = actual !== null && result !== null;
  function put(digit: string) {
    if (!disabled) onValueChange(selected, digit);
  }
  return (
    <section className={styles.board} aria-label="숨은 숫자 실험">
      <p className={styles.prompt}>{experiment.prompt}</p>
      <div className={styles.digitLab}>
        <div className={styles.columnMath}>
          <div className={styles.placeLabels}>
            <span />
            {places.map((place) => (
              <span key={place}>{place}</span>
            ))}
          </div>
          {experiment.rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={styles.mathRow}
              data-result={rowIndex === 2}
            >
              <span>
                {rowIndex === 1
                  ? experiment.operation === "add"
                    ? "+"
                    : "−"
                  : rowIndex === 2
                    ? "="
                    : ""}
              </span>
              {row.map((entry, column) =>
                typeof entry === "number" ? (
                  <strong key={column}>{entry}</strong>
                ) : (
                  <button
                    type="button"
                    key={column}
                    disabled={disabled}
                    aria-label={`${label(entry)}, ${digitFor(entry) || "빈칸"}`}
                    className={styles.digitSlot}
                    aria-pressed={selected === entry}
                    onClick={() => {
                      if (!disabled) setSelected(entry);
                    }}
                    onDragOver={(event) => {
                      if (!disabled) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const digit =
                        event.dataTransfer.getData("text/cube-digit");
                      if (!disabled && /^\d$/.test(digit)) {
                        setSelected(entry);
                        onValueChange(entry, digit);
                      }
                    }}
                  >
                    {digitFor(entry) || "?"}
                  </button>
                ),
              )}
            </div>
          ))}
        </div>
        <div className={styles.paletteArea}>
          <span className={styles.slotLabel}>{label(selected)}에 넣기</span>
          <div className={styles.digitPalette}>
            {Array.from({ length: 10 }, (_, digit) => (
              <button
                type="button"
                key={digit}
                disabled={disabled}
                draggable={!disabled}
                aria-label={`${digit} 숫자 넣기`}
                onClick={() => put(String(digit))}
                onDragStart={(event) => {
                  if (disabled) return event.preventDefault();
                  event.dataTransfer.setData("text/cube-digit", String(digit));
                }}
              >
                {digit}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.textButton}
            disabled={disabled || slots.every((id) => !values[id])}
            onClick={() => {
              if (!disabled) {
                slots.forEach((id) => onValueChange(id, ""));
                setSelected(slots[0]);
              }
            }}
          >
            조각 비우기 ↺
          </button>
          <small>
            숫자를 누르거나 끌어요. 답 칸에 직접 써도 함께 바뀌어요.
          </small>
        </div>
      </div>
      <div
        className={styles.liveEquation}
        role="status"
        aria-live="polite"
        data-balanced={ready && actual === result}
      >
        {ready ? (
          <>
            <span>
              왼쪽 계산 <b>{actual}</b>
            </span>
            <span aria-hidden="true">{actual === result ? "=" : "≠"}</span>
            <span>
              놓은 결과 <b>{result}</b>
            </span>
          </>
        ) : (
          "빈자리를 채우면 두 쪽의 값이 연결돼요."
        )}
      </div>
    </section>
  );
}

function Comparison({
  experiment,
  disabled,
}: {
  experiment: ComparisonExperiment;
  disabled: boolean;
}) {
  const [active, setActive] = useState(0);
  return (
    <section className={styles.comparison} aria-label="계산 경로 비교 실험">
      <p className={styles.prompt}>{experiment.prompt}</p>
      <div className={styles.routeTabs} role="group" aria-label="실험할 식">
        {experiment.routes.map((route, index) => (
          <button
            type="button"
            key={route.value}
            disabled={disabled}
            aria-pressed={active === index}
            onClick={() => {
              if (!disabled) setActive(index);
            }}
          >
            {route.label}
          </button>
        ))}
      </div>
      {experiment.routes.map((route, index) => (
        <div key={route.value} hidden={active !== index}>
          <NumberJourney
            disabled={disabled || active !== index}
            experiment={{
              kind: "journey",
              prompt:
                "숫자 조각을 움직여 도착점을 확인해요. 다른 길로 바꿔도 이동 기록은 남아요.",
              start: route.start,
              steps: [{ amount: route.amount, operation: route.operation }],
            }}
          />
        </div>
      ))}
    </section>
  );
}

export default function QuestionWorkbench(props: Props) {
  const { experiment, disabled, values, onValueChange } = props;
  switch (experiment.kind) {
    case "bundles":
      return <BundleExplorer experiment={experiment} disabled={disabled} />;
    case "journey":
      return <NumberJourney experiment={experiment} disabled={disabled} />;
    case "relation":
      return (
        <RelationExplorer
          experiment={experiment}
          disabled={disabled}
          value={
            experiment.answerField ? values[experiment.answerField] : undefined
          }
          onValueChange={(value) => {
            if (!disabled && experiment.answerField)
              onValueChange(experiment.answerField, value);
          }}
        />
      );
    case "alignment":
      return <Alignment {...props} experiment={experiment} />;
    case "digits":
      return <DigitBoard {...props} experiment={experiment} />;
    case "comparison":
      return <Comparison experiment={experiment} disabled={disabled} />;
  }
}
