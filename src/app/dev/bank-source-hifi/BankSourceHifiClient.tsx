"use client";

import {
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";

import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import styles from "@/components/unified/BankView.module.css";

import {
  Cards,
  Chevron,
  ExtraRow,
  ResultLine,
  Select,
  TopRow,
} from "../bank-source-wire/BankSourceWireClient";
import {
  HIFI_BOOKS,
  HIFI_GRADES,
  HIFI_KINDS,
  HIFI_SOURCES,
  HIFI_TOTAL,
  type HifiBook,
} from "./fixtures";
import h from "./hifi.module.css";

/**
 * 문제은행 **교과서 거르기** Hi-fi 시안 5안 (D-07 · 05 §0-3 Hi-fi 단계 — 원장님 2026-10-08 Wire «Ⓑ 고르기 창» 선택).
 *
 * 다섯 안 모두 Ⓑ 의 뼈대를 지킨다 — 화면에는 «지금 고른 것»과 단추 하나, 긴 목록은 공용 고르기 창(`PickerDialog`, 규칙 11)에서.
 * 다른 것은 ⑴ 화면에 고른 것을 어떻게 적나 ⑵ 창 안에서 책을 어떻게 늘어놓나 두 가지다.
 * 수는 공유 DB 에서 센 실제 값(`fixtures.ts`)이고, 창 안의 체크는 **실제로 움직인다**(걸리는 문항 수가 따라 바뀐다).
 * 🔴 문항 목록(카드)은 고른 것을 따르지 않는다 — 카드는 자리를 보이는 그림이다.
 */

const BOOK = new Map(HIFI_BOOKS.map((book) => [book.id, book]));
const SEED_BOOKS = ["중1|천재교육|김화경"];
const SEED_KINDS = ["대단원 평가", "형성 평가"];

const n = (value: number) => value.toLocaleString();
const bookName = (book: HifiBook) => `${book.publisher} · ${book.author}`;
const booksOf = (grade: string) =>
  HIFI_BOOKS.filter((book) => book.grade === grade);
const toggle = (list: string[], value: string) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

function pool(books: string[]): HifiBook[] {
  return books.length
    ? books.map((id) => BOOK.get(id)).filter((b): b is HifiBook => !!b)
    : HIFI_BOOKS;
}

/** 고른 책 · 자료 종류에 걸리는 문항 수(책을 안 고르면 교과서 전부, 종류를 안 고르면 종류 전부) */
function matched(books: string[], kinds: string[]): number {
  return pool(books).reduce(
    (sum, book) =>
      sum +
      (kinds.length
        ? kinds.reduce((acc, kind) => acc + (book.kinds[kind] ?? 0), 0)
        : book.count),
    0,
  );
}

function kindCount(books: string[], kind: string): number {
  return pool(books).reduce((sum, book) => sum + (book.kinds[kind] ?? 0), 0);
}

function booksText(books: string[]): string {
  if (!books.length) return "교과서 전부";
  const first = BOOK.get(books[0]);
  if (!first) return "";
  const head = `${first.grade} ${first.publisher}(${first.author})`;
  return books.length > 1 ? `${head} 외 ${books.length - 1}권` : head;
}

function kindsText(kinds: string[]): string {
  if (!kinds.length) return "자료 전부";
  return kinds.length > 1 ? `${kinds[0]} 외 ${kinds.length - 1}` : kinds[0];
}

interface PickState {
  books: string[];
  setBooks: Dispatch<SetStateAction<string[]>>;
  kinds: string[];
  setKinds: Dispatch<SetStateAction<string[]>>;
}

function usePick(): PickState {
  const [books, setBooks] = useState<string[]>(SEED_BOOKS);
  const [kinds, setKinds] = useState<string[]>(SEED_KINDS);
  return { books, setBooks, kinds, setKinds };
}

function Variant({
  no,
  title,
  good,
  cost,
  children,
}: {
  no: string;
  title: string;
  good: string;
  cost: string;
  children: ReactNode;
}) {
  return (
    <section className={h.variant} aria-label={`${no} ${title}`}>
      <h2>
        {no} {title}
      </h2>
      <p className={h.note}>좋은 점 — {good}</p>
      <p className={h.cost}>치르는 값 — {cost}</p>
      {children}
    </section>
  );
}

/** 창 아래 줄 — 걸리는 문항 수와 모두 풀기 */
function Footer({ pick }: { pick: PickState }) {
  return (
    <div className={h.footer}>
      <span>
        걸리는 문항 <b>{n(matched(pick.books, pick.kinds))}</b>개
        <span className={h.count}> / 교과서 {n(HIFI_TOTAL)}</span>
      </span>
      <button
        type="button"
        className={styles.resetButton}
        onClick={() => {
          pick.setBooks([]);
          pick.setKinds([]);
        }}
      >
        모두 풀기
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
  dim,
}: {
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  sub?: string;
  count: number;
  dim?: boolean;
}) {
  return (
    <label className={`${h.checkRow} ${dim ? h.zero : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>
        {label}
        {sub ? <span className={h.sub}>{sub}</span> : null}
      </span>
      <span className={h.count}>{n(count)}</span>
    </label>
  );
}

function KindChecks({ pick }: { pick: PickState }) {
  return (
    <fieldset className={h.checkList}>
      {HIFI_KINDS.map(({ kind }) => {
        const count = kindCount(pick.books, kind);
        return (
          <CheckRow
            key={kind}
            label={kind}
            count={count}
            dim={count === 0}
            checked={pick.kinds.includes(kind)}
            onChange={() => pick.setKinds((list) => toggle(list, kind))}
          />
        );
      })}
    </fieldset>
  );
}

/** 과목 하나의 책 — «이 과목 전부» 줄과 책 줄 */
function GradeBooks({ grade, pick }: { grade: string; pick: PickState }) {
  const list = booksOf(grade);
  const ids = list.map((book) => book.id);
  const all = ids.every((id) => pick.books.includes(id));
  return (
    <fieldset className={h.checkList}>
      <label className={`${h.checkRow} ${h.allRow}`}>
        <input
          type="checkbox"
          checked={all}
          onChange={() =>
            pick.setBooks((books) =>
              all
                ? books.filter((id) => !ids.includes(id))
                : [...books.filter((id) => !ids.includes(id)), ...ids],
            )
          }
        />
        <span>{grade} 교과서 전부</span>
        <span className={h.count}>
          {n(list.reduce((sum, book) => sum + book.count, 0))}
        </span>
      </label>
      {list.map((book) => (
        <CheckRow
          key={book.id}
          label={bookName(book)}
          sub={`자료 ${book.materials}편 · 출제 가능 ${n(book.open)}`}
          count={book.count}
          checked={pick.books.includes(book.id)}
          onChange={() => pick.setBooks((books) => toggle(books, book.id))}
        />
      ))}
    </fieldset>
  );
}

/** 필터 줄 안의 «출처» 칸 — 지금 고른 것 한 줄 + 고르기 */
function SourceField({
  text,
  opener,
  onOpen,
}: {
  text: string;
  opener: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
}) {
  return (
    <div className={h.sourceField}>
      <button
        ref={opener}
        type="button"
        className={h.sourceButton}
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        <span className={h.sourceLabel}>출처</span>
        <span className={h.sourceValue}>{text}</span>
        <span className={h.sourceAction}>고르기</span>
      </button>
    </div>
  );
}

function Chips({
  items,
}: {
  items: Array<{ label: string; value: string; onRemove?: () => void }>;
}) {
  return (
    <div
      className={styles.filterSummary}
      role="group"
      aria-label="적용한 검색 조건"
    >
      {items.map(({ label, value, onRemove }) => (
        <button
          key={label + value}
          type="button"
          className={styles.filterChip}
          onClick={onRemove}
          aria-label={`${label} ${value} 조건 지우기`}
        >
          <span className={styles.chipLabel}>{label}</span>
          <span className={styles.chipValue}>{value}</span>
          <span aria-hidden="true">×</span>
        </button>
      ))}
    </div>
  );
}

const SEMESTER = (
  <Select
    label="학기"
    options={["전체 학기", "1학기", "2학기"]}
    value="1학기"
  />
);

/* ───────────────────────── H1 ───────────────────────── */

function H1() {
  const pick = usePick();
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("중1");
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <Variant
      no="H1"
      title="한 칸 요약 · 세 단 창"
      good="Wire Ⓑ 를 그대로 다듬었다. 필터 줄의 «출처» 선택 칸 자리에 넓은 칸 하나가 들어가 화면 높이가 그대로다. 창 안은 과목 → 책 → 자료 종류가 왼쪽에서 오른쪽으로 흐르고, 자료 종류의 수는 고른 책에 맞춰 바뀐다."
      cost="«출처» 칸이 다른 칸의 두 배 넓이라 좁은 창에서는 줄이 하나 더 생긴다. 고른 책이 여럿이면 칸에는 «외 n권»까지만 보인다."
    >
      <div className={styles.filters}>
        <TopRow>{SEMESTER}</TopRow>
        <ExtraRow withSource={false}>
          <SourceField
            opener={opener}
            onOpen={() => setOpen(true)}
            text={`교과서 · ${booksText(pick.books)} · ${kindsText(pick.kinds)}`}
          />
        </ExtraRow>
        <Chips
          items={[
            { label: "학년", value: "중1" },
            { label: "학기", value: "1학기" },
            {
              label: "교과서",
              value: booksText(pick.books),
              onRemove: () => pick.setBooks([]),
            },
            {
              label: "자료",
              value: kindsText(pick.kinds),
              onRemove: () => pick.setKinds([]),
            },
          ]}
        />
      </div>
      <ResultLine
        text={`[고르기]를 누르면 창이 열린다. 걸리는 문항 ${n(matched(pick.books, pick.kinds))}개.`}
      />
      {open ? (
        <PickerDialog
          title="교과서 고르기"
          doneLabel="적용"
          returnFocus={opener}
          onClose={() => setOpen(false)}
        >
          <div className={h.wrap}>
            <div className={h.pane}>
              <div>
                <p className={h.colTitle}>과목</p>
                <div className={h.gradeList}>
                  {HIFI_GRADES.map((g) => {
                    const picked = booksOf(g).filter((book) =>
                      pick.books.includes(book.id),
                    ).length;
                    return (
                      <button
                        key={g}
                        type="button"
                        className={h.gradeButton}
                        aria-pressed={grade === g}
                        onClick={() => setGrade(g)}
                      >
                        <span>{g}</span>
                        {picked ? (
                          <span className={h.picked}>{picked}</span>
                        ) : (
                          <span className={h.count}>{booksOf(g).length}권</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className={h.colTitle}>
                  {grade} 교과서
                  <span className={h.count}>{booksOf(grade).length}권</span>
                </p>
                <GradeBooks grade={grade} pick={pick} />
              </div>
              <div>
                <p className={h.colTitle}>자료 종류</p>
                <KindChecks pick={pick} />
              </div>
            </div>
            <Footer pick={pick} />
          </div>
        </PickerDialog>
      ) : null}
      <Cards />
    </Variant>
  );
}

/* ───────────────────────── H2 ───────────────────────── */

const SOURCE_TABS = [
  { label: "전체", count: HIFI_SOURCES.reduce((s, x) => s + x.count, 0) },
  ...HIFI_SOURCES.filter((s) => ["엔진", "교과서", "기출"].includes(s.label)),
  {
    label: "그 밖",
    count: HIFI_SOURCES.filter(
      (s) => !["엔진", "교과서", "기출"].includes(s.label),
    ).reduce((sum, s) => sum + s.count, 0),
  },
];

function H2() {
  const pick = usePick();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("교과서");
  const [grade, setGrade] = useState("중1");
  const opener = useRef<HTMLButtonElement>(null);
  const chosen = pick.books
    .map((id) => BOOK.get(id))
    .filter((b): b is HifiBook => !!b);
  return (
    <Variant
      no="H2"
      title="요약 카드 · 출처부터"
      good="개념 백지의 «단원 고르기»와 같은 꼴(요약 카드 → 창)이라 손이 이미 안다. 카드에 고른 책 이름이 줄마다 다 보인다. 창 맨 위에서 출처(엔진 · 교과서 · 기출)를 먼저 고르고, 교과서일 때만 책 · 자료 종류가 펼쳐진다 — 출처 선택 칸이 없어진다."
      cost="필터 아래에 카드 한 장(두세 줄)만큼 화면이 내려간다. 출처가 «교과서»가 아닐 때도 카드가 자리를 차지한다."
    >
      <div className={styles.filters}>
        <TopRow>{SEMESTER}</TopRow>
        <ExtraRow withSource={false} />
        <button
          ref={opener}
          type="button"
          className={h.summaryCard}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <span className={h.summaryHead}>
            출처 · {source}
            {source === "교과서" ? (
              <span>
                {pick.books.length ? `${pick.books.length}권` : "책 전부"} ·{" "}
                {pick.kinds.length
                  ? `자료 ${pick.kinds.length}종`
                  : "자료 전부"}{" "}
                · {n(matched(pick.books, pick.kinds))}문항
              </span>
            ) : null}
          </span>
          <span className={h.summaryLines}>
            {source !== "교과서"
              ? "책 · 자료 종류는 교과서에만 있다."
              : chosen.length
                ? chosen
                    .slice(0, 3)
                    .map((b) => `${b.grade} ${bookName(b)}`)
                    .join(" / ") +
                  (chosen.length > 3 ? ` 외 ${chosen.length - 3}권` : "")
                : "교과서 전부"}
            {source === "교과서" && pick.kinds.length
              ? ` — ${pick.kinds.join(" · ")}`
              : ""}
          </span>
          <span className={h.summaryAction}>
            선택 변경 <span aria-hidden="true">↗</span>
          </span>
        </button>
        <Chips
          items={[
            { label: "학년", value: "중1" },
            { label: "학기", value: "1학기" },
            { label: "출처", value: source },
          ]}
        />
      </div>
      <ResultLine text="카드를 누르면 창이 열린다. 칩에는 출처까지만 적고, 책 · 자료 종류는 카드가 맡는다." />
      {open ? (
        <PickerDialog
          title="출처 고르기"
          doneLabel="적용"
          returnFocus={opener}
          onClose={() => setOpen(false)}
        >
          <div className={h.wrap}>
            <div>
              <div className={h.segments} role="group" aria-label="출처">
                {SOURCE_TABS.map(({ label, count }) => (
                  <button
                    key={label}
                    type="button"
                    className={h.segment}
                    aria-pressed={source === label}
                    onClick={() => setSource(label)}
                  >
                    {label} <span className={h.count}>{n(count)}</span>
                  </button>
                ))}
              </div>
              {source === "교과서" ? (
                <>
                  <div className={h.tabs} role="tablist" aria-label="과목">
                    {HIFI_GRADES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        role="tab"
                        className={h.tab}
                        aria-selected={grade === g}
                        onClick={() => setGrade(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <div className={h.section}>
                    <p className={h.colTitle}>
                      {grade} 교과서
                      <span className={h.count}>{booksOf(grade).length}권</span>
                    </p>
                    <div className={h.bookGrid}>
                      {booksOf(grade).map((book) => (
                        <CheckRow
                          key={book.id}
                          label={bookName(book)}
                          sub={`자료 ${book.materials}편`}
                          count={book.count}
                          checked={pick.books.includes(book.id)}
                          onChange={() =>
                            pick.setBooks((books) => toggle(books, book.id))
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div className={h.section}>
                    <p className={h.colTitle}>자료 종류</p>
                    <div
                      className={h.toggles}
                      role="group"
                      aria-label="자료 종류"
                    >
                      {HIFI_KINDS.map(({ kind }) => {
                        const count = kindCount(pick.books, kind);
                        return (
                          <button
                            key={kind}
                            type="button"
                            className={`${h.toggle} ${count === 0 ? h.zero : ""}`}
                            aria-pressed={pick.kinds.includes(kind)}
                            onClick={() =>
                              pick.setKinds((list) => toggle(list, kind))
                            }
                          >
                            {kind} <span className={h.count}>{n(count)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className={h.section}>
                  <p className={h.muted}>
                    {source} 문항은 책 · 자료 종류가 없다. [적용]을 누르면
                    출처만 걸린다.
                  </p>
                </div>
              )}
            </div>
            {source === "교과서" ? <Footer pick={pick} /> : null}
          </div>
        </PickerDialog>
      ) : null}
      <Cards />
    </Variant>
  );
}

/* ───────────────────────── H3 ───────────────────────── */

function H3() {
  const pick = usePick();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <Variant
      no="H3"
      title="칩이 곧 요약 · 한 목록 창"
      good="고른 책 · 자료 종류가 «적용한 검색 조건»에 하나씩 칩으로 선다 — 무엇이 걸렸는지 창을 안 열고 읽고, 하나만 빼려면 그 칩의 ×. 창 안은 과목을 오가는 단추 없이 한 목록을 내려 읽는다(과목 머리가 위에 붙는다). 자료 종류는 오른쪽에 붙어 있어 책을 내려도 안 사라진다."
      cost="책을 많이 고르면 칩 줄이 두세 줄로 는다. 창 안 목록이 길다(책 35권 — 과목 여덟 묶음)."
    >
      <div className={styles.filters}>
        <TopRow>{SEMESTER}</TopRow>
        <ExtraRow withSource={false}>
          <div
            className={`${styles.filterField} ${styles.rangeField}`}
            style={{ flexGrow: 2, width: 260 }}
          >
            <button
              ref={opener}
              type="button"
              className={styles.rangeButton}
              aria-haspopup="dialog"
              onClick={() => setOpen(true)}
            >
              <span>
                교과서 {pick.books.length ? `${pick.books.length}권` : "전부"}
                {pick.kinds.length ? ` · 자료 ${pick.kinds.length}종` : ""}
              </span>
              <span className={styles.chevronDown}>
                <Chevron />
              </span>
            </button>
          </div>
        </ExtraRow>
        <Chips
          items={[
            { label: "학년", value: "중1" },
            { label: "학기", value: "1학기" },
            ...pick.books.map((id) => {
              const book = BOOK.get(id);
              return {
                label: book?.grade ?? "",
                value: book ? bookName(book) : id,
                onRemove: () => pick.setBooks((list) => toggle(list, id)),
              };
            }),
            ...pick.kinds.map((kind) => ({
              label: "자료",
              value: kind,
              onRemove: () => pick.setKinds((list) => toggle(list, kind)),
            })),
          ]}
        />
      </div>
      <ResultLine
        text={`칩의 ×를 누르면 그것 하나만 빠진다(눌러 볼 수 있다). 걸리는 문항 ${n(matched(pick.books, pick.kinds))}개.`}
      />
      {open ? (
        <PickerDialog
          title="교과서 고르기"
          doneLabel="적용"
          returnFocus={opener}
          onClose={() => setOpen(false)}
        >
          <div className={h.wrap}>
            <div className={h.split}>
              <div>
                {HIFI_GRADES.map((grade) => (
                  <div key={grade}>
                    <p className={h.groupHead}>
                      {grade}
                      <span className={h.count}>{booksOf(grade).length}권</span>
                    </p>
                    <GradeBooks grade={grade} pick={pick} />
                  </div>
                ))}
              </div>
              <div className={h.stickyCol}>
                <p className={h.colTitle}>자료 종류</p>
                <KindChecks pick={pick} />
              </div>
            </div>
            <Footer pick={pick} />
          </div>
        </PickerDialog>
      ) : null}
      <Cards />
    </Variant>
  );
}

/* ───────────────────────── H4 ───────────────────────── */

function H4() {
  const pick = usePick();
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("중1");
  const opener = useRef<HTMLButtonElement>(null);
  const list = booksOf(grade);
  return (
    <Variant
      no="H4"
      title="책 × 자료 종류 표"
      good="어느 책에 어떤 자료가 몇 문항 있는지 한 표로 보인다 — «이 책에는 서술형 평가가 없다»를 고르기 전에 안다. 줄(책)과 열(자료 종류)을 체크하면 겹치는 칸이 파랗게 칠해지고 그 합이 아래 수다."
      cost="열이 열셋이라 창 안에서 옆으로 밀어야 한다(폰에서는 더). 표를 읽는 품이 든다."
    >
      <div className={styles.filters}>
        <TopRow>{SEMESTER}</TopRow>
        <ExtraRow withSource={false}>
          <SourceField
            opener={opener}
            onOpen={() => setOpen(true)}
            text={`교과서 · ${booksText(pick.books)} · ${kindsText(pick.kinds)} · ${n(matched(pick.books, pick.kinds))}문항`}
          />
        </ExtraRow>
        <Chips
          items={[
            { label: "학년", value: "중1" },
            { label: "학기", value: "1학기" },
            {
              label: "교과서",
              value: booksText(pick.books),
              onRemove: () => pick.setBooks([]),
            },
            {
              label: "자료",
              value: kindsText(pick.kinds),
              onRemove: () => pick.setKinds([]),
            },
          ]}
        />
      </div>
      <ResultLine text="칸 끝에 걸리는 문항 수가 붙는다. [고르기]로 표가 열린다." />
      {open ? (
        <PickerDialog
          title="교과서 고르기"
          doneLabel="적용"
          returnFocus={opener}
          onClose={() => setOpen(false)}
        >
          <div className={h.wrap}>
            <div>
              <div className={h.tabs} role="tablist" aria-label="과목">
                {HIFI_GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="tab"
                    className={h.tab}
                    aria-selected={grade === g}
                    onClick={() => setGrade(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className={h.matrixWrap}>
                <table className={h.matrix}>
                  <thead>
                    <tr>
                      <th scope="col">{grade} 교과서</th>
                      {HIFI_KINDS.map(({ kind }) => (
                        <th key={kind} scope="col">
                          <label>
                            {kind}
                            <input
                              type="checkbox"
                              checked={pick.kinds.includes(kind)}
                              onChange={() =>
                                pick.setKinds((kinds) => toggle(kinds, kind))
                              }
                            />
                          </label>
                        </th>
                      ))}
                      <th scope="col">합</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((book) => {
                      const rowOn = pick.books.includes(book.id);
                      return (
                        <tr key={book.id}>
                          <th scope="row">
                            <label>
                              <input
                                type="checkbox"
                                checked={rowOn}
                                onChange={() =>
                                  pick.setBooks((books) =>
                                    toggle(books, book.id),
                                  )
                                }
                              />
                              {bookName(book)}
                            </label>
                          </th>
                          {HIFI_KINDS.map(({ kind }) => {
                            const value = book.kinds[kind] ?? 0;
                            const on =
                              rowOn &&
                              (pick.kinds.length === 0 ||
                                pick.kinds.includes(kind));
                            return (
                              <td
                                key={kind}
                                className={
                                  value === 0
                                    ? h.cellNone
                                    : on
                                      ? h.cellOn
                                      : undefined
                                }
                              >
                                {value === 0 ? "·" : n(value)}
                              </td>
                            );
                          })}
                          <td>{n(book.count)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <Footer pick={pick} />
          </div>
        </PickerDialog>
      ) : null}
      <Cards />
    </Variant>
  );
}

/* ───────────────────────── H5 ───────────────────────── */

/** 출판사 · 저자 한 묶음 — 학교는 보통 한 저자의 책을 학년마다 이어 쓴다 */
const SERIES = Array.from(
  HIFI_BOOKS.reduce((map, book) => {
    const key = bookName(book);
    map.set(key, [...(map.get(key) ?? []), book]);
    return map;
  }, new Map<string, HifiBook[]>()),
).sort(
  (a, b) =>
    b[1].reduce((s, x) => s + x.count, 0) -
    a[1].reduce((s, x) => s + x.count, 0),
);

function H5() {
  const pick = usePick();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const seriesText = () => {
    const names = SERIES.filter(([, books]) =>
      books.some((book) => pick.books.includes(book.id)),
    ).map(([name, books]) => {
      const grades = books
        .filter((book) => pick.books.includes(book.id))
        .map((book) => book.grade);
      return `${name.replace(" · ", "(")}) ${grades.join(" · ")}`;
    });
    if (!names.length) return "교과서 전부";
    return names.length > 1 ? `${names[0]} 외 ${names.length - 1}` : names[0];
  };
  return (
    <Variant
      no="H5"
      title="출판사 · 저자로 묶기"
      good="학교는 한 저자의 책을 학년마다 이어 쓴다 — «천재교육 · 김화경»을 한 번 체크하면 중1 · 중2 가 같이 걸린다. 창이 «우리 학교 교과서»의 말로 짜여 있다. 자료 종류는 아래 단추 줄."
      cost="과목으로 찾는 손(«중2 교과서 다 보여 줘»)은 위 학년 칸에 맡긴다 — 창 안에 과목 단추가 없다. 묶음 카드가 열하나(책이 많은 묶음은 일곱 과목)라 창을 내려야 자료 종류까지 보인다."
    >
      <div className={styles.filters}>
        <TopRow grade="">{SEMESTER}</TopRow>
        <ExtraRow withSource={false}>
          <SourceField
            opener={opener}
            onOpen={() => setOpen(true)}
            text={`교과서 · ${seriesText()} · ${kindsText(pick.kinds)}`}
          />
        </ExtraRow>
        <Chips
          items={[
            { label: "학기", value: "1학기" },
            {
              label: "교과서",
              value: seriesText(),
              onRemove: () => pick.setBooks([]),
            },
            {
              label: "자료",
              value: kindsText(pick.kinds),
              onRemove: () => pick.setKinds([]),
            },
          ]}
        />
      </div>
      <ResultLine
        text={`묶음을 고르면 학년 칸은 «전체 학년»으로 둔다(칩에서 학년이 빠진다). 걸리는 문항 ${n(matched(pick.books, pick.kinds))}개.`}
      />
      {open ? (
        <PickerDialog
          title="교과서 고르기"
          doneLabel="적용"
          returnFocus={opener}
          onClose={() => setOpen(false)}
        >
          <div className={h.wrap}>
            <div>
              <div className={h.section}>
                <p className={h.colTitle}>
                  출판사 · 저자
                  <span className={h.count}>{SERIES.length}묶음</span>
                </p>
                <div className={h.series}>
                  {SERIES.map(([name, books]) => {
                    const ids = books.map((book) => book.id);
                    const all = ids.every((id) => pick.books.includes(id));
                    return (
                      <div key={name} className={h.seriesCard}>
                        <label className={h.seriesHead}>
                          <input
                            type="checkbox"
                            checked={all}
                            onChange={() =>
                              pick.setBooks((list) =>
                                all
                                  ? list.filter((id) => !ids.includes(id))
                                  : [
                                      ...list.filter((id) => !ids.includes(id)),
                                      ...ids,
                                    ],
                              )
                            }
                          />
                          <span>{name}</span>
                          <span className={h.count}>
                            {n(books.reduce((s, b) => s + b.count, 0))}
                          </span>
                        </label>
                        <div className={h.seriesBooks}>
                          {books.map((book) => (
                            <label key={book.id}>
                              <input
                                type="checkbox"
                                checked={pick.books.includes(book.id)}
                                onChange={() =>
                                  pick.setBooks((list) => toggle(list, book.id))
                                }
                              />
                              {book.grade}
                              <span className={h.count}>{n(book.count)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className={h.section}>
                <p className={h.colTitle}>자료 종류</p>
                <div className={h.toggles} role="group" aria-label="자료 종류">
                  {HIFI_KINDS.map(({ kind }) => {
                    const count = kindCount(pick.books, kind);
                    return (
                      <button
                        key={kind}
                        type="button"
                        className={`${h.toggle} ${count === 0 ? h.zero : ""}`}
                        aria-pressed={pick.kinds.includes(kind)}
                        onClick={() =>
                          pick.setKinds((list) => toggle(list, kind))
                        }
                      >
                        {kind} <span className={h.count}>{n(count)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <Footer pick={pick} />
          </div>
        </PickerDialog>
      ) : null}
      <Cards />
    </Variant>
  );
}

export function BankSourceHifiClient() {
  return (
    <main
      className={styles.bank}
      style={{ maxWidth: 1360, margin: "0 auto", padding: "24px 24px 80px" }}
    >
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
          문제은행 — 교과서 문항 거르기 (Hi-fi 5안 · Wire Ⓑ 고르기 창)
        </h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
          교과서 문항 {n(HIFI_TOTAL)}개 · 책 {HIFI_BOOKS.length}권(과목 · 출판사
          · 저자) · 자료 종류 {HIFI_KINDS.length}개. 다섯 안 모두 화면에는 «지금
          고른 것»과 단추 하나만 두고, 긴 목록은 공용 고르기 창에서 고른다. 다른
          것은 ⑴ 화면에 고른 것을 적는 꼴 ⑵ 창 안에 책을 늘어놓는 꼴이다.
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "var(--bank-muted)",
          }}
        >
          수는 지금 문제은행에서 센 값이다. 창 안의 체크와 칩의 ×는 실제로
          움직인다(걸리는 문항 수가 따라 바뀐다). 아래 카드 목록은 고른 것을
          따르지 않는 그림이다.
        </p>
      </header>
      <H1 />
      <H2 />
      <H3 />
      <H4 />
      <H5 />
    </main>
  );
}
