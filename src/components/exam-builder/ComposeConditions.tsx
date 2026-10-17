"use client";

import { useState, type RefObject } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import {
  DIFFICULTY_STEPS,
  QUESTION_FORMATS,
  matchingStep,
  stepsSupported,
  planComposition,
  stepLadder,
  summarizeConditions,
  type AppliedConditions,
  type ComposeDraft,
  type Ladder,
  type Plan,
} from "./conditionsPlan";
import c from "./ComposeConditions.module.css";

/**
 * «구성 조건»(W4 · Hi-fi 2 — 원장님 2026-10-16). 구성표 위에 낱칸 넷(누르는 것이 아님 — 손가락 커서 없음)과
 * [구성 조건], 창은 공용 고르기 창(`PickerDialog`, D-159)을 넓혀 왼쪽 조건 · 오른쪽 «적용하면 이렇게 나뉩니다».
 * 난이도는 시험지 전체에 한 번(이 안의 범위). 계산은 `conditionsPlan.ts` 한 곳이다.
 */

export interface ConditionRow {
  scopeId: string;
  label: string;
  count: number;
  fixed: boolean;
  /** 최근 출제를 뺐을 때 · 넣었을 때의 출제 가능 수 — 아직 모르면 없다. */
  usable: { recent?: number; all?: number };
}

export function ConditionsSummary({
  applied,
  requested,
  fixedRows,
  recentDays,
  ladder,
  warning,
  disabled,
  onOpen,
  opener,
}: {
  applied: AppliedConditions;
  requested: number;
  fixedRows: number;
  recentDays: number;
  ladder: readonly string[];
  /** 표를 손으로 고친 뒤 난이도와 합이 어긋나면 — 구성을 막는 까닭. */
  warning: string | null;
  disabled: boolean;
  onOpen: () => void;
  opener: RefObject<HTMLButtonElement | null>;
}) {
  const s = summarizeConditions(applied, {
    requested,
    fixedRows,
    recentDays,
    ladder,
  });
  return (
    <div className={`${c.root} ${c.sumLine}`} data-compose-summary>
      <div className={c.sumChips} aria-label="구성 조건">
        <span className={c.chip}>{s.total}</span>
        <span className={c.chip}>{s.ladder}</span>
        <span className={c.chip}>{s.formats}</span>
        <span className={c.chip}>{s.recent}</span>
        <span className={c.chip}>
          <em>고정</em> {s.fixed}
        </span>
      </div>
      <button type="button" ref={opener} disabled={disabled} onClick={onOpen}>
        구성 조건
      </button>
      {warning && (
        <p className={c.sumWarn} role="status">
          {warning}
        </p>
      )}
    </div>
  );
}

function TierStepper({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
}) {
  return (
    <span className={c.stepper}>
      <button
        type="button"
        aria-label={`${label} 하나 빼기`}
        onClick={() => onChange(value === null ? 0 : Math.max(0, value - 1))}
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        placeholder="–"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          onChange(v === "" ? null : Math.min(100, Number(v)));
        }}
      />
      <button
        type="button"
        aria-label={`${label} 하나 더하기`}
        onClick={() => onChange(value === null ? 1 : Math.min(100, value + 1))}
      >
        +
      </button>
    </span>
  );
}

