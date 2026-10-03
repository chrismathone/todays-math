"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MathText } from "@/components/math/MathText";
import type {
  TextbookConcept,
  TextbookConceptTarget,
} from "@/contracts/textbookConcept.contract";
import {
  textbookConceptTargetCatalogSchema,
  type TextbookConceptTargetCatalog,
} from "@/contracts/textbookConceptCatalog.contract";
import {
  integrationRequest,
  TextbookIntegrationError,
} from "./integration/request";
import s from "./TextbookConceptLinkEditor.module.css";

export type TextbookConceptLink = TextbookConcept["links"][number];
export interface TextbookConceptLinkEditorProps {
  links: TextbookConceptLink[];
  confirmLinkIds: string[];
  disabled?: boolean;
  onChange: (links: TextbookConceptLink[], confirmLinkIds: string[]) => void;
}

type Entry = TextbookConceptTargetCatalog["entries"][number];
type Namespace = TextbookConceptTarget["namespace"];
type Relation = TextbookConceptLink["relation"];
const namespaces: Record<Namespace, string> = {
  "explorer-card": "개념 탐구 카드",
  "course-section": "학습 과정 소단원",
  "graph-unit": "교육과정 그래프 단원",
};
const relations: Record<Relation, string> = {
  related: "관련 있음",
  same: "같은 개념",
  "covers-part": "일부를 다룸",
};
const duplicateMessage =
  "같은 대상과 관계가 이미 연결되어 있습니다. 기존 연결을 확인해 주세요.";

function targetId(target: TextbookConceptTarget) {
  switch (target.namespace) {
    case "explorer-card":
      return target.cardId;
    case "course-section":
      return target.courseSectionId;
    case "graph-unit":
      return target.graphUnitId;
  }
}
function targetKey(target: TextbookConceptTarget) {
  return `${target.namespace}:${targetId(target)}`;
}
function candidateReview(): TextbookConceptLink["review"] {
  return {
    status: "candidate",
    candidateRule: "manual",
    reviewedBy: null,
    reviewedAt: null,
    targetHash: null,
  };
}
function errorMessage(error: unknown) {
  if (error instanceof TextbookIntegrationError) {
    if (error.status === 401)
      return "로그인이 필요합니다. 다시 로그인한 뒤 검색해 주세요.";
    if (error.status === 403)
      return "연결 대상을 볼 권한이 없습니다. 교사 계정을 확인해 주세요.";
    return error.message;
  }
  return "연결 대상을 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.";
}
async function readTargets(
  namespace: Namespace,
  q: string,
  signal: AbortSignal,
  cursor?: string,
) {
  const params = new URLSearchParams({ namespace, q, limit: "50" });
  if (cursor !== undefined) params.set("cursor", cursor);
  const data = await integrationRequest(
    `/api/textbook/concepts/targets?${params}`,
    textbookConceptTargetCatalogSchema,
    { signal },
  );
  if (data.entries.some((entry) => entry.target.namespace !== namespace)) {
    throw new Error("Unexpected catalog namespace");
  }
  return data;
}

function Definition({ entry }: { entry: Entry }) {
  return (
    <div className={s.definition}>
      <strong>
        <MathText text={entry.title} />
      </strong>
      <p className={s.context}>{entry.context || "추가 맥락 없음"}</p>
      <MathText
        as="div"
        text={
          entry.description ||
          "등록된 설명이 없습니다. 원문에서 범위를 확인해 주세요."
        }
      />
      <p className={s.source}>
        {namespaces[entry.target.namespace]} ·{" "}
        <code>{targetId(entry.target)}</code>
      </p>
      {entry.target.namespace === "graph-unit" && (
        <p className={s.guidance}>
          그래프의 교육적 추론과 검토 상태를 원본에서 함께 확인하세요. 이 연결은
          공식 선수 관계나 그래프 간선을 만들지 않습니다.
        </p>
      )}
    </div>
  );
}

