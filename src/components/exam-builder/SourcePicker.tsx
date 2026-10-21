"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import { BANK_SOURCE_GROUPS } from "@/contracts/bankSource.contract";
import {
  unifiedBankPickerGroupsSchema,
  unifiedBankPickerBooksSchema,
  unifiedBankPickerBookCountsSchema,
  unifiedBankPickerKindCountsSchema,
  type UnifiedBankPickerBook,
  type UnifiedBankPickerBookCounts,
} from "@/contracts/unifiedBankBootstrap.contract";
import { BANK_SOURCE_GROUP_LABEL } from "@/components/problem/labels";
import {
  type SourcePick,
  kindsText,
} from "@/components/unified/bankSourcePick";
import { requireQuestionRead } from "@/lib/problem/questionSelectionClient";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";
import s from "@/components/unified/BankSourcePicker.module.css";
import styles from "@/components/unified/BankView.module.css";

const toggle = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
const n = (value: number | undefined | null) =>
  value == null ? "미확인" : value.toLocaleString("ko-KR");

export function sourcePickerLabel(
  books: readonly UnifiedBankPickerBook[],
  pick: SourcePick,
) {
  if (!pick.group) return "전체 출처";
  if (pick.group !== "school_textbook")
    return BANK_SOURCE_GROUP_LABEL[pick.group];
  const first = books.find((book) => book.id === pick.books[0]);
  const bookName = first
    ? `${first.grade} ${first.publisher}${first.author ? `(${first.author})` : ""}${pick.books.length > 1 ? ` 외 ${pick.books.length - 1}권` : ""}`
    : `${pick.books.length}권`;
  return [
    BANK_SOURCE_GROUP_LABEL.school_textbook,
    pick.books.length ? bookName : "책 전부",
    pick.kinds.length ? kindsText(pick.kinds) : "자료 전부",
  ].join(" · ");
}

async function request(params: Record<string, string>, signal: AbortSignal) {
  const response = await fetch(`${getStudioEndpoints().problems}/sources`, {
    method: "POST",
    signal,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: "question", ...params }),
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "출처를 불러오지 못했습니다.",
    );
  return body;
}

