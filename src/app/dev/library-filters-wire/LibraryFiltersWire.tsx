"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
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
import w from "./LibraryFiltersWire.module.css";

/**
 * 내 자료(보관함) 거르기 줄 — Wire 5안. 지금 화면(기준) 하나와 A ~ E.
 *
 * 다섯 안이 같은 것: 종류 · 태그는 정렬과 같은 native 드롭다운(E 만 공용 고르기 창), 항목 글에 수,
 * 태그 없는 종류를 고르면 태그 칸이 «숙제 · 미적용»으로 꺼진다(돌아가면 다시 걸린다 — 지금 규칙).
 * 다른 것: 순서 · 체크 둘의 자리 · 검색칸 폭 · 좁은 화면 줄바꿈. 페이지 맨 위 선택 둘(결과 수 자리 · 드롭다운 이름)은 다섯 안에 같이 걸린다.
 * 거르기 · 수 세기 규칙은 `PrivateLibrary.tsx` 를 옮겼다(권한 · 로딩 · 실패 · 사본은 그리지 않는다).
 */

type KindFilter = DocumentKind | "all";
type TagFilter = SheetTag | "none" | null;
type Sort = "newest" | "name" | "count";
type Scope = "all" | "mine" | "working";
type Screen = "1536" | "1280" | "1024";

const SCREENS: Record<Screen, { main: number; side: number }> = {
  "1536": { main: 1296, side: 240 },
  "1280": { main: 1040, side: 240 },
  "1024": { main: 812, side: 212 },
};
/** 1536 × 864 화면(125%)에서 작업 표시줄 · 브라우저 머리를 뺀 안쪽 높이 — 가정이다. */
const PC_HEIGHT = 740;
const PHONE = { width: 390, height: 844, nav: 77 };

const STAGE_LABEL: Record<DocumentWorkflow["step"], string> = {
  import: "원본 가져오기",
  crop: "문제 잘라내기",
  scope: "1 범위 설정",
  review: "2 문항 검토",
  output: "3 양식 구성·출력",
};

const taggableView = (kind: KindFilter) =>
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

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** 페이지 맨 위 선택 — 다섯 안에 같이 걸린다. */
const WireOptions = createContext({ labels: false, countInBar: false });
/** 틀마다 잰 값을 맨 위 «잰 값 한눈에» 표로 올린다 — 열쇠는 «안:틀»(예: «C:pc»). */
const MeasureReport = createContext<
  (key: string, value: Measure | null) => void
>(() => undefined);

