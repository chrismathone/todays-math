"use client";

import { useId, useState } from "react";

import { UnitTreePicker } from "@/components/progress/UnitTreePicker";
import {
  PLAN_UNITS_CHOICES,
  toggleWeekday,
  type PlanDraft,
} from "@/lib/class/planDraft";
import { WEEKDAY_LABELS, WEEKDAYS_MONDAY_FIRST } from "@/lib/daily/planGauge";
import { findUnit, type UnitNode } from "@/lib/units/groupUnits";

import s from "./ProgressPlan.module.css";

/**
 * 수업 계획 칸 — 수업 요일 · 시작 차시 · 한 수업 N차시 · 시작일 · 자동 출제 (시안 Hi-fi 2 · 05 §8.10 · D-131).
 * 반 관리의 «수업 계획» 카드와 반 만들기의 접힌 칸이 **같이** 쓴다.
 *
 * - 요일 토글은 **월요일부터** 그린다 — 값은 저장 번호(0=일 … 6=토, 22 §4 리드 결정 ⑶).
 * - 시작 차시는 아직 안 골랐으면 비어 있다(«고르기») — 조용히 첫 차시를 넣지 않는다.
 *   누르면 단원 고르기(`UnitTreePicker`)가 칸 아래에 열리고, 고르면 닫힌다(시안에 없는 동선 — 보고서 ②).
 * - 한 수업 차시 수는 1~10 에서 고른다(계약 상한 = 오타 울타리). 기본 1.
 */
export function ProgressPlanFields({
  draft,
  onChange,
  units,
  disabled = false,
}: {
  draft: PlanDraft;
  onChange: (next: PlanDraft) => void;
  units: UnitNode[];
  disabled?: boolean;
}) {
  const id = useId();
  const [picking, setPicking] = useState(false);
  const start = findUnit(units, draft.startUnitId);
  const startText = start
    ? `${start.chapter} · ${start.section}`
    : draft.startUnitId
      ? "저장된 차시를 확인할 수 없습니다"
      : null;

  return (
    <div className={s.fields}>
      <div className={s.field}>
        <span id={`${id}-days`} className={s.label}>
          수업 요일
        </span>
        <div role="group" aria-labelledby={`${id}-days`} className={s.days}>
          {WEEKDAYS_MONDAY_FIRST.map((weekday) => (
            <button
              key={weekday}
              type="button"
              className={s.day}
              aria-pressed={draft.weekdays.includes(weekday)}
              disabled={disabled}
              onClick={() => onChange(toggleWeekday(draft, weekday))}
            >
              {WEEKDAY_LABELS[weekday]}
            </button>
          ))}
        </div>
      </div>

      <div className={s.field}>
        <span className={s.label} aria-hidden="true">
          시작 차시
        </span>
        <button
          type="button"
          className={s.pick}
          aria-label={`시작 차시 ${startText ?? "고르기"}`}
          aria-expanded={picking}
          aria-controls={`${id}-picker`}
          disabled={disabled}
          onClick={() => setPicking((open) => !open)}
        >
          {startText ? (
            <>
              <span>{startText}</span>
              {start ? <small>{start.grade}</small> : null}
            </>
          ) : (
            <span className={s.placeholder}>고르기</span>
          )}
        </button>
        {picking ? (
          <div id={`${id}-picker`} className={s.picker}>
            <UnitTreePicker
              units={units}
              currentUnitId={draft.startUnitId}
              label="시작 차시 선택"
              columnMaxHeightPx={220}
              onSelect={(unitId) => {
                onChange({ ...draft, startUnitId: unitId });
                setPicking(false);
              }}
            />
          </div>
        ) : null}
      </div>

      <div className={s.inline}>
        <div className={s.field}>
          <label htmlFor={`${id}-units`} className={s.label}>
            한 수업
          </label>
          <select
            id={`${id}-units`}
            className={s.control}
            value={draft.unitsPerLesson}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...draft, unitsPerLesson: Number(event.target.value) })
            }
          >
            {PLAN_UNITS_CHOICES.map((count) => (
              <option key={count} value={count}>
                {count}차시
              </option>
            ))}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor={`${id}-date`} className={s.label}>
            시작일
          </label>
          <input
            id={`${id}-date`}
            type="date"
            className={s.control}
            value={draft.startDate}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...draft, startDate: event.target.value })
            }
          />
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={draft.active}
        className={s.switch}
        disabled={disabled}
        onClick={() => onChange({ ...draft, active: !draft.active })}
      >
        <span>자동 출제</span>
        <span className={s.track} aria-hidden="true" />
      </button>
    </div>
  );
}
