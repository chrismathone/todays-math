"use client";

import { useId, useState } from "react";
import type {
  FadingTeacherQuota,
  FadingTeacherQuotaInput,
  FadingTeacherStudent,
} from "@/contracts/fadingTeacher.contract";
import { FADING_SERVICE_QUOTA } from "@/lib/fading/quota";
import { FadingMath } from "../FadingMath";
import { TeacherFadingSourceError } from "./source";
import s from "./TeacherFadingStatus.module.css";

/**
 * 학생 상세의 «오늘 추가 확인» · «하루 분량» 두 묶음 — Hi-fi Q2(원장님 선택 2026-10-17 · `/dev/fading-quota-hifi`).
 * 흰 묶음 둘 · 필요한 상태(상한 도달 · 보충 필요 · 분량 점검 필요)에만 호박색 딱지. 바꾼 분량은 다음 한국 날짜부터 먹는다 —
 * 저장한 뒤에도 «오늘 적용» 값은 그대로 보인다. 다른 사람이 먼저 바꿨으면 덮어쓰지 않고 최신 값과 내 변경안을 함께 보인다.
 */

type Quota = FadingTeacherQuota["today"]["quota"];
const CHOICES: Quota[] = [null, 10, 15, 20];

/** «서비스 기본(현재 15칸)» · «학생 지정 10칸». 기본은 «학생 지정 15칸»과 가른다. */
function quotaName(quota: Quota, serviceSlots: number) {
  return quota === null
    ? `서비스 기본(현재 ${serviceSlots}칸)`
    : `학생 지정 ${quota}칸`;
}
/** «10/18» — 한국 날짜 글에서. */
function monthDay(date: string) {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}
function nextDate(today: string) {
  return new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function RelearnTodayCard({ detail }: { detail: FadingTeacherStudent }) {
  const relearn = detail.summary.relearn;
  const today = relearn?.today;
  if (!relearn || !today) return null;
  const stops = detail.relearnStops ?? [];
  const quotaCheck = detail.summary.flags.includes("quota-check");
  return (
    <section className={s.quotaCard} aria-label="오늘 추가 확인">
      <header className={s.quotaCardHead}>
        <h4>오늘 추가 확인</h4>
        {today.capped ? <span className={s.flag}>하루 상한 도달</span> : null}
      </header>
      <dl className={s.quotaRows}>
        <div>
          <dt>판정한 확인</dt>
          <dd>{today.checks}회</dd>
        </div>
        <div>
          <dt>{today.capped ? "내일 이어서" : "남은 확인"}</dt>
          <dd>{relearn.waiting}문장</dd>
        </div>
        <div>
          <dt>
            오늘 멈춘 문장
            {today.stopped ? <span className={s.flag}>보충 필요</span> : null}
          </dt>
          <dd>{today.stopped}문장</dd>
        </div>
      </dl>
      {stops.length ? (
        <ul className={s.stopList} aria-label="오늘 멈춘 문장">
          {stops.map((stop) => (
            <li key={`${stop.conceptId}/${stop.propositionId}`}>
              <FadingMath text={stop.term} />
            </li>
          ))}
        </ul>
      ) : null}
      {relearn.capDays !== undefined ? (
        <p className={s.quotaFoot}>
          최근 7일 중 {relearn.capDays}일 상한 도달
          {quotaCheck ? <span className={s.flag}>분량 점검 필요</span> : null}
        </p>
      ) : null}
    </section>
  );
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "failed" }
  | { kind: "conflict" }
  | { kind: "reloading" }
  | { kind: "reloaded" };

export function QuotaCard({
  quota: served,
  today,
  onSave,
  onReload,
}: {
  quota: FadingTeacherQuota;
  today: string;
  /** 없으면 보기만 한다(원천이 저장을 모른다). */
  onSave?: (input: FadingTeacherQuotaInput) => Promise<FadingTeacherQuota>;
  /** 최신 분량만 다시 읽는다 — 상세를 내리지 않아 내 변경안이 남는다. */
  onReload: () => Promise<FadingTeacherQuota | undefined>;
}) {
  const selectId = useId();
  const [base, setBase] = useState(served);
  const [seen, setSeen] = useState(served);
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  // 예약이 «서비스 기본»(null)일 수 있다 — 예약이 있는지로 가른다.
  const planned = base.next ? base.next.quota : base.today.quota;
  const [draft, setDraft] = useState<Quota>(planned);
  // 상세를 다시 읽어 새 값이 오면 그것을 바탕으로 삼는다 — 내 변경안(`draft`)은 그대로 둔다(덮어쓰지 않는다).
  if (served !== seen) {
    setSeen(served);
    setBase(served);
  }
  const name = (quota: Quota) => quotaName(quota, FADING_SERVICE_QUOTA);
  const tomorrow = nextDate(today);
  const editable = base.canEdit && !!onSave;
  const changed = draft !== planned;
  const saving = state.kind === "saving" || state.kind === "reloading";

  async function reload() {
    setState({ kind: "reloading" });
    try {
      const latest = await onReload();
      if (latest) setBase(latest);
      setState({ kind: "reloaded" });
    } catch {
      setState({ kind: "conflict" });
    }
  }

  async function save() {
    if (!onSave || !changed || saving) return;
    setState({ kind: "saving" });
    try {
      const next = await onSave({
        quota: draft,
        expectedRevision: base.revision,
      });
      setBase(next);
      setState({ kind: "saved" });
    } catch (error) {
      setState({
        kind:
          error instanceof TeacherFadingSourceError && error.status === 409
            ? "conflict"
            : "failed",
      });
    }
  }

  return (
    <section className={s.quotaCard} aria-label="하루 분량">
      <header className={s.quotaCardHead}>
        <h4>하루 분량</h4>
      </header>
      {editable ? (
        <label className={s.quotaSelect} htmlFor={selectId}>
          {monthDay(tomorrow)}부터
          <select
            id={selectId}
            value={draft === null ? "default" : String(draft)}
            disabled={saving}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value === "default" ? null : (Number(value) as Quota));
              if (state.kind === "saved" || state.kind === "failed")
                setState({ kind: "idle" });
            }}
          >
            {CHOICES.map((quota) => (
              <option
                key={String(quota)}
                value={quota === null ? "default" : String(quota)}
              >
                {name(quota)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className={s.quotaLines}>
        <p>
          오늘 적용 <strong>{name(base.today.quota)}</strong>
        </p>
        {base.next && state.kind !== "saved" ? (
          <p>
            예약{" "}
            <strong>
              {monthDay(base.next.on)}부터 {name(base.next.quota)}
            </strong>
          </p>
        ) : null}
        {editable && changed && state.kind !== "conflict" ? (
          <p>
            변경안{" "}
            <strong>
              {monthDay(tomorrow)}부터 {name(draft)}
            </strong>{" "}
            · 저장 전
          </p>
        ) : null}
        {saving ? (
          <p role="status" className={s.muted}>
            {state.kind === "saving" ? "저장 중" : "최신 설정을 불러오는 중"}
          </p>
        ) : null}
        {state.kind === "reloaded" ? (
          <p role="status" className={s.muted}>
            최신 설정을 불러왔습니다. 변경안을 확인한 뒤 저장해 주세요.
          </p>
        ) : null}
        {state.kind === "saved" && base.next ? (
          <p role="status" className={s.quotaSaved}>
            저장됨 · {monthDay(base.next.on)}부터 {name(base.next.quota)}
          </p>
        ) : null}
        {state.kind === "failed" ? (
          <p role="alert" className={s.quotaAlert}>
            저장하지 못했습니다. 다시 시도해 주세요.
          </p>
        ) : null}
        {state.kind === "conflict" ? (
          <div role="alert" className={s.quotaAlert}>
            <p>
              분량 설정이 변경되었습니다. 최신 설정을 확인한 뒤 다시 저장해
              주세요.
            </p>
            <p>내 변경안 {name(draft)}</p>
          </div>
        ) : null}
        {!base.canEdit ? (
          <p className={s.muted}>
            분량 변경은 원장 · 지점 관리자가 할 수 있습니다.
          </p>
        ) : null}
      </div>
      <p className={s.note}>칸은 떠올릴 문장 · 문제 · 활동 하나씩입니다.</p>
      {editable ? (
        state.kind === "conflict" ? (
          <button
            type="button"
            className={s.button}
            onClick={() => void reload()}
          >
            최신 설정 불러오기
          </button>
        ) : (
          <button
            type="button"
            className={s.quotaSave}
            disabled={!changed || saving}
            onClick={() => void save()}
          >
            {saving
              ? "저장 중"
              : state.kind === "failed"
                ? "다시 저장"
                : "저장"}
          </button>
        )
      ) : null}
    </section>
  );
}
