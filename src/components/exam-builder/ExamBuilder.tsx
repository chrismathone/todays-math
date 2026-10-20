"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
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
import ScopeSequencePicker from "./ScopeSequencePicker";
import QuickConditions from "./QuickConditions";
import {
  QUESTION_FORMATS,
  emptyFormats,
  emptyLadder,
  formatIntent,
  formatIssue,
  formatText,
  ladderIntent,
  ladderIssue,
  planComposition,
  type AppliedConditions,
} from "./conditionsPlan";
import {
  ComposeConditionsDialog,
  ConditionsSummary,
} from "./ComposeConditions";
import cc from "./ComposeConditions.module.css";
import { canSelectScope } from "./scopeAvailability";
import QuestionFormatPicker from "./QuestionFormatPicker";
import { FORMAT_LABEL } from "@/lib/problem/questionSelectionClient";
import QuestionPicker from "./QuestionPicker";
import ReplaceDialog from "./ReplaceDialog";
import { moveQuestion, useQuestionReorder } from "./useQuestionReorder";
import { useBuilderScrollFrame } from "./useBuilderScrollFrame";
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
  preserveStoredOutput = false,
  onBeginEdit,
  onStepChange,
  onIntentIssueChange,
  canOutput = true,
  onOutputIntent,
  disabled = false,
  status,
  scopeControls,
  namedConditions,
}: ExamBuilderProps<T>) {
  const uid = useId();
  // A known saved stage is opt-in; legacy content alone never implies progress.
  const [step, updateStep] = useState<ExamBuilderStep>(() =>
    questions.length ? (initialStep ?? "scope") : "scope",
  );
  const [outputReady, setOutputReady] = useState(
    () => preserveStoredOutput && initialStep === "output",
  );
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
    formats: emptyFormats(),
    mcFirst: !!conditions,
  }));
  const excludeRecent = !!conditions && applied.recent;
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [hasComposed, setHasComposed] = useState(false);
  const conditionsOpener = useRef<HTMLButtonElement>(null);
  function restoredAllocations(): ExamAllocation[] {
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
  }
  const [configuredAllocations, setAllocations] =
    useState<ExamAllocation[]>(restoredAllocations);
  const [pendingApply, setPendingApply] = useState<{
    item: ExamCondition;
    key: string;
    recent: boolean;
    applied: AppliedConditions;
  } | null>(null);
  const [knownScopes, setKnownScopes] = useState<ExamScope[]>([]);
  const [visibleScopeIds, setVisibleScopeIds] = useState<string[]>([]);
  const [restoredScopeSource, setRestoredScopeSource] =
    useState<ExamBuilderSource<T>>();
  const [scopeRestoreError, setScopeRestoreError] = useState<{
    source: ExamBuilderSource<T>;
    message: string;
  }>();
  const [retry, setRetry] = useState(0);
  const browseScopes = useCallback((rows: ExamScope[]) => {
    setVisibleScopeIds((current) =>
      current.join(",") === rows.map((row) => row.id).join(",")
        ? current
        : rows.map((row) => row.id),
    );
    setKnownScopes((current) => {
      const map = new Map(current.map((scope) => [scope.id, scope]));
      rows.forEach((scope) => map.set(scope.id, scope));
      const next = [...map.values()];
      return JSON.stringify(current) === JSON.stringify(next) ? current : next;
    });
  }, []);
  useEffect(() => {
    if (!source.scopeNavigation) return;
    const controller = new AbortController();
    void source.scopeNavigation
      .restore(questions, controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        setKnownScopes((current) => [
          ...new Map(
            [...current, ...rows].map((row) => [row.id, row]),
          ).values(),
        ]);
        setRestoredScopeSource(source);
        setScopeRestoreError(undefined);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setScopeRestoreError({
            source,
            message:
              cause instanceof Error
                ? cause.message
                : "저장한 출제 범위를 확인하지 못했습니다.",
          });
      });
    return () => controller.abort();
  }, [source, questions, retry]);
  const demandIds = source.scopeNavigation
    ? [
        ...new Set([
          ...visibleScopeIds,
          ...configuredAllocations.map((row) => row.scopeId),
          ...(pendingApply?.item.condition.rows.map((row) => row.unitId) ?? []),
        ]),
      ]
        .sort()
        .join(",")
    : "";
  // 출제 가능 수는 최근 출제를 뺀 것 · 넣은 것을 따로 둔다 — 창이 둘을 견주고, 적용하면 깜빡이지 않고 바뀐다.
  const [loadedList, setLoadedList] = useState<
    {
      source: ExamBuilderSource<T>;
      recent: boolean;
      scopes: ExamScope[];
      error?: string;
      retry: number;
      scopeIds?: string[];
      errorIds?: string[];
    }[]
  >([]);
  const cachedFor = (recent: boolean) =>
    loadedList.find(
      (entry) =>
        entry.source === source &&
        entry.recent === recent &&
        entry.retry === retry,
    );
  const loadedFor = (recent: boolean) => {
    const entry = cachedFor(recent);
    if (!entry || !source.scopeNavigation) return entry;
    const ids = demandIds ? demandIds.split(",") : [];
    if (entry.errorIds?.some((id) => ids.includes(id))) return entry;
    if (ids.every((id) => entry.scopeIds?.includes(id)))
      return entry.error ? { ...entry, error: undefined } : entry;
  };
  const cached = cachedFor(excludeRecent);
  const loaded = loadedFor(excludeRecent);
  const scopes = useMemo<ExamScope[]>(
    () =>
      source.scopeNavigation
        ? [
            ...new Map(
              [
                ...(source.initialScopes ?? []).map(
                  ({ id, label, group, detail }) => ({
                    id,
                    label,
                    group,
                    detail,
                  }),
                ),
                ...knownScopes,
                ...(cached?.scopes ?? []),
              ].map((scope) => [scope.id, scope]),
            ).values(),
          ]
        : (cached?.scopes ?? source.initialScopes ?? []),
    [cached, source, knownScopes],
  );
  const scopeLoading =
    !loaded && (!!source.scopeNavigation || !source.initialScopes);
  const [awaitingRestoredScopes, setAwaitingRestoredScopes] = useState(
    () =>
      !source.initialScopes &&
      questions.some((item) => !source.info(item).scopeId),
  );
  // Legacy saved questions resolve their scope from deferred curriculum labels.
  // Restore once before showing the loaded table; later edits keep their intent.
  if (
    awaitingRestoredScopes &&
    loaded &&
    !loaded.error &&
    (!source.scopeNavigation || restoredScopeSource === source)
  ) {
    setAwaitingRestoredScopes(false);
    setAllocations(restoredAllocations());
  }
  const [scopePage, setScopePage] = useState(1);
  const [scopeRestoreRequest, setScopeRestoreRequest] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  const [picker, setPicker] = useState<{
    replaceId?: string;
    scopeId?: string;
  } | null>(null);
  const [formatPicker, setFormatPicker] = useState<{
    item: T;
    changeId?: string;
  } | null>(null);
  const identity = (item: T) =>
    source.info(item).questionId ?? source.info(item).id;
  const duplicateQuestions = (items: T[]) =>
    new Set(items.map(identity)).size !== items.length;
  const conflicts = new Map<string, T[]>();
  questions.forEach((item) => {
    const key = identity(item);
    conflicts.set(key, [...(conflicts.get(key) ?? []), item]);
  });
  const conflictGroups = [...conflicts.values()].filter(
    (items) => items.length > 1,
  );
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
  // 문항 검토는 문제만 먼저 — 정답 · 해설은 눌러서 편다(원장님 2026-10-18 «해설은 처음에 숨기는 게 좋을 듯»).
  const [answersShown, setAnswersShown] = useState(false);
  const unresolvedIds = source.resolveIdentity
    ? questions
        .filter((item) => !source.info(item).questionId)
        .map((item) => source.info(item).id)
        .join(",")
    : "";
  const [identityError, setIdentityError] = useState("");
  useEffect(() => {
    if (!unresolvedIds || step === "output" || !source.resolveIdentity) return;
    const controller = new AbortController();
    void source
      .resolveIdentity(questions, controller.signal)
      .then((next) => {
        if (
          !controller.signal.aborted &&
          next.some((item, index) => item !== questions[index])
        )
          onQuestionsChange(next);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setIdentityError(
            cause instanceof Error
              ? cause.message
              : "저장 문항의 현재 정체를 확인하지 못했습니다.",
          );
      });
    return () => controller.abort();
  }, [source, questions, unresolvedIds, step, onQuestionsChange]);
  const operation = useRef<AbortController | null>(null);
  const work = useRef(false);
  const reviewRef = useRef<HTMLElement>(null);
  const orderRef = useRef<HTMLTableElement>(null);
  const scopeRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { rootRef, bandRef } = useBuilderScrollFrame(step);
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    if (!focusRequest || step === "output") return;
    const element = step === "scope" ? scopeRef.current : headingRef.current;
    element?.focus({ preventScroll: true });
    rootRef.current
      ?.querySelector(
        step === "scope" ? "[data-builder-settings]" : "[data-builder-review]",
      )
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusRequest, step, rootRef]);
  useEffect(() => () => operation.current?.abort(), [source]);
  // Demand changes keep both confirmed counts and in-flight reads. Only a
  // different source, an explicit retry or unmount cancels those reads.
  const scopeRequests = useRef<
    { recent: boolean; ids: string[]; controller: AbortController }[]
  >([]);
  useEffect(
    () => () => {
      scopeRequests.current.forEach(({ controller }) => controller.abort());
      scopeRequests.current = [];
    },
    [source, retry],
  );
  useEffect(() => {
    const loadScopeCounts = (recent: boolean) => {
      const previous = loadedList.find(
        (entry) =>
          entry.source === source &&
          entry.recent === recent &&
          entry.retry === retry,
      );
      const pending = scopeRequests.current.filter(
        (request) => request.recent === recent,
      );
      const ids = (demandIds ? demandIds.split(",") : []).filter(
        (id) =>
          !previous?.scopeIds?.includes(id) &&
          !previous?.errorIds?.includes(id) &&
          !pending.some((request) => request.ids.includes(id)),
      );
      if (
        source.scopeNavigation
          ? !ids.length && (!!previous || !!pending.length)
          : !!previous || !!pending.length
      )
        return;
      const controller = new AbortController();
      const request = { recent, ids, controller };
      scopeRequests.current.push(request);
      const store = (result: { scopes: ExamScope[]; error?: string }) => {
        // Reserve these IDs until this source/retry ends, including the gap
        // between a response and React committing its cache update.
        if (controller.signal.aborted) return;
        setLoadedList((current) => {
          const entry = current.find(
            (item) =>
              item.source === source &&
              item.recent === recent &&
              item.retry === retry,
          );
          return [
            ...current.filter((item) => item !== entry),
            {
              source,
              recent,
              retry,
              scopes: [
                ...new Map(
                  [...(entry?.scopes ?? []), ...result.scopes].map((scope) => [
                    scope.id,
                    scope,
                  ]),
                ).values(),
              ],
              scopeIds: [
                ...new Set([
                  ...(entry?.scopeIds ?? []),
                  ...(result.error ? [] : ids),
                ]),
              ],
              errorIds: [
                ...new Set([
                  ...(entry?.errorIds ?? []),
                  ...(result.error ? ids : []),
                ]),
              ],
              error: result.error ?? entry?.error,
            },
          ];
        });
      };
      void source
        .loadScopes(
          controller.signal,
          source.scopeNavigation
            ? { excludeRecent: recent, scopeIds: ids }
            : conditions
              ? { excludeRecent: recent }
              : undefined,
        )
        .then((result) => {
          store({ scopes: result });
        })
        .catch((cause) => {
          store({
            scopes: [],
            error:
              cause instanceof Error
                ? cause.message
                : "출제 범위를 불러오지 못했습니다.",
          });
        });
    };
    loadScopeCounts(excludeRecent);
    // 창이 열리면 반대쪽(최근 출제를 넣은 · 뺀) 수도 따로 센다.
    if (conditionsOpen && conditions) loadScopeCounts(!excludeRecent);
  }, [
    source,
    retry,
    conditions,
    loadedList,
    demandIds,
    excludeRecent,
    conditionsOpen,
  ]);
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
  // New question-aware math sources retain the teacher's explicit intent.
  // A partial read may be reviewed, but cannot silently become a smaller test.
  const requiredTotal =
    conditions && source.questionFormats
      ? (applied.total ?? (hasComposed ? requested : null))
      : null;
  const formatMismatches =
    conditions && source.questionFormats
      ? Object.entries(formatIntent(applied.formats) ?? {}).flatMap(
          ([format, count]) => {
            const actual = questions.filter(
              (item) => source.info(item).format === format,
            ).length;
            return actual === count
              ? []
              : [`${format} ${count}문항 지정 · 현재 ${actual}문항`];
          },
        )
      : [];
  const intentWarning = [
    requiredTotal !== null && questions.length !== requiredTotal
      ? `총 ${requiredTotal}문항 지정 · 현재 ${questions.length}문항`
      : "",
    ...formatMismatches,
  ]
    .filter(Boolean)
    .join(". ");
  const outputAllowed = canOutput && !intentWarning;
  useEffect(() => {
    onIntentIssueChange?.(intentWarning || null);
  }, [intentWarning, onIntentIssueChange]);
  // 표를 손으로 고쳐 난이도와 합이 어긋나면 구성 전에 막는다 — 창의 «확인할 것»과 같은 말.
  const ladderWarning = conditions
    ? (ladderIssue(applied.ladder, requested, conditions.ladder) ??
      formatIssue(applied.formats, requested))
    : null;
  const quickWarning =
    conditions && source.requireScopeCounts
      ? planComposition(
          {
            ...applied,
            fixed: Object.fromEntries(
              allocations.map((row) => [row.scopeId, !!row.fixed]),
            ),
          },
          allocations.map((row) => ({
            ...row,
            label: scopeMap.get(row.scopeId)?.label ?? "선택 범위",
            usable: scopeMap.get(row.scopeId)?.count,
          })),
          { ladder: conditions.ladder, max: maxQuestions },
        ).block[0]
      : undefined;
  const valid =
    !quickWarning &&
    !(
      source.requireScopeCounts &&
      applied.total !== null &&
      (applied.total < 1 || applied.total > maxQuestions)
    ) &&
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
  // W5 «이름 붙인 출제 조건» — 구성 조건(W4)이 있는 출처에서만(수학). 조건만 오간다 — 문항은 [문항 검토 →]으로 새로.
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
      setScopeRestoreRequest((value) => value + 1);
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
      // 저장한 조건(W5 · 계약 v1)은 형식 · 차례를 담지 않는다 — 지금 고른 값을 그대로 둔다.
      formats: applied.formats,
      mcFirst: applied.mcFirst,
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
    if (duplicateQuestions(next)) {
      setError(
        "같은 문항의 형식이 함께 있습니다. 유지할 표현을 먼저 선택해 주세요.",
      );
      return;
    }
    setSwappedId(null);
    setHistory((current) => [...current.slice(-9), questions]);
    onQuestionsChange(next);
  }
  const reorder = useQuestionReorder(questions, change, reviewRef);
  const orderReorder = useQuestionReorder(
    questions,
    change,
    orderRef,
    "[data-exam-order]",
  );
  const activeReorder = reorder.drag ? reorder : orderReorder;
  useEffect(() => {
    if (!picker?.replaceId || !reviewRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setPickerWidth(entry.contentRect.width),
    );
    observer.observe(reviewRef.current);
    return () => observer.disconnect();
  }, [picker]);
  /** 추가 · 교체 — 교체는 그 자리 · 차례 그대로(되돌리기 기록에 남는다). 바꿨으면 true. */
  function choose(item: T, formatResolved = false): boolean {
    if (!picker) return false;
    if (
      !formatResolved &&
      (source.questionFormats?.options(item).length ?? 0) > 1
    ) {
      setFormatPicker({ item });
      return false;
    }
    const added = source.info(item);
    const takenElsewhere = questions.some((current) => {
      const existing = source.info(current);
      return (
        existing.id !== picker.replaceId &&
        ((added.questionId && existing.questionId === added.questionId) ||
          existing.id === added.id ||
          (!!added.familyId && existing.familyId === added.familyId))
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
      !questions.some((current) => identity(current) === identity(item))
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
  /** 1단계에서 범위를 체크 · 풀었을 때 — 남은 범위의 수는 그대로, 새 범위는 남은 자리를 나눠 5문항까지. */
  function chooseScopes(ids: string[]) {
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
      Math.floor(remaining / Math.max(selectedIds.length - retained.size, 1)),
    );
    const nextRows = selectedIds.map(
      (scopeId) =>
        retained.get(scopeId) ?? {
          scopeId,
          count: Math.min(
            defaultCount,
            scopeMap.get(scopeId)?.count ?? maxQuestions,
          ),
        },
    );
    const plan =
      conditions && source.requireScopeCounts && applied.total !== null
        ? planComposition(
            {
              ...applied,
              fixed: Object.fromEntries(
                nextRows.map((row) => [row.scopeId, !!row.fixed]),
              ),
            },
            nextRows.map((row) => ({
              ...row,
              label: scopeMap.get(row.scopeId)?.label ?? "선택 범위",
              usable: scopeMap.get(row.scopeId)?.count,
            })),
            { ladder: conditions.ladder, max: maxQuestions },
          )
        : null;
    setAllocations(
      plan && !plan.block.length
        ? nextRows.map((row) => ({
            ...row,
            count:
              plan.rows.find((item) => item.scopeId === row.scopeId)?.next ??
              row.count,
          }))
        : nextRows,
    );
    setScopePage(1);
  }
  /**
   * 다시 «문항 검토 →» — 검토하던 문항 가운데 아직 범위 · 수 안에 있는 것은 차례 그대로 두고 모자란 자리만 새로 뽑는다
   * (Wire B 의 기본값 · 원장님 «추천으로 진행» 2026-10-17). 난이도 조건이 남긴 문항과 안 맞으면 전부 새로 짠다.
   */
  function keepPlan(
    intent: Record<string, number> | undefined,
    formats: Record<string, number> | undefined,
  ) {
    const limit = new Map(allocations.map((row) => [row.scopeId, row.count]));
    const keptCount = new Map<string, number>();
    const kept: T[] = [];
    for (const item of questions) {
      const id = source.info(item).scopeId;
      const used = keptCount.get(id) ?? 0;
      if (used >= (limit.get(id) ?? 0)) continue;
      keptCount.set(id, used + 1);
      kept.push(item);
    }
    const fill = allocations
      .map((row) => ({
        scopeId: row.scopeId,
        count: row.count - (keptCount.get(row.scopeId) ?? 0),
      }))
      .filter((row) => row.count > 0);
    if (!kept.length || (!intent && !formats))
      return { kept, fill, intent, formats };
    const need = fill.reduce((sum, row) => sum + row.count, 0);
    // 남긴 문항이 차지한 몫을 빼고 남은 의도 — 음수가 되거나 합이 안 맞으면 null(전부 새로 짠다).
    const leftOf = (
      want: Record<string, number> | undefined,
      valueOf: (item: T) => string | undefined,
      slots: number,
    ) => {
      if (!want) return undefined;
      const left = { ...want };
      for (const item of kept) {
        const value = valueOf(item);
        if (value && value in left) left[value] -= 1;
      }
      const specified = Object.values(left).reduce((sum, n) => sum + n, 0);
      const fits =
        Object.values(left).every((n) => n >= 0) &&
        specified <= need &&
        (Object.keys(left).length < slots || specified === need);
      return fits ? left : null;
    };
    const leftTiers = leftOf(
      intent,
      (item) => source.info(item).difficulty,
      conditions?.ladder.length ?? 0,
    );
    const leftFormats = leftOf(
      formats,
      (item) => source.info(item).format,
      QUESTION_FORMATS.length,
    );
    if (leftTiers === null || leftFormats === null)
      return {
        kept: [],
        fill: allocations,
        intent,
        formats,
        redrawn: true,
      };
    return { kept, fill, intent: leftTiers, formats: leftFormats };
  }
  /** «객관식을 앞에»(M3) — 객관식 먼저 · 그다음 나머지, 무리 안에서는 지금 차례를 지킨다(안정 정렬). */
  function mcFirstOrder(items: T[], byTier: boolean) {
    const tierIndex = (item: T) =>
      conditions?.ladder.indexOf(source.info(item).difficulty ?? "") ?? -1;
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const mc =
          Number(source.info(b.item).format === "객관식") -
          Number(source.info(a.item).format === "객관식");
        if (mc) return mc;
        if (byTier) {
          const tier = tierIndex(a.item) - tierIndex(b.item);
          if (tier) return tier;
        }
        return a.index - b.index;
      })
      .map(({ item }) => item);
  }
  async function run(kind: "compose" | "output") {
    if (
      work.current ||
      disabled ||
      (kind === "compose" ? !valid : !questions.length || !outputAllowed)
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
      const plan =
        kind === "compose"
          ? keepPlan(
              conditions
                ? ladderIntent(applied.ladder, conditions.ladder)
                : undefined,
              conditions ? formatIntent(applied.formats) : undefined,
            )
          : null;
      const excludeIds = plan?.kept.map((item) => source.info(item).id) ?? [];
      const composed = !plan
        ? source.prepareOutput
          ? await source.prepareOutput(questions, controller.signal)
          : questions
        : !plan.fill.length
          ? []
          : conditions
            ? await source.compose(plan.fill, controller.signal, {
                excludeRecent,
                difficulty: plan.intent,
                ...(plan.formats ? { formats: plan.formats } : {}),
                ...(excludeIds.length ? { excludeIds } : {}),
              })
            : excludeIds.length
              ? await source.compose(plan.fill, controller.signal, {
                  excludeIds,
                })
              : await source.compose(plan.fill, controller.signal);
      if (controller.signal.aborted) return;
      const drawn = Array.isArray(composed)
        ? composed
        : ((notes = composed.notes ?? []), composed.items);
      // 남긴 문항과 같은 문항 · 같은 문항류는 새로 뽑은 쪽에서 버린다(D-111 — 서버도 빼지만 출처마다 다르다).
      const keptFamilies = new Set(
        (plan?.kept ?? []).flatMap((item) => {
          const family = source.info(item).familyId;
          return family ? [family] : [];
        }),
      );
      const next = plan
        ? [
            ...plan.kept,
            ...drawn.filter((item) => {
              const family = source.info(item).familyId;
              return !family || !keptFamilies.has(family);
            }),
          ]
        : drawn;
      if (duplicateQuestions(next))
        throw new Error(
          "같은 문항의 형식이 함께 있습니다. 유지할 표현을 선택해 주세요. 기존 문항은 유지됩니다.",
        );
      const unique = next;
      // 남긴 문항이 없으면(새로 짠 시험지) 무리 안에서 쉬운 것부터, 남긴 문항이 있으면 원장님 차례를 지킨다.
      const distinct =
        plan && conditions && applied.mcFirst
          ? mcFirstOrder(unique, !plan.kept.length)
          : unique;
      if (distinct.length > maxQuestions)
        throw new Error(`최대 ${maxQuestions}문항까지 구성할 수 있습니다.`);
      if (kind === "output" && !distinct.length)
        throw new Error("출력할 문항이 없습니다. 문항을 다시 확인해 주세요.");
      change(distinct);
      if (kind === "compose") {
        setHasComposed(true);
        setApplyReport(null);
        const keptCount = plan?.kept.length ?? 0;
        setNotice(
          [
            distinct.length < requested
              ? `요청한 ${requested}문항 중 ${distinct.length}문항을 구성했습니다. 부족한 범위는 다른 범위로 채우지 않았습니다.`
              : `${distinct.length}문항을 구성했습니다.`,
            keptCount
              ? `검토하던 ${keptCount}문항은 그대로 두고 ${distinct.length - keptCount}문항을 새로 채웠습니다.`
              : plan?.redrawn
                ? "난이도 · 형식 조건에 맞추려고 문항을 모두 새로 뽑았습니다."
                : "",
            ...notes,
          ]
            .filter(Boolean)
            .join(" "),
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
    if (step !== "output" || outputReady || disabled || !outputAllowed) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const next = source.prepareOutput
          ? await source.prepareOutput(questions, controller.signal)
          : questions;
        if (controller.signal.aborted) return;
        const distinct = next;
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
    outputAllowed,
    source,
    questions,
    maxQuestions,
    onQuestionsChange,
    onStepChange,
  ]);
  const actionsDisabled = disabled || busy;
  const outputReasons = [
    actionsDisabled
      ? "출력할 문항을 확인하는 중입니다. 확인이 끝나면 다음 단계로 이동합니다."
      : "",
    !questions.length
      ? "담은 문항이 없습니다. 범위 설정에서 문항을 구성해 주세요."
      : "",
    !canOutput
      ? "양식 구성·출력 권한이 없습니다. 원장님에게 출력 권한을 요청해 주세요."
      : "",
    requiredTotal !== null && questions.length !== requiredTotal
      ? `총 ${requiredTotal}문항 지정 · 현재 ${questions.length}문항. ${Math.abs(requiredTotal - questions.length)}문항을 ${requiredTotal > questions.length ? "더 담거나" : "빼거나"} 총 문항 수를 바꿔 주세요.`
      : "",
    ...formatMismatches.map(
      (message) => `${message}. 문항을 바꾸거나 형식별 수를 바꿔 주세요.`,
    ),
  ].filter(Boolean);
  const scopeReason = actionsDisabled
    ? "문항을 준비하는 중입니다."
    : !allocations.length
      ? "출제할 범위를 한 개 이상 골라 주세요."
      : requested <= 0
        ? "문항 수를 1문항 이상 정해 주세요."
        : requested > maxQuestions
          ? `최대 ${maxQuestions}문항까지 구성할 수 있습니다. 문항 수를 줄여 주세요.`
          : (quickWarning ??
            ladderWarning ??
            (allocations.some(
              (row) =>
                !canSelectScope(
                  scopeMap.get(row.scopeId),
                  source.requireScopeCounts,
                ),
            )
              ? "선택한 범위의 출제 가능 수를 확인해 주세요."
              : allocations.some(
                    (row) =>
                      row.count >
                      (scopeMap.get(row.scopeId)?.count ?? maxQuestions),
                  )
                ? "범위별 문항 수를 출제 가능한 수 안에서 정해 주세요."
                : !valid
                  ? `문항 수를 1~${maxQuestions}문항으로 정해 주세요.`
                  : ""));
  function quickChange(next: AppliedConditions) {
    if (conditions && next.total !== applied.total) {
      const plan = planComposition(
        {
          ...next,
          fixed: Object.fromEntries(
            allocations.map((row) => [row.scopeId, !!row.fixed]),
          ),
        },
        allocations.map((row) => ({
          ...row,
          label: scopeMap.get(row.scopeId)?.label ?? "선택 범위",
          usable: scopeMap.get(row.scopeId)?.count,
        })),
        { ladder: conditions.ladder, max: maxQuestions },
      );
      if (!plan.block.length)
        setAllocations((current) =>
          current.map((row) => ({
            ...row,
            count:
              plan.rows.find((item) => item.scopeId === row.scopeId)?.next ??
              row.count,
          })),
        );
    }
    setApplied(next);
  }
  if (step === "output" && (!outputReady || disabled || !outputAllowed))
    return (
      <section className={s.output} aria-label="출력 문항 확인">
        <p role="status">
          {!outputAllowed
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
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        {renderOutput({
          questions,
          onQuestionsChange: change,
          title,
          onTitleChange,
          onStep: (next) => {
            if (!preserveStoredOutput || !onBeginEdit) {
              go(next);
              return;
            }
            void onBeginEdit()
              .then((copied) => {
                if (copied) {
                  setOutputReady(false);
                  go(next);
                }
              })
              .catch((cause) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "편집 사본을 만들지 못했습니다.",
                ),
              );
          },
        })}
      </section>
    );
  const pages = Math.max(1, Math.ceil(allocations.length / 8));
  // 2단계 맨 위 요약 줄의 조건 — 구성 조건이 있는 출처(수학)만.
  const conditionNote = conditions
    ? [
        ladderIntent(applied.ladder, conditions.ladder)
          ? `난이도 ${conditions.ladder
              .filter((tier) => applied.ladder[tier] != null)
              .map((tier) => `${tier} ${applied.ladder[tier]}`)
              .join(" · ")}`
          : "난이도 지정 없음",
        formatText(applied),
        applied.recent ? `최근 ${conditions.recentDays}일 출제 뺌` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const summary = source.summarize?.(questions);
  const currentPage = Math.min(scopePage, pages);
  const reviewCurrentPage = Math.min(
    reviewPage,
    Math.max(0, Math.ceil(questions.length / 6) - 1),
  );
  const reviewStart = reviewCurrentPage * 6;
  const visibleQuestions = questions.slice(reviewStart, reviewStart + 6);
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        ({ index }) => index >= reviewStart && index < reviewStart + 6,
      ),
    }))
    .filter((group) => group.items.length);
  const pagination = (label: string) => (
    <nav className={s.pagination} aria-label={label}>
      <button
        type="button"
        disabled={reviewCurrentPage === 0}
        onClick={() => setReviewPage(reviewCurrentPage - 1)}
      >
        이전
      </button>
      <span>
        {questions.length ? reviewStart + 1 : 0}–
        {Math.min(reviewStart + 6, questions.length)} / {questions.length}문항
      </span>
      <button
        type="button"
        disabled={reviewStart + 6 >= questions.length}
        onClick={() => setReviewPage(reviewCurrentPage + 1)}
      >
        다음
      </button>
    </nav>
  );

  return (
    <section
      ref={rootRef}
      className={s.root}
      data-exam-builder
      aria-label="시험지 만들기"
    >
      <StudioStepBar
        barRef={bandRef}
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
              disabled: actionsDisabled || !questions.length || !outputAllowed,
              onSelect: () => void run("output"),
            },
          ],
        }}
      ></StudioStepBar>
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
      {step === "scope" ? (
        <div
          className={s.settings}
          data-builder-settings
          aria-label="시험지 설정"
          role="group"
        >
          {!(named && source.requireScopeCounts) && (
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
          )}
          {named && (
            <ConditionLine
              titleField={
                source.requireScopeCounts ? (
                  <label>
                    제목
                    <input
                      value={title}
                      maxLength={100}
                      disabled={actionsDisabled}
                      onChange={(event) => onTitleChange(event.target.value)}
                    />
                  </label>
                ) : undefined
              }
              appliedName={markActive ? appliedMark!.name : null}
              count={saved && !saved.error ? saved.items.length : null}
              disabled={actionsDisabled}
              opener={savedOpener}
              onOpen={() => setSavedOpen(true)}
            />
          )}
          <div
            data-scope-layout
            className={`${s.layout} ${source.requireScopeCounts ? s.sequenceLayout : ""}`}
          >
            {source.requireScopeCounts ? (
              <ScopeSequencePicker
                navigation={source.scopeNavigation}
                onBrowse={browseScopes}
                retryRequest={retry}
                scopes={scopes}
                selected={allocations.map((row) => row.scopeId)}
                initialGroup={initialGroup}
                restoreRequest={scopeRestoreRequest}
                disabled={actionsDisabled}
                controls={scopeControls}
                loading={scopeLoading || (!loaded && scopes.length === 0)}
                error={
                  loaded?.error ||
                  (scopeRestoreError?.source === source
                    ? scopeRestoreError.message
                    : undefined)
                }
                onRetry={() => {
                  setLoadedList([]);
                  setRetry((value) => value + 1);
                }}
                onChange={chooseScopes}
              />
            ) : (
              !scopeLoading &&
              !loaded?.error &&
              scopes.length > 0 && (
                <ScopePicker
                  scopes={scopes}
                  selected={allocations.map((row) => row.scopeId)}
                  initialGroup={initialGroup}
                  requireCounts={source.requireScopeCounts}
                  disabled={actionsDisabled}
                  onChange={chooseScopes}
                />
              )
            )}
            <section
              className={`${s.panel} ${source.requireScopeCounts ? s.sequenceComposition : ""}`}
              ref={scopeRef}
              tabIndex={-1}
              aria-label="출제 구성표"
            >
              <header className={s.panelHeader}>
                <strong>
                  출제 범위{" "}
                  {source.requireScopeCounts ? (
                    `· ${allocations.length}개`
                  ) : (
                    <span className={s.badge}>{allocations.length}개 선택</span>
                  )}
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
              </header>
              {named && markActive && applyReport && (
                <ApplyReport
                  report={applyReport}
                  hasQuestions={!!questions.length}
                />
              )}
              {unavailableRestored > 0 && (
                <p className={s.empty} role="status">
                  출제 가능한 문항이 없는 {unavailableRestored}개 범위를
                  구성에서 제외했습니다. 저장된 문항은 출력 전에 다시
                  확인합니다.
                </p>
              )}
              {scopeLoading && !source.requireScopeCounts ? (
                <p className={s.empty} role="status">
                  출제 범위를 불러오는 중입니다…
                </p>
              ) : loaded?.error && !source.requireScopeCounts ? (
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
                  {conditions && !source.requireScopeCounts && (
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
                  {source.requireScopeCounts ? (
                    <div
                      className={s.selectedScopes}
                      data-selected-scopes
                      aria-live="polite"
                    >
                      {allocations
                        .slice((currentPage - 1) * 8, currentPage * 8)
                        .map((row) => {
                          const scope = scopeMap.get(row.scopeId);
                          return (
                            <article
                              className={s.selectedScope}
                              key={row.scopeId}
                              data-selected-scope={row.scopeId}
                            >
                              <span className={s.selectedScopeSummary}>
                                {scope?.label ?? "선택 범위 확인 필요"}
                                <small>
                                  {scope?.count === undefined
                                    ? "출제 가능 수 확인 필요"
                                    : `출제 가능 ${scope.count}${scope.countUnit ?? "문항"}${excludeRecent ? "(최근 출제 뺀 뒤)" : ""}`}
                                </small>
                              </span>
                              <small
                                className={s.selectedScopeMeta}
                                title={[scope?.group, scope?.detail]
                                  .filter(Boolean)
                                  .join(" · ")}
                              >
                                {[scope?.group, scope?.detail]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </small>
                              <label>
                                <span className={s.selectedCountLabel}>
                                  문항 수
                                </span>
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
                                  onChange={(event) =>
                                    setAllocations((current) =>
                                      current.map((item) =>
                                        item.scopeId === row.scopeId
                                          ? {
                                              ...item,
                                              count: Math.max(
                                                0,
                                                Math.min(
                                                  maxQuestions,
                                                  scope?.count ?? maxQuestions,
                                                  Math.floor(
                                                    Number(
                                                      event.target.value,
                                                    ) || 0,
                                                  ),
                                                ),
                                              ),
                                              fixed: true,
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              {conditions && (
                                <label className={s.quickCheck}>
                                  <input
                                    type="checkbox"
                                    disabled={actionsDisabled}
                                    aria-label={`${scope?.label ?? "범위"} 고정`}
                                    checked={!!row.fixed}
                                    onChange={(event) =>
                                      setAllocations((current) =>
                                        current.map((item) =>
                                          item.scopeId === row.scopeId
                                            ? {
                                                ...item,
                                                fixed: event.target.checked,
                                              }
                                            : item,
                                        ),
                                      )
                                    }
                                  />
                                  고정
                                </label>
                              )}
                              <button
                                type="button"
                                disabled={actionsDisabled}
                                aria-label={`${scope?.label ?? "선택 범위"} 범위 제거`}
                                onClick={() =>
                                  setAllocations((current) =>
                                    current.filter(
                                      (item) => item.scopeId !== row.scopeId,
                                    ),
                                  )
                                }
                              >
                                빼기
                              </button>
                            </article>
                          );
                        })}
                    </div>
                  ) : (
                    <div className={s.tableWrap}>
                      <table
                        className={
                          conditions
                            ? `${s.table} ${s.withRowActions}`
                            : s.table
                        }
                      >
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
                                          ...(conditions
                                            ? { fixed: true }
                                            : {}),
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
                  )}
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
                  {source.requireScopeCounts
                    ? "출제할 차시를 골라 주세요."
                    : scopes.length
                      ? "왼쪽에서 출제할 범위를 체크하고 문항 수를 정해 주세요."
                      : "선택할 출제 범위가 없습니다. 등록된 자료를 확인해 주세요."}
                </p>
              )}
              {conditions && source.requireScopeCounts && (
                <>
                  <QuickConditions
                    value={applied}
                    total={requested}
                    ladder={conditions.ladder}
                    recentDays={conditions.recentDays}
                    disabled={actionsDisabled}
                    onChange={quickChange}
                  />
                  <div className={s.quickSummary} data-compose-summary>
                    <span>
                      {requested}문항 · {allocations.length}범위
                    </span>
                    <button
                      type="button"
                      ref={conditionsOpener}
                      disabled={actionsDisabled}
                      onClick={() => setConditionsOpen(true)}
                    >
                      구성 조건
                    </button>
                  </div>
                  <p className={s.conditionNote}>
                    모자란 범위는 다른 범위에서 채우지 않습니다.
                  </p>
                </>
              )}
              {source.requireScopeCounts && scopeReason && (
                <p id={`${uid}-scope-reason`} className={s.error} role="status">
                  {scopeReason}
                </p>
              )}
              <footer className={s.panelFooter}>
                <div className={s.compositionTotal}>
                  {source.requireScopeCounts ? (
                    <>
                      <span>구성할 문항</span>
                      <strong>
                        {requested}
                        <small>문항</small>
                      </strong>
                      <span>선택한 범위 {allocations.length}개</span>
                    </>
                  ) : (
                    <strong>합계 {requested}문항</strong>
                  )}
                  <small>
                    {requested > maxQuestions
                      ? `최대 ${maxQuestions}문항으로 맞춰 주세요.`
                      : questions.length
                        ? "다시 구성하면 범위에 남은 문항은 그대로 두고 모자란 자리만 채웁니다."
                        : conditions
                          ? "고정이 아닌 행은 총 문항에 맞춰 다시 나눕니다."
                          : `최대 ${maxQuestions}문항`}
                  </small>
                </div>
                <div className={sc.footActions}>
                  {named && (
                    <button
                      type="button"
                      disabled={
                        actionsDisabled || !allocations.length || saving
                      }
                      onClick={() => setSaving(true)}
                    >
                      조건 저장
                    </button>
                  )}
                  <button
                    type="button"
                    className={s.primary}
                    disabled={actionsDisabled || !valid}
                    aria-describedby={
                      source.requireScopeCounts && scopeReason
                        ? `${uid}-scope-reason`
                        : undefined
                    }
                    onClick={() => void run("compose")}
                  >
                    {busy ? "준비 중…" : "문항 검토 →"}
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
          </div>
        </div>
      ) : (
        <div className={s.reviewStep} data-builder-review>
          <div className={s.toolbar}>
            <label htmlFor={`${uid}-review-title`}>제목</label>
            <input
              id={`${uid}-review-title`}
              value={title}
              maxLength={100}
              disabled={actionsDisabled}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </div>
          <div className={s.stepSummary} data-exam-step-summary>
            <span>
              <span>
                <b>{allocations.length}개 범위</b> · {questions.length}문항
                {conditionNote ? ` · ${conditionNote}` : ""}
              </span>
              {selectedScopes.length > 0 && (
                <small>
                  {selectedScopes
                    .slice(0, 2)
                    .map((scope) => scope.label)
                    .join(" · ")}
                  {selectedScopes.length > 2
                    ? ` 외 ${selectedScopes.length - 2}개`
                    : ""}
                </small>
              )}
            </span>
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={() => go("scope")}
            >
              범위 설정 고치기
            </button>
          </div>
          <div className={s.reviewLayout} data-review-layout>
            <aside className={s.reviewRail} data-exam-review-rail>
              <section
                className={`${s.panel} ${s.statistics}`}
                aria-label="담은 문항 통계"
              >
                <header className={s.panelHeader}>
                  <h2>문제 통계</h2>
                </header>
                <div className={s.statTotal}>
                  <span>담은 문항</span>
                  <strong>
                    {questions.length}
                    <small>문항</small>
                  </strong>
                  <span>
                    {
                      new Set(
                        questions.map((item) => source.info(item).scopeId),
                      ).size
                    }
                    범위
                  </span>
                </div>
                <dl className={s.formatStats}>
                  {[
                    ...QUESTION_FORMATS,
                    ...new Set(
                      questions
                        .map((item) => source.info(item).format ?? "미분류")
                        .filter(
                          (format) =>
                            !QUESTION_FORMATS.some((value) => value === format),
                        ),
                    ),
                  ].map((format) => (
                    <div key={format}>
                      <dt>{format}</dt>
                      <dd>
                        {
                          questions.filter(
                            (item) =>
                              (source.info(item).format ?? "미분류") === format,
                          ).length
                        }
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className={s.distribution} aria-label="난이도별 문항 수">
                  {[
                    ...difficulties,
                    ...new Set(
                      questions
                        .map((item) => source.info(item).difficulty || "미지정")
                        .filter((tier) => !difficulties.includes(tier)),
                    ),
                  ].map((tier) => {
                    const count = questions.filter(
                      (item) =>
                        (source.info(item).difficulty || "미지정") === tier,
                    ).length;
                    return (
                      <div key={tier}>
                        <span>{tier}</span>
                        <span className={s.barTrack} aria-hidden="true">
                          <span
                            style={{
                              width: `${questions.length ? (count / questions.length) * 100 : 0}%`,
                            }}
                          />
                        </span>
                        <strong>{count}</strong>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section
                className={`${s.panel} ${s.orderPanel}`}
                aria-label="문항 순서표"
              >
                <header className={s.panelHeader}>
                  <h2>문항 순서</h2>
                </header>
                <p className={s.conditionNote}>
                  번호를 끌어 옮깁니다. 번호에서 Alt+위·아래 키로도 옮길 수
                  있습니다.
                </p>
                <table className={s.orderTable} ref={orderRef}>
                  <thead>
                    <tr>
                      <th>순서</th>
                      <th>형식</th>
                      <th>난이도</th>
                      <th>유형명·차시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleQuestions.map((item, local) => {
                      const index = reviewStart + local;
                      const info = source.info(item);
                      const handle = orderReorder.handleProps(index);
                      return (
                        <tr
                          key={`${identity(item)}:${index}`}
                          data-exam-order
                          data-exam-index={index}
                        >
                          <td>
                            <button
                              type="button"
                              className={s.orderHandle}
                              aria-label={`${index + 1}번 문항 본문으로 이동, Alt와 방향키로 순서 변경`}
                              disabled={actionsDisabled}
                              {...handle}
                              onKeyDown={(event) => {
                                if (
                                  event.altKey &&
                                  ["ArrowUp", "ArrowDown"].includes(event.key)
                                ) {
                                  event.preventDefault();
                                  change(
                                    moveQuestion(
                                      questions,
                                      index,
                                      index +
                                        (event.key === "ArrowUp" ? -1 : 1),
                                    ),
                                  );
                                } else handle.onKeyDown(event);
                              }}
                              onClick={() => {
                                const target =
                                  reviewRef.current?.querySelector<HTMLElement>(
                                    `[data-exam-index="${index}"]`,
                                  );
                                target?.focus({ preventScroll: true });
                                target?.scrollIntoView({ block: "center" });
                              }}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </button>
                          </td>
                          <td>{info.format ?? "미분류"}</td>
                          <td>{info.difficulty || "미지정"}</td>
                          <td>
                            <small>{scopeMap.get(info.scopeId)?.detail}</small>
                            {info.scopeLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!questions.length && (
                  <p className={s.empty}>담은 문항이 없습니다.</p>
                )}
                {pagination("순서표 쪽 이동")}
              </section>
              <section
                className={`${s.panel} ${s.outputAction}`}
                aria-label="다음 단계 안내"
                data-output-status={outputReasons.length ? "blocked" : "ready"}
              >
                <div
                  id={`${uid}-output-reason`}
                  className={s.outputReason}
                  role={intentWarning ? "alert" : "status"}
                >
                  {outputReasons.length ? (
                    outputReasons.map((reason) => <p key={reason}>{reason}</p>)
                  ) : (
                    <>
                      <strong>양식 구성·출력으로 이동할 수 있습니다.</strong>
                      <p>담은 문항의 순서가 그대로 이어집니다.</p>
                    </>
                  )}
                  {intentWarning && (
                    <button
                      type="button"
                      ref={conditionsOpener}
                      disabled={actionsDisabled}
                      onClick={() => setConditionsOpen(true)}
                    >
                      구성 조건
                    </button>
                  )}
                  {!questions.length && (
                    <button
                      type="button"
                      disabled={actionsDisabled}
                      onClick={() => go("scope")}
                    >
                      범위 설정으로 이동
                    </button>
                  )}
                </div>
                <div className={s.outputButtons}>
                  <button
                    type="button"
                    disabled={actionsDisabled}
                    onClick={() => go("scope")}
                  >
                    이전: 범위 설정
                  </button>
                  <button
                    type="button"
                    className={s.primary}
                    disabled={
                      actionsDisabled || !questions.length || !outputAllowed
                    }
                    aria-describedby={`${uid}-output-reason`}
                    onClick={() => void run("output")}
                  >
                    다음: 양식 구성·출력
                  </button>
                </div>
              </section>
            </aside>
            <section
              className={s.review}
              ref={reviewRef}
              aria-label="문항 검토"
            >
              <div className={s.toolbar}>
                <div className={s.reviewHeading}>
                  <h2 ref={headingRef} tabIndex={-1}>
                    담은 문항{" "}
                    <span className={s.badge}>{questions.length}개</span>
                  </h2>
                  {summary && <small data-exam-summary>{summary}</small>}
                </div>
                <div className={s.actions}>
                  {renderAnswer && (
                    <button
                      type="button"
                      className={s.reviewAction}
                      aria-pressed={answersShown}
                      onClick={() => setAnswersShown((shown) => !shown)}
                    >
                      {answersShown ? "정답·해설 숨기기" : "정답·해설 보기"}
                    </button>
                  )}
                  <button
                    type="button"
                    className={s.reviewAction}
                    disabled={actionsDisabled || !history.length}
                    onClick={() => {
                      const previous = history.at(-1);
                      if (previous) {
                        if (duplicateQuestions(previous)) {
                          setError(
                            "되돌릴 목록에 같은 문항의 형식이 함께 있습니다. 현재 선택은 유지했습니다.",
                          );
                          return;
                        }
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
              {conflictGroups.length > 0 && (
                <div className={s.error} role="alert">
                  <p>
                    저장된 목록에 같은 문항의 형식이 함께 있습니다. 새로
                    편집하려면 유지할 표현을 선택하세요. 저장된 원본은 자동으로
                    줄이지 않습니다.
                  </p>
                  {conflictGroups.map((items) => (
                    <div key={identity(items[0])}>
                      {items.map((item) => (
                        <button
                          type="button"
                          key={source.info(item).id}
                          disabled={actionsDisabled}
                          onClick={() => {
                            const key = identity(item);
                            setHistory([]);
                            onQuestionsChange(
                              questions.filter(
                                (row) => identity(row) !== key || row === item,
                              ),
                            );
                            setError("");
                          }}
                        >
                          {source.info(item).format ?? "현재 표현"} ·{" "}
                          {source.info(item).detail ?? source.info(item).id}{" "}
                          유지
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {!questions.length ? (
                <div className={`${s.panel} ${s.empty}`}>
                  <h2>검토할 문항이 없습니다.</h2>
                  <p>«범위 설정 고치기»로 1단계에 돌아가 문항을 구성하세요.</p>
                </div>
              ) : (
                visibleGroups.map((group, groupIndex) => (
                  <section
                    className={s.panel}
                    key={`${group.id}:${groupIndex}`}
                  >
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
                          !allocations.some(
                            (row) => row.scopeId === group.id,
                          ) ||
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
                            key={`${identity(item)}:${index}`}
                            className={`${s.question} ${reorder.drag?.from === index ? s.dragging : ""} ${swappedId === info.id ? s.justSwapped : ""}`}
                            data-exam-question
                            data-exam-index={index}
                            tabIndex={-1}
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
                                  {[
                                    info.scopeLabel,
                                    info.difficulty,
                                    info.detail,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </small>
                                {source.questionFormats && (
                                  <small className={s.questionFormats}>
                                    {[
                                      ...new Set(
                                        source.questionFormats
                                          .options(item)
                                          .filter(
                                            (row) =>
                                              row.state === "available" &&
                                              row.format,
                                          )
                                          .map(
                                            (row) => FORMAT_LABEL[row.format!],
                                          ),
                                      ),
                                    ].join(" · ")}
                                  </small>
                                )}
                                <div className={s.questionBody}>
                                  {renderQuestion(item)}
                                </div>
                              </div>
                              {answersShown && renderAnswer?.(item)}
                            </div>
                            <div className={s.actions}>
                              {(source.questionFormats?.options(item).length ??
                                0) > 1 && (
                                <button
                                  type="button"
                                  disabled={actionsDisabled}
                                  onClick={() =>
                                    setFormatPicker({ item, changeId: info.id })
                                  }
                                >
                                  형식 변경 · {info.format ?? "미분류"}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={
                                  actionsDisabled || !selectedScopes.length
                                }
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
                                  change(
                                    moveQuestion(questions, index, index - 1),
                                  )
                                }
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                aria-label={`${index + 1}번 문항 아래로`}
                                disabled={
                                  actionsDisabled ||
                                  index === questions.length - 1
                                }
                                onClick={() =>
                                  change(
                                    moveQuestion(questions, index, index + 1),
                                  )
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
              {pagination("문항 목록 쪽 이동")}
            </section>
          </div>
        </div>
      )}
      {identityError && (
        <p role="alert" className={s.error}>
          {identityError} 현재 문항은 유지했습니다.
        </p>
      )}
      {activeReorder.drag && activeReorder.line && (
        <div className={s.dropTarget} style={activeReorder.line} role="status">
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
              onChoose={(item) => choose(item)}
            />
          )}
      {formatPicker && source.questionFormats && (
        <QuestionFormatPicker
          item={formatPicker.item}
          actualId={source.info(formatPicker.item).id}
          options={source.questionFormats.options(formatPicker.item)}
          load={source.questionFormats.load}
          renderQuestion={renderQuestion}
          changing={!!formatPicker.changeId}
          onClose={() => setFormatPicker(null)}
          onChoose={(actual) => {
            if (formatPicker.changeId) {
              const next = questions.map((row) =>
                source.info(row).id === formatPicker.changeId ? actual : row,
              );
              if (duplicateQuestions(next))
                throw new Error("같은 문항의 형식 충돌을 먼저 해소해 주세요.");
              change(next);
              setNotice(
                "출제 형식을 바꿨습니다. 자리와 문항 수는 그대로입니다.",
              );
              setSwappedId(source.info(actual).id);
            } else if (!choose(actual, true))
              throw new Error(
                "이미 담긴 문항이거나 같은 문항류가 있습니다. 현재 선택은 유지했습니다.",
              );
            setFormatPicker(null);
          }}
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
