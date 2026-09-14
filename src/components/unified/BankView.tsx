"use client";

import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";

import WorkspacePageHeader from "./WorkspacePageHeader";
import WorkProgress from "./WorkProgress";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { UnitRangePicker } from "@/components/progress/UnitRangePicker";
import { describeRange } from "@/components/test/rangeSummary";
import {
  PROBLEM_FILTER_OPTIONS,
  REVIEW_STATUS_LABEL,
  SOURCE_LABEL,
  SOURCE_OPTIONS,
  splitProblemFilterValue,
} from "@/components/problem/labels";
import { provenanceBadges } from "@/lib/problem/provenance";
import UnifiedProblem from "./UnifiedProblem";
import { displayFractions } from "./fractionDisplay";
import type {
  BankData,
  BankProblem,
  BankViewProps,
  StudioProblem,
} from "./types";
import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import styles from "./BankView.module.css";

/**
 * 문제 목록 격자 — **카드 폭을 지면 한 단으로 박고 «열 수만» 바뀐다.**
 *
 * 원장님 지시 2026-08-19: 「문제 공간은 고정시켜 … 창 크기에 따라서 그냥 3열 4열
 * 이렇게만 바뀌면 되고」. 옛 문제은행(`ProblemBank`)이 쓰는 관용구와 **같은 상수**를
 * 쓴다 — 414px 을 CSS 에 따로 적으면 두 화면이 조용히 갈라진다(`tokens.ts` 머리말).
 *
 * 종전에는 `.problemList` 가 `display:grid` 라고만 하고 열을 한 번도 선언하지 않아
 * 문항 하나가 **1,600px 짜리 한 줄**이 됐다. 그러면 그림은 `mx-auto` 로 그 한가운데
 * 뜨고 보기는 2열로 갈라져 ①과 ② 가 800px 떨어진다(원장님 2026-09-14
 * 「너무 많이 공간 축소를 해버렸는데」).
 *
 * 너무 좁은 창에서는 `min(100%, …)` 가 1단으로 떨어뜨린다 — 가로 스크롤 대신이다.
 */
const PROBLEM_GRID_STYLE = {
  gridTemplateColumns: `repeat(auto-fill, min(100%, ${PROBLEM_CARD_WIDTH}))`,
} as const;

type Filters = {
  q: string;
  grade: string;
  chapter: string;
  difficulty: string;
  unitFrom: string;
  unitTo: string;
  problemFilter: string;
  reviewStatus: string;
  source: string;
  hasFigure: boolean;
  hasSolution: boolean;
  hasAnswer: boolean;
  page: number;
};

const EMPTY_FILTERS: Filters = {
  q: "",
  grade: "",
  chapter: "",
  difficulty: "",
  unitFrom: "",
  unitTo: "",
  problemFilter: "",
  reviewStatus: "",
  source: "",
  hasFigure: false,
  hasSolution: false,
  hasAnswer: false,
  page: 1,
};

const ASSET_FILTERS = [
  { key: "hasFigure", label: "그림" },
  { key: "hasSolution", label: "해설" },
  { key: "hasAnswer", label: "정답" },
] as const;

/**
 * 출처·그림·형식 배지의 겉모습 — 옛 카드(`ProblemCard`)와 **같은 규격**을 쓴다
 * (원장님 지시 2026-08-27 「동그라미에 **흰색 글씨**에 **검정 테두리**. **배경색만**
 * 라벨에 따라 다르게」). 한 글자(`초`·`변`)는 동그라미가 되고 여러 글자(`SVG`·`?형식`)는
 * 알약으로 늘어나므로 폭을 고정하지 않는다.
 *
 * 면색(`bg-src-*`)은 `provenanceBadges` 가 붙인다 — 색 규칙을 여기 옮겨 적지 않는다.
 */
export const BADGE_CHIP = [
  "inline-flex items-center justify-center",
  "min-w-[1.35rem] h-[1.35rem] px-[0.3rem] rounded-full",
  "border border-ink",
  "text-[10px] font-extrabold leading-none text-white no-underline",
  "print:hidden",
].join(" ");

