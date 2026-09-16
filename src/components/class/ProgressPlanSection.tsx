"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

import { ProgressPlanFields } from "@/components/class/ProgressPlanFields";
import type {
  PlanScheduleEntity,
  ProgressPlanEntity,
} from "@/contracts/dailyAutoTest.contract";
import {
  emptyPlanDraft,
  planDraftFrom,
  planDraftKey,
  planDraftReady,
  type PlanDraft,
} from "@/lib/class/planDraft";
import {
  fetchClassPlan,
  previewClassPlan,
  saveClassPlan,
} from "@/lib/class/progressPlanApi";
import {
  currentDelayDays,
  gaugeCells,
  type GaugeState,
} from "@/lib/daily/planGauge";
import { kstDateOf } from "@/lib/kstDate";
import type { UnitNode } from "@/lib/units/groupUnits";

import s from "./ProgressPlan.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      plan: ProgressPlanEntity | null;
      schedule: PlanScheduleEntity | null;
    };

type Preview =
  | { key: string; schedule: PlanScheduleEntity }
  | { key: string; error: string };

const HEADING =
  "mb-2 border-t-[3px] border-ink pt-1.5 text-[10.5px] font-black tracking-[2.5px]";

/** 미리보기를 부르기 전에 기다리는 시간 — 요일을 연달아 누를 때 요청이 줄줄이 나가지 않게. */
const PREVIEW_DELAY_MS = 250;

/**
 * 반 관리 › **수업 계획** 카드 + **이번 주 예정** 카드 (22번 ④ · 시안 Hi-fi 2 «계기판 관» · 05 §8.10 · D-131).
 *
 * - 계획은 계획 API 가 읽고 쓴다(`/api/classes/{id}/progress-plan`) — 새로 짜지 않는다.
 * - 🔴 **저장하기 전에 결과를 본다**(시안 B) — 칸을 바꾸면 미리보기 경로(저장 안 함)를 불러 예정을 다시 그린다.
 *   날짜 펴기는 서버 한 곳(`planSchedule.ts`)이다 — 이 화면은 줄을 칸으로 옮길 뿐이다(`planGauge.ts`).
 * - 🔴 저장이 거절되면 서버 문구를 그대로 — 400/422 로 가르지 않는다.
 * - 「오늘」은 학원 날짜(`kstDateOf`) 한 곳에서 정해 읽기·미리보기에 같이 넘긴다.
 */
