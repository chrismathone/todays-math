"use client";

import { useState, type ReactNode, type RefObject } from "react";

import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import { BANK_SOURCE_GROUP_LABEL } from "@/components/problem/labels";
import {
  BANK_SOURCE_GROUPS,
  type BankSourceCounts,
} from "@/contracts/bankSource.contract";

import {
  kindCount,
  matchedCount,
  openingGrade,
  type SourcePick,
} from "./bankSourcePick";
import styles from "./BankView.module.css";
import s from "./BankSourcePicker.module.css";

/**
 * 문제은행 «출처 고르기» — H1 한 칸 요약 · 세 단 창 (D-161 · 05 S-08 [확정 — 2026-10-08]).
 *
 * 필터 줄에는 칸 하나(`BankSourceField`)만 서고, 고르는 일은 공용 고르기 창(`PickerDialog`, 규칙 11)에서 한다.
 *   ⑴ 창 맨 위 출처 줄(전체 · 엔진 · 교과서 · 기출 · 그 밖) — 교과서를 고르면 아래에 세 단(과목 │ 책 │ 자료 종류).
 *   ⑵ 고른 책에 0문항인 자료 종류는 흐리게 · 체크 막음. 이미 고른 것은 0 이 돼도 체크가 남는다(풀 수 있게).
 *   ⑶ 창은 필터 줄의 학년을 따라 열린다(학년 칸을 «전체 학년»으로 돌리는 일은 적용하는 쪽 — `BankView`).
 *   ⑷ 고른 것은 창 안의 초안이다 — [적용]을 눌러야 걸리고, Esc 는 버린다. 창 안에서는 «걸리는 문항 n개»만 바뀐다.
 */

const n = (value: number) => value.toLocaleString("ko-KR");
const toggle = (list: string[], value: string) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
/** 고른 것을 화면 차례로 — 칸 · 칩의 «첫 것 외 n»이 고른 손의 차례에 따라 흔들리지 않게. */
const inOrder = (picked: string[], order: string[]) =>
  order.filter((item) => picked.includes(item));

