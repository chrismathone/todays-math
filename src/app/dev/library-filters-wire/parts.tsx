"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import lib from "@/components/unified/PrivateLibrary.module.css";
import o from "@/components/unified/print/OutputExtras.module.css";
import wr from "@/components/unified/Workroom.module.css";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import Icon from "@/components/unified/WorkspaceIcon";
import {
  DOCUMENT_KINDS,
  documentKindLabel,
  type DocumentKind,
} from "@/contracts/privateWorkspace.contract";
import {
  SHEET_TAGS,
  isTaggableKind,
  type SheetTag,
} from "@/contracts/sheetTag.contract";
import type { DocumentWorkflow } from "@/contracts/workspaceWorkflow.contract";

import { COLLEAGUE, ME, WIRE_ROWS, type WireRow } from "./fixtures";
import p from "./parts.module.css";

/**
 * 내 자료 거르기 줄 시안(Wire · Hi-fi)이 같이 쓰는 것 — 거르기 · 수 세기 규칙, 틀과 자, 목록 그림, 맨 위 표 · 선택 단추.
 * 거르기 · 수 세기는 `PrivateLibrary.tsx` 를 옮겼다(권한 · 로딩 · 실패 · 사본은 그리지 않는다).
 */

export type KindFilter = DocumentKind | "all";
export type TagFilter = SheetTag | "none" | null;
export type Sort = "newest" | "name" | "count";
export type Scope = "all" | "mine" | "working";
export type Screen = "1536" | "1280" | "1024";

export const SCREENS: Record<Screen, { main: number; side: number }> = {
  "1536": { main: 1296, side: 240 },
  "1280": { main: 1040, side: 240 },
  "1024": { main: 812, side: 212 },
};
/** 1536 × 864 화면(125%)에서 작업 표시줄 · 브라우저 머리를 뺀 안쪽 높이 — 가정이다. */
export const PC_HEIGHT = 740;
const PHONE = { width: 390, height: 844, nav: 77 };

const STAGE_LABEL: Record<DocumentWorkflow["step"], string> = {
  import: "원본 가져오기",
  crop: "문제 잘라내기",
  scope: "1 범위 설정",
  review: "2 문항 검토",
  output: "3 양식 구성·출력",
};

export const taggableView = (kind: KindFilter) =>
  kind === "all" || isTaggableKind(kind);
const tagMatches = (row: WireRow, tag: TagFilter) =>
  tag === null
    ? true
    : tag === "none"
      ? isTaggableKind(row.kind) && !row.tag
      : row.tag === tag;
/** `PrivateLibrary.tsx` 의 `isWorkingDocument` × `owned` — 출력 단계에서 저장한 연산 연습지는 작업 중이 아니다. */
const isMyWork = (row: WireRow) =>
  Boolean(row.step) &&
  !(row.kind === "arithmeticSheet" && row.step === "output") &&
  row.owner === "me";
export const tagName = (tag: SheetTag | "none") =>
  tag === "none" ? "태그 없음" : tag;
export const PAUSED_REASON =
  "태그는 시험지 · 연산 연습지에만 있습니다. 그 종류를 고르면 다시 걸립니다.";

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export type FilterStart = {
  kind?: KindFilter;
  tag?: TagFilter;
  scope?: Scope;
  sort?: Sort;
  query?: string;
};