function Issues({ plan }: { plan: Plan }) {
  if (!plan.block.length && !plan.note.length)
    return (
      <p className={c.notice} role="status">
        총 문항 · 난이도 · 범위 행이 서로 맞습니다. 적용하면 위 수대로 문항을
        고릅니다.
      </p>
    );
  return (
    <div className={plan.block.length ? c.error : c.warn} role="status">
      <strong>{plan.block.length ? "적용할 수 없습니다" : "확인할 것"}</strong>
      <ul>
        {[...plan.block, ...plan.note].map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function ComposeConditionsDialog({
  applied,
  rows,
  ladder,
  recentDays,
  today,
  unit,
  maxQuestions,
  returnFocus,
  onApply,
  onCancel,
}: {
  applied: AppliedConditions;
  rows: readonly ConditionRow[];
  ladder: readonly string[];
  recentDays: number;
  /** «오늘»을 사람이 읽는 꼴(10/16) — 최근 출제 규칙의 문장에 쓴다. */
  today: string;
  /** 출제 가능 수의 단위(갈래 · 문항). */
  unit: string;
  maxQuestions: number;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onApply: (
    next: AppliedConditions,
    rows: { scopeId: string; count: number; fixed: boolean }[],
  ) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ComposeDraft>(() => ({
    ...applied,
    ladder: { ...applied.ladder },
    formats: { ...applied.formats },
    fixed: Object.fromEntries(rows.map((row) => [row.scopeId, row.fixed])),
  }));
  const usableOf = (row: ConditionRow, recent: boolean) =>
    recent ? row.usable.recent : row.usable.all;
  const loading = rows.some((row) => usableOf(row, draft.recent) === undefined);
  const planRows = rows.map((row) => ({
    scopeId: row.scopeId,
    label: row.label,
    count: row.count,
    usable: usableOf(row, draft.recent),
  }));
  const options = { ladder, max: maxQuestions, unit };
  // «적용하면 구성할 수»는 난이도와 상관없다 — 단계의 칸을 그 수에 맞춰 채운다.
  const planned = planComposition(draft, planRows, options).total;
  // 고른 단계는 따로 든다 — 문항 수가 적으면 두 단계가 같은 칸으로 반올림돼 칸만 보고는 어느 단계인지 모른다.
  // 단계를 고른 동안은 칸이 «그 단계 × 지금 구성할 수»다(총 문항 · 행이 바뀌면 따라 바뀐다).
  const [step, setStep] = useState<number | null>(() =>
    planned && stepsSupported(ladder)
      ? matchingStep(applied.ladder, planned, ladder)
      : null,
  );
  const ladderNow =
    step !== null && planned ? stepLadder(step, planned, ladder) : draft.ladder;
  const shown = { ...draft, ladder: ladderNow };
  const plan = planComposition(shown, planRows, options);
  const known = rows.every(
    (row) => row.usable.recent !== undefined && row.usable.all !== undefined,
  );
  const hits = known
    ? rows.reduce(
        (sum, row) => sum + Math.max(0, row.usable.all! - row.usable.recent!),
        0,
      )
    : null;
  const blocked = plan.block.length > 0 || loading;
  const set = (patch: Partial<ComposeDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const setTier = (tier: string, value: number | null) => {
    // 단계에서 손으로 고치면 «직접» — 보이던 칸(단계의 칸)에서 그 칸만 바꾼다.
    setStep(null);
    setDraft((current) => ({
      ...current,
      ladder: { ...ladderNow, [tier]: value } as Ladder,
    }));
  };
  const setFormat = (format: string, value: number | null) =>
    setDraft((current) => ({
      ...current,
      formats: { ...current.formats, [format]: value } as Ladder,
    }));
  return (
    <PickerDialog
      title="구성 조건"
      cancelLabel="취소"
      doneLabel="적용"
      doneDisabled={blocked}
      size="fit"
      returnFocus={returnFocus}
      onCancel={onCancel}
      onClose={() => {
        if (blocked) return;
        onApply(
          {
            total: draft.total,
            ladder: ladderNow,
            recent: draft.recent,
            formats: draft.formats,
            mcFirst: draft.mcFirst,
          },
          plan.rows.map((row) => ({
            scopeId: row.scopeId,
            count: row.next,
            fixed: !!draft.fixed[row.scopeId],
          })),
        );
      }}
    >
      <div className={`${c.root} ${c.two}`}>
        <div>
          <section className={c.section}>
            <h3>총 문항</h3>
            <div className={c.fieldRow}>
              <input
                className={c.totalInput}
                inputMode="numeric"
                aria-label="총 문항"
                placeholder="지정 없음"
                value={draft.total ?? ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  set({ total: v === "" ? null : Math.min(999, Number(v)) });
                }}
              />
              <span className={c.rule}>
                {draft.total === null
                  ? "지정 없음 — 범위 행의 합으로 갑니다."
                  : "고정이 아닌 행에 고르게 나눕니다."}
              </span>
              {draft.total !== null && (
                <button
                  type="button"
                  className={`${c.text} ${c.small}`}
                  onClick={() => set({ total: null })}
                >
                  지정 없음으로
                </button>
              )}
            </div>
          </section>
          <section className={c.section}>
            <h3>난이도</h3>
            {stepsSupported(ladder) && (
              <div className={c.steps} role="group" aria-label="난이도 단계">
                {DIFFICULTY_STEPS.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={step === index}
                    disabled={!planned}
                    onClick={() => {
                      setStep(index);
                      set({ ladder: stepLadder(index, planned, ladder) });
                    }}
                  >
                    {index + 1}단계
                  </button>
                ))}
                {step === null && <span className={c.stepDirect}>직접</span>}
              </div>
            )}
            <div
              className={c.ladderGrid}
              role="group"
              aria-label="난이도별 문항 수"
            >
              {ladder.map((tier) => {
                const value = ladderNow[tier] ?? null;
                return (
                  <div
                    key={tier}
                    className={
                      value === null
                        ? c.ladderCellNone
                        : value > 0
                          ? c.ladderCellOn
                          : c.ladderCell
                    }
                  >
                    <span>{tier}</span>
                    <TierStepper
                      label={`${tier} 문항 수`}
                      value={value}
                      onChange={(next) => setTier(tier, next)}
                    />
                    {value === null ? (
                      <small className={c.meta}>지정 없음</small>
                    ) : (
                      <button
                        type="button"
                        className={c.noneToggle}
                        aria-label={`${tier} 지정 없음으로`}
                        onClick={() => setTier(tier, null)}
                      >
                        비우기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <span className={c.rule}>
              단계를 고르면 칸이 채워집니다(1단계 쉬움 ~ 6단계 어려움). 칸을
              손으로 고치면 «직접»입니다. «–»는 지정 없음, 0 은 그 난이도를 한
              문항도 내지 않는다는 뜻입니다.
            </span>
          </section>
          <section className={c.section}>
            <h3>형식</h3>
            <div
              className={c.formatGrid}
              role="group"
              aria-label="형식별 문항 수"
            >
              {QUESTION_FORMATS.map((format) => {
                const value = draft.formats[format] ?? null;
                return (
                  <div
                    key={format}
                    className={
                      value === null
                        ? c.ladderCellNone
                        : value > 0
                          ? c.ladderCellOn
                          : c.ladderCell
                    }
                  >
                    <span>{format}</span>
                    <TierStepper
                      label={`${format} 문항 수`}
                      value={value}
                      onChange={(next) => setFormat(format, next)}
                    />
                    {value === null ? (
                      <small className={c.meta}>지정 없음</small>
                    ) : (
                      <button
                        type="button"
                        className={c.noneToggle}
                        aria-label={`${format} 지정 없음으로`}
                        onClick={() => setFormat(format, null)}
                      >
                        비우기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <span className={c.rule}>
              «–»는 지정 없음(남는 자리를 정하지 않은 형식으로), 0 은 그 형식을
              내지 않는다는 뜻입니다. 모자라면 다른 형식으로 채우지 않습니다.
            </span>
          </section>
          <section className={c.section}>
            <h3>차례</h3>
            <label className={c.checkRow}>
              <input
                type="checkbox"
                checked={draft.mcFirst}
                onChange={(e) => set({ mcFirst: e.target.checked })}
              />
              객관식을 앞에 — 그 안에서는 쉬운 것부터
            </label>
          </section>
          <section className={c.section}>
            <h3>최근 출제</h3>
            <label className={c.checkRow}>
              <input
                type="checkbox"
                checked={draft.recent}
                onChange={(e) => set({ recent: e.target.checked })}
              />
              최근 출제 문항 빼기
              <span className={c.badgeMuted}>
                {hits === null ? "확인 중" : `지금 해당 ${hits}${unit}`}
              </span>
            </label>
            <span className={c.rule}>
              오늘({today}) 기준 최근 {recentDays}일 안에 시험 날짜가 있는 내
              시험지의 문항은 고르지 않습니다 — 일일테스트와 같은 규칙입니다.
            </span>
          </section>
        </div>
        <div className={c.right}>
          <p className={c.sectionLabel}>적용하면 이렇게 나뉩니다</p>
          <table className={c.previewTable}>
            <thead>
              <tr>
                <th>범위</th>
                <th className={c.n}>출제 가능</th>
                <th className={c.n}>지금</th>
                <th className={c.n}>적용 후</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((row) => (
                <tr key={row.scopeId}>
                  <td>
                    {row.label}
                    {draft.fixed[row.scopeId] && (
                      <small>고정 — 다시 나누지 않음</small>
                    )}
                  </td>
                  <td className={c.n}>{row.usable ?? "확인 중"}</td>
                  <td className={c.n}>{row.count}</td>
                  <td className={c.n}>
                    <span
                      className={
                        row.usable !== undefined && row.want > row.usable
                          ? c.short
                          : row.next !== row.count
                            ? c.changed
                            : undefined
                      }
                    >
                      {row.next}
                      {row.usable !== undefined && row.want > row.usable
                        ? ` / ${row.want}`
                        : ""}
                    </span>
                  </td>
                  <td className={c.n}>
                    <button
                      type="button"
                      className={`${c.text} ${c.small}`}
                      aria-label={`${row.label} ${draft.fixed[row.scopeId] ? "고정 풀기" : "고정"}`}
                      onClick={() =>
                        set({
                          fixed: {
                            ...draft.fixed,
                            [row.scopeId]: !draft.fixed[row.scopeId],
                          },
                        })
                      }
                    >
                      {draft.fixed[row.scopeId] ? "고정 풀기" : "고정"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>합계</td>
                <td />
                <td className={c.n}>
                  {rows.reduce((sum, row) => sum + row.count, 0)}
                </td>
                <td className={c.n}>
                  <b>{plan.total}</b>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
          {loading ? (
            <p className={c.notice} role="status">
              최근 출제를 {draft.recent ? "뺀" : "넣은"} 출제 가능 수를 확인하는
              중입니다.
            </p>
          ) : (
            <Issues plan={plan} />
          )}
        </div>
      </div>
    </PickerDialog>
  );
}
