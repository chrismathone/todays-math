"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PrivateCloudClient,
  cloudError,
} from "@/components/unified/privateCloudClient";
import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ROUNDS,
  type ArithmeticAllocation,
  type ArithmeticGenerateRequest,
} from "@/contracts/arithmetic.contract";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import {
  arithmeticDomainSize,
  buildArithmeticSheet,
  listArithmeticSkills,
  reopenArithmeticSheet,
  validateArithmeticRequest,
} from "@/lib/arithmetic";
import { arithmeticFeatureLabels } from "@/lib/arithmeticPresentation";
import { arithmeticUsageTypeKey } from "@/lib/usageLabels/typeKey";
import { useUsageLabels } from "@/components/usage-labels/useUsageLabels";
import UsageLabel from "@/components/usage-labels/UsageLabel";
import {
  ArithmeticGradeSelect,
  type ArithmeticGradeControl,
} from "./ArithmeticGradeSelect";
import { listArithmeticPresets } from "@/lib/arithmeticPresets";
import {
  coreAllocation,
  presetAllocation,
  restoreWorkbenchAllocations,
  type WorkbenchAllocation,
} from "./workbenchState";
import { ArithmeticWorkflow, type ArithmeticStep } from "./ArithmeticWorkflow";
import type { ArithmeticRegenerationFeedback } from "./ArithmeticReview";
import { ArithmeticRandomSelection } from "./ArithmeticRandomSelection";
import {
  availableArithmeticTypes,
  randomArithmeticTypes,
} from "./typeSelection";
import { useArithmeticTypeSelection } from "./useArithmeticTypeSelection";
import {
  ArithmeticBasketSelection,
  useArithmeticBasketSelection,
} from "./ArithmeticBasketSelection";
import { arithmeticReviewRounds } from "@/lib/arithmeticOutput";
import type {
  ArithmeticRegenerationResult,
  ArithmeticRegenerationTarget,
} from "@/lib/arithmeticRegeneration";
import { arithmeticQuantityIssue } from "@/lib/arithmetic/quantity";
import { arithmeticSheetByteIssue } from "@/lib/arithmetic/byteBudget";
import {
  defaultArithmeticPresentation,
  type ArithmeticPresentation,
} from "@/contracts/arithmeticPresentation.contract";
import s from "./ArithmeticWorkbench.module.css";

