"use client";

import { useId, useState } from "react";
import {
  DIFFICULTY_LADDER,
  defaultRatioFor,
  fitDifficultyRatio,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import styles from "./BankView.module.css";

export interface BankRandomResult {
  requested: DifficultyRatio;
  actual: DifficultyRatio;
  available: DifficultyRatio;
}

export default function BankRandomPanel({
  busy,
  disabled,
  result,
  error,
  onAdd,
}: {
  busy: boolean;
  disabled: boolean;
  result: BankRandomResult | null;
  error: string | null;
  onAdd: (counts: DifficultyRatio) => void;
}) {
  const id = useId();
  const [counts, setCounts] = useState(() => defaultRatioFor(20));
  const total = DIFFICULTY_LADDER.reduce((sum, tier) => sum + counts[tier], 0);
  const valid = total >= 1 && total <= 100;
  const requested =
    result &&
    DIFFICULTY_LADDER.reduce((sum, tier) => sum + result.requested[tier], 0);
  const actual =
    result &&
    DIFFICULTY_LADDER.reduce((sum, tier) => sum + result.actual[tier], 0);
  const shortages =
    result &&
    DIFFICULTY_LADDER.filter(
      (tier) => result.actual[tier] < result.requested[tier],
    );

  return (
    <section
      className={styles.randomPanel}
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
    >
      <div className={styles.randomHeading}>
        <div>
          <h3 id={`${id}-title`}>난이도별 랜덤 추가</h3>
          <p id={`${id}-help`}>
            현재 검색 범위 전체에서 출제 가능한 문제를 고릅니다. 이미 담은
            문제는 제외합니다.
          </p>
        </div>
        <label className={styles.totalCount}>
          추가할 문항 수
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={total}
            disabled={busy}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value))
                setCounts(
                  fitDifficultyRatio(
                    counts,
                    Math.min(100, Math.max(0, Math.floor(value))),
                  ),
                );
            }}
          />
          <span>문항</span>
        </label>
      </div>
      <fieldset
        className={styles.difficultyCounts}
        disabled={busy}
        aria-describedby={`${id}-help`}
      >
        <legend className="sr-only">난이도별 추가할 문항 수</legend>
        {DIFFICULTY_LADDER.map((tier) => (
          <label key={tier}>
            <span>{tier}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              aria-label={`${tier} 문항 수`}
              value={counts[tier]}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value))
                  setCounts((current) => ({
                    ...current,
                    [tier]: Math.min(100, Math.max(0, Math.floor(value))),
                  }));
              }}
            />
          </label>
        ))}
      </fieldset>
      <div className={styles.randomActions}>
        <button
          type="button"
          className={styles.textButton}
          disabled={busy}
          onClick={() => setCounts(defaultRatioFor(valid ? total : 20))}
        >
          기본 배분
        </button>
        <p>
          {valid
            ? `합계 ${total}문항 · 부족한 난이도는 다른 난이도로 채우지 않습니다.`
            : "합계를 1~100문항으로 맞춰 주세요."}
        </p>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={busy || disabled || !valid}
          onClick={() => onAdd({ ...counts })}
        >
          {busy ? "문제를 고르는 중…" : `${total}문항 랜덤 추가`}
        </button>
      </div>
      {error ? (
        <p className={styles.randomError} role="alert">
          {error} 기존에 담은 문제는 유지됩니다.
        </p>
      ) : null}
      {result ? (
        <div className={styles.randomFeedback} role="status">
          <strong>
            요청 {requested}문항 중 {actual}문항을 추가했어요.
          </strong>
          {shortages?.length ? (
            <>
              <p>
                부족한 문항은 추가하지 않았습니다. 같은 문항류는 한 시험지에
                1문항만 담습니다. 범위를 넓히거나 문항 수를 조정해 주세요.
              </p>
              <ul>
                {shortages.map((tier) => (
                  <li key={tier}>
                    {tier}: 요청 {result.requested[tier]} · 추가{" "}
                    {result.actual[tier]} · 부족{" "}
                    {result.requested[tier] - result.actual[tier]}문항 (선택 전
                    가능 {result.available[tier]}갈래)
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
