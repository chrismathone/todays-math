"use client";

import { useId, useRef, type ReactNode, type Ref } from "react";
import type { DocumentKind } from "@/contracts/privateWorkspace.contract";
import { DOCUMENT_KINDS } from "@/contracts/privateWorkspace.contract";
import {
  SHEET_TAGS,
  isTaggableKind,
  type SheetTag,
} from "@/contracts/sheetTag.contract";
import s from "./PrivateLibrary.module.css";

/**
 * 내 자료의 거르기 줄 — 원장님 2026-10-21 «상단 정렬하자. 드랍다운으로 스타일 맞춰서 깔끔하게» ·
 * «행을 너무 많이 써서 공간낭비함». Wire C(드롭다운 넷 → 찾기 → 새로고침 · 결과 수) · Hi-fi H4(한 띠로 잇기) ·
 * 이름은 칸 안에 작게 · 차례는 종류 · 태그 · 보기 · 정렬(05 §8.26). 시안은 `/dev/library-filters-hifi`.
 *
 * 값과 수는 부모(`PrivateLibrary`)가 쥐고 센다 — 이 줄은 보이고 고른 것을 올려 보낼 뿐이다.
 */

export type LibraryKindFilter = DocumentKind | "all";
/** null 은 «태그 전체», "none" 은 «태그 없음»(시험지 · 연산 연습지 가운데 태그가 없는 것). */
export type LibraryTagFilter = SheetTag | "none" | null;
/**
 * ④ 보기 범위(Codex 합의 (가)) — 고를 때마다 도착할 범위를 고른다. 이전 범위는 기억하지 않는다.
 * all = 학원 자료 전체(내 자료 + 동료 공개) · mine = 내 자료만 · working = 내 작업 중만(학원 소속이면 내 자료만 받아 온다).
 */
export type LibraryScope = "all" | "mine" | "working";
export type LibrarySort = "newest" | "name" | "count";

const tagName = (tag: SheetTag | "none") =>
  tag === "none" ? "태그 없음" : tag;
const TAG_ONLY_ON = "태그는 시험지 · 연산 연습지에만 있습니다.";
/**
 * 기억한 태그가 쉬는 칸의 설명 — 닫힌 select 는 화살표 하나에도 값이 바뀌어(Windows) «태그 풀기»가 곧바로 일어나므로
 * 칸이 꺼지는 것을 바뀌기 전에 읽히게 한다(Codex 구현 검토 · WCAG 3.2.2).
 */
const PAUSED_REASON = `${TAG_ONLY_ON} 그 종류를 고르면 다시 걸립니다. «태그 풀기»를 고르면 태그를 지우고 이 칸은 꺼집니다. 초점은 자료 종류 칸으로 옮겨 갑니다.`;

/**
 * 드롭다운 한 칸 — 넷이 이 하나를 쓴다(정렬과 같은 칸 · 새 킷 없음). 이름은 칸 안 왼쪽에 작게 보이고(aria-hidden),
 * 읽는 이름은 select 의 aria-label 이다. 이름을 누르면 그대로 드롭다운이 열린다(이름은 누름을 통과시킨다).
 */
function FilterSelect({
  name,
  label,
  value,
  onChange,
  active = false,
  paused = false,
  disabled = false,
  describedBy,
  title,
  selectRef,
  children,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** 기본값이 아닌 거르기가 걸린 칸 — 코발트 밑줄 */
  active?: boolean;
  /** 태그 없는 종류에서 기억만 하고 안 걸린 태그 칸 */
  paused?: boolean;
  disabled?: boolean;
  describedBy?: string;
  title?: string;
  selectRef?: Ref<HTMLSelectElement>;
  children: ReactNode;
}) {
  return (
    <span
      className={s.filterField}
      data-active={active || undefined}
      data-paused={paused || undefined}
    >
      <span className={s.filterName} aria-hidden="true">
        {name}
      </span>
      <select
        ref={selectRef}
        aria-label={label}
        aria-describedby={describedBy}
        title={title}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </span>
  );
}

export type LibraryFilterBarProps = {
  kind: LibraryKindFilter;
  onKindChange: (kind: LibraryKindFilter) => void;
  allCount: number;
  kindCounts: Record<DocumentKind, number>;
  /** 고른 태그 — 태그 없는 종류에서는 기억만 하고 걸리지 않는다(«· 미적용»). */
  tag: LibraryTagFilter;
  onTagChange: (tag: LibraryTagFilter) => void;
  tagCounts: Record<SheetTag, number>;
  noneCount: number;
  scope: LibraryScope;
  onScopeChange: (scope: LibraryScope) => void;
  /** 학원 소속 — «학원 자료 전체 · 내 자료만»이 있다. 아니면 «내 자료 전체»뿐(늘 내 자료만 받아 온다). */
  branch: boolean;
  /** 지금 검색 · 종류 · 걸린 태그에 맞는 내 작업 중 자료 수 */
  workingCount: number;
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
  query: string;
  onQueryChange: (query: string) => void;
  loading: boolean;
  onRefresh: () => void;
  /** 받아 온 자료 수 */
  total: number;
  /** 거른 뒤 남은 수 */
  shown: number;
  /** 거르기 · 찾기가 하나라도 걸렸나 — 걸리면 «16개 중 3개» */
  filtered: boolean;
};

