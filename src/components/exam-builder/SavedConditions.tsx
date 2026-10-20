"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import {
  EXAM_CONDITION_NAME_MAX,
  type ExamCondition,
  type ExamConditionInput,
} from "@/contracts/examCondition.contract";
import { ladderText, type Ladder } from "./conditionsPlan";
import { ExamConditionError } from "./examConditionsClient";
import eb from "./ExamBuilder.module.css";
import sc from "./SavedConditions.module.css";

/**
 * «이름 붙인 출제 조건»(W5 · Hi-fi 1안 + 4안의 한 줄 — 원장님 2026-10-16).
 * `src/app/dev/exam-builder-hifi/W5Saved.tsx` 의 1안(줄 목록 — 이름 · 내용 · 범위 세 줄)과 4안의 «출제 조건 — ○○ 적용함» 줄.
 * 적용은 조건만 · 문항은 [문항 검토 →]으로 새로 · 삭제는 그 줄 안에서 한 번 묻는다.
 */

export const RESTORE_RULE =
  "조건만 가져옵니다 — 출처 · 범위 행(수 · 고정) · 총 문항 · 난이도 · 최근 출제 빼기. 문항은 [문항 구성]으로 새로 고르고, 출제 형식·문항 차례·지면 양식은 저장하지 않습니다(v1).";

type Contents = Pick<
  ExamConditionInput,
  "source" | "rows" | "total" | "ladder" | "recent" | "familyRule"
>;

