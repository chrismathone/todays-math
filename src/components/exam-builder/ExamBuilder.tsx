"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import StudioStepBar from "@/components/unified/StudioStepBar";
import type {
  ExamAllocation,
  ExamBuilderProps,
  ExamBuilderStep,
  ExamScope,
} from "./types";
import ScopePicker from "./ScopePicker";
import QuestionPicker from "./QuestionPicker";
import { moveQuestion, useQuestionReorder } from "./useQuestionReorder";
import s from "./ExamBuilder.module.css";

export default function ExamBuilder<T>({
  source,
  questions,
  onQuestionsChange,
  title,
  onTitleChange,
  difficulties,
  maxQuestions,
  renderQuestion,
  renderOutput,
  initialScopeIds,
  initialGroup,
  canOutput = true,
  onOutputIntent,
  disabled = false,
  status,
}: ExamBuilderProps<T>) {
  const uid = useId();
  // Restored questions belong to the shared draft; they do not mean that this
  // visit has already completed scope selection. Keep them while starting here.
  const [step, setStep] = useState<ExamBuilderStep>("scope");
  const [loaded, setLoaded] = useState<{
    source: typeof source;
    scopes: ExamScope[];
    error?: string;
  }>();
  const [retry, setRetry] = useState(0);
  const scopes = useMemo(
    () => (loaded?.source === source ? loaded.scopes : []),
    [loaded, source],
  );
  const scopeLoading = loaded?.source !== source;
  const [allocations, setAllocations] = useState<ExamAllocation[]>(() => {
    const counts = new Map<string, number>();
    questions.forEach((item) => {
      const id = source.info(item).scopeId;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return initialScopeIds?.length
      ? initialScopeIds.map((scopeId) => ({
          scopeId,
          count: counts.get(scopeId) ?? 5,
        }))
      : Array.from(counts, ([scopeId, count]) => ({ scopeId, count }));
  });
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopePage, setScopePage] = useState(1);
  const [picker, setPicker] = useState<{
    replaceId?: string;
    scopeId?: string;
  } | null>(null);
  const [pickerWidth, setPickerWidth] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<T[][]>([]);
  const operation = useRef<AbortController | null>(null);
  const work = useRef(false);
  const reviewRef = useRef<HTMLElement>(null);
  const scopeRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    if (!focusRequest || step === "output") return;
    const element = step === "scope" ? scopeRef.current : headingRef.current;
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusRequest, step]);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    void source
      .loadScopes(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setLoaded({ source, scopes: result });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setLoaded({
            source,
            scopes: [],
            error:
              cause instanceof Error
                ? cause.message
                : "출제 범위를 불러오지 못했습니다.",
          });
      });
    return () => controller.abort();
  }, [source, retry]);
  const scopeMap = useMemo(
    () => new Map(scopes.map((scope) => [scope.id, scope])),
    [scopes],
  );
  const selectedScopes = allocations.flatMap((row) => {
    const scope = scopeMap.get(row.scopeId);
    return scope ? [scope] : [];
  });
  const requested = allocations.reduce((sum, row) => sum + row.count, 0);
  const valid =
    !!selectedScopes.length &&
    requested > 0 &&
    requested <= maxQuestions &&
    allocations.every((row) => scopeMap.has(row.scopeId));
  const counts = new Map<string, number>();
  questions.forEach((item) => {
    const id = source.info(item).scopeId;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  const groups: {
    id: string;
    label: string;
    items: { item: T; index: number }[];
  }[] = [];
  questions.forEach((item, index) => {
    const info = source.info(item);
    let group = groups.at(-1);
    if (!group || group.id !== info.scopeId) {
      group = {
        id: info.scopeId,
        label: info.scopeLabel || "담은 문항",
        items: [],
      };
      groups.push(group);
    }
    group.items.push({ item, index });
  });
  function change(next: T[]) {
    if (next === questions) return;
    setHistory((current) => [...current.slice(-9), questions]);
    onQuestionsChange(next);
  }
  const reorder = useQuestionReorder(questions, change, reviewRef);
  useEffect(() => {
    if (!picker?.replaceId || !reviewRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setPickerWidth(entry.contentRect.width),
    );
    observer.observe(reviewRef.current);
    return () => observer.disconnect();
  }, [picker]);
  function go(next: "scope" | "review") {
    setStep(next);
    setFocusRequest((value) => value + 1);
  }
  async function run(kind: "compose" | "output") {
    if (
      work.current ||
      disabled ||
      (kind === "compose" ? !valid : !questions.length || !canOutput)
    )
      return;
    const controller = new AbortController();
    operation.current = controller;
    work.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next =
        kind === "compose"
          ? await source.compose(allocations, controller.signal)
          : source.prepareOutput
            ? await source.prepareOutput(questions, controller.signal)
            : questions;
      if (controller.signal.aborted) return;
      const distinct = [
        ...new Map(next.map((item) => [source.info(item).id, item])).values(),
      ];
      if (distinct.length > maxQuestions)
        throw new Error(`최대 ${maxQuestions}문항까지 구성할 수 있습니다.`);
      change(distinct);
      if (kind === "compose") {
        setNotice(
          distinct.length < requested
            ? `요청한 ${requested}문항 중 ${distinct.length}문항을 구성했습니다. 부족한 범위는 다른 범위로 채우지 않았습니다.`
            : `${distinct.length}문항을 구성했습니다.`,
        );
        go("review");
        onOutputIntent?.();
      } else setStep("output");
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "작업을 완료하지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        work.current = false;
      }
    }
  }
  const actionsDisabled = disabled || busy;
  if (step === "output")
    return (
      <section className={s.output} data-exam-builder-output>
        {renderOutput({
          questions,
          onQuestionsChange: change,
          title,
          onTitleChange,
          onStep: go,
        })}
      </section>
    );
  const pages = Math.max(1, Math.ceil(allocations.length / 8));
  const currentPage = Math.min(scopePage, pages);
  return (
    <section className={s.root} data-exam-builder aria-label="시험지 만들기">
      <StudioStepBar
        headerTitle="시험지 만들기"
        step="review"
        pickedCount={questions.length}
        canCrop={false}
        canReview={!!questions.length}
        onStep={() => {}}
        stepNavigation={{
          label: "시험지 만들기 단계 이동",
          items: [
            {
              id: "scope",
              label: "1 범위 설정",
              current: step === "scope",
              disabled: actionsDisabled,
              onSelect: () => go("scope"),
            },
            {
              id: "review",
              label: "2 문항 검토",
              current: step === "review",
              disabled: actionsDisabled || !questions.length,
              onSelect: () => go("review"),
            },
            {
              id: "output",
              label: "3 양식 구성·출력",
              current: false,
              disabled: actionsDisabled || !questions.length || !canOutput,
              onSelect: () => void run("output"),
            },
          ],
        }}
      >
        <button
          type="button"
          className={s.primary}
          disabled={
            actionsDisabled ||
            (step === "scope" ? !valid : !questions.length || !canOutput)
          }
          onClick={() => void run(step === "scope" ? "compose" : "output")}
        >
          {busy ? (
            "준비 중…"
          ) : step === "scope" ? (
            "문항 구성 →"
          ) : (
            <>
              <span className={s.longLabel}>다음: 양식 구성·출력 →</span>
              <span className={s.shortLabel}>다음 단계 →</span>
            </>
          )}
        </button>
      </StudioStepBar>
      {status}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      <div className={s.layout}>
        <aside className={s.settings} aria-label="시험지 설정">
          <div className={s.toolbar}>
            <label htmlFor={`${uid}-title`}>제목</label>
            <input
              id={`${uid}-title`}
              value={title}
              maxLength={100}
              disabled={actionsDisabled}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>
          <section
            className={s.panel}
            ref={scopeRef}
            tabIndex={-1}
            aria-label="출제 구성표"
          >
            <header className={s.panelHeader}>
              <strong>
                출제 범위{" "}
                <span className={s.badge}>{allocations.length}개 선택</span>
              </strong>
              <span className={s.summary}>
                {selectedScopes
                  .slice(0, 2)
                  .map((scope) => scope.label)
                  .join(" · ")}
                {selectedScopes.length > 2
                  ? ` 외 ${selectedScopes.length - 2}개`
                  : ""}
              </span>
              <button
                type="button"
                disabled={actionsDisabled || scopeLoading || !!loaded?.error}
                onClick={() => setScopeOpen(true)}
              >
                {allocations.length ? "범위 변경" : "범위 선택"}
              </button>
            </header>
            {scopeLoading ? (
              <p className={s.empty} role="status">
                출제 범위를 불러오는 중입니다…
              </p>
            ) : loaded?.error ? (
              <div className={s.empty} role="alert">
                <p>{loaded.error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoaded(undefined);
                    setRetry((value) => value + 1);
                  }}
                >
                  다시 시도
                </button>
              </div>
            ) : allocations.length ? (
              <>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>선택한 출제 범위</th>
                        <th>구성 수</th>
                        <th>현재</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations
                        .slice((currentPage - 1) * 8, currentPage * 8)
                        .map((row) => {
                          const scope = scopeMap.get(row.scopeId);
                          return (
                            <tr key={row.scopeId}>
                              <td>
                                <strong>
                                  {scope?.label ?? "선택 범위 확인 필요"}
                                </strong>
                                <small>
                                  {[scope?.group, scope?.detail]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </small>
                              </td>
                              <td>
                                <div className={s.stepper}>
                                  <button
                                    type="button"
                                    disabled={
                                      actionsDisabled || row.count === 0
                                    }
                                    aria-label={`${scope?.label ?? "범위"} 문항 수 줄이기`}
                                    onClick={() => {
                                      setStep("scope");
                                      setAllocations((current) =>
                                        current.map((item) =>
                                          item.scopeId === row.scopeId
                                            ? { ...item, count: item.count - 1 }
                                            : item,
                                        ),
                                      );
                                    }}
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={Math.min(
                                      maxQuestions,
                                      scope?.count ?? maxQuestions,
                                    )}
                                    disabled={actionsDisabled}
                                    aria-label={`${scope?.label ?? "범위"} 구성 수`}
                                    value={row.count}
                                    onChange={(e) => {
                                      const count = Math.max(
                                        0,
                                        Math.min(
                                          maxQuestions,
                                          scope?.count ?? maxQuestions,
                                          Math.floor(
                                            Number(e.target.value) || 0,
                                          ),
                                        ),
                                      );
                                      setStep("scope");
                                      setAllocations((current) =>
                                        current.map((item) =>
                                          item.scopeId === row.scopeId
                                            ? { ...item, count }
                                            : item,
                                        ),
                                      );
                                    }}
                                  />
                                  <button
                                    type="button"
                                    disabled={
                                      actionsDisabled ||
                                      requested >= maxQuestions ||
                                      row.count >=
                                        (scope?.count ?? maxQuestions)
                                    }
                                    aria-label={`${scope?.label ?? "범위"} 문항 수 늘리기`}
                                    onClick={() => {
                                      setStep("scope");
                                      setAllocations((current) =>
                                        current.map((item) =>
                                          item.scopeId === row.scopeId
                                            ? { ...item, count: item.count + 1 }
                                            : item,
                                        ),
                                      );
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td>{counts.get(row.scopeId) ?? 0}문항</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <div className={s.pagination}>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setScopePage(currentPage - 1)}
                    >
                      이전 범위
                    </button>
                    <span>
                      {currentPage} / {pages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= pages}
                      onClick={() => setScopePage(currentPage + 1)}
                    >
                      다음 범위
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className={s.empty}>
                {scopes.length
                  ? "출제할 범위를 선택하고 문항 수를 정해 주세요."
                  : "선택할 출제 범위가 없습니다. 등록된 자료를 확인해 주세요."}
              </p>
            )}
            <footer className={s.panelFooter}>
              <strong>합계 {requested}문항</strong>
              <small>
                {requested > maxQuestions
                  ? `최대 ${maxQuestions}문항으로 맞춰 주세요.`
                  : questions.length
                    ? "다시 구성하면 현재 문항이 구성표대로 바뀝니다."
                    : `최대 ${maxQuestions}문항`}
              </small>
              {questions.length > 0 && (
                <button
                  type="button"
                  disabled={actionsDisabled || !valid}
                  onClick={() => void run("compose")}
                >
                  문항 다시 구성
                </button>
              )}
            </footer>
          </section>
        </aside>
        <section className={s.review} ref={reviewRef} aria-label="문항 검토">
          <div className={s.toolbar}>
            <h2 ref={headingRef} tabIndex={-1}>
              구성한 문항 <span className={s.badge}>{questions.length}</span>
            </h2>
            <div className={s.actions}>
              <button
                type="button"
                className={s.textButton}
                disabled={actionsDisabled || !history.length}
                onClick={() => {
                  const previous = history.at(-1);
                  if (previous) {
                    onQuestionsChange(previous);
                    setHistory((current) => current.slice(0, -1));
                  }
                }}
              >
                ↶ 되돌리기
              </button>
              <button
                type="button"
                disabled={
                  actionsDisabled ||
                  !selectedScopes.length ||
                  questions.length >= maxQuestions
                }
                onClick={() => setPicker({})}
              >
                + 문항 추가
              </button>
            </div>
          </div>
          {!questions.length ? (
            <div className={`${s.panel} ${s.empty}`}>
              <h2>범위를 정하고 문항을 구성하세요.</h2>
              <p>
                구성한 문항을 교체·추가·삭제한 뒤 양식 구성·출력으로 이어집니다.
              </p>
            </div>
          ) : (
            groups.map((group, groupIndex) => (
              <section className={s.panel} key={`${group.id}:${groupIndex}`}>
                <header className={s.panelHeader}>
                  <span className={s.groupNumber}>
                    {String(groupIndex + 1).padStart(2, "0")}
                  </span>
                  <h3>{group.label}</h3>
                  <small>{group.items.length}문항</small>
                  <button
                    type="button"
                    disabled={
                      actionsDisabled ||
                      !scopeMap.has(group.id) ||
                      !allocations.some((row) => row.scopeId === group.id) ||
                      questions.length >= maxQuestions
                    }
                    onClick={() => setPicker({ scopeId: group.id })}
                  >
                    + 문항 추가
                  </button>
                </header>
                <div className={s.questions}>
                  {group.items.map(({ item, index }) => {
                    const info = source.info(item);
                    return (
                      <article
                        key={info.id}
                        className={`${s.question} ${reorder.drag?.from === index ? s.dragging : ""}`}
                        data-exam-question
                        data-question-id={info.id}
                      >
                        <div className={s.questionTop}>
                          <button
                            type="button"
                            className={s.handle}
                            aria-label={`${index + 1}번 문항 위치 이동`}
                            title="끌어서 이동 · Space와 방향키로 이동"
                            disabled={actionsDisabled}
                            {...reorder.handleProps(index)}
                          >
                            ⠿
                          </button>
                          <strong className={s.number}>
                            {String(index + 1).padStart(2, "0")}
                          </strong>
                          <div className={s.questionMain}>
                            <small>
                              {[info.scopeLabel, info.difficulty, info.detail]
                                .filter(Boolean)
                                .join(" · ")}
                            </small>
                            <div className={s.questionBody}>
                              {renderQuestion(item)}
                            </div>
                          </div>
                        </div>
                        <div className={s.actions}>
                          <button
                            type="button"
                            disabled={actionsDisabled || !selectedScopes.length}
                            onClick={() => {
                              setPickerWidth(
                                reviewRef.current?.getBoundingClientRect()
                                  .width,
                              );
                              setPicker({
                                replaceId: info.id,
                                scopeId: allocations.some(
                                  (row) => row.scopeId === info.scopeId,
                                )
                                  ? info.scopeId
                                  : undefined,
                              });
                            }}
                          >
                            교체
                          </button>
                          <button
                            type="button"
                            className={s.danger}
                            disabled={actionsDisabled}
                            onClick={() =>
                              change(
                                questions.filter(
                                  (_, position) => position !== index,
                                ),
                              )
                            }
                          >
                            삭제
                          </button>
                          <button
                            type="button"
                            aria-label={`${index + 1}번 문항 위로`}
                            disabled={actionsDisabled || index === 0}
                            onClick={() =>
                              change(moveQuestion(questions, index, index - 1))
                            }
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label={`${index + 1}번 문항 아래로`}
                            disabled={
                              actionsDisabled || index === questions.length - 1
                            }
                            onClick={() =>
                              change(moveQuestion(questions, index, index + 1))
                            }
                          >
                            ↓
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </section>
      </div>
      {reorder.drag && reorder.line && (
        <div className={s.dropTarget} style={reorder.line} role="status">
          여기로 문제 이동
        </div>
      )}
      {scopeOpen && (
        <ScopePicker
          scopes={scopes}
          selected={allocations.map((row) => row.scopeId)}
          initialGroup={initialGroup}
          onClose={() => setScopeOpen(false)}
          onApply={(ids) => {
            setAllocations(
              ids.map((scopeId) => ({
                scopeId,
                count:
                  allocations.find((row) => row.scopeId === scopeId)?.count ??
                  Math.min(
                    5,
                    scopeMap.get(scopeId)?.count ?? maxQuestions,
                    Math.floor(maxQuestions / Math.max(ids.length, 1)),
                  ),
              })),
            );
            setScopePage(1);
            setStep("scope");
            setScopeOpen(false);
          }}
        />
      )}
      {picker && (
        <QuestionPicker
          source={source}
          scopes={selectedScopes}
          questions={questions}
          difficulties={difficulties}
          replacing={!!picker.replaceId}
          initialScopeId={picker.scopeId}
          width={picker.replaceId ? pickerWidth : undefined}
          maxQuestions={maxQuestions}
          renderQuestion={renderQuestion}
          onClose={() => setPicker(null)}
          onChoose={(item) => {
            if (picker.replaceId) {
              change(
                questions.map((current) =>
                  source.info(current).id === picker.replaceId ? item : current,
                ),
              );
              setPicker(null);
            } else if (
              questions.length < maxQuestions &&
              !questions.some(
                (current) => source.info(current).id === source.info(item).id,
              )
            ) {
              change([...questions, item]);
            }
            setStep("review");
          }}
        />
      )}
    </section>
  );
}