/** 필터 줄 안의 «출처» 칸 — 지금 고른 것 한 줄 + 고르기(⑴). */
export function BankSourceField({
  text,
  opener,
  onOpen,
}: {
  text: string;
  opener: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
}) {
  return (
    <div className={s.sourceField}>
      <button
        ref={opener}
        type="button"
        className={s.sourceButton}
        aria-haspopup="dialog"
        aria-label={`출처 고르기: ${text}`}
        title={text}
        onClick={onOpen}
      >
        <span className={s.sourceLabel}>출처</span>
        <span className={s.sourceValue}>{text}</span>
        <span className={s.sourceAction}>고르기</span>
      </button>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  sub,
  count,
  zero = false,
  disabled = false,
  className = "",
}: {
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  sub?: string;
  count: number;
  zero?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={`${s.checkRow} ${zero ? s.zero : ""} ${className}`}
      data-zero={zero ? "true" : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>
        {label}
        {sub ? <span className={s.sub}>{sub}</span> : null}
      </span>
      <span className={s.count}>{n(count)}</span>
    </label>
  );
}

/** 세 단 — 과목 │ 그 과목의 책 │ 자료 종류. 처음 펼칠 과목은 열 때 한 번 정한다(⑶). */
function TextbookPanes({
  counts,
  filterGrade,
  draft,
  setBooks,
  setKinds,
}: {
  counts: BankSourceCounts;
  filterGrade: string;
  draft: SourcePick;
  setBooks: (update: (books: string[]) => string[]) => void;
  setKinds: (update: (kinds: string[]) => string[]) => void;
}) {
  const [grade, setGrade] = useState(() =>
    openingGrade(counts, filterGrade, draft.books),
  );
  const { books: allBooks, grades, kinds } = counts.textbook;
  const booksOf = (subject: string) =>
    allBooks.filter((book) => book.grade === subject);
  const list = booksOf(grade);
  const ids = list.map((book) => book.id);
  const all = ids.length > 0 && ids.every((id) => draft.books.includes(id));
  return (
    <div className={s.pane}>
      <div>
        <p className={s.colTitle}>과목</p>
        <div className={s.gradeList} role="group" aria-label="과목">
          {grades.map((subject) => {
            const picked = booksOf(subject).filter((book) =>
              draft.books.includes(book.id),
            ).length;
            return (
              <button
                key={subject}
                type="button"
                className={s.gradeButton}
                aria-pressed={grade === subject}
                onClick={() => setGrade(subject)}
              >
                <span>{subject}</span>
                {picked ? (
                  <span className={s.picked}>{picked}</span>
                ) : (
                  <span className={s.count}>{booksOf(subject).length}권</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className={s.colTitle}>
          {grade} 교과서
          <span className={s.count}>{list.length}권</span>
        </p>
        <fieldset className={s.checkList} aria-label={`${grade} 교과서`}>
          <CheckRow
            className={s.allRow}
            label={`${grade} 교과서 전부`}
            count={list.reduce((sum, book) => sum + book.count, 0)}
            checked={all}
            onChange={() =>
              setBooks((books) =>
                all
                  ? books.filter((id) => !ids.includes(id))
                  : [...books.filter((id) => !ids.includes(id)), ...ids],
              )
            }
          />
          {list.map((book) => (
            <CheckRow
              key={book.id}
              label={
                book.author
                  ? `${book.publisher} · ${book.author}`
                  : book.publisher
              }
              sub={`자료 ${n(book.materials)}편 · 출제 가능 ${n(book.open)}`}
              count={book.count}
              checked={draft.books.includes(book.id)}
              onChange={() => setBooks((books) => toggle(books, book.id))}
            />
          ))}
        </fieldset>
      </div>
      <div>
        <p className={s.colTitle}>자료 종류</p>
        <fieldset className={s.checkList} aria-label="자료 종류">
          {kinds.map((kind) => {
            const count = kindCount(counts, draft.books, kind);
            const checked = draft.kinds.includes(kind);
            return (
              <CheckRow
                key={kind}
                label={kind}
                count={count}
                zero={count === 0}
                // ⑵ 0 이면 막는다 — 단, 이미 고른 것은 풀 수 있어야 한다
                disabled={count === 0 && !checked}
                checked={checked}
                onChange={() => setKinds((list) => toggle(list, kind))}
              />
            );
          })}
        </fieldset>
      </div>
    </div>
  );
}

export function BankSourcePicker({
  counts,
  error,
  onRetry,
  value,
  filterGrade,
  returnFocus,
  onApply,
  onCancel,
}: {
  /** 창의 수 — 받기 전이면 `null`. */
  counts: BankSourceCounts | null;
  error: string | null;
  onRetry: () => void;
  /** 지금 걸려 있는 것 — 창 안의 초안이 여기서 시작한다. */
  value: SourcePick;
  /** 필터 줄의 학년 — 창이 그 과목부터 열린다(⑶). */
  filterGrade: string;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onApply: (next: SourcePick) => void;
  /** Esc — 초안을 버린다(⑷). */
  onCancel: () => void;
}) {
  const [group, setGroup] = useState(value.group);
  const [books, setBooksState] = useState(value.books);
  const [kinds, setKindsState] = useState(value.kinds);
  const draft: SourcePick = { group, books, kinds };
  const textbook = group === "school_textbook";

  function apply() {
    onApply({
      group,
      books:
        textbook && counts
          ? inOrder(
              books,
              counts.textbook.books.map((book) => book.id),
            )
          : textbook
            ? books
            : [],
      kinds:
        textbook && counts
          ? inOrder(kinds, counts.textbook.kinds)
          : textbook
            ? kinds
            : [],
    });
  }

  const rows = counts
    ? [
        { key: "" as const, label: "전체", count: counts.sources.total },
        ...BANK_SOURCE_GROUPS.map((key) => ({
          key,
          label: BANK_SOURCE_GROUP_LABEL[key],
          count: counts.sources[key],
        })),
      ]
    : [];

  return (
    <PickerDialog
      title="출처 고르기"
      doneLabel="적용"
      returnFocus={returnFocus}
      onClose={apply}
      onCancel={onCancel}
    >
      <div className={s.wrap}>
        {error ? (
          <div className={s.state} role="alert">
            <span>{error}</span>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={onRetry}
            >
              다시 시도
            </button>
          </div>
        ) : !counts ? (
          <p className={s.state} role="status">
            출처별 문항 수를 불러오는 중입니다.
          </p>
        ) : (
          <>
            <div>
              <div className={s.segments} role="group" aria-label="출처">
                {rows.map(({ key, label, count }) => (
                  <button
                    key={key || "all"}
                    type="button"
                    className={s.segment}
                    aria-pressed={group === key}
                    onClick={() => setGroup(key)}
                  >
                    {label}
                    <span className={s.count}>{n(count)}</span>
                  </button>
                ))}
              </div>
              {textbook ? (
                <TextbookPanes
                  counts={counts}
                  filterGrade={filterGrade}
                  draft={draft}
                  setBooks={setBooksState}
                  setKinds={setKindsState}
                />
              ) : (
                <p className={s.note}>
                  {group
                    ? `${BANK_SOURCE_GROUP_LABEL[group]} 문항은 책 · 자료 종류가 없습니다. [적용]을 누르면 출처만 걸립니다.`
                    : "출처를 가리지 않고 모든 문항을 봅니다. 교과서를 고르면 책 · 자료 종류로 거를 수 있습니다."}
                </p>
              )}
            </div>
            {textbook ? (
              <div className={s.footer}>
                <span>
                  걸리는 문항 <b>{n(matchedCount(counts, books, kinds))}</b>개
                  <span className={s.count}>
                    {" "}
                    / 교과서 {n(counts.textbook.total)}
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={() => {
                    setBooksState([]);
                    setKindsState([]);
                  }}
                >
                  모두 풀기
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PickerDialog>
  );
}
