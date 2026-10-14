"use client";
import { useState } from "react";
import type { BankSourceMaterial } from "@/contracts/bankSource.contract";
import BuilderDialog from "./BuilderDialog";
import s from "./ExamBuilder.module.css";

export default function MaterialPicker({
  materials,
  selected,
  bookNames,
  onClose,
  onApply,
}: {
  materials: BankSourceMaterial[];
  selected: string[];
  bookNames: Record<string, string>;
  onClose: () => void;
  onApply: (ids: string[]) => void;
}) {
  const [chosen, setChosen] = useState(
    () =>
      new Set(
        selected.filter((id) =>
          materials.some((item) => item.id === id && item.available > 0),
        ),
      ),
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = materials.filter((item) =>
    `${bookNames[item.bookId] ?? ""} ${item.title} ${item.kindRaw} ${item.unitRaw ?? ""}`.includes(
      query.trim(),
    ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  return (
    <BuilderDialog title="교과서 자료 선택" onClose={onClose} width={880}>
      <div className={s.filters}>
        <label className={s.grow}>
          자료 검색
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="책·자료명·단원으로 검색"
          />
        </label>
      </div>
      <div className={s.scopeActions}>
        <span>
          {filtered.length}개 자료 · {chosen.size}개 선택 (최대 300개)
        </span>
        <button disabled={!chosen.size} onClick={() => setChosen(new Set())}>
          선택 비우기
        </button>
      </div>
      <div className={s.dialogBody}>
        <ul className={s.scopeList}>
          {filtered.slice((page - 1) * 20, page * 20).map((item) => (
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
                    setChosen((previous) => {
                      const next = new Set(previous);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                />
                <span>
                  <strong>{item.title || "제목 미기록"}</strong>
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
                    {item.round === null ? "회차 미기록" : `회차 ${item.round}`}
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
        {!filtered.length && (
          <p className={s.empty}>조건에 맞는 자료가 없습니다.</p>
        )}
      </div>
      <footer className={s.dialogFooter}>
        <div className={s.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            이전
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage((value) => value + 1)}
          >
            다음
          </button>
        </div>
        <button className={s.primary} onClick={() => onApply([...chosen])}>
          {chosen.size ? `${chosen.size}개 자료 적용` : "모든 자료로 적용"}
        </button>
      </footer>
    </BuilderDialog>
  );
}