/** 둘째 줄 — «18문항 · 기본 6 · 응용 8 · 최근 출제 뺌». */
export function conditionContents(c: Contents, tiers: readonly string[]) {
  const sum = c.rows.reduce((n, row) => n + row.count, 0);
  return [
    c.total !== null ? `${c.total}문항` : `지정 없음(행의 합 ${sum})`,
    ladderText(c.ladder as Ladder, tiers),
    c.recent ? "최근 출제 뺌" : "최근 출제 포함",
    ...(c.familyRule ? [] : ["같은 문항류 여러 개"]),
  ].join(" · ");
}
/** 셋째 줄 — «교과서 비상 · 범위 3 — 일차부등식의 해와 성질 5 · 일차부등식의 풀이 8(고정)». */
export function conditionScopeLine(c: Contents) {
  return `${c.source.label} · 범위 ${c.rows.length} — ${c.rows
    .map((row) => `${row.label} ${row.count}${row.fixed ? "(고정)" : ""}`)
    .join(" · ")}`;
}
/** «10/14» — 서울 날짜. */
function dayLabel(iso: string) {
  const [, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .split("-");
  return `${Number(month)}/${Number(day)}`;
}
const errorText = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/** 4안의 한 줄 — 출처 칸 아래 «출제 조건 — ○○ 적용함»과 [저장한 조건 · n]. */
export function ConditionLine({
  appliedName,
  count,
  disabled,
  opener,
  onOpen,
  titleField,
}: {
  appliedName: string | null;
  count: number | null;
  disabled: boolean;
  opener: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  titleField?: ReactNode;
}) {
  if (titleField)
    return (
      <div className={sc.compactConditionBar} data-condition-line>
        <div className={sc.conditionTitleRow}>
          {titleField}
          <button
            type="button"
            ref={opener}
            disabled={disabled}
            onClick={onOpen}
          >
            {count === null ? "저장한 조건" : `저장한 조건 · ${count}`}
          </button>
        </div>
        <p>
          <span className={sc.condLabel}>출제 조건 · </span>
          <span className={sc.condText}>
            {appliedName ? (
              <>
                <b>{appliedName}</b> 적용함
              </>
            ) : (
              "직접 정함"
            )}
          </span>
        </p>
      </div>
    );
  return (
    <div className={`${eb.toolbar} ${sc.condBar}`} data-condition-line>
      <span className={sc.condLabel}>출제 조건</span>
      <span className={sc.condText}>
        {appliedName ? (
          <>
            <b>{appliedName}</b> 적용함
          </>
        ) : (
          "직접 정함 — 저장한 조건을 쓰지 않음"
        )}
      </span>
      <button type="button" ref={opener} disabled={disabled} onClick={onOpen}>
        {count === null ? "저장한 조건" : `저장한 조건 · ${count}`}
      </button>
    </div>
  );
}

export interface ApplyReportValue {
  name: string;
  dropped: { label: string; reason: string }[];
  short: string[];
}

/** 적용한 뒤 — 구성표 위에 무엇을 가져왔고 무엇이 빠졌나. */
export function ApplyReport({
  report,
  hasQuestions,
}: {
  report: ApplyReportValue;
  hasQuestions: boolean;
}) {
  const issues = report.dropped.length + report.short.length;
  return (
    <div
      className={`${sc.report} ${issues ? sc.warn : sc.notice}`}
      role="status"
      data-apply-report
    >
      <span>
        «{report.name}»의 조건을 가져왔습니다.{" "}
        {hasQuestions
          ? "구성한 문항은 그대로입니다"
          : "문항은 아직 고르지 않았습니다"}{" "}
        — [문항 검토 →]을 누르면 새로 고릅니다.
      </span>
      {issues > 0 && (
        <ul>
          {report.dropped.map((item) => (
            <li key={`d:${item.label}`}>
              <span className={sc.struck}>{item.label}</span> — 범위에서
              뺐습니다({item.reason}).
            </li>
          ))}
          {report.short.map((item) => (
            <li key={`s:${item}`}>
              모자람: {item}. 다른 범위에서 채우지 않습니다.
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** [조건 저장] — 구성표 아래 상자에서 이름을 받는다. 같은 이름이면 바꿀지 한 번 묻는다. */
export function SaveConditionBox({
  defaultName,
  contents,
  items,
  tiers,
  onSave,
  onCancel,
}: {
  defaultName: string;
  contents: Contents;
  items: ExamCondition[];
  tiers: readonly string[];
  onSave: (
    name: string,
    replace?: { id: string; expectedRevision: number },
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(
    defaultName.slice(0, EXAM_CONDITION_NAME_MAX),
  );
  const [confirming, setConfirming] = useState<{
    id: string;
    revision: number;
    name: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const trimmed = name.trim();
  const taken = items.find((item) => item.condition.name === trimmed);
  async function submit(replace?: { id: string; expectedRevision: number }) {
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave(trimmed, replace);
    } catch (cause) {
      if (
        cause instanceof ExamConditionError &&
        cause.nameTaken &&
        cause.existing
      )
        setConfirming({ ...cause.existing, name: trimmed });
      else setError(errorText(cause, "조건을 저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={sc.saveBox}>
      <strong>조건 저장</strong>
      <div className={sc.row}>
        <input
          aria-label="조건 이름"
          value={name}
          maxLength={EXAM_CONDITION_NAME_MAX}
          disabled={busy}
          onChange={(event) => {
            setName(event.target.value);
            setConfirming(null);
          }}
        />
        <button
          type="button"
          className={eb.primary}
          disabled={!trimmed || busy || !!confirming}
          onClick={() =>
            taken
              ? setConfirming({
                  id: taken.id,
                  revision: taken.revision,
                  name: trimmed,
                })
              : void submit()
          }
        >
          저장
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          취소
        </button>
      </div>
      {confirming && (
        <div className={sc.confirmWarn} role="alert">
          <span>
            «{confirming.name}»을 지금 조건으로 바꿀까요? 그 조건의 이전 내용은
            남지 않습니다.
          </span>
          <button
            type="button"
            className={eb.primary}
            disabled={busy}
            onClick={() =>
              void submit({
                id: confirming.id,
                expectedRevision: confirming.revision,
              })
            }
          >
            바꾸기
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(null)}
          >
            취소
          </button>
        </div>
      )}
      {error && (
        <p className={sc.error} role="alert">
          {error}
        </p>
      )}
      <small className={sc.meta}>
        {taken ? "같은 이름이 있습니다 — 저장하면 바꿀지 묻습니다. " : ""}
        담는 것: {conditionContents(contents, tiers)} ·{" "}
        {conditionScopeLine(contents)}
      </small>
    </div>
  );
}

/** [저장한 조건] — 공용 고르기 창(D-159)에 1안의 줄 목록. */
export function SavedConditionsDialog({
  items,
  loading,
  error,
  tiers,
  returnFocus,
  onRetry,
  onClose,
  onApply,
  onRename,
  onRemove,
}: {
  items: ExamCondition[];
  loading: boolean;
  error?: string;
  tiers: readonly string[];
  returnFocus: RefObject<HTMLButtonElement | null>;
  onRetry: () => void;
  onClose: () => void;
  onApply: (item: ExamCondition) => void;
  onRename: (item: ExamCondition, name: string) => Promise<void>;
  onRemove: (item: ExamCondition) => Promise<void>;
}) {
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const nameTaken = (name: string, except: string) =>
    items.some(
      (item) => item.condition.name === name.trim() && item.id !== except,
    );
  async function act(id: string, run: () => Promise<void>, fallback: string) {
    setBusy(true);
    setRowError(null);
    try {
      await run();
      setRenaming(null);
      setConfirming(null);
    } catch (cause) {
      setRowError({ id, message: errorText(cause, fallback) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <PickerDialog
      title="저장한 조건"
      doneTone="plain"
      size="fit"
      returnFocus={returnFocus}
      onClose={onClose}
      footer={<span>{RESTORE_RULE}</span>}
    >
      <div className={sc.listHead}>
        <span>
          저장한 조건 <b className={sc.num}>{items.length}</b> · 마지막으로 쓴
          차례
        </span>
        <span className={sc.grow} />
        <span>
          조건만 담습니다 — 문항 · 출제 형식·문항 차례·지면 양식은 저장하지
          않습니다(v1).
        </span>
      </div>
      {loading ? (
        <p className={sc.empty} role="status">
          저장한 조건을 불러오는 중입니다…
        </p>
      ) : error ? (
        <div className={sc.empty} role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      ) : !items.length ? (
        <p className={sc.empty}>
          저장한 조건이 없습니다. 구성표 아래 [조건 저장]으로 만듭니다.
        </p>
      ) : (
        <ul className={sc.list}>
          {items.map((item) => {
            const c = item.condition;
            const rename = renaming?.id === item.id ? renaming : null;
            const taken = rename ? nameTaken(rename.name, item.id) : false;
            return (
              <li key={item.id} className={sc.savedRow}>
                <div>
                  <div className={sc.savedName}>
                    <strong>{c.name}</strong>
                    <small className={sc.meta}>
                      마지막 사용 {dayLabel(c.lastUsedAt)}
                    </small>
                  </div>
                  <div className={sc.savedLines}>
                    <span>{conditionContents(c, tiers)}</span>
                    <span>{conditionScopeLine(c)}</span>
                  </div>
                </div>
                <div className={sc.savedActions}>
                  <button
                    type="button"
                    className={eb.primary}
                    disabled={busy}
                    onClick={() => onApply(item)}
                  >
                    적용
                  </button>
                  <button
                    type="button"
                    className={eb.textButton}
                    disabled={busy}
                    onClick={() => {
                      setConfirming(null);
                      setRowError(null);
                      setRenaming({ id: item.id, name: c.name });
                    }}
                  >
                    이름 바꾸기
                  </button>
                  <button
                    type="button"
                    className={`${eb.textButton} ${eb.danger}`}
                    disabled={busy}
                    onClick={() => {
                      setRenaming(null);
                      setRowError(null);
                      setConfirming(item.id);
                    }}
                  >
                    삭제
                  </button>
                </div>
                {rename && (
                  <div className={sc.renameRow}>
                    <input
                      aria-label="새 이름"
                      value={rename.name}
                      maxLength={EXAM_CONDITION_NAME_MAX}
                      disabled={busy}
                      onChange={(event) =>
                        setRenaming({ id: item.id, name: event.target.value })
                      }
                    />
                    <button
                      type="button"
                      className={eb.primary}
                      disabled={busy || !rename.name.trim() || taken}
                      onClick={() =>
                        void act(
                          item.id,
                          () => onRename(item, rename.name.trim()),
                          "이름을 바꾸지 못했습니다.",
                        )
                      }
                    >
                      이름 저장
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRenaming(null)}
                    >
                      취소
                    </button>
                    {taken && (
                      <small className={sc.meta}>같은 이름이 있습니다.</small>
                    )}
                  </div>
                )}
                {confirming === item.id && (
                  <div className={sc.confirm} role="alert">
                    <span>
                      «{c.name}»을 지울까요? 이 조건으로 만든 시험지와 문항은
                      그대로입니다.
                    </span>
                    <button
                      type="button"
                      className={eb.danger}
                      disabled={busy}
                      onClick={() =>
                        void act(
                          item.id,
                          () => onRemove(item),
                          "조건을 지우지 못했습니다.",
                        )
                      }
                    >
                      지우기
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirming(null)}
                    >
                      취소
                    </button>
                  </div>
                )}
                {rowError?.id === item.id && (
                  <p className={sc.rowError} role="alert">
                    {rowError.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PickerDialog>
  );
}