function useFilters(branch: boolean) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [tag, setTag] = useState<TagFilter>(null);
  const [workingOnly, setWorkingOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  // 서버가 주는 목록 — 학원 소속이 아니면 늘 내 자료만(`client.library(…, !branchId || mineOnly)`).
  const items = WIRE_ROWS.filter(
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
type F = ReturnType<typeof useFilters>;

/* ───────────── 부품 — 드롭다운 · 체크 · 찾기 · 정렬 · 새로고침 · 결과 수 ───────────── */

/** 드롭다운 한 칸 — «드롭다운 이름»을 켜면 칸 안 왼쪽에 작은 이름이 선다(누르면 그대로 드롭다운이 열린다). */
function Field({ label, children }: { label: string; children: ReactNode }) {
  const { labels } = useContext(WireOptions);
  return (
    <span className={w.field} data-labelled={labels || undefined}>
      {labels && (
        <span className={w.fieldLabel} aria-hidden>
          {label}
        </span>
      )}
      {children}
    </span>
  );
}

function KindSelect({ f }: { f: F }) {
  return (
    <Field label="종류">
      <select
        data-ctl
        aria-label="자료 종류"
        value={f.kind}
        onChange={(event) => f.setKind(event.target.value as KindFilter)}
      >
        <option value="all">전체 자료 ({f.allCount})</option>
        {DOCUMENT_KINDS.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label} ({f.kindCounts[entry.id]})
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * 태그 칸. 태그 없는 종류(추출한 자료 · 개념 백지)에서는 걸리지 않는다 — 고른 태그가 있으면 칸이 «숙제 · 미적용»으로 읽히고
 * 열면 «태그 풀기» 하나가 있다(따로 단추를 두지 않아 줄 · 칸 수가 그대로다). 고른 태그가 없으면 «태그 전체»로 꺼진다.
 * 그 종류로 돌아가면 기억한 태그가 다시 걸린다(지금 규칙).
 */
const tagName = (tag: SheetTag | "none") =>
  tag === "none" ? "태그 없음" : tag;

const PAUSED_REASON =
  "태그는 시험지 · 연산 연습지에만 있습니다. 그 종류를 고르면 다시 걸립니다.";

function TagSelect({ f }: { f: F }) {
  const reasonId = useId();
  const paused = !taggableView(f.kind);
  if (paused)
    return (
      <Field label="태그">
        <span id={reasonId} hidden>
          {PAUSED_REASON}
        </span>
        <select
          data-ctl
          data-paused
          aria-label="태그"
          aria-describedby={reasonId}
          title={PAUSED_REASON}
          value="paused"
          disabled={!f.tag}
          onChange={(event) => {
            if (event.target.value === "") f.setTag(null);
          }}
        >
          <option value="paused" disabled={Boolean(f.tag)}>
            {f.tag ? `${tagName(f.tag)} · 미적용` : "태그 전체"}
          </option>
          {f.tag && <option value="">태그 풀기</option>}
        </select>
      </Field>
    );
  return (
    <Field label="태그">
      <select
        data-ctl
        aria-label="태그"
        value={f.tag ?? ""}
        onChange={(event) =>
          f.setTag((event.target.value || null) as TagFilter)
        }
      >
        <option value="">태그 전체</option>
        {SHEET_TAGS.map((entry) => (
          <option key={entry} value={entry}>
            {entry} ({f.tagCounts[entry]})
          </option>
        ))}
        <hr />
        <option value="none">태그 없음 ({f.noneCount})</option>
      </select>
    </Field>
  );
}

function SortSelect({ f }: { f: F }) {
  return (
    <Field label="정렬">
      <select
        data-ctl
        aria-label="자료 정렬"
        value={f.sort}
        onChange={(event) => f.setSort(event.target.value as Sort)}
      >
        <option value="newest">최근 수정순</option>
        <option value="name">이름순</option>
        <option value="count">문항 많은순</option>
      </select>
    </Field>
  );
}

function ScopeSelect({ f }: { f: F }) {
  return (
    <Field label="보기">
      <select
        data-ctl
        aria-label="보기 범위"
        value={f.scope}
        onChange={(event) => f.setScope(event.target.value as Scope)}
      >
        <option value="all">
          {f.branch ? "학원 자료 전체" : "내 자료 전체"}
        </option>
        {f.branch && <option value="mine">내 자료만</option>}
        <option value="working">내 작업 중만 ({f.workingCount})</option>
      </select>
    </Field>
  );
}

function WorkingCheck({ f, ctl = true }: { f: F; ctl?: boolean }) {
  return (
    <label className={lib.toggle} data-ctl={ctl || undefined}>
      <input
        type="checkbox"
        checked={f.workingOnly}
        onChange={(event) => f.setWorkingOnly(event.target.checked)}
      />
      내 작업 중만 <span>({f.workingCount})</span>
    </label>
  );
}

function MineCheck({ f, ctl = true }: { f: F; ctl?: boolean }) {
  if (!f.branch) return null;
  return (
    <label className={lib.toggle} data-ctl={ctl || undefined}>
      <input
        type="checkbox"
        checked={f.mineOnly}
        onChange={(event) => f.setMineOnly(event.target.checked)}
      />
      내 자료만 보기
    </label>
  );
}

/** D안 — 체크 대신 눌림 단추(드롭다운과 같은 44px 상자). */
function WorkingPress({ f }: { f: F }) {
  return (
    <button
      type="button"
      data-ctl
      className={w.press}
      aria-pressed={f.workingOnly}
      onClick={() => f.setWorkingOnly(!f.workingOnly)}
    >
      내 작업 중 <span>({f.workingCount})</span>
    </button>
  );
}

function MinePress({ f }: { f: F }) {
  if (!f.branch) return null;
  return (
    <button
      type="button"
      data-ctl
      className={w.press}
      aria-pressed={f.mineOnly}
      onClick={() => f.setMineOnly(!f.mineOnly)}
    >
      내 자료만
    </button>
  );
}

function Search({ f, className }: { f: F; className: string }) {
  return (
    <input
      data-ctl
      className={className}
      type="search"
      aria-label="저장한 자료 검색"
      placeholder="자료 이름으로 찾기"
      value={f.query}
      onChange={(event) => f.setQuery(event.target.value)}
    />
  );
}

function Refresh() {
  return (
    <button type="button" data-ctl>
      새로고침
    </button>
  );
}

/** 페이지 맨 위 «결과 수: 거르기 줄 끝에»를 고르면 줄 끝에 선다(따로 선 결과 수 줄은 없어진다). */
function InlineCount({ f }: { f: F }) {
  const { countInBar } = useContext(WireOptions);
  if (!countInBar) return null;
  return (
    <p className={w.inlineCount} aria-live="polite" data-ctl>
      {f.hasFilters ? (
        <>
          {f.items.length}개 중 <strong>{f.filtered.length}</strong>개
        </>
      ) : (
        <>
          <strong>{f.items.length}</strong>개
        </>
      )}
    </p>
  );
}

/* ───────────── 지금 화면(기준) — PrivateLibrary.tsx 389 ~ 490줄 그대로 ───────────── */

function KindChips({ f, ctl }: { f: F; ctl: boolean }) {
  return (
    <div className={lib.kindTabs} role="group" aria-label="자료 종류별 보기">
      <button
        type="button"
        data-ctl={ctl || undefined}
        aria-pressed={f.kind === "all"}
        onClick={() => f.setKind("all")}
      >
        전체 자료 <span>{f.allCount}</span>
      </button>
      {DOCUMENT_KINDS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          data-ctl={ctl || undefined}
          aria-pressed={f.kind === entry.id}
          onClick={() => f.setKind(entry.id)}
        >
          {entry.label} <span>{f.kindCounts[entry.id]}</span>
        </button>
      ))}
    </div>
  );
}

function TagChips({
  f,
  ctl,
  release = false,
}: {
  f: F;
  ctl: boolean;
  /** E 의 고르기 창 — 접힌 안내 옆에 [태그 풀기]. 지금 화면(기준)에는 없다. */
  release?: boolean;
}) {
  if (!taggableView(f.kind))
    return (
      <div className={w.folded}>
        <p className={o.tagFolded} data-ctl={ctl || undefined}>
          {f.tag
            ? `태그 «${tagName(f.tag)}» — 시험지 · 연산 연습지를 고르면 다시 걸립니다.`
            : "태그는 시험지 · 연산 연습지에만 있습니다."}
        </p>
        {release && f.tag && (
          <button type="button" onClick={() => f.setTag(null)}>
            태그 풀기
          </button>
        )}
      </div>
    );
  return (
    <div
      className={`${lib.kindTabs} ${o.tagTabs}`}
      role="group"
      aria-label="태그별 보기"
    >
      <button
        type="button"
        data-ctl={ctl || undefined}
        aria-pressed={f.tag === null}
        onClick={() => f.setTag(null)}
      >
        태그 전체
      </button>
      {SHEET_TAGS.map((entry) => (
        <button
          key={entry}
          type="button"
          data-ctl={ctl || undefined}
          aria-pressed={f.tag === entry}
          onClick={() => f.setTag(f.tag === entry ? null : entry)}
        >
          {entry} <span>{f.tagCounts[entry]}</span>
        </button>
      ))}
      <span className={o.vRule} aria-hidden />
      <button
        type="button"
        data-ctl={ctl || undefined}
        aria-pressed={f.tag === "none"}
        onClick={() => f.setTag(f.tag === "none" ? null : "none")}
      >
        태그 없음 <span>{f.noneCount}</span>
      </button>
    </div>
  );
}

function BarNow({ f }: { f: F }) {
  return (
    <div data-bar>
      <KindChips f={f} ctl />
      <TagChips f={f} ctl />
      <div className={lib.toggles}>
        <WorkingCheck f={f} />
        <MineCheck f={f} />
      </div>
      <div className={lib.tools} data-now-tools>
        <input
          data-ctl
          type="search"
          aria-label="저장한 자료 검색"
          placeholder="자료 이름으로 찾기"
          value={f.query}
          onChange={(event) => f.setQuery(event.target.value)}
        />
        <label data-ctl>
          정렬
          <select
            aria-label="자료 정렬"
            value={f.sort}
            onChange={(event) => f.setSort(event.target.value as Sort)}
          >
            <option value="newest">최근 수정순</option>
            <option value="name">이름순</option>
            <option value="count">문항 많은순</option>
          </select>
        </label>
        <Refresh />
      </div>
    </div>
  );
}

/* ───────────── A ~ E ───────────── */

/** A — 거르기(종류 · 태그 · 체크 둘)가 왼쪽, 찾기(남는 폭) · 정렬 · 새로고침이 오른쪽. 좁으면 찾기 무리가 통째로 둘째 줄로. */
function BarA({ f }: { f: F }) {
  return (
    <div className={`${w.bar} ${w.barA}`} data-bar>
      <div className={w.group}>
        <KindSelect f={f} />
        <TagSelect f={f} />
        <span className={w.checks}>
          <WorkingCheck f={f} />
          <MineCheck f={f} />
        </span>
      </div>
      <div className={`${w.group} ${w.find}`}>
        <Search f={f} className={w.searchFill} />
        <SortSelect f={f} />
        <Refresh />
        <InlineCount f={f} />
      </div>
    </div>
  );
}

/** B — 찾기(고정 280) · 새로고침이 먼저, 드롭다운 셋(종류 · 태그 · 정렬)과 체크 둘이 뒤. 좁으면 찾기 줄이 위. */
function BarB({ f }: { f: F }) {
  return (
    <div className={`${w.bar} ${w.barB}`} data-bar>
      <div className={`${w.group} ${w.find}`}>
        <Search f={f} className={w.searchFixed} />
        <Refresh />
      </div>
      <div className={`${w.group} ${w.selects}`}>
        <KindSelect f={f} />
        <TagSelect f={f} />
        <SortSelect f={f} />
        <span className={w.checks}>
          <WorkingCheck f={f} />
          <MineCheck f={f} />
        </span>
        <InlineCount f={f} />
      </div>
    </div>
  );
}

/** C — 체크 둘을 «보기» 드롭다운으로. 드롭다운 넷(보기 · 종류 · 태그 · 정렬)이 나란히, 찾기는 최대 360. 폰은 2 × 2. */
function BarC({ f }: { f: F }) {
  return (
    <div className={`${w.bar} ${w.barC}`} data-bar>
      <div className={`${w.group} ${w.selects}`}>
        <ScopeSelect f={f} />
        <KindSelect f={f} />
        <TagSelect f={f} />
        <SortSelect f={f} />
      </div>
      <div className={`${w.group} ${w.find}`}>
        <Search f={f} className={w.searchCapped} />
        <span className={w.end}>
          <Refresh />
          <InlineCount f={f} />
        </span>
      </div>
    </div>
  );
}

/** D — 핵심 조건 먼저: 종류 · 찾기(고정 240)가 왼쪽, 덧붙임 조건(태그 · 눌림 단추 둘) · 정렬 · 새로고침이 오른쪽. 좁으면 종류 · 찾기 줄이 위. */
function BarD({ f }: { f: F }) {
  return (
    <div className={`${w.bar} ${w.barD}`} data-bar>
      <div className={`${w.group} ${w.core}`}>
        <KindSelect f={f} />
        <Search f={f} className={w.searchCore} />
      </div>
      <div className={`${w.group} ${w.more}`}>
        <TagSelect f={f} />
        <WorkingPress f={f} />
        <MinePress f={f} />
        <SortSelect f={f} />
        <Refresh />
        <InlineCount f={f} />
      </div>
    </div>
  );
}

/** E — 찾기(남는 폭) · «거르기» 단추 하나 · 정렬 · 새로고침. 거르기 넷은 공용 고르기 창(`PickerDialog` · 내용만큼)에서 — 고르면 바로 걸린다. */
function BarE({ f }: { f: F }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  // 닫힌 단추에 걸린 것을 다 적는다 — 기억만 하고 안 걸린 태그는 «미적용», 체크 둘은 둘 다.
  const summary = [
    f.kind === "all" ? "전체 자료" : documentKindLabel(f.kind),
    f.tag && (f.activeTag ? tagName(f.activeTag) : `${tagName(f.tag)} 미적용`),
    f.workingOnly && "작업 중",
    f.mineOnly && "내 자료만",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={`${w.bar} ${w.barE}`} data-bar>
      <Search f={f} className={w.searchFill} />
      <button
        ref={trigger}
        type="button"
        data-ctl
        className={w.popTrigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className={w.popLabel}>거르기</span>
        <span className={w.popValue}>{summary}</span>
        <Icon name="down" size={16} />
      </button>
      <SortSelect f={f} />
      <Refresh />
      <InlineCount f={f} />
      {open && (
        <PickerDialog
          title="거르기"
          size="fit"
          returnFocus={trigger}
          onClose={() => setOpen(false)}
          footer={
            <>
              <span>고르면 바로 걸립니다.</span>
              <button type="button" className={w.footButton} onClick={f.reset}>
                모두 풀기
              </button>
            </>
          }
        >
          <div className={w.sheet}>
            <section>
              <h3>종류</h3>
              <KindChips f={f} ctl={false} />
            </section>
            <section>
              <h3>태그</h3>
              <TagChips f={f} ctl={false} release />
            </section>
            <section>
              <h3>보기</h3>
              <div className={lib.toggles}>
                <WorkingCheck f={f} ctl={false} />
                <MineCheck f={f} ctl={false} />
              </div>
            </section>
          </div>
        </PickerDialog>
      )}
    </div>
  );
}

/* ───────────── 목록 그림 — 실제 PrivateLibrary 의 CSS 그대로 ───────────── */

function LibraryMock({
  f,
  bar,
  now = false,
}: {
  f: F;
  bar: ReactNode;
  /** 지금 화면(기준) — 결과 수 줄은 페이지 선택과 상관없이 그대로 둔다. */
  now?: boolean;
}) {
  const { countInBar } = useContext(WireOptions);
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
      {(now || !countInBar) && (
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
              {f.filtered.map((row, index) => (
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
            <p>자료 이름이나 종류 · 태그를 바꿔 다시 찾아보세요.</p>
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

type Measure = {
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
  if (!value) return <span className={w.measure}>재는 중…</span>;
  return (
    <span className={w.measure}>
      머리 아래 ~ 목록 위 <b>{value.gap}px</b> · 거르기 <b>{value.lines}줄</b> ·
      첫 화면 안 자료 <b>{value.rows}행</b>
    </span>
  );
}

function useReport(key: string, value: Measure | null) {
  const report = useContext(MeasureReport);
  useEffect(() => report(key, value), [report, key, value]);
}

function PcFrame({
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
    <figure className={w.figure}>
      <figcaption className={w.caption}>
        <span>
          PC {screen} 화면 — 본문 {main}px(옆 메뉴 {side} 뺌) · 높이 {PC_HEIGHT}
          px(가정)
        </span>
        <MeasureLine value={value} />
      </figcaption>
      <div className={w.scrollX}>
        <div
          ref={ref}
          className={w.pc}
          data-screen={screen}
          style={{ width: main, height: PC_HEIGHT }}
        >
          <div className={`${wr.workspace} ${w.shell}`}>{children}</div>
        </div>
      </div>
    </figure>
  );
}

function PhoneFrame({ id, children }: { id: string; children: ReactNode }) {
  const [ref, value] = useMeasure(PHONE.height - PHONE.nav);
  useReport(`${id}:phone`, value);
  return (
    <figure className={w.figure}>
      <figcaption className={`${w.caption} ${w.phoneCaption}`}>
        <span>폰 390 × 844 — 본문 358px</span>
        <MeasureLine value={value} />
      </figcaption>
      <div
        ref={ref}
        className={w.phone}
        style={{ width: PHONE.width, height: PHONE.height }}
      >
        <div className={`${wr.workspace} ${w.shell}`}>
          <div className={w.phoneTop}>
            <b>오늘 수학</b>
            <span className={w.phoneNew}>
              <Icon name="plus" size={16} /> 새로 만들기
            </span>
          </div>
          {children}
        </div>
        <div className={w.phoneNav} aria-hidden>
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

/* ───────────── 안 하나 ───────────── */

type OptionSpec = {
  id: string;
  title: string;
  order: string;
  checks: string;
  search: string;
  narrow: string;
  clicks: string;
  cost: string;
  Bar: (props: { f: F }) => ReactNode;
};

const OPTIONS: OptionSpec[] = [
  {
    id: "A",
    title: "A안 — 거르기 왼쪽 · 찾기 오른쪽",
    order: "종류 · 태그 · 체크 둘 → 찾기 → 정렬 · 새로고침",
    checks: "드롭다운 옆 체크(지금 모양 그대로)",
    search: "남는 폭을 다 채운다",
    narrow: "1줄 거르기 넷 / 2줄 찾기 · 정렬 · 새로고침",
    clicks: "종류 · 태그 2번(열고 고르기) · 작업 중 1번",
    cost: "체크 둘은 테두리 없는 글씨라 드롭다운 상자 사이에서 무게가 다르다. 폰 4줄.",
    Bar: BarA,
  },
  {
    id: "B",
    title: "B안 — 찾기 먼저 · 드롭다운 셋 나란히",
    order: "찾기 · 새로고침 → 종류 · 태그 · 정렬 → 체크 둘",
    checks: "드롭다운 옆 체크",
    search: "고정 280px(좁으면 줄을 채움)",
    narrow: "1줄 찾기 · 새로고침 / 2줄 드롭다운 셋 · 체크 둘",
    clicks: "종류 · 태그 2번 · 작업 중 1번",
    cost: "찾기 폭이 고정이라 넓은 화면에서 오른쪽이 빈다. 1280 화면에서 두 줄. 폰 4줄.",
    Bar: BarB,
  },
  {
    id: "C",
    title: "C안 — 드롭다운 넷(체크 둘을 «보기» 하나로)",
    order: "보기 · 종류 · 태그 · 정렬 → 찾기 → 새로고침",
    checks:
      "«보기» 드롭다운 — 학원 자료 전체 / 내 자료만 / 내 작업 중만(수). 새 동작이다: 작업 중을 풀면 «내 자료만»이 남지 않고 범위를 다시 고른다",
    search: "채우되 최대 360px(좁으면 줄을 채움)",
    narrow: "1줄 드롭다운 넷 / 2줄 찾기 · 새로고침 · 폰은 2 × 2",
    clicks: "종류 · 태그 · 작업 중 모두 2번",
    cost: "«내 작업 중만»이 한 번에 켜는 체크에서 열어서 고르는 항목이 된다.",
    Bar: BarC,
  },
  {
    id: "D",
    title: "D안 — 핵심 조건 먼저(종류 · 찾기) · 덧붙임 조건은 오른쪽",
    order: "종류 · 찾기 → 태그 · [내 작업 중] [내 자료만] → 정렬 · 새로고침",
    checks: "태그 옆 눌림 단추(드롭다운과 같은 44px 상자)",
    search: "종류 바로 옆에서 남는 폭을 채운다",
    narrow: "1줄 종류 · 찾기 / 2줄 태그 · 단추 둘 · 정렬 · 새로고침 · 폰 3줄",
    clicks: "종류 · 태그 2번 · 작업 중 1번",
    cost: "넓은 화면에서 왼쪽 무리와 오른쪽 무리 사이가 빈다. 태그가 종류에서 떨어져 있다.",
    Bar: BarD,
  },
  {
    id: "E",
    title: "E안 — «거르기» 단추 하나 · 공용 고르기 창",
    order: "찾기 → 거르기(종류 · 태그 · 체크 둘을 창 하나에) → 정렬 · 새로고침",
    checks: "고르기 창 안(`PickerDialog` · 내용만큼 — 새 부품 없음)",
    search: "남는 폭을 다 채운다",
    narrow: "PC 는 늘 한 줄 · 폰 2줄(폰에서는 창이 화면을 채운다)",
    clicks: "종류 · 태그 · 작업 중 모두 3번(창 열기 · 고르기 · 닫기)",
    cost: "걸린 거르기는 단추 글씨로만 보인다. 종류를 자주 바꾸면 번거롭다.",
    Bar: BarE,
  },
];

function OptionSection({
  spec,
  screen,
  branch,
}: {
  spec: OptionSpec;
  screen: Screen;
  branch: boolean;
}) {
  const f = useFilters(branch);
  const { Bar } = spec;
  return (
    <section
      className={w.option}
      id={`wire-${spec.id}`}
      data-wire-option={spec.id}
    >
      <div className={w.optionHead}>
        <h2>{spec.title}</h2>
        <dl className={w.spec}>
          <dt>순서</dt>
          <dd>{spec.order}</dd>
          <dt>체크 둘</dt>
          <dd>{spec.checks}</dd>
          <dt>검색칸</dt>
          <dd>{spec.search}</dd>
          <dt>좁으면</dt>
          <dd>{spec.narrow}</dd>
          <dt>누르는 수</dt>
          <dd>{spec.clicks}</dd>
          <dt>대가</dt>
          <dd>{spec.cost}</dd>
        </dl>
      </div>
      <PcFrame id={spec.id} screen={screen}>
        <LibraryMock f={f} bar={<Bar f={f} />} />
      </PcFrame>
      <PhoneFrame id={spec.id}>
        <LibraryMock f={f} bar={<Bar f={f} />} />
      </PhoneFrame>
    </section>
  );
}

function NowSection({ screen, branch }: { screen: Screen; branch: boolean }) {
  const f = useFilters(branch);
  return (
    <section className={w.option} id="wire-now" data-wire-option="now">
      <div className={w.optionHead}>
        <h2>지금 — 다섯 줄(기준)</h2>
        <p className={w.lead}>
          종류 칩 줄 · 태그 칩 줄 · 체크 줄 · 찾기 · 정렬 · 새로고침 줄 · 결과
          수 줄. 태그 없는 종류를 고르면 태그 줄이 안내 한 줄로 접힌다. 누르는
          수 — 종류 · 태그 · 작업 중 모두 1번.
        </p>
      </div>
      <PcFrame id="now" screen={screen}>
        <LibraryMock f={f} bar={<BarNow f={f} />} now />
      </PcFrame>
      <PhoneFrame id="now">
        <LibraryMock f={f} bar={<BarNow f={f} />} now />
      </PhoneFrame>
    </section>
  );
}

/** 맨 위 «잰 값 한눈에» — 틀마다 브라우저에서 잰 값을 그대로 옮긴다(지금 고른 PC 틀 · 폰). */
function Summary({
  screen,
  measures,
}: {
  screen: Screen;
  measures: Record<string, Measure | null>;
}) {
  const cell = (value: Measure | null | undefined) =>
    value ? `${value.gap}px · ${value.lines}줄 · ${value.rows}행` : "재는 중…";
  return (
    <table className={w.summary}>
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
        {["now", ...OPTIONS.map((spec) => spec.id)].map((id) => (
          <tr key={id}>
            <th scope="row">{id === "now" ? "지금" : `${id}안`}</th>
            <td>{cell(measures[`${id}:pc`])}</td>
            <td>{cell(measures[`${id}:phone`])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Switch<T extends string | boolean>({
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
    <div className={w.switches} role="group" aria-label={caption}>
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

export function LibraryFiltersWire() {
  const [screen, setScreen] = useState<Screen>("1536");
  const [branch, setBranch] = useState(true);
  const [countInBar, setCountInBar] = useState(false);
  const [labels, setLabels] = useState(false);
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
      <WireOptions.Provider value={{ labels, countInBar }}>
        <div className={w.page}>
          <header className={w.pageHead}>
            <h1>내 자료 거르기 줄 — Wire 5안</h1>
            <p>
              원장님 2026-10-21 «상단 정렬하자. 드랍다운으로 스타일 맞춰서
              깔끔하게» · «행을 너무 많이 써서 공간낭비함». 종류 · 태그를 정렬과
              같은 드롭다운으로 바꾸고, 거르기 · 찾기 · 정렬 · 새로고침을 넓으면
              한 줄 · 좁으면 두 줄에 모은다.
            </p>
            <ul className={w.common}>
              <li>
                다섯 안이 같은 것 — 드롭다운은 지금 정렬 칸과 같은 칸(44px ·
                테두리 · 8px 모서리), 항목 글에 수 «시험지 (9)». 태그 드롭다운은
                끝에 선을 긋고 «태그 없음». 같은 태그를 다시 눌러 푸는 대신
                «태그 전체»를 고른다.
              </li>
              <li>
                태그 없는 종류(추출한 자료 · 개념 백지)를 고르면 태그 칸이
                꺼진다 — 고른 태그가 있으면 «숙제 · 미적용»과 [태그 풀기]. 그
                종류로 돌아가면 다시 걸린다(지금 규칙). 지금의 접힌 안내 한 줄은
                없어진다.
              </li>
              <li>
                안마다 다른 것 — 순서 · 체크 둘의 자리 · 검색칸 폭 · 좁은 화면
                줄바꿈. 드롭다운 · 체크는 실제로 걸러진다(교집합 · «고르면 몇 개
                남나» 규칙은 지금 그대로).
              </li>
              <li>
                틀 폭은 제품 CSS 에서 — 옆 메뉴 240(1024 화면은 212)을 뺀 본문.
                높이 740 은 1536 × 864 화면의 브라우저 안쪽 높이를 가정한
                값이다. 창 폭 1100 이상에서 보세요(그보다 좁으면 틀 밖 규칙이 틀
                안에 들어온다). 지어낸 16행 · DB 를 읽지 않는다 · 아무것도
                저장하지 않는다.
              </li>
            </ul>
            <div className={w.switchRow}>
              <Switch
                caption="PC 틀"
                value={screen}
                options={(Object.keys(SCREENS) as Screen[]).map((key) => ({
                  value: key,
                  label: `${key} 화면`,
                }))}
                onChange={setScreen}
              />
              <Switch
                caption="계정"
                value={branch}
                options={[
                  { value: true, label: "학원 소속(내 자료만 보기 있음)" },
                  { value: false, label: "혼자 쓰는 계정" },
                ]}
                onChange={setBranch}
              />
            </div>
            <div className={w.switchRow}>
              <Switch
                caption="다섯 안 공통 · 결과 수"
                value={countInBar}
                options={[
                  { value: false, label: "따로 한 줄(지금)" },
                  { value: true, label: "거르기 줄 끝에" },
                ]}
                onChange={setCountInBar}
              />
              <Switch
                caption="드롭다운 이름"
                value={labels}
                options={[
                  { value: false, label: "없음" },
                  { value: true, label: "칸 안에 작게(종류 · 태그 · 정렬)" },
                ]}
                onChange={setLabels}
              />
            </div>
            <Summary screen={screen} measures={measures} />
            <nav className={w.jump} aria-label="안으로 가기">
              <a href="#wire-now">지금</a>
              {OPTIONS.map((spec) => (
                <a key={spec.id} href={`#wire-${spec.id}`}>
                  {spec.id}안
                </a>
              ))}
            </nav>
          </header>
          <NowSection key={`now-${branch}`} screen={screen} branch={branch} />
          {OPTIONS.map((spec) => (
            <OptionSection
              key={`${spec.id}-${branch}`}
              spec={spec}
              screen={screen}
              branch={branch}
            />
          ))}
        </div>
      </WireOptions.Provider>
    </MeasureReport.Provider>
  );
}