function LinkRow({
  link,
  index,
  entry: knownEntry,
  confirmed,
  disabled,
  onRelation,
  onConfirm,
  onRemove,
  onEdit,
}: {
  link: TextbookConceptLink;
  index: number;
  entry?: Entry;
  confirmed: boolean;
  disabled: boolean;
  onRelation: (relation: Relation) => void;
  onConfirm: (checked: boolean) => void;
  onRemove: () => void;
  onEdit: (entry?: Entry) => void;
}) {
  const [loaded, setLoaded] = useState<Entry>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const entry = knownEntry ?? loaded;
  useEffect(() => () => request.current?.abort(), []);

  async function loadDefinition() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      // Search is not an ID lookup: accept only the exact namespace and ID, even
      // if another source has the same title or the query matches a description.
      let cursor: string | undefined;
      const seen = new Set<string>();
      do {
        const result = await readTargets(
          link.target.namespace,
          targetId(link.target),
          controller.signal,
          cursor,
        );
        if (controller.signal.aborted) return;
        const found = result.entries.find(
          (item) => targetKey(item.target) === targetKey(link.target),
        );
        if (found) {
          setLoaded(found);
          return;
        }
        if (result.nextCursor === null) break;
        if (seen.has(result.nextCursor))
          throw new Error("Repeated catalog cursor");
        seen.add(result.nextCursor);
        cursor = result.nextCursor;
      } while (seen.size < 40);
      setError(
        "정확한 대상 ID를 찾지 못했습니다. 대상 바꾸기에서 현재 자료를 선택해 주세요.",
      );
    } catch (caught) {
      if (!controller.signal.aborted) setError(errorMessage(caught));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const label = `연결 ${index + 1}`;
  return (
    <li className={s.link} aria-label={label}>
      <div className={s.linkHeading}>
        <strong>{label}</strong>
        <span className={s.status}>
          {link.review.status === "confirmed"
            ? "확인 완료"
            : link.review.status === "rejected"
              ? "반려 · 다시 검토 필요"
              : "후보 · 확인 필요"}
          {confirmed ? " · 저장 시 확인 예정" : ""}
        </span>
      </div>
      {entry ? (
        <Definition entry={entry} />
      ) : (
        <>
          <p className={s.source}>
            {namespaces[link.target.namespace]} ·{" "}
            <code>{targetId(link.target)}</code>
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadDefinition()}
          >
            {loading ? "정의 불러오는 중…" : "정의 불러오기"}
          </button>
          {loading && (
            <button
              type="button"
              onClick={() => {
                request.current?.abort();
                setLoading(false);
              }}
            >
              불러오기 취소
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <label className={s.field}>
        {label} 관계
        <select
          value={link.relation}
          disabled={disabled}
          onChange={(event) => onRelation(event.target.value as Relation)}
        >
          {Object.entries(relations).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label className={s.confirm}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={disabled || (!entry && !confirmed)}
          onChange={(event) => onConfirm(event.target.checked)}
        />
        {label}의 정의와 관계를 확인하고 저장 시 반영
      </label>
      {!entry && !confirmed && (
        <p className={s.context}>정의를 불러와 확인한 뒤 체크해 주세요.</p>
      )}
      <div className={s.actions}>
        <button type="button" disabled={disabled} onClick={() => onEdit(entry)}>
          대상 바꾸기
        </button>
        <button type="button" disabled={disabled} onClick={onRemove}>
          연결 삭제
        </button>
      </div>
    </li>
  );
}

/** Parent keys this editor by edition/concept and saves confirmations explicitly. */
export function TextbookConceptLinkEditor({
  links,
  confirmLinkIds,
  disabled = false,
  onChange,
}: TextbookConceptLinkEditorProps) {
  const id = useId();
  const [namespace, setNamespace] = useState<Namespace>("explorer-card");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [relation, setRelation] = useState<Relation>("related");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [known, setKnown] = useState<Record<string, Entry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const picker = useRef<HTMLFieldSetElement>(null);
  useEffect(() => () => request.current?.abort(), []);

  function cancelRequest() {
    request.current?.abort();
    setLoading(false);
  }
  function resetSearch() {
    cancelRequest();
    setResults([]);
    setNextCursor(null);
    setSearched(false);
    setSelected(null);
    setError(null);
  }
  async function search(cursor?: string) {
    if (disabled || loading) return;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await readTargets(
        namespace,
        query,
        controller.signal,
        cursor,
      );
      if (controller.signal.aborted) return;
      const unique = new Map<string, Entry>();
      for (const entry of [
        ...(cursor === undefined ? [] : results),
        ...result.entries,
      ])
        unique.set(targetKey(entry.target), entry);
      setResults([...unique.values()]);
      setNextCursor(result.nextCursor === cursor ? null : result.nextCursor);
      setSearched(true);
    } catch (caught) {
      if (!controller.signal.aborted) setError(errorMessage(caught));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  function duplicate(
    target: TextbookConceptTarget,
    value: Relation,
    except?: string,
  ) {
    return links.some(
      (link) =>
        link.linkId !== except &&
        targetKey(link.target) === targetKey(target) &&
        link.relation === value,
    );
  }
  function clearConfirmation(linkId: string) {
    return confirmLinkIds.filter((value) => value !== linkId);
  }
  function finishSelection() {
    if (disabled || !selected) return;
    if (duplicate(selected.target, relation, editingId ?? undefined)) {
      setError(duplicateMessage);
      return;
    }
    const existing =
      editingId === null
        ? undefined
        : links.find((link) => link.linkId === editingId);
    if (editingId !== null && !existing) {
      setError("편집 중인 연결이 삭제되었습니다. 취소 후 다시 선택해 주세요.");
      return;
    }
    if (!existing && links.length >= 2000) {
      setError("연결은 최대 2,000개까지 추가할 수 있습니다.");
      return;
    }
    setKnown((previous) => ({
      ...previous,
      [targetKey(selected.target)]: selected,
    }));
    if (existing) {
      if (
        targetKey(existing.target) !== targetKey(selected.target) ||
        existing.relation !== relation
      ) {
        onChange(
          links.map((link) =>
            link.linkId === existing.linkId
              ? {
                  ...link,
                  target: selected.target,
                  relation,
                  review: candidateReview(),
                }
              : link,
          ),
          clearConfirmation(existing.linkId),
        );
      }
    } else {
      onChange(
        [
          ...links,
          {
            linkId: crypto.randomUUID(),
            target: selected.target,
            relation,
            review: candidateReview(),
          },
        ],
        confirmLinkIds,
      );
    }
    setSelected(null);
    setEditingId(null);
    setRelation("related");
    setError(null);
  }

  return (
    <section className={s.editor} aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`}>다른 학습 자료와 연결</h3>
      <p className={s.guidance}>
        이름이 같아도 정의와 범위를 확인해 연결하세요. 확인 체크는 교재 개념을
        저장할 때 반영됩니다.
      </p>
      <fieldset
        ref={picker}
        className={s.picker}
        disabled={disabled}
        tabIndex={-1}
      >
        <legend>{editingId ? "연결 대상 변경" : "연결 대상 찾기"}</legend>
        <div className={s.searchFields}>
          <label className={s.field}>
            자료 종류
            <select
              value={namespace}
              onChange={(event) => {
                resetSearch();
                setNamespace(event.target.value as Namespace);
              }}
            >
              {Object.entries(namespaces).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className={`${s.field} ${s.query}`}>
            이름·정의·ID 검색
            <input
              type="search"
              value={query}
              maxLength={200}
              onChange={(event) => {
                resetSearch();
                setQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void search();
                }
              }}
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void search()}
          >
            검색
          </button>
        </div>
        {namespace === "graph-unit" && (
          <p className={s.guidance}>
            교육과정 그래프는 교육적 추론을 포함합니다. 원본의 검토 상태를
            확인하고 연결 관계를 직접 선택하세요.
          </p>
        )}
        <p role="status" className={s.context}>
          {loading
            ? "연결 대상을 찾는 중…"
            : searched
              ? results.length
                ? `검색 결과 ${results.length}개${nextCursor ? " · 추가 결과 있음" : ""}`
                : "검색 결과가 없습니다. 다른 검색어 또는 ID를 입력해 주세요."
              : "자료 종류와 검색어로 대상을 찾아주세요."}
        </p>
        {loading && (
          <button type="button" onClick={cancelRequest}>
            검색 취소
          </button>
        )}
        {results.length > 0 && (
          <ul className={s.results} aria-label="연결 대상 검색 결과">
            {results.map((entry) => (
              <li key={targetKey(entry.target)}>
                <div>
                  <strong>
                    <MathText text={entry.title} />
                  </strong>
                  <p className={s.context}>{entry.context}</p>
                  <code className={s.source}>{targetId(entry.target)}</code>
                </div>
                <button
                  type="button"
                  aria-pressed={
                    selected !== null &&
                    targetKey(selected.target) === targetKey(entry.target)
                  }
                  aria-label={`${entry.title} 정의 보기`}
                  onClick={() => {
                    setSelected(entry);
                    setError(null);
                  }}
                >
                  정의 보기
                </button>
              </li>
            ))}
          </ul>
        )}
        {nextCursor && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void search(nextCursor)}
          >
            결과 더 보기
          </button>
        )}
        {selected && (
          <div className={s.preview} aria-label="선택한 대상 정의">
            <Definition entry={selected} />
            <label className={s.field}>
              선택한 대상과의 관계
              <select
                value={relation}
                onChange={(event) => {
                  setRelation(event.target.value as Relation);
                  setError(null);
                }}
              >
                {Object.entries(relations).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <div className={s.actions}>
              <button
                className={s.primary}
                type="button"
                onClick={finishSelection}
              >
                {editingId ? "대상 변경 적용" : "연결 추가"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setError(null);
                }}
              >
                선택 취소
              </button>
            </div>
          </div>
        )}
        {editingId && (
          <button
            type="button"
            onClick={() => {
              resetSearch();
              setEditingId(null);
              setRelation("related");
            }}
          >
            대상 변경 취소
          </button>
        )}
      </fieldset>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {links.length === 0 ? (
        <p className={s.context}>연결된 자료가 없습니다.</p>
      ) : (
        <ol className={s.links} aria-label="선택한 연결">
          {links.map((link, index) => (
            <LinkRow
              key={`${link.linkId}:${targetKey(link.target)}`}
              link={link}
              index={index}
              entry={known[targetKey(link.target)]}
              confirmed={confirmLinkIds.includes(link.linkId)}
              disabled={disabled}
              onRelation={(value) => {
                if (disabled || value === link.relation) return;
                if (duplicate(link.target, value, link.linkId)) {
                  setError(duplicateMessage);
                  return;
                }
                setError(null);
                onChange(
                  links.map((row) =>
                    row.linkId === link.linkId
                      ? { ...row, relation: value, review: candidateReview() }
                      : row,
                  ),
                  clearConfirmation(link.linkId),
                );
              }}
              onConfirm={(checked) => {
                if (!disabled)
                  onChange(
                    links,
                    checked
                      ? [...new Set([...confirmLinkIds, link.linkId])]
                      : clearConfirmation(link.linkId),
                  );
              }}
              onRemove={() => {
                if (disabled) return;
                onChange(
                  links.filter((row) => row.linkId !== link.linkId),
                  clearConfirmation(link.linkId),
                );
                if (editingId === link.linkId) {
                  resetSearch();
                  setEditingId(null);
                  setRelation("related");
                }
                setError(null);
              }}
              onEdit={(entry) => {
                if (disabled) return;
                resetSearch();
                setEditingId(link.linkId);
                setNamespace(link.target.namespace);
                setQuery(targetId(link.target));
                setRelation(link.relation);
                setSelected(entry ?? null);
                picker.current?.focus();
              }}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