export default function LibraryFilterBar({
  kind,
  onKindChange,
  allCount,
  kindCounts,
  tag,
  onTagChange,
  tagCounts,
  noneCount,
  scope,
  onScopeChange,
  branch,
  workingCount,
  sort,
  onSortChange,
  query,
  onQueryChange,
  loading,
  onRefresh,
  total,
  shown,
  filtered,
}: LibraryFilterBarProps) {
  const kindSelect = useRef<HTMLSelectElement>(null);
  const reasonId = useId();
  const tagRests = kind !== "all" && !isTaggableKind(kind);
  return (
    <div className={s.filterBar} role="group" aria-label="자료 거르기">
      <div className={s.filterSelects}>
        <FilterSelect
          name="종류"
          label="자료 종류"
          selectRef={kindSelect}
          active={kind !== "all"}
          value={kind}
          onChange={(value) => onKindChange(value as LibraryKindFilter)}
        >
          <option value="all">전체 자료 ({allCount})</option>
          {DOCUMENT_KINDS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label} ({kindCounts[entry.id]})
            </option>
          ))}
        </FilterSelect>
        {tagRests ? (
          // 태그 없는 종류 — 고른 태그가 있으면 «숙제 · 미적용», 열면 «태그 풀기». 없으면 칸 글이 곧 까닭인
          // «시험지 · 연산만»으로 꺼진다(꺼진 칸은 Tab 이 안 닿아 숨은 설명만으로는 까닭이 안 보인다).
          // 풀면 칸이 꺼지므로 초점은 그 칸을 꺼지게 한 종류 칸으로 옮긴다.
          <FilterSelect
            name="태그"
            label="태그"
            paused={Boolean(tag)}
            value="paused"
            disabled={!tag}
            describedBy={reasonId}
            title={tag ? PAUSED_REASON : TAG_ONLY_ON}
            onChange={(value) => {
              if (value !== "") return;
              onTagChange(null);
              kindSelect.current?.focus();
            }}
          >
            <option value="paused" disabled={Boolean(tag)}>
              {tag ? `${tagName(tag)} · 미적용` : "시험지 · 연산만"}
            </option>
            {tag && <option value="">태그 풀기</option>}
          </FilterSelect>
        ) : (
          <FilterSelect
            name="태그"
            label="태그"
            active={tag !== null}
            value={tag ?? ""}
            onChange={(value) =>
              onTagChange((value || null) as LibraryTagFilter)
            }
          >
            <option value="">태그 전체</option>
            {SHEET_TAGS.map((entry) => (
              <option key={entry} value={entry}>
                {entry} ({tagCounts[entry]})
              </option>
            ))}
            <hr />
            <option value="none">태그 없음 ({noneCount})</option>
          </FilterSelect>
        )}
        <FilterSelect
          name="보기"
          label="보기 범위"
          active={scope !== "all"}
          value={scope}
          onChange={(value) => onScopeChange(value as LibraryScope)}
        >
          <option value="all">
            {branch ? "학원 자료 전체" : "내 자료 전체"}
          </option>
          {branch && <option value="mine">내 자료만</option>}
          <option value="working">내 작업 중만 ({workingCount})</option>
        </FilterSelect>
        <FilterSelect
          name="정렬"
          label="자료 정렬"
          value={sort}
          onChange={(value) => onSortChange(value as LibrarySort)}
        >
          <option value="newest">최근 수정순</option>
          <option value="name">이름순</option>
          <option value="count">문항 많은순</option>
        </FilterSelect>
      </div>
      <div className={s.filterFind}>
        <input
          type="search"
          className={s.filterSearch}
          aria-label="저장한 자료 검색"
          placeholder="자료 이름으로 찾기"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <span className={s.filterEnd}>
          <button type="button" onClick={onRefresh} disabled={loading}>
            새로고침
          </button>
          <p className={s.filterCount} role="status">
            {filtered ? (
              <>
                {total}개 중 <strong>{shown}</strong>개
              </>
            ) : (
              <>
                <strong>{total}</strong>개
              </>
            )}
          </p>
        </span>
      </div>
      {/* 태그 칸의 까닭 — 칸 묶음 밖에 둔다(2 × 2 의 `:nth-child` 모서리를 흐트리지 않게). */}
      <span id={reasonId} hidden>
        {tag ? PAUSED_REASON : TAG_ONLY_ON}
      </span>
    </div>
  );
}
