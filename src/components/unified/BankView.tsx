"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import UnifiedProblem from "./UnifiedProblem";
import { displayFractions } from "./fractionDisplay";
import type { BankData, BankViewProps, StudioProblem } from "./types";
import styles from "./BankView.module.css";

type Filters = {
  q: string;
  grade: string;
  chapter: string;
  difficulty: string;
  page: number;
};

function Icon({
  name,
}: {
  name: "search" | "arrow" | "chevron" | "reset" | "basket" | "check" | "plus";
}) {
  const paths = {
    search: "m21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    chevron: "m9 5 7 7-7 7",
    reset: "M3 10a9 9 0 1 1 2 8M3 4v6h6",
    basket: "m3 8 2 12h14l2-12H3Zm5 0 4-6 4 6M9 12v4m6-4v4",
    check: "m5 12 4 4L19 6",
    plus: "M12 5v14M5 12h14",
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
  problem: StudioProblem;
  number: number;
  selected: boolean;
  onToggle: (problem: StudioProblem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [answerVisible, setAnswerVisible] = useState(false);
  const id = useId();

  return (
    <article
      className={`${styles.problemRow} ${selected ? styles.selectedRow : ""}`}
    >
      <div className={styles.rowSelect}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(problem)}
          aria-label={`${number}번 문제 담기`}
        />
        <span className={styles.rowNumber}>
          {String(number).padStart(2, "0")}
        </span>
      </div>
      <div className={styles.rowMain}>
        <div className={styles.problemMeta}>
          {problem.grade ? (
            <span className={styles.gradeBadge}>{problem.grade}</span>
          ) : null}
          <span>{problem.chapter || "단원 미지정"}</span>
          {problem.difficulty ? (
            <span className={styles.difficultyBadge}>{problem.difficulty}</span>
          ) : null}
          {problem.problemCode ? (
            <span className={styles.problemCode}>{problem.problemCode}</span>
          ) : null}
        </div>
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
          <span className={styles.actionDivider} aria-hidden="true" />
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
            onClick={() => onToggle(problem)}
          >
            <Icon name={selected ? "check" : "plus"} />
            {selected ? "담았어요" : "문제 담기"}
          </button>
        </div>
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
                <dd>{problem.sourceLabel || "문제은행"}</dd>
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
  selected,
  onToggle,
  onExport,
}: BankViewProps) {
  const [search, setSearch] = useState("");
  const [request, setRequest] = useState<{ filters: Filters; version: number }>(
    {
      filters: {
        q: "",
        grade: "",
        chapter: "",
        difficulty: "",
        page: initialData.page,
      },
      version: 0,
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
  const activeFilters = [
    filters.q,
    filters.grade,
    filters.chapter,
    filters.difficulty,
  ].filter(Boolean);
  const availableGrades = data.grades.length ? data.grades : initialData.grades;
  const selectedOnPage = data.problems.filter((problem) =>
    selectedIds.has(problem.id),
  ).length;
  const allOnPageSelected =
    data.problems.length > 0 && selectedOnPage === data.problems.length;
  const headingId = useId();

  useEffect(() => {
    // The server-provided first page is already ready; only user actions fetch.
    if (request.version === 0) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      ...request.filters,
      page: String(request.filters.page),
    });

    async function loadProblems() {
      try {
        const result = await fetch(`/api/dev/unified/problems?${params}`, {
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
    updateFilters({ q: "", grade: "", chapter: "", difficulty: "" });
  }

  function togglePage() {
    data.problems.forEach((problem) => {
      if (allOnPageSelected || !selectedIds.has(problem.id)) onToggle(problem);
    });
  }

  return (
    <section className={styles.bank} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>QUESTION BANK</p>
          <h1 id={headingId}>
            수업에 맞는 문제를,
            <br className={styles.mobileBreak} /> 한곳에서.
          </h1>
          <p className={styles.subtitle}>
            학년과 단원을 고르고, 필요한 문제만 담아보세요.
          </p>
        </div>
        <div className={styles.headerNote}>
          <span className={styles.noteLine} />
          오늘의 수업을 위한
          <br />
          <strong>나만의 문제 모음</strong>
        </div>
      </header>

      <div className={styles.filters}>
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
            aria-label="문제 검색"
            placeholder="문제 내용, 소단원 또는 문제 번호 검색"
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
              }}
            >
              ×
            </button>
          ) : null}
          <button className={styles.searchButton} type="submit">
            검색
          </button>
        </form>
        <div className={styles.filterLine}>
          <span className={styles.filterLabel} id={`${headingId}-grades`}>
            학년
          </span>
          <div
            className={styles.gradePills}
            role="group"
            aria-labelledby={`${headingId}-grades`}
          >
            <button
              type="button"
              className={styles.gradePill}
              aria-pressed={!filters.grade}
              onClick={() => updateFilters({ grade: "", chapter: "" })}
            >
              전체
            </button>
            {availableGrades.map(({ grade }) => (
              <button
                key={grade}
                type="button"
                className={styles.gradePill}
                aria-pressed={filters.grade === grade}
                onClick={() => updateFilters({ grade, chapter: "" })}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
        <div className={`${styles.filterLine} ${styles.lastFilterLine}`}>
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
                updateFilters({ chapter: event.target.value })
              }
            >
              <option value="">전체 단원</option>
              {filters.chapter && !data.chapters.includes(filters.chapter) ? (
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
          <label
            className={styles.difficultyLabel}
            htmlFor={`${headingId}-difficulty`}
          >
            난이도
          </label>
          <div className={`${styles.selectWrap} ${styles.difficultySelect}`}>
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
          <button
            type="button"
            className={styles.resetButton}
            disabled={!activeFilters.length && !search}
            onClick={resetFilters}
          >
            <Icon name="reset" />
            초기화
          </button>
        </div>
      </div>

      <div className={styles.workspace}>
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2>
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
                  loading || Boolean(error) || data.problems.length === 0
                }
                onChange={togglePage}
              />
              이 페이지 선택
            </label>
          </div>
          {activeFilters.length ? (
            <p className={styles.filterSummary}>
              {activeFilters.map((value, index) => (
                <span key={`${index}-${value}`}>
                  {index === 0 && filters.q ? `“${value}”` : value}
                </span>
              ))}
            </p>
          ) : null}
          <div className={styles.problemList} aria-busy={loading}>
            {loading ? (
              <div className={styles.loadingState} role="status">
                <span className={styles.loader} />
                <strong>문제를 찾고 있어요</strong>
                <p>선택한 조건에 맞는 문제를 불러옵니다.</p>
              </div>
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
                  onClick={() => updateFilters({ page: data.page - 1 })}
                >
                  <span className={styles.previousIcon}>
                    <Icon name="chevron" />
                  </span>
                </button>
                {pageNumbers(data.page, totalPages).map((page) =>
                  typeof page === "number" ? (
                    <button
                      type="button"
                      key={page}
                      aria-label={`${page}페이지`}
                      aria-current={data.page === page ? "page" : undefined}
                      onClick={() => updateFilters({ page })}
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
                  onClick={() => updateFilters({ page: data.page + 1 })}
                >
                  <Icon name="chevron" />
                </button>
              </nav>
            </div>
          ) : null}
        </div>

        <aside className={styles.basket} aria-label="담은 문제">
          <div className={styles.basketHeading}>
            <span className={styles.basketIcon}>
              <Icon name="basket" />
            </span>
            <h2>담은 문제</h2>
            <span className={styles.basketCount} aria-live="polite">
              {selected.length.toLocaleString("ko-KR")}
            </span>
          </div>
          <p className={styles.basketDescription}>
            {selected.length
              ? "선택한 문제로 수업 자료를 완성하세요."
              : "수업에 필요한 문제를 하나씩 모아보세요."}
          </p>
          {selected.length ? (
            <ol className={styles.basketList}>
              {selected.map((problem, index) => (
                <li key={problem.id}>
                  <span className={styles.basketNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{problem.chapter || "단원 미지정"}</strong>
                    <span>
                      {[problem.grade, problem.difficulty]
                        .filter(Boolean)
                        .join(" · ") ||
                        problem.problemCode ||
                        "선택한 문제"}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`${problem.problemCode || problem.chapter || index + 1} 문제 담기 취소`}
                    onClick={() => onToggle(problem)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.basketEmpty}>
              <span className={styles.emptySheets} aria-hidden="true">
                <span />
                <span />
                <Icon name="plus" />
              </span>
              <p>아직 담은 문제가 없어요</p>
              <span>목록에서 + 문제 담기를 눌러주세요.</span>
            </div>
          )}
          <div className={styles.basketFooter}>
            <div>
              <span>선택한 문제</span>
              <strong>
                {selected.length.toLocaleString("ko-KR")} <small>문항</small>
              </strong>
            </div>
            <button
              type="button"
              className={styles.exportButton}
              disabled={selected.length === 0}
              onClick={onExport}
            >
              내보내기
              <Icon name="arrow" />
            </button>
            <p>문제를 확인하고 인쇄할 수 있어요.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
