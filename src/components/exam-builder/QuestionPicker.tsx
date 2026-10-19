"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FORMAT_LABEL } from "@/lib/problem/questionSelectionClient";
import BuilderDialog from "./BuilderDialog";
import type { ExamBuilderSource, ExamScope } from "./types";
import s from "./ExamBuilder.module.css";

const PAGE_SIZE = 10;
export default function QuestionPicker<T>({
  source,
  scopes,
  questions,
  difficulties,
  replacing,
  replaceId,
  excludeRecent = false,
  initialScopeId,
  width,
  maxQuestions,
  onChoose,
  onClose,
  renderQuestion,
}: {
  source: ExamBuilderSource<T>;
  scopes: ExamScope[];
  questions: T[];
  difficulties: readonly string[];
  replacing: boolean;
  /** The slot being replaced — its own family stays available (D-111 ⑷). */
  replaceId?: string;
  /** 최근 출제 빼기(W4 · D-20) — 구성 · 가용량과 같은 조건으로 후보를 고른다. */
  excludeRecent?: boolean;
  initialScopeId?: string;
  width?: number;
  maxQuestions: number;
  onChoose: (item: T) => boolean | void;
  onClose: () => void;
  renderQuestion: (item: T) => ReactNode;
}) {
  const [scopeId, setScopeId] = useState(initialScopeId ?? "");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    items: T[];
    total: number;
    error?: string;
  }>();
  const [added, setAdded] = useState<string[]>([]);
  // Keep visible candidates in place when repeatedly adding; a new filter uses current exclusions.
  const [excluded] = useState(() =>
    questions.map((item) => source.info(item).id),
  );
  // D-111: one problem family per sheet. Replacing frees only its own slot's family.
  const [excludedFamilies] = useState(() =>
    excluded.filter((id) => id !== replaceId),
  );
  const blockedFamilies = new Set(
    questions.flatMap((item) => {
      const info = source.info(item);
      return info.familyId && info.id !== replaceId ? [info.familyId] : [];
    }),
  );
  const scopeIds = scopeId ? [scopeId] : scopes.map((scope) => scope.id);
  const key = JSON.stringify([scopeIds, difficulty, query, page, retry]);
  const loading = result?.key !== key;
  const selected = new Set(
    questions.map(
      (item) => source.info(item).questionId ?? source.info(item).id,
    ),
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    const [ids, tier, text, currentPage] = JSON.parse(key) as [
      string[],
      string,
      string,
      number,
      number,
    ];
    if (!ids.length) return;
    void source
      .list(
        {
          scopeIds: ids,
          difficulty: tier,
          query: text,
          page: currentPage,
          pageSize: PAGE_SIZE,
          excludeIds: excluded,
          excludeFamiliesOf: excludedFamilies,
          ...(excludeRecent ? { excludeRecent } : {}),
        },
        controller.signal,
      )
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, ...data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            items: [],
            total: 0,
            error:
              error instanceof Error
                ? error.message
                : "문항을 불러오지 못했습니다.",
          });
      });
    return () => controller.abort();
  }, [source, key, excluded, excludedFamilies, excludeRecent]);
  return (
    <BuilderDialog
      title={replacing ? "문항 교체" : "문항 추가"}
      onClose={onClose}
      width={width}
    >
      <div className={s.difficultyTabs} role="group" aria-label="문항 난이도">
        {["", ...difficulties].map((tier) => (
          <button
            type="button"
            key={tier}
            aria-pressed={difficulty === tier}
            onClick={() => {
              setDifficulty(tier);
              setPage(1);
            }}
          >
            {tier || "전체 난이도"}
          </button>
        ))}
      </div>
      <div className={s.dialogFilters}>
        <label>
          출제 범위
          <select
            value={scopeId}
            onChange={(e) => {
              setScopeId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">선택 범위 전체</option>
            {scopes.map((scope) => (
              <option key={scope.id} value={scope.id}>
                {scope.label}
              </option>
            ))}
          </select>
        </label>
        <label className={s.grow}>
          문항 검색
          <input
            value={search}
            maxLength={200}
            placeholder="문제 내용으로 검색"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className={s.dialogBody} aria-busy={loading}>
        {loading ? (
          <p className={s.empty} role="status">
            조건에 맞는 문항을 불러오는 중입니다…
          </p>
        ) : result?.error ? (
          <div className={s.empty} role="alert">
            <p>{result.error}</p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              다시 시도
            </button>
          </div>
        ) : (
          <>
            <p className={s.resultCount}>
              {result?.total ?? 0}문항 · {difficulty || "전체 난이도"}
            </p>
            {result?.items.length ? (
              result.items.map((item) => {
                const info = source.info(item);
                const isSelected = selected.has(info.questionId ?? info.id);
                const sameFamily =
                  !isSelected &&
                  !!info.familyId &&
                  blockedFamilies.has(info.familyId);
                return (
                  <article className={s.candidate} key={info.id}>
                    <small>
                      {info.scopeLabel} · {info.difficulty || "난이도 미지정"}
                    </small>
                    {source.questionFormats && (
                      <small className={s.candidateFormats}>
                        가능 형식 ·{" "}
                        {[
                          ...new Set(
                            source.questionFormats
                              .options(item)
                              .filter(
                                (row) =>
                                  row.state === "available" && row.format,
                              )
                              .map((row) => FORMAT_LABEL[row.format!]),
                          ),
                        ].join(" · ") || "확인 전"}
                      </small>
                    )}
                    <div className={s.questionBody}>{renderQuestion(item)}</div>
                    <div className={s.actions}>
                      <button
                        type="button"
                        className={
                          isSelected || sameFamily ? undefined : s.primary
                        }
                        title={
                          sameFamily
                            ? "같은 문항류는 한 시험지에 1문항만 담습니다."
                            : undefined
                        }
                        disabled={
                          isSelected ||
                          sameFamily ||
                          (!replacing && questions.length >= maxQuestions)
                        }
                        onClick={() => {
                          if (onChoose(item) === false) return;
                          setAdded((current) => [...current, info.id]);
                        }}
                      >
                        {isSelected
                          ? "추가됨"
                          : sameFamily
                            ? "같은 문항류 있음"
                            : replacing
                              ? "이 문항으로 교체"
                              : "문항 추가"}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className={s.empty}>
                조건에 맞는 남은 문항이 없습니다. 난이도·범위·검색 조건을 변경해
                주세요.
              </p>
            )}
          </>
        )}
      </div>
      <footer className={s.dialogFooter}>
        <div className={s.pagination}>
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            이전
          </button>
          <span>
            {page} / {Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE))}
          </span>
          <button
            type="button"
            disabled={loading || page * PAGE_SIZE >= (result?.total ?? 0)}
            onClick={() => setPage((value) => value + 1)}
          >
            다음
          </button>
        </div>
        <span role="status">
          {added.length
            ? `${added.length}문항 추가됨`
            : `현재 ${questions.length}문항`}
        </span>
        <button type="button" onClick={onClose}>
          {replacing ? "취소" : "완료"}
        </button>
      </footer>
    </BuilderDialog>
  );
}
