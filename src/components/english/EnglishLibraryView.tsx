"use client";

/**
 * «문제 보관함» (D-148 · 25 §1.2 · 셸 브리프 §2.4) — 이 시험의 세트 전부 · 이름 검색 · 상태 거르기 · «새로고침».
 * 🔴 D-30 — 행 전체가 <button> 이다(손가락 커서는 실제 단추에만). 행에 따로 커서·hover 를 두지 않는다.
 */
import { useState } from "react";

import Icon from "@/components/unified/WorkspaceIcon";
import WorkProgress from "@/components/unified/WorkProgress";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import w from "@/components/unified/Workroom.module.css";
import {
  ENGLISH_SET_STATUSES,
  type EnglishExam,
  type EnglishSetSummary,
} from "@/contracts/english.contract";

import EnglishExamPicker from "./EnglishExamPicker";
import { STATUS_TONE, examLabel, formatDay, type Load } from "./englishClient";
import s from "./EnglishLibrary.module.css";

export default function EnglishLibraryView({
  exam,
  exams,
  onSelectExam,
  sets,
  onRefresh,
  onOpen,
  onMake,
}: {
  exam: EnglishExam;
  exams: EnglishExam[];
  onSelectExam: (id: string) => void;
  sets: Load<EnglishSetSummary[]>;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  onMake?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | EnglishSetSummary["status"]>(
    "all",
  );
  const needle = query.trim().toLocaleLowerCase();
  const filtered =
    sets.status === "ready"
      ? sets.data.filter(
          (set) =>
            (status === "all" || set.status === status) &&
            (!needle || set.title.toLocaleLowerCase().includes(needle)),
        )
      : [];

  return (
    <>
      <WorkspacePageHeader
        title="내 문제 세트"
        description="이 시험의 문제 세트를 찾고, 열어 검토합니다."
      />
      <EnglishExamPicker exams={exams} exam={exam} onSelect={onSelectExam} />
      <section className={s.library} aria-label="저장한 문제 세트">
        <div className={s.listHeading}>
          <h2>저장한 세트</h2>
          {sets.status === "ready" ? (
            <span className={s.resultCount} role="status">
              {needle || status !== "all"
                ? `${filtered.length} / ${sets.data.length}개`
                : `${sets.data.length}개`}
            </span>
          ) : null}
        </div>
        <div className={s.tools}>
          <label className={s.search}>
            <Icon name="search" size={18} />
            <input
              type="search"
              aria-label="세트 이름으로 찾기"
              placeholder="세트 이름으로 찾기"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="상태"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option value="all">모든 상태</option>
            {ENGLISH_SET_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button type="button" className={w.outlineButton} onClick={onRefresh}>
            새로고침
          </button>
        </div>
        <p className={s.examLine}>
          {exam.school} · {examLabel(exam)}
        </p>
        {sets.status === "loading" ? (
          <WorkProgress label="문제 세트를 불러오는 중입니다…" />
        ) : sets.status === "error" ? (
          <div role="alert" className={s.loadError}>
            <span>{sets.message}</span>
            <button
              type="button"
              className={w.outlineButton}
              onClick={onRefresh}
            >
              다시 시도
            </button>
          </div>
        ) : sets.data.length === 0 ? (
          <div className={s.empty}>
            <h2>아직 만든 문제 세트가 없습니다.</h2>
            {onMake && <p>자료를 등록하고 학교에 맞는 문제를 만들어 보세요.</p>}
            {onMake && (
              <button
                type="button"
                className={w.primaryButton}
                onClick={onMake}
              >
                문제 만들기
                <Icon name="arrow" size={18} />
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className={s.empty}>
            <p>조건에 맞는 문제 세트가 없습니다.</p>
            <button
              type="button"
              className={w.outlineButton}
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              검색·상태 초기화
            </button>
          </div>
        ) : (
          <>
            <div className={s.listColumns} aria-hidden="true">
              <span>세트 이름</span>
              <span>수정일</span>
              <span>문항 수</span>
              <span>상태</span>
              <span />
            </div>
            <ul className={s.libraryList} aria-label="문제 세트 목록">
              {filtered.map((set) => (
                <li key={set.id}>
                  <button
                    type="button"
                    className={s.libraryRow}
                    onClick={() => onOpen(set.id)}
                  >
                    <span className={s.rowTitle}>{set.title}</span>
                    <span className={s.rowDate}>
                      {formatDay(set.updatedAt)}
                    </span>
                    <span className={s.rowCount}>{set.questionCount}문항</span>
                    <span
                      className={s.pill}
                      data-tone={STATUS_TONE[set.status]}
                    >
                      {set.status}
                    </span>
                    <span className={s.rowChevron} aria-hidden="true">
                      <Icon name="chevron" size={16} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