export function ProgressPlanSection({
  classId,
  units,
  today: todayProp,
}: {
  classId: string;
  units: UnitNode[];
  /** 시험·시안 페이지용 — 없으면 오늘(KST). */
  today?: string;
}) {
  const [today] = useState(() => todayProp ?? kstDateOf(new Date()));
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [loadKey, setLoadKey] = useState(0);
  const [draft, setDraft] = useState<PlanDraft>(() => emptyPlanDraft(today));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    error: string | null;
    success: string | null;
  }>({ error: null, success: null });

  useEffect(() => {
    let alive = true;
    void fetchClassPlan(classId, today).then((result) => {
      if (!alive) return;
      if (!result.ok) {
        setLoad({ status: "error", message: result.message });
        return;
      }
      setLoad({
        status: "ready",
        plan: result.data.plan,
        schedule: result.data.schedule,
      });
      setDraft(
        result.data.plan
          ? planDraftFrom(result.data.plan)
          : emptyPlanDraft(today),
      );
    });
    return () => {
      alive = false;
    };
  }, [classId, today, loadKey]);

  const savedKey =
    load.status === "ready" && load.plan
      ? planDraftKey(planDraftFrom(load.plan))
      : null;
  const draftKey = planDraftKey(draft);
  const dirty = load.status === "ready" && draftKey !== savedKey;
  const wantPreview = dirty && planDraftReady(draft);

  useEffect(() => {
    if (!wantPreview) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void previewClassPlan(classId, draft, today, controller.signal).then(
        (result) => {
          if (controller.signal.aborted) return;
          setPreview(
            result.ok
              ? { key: draftKey, schedule: result.data }
              : { key: draftKey, error: result.message },
          );
        },
      );
    }, PREVIEW_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `draft` 는 `draftKey` 가 대신 본다 — 같은 규칙이면 다시 부르지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantPreview, draftKey, classId, today]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback({ error: null, success: null });
    const result = await saveClassPlan(classId, draft);
    setSaving(false);
    if (!result.ok) {
      setFeedback({ error: result.message, success: null });
      return;
    }
    setFeedback({ error: null, success: "저장했습니다." });
    // 예정은 서버에서 다시 읽는다 — 화면이 펴지 않는다.
    setLoadKey((key) => key + 1);
  }

  if (load.status !== "ready") {
    return (
      <div className="mt-8 grid grid-cols-1 gap-8">
        <section aria-labelledby={`${classId}-plan-heading`} className={s.plan}>
          <h2 id={`${classId}-plan-heading`} className={HEADING}>
            수업 계획
          </h2>
          {load.status === "loading" ? (
            <p role="status" className={s.status}>
              수업 계획을 불러오는 중…
            </p>
          ) : (
            <div className={s.form}>
              <p role="alert" className={s.alert}>
                {load.message}
              </p>
              <div className={s.actions}>
                <button
                  type="button"
                  className={s.ghost}
                  onClick={() => {
                    setLoad({ status: "loading" });
                    setLoadKey((key) => key + 1);
                  }}
                >
                  다시 불러오기
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  // 오른쪽 카드에 그릴 예정 — 저장된 규칙이면 저장된 예정, 바꾸는 중이면 미리보기(없으면 아직 저장된 것).
  const shownPreview =
    wantPreview && preview && "schedule" in preview ? preview : null;
  const previewError =
    wantPreview && preview && "error" in preview && preview.key === draftKey
      ? preview.error
      : null;
  const schedule = shownPreview ? shownPreview.schedule : load.schedule;

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section aria-labelledby={`${classId}-plan-heading`} className={s.plan}>
        <h2 id={`${classId}-plan-heading`} className={HEADING}>
          수업 계획
        </h2>
        <form
          aria-label="수업 계획"
          aria-busy={saving}
          className={s.form}
          onSubmit={(event) => void save(event)}
        >
          <ProgressPlanFields
            draft={draft}
            onChange={(next) => {
              setDraft(next);
              if (feedback.success) setFeedback({ error: null, success: null });
            }}
            units={units}
            disabled={saving}
          />
          <div className={s.actions}>
            <button type="submit" className={s.primary} disabled={saving}>
              저장
            </button>
            {feedback.error ? (
              <p role="alert" className={s.alert}>
                {feedback.error}
              </p>
            ) : saving || feedback.success ? (
              <p role="status" className={s.status}>
                {saving ? "저장하는 중…" : feedback.success}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section
        aria-labelledby={`${classId}-schedule-heading`}
        className={s.plan}
      >
        <h2 id={`${classId}-schedule-heading`} className={HEADING}>
          이번 주 예정
        </h2>
        {schedule ? (
          <PlanGauge
            schedule={schedule}
            today={today}
            preview={shownPreview !== null}
            previewError={previewError}
          />
        ) : (
          <div className={s.gauge}>
            <p className={s.note}>수업 계획이 없습니다.</p>
            {previewError ? (
              <p role="status" className={s.note}>
                {previewError}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

const STATE_WORD: Record<GaugeState, string> = {
  done: "지난 수업",
  now: "오늘",
  late: "계획보다 늦음",
  empty: "예정",
};

/** 계기판 관 — 수업일 한 칸씩 가로로. 🔴 칸은 누르는 것이 아니다(D-30). */
function PlanGauge({
  schedule,
  today,
  preview,
  previewError,
}: {
  schedule: PlanScheduleEntity;
  today: string;
  preview: boolean;
  previewError: string | null;
}) {
  const cells = gaugeCells(schedule, today);
  const delay = currentDelayDays(schedule, today);
  const hasLate = cells.some((cell) => cell.state === "late");

  return (
    <div className={s.gauge}>
      {preview ? <p className={s.caption}>저장 전 미리보기</p> : null}
      {previewError ? (
        <p role="status" className={s.caption}>
          {previewError}
        </p>
      ) : null}
      {cells.length === 0 ? (
        <p className={s.note}>이번 주 수업일이 없습니다.</p>
      ) : (
        <ol
          aria-label="수업일"
          className={s.cells}
          style={{ "--cells": cells.length } as CSSProperties}
        >
          {cells.map((cell) => (
            <li
              key={cell.date}
              className={s.cell}
              data-state={cell.state}
              data-date={cell.date}
            >
              <span className={s.seg} aria-hidden="true" />
              <span className={s.leg}>
                <b>{cell.dateLabel}</b>
                {cell.unitLabel}
              </span>
              <span className="sr-only">{STATE_WORD[cell.state]}</span>
            </li>
          ))}
        </ol>
      )}
      {delay > 0 ? (
        <p className={s.note}>
          <span className={s.late}>{delay}일 밀림</span>
          {hasLate ? " · 노랑 칸이 계획보다 늦어진 수업일입니다." : null}
        </p>
      ) : null}
    </div>
  );
}
