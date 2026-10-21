"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import lib from "@/components/unified/PrivateLibrary.module.css";
import { DOCUMENT_KINDS } from "@/contracts/privateWorkspace.contract";
import { SHEET_TAGS } from "@/contracts/sheetTag.contract";

import {
  LibraryMock,
  MeasureStore,
  PAUSED_REASON,
  PcFrame,
  PhoneFrame,
  SCREEN_OPTIONS,
  Summary,
  Switch,
  partsStyles as p,
  tagName,
  taggableView,
  useFilters,
  type F,
  type FilterStart,
  type KindFilter,
  type Scope,
  type Screen,
  type Sort,
  type TagFilter,
} from "../library-filters-wire/parts";
import { MANY_ROWS, WIRE_ROWS } from "../library-filters-wire/fixtures";
import h from "./LibraryFiltersHifi.module.css";

/**
 * 내 자료 거르기 줄 — Hi-fi 5안. 짜임은 원장님이 고르신 Wire C 그대로다:
 * 드롭다운 넷(종류 · 태그 · 보기 · 정렬) → 찾기 → 새로고침 · 결과 수(줄 끝), 드롭다운 이름은 칸 안에 작게.
 * 다섯 안이 가르는 것은 칸의 꼴 · 이름의 자리와 무게 · 걸린 칸 표시 · 미적용 칸 · 화살표 · 결과 수의 꼴 · 글자 크기다.
 */

type Look = "H1" | "H2" | "H3" | "H4" | "H5";
type Order = "lead" | "wire";
type Wording = "now" | "codex";

/** 페이지 맨 위 선택 — 다섯 안에 같이 걸린다. */
const HifiOptions = createContext<{
  order: Order;
  wording: Wording;
  /** 자료 336행 — 수가 세 자리일 때 칸 폭 */
  many: boolean;
}>({
  order: "lead",
  wording: "now",
  many: false,
});

function useHifiFilters(branch: boolean, start: FilterStart = {}) {
  const { many } = useContext(HifiOptions);
  return useFilters(branch, start, many ? MANY_ROWS : WIRE_ROWS);
}

const EMPTY_HINT = "자료 이름이나 종류 · 태그 · 보기를 바꿔 다시 찾아보세요.";

/* ───────────── 칸 하나 — 이름은 칸 안(aria-hidden, select 의 이름은 aria-label) ───────────── */

function Field({
  name,
  active = false,
  paused = false,
  children,
}: {
  name: string;
  /** 기본값이 아닌 거르기가 걸린 칸 */
  active?: boolean;
  /** 태그 없는 종류에서 기억만 하고 안 걸린 태그 칸 */
  paused?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={h.field}
      data-active={active || undefined}
      data-paused={paused || undefined}
    >
      <span className={h.name} aria-hidden>
        {name}
      </span>
      {children}
    </span>
  );
}

