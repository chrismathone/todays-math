"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ExamBuilderSource, ExamScope, ExamScopeBranch } from "./types";
import { canSelectScope } from "./scopeAvailability";
import s from "./ExamBuilder.module.css";

type Stage = "group" | "detail" | "lesson";
const names = { group: "학년·과정", detail: "단원", lesson: "차시" };

/** S2: 앞 선택은 요약으로 접고 현재 단계의 목록만 그린다. */
export default function ScopeSequencePicker({
  scopes,
  selected,
  initialGroup,
  disabled = false,
  controls,
  restoreRequest = 0,
  loading = false,
  error,
  onRetry,
  onChange,
  navigation,
  onBrowse,
  retryRequest = 0,
}: {
  scopes: ExamScope[];
  selected: string[];
  initialGroup?: string;
  disabled?: boolean;
  controls?: ReactNode;
  restoreRequest?: number;
  loading?: boolean;
  error?: string;
  onRetry: () => void;
  onChange: (ids: string[]) => void;
  navigation?: Pick<
    NonNullable<ExamBuilderSource<never>["scopeNavigation"]>,
    "groups" | "details" | "lessons"
  >;
  onBrowse?: (scopes: ExamScope[]) => void;
  retryRequest?: number;
}) {
  const restored = scopes.find((scope) => scope.id === selected.at(-1));
  const [group, setGroup] = useState(restored?.group ?? initialGroup ?? "");
  const [detail, setDetail] = useState(restored?.detail ?? "");
  const [stage, setStage] = useState<Stage>(
    restored ? "lesson" : initialGroup ? "detail" : "group",
  );
  const [touched, setTouched] = useState(false);
  const [restoredId, setRestoredId] = useState(restored?.id);
  const [lastRestoreRequest, setLastRestoreRequest] = useState(restoreRequest);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [focusRequest, setFocusRequest] = useState(0);
  const frame = useRef<HTMLElement>(null);
  const pathKey = JSON.stringify([stage, group, detail]);
  const [pathResult, setPathResult] = useState<{
    navigation: typeof navigation;
    key: string;
    groups?: ExamScopeBranch[];
    details?: ExamScopeBranch[];
    scopes?: ExamScope[];
    error?: string;
  }>();
  const path =
    pathResult?.navigation === navigation && pathResult?.key === pathKey
      ? pathResult
      : undefined;
  useEffect(() => {
    if (!navigation) return;
    const controller = new AbortController();
    const load = async () =>
      stage === "group"
        ? { groups: await navigation.groups(controller.signal) }
        : stage === "detail"
          ? { details: await navigation.details(group, controller.signal) }
          : {
              scopes: await navigation.lessons(
                group,
                detail,
                controller.signal,
              ),
            };
    void load()
      .then((value) => {
        if (!controller.signal.aborted)
          setPathResult({ navigation, key: pathKey, ...value });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setPathResult({
            navigation,
            key: pathKey,
            error:
              cause instanceof Error
                ? cause.message
                : "출제 범위를 불러오지 못했습니다.",
          });
      });
    return () => controller.abort();
  }, [navigation, stage, group, detail, pathKey, retryRequest]);
  if (restoreRequest !== lastRestoreRequest) {
    setLastRestoreRequest(restoreRequest);
    setTouched(false);
    setRestoredId(undefined);
  }
  // Saved rows can acquire curriculum labels after mount. Restore the path once,
  // until the teacher starts navigating; changing grades never clears the basket.
  if (!touched && restored && restored.id !== restoredId) {
    setRestoredId(restored.id);
    setGroup(restored.group);
    setDetail(restored.detail ?? "");
    setStage("lesson");
    setQuery("");
    setPage(0);
  }
  useLayoutEffect(() => {
    if (focusRequest)
      frame.current
        ?.querySelector<HTMLElement>("[data-scope-stage] h3")
        ?.focus();
  }, [focusRequest]);
  const groups = navigation
    ? (path?.groups ?? [])
    : [...new Set(scopes.map((scope) => scope.group))];
  const inGroup = scopes.filter((scope) => scope.group === group);
  const details = navigation
    ? (path?.details ?? [])
    : [...new Set(inGroup.map((scope) => scope.detail ?? ""))];
  const lessonMetadata = useMemo(
    () =>
      (navigation ? (path?.scopes ?? []) : scopes).filter(
        (scope) =>
          scope.group === group &&
          (scope.detail ?? "") === detail &&
          scope.label
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [navigation, path, scopes, group, detail, query],
  );
  const lessons = lessonMetadata.map(
    (scope) => scopes.find((row) => row.id === scope.id) ?? scope,
  );
  const pages = Math.max(1, Math.ceil(lessons.length / 20));
  const currentPage = Math.min(page, pages - 1);
  const visibleIds = lessonMetadata
    .slice(currentPage * 20, (currentPage + 1) * 20)
    .map((scope) => scope.id)
    .join(",");
  useEffect(() => {
    if (!navigation || !onBrowse) return;
    const ids = new Set(visibleIds ? visibleIds.split(",") : []);
    onBrowse(
      stage === "lesson"
        ? lessonMetadata.filter((scope) => ids.has(scope.id))
        : [],
    );
  }, [navigation, onBrowse, stage, visibleIds, lessonMetadata]);
  const pending = navigation ? !path : loading;
  const failure = path?.error || error;
  function move(next: Stage) {
    setTouched(true);
    setStage(next);
    setFocusRequest((value) => value + 1);
  }
  function availability(rows: Pick<ExamScope, "count">[]) {
    return rows.some((scope) => canSelectScope(scope, true))
      ? ""
      : rows.every((scope) => scope.count === 0)
        ? " · 출제 가능 문항 없음"
        : " · 출제 가능 수 확인 필요";
  }
  const collapsed = (key: "group" | "detail", value: string) => (
    <div className={s.collapsedScope}>
      <span>{names[key]}</span>
      <strong>{value || "전체"}</strong>
      <button
        type="button"
        disabled={disabled}
        aria-label={`${names[key]} 변경`}
        onClick={() => move(key)}
      >
        변경
      </button>
    </div>
  );
  return (
    <section
      ref={frame}
      className={`${s.panel} ${s.picker} ${s.sequencePicker}`}
      aria-label="범위 고르기"
    >
      <header className={s.panelHeader}>
        <strong>출제할 범위</strong>
      </header>
      {controls}
      <div data-scope-browser className={s.scopeBrowser}>
        {stage !== "group" && collapsed("group", group)}
        {stage === "lesson" && collapsed("detail", detail)}
        <section data-scope-stage={stage}>
          <h3 tabIndex={-1}>{names[stage]}</h3>
          {failure ? (
            <div className={s.empty} role="alert">
              <p>{failure}</p>
              <p>선택은 유지됩니다.</p>
              <button type="button" onClick={onRetry}>
                다시 불러오기
              </button>
            </div>
          ) : pending ? (
            <p className={s.empty} role="status">
              출제 범위를 불러오는 중입니다…
            </p>
          ) : (
            <>
              {stage === "lesson" && (
                <label className={s.lessonSearch}>
                  차시 검색
                  <input
                    type="search"
                    value={query}
                    maxLength={200}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(0);
                    }}
                  />
                </label>
              )}
              <div
                className={s.stageList}
                role="region"
                aria-label={`${names[stage]} 목록`}
                tabIndex={0}
              >
                {stage === "group" &&
                  groups.map((branch) => {
                    const value =
                      typeof branch === "string" ? branch : branch.label;
                    const suffix = navigation
                      ? typeof branch === "string"
                        ? ""
                        : availability([branch])
                      : availability(
                          scopes.filter((scope) => scope.group === value),
                        );
                    return (
                      <button
                        type="button"
                        key={value}
                        disabled={disabled || !!suffix}
                        aria-pressed={group === value}
                        onClick={() => {
                          setGroup(value);
                          setDetail("");
                          setQuery("");
                          setPage(0);
                          move("detail");
                        }}
                      >
                        {value}
                        {suffix}
                      </button>
                    );
                  })}
                {stage === "detail" &&
                  details.map((branch) => {
                    const value =
                      typeof branch === "string" ? branch : branch.label;
                    const suffix = navigation
                      ? typeof branch === "string"
                        ? ""
                        : availability([branch])
                      : availability(
                          inGroup.filter(
                            (scope) => (scope.detail ?? "") === value,
                          ),
                        );
                    return (
                      <button
                        type="button"
                        key={value}
                        disabled={disabled || !!suffix}
                        aria-pressed={detail === value}
                        onClick={() => {
                          setDetail(value);
                          setQuery("");
                          setPage(0);
                          move("lesson");
                        }}
                      >
                        {value || "전체"}
                        {suffix}
                      </button>
                    );
                  })}
                {stage === "lesson" &&
                  lessons
                    .slice(currentPage * 20, (currentPage + 1) * 20)
                    .map((scope) => (
                      <label key={scope.id} className={s.sequenceLesson}>
                        <input
                          type="checkbox"
                          checked={selected.includes(scope.id)}
                          disabled={disabled || !canSelectScope(scope, true)}
                          onChange={(event) =>
                            onChange(
                              event.target.checked
                                ? [...new Set([...selected, scope.id])]
                                : selected.filter((id) => id !== scope.id),
                            )
                          }
                        />
                        <span>
                          {scope.label}{" "}
                          <small>
                            {scope.count === undefined
                              ? loading
                                ? "출제 범위를 불러오는 중입니다…"
                                : "출제 가능 수 확인 필요"
                              : scope.count === 0
                                ? "출제 가능 문항 없음"
                                : `출제 가능 ${scope.count}${scope.countUnit ?? "문항"}`}
                          </small>
                        </span>
                      </label>
                    ))}
                {stage === "lesson" && !lessons.length && (
                  <p className={s.empty}>검색 결과가 없습니다.</p>
                )}
              </div>
              {stage === "lesson" && pages > 1 && (
                <nav className={s.pagination} aria-label="차시 목록 쪽 이동">
                  <button
                    type="button"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    이전 차시
                  </button>
                  <span>
                    {currentPage * 20 + 1}–
                    {Math.min((currentPage + 1) * 20, lessons.length)} /{" "}
                    {lessons.length}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage + 1 === pages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    다음 차시
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  );
}
