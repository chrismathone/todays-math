"use client";

import { useEffect, useState } from "react";
import { unifiedBankMaterialsPageSchema } from "@/contracts/unifiedBankBootstrap.contract";
import { requireQuestionRead } from "@/lib/problem/questionSelectionClient";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";
import BuilderDialog from "./BuilderDialog";
import s from "./ExamBuilder.module.css";

export default function DemandMaterialPicker({
  books,
  kinds,
  selected,
  bookNames,
  onClose,
  onApply,
}: {
  books: string[];
  kinds: string[];
  selected: string[];
  bookNames: Record<string, string>;
  onClose: () => void;
  onApply: (ids: string[]) => void;
}) {
  const [chosen, setChosen] = useState(() => new Set(selected));
  const [search, setSearch] = useState("");
  const [read, setRead] = useState({ page: 1, query: "", selected, retry: 0 });
  const [result, setResult] = useState<{
    key: string;
    value?: ReturnType<typeof unifiedBankMaterialsPageSchema.parse>;
    error?: string;
  }>();
  const booksKey = books.join(",");
  const kindsKey = kinds.join(",");
  const key = JSON.stringify([booksKey, kindsKey, read]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${getStudioEndpoints().problems}/sources`, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identity: "question",
        view: "materials-page",
        books: booksKey,
        page: String(read.page),
        pageSize: "20",
        ...(kindsKey ? { materialKinds: kindsKey } : {}),
        ...(read.query.trim() ? { q: read.query.trim() } : {}),
        ...(read.selected.length ? { materials: read.selected.join(",") } : {}),
      }),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "자료 목록을 불러오지 못했습니다.",
          );
        const value = unifiedBankMaterialsPageSchema.parse(body);
        requireQuestionRead(value);
        if (controller.signal.aborted) return;
        setResult({ key, value });
        // Validate the selected rows sent with this page request. New local choices
        // were made on confirmed page rows and must not be removed by an older read.
        const requested = new Set(read.selected);
        const available = new Set(value.selectedAvailable);
        setChosen(
          (current) =>
            new Set(
              [...current].filter(
                (id) => !requested.has(id) || available.has(id),
              ),
            ),
        );
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              cause instanceof Error ? cause.message : "자료 목록 확인 실패",
          });
      });
    return () => controller.abort();
  }, [booksKey, kindsKey, read, key]);
  // Search is remote now; cancel a transient query before it starts a count read.
  useEffect(() => {
    if (search.trim() === read.query) return;
    const timer = window.setTimeout(
      () =>
        setRead((current) => ({
          ...current,
          page: 1,
          query: search.trim(),
          selected: [...chosen],
        })),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [search, read.query, chosen]);
  const current = result?.key === key ? result : undefined;
  const data = current?.value;
  const loading = !current || search.trim() !== read.query;
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));
  function page(value: number) {
    setRead((current) => ({ ...current, page: value, selected: [...chosen] }));
  }
  return (
    <BuilderDialog title="교과서 자료 선택" onClose={onClose} width={880}>
      <div className={s.filters}>
        <label className={s.grow}>
          자료 검색
          <input
            value={search}
            maxLength={200}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="책·자료명·단원으로 검색"
          />
        </label>
      </div>
      <div className={s.scopeActions}>
        <span>
          {data ? `${data.total}개 자료 · ` : ""}
          {chosen.size}개 선택 (최대 300개)
        </span>
        <button disabled={!chosen.size} onClick={() => setChosen(new Set())}>
          선택 비우기
        </button>
      </div>
      <div className={s.dialogBody}>
        {current?.error ? (
          <div role="alert">
            <p>{current.error}</p>
            <p>선택은 유지됩니다.</p>
            <button
              onClick={() =>
                setRead((current) => ({
                  ...current,
                  selected: [...chosen],
                  retry: current.retry + 1,
                }))
              }
            >
              다시 확인
            </button>
          </div>
        ) : loading ? (
          <p className={s.empty} role="status">
            자료 목록을 확인합니다…
          </p>
        ) : (
          <>
            <ul className={s.scopeList}>
              {data?.materials.map((item) => (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={chosen.has(item.id)}
                      disabled={
                        item.available === 0 ||
                        (!chosen.has(item.id) && chosen.size >= 300)
                      }
                      onChange={() =>
                        setChosen((current) => {
                          const next = new Set(current);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        })
                      }
                    />
                    <span>
                      <strong>{item.title || "제목 미기록"}</strong>{" "}
                      <small>
                        {[
                          bookNames[item.bookId],
                          item.kindRaw || item.kind,
                          item.unitRaw,
                          item.round,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                      <small>
                        {item.sectionNo === null
                          ? "소단원 번호 미기록"
                          : `소단원 ${item.sectionNo}`}{" "}
                        ·{" "}
                        {item.round === null
                          ? "회차 미기록"
                          : `회차 ${item.round}`}
                      </small>
                    </span>
                    <small>
                      보유 {item.held} ·{" "}
                      {item.available
                        ? `출제 가능 ${item.available}`
                        : "출제 가능 문항 없음"}
                    </small>
                  </label>
                </li>
              ))}
            </ul>
            {!data?.materials.length && (
              <p className={s.empty}>조건에 맞는 자료가 없습니다.</p>
            )}
          </>
        )}
      </div>
      <footer className={s.dialogFooter}>
        <div className={s.pagination}>
          <button
            disabled={loading || !!current?.error || (data?.page ?? 1) === 1}
            onClick={() => page((data?.page ?? 1) - 1)}
          >
            이전
          </button>
          <span>{data ? `${data.page} / ${pages}` : "자료 목록"}</span>
          <button
            disabled={loading || !!current?.error || (data?.page ?? 1) >= pages}
            onClick={() => page((data?.page ?? 1) + 1)}
          >
            다음
          </button>
        </div>
        <button
          className={s.primary}
          disabled={loading || !!current?.error}
          onClick={() => onApply([...chosen])}
        >
          {chosen.size ? `${chosen.size}개 자료 적용` : "모든 자료로 적용"}
        </button>
      </footer>
    </BuilderDialog>
  );
}