function Icon({
  name,
}: {
  name:
    | "search"
    | "arrow"
    | "chevron"
    | "reset"
    | "basket"
    | "check"
    | "plus"
    | "filter"
    | "close";
}) {
  const paths = {
    search: "m21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    chevron: "m9 5 7 7-7 7",
    reset: "M3 10a9 9 0 1 1 2 8M3 4v6h6",
    basket: "m3 8 2 12h14l2-12H3Zm5 0 4-6 4 6M9 12v4m6-4v4",
    check: "m5 12 4 4L19 6",
    plus: "M12 5v14M5 12h14",
    filter: "M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6",
    close: "m6 6 12 12M6 18 18 6",
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function ProblemRow({
  problem,
  number,
  selected,
  onToggle,
}: {
  problem: BankProblem;
  number: number;
  selected: boolean;
  onToggle: (problem: StudioProblem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [answerVisible, setAnswerVisible] = useState(false);
  const id = useId();
  const addDisabled = problem.eligible === false && !selected;
  const ineligibleReason =
    problem.eligible === false
      ? problem.ineligibleReason || "출제할 수 없는 문항입니다."
      : null;

  function toggle() {
    if (!addDisabled) onToggle(problem);
  }

  return (
    <article
      className={`${styles.problemRow} ${selected ? styles.selectedRow : ""}`}
    >
      <div className={styles.cardHeader}>
        <label className={styles.rowSelect}>
          <input
            type="checkbox"
            checked={selected}
            disabled={addDisabled}
            aria-describedby={
              ineligibleReason ? `${id}-eligibility` : undefined
            }
            onChange={toggle}
            aria-label={`${number}번 문제 ${selected ? "담기 취소" : "담기"}`}
          />
          <span className={styles.rowNumber}>
            문제 {String(number).padStart(2, "0")}
          </span>
        </label>
        {/* 🔴 출처·그림·형식 배지 (원장님 2026-09-14 「원래 문제은행에서는 각종 라벨이
            있었는데 어디갔지?」). 옛 카드(`ProblemCard`)에는 있었고 이 화면에만 없었다 —
            05 §8.6 은 S-08 이 「같은 ProblemCard」를 쓴다고 적어 두었는데 이쪽이 제 머리를
            새로 그리면서 축이 통째로 빠졌다.

            판정은 `provenanceBadges` **하나**가 한다 — 여기서 조건을 다시 쓰지 않는다.
            ⚠️ `questionType` 이 아니라 **`questionTypeRaw`** 를 먹인다. 서버가 앞의 것을
               영문 파생값으로 덮어쓰는데 판정기는 한글과 견주므로, 덮어쓴 값을 주면
               서버는 `[서]` 인데 화면만 `[?형식]` 이 된다.
            ⚠️ 누르는 것이 아니다 — 손가락 커서·hover 금지(D-30). `abbr` 인 이유는 색을
               못 보는 사람이 `title` 로 풀어 읽을 수 있어야 하기 때문이다(05 §5). */}
        <span className={styles.provenance}>
          {provenanceBadges({
            ...problem,
            source: problem.source ?? "",
            questionType: problem.questionTypeRaw,
          }).map((badge) => (
            <abbr
              key={badge.axis}
              title={badge.name}
              data-provenance={badge.kind}
              data-provenance-axis={badge.axis}
              className={`${BADGE_CHIP} ${badge.className}`}
            >
              {badge.text}
            </abbr>
          ))}
        </span>
        <div className={styles.problemMeta}>
          {problem.grade ? (
            <span className={styles.gradeBadge}>{problem.grade}</span>
          ) : null}
          <span>{problem.chapter || "단원 미지정"}</span>
          {/* 옛 카드의 마이크로 라벨 셋(난이도·**유형**·검수) 중 유형만 빠져 있었다. */}
          {problem.problemType ? <span>{problem.problemType}</span> : null}
          {problem.difficulty ? (
            <span className={styles.difficultyBadge}>{problem.difficulty}</span>
          ) : null}
          {problem.problemCode ? (
            <span className={styles.problemCode}>{problem.problemCode}</span>
          ) : null}
          {problem.reviewStatus &&
          problem.reviewStatus in REVIEW_STATUS_LABEL ? (
            <span className={styles.reviewBadge}>
              {
                REVIEW_STATUS_LABEL[
                  problem.reviewStatus as keyof typeof REVIEW_STATUS_LABEL
                ]
              }
            </span>
          ) : null}
        </div>
      </div>
      <div className={styles.rowMain}>
        {problem.section ? (
          <p className={styles.sectionLabel}>{problem.section}</p>
        ) : null}
        <div className={styles.problemBody}>
          <UnifiedProblem problem={problem} />
        </div>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.textButton}
            aria-expanded={answerVisible}
            aria-controls={`${id}-answer`}
            onClick={() => setAnswerVisible((value) => !value)}
          >
            {answerVisible ? "정답 닫기" : "정답 보기"}
          </button>
          <button
            type="button"
            className={styles.textButton}
            aria-expanded={expanded}
            aria-controls={`${id}-detail`}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "상세 접기" : "문제 상세"}
            <span className={expanded ? styles.chevronUp : styles.chevronDown}>
              <Icon name="chevron" />
            </span>
          </button>
          <button
            type="button"
            className={`${styles.addButton} ${selected ? styles.addedButton : ""}`}
            aria-pressed={selected}
            aria-label={`${number}번 문제 ${selected ? "담기 취소" : "담기"}`}
            disabled={addDisabled}
            aria-describedby={
              ineligibleReason ? `${id}-eligibility` : undefined
            }
            onClick={toggle}
          >
            <Icon name={selected ? "check" : "plus"} />
            {selected ? "담기 완료" : addDisabled ? "담기 불가" : "문제 담기"}
          </button>
        </div>
        {ineligibleReason ? (
          <p id={`${id}-eligibility`} className={styles.ineligibleReason}>
            {ineligibleReason}
          </p>
        ) : null}
        {answerVisible ? (
          <div id={`${id}-answer`} className={styles.answer}>
            <span className={styles.answerLabel}>정답</span>
            <MathText
              text={
                problem.answer
                  ? displayFractions(
                      problem.answer,
                      problem.grade,
                      problem.content,
                    )
                  : "등록된 정답이 없습니다."
              }
            />
          </div>
        ) : null}
        {expanded ? (
          <div id={`${id}-detail`} className={styles.detail}>
            <dl className={styles.detailMeta}>
              <div>
                <dt>소단원</dt>
                <dd>{problem.section || "미지정"}</dd>
              </div>
              <div>
                <dt>출처</dt>
                <dd>
                  {problem.sourceLabel ||
                    SOURCE_LABEL[problem.source as keyof typeof SOURCE_LABEL] ||
                    "문제은행"}
                </dd>
              </div>
              <div>
                <dt>문제 번호</dt>
                <dd>{problem.problemCode || problem.id}</dd>
              </div>
            </dl>
            <h4>풀이</h4>
            <MathText
              as="div"
              text={
                problem.solution
                  ? displayFractions(
                      problem.solution,
                      problem.grade,
                      problem.content,
                    )
                  : "등록된 풀이가 없습니다."
              }
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function pageNumbers(
  page: number,
  total: number,
): (number | "start-gap" | "end-gap")[] {
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const valid = [...pages]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
  const result: (number | "start-gap" | "end-gap")[] = [];
  valid.forEach((value, index) => {
    if (index > 0 && value - valid[index - 1] > 1)
      result.push(value <= page ? "start-gap" : "end-gap");
    result.push(value);
  });
  return result;
}

export default function BankView({
  initialData,
  initialFilters,
  selected,
  onToggle,
  onExport,
}: BankViewProps) {
  const [search, setSearch] = useState(initialFilters?.q ?? "");
  const [basketOpen, setBasketOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rangeEditing, setRangeEditing] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const basketToggle = useRef<HTMLButtonElement>(null);
  const basketHeading = useRef<HTMLHeadingElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const [request, setRequest] = useState<{ filters: Filters; version: number }>(
    {
      filters: {
        ...EMPTY_FILTERS,
        q: initialFilters?.q?.trim() ?? "",
        grade: initialFilters?.grade ?? "",
        page:
          initialFilters?.q?.trim() || initialFilters?.grade
            ? 1
            : initialData.page,
      },
      version: initialFilters?.q?.trim() || initialFilters?.grade ? 1 : 0,
    },
  );
  const [response, setResponse] = useState<{
    data: BankData;
    error?: string;
    version: number;
  }>({
    data: initialData,
    error: initialData.error,
    version: 0,
  });
  const { filters } = request;
  const { data } = response;
  const loading = request.version !== response.version;
  const error = loading ? undefined : response.error;
  const selectedIds = useMemo(
    () => new Set(selected.map((problem) => problem.id)),
    [selected],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(data.total / Math.max(1, data.pageSize)),
  );
  const firstRow = (data.page - 1) * data.pageSize + 1;
  const units = data.units ?? initialData.units ?? [];
  const rangeSummary = describeRange(units, filters.unitFrom, filters.unitTo);
  const activeFilters = (
    [
      { key: "q", label: "검색어", value: filters.q },
      { key: "grade", label: "학년", value: filters.grade },
      { key: "chapter", label: "단원", value: filters.chapter },
      { key: "difficulty", label: "난이도", value: filters.difficulty },
      {
        key: "unitFrom",
        label: "범위",
        value: rangeSummary?.text || (filters.unitFrom ? "선택한 단원" : ""),
      },
      {
        key: "problemFilter",
        label: "유형",
        value:
          PROBLEM_FILTER_OPTIONS.find(
            (option) => option.value === filters.problemFilter,
          )?.label || "",
      },
      {
        key: "reviewStatus",
        label: "상태",
        value:
          REVIEW_STATUS_LABEL[
            filters.reviewStatus as keyof typeof REVIEW_STATUS_LABEL
          ] || "",
      },
      {
        key: "source",
        label: "출처",
        value: SOURCE_LABEL[filters.source as keyof typeof SOURCE_LABEL] || "",
      },
      ...ASSET_FILTERS.map(({ key, label }) => ({
        key,
        label: "자료",
        value: filters[key] ? `${label} 있음` : "",
      })),
    ] as const
  ).filter(({ value }) => Boolean(value));
  const availableGrades = data.grades.length ? data.grades : initialData.grades;
  const eligibleOnPage = data.problems.filter(
    (problem) => problem.eligible !== false,
  );
  const selectedOnPage = eligibleOnPage.filter((problem) =>
    selectedIds.has(problem.id),
  ).length;
  const allOnPageSelected =
    eligibleOnPage.length > 0 && selectedOnPage === eligibleOnPage.length;
  const headingId = useId();

  useEffect(() => {
    // Reuse the server page unless dashboard entry filters need a fresh request.
    if (request.version === 0) return;
    const controller = new AbortController();
    // The real bank splits one dropdown into problemType OR format. Do not send
    // the UI value, empty strings, or false booleans to the strict API contract.
    const { problemFilter, ...query } = request.filters;
    const params = new URLSearchParams();
    Object.entries({
      ...query,
      ...splitProblemFilterValue(problemFilter),
    }).forEach(([key, value]) => {
      if (value !== "" && value !== false && value !== undefined)
        params.set(key, String(value));
    });

    async function loadProblems() {
      try {
        const result = await fetch(`${getStudioEndpoints().problems}?${params}`, {
          signal: controller.signal,
        });
        const payload: BankData = await result.json();
        if (!result.ok || payload.error)
          throw new Error(
            payload.error || `문제를 불러오지 못했습니다. (${result.status})`,
          );
        if (
          !Array.isArray(payload.problems) ||
          !Array.isArray(payload.grades) ||
          !Array.isArray(payload.chapters) ||
          !Number.isFinite(payload.total) ||
          !Number.isFinite(payload.page) ||
          !(payload.pageSize > 0)
        ) {
          throw new Error(
            "문제 목록을 확인할 수 없습니다. 다시 시도해 주세요.",
          );
        }
        if (!controller.signal.aborted)
          setResponse({ data: payload, version: request.version });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setResponse((previous) => ({
          data: previous.data,
          version: request.version,
          error:
            cause instanceof Error && !(cause instanceof SyntaxError)
              ? cause.message
              : "문제를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        }));
      }
    }

    void loadProblems();
    return () => controller.abort();
  }, [request]);

  function updateFilters(patch: Partial<Filters>) {
    setRequest((current) => ({
      filters: { ...current.filters, ...patch, page: patch.page ?? 1 },
      version: current.version + 1,
    }));
  }

  function resetFilters() {
    setSearch("");
    setRangeEditing(false);
    updateFilters(EMPTY_FILTERS);
  }

  function removeFilter(key: (typeof activeFilters)[number]["key"]) {
    if (key === "q") setSearch("");
    // A unit belongs to its grade; removing the grade also removes that unit.
    if (key === "grade")
      updateFilters({ grade: "", chapter: "", unitFrom: "", unitTo: "" });
    else if (key === "chapter")
      updateFilters({ chapter: "", unitFrom: "", unitTo: "" });
    else if (key === "unitFrom") updateFilters({ unitFrom: "", unitTo: "" });
    else if (
      key === "hasFigure" ||
      key === "hasSolution" ||
      key === "hasAnswer"
    )
      updateFilters({ [key]: false });
    else updateFilters({ [key]: "" });
    resultsHeading.current?.focus({ preventScroll: true });
  }

  function goToPage(page: number) {
    updateFilters({ page });
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView({ block: "start" });
  }

  function togglePage() {
    if (loading || error) return;
    eligibleOnPage.forEach((problem) => {
      if (allOnPageSelected || !selectedIds.has(problem.id)) onToggle(problem);
    });
  }

  return (
    <section className={styles.bank} aria-labelledby={headingId}>
      <WorkspacePageHeader
        title="문제은행"
        titleId={headingId}
        description="학년·단원별로 문제를 찾고 수업에 필요한 문항을 담으세요."
      />

      <div className={styles.workspace}>
        <div className={styles.results}>
          <div className={styles.filters}>
            <div className={styles.searchRow}>
              <form
                className={styles.searchForm}
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateFilters({ q: search.trim() });
                }}
              >
                <Icon name="search" />
                <input
                  ref={searchInput}
                  aria-label="문제 검색"
                  aria-describedby={`${headingId}-search-help`}
                  placeholder="내용·코드·정답·해설·학교"
                  maxLength={100}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search ? (
                  <button
                    type="button"
                    className={styles.clearSearch}
                    aria-label="검색어 지우기"
                    onClick={() => {
                      setSearch("");
                      if (filters.q) updateFilters({ q: "" });
                      searchInput.current?.focus();
                    }}
                  >
                    ×
                  </button>
                ) : null}
                <button className={styles.searchButton} type="submit">
                  검색
                </button>
              </form>
              <div className={styles.filterToolbar}>
                <button
                  type="button"
                  className={styles.filterToggle}
                  aria-expanded={filtersOpen}
                  aria-controls={`${headingId}-filters`}
                  onClick={() => setFiltersOpen((value) => !value)}
                >
                  <Icon name="filter" />
                  {filtersOpen ? "필터 접기" : "상세 필터"}
                  <span
                    className={
                      filtersOpen ? styles.chevronUp : styles.chevronDown
                    }
                  >
                    <Icon name="chevron" />
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.resetButton}
                  disabled={
                    !activeFilters.length && !search && filters.page === 1
                  }
                  onClick={resetFilters}
                >
                  <Icon name="reset" />
                  초기화
                </button>
              </div>
            </div>
            <p id={`${headingId}-search-help`} className={styles.searchHelp}>
              본문·문항번호·정답·해설·학교를 함께 검색합니다.
            </p>
            <div
              id={`${headingId}-filters`}
              className={`${styles.selectFilters} ${filtersOpen ? styles.filtersOpen : ""}`}
            >
              <div className={styles.filterField}>
                <label
                  className={styles.filterLabel}
                  htmlFor={`${headingId}-grade`}
                >
                  학년
                </label>
                <div className={styles.selectWrap}>
                  <select
                    id={`${headingId}-grade`}
                    value={filters.grade}
                    onChange={(event) =>
                      updateFilters({
                        grade: event.target.value,
                        chapter: "",
                        unitFrom: "",
                        unitTo: "",
                      })
                    }
                  >
                    <option value="">전체 학년</option>
                    {filters.grade &&
                    !availableGrades.some(
                      ({ grade }) => grade === filters.grade,
                    ) ? (
                      <option value={filters.grade}>{filters.grade}</option>
                    ) : null}
                    {availableGrades.map(({ grade }) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                  <span className={styles.chevronDown}>
                    <Icon name="chevron" />
                  </span>
                </div>
              </div>
              <div className={styles.filterField}>
                <label
                  className={styles.filterLabel}
                  htmlFor={`${headingId}-chapter`}
                >
                  단원
                </label>
                <div className={styles.selectWrap}>
                  <select
                    id={`${headingId}-chapter`}
                    value={filters.chapter}
                    disabled={loading}
                    onChange={(event) =>
                      updateFilters({
                        chapter: event.target.value,
                        unitFrom: "",
                        unitTo: "",
                      })
                    }
                  >
                    <option value="">전체 단원</option>
                    {filters.chapter &&
                    !data.chapters.includes(filters.chapter) ? (
                      <option value={filters.chapter}>{filters.chapter}</option>
                    ) : null}
                    {data.chapters.map((chapter) => (
                      <option key={chapter} value={chapter}>
                        {chapter}
                      </option>
                    ))}
                  </select>
                  <span className={styles.chevronDown}>
                    <Icon name="chevron" />
                  </span>
                </div>
              </div>
              <div className={styles.filterField}>
                <label
                  className={styles.filterLabel}
                  htmlFor={`${headingId}-range`}
                >
                  범위
                </label>
                <button
                  id={`${headingId}-range`}
                  type="button"
                  className={styles.rangeButton}
                  aria-expanded={rangeEditing}
                  aria-controls={`${headingId}-range-panel`}
                  disabled={units.length === 0}
                  title={rangeSummary?.text}
                  onClick={() => setRangeEditing((value) => !value)}
                >
                  <span>{rangeSummary?.text || "단원 범위 선택"}</span>
                  <span
                    className={
                      rangeEditing ? styles.chevronUp : styles.chevronDown
                    }
                  >
                    <Icon name="chevron" />
                  </span>
                </button>
              </div>
              <div className={styles.filterField}>
                <label
                  className={styles.filterLabel}
                  htmlFor={`${headingId}-difficulty`}
                >
                  난이도
                </label>
                <div className={styles.selectWrap}>
                  <select
                    id={`${headingId}-difficulty`}
                    value={filters.difficulty}
                    onChange={(event) =>
                      updateFilters({ difficulty: event.target.value })
                    }
                  >
                    <option value="">전체 난이도</option>
                    {DIFFICULTY_LADDER.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                  <span className={styles.chevronDown}>
                    <Icon name="chevron" />
                  </span>
                </div>
              </div>
              {(
                [
                  {
                    key: "problemFilter",
                    label: "유형",
                    empty: "전체 유형",
                    options: PROBLEM_FILTER_OPTIONS,
                  },
                  {
                    key: "reviewStatus",
                    label: "상태",
                    empty: "출제 가능",
                    options: Object.entries(REVIEW_STATUS_LABEL).map(
                      ([value, label]) => ({ value, label }),
                    ),
                  },
                  {
                    key: "source",
                    label: "출처",
                    empty: "전체 출처",
                    options: SOURCE_OPTIONS.map((value) => ({
                      value,
                      label: SOURCE_LABEL[value],
                    })),
                  },
                ] as const
              ).map(({ key, label, empty, options }) => (
                <div key={key} className={styles.filterField}>
                  <label
                    className={styles.filterLabel}
                    htmlFor={`${headingId}-${key}`}
                  >
                    {label}
                  </label>
                  <div className={styles.selectWrap}>
                    <select
                      id={`${headingId}-${key}`}
                      value={filters[key]}
                      onChange={(event) =>
                        updateFilters({ [key]: event.target.value })
                      }
                    >
                      <option value="">{empty}</option>
                      {options.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <span className={styles.chevronDown}>
                      <Icon name="chevron" />
                    </span>
                  </div>
                </div>
              ))}
              <fieldset className={styles.assetFilters}>
                <legend className={styles.filterLabel}>자료 있는 문제만</legend>
                <div>
                  {ASSET_FILTERS.map(({ key, label }) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={filters[key]}
                        onChange={(event) =>
                          updateFilters({ [key]: event.target.checked })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {rangeEditing ? (
                <div
                  id={`${headingId}-range-panel`}
                  className={styles.rangePanel}
                >
                  <div className={styles.rangeHeader}>
                    {/*
                      범위 값을 여기 적지 않는다 — 아래 「적용한 검색 조건」 칩이 똑같은
                      글자를 갖고 있어 한 화면에 두 번 나왔다(원장님 2026-09-14
                      「범위가 3중으로 나옴」). 안내문(「시작 소단원을 고르세요」)도
                      고르개가 제 오른쪽 위에 이미 쓰므로 여기서 되풀이하지 않는다.
                      머리글은 단추만 맡고, 값은 칩 한 곳에서만 읽힌다.
                    */}
                    {filters.unitFrom ? (
                      <button
                        type="button"
                        className={styles.resetButton}
                        onClick={() =>
                          updateFilters({ unitFrom: "", unitTo: "" })
                        }
                      >
                        범위 전체로
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.resetButton}
                      onClick={() => setRangeEditing(false)}
                    >
                      범위 접기
                    </button>
                  </div>
                  <UnitRangePicker
                    units={units}
                    startUnitId={filters.unitFrom || null}
                    endUnitId={filters.unitTo || null}
                    onChange={(unitFrom, unitTo) =>
                      updateFilters({
                        unitFrom,
                        unitTo,
                        grade: "",
                        chapter: "",
                      })
                    }
                    label="문제은행 단원 범위"
                    columnMaxHeightPx={220}
                  />
                  {rangeSummary ? (
                    <p className={styles.rangeDescription}>
                      {rangeSummary.label}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {activeFilters.length ? (
              <div
                className={styles.filterSummary}
                role="group"
                aria-label="적용한 검색 조건"
              >
                {activeFilters.map(({ key, label, value }) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.filterChip}
                    aria-label={`${label} ${value} 조건 해제${key === "grade" && filters.chapter ? " (단원도 해제)" : ""}`}
                    onClick={() => removeFilter(key)}
                  >
                    <span className={styles.chipLabel}>{label}</span>
                    <span className={styles.chipValue}>{value}</span>
                    <Icon name="close" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.resultsHeader}>
            <h2 ref={resultsHeading} tabIndex={-1}>
              문제 목록{" "}
              <span role="status">
                {loading ? (
                  "검색 중…"
                ) : error ? (
                  ""
                ) : (
                  <>
                    <strong>{data.total.toLocaleString("ko-KR")}</strong>문항
                  </>
                )}
              </span>
            </h2>
            <label className={styles.selectPage}>
              <input
                type="checkbox"
                checked={allOnPageSelected && !loading && !error}
                ref={(node) => {
                  if (node)
                    node.indeterminate =
                      !loading &&
                      !error &&
                      selectedOnPage > 0 &&
                      !allOnPageSelected;
                }}
                disabled={
                  loading || Boolean(error) || eligibleOnPage.length === 0
                }
                onChange={togglePage}
              />
              이 페이지 전체 담기
            </label>
          </div>
          <div
            className={styles.problemList}
            /*
              로딩·오류·「없어요」는 **칸 하나짜리 안내**라 격자를 안 씌운다 — 씌우면
              그 안내가 카드 폭(414px)으로 잘려 한 귀퉁이에 몰린다. 문항이 실제로
              있을 때만 다단이 된다.
            */
            style={
              !loading && !error && data.problems.length > 0
                ? PROBLEM_GRID_STYLE
                : undefined
            }
            aria-busy={loading}
          >
            {loading ? (
              <WorkProgress
                key={request.version}
                label="문제를 찾고 있어요"
                detail="선택한 조건에 맞는 문제를 불러옵니다."
              />
            ) : error ? (
              <div className={styles.emptyState} role="alert">
                <span className={styles.stateIcon}>!</span>
                <h3>문제를 불러오지 못했어요</h3>
                <p>{error}</p>
                <button
                  type="button"
                  className={styles.outlineButton}
                  onClick={() => updateFilters({ page: filters.page })}
                >
                  <Icon name="reset" />
                  다시 시도
                </button>
              </div>
            ) : data.problems.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.stateIcon}>
                  <Icon name="search" />
                </span>
                <h3>조건에 맞는 문제가 없어요</h3>
                <p>검색어를 줄이거나 학년과 단원을 바꿔보세요.</p>
                {activeFilters.length ? (
                  <button
                    type="button"
                    className={styles.outlineButton}
                    onClick={resetFilters}
                  >
                    검색 조건 초기화
                  </button>
                ) : null}
              </div>
            ) : (
              data.problems.map((problem, index) => (
                <ProblemRow
                  key={problem.id}
                  problem={problem}
                  number={firstRow + index}
                  selected={selectedIds.has(problem.id)}
                  onToggle={onToggle}
                />
              ))
            )}
          </div>
          {!loading && !error && data.problems.length > 0 ? (
            <div className={styles.listFooter}>
              <p>
                {firstRow.toLocaleString("ko-KR")}–
                {(firstRow + data.problems.length - 1).toLocaleString("ko-KR")}{" "}
                / {data.total.toLocaleString("ko-KR")}문항
              </p>
              <nav className={styles.pagination} aria-label="문제 목록 페이지">
                <button
                  type="button"
                  aria-label="이전 페이지"
                  disabled={data.page <= 1}
                  onClick={() => goToPage(data.page - 1)}
                >
                  <span className={styles.previousIcon}>
                    <Icon name="chevron" />
                  </span>
                </button>
                <span className={styles.mobilePageNumber}>
                  {data.page} / {totalPages} 페이지
                </span>
                {pageNumbers(data.page, totalPages).map((page) =>
                  typeof page === "number" ? (
                    <button
                      type="button"
                      key={page}
                      aria-label={`${page}페이지`}
                      aria-current={data.page === page ? "page" : undefined}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={page} className={styles.pageGap}>
                      …
                    </span>
                  ),
                )}
                <button
                  type="button"
                  aria-label="다음 페이지"
                  disabled={data.page >= totalPages}
                  onClick={() => goToPage(data.page + 1)}
                >
                  <Icon name="chevron" />
                </button>
              </nav>
            </div>
          ) : null}
        </div>

        <aside
          className={`${styles.basket} ${basketOpen ? styles.basketOpen : ""}`}
          aria-label="담은 문제"
          onKeyDown={(event) => {
            if (event.key === "Escape" && basketOpen) {
              event.preventDefault();
              setBasketOpen(false);
              basketToggle.current?.focus();
            }
          }}
        >
          <div className={styles.basketHeading}>
            <span className={styles.basketIcon}>
              <Icon name="basket" />
            </span>
            <h2 ref={basketHeading} tabIndex={-1}>
              담은 문제
            </h2>
            <span
              className={styles.basketCount}
              role="status"
              aria-label={`담은 문제 ${selected.length}문항`}
            >
              {selected.length.toLocaleString("ko-KR")}
              <small>문항</small>
            </span>
            <button
              ref={basketToggle}
              type="button"
              className={styles.basketToggle}
              aria-expanded={basketOpen}
              aria-controls={`${headingId}-basket-content`}
              aria-label={
                basketOpen ? "담은 문제 목록 닫기" : "담은 문제 목록 보기"
              }
              onClick={() => setBasketOpen((value) => !value)}
            >
              {basketOpen ? "닫기" : "목록"}
              <span
                className={basketOpen ? styles.chevronDown : styles.chevronUp}
              >
                <Icon name="chevron" />
              </span>
            </button>
          </div>
          <div
            id={`${headingId}-basket-content`}
            className={styles.basketContent}
          >
            <div className={styles.basketIntro}>
              <p className={styles.basketDescription}>
                {selected.length
                  ? "검색 조건을 바꿔도 담은 문제는 유지됩니다."
                  : "목록에서 필요한 문제를 선택하세요."}
              </p>
              {selected.length ? (
                <button
                  type="button"
                  className={styles.clearBasket}
                  onClick={() => {
                    basketHeading.current?.focus({ preventScroll: true });
                    selected.forEach(onToggle);
                  }}
                >
                  전체 비우기
                </button>
              ) : null}
            </div>
            {selected.length ? (
              <ol className={styles.basketList}>
                {selected.map((problem, index) => (
                  <li key={problem.id}>
                    <span className={styles.basketNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong
                        title={
                          problem.section || problem.chapter || "단원 미지정"
                        }
                      >
                        {problem.section || problem.chapter || "단원 미지정"}
                      </strong>
                      <span>
                        {[problem.grade, problem.difficulty]
                          .filter(Boolean)
                          .join(" · ") ||
                          problem.problemCode ||
                          "선택한 문제"}
                      </span>
                      {problem.problemCode ? (
                        <span>{problem.problemCode}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label={`${problem.problemCode || problem.chapter || index + 1} 문제 담기 취소`}
                      onClick={(event) => {
                        const row = event.currentTarget.closest("li");
                        const next =
                          row?.nextElementSibling?.querySelector("button") ||
                          row?.previousElementSibling?.querySelector("button");
                        (next || basketHeading.current)?.focus({
                          preventScroll: true,
                        });
                        onToggle(problem);
                      }}
                    >
                      <Icon name="close" />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={styles.basketEmpty}>
                <Icon name="basket" />
                <p>담은 문제가 없습니다</p>
                <span>
                  문제의 ‘문제 담기’를 누르면
                  <br />
                  여기에서 모아 볼 수 있습니다.
                </span>
              </div>
            )}
          </div>
          <div className={styles.basketFooter}>
            <button
              type="button"
              className={styles.exportButton}
              disabled={selected.length === 0}
              onClick={onExport}
            >
              <span>시험지 편집</span>
              <Icon name="arrow" />
            </button>
            <p>
              {selected.length
                ? "문제 순서와 배치를 정한 뒤 인쇄하세요."
                : "문제를 담으면 시험지 편집을 시작할 수 있어요."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
