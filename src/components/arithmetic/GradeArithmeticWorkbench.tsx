"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
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
  listArithmeticV2PrintItems,
} from "@/lib/arithmetic-v2";
import { useUsageLabels } from "@/components/usage-labels/useUsageLabels";
import UsageLabel from "@/components/usage-labels/UsageLabel";
import {
  GradeArithmeticExpression,
  gradeArithmeticDensity,
  gradeArithmeticPaperPages,
} from "./GradeArithmeticPaper";
import type { ArithmeticPaperMode } from "./ArithmeticPaper";
import type { ArithmeticWorkbenchProps } from "./ArithmeticWorkbench";
import s from "./ArithmeticWorkbench.module.css";

const catalog = listArithmeticV2Types();
const byId = new Map(catalog.map((type) => [type.id, type]));
const grades = [...new Set(catalog.map((type) => type.grade))];
const PAGE_SIZE = 12;
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
  canOutput,
  academyName,
  preview = false,
  onDirtyChange,
  onDocumentChange,
  onBusyChange,
}: ArithmeticWorkbenchProps) {
  const [title, setTitle] = useState("연산 실력 다지기 1회");
  const [allocations, setAllocations] = useState<Allocation[]>(initial);
  const [grade, setGrade] = useState("전체");
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
  const [mode, setMode] = useState<ArithmeticPaperMode>("questions");
  const [density, setDensity] = useState<12 | 24>(24);
  const [printing, setPrinting] = useState(false);
  const client = useMemo(
    () => (storageScope ? new PrivateCloudClient(storageScope) : null),
    [storageScope],
  );
  const fingerprint = sheet
    ? JSON.stringify({ title: title.trim(), sheet })
    : "";
  const dirty = Boolean(sheet && fingerprint !== saved?.fingerprint);
  const strands = [
    ...new Set(
      catalog
        .filter((type) => grade === "전체" || type.grade === grade)
        .map((type) => type.strand),
    ),
  ];
  const filtered = catalog.filter(
    (type) =>
      (grade === "전체" || type.grade === grade) &&
      (strand === "전체" || type.strand === strand) &&
      (
        type.title +
        " " +
        type.description +
        " " +
        type.labels.join(" ")
      ).includes(query.trim()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
        item.count <= (byId.get(item.typeId)?.domainSize ?? 0),
    );
  const needsSpace = Boolean(
    sheet &&
    gradeArithmeticDensity(
      sheet.rounds.map((round) => ({
        round: round.round,
        items: round.items.map((item) => ({ ...item, number: item.order })),
      })),
      24,
    ) === 12,
  );
  const effectiveDensity = needsSpace ? 12 : density;
  const pages = useMemo(() => {
    if (!sheet) return [];
    const items = listArithmeticV2PrintItems(sheet);
    return gradeArithmeticPaperPages({
      rounds: sheet.rounds.map((round) => ({
        round: round.round,
        items: items.filter((item) => item.round === round.round),
      })),
      title: title.trim() || "연산 연습",
      academyName,
      mode,
      density,
    });
  }, [sheet, title, academyName, mode, density]);
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
          "저장된 식과 정답을 그대로 열었습니다. 다시 만들기에는 1회차의 유형 구성을 사용합니다.",
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
      .catch((cause) => setError(message(cause)))
      .finally(() => {
        if (!cancelled) setPrinting(false);
      });
    return () => {
      cancelled = true;
      document.body.removeAttribute("data-arithmetic-print");
    };
  }, [printing]);

  async function generate() {
    if (!valid || !catalogState.ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const request: ArithmeticV2GenerateRequest = {
        engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
        seed: crypto.randomUUID(),
        rounds: Array.from({ length: rounds }, () => ({ allocations })),
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
      setNotice(
        total +
          "문항을 생성하고 정답을 확인했습니다. 저장 전에는 현재 화면에만 보관됩니다.",
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
    <section className={s.root} aria-label="학년별 연산 만들기">
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
            setTitle("연산 실력 다지기 1회");
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
          <div className={s.catalogFilters + " " + s.gradeFilters}>
            <label>
              학년
              <select
                value={grade}
                onChange={(event) => {
                  setGrade(event.target.value);
                  setStrand("전체");
                  setPage(1);
                }}
              >
                <option>전체</option>
                {grades.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              연산 영역
              <select
                value={strand}
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
                placeholder="예: 분수, 소수, 근호"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          <p className={s.catalogCount}>
            {filtered.length}개 유형 · 학년은 권장 학습 시기이며, 해당 학년의
            전체 수학 범위가 아닙니다.
          </p>
          <p className={s.catalogCount}>
            유형별 가능한 식 안에서 숫자를 바꿔 생성합니다. 같은 회차에는 중복을
            넣지 않으며, 다시 만들거나 회차가 달라지면 이전 식이 나올 수
            있습니다.
          </p>
          {!preview && (
            <p className={s.catalogCount}>
              {usage.unavailable
                ? "사용 기록을 불러오지 못했습니다."
                : "내 학습지 사용 · 최근 30일 · 같은 연산 묶음 안의 순위"}{" "}
              원본 학습지 5장 이상·사용 유형 2개 이상일 때 순위를 표시합니다.
            </p>
          )}
          <div className={s.catalog} aria-label="학년별 연산 유형">
            {visible.map((type) => {
              const item = allocations.find(
                (value) => value.typeId === type.id,
              );
              return (
                <button
                  type="button"
                  className={s.card}
                  aria-pressed={Boolean(item)}
                  key={type.id}
                  disabled={busy}
                  onClick={() => {
                    if (!item)
                      setAllocations((current) => [
                        ...current,
                        { typeId: type.id, count: type.defaultCount },
                      ]);
                  }}
                >
                  <span className={s.cardTop}>
                    <strong>{type.title}</strong>
                    {item && <span>✓ {item.count}문항</span>}
                  </span>
                  <UsageLabel
                    item={usage.arithmeticV2Types.get(type.id)}
                    kind="arithmetic"
                    note={usage.note}
                  />
                  <span className={s.labels}>
                    {[
                      ...new Set([type.grade, type.strand, ...type.labels]),
                    ].map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </span>
                  <span className={s.capacity}>{type.description}</span>
                  <span className={s.example}>
                    <GradeArithmeticExpression prompt={type.example} />
                  </span>
                  <span className={s.capacity}>
                    중복 없이 {type.domainSize.toLocaleString()}문항
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
          {!allocations.length && (
            <p className={s.catalogCount}>왼쪽에서 연습할 유형을 담으세요.</p>
          )}
          {allocations.map((item) => {
            const type = byId.get(item.typeId)!;
            return (
              <div key={item.typeId}>
                <div className={s.allocation}>
                  <span className={s.selectionTitle}>
                    {type.grade} · {type.title}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={Math.min(100, type.domainSize)}
                    value={item.count}
                    disabled={busy}
                    aria-label={type.title + " 문항 수"}
                    onChange={(event) =>
                      setAllocations((current) =>
                        current.map((value) =>
                          value.typeId === item.typeId
                            ? { ...value, count: Number(event.target.value) }
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
                        current.filter((value) => value.typeId !== item.typeId),
                      )
                    }
                  >
                    빼기
                  </button>
                </div>
                {item.count > type.domainSize && (
                  <p className={s.error}>
                    이 유형은 회차당 {type.domainSize}문항까지 만들 수 있습니다.
                  </p>
                )}
              </div>
            );
          })}
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
                value={effectiveDensity}
                onChange={(event) =>
                  setDensity(Number(event.target.value) as 12 | 24)
                }
              >
                <option value={12}>12개 · 크게</option>
                <option value={24} disabled={needsSpace}>
                  24개 · 기본
                </option>
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
          {needsSpace && (
            <p className={s.catalogCount}>
              분수·문자식·근호가 있는 지면은 식과 답란의 여유를 위해 쪽당
              12문항으로 출력합니다.
            </p>
          )}
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
