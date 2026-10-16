"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import StudioStepBar from "@/components/unified/StudioStepBar";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import type {
  ExamCondition,
  ExamConditionInput,
} from "@/contracts/examCondition.contract";
import type {
  ExamAllocation,
  ExamBuilderProps,
  ExamBuilderSource,
  ExamBuilderStep,
  ExamSavedSelection,
  ExamScope,
} from "./types";
import {
  ApplyReport,
  ConditionLine,
  SaveConditionBox,
  SavedConditionsDialog,
  type ApplyReportValue,
} from "./SavedConditions";
import sc from "./SavedConditions.module.css";
import ScopePicker from "./ScopePicker";
import {
  emptyLadder,
  ladderIntent,
  ladderIssue,
  type AppliedConditions,
} from "./conditionsPlan";
import {
  ComposeConditionsDialog,
  ConditionsSummary,
} from "./ComposeConditions";
import cc from "./ComposeConditions.module.css";
import { canSelectScope } from "./scopeAvailability";
import QuestionPicker from "./QuestionPicker";
import ReplaceDialog from "./ReplaceDialog";
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
  renderCandidate,
  renderAnswer,
  renderOutput,
  initialScopeIds,
  initialGroup,
  initialStep,
  onStepChange,
  canOutput = true,
  onOutputIntent,
  disabled = false,
  status,
  namedConditions,
}: ExamBuilderProps<T>) {
  const uid = useId();
  // A known saved stage is opt-in; legacy content alone never implies progress.
  const [step, updateStep] = useState<ExamBuilderStep>(() =>
    questions.length ? (initialStep ?? "scope") : "scope",
  );
  const [outputReady, setOutputReady] = useState(false);
  function setStep(next: ExamBuilderStep) {
    updateStep(next);
    onStepChange?.(next);
  }
  // W4 «구성 조건» — 출처가 지원할 때만(수학). 처음에는 총 문항 · 난이도 모두 지정 없음, 최근 출제 빼기는 켬.
  const conditions = source.conditions;
  const [applied, setApplied] = useState<AppliedConditions>(() => ({
    total: null,
    ladder: emptyLadder(conditions?.ladder ?? []),
    recent: !!conditions,
  }));
  const excludeRecent = !!conditions && applied.recent;
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const conditionsOpener = useRef<HTMLButtonElement>(null);
  // 출제 가능 수는 최근 출제를 뺀 것 · 넣은 것을 따로 둔다 — 창이 둘을 견주고, 적용하면 깜빡이지 않고 바뀐다.
  const [loadedList, setLoadedList] = useState<
    {
      source: ExamBuilderSource<T>;
      recent: boolean;
      scopes: ExamScope[];
      error?: string;
    }[]
  >([]);
  const loadedFor = (recent: boolean) =>
    loadedList.find(
      (entry) => entry.source === source && entry.recent === recent,
    );
  const loaded = loadedFor(excludeRecent);
  const [retry, setRetry] = useState(0);
  const scopes = useMemo(
    () => loaded?.scopes ?? source.initialScopes ?? [],
    [loaded, source],
  );
  const scopeLoading = !loaded && !source.initialScopes;
  const [configuredAllocations, setAllocations] = useState<ExamAllocation[]>(
    () => {
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
    },
  );
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopePage, setScopePage] = useState(1);
  const [picker, setPicker] = useState<{
    replaceId?: string;
    scopeId?: string;
  } | null>(null);
  const [pickerWidth, setPickerWidth] = useState<number>();
  // W3 교체 창 — 연 [교체] 단추로 초점을 돌려보내고, 바꾼 자리를 잠시 표시한다.
  const [replaceOpenerEl, setReplaceOpenerEl] =
    useState<HTMLButtonElement | null>(null);
  const replaceOpener = useMemo(
    () => ({ current: replaceOpenerEl }),
    [replaceOpenerEl],
  );
  const [swappedId, setSwappedId] = useState<string | null>(null);
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
  useEffect(() => () => operation.current?.abort(), [source]);
  useEffect(() => {
    const controller = new AbortController();
    const store = (entry: { scopes: ExamScope[]; error?: string }) =>
      setLoadedList((current) => [
        ...current.filter(
          (item) => item.source === source && item.recent !== excludeRecent,
        ),
        { source, recent: excludeRecent, ...entry },
      ]);
    void source
      .loadScopes(controller.signal, conditions ? { excludeRecent } : undefined)
      .then((result) => {
        if (!controller.signal.aborted) store({ scopes: result });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          store({
            scopes: [],
            error:
              cause instanceof Error
                ? cause.message
                : "출제 범위를 불러오지 못했습니다.",
          });
      });
    return () => controller.abort();
  }, [source, retry, excludeRecent, conditions]);
  // 창이 열려 있으면 반대쪽(최근 출제를 넣은 · 뺀) 수도 센다 — «지금 해당» · 켜고 끈 나뉠 모습에 쓴다.
  const otherLoaded = !!loadedFor(!excludeRecent);
  useEffect(() => {
    if (!conditionsOpen || !conditions || otherLoaded) return;
    const controller = new AbortController();
    const recent = !excludeRecent;
    void source
      .loadScopes(controller.signal, { excludeRecent: recent })
      .then((result) => {
        if (!controller.signal.aborted)
          setLoadedList((current) => [
            ...current.filter(
              (item) => item.source === source && item.recent !== recent,
            ),
            { source, recent, scopes: result },
          ]);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [conditionsOpen, conditions, source, excludeRecent, otherLoaded]);
  const scopeMap = useMemo(
    () => new Map(scopes.map((scope) => [scope.id, scope])),
    [scopes],
  );
  // Preserve restored questions, but never restore a confirmed empty scope as
  // a new composition request. Unknown counts remain visible and block math.
  const allocations = configuredAllocations.filter(
    (row) => scopeMap.get(row.scopeId)?.count !== 0,
  );
  const unavailableRestored = configuredAllocations.length - allocations.length;
  const selectedScopes = allocations.flatMap((row) => {
    const scope = scopeMap.get(row.scopeId);
    return scope ? [scope] : [];
  });
  const requested = allocations.reduce((sum, row) => sum + row.count, 0);
  // 표를 손으로 고쳐 난이도와 합이 어긋나면 구성 전에 막는다 — 창의 «확인할 것»과 같은 말.
  const ladderWarning = conditions
    ? ladderIssue(applied.ladder, requested, conditions.ladder)
    : null;
  const valid =
    !ladderWarning &&
    !!selectedScopes.length &&
    requested > 0 &&
    requested <= maxQuestions &&
    allocations.every((row) => {
      const scope = scopeMap.get(row.scopeId);
      return (
        canSelectScope(scope, source.requireScopeCounts) &&
        (scope?.count === undefined || row.count <= scope.count)
      );
    });
  // W5 «이름 붙인 출제 조건» — 구성 조건(W4)이 있는 출처에서만(수학). 조건만 오간다 — 문항은 [문항 구성 →]으로 새로.
  const named = conditions ? namedConditions : undefined;
  const namedClient = named?.client;
  const [saved, setSaved] = useState<{
    items: ExamCondition[];
    error?: string;
  } | null>(null);
  const [savedRetry, setSavedRetry] = useState(0);
  const [savedOpen, setSavedOpen] = useState(false);
  const savedOpener = useRef<HTMLButtonElement>(null);
  const [saving, setSaving] = useState(false);
  const [applyReport, setApplyReport] = useState<ApplyReportValue | null>(null);
  // 적용한 조건 — 표 · 조건 · 출처가 적용한 그대로인 동안만 «○○ 적용함»(손대면 사라진다).
  const [appliedMark, setAppliedMark] = useState<{
    id: string;
    name: string;
    key: string;
    allocations: string;
    applied: string;
  } | null>(null);
  // 적용을 눌렀고, 되돌린 출처의 출제 가능 수가 아직 안 왔다 — 오면 표에 넣는다.
  const [pendingApply, setPendingApply] = useState<{
    item: ExamCondition;
    key: string;
    recent: boolean;
    applied: AppliedConditions;
  } | null>(null);
  useEffect(() => {
    if (!namedClient) return;
    const controller = new AbortController();
    void namedClient
      .list(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setSaved({ items: byLastUse(items) });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setSaved({
            items: [],
            error:
              cause instanceof Error
                ? cause.message
                : "저장한 조건을 불러오지 못했습니다.",
          });
      });
    return () => controller.abort();
  }, [namedClient, savedRetry]);
  const selectionKey = named ? selectionKeyOf(named.selection) : "";
  if (
    pendingApply &&
    named &&
    selectionKey === pendingApply.key &&
    excludeRecent === pendingApply.recent &&
    loaded
  ) {
    // 되돌린 출처로 다시 센 수가 왔다 — 범위가 사라졌거나 0 이면 빼고, 모자라면 그 수까지만(다른 범위로 채우지 않는다).
    const c = pendingApply.item.condition;
    setPendingApply(null);
    if (loaded.error)
      setError(`«${c.name}»의 범위를 확인하지 못했습니다. ${loaded.error}`);
    else {
      const available = new Map(
        loaded.scopes.map((scope) => [scope.id, scope]),
      );
      const report: ApplyReportValue = { name: c.name, dropped: [], short: [] };
      const next: ExamAllocation[] = [];
      for (const row of c.rows) {
        const scope = available.get(row.unitId);
        if (!scope)
          report.dropped.push({ label: row.label, reason: "차시를 찾지 못함" });
        else if (!canSelectScope(scope, source.requireScopeCounts))
          report.dropped.push({
            label: scope.label,
            reason:
              scope.count === 0
                ? "지금 출제 가능 문항이 없음"
                : "출제 가능 수를 확인하지 못함",
          });
        else {
          let count = Math.min(row.count, maxQuestions);
          if (scope.count !== undefined && count > scope.count) {
            report.short.push(
              `${scope.label} — ${c.recent ? "최근 출제를 빼면 " : ""}${scope.count}${scope.countUnit ?? "문항"}뿐(${row.count} 필요)`,
            );
            count = scope.count;
          }
          next.push({ scopeId: row.unitId, count, fixed: row.fixed });
        }
      }
      setAllocations(next);
      setScopePage(1);
      setApplyReport(report);
      setAppliedMark({
        id: pendingApply.item.id,
        name: c.name,
        key: pendingApply.key,
        allocations: JSON.stringify(next),
        applied: JSON.stringify(pendingApply.applied),
      });
    }
  }
  const markActive =
    !!appliedMark &&
    !pendingApply &&
    appliedMark.key === selectionKey &&
    appliedMark.allocations === JSON.stringify(configuredAllocations) &&
    appliedMark.applied === JSON.stringify(applied);
  function applySaved(item: ExamCondition) {
    if (!named || !conditions) return;
    const c = item.condition;
    const tiers = c.ladder as Record<string, number | null>;
    const nextApplied: AppliedConditions = {
      total: c.total,
      ladder: Object.fromEntries(
        conditions.ladder.map((tier) => [tier, tiers[tier] ?? null]),
      ),
      recent: c.recent,
    };
    const selection = { source: c.source, familyRule: c.familyRule };
    setApplied(nextApplied);
    named.restore(selection);
    setPendingApply({
      item,
      key: selectionKeyOf(selection),
      recent: c.recent,
      applied: nextApplied,
    });
    setAppliedMark(null);
    setApplyReport(null);
    setSavedOpen(false);
    setSaving(false);
    setError("");
    setNotice("");
    setStep("scope");
    // 적용 = 쓴 것 — 마지막 사용을 오늘로(목록의 차례). 실패해도 적용은 그대로다.
    void named.client
      .touch(item.id)
      .then((updated) =>
        setSaved((current) =>
          current
            ? {
                ...current,
                items: byLastUse(
                  current.items.map((entry) =>
                    entry.id === updated.id ? updated : entry,
                  ),
                ),
              }
            : current,
        ),
      )
      .catch(() => {});
  }
  function currentCondition(
    name: string,
    selection: ExamSavedSelection,
  ): ExamConditionInput {
    return {
      v: 1,
      name,
      source: selection.source,
      rows: allocations.map((row) => ({
        unitId: row.scopeId,
        label: scopeMap.get(row.scopeId)?.label ?? "선택 범위",
        count: row.count,
        fixed: !!row.fixed,
      })),
      total: applied.total,
      ladder: Object.fromEntries(
        DIFFICULTY_LADDER.map((tier) => [tier, applied.ladder[tier] ?? null]),
      ) as ExamConditionInput["ladder"],
      recent: applied.recent,
      familyRule: selection.familyRule,
    };
  }
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
    setSwappedId(null);
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
  /** 추가 · 교체 — 교체는 그 자리 · 차례 그대로(되돌리기 기록에 남는다). 바꿨으면 true. */
  function choose(item: T): boolean {
    if (!picker) return false;
    const added = source.info(item);
    const takenElsewhere = questions.some((current) => {
      const existing = source.info(current);
      return (
        existing.id !== picker.replaceId &&
        !!added.familyId &&
        existing.familyId === added.familyId
      );
    });
    let done = false;
    if (picker.replaceId) {
      // D-111 ⑷: never let one click put another slot's sibling on the sheet.
      if (takenElsewhere) return false;
      change(
        questions.map((current) =>
          source.info(current).id === picker.replaceId ? item : current,
        ),
      );
      setPicker(null);
      done = true;
    } else if (
      questions.length < maxQuestions &&
      !takenElsewhere &&
      !questions.some((current) => source.info(current).id === added.id)
    ) {
      change([...questions, item]);
      done = true;
    }
    setStep("review");
    return done;
  }
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
      let notes: string[] = [];
      const composed =
        kind === "compose"
          ? conditions
            ? await source.compose(allocations, controller.signal, {
                excludeRecent,
                difficulty: ladderIntent(applied.ladder, conditions.ladder),
              })
            : await source.compose(allocations, controller.signal)
          : source.prepareOutput
            ? await source.prepareOutput(questions, controller.signal)
            : questions;
      if (controller.signal.aborted) return;
      const next = Array.isArray(composed)
        ? composed
        : ((notes = composed.notes ?? []), composed.items);
      const distinct = [
        ...new Map(next.map((item) => [source.info(item).id, item])).values(),
      ];
      if (distinct.length > maxQuestions)
        throw new Error(`최대 ${maxQuestions}문항까지 구성할 수 있습니다.`);
      if (kind === "output" && !distinct.length)
        throw new Error("출력할 문항이 없습니다. 문항을 다시 확인해 주세요.");
      change(distinct);
      if (kind === "compose") {
        setApplyReport(null);
        setNotice(
          [
            distinct.length < requested
              ? `요청한 ${requested}문항 중 ${distinct.length}문항을 구성했습니다. 부족한 범위는 다른 범위로 채우지 않았습니다.`
              : `${distinct.length}문항을 구성했습니다.`,
            ...notes,
          ].join(" "),
        );
        go("review");
        onOutputIntent?.();
      } else {
        setOutputReady(true);
        setStep("output");
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "작업을 완료하지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      if (operation.current === controller) {
        setBusy(false);
        work.current = false;
      }
    }
  }
  // Explicit resume of output must pass the same eligibility/revision gate as
  // the output button. Do not mount the printable editor before validation.
  useEffect(() => {
    if (step !== "output" || outputReady || disabled || !canOutput) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const next = source.prepareOutput
          ? await source.prepareOutput(questions, controller.signal)
          : questions;
        if (controller.signal.aborted) return;
        const distinct = [
          ...new Map(next.map((item) => [source.info(item).id, item])).values(),
        ];
        if (!distinct.length || distinct.length > maxQuestions)
          throw new Error("출력할 문항을 다시 확인해 주세요.");
        if (
          distinct.length !== questions.length ||
          distinct.some((item, index) => item !== questions[index])
        )
          onQuestionsChange(distinct);
        setOutputReady(true);
      } catch (cause) {
        if (controller.signal.aborted) return;
        updateStep("review");
        onStepChange?.("review");
        setError(
          cause instanceof Error
            ? cause.message
            : "출력할 문항을 확인하지 못했습니다.",
        );
      }
    })();
    return () => controller.abort();
  }, [
    step,
    outputReady,
    disabled,
    canOutput,
    source,
    questions,
    maxQuestions,
    onQuestionsChange,
    onStepChange,
  ]);
  const actionsDisabled = disabled || busy;
  if (step === "output" && (!outputReady || disabled || !canOutput))
    return (
      <section className={s.output} aria-label="출력 문항 확인">
        <p role="status">
          {!canOutput
            ? "출력 권한을 확인해 주세요."
            : "출력할 문항을 확인하는 중입니다…"}
        </p>
        <button type="button" onClick={() => go("review")}>
          문항 검토로 돌아가기
        </button>
      </section>
    );
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
  const summary = source.summarize?.(questions);
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
        {step === "review" && (
          <button
            type="button"
            className={s.primary}
            disabled={actionsDisabled || !questions.length || !canOutput}
            onClick={() => void run("output")}
          >
            {busy ? (
              "준비 중…"
            ) : (
              <>
                <span className={s.longLabel}>다음: 양식 구성·출력 →</span>
                <span className={s.shortLabel}>다음 단계 →</span>
              </>
            )}
          </button>
        )}
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
          {named && (
            <ConditionLine
              appliedName={markActive ? appliedMark!.name : null}
              count={saved && !saved.error ? saved.items.length : null}
              disabled={actionsDisabled}
              opener={savedOpener}
              onOpen={() => setSavedOpen(true)}
            />
          )}
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
            {named && markActive && applyReport && (
              <ApplyReport
                report={applyReport}
                hasQuestions={!!questions.length}
              />
            )}
            {unavailableRestored > 0 && (
              <p className={s.empty} role="status">
                출제 가능한 문항이 없는 {unavailableRestored}개 범위를 구성에서
                제외했습니다. 저장된 문항은 출력 전에 다시 확인합니다.
              </p>
            )}
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
                    setLoadedList([]);
                    setRetry((value) => value + 1);
                  }}
                >
                  다시 시도
                </button>
              </div>
            ) : allocations.length ? (
              <>
                {conditions && (
                  <ConditionsSummary
                    applied={applied}
                    requested={requested}
                    fixedRows={allocations.filter((row) => row.fixed).length}
                    recentDays={conditions.recentDays}
                    ladder={conditions.ladder}
                    warning={ladderWarning}
                    disabled={actionsDisabled}
                    opener={conditionsOpener}
                    onOpen={() => setConditionsOpen(true)}
                  />
                )}
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>선택한 출제 범위</th>
                        <th>구성 수</th>
                        <th>{conditions ? "" : "구성됨"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations
                        .slice((currentPage - 1) * 8, currentPage * 8)
                        .map((row) => {
                          const scope = scopeMap.get(row.scopeId);
                          // 손으로 고친 행은 «고정» — 구성 조건의 총 문항이 다시 나누지 않는다(W4).
                          const edit = (count: number) => {
                            setStep("scope");
                            setAllocations((current) =>
                              current.map((item) =>
                                item.scopeId === row.scopeId
                                  ? {
                                      ...item,
                                      count,
                                      ...(conditions ? { fixed: true } : {}),
                                    }
                                  : item,
                              ),
                            );
                          };
                          return (
                            <tr
                              key={row.scopeId}
                              className={
                                conditions && row.fixed
                                  ? cc.fixedRow
                                  : undefined
                              }
                            >
                              <td>
                                <strong>
                                  {scope?.label ?? "선택 범위 확인 필요"}
                                </strong>
                                <small>
                                  {[scope?.group, scope?.detail]
                                    .filter(Boolean)
                                    .join(" · ")}
                                  {scope?.count !== undefined
                                    ? ` · 출제 가능 ${scope.count}${scope.countUnit ?? "문항"}${excludeRecent ? "(최근 출제 뺀 뒤)" : ""}`
                                    : source.requireScopeCounts
                                      ? " · 출제 가능 수 확인 필요"
                                      : ""}
                                  {conditions && counts.get(row.scopeId)
                                    ? ` · 구성됨 ${counts.get(row.scopeId)}문항`
                                    : ""}
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
                                    onClick={() => edit(row.count - 1)}
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
                                    onChange={(e) =>
                                      edit(
                                        Math.max(
                                          0,
                                          Math.min(
                                            maxQuestions,
                                            scope?.count ?? maxQuestions,
                                            Math.floor(
                                              Number(e.target.value) || 0,
                                            ),
                                          ),
                                        ),
                                      )
                                    }
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
                                    onClick={() => edit(row.count + 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td>
                                <div className={s.scopeRowActions}>
                                  {!conditions ? (
                                    <span>
                                      {counts.get(row.scopeId) ?? 0}문항
                                    </span>
                                  ) : row.fixed ? (
                                    <>
                                      <span className={cc.badgeMuted}>
                                        고정
                                      </span>
                                      <button
                                        type="button"
                                        className={s.textButton}
                                        disabled={actionsDisabled}
                                        aria-label={`${scope?.label ?? "범위"} 고정 풀기`}
                                        onClick={() =>
                                          setAllocations((current) =>
                                            current.map((item) =>
                                              item.scopeId === row.scopeId
                                                ? { ...item, fixed: false }
                                                : item,
                                            ),
                                          )
                                        }
                                      >
                                        풀기
                                      </button>
                                    </>
                                  ) : (
                                    <small>자동</small>
                                  )}
                                  <button
                                    type="button"
                                    className={s.danger}
                                    disabled={actionsDisabled}
                                    aria-label={`${scope?.label ?? "선택 범위"} 범위 제거`}
                                    onClick={() => {
                                      setAllocations((current) =>
                                        current.filter(
                                          (item) =>
                                            item.scopeId !== row.scopeId,
                                        ),
                                      );
                                      setStep("scope");
                                    }}
                                  >
                                    제거
                                  </button>
                                </div>
                              </td>
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
              <div className={s.compositionTotal}>
                <strong>합계 {requested}문항</strong>
                <small>
                  {requested > maxQuestions
                    ? `최대 ${maxQuestions}문항으로 맞춰 주세요.`
                    : questions.length
                      ? "다시 구성하면 현재 문항이 구성표대로 바뀝니다."
                      : conditions
                        ? "고정이 아닌 행은 총 문항에 맞춰 다시 나눕니다."
                        : `최대 ${maxQuestions}문항`}
                </small>
              </div>
              <div className={sc.footActions}>
                {named && (
                  <button
                    type="button"
                    disabled={actionsDisabled || !allocations.length || saving}
                    onClick={() => setSaving(true)}
                  >
                    조건 저장
                  </button>
                )}
                <button
                  type="button"
                  className={s.primary}
                  disabled={actionsDisabled || !valid}
                  onClick={() => void run("compose")}
                >
                  {busy ? "준비 중…" : "문항 구성 →"}
                </button>
              </div>
            </footer>
            {named && saving && allocations.length > 0 && (
              <SaveConditionBox
                defaultName={title.trim()}
                contents={currentCondition("", named.selection)}
                items={saved?.items ?? []}
                tiers={conditions!.ladder}
                onCancel={() => setSaving(false)}
                onSave={async (name, replace) => {
                  const result = await named.client.save(
                    currentCondition(name, named.selection),
                    replace,
                  );
                  setSaved((current) => ({
                    items: byLastUse([
                      result,
                      ...(current?.items ?? []).filter(
                        (entry) => entry.id !== result.id,
                      ),
                    ]),
                  }));
                  setSaving(false);
                }}
              />
            )}
          </section>
        </aside>
        <section className={s.review} ref={reviewRef} aria-label="문항 검토">
          <div className={s.toolbar}>
            <div className={s.reviewHeading}>
              <h2 ref={headingRef} tabIndex={-1}>
                구성한 문항 <span className={s.badge}>{questions.length}</span>
              </h2>
              {summary && <small data-exam-summary>{summary}</small>}
            </div>
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
                    aria-label={`${group.label} 범위에 문항 추가`}
                  >
                    + 이 범위에 추가
                  </button>
                </header>
                <div className={s.questions}>
                  {group.items.map(({ item, index }) => {
                    const info = source.info(item);
                    return (
                      <article
                        key={info.id}
                        className={`${s.question} ${reorder.drag?.from === index ? s.dragging : ""} ${swappedId === info.id ? s.justSwapped : ""}`}
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
                          {renderAnswer?.(item)}
                        </div>
                        <div className={s.actions}>
                          <button
                            type="button"
                            disabled={actionsDisabled || !selectedScopes.length}
                            onClick={(event) => {
                              setReplaceOpenerEl(event.currentTarget);
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
      {conditionsOpen && conditions && (
        <ComposeConditionsDialog
          applied={applied}
          ladder={conditions.ladder}
          recentDays={conditions.recentDays}
          today={todayLabel()}
          unit={selectedScopes[0]?.countUnit ?? "문항"}
          maxQuestions={maxQuestions}
          returnFocus={conditionsOpener}
          rows={allocations.map((row) => {
            const usable = (recent: boolean) =>
              loadedFor(recent)?.scopes.find(
                (scope) => scope.id === row.scopeId,
              )?.count;
            return {
              scopeId: row.scopeId,
              label: scopeMap.get(row.scopeId)?.label ?? "선택 범위",
              count: row.count,
              fixed: !!row.fixed,
              usable: { recent: usable(true), all: usable(false) },
            };
          })}
          onCancel={() => setConditionsOpen(false)}
          onApply={(next, rows) => {
            const byId = new Map(rows.map((row) => [row.scopeId, row]));
            setAllocations((current) =>
              current.map((item) => {
                const row = byId.get(item.scopeId);
                return row
                  ? { ...item, count: row.count, fixed: row.fixed }
                  : item;
              }),
            );
            setApplied(next);
            setStep("scope");
            setConditionsOpen(false);
          }}
        />
      )}
      {named && savedOpen && (
        <SavedConditionsDialog
          items={saved?.items ?? []}
          loading={!saved}
          error={saved?.error}
          tiers={conditions!.ladder}
          returnFocus={savedOpener}
          onRetry={() => {
            setSaved(null);
            setSavedRetry((value) => value + 1);
          }}
          onClose={() => setSavedOpen(false)}
          onApply={applySaved}
          onRename={async (item, name) => {
            const updated = await named.client.rename(
              item.id,
              name,
              item.revision,
            );
            setSaved((current) =>
              current
                ? {
                    ...current,
                    items: current.items.map((entry) =>
                      entry.id === updated.id ? updated : entry,
                    ),
                  }
                : current,
            );
            setAppliedMark((mark) =>
              mark?.id === updated.id
                ? { ...mark, name: updated.condition.name }
                : mark,
            );
          }}
          onRemove={async (item) => {
            await named.client.remove(item.id, item.revision);
            setSaved((current) =>
              current
                ? {
                    ...current,
                    items: current.items.filter(
                      (entry) => entry.id !== item.id,
                    ),
                  }
                : current,
            );
            setAppliedMark((mark) => (mark?.id === item.id ? null : mark));
          }}
        />
      )}
      {scopeOpen && (
        <ScopePicker
          scopes={scopes}
          selected={allocations.map((row) => row.scopeId)}
          initialGroup={initialGroup}
          requireCounts={source.requireScopeCounts}
          onClose={() => setScopeOpen(false)}
          onApply={(ids) => {
            const selectedIds = ids.filter((id) =>
              canSelectScope(scopeMap.get(id), source.requireScopeCounts),
            );
            const retained = new Map(
              allocations
                .filter((row) => selectedIds.includes(row.scopeId))
                .map((row) => [row.scopeId, row]),
            );
            const remaining = Math.max(
              0,
              maxQuestions -
                [...retained.values()].reduce((sum, row) => sum + row.count, 0),
            );
            const defaultCount = Math.min(
              5,
              Math.floor(
                remaining / Math.max(selectedIds.length - retained.size, 1),
              ),
            );
            setAllocations(
              selectedIds.map(
                (scopeId) =>
                  retained.get(scopeId) ?? {
                    scopeId,
                    count: Math.min(
                      defaultCount,
                      scopeMap.get(scopeId)?.count ?? maxQuestions,
                    ),
                  },
              ),
            );
            setScopePage(1);
            setStep("scope");
            setScopeOpen(false);
          }}
        />
      )}
      {picker?.replaceId && source.compareReplace
        ? (() => {
            const index = questions.findIndex(
              (item) => source.info(item).id === picker.replaceId,
            );
            if (index < 0) return null;
            const slot = String(index + 1).padStart(2, "0");
            return (
              <ReplaceDialog
                source={source}
                original={questions[index]}
                slot={slot}
                questions={questions}
                scopeIds={
                  picker.scopeId
                    ? [picker.scopeId]
                    : selectedScopes.map((scope) => scope.id)
                }
                sameScope={!!picker.scopeId}
                difficulties={difficulties}
                excludeRecent={excludeRecent}
                recentDays={conditions?.recentDays}
                renderQuestion={renderQuestion}
                renderCandidate={renderCandidate}
                returnFocus={replaceOpener}
                onClose={() => setPicker(null)}
                onChoose={(item) => {
                  if (!choose(item)) return;
                  setNotice(
                    `${slot}번을 바꿨습니다 — 자리와 순서는 그대로입니다.`,
                  );
                  setSwappedId(source.info(item).id);
                }}
              />
            );
          })()
        : picker && (
            <QuestionPicker
              source={source}
              scopes={selectedScopes}
              questions={questions}
              difficulties={difficulties}
              replacing={!!picker.replaceId}
              replaceId={picker.replaceId}
              excludeRecent={excludeRecent}
              initialScopeId={picker.scopeId}
              width={picker.replaceId ? pickerWidth : undefined}
              maxQuestions={maxQuestions}
              renderQuestion={renderQuestion}
              onClose={() => setPicker(null)}
              onChoose={(item) => void choose(item)}
            />
          )}
    </section>
  );
}

/** 저장한 조건의 차례 — 마지막으로 쓴 것이 위. */
function byLastUse(items: ExamCondition[]) {
  return [...items].sort(
    (a, b) =>
      Date.parse(b.condition.lastUsedAt) - Date.parse(a.condition.lastUsedAt),
  );
}
/** 출처 고르기의 열쇠 — 글(`label`)은 빼고 거는 것만. 적용한 출처가 화면에 걸렸는지 가른다. */
function selectionKeyOf(selection: ExamSavedSelection) {
  const { group, books, kinds, materials } = selection.source;
  return JSON.stringify([group, books, kinds, materials, selection.familyRule]);
}

/** «오늘»(서울) — 최근 출제 규칙의 문장에 쓰는 «10/16». 서버도 서울 날짜로 14일을 센다. */
function todayLabel(now = new Date()) {
  const [, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-");
  return `${Number(month)}/${Number(day)}`;
}