const catalog = listArithmeticSkills();
const presets = listArithmeticPresets();
const groups = ["전체", "덧셈", "뺄셈", "곱셈", "나눗셈"] as const;
const skillLabel = new Map<string, string>(
  catalog.map((skill) => [skill.skillId, skill.label]),
);
/** 종류 = the engine skill behind a preset; the list follows the chosen 연산 영역 (owner, 2026-10-16). */
const kindsIn = (group: string): string[] => [
  ...new Set<string>(
    presets
      .filter((preset) => group === "전체" || preset.group === group)
      .map((preset) => preset.selection.skillId),
  ),
];
const PAGE_SIZE = 24;
const capacity = (item: ArithmeticAllocation) => {
  try {
    return arithmeticDomainSize(item.skillId, item.constraints);
  } catch {
    return null;
  }
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "작업을 완료하지 못했습니다.";

export default function LegacyArithmeticWorkbench({
  storageScope,
  initialDocumentId,
  initialStep,
  canOutput,
  academyName,
  preview = false,
  onDirtyChange,
  onDocumentChange,
  onBusyChange,
  gradeControl,
}: {
  storageScope?: string;
  initialDocumentId?: string;
  initialStep?: ArithmeticStep;
  canOutput: boolean;
  academyName?: string;
  preview?: boolean;
  hideHeader?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onDocumentChange?: (id: string | undefined) => void;
  onBusyChange?: (busy: boolean) => void;
  gradeControl?: ArithmeticGradeControl;
}) {
  const [title, setTitle] = useState("연산 기초 다지기");
  const [allocations, setAllocations] = useState<WorkbenchAllocation[]>(() => [
    presetAllocation("add-two-carry-0", "initial"),
  ]);
  const basketSelection = useArithmeticBasketSelection(
    allocations.map((item) => item.id),
  );
  const [active, setActive] = useState("initial");
  const [group, setGroup] = useState<string>("전체");
  const [kind, setKind] = useState<string>("전체");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const kinds = kindsIn(group);
  const activeKind = kinds.includes(kind) ? kind : "전체";
  const filtered = presets.filter(
    (preset) =>
      (group === "전체" || preset.group === group) &&
      (activeKind === "전체" || preset.selection.skillId === activeKind) &&
      `${preset.title} ${preset.description}`.includes(query.trim()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const [rounds, setRounds] = useState(1);
  const [sheet, setSheet] = useState<ArithmeticSheetPayload>();
  const [saved, setSaved] = useState<{
    id: string;
    revision: number;
    fingerprint: string;
  }>();
  const usage = useUsageLabels({
    arithmeticTypes: visible.map((preset) => preset.selection),
    enabled: !preview,
    refreshKey: `${storageScope ?? ""}:${saved?.id ?? ""}:${saved?.revision ?? ""}`,
  });
  const pendingId = useRef<string | null>(null);
  const [busy, setBusy] = useState(Boolean(initialDocumentId && storageScope));
  const inFlight = useRef(Boolean(initialDocumentId && storageScope));
  const loadedId = useRef<string | undefined>(undefined);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalogState, setCatalogState] = useState<{
    ready: boolean;
    writer: boolean;
  }>({ ready: preview, writer: false });
  const [retry, setRetry] = useState(0);
  const [step, setStep] = useState<ArithmeticStep>("scope");
  const [presentation, setPresentation] = useState<ArithmeticPresentation>();
  const [regeneration, setRegeneration] =
    useState<ArithmeticRegenerationFeedback>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function changeStep(next: ArithmeticStep) {
    setStep(next);
    setPresentation((current) => ({
      ...(current ?? defaultArithmeticPresentation(academyName)),
      step: next,
    }));
  }
  const savePayload = useMemo(
    () => (sheet && presentation ? { ...sheet, presentation } : sheet),
    [sheet, presentation],
  );
  const client = useMemo(
    () => (storageScope ? new PrivateCloudClient(storageScope) : null),
    [storageScope],
  );
  const fingerprint = savePayload
    ? JSON.stringify({ title: title.trim(), sheet: savePayload })
    : "";
  const dirty = Boolean(sheet && fingerprint !== saved?.fingerprint);
  const selection =
    allocations.find((item) => item.id === active) ?? allocations[0];
  const totalPerRound = allocations.reduce((sum, item) => sum + item.count, 0);
  const total = totalPerRound * rounds;
  const quantityIssue = arithmeticQuantityIssue(
    allocations.map((item) => item.count),
    rounds,
  );
  const unavailable = allocations
    .map((item) => ({ item, count: capacity(item) }))
    .find(({ item, count }) => count === null || item.count > count);
  const selectionError =
    quantityIssue?.message ??
    (unavailable?.count === null
      ? `${unavailable.item.title}: 숫자 범위와 연산 조건을 확인해 주세요.`
      : unavailable
        ? `${unavailable.item.title}: 현재 조건에서 중복 없이 만들 수 있는 식은 ${unavailable.count}개입니다. 이 유형의 문항 수를 줄이거나 조건을 넓혀 주세요.`
        : "");
  const valid = !selectionError;
  const selectedTypes = allocations.map((item) => ({
    id: item.presetId ?? item.id,
    count: item.count,
  }));
  const available = availableArithmeticTypes(filtered, selectedTypes, rounds);
  const availableIds = new Set(available.map((item) => item.id));
  const cardSelection = useArithmeticTypeSelection((id, selected) => {
    if (busy) return;
    if (selected) setActive(id);
    setAllocations((current) => {
      if (!selected) return current.filter((item) => item.presetId !== id);
      const preset = presets.find((item) => item.id === id);
      if (
        !preset ||
        !availableArithmeticTypes(
          [preset],
          current.map((item) => ({
            id: item.presetId ?? item.id,
            count: item.count,
          })),
          rounds,
        ).length
      )
        return current;
      return [...current, presetAllocation(id, id)];
    });
  });
  function randomSelect(count: number) {
    setAllocations((current) => [
      ...current,
      ...randomArithmeticTypes(
        filtered,
        current.map((item) => ({
          id: item.presetId ?? item.id,
          count: item.count,
        })),
        rounds,
        count,
      ).map((item) => presetAllocation(item.id, item.id)),
    ]);
  }
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    void fetch("/api/arithmetic/catalog", {
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error?.message ?? "연산 목록을 불러오지 못했습니다.",
          );
        if (
          body.data?.engineVersion !== ARITHMETIC_ENGINE_VERSION ||
          body.data?.catalogVersion !== ARITHMETIC_CATALOG_VERSION
        )
          throw new Error(
            "연산 기능이 갱신되었습니다. 화면을 새로 열어 주세요.",
          );
        if (!controller.signal.aborted)
          setCatalogState({
            ready: true,
            writer: body.data.writerEnabled === true,
          });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(message(cause));
      });
    return () => controller.abort();
  }, [preview, retry]);
  useEffect(() => {
    if (!initialDocumentId || !client || loadedId.current === initialDocumentId)
      return;
    let cancelled = false;
    inFlight.current = true;
    setBusy(true);
    void client
      .get(initialDocumentId)
      .then((document) => {
        if (cancelled) return;
        if (document.kind !== "arithmeticSheet")
          throw new Error("연산 연습지 자료가 아닙니다.");
        const payload = reopenArithmeticSheet(document.payload);
        loadedId.current = document.id;
        const restored = restoreWorkbenchAllocations(payload);
        setAllocations(restored);
        setActive(restored[0].id);
        setRounds(payload.rounds.length);
        setSheet(payload);
        const nextStep = initialStep ?? payload.presentation?.step ?? "review";
        setStep(nextStep === "output" && !canOutput ? "review" : nextStep);
        setPresentation(payload.presentation);
        setTitle(document.title);
        setSaved({
          id: document.id,
          revision: document.revision,
          fingerprint: JSON.stringify({
            title: document.title,
            sheet: payload,
          }),
        });
        setNotice(
          "저장된 연산식과 정답을 그대로 열었습니다. 문항 검토에서 회차별 구성을 유지해 숫자를 바꿀 수 있습니다.",
        );
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cloudError(cause));
      })
      .finally(() => {
        if (!cancelled) {
          inFlight.current = false;
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, initialDocumentId, initialStep, canOutput]);

  function update(item: WorkbenchAllocation) {
    setAllocations((current) =>
      current.map((value) => (value.id === item.id ? item : value)),
    );
  }
  async function generate(fromReview = false) {
    if (
      (!fromReview && !valid) ||
      (fromReview && !sheet) ||
      !catalogState.ready ||
      inFlight.current
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setRegeneration(undefined);
    try {
      const request: ArithmeticGenerateRequest = validateArithmeticRequest({
        engineVersion: ARITHMETIC_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_CATALOG_VERSION,
        seed: crypto.randomUUID(),
        rounds:
          fromReview && sheet
            ? arithmeticReviewRounds(sheet)
            : Array.from({ length: rounds }, () => ({
                skills: allocations.map(coreAllocation),
              })),
      });
      let payload: ArithmeticSheetPayload;
      if (preview) payload = buildArithmeticSheet(request);
      else {
        const response = await fetch("/api/arithmetic/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(request),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error?.message ?? "연습지를 만들지 못했습니다.");
        payload = reopenArithmeticSheet(body.data);
      }
      setSheet(payload);
      setStep("review");
      setPresentation((current) => ({
        ...(current ?? defaultArithmeticPresentation(academyName)),
        step: "review",
      }));
      setNotice(
        `${payload.rounds.reduce((sum, round) => sum + round.items.length, 0)}문항을 생성하고 정답을 확인했습니다. 저장 전에는 현재 화면에만 보관됩니다.`,
      );
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function regenerate(target?: ArithmeticRegenerationTarget) {
    if (!target) return generate(true);
    if (!sheet || !catalogState.ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setRegeneration(undefined);
    try {
      const {
        regenerateArithmeticItems,
        mergeArithmeticRegeneration,
        arithmeticRegenerationNotice,
      } = await import("@/lib/arithmeticRegeneration");
      const seed = crypto.randomUUID();
      let result: ArithmeticRegenerationResult<ArithmeticSheetPayload>;
      if (preview) result = regenerateArithmeticItems(sheet, target, seed);
      else {
        const response = await fetch("/api/arithmetic/regenerate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ sheet, target, seed }),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error?.message ?? "선택한 문항의 숫자를 바꾸지 못했습니다.",
          );
        result = body.data;
        reopenArithmeticSheet(result.sheet);
      }
      if (!mounted.current) return;
      const replacements = result.sheet.rounds
        .find((round) => round.round === target.round)!
        .items.filter((item) => result.changedOrders.includes(item.order));
      setSheet(mergeArithmeticRegeneration(sheet, target.round, replacements));
      const outcome = arithmeticRegenerationNotice(result);
      setNotice(outcome);
      setRegeneration({ target, notice: outcome });
    } catch (cause) {
      if (mounted.current) setError(message(cause));
    } finally {
      if (mounted.current) setBusy(false);
      inFlight.current = false;
    }
  }
  async function save() {
    if (
      step !== "output" ||
      !savePayload ||
      !client ||
      preview ||
      !catalogState.writer ||
      !title.trim() ||
      inFlight.current
    )
      return;
    const byteIssue = arithmeticSheetByteIssue(savePayload);
    if (byteIssue) {
      setError(byteIssue.message);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      pendingId.current ??= crypto.randomUUID();
      const document = await client.save(
        saved?.id ?? pendingId.current,
        "arithmeticSheet",
        title.trim(),
        savePayload,
        saved?.revision ?? null,
      );
      if (!mounted.current) return;
      setSaved({ id: document.id, revision: document.revision, fingerprint });
      loadedId.current = document.id;
      onDocumentChange?.(document.id);
      setRegeneration(undefined);
      setNotice(
        "내 시험지에 저장했습니다. 다음에 같은 문항과 양식으로 열 수 있습니다.",
      );
    } catch (cause) {
      setError(cloudError(cause));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  return (
    <section className={s.root} aria-label="연산대장">
      {preview && (
        <p className={s.notice}>
          화면 확인용입니다. 생성과 인쇄 미리보기를 사용할 수 있으며 계정에는
          저장하지 않습니다.
        </p>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}{" "}
          {!catalogState.ready && (
            <button
              onClick={() => {
                setError("");
                setRetry((value) => value + 1);
              }}
            >
              다시 확인
            </button>
          )}
        </p>
      )}
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      <ArithmeticWorkflow
        step={step}
        setStep={changeStep}
        presentation={presentation}
        onPresentationChange={setPresentation}
        sheet={sheet}
        title={title}
        setTitle={setTitle}
        academyName={academyName}
        busy={busy}
        canOutput={canOutput}
        canSave={Boolean(client && catalogState.writer && !preview)}
        canRegenerate={catalogState.ready}
        dirty={dirty}
        onSave={() => void save()}
        onRegenerate={(target?: ArithmeticRegenerationTarget) =>
          void regenerate(target)
        }
        regeneration={regeneration}
        actions={
          <button
            disabled={busy}
            onClick={() => {
              if (
                dirty &&
                !window.confirm(
                  "저장하지 않은 연습지가 있습니다. 새 연습지를 시작할까요?",
                )
              )
                return;
              setSheet(undefined);
              setStep("scope");
              setPresentation(undefined);
              setRegeneration(undefined);
              setSaved(undefined);
              pendingId.current = null;
              loadedId.current = undefined;
              setTitle("연산 기초 다지기");
              setError("");
              setNotice("");
              onDocumentChange?.(undefined);
            }}
          >
            새 연습지
          </button>
        }
      >
        <div className={s.layout}>
          <div>
            <div
              className={s.catalogToolbar}
              aria-label="유형 검색과 무작위 담기"
            >
              <div
                className={`${s.catalogFilters} ${gradeControl ? s.gradeFilters : ""}`}
              >
                {gradeControl && <ArithmeticGradeSelect {...gradeControl} />}
                <label>
                  연산 영역
                  <select
                    value={group}
                    onChange={(event) => {
                      setGroup(event.target.value);
                      setKind("전체");
                      setPage(1);
                    }}
                  >
                    {groups.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  종류
                  <select
                    value={activeKind}
                    onChange={(event) => {
                      setKind(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="전체">전체</option>
                    {kinds.map((value) => (
                      <option key={value} value={value}>
                        {skillLabel.get(value) ?? value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  유형 찾기
                  <input
                    type="search"
                    value={query}
                    placeholder="예: 2단, 받아올림"
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                  />
                </label>
              </div>
              <ArithmeticRandomSelection
                compact
                available={available.length}
                disabled={busy}
                onSelect={randomSelect}
              />
            </div>
            <h2 className={s.catalogHeading}>
              연산 유형 <small>{filtered.length}개</small>
            </h2>
            <p className={s.catalogCount}>
              {filtered.length}개 유형 · 자연수 기초 연산
            </p>
            <p className={s.catalogCount}>
              같은 조건으로 반복 생성할 수 있습니다. 가능한 식을 모두 담으면
              순서만 바뀔 수 있고, 식이 하나뿐이면 그대로입니다.
            </p>
            {!preview && (
              <p className={s.catalogCount}>
                {usage.unavailable
                  ? "사용 기록을 불러오지 못했습니다."
                  : "내 학습지 사용 · 최근 30일 · 같은 연산 종류 안의 순위"}{" "}
                원본 학습지 5장 이상·사용 유형 2개 이상일 때 순위를 표시합니다.
              </p>
            )}
            <div
              className={`${s.catalog} ${s.typeCatalog}`}
              aria-label="연산 유형"
            >
              {visible.map((preset) => {
                const item = allocations.find(
                  (value) => value.presetId === preset.id,
                );
                return (
                  <button
                    type="button"
                    className={s.card}
                    key={preset.id}
                    {...cardSelection(
                      preset.id,
                      Boolean(item),
                      busy || (!item && !availableIds.has(preset.id)),
                    )}
                  >
                    <span className={s.cardTop}>
                      <strong>{preset.title}</strong>
                      {item && <span>✓ {item.count}문항</span>}
                    </span>
                    <UsageLabel
                      item={usage.arithmeticTypes.get(
                        arithmeticUsageTypeKey(preset.selection),
                      )}
                      kind="arithmetic"
                      note={usage.note}
                    />
                    <span className={s.labels}>
                      {arithmeticFeatureLabels(preset.selection).map(
                        (label) => (
                          <span key={label}>{label}</span>
                        ),
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {!filtered.length && (
              <p role="status">조건에 맞는 유형이 없습니다.</p>
            )}
            <div className={s.pagination} aria-label="연산 유형 페이지">
              <button
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                이전
              </button>
              <span>
                {page} / {pageCount}
              </span>
              <button
                disabled={page === pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                다음
              </button>
            </div>
          </div>
          <aside
            className={`${s.settings} ${s.gradeSettings}`}
            aria-label="연습지 구성"
          >
            <div
              className={s.settingsContent}
              role="region"
              aria-label="담은 유형과 생성 조건"
              tabIndex={0}
            >
              <label>
                학습지 제목
                <input
                  maxLength={200}
                  value={title}
                  disabled={busy}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <h2>
                담은 유형 <small>{allocations.length}개</small>
              </h2>
              <ArithmeticBasketSelection
                selection={basketSelection}
                total={allocations.length}
                disabled={busy}
                onRemove={() =>
                  setAllocations((current) =>
                    current.filter(
                      (item) => !basketSelection.checked.has(item.id),
                    ),
                  )
                }
              />
              <div
                className={s.selectedTypes}
                role="region"
                aria-label="담은 유형 목록"
                tabIndex={0}
              >
                {!allocations.length && (
                  <p className={s.catalogCount}>
                    왼쪽에서 연습할 유형을 담으세요.
                  </p>
                )}
                {allocations.map((item) => (
                  <div className={s.allocation} key={item.id}>
                    <label className={s.basketCheck}>
                      <input
                        type="checkbox"
                        aria-label={`${item.title} 선택`}
                        checked={basketSelection.checked.has(item.id)}
                        disabled={busy}
                        onChange={(event) =>
                          basketSelection.toggle(item.id, event.target.checked)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className={s.selectionTitle}
                      aria-pressed={active === item.id}
                      disabled={busy}
                      onClick={() => setActive(item.id)}
                    >
                      {item.title}
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={ARITHMETIC_MAX_ITEMS_PER_ROUND}
                      value={item.count}
                      disabled={busy}
                      aria-label={`${item.title} 문항 수`}
                      onChange={(event) =>
                        update({ ...item, count: Number(event.target.value) })
                      }
                    />
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`${item.title} 빼기`}
                      onClick={() =>
                        setAllocations((current) =>
                          current.filter((value) => value.id !== item.id),
                        )
                      }
                    >
                      빼기
                    </button>
                  </div>
                ))}
                {selection && (
                  <fieldset disabled={busy} className={s.constraints}>
                    <legend>{selection.title} 조건</legend>
                    {Object.entries(selection.constraints).map(
                      ([key, value]) => {
                        const labels: Record<string, string> = {
                          carry: "받아올림",
                          carryCount: "받아올림 횟수",
                          borrowCount: "받아내림 횟수",
                          left: "첫째 수",
                          right: "둘째 수",
                          minuend: "피감수",
                          subtrahend: "감수",
                          multiplier: "곱하는 수",
                          multiplicand: "곱해지는 수",
                          dividend: "나누어지는 수",
                          divisor: "나누는 수",
                          dans: "연습할 단",
                        };
                        const change = (next: unknown) =>
                          update({
                            ...selection,
                            presetId: undefined,
                            title: `${catalog.find((skill) => skill.skillId === selection.skillId)?.label} · 직접 설정`,
                            constraints: {
                              ...selection.constraints,
                              [key]: next,
                            },
                          } as WorkbenchAllocation);
                        if (key === "carry")
                          return (
                            <label key={key}>
                              {labels[key]}
                              <select
                                value={String(value)}
                                onChange={(event) => change(event.target.value)}
                              >
                                <option value="none">없음</option>
                                <option value="some">있음</option>
                              </select>
                            </label>
                          );
                        if (typeof value === "number")
                          return (
                            <label key={key}>
                              {labels[key]}
                              <select
                                value={value}
                                onChange={(event) =>
                                  change(Number(event.target.value))
                                }
                              >
                                {(key === "borrowCount"
                                  ? [0, 1]
                                  : [0, 1, 2]
                                ).map((number) => (
                                  <option key={number} value={number}>
                                    {number === 0 ? "없음" : `${number}회`}
                                  </option>
                                ))}
                              </select>
                            </label>
                          );
                        if (Array.isArray(value))
                          return (
                            <div key={key}>
                              <span>{labels[key]}</span>
                              <div className={s.dans}>
                                {Array.from({ length: 9 }, (_, i) => i + 1).map(
                                  (dan) => (
                                    <label key={dan}>
                                      <input
                                        type="checkbox"
                                        checked={value.includes(dan)}
                                        onChange={() =>
                                          change(
                                            value.includes(dan)
                                              ? value.filter(
                                                  (number) => number !== dan,
                                                )
                                              : [...value, dan].sort(
                                                  (a, b) => a - b,
                                                ),
                                          )
                                        }
                                      />
                                      {dan}단
                                    </label>
                                  ),
                                )}
                              </div>
                            </div>
                          );
                        if (
                          typeof value === "object" &&
                          value !== null &&
                          "min" in value
                        )
                          return (
                            <div key={key}>
                              <span>{labels[key]} 범위</span>
                              <div className={s.range}>
                                <input
                                  aria-label={`${labels[key]} 최솟값`}
                                  type="number"
                                  value={value.min}
                                  onChange={(event) =>
                                    change({
                                      ...value,
                                      min: Number(event.target.value),
                                    })
                                  }
                                />
                                <span>~</span>
                                <input
                                  aria-label={`${labels[key]} 최댓값`}
                                  type="number"
                                  value={value.max}
                                  onChange={(event) =>
                                    change({
                                      ...value,
                                      max: Number(event.target.value),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          );
                        return null;
                      },
                    )}
                    {capacity(selection) === null && (
                      <p>지원 범위에 맞게 조건을 확인해 주세요.</p>
                    )}
                  </fieldset>
                )}
              </div>
              <label>
                회차
                <input
                  type="number"
                  min={1}
                  max={ARITHMETIC_MAX_ROUNDS}
                  value={rounds}
                  disabled={busy}
                  onChange={(event) => setRounds(Number(event.target.value))}
                />
              </label>
            </div>
            <div className={s.settingsFooter}>
              <p className={s.total}>
                회차당 {totalPerRound}문항 · 총 {total}문항{" "}
                <small>
                  회차당 {ARITHMETIC_MAX_ITEMS_PER_ROUND}문항 · 최대{" "}
                  {ARITHMETIC_MAX_ROUNDS}회차
                </small>
              </p>
              {!valid && <p className={s.error}>{selectionError}</p>}
              <button
                className={s.primary}
                type="button"
                disabled={busy || !valid || !catalogState.ready}
                onClick={() => void generate()}
              >
                {busy
                  ? "작업 중…"
                  : sheet
                    ? "설정한 범위로 문항 만들기"
                    : "연습지 만들기"}
              </button>
            </div>
          </aside>
        </div>
      </ArithmeticWorkflow>
    </section>
  );
}
