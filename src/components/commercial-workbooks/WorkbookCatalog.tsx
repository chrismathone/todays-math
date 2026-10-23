"use client";

import { useEffect, useRef, useState } from "react";
import type {
  WorkbookAssignment,
  WorkbookEdition,
  WorkbookEditionDetail,
} from "@/contracts/commercialWorkbook.contract";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import WorkbookImport from "./WorkbookImport";
import WorkbookAssignmentForm from "./WorkbookAssignmentForm";
import WorkbookPublisherPacks from "./WorkbookPublisherPacks";
import { editionLabel, messageOf } from "./presentation";
import s from "./CommercialWorkbooks.module.css";

export default function WorkbookCatalog({
  source,
  onAssignment,
}: {
  source: CommercialWorkbookSource;
  onAssignment: (assignment: WorkbookAssignment) => void;
}) {
  const [books, setBooks] = useState<WorkbookEdition[] | null>(null);
  const [book, setBook] = useState<WorkbookEditionDetail | null>(null);
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("");
  const [coverage, setCoverage] = useState("");
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loadingId, setLoadingId] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [assignmentDirty, setAssignmentDirty] = useState(false);
  const [revisionDirty, setRevisionDirty] = useState(false);
  const [reload, setReload] = useState(0);
  const [saved, setSaved] = useState("");
  const detailRequest = useRef(0);
  useEffect(() => {
    let active = true;
    source
      .listCatalog()
      .then((value) => {
        if (active) {
          setBooks(value);
          setError("");
        }
      })
      .catch((reason) => {
        if (active) setError(messageOf(reason));
      });
    return () => {
      active = false;
    };
  }, [source, reload]);
  const filtered = books?.filter(
    (item) =>
      [
        item.metadata.title,
        item.metadata.publisher,
        item.metadata.edition,
        item.metadata.isbn,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase().trim()) &&
      (!grade || item.metadata.grade === grade) &&
      (!coverage ||
        (coverage === "reviewed"
          ? item.reviewedKeyCount > 0
          : item.missingKeyCount > 0)),
  );
  async function select(id: string) {
    if (id === book?.id) return;
    if (
      (assignmentDirty || revisionDirty) &&
      !window.confirm(
        "다른 교재를 열면 현재 교재의 배정 선택과 정답표 수정 입력이 닫힙니다. 이동할까요?",
      )
    )
      return;
    const version = ++detailRequest.current;
    setLoadingId(id);
    setDetailError("");
    try {
      const value = await source.getEdition(id);
      if (version === detailRequest.current) {
        setBook(value);
        setReviseOpen(false);
        setAssignmentDirty(false);
        setRevisionDirty(false);
      }
    } catch (reason) {
      if (version === detailRequest.current) setDetailError(messageOf(reason));
    } finally {
      if (version === detailRequest.current) setLoadingId("");
    }
  }
  function imported(value: WorkbookEditionDetail) {
    detailRequest.current += 1;
    setLoadingId("");
    setBook(value);
    setBooks((previous) => [
      value,
      ...(previous ?? []).filter((item) => item.id !== value.id),
    ]);
    setImportOpen(false);
    setReviseOpen(false);
    setAssignmentDirty(false);
    setRevisionDirty(false);
    setSaved(`${value.metadata.title} · 정답표 개정 ${value.revision} 저장됨`);
  }
  return (
    <div className={s.stack}>
      <div className={s.header}>
        <div>
          <h2>교재 정답</h2>
          <p>등록한 판본의 정답표에서 과제를 준비합니다.</p>
        </div>
        <button
          type="button"
          className={s.primary}
          aria-expanded={importOpen}
          onClick={() => setImportOpen((value) => !value)}
        >
          {importOpen ? "등록 입력 접기" : "교재 · 정답표 등록"}
        </button>
      </div>
      {saved && (
        <p role="status" className={s.success}>
          {saved}
        </p>
      )}
      <div hidden={!importOpen}>
        <WorkbookImport source={source} onSaved={imported} />
      </div>
      <WorkbookPublisherPacks
        source={source}
        books={books}
        onSaved={imported}
        onBeforeOpen={() =>
          !(assignmentDirty || revisionDirty) ||
          window.confirm(
            "출판사 교재를 열면 현재 교재의 배정 선택과 정답표 수정 입력이 닫힙니다. 이동할까요?",
          )
        }
      />
      <div className={s.toolbar}>
        <label className={s.search}>
          교재 찾기
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="교재명, 출판사, 판본, ISBN"
          />
        </label>
        <label>
          학년
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
          >
            <option value="">모든 학년</option>
            {[
              ...new Set(
                books?.map((item) => item.metadata.grade).filter(Boolean),
              ),
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          정답 확보
          <select
            value={coverage}
            onChange={(event) => setCoverage(event.target.value)}
          >
            <option value="">모든 교재</option>
            <option value="reviewed">검토한 정답 있음</option>
            <option value="missing">미확보 정답 있음</option>
          </select>
        </label>
        <button
          type="button"
          className={s.button}
          onClick={() => setReload((value) => value + 1)}
        >
          목록 새로고침
        </button>
      </div>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {!books && !error && <p role="status">등록한 교재를 불러오는 중…</p>}
      {books && (
        <div className={s.split}>
          <section className={s.panel} aria-label="등록한 교재 목록">
            <p className={s.caption} role="status">
              등록 {books.length}권 중 검색 결과 {filtered?.length}권
            </p>
            <div className={s.list}>
              {filtered?.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={s.listRow}
                  aria-pressed={book?.id === item.id}
                  disabled={loadingId === item.id}
                  onClick={() => void select(item.id)}
                >
                  <strong>{item.metadata.title}</strong>
                  <span className={s.caption}>
                    {editionLabel(item.metadata)}
                  </span>
                  <span className={s.caption}>
                    등록 {item.exerciseCount}문항 · 검토한 정답{" "}
                    {item.reviewedKeyCount}개 · 미확보 {item.missingKeyCount}개
                  </span>
                  {loadingId === item.id && (
                    <span role="status">불러오는 중…</span>
                  )}
                </button>
              ))}
            </div>
            {!filtered?.length && (
              <div className={s.empty}>
                {books.length ? (
                  <>
                    <p>조건에 맞는 교재가 없습니다.</p>
                    <button
                      type="button"
                      className={s.button}
                      onClick={() => {
                        setQuery("");
                        setGrade("");
                        setCoverage("");
                      }}
                    >
                      조건 해제
                    </button>
                  </>
                ) : (
                  <p>
                    등록된 교재가 없습니다. 교재와 확인한 정답표를 등록해
                    주세요.
                  </p>
                )}
              </div>
            )}
          </section>
          <div className={s.stack}>
            {detailError && (
              <p role="alert" className={s.error}>
                {detailError}
              </p>
            )}
            {book ? (
              <>
                <section className={s.panel}>
                  <div className={s.sectionHeading}>
                    <div>
                      <h2>{book.metadata.title}</h2>
                      <p className={s.muted}>{editionLabel(book.metadata)}</p>
                    </div>
                    <span className={s.badge}>정답표 개정 {book.revision}</span>
                  </div>
                  <div className={s.stack}>
                    <dl className={s.meta}>
                      <dt>ISBN</dt>
                      <dd>{book.metadata.isbn || "기록 없음"}</dd>
                      <dt>교육과정</dt>
                      <dd>{book.metadata.curriculum || "기록 없음"}</dd>
                      <dt>출처</dt>
                      <dd>
                        <details>
                          <summary>출처·검토 기록 보기</summary>
                          <p>{book.provenance.description}</p>
                          {book.provenance.reference && (
                            <p className={s.caption}>
                              {book.provenance.reference}
                            </p>
                          )}
                        </details>
                      </dd>
                    </dl>
                    <div className={s.summary}>
                      <span>
                        등록 <strong>{book.exerciseCount}</strong>문항
                      </span>
                      <span>
                        정답 검토함 <strong>{book.reviewedKeyCount}</strong>개
                      </span>
                      <span>
                        검토 전{" "}
                        <strong>
                          {book.exerciseCount -
                            book.reviewedKeyCount -
                            book.missingKeyCount}
                        </strong>
                        개
                      </span>
                      <span>
                        미확보 <strong>{book.missingKeyCount}</strong>개
                      </span>
                    </div>
                    <p className={s.notice}>
                      정답은 교사의 채점 참고용입니다. 원문 문제·쌍둥이 문제는
                      제공하지 않으며, 오답 출력은 교재를 보며 푸는 참조형
                      학습지입니다.
                    </p>
                    <button
                      type="button"
                      className={s.button}
                      aria-expanded={reviseOpen}
                      onClick={() => setReviseOpen((value) => !value)}
                    >
                      {reviseOpen ? "정답표 개정 접기" : "정답표 개정"}
                    </button>
                  </div>
                </section>
                <div hidden={!reviseOpen}>
                  <WorkbookImport
                    key={`${book.id}:${book.revision}`}
                    existing={book}
                    onDirtyChange={setRevisionDirty}
                    source={source}
                    onSaved={imported}
                  />
                </div>
                <div className={s.panel}>
                  <WorkbookAssignmentForm
                    key={`${book.id}:${book.revision}`}
                    source={source}
                    book={book}
                    onDirtyChange={setAssignmentDirty}
                    onSaved={onAssignment}
                  />
                </div>
              </>
            ) : (
              <p className={s.notice}>
                교재를 선택하면 판본·출처를 확인하고 문항과 학생을 배정할 수
                있습니다.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
