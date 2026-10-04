import { useCallback, useRef, useState } from "react";
import { ENGLISH_GRADES } from "@/contracts/english.contract";
import {
  englishListeningBankResponseSchema,
  englishListeningReferencesResponseSchema,
} from "@/contracts/englishBank.contract";
import w from "@/components/unified/Workroom.module.css";
import s from "../EnglishStudio.module.css";
import { bankUrl, useBankQuery } from "./bankClient";
import { BankError, BankLoading, BankPagination } from "./BankFeedback";
import { ListeningAssessmentImport } from "./ListeningAssessmentImport";
import ListeningBankMaterial from "./ListeningBankMaterial";
import b from "./EnglishResourceBank.module.css";

function officialPage(url: string) {
  try {
    const parsed = new URL(url);
    const page =
      (parsed.hostname === "mid.ebs.co.kr" &&
        parsed.pathname === "/english/engGrade") ||
      (parsed.hostname === "www.ebsi.co.kr" &&
        [
          "/ebs/pot/potg/EnglishListening01.ebs",
          "/ebs/pot/potg/EnglishListening02.ebs",
          "/ebs/pot/potg/EnglishListening03.ebs",
        ].includes(parsed.pathname));
    return parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      page
      ? url
      : null;
  } catch {
    return null;
  }
}

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
  const [kind, setKind] = useState<"own" | "ebs">("own");
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
    cursor: cursors[cursors.length - 1],
    limit: 20,
  };
  const own = useBankQuery(
    active && kind === "own"
      ? bankUrl("/api/english/listening/bank", params)
      : null,
    englishListeningBankResponseSchema,
    generation,
  );
  const references = useBankQuery(
    active && kind === "ebs"
      ? bankUrl("/api/english/listening/references", {
          ...params,
          year: filter.year,
          round: filter.round,
        })
      : null,
    englishListeningReferencesResponseSchema,
    generation,
  );
  const result = kind === "own" ? own : references;
  const reference =
    kind === "ebs" && references.status === "ready"
      ? references.data.data.find((item) => item.id === selected)
      : undefined;
  const sourceUrl = reference ? officialPage(reference.sourceUrl) : null;
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
            듣기 제목 검색
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
              <option value="ebs">EBS 공식 참조</option>
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
              disabled={kind !== "ebs"}
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
              disabled={kind !== "ebs"}
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
        {kind === "own"
          ? "자료를 선택해 바로 듣고, 회차 전체 또는 필요한 문항을 담아 시험지를 만드세요. 전국 듣기평가·모의고사 원본은 파일 등록으로 추가할 수 있습니다."
          : "EBS 공식 페이지의 참조 목록입니다. 음원·문서를 이 서비스에 복제하거나 외부 모델에 전송하지 않습니다."}
      </p>
      <div className={b.layout}>
        <section className={s.card} aria-label="듣기 목록">
          {result.status === "loading" ? (
            <BankLoading />
          ) : result.status === "error" ? (
            <BankError
              message={result.message}
              onRetry={() => setGeneration((v) => v + 1)}
            />
          ) : (
            <>
              <ul className={b.list}>
                {kind === "own" &&
                  own.status === "ready" &&
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
                          {item.level || "학년 미지정"} · {item.groupCount}개
                          묶음 · 발행 {item.publicationCount}회
                        </span>
                      </button>
                    </li>
                  ))}
                {kind === "ebs" &&
                  references.status === "ready" &&
                  references.data.data.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={b.rowButton}
                        aria-pressed={selected === item.id}
                        onClick={() => setSelected(item.id)}
                      >
                        <strong>{item.title}</strong>
                        <span className={b.meta}>
                          {item.school === "middle" ? "중" : "고"}
                          {item.grade} · {item.year}년 {item.round}회 ·{" "}
                          {item.provider}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
              {!result.data.data.length && (
                <p className={b.note}>조건에 맞는 듣기 자료가 없습니다.</p>
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
            active={active && kind === "own"}
            setId={kind === "own" ? selected : ""}
            onOpenListening={onOpenListening}
            onState={reportBasket}
          />
          {kind === "ebs" &&
            (reference ? (
              <>
                <h2>{reference.title}</h2>
                <p className={b.meta}>
                  {reference.school === "middle" ? "중" : "고"}
                  {reference.grade} · {reference.year}년 {reference.round}회 ·{" "}
                  {reference.provider}
                </p>
                <p className={b.note}>
                  공식 출처 링크입니다. 복제·변형·재배포에는 별도의 이용 허락이
                  필요합니다.
                </p>
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={b.link}
                  >
                    EBS 공식 자료 열기 ↗
                  </a>
                ) : (
                  <BankError message="공식 페이지 주소를 확인할 수 없습니다." />
                )}
              </>
            ) : (
              <>
                <h2>듣기 자료를 선택하세요</h2>
                <p className={b.note}>
                  공식 참조 자료를 선택하면 출처를 확인할 수 있습니다.
                </p>
              </>
            ))}
        </section>
      </div>
    </>
  );
}