function Check({
  checked,
  onChange,
  label,
  sub,
  count,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  sub?: string;
  count: number | undefined | null;
  disabled?: boolean;
}) {
  return (
    <label className={`${s.checkRow} ${count === 0 ? s.zero : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>
        {label}
        {sub && <span className={s.sub}>{sub}</span>}
      </span>
      <span className={s.count}>{n(count)}</span>
    </label>
  );
}

/** Counts belong to the open pane and current grade; drafts survive navigation. */
export default function SourcePicker({
  value,
  filterGrade,
  returnFocus,
  onApply,
  onCancel,
  onCatalog,
}: {
  value: SourcePick;
  filterGrade: string;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onApply: (value: SourcePick) => void;
  onCancel: () => void;
  onCatalog: (books: UnifiedBankPickerBook[]) => void;
}) {
  const [group, setGroup] = useState(value.group);
  const [books, setBooks] = useState(value.books);
  const [kinds, setKinds] = useState(value.kinds);
  const [grade, setGrade] = useState("");
  const [groups, setGroups] =
    useState<ReturnType<typeof unifiedBankPickerGroupsSchema.parse>>();
  const [catalog, setCatalog] =
    useState<ReturnType<typeof unifiedBankPickerBooksSchema.parse>>();
  const [knownBooks, setKnownBooks] = useState<UnifiedBankPickerBook[]>([]);
  const [counts, setCounts] = useState<{
    key: string;
    value: UnifiedBankPickerBookCounts;
  }>();
  // 책을 안 고른 때의 자료 종류 열 — 교과서 전부의 종류별 수(적용 범위와 같다). 그때만 한 번 받는다.
  const [kindTotals, setKindTotals] = useState<Record<string, number>>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [retry, setRetry] = useState(0);
  const textbook = group === "school_textbook";
  const selectedKey = [...books].sort().join(",");
  const countKey = JSON.stringify([grade, selectedKey]);
  const needKindTotals = textbook && !books.length && !kindTotals;
  useEffect(() => {
    const controller = new AbortController();
    void request({ view: "picker-groups" }, controller.signal)
      .then((body) => {
        const value = unifiedBankPickerGroupsSchema.parse(body);
        requireQuestionRead(value);
        if (!controller.signal.aborted) {
          setGroups(value);
          setErrors((current) => ({ ...current, groups: "" }));
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setErrors((current) => ({
            ...current,
            groups:
              cause instanceof Error ? cause.message : "출처 수량 확인 실패",
          }));
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!textbook) return;
    const controller = new AbortController();
    const params = {
      ...(grade ? { grade } : {}),
      ...(selectedKey ? { books: selectedKey } : {}),
    };
    void Promise.all([
      request({ view: "picker-books", ...params }, controller.signal).then(
        (body) => unifiedBankPickerBooksSchema.parse(body),
      ),
      grade
        ? request(
            { view: "picker-book-counts", ...params },
            controller.signal,
          ).then((body) => unifiedBankPickerBookCountsSchema.parse(body))
        : undefined,
    ])
      .then(([value, inventory]) => {
        requireQuestionRead(value);
        if (inventory) requireQuestionRead(inventory);
        if (controller.signal.aborted) return;
        setCatalog(value);
        setKnownBooks((current) => [
          ...new Map(
            [...current, ...value.books].map((book) => [book.id, book]),
          ).values(),
        ]);
        onCatalog(value.books);
        if (!grade)
          setGrade(
            value.grades.includes(filterGrade)
              ? filterGrade
              : (value.books.find(
                  (book) => book.id === selectedKey.split(",")[0],
                )?.grade ??
                  value.grades[0] ??
                  ""),
          );
        if (inventory) setCounts({ key: countKey, value: inventory });
        setErrors((current) => ({ ...current, books: "" }));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setErrors((current) => ({
            ...current,
            books: cause instanceof Error ? cause.message : "교과서 확인 실패",
          }));
      });
    return () => controller.abort();
  }, [textbook, grade, selectedKey, countKey, filterGrade, onCatalog, retry]);
  useEffect(() => {
    if (!needKindTotals) return;
    const controller = new AbortController();
    void request({ view: "picker-kind-counts" }, controller.signal)
      .then((body) => {
        const value = unifiedBankPickerKindCountsSchema.parse(body);
        requireQuestionRead(value);
        if (!controller.signal.aborted) {
          setKindTotals(value.kinds);
          setErrors((current) => ({ ...current, kinds: "" }));
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setErrors((current) => ({
            ...current,
            kinds:
              cause instanceof Error
                ? cause.message
                : "자료 종류 수량 확인 실패",
          }));
      });
    return () => controller.abort();
  }, [needKindTotals, retry]);
  const currentCounts = counts?.key === countKey ? counts.value : undefined;
  const byId = useMemo(
    () => new Map(currentCounts?.books.map((book) => [book.id, book]) ?? []),
    [currentCounts],
  );
  const list = (catalog?.books ?? [])
    .filter((book) => book.grade === grade)
    .sort(
      (a, b) =>
        (byId.get(b.id)?.count ?? 0) - (byId.get(a.id)?.count ?? 0) ||
        a.publisher.localeCompare(b.publisher, "ko") ||
        (a.author ?? "").localeCompare(b.author ?? "", "ko"),
    );
  const ids = list.map((book) => book.id);
  const all = ids.length > 0 && ids.every((id) => books.includes(id));
  // 고른 책들의 합 — 문항 하나는 자료 하나에만 들어 책 × 자료 종류의 수가 겹치지 않는다(`bankSourcePick.ts`
  // 머리말) — 더하면 정확하다. 수가 아직 안 왔으면 모른다. 수는 고른 책을 다 실어 오므로, 온 뒤에도 없는
  // 책(사라진 책)은 0 이다(문제은행 창과 같은 규칙).
  const sum = (
    pool: readonly string[],
    of: (book: UnifiedBankPickerBookCounts["books"][number]) => number,
  ) => {
    if (!currentCounts) return null;
    let total = 0;
    for (const id of pool) {
      const book = byId.get(id);
      if (book) total += of(book);
    }
    return total;
  };
  // 책을 안 고르면 적용 범위가 교과서 전부다 — 지금 펼친 과목이 아니라 전역 종류별 수로 센다.
  const kindCount = (kind: string) =>
    books.length
      ? sum(books, (book) => book.kinds[kind] ?? 0)
      : kindTotals
        ? (kindTotals[kind] ?? 0)
        : null;
  const matched =
    !books.length && !kinds.length
      ? groups?.sources.school_textbook
      : !books.length
        ? kindTotals
          ? kinds.reduce((total, kind) => total + (kindTotals[kind] ?? 0), 0)
          : null
        : sum(books, (book) =>
            kinds.length
              ? kinds.reduce(
                  (total, kind) => total + (book.kinds[kind] ?? 0),
                  0,
                )
              : book.count,
          );
  // 교과서 전부의 수는 책을 안 고른 동안만 쓴다 — 그 오류도 그동안만 보인다(책을 다 풀면 다시 읽는다).
  const error =
    errors.groups ||
    (textbook && (errors.books || (!books.length && errors.kinds)));
  const apply = () =>
    onApply({
      group,
      books: textbook
        ? catalog
          ? knownBooks.map((book) => book.id).filter((id) => books.includes(id))
          : books
        : [],
      kinds: textbook
        ? catalog
          ? catalog.kinds.filter((kind) => kinds.includes(kind))
          : kinds
        : [],
    });
  return (
    <PickerDialog
      title="출처 고르기"
      doneLabel="적용"
      returnFocus={returnFocus}
      onClose={apply}
      onCancel={onCancel}
    >
      <div className={s.wrap}>
        {error && (
          <div className={s.state} role="alert">
            <span>{error}</span>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() => setRetry((value) => value + 1)}
            >
              다시 시도
            </button>
          </div>
        )}
        {!groups ? (
          <p className={s.state} role="status">
            출처별 문항 수를 불러오는 중입니다.
          </p>
        ) : (
          <>
            <div className={s.segments} role="group" aria-label="출처">
              {["" as const, ...BANK_SOURCE_GROUPS].map((key) => (
                <button
                  key={key || "all"}
                  type="button"
                  className={s.segment}
                  aria-pressed={group === key}
                  onClick={() => setGroup(key)}
                >
                  {key ? BANK_SOURCE_GROUP_LABEL[key] : "전체"}
                  <span className={s.count}>
                    {n(groups.sources[key || "total"])}
                  </span>
                </button>
              ))}
            </div>
            {textbook ? (
              !catalog ? (
                <p className={s.state} role="status">
                  교과서 목록을 불러오는 중입니다.
                </p>
              ) : (
                <>
                  <div className={s.pane}>
                    <div>
                      <p className={s.colTitle}>과목</p>
                      <div
                        className={s.gradeList}
                        role="group"
                        aria-label="과목"
                      >
                        {catalog.grades.map((subject) => (
                          <button
                            type="button"
                            key={subject}
                            className={s.gradeButton}
                            aria-pressed={subject === grade}
                            onClick={() => setGrade(subject)}
                          >
                            <span>{subject}</span>
                            {knownBooks.some(
                              (book) =>
                                book.grade === subject &&
                                books.includes(book.id),
                            ) && (
                              <span className={s.picked}>
                                {
                                  knownBooks.filter(
                                    (book) =>
                                      book.grade === subject &&
                                      books.includes(book.id),
                                  ).length
                                }
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className={s.colTitle}>
                        {grade} 교과서
                        <span className={s.count}>{list.length}권</span>
                      </p>
                      {!grade && (
                        <p className={s.state}>등록된 교과서가 없습니다.</p>
                      )}
                      {grade && !currentCounts && !errors.books && (
                        <p role="status">교과서 수량을 확인합니다…</p>
                      )}
                      <fieldset
                        className={s.checkList}
                        aria-label={`${grade} 교과서`}
                      >
                        <Check
                          checked={all}
                          label={`${grade} 교과서 전부`}
                          count={sum(ids, (book) => book.count)}
                          onChange={() =>
                            setBooks((current) =>
                              all
                                ? current.filter((id) => !ids.includes(id))
                                : [...new Set([...current, ...ids])],
                            )
                          }
                        />
                        {list.map((book) => (
                          <Check
                            key={book.id}
                            checked={books.includes(book.id)}
                            label={
                              book.author
                                ? `${book.publisher} · ${book.author}`
                                : book.publisher
                            }
                            sub={`출제 가능 ${n(byId.get(book.id)?.open)}`}
                            count={byId.get(book.id)?.count}
                            onChange={() =>
                              setBooks((current) => toggle(current, book.id))
                            }
                          />
                        ))}
                      </fieldset>
                    </div>
                    <div>
                      <p className={s.colTitle}>자료 종류</p>
                      <fieldset className={s.checkList} aria-label="자료 종류">
                        {catalog.kinds.map((kind) => (
                          <Check
                            key={kind}
                            checked={kinds.includes(kind)}
                            label={kind}
                            count={kindCount(kind)}
                            disabled={
                              kindCount(kind) === 0 && !kinds.includes(kind)
                            }
                            onChange={() =>
                              setKinds((current) => toggle(current, kind))
                            }
                          />
                        ))}
                      </fieldset>
                    </div>
                  </div>
                  <div className={s.footer}>
                    <span>
                      걸리는 문항 <b>{n(matched)}</b>
                      {matched == null ? "" : "개"}
                      <span className={s.count}>
                        {" "}
                        / 교과서 {n(groups.sources.school_textbook)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={styles.resetButton}
                      onClick={() => {
                        setBooks([]);
                        setKinds([]);
                      }}
                    >
                      모두 풀기
                    </button>
                  </div>
                </>
              )
            ) : (
              <p className={s.note}>
                {group
                  ? `${BANK_SOURCE_GROUP_LABEL[group]} 문항은 책 · 자료 종류가 없습니다. [적용]을 누르면 출처만 걸립니다.`
                  : "출처를 가리지 않고 모든 문항을 봅니다. 교과서를 고르면 책 · 자료 종류로 거를 수 있습니다."}
              </p>
            )}
          </>
        )}
      </div>
    </PickerDialog>
  );
}
