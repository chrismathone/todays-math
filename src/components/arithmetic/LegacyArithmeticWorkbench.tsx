"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import {
  PrivateCloudClient,
  cloudError,
} from "@/components/unified/privateCloudClient";
import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
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
  ArithmeticExpression,
  arithmeticPaperPages,
  type ArithmeticDensity,
  type ArithmeticPaperMode,
} from "./ArithmeticPaper";
import { listArithmeticPresets } from "@/lib/arithmeticPresets";
import {
  coreAllocation,
  presetAllocation,
  restoreWorkbenchAllocations,
  type WorkbenchAllocation,
} from "./workbenchState";
import s from "./ArithmeticWorkbench.module.css";

const catalog = listArithmeticSkills();
const presets = listArithmeticPresets();
const groups = ["전체", "덧셈", "뺄셈", "곱셈", "나눗셈"] as const;
const PAGE_SIZE = 12;
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
  canOutput,
  academyName,
  preview = false,
  hideHeader = false,
  onDirtyChange,
  onDocumentChange,
  onBusyChange,
}: {
  storageScope?: string;
  initialDocumentId?: string;
  canOutput: boolean;
  academyName?: string;
  preview?: boolean;
  hideHeader?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onDocumentChange?: (id: string | undefined) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [title, setTitle] = useState("연산 기초 다지기 1회");
  const [allocations, setAllocations] = useState<WorkbenchAllocation[]>(() => [
    presetAllocation("add-two-carry-0", "initial"),
  ]);
  const [active, setActive] = useState("initial");
  const [group, setGroup] = useState<string>("전체");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = presets.filter(
    (preset) =>
      (group === "전체" || preset.group === group) &&
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
  const [mode, setMode] = useState<ArithmeticPaperMode>("questions");
  const [density, setDensity] = useState<ArithmeticDensity>(24);
  const [printing, setPrinting] = useState(false);
  const client = useMemo(
    () => (storageScope ? new PrivateCloudClient(storageScope) : null),
    [storageScope],
  );
  const fingerprint = sheet
    ? JSON.stringify({ title: title.trim(), sheet })
    : "";
  const dirty = Boolean(sheet && fingerprint !== saved?.fingerprint);
  const selection =
    allocations.find((item) => item.id === active) ?? allocations[0];
  const totalPerRound = allocations.reduce((sum, item) => sum + item.count, 0);
  const total = totalPerRound * rounds;
  const valid =
    allocations.length > 0 &&
    Number.isInteger(rounds) &&
    rounds > 0 &&
    rounds <= 20 &&
    total <= 100 &&
    allocations.every(
      (item) =>
        Number.isInteger(item.count) &&
        item.count > 0 &&
        item.count <= (capacity(item) ?? 0),
    );
  const pages = useMemo(
    () =>
      sheet
        ? arithmeticPaperPages({
            sheet,
            title: title.trim() || "연산 연습",
            academyName,
            mode,
            density,
          })
        : [],
    [sheet, title, academyName, mode, density],
  );
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
          "저장된 연산식과 정답을 그대로 열었습니다. 다시 만들기에는 1회차의 유형 구성을 사용합니다.",
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
  }, [client, initialDocumentId]);
  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    document.body.setAttribute("data-arithmetic-print", "true");
    void document.fonts.ready
      .then(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          ),
      )
      .then(() => {
        if (!cancelled) window.print();
      })
      .catch((cause: unknown) => setError(message(cause)))
      .finally(() => {
        if (!cancelled) setPrinting(false);
      });
    return () => {
      cancelled = true;
      document.body.removeAttribute("data-arithmetic-print");
    };
  }, [printing]);

  function update(item: WorkbenchAllocation) {
    setAllocations((current) =>
      current.map((value) => (value.id === item.id ? item : value)),
    );
  }
  async function generate() {
    if (!valid || !catalogState.ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const request: ArithmeticGenerateRequest = validateArithmeticRequest({
        engineVersion: ARITHMETIC_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_CATALOG_VERSION,
        seed: crypto.randomUUID(),
        rounds: Array.from({ length: rounds }, () => ({
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
      setNotice(
        `${total}문항을 생성하고 정답을 확인했습니다. 저장 전에는 현재 화면에만 보관됩니다.`,
      );
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function save() {
    if (
      !sheet ||
      !client ||
      !catalogState.writer ||
      !title.trim() ||
      inFlight.current
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      pendingId.current ??= crypto.randomUUID();
      const document = await client.save(
        saved?.id ?? pendingId.current,
        "arithmeticSheet",
        title.trim(),
        sheet,
        saved?.revision ?? null,
      );
      setSaved({ id: document.id, revision: document.revision, fingerprint });
      loadedId.current = document.id;
      onDocumentChange?.(document.id);
      setNotice("내 시험지에 저장했습니다.");
    } catch (cause) {
      setError(cloudError(cause));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  return (
    <section className={s.root} aria-label="연산대장">
      {!hideHeader && (
        <WorkspacePageHeader
          title="연산대장"
          description="자연수 기초 연산의 유형을 고르고 조건과 문항 수를 정하세요."
        />
      )}
      <div className={s.actions}>
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
            setSaved(undefined);
            pendingId.current = null;
            loadedId.current = undefined;
            setTitle("연산 기초 다지기 1회");
            setError("");
            setNotice("");
            onDocumentChange?.(undefined);
          }}
        >
          새 연습지
        </button>
      </div>
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
      <div className={s.layout}>
        <div>
          <div className={s.catalogFilters}>
            <label>
              연산 종류
              <select
                value={group}
                onChange={(event) => {
                  setGroup(event.target.value);
                  setPage(1);
                }}
              >
                {groups.map((value) => (
                  <option key={value}>{value}</option>
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
          <div className={s.catalog} aria-label="연산 유형">
            {visible.map((preset) => {
              const item = allocations.find(
                (value) => value.presetId === preset.id,
              );
              return (
                <button
                  type="button"
                  className={s.card}
                  aria-pressed={Boolean(item)}
                  key={preset.id}
                  disabled={busy}
                  onClick={() => {
                    if (item) setActive(item.id);
                    else {
                      const next = presetAllocation(
                        preset.id,
                        crypto.randomUUID(),
                      );
                      setAllocations((current) => [...current, next]);
                      setActive(next.id);
                    }
                  }}
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
                    {arithmeticFeatureLabels(preset.selection).map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </span>
                  <span className={s.example}>
                    <ArithmeticExpression prompt={preset.example} />
                  </span>
                  <span className={s.capacity}>
                    중복 없이 {preset.domainSize.toLocaleString()}문항
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
        <div className={s.settings}>
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
          {allocations.map((item) => (
            <div className={s.allocation} key={item.id}>
              <button
                type="button"
                aria-pressed={active === item.id}
                disabled={busy}
                onClick={() => setActive(item.id)}
              >
                {item.title}
              </button>
              <input
                type="number"
                min={1}
                max={100}
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
              {Object.entries(selection.constraints).map(([key, value]) => {
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
                    constraints: { ...selection.constraints, [key]: next },
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
                        onChange={(event) => change(Number(event.target.value))}
                      >
                        {(key === "borrowCount" ? [0, 1] : [0, 1, 2]).map(
                          (number) => (
                            <option key={number} value={number}>
                              {number === 0 ? "없음" : `${number}회`}
                            </option>
                          ),
                        )}
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
                                      ? value.filter((number) => number !== dan)
                                      : [...value, dan].sort((a, b) => a - b),
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
              })}
              <p>
                {capacity(selection) === null
                  ? "지원 범위에 맞게 조건을 확인해 주세요."
                  : `이 조건에서 중복 없이 ${capacity(selection)?.toLocaleString()}문항 생성 가능`}
              </p>
            </fieldset>
          )}
          <p className={s.catalogCount}>
            한 회차 안에서는 같은 식을 제외합니다. 회차 사이에는 같은 식이 다시
            나올 수 있습니다.
          </p>
          <label>
            회차
            <input
              type="number"
              min={1}
              max={20}
              value={rounds}
              disabled={busy}
              onChange={(event) => setRounds(Number(event.target.value))}
            />
          </label>
          <p className={s.total}>
            회차당 {totalPerRound}문항 · 총 {total}문항{" "}
            <small>한 번에 총 100문항까지</small>
          </p>
          {!valid && (
            <p className={s.error}>
              문항 수·회차·생성 가능 수를 확인해 주세요.
            </p>
          )}
          <button
            className={s.primary}
            type="button"
            disabled={busy || !valid || !catalogState.ready}
            onClick={() => void generate()}
          >
            {busy
              ? "작업 중…"
              : sheet
                ? "같은 조건으로 다시 만들기"
                : "연습지 만들기"}
          </button>
        </div>
      </div>
      {sheet && (
        <section className={s.output} aria-label="생성한 연산 연습지">
          <div className={s.outputBar}>
            <h2>
              지면 확인 <small>{dirty ? "저장 전" : "저장됨"}</small>
            </h2>
            <label>
              출력 구성
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as ArithmeticPaperMode)
                }
              >
                <option value="questions">문제지만</option>
                <option value="answers">정답지만</option>
                <option value="both">문제지 + 정답지</option>
              </select>
            </label>
            <label>
              쪽당 문항
              <select
                value={density}
                onChange={(event) =>
                  setDensity(Number(event.target.value) as ArithmeticDensity)
                }
              >
                <option value={12}>12개 · 크게</option>
                <option value={24}>24개 · 기본</option>
                <option value={40}>40개 · 조밀</option>
              </select>
            </label>
            <button
              disabled={
                busy || !client || !catalogState.writer || !title.trim()
              }
              onClick={() => void save()}
            >
              내 시험지에 저장
            </button>
            <button
              className={s.primary}
              disabled={busy || !canOutput || printing}
              onClick={() => setPrinting(true)}
            >
              인쇄 / PDF
            </button>
          </div>
          {!preview && !catalogState.writer && (
            <p className={s.notice}>
              연습지 저장은 준비 중입니다.
              {canOutput
                ? " 생성한 문제지와 정답지는 출력할 수 있습니다."
                : " 출력하려면 출력 메뉴 권한이 필요합니다."}
            </p>
          )}
          <PaperStrip
            pages={pages}
            hint="문제지와 답만 있는 정답지입니다. 쪽을 누르면 크게 볼 수 있습니다."
          />
        </section>
      )}
      {printing &&
        createPortal(
          <div className={s.printRoot} data-arithmetic-print-root>
            {pages.map((page) => page.node)}
          </div>,
          document.body,
        )}
    </section>
  );
}
