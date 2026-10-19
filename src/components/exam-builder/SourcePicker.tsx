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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [retry, setRetry] = useState(0);
  const textbook = group === "school_textbook";
  const selectedKey = [...books].sort().join(",");
  const countKey = JSON.stringify([grade, selectedKey]);
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
  const kindCount = (kind: string) =>
    books.length !== 1
      ? null
      : (byId.get(books[0])?.kinds[kind] ??
        (byId.has(books[0]) ? 0 : undefined));
  const matched =
    !books.length && !kinds.length
      ? groups?.sources.school_textbook
      : books.length !== 1 || kinds.length > 1
        ? null
        : kinds.length
          ? kindCount(kinds[0])
          : byId.get(books[0])?.count;
  const error = errors.groups || (textbook && errors.books);
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
                          count={
                            ids.length === 1 ? byId.get(ids[0])?.count : null
                          }
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
                      {matched == null && (
                        <small className={s.sub}>
                          겹치는 문항 수는 적용 후 목록에서 확인합니다.
                        </small>
                      )}
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
