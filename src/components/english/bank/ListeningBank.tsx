import { useCallback, useRef, useState } from "react";
import { ENGLISH_GRADES } from "@/contracts/english.contract";
import { englishListeningBankResponseSchema } from "@/contracts/englishBank.contract";
import w from "@/components/unified/Workroom.module.css";
import s from "../EnglishStudio.module.css";
import { bankUrl, useBankQuery } from "./bankClient";
import { BankError, BankLoading, BankPagination } from "./BankFeedback";
import { ListeningAssessmentImport } from "./ListeningAssessmentImport";
import ListeningBankMaterial from "./ListeningBankMaterial";
import b from "./EnglishResourceBank.module.css";

export default function ListeningBank({
  active,
  onOpenListening,
  onState,
}: {
  active: boolean;
  onOpenListening: (id: string) => void;
  onState?: (dirty: boolean, busy: boolean) => void;
}) {
  const work = useRef({
    upload: { dirty: false, busy: false },
    basket: { dirty: false, busy: false },
  });
  const reportUpload = useCallback(
    (dirty: boolean, busy: boolean) => {
      work.current.upload = { dirty, busy };
      onState?.(
        dirty || work.current.basket.dirty,
        busy || work.current.basket.busy,
      );
    },
    [onState],
  );
  const reportBasket = useCallback(
    (dirty: boolean, busy: boolean) => {
      work.current.basket = { dirty, busy };
      onState?.(
        dirty || work.current.upload.dirty,
        busy || work.current.upload.busy,
      );
    },
    [onState],
  );
  const [kind, setKind] = useState<"own" | "authored" | "reconstructed">("own");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [year, setYear] = useState("");
  const [round, setRound] = useState("");
  const [filter, setFilter] = useState({
    q: "",
    level: "",
    year: "",
    round: "",
  });
  const [cursors, setCursors] = useState<string[]>([""]);
  const [generation, setGeneration] = useState(0);
  const [selected, setSelected] = useState("");
  const params = {
    q: filter.q,
    level: filter.level,
    year: filter.year,
    round: filter.round,
    origin:
      kind === "authored"
        ? "teacher_authored"
        : kind === "reconstructed"
          ? "audio_reconstructed"
          : "",
    cursor: cursors[cursors.length - 1],
    limit: 20,
  };
  const own = useBankQuery(
    active ? bankUrl("/api/english/listening/bank", params) : null,
    englishListeningBankResponseSchema,
    generation,
  );
  const result = own;
  return (
    <>
      <ListeningAssessmentImport
        active={active}
        onState={reportUpload}
        onImported={(id) => {
          setKind("own");
          setQuery("");
          setLevel("");
          setFilter({ q: "", level: "", year: "", round: "" });
          setCursors([""]);
          setSelected(id);
          setGeneration((value) => value + 1);
        }}
      />
      <div className={b.listeningFilterContainer}>
        <form
          className={b.listeningFilters}
          aria-label="듣기 검색"
          onSubmit={(event) => {
            event.preventDefault();
            setFilter({ q: query.trim(), level, year, round });
            setCursors([""]);
            setSelected("");
          }}
        >
          <label className={`${s.field} ${b.listeningQuery}`}>
            듣기 자료·문항 검색
            <input
              type="search"
              maxLength={200}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className={`${s.field} ${b.listeningGrade}`}>
            듣기 학년
            <select
              aria-label="듣기 학년"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="">모든 학년</option>
              {ENGLISH_GRADES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className={`${s.field} ${b.listeningSource}`}>
            듣기 출처
            <select
              aria-label="듣기 출처"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as typeof kind);
                setCursors([""]);
                setSelected("");
              }}
            >
              <option value="own">내 범위의 듣기 자료</option>
              <option value="authored">직접 작성한 문항</option>
              <option value="reconstructed">음원 기반 재구성 자료</option>
            </select>
          </label>
          <label className={`${s.field} ${b.listeningYear}`}>
            연도
            <input
              type="number"
              min={1900}
              max={2200}
              step={1}
              placeholder="모든 연도"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </label>
          <label className={`${s.field} ${b.listeningRound}`}>
            회차
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              placeholder="모든 회차"
              value={round}
              onChange={(event) => setRound(event.target.value)}
            />
          </label>
          <div className={b.listeningFilterActions}>
            <button type="submit" className={w.outlineButton}>
              검색
            </button>
            <button
              type="button"
              className={w.outlineButton}
              onClick={() => setGeneration((v) => v + 1)}
            >
              새로고침
            </button>
          </div>
        </form>
      </div>
      <p className={b.note}>
        직접 작성·녹음하거나 직접 작성한 대본으로 만든 TTS 자료를 듣고, 필요한
        문항을 담아 시험지를 만드세요.
      </p>
      <div className={b.layout}>
        <section
          className={b.catalog}
          aria-label="듣기 목록"
          aria-busy={result.status === "loading"}
        >
          <h2 className={b.listHeading}>듣기 목록</h2>
          {result.status === "loading" ? (
            <BankLoading />
          ) : result.status === "error" ? (
            <BankError
              message={result.message}
              onRetry={() => setGeneration((v) => v + 1)}
            />
          ) : (
            <>
              <p role="status" className={b.resultCount}>
                이 페이지 {result.data.data.length}개
              </p>
              <ul className={b.list} aria-label="듣기 검색 결과" tabIndex={0}>
                {own.status === "ready" &&
                  own.data.data.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={b.rowButton}
                        aria-pressed={selected === item.id}
                        onClick={() => setSelected(item.id)}
                      >
                        <strong>{item.title}</strong>
                        <span className={b.meta}>
                          {item.level || "학년 미지정"}
                          {item.source
                            ? ` · ${item.source.year}년${item.source.round ? ` ${item.source.round}회` : ""}`
                            : ""}
                          {" · "}
                          {item.questionCount ?? item.groupCount}
                          {item.questionCount === undefined
                            ? "개 묶음"
                            : "문항"}
                          {item.reconstructedQuestionCount
                            ? " · 음원 기반 재구성"
                            : ""}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
              {!result.data.data.length && (
                <p className={b.note}>
                  {filter.q ||
                  filter.level ||
                  filter.year ||
                  filter.round ||
                  kind !== "own" ||
                  cursors.length > 1
                    ? "조건에 맞는 듣기 자료가 없습니다. 검색 조건을 바꿔 주세요."
                    : "등록된 듣기 자료가 없습니다. 직접 제작한 듣기 자료를 등록하세요."}
                </p>
              )}
              <BankPagination
                page={cursors.length}
                hasNext={Boolean(result.data.meta.nextCursor)}
                onPrevious={() => setCursors((v) => v.slice(0, -1))}
                onNext={() => {
                  if (result.data.meta.nextCursor)
                    setCursors((v) => [...v, result.data.meta.nextCursor!]);
                }}
              />
            </>
          )}
        </section>
        <section className={b.detail} aria-label="듣기 상세">
          <ListeningBankMaterial
            active={active}
            setId={selected}
            onOpenListening={onOpenListening}
            onState={reportBasket}
          />
        </section>
      </div>
    </>
  );
}
