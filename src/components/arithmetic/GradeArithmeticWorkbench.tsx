"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PrivateCloudClient,
  cloudError,
} from "@/components/unified/privateCloudClient";
import {
  ARITHMETIC_V2_CATALOG_VERSION,
  ARITHMETIC_V2_ENGINE_VERSION,
  type ArithmeticV2GenerateRequest,
  type ArithmeticV2SheetPayload,
} from "@/contracts/arithmeticV2.contract";
import {
  listArithmeticV2Types,
  buildArithmeticV2Sheet,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";
import { useUsageLabels } from "@/components/usage-labels/useUsageLabels";
import UsageLabel from "@/components/usage-labels/UsageLabel";
import { MathText } from "@/components/math/MathText";
import { arithmeticTypeTitle } from "@/lib/arithmetic-v2/presentation/text";
import { sortArithmeticCatalog } from "@/lib/arithmetic-v2/presentation/catalogOrder";
import type { ArithmeticV2CatalogEntry } from "@/lib/arithmetic-v2/types";
import {
  ArithmeticGradeSelect,
  type ArithmeticGradeControl,
} from "./ArithmeticGradeSelect";
import type { ArithmeticWorkbenchProps } from "./ArithmeticWorkbench";
import { ArithmeticWorkflow, type ArithmeticStep } from "./ArithmeticWorkflow";
import type { ArithmeticRegenerationFeedback } from "./ArithmeticReview";
import { ArithmeticRandomSelection } from "./ArithmeticRandomSelection";
import {
  availableArithmeticTypes,
  randomArithmeticTypes,
} from "./typeSelection";
import { useArithmeticTypeSelection } from "./useArithmeticTypeSelection";
import {
  ArithmeticTypePreview,
  composeHandlers,
  useArithmeticTypePreview,
} from "./ArithmeticTypePreview";
import {
  ArithmeticBasketSelection,
  useArithmeticBasketSelection,
} from "./ArithmeticBasketSelection";
import { arithmeticV2ReviewRounds } from "@/lib/arithmeticOutput";
import type {
  ArithmeticRegenerationResult,
  ArithmeticRegenerationTarget,
} from "@/lib/arithmeticRegeneration";
import { arithmeticQuantityIssue } from "@/lib/arithmetic/quantity";
import { arithmeticSheetByteIssue } from "@/lib/arithmetic/byteBudget";
import {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ROUNDS,
} from "@/contracts/arithmetic.contract";
import {
  defaultArithmeticPresentation,
  type ArithmeticPresentation,
} from "@/contracts/arithmeticPresentation.contract";
import s from "./ArithmeticWorkbench.module.css";

const catalog = listArithmeticV2Types();
const byId = new Map(catalog.map((type) => [type.id, type]));
const PAGE_SIZE = 24;
type Allocation = { typeId: string; count: number };
const message = (error: unknown) =>
  error instanceof Error ? error.message : "작업을 완료하지 못했습니다.";
const initial = () =>
  catalog[0] ? [{ typeId: catalog[0].id, count: catalog[0].defaultCount }] : [];
function restore(sheet: ArithmeticV2SheetPayload): Allocation[] {
  const counts = new Map<string, number>();
  for (const item of sheet.rounds[0].items)
    counts.set(item.typeId, (counts.get(item.typeId) ?? 0) + 1);
  return [...counts].map(([typeId, count]) => ({ typeId, count }));
}

export default function GradeArithmeticWorkbench({
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
}: ArithmeticWorkbenchProps & { gradeControl?: ArithmeticGradeControl }) {
  const [title, setTitle] = useState("연산 실력 다지기");
  const [allocations, setAllocations] = useState<Allocation[]>(initial);
  const basketSelection = useArithmeticBasketSelection(
    allocations.map((item) => item.typeId),
  );
  const [localGrade, setGrade] = useState("전체");
  const grade = gradeControl?.value ?? localGrade;
  const [semester, setSemester] = useState<"전체" | 1 | 2>("전체");
  const [strand, setStrand] = useState("전체");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rounds, setRounds] = useState(1);
  const [sheet, setSheet] = useState<ArithmeticV2SheetPayload>();
  const [saved, setSaved] = useState<{
    id: string;
    revision: number;
    fingerprint: string;
  }>();
  const [busy, setBusy] = useState(Boolean(initialDocumentId && storageScope));
  const inFlight = useRef(Boolean(initialDocumentId && storageScope));
  const pendingId = useRef<string | null>(null);
  const loadedId = useRef<string | undefined>(undefined);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalogState, setCatalogState] = useState({
    ready: preview,
    writer: false,
  });
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
  // Three independent filters (owner, 2026-10-16): 학년 / 학기 / 영역. The area
  // list offers only what the chosen grade and semester contain.
  const inGradeAndSemester = (type: ArithmeticV2CatalogEntry) =>
    (grade === "전체" || type.grade === grade) &&
    (semester === "전체" || type.curriculum.semester === semester);
  const strands = [
    ...new Set(catalog.filter(inGradeAndSemester).map((type) => type.strand)),
  ];
  const activeStrand = strands.includes(strand as (typeof strands)[number])
    ? strand
    : "전체";
  // Textbook unit order (owner, 2026-10-16); the catalog itself stays in registration order.
  const filtered = sortArithmeticCatalog(catalog).filter(
    (type) =>
      inGradeAndSemester(type) &&
      (activeStrand === "전체" || type.strand === activeStrand) &&
      (
        type.title +
        " " +
        type.description +
        " " +
        type.curriculum.unit +
        " " +
        type.labels.join(" ")
      ).includes(query.trim()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const usage = useUsageLabels({
    arithmeticV2TypeIds: visible.map((type) => type.id),
    enabled: !preview,
    refreshKey:
      (storageScope ?? "") +
      ":" +
      (saved?.id ?? "") +
      ":" +
      (saved?.revision ?? ""),
  });
  const totalPerRound = allocations.reduce((sum, item) => sum + item.count, 0);
  const total = totalPerRound * rounds;
  const quantityIssue = arithmeticQuantityIssue(
    allocations.map((item) => item.count),
    rounds,
  );
  const exhausted = allocations.find(
    (item) => item.count > (byId.get(item.typeId)?.domainSize ?? 0),
  );
  const selectionError =
    quantityIssue?.message ??
    (exhausted
      ? `${byId.get(exhausted.typeId)?.title ?? "선택한 유형"}: 같은 회차에서 중복 없이 만들 수 있는 식은 ${byId.get(exhausted.typeId)?.domainSize ?? 0}개입니다. 이 유형의 문항 수를 줄여 주세요.`
      : "");
  const valid = !selectionError;
  const selectedTypes = allocations.map((item) => ({
    id: item.typeId,
    count: item.count,
  }));
  const available = availableArithmeticTypes(filtered, selectedTypes, rounds);
  const availableIds = new Set(available.map((item) => item.id));
  const typePreview = useArithmeticTypePreview();
  const closePreview = typePreview.close;
  // Changing a filter or page swaps the cards under the pointer; the preview
  // must not outlive the card it described.
  useEffect(
    () => closePreview(),
    [closePreview, grade, semester, strand, query, page],
  );
  const cardSelection = useArithmeticTypeSelection((id, selected) => {
    if (busy) return;
    setAllocations((current) => {
      if (!selected) return current.filter((item) => item.typeId !== id);
      const type = byId.get(id);
      if (
        !type ||
        !availableArithmeticTypes(
          [type],
          current.map((item) => ({ id: item.typeId, count: item.count })),
          rounds,
        ).length
      )
        return current;
      return [...current, { typeId: id, count: type.defaultCount }];
    });
  });
  function randomSelect(count: number) {
    setAllocations((current) => [
      ...current,
      ...randomArithmeticTypes(
        filtered,
        current.map((item) => ({ id: item.typeId, count: item.count })),
        rounds,
        count,
      ).map((item) => ({ typeId: item.id, count: item.defaultCount })),
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
    void fetch("/api/arithmetic/v2/catalog", {
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
          body.data?.engineVersion !== ARITHMETIC_V2_ENGINE_VERSION ||
          body.data?.catalogVersion !== ARITHMETIC_V2_CATALOG_VERSION
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
      .catch((cause) => {
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
    setError("");
    void client
      .get(initialDocumentId)
      .then((document) => {
        if (cancelled) return;
        if (document.kind !== "arithmeticSheet")
          throw new Error("연산 연습지 자료가 아닙니다.");
        const payload = reopenArithmeticV2Sheet(document.payload);
        loadedId.current = document.id;
        setAllocations(restore(payload));
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
          "저장된 식과 정답을 그대로 열었습니다. 문항 검토에서 회차별 구성을 유지해 숫자를 바꿀 수 있습니다.",
        );
      })
      .catch((cause) => {
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
      const request: ArithmeticV2GenerateRequest = {
        engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
        seed: crypto.randomUUID(),
        rounds:
          fromReview && sheet
            ? arithmeticV2ReviewRounds(sheet)
            : Array.from({ length: rounds }, () => ({ allocations })),
      };
      let payload: ArithmeticV2SheetPayload;
      if (preview) payload = buildArithmeticV2Sheet(request);
      else {
        const response = await fetch("/api/arithmetic/v2/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(request),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error?.message ?? "연습지를 만들지 못했습니다.");
        payload = reopenArithmeticV2Sheet(body.data);
      }
      setSheet(payload);
      setStep("review");
      setPresentation((current) => ({
        ...(current ?? defaultArithmeticPresentation(academyName)),
        step: "review",
      }));
      setNotice(
        payload.rounds.reduce((sum, round) => sum + round.items.length, 0) +
          "문항을 생성하고 정답을 확인했습니다. 저장 전에는 현재 화면에만 보관됩니다.",
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
        regenerateArithmeticV2Items,
        mergeArithmeticRegeneration,
        arithmeticRegenerationNotice,
      } = await import("@/lib/arithmeticRegeneration");
      const seed = crypto.randomUUID();
      let result: ArithmeticRegenerationResult<ArithmeticV2SheetPayload>;
      if (preview) result = regenerateArithmeticV2Items(sheet, target, seed);
      else {
        const response = await fetch("/api/arithmetic/v2/regenerate", {
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
        reopenArithmeticV2Sheet(result.sheet);
      }
      if (!mounted.current) return;
      const replacements = result.sheet.rounds
        .find((round) => round.round === target.round)!
        .items.filter((item) => result.changedOrders.includes(item.order));
      const merged = mergeArithmeticRegeneration(
        sheet,
        target.round,
        replacements,
      );
      // Selected geometry can introduce new figure IDs. Preserve the user's
      // metadata while carrying the helper's verified replacement SVG subset.
      setSheet(
        merged === sheet ? sheet : { ...merged, figures: result.sheet.figures },
      );
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
    <section className={s.root} aria-label="학년별 연산 만들기">
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
              setTitle("연산 실력 다지기");
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
              <div className={s.catalogFilters + " " + s.gradeFilters}>
                <ArithmeticGradeSelect
                  value={grade}
                  disabled={gradeControl?.disabled ?? busy}
                  includeBasic={Boolean(gradeControl)}
                  onChange={(value) => {
                    setGrade(value);
                    setStrand("전체");
                    setPage(1);
                    gradeControl?.onChange(value);
                  }}
                />
                <label>
                  학기
                  <select
                    value={String(semester)}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSemester(
                        value === "1" ? 1 : value === "2" ? 2 : "전체",
                      );
                      setPage(1);
                    }}
                  >
                    <option value="전체">전체</option>
                    <option value="1">1학기</option>
                    <option value="2">2학기</option>
                  </select>
                </label>
                <label>
                  연산 영역
                  <select
                    value={activeStrand}
                    onChange={(event) => {
                      setStrand(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option>전체</option>
                    {strands.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  유형 찾기
                  <input
                    type="search"
                    value={query}
                    placeholder="예: 분수, 근호, 도형"
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
            <div
              className={`${s.catalog} ${s.typeCatalog}`}
              aria-label="학년별 연산 유형"
            >
              {visible.map((type) => {
                const item = allocations.find(
                  (value) => value.typeId === type.id,
                );
                return (
                  <button
                    type="button"
                    className={s.card}
                    key={type.id}
                    {...composeHandlers(
                      cardSelection(
                        type.id,
                        Boolean(item),
                        busy || (!item && !availableIds.has(type.id)),
                      ),
                      typePreview.cardProps(type.id),
                    )}
                  >
                    <span className={s.cardTop}>
                      <strong>
                        <MathText text={arithmeticTypeTitle(type.title)} />
                      </strong>
                    </span>
                    <UsageLabel
                      item={usage.arithmeticV2Types.get(type.id)}
                      kind="arithmetic"
                      note={usage.note}
                    />
                    <span className={s.labels}>
                      {[
                        type.grade,
                        `${type.curriculum.semester}학기`,
                        type.curriculum.unit,
                      ].map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            {!filtered.length && (
              <p role="status">조건에 맞는 유형이 없습니다.</p>
            )}
            <ArithmeticTypePreview state={typePreview.state} types={catalog} />
            <div className={s.pagination} aria-label="연산 유형 페이지">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                이전
              </button>
              <span>
                {currentPage} / {pageCount}
              </span>
              <button
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
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
                      (item) => !basketSelection.checked.has(item.typeId),
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
                {allocations.map((item) => {
                  const type = byId.get(item.typeId)!;
                  return (
                    <div key={item.typeId}>
                      <div className={s.allocation}>
                        <label className={s.basketCheck}>
                          <input
                            type="checkbox"
                            aria-label={`${type.grade} · ${type.title} 선택`}
                            checked={basketSelection.checked.has(item.typeId)}
                            disabled={busy}
                            onChange={(event) =>
                              basketSelection.toggle(
                                item.typeId,
                                event.target.checked,
                              )
                            }
                          />
                        </label>
                        <span className={s.selectionTitle}>
                          {type.grade} ·{" "}
                          <MathText text={arithmeticTypeTitle(type.title)} />
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={Math.min(
                            ARITHMETIC_MAX_ITEMS_PER_ROUND,
                            type.domainSize,
                          )}
                          value={item.count}
                          disabled={busy}
                          aria-label={type.title + " 문항 수"}
                          onChange={(event) =>
                            setAllocations((current) =>
                              current.map((value) =>
                                value.typeId === item.typeId
                                  ? {
                                      ...value,
                                      count: Number(event.target.value),
                                    }
                                  : value,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={type.title + " 빼기"}
                          onClick={() =>
                            setAllocations((current) =>
                              current.filter(
                                (value) => value.typeId !== item.typeId,
                              ),
                            )
                          }
                        >
                          빼기
                        </button>
                      </div>
                      {item.count > type.domainSize && (
                        <p className={s.error}>
                          같은 회차에서 중복 없이 만들 수 있는 식은{" "}
                          {type.domainSize}개입니다.
                        </p>
                      )}
                    </div>
                  );
                })}
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