function KindField({
  f,
  selectRef,
}: {
  f: F;
  selectRef: RefObject<HTMLSelectElement | null>;
}) {
  return (
    <Field name="종류" active={f.kind !== "all"}>
      <select
        ref={selectRef}
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
 * 태그 칸 — 태그 없는 종류(추출한 자료 · 개념 백지)에서는 걸리지 않는다. 고른 태그가 있으면 «숙제 · 미적용»으로 읽히고
 * 열면 «태그 풀기» 하나(칸 수가 그대로), 없으면 칸 글이 곧 까닭인 «시험지 · 연산만»으로 꺼진다(꺼진 칸은 Tab 이 안 닿아
 * 숨은 설명만으로는 까닭이 안 보인다 — Codex). 그 종류로 돌아가면 기억한 태그가 다시 걸린다.
 * 풀면 칸이 꺼지므로 초점은 종류 칸으로 옮긴다(꺼진 칸에 남은 초점은 문서로 빠진다).
 */
function TagField({ f, onRelease }: { f: F; onRelease: () => void }) {
  const reasonId = useId();
  if (!taggableView(f.kind))
    return (
      <Field name="태그" paused={Boolean(f.tag)}>
        <span id={reasonId} hidden>
          {PAUSED_REASON}
        </span>
        <select
          data-ctl
          aria-label="태그"
          aria-describedby={reasonId}
          title={PAUSED_REASON}
          value="paused"
          disabled={!f.tag}
          onChange={(event) => {
            if (event.target.value !== "") return;
            f.setTag(null);
            onRelease();
          }}
        >
          <option value="paused" disabled={Boolean(f.tag)}>
            {f.tag ? `${tagName(f.tag)} · 미적용` : "시험지 · 연산만"}
          </option>
          {f.tag && <option value="">태그 풀기</option>}
        </select>
      </Field>
    );
  return (
    <Field name="태그" active={f.activeTag !== null}>
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

/** ④ 보기 범위 — 고를 때마다 도착할 범위를 고른다. 이전 범위는 기억하지 않는다(Codex 합의 · `useFilters.setScope`). */
function ScopeField({ f }: { f: F }) {
  const { wording } = useContext(HifiOptions);
  const codex = wording === "codex";
  return (
    <Field name={codex ? "범위" : "보기"} active={f.scope !== "all"}>
      <select
        data-ctl
        aria-label="보기 범위"
        value={f.scope}
        onChange={(event) => f.setScope(event.target.value as Scope)}
      >
        <option value="all">
          {f.branch
            ? codex
              ? "내 자료 + 학원 공개"
              : "학원 자료 전체"
            : "내 자료 전체"}
        </option>
        {f.branch && <option value="mine">내 자료만</option>}
        <option value="working">내 작업 중만 ({f.workingCount})</option>
      </select>
    </Field>
  );
}

function SortField({ f }: { f: F }) {
  return (
    <Field name="정렬">
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

function Count({ f }: { f: F }) {
  return (
    <p
      className={h.count}
      aria-live="polite"
      data-ctl
      data-filtered={f.hasFilters || undefined}
    >
      <span className={h.countName}>결과</span>
      <span className={h.countValue}>
        {f.hasFilters ? (
          <>
            {f.items.length}개 중 <strong>{f.filtered.length}</strong>개
          </>
        ) : (
          <>
            <strong>{f.items.length}</strong>개
          </>
        )}
      </span>
    </p>
  );
}

/** 거르기 줄 — Wire C. 넓으면 한 줄, 좁으면 드롭다운 줄 / 찾기 줄, 폰은 드롭다운 2 × 2. */
function HifiBar({ f, look }: { f: F; look: Look }) {
  const { order } = useContext(HifiOptions);
  const kindRef = useRef<HTMLSelectElement>(null);
  const kind = <KindField key="kind" f={f} selectRef={kindRef} />;
  const tag = (
    <TagField key="tag" f={f} onRelease={() => kindRef.current?.focus()} />
  );
  const scope = <ScopeField key="scope" f={f} />;
  const sort = <SortField key="sort" f={f} />;
  return (
    <div className={h.bar} data-look={look} data-bar>
      <div className={h.selects}>
        {order === "lead" ? [kind, tag, scope, sort] : [scope, kind, tag, sort]}
      </div>
      <div className={h.find}>
        <input
          data-ctl
          className={h.search}
          type="search"
          aria-label="저장한 자료 검색"
          placeholder="자료 이름으로 찾기"
          value={f.query}
          onChange={(event) => f.setQuery(event.target.value)}
        />
        <span className={h.end}>
          <button type="button" data-ctl>
            새로고침
          </button>
          <Count f={f} />
        </span>
      </div>
    </div>
  );
}

/* ───────────── 상태 여섯 — 같은 줄을 여섯 상태로(본문 1232 폭 · 좁은 폭은 아래 틀에서) ───────────── */

const STATES: { id: string; label: string; start: FilterStart }[] = [
  { id: "start", label: "처음 — 아무것도 안 걸림", start: {} },
  {
    id: "active",
    label: "걸림 — 시험지 · 일일TEST · 내 자료만 · 이름순",
    start: { kind: "draft", tag: "일일TEST", scope: "mine", sort: "name" },
  },
  {
    id: "paused",
    label:
      "태그 미적용 — 추출한 자료를 골랐고 일일TEST 를 기억(열면 «태그 풀기»)",
    start: { kind: "extraction", tag: "일일TEST" },
  },
  {
    id: "off",
    label: "태그 없는 종류 · 기억한 태그 없음 — 칸이 꺼진다",
    start: { kind: "conceptBlank" },
  },
  {
    id: "working",
    label: "내 작업 중만",
    start: { scope: "working" },
  },
  {
    id: "empty",
    label: "빈 결과 — 찾기 «기말» · 문항 많은순",
    start: { query: "기말", sort: "count" },
  },
];

function StateBar({
  look,
  branch,
  start,
}: {
  look: Look;
  branch: boolean;
  start: FilterStart;
}) {
  const f = useHifiFilters(branch, start);
  return (
    <div className={`${lib.library} ${h.stripLibrary}`}>
      <HifiBar f={f} look={look} />
    </div>
  );
}

/* ───────────── 안 하나 ───────────── */

type OptionSpec = {
  id: Look;
  title: string;
  idea: string;
  box: string;
  name: string;
  active: string;
  paused: string;
  count: string;
  text: string;
  cost: string;
};

const OPTIONS: OptionSpec[] = [
  {
    id: "H1",
    title: "H1 — 지금 칸 그대로",
    idea: "지금 정렬 칸을 한 글자도 바꾸지 않고 넷으로 늘린다.",
    box: "흰 면 · 회청 테두리 · 8px 모서리 · 화살표는 브라우저 것(Windows 와 Mac 이 다르다)",
    name: "칸 안 왼쪽 · 12px 회색",
    active: "따로 표시 없음 — 칸의 글(«시험지 (10)»)이 곧 표시",
    paused: "회색 면 · 회색 글",
    count: "«16개 중 3개» — 회색 글에 수만 진하게",
    text: "13px — 지금 내 자료 화면 그대로(DESIGN.md 의 조작 글자 14px 는 아니다)",
    cost: "걸린 거르기가 칸 모양으로는 안 보인다 — 넷 중 무엇이 걸렸는지 글을 읽어야 안다.",
  },
  {
    id: "H2",
    title: "H2 — 걸린 칸만 코발트",
    idea: "지금 종류 칩의 «눌림» 꼴(옅은 코발트 면 · 코발트 테두리)을 드롭다운에 옮긴다 — 걸린 칸이 한눈에 보인다.",
    box: "흰 면 · 회청 테두리 · 8px · 화살표는 우리 것(어느 브라우저나 같은 꺾쇠)",
    name: "칸 안 왼쪽 · 12px 회색",
    active: "옅은 코발트 면 · 코발트 테두리 · 코발트 글(지금 칩과 같은 말)",
    paused: "점선 테두리 · 회색 글",
    count: "«16개 중 3개» — 걸린 수만 코발트",
    text: "14px(DESIGN.md 조작 글자)",
    cost: "거르기가 셋(종류 · 태그 · 보기) 다 걸리면 코발트 칸이 셋 — 줄이 무거워진다(정렬은 거르기가 아니라 켜지지 않는다). 1280 화면에서 두 줄.",
  },
  {
    id: "H3",
    title: "H3 — 이름 칸 · 값 칸",
    idea: "칸 왼쪽을 이름 자리로 나눠(옅은 회색 면 + 세로 선) 이름과 고른 값을 또렷이 가른다 — 서식 칸처럼 읽힌다.",
    box: "이름 자리 46px 회색 면 + 값 자리 흰 면 · 8px · 우리 화살표",
    name: "이름 자리에 가운데 맞춤 · 12px 굵게 회색",
    active: "이름 자리가 옅은 코발트 · 이름이 코발트 · 값이 굵게",
    paused: "값 자리도 회색 면 · 회색 글",
    count: "왼쪽 가는 선 뒤 «결과 16개 중 3개»",
    text: "14px",
    cost: "칸마다 46px 이름 자리가 있어 가장 넓다 — 1280 화면에서 두 줄.",
  },
  {
    id: "H4",
    title: "H4 — 한 띠로 잇기",
    idea: "드롭다운 넷을 테두리 하나로 잇는다(칸 사이 가는 선) — «거르기»가 한 덩어리로 읽히고 칸 사이 틈이 없어 짧다.",
    box: "칸마다 44px 테두리를 1px 겹쳐 이어 한 띠로(끝 칸만 둥근 모서리) · 우리 화살표",
    name: "칸 안 왼쪽 · 12px 회색",
    active: "그 칸 아래 코발트 밑줄 2px · 코발트 글",
    paused: "그 칸만 회색 면 · 회색 글",
    count: "«16개 중 3개» — 회색 글에 수만 진하게",
    text: "14px",
    cost: "칸 하나하나가 단추처럼 덜 보인다. 폰 2 × 2 에서는 네 칸이 한 판이 된다.",
  },
  {
    id: "H5",
    title: "H5 — 위에 작은 이름",
    idea: "이름을 칸 안 위쪽에 작게, 고른 값을 그 아래에 둔다 — 같은 44px 안에서 이름 폭만큼 칸이 좁다.",
    box: "흰 면 · 회청 테두리 · 8px · 우리 화살표 · 이름 11px 위 / 값 14px 아래",
    name: "칸 안 위쪽 · 11px 회색(걸리면 코발트)",
    active: "코발트 테두리 + 왼쪽 안쪽 3px 코발트 띠 · 이름이 코발트",
    paused: "회색 면 · 회색 글",
    count: "같은 꼴로 «결과»를 위에 작게 · 아래 «16개 중 3개»",
    text: "14px(이름 11px)",
    cost: "44px 안에 두 줄이라 값 글이 아래로 붙는다. 찾기 칸 글자와 높이가 어긋나 보일 수 있다.",
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
  const f = useHifiFilters(branch);
  return (
    <section
      className={p.option}
      id={`hifi-${spec.id}`}
      data-hifi-option={spec.id}
    >
      <div className={p.optionHead}>
        <h2>{spec.title}</h2>
        <dl className={p.spec}>
          <dt>이 안의 생각</dt>
          <dd>{spec.idea}</dd>
          <dt>칸</dt>
          <dd>{spec.box}</dd>
          <dt>이름</dt>
          <dd>{spec.name}</dd>
          <dt>걸린 칸</dt>
          <dd>{spec.active}</dd>
          <dt>미적용 칸</dt>
          <dd>{spec.paused}</dd>
          <dt>결과 수</dt>
          <dd>{spec.count}</dd>
          <dt>글자</dt>
          <dd>{spec.text}</dd>
          <dt>대가</dt>
          <dd>{spec.cost}</dd>
        </dl>
      </div>
      <div className={h.strip} aria-label={`${spec.id} 상태 여섯`}>
        {STATES.map((state) => (
          <div key={state.id} className={h.stripRow}>
            <p className={h.stripLabel}>{state.label}</p>
            <StateBar look={spec.id} branch={branch} start={state.start} />
          </div>
        ))}
      </div>
      <PcFrame id={spec.id} screen={screen}>
        <LibraryMock
          f={f}
          bar={<HifiBar f={f} look={spec.id} />}
          resultLine={false}
          emptyHint={EMPTY_HINT}
        />
      </PcFrame>
      <PhoneFrame id={spec.id}>
        <LibraryMock
          f={f}
          bar={<HifiBar f={f} look={spec.id} />}
          resultLine={false}
          emptyHint={EMPTY_HINT}
        />
      </PhoneFrame>
    </section>
  );
}

export function LibraryFiltersHifi() {
  const [screen, setScreen] = useState<Screen>("1536");
  const [branch, setBranch] = useState(true);
  const [order, setOrder] = useState<Order>("lead");
  const [wording, setWording] = useState<Wording>("now");
  const [many, setMany] = useState(false);
  return (
    <MeasureStore>
      {(measures) => (
        <HifiOptions.Provider value={{ order, wording, many }}>
          <div className={p.page}>
            <header className={p.pageHead}>
              <h1>내 자료 거르기 줄 — Hi-fi 5안</h1>
              <p>
                원장님 2026-10-21 — Wire C(드롭다운 넷 + 찾기) · 결과 수는 줄 끝
                · 드롭다운 이름은 칸 안에 작게 · 태그 없는 종류에 갔다 돌아오면
                태그를 다시 건다. 짜임은 그대로 두고 꼴만 다섯 갈래로 가른다.
              </p>
              <h2 className={h.subhead}>다섯 안이 같은 것</h2>
              <ul className={p.common}>
                <li>
                  줄 — 드롭다운 넷(종류 · 태그 · 보기 · 정렬) → 찾기(최대 360,
                  좁으면 줄을 채움) → 새로고침 · 결과 수. 넓으면 한 줄, 좁으면
                  드롭다운 줄 / 찾기 줄, 폰은 드롭다운 2 × 2. 결과 수 줄은 따로
                  없다.
                </li>
                <li>
                  드롭다운은 native(열면 브라우저 · 폰의 목록) · 항목 글에 수
                  «시험지 (10)» · 태그는 선 뒤에 «태그 없음». 높이 44px · 모서리
                  8px.
                </li>
                <li>
                  태그 없는 종류(추출한 자료 · 개념 백지)에서 태그 칸 — 기억한
                  태그가 있으면 «숙제 · 미적용», 열면 «태그 풀기»(풀면 초점은
                  종류 칸으로). 없으면 칸 글이 곧 까닭인 «시험지 · 연산만»으로
                  꺼진다(금지 커서). 시험지 · 연산 연습지로 돌아가면 기억한
                  태그가 다시 걸린다.
                </li>
                <li>
                  <b>④ 보기 범위 — Codex 와 합의(가)</b>: 고를 때마다 «도착할
                  범위»를 고르고, 이전 범위는 기억하지 않는다.
                  <dl className={h.scopeRules}>
                    <dt>학원 자료 전체</dt>
                    <dd>
                      내 자료 + 같은 학원 선생님들이 공개한 자료(동료의 비공개
                      자료는 들지 않는다)
                    </dd>
                    <dt>내 자료만</dt>
                    <dd>내 자료만 받아 온다</dd>
                    <dt>내 작업 중만 (n)</dt>
                    <dd>
                      진행 단계가 기록된 내 자료 — 학원 소속이면 내 자료만 받아
                      온다. n 은 지금 검색 · 종류 · 걸린 태그에 맞는 내 작업 중
                      자료 수
                    </dd>
                    <dt>작업 중을 풀 때</dt>
                    <dd>
                      «내 자료만»이 남지 않는다 — 고른 항목 그대로(학원 자료
                      전체 또는 내 자료만)
                    </dd>
                    <dt>서버 다시 읽기</dt>
                    <dd>
                      «학원 자료 전체» ↔ «내 자료만 · 내 작업 중만» 사이에서만
                      (내 자료만 ↔ 작업 중은 화면 안 거름)
                    </dd>
                    <dt>초기화 · 계정</dt>
                    <dd>
                      검색 조건 초기화는 검색 · 종류 · 태그 · 보기를
                      처음으로(정렬은 그대로). 학원 소속이 아니면 «내 자료 전체
                      / 내 작업 중만» 둘. 지점 · 계정이 바뀌면 처음부터
                    </dd>
                  </dl>
                </li>
              </ul>
              <h2 className={h.subhead}>안끼리 다른 것</h2>
              <p className={h.note}>
                칸의 꼴(면 · 테두리 · 화살표) · 이름의 자리와 무게 · 걸린 칸
                표시 · 미적용 칸 · 결과 수의 꼴 · 글자 크기(13 / 14px). 안마다
                «상태 여섯»(처음 · 걸림 · 태그 미적용 · 태그 꺼짐 · 내 작업 중만
                · 빈 결과)을 PC 본문 폭(1232)으로 먼저 보이고, 그 아래 실제로
                걸러지는 PC · 폰 틀을 둔다(좁은 폭은 그 틀에서 본다). «자료 수
                336행»을 고르면 칸 글의 수가 세 자리가 된다.
              </p>
              <div className={p.switchRow}>
                <Switch
                  caption="PC 틀"
                  value={screen}
                  options={SCREEN_OPTIONS}
                  onChange={setScreen}
                />
                <Switch
                  caption="계정"
                  value={branch}
                  options={[
                    { value: true, label: "학원 소속" },
                    { value: false, label: "혼자 쓰는 계정" },
                  ]}
                  onChange={setBranch}
                />
                <Switch
                  caption="자료 수"
                  value={many}
                  options={[
                    { value: false, label: "16행" },
                    { value: true, label: "336행(수가 세 자리)" },
                  ]}
                  onChange={setMany}
                />
              </div>
              <div className={p.switchRow}>
                <Switch
                  caption="드롭다운 차례"
                  value={order}
                  options={[
                    { value: "lead", label: "종류 · 태그 · 보기 · 정렬" },
                    {
                      value: "wire",
                      label: "보기 · 종류 · 태그 · 정렬(Wire C 그대로)",
                    },
                  ]}
                  onChange={setOrder}
                />
                <Switch
                  caption="보기 칸 글"
                  value={wording}
                  options={[
                    { value: "now", label: "보기 · 학원 자료 전체" },
                    {
                      value: "codex",
                      label: "범위 · 내 자료 + 학원 공개(Codex 제안)",
                    },
                  ]}
                  onChange={setWording}
                />
              </div>
              <Summary
                screen={screen}
                measures={measures}
                rows={OPTIONS.map((spec) => ({ id: spec.id, label: spec.id }))}
              />
              <nav className={p.jump} aria-label="안으로 가기">
                {OPTIONS.map((spec) => (
                  <a key={spec.id} href={`#hifi-${spec.id}`}>
                    {spec.id}
                  </a>
                ))}
              </nav>
            </header>
            {OPTIONS.map((spec) => (
              <OptionSection
                key={`${spec.id}-${branch}`}
                spec={spec}
                screen={screen}
                branch={branch}
              />
            ))}
          </div>
        </HifiOptions.Provider>
      )}
    </MeasureStore>
  );
}