export function useFilters(
  branch: boolean,
  start: FilterStart = {},
  rows: readonly WireRow[] = WIRE_ROWS,
) {
  const [query, setQuery] = useState(start.query ?? "");
  const [kind, setKind] = useState<KindFilter>(start.kind ?? "all");
  const [tag, setTag] = useState<TagFilter>(start.tag ?? null);
  const [workingOnly, setWorkingOnly] = useState(start.scope === "working");
  const [mineOnly, setMineOnly] = useState(
    branch && (start.scope === "mine" || start.scope === "working"),
  );
  const [sort, setSort] = useState<Sort>(start.sort ?? "newest");
  // 서버가 주는 목록 — 학원 소속이 아니면 늘 내 자료만(`client.library(…, !branchId || mineOnly)`).
  const items = rows.filter(
    (row) => (branch && !mineOnly) || row.owner === "me",
  );
  const tagFor = (view: KindFilter) => (taggableView(view) ? tag : null);
  const activeTag = tagFor(kind);
  const q = query.trim().toLocaleLowerCase();
  const searched = items.filter((row) =>
    row.title.toLocaleLowerCase().includes(q),
  );
  const base = workingOnly ? searched.filter(isMyWork) : searched;
  const kindCounts = Object.fromEntries(
    DOCUMENT_KINDS.map((entry) => [entry.id, 0]),
  ) as Record<DocumentKind, number>;
  for (const row of base)
    if (tagMatches(row, tagFor(row.kind))) kindCounts[row.kind] += 1;
  const allCount = base.filter((row) => tagMatches(row, tagFor("all"))).length;
  const workingCount = searched.filter(
    (row) =>
      (kind === "all" || row.kind === kind) &&
      tagMatches(row, activeTag) &&
      isMyWork(row),
  ).length;
  const ofKind = base.filter((row) => kind === "all" || row.kind === kind);
  const tagCounts = Object.fromEntries(
    SHEET_TAGS.map((entry) => [entry, 0]),
  ) as Record<SheetTag, number>;
  for (const row of ofKind) if (row.tag) tagCounts[row.tag] += 1;
  const noneCount = ofKind.filter((row) => tagMatches(row, "none")).length;
  const filtered = ofKind
    .filter((row) => tagMatches(row, activeTag))
    .sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title, "ko");
      if (sort === "count" && a.problemCount !== b.problemCount)
        return b.problemCount - a.problemCount;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  return {
    branch,
    query,
    setQuery,
    kind,
    setKind,
    tag,
    setTag,
    activeTag,
    workingOnly,
    setWorkingOnly,
    mineOnly,
    setMineOnly,
    sort,
    setSort,
    scope: (workingOnly ? "working" : mineOnly ? "mine" : "all") as Scope,
    /**
     * C안의 «보기» — 새 동작이다(무손실 치환이 아니다). «내 작업 중만»을 고르면 내 자료만 받아 온다(작업 중은 내 것만 센다).
     * 지금의 두 체크와 달리 작업 중을 풀 때 «내 자료만»이 남아 있지 않고 범위를 다시 고른다.
     */
    setScope(next: Scope) {
      setWorkingOnly(next === "working");
      setMineOnly(branch && next !== "all");
    },
    items,
    kindCounts,
    allCount,
    workingCount,
    tagCounts,
    noneCount,
    filtered,
    hasFilters:
      Boolean(q) ||
      kind !== "all" ||
      mineOnly ||
      workingOnly ||
      activeTag !== null,
    reset() {
      setQuery("");
      setKind("all");
      setTag(null);
      setWorkingOnly(false);
      setMineOnly(false);
    },
  };
}
export type F = ReturnType<typeof useFilters>;

/* ───────────── 목록 그림 — 실제 PrivateLibrary 의 CSS 그대로 ───────────── */

export function LibraryMock({
  f,
  bar,
  resultLine,
  emptyHint = "자료 이름이나 종류 · 태그를 바꿔 다시 찾아보세요.",
}: {
  f: F;
  bar: ReactNode;
  /** «저장한 자료 N개 · 검색 결과 M개» 줄 — 결과 수를 거르기 줄 끝에 두면 없다. */
  resultLine: boolean;
  /** 거른 결과가 비었을 때의 안내 — Hi-fi 는 «보기»도 적는다(Codex ④). */
  emptyHint?: string;
}) {
  return (
    <main className={lib.library}>
      <WorkspacePageHeader
        title="내 자료"
        description={
          f.branch
            ? "내 자료와 같은 학원 선생님들이 공개한 자료를 함께 볼 수 있습니다."
            : "내 계정에 저장한 시험지와 추출 자료를 어느 기기에서든 이어서 작업하세요."
        }
      >
        <button type="button">작업 파일 불러오기</button>
        <button type="button">새 시험지</button>
      </WorkspacePageHeader>
      {bar}
      {f.workingOnly && (
        <p className={lib.note}>
          진행 단계가 기록된 내 자료입니다. ‘이어서 작업’은 기록된 단계로
          엽니다.
        </p>
      )}
      {resultLine && (
        <p className={lib.resultCount}>
          저장한 자료 <strong>{f.items.length}</strong>개
          {f.hasFilters && (
            <>
              {" "}
              · 검색 결과 <strong>{f.filtered.length}</strong>개
            </>
          )}
        </p>
      )}
      <div className={lib.board} data-board>
        {f.filtered.length ? (
          <table className={lib.table} aria-label="저장한 자료 목록(그림)">
            <thead>
              <tr>
                <th scope="col" className={lib.numberCell}>
                  번호
                </th>
                <th scope="col" className={lib.kindCell}>
                  종류
                </th>
                <th scope="col" className={lib.titleCell}>
                  자료 이름
                </th>
                <th scope="col" className={lib.countCell}>
                  문항 수
                </th>
                <th scope="col" className={lib.updatedCell}>
                  최근 수정
                </th>
                <th scope="col" className={lib.actionsCell}>
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {f.filtered.slice(0, 40).map((row, index) => (
                <tr key={row.id} data-row>
                  <td className={lib.numberCell}>{index + 1}</td>
                  <td className={lib.kindCell}>
                    <span className={o.kindStack}>
                      <span className={lib.kindBadge} data-kind={row.kind}>
                        {documentKindLabel(row.kind)}
                      </span>
                      {row.tag && <span className={o.tagBadge}>{row.tag}</span>}
                    </span>
                  </td>
                  <td className={lib.titleCell}>
                    <button type="button" className={lib.titleButton}>
                      {row.title}
                    </button>
                    {row.step && (
                      <div className={lib.progressLine}>
                        <span>{STAGE_LABEL[row.step]}</span>
                        {isMyWork(row) && (
                          <button type="button">
                            이어서 작업 <Icon name="arrow" size={14} />
                          </button>
                        )}
                      </div>
                    )}
                    <small>
                      작성자: {row.owner === "me" ? `${ME} (나)` : COLLEAGUE}
                      {f.branch ? " · 학원에 공개" : ""}
                      {row.owner === "me" ? "" : " · 사본으로 열기"}
                    </small>
                  </td>
                  <td className={lib.countCell}>
                    {row.problemCount}
                    <span className={lib.mobileLabel}>문항</span>
                  </td>
                  <td className={lib.updatedCell}>
                    <span className={lib.mobileLabel}>수정 </span>
                    <time dateTime={row.updatedAt}>
                      {dateFormat.format(new Date(row.updatedAt))}
                    </time>
                  </td>
                  <td className={lib.actionsCell}>
                    <div className={lib.actions}>
                      <button type="button" aria-label={`${row.title} 정보`}>
                        <Icon name="info" />
                      </button>
                      <button type="button" aria-label={`${row.title} 수정`}>
                        <Icon name="edit" />
                      </button>
                      {row.owner === "me" && (
                        <button type="button" aria-label={`${row.title} 삭제`}>
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={lib.empty}>
            <h2>조건에 맞는 자료가 없습니다</h2>
            <p>{emptyHint}</p>
            <button type="button" onClick={f.reset}>
              검색 조건 초기화
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

/* ───────────── 틀과 자 — 폭은 제품 CSS 에서, 높이는 가정 ───────────── */

export type Measure = {
  /** 머리(제목 · 설명 · 단추) 아래부터 목록(표) 위까지 */
  gap: number;
  /** 거르기 조작이 놓인 줄 수 */
  lines: number;
  /** 아래 끝이 첫 화면 높이 안에 드는 자료 행 수 */
  rows: number;
};

function measure(frame: HTMLElement, visibleHeight: number): Measure | null {
  const header = frame.querySelector("[data-workspace-page-header]");
  const board = frame.querySelector("[data-board]");
  const bar = frame.querySelector("[data-bar]");
  if (!header || !board || !bar) return null;
  const top = frame.getBoundingClientRect().top;
  const gap = Math.round(
    board.getBoundingClientRect().top - header.getBoundingClientRect().bottom,
  );
  const middles = [...bar.querySelectorAll("[data-ctl]")]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0)
    .map((rect) => rect.top + rect.height / 2)
    .sort((a, b) => a - b);
  let lines = 0;
  let last = -Infinity;
  for (const middle of middles) {
    if (middle - last > 16) lines += 1;
    last = middle;
  }
  const rows = [...frame.querySelectorAll("[data-row]")].filter(
    (row) => row.getBoundingClientRect().bottom - top <= visibleHeight,
  ).length;
  return { gap, lines, rows };
}

function useMeasure(visibleHeight: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<Measure | null>(null);
  useLayoutEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const update = () => {
      const next = measure(frame, visibleHeight);
      setValue((previous) =>
        previous &&
        next &&
        previous.gap === next.gap &&
        previous.lines === next.lines &&
        previous.rows === next.rows
          ? previous
          : next,
      );
    };
    update();
    const resize = new ResizeObserver(update);
    const main = frame.querySelector("main");
    if (main) resize.observe(main);
    const mutations = new MutationObserver(update);
    mutations.observe(frame, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    void document.fonts?.ready.then(update);
    return () => {
      resize.disconnect();
      mutations.disconnect();
    };
  }, [visibleHeight]);
  return [ref, value] as const;
}

function MeasureLine({ value }: { value: Measure | null }) {
  if (!value) return <span className={p.measure}>재는 중…</span>;
  return (
    <span className={p.measure}>
      머리 아래 ~ 목록 위 <b>{value.gap}px</b> · 거르기 <b>{value.lines}줄</b> ·
      첫 화면 안 자료 <b>{value.rows}행</b>
    </span>
  );
}

/** 틀마다 잰 값을 맨 위 «잰 값 한눈에» 표로 올린다 — 열쇠는 «안:틀»(예: «C:pc»). */
const MeasureReport = createContext<
  (key: string, value: Measure | null) => void
>(() => undefined);

function useReport(key: string, value: Measure | null) {
  const report = useContext(MeasureReport);
  useEffect(() => report(key, value), [report, key, value]);
}

/** 맨 위 표가 읽는 잰 값 — 틀이 올린다. */
export function MeasureStore({
  children,
}: {
  children: (measures: Record<string, Measure | null>) => ReactNode;
}) {
  const [measures, setMeasures] = useState<Record<string, Measure | null>>({});
  const report = useCallback(
    (key: string, value: Measure | null) =>
      setMeasures((previous) =>
        previous[key] === value ? previous : { ...previous, [key]: value },
      ),
    [],
  );
  return (
    <MeasureReport.Provider value={report}>
      {children(measures)}
    </MeasureReport.Provider>
  );
}

export function PcFrame({
  id,
  screen,
  children,
}: {
  id: string;
  screen: Screen;
  children: ReactNode;
}) {
  const [ref, value] = useMeasure(PC_HEIGHT);
  useReport(`${id}:pc`, value);
  const { main, side } = SCREENS[screen];
  return (
    <figure className={p.figure}>
      <figcaption className={p.caption}>
        <span>
          PC {screen} 화면 — 본문 {main}px(옆 메뉴 {side} 뺌) · 높이 {PC_HEIGHT}
          px(가정)
        </span>
        <MeasureLine value={value} />
      </figcaption>
      <div className={p.scrollX}>
        <div
          ref={ref}
          className={p.pc}
          data-screen={screen}
          style={{ width: main, height: PC_HEIGHT }}
        >
          <div className={`${wr.workspace} ${p.shell}`}>{children}</div>
        </div>
      </div>
    </figure>
  );
}

export function PhoneFrame({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const [ref, value] = useMeasure(PHONE.height - PHONE.nav);
  useReport(`${id}:phone`, value);
  return (
    <figure className={p.figure}>
      <figcaption className={`${p.caption} ${p.phoneCaption}`}>
        <span>폰 390 × 844 — 본문 358px</span>
        <MeasureLine value={value} />
      </figcaption>
      <div
        ref={ref}
        className={p.phone}
        style={{ width: PHONE.width, height: PHONE.height }}
      >
        <div className={`${wr.workspace} ${p.shell}`}>
          <div className={p.phoneTop}>
            <b>오늘 수학</b>
            <span className={p.phoneNew}>
              <Icon name="plus" size={16} /> 새로 만들기
            </span>
          </div>
          {children}
        </div>
        <div className={p.phoneNav} aria-hidden>
          {["오늘", "시험지 만들기", "내 자료", "더 보기"].map((item) => (
            <span key={item} data-on={item === "내 자료" || undefined}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/* ───────────── 맨 위 — 잰 값 표 · 선택 단추 ───────────── */

/** 맨 위 «잰 값 한눈에» — 틀마다 브라우저에서 잰 값을 그대로 옮긴다(지금 고른 PC 틀 · 폰). */
export function Summary({
  screen,
  measures,
  rows,
}: {
  screen: Screen;
  measures: Record<string, Measure | null>;
  rows: { id: string; label: string }[];
}) {
  const cell = (value: Measure | null | undefined) =>
    value ? `${value.gap}px · ${value.lines}줄 · ${value.rows}행` : "재는 중…";
  return (
    <table className={p.summary}>
      <caption>
        잰 값 한눈에 — 머리 아래 ~ 목록 위 높이 · 거르기 줄 수(조작들의 세로
        자리로 셈) · 아래 끝이 첫 화면 높이 안에 드는 자료 행 수(틀 폭이 제품과
        같아 가로로 잘리는 행은 없다)
      </caption>
      <thead>
        <tr>
          <th scope="col">안</th>
          <th scope="col">PC {screen} 화면</th>
          <th scope="col">폰 390</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <th scope="row">{row.label}</th>
            <td>{cell(measures[`${row.id}:pc`])}</td>
            <td>{cell(measures[`${row.id}:phone`])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Switch<T extends string | boolean>({
  caption,
  value,
  options,
  onChange,
}: {
  caption: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className={p.switches} role="group" aria-label={caption}>
      <span>{caption}</span>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** PC 틀 폭 단추 — 1024 · 1280 · 1536. */
export const SCREEN_OPTIONS = (Object.keys(SCREENS) as Screen[]).map((key) => ({
  value: key,
  label: `${key} 화면`,
}));

export { p as partsStyles };
